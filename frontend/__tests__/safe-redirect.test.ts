import { describe, expect, it } from 'vitest';
import { safeRedirectPath } from '../lib/safe-redirect';

describe('safeRedirectPath', () => {
  it('keeps same-origin paths with query strings', () => {
    expect(safeRedirectPath('/admin/pending')).toBe('/admin/pending');
    expect(safeRedirectPath('/admin/verification/1?tab=a')).toBe('/admin/verification/1?tab=a');
  });

  it('falls back for empty values', () => {
    expect(safeRedirectPath(null)).toBe('/');
    expect(safeRedirectPath('')).toBe('/');
    expect(safeRedirectPath(undefined, '/admin')).toBe('/admin');
  });

  it('rejects absolute and protocol-relative URLs', () => {
    expect(safeRedirectPath('https://evil.com')).toBe('/');
    expect(safeRedirectPath('//evil.com')).toBe('/');
    expect(safeRedirectPath('javascript:alert(1)')).toBe('/');
  });

  it('rejects backslash and control-character tricks', () => {
    expect(safeRedirectPath('/\\evil.com')).toBe('/');
    expect(safeRedirectPath('/admin\\..\\x')).toBe('/');
    expect(safeRedirectPath('/admin\r\nSet-Cookie: a=b')).toBe('/');
  });
});
