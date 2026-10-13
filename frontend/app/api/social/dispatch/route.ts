import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const BASE_URL = 'https://www.banglarvoice24news.com';
type Platform = 'facebook' | 'instagram' | 'x' | 'linkedin' | 'telegram';

type QueueRow = {
  id: string;
  article_id: string;
  platform: Platform;
  attempt_count: number;
  payload?: { caption?: string | null } | null;
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

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
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
  const secret = await vaultSecret('CRON_SECRET') || await vaultSecret('NEWSROOM_INGEST_KEY');
  if (!secret) return false;
  const header = request.headers.get('authorization') || '';
  return header === `Bearer ${secret}` || request.headers.get('x-cron-secret') === secret;
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

function articleText(article: Article, articleUrl: string, youtubeId?: string, caption?: string | null) {
  const video = youtubeId ? `\n\nভিডিও: https://www.youtube.com/watch?v=${youtubeId}` : '';
  if (caption && caption.trim()) return `${caption.trim()}\n\nবিস্তারিত: ${articleUrl}${video}`;
  return `${article.title_bn}\n\nবিস্তারিত সংবাদ: ${articleUrl}${video}`;
}

async function publish(platform: Platform, article: Article, youtubeId?: string, caption?: string | null) {
  const articleUrl = `${BASE_URL}/article/${encodeURIComponent(article.slug || article.id)}`;
  const cardUrl = `${BASE_URL}/api/social-card/${article.id}`;
  const text = articleText(article, articleUrl, youtubeId, caption);
  const imageUrl = article.featured_image || article.thumbnail_url || cardUrl;

  if (platform === 'facebook') {
    const [pageId, token] = await Promise.all([vaultSecret('SOCIAL_FACEBOOK_PAGE_ID'), vaultSecret('SOCIAL_FACEBOOK_PAGE_TOKEN')]);
    if (!pageId || !token) return { status: 'skipped', error: 'missing Facebook credentials' };
    const { response, data } = await graph(`${pageId}/feed`, { message: text, link: articleUrl, access_token: token });
    return response.ok && data?.id ? { status: 'published', external_post_id: data.id } : { status: 'failed', error: data?.error?.message || 'Facebook publish failed' };
  }

  if (platform === 'instagram') {
    const [accountId, token] = await Promise.all([vaultSecret('SOCIAL_INSTAGRAM_BUSINESS_ACCOUNT_ID'), vaultSecret('SOCIAL_INSTAGRAM_ACCESS_TOKEN')]);
    if (!accountId || !token) return { status: 'skipped', error: 'missing Instagram credentials' };
    const created = await graph(`${accountId}/media`, { image_url: imageUrl, caption: text.slice(0, 2200), access_token: token });
    if (!created.response.ok || !created.data?.id) return { status: 'failed', error: created.data?.error?.message || 'Instagram media creation failed' };
    const published = await graph(`${accountId}/media_publish`, { creation_id: created.data.id, access_token: token });
    return published.response.ok && published.data?.id ? { status: 'published', external_post_id: published.data.id } : { status: 'failed', error: published.data?.error?.message || 'Instagram publish failed' };
  }

  if (platform === 'x') {
    const token = await vaultSecret('SOCIAL_X_ACCESS_TOKEN');
    if (!token) return { status: 'skipped', error: 'missing X credentials' };
    const response = await fetch('https://api.x.com/2/tweets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ text: text.slice(0, 280) }),
    });
    const data = await response.json().catch(() => ({}));
    return response.ok && data?.data?.id ? { status: 'published', external_post_id: data.data.id } : { status: 'failed', error: data?.detail || data?.title || 'X publish failed' };
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
        specificContent: { 'com.linkedin.ugc.ShareContent': { shareCommentary: { text }, shareMediaCategory: 'ARTICLE', media: [{ status: 'READY', originalUrl: articleUrl, title: { text: article.title_bn } }] } },
        visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
      }),
    });
    const data = await response.json().catch(() => ({}));
    return response.ok && data?.id ? { status: 'published', external_post_id: data.id } : { status: 'failed', error: data?.message || 'LinkedIn publish failed' };
  }

  const [bot, channel] = await Promise.all([vaultSecret('SOCIAL_TELEGRAM_BOT_TOKEN'), vaultSecret('SOCIAL_TELEGRAM_CHANNEL_ID')]);
  if (!bot || !channel) return { status: 'skipped', error: 'missing Telegram credentials' };
  const response = await fetch(`https://api.telegram.org/bot${bot}/sendPhoto`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: channel, photo: cardUrl, caption: text.slice(0, 1024) }),
  });
  const data = await response.json().catch(() => ({}));
  return data?.ok ? { status: 'published', external_post_id: String(data.result?.message_id || '') } : { status: 'failed', error: data?.description || 'Telegram publish failed' };
}

