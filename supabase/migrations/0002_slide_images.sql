-- Add image support to slides (Kahoot-style)

alter table slides add column if not exists image_url text;

-- Public storage bucket for slide images
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'slide-images',
  'slide-images',
  true,
  5242880,
  array['image/jpeg','image/png','image/gif','image/webp']
)
on conflict (id) do nothing;

-- Anyone can read; presenters (authenticated) can upload/delete their own.
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='Public read slide images') then
    create policy "Public read slide images" on storage.objects
      for select using (bucket_id = 'slide-images');
  end if;
  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='Authenticated upload slide images') then
    create policy "Authenticated upload slide images" on storage.objects
      for insert to authenticated with check (bucket_id = 'slide-images');
  end if;
  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='Authenticated delete own slide images') then
    create policy "Authenticated delete own slide images" on storage.objects
      for delete to authenticated using (bucket_id = 'slide-images' and owner = auth.uid());
  end if;
end $$;
