import { NextResponse } from 'next/server';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { dhakaDayStartIso, fetchReadiness, type PlatformLimit } from '../../../../lib/social-platforms';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const BASE_URL = 'https://www.banglarvoice24news.com';
type Platform = 'facebook' | 'instagram' | 'x' | 'linkedin' | 'telegram' | 'tiktok';

type QueueRow = {
  id: string;
  article_id: string;
  platform: Platform;
  attempt_count: number;
};

type Article = {
  id: string;
  slug?: string | null;
  title_bn: string;
  thumbnail_url: string | null;
  featured_image: string | null;
  category_key: string | null;
  video_id: string | null;
};

type PublishResult = {
  status: 'published' | 'failed' | 'skipped';
  external_post_id?: string;
  error?: string;
};

function admin(): SupabaseClient {
  // Server-only credentials. SUPABASE_URL is the canonical server variable;
  // NEXT_PUBLIC_SUPABASE_URL is only a fallback for older deployments.
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase admin credentials are not configured');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function vaultSecret(serviceName: string): Promise<string | null> {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return null;
  const client = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: row } = await client.from('api_vault').select('key_encrypted').eq('service_name', serviceName).eq('environment', 'prod').eq('is_active', true).maybeSingle();
  if (!row?.key_encrypted) return null;
  const { data: plain } = await client.rpc('decrypt_vault_secret', { p_secret_id: row.key_encrypted });
  return typeof plain === 'string' && plain.length > 0 ? plain : null;
}

async function authorized(request: Request): Promise<boolean> {
  const secret =
    (await vaultSecret('CRON_SECRET')) ||
    (await vaultSecret('NEWSROOM_INGEST_KEY')) ||
    process.env.CRON_SECRET ||
    process.env.NEWSROOM_INGEST_KEY;
  if (!secret) return false;
  const header = request.headers.get('authorization') || '';
  const vercelCron = request.headers.get('x-vercel-cron');
  return (
    header === `Bearer ${secret}` ||
    request.headers.get('x-cron-secret') === secret ||
    (Boolean(vercelCron) && Boolean(process.env.CRON_SECRET) && secret === process.env.CRON_SECRET)
  );
}

