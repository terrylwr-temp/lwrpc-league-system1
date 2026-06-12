-- Required scoring/scheduling columns for the league match flow.
-- Run in Supabase SQL editor if these columns do not already exist.

alter table public.divisions
  add column if not exists picklebreaker_win_points integer default 1,
  add column if not exists picklebreaker_loss_points integer default 0,
  add column if not exists team_dupr_max numeric,
  add column if not exists playoff_team_count integer,
  add column if not exists default_lines_config jsonb;

alter table public.matches
  add column if not exists score_exported_at timestamptz;

alter table public.member_season_ratings
  add column if not exists dupr_doubles_rating text;

alter table public.member_season_ratings
  drop constraint if exists member_season_ratings_dupr_doubles_rating_check;

alter table public.member_season_ratings
  add constraint member_season_ratings_dupr_doubles_rating_check
  check (
    dupr_doubles_rating is null
    or upper(trim(dupr_doubles_rating)) = 'NR'
    or trim(dupr_doubles_rating) ~ '^[0-9](\.[0-9]{1,3})?$'
  );

alter table public.division_lines
  add column if not exists team_win_points integer default 1,
  add column if not exists standings_points_mode text not null default 'line_result',
  add column if not exists score_type text not null default 'sideout',
  add column if not exists score_required boolean not null default true,
  add column if not exists picklebreaker_win_points integer default 1,
  add column if not exists picklebreaker_loss_points integer default 0,
  add column if not exists picklebreaker_not_played_points integer default 1,
  add column if not exists picklebreaker_not_played_award_rule text not null default 'regular_line_leader',
  add column if not exists picklebreaker_play_rule text not null default 'regular_lines_tied',
  add column if not exists uses_saved_match_lineups boolean not null default true;

alter table public.division_lines
  alter column score_type set default 'sideout';

update public.division_lines
set score_type = 'sideout'
where score_type is null;

alter table public.division_lines
  alter column score_type set not null;

alter table public.division_lines
  drop constraint if exists division_lines_score_type_check;

alter table public.division_lines
  add constraint division_lines_score_type_check
  check (score_type in ('sideout', 'rally'));

alter table public.division_lines
  alter column score_required set default true;

update public.division_lines
set score_required = true
where score_required is null;

alter table public.division_lines
  alter column score_required set not null;

alter table public.division_lines
  drop constraint if exists division_lines_standings_points_mode_check;

alter table public.division_lines
  add constraint division_lines_standings_points_mode_check
  check (standings_points_mode in ('line_result', 'per_game'));

alter table public.division_lines
  drop constraint if exists division_lines_picklebreaker_not_played_award_rule_check;

alter table public.division_lines
  add constraint division_lines_picklebreaker_not_played_award_rule_check
  check (picklebreaker_not_played_award_rule in ('regular_line_leader'));

alter table public.division_lines
  drop constraint if exists division_lines_picklebreaker_play_rule_check;

alter table public.division_lines
  add constraint division_lines_picklebreaker_play_rule_check
  check (picklebreaker_play_rule in ('regular_lines_tied'));

alter table public.match_lines
  add column if not exists home_team_games_won integer default 0,
  add column if not exists away_team_games_won integer default 0,
  add column if not exists home_team_points integer default 0,
  add column if not exists away_team_points integer default 0,
  add column if not exists winning_team_id uuid references public.teams(id);

alter table public.leagues
  add column if not exists rosters_locked boolean not null default false;

alter table public.leagues
  add column if not exists flex_league boolean not null default false;

alter table public.leagues
  alter column flex_league set default false;

update public.leagues
set flex_league = false
where flex_league is null;

alter table public.leagues
  alter column flex_league set not null;

alter table public.leagues
  add column if not exists match_setup_reminder_days_before integer not null default 2;

alter table public.leagues
  add column if not exists is_active boolean not null default true;

alter table public.seasons
  add column if not exists is_active boolean not null default true;

alter table public.divisions
  add column if not exists is_active boolean not null default true;

alter table public.teams
  add column if not exists is_active boolean not null default true;

alter table public.members
  add column if not exists notification_preference text not null default 'email';

alter table public.league_schedule_settings
  add column if not exists actual_schedule_weeks integer;

alter table public.members
  drop constraint if exists members_notification_preference_check;

alter table public.members
  add constraint members_notification_preference_check
  check (notification_preference in ('email', 'text'));

create table if not exists public.notification_templates (
  id uuid primary key default gen_random_uuid(),
  template_key text not null unique,
  subject text not null,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notification_template_history (
  id uuid primary key default gen_random_uuid(),
  template_key text not null,
  audience text not null,
  subject text not null,
  body text not null,
  saved_by_member_id uuid references public.members(id),
  saved_by_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists notification_template_history_template_key_created_at_idx
  on public.notification_template_history (template_key, created_at desc);

create table if not exists public.match_lineups (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  line_number integer not null,
  player_1_member_id uuid references public.members(id),
  player_2_member_id uuid references public.members(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (match_id, team_id, line_number)
);
