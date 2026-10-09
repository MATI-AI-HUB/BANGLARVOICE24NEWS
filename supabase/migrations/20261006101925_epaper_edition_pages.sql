alter table public.epaper_editions add column if not exists pages jsonb not null default '[]'::jsonb;;
