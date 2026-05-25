alter table public.matches
  add column if not exists score_entered_by_member_id uuid references public.members(id);

comment on column public.matches.score_entered_by_member_id is
  'Member who most recently submitted match scores for verification.';
