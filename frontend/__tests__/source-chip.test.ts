import { describe, expect, it } from 'vitest';
import { publicFeedItemToArticle } from '../lib/api';

describe('source name always rendered', () => {
  it('maps source_name from the public feed item', () => {
    const article = publicFeedItemToArticle({
      id: '1',
      title: 'শিরোনাম',
      summary: 'সারাংশ',
      source_name: 'বিবিসি বাংলা',
      source_url: 'https://www.bbc.com/bengali/a',
      date_published: '2026-09-29T00:00:00.000Z',
    });
    expect(article.source_name).toBe('বিবিসি বাংলা');
    expect(article.source_url).toContain('bbc.com');
  });

  it('leaves source_name empty when the feed omitted it so UI can show সূত্র', () => {
    const article = publicFeedItemToArticle({
      id: '2',
      title: 'শিরোনাম',
    });
    expect(article.source_name).toBe('');
  });
});
