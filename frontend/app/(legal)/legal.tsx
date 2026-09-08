// Shared legal primitives — Banglar Voice compliance framework
// Static date anchor (DO NOT change without editorial+legal review):
export const LEGAL_UPDATED = 'Last Updated: 08 Sep 2026 | কার্যকর তারিখ: ০৮ সেপ্টেম্বর ২০২৬';
export const LEGAL_EMAIL = 'banglarvoice24news@gmail.com';

const boxStyles = {
  privacy: 'border-l-4 border-sky-600 bg-sky-50 dark:bg-sky-950/40',
  terms: 'border-l-4 border-amber-600 bg-amber-50 dark:bg-amber-950/40',
  cookies: 'border-l-4 border-violet-600 bg-violet-50 dark:bg-violet-950/40',
  disclaimer: 'border-l-4 border-rose-600 bg-rose-50 dark:bg-rose-950/40',
  copyright: 'border-l-4 border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40',
  correction: 'border-l-4 border-blue-600 bg-blue-50 dark:bg-blue-950/40',
  default: 'border-l-4 border-neutral-600 bg-neutral-50 dark:bg-neutral-900/60',
} as const;

export type LegalTone = keyof typeof boxStyles;

/** Bangla summary box that tops every legal page (border-l-4 colored). */
export function LegalSummaryBox({ title, tone = 'default', children }: { title: string; tone?: LegalTone; children: React.ReactNode }) {
  return (
    <aside className={`mb-8 rounded-r-xl p-5 ${boxStyles[tone]}`} role="note" aria-label="সারসংক্ষেপ">
      <h2 className="mb-2 text-sm font-bold uppercase tracking-widest text-inherit opacity-80">{title}</h2>
      <div className="text-[15px] leading-relaxed text-ink/90 dark:text-paper/90">{children}</div>
    </aside>
  );
}

/** Date-anchor chip shown above every legal article heading. */
export function LegalDateAnchor() {
  return (
    <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-muted px-3 py-1 text-[11px] font-medium text-neutral-600 dark:text-neutral-300">
      <span aria-hidden="true">📅</span> {LEGAL_UPDATED}
    </p>
  );
}

/** Prothom Alo–style centered legal article layout (max-w-4xl). */
export function LegalArticle({ children }: { children: React.ReactNode }) {
  return (
    <article className="mx-auto w-full max-w-4xl px-4 pb-16 pt-10 sm:px-6">{children}</article>
  );
}

export function LegalH1({ children }: { children: React.ReactNode }) {
  return (
    <h1 className="mb-2 font-serif text-3xl font-bold leading-tight text-ink dark:text-paper sm:text-4xl">
      {children}
    </h1>
  );
}

export function LegalSection({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 border-t border-border/60 pt-6">
      <h2 className="mb-3 text-xl font-bold text-ink dark:text-paper">{title}</h2>
      <div className="space-y-3 text-[16px] leading-relaxed text-neutral-700 dark:text-neutral-300">{children}</div>
    </section>
  );
}

export function LegalParagraph({ children }: { children: React.ReactNode }) {
  return <p>{children}</p>;
}

export function LegalList({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="ml-5 list-disc space-y-1.5">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}

export function LegalEmailLink({ email = LEGAL_EMAIL }: { email?: string }) {
  return (
    <a className="font-semibold text-primary underline decoration-primary/40 underline-offset-4 hover:decoration-primary" href={`mailto:${email}`}>
      {email}
    </a>
  );
}
