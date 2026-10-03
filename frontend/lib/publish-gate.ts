// Canonical: worker/src/lib/publish-gate.ts
// Keep byte-identical with frontend/lib/publish-gate.ts (npm run check:publish-gate).

export const PIPELINE_INTERVAL_MINUTES = 14
export const PIPELINE_CRON = '*/14 * * * *'
export const ITEM_MAX_AGE_MS = 48 * 60 * 60 * 1000
export const FEED_403_DISABLE_THRESHOLD = 3
export const STALE_LOCK_MS = 10 * 60 * 1000
export const MIN_BODY_CHARS = 200
export const DEFAULT_MIN_AI_SCORE = 40
export const COPY_SIMILARITY_MAX = 0.85
export const SOURCE_DUE_GRACE_MINUTES = 2

export type RiskLevel = 'low' | 'medium' | 'high'
export type PublishAction = 'publish' | 'hold' | 'reject'
export type SourceFetchStatus = 'ok' | '403' | 'error' | 'skipped_not_due'

export type SourceFetchOutcome = {
  status: SourceFetchStatus
  http_status?: number
  at: string
}

export type PublishGateInput = {
  autoPublish: boolean
  sourceEnabled: boolean
  killSwitch: boolean
  sourceUrl: string
  imageUrl: string
  isFallback: boolean
  rewriteMethod: string
  bodyBn: string
  titleBn: string
  sourceText?: string
  sourcePublishedAt?: string | null
  category?: string
  now?: number
  minAiScore?: number
}

export type PublishGateResult = {
  action: PublishAction
  reason: string
  riskLevel: RiskLevel
  score: number
}

const HIGH_TERMS = [
  'হত্যা',
  'নিহত',
  'মৃতদেহ',
  'খুন',
  'গণহত্যা',
  'আত্মহত্যা',
  'ধর্ষণ',
  'শিশু নির্যাতন',
  'যৌন নির্যাতন',
  'সাম্প্রদায়িক',
  'সাম্প্রদায়িক',
  'মন্দির ভাঙচুর',
  'মসজিদ ভাঙচুর',
  'গণপিটুনি',
  'lynching',
  'murder',
  'murdered',
  'killed',
  'genocide',
  'rape',
  'suicide',
  'communal riot',
  'blasphemy',
]

const MEDIUM_TERMS = [
  'গ্রেপ্তার',
  'অভিযোগ',
  'মামলা',
  'নির্বাচন',
  'ভোট',
  'সহিংসতা',
  'সংঘর্ষ',
  'হামলা',
  'গুজব',
  'ওষুধ',
  'চিকিৎসা',
  'ভ্যাকসিন',
  'নিরাময়',
  'নিরাময়',
  'arrest',
  'accused',
  'allegation',
  'election',
  'vote',
  'clash',
  'attack',
  'rumour',
  'rumor',
  'unverified',
  'vaccine',
  'miracle cure',
  'treatment claim',
]

const HIGH_CATEGORIES = new Set(['politics', 'health'])

export function minAiScore(env: NodeJS.ProcessEnv = process.env): number {
  const n = Number.parseInt(env.MIN_AI_SCORE ?? '', 10)
  return Number.isFinite(n) && n >= 0 && n <= 100 ? n : DEFAULT_MIN_AI_SCORE
}

export function isAutoPublish(env: NodeJS.ProcessEnv = process.env): boolean {
  return (env.AUTO_PUBLISH ?? '').toLowerCase() === 'true'
}

export function isRecentEnough(iso: string | null | undefined, now = Date.now()): boolean {
  if (!iso) return true
  const t = Date.parse(iso)
  if (Number.isNaN(t)) return true
  return now - t <= ITEM_MAX_AGE_MS
}

export function isSourceDue(
  lastFetchedAt: string | null | undefined,
  intervalMinutes: number,
  now = Date.now(),
): boolean {
  if (!lastFetchedAt) return true
  const t = Date.parse(lastFetchedAt)
  if (Number.isNaN(t)) return true
  const minutes = intervalMinutes > 0 ? intervalMinutes : PIPELINE_INTERVAL_MINUTES
  const effectiveMinutes = Math.max(1, minutes - SOURCE_DUE_GRACE_MINUTES)
  return now - t >= effectiveMinutes * 60 * 1000
}

export function lastFetchAt(
  runs: Array<{ details?: { sources?: Record<string, SourceFetchOutcome> } | null }>,
  sourceKey: string,
): string | null {
  for (const run of runs) {
    const at = run.details?.sources?.[sourceKey]?.at
    if (at) return at
  }
  return null
}

export function isValidHttpsUrl(value: string): boolean {
  try {
    const url = new URL(value)
    const host = url.hostname.toLowerCase().replace(/\.$/, '')
    if (url.protocol !== 'https:') return false
    if (url.username || url.password) return false
    if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local')) return false
    return host.includes('.')
  } catch {
    return false
  }
}

export function isValidHttpsImageUrl(value: string): boolean {
  if (!isValidHttpsUrl(value)) return false
  try {
    const url = new URL(value)
    return (
      /\.(jpe?g|png|webp|gif|avif)(\?|$)/i.test(url.pathname) ||
      url.hostname.includes('pexels') ||
      url.hostname.includes('wikimedia') ||
      url.hostname.includes('openverse')
    )
  } catch {
    return false
  }
}

