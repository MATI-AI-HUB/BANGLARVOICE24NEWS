import type { SupabaseClient } from '@supabase/supabase-js'
import { callAiGateway } from './ai-gateway'

export const SOCIAL_PLATFORMS = ['facebook', 'instagram', 'x', 'linkedin', 'telegram'] as const
export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number]

export const DEFAULT_SITE_URL = 'https://www.banglarvoice24news.com'

export const DEFAULT_BEST_HOURS_BST: Record<SocialPlatform, number[]> = {
  facebook: [8, 13, 17, 21],
  instagram: [8, 13, 17, 21],
  x: [8, 13, 17, 21],
  linkedin: [9, 13, 17, 20],
  telegram: [7, 12, 16, 21],
}

export const MAX_HOUR_DRIFT = 2
export const MAX_AI_CAPTIONS = 6

const BST_OFFSET_HOURS = 6
const HOUR_MS = 3_600_000
const DAY_MS = 86_400_000

export type SocialArticle = {
  id: string
  slug?: string | null
  title_bn: string
  excerpt_bn?: string | null
  category_key?: string | null
  thumbnail_url?: string | null
  featured_image?: string | null
  published_at?: string | null
  ai_confidence?: number | null
  video_id?: string | null
}

export type MetricRow = {
  platform: SocialPlatform | string
  reactions?: number | null
  comments?: number | null
  shares?: number | null
  impressions?: number | null
  clicks?: number | null
  reach?: number | null
}

export type PlatformMetricTotals = {
  platform: string
  reactions: number
  comments: number
  shares: number
  impressions: number
  clicks: number
  reach: number
  engagement: number
}

export type MetricsSummary = {
  byPlatform: PlatformMetricTotals[]
  totals: Omit<PlatformMetricTotals, 'platform'>
}

export type CalendarSlot = {
  platform: SocialPlatform
  hour_bst: number
  scheduled_at: string
  article_id: string | null
  caption: string | null
  status: string
}

export type DailyCalendar = {
  date: string
  slots: CalendarSlot[]
}

export type PlatformInsight = {
  platform: SocialPlatform
  impressions: number
  reactions: number
  comments: number
  shares: number
  clicks: number
  reach: number
}

export type SocialManagerTask = 'daily_plan' | 'metrics' | 'weekly_strategy' | 'run'

const CATEGORY_WEIGHTS: Record<string, number> = {
  tech: 1.1,
  national: 1.0,
  international: 0.95,
  economy: 0.95,
  sports: 0.9,
  health: 0.85,
  entertainment: 0.7,
}

const DEFAULT_CATEGORY_WEIGHT = 0.8

function toDate(value: Date | string | number): Date {
  return value instanceof Date ? value : new Date(value)
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min
  return Math.min(max, Math.max(min, value))
}

function toNonNegativeInt(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0
}

function normalizeHour(hour: number): number {
  const rounded = Math.round(Number(hour))
  if (!Number.isFinite(rounded)) return 0
  return ((rounded % 24) + 24) % 24
}

function uniqueHours(hours: number[]): number[] {
  return [...new Set(hours.map(normalizeHour))]
}

export function bstDateString(date: Date | string | number): string {
  const shifted = new Date(toDate(date).getTime() + BST_OFFSET_HOURS * HOUR_MS)
  return shifted.toISOString().slice(0, 10)
}

export function bstSlotToUtcIso(dateBst: string, hourBst: number): string {
  const [year, month, day] = dateBst.split('-').map((part) => Number(part))
  const utcMs = Date.UTC(year, month - 1, day, normalizeHour(hourBst) - BST_OFFSET_HOURS, 0, 0, 0)
  return new Date(utcMs).toISOString()
}

export function mondayOf(date: Date | string | number): string {
  const day = bstDateString(date)
  const [year, month, dayOfMonth] = day.split('-').map((part) => Number(part))
  const utc = Date.UTC(year, month - 1, dayOfMonth)
  const weekday = new Date(utc).getUTCDay()
  const daysSinceMonday = (weekday + 6) % 7
  return new Date(utc - daysSinceMonday * DAY_MS).toISOString().slice(0, 10)
}

