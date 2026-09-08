import { describe, it, expect, vi } from 'vitest';
import { collect } from './collector.js';
import type { WorkerConfig } from '../config.js';

const cfg: WorkerConfig = {
  intervalMinutes: 15,
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

  it('does not crash when a feed fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }));
    const items = await collect(cfg);
    expect(Array.isArray(items)).toBe(true);
    expect(items.length).toBe(0);
    vi.unstubAllGlobals();
  });
});