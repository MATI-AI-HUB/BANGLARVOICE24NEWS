import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { ArticleCard } from "@/components/ArticleCard";
import { articles } from "@/lib/articles";
import { Search as SearchIcon } from "lucide-react";

type SearchParams = { q?: string | undefined };

export const Route = createFileRoute("/search")({
  validateSearch: (s: Record<string, unknown>): SearchParams => ({
    q: typeof s['q'] === "string" ? (s['q'] as string) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "সংবাদ অনুসন্ধান — বাংলার ভয়েস" },
      { name: "description", content: "বাংলার ভয়েসের সব সংবাদ, বিশ্লেষণ ও মতামত থেকে দ্রুত খুঁজে নিন আপনার প্রয়োজনীয় প্রতিবেদন।" },
      { property: "og:title", content: "সংবাদ অনুসন্ধান — বাংলার ভয়েস" },
      { property: "og:description", content: "শিরোনাম, বিভাগ ও ট্যাগ ধরে বাংলার ভয়েসের সংবাদ অনুসন্ধান করুন।" },
      { name: "robots", content: "noindex,follow" },
    ],
  }),
  component: SearchPage,
});

function SearchPage() {
  const { q } = Route.useSearch();
  const navigate = Route.useNavigate();
  const [term, setTerm] = useState(q ?? "");

  const results = useMemo(() => {
    const needle = (q ?? "").trim().toLowerCase();
    if (!needle) return [];
    return articles.filter((a) =>
      [a.title, a.dek, a.categoryLabel, a.author, ...(a.tags ?? []), ...a.body]
        .join(" ")
        .toLowerCase()
        .includes(needle),
    );
  }, [q]);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <main className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="font-serif-bn text-3xl font-extrabold">সংবাদ অনুসন্ধান</h1>
        <p className="mt-2 text-sm text-muted-foreground">শিরোনাম, বিভাগ, প্রতিবেদক বা ট্যাগ লিখে খুঁজুন।</p>

        <form
          className="mt-5 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            navigate({ search: { q: term.trim() || undefined } });
          }}
        >
          <div className="relative flex-1">
            <SearchIcon size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="যেমন: জলবায়ু, অর্থনীতি, এশিয়া কাপ"
              aria-label="সংবাদ অনুসন্ধান"
              className="w-full rounded-md border border-border bg-card py-2.5 pl-9 pr-3 text-sm outline-none focus:border-primary"
            />
          </div>
          <button className="rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">খুঁজুন</button>
        </form>

        {q ? (
          <>
            <div className="mt-6 text-sm text-muted-foreground">
              “{q}” — {results.length.toLocaleString("bn-BD")}টি ফলাফল
            </div>
            {results.length > 0 ? (
              <div className="mt-4 grid gap-6 md:grid-cols-2">
                {results.map((a) => (
                  <ArticleCard key={a.slug} a={a} />
                ))}
              </div>
            ) : (
              <div className="mt-6 rounded-md border border-border bg-card p-6 text-sm text-muted-foreground">
                কোনো সংবাদ পাওয়া যায়নি। ভিন্ন শব্দ দিয়ে চেষ্টা করুন অথবা{" "}
                <Link to="/" className="text-primary hover:underline">হোমপেজ</Link> দেখুন।
              </div>
            )}
          </>
        ) : (
          <div className="mt-8">
            <div className="section-title mb-4">
              <h2 className="font-serif-bn text-xl font-extrabold">সর্বশেষ প্রকাশিত</h2>
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              {articles.slice(0, 4).map((a) => (
                <ArticleCard key={a.slug} a={a} />
              ))}
            </div>
          </div>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
