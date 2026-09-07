import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { ArticleCard } from "@/components/ArticleCard";
import { articles, articlesByCategory } from "@/lib/articles";
import { abs, breadcrumbJsonLd } from "@/lib/site";

const labels: Record<string, string> = {
  national: "জাতীয়",
  international: "আন্তর্জাতিক",
  politics: "রাজনীতি",
  economy: "অর্থনীতি",
  sports: "খেলাধুলা",
  entertainment: "বিনোদন",
  technology: "প্রযুক্তি",
  opinion: "মতামত",
};

export const Route = createFileRoute("/category/$cat")({
  loader: ({ params }) => ({
    cat: params.cat,
    label: labels[params.cat] ?? params.cat,
    list: articlesByCategory(params.cat),
  }),
  head: ({ loaderData }) => {
    const label = loaderData?.label ?? "বিভাগ";
    return {
      meta: [
        { title: `${label} — বাংলার ভয়েস` },
        { name: "description", content: `${label} বিভাগের সর্বশেষ সংবাদ ও বিশ্লেষণ — বাংলার ভয়েস।` },
        { property: "og:title", content: `${label} — বাংলার ভয়েস` },
        { property: "og:description", content: `${label} বিভাগের সর্বশেষ সংবাদ।` },
        { property: "og:url", content: abs(`/category/${loaderData?.cat ?? ""}`) },
      ],
      links: [{ rel: "canonical", href: abs(`/category/${loaderData?.cat ?? ""}`) }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify(
            breadcrumbJsonLd([
              { name: "হোম", path: "/" },
              { name: label, path: `/category/${loaderData?.cat ?? ""}` },
            ]),
          ),
        },
      ],
    };
  },
  component: CategoryPage,
});

function CategoryPage() {
  const { label, list } = Route.useLoaderData();
  const items = list.length ? list : articles.slice(0, 3);
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <section className="mx-auto max-w-7xl px-4 py-8">
        <div className="section-title mb-6">
          <h1 className="font-serif-bn text-3xl font-extrabold">{label}</h1>
        </div>
        {list.length === 0 && (
          <p className="mb-6 text-sm text-muted-foreground">এই বিভাগে নতুন সংবাদ শীঘ্রই আসছে। সাম্প্রতিক নির্বাচিত সংবাদ দেখুন—</p>
        )}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {items.map((a: typeof items[number]) => <ArticleCard key={a.slug} a={a} />)}
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}
