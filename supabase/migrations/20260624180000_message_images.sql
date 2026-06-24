-- Message image attachments + room image storage

alter table public.messages
  add column if not exists image_url text;

alter table public.messages
  drop constraint if exists messages_content_check;

alter table public.messages
  add constraint messages_content_check check (
    char_length(trim(content)) > 0 or image_url is not null
  );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'room-images',
  'room-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.room_id_from_storage_path(p_name text)
returns uuid
language sql
stable
security invoker
set search_path = public
as $$
  select nullif(split_part(p_name, '/', 1), '')::uuid;
$$;

drop policy if exists "Room participants upload room images" on storage.objects;
drop policy if exists "Room participants update room images" on storage.objects;
drop policy if exists "Anyone can read room images" on storage.objects;

create policy "Room participants upload room images"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'room-images'
  and public.is_room_participant(public.room_id_from_storage_path(name))
);

create policy "Room participants update room images"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'room-images'
  and public.is_room_participant(public.room_id_from_storage_path(name))
)
with check (
  bucket_id = 'room-images'
  and public.is_room_participant(public.room_id_from_storage_path(name))
);

create policy "Anyone can read room images"
on storage.objects
for select
to public
using (bucket_id = 'room-images');
