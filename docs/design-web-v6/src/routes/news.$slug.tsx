import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { ArticleCard } from "@/components/ArticleCard";
import { articles, getArticle, formatBnDate, categoryLabels } from "@/lib/articles";
import { fetchPublishedStory } from "@/lib/newsroom.functions";
import fallbackImage from "@/assets/lead-story.jpg";
import { abs, breadcrumbJsonLd, newsArticleJsonLd, readingTimeBn } from "@/lib/site";

import { Facebook, Twitter, Link2 } from "lucide-react";

export const Route = createFileRoute("/news/$slug")({
  loader: async ({ params }) => {
    const article = getArticle(params.slug);
    if (article) return { article };

    // Editor-approved automation stories are served straight from the newsroom queue.
    const published = await fetchPublishedStory({ data: { slug: params.slug } });
    if (!published) throw notFound();

    return {
      article: {
        slug: published.slug,
        title: published.title,
        dek: published.dek,
        category: published.category,
        categoryLabel: categoryLabels[published.category] ?? published.category,
        author: published.author,
        publishedAt: published.publishedAt,
        image: published.image_url ?? fallbackImage,
        body: published.body,
        source: published.source,
        tags: published.tags,
      },
    };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "সংবাদটি পাওয়া যায়নি — বাংলার ভয়েস" }, { name: "robots", content: "noindex" }] };
    }
    const a = loaderData.article;
    return {
      meta: [
        { title: `${a.title} — বাংলার ভয়েস` },
        { name: "description", content: a.dek },
        { property: "og:type", content: "article" },
        { property: "og:title", content: a.title },
        { property: "og:description", content: a.dek },
        { property: "og:image", content: abs(a.image) },
        { property: "article:published_time", content: a.publishedAt },
        { property: "article:section", content: a.categoryLabel },
        { name: "twitter:image", content: abs(a.image) },
        { property: "og:url", content: abs(`/news/${a.slug}`) },
      ],
      links: [{ rel: "canonical", href: abs(`/news/${a.slug}`) }],
      scripts: [
        { type: "application/ld+json", children: JSON.stringify(newsArticleJsonLd(a)) },
        {
          type: "application/ld+json",
          children: JSON.stringify(
            breadcrumbJsonLd([
              { name: "হোম", path: "/" },
              { name: a.categoryLabel, path: `/category/${a.category}` },
              { name: a.title, path: `/news/${a.slug}` },
            ]),
          ),
        },
      ],
    };
  },

  component: NewsDetail,
  notFoundComponent: () => (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="font-serif-bn text-3xl font-extrabold">সংবাদটি পাওয়া যায়নি</h1>
        <p className="mt-2 text-muted-foreground">এই সংবাদটি সরানো হয়েছে অথবা লিংকটি সঠিক নয়।</p>
        <Link to="/" className="mt-6 inline-block rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">হোমে ফিরুন</Link>
      </div>
      <SiteFooter />
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="min-h-screen grid place-items-center bg-background">
      <div className="text-center">
        <div className="text-lg font-bold">সংবাদ লোড করা যায়নি</div>
        <div className="text-sm text-muted-foreground mt-2">{error.message}</div>
      </div>
    </div>
  ),
});

function NewsDetail() {
  const { article: a } = Route.useLoaderData();
  const related = articles.filter(x => x.slug !== a.slug).slice(0, 3);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <article className="mx-auto max-w-3xl px-4 py-8">
        <nav className="text-xs font-sans text-muted-foreground">
          <Link to="/" className="hover:text-primary">হোম</Link> · <span className="text-primary font-semibold">{a.categoryLabel}</span>
        </nav>

        <h1 className="mt-3 font-serif-bn text-3xl sm:text-4xl font-extrabold leading-tight">{a.title}</h1>
        <p className="mt-3 text-lg text-muted-foreground leading-relaxed">{a.dek}</p>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-y border-border py-3 text-xs font-sans text-muted-foreground">
          <div>
            <span className="text-foreground font-semibold">{a.author}</span>
            <span className="mx-2">·</span>
            <time dateTime={a.publishedAt}>{formatBnDate(a.publishedAt)}</time>
            <span className="mx-2">·</span>
            <span>{readingTimeBn(a.body)}</span>
          </div>

          <div className="flex items-center gap-2">
            <button aria-label="Share on Facebook" className="rounded-full border border-border p-1.5 hover:text-primary hover:border-primary"><Facebook size={13} /></button>
            <button aria-label="Share on X" className="rounded-full border border-border p-1.5 hover:text-primary hover:border-primary"><Twitter size={13} /></button>
            <button aria-label="Copy link" className="rounded-full border border-border p-1.5 hover:text-primary hover:border-primary"><Link2 size={13} /></button>
          </div>
        </div>

        <img src={a.image} alt={a.title} className="mt-6 w-full rounded-md object-cover" />
        <div className="mt-2 text-xs text-muted-foreground">ছবি · প্রতীকী</div>

        <div className="prose-article mt-6 space-y-5">
          {a.body.map((p: string, i: number) => (
            <p key={i}>{p}</p>
          ))}
        </div>

        {/* Subtle in-article sponsored */}
        <div className="my-8 rounded-md border border-border bg-secondary/40 p-4">
          <div className="text-[10px] font-sans uppercase tracking-wider text-muted-foreground">বিজ্ঞাপন</div>
          <div className="mt-1 text-sm font-semibold">বাংলার ভয়েস — সাপ্তাহিক নিউজলেটারে যুক্ত হন</div>
          <div className="mt-1 text-xs text-muted-foreground">নির্বাচিত সংবাদ ও বিশ্লেষণ প্রতি শুক্রবার ইমেইলে।</div>
        </div>

        {a.tags && a.tags.length > 0 && (
          <div className="mt-6 flex flex-wrap gap-2">
            {a.tags.map((t: string) => (
              <span key={t} className="rounded-full border border-border bg-card px-2.5 py-0.5 text-xs">#{t}</span>
            ))}
          </div>
        )}

        {/* Subtle source + AI note */}
        <div className="mt-8 border-t border-border pt-3 text-[11px] font-sans text-muted-foreground">
          সূত্র: {a.source} · এআই সহায়তায় সম্পাদিত ও যাচাইকৃত।
        </div>
      </article>

      <section className="mx-auto max-w-7xl px-4 py-10">
        <div className="mb-4 section-title">
          <h2 className="font-serif-bn text-2xl font-extrabold">সম্পর্কিত সংবাদ</h2>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {related.map(r => <ArticleCard key={r.slug} a={r} />)}
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
