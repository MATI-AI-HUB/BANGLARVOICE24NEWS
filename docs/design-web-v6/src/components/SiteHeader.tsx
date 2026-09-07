import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Search, Menu, X, Sun, Moon, Eye, CloudSun, Radio } from "lucide-react";
import { useLang } from "@/lib/i18n";
import { useTheme, type Theme } from "@/lib/theme";

const navLinks: { to: string; bn: string; en: string }[] = [
  { to: "/", bn: "হোম", en: "Home" },
  { to: "/category/national", bn: "জাতীয়", en: "National" },
  { to: "/category/international", bn: "আন্তর্জাতিক", en: "World" },
  { to: "/category/politics", bn: "রাজনীতি", en: "Politics" },
  { to: "/category/economy", bn: "অর্থনীতি", en: "Economy" },
  { to: "/category/sports", bn: "খেলাধুলা", en: "Sports" },
  { to: "/category/entertainment", bn: "বিনোদন", en: "Culture" },
  { to: "/category/technology", bn: "প্রযুক্তি", en: "Tech" },
  { to: "/category/opinion", bn: "মতামত", en: "Opinion" },
  { to: "/learning-hub", bn: "লার্নিং হাব", en: "Learning Hub" },
  { to: "/e-paper", bn: "ই-পেপার", en: "E-Paper" },
];

export const breakingItems: { bn: string; en: string }[] = [
  {
    bn: "ঘোষণা: বাংলার ভয়েস পরীক্ষামূলক সম্প্রচার চলছে — মতামত ও সংশোধনী স্বাগত",
    en: "Announcement: Banglar Voice trial broadcast is running — feedback and corrections welcome",
  },
  { bn: "জাতিসংঘ অধিবেশনে জলবায়ু ইস্যুতে বাংলাদেশের জোরালো অবস্থান", en: "Bangladesh presses climate finance case at UN session" },
  { bn: "বিশ্ববাজারে জ্বালানি তেলের দাম স্থিতিশীল", en: "Global oil prices hold steady" },
  { bn: "গাজায় যুদ্ধবিরতি আলোচনায় নতুন গতি", en: "New momentum in Gaza ceasefire talks" },
  { bn: "এশিয়া কাপ ফাইনাল: প্রস্তুতি চূড়ান্ত পর্যায়ে", en: "Asia Cup final: preparations in final stage" },
];

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const { t } = useLang();
  const options: { key: Theme; icon: typeof Sun; label: string }[] = [
    { key: "light", icon: Sun, label: t("দিন", "Light") },
    { key: "dark", icon: Moon, label: t("রাত", "Dark") },
    { key: "eye", icon: Eye, label: t("চোখ সুরক্ষা", "Eye care") },
  ];
  return (
    <div className="flex items-center border-2 border-border">
      {options.map(({ key, icon: Icon, label }) => (
        <button
          key={key}
          type="button"
          onClick={() => setTheme(key)}
          aria-label={label}
          aria-pressed={theme === key}
          title={label}
          className={`p-1.5 ${theme === key ? "slab" : "hover:bg-secondary"}`}
        >
          <Icon size={13} />
        </button>
      ))}
    </div>
  );
}

function LangToggle() {
  const { lang, setLang } = useLang();
  return (
    <div className="flex items-center border-2 border-border font-sans text-[11px] font-extrabold">
      <button
        type="button"
        onClick={() => setLang("bn")}
        aria-pressed={lang === "bn"}
        className={`px-2 py-1 ${lang === "bn" ? "slab" : "hover:bg-secondary"}`}
      >
        বাংলা
      </button>
      <button
        type="button"
        onClick={() => setLang("en")}
        aria-pressed={lang === "en"}
        className={`px-2 py-1 ${lang === "en" ? "slab" : "hover:bg-secondary"}`}
      >
        EN
      </button>
    </div>
  );
}

