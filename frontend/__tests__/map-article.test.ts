import { describe, expect, it } from 'vitest';
import { publicFeedItemToArticle } from '../lib/api';

describe('publicFeedItemToArticle', () => {
  it('is null-safe for missing title and image', () => {
    const article = publicFeedItemToArticle({
      id: 'abc',
      title: undefined,
      summary: undefined,
      banner_image: undefined,
    });
    expect(article.slug).toBe('abc');
    expect(article.title_bn).toBe('শিরোনাম পাওয়া যায়নি');
    expect(article.featured_image).toBe('');
  });
});
