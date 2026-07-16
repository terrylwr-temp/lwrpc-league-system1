-- Production performance indexes applied 2026-07-16.
-- Covers the first conservative batch of scoring and PBCC foreign-key lookups.

create index if not exists line_games_match_line_id_idx
  on public.line_games (match_line_id);

create index if not exists match_lines_match_id_idx
  on public.match_lines (match_id);

create index if not exists round_robin_session_players_player_id_idx
  on public.round_robin_session_players (player_id);

create index if not exists round_robin_player_session_results_player_id_idx
  on public.round_robin_player_session_results (player_id);

create index if not exists round_robin_activity_log_session_id_idx
  on public.round_robin_activity_log (session_id);
