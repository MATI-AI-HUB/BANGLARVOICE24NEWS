export const ARTICLE_COMMENT_NAME_MAX = 60;
export const ARTICLE_COMMENT_BODY_MAX = 2000;

export type NormalizedArticleComment = {
  displayName: string;
  body: string;
};

export function normalizeArticleCommentInput(
  input: unknown,
): NormalizedArticleComment | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;

  const value = input as Record<string, unknown>;
  if (typeof value.displayName !== 'string' || typeof value.body !== 'string') {
    return null;
  }

  const displayName = value.displayName.trim().replace(/\s+/g, ' ');
  const body = value.body
    .replace(/\r\n?/g, '\n')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .trim();

  if (displayName.length < 2 || displayName.length > ARTICLE_COMMENT_NAME_MAX) return null;
  if (body.length < 3 || body.length > ARTICLE_COMMENT_BODY_MAX) return null;

  return { displayName, body };
}
