import { useState } from "react";
import { Play, Film } from "lucide-react";
import { useLang } from "@/lib/i18n";
import { articles } from "@/lib/articles";

export function VideoShowcase() {
  const { t } = useLang();
  const clips = articles.slice(0, 4).map((a, i) => ({
    slug: a.slug,
    title: a.title,
    image: a.image,
    duration: ["০৩:১২", "০৫:৪০", "০২:২৮", "০৭:০৫"][i] ?? "০৪:০০",
    label: a.categoryLabel,
  }));
  const [active, setActive] = useState(0);
  const current = clips[active]!;

  return (
    <section className="slab border-y-4 border-border">
      <div className="mx-auto max-w-7xl px-4 py-10">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <h2 className="flex items-center gap-2 font-serif-bn text-2xl font-extrabold text-paper sm:text-3xl">
            <Film size={22} /> {t("ভিডিও ও মাল্টিমিডিয়া", "Video & Multimedia")}
          </h2>
          <span className="kicker text-paper/70">{t("ভিজ্যুয়াল সাংবাদিকতা", "Visual journalism")}</span>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
          <figure className="relative border-2 border-paper/40">
            <img src={current.image} alt={current.title} className="aspect-video w-full object-cover" />
            <button
              type="button"
              aria-label={t("ভিডিও চালান", "Play video")}
              className="absolute inset-0 grid place-items-center bg-ink/35 transition hover:bg-ink/20"
            >
              <span className="grid h-16 w-16 place-items-center border-2 border-paper bg-primary text-primary-foreground">
                <Play size={26} fill="currentColor" />
              </span>
            </button>
            <figcaption className="absolute bottom-0 left-0 right-0 bg-ink/85 p-3">
              <div className="kicker text-highlight">{current.label} · {current.duration}</div>
              <div className="mt-1 line-clamp-2 font-serif-bn text-lg font-extrabold text-paper">{current.title}</div>
            </figcaption>
          </figure>

          <ul className="flex flex-col gap-2">
            {clips.map((c, i) => (
              <li key={c.slug}>
                <button
                  type="button"
                  onClick={() => setActive(i)}
                  aria-current={i === active}
                  className={`flex w-full items-center gap-3 border-2 p-2 text-left ${
                    i === active ? "border-highlight bg-paper/10" : "border-paper/30 hover:bg-paper/10"
                  }`}
                >
                  <span className="relative shrink-0">
                    <img src={c.image} alt="" className="h-14 w-20 object-cover" />
                    <span className="absolute inset-0 grid place-items-center bg-ink/40 text-paper">
                      <Play size={14} fill="currentColor" />
                    </span>
                  </span>
                  <span className="min-w-0">
                    <span className="kicker block text-highlight">{c.duration}</span>
                    <span className="line-clamp-2 text-sm font-bold text-paper">{c.title}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
