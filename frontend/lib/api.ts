export const api = {
  base: process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8090',
  async articles(limit = 20) {
    const r = await fetch(`${this.base}/api/public/articles?limit=${limit}`, { next: { revalidate: 60 } });
    if (!r.ok) throw new Error('articles fetch failed');
    return r.json();
  },
  async article(slug: string) {
    const r = await fetch(`${this.base}/api/public/article/${slug}`, { next: { revalidate: 60 } });
    if (!r.ok) throw new Error('article fetch failed');
    return r.json();
  },
};
