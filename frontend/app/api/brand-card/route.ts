import sharp from 'sharp';
import { BENGALI_SANS_STACK, BENGALI_SERIF_STACK, ensureBengaliFonts } from '../../../lib/server/fonts';

export const dynamic = 'force-dynamic';
export const revalidate = 300;

const WIDTH = 1200;
const HEIGHT = 630;

function escapeXml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[char] || char);
}

function wrapHeadline(value: string, maxChars: number, maxLines: number): string[] {
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
  if (lines.length <= maxLines) return lines;
  const trimmed = lines.slice(0, maxLines);
  trimmed[maxLines - 1] = `${trimmed[maxLines - 1].slice(0, Math.max(0, maxChars - 1))}…`;
  return trimmed;
}

export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const title = (params.get('title') || '').replace(/\s+/g, ' ').trim().slice(0, 240);
    const category = (params.get('category') || '').replace(/\s+/g, ' ').trim().slice(0, 60);
    if (!title) return new Response('Missing title', { status: 400 });

    ensureBengaliFonts();

    const fontSize = title.length <= 64 ? 48 : title.length <= 128 ? 42 : 36;
    const maxChars = Math.max(14, Math.floor(1010 / (fontSize * 0.62)));
    const lines = wrapHeadline(title, maxChars, 5);
    const headlineSvg = lines
      .map((line, index) => `<text x="64" y="${266 + index * (fontSize + 16)}" class="headline" font-size="${fontSize}">${escapeXml(line)}</text>`)
      .join('');

    const svg = Buffer.from(`<svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0d2440"/>
      <stop offset="0.55" stop-color="#0a1c33"/>
      <stop offset="1" stop-color="#061223"/>
    </linearGradient>
    <linearGradient id="rule" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#12b981"/>
      <stop offset="1" stop-color="#12b981" stop-opacity="0.1"/>
    </linearGradient>
  </defs>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#bg)"/>
  <rect x="0" y="0" width="${WIDTH}" height="10" fill="#12b981"/>
  <text x="1156" y="590" text-anchor="end" font-size="280" font-weight="700" fill="#ffffff" opacity="0.05" font-family=${JSON.stringify(BENGALI_SERIF_STACK)}>BV</text>
  <rect x="64" y="44" width="228" height="50" rx="25" fill="#12b981"/>
  <text x="92" y="78" fill="#04121f" font-size="24" font-weight="700" font-family=${JSON.stringify(BENGALI_SANS_STACK)}>বাংলার ভয়েস</text>
  <text x="312" y="78" fill="#9fd9c3" font-size="22" font-family=${JSON.stringify(BENGALI_SANS_STACK)}>${escapeXml(category || 'সর্বশেষ সংবাদ')}</text>
  ${headlineSvg}
  <rect x="64" y="556" width="1072" height="2" fill="url(#rule)"/>
  <text x="64" y="600" fill="#c7d3e0" font-size="20" font-family=${JSON.stringify(BENGALI_SANS_STACK)}>বাংলার ভয়েস · www.banglarvoice24news.com</text>
</svg>`);

    const output = await sharp({
      create: { width: WIDTH, height: HEIGHT, channels: 4, background: { r: 7, g: 23, b: 42, alpha: 1 } },
    })
      .composite([{ input: svg }])
      .png()
      .toBuffer();

    return new Response(new Uint8Array(output), {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
      },
    });
  } catch {
    return new Response('Card unavailable', { status: 503 });
  }
}
