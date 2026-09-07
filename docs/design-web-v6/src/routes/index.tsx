import { createFileRoute, Link } from "@tanstack/react-router";
import { Newspaper, Crown, Megaphone, Handshake, ArrowRight } from "lucide-react";
import { SiteHeader, BreakingTicker } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { ArticleCard } from "@/components/ArticleCard";
import { LearningHubPanel } from "@/components/LearningHubPanel";
import { VideoShowcase } from "@/components/VideoShowcase";
import { NewsletterSignup } from "@/components/NewsletterSignup";
import { AdSlot } from "@/components/AdSlot";
import { articles } from "@/lib/articles";
import { useLang } from "@/lib/i18n";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "বাংলার ভয়েস — সত্য, নিরপেক্ষ, নির্ভরযোগ্য সংবাদ" },
      { name: "description", content: "বাংলার ভয়েস — জাতীয় ও আন্তর্জাতিক সর্বশেষ সংবাদ, রাজনীতি, অর্থনীতি, খেলাধুলা, বিনোদন, প্রযুক্তি, ভিডিও ও মতামত। ২৪ ঘণ্টা হালনাগাদ।" },
      { property: "og:title", content: "বাংলার ভয়েস — সত্য, নিরপেক্ষ, নির্ভরযোগ্য সংবাদ" },
      { property: "og:description", content: "জাতীয় ও আন্তর্জাতিক সর্বশেষ সংবাদ, ভিডিও, বিশ্লেষণ ও লার্নিং হাব — বাংলার ভয়েস।" },
      { property: "og:url", content: "https://banglarvoice24news.com/" },
    ],
    links: [{ rel: "canonical", href: "https://banglarvoice24news.com/" }],
  }),
  component: Home,
});

const CATEGORY_BLOCKS: { key: string; bn: string; en: string }[] = [
  { key: "sports", bn: "খেলাধুলা", en: "Sports" },
  { key: "entertainment", bn: "বিনোদন", en: "Culture" },
  { key: "technology", bn: "প্রযুক্তি", en: "Technology" },
];

