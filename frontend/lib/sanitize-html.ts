const BLOCK_PAIRS = ['script', 'style', 'iframe', 'object', 'noscript', 'template', 'form'];
const VOID_TAGS = ['embed', 'link', 'meta', 'base'];

export function sanitizeHtml(html: string): string {
  if (!html) return '';
  let out = html.replace(/<!--[\s\S]*?-->/g, '');
  for (const tag of BLOCK_PAIRS) {
    out = out.replace(new RegExp(`<${tag}\\b[\\s\\S]*?<\\/${tag}\\s*>`, 'gi'), '');
    out = out.replace(new RegExp(`<\\/?${tag}\\b[^>]*>`, 'gi'), '');
  }
  for (const tag of VOID_TAGS) {
    out = out.replace(new RegExp(`<${tag}\\b[^>]*>`, 'gi'), '');
  }
  return out
    .replace(/[\s/]on\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/\s(href|src|xlink:href|formaction|action)\s*=\s*(["']?)\s*(javascript|vbscript|data\s*:\s*text\/html)[^"'>\s]*\2/gi, '')
    .replace(/javascript\s*:/gi, '')
    .replace(/data:text\/html/gi, '');
}
