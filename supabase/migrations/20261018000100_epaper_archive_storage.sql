-- E-paper PDF archive columns and the two public, read-only storage buckets.
-- Idempotent. Adds nothing for Vault, tenancy or social: those live in earlier
-- migrations (api_vault + decrypt_vault_secret, social_platforms, ...).

alter table public.epaper_editions
  add column if not exists archive_path text,
  add column if not exists archive_generated_at timestamptz;

-- Public buckets serve objects over /storage/v1/object/public/... without any
-- storage.objects policy. No insert/update/delete policy is created, so only
-- service_role (which bypasses RLS) can write.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('epaper-archives', 'epaper-archives', true, 52428800,
   array['application/pdf']),
  ('app-releases', 'app-releases', true, 209715200,
   array['application/vnd.android.package-archive', 'application/octet-stream'])
on conflict (id) do update set
  public             = excluded.public,
  file_size_limit    = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