export function bengaliRatio(text: string): number {
  const chars = [...text].filter((ch) => !/\s/u.test(ch))
  if (chars.length === 0) return 0
  let bn = 0
  for (const ch of chars) {
    const code = ch.codePointAt(0) ?? 0
    if (code >= 0x0980 && code <= 0x09ff) bn += 1
  }
  return bn / chars.length
}

function tokenSet(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .split(/\s+/u)
      .map((t) => t.replace(/[^\p{L}\p{N}]+/gu, ''))
      .filter((t) => t.length > 2),
  )
}

export function copySimilarity(a: string, b: string): number {
  const left = tokenSet(a)
  const right = tokenSet(b)
  if (left.size === 0 || right.size === 0) return 0
  let inter = 0
  for (const token of left) {
    if (right.has(token)) inter += 1
  }
  return inter / (left.size + right.size - inter)
}

export function computeScore(input: {
  titleBn: string
  bodyBn: string
  sourceUrl: string
  imageUrl: string
  isFallback: boolean
  rewriteMethod: string
  sourceText?: string
}): number {
  let score = 0
  if (bengaliRatio(input.bodyBn) >= 0.6) score += 20
  if (input.bodyBn.trim().length >= MIN_BODY_CHARS) score += 20
  if (input.titleBn.trim().length >= 8 && bengaliRatio(input.titleBn) >= 0.3) score += 15
  if (isValidHttpsImageUrl(input.imageUrl) && !input.isFallback) score += 15
  if (isValidHttpsUrl(input.sourceUrl)) score += 10
  const similar = copySimilarity(input.bodyBn, input.sourceText || '')
  if (!input.sourceText || similar < COPY_SIMILARITY_MAX) score += 10
  if (input.rewriteMethod === 'ai') score += 10
  return Math.max(0, Math.min(100, score))
}

export function computeRiskLevel(
  titleBn: string,
  bodyBn: string,
  category = '',
): { level: RiskLevel; matched: string | null } {
  const text = `${titleBn} ${bodyBn}`.toLowerCase()
  for (const term of HIGH_TERMS) {
    if (text.includes(term.toLowerCase())) return { level: 'high', matched: term }
  }
  for (const term of MEDIUM_TERMS) {
    if (text.includes(term.toLowerCase())) return { level: 'medium', matched: term }
  }
  if (HIGH_CATEGORIES.has(category.trim().toLowerCase())) {
    return { level: 'medium', matched: `category:${category}` }
  }
  return { level: 'low', matched: null }
}

export function decidePublish(input: PublishGateInput): PublishGateResult {
  const now = input.now ?? Date.now()
  const threshold = input.minAiScore ?? minAiScore()
  const score = computeScore(input)
  const risk = computeRiskLevel(input.titleBn, input.bodyBn, input.category)
  const riskLevel = risk.level

  if (!isRecentEnough(input.sourcePublishedAt, now)) {
    return { action: 'reject', reason: 'older_than_48h', riskLevel, score }
  }
  if (!input.sourceEnabled || input.killSwitch) {
    return { action: 'reject', reason: input.killSwitch ? 'kill_switch' : 'source_disabled', riskLevel, score }
  }
  if (!isValidHttpsUrl(input.sourceUrl)) {
    return { action: 'hold', reason: 'missing_source_url', riskLevel, score }
  }
  if (input.rewriteMethod !== 'ai') {
    return { action: 'hold', reason: 'rewrite_not_ai', riskLevel, score }
  }
  if (input.bodyBn.trim().length < MIN_BODY_CHARS) {
    return { action: 'hold', reason: 'body_too_short', riskLevel, score }
  }
  if (!isValidHttpsImageUrl(input.imageUrl) || input.isFallback) {
    return { action: 'hold', reason: input.isFallback ? 'image_fallback' : 'missing_image', riskLevel, score }
  }
  if (riskLevel === 'high') {
    return { action: 'hold', reason: `risk_high:${risk.matched ?? 'keyword'}`, riskLevel, score }
  }
  if (!input.autoPublish) {
    return { action: 'hold', reason: 'auto_publish_disabled', riskLevel, score }
  }
  if (riskLevel === 'medium') {
    if (score < threshold + 10) {
      return { action: 'hold', reason: 'risk_medium_score', riskLevel, score }
    }
  } else if (score < threshold) {
    return { action: 'hold', reason: 'score_below_min', riskLevel, score }
  }
  return { action: 'publish', reason: 'ok', riskLevel, score }
}

export function consecutive403Count(
  runsNewestFirst: Array<{ details?: { sources?: Record<string, SourceFetchOutcome> } | null }>,
  sourceKey: string,
): number {
  let n = 0
  for (const run of runsNewestFirst) {
    const outcome = run.details?.sources?.[sourceKey]
    if (!outcome) continue
    if (outcome.status === '403') {
      n += 1
      if (n >= FEED_403_DISABLE_THRESHOLD) return n
    } else {
      break
    }
  }
  return n
}

export function shouldDisableAfter403(
  previousRunsNewestFirst: Array<{ details?: { sources?: Record<string, SourceFetchOutcome> } | null }>,
  sourceKey: string,
): boolean {
  return consecutive403Count(previousRunsNewestFirst, sourceKey) + 1 >= FEED_403_DISABLE_THRESHOLD
}
