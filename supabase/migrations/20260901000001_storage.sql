-- =============================================================================
-- Banglar Voice — Supabase Storage Buckets & Policies
-- -----------------------------------------------------------------------------
-- 3 buckets:
--   * field-media  (private)  — reporter videos/photos; only staff/editorial read
--   * thumbnails   (public)   — AI-generated article thumbnails (served on CDN)
--   * logos        (public)   — transparent brand logos (e.g. banglar_voice_classic_premium.png)
--
-- Apply with:  psql "$DATABASE_URL" -f supabase/storage.sql   (or supabase db push)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1) BUCKETS
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('field-media', 'field-media', false,
   1073741824,  -- 1 GB per file (raw field video before transcoding)
   array['image/jpeg','image/png','image/webp','video/mp4','video/quicktime','audio/mp4','audio/mpeg','audio/wav']),
  ('thumbnails', 'thumbnails', true,
   5242880,     -- 5 MB
   array['image/jpeg','image/png','image/webp']),
  ('logos', 'logos', true,
   2097152,     -- 2 MB
   array['image/png','image/svg+xml','image/webp'])
on conflict (id) do update set
  public             = excluded.public,
  file_size_limit    = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- ---------------------------------------------------------------------------
-- 2) POLICIES
-- ---------------------------------------------------------------------------
-- Folders in field-media:
--   /{reporter_user_id}/{report_id}/{filename}   → owner can upload+read while draft
--   /staff/{report_id}/{filename}                → staff uploads
--   /public-thumb/{article_id}.webp              → generated thumbnails (still private bucket,
--                                                   served through the API with a signed URL)
-- ---------------------------------------------------------------------------

-- FIELD-MEDIA (private) ------------------------------------------------------

-- Upload: citizen/staff reporter into their own folder.
create policy "reporters upload own field-media"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'field-media'
  and (storage.foldername(name))[1] = auth.uid()::text
  and public.current_app_role() in ('citizen_reporter','staff_reporter')
);

-- Read: owner + staff/editorial (staff may review any field submission).
create policy "owner or staff read field-media"
on storage.objects for select
to authenticated
using (
  bucket_id = 'field-media'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.current_app_role() in ('staff_reporter','desk_editor','chief_editor','admin')
  )
);

-- Staff/editorial may upload into the shared staff/ folder.
create policy "staff upload field-media shared"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'field-media'
  and (storage.foldername(name))[1] = 'staff'
  and public.current_app_role() in ('staff_reporter','desk_editor','chief_editor','admin')
);

-- Owner may delete own pending files; admins delete anything.
create policy "owner deletes own field-media"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'field-media'
  and (storage.foldername(name))[1] = auth.uid()::text
);
create policy "admin deletes field-media"
on storage.objects for delete
to authenticated
using (bucket_id = 'field-media' and public.current_app_role() = 'admin');

-- THUMBNAILS (public bucket) --------------------------------------------------
-- Read: public (bucket-level public already allows anon via storage's public
-- bucket rule when no RLS policy overrides; explicit policy for consistency).
create policy "public read thumbnails"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'thumbnails');

-- Write: editorial + AI automation (service_role bypasses RLS anyway).
create policy "editorial write thumbnails"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'thumbnails'
  and public.current_app_role() in ('desk_editor','chief_editor','admin')
);

-- LOGOS (public bucket) --------------------------------------------------------
create policy "public read logos"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'logos');

create policy "admin write logos"
on storage.objects for insert, update
to authenticated
with check (bucket_id = 'logos' and public.current_app_role() = 'admin');

-- =============================================================================
-- 3) NOTES
-- =============================================================================
-- Storage objects RLS is enabled by Supabase by default. When you create the
-- buckets from the dashboard instead of this script, re-run this file AFTER
-- creating them so the policies above exist (dashboard auto-policies are
-- additive — multiple policies on the same table are OR-ed together).
-- Object paths must follow the folder conventions described at the top:
--   field-media/{user_id}/{report_id}/...   and   field-media/staff/{report_id}/...
