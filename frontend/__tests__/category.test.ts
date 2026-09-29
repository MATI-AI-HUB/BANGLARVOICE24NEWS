import { describe, expect, it } from 'vitest';
import { categorySlug, isKnownCategorySlug } from '../lib/category';

describe('categorySlug', () => {
  it('maps Bangla labels and English keys', () => {
    expect(categorySlug('রাজনীতি')).toBe('politics');
    expect(categorySlug('জাতীয়')).toBe('national');
    expect(categorySlug('national')).toBe('national');
  });

  it('rejects unknown slugs', () => {
    expect(isKnownCategorySlug('politics')).toBe(true);
    expect(isKnownCategorySlug('xyz')).toBe(false);
  });
});
