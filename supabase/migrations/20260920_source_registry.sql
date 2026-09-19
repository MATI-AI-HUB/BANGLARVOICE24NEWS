-- Source registry + diversity management
-- Enables structured source metadata and diversity enforcement.

create table if not exists public.source_registry (
  id              uuid primary key default gen_random_uuid(),
  name_bn         text not null unique,
  name_en         text not null,
  domain          text,
  credibility     int not null default 50 check (credibility between 0 and 100),
  bias_leaning    text check (bias_leaning in ('left', 'center', 'right', 'unknown')),
  daily_cap_pct   int not null default 30 check (daily_cap_pct between 5 and 100),
  is_active       bool not null default true,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Seed common Bangladeshi sources
insert into public.source_registry (name_bn, name_en, domain, credibility, bias_leaning, daily_cap_pct)
values
  ('প্রথম আলো',       'Prothom Alo',        'prothomalo.com',       85, 'center',  30),
  ('BBC বাংলা',        'BBC Bangla',         'bbc.com/bengali',      95, 'center',  30),
  ('অর্থসূচক',         'Arthosuchak',        'arthosuchak.com',      70, 'left',    25),
  ('ডয়চে ভেলে',        'DW Bangla',          'dw.com/bn',            90, 'center',  25),
  ('দ্য ডেইলি স্টার',   'The Daily Star',     'thedailystar.net',     80, 'center',  25),
  ('বিডিনিউজ২৪',        'BDNews24',           'bdnews24.com',         75, 'center',  25),
  ('প্রথম আলো English','Prothom Alo English','en.prothomalo.com',    85, 'center',  20),
  ('জুগান্তর',          'Jugantor',           'jugantor.com',         70, 'center',  20),
  ('বাংলাট্রিবিউন',     'Bangla Tribune',     'banglatribune.com',    75, 'center',  20),
  ('সমকাল',             'Samakal',            'samakal.com',          72, 'center',  20)
on conflict (name_bn) do nothing;

-- Auto-update updated_at
create or replace function public.touch_source_registry()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists trg_source_registry_touch on public.source_registry;
create trigger trg_source_registry_touch
  before update on public.source_registry
  for each row execute function public.touch_source_registry();

-- RLS: public can read, only service_role can write
alter table public.source_registry enable row level security;

drop policy if exists "Public can read source_registry" on public.source_registry;
create policy "Public can read source_registry"
  on public.source_registry for select
  using (true);

drop policy if exists "Service role can write source_registry" on public.source_registry;
create policy "Service role can write source_registry"
  on public.source_registry for all
  using (auth.role() = 'service_role');
