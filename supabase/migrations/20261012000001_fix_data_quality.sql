BEGIN;
-- Fix title_en nulls
UPDATE public.articles SET title_en = title_bn WHERE title_en IS NULL OR title_en = '';

-- Generate SEO slug from title_en, keep short id suffix for uniqueness
UPDATE public.articles SET slug = regexp_replace(lower(left(title_en,60)), '[^a-z0-9]+', '-', 'g') || '-' || substring(id::text,1,6)
WHERE slug ~ '^[0-9a-f-]{36}$' OR slug ~ '^[0-9a-f-]{8}-[0-9a-f-]{4}-';

CREATE UNIQUE INDEX IF NOT EXISTS articles_slug_unique ON public.articles(slug);
COMMIT;
