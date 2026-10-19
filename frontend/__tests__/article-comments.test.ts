import { describe, expect, it } from 'vitest';
import { normalizeArticleCommentInput } from '../lib/article-comments';

describe('normalizeArticleCommentInput', () => {
  it('trims the name and preserves safe plain-text line breaks', () => {
    expect(normalizeArticleCommentInput({
      displayName: '  News   Reader ',
      body: '  প্রথম লাইন\r\nদ্বিতীয় লাইন  ',
    })).toEqual({
      displayName: 'News Reader',
      body: 'প্রথম লাইন\nদ্বিতীয় লাইন',
    });
  });

  it('rejects non-object and malformed payloads', () => {
    expect(normalizeArticleCommentInput(null)).toBeNull();
    expect(normalizeArticleCommentInput([])).toBeNull();
    expect(normalizeArticleCommentInput({ displayName: 42, body: 'valid comment' })).toBeNull();
  });

  it('rejects short names and short comments', () => {
    expect(normalizeArticleCommentInput({ displayName: 'A', body: 'valid comment' })).toBeNull();
    expect(normalizeArticleCommentInput({ displayName: 'Reader', body: '  ' })).toBeNull();
  });

  it('rejects overlong names and comments', () => {
    expect(normalizeArticleCommentInput({ displayName: 'N'.repeat(61), body: 'valid comment' })).toBeNull();
    expect(normalizeArticleCommentInput({ displayName: 'Reader', body: 'x'.repeat(2001) })).toBeNull();
  });

  it('removes control characters without interpreting HTML', () => {
    expect(normalizeArticleCommentInput({
      displayName: 'Reader',
      body: '<script>alert(1)</script>\u0000 safe text',
    })?.body).toBe('<script>alert(1)</script> safe text');
  });
});
