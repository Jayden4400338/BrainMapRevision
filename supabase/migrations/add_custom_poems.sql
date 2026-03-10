-- Custom poems for poetry analysis (admin-managed, shown alongside PoetryDB)
-- Run in Supabase SQL Editor or as a migration.

create table if not exists public.custom_poems (
  id uuid primary key default gen_random_uuid(),
  author text not null,
  title text not null,
  lines_text text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists custom_poems_author_title_unique
  on public.custom_poems (lower(trim(author)), lower(trim(title)));

create index if not exists custom_poems_author_idx
  on public.custom_poems (lower(trim(author)));

alter table public.custom_poems enable row level security;

-- Anyone can read (for poetry analysis page)
drop policy if exists "custom_poems_select_all" on public.custom_poems;
create policy "custom_poems_select_all"
  on public.custom_poems
  for select
  to authenticated
  using (true);

-- Only admins can insert/update/delete
drop policy if exists "custom_poems_admin_insert" on public.custom_poems;
create policy "custom_poems_admin_insert"
  on public.custom_poems
  for insert
  to authenticated
  with check (public.is_admin(auth.uid()));

drop policy if exists "custom_poems_admin_update" on public.custom_poems;
create policy "custom_poems_admin_update"
  on public.custom_poems
  for update
  to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

drop policy if exists "custom_poems_admin_delete" on public.custom_poems;
create policy "custom_poems_admin_delete"
  on public.custom_poems
  for delete
  to authenticated
  using (public.is_admin(auth.uid()));

-- Admin: add custom poem (checks duplicate, returns existing if already there)
create or replace function public.admin_add_custom_poem(
  p_author text,
  p_title text,
  p_lines_text text
)
returns table (
  id uuid,
  author text,
  title text,
  already_existed boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_author_trim text;
  v_title_trim text;
  v_existing record;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'Access denied: admin only';
  end if;

  v_author_trim := trim(coalesce(p_author, ''));
  v_title_trim := trim(coalesce(p_title, ''));
  if v_author_trim = '' or v_title_trim = '' or trim(coalesce(p_lines_text, '')) = '' then
    raise exception 'Author, title, and poem text are required';
  end if;

  select cp.id, cp.author, cp.title into v_existing
  from public.custom_poems cp
  where lower(trim(cp.author)) = lower(v_author_trim)
    and lower(trim(cp.title)) = lower(v_title_trim)
  limit 1;

  if v_existing.id is not null then
    return query select v_existing.id, v_existing.author, v_existing.title, true::boolean;
    return;
  end if;

  return query
  insert into public.custom_poems (author, title, lines_text)
  values (v_author_trim, v_title_trim, trim(p_lines_text))
  returning custom_poems.id, custom_poems.author, custom_poems.title, false::boolean;
end;
$$;

grant execute on function public.admin_add_custom_poem(text, text, text) to authenticated;

-- Public (authenticated): get distinct authors from custom poems (for dropdown)
create or replace function public.get_custom_poem_authors()
returns table (author text)
language sql
stable
security definer
set search_path = public
as $$
  select distinct trim(author)::text as author
  from public.custom_poems
  where trim(author) != ''
  order by 1;
$$;

grant execute on function public.get_custom_poem_authors() to authenticated;

-- Public (authenticated): get titles by author for custom poems
create or replace function public.get_custom_poem_titles_by_author(p_author text)
returns table (title text)
language sql
stable
security definer
set search_path = public
as $$
  select distinct trim(cp.title)::text as title
  from public.custom_poems cp
  where lower(trim(cp.author)) = lower(trim(coalesce(p_author, '')))
  order by 1;
$$;

grant execute on function public.get_custom_poem_titles_by_author(text) to authenticated;

-- Public (authenticated): get poem by author and title
create or replace function public.get_custom_poem(p_author text, p_title text)
returns table (
  id uuid,
  author text,
  title text,
  lines text[]
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return query
  select
    cp.id,
    cp.author::text,
    cp.title::text,
    string_to_array(trim(regexp_replace(cp.lines_text, e'\r\n', '\n', 'g')), e'\n')
  from public.custom_poems cp
  where lower(trim(cp.author)) = lower(trim(coalesce(p_author, '')))
    and lower(trim(cp.title)) = lower(trim(coalesce(p_title, '')))
  limit 1;
end;
$$;

grant execute on function public.get_custom_poem(text, text) to authenticated;
