BEGIN;
-- Add missing columns if not exists
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS title_en TEXT;

-- Optional: generate slug from id if null
UPDATE public.articles SET slug = id::text WHERE slug IS NULL;

-- Create unique index for slug lookup
CREATE UNIQUE INDEX IF NOT EXISTS articles_slug_idx ON public.articles(slug);

-- Now recreate views with columns at END
DROP VIEW IF EXISTS public.public_articles_feed;
CREATE VIEW public.public_articles_feed WITH (security_invoker=true) AS
SELECT id, title_bn, excerpt_bn, content_bn, category, category_key, thumbnail_url, featured_image, status, published_at, source_name, source_url, image_credit, image_alt_bn, image_is_representational, is_fallback, canonical_url, origin, slug, title_en
FROM public.articles WHERE status='published';

DROP VIEW IF EXISTS public.public_article_detail;
CREATE VIEW public.public_article_detail WITH (security_invoker=true) AS
SELECT id, title_bn, title_en, content_bn, content_en, excerpt_bn, category, category_key, thumbnail_url, featured_image, status, published_at, created_at, source_name, source_url, image_credit, image_alt_bn, image_is_representational, is_fallback, canonical_url, origin, slug
FROM public.articles WHERE status='published';
COMMIT;
