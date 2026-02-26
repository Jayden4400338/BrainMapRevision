-- Poetry analysis annotations storage
-- Run in Supabase SQL editor or as a migration.

create extension if not exists pgcrypto;

create table if not exists public.poetry_annotations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  poem_key text not null,
  line_index integer not null check (line_index >= 0),
  line_text text not null,
  analysis_type text not null check (analysis_type in ('language', 'structure', 'themes', 'general')),
  analysis_text text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists poetry_annotations_user_idx on public.poetry_annotations(user_id);
create index if not exists poetry_annotations_poem_idx on public.poetry_annotations(user_id, poem_key);

alter table public.poetry_annotations enable row level security;

drop policy if exists "poetry_annotations_select_own" on public.poetry_annotations;
create policy "poetry_annotations_select_own"
on public.poetry_annotations
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "poetry_annotations_insert_own" on public.poetry_annotations;
create policy "poetry_annotations_insert_own"
on public.poetry_annotations
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "poetry_annotations_update_own" on public.poetry_annotations;
create policy "poetry_annotations_update_own"
on public.poetry_annotations
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "poetry_annotations_delete_own" on public.poetry_annotations;
create policy "poetry_annotations_delete_own"
on public.poetry_annotations
for delete
to authenticated
using (auth.uid() = user_id);

create or replace function public.touch_poetry_annotations_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists poetry_annotations_touch_updated_at on public.poetry_annotations;
create trigger poetry_annotations_touch_updated_at
before update on public.poetry_annotations
for each row
execute function public.touch_poetry_annotations_updated_at();
