import { api } from '../lib/api';
import type { FeedArticle } from '../lib/mockData';
import type { VideoItem } from '../components/video-hub';
import type { MetadataRoute } from 'next';
import { canonicalSiteUrl } from '../lib/site';

export const revalidate = 3600;

const BASE = canonicalSiteUrl();

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let videos: VideoItem[] = [];

  try {
    const data = await api.videos();
    videos = data.videos.filter((video) => video.youtube_id || video.embed_url);
  } catch (error) {
    console.error('SITEMAP_VIDEO_LOAD_FAILED', {
      message: error instanceof Error ? error.message : String(error),
    });
  }

  const videoEntries = videos.slice(0, 5).map((video) => {
    const id = video.youtube_id;
    return {
      title: video.title_bn || 'ভিডিও',
      thumbnail_loc:
        video.thumbnail_url || (id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : ''),
      description: video.description || video.title_bn || '',
      ...(id
        ? {
            content_loc: `https://www.youtube.com/watch?v=${id}`,
            player_loc: `https://www.youtube-nocookie.com/embed/${id}`,
          }
        : {}),
    };
  });

  const staticUrls: MetadataRoute.Sitemap = [
    {
      url: `${BASE}/`,
      changeFrequency: 'hourly',
      priority: 1,
      ...(videoEntries.length > 0 ? { videos: videoEntries } : {}),
    },
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