async function graph(path: string, body: Record<string, string>) {
  const response = await fetch(`https://graph.facebook.com/v19.0/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  return { response, data };
}

function articleUrl(article: Article): string {
  return `${BASE_URL}/article/${encodeURIComponent(article.slug || article.id)}`;
}

function videoSuffix(youtubeId?: string): string {
  return youtubeId ? `\n\nভিডিও: https://www.youtube.com/watch?v=${youtubeId}` : '';
}

// Facebook suppresses reach on posts that carry an outbound link, so the post
// body stays link-free and the URL is added as the first comment instead.
function facebookCaption(article: Article): string {
  return article.title_bn.slice(0, 450);
}

// Instagram captions cannot carry clickable links; point readers to the bio and
// stay within the 2200 character limit.
function instagramCaption(article: Article): string {
  const suffix = '\n\nবিস্তারিত লিংক বায়োতে।';
  return `${article.title_bn.slice(0, Math.max(0, 2200 - suffix.length))}${suffix}`;
}

async function publish(platform: Platform, article: Article, youtubeId?: string): Promise<PublishResult> {
  const url = articleUrl(article);
  const cardUrl = `${BASE_URL}/api/social-card/${article.id}`;

  if (platform === 'facebook') {
    const [pageId, token] = await Promise.all([vaultSecret('SOCIAL_FACEBOOK_PAGE_ID'), vaultSecret('SOCIAL_FACEBOOK_PAGE_TOKEN')]);
    if (!pageId || !token) return { status: 'skipped', error: 'missing Facebook credentials' };
    const post = await graph(`${pageId}/feed`, { message: facebookCaption(article), access_token: token });
    if (!post.response.ok || !post.data?.id) return { status: 'failed', error: post.data?.error?.message || 'Facebook publish failed' };
    // Link goes in the first comment. A comment failure must not fail the post.
    const comment = await graph(`${post.data.id}/comments`, { message: url, access_token: token });
    if (!comment.response.ok) console.error('[social] facebook first-comment failed', { article_id: article.id });
    return { status: 'published', external_post_id: post.data.id };
  }

  if (platform === 'instagram') {
    const [accountId, token] = await Promise.all([vaultSecret('SOCIAL_INSTAGRAM_BUSINESS_ACCOUNT_ID'), vaultSecret('SOCIAL_INSTAGRAM_ACCESS_TOKEN')]);
    if (!accountId || !token) return { status: 'skipped', error: 'missing Instagram credentials' };
    const imageUrl = article.featured_image || article.thumbnail_url || cardUrl;
    if (!/^https:\/\//i.test(imageUrl)) return { status: 'skipped', error: 'instagram_requires_public_https_image' };
    const created = await graph(`${accountId}/media`, { image_url: imageUrl, caption: instagramCaption(article), access_token: token });
    if (!created.response.ok || !created.data?.id) return { status: 'failed', error: created.data?.error?.message || 'Instagram media creation failed' };
    const published = await graph(`${accountId}/media_publish`, { creation_id: created.data.id, access_token: token });
    return published.response.ok && published.data?.id
      ? { status: 'published', external_post_id: published.data.id }
      : { status: 'failed', error: published.data?.error?.message || 'Instagram publish failed' };
  }

  if (platform === 'x') {
    const token = await vaultSecret('SOCIAL_X_ACCESS_TOKEN');
    if (!token) return { status: 'skipped', error: 'missing X credentials' };
    const response = await fetch('https://api.x.com/2/tweets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ text: `${article.title_bn}\n${url}${videoSuffix(youtubeId)}`.slice(0, 280) }),
    });
    const data = await response.json().catch(() => ({}));
    return response.ok && data?.data?.id
      ? { status: 'published', external_post_id: data.data.id }
      : { status: 'failed', error: data?.detail || data?.title || 'X publish failed' };
  }

  if (platform === 'linkedin') {
    const [token, organizationId] = await Promise.all([vaultSecret('SOCIAL_LINKEDIN_ACCESS_TOKEN'), vaultSecret('SOCIAL_LINKEDIN_ORGANIZATION_ID')]);
    if (!token || !organizationId) return { status: 'skipped', error: 'missing LinkedIn credentials' };
    const response = await fetch('https://api.linkedin.com/v2/ugcPosts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        author: `urn:li:organization:${organizationId}`,
        lifecycleState: 'PUBLISHED',
        specificContent: { 'com.linkedin.ugc.ShareContent': { shareCommentary: { text: `${article.title_bn}\n\n${url}` }, shareMediaCategory: 'ARTICLE', media: [{ status: 'READY', originalUrl: url, title: { text: article.title_bn } }] } },
        visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
      }),
    });
    const data = await response.json().catch(() => ({}));
    return response.ok && data?.id
      ? { status: 'published', external_post_id: data.id }
      : { status: 'failed', error: data?.message || 'LinkedIn publish failed' };
  }

  if (platform === 'tiktok') {
    // Phase 1 stub: TikTok stays disabled in the readiness registry and is
    // never enqueued. Kept here so a manual row cannot silently publish.
    return { status: 'skipped', error: 'tiktok_not_configured' };
  }

  const [bot, channel] = await Promise.all([vaultSecret('SOCIAL_TELEGRAM_BOT_TOKEN'), vaultSecret('SOCIAL_TELEGRAM_CHANNEL_ID')]);
  if (!bot || !channel) return { status: 'skipped', error: 'missing Telegram credentials' };
  const response = await fetch(`https://api.telegram.org/bot${bot}/sendPhoto`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: channel, photo: cardUrl, caption: `${article.title_bn}\n\nবিস্তারিত সংবাদ: ${url}${videoSuffix(youtubeId)}`.slice(0, 1024) }),
  });
  const data = await response.json().catch(() => ({}));
  return data?.ok
    ? { status: 'published', external_post_id: String(data.result?.message_id || '') }
    : { status: 'failed', error: data?.description || 'Telegram publish failed' };
}

/** Reason a ready platform must wait this run, or null when it may publish. */
function rateLimitReason(
  platform: string,
  limits: Record<string, PlatformLimit>,
  dailyCount: Map<string, number>,
  lastPosted: Map<string, number>,
): string | null {
  const limit = limits[platform];
  if (!limit) return null;
  if (limit.daily !== null && (dailyCount.get(platform) || 0) >= limit.daily) return 'daily_post_limit';
  if (limit.minGapMinutes > 0) {
    const last = lastPosted.get(platform);
    if (last && Date.now() - last < limit.minGapMinutes * 60_000) return 'min_gap_minutes';
  }
  return null;
}

export async function GET(request: Request) {
  return POST(request);
}

