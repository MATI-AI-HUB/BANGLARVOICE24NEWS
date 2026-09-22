import { api } from '../lib/api';
import type { FeedArticle } from '../lib/mockData';
import type { MetadataRoute } from 'next';

export const revalidate = 3600;

const BASE = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  'https://banglarvoice24news.com'
).replace(/\/+$/, '');

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticUrls: MetadataRoute.Sitemap = [
    {
      url: `${BASE}/`,
      changeFrequency: 'hourly',
      priority: 1,
    },
  ];

  let articles: FeedArticle[] = [];

  try {
    const data = await api.articles(500);
    articles = data.items.filter((article) => article.slug);
  } catch (error) {
    console.error('SITEMAP_ARTICLE_LOAD_FAILED', {
      message: error instanceof Error ? error.message : String(error),
    });
  }

  const articleUrls: MetadataRoute.Sitemap = articles.map((article) => ({
    url: `${BASE}/article/${encodeURIComponent(article.slug)}`,
    lastModified: article.published_at
      ? new Date(article.published_at)
      : new Date(),
    changeFrequency: 'daily',
    priority: 0.8,
  }));

  return [...staticUrls, ...articleUrls];
}
