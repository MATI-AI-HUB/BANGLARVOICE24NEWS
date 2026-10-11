BEGIN;
-- Allow anon to read published views
ALTER VIEW public.public_articles_feed SET (security_invoker = true);
ALTER VIEW public.public_article_detail SET (security_invoker = true);
DROP POLICY IF EXISTS "allow_anon_read_published" ON public.articles;
CREATE POLICY "allow_anon_read_published" ON public.articles FOR SELECT TO anon USING (status='published');
GRANT SELECT ON public.public_articles_feed, public.public_article_detail TO anon;
COMMIT;
