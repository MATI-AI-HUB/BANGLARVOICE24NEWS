import { createFileRoute } from "@tanstack/react-router";
import { articles } from "@/lib/articles";
import { abs } from "@/lib/site";
import { listPublishedStories } from "@/lib/newsroom.server";

const staticPaths = [
  "/",
  "/about",
  "/learning-hub",
  "/services",
  "/e-paper",
  "/contact",
  "/privacy",
  "/terms",
  "/category/national",
  "/category/international",
  "/category/politics",
  "/category/economy",
  "/category/sports",
  "/category/entertainment",
  "/category/technology",
  "/category/opinion",
];

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const published = await listPublishedStories(500);

        const newsItems = [
          ...articles.map((a) => ({ slug: a.slug, title: a.title, publishedAt: a.publishedAt })),
          ...published.map((p) => ({ slug: p.slug, title: p.title, publishedAt: p.publishedAt })),
        ];

        const cutoff = Date.now() - 2 * 24 * 60 * 60 * 1000;

        const urls = [
          // No page-specific timestamp exists for evergreen pages, so <lastmod> is omitted.
          ...staticPaths.map(
            (p) =>
              `  <url><loc>${abs(p)}</loc><changefreq>${p === "/" ? "hourly" : "daily"}</changefreq><priority>${p === "/" ? "1.0" : "0.7"}</priority></url>`,
          ),
          ...newsItems.map((a) => {
            const iso = new Date(a.publishedAt).toISOString();
            const fresh = +new Date(a.publishedAt) > cutoff;
            return `  <url>
    <loc>${abs(`/news/${a.slug}`)}</loc>
    <lastmod>${iso}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>${
      fresh
        ? `
    <news:news>
      <news:publication><news:name>বাংলার ভয়েস</news:name><news:language>bn</news:language></news:publication>
      <news:publication_date>${iso}</news:publication_date>
      <news:title>${esc(a.title)}</news:title>
    </news:news>`
        : ""
    }
  </url>`;
          }),
        ].join("\n");

        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${urls}
</urlset>`;

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml; charset=utf-8",
            "Cache-Control": "public, max-age=600",
          },
        });
      },
    },
  },
});
