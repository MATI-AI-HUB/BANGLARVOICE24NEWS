import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const READER_FILENAME = 'banglar-voice-reader.apk';
const GITHUB_RELEASES_API =
  'https://api.github.com/repos/MATI-AI-HUB/automation-king-/releases/latest';

function isDirectApkUrl(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:') return false;
    if (url.username || url.password) return false;
    const path = url.pathname.toLowerCase();
    if (path.includes('/tree/') || path.includes('/blob/') || path.includes('/src/')) return false;
    if (path.endsWith('.apk')) return true;
    return path.includes('/releases/download/') && path.includes('reader');
  } catch {
    return false;
  }
}

async function resolveReaderApkUrl(): Promise<string | null> {
  const configured = (process.env.READER_APK_URL || '').trim();
  if (configured && isDirectApkUrl(configured)) return configured;

  const res = await fetch(GITHUB_RELEASES_API, {
    headers: { Accept: 'application/vnd.github+json' },
    next: { revalidate: 3600 },
  });
  if (!res.ok) return null;
  const release = (await res.json()) as {
    assets?: Array<{ name?: string; browser_download_url?: string }>;
  };
  const asset = (release.assets || []).find((item) => item.name === READER_FILENAME);
  const url = (asset?.browser_download_url || '').trim();
  if (!url || !isDirectApkUrl(url)) return null;
  return url;
}

export async function GET() {
  try {
    const url = await resolveReaderApkUrl();
    if (!url) {
      return NextResponse.json({ error: 'apk_unavailable' }, { status: 404 });
    }
    const upstream = await fetch(url, {
      headers: { Accept: 'application/vnd.android.package-archive,application/octet-stream' },
      redirect: 'follow',
      cache: 'no-store',
    });
    if (!upstream.ok || !upstream.body) {
      return NextResponse.json({ error: 'apk_unavailable' }, { status: 404 });
    }
    return new NextResponse(upstream.body, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.android.package-archive',
        'Content-Disposition': `attachment; filename="${READER_FILENAME}"`,
        'Cache-Control': 'private, max-age=300',
      },
    });
  } catch {
    return NextResponse.json({ error: 'apk_unavailable' }, { status: 404 });
  }
}
