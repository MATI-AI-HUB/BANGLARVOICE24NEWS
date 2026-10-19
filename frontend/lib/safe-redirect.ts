/**
 * Accept only same-origin relative paths. Rejects absolute URLs, protocol-relative
 * URLs (`//evil.com`), backslash tricks (`/\evil.com`) and control characters.
 */
export function safeRedirectPath(value: string | null | undefined, fallback = '/'): string {
  if (!value) return fallback;
  if (!value.startsWith('/')) return fallback;
  if (value.startsWith('//') || value.startsWith('/\\')) return fallback;
  if (/[\u0000-\u001f\u007f\\]/.test(value)) return fallback;
  return value;
}
