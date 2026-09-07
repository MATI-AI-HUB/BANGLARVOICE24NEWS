import { createFileRoute } from "@tanstack/react-router";
import { articles } from "@/lib/articles";
import { SITE, abs } from "@/lib/site";
import { listPublishedStories } from "@/lib/newsroom.server";
import { categoryLabels } from "@/lib/articles";

function esc(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export const Route = createFileRoute("/rss.xml")({
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
            author: p.author,
            publishedAt: p.publishedAt,
            categoryLabel: categoryLabels[p.category] ?? p.category,
          })),
        ];

        const items = [...merged]
          .sort((a, b) => +new Date(b.publishedAt) - +new Date(a.publishedAt))
          .map(
            (a) => `    <item>
      <title>${esc(a.title)}</title>
      <link>${abs(`/news/${a.slug}`)}</link>
      <guid isPermaLink="true">${abs(`/news/${a.slug}`)}</guid>
      <description>${esc(a.dek)}</description>
      <category>${esc(a.categoryLabel)}</category>
      <dc:creator>${esc(a.author)}</dc:creator>
      <pubDate>${new Date(a.publishedAt).toUTCString()}</pubDate>
    </item>`,
          )
          .join("\n");

        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${esc(SITE.name)}</title>
    <link>${SITE.url}</link>
    <description>${esc(SITE.description)}</description>
    <language>bn</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${abs("/rss.xml")}" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>`;

        return new Response(xml, {
          headers: {
            "Content-Type": "application/rss+xml; charset=utf-8",
            "Cache-Control": "public, max-age=300",
          },
        });
      },
    },
  },
});
