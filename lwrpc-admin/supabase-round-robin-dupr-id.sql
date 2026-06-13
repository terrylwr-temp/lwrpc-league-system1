alter table public.round_robin_players
  add column if not exists dupr_id text;

alter table public.round_robin_session_players
  add column if not exists dupr_id text;