function Home() {
  const { t } = useLang();
  const lead = articles[0]!;
  const secondary = articles.slice(1, 3);
  const grid = articles.slice(1);
  const opinion = articles.find((a) => a.category === "opinion");
  const mostRead = articles.slice(0, 5);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <BreakingTicker />

      {/* HERO */}
      <section className="mx-auto max-w-7xl px-4 py-6">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div className="space-y-6">
            <ArticleCard a={lead} variant="hero" />
            <div className="grid gap-5 sm:grid-cols-2">
              {secondary.map((a) => (
                <ArticleCard key={a.slug} a={a} />
              ))}
            </div>
          </div>

          <div className="space-y-5">
            <LearningHubPanel />
            <AdSlot format="rectangle" />
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 pb-6">
        <AdSlot format="leaderboard" />
      </div>

      {/* LATEST + SIDEBAR */}
      <section className="mx-auto max-w-7xl px-4 py-4">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)]">
          <div>
            <div className="section-title mb-5 flex flex-wrap items-end justify-between gap-2">
              <h2 className="font-serif-bn text-2xl font-extrabold">{t("সর্বশেষ সংবাদ", "Latest news")}</h2>
              <span className="kicker text-muted-foreground">
                {t("সম্পাদকীয় বিভাগ দ্বারা যাচাইকৃত", "Verified by the editorial desk")}
              </span>
            </div>
            <div className="grid gap-6 sm:grid-cols-2">
              {grid.map((a) => (
                <ArticleCard key={a.slug} a={a} />
              ))}
            </div>
          </div>

          <aside className="space-y-6">
            <div>
              <div className="section-title mb-3">
                <h2 className="font-serif-bn text-xl font-extrabold">{t("বেশি পঠিত", "Most read")}</h2>
              </div>
              <ol className="brut-flat p-3">
                {mostRead.map((a) => (
                  <li key={a.slug}>
                    <ArticleCard a={a} variant="compact" />
                  </li>
                ))}
              </ol>
            </div>

            {opinion && (
              <div>
                <div className="section-title mb-3">
                  <h2 className="font-serif-bn text-xl font-extrabold">{t("মতামত", "Opinion")}</h2>
                </div>
                <Link to="/news/$slug" params={{ slug: opinion.slug }} className="block brut brut-press p-4">
                  <div className="kicker text-primary">{opinion.categoryLabel}</div>
                  <h3 className="mt-1 font-serif-bn text-lg font-extrabold leading-snug">{opinion.title}</h3>
                  <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{opinion.dek}</p>
                  <div className="mt-3 kicker text-muted-foreground">{opinion.author}</div>
                </Link>
              </div>
            )}

            <AdSlot format="skyscraper" />
          </aside>
        </div>
      </section>

      {/* CATEGORY BLOCKS */}
      <section className="mx-auto max-w-7xl px-4 py-8">
        <div className="grid gap-8 md:grid-cols-3">
          {CATEGORY_BLOCKS.map((c) => {
            const items = articles.filter((a) => a.category === c.key);
            const list = items.length ? items : articles.slice(0, 2);
            return (
              <div key={c.key}>
                <div className="section-title mb-3 flex items-center justify-between">
                  <h2 className="font-serif-bn text-xl font-extrabold">{t(c.bn, c.en)}</h2>
                  <Link
                    to="/category/$cat"
                    params={{ cat: c.key }}
                    className="inline-flex items-center gap-1 kicker hover:text-primary"
                  >
                    {t("সব", "All")} <ArrowRight size={12} />
                  </Link>
                </div>
                <div className="brut-flat p-3">
                  {list.slice(0, 4).map((a) => (
                    <ArticleCard key={a.slug} a={a} variant="compact" />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <VideoShowcase />

      {/* NEWSLETTER + MONETIZATION */}
      <section className="mx-auto max-w-7xl px-4 py-10">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <NewsletterSignup />

          <div className="space-y-4">
            <div className="section-title">
              <h2 className="font-serif-bn text-xl font-extrabold">{t("সমর্থন ও অংশীদারিত্ব", "Support & partnerships")}</h2>
            </div>
            {[
              {
                icon: Crown,
                bn: "বাংলার ভয়েস সদস্যপদ",
                en: "Banglar Voice Membership",
                dbn: "বিজ্ঞাপনমুক্ত পাঠ, গভীর বিশ্লেষণ ও সাপ্তাহিক ডেটা রিপোর্ট।",
                den: "Ad-light reading, deep analysis and a weekly data report.",
                cta: { bn: "মাসিক ২৯৯৳", en: "৳299 / month" },
              },
              {
                icon: Megaphone,
                bn: "বিজ্ঞাপন দিন",
                en: "Advertise with us",
                dbn: "ডিসপ্লে, নেটিভ ও নিউজলেটার স্পন্সরশিপ প্যাকেজ।",
                den: "Display, native and newsletter sponsorship packages.",
                cta: { bn: "মিডিয়া কিট", en: "Media kit" },
              },
              {
                icon: Handshake,
                bn: "স্পন্সরড কনটেন্ট",
                en: "Sponsored content",
                dbn: "সম্পাদকীয় মান বজায় রেখে স্পষ্টভাবে চিহ্নিত ব্র্যান্ড স্টোরি।",
                den: "Clearly labelled brand stories that respect editorial standards.",
                cta: { bn: "যোগাযোগ", en: "Contact" },
              },
            ].map(({ icon: Icon, bn, en, dbn, den, cta }) => (
              <div key={bn} className="brut brut-press p-4">
                <div className="flex items-start gap-3">
                  <span className="slab shrink-0 p-2"><Icon size={16} /></span>
                  <div className="min-w-0">
                    <h3 className="font-serif-bn text-lg font-extrabold">{t(bn, en)}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{t(dbn, den)}</p>
                    <a
                      href="mailto:editor@banglarvoice24news.com"
                      className="mt-2 inline-block font-sans text-xs font-extrabold underline hover:text-primary"
                    >
                      {t(cta.bn, cta.en)}
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* E-PAPER */}
      <section className="mx-auto max-w-7xl px-4 pb-12">
        <div className="brut flex flex-wrap items-center justify-between gap-4 p-6">
          <div className="flex items-center gap-3">
            <Newspaper className="text-primary" size={24} />
            <div>
              <div className="font-serif-bn text-xl font-extrabold">{t("আজকের ই-পেপার", "Today's e-paper")}</div>
              <div className="text-xs text-muted-foreground">{t("সকল পাতা এক ক্লিকে পড়ুন", "Read every page in one click")}</div>
            </div>
          </div>
          <Link
            to="/e-paper"
            className="brut-sm brut-press bg-primary px-4 py-2 font-sans text-sm font-extrabold text-primary-foreground"
          >
            {t("ই-পেপার পড়ুন", "Open e-paper")}
          </Link>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
