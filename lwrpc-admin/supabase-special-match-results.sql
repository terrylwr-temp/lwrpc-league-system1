-- Match-level special results for LMS scoring.
-- Run in Supabase SQL editor before deploying the app changes that read/write these fields.

alter table public.matches
  add column if not exists result_type text not null default 'played',
  add column if not exists result_notes text;

update public.matches
set result_type = 'played'
where result_type is null;

alter table public.matches
  drop constraint if exists matches_result_type_check;

alter table public.matches
  add constraint matches_result_type_check
  check (result_type in ('played', 'forfeit', 'weather'));

comment on column public.matches.result_type is
  'LMS match result mode: played for normal line/game scoring, forfeit or weather for match-level special results.';

comment on column public.matches.result_notes is
  'Optional captain or manager notes for match-level special results.';

