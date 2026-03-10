-- Admin question stats for questions page
-- Run in Supabase SQL Editor.

create or replace function public.admin_get_question_stats()
returns table (
  questions_in_bank bigint,
  total_answered bigint
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'Access denied: admin only';
  end if;

  return query
  select
    (select count(*) from public.quiz_questions),
    (select coalesce(sum(q.total_questions), 0)::bigint from public.quizzes q);
end;
$$;

grant execute on function public.admin_get_question_stats() to authenticated;
