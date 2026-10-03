import { describe, it, expect, vi } from 'vitest';
import { collect } from './collector.js';
import type { WorkerConfig } from '../config.js';

const cfg: WorkerConfig = {
  intervalMinutes: 14,
  newsRssUrls: ['https://example.com/feed.xml'],
  bvBaseUrl: 'http://localhost:8090',
  newsroomIngestKey: 'test-key',
  autoPublish: false,
  chatAiBaseUrl: '',
  chatAiModel: 'gpt-4o-mini',
  chatAiKey: '',
  telegramAllowedChatIds: [],
  telegramBotToken: '',
  telegramChannelId: '',
  social: {
    facebookPageToken: '',
    facebookPageId: '',
    xApiKey: '',
    xApiSecret: '',
    xAccessToken: '',
    xAccessSecret: '',
    instagramAccessToken: '',
    linkedinAccessToken: '',
    linkedinOrganizationId: '',
  },
  pexelsApiKey: '',
};

describe('collector', () => {
  it('fetches each configured RSS URL', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => '<?xml version="1.0"?><rss version="2.0"><channel><title>t</title></channel></rss>',
    });
    vi.stubGlobal('fetch', fetchMock);

    const items = await collect(cfg);
    expect(fetchMock).toHaveBeenCalledWith('https://example.com/feed.xml', expect.anything());
    expect(Array.isArray(items)).toBe(true);
    vi.unstubAllGlobals();
  });

  it('skips SSRF-prone feed URLs', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const items = await collect({ ...cfg, newsRssUrls: ['http://127.0.0.1/secret.xml'] });
    expect(items).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it('does not crash on malformed XML', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => '<not-rss>broken',
    }));
    const items = await collect(cfg);
    expect(Array.isArray(items)).toBe(true);
    expect(items.length).toBe(0);
    vi.unstubAllGlobals();
  });

  it('does not crash when a feed fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }));
    const items = await collect(cfg);
    expect(Array.isArray(items)).toBe(true);
    expect(items.length).toBe(0);
    vi.unstubAllGlobals();
  });

  it('parses a single-item RSS channel where item is an object not an array', async () => {
    const xml = `<?xml version="1.0"?><rss version="2.0"><channel>
      <item>
        <title>Solo headline from feed</title>
        <link>https://example.com/solo</link>
        <description>one body</description>
      </item>
    </channel></rss>`;
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200, text: async () => xml }));
    const items = await collect(cfg);
    expect(items).toHaveLength(1);
    expect(items[0].title).toBe('Solo headline from feed');
    expect(items[0].link).toBe('https://example.com/solo');
    vi.unstubAllGlobals();
  });

  it('extracts enclosure image URLs from RSS items', async () => {
    const xml = `<?xml version="1.0"?><rss version="2.0"><channel>
      <item>
        <title>Hello world headline</title>
        <link>https://example.com/a</link>
        <description>body</description>
        <enclosure url="https://cdn.example.com/pic.jpg" type="image/jpeg" />
      </item>
    </channel></rss>`;
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, text: async () => xml }));
    const items = await collect(cfg);
    expect(items).toHaveLength(1);
    expect(items[0].imageUrl).toBe('https://cdn.example.com/pic.jpg');
    vi.unstubAllGlobals();
  });
});