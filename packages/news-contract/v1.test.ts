import { describe, expect, it } from 'vitest';
import {
  ARTICLE_ORIGINS,
  ARTICLE_WORKFLOW,
  NEWSROOM_CONTRACT_VERSION,
  PLATFORM_ROLES,
  PUBLIC_ARTICLE_FIELDS,
  type PublicArticle,
} from './v1';

describe('newsroom contract v1', () => {
  it('pins a version and role list', () => {
    expect(NEWSROOM_CONTRACT_VERSION).toBe('1.0.0');
    expect(PLATFORM_ROLES).toEqual(['reader', 'reporter', 'editor', 'admin']);
    expect(ARTICLE_WORKFLOW).toEqual(['draft', 'submitted', 'approved', 'published', 'retracted']);
    expect(ARTICLE_ORIGINS).toEqual(['aggregated', 'original']);
  });

  it('requires source_name on the public article shape', () => {
    const article: PublicArticle = {
      id: '1',
      title: 'শিরোনাম',
      excerpt: 'সারাংশ',
      category: 'national',
      image_url: 'https://cdn.example.com/a.jpg',
      image_credit: 'Wikimedia',
      image_license: 'CC BY-SA',
      source_id: null,
      source_name: 'প্রথম আলো',
      source_logo_url: '',
      source_url: 'https://example.com/story',
      canonical_url: 'https://example.com/story',
      published_at: '2026-09-29T00:00:00.000Z',
      status: 'published',
      origin: 'aggregated',
      is_fallback: false,
    };
    expect(article.source_name.length).toBeGreaterThan(0);
    expect(article.is_fallback).toBe(false);
    expect(PUBLIC_ARTICLE_FIELDS).toContain('source_name');
    expect(PUBLIC_ARTICLE_FIELDS).toContain('is_fallback');
  });
});
