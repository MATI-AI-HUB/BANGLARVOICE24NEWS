alter table public.articles add column if not exists image_source_url text;
alter table public.articles add column if not exists image_license_url text;
alter table public.articles add column if not exists image_rights_verified boolean not null default false;
alter table public.articles add column if not exists image_relevance_score integer;
alter table public.articles add column if not exists image_rights_checked_at timestamptz;
create index if not exists articles_image_rights_idx on public.articles (image_rights_verified, published_at desc);
