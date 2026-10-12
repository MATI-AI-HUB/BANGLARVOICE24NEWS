-- premium leak: entitlement policy already covers free + subscriber rows
drop policy if exists "allow_anon_read_published" on public.articles;
alter function public.set_slug_if_null() set search_path = pg_catalog, pg_temp;
drop index if exists public.articles_slug_idx;  -- duplicate of articles_slug_unique
update public.ai_gateway_policies set max_tokens = 3000
 where task = 'news_rewrite' and max_tokens < 3000;
