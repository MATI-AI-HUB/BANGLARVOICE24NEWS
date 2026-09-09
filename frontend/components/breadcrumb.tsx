import Link from 'next/link';

/**
 * Banglar Voice — Article breadcrumb.
 * Home › Category › (current page title, truncated).
 * Uses only existing design tokens (primary, muted, border, ink, sansbn).
 */
export function Breadcrumb({
  category,
  title,
}: {
  category?: string;
  title: string;
}) {
  return (
    <nav
      aria-label="ব্রেডক্রাম্ব"
      className="flex flex-wrap items-center gap-1.5 text-xs font-medium text-neutral-500 dark:text-neutral-400"
    >
      <Link
        href="/"
        className="transition-colors hover:text-primary"
      >
        হোম
      </Link>
      <span aria-hidden="true" className="text-neutral-400 dark:text-neutral-600">
        ›
      </span>
      {category ? (
        <>
          <Link
            href="/#latest"
            className="transition-colors hover:text-primary"
          >
            {category}
          </Link>
          <span aria-hidden="true" className="text-neutral-400 dark:text-neutral-600">
            ›
          </span>
        </>
      ) : null}
      <span className="line-clamp-1 max-w-[16rem] font-medium text-ink dark:text-paper">
        {title}
      </span>
    </nav>
  );
}