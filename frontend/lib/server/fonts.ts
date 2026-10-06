import fs from 'node:fs';
import path from 'node:path';

/**
 * Bundled open-source fonts (SIL Open Font License / Bitstream Vera licence)
 * let Vercel's sharp/librsvg render Bengali text with correct shaping instead
 * of tofu boxes. Fontconfig is pointed at the bundled directory once per
 * serverless instance, before the first SVG render.
 */

export const BENGALI_SERIF_STACK =
  "'Noto Serif Bengali','Noto Sans Bengali','DejaVu Sans',serif";
export const BENGALI_SANS_STACK =
  "'Noto Sans Bengali','DejaVu Sans',sans-serif";

const FONT_DIR_CANDIDATES = [
  path.join(process.cwd(), 'assets', 'fonts'),
  path.join(process.cwd(), 'frontend', 'assets', 'fonts'),
];

const SYSTEM_FONT_DIRS = [
  '/usr/share/fonts',
  '/usr/local/share/fonts',
  '/opt/fonts',
];

let resolvedDir: string | null | undefined;

function findFontDir(): string | null {
  if (resolvedDir !== undefined) return resolvedDir;
  resolvedDir =
    FONT_DIR_CANDIDATES.find((dir) => {
      try {
        return fs.existsSync(path.join(dir, 'NotoSansBengali-Regular.ttf'));
      } catch {
        return false;
      }
    }) ?? null;
  if (!resolvedDir) {
    console.warn('[fonts] bundled Bengali fonts not found; falling back to system fonts');
  }
  return resolvedDir;
}

let configured = false;

export function ensureBengaliFonts(): boolean {
  if (configured) return true;
  const dir = findFontDir();
  try {
    const cacheDir = '/tmp/bv-fontconfig-cache';
    fs.mkdirSync(cacheDir, { recursive: true });
    const dirs = [dir, ...SYSTEM_FONT_DIRS].filter(
      (candidate): candidate is string => Boolean(candidate) && fs.existsSync(candidate as string),
    );
    const config = `<?xml version="1.0"?>
<!DOCTYPE fontconfig SYSTEM "fonts.dtd">
<fontconfig>
${dirs.map((d) => `  <dir>${d}</dir>`).join('\n')}
  <cachedir>${cacheDir}</cachedir>
</fontconfig>`;
    const configPath = '/tmp/bv-fonts.conf';
    fs.writeFileSync(configPath, config, 'utf8');
    process.env.FONTCONFIG_FILE = configPath;
    configured = true;
    return Boolean(dir);
  } catch (error) {
    console.warn('[fonts] fontconfig setup failed', {
      message: error instanceof Error ? error.message : 'unknown',
    });
    return false;
  }
}