export function clampHourDrift(candidates: number[], insights: number[]): number[] {
  const anchors = uniqueHours(candidates)
  if (anchors.length === 0) return uniqueHours(insights).sort((a, b) => a - b)
  const result = insights.map((raw) => {
    const hour = normalizeHour(raw)
    let nearest = anchors[0]
    let best = Math.abs(hour - nearest)
    for (const anchor of anchors) {
      const distance = Math.abs(hour - anchor)
      if (distance < best) {
        best = distance
        nearest = anchor
      }
    }
    return best > MAX_HOUR_DRIFT ? nearest : hour
  })
  return uniqueHours(result).sort((a, b) => a - b)
}

export function hoursFor(
  platform: SocialPlatform,
  insights?: Partial<Record<SocialPlatform, number[]>> | null,
): number[] {
  const defaults = [...(DEFAULT_BEST_HOURS_BST[platform] ?? DEFAULT_BEST_HOURS_BST.facebook)]
  const observed = insights?.[platform]
  if (!observed || observed.length === 0) return defaults
  return clampHourDrift(defaults, observed)
}

export function recencyWeight(
  publishedAt: Date | string | number | null | undefined,
  now: Date = new Date(),
): number {
  if (publishedAt === null || publishedAt === undefined || publishedAt === '') return 0.2
  const timestamp = toDate(publishedAt).getTime()
  if (!Number.isFinite(timestamp)) return 0.2
  const ageHours = (now.getTime() - timestamp) / HOUR_MS
  if (ageHours <= 6) return 1
  if (ageHours <= 24) return 0.7
  if (ageHours <= 72) return 0.4
  return 0.15
}

export function scoreArticle(article: SocialArticle, now: Date = new Date()): number {
  const recency = recencyWeight(article.published_at, now) * 50
  const confidence = clamp(
    typeof article.ai_confidence === 'number' ? article.ai_confidence : 0.5,
    0,
    1,
  ) * 20
  const category = (CATEGORY_WEIGHTS[article.category_key ?? ''] ?? DEFAULT_CATEGORY_WEIGHT) * 15
  const hasImage = article.featured_image || article.thumbnail_url ? 8 : 0
  const hasVideo = article.video_id ? 7 : 0
  return Math.round((recency + confidence + category + hasImage + hasVideo) * 100) / 100
}

export function rankArticles(articles: SocialArticle[], now: Date = new Date()): SocialArticle[] {
  return articles
    .map((article, index) => ({ article, index, score: scoreArticle(article, now) }))
    .sort((left, right) => right.score - left.score || left.index - right.index)
    .map((entry) => entry.article)
}

export function articleUrl(
  article: Pick<SocialArticle, 'id' | 'slug'>,
  baseUrl: string = DEFAULT_SITE_URL,
): string {
  const base = baseUrl.replace(/\/+$/, '')
  const key = article.slug && article.slug.trim() ? article.slug.trim() : article.id
  return `${base}/article/${encodeURIComponent(key)}`
}

export function templateCaption(article: SocialArticle, url: string): string {
  const lines = [article.title_bn.trim()]
  const excerpt = (article.excerpt_bn || '').trim()
  if (excerpt) lines.push(excerpt.slice(0, 220))
  lines.push(`বিস্তারিত: ${url}`)
  return lines.join('\n\n')
}

export function aggregateMetrics(rows: MetricRow[]): MetricsSummary {
  const totals: Omit<PlatformMetricTotals, 'platform'> = {
    reactions: 0,
    comments: 0,
    shares: 0,
    impressions: 0,
    clicks: 0,
    reach: 0,
    engagement: 0,
  }
  const grouped = new Map<string, PlatformMetricTotals>()
  for (const row of rows) {
    const platform = String(row.platform || 'unknown')
    const entry = grouped.get(platform) ?? {
      platform,
      reactions: 0,
      comments: 0,
      shares: 0,
      impressions: 0,
      clicks: 0,
      reach: 0,
      engagement: 0,
    }
    const reactions = toNonNegativeInt(row.reactions)
    const comments = toNonNegativeInt(row.comments)
    const shares = toNonNegativeInt(row.shares)
    const impressions = toNonNegativeInt(row.impressions)
    const clicks = toNonNegativeInt(row.clicks)
    const reach = toNonNegativeInt(row.reach)
    entry.reactions += reactions
    entry.comments += comments
    entry.shares += shares
    entry.impressions += impressions
    entry.clicks += clicks
    entry.reach += reach
    entry.engagement = entry.reactions + entry.comments + entry.shares
    grouped.set(platform, entry)
    totals.reactions += reactions
    totals.comments += comments
    totals.shares += shares
    totals.impressions += impressions
    totals.clicks += clicks
    totals.reach += reach
  }
  totals.engagement = totals.reactions + totals.comments + totals.shares
  const byPlatform = [...grouped.values()].sort(
    (left, right) =>
      right.engagement - left.engagement ||
      right.impressions - left.impressions ||
      left.platform.localeCompare(right.platform),
  )
  return { byPlatform, totals }
}

