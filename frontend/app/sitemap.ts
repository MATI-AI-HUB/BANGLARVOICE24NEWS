import { api } from '../lib/api';
import type { MetadataRoute } from 'next';

export const revalidate = 3600; // rebuild sitemap hourly

const BASE = process.env.NEXT_PUBLIC_SITE_URL || 'https://banglarvoice.com';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticUrls: MetadataRoute.Sitemap = [
    { url: `${BASE}/`, changeFrequency: 'hourly', priority: 1 },
  ];

  let articles: { slug?: string }[] = [];
  try {
    const data = await api.articles(50);
    articles = (data.items || []).filter((a: { slug?: string }) => a.slug);
  } catch {
    // Backend offline — fall back to demo slugs so sitemap is never empty.
    articles = [
      { slug: 'demo-1' },
      { slug: 'demo-2' },
      { slug: 'demo-3' },
      { slug: 'demo-4' },
      { slug: 'demo-5' },
    ];
  }

  const articleUrls = articles.map((a) => ({
    url: `${BASE}/article/${a.slug}`,
    changeFrequency: 'daily' as const,
    priority: 0.8,
  }));

  return [...staticUrls, ...articleUrls];
}
