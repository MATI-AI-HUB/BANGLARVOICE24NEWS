import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('public download page', () => {
  const page = readFileSync(resolve(__dirname, '../app/download/page.tsx'), 'utf8');
  const footer = readFileSync(resolve(__dirname, '../components/Footer.tsx'), 'utf8');

  it('offers only the Reader APK via the site proxy', () => {
    expect(page).toContain('/api/download/reader');
    expect(page).toContain('পাঠক অ্যাপ');
    expect(page).not.toMatch(/banglar-voice-(reporter|admin|tv|studio)\.apk/);
  });

  it('does not expose a GitHub repository or release browse link', () => {
    expect(page).not.toContain('github.com/');
    expect(page).not.toContain('GITHUB_REPO');
    expect(page).not.toContain('api.github.com');
  });

  it('keeps the footer download link on the Reader page', () => {
    expect(footer).toContain("href: '/download'");
    expect(footer).not.toContain('#arm64');
  });
});