export function buildDailyCalendar(input: {
  date?: string
  articles: SocialArticle[]
  bestHours?: Partial<Record<SocialPlatform, number[]>> | null
  now?: Date
}): DailyCalendar {
  const now = input.now ?? new Date()
  const date = input.date ?? bstDateString(now)
  const ranked = rankArticles(input.articles, now)
  const slots: CalendarSlot[] = []
  for (const platform of SOCIAL_PLATFORMS) {
    const hours = hoursFor(platform, input.bestHours ?? null)
    hours.forEach((hour, index) => {
      const article = ranked.length ? ranked[index % ranked.length] : null
      slots.push({
        platform,
        hour_bst: hour,
        scheduled_at: bstSlotToUtcIso(date, hour),
        article_id: article ? article.id : null,
        caption: null,
        status: 'scheduled',
      })
    })
  }
  return { date, slots }
}

function sanitizeCaption(value: string): string {
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, 1_200)
}

export async function loadBestHours(
  supabase: SupabaseClient,
): Promise<Record<SocialPlatform, number[]>> {
  const fallback = SOCIAL_PLATFORMS.reduce(
    (acc, platform) => ({ ...acc, [platform]: [...DEFAULT_BEST_HOURS_BST[platform]] }),
    {} as Record<SocialPlatform, number[]>,
  )
  try {
    const { data } = await supabase
      .from('social_strategy_notes')
      .select('best_hours')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    const stored = (data as { best_hours?: Partial<Record<SocialPlatform, number[]>> } | null)
      ?.best_hours
    if (!stored) return fallback
    for (const platform of SOCIAL_PLATFORMS) {
      const observed = stored[platform]
      if (Array.isArray(observed) && observed.length) {
        fallback[platform] = clampHourDrift(DEFAULT_BEST_HOURS_BST[platform], observed)
      }
    }
    return fallback
  } catch {
    return fallback
  }
}

export async function generateCaption(
  article: SocialArticle,
  url: string,
  platform: SocialPlatform,
  options: { useAi?: boolean; signal?: AbortSignal } = {},
): Promise<{ caption: string; source: 'ai' | 'template' }> {
  const fallback = templateCaption(article, url)
  if (options.useAi === false) return { caption: fallback, source: 'template' }
  const excerpt = (article.excerpt_bn || '').trim().slice(0, 600)
  try {
    const result = await callAiGateway({
      task: 'social_caption',
      messages: [
        {
          role: 'system',
          content:
            'তুমি বাংলার ভয়েস-এর সোশ্যাল মিডিয়া সম্পাদক। শুধু বাংলায়, সংক্ষিপ্ত ও আকর্ষণীয় সোশ্যাল ক্যাপশন লেখো। ইংরেজি বাক্য নয়। লিংক নিজে লিখবে না। কোনো হ্যাশট্যাগ ৩টির বেশি নয়।',
        },
        {
          role: 'user',
          content: `প্ল্যাটফর্ম: ${platform}\nশিরোনাম: ${article.title_bn}\nসারসংক্ষেপ: ${excerpt}\nলিংক: ${url}`,
        },
      ],
      temperature: 0.5,
      maxTokens: 300,
      metadata: { platform, article_id: article.id, surface: 'social_manager' },
      signal: options.signal,
    })
    const caption = sanitizeCaption(result.answer)
    if (!caption) return { caption: fallback, source: 'template' }
    return { caption, source: 'ai' }
  } catch {
    return { caption: fallback, source: 'template' }
  }
}

