BEGIN;
-- Fix NULL slugs with category+id (Bangla safe, never NULL)
UPDATE public.articles SET slug = COALESCE(category_key,'news') || '-' || substring(id::text,1,8)
WHERE slug IS NULL OR slug = '' OR slug LIKE 'NULL%' OR length(slug) < 3;

-- Prevent future NULLs
ALTER TABLE public.articles ALTER COLUMN slug SET DEFAULT substring(gen_random_uuid()::text,1,8);
UPDATE public.articles SET slug = COALESCE(slug, substring(id::text,1,8)) WHERE slug IS NULL;
ALTER TABLE public.articles ALTER COLUMN slug SET NOT NULL;

-- Fix trigger for new articles
CREATE OR REPLACE FUNCTION public.set_slug_if_null() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := COALESCE(NEW.category_key,'news') || '-' || substring(NEW.id::text,1,8);
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_slug ON public.articles;
CREATE TRIGGER trg_set_slug BEFORE INSERT OR UPDATE ON public.articles FOR EACH ROW EXECUTE FUNCTION public.set_slug_if_null();
COMMIT;
