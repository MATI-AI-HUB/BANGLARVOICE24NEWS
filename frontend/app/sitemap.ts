import { api } from '../lib/api';
import type { FeedArticle } from '../lib/mockData';
import type { MetadataRoute } from 'next';

export const revalidate = 3600; // rebuild sitemap hourly

const BASE = process.env.NEXT_PUBLIC_SITE_URL || 'https://banglarvoice.com';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticUrls: MetadataRoute.Sitemap = [
    { url: `${BASE}/`, changeFrequency: 'hourly', priority: 1 },
  ];

  let articles: FeedArticle[] = [];
  try {
    const data = await api.articles(50);
    articles = data.items.filter((a) => a.slug);
  } catch {
    // Backend offline — fall back to demo slugs so sitemap is never empty.
    articles = [
      { id: 'demo-1', slug: 'demo-1', title_bn: '' },
      { id: 'demo-2', slug: 'demo-2', title_bn: '' },
      { id: 'demo-3', slug: 'demo-3', title_bn: '' },
      { id: 'demo-4', slug: 'demo-4', title_bn: '' },
      { id: 'demo-5', slug: 'demo-5', title_bn: '' },
    ];
  }

  const articleUrls = articles.map((a) => ({
    url: `${BASE}/article/${a.slug}`,
    changeFrequency: 'daily' as const,
    priority: 0.8,
  }));

  return [...staticUrls, ...articleUrls];
}