export async function POST(request: Request) {
  if (!(await authorized(request))) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  // Social dispatch is enabled by default; an explicit false is the only kill switch.
  // Platform credentials remain Vault-backed, so missing credentials are skipped safely.
  if (process.env.SOCIAL_AUTOMATION_ENABLED === 'false') {
    return NextResponse.json({ ok: true, processed: 0, disabled: true });
  }
  const supabase = admin();
  const { data: queue, error: queueError } = await supabase
    .from('social_posts')
    .select('id, article_id, platform, attempt_count, payload')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(30);
  if (queueError) return NextResponse.json({ error: 'queue_read_failed' }, { status: 500 });
  const retryable = await supabase
    .from('social_posts')
    .select('id, article_id, platform, attempt_count, payload')
    .eq('status', 'failed')
    .lt('attempt_count', 5)
    .order('updated_at', { ascending: true })
    .limit(10);
  const pendingRows = [...((queue || []) as QueueRow[]), ...((retryable.data || []) as QueueRow[])]
  if (!pendingRows.length) return NextResponse.json({ ok: true, processed: 0 });

  const articleIds = [...new Set(pendingRows.map((row) => row.article_id))];
  const { data: articles } = await supabase.from('articles').select('id,slug,title_bn,thumbnail_url,featured_image,category_key,video_id').in('id', articleIds);
  const articleMap = new Map((articles as Article[] || []).map((article) => [article.id, article]));
  const videoIds = (articles as Article[] || []).map((article) => article.video_id).filter((id): id is string => Boolean(id));
  const { data: videos } = videoIds.length ? await supabase.from('videos').select('id,youtube_id').in('id', videoIds) : { data: [] };
  const videoMap = new Map((videos || []).map((video) => [video.id, video.youtube_id]));
  const results: Array<{ platform: string; status: string; article_id: string; error?: string }> = [];

  for (const row of pendingRows) {
    const article = articleMap.get(row.article_id);
    if (!article) {
      results.push({ platform: row.platform, status: 'failed', article_id: row.article_id, error: 'article_not_found' });
      continue;
    }
    try {
      const result = await publish(row.platform, article, article.video_id ? videoMap.get(article.video_id) : undefined, row.payload?.caption);
      const now = new Date().toISOString();
      await supabase.from('social_posts').update({
        status: result.status,
        external_post_id: result.external_post_id || null,
        error_message: result.error || null,
        attempt_count: row.attempt_count + 1,
        updated_at: now,
        posted_at: result.status === 'published' ? now : null,
      }).eq('id', row.id);
      results.push({ platform: row.platform, status: result.status, article_id: row.article_id, error: result.error });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown publish error';
      await supabase.from('social_posts').update({ status: 'failed', error_message: message, attempt_count: row.attempt_count + 1, updated_at: new Date().toISOString() }).eq('id', row.id);
      results.push({ platform: row.platform, status: 'failed', article_id: row.article_id, error: message });
    }
  }
  return NextResponse.json({ ok: true, processed: results.length, results });
}
