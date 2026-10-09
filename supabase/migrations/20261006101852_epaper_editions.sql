create table if not exists public.epaper_editions (
  id uuid primary key default gen_random_uuid(),
  edition_date date not null unique,
  title text not null,
  html text not null,
  pdf_url text not null default '',
  article_count integer not null default 0 check (article_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists epaper_editions_date_idx on public.epaper_editions (edition_date desc);
alter table public.epaper_editions enable row level security;
grant select on public.epaper_editions to anon, authenticated;
grant all on public.epaper_editions to service_role;
drop policy if exists "public read e-paper editions" on public.epaper_editions;
create policy "public read e-paper editions" on public.epaper_editions for select using (true);;
