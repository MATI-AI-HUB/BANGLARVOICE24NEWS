insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('reels', 'reels', false, 104857600, array['video/mp4']::text[])
on conflict (id) do nothing;
