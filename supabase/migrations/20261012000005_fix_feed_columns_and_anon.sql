BEGIN;
-- 1. Recreate views with exact columns (no cover_image_url)
DROP VIEW IF EXISTS public.public_articles_feed;
CREATE VIEW public.public_articles_feed WITH (security_invoker = true) AS
SELECT id, slug, title_bn, title_en, excerpt_bn, content_bn, content_en,
       category, category_key, thumbnail_url, featured_image,
       status, published_at, created_at,
       source_name, source_url, image_credit, image_alt_bn, image_is_representational,
       is_fallback, canonical_url, origin
FROM public.articles WHERE status='published';

DROP VIEW IF EXISTS public.public_article_detail;
CREATE VIEW public.public_article_detail WITH (security_invoker = true) AS
SELECT id, slug, title_bn, title_en, excerpt_bn, content_bn, content_en,
       category, category_key, thumbnail_url, featured_image,
       status, published_at, created_at,
       source_name, source_url, image_credit, image_alt_bn, image_is_representational,
       is_fallback, canonical_url, origin
FROM public.articles WHERE status='published';

-- 2. Allow anon
DROP POLICY IF EXISTS "allow_anon_read_published" ON public.articles;
CREATE POLICY "allow_anon_read_published" ON public.articles FOR SELECT TO anon, authenticated USING (status='published');
GRANT SELECT ON public.articles TO anon, authenticated;
GRANT SELECT ON public.public_articles_feed, public.public_article_detail TO anon, authenticated;
COMMIT;
