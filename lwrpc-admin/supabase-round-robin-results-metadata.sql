alter table public.round_robin_player_session_results
  add column if not exists metadata jsonb not null default '{}'::jsonb;
