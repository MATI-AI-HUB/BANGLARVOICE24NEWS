-- Correction (not removal): published articles whose stock photo could not be
-- verified as related to the news — or that had no image at all — now use the
-- branded headline card, so every article image always matches its headline.
-- The percent-encoding keeps the Bengali headline URL-safe for every client.
UPDATE public.articles
SET
  featured_image = 'https://YOUR_DOMAIN/api/brand-card?title=' ||
    upper(regexp_replace(encode(convert_to(title_bn, 'UTF8'), 'hex'), '..', '%\&', 'g')),
  thumbnail_url = 'https://YOUR_DOMAIN/api/brand-card?title=' ||
    upper(regexp_replace(encode(convert_to(title_bn, 'UTF8'), 'hex'), '..', '%\&', 'g')),
  image_credit = 'বাংলার ভয়েস',
  image_license = 'brand',
  image_is_representational = true,
  is_fallback = false
WHERE status = 'published'
  AND (
    coalesce(featured_image, '') ILIKE '%pexels%'
    OR coalesce(thumbnail_url, '') ILIKE '%pexels%'
    OR (coalesce(featured_image, '') = '' AND coalesce(thumbnail_url, '') = '')
  );
