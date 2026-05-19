-- Required scoring/scheduling columns for the league match flow.
-- Run in Supabase SQL editor if these columns do not already exist.

alter table public.divisions
  add column if not exists picklebreaker_win_points integer default 1,
  add column if not exists picklebreaker_loss_points integer default 0,
  add column if not exists default_lines_config jsonb;

alter table public.division_lines
  add column if not exists picklebreaker_win_points integer default 1,
  add column if not exists picklebreaker_loss_points integer default 0;

alter table public.match_lines
  add column if not exists home_team_games_won integer default 0,
  add column if not exists away_team_games_won integer default 0,
  add column if not exists home_team_points integer default 0,
  add column if not exists away_team_points integer default 0,
  add column if not exists winning_team_id uuid references public.teams(id);