async function vaultSecret(serviceName: string): Promise<string | null> {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) return null
  const { createClient } = await import('@supabase/supabase-js')
  const client = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: row } = await client
    .from('api_vault')
    .select('key_encrypted')
    .eq('service_name', serviceName)
    .eq('environment', 'prod')
    .eq('is_active', true)
    .maybeSingle()
  if (!row?.key_encrypted) return null
  const { data: plain } = await client.rpc('decrypt_vault_secret', {
    p_secret_id: row.key_encrypted,
  })
  return typeof plain === 'string' && plain.length > 0 ? plain : null
}

function graphNumber(payload: unknown, key: string): number {
  if (!payload || typeof payload !== 'object') return 0
  const record = payload as Record<string, unknown>
  const direct = record[key]
  if (typeof direct === 'number') return toNonNegativeInt(direct)
  const data = record.data
  if (Array.isArray(data)) {
    for (const entry of data) {
      if (entry && typeof entry === 'object') {
        const name = (entry as Record<string, unknown>).name
        if (name === key) {
          const values = (entry as Record<string, unknown>).values
          if (Array.isArray(values) && values.length) {
            const value = (values[0] as Record<string, unknown>)?.value
            return toNonNegativeInt(value)
          }
        }
      }
    }
  }
  return 0
}

export async function fetchInsights(
  platform: SocialPlatform,
  signal?: AbortSignal,
): Promise<PlatformInsight | null> {
  const empty: PlatformInsight = {
    platform,
    impressions: 0,
    reactions: 0,
    comments: 0,
    shares: 0,
    clicks: 0,
    reach: 0,
  }
  try {
    if (platform === 'facebook') {
      const [pageId, token] = await Promise.all([
        vaultSecret('SOCIAL_FACEBOOK_PAGE_ID'),
        vaultSecret('SOCIAL_FACEBOOK_PAGE_TOKEN'),
      ])
      if (!pageId || !token) return null
      const response = await fetch(
        `https://graph.facebook.com/v19.0/${pageId}/insights?metric=page_impressions,page_post_engagements,page_actions_post_reactions_total&period=day&access_token=${encodeURIComponent(token)}`,
        { signal, cache: 'no-store' },
      )
      if (!response.ok) return null
      const payload = (await response.json().catch(() => ({}))) as unknown
      return {
        ...empty,
        impressions: graphNumber(payload, 'page_impressions'),
        reactions: graphNumber(payload, 'page_actions_post_reactions_total'),
        clicks: graphNumber(payload, 'page_post_engagements'),
      }
    }
    if (platform === 'instagram') {
      const [accountId, token] = await Promise.all([
        vaultSecret('SOCIAL_INSTAGRAM_BUSINESS_ACCOUNT_ID'),
        vaultSecret('SOCIAL_INSTAGRAM_ACCESS_TOKEN'),
      ])
      if (!accountId || !token) return null
      const response = await fetch(
        `https://graph.facebook.com/v19.0/${accountId}/insights?metric=impressions,reach,profile_views&period=day&access_token=${encodeURIComponent(token)}`,
        { signal, cache: 'no-store' },
      )
      if (!response.ok) return null
      const payload = (await response.json().catch(() => ({}))) as unknown
      return {
        ...empty,
        impressions: graphNumber(payload, 'impressions'),
        reach: graphNumber(payload, 'reach'),
        clicks: graphNumber(payload, 'profile_views'),
      }
    }
    return null
  } catch {
    return null
  }
}

function metricRow(date: string, insight: PlatformInsight): Record<string, unknown> {
  return {
    platform: insight.platform,
    metrics_date: date,
    impressions: insight.impressions,
    reactions: insight.reactions,
    comments: insight.comments,
    shares: insight.shares,
    clicks: insight.clicks,
    reach: insight.reach,
    updated_at: new Date().toISOString(),
  }
}

