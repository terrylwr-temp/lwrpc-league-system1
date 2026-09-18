-- Rule 5.15.1: immutable starting-schedule baselines and auditable final awards.
create table public.division_compensation_baselines (
  id uuid primary key default gen_random_uuid(),
  division_id uuid not null unique references public.divisions(id) on delete cascade,
  league_id uuid not null references public.leagues(id) on delete cascade,
  captured_at timestamptz not null default now(),
  captured_by_member_id uuid references public.members(id) on delete set null,
  max_scheduled_match_dates integer not null check (max_scheduled_match_dates >= 0),
  schedule_match_count integer not null check (schedule_match_count >= 0),
  schedule_fingerprint text not null,
  created_at timestamptz not null default now()
);

create table public.division_compensation_baseline_teams (
  baseline_id uuid not null references public.division_compensation_baselines(id) on delete cascade,
  division_id uuid not null,
  team_id uuid not null,
  team_name text not null,
  scheduled_match_dates integer not null check (scheduled_match_dates >= 0),
  primary key (baseline_id, team_id)
);

create index division_compensation_baseline_teams_division_idx
  on public.division_compensation_baseline_teams (division_id, team_id);

create table public.division_compensation_baseline_matches (
  baseline_id uuid not null references public.division_compensation_baselines(id) on delete cascade,
  division_id uuid not null,
  match_id uuid not null,
  home_team_id uuid not null,
  away_team_id uuid not null,
  scheduled_date date,
  week_number integer,
  primary key (baseline_id, match_id)
);

create index division_compensation_baseline_matches_division_idx
  on public.division_compensation_baseline_matches (division_id, match_id);

create table public.division_compensatory_point_awards (
  division_id uuid not null,
  team_id uuid not null,
  baseline_id uuid not null references public.division_compensation_baselines(id) on delete cascade,
  scheduled_match_dates_at_start integer not null check (scheduled_match_dates_at_start >= 0),
  maximum_scheduled_match_dates integer not null check (maximum_scheduled_match_dates >= 0),
  missing_match_dates integer not null check (missing_match_dates >= 0),
  qualifying_match_dates integer not null check (qualifying_match_dates >= 0),
  verified_match_count integer not null check (verified_match_count >= 0),
  earned_standings_points numeric not null,
  average_points_per_match numeric not null,
  raw_compensatory_points numeric not null,
  compensatory_points integer not null check (compensatory_points >= 0),
  calculation_version text not null default 'rule-5.15.1-v1',
  applied_at timestamptz not null default now(),
  applied_by_member_id uuid references public.members(id) on delete set null,
  primary key (division_id, team_id)
);

create index division_compensatory_point_awards_baseline_idx
  on public.division_compensatory_point_awards (baseline_id);

alter table public.team_standings
  add column if not exists earned_standings_points numeric,
  add column if not exists compensatory_points integer not null default 0;

alter table public.division_compensation_baselines enable row level security;
alter table public.division_compensation_baseline_teams enable row level security;
alter table public.division_compensation_baseline_matches enable row level security;
alter table public.division_compensatory_point_awards enable row level security;

revoke all on table public.division_compensation_baselines from anon, authenticated;
revoke all on table public.division_compensation_baseline_teams from anon, authenticated;
revoke all on table public.division_compensation_baseline_matches from anon, authenticated;
revoke all on table public.division_compensatory_point_awards from anon, authenticated;

grant all on table public.division_compensation_baselines to service_role;
grant all on table public.division_compensation_baseline_teams to service_role;
grant all on table public.division_compensation_baseline_matches to service_role;
grant all on table public.division_compensatory_point_awards to service_role;
grant select on table public.division_compensatory_point_awards to authenticated;

create policy "Authenticated users can read compensatory point awards"
  on public.division_compensatory_point_awards
  for select
  to authenticated
  using (true);
