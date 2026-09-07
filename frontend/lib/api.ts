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
  // Live-blog timeline: { entries: [{ id, body_bn, author, created_at }] }
  async live() {
    const r = await fetch(`${this.base}/api/public/live.json`, { next: { revalidate: 45 } });
    if (!r.ok) throw new Error('live fetch failed');
    return r.json();
  },
  // Video hub: { videos: [{ id, title_bn, category, thumbnail_url, embed_url, is_live }] }
  async videos() {
    const r = await fetch(`${this.base}/api/public/videos.json`, { next: { revalidate: 60 } });
    if (!r.ok) throw new Error('videos fetch failed');
    return r.json();
  },
};