export async function runDailyPlan(
  supabase: SupabaseClient,
  options: { date?: string; now?: Date; useAi?: boolean; signal?: AbortSignal } = {},
): Promise<{ date: string; planned: number; aiCaptions: number }> {
  const now = options.now ?? new Date()
  const date = options.date ?? bstDateString(now)
  const { data } = await supabase
    .from('articles')
    .select('id,slug,title_bn,excerpt_bn,category_key,thumbnail_url,featured_image,published_at,ai_confidence,video_id')
    .order('published_at', { ascending: false, nullsFirst: false })
    .limit(40)
  const articles = (data ?? []) as SocialArticle[]
  const bestHours = await loadBestHours(supabase)
  const calendar = buildDailyCalendar({ date, articles, bestHours, now })
  const articleMap = new Map(articles.map((article) => [article.id, article]))
  let aiCaptions = 0
  const rows: Array<Record<string, unknown>> = []
  for (const slot of calendar.slots) {
    const article = slot.article_id ? articleMap.get(slot.article_id) : undefined
    let caption: string | null = article ? templateCaption(article, articleUrl(article)) : null
    if (article && (options.useAi ?? true) && aiCaptions < MAX_AI_CAPTIONS) {
      const generated = await generateCaption(article, articleUrl(article), slot.platform, {
        useAi: true,
        signal: options.signal,
      })
      caption = generated.caption
      if (generated.source === 'ai') aiCaptions += 1
    }
    rows.push({
      calendar_date: date,
      platform: slot.platform,
      hour_bst: slot.hour_bst,
      scheduled_at: slot.scheduled_at,
      article_id: slot.article_id,
      caption,
      status: 'scheduled',
      updated_at: now.toISOString(),
    })
  }
  if (rows.length) {
    const { error } = await supabase
      .from('social_content_calendar')
      .upsert(rows, { onConflict: 'calendar_date,platform,hour_bst' })
    if (error) throw error
  }
  return { date, planned: rows.length, aiCaptions }
}

export async function enqueueDueSlots(
  supabase: SupabaseClient,
  now: Date = new Date(),
): Promise<{ enqueued: number }> {
  const { data } = await supabase
    .from('social_content_calendar')
    .select('id,article_id,platform,caption')
    .eq('status', 'scheduled')
    .lte('scheduled_at', now.toISOString())
    .order('scheduled_at', { ascending: true })
    .limit(50)
  const slots = (data ?? []) as Array<{
    id: string
    article_id: string | null
    platform: SocialPlatform
    caption: string | null
  }>
  let enqueued = 0
  for (const slot of slots) {
    if (!slot.article_id) continue
    const payload = slot.caption ? { caption: slot.caption } : {}
    const { error } = await supabase.from('social_posts').upsert(
      {
        article_id: slot.article_id,
        platform: slot.platform,
        status: 'pending',
        payload,
        attempt_count: 1,
        updated_at: now.toISOString(),
      },
      { onConflict: 'article_id,platform' },
    )
    if (error) continue
    await supabase
      .from('social_content_calendar')
      .update({ status: 'enqueued', updated_at: now.toISOString() })
      .eq('id', slot.id)
    enqueued += 1
  }
  return { enqueued }
}

export async function refreshMetrics(
  supabase: SupabaseClient,
  options: { now?: Date; signal?: AbortSignal } = {},
): Promise<{ date: string; platforms: number }> {
  const now = options.now ?? new Date()
  const date = bstDateString(now)
  let platforms = 0
  for (const platform of SOCIAL_PLATFORMS) {
    const insight = await fetchInsights(platform, options.signal)
    if (!insight) continue
    const { error } = await supabase
      .from('social_post_metrics')
      .upsert(metricRow(date, insight), { onConflict: 'platform,metrics_date' })
    if (!error) platforms += 1
  }
  return { date, platforms }
}

function parseStrategy(content: string): { best_hours: Partial<Record<SocialPlatform, number[]>>; summary: string } | null {
  try {
    const start = content.indexOf('{')
    const end = content.lastIndexOf('}')
    if (start < 0 || end < start) return null
    const parsed = JSON.parse(content.slice(start, end + 1)) as {
      best_hours?: Partial<Record<SocialPlatform, number[]>>
      summary?: string
    }
    const best_hours: Partial<Record<SocialPlatform, number[]>> = {}
    for (const platform of SOCIAL_PLATFORMS) {
      const observed = parsed.best_hours?.[platform]
      if (Array.isArray(observed) && observed.length) {
        best_hours[platform] = clampHourDrift(DEFAULT_BEST_HOURS_BST[platform], observed)
      }
    }
    const summary = typeof parsed.summary === 'string' ? parsed.summary.trim().slice(0, 2_000) : ''
    if (!summary) return null
    return { best_hours, summary }
  } catch {
    return null
  }
}