function DateWeather() {
  const { lang, t } = useLang();
  const [today, setToday] = useState<string>("");
  const [weather, setWeather] = useState<{ temperature: number } | null>(null);

  useEffect(() => {
    const fmt = () =>
      new Date().toLocaleDateString(lang === "bn" ? "bn-BD" : "en-GB", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    setToday(fmt());
    const id = setInterval(() => setToday(fmt()), 60_000);
    return () => clearInterval(id);
  }, [lang]);

  useEffect(() => {
    let alive = true;
    fetch("/api/public/weather")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (alive && d && typeof d.temperature === "number") setWeather(d); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  return (
    <div className="flex min-w-0 items-center gap-3 truncate">
      <span className="truncate">{today || "\u00A0"}</span>
      {weather && (
        <span className="hidden shrink-0 items-center gap-1 sm:inline-flex">
          <CloudSun size={13} />
          {t("ঢাকা", "Dhaka")} {lang === "bn" ? weather.temperature.toLocaleString("bn-BD") : weather.temperature}°C
        </span>
      )}
    </div>
  );
}

export function BreakingTicker() {
  const { lang, t } = useLang();
  const items = breakingItems.map((b) => (lang === "bn" ? b.bn : b.en));
  return (
    <div className="border-b-2 border-border bg-highlight text-ink">
      <div className="mx-auto flex max-w-7xl items-center gap-3 overflow-hidden px-4 py-1.5 text-sm">
        <span className="flex shrink-0 items-center gap-1 slab px-2 py-0.5 kicker">
          <Radio size={11} /> {t("শেষ খবর", "Breaking")}
        </span>
        <div className="relative flex-1 overflow-hidden">
          <div className="ticker-track flex w-max gap-10 whitespace-nowrap font-semibold">
            {[...items, ...items].map((b, i) => (
              <span key={i} className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 bg-primary" />
                {b}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function SiteHeader() {
  const { lang, t } = useLang();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-50 border-b-2 border-border bg-background/97 backdrop-blur">
      {/* Utility strip */}
      <div className="border-b-2 border-border bg-secondary">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-1.5 font-sans text-[11px] text-muted-foreground">
          <DateWeather />
          <div className="flex shrink-0 items-center gap-2">
            <LangToggle />
            <ThemeToggle />
          </div>
        </div>
      </div>

      {/* Masthead */}
      <div className="mx-auto max-w-7xl px-4 py-3 sm:py-5">
        <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
          <div className="hidden font-sans text-[10px] uppercase leading-4 tracking-widest text-muted-foreground lg:block">
            <div>{t("ঢাকা, বাংলাদেশ", "Dhaka, Bangladesh")}</div>
            <div>ISSN · 2999-0000</div>
            <div>banglarvoice24news.com</div>
          </div>

          <Link to="/" className="min-w-0 text-center">
            <div className="font-serif-bn text-3xl font-extrabold leading-none tracking-tight sm:text-5xl">
              বাংলার <span className="text-primary">ভয়েস</span>
            </div>
            <div className="mt-1 kicker text-muted-foreground">
              {t("সত্য · নিরপেক্ষ · নির্ভরযোগ্য", "Truthful · Impartial · Trusted")}
            </div>
          </Link>

          <div className="flex shrink-0 items-center gap-2">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (q.trim()) navigate({ to: "/search", search: { q: q.trim() } });
              }}
              className="hidden items-center border-2 border-border bg-card md:flex"
            >
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t("সংবাদ খুঁজুন…", "Search news…")}
                aria-label={t("সংবাদ অনুসন্ধান", "Search news")}
                className="w-40 bg-transparent px-2 py-1.5 text-sm outline-none lg:w-52"
              />
              <button type="submit" aria-label={t("খুঁজুন", "Search")} className="slab p-2">
                <Search size={14} />
              </button>
            </form>
            <Link
              to="/e-paper"
              className="hidden brut-sm brut-press bg-primary px-3 py-2 font-sans text-xs font-extrabold text-primary-foreground sm:block"
            >
              {t("ই-পেপার", "E-Paper")}
            </Link>
            <button
              onClick={() => setOpen((v) => !v)}
              className="brut-flat p-2 lg:hidden"
              aria-label={t("মেনু", "Menu")}
              aria-expanded={open}
            >
              {open ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="slab border-y-2 border-border">
        <div className={`mx-auto max-w-7xl px-2 ${open ? "block" : "hidden"} lg:block`}>
          <div className="flex flex-col py-1 font-sans text-[13px] font-bold lg:flex-row lg:items-center lg:gap-0.5 lg:overflow-x-auto">
            {navLinks.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                onClick={() => setOpen(false)}
                className="shrink-0 px-3 py-2 uppercase tracking-wide opacity-85 hover:bg-primary hover:text-primary-foreground hover:opacity-100"
                activeProps={{ className: "bg-primary text-primary-foreground opacity-100" }}
                activeOptions={{ exact: n.to === "/" }}
              >
                {lang === "bn" ? n.bn : n.en}
              </Link>
            ))}
            <Link
              to="/search"
              onClick={() => setOpen(false)}
              className="shrink-0 px-3 py-2 uppercase tracking-wide opacity-85 hover:bg-primary hover:text-primary-foreground md:hidden"
            >
              {t("অনুসন্ধান", "Search")}
            </Link>
          </div>
        </div>
      </nav>
    </header>
  );
}
