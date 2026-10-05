-- Restore the public feed view grant after any view refresh/recreation.
-- This is intentionally idempotent and safe to re-run.

begin;

grant select on public.public_articles_feed to anon, authenticated, service_role;

grant select on public.public_article_detail to anon, authenticated, service_role;

commit;