export async function POST(request: Request) {
  if (!(await authorized(request))) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  // Social dispatch is enabled by default; an explicit false is the only kill switch.
  if (process.env.SOCIAL_AUTOMATION_ENABLED === 'false') {
    return NextResponse.json({ ok: true, processed: 0, disabled: true });
  }

  const supabase = admin();

  // Phase 1 readiness gate. Fails closed: only platforms that are enabled,
  // name-verified and fully credentialled are read from or written to.
  const snapshot = await fetchReadiness(supabase);
  let { ready, limits, degraded } = snapshot;
  if (degraded) console.error('[social] readiness registry unavailable; trying vault credentials');
  if (!ready.length) {
    const vaultReady: string[] = [];
    const checks: Array<{ platform: Platform; services: string[] }> = [
      { platform: 'facebook', services: ['SOCIAL_FACEBOOK_PAGE_ID', 'SOCIAL_FACEBOOK_PAGE_TOKEN'] },
      { platform: 'instagram', services: ['SOCIAL_INSTAGRAM_BUSINESS_ACCOUNT_ID', 'SOCIAL_INSTAGRAM_ACCESS_TOKEN'] },
      { platform: 'x', services: ['SOCIAL_X_ACCESS_TOKEN'] },
      { platform: 'linkedin', services: ['SOCIAL_LINKEDIN_ACCESS_TOKEN', 'SOCIAL_LINKEDIN_ORGANIZATION_ID'] },
      { platform: 'telegram', services: ['SOCIAL_TELEGRAM_BOT_TOKEN', 'SOCIAL_TELEGRAM_CHANNEL_ID'] },
    ];
    for (const check of checks) {
      const values = await Promise.all(check.services.map((name) => vaultSecret(name)));
      if (values.every((value) => Boolean(value))) vaultReady.push(check.platform);
    }
    if (!vaultReady.length) {
      return NextResponse.json({ ok: true, processed: 0, ready: 0, degraded, reason: 'no_ready_platforms' });
    }
    ready = vaultReady;
    limits = Object.fromEntries(vaultReady.map((platform) => [platform, { daily: 24, minGapMinutes: 20 }]));
    degraded = false;
  }

  const queue = await supabase
    .from('social_posts')
    .select('id, article_id, platform, attempt_count')
    .eq('status', 'pending')
    .in('platform', ready)
    .order('created_at', { ascending: true })
    .limit(30);
  if (queue.error) return NextResponse.json({ error: 'queue_read_failed' }, { status: 500 });

  const retryable = await supabase
    .from('social_posts')
    .select('id, article_id, platform, attempt_count')
    .eq('status', 'failed')
    .in('platform', ready)
    .lt('attempt_count', 5)
    .order('updated_at', { ascending: true })
    .limit(10);

  const pendingRows = [...((queue.data || []) as QueueRow[]), ...((retryable.data || []) as QueueRow[])];
  if (!pendingRows.length) return NextResponse.json({ ok: true, processed: 0, ready: ready.length });

  const articleIds = [...new Set(pendingRows.map((row) => row.article_id))];
  const { data: articles } = await supabase.from('articles').select('id,slug,title_bn,thumbnail_url,featured_image,category_key,video_id').in('id', articleIds);
  const articleMap = new Map(((articles as Article[]) || []).map((article) => [article.id, article]));
  const videoIds = ((articles as Article[]) || []).map((article) => article.video_id).filter((id): id is string => Boolean(id));
  const { data: videos } = videoIds.length ? await supabase.from('videos').select('id,youtube_id').in('id', videoIds) : { data: [] };
  const videoMap = new Map(((videos as Array<{ id: string; youtube_id: string }>) || []).map((video) => [video.id, video.youtube_id]));

  // Safety rails: per-platform publish budget for the current Dhaka day and the
  // most recent publish time, used to space posts out.
  const { data: publishedToday } = await supabase
    .from('social_posts')
    .select('platform')
    .eq('status', 'published')
    .in('platform', ready)
    .gte('posted_at', dhakaDayStartIso());
  const dailyCount = new Map<string, number>();
  for (const row of (publishedToday || []) as Array<{ platform?: string }>) {
    if (row.platform) dailyCount.set(row.platform, (dailyCount.get(row.platform) || 0) + 1);
  }

  const { data: recent } = await supabase
    .from('social_posts')
    .select('platform,posted_at')
    .eq('status', 'published')
    .in('platform', ready)
    .not('posted_at', 'is', null)
    .order('posted_at', { ascending: false })
    .limit(100);
  const lastPosted = new Map<string, number>();
  for (const row of (recent || []) as Array<{ platform?: string; posted_at?: string | null }>) {
    if (row.platform && row.posted_at && !lastPosted.has(row.platform)) {
      lastPosted.set(row.platform, new Date(row.posted_at).getTime());
    }
  }

  const results: Array<{ platform: string; status: string; article_id: string; error?: string }> = [];

  for (const row of pendingRows) {
    const article = articleMap.get(row.article_id);
    if (!article) {
      results.push({ platform: row.platform, status: 'failed', article_id: row.article_id, error: 'article_not_found' });
      continue;
    }

    const reason = rateLimitReason(row.platform, limits, dailyCount, lastPosted);
    if (reason) {
      // Left pending on purpose so it is retried once the window clears.
      results.push({ platform: row.platform, status: 'deferred', article_id: row.article_id, error: reason });
      continue;
    }

    try {
      const result = await publish(row.platform, article, article.video_id ? videoMap.get(article.video_id) : undefined);
      const now = new Date().toISOString();
      await supabase.from('social_posts').update({
        status: result.status,
        external_post_id: result.external_post_id || null,
        error_message: result.error || null,
        attempt_count: row.attempt_count + 1,
        updated_at: now,
        posted_at: result.status === 'published' ? now : null,
      }).eq('id', row.id);
      if (result.status === 'published') {
        dailyCount.set(row.platform, (dailyCount.get(row.platform) || 0) + 1);
        lastPosted.set(row.platform, Date.now());
      }
      results.push({ platform: row.platform, status: result.status, article_id: row.article_id, error: result.error });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown publish error';
      await supabase.from('social_posts').update({ status: 'failed', error_message: message, attempt_count: row.attempt_count + 1, updated_at: new Date().toISOString() }).eq('id', row.id);
      results.push({ platform: row.platform, status: 'failed', article_id: row.article_id, error: message });
    }
  }

  return NextResponse.json({ ok: true, processed: results.length, ready: ready.length, results });
}
