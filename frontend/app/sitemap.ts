import { api } from '../lib/api';
import type { FeedArticle } from '../lib/mockData';
import type { MetadataRoute } from 'next';
import { canonicalSiteUrl } from '../lib/site';

export const revalidate = 3600;

const BASE = canonicalSiteUrl();

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticUrls: MetadataRoute.Sitemap = [
    { url: `${BASE}/`, changeFrequency: 'hourly', priority: 1 },
    { url: `${BASE}/search`, changeFrequency: 'daily', priority: 0.4 },
    { url: `${BASE}/rss.xml`, changeFrequency: 'hourly', priority: 0.3 },
    { url: `${BASE}/category/politics`, changeFrequency: 'hourly', priority: 0.7 },
    { url: `${BASE}/category/economy`, changeFrequency: 'hourly', priority: 0.7 },
    { url: `${BASE}/category/international`, changeFrequency: 'hourly', priority: 0.7 },
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
