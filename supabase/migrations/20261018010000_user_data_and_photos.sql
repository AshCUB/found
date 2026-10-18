-- Per-user app data: selected focus lists, logs (the collection), streak/settings, and log photos.
-- Requires 20261018000000_create_profiles.sql to have been run first. Safe to run more than once.

-- Streak and settings follow the user across devices. streak_data is null until first saved.
alter table public.profiles add column if not exists streak_data jsonb;
alter table public.profiles add column if not exists show_streak boolean not null default true;

-- Which focus lists each user has selected. The lists themselves are app content (src/data/focusLists.js).
create table if not exists public.user_lists (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  list_id text not null check (char_length(list_id) between 1 and 100),
  created_at timestamptz not null default now(),
  primary key (user_id, list_id)
);

-- One row per find. Photos live in the private `log-photos` bucket; only their paths are stored here.
create table if not exists public.logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  list_id text not null check (char_length(list_id) between 1 and 100),
  item_id text not null check (char_length(item_id) between 1 and 100),
  note text check (char_length(note) <= 500),
  found_at timestamptz not null default now(),
  found_without_photo boolean not null default false,
  photo_path text check (photo_path is null or photo_path like user_id::text || '/%'),
  thumb_path text check (thumb_path is null or thumb_path like user_id::text || '/%'),
  -- Id of the log in this browser's old local storage, so importing it twice can't create duplicates.
  legacy_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, legacy_id)
);

create index if not exists logs_user_found_at_idx on public.logs (user_id, found_at desc);

drop trigger if exists logs_set_updated_at on public.logs;
create trigger logs_set_updated_at
  before update on public.logs
  for each row execute function public.set_updated_at();

-- Row-level security: each signed-in user can only read, write, and delete their own rows.
alter table public.user_lists enable row level security;
alter table public.logs enable row level security;

revoke all on public.user_lists from anon;
revoke all on public.logs from anon;
grant select, insert, delete on public.user_lists to authenticated;
grant select, insert, update, delete on public.logs to authenticated;

drop policy if exists "Users can read their own lists" on public.user_lists;
create policy "Users can read their own lists"
  on public.user_lists for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can add their own lists" on public.user_lists;
create policy "Users can add their own lists"
  on public.user_lists for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can remove their own lists" on public.user_lists;
create policy "Users can remove their own lists"
  on public.user_lists for delete to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can read their own logs" on public.logs;
create policy "Users can read their own logs"
  on public.logs for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can create their own logs" on public.logs;
create policy "Users can create their own logs"
  on public.logs for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own logs" on public.logs;
create policy "Users can update their own logs"
  on public.logs for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own logs" on public.logs;
create policy "Users can delete their own logs"
  on public.logs for delete to authenticated
  using ((select auth.uid()) = user_id);

-- Private bucket for log photos, organized as <user id>/<log id>.jpg and <user id>/<log id>_thumb.jpg.
-- The 5 MB per-file cap and JPEG-only rule back up the in-browser compression.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('log-photos', 'log-photos', false, 5242880, array['image/jpeg'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Storage policies: users can only view, upload, replace, and delete files in their own folder.
drop policy if exists "Users can view their own log photos" on storage.objects;
create policy "Users can view their own log photos"
  on storage.objects for select to authenticated
  using (bucket_id = 'log-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "Users can upload their own log photos" on storage.objects;
create policy "Users can upload their own log photos"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'log-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "Users can replace their own log photos" on storage.objects;
create policy "Users can replace their own log photos"
  on storage.objects for update to authenticated
  using (bucket_id = 'log-photos' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'log-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "Users can delete their own log photos" on storage.objects;
create policy "Users can delete their own log photos"
  on storage.objects for delete to authenticated
  using (bucket_id = 'log-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