export async function generateWeeklyStrategy(
  supabase: SupabaseClient,
  options: { now?: Date; signal?: AbortSignal } = {},
): Promise<{ week_start: string; source: 'ai' | 'fallback'; summary: string }> {
  const now = options.now ?? new Date()
  const weekStart = mondayOf(now)
  const since = new Date(now.getTime() - 7 * DAY_MS).toISOString().slice(0, 10)
  const { data } = await supabase
    .from('social_post_metrics')
    .select('platform,reactions,comments,shares,impressions,clicks,reach')
    .gte('metrics_date', since)
  const summary = aggregateMetrics((data ?? []) as MetricRow[])
  const metricsText = summary.byPlatform
    .map(
      (row) =>
        `${row.platform}: engagement=${row.engagement} impressions=${row.impressions} clicks=${row.clicks}`,
    )
    .join('\n')
  let parsed: { best_hours: Partial<Record<SocialPlatform, number[]> >; summary: string } | null = null
  try {
    const result = await callAiGateway({
      task: 'news_classify',
      messages: [
        {
          role: 'system',
          content:
            'তুমি বাংলার ভয়েস-এর সোশ্যাল মিডিয়া স্ট্র্যাটেজিস্ট। শুধু বৈধ JSON দাও: {"best_hours":{"facebook":[8,13,17,21],"instagram":[...],"x":[...],"linkedin":[...],"telegram":[...]},"summary":"বাংলায় সংক্ষিপ্ত কৌশল"}. ঘণ্টা ০-২৩ এর মধ্যে।',
        },
        {
          role: 'user',
          content: `গত সপ্তাহের পারফরম্যান্স:\n${metricsText || 'কোনো ডেটা নেই'}`,
        },
      ],
      temperature: 0.3,
      maxTokens: 500,
      metadata: { week_start: weekStart, surface: 'social_manager' },
      signal: options.signal,
    })
    parsed = parseStrategy(result.answer)
  } catch {
    parsed = null
  }
  const bestHours = parsed?.best_hours ?? {}
  const finalSummary =
    parsed?.summary ||
    `স্বয়ংক্রিয় কৌশল: ${weekStart} সপ্তাহের জন্য সেরা সময় ডিফল্ট BST ঘণ্টা ধরে রাখা হয়েছে। মোট এনগেজমেন্ট ${summary.totals.engagement}।`
  await supabase.from('social_strategy_notes').upsert(
    {
      week_start: weekStart,
      best_hours: bestHours,
      summary: finalSummary,
      payload: { totals: summary.totals, by_platform: summary.byPlatform },
      updated_at: now.toISOString(),
    },
    { onConflict: 'week_start' },
  )
  return { week_start: weekStart, source: parsed ? 'ai' : 'fallback', summary: finalSummary }
}

export async function runSocialManager(
  task: SocialManagerTask,
  supabase: SupabaseClient,
  options: { now?: Date; signal?: AbortSignal; useAi?: boolean } = {},
): Promise<Record<string, unknown>> {
  switch (task) {
    case 'daily_plan': {
      const plan = await runDailyPlan(supabase, options)
      const enqueued = await enqueueDueSlots(supabase, options.now)
      return { task, ...plan, enqueued: enqueued.enqueued }
    }
    case 'metrics':
      return { task, ...(await refreshMetrics(supabase, options)) }
    case 'weekly_strategy':
      return { task, ...(await generateWeeklyStrategy(supabase, options)) }
    case 'run':
    default: {
      const plan = await runDailyPlan(supabase, options)
      const enqueued = await enqueueDueSlots(supabase, options.now)
      const metrics = await refreshMetrics(supabase, options)
      return { task: 'run', plan, enqueued, metrics }
    }
  }
}
