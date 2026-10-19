import { describe, expect, it } from 'vitest';
import { sanitizeHtml } from '../lib/sanitize-html';

describe('sanitizeHtml', () => {
  it('removes script, iframe and style blocks', () => {
    const out = sanitizeHtml('<p>ok</p><script>alert(1)</script><iframe src="x"></iframe><style>a{}</style>');
    expect(out).toBe('<p>ok</p>');
  });

  it('removes inline event handlers', () => {
    expect(sanitizeHtml('<img src="a.png" onerror="alert(1)">')).not.toMatch(/onerror/i);
    expect(sanitizeHtml('<svg/onload=alert(1)>')).not.toMatch(/onload/i);
  });

  it('removes javascript: URLs', () => {
    expect(sanitizeHtml('<a href="javascript:alert(1)">x</a>')).not.toMatch(/javascript/i);
  });

  it('keeps ordinary markup', () => {
    expect(sanitizeHtml('<p><strong>খবর</strong></p>')).toBe('<p><strong>খবর</strong></p>');
  });
});
