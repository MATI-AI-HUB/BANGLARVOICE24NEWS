-- Keep the public feed Bengali-first and prevent known raw/fallback rewrites
-- from remaining publicly visible. Rows stay in the database for editorial review.
UPDATE public.articles
SET
  status = 'pending',
  editorial_status = 'pending_review',
  workflow_status = 'draft',
  published_at = NULL,
  review_reason = 'quality_quarantine:english_or_fallback_rewrite'
WHERE status = 'published'
  AND (
    title_bn ILIKE '%Feature:%'
    OR title_bn ILIKE '%/ Feature%'
    OR content_bn ILIKE '%মূল প্রতিবেদনের সারাংশ:%'
    OR content_bn ILIKE '%এই লেখাটি %সাম্প্রতিক প্রতিবেদনের সংক্ষিপ্ত পটভূমি%'
  );
