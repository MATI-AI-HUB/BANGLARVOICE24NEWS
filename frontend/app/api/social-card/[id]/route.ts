import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import { BENGALI_SANS_STACK, BENGALI_SERIF_STACK, ensureBengaliFonts } from '../../../../lib/server/fonts';

export const dynamic = 'force-dynamic';
export const revalidate = 300;

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase admin credentials are not configured');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function escapeXml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[char] || char);
}

function wrapHeadline(value: string, maxChars = 25): string[] {
  const words = value.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > maxChars && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines.slice(0, 4);
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const supabase = admin();
    const { data: article, error } = await supabase
      .from('articles')
      .select('id, title_bn, thumbnail_url, featured_image, category_key')
      .eq('id', id)
      .maybeSingle();
    if (error || !article) return new Response('Not found', { status: 404 });

    ensureBengaliFonts();

    const width = 1200;
    const height = 630;
    let base = sharp({
      create: { width, height, channels: 4, background: { r: 7, g: 23, b: 42, alpha: 1 } },
    });
    const imageUrl = article.featured_image || article.thumbnail_url;
    // Never embed our own generated cards (brand-card/social-card), which would
    // duplicate the headline or recurse; render the branded background instead.
    const selfGenerated = Boolean(imageUrl) && (imageUrl.includes('/api/brand-card') || imageUrl.includes('/api/social-card/'));
    if (imageUrl && !selfGenerated) {
      try {
        const imageResponse = await fetch(imageUrl, { signal: AbortSignal.timeout(8000) });
        if (imageResponse.ok) {
          const image = Buffer.from(await imageResponse.arrayBuffer());
          base = sharp(image).resize(width, height, { fit: 'cover', position: 'attention' });
        }
      } catch {
        // Keep the branded fallback background when the source image is unavailable.
      }
    }

    const lines = wrapHeadline(article.title_bn || 'বাংলার ভয়েস সংবাদ');
    const headline = lines
      .map((line, index) => `<text x="80" y="${390 + index * 58}" fill="#ffffff" font-size="44" font-weight="700" font-family=${JSON.stringify(BENGALI_SERIF_STACK)}>${escapeXml(line)}</text>`)
      .join('');
    const svg = Buffer.from(`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs><linearGradient id="shade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#001b34" stop-opacity=".15"/><stop offset=".55" stop-color="#001122" stop-opacity=".28"/><stop offset="1" stop-color="#001122" stop-opacity=".94"/></linearGradient></defs>
      <rect width="1200" height="630" fill="url(#shade)"/>
      <rect x="56" y="48" width="300" height="52" rx="26" fill="#12b981"/>
      <text x="88" y="83" fill="white" font-size="26" font-family=${JSON.stringify(BENGALI_SANS_STACK)} font-weight="700">বাংলার ভয়েস</text>
      <text x="80" y="350" fill="#d1fae5" font-size="22" font-family=${JSON.stringify(BENGALI_SANS_STACK)}>${escapeXml(article.category_key || 'সর্বশেষ সংবাদ')}</text>
      ${headline}
      <rect x="80" y="575" width="1040" height="2" fill="#34d399" opacity=".9"/>
      <text x="80" y="610" fill="white" opacity=".85" font-size="18" font-family="DejaVu Sans, sans-serif">www.banglarvoice24news.com</text>
    </svg>`);
    const output = await base.composite([{ input: svg }]).png().toBuffer();
    return new Response(new Uint8Array(output), {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch {
    return new Response('Card unavailable', { status: 503 });
  }
}
