import Link from 'next/link';
import { t, translateCategory, type Locale } from '../lib/i18n';

/**
 * Banglar Voice — Article breadcrumb.
 * Home › Category › (current page title, truncated).
 * Locale-aware: uses `t()` for fixed strings and `translateCategory()`
 * for the category chip so EN locale shows "Politics", not "রাজনীতি".
 */
export function Breadcrumb({
  category,
  title,
  locale = 'bn' as Locale,
}: {
  category?: string;
  title: string;
  locale?: Locale;
}) {
  return (
    <nav
      aria-label={t(locale, 'breadcrumb_aria')}
      className="flex flex-wrap items-center gap-1.5 text-xs font-medium text-neutral-500 dark:text-neutral-400"
    >
      <Link
        href="/"
        className="transition-colors hover:text-primary"
      >
        {t(locale, 'breadcrumb_home')}
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
            {translateCategory(locale, category)}
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
