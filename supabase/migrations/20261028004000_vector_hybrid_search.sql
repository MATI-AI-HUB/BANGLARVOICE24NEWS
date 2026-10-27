create extension if not exists vector with schema extensions;

create table if not exists public.article_embeddings (
  article_id uuid primary key references public.articles(id) on delete cascade,
  embedding extensions.vector not null,
  model text not null,
  content_hash text not null,
  updated_at timestamptz not null default now()
);

alter table public.article_embeddings enable row level security;
revoke all on public.article_embeddings from anon, authenticated;
grant all on public.article_embeddings to service_role;

create or replace function public.hybrid_search_articles(
  p_query text,
  p_query_embedding extensions.vector,
  p_match_count integer default 5
)
returns table (
  id uuid,
  slug text,
  title_bn text,
  title_en text,
  excerpt_bn text,
  semantic_score double precision,
  text_score real,
  hybrid_score double precision
)
language sql
stable
security definer
set search_path = pg_catalog, public, extensions
as $$
  with query_terms as (
    select websearch_to_tsquery('simple', coalesce(p_query, '')) as tsq
  ),
  scored as (
    select
      a.id,
      a.slug,
      a.title_bn,
      a.title_en,
      a.excerpt_bn,
      greatest(0::double precision, 1 - (e.embedding <=> p_query_embedding)) as semantic_score,
      ts_rank_cd(
        setweight(to_tsvector('simple', coalesce(a.title_bn, '') || ' ' || coalesce(a.title_en, '')), 'A') ||
        setweight(to_tsvector('simple', coalesce(a.excerpt_bn, '')), 'B') ||
        setweight(to_tsvector('simple', coalesce(a.content_bn, '') || ' ' || coalesce(a.content_en, '')), 'C'),
        query_terms.tsq
      ) as text_score
    from public.articles a
    join public.article_embeddings e on e.article_id = a.id
    cross join query_terms
    where a.status = 'published'
  )
  select
    scored.id,
    scored.slug,
    scored.title_bn,
    scored.title_en,
    scored.excerpt_bn,
    scored.semantic_score,
    scored.text_score,
    (0.7 * scored.semantic_score + 0.3 * scored.text_score)::double precision as hybrid_score
  from scored
  order by hybrid_score desc, id
  limit greatest(1, least(coalesce(p_match_count, 5), 20));
$$;

revoke all on function public.hybrid_search_articles(text, extensions.vector, integer) from public, anon, authenticated;
grant execute on function public.hybrid_search_articles(text, extensions.vector, integer) to service_role;
