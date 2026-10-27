alter table public.articles
  add column if not exists is_breaking boolean not null default false;

comment on column public.articles.is_breaking is
  'Editorial priority flag used by the public breaking-news ticker; does not publish or unpublish an article.';
