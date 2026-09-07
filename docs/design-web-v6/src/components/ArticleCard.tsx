import { Link } from "@tanstack/react-router";
import type { Article } from "@/lib/articles";

export function ArticleCard({ a, variant = "default" }: { a: Article; variant?: "default" | "compact" | "hero" | "wide" }) {
  if (variant === "hero") {
    return (
      <Link to="/news/$slug" params={{ slug: a.slug }} className="group block brut brut-press">
        <div className="relative aspect-[16/9] overflow-hidden border-b-2 border-border">
          <img
            src={a.image}
            alt={a.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <span className="absolute left-0 top-0 slab px-2 py-1 kicker">{a.categoryLabel}</span>
        </div>
        <div className="p-4 sm:p-6">
          <h2 className="font-serif-bn text-2xl font-extrabold leading-tight sm:text-4xl">{a.title}</h2>
          <p className="mt-3 line-clamp-3 text-muted-foreground">{a.dek}</p>
          <div className="mt-3 font-sans text-[11px] uppercase tracking-wider text-muted-foreground">{a.author}</div>
        </div>
      </Link>
    );
  }

  if (variant === "compact") {
    return (
      <Link
        to="/news/$slug"
        params={{ slug: a.slug }}
        className="group flex gap-3 border-b-2 border-border py-3 last:border-0"
      >
        <img src={a.image} alt="" className="h-16 w-20 shrink-0 border-2 border-border object-cover" />
        <div className="min-w-0">
          <div className="kicker text-primary">{a.categoryLabel}</div>
          <h4 className="mt-0.5 line-clamp-3 text-sm font-bold leading-snug group-hover:text-primary">{a.title}</h4>
        </div>
      </Link>
    );
  }

  if (variant === "wide") {
    return (
      <Link to="/news/$slug" params={{ slug: a.slug }} className="group grid gap-4 brut brut-press p-4 sm:grid-cols-[200px_1fr]">
        <img src={a.image} alt={a.title} className="aspect-[4/3] w-full border-2 border-border object-cover" />
        <div>
          <div className="kicker text-primary">{a.categoryLabel}</div>
          <h3 className="mt-1 font-serif-bn text-xl font-extrabold leading-snug">{a.title}</h3>
          <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{a.dek}</p>
        </div>
      </Link>
    );
  }

  return (
    <Link to="/news/$slug" params={{ slug: a.slug }} className="group block brut brut-press">
      <div className="relative border-b-2 border-border">
        <img src={a.image} alt={a.title} className="aspect-[16/10] w-full object-cover" />
        <span className="absolute left-0 top-0 slab px-2 py-0.5 kicker">{a.categoryLabel}</span>
      </div>
      <div className="p-4">
        <h3 className="line-clamp-3 font-serif-bn text-lg font-extrabold leading-snug group-hover:text-primary">
          {a.title}
        </h3>
        <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{a.dek}</p>
      </div>
    </Link>
  );
}
