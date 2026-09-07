import { createFileRoute } from "@tanstack/react-router";
import { articles } from "@/lib/articles";
import { SITE, abs } from "@/lib/site";
import { listPublishedStories } from "@/lib/newsroom.server";

/**
 * Machine-readable JSON Feed (jsonfeed.org v1.1) for the 24/7 automation
 * pipeline, syndication partners and aggregators.
 */
export const Route = createFileRoute("/api/public/feed.json")({
  server: {
    handlers: {
      GET: async () => {
        const published = await listPublishedStories(200);
        const merged = [
          ...articles,
          ...published.map((p) => ({
            slug: p.slug,
            title: p.title,
            dek: p.dek,
            body: p.body,
            publishedAt: p.publishedAt,
            author: p.author,
            categoryLabel: p.category,
            category: p.category,
            source: p.source,
            tags: p.tags,
          })),
        ];

        const feed = {
          version: "https://jsonfeed.org/version/1.1",
          title: SITE.name,
          home_page_url: SITE.url,
          feed_url: abs("/api/public/feed.json"),
          description: SITE.description,
          language: "bn",
          items: [...merged]
            .sort((a, b) => +new Date(b.publishedAt) - +new Date(a.publishedAt))
            .map((a) => ({
              id: abs(`/news/${a.slug}`),
              url: abs(`/news/${a.slug}`),
              title: a.title,
              summary: a.dek,
              content_text: a.body.join("\n\n"),
              date_published: new Date(a.publishedAt).toISOString(),
              authors: [{ name: a.author }],
              tags: [a.categoryLabel, ...(a.tags ?? [])],
              _banglar_voice: { category: a.category, source: a.source },
            })),
        };

        return new Response(JSON.stringify(feed, null, 2), {
          headers: {
            "Content-Type": "application/feed+json; charset=utf-8",
            "Cache-Control": "public, max-age=300",
            "Access-Control-Allow-Origin": "*",
          },
        });
      },
    },
  },
});
