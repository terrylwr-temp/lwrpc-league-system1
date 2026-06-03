create extension if not exists pgcrypto;

create table if not exists public.tournaments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique,
  public_status text not null default 'public' check (public_status in ('public', 'private', 'archived')),
  admin_code text,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tournament_divisions (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  name text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tournament_id, name)
);

create table if not exists public.tournament_teams (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  division_id uuid references public.tournament_divisions(id) on delete set null,
  source_team_id uuid,
  name text not null,
  line_number integer not null default 1,
  seed text,
  regular_season_standing integer,
  player_1_name text,
  player_2_name text,
  player_1_rating numeric,
  player_2_rating numeric,
  player_1_checked_in boolean not null default false,
  player_2_checked_in boolean not null default false,
  checked_in boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tournament_team_contacts (
  id uuid primary key default gen_random_uuid(),
  tournament_team_id uuid not null references public.tournament_teams(id) on delete cascade,
  player_slot integer not null check (player_slot in (1, 2)),
  member_id uuid references public.members(id) on delete set null,
  display_name text,
  phone text,
  email text,
  rating numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tournament_team_id, player_slot)
);

alter table public.tournament_teams
  add column if not exists source_team_id uuid,
  add column if not exists regular_season_standing integer,
  add column if not exists player_1_rating numeric,
  add column if not exists player_2_rating numeric;

alter table public.tournament_team_contacts
  add column if not exists rating numeric;

create table if not exists public.tournament_courts (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  name text not null,
  sort_order integer not null default 0,
  current_match_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tournament_id, name)
);

create table if not exists public.tournament_matches (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  division_id uuid references public.tournament_divisions(id) on delete set null,
  home_team_id uuid references public.tournament_teams(id) on delete set null,
  away_team_id uuid references public.tournament_teams(id) on delete set null,
  court_id uuid references public.tournament_courts(id) on delete set null,
  legacy_id text,
  line_number integer not null default 1,
  status text not null default 'pending' check (status in ('pending', 'playing', 'done', 'not_played')),
  result_type text,
  winner_team_id uuid references public.tournament_teams(id) on delete set null,
  home_score integer,
  away_score integer,
  game_scores jsonb,
  score_text text,
  queue_entered_at timestamptz,
  assigned_at timestamptz,
  completed_at timestamptz,
  created_order bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.tournament_courts
  drop constraint if exists tournament_courts_current_match_id_fkey;

alter table public.tournament_courts
  add constraint tournament_courts_current_match_id_fkey
  foreign key (current_match_id) references public.tournament_matches(id) on delete set null;

create table if not exists public.tournament_activity_log (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  log_type text not null default 'event',
  message text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists tournament_divisions_tournament_idx on public.tournament_divisions(tournament_id);
create index if not exists tournament_teams_tournament_idx on public.tournament_teams(tournament_id);
create index if not exists tournament_teams_division_idx on public.tournament_teams(division_id);
create index if not exists tournament_teams_source_team_idx on public.tournament_teams(source_team_id);
create index if not exists tournament_team_contacts_team_idx on public.tournament_team_contacts(tournament_team_id);
create index if not exists tournament_courts_tournament_idx on public.tournament_courts(tournament_id);
create index if not exists tournament_matches_tournament_idx on public.tournament_matches(tournament_id);
create index if not exists tournament_matches_status_idx on public.tournament_matches(tournament_id, status);
create index if not exists tournament_activity_log_tournament_idx on public.tournament_activity_log(tournament_id, created_at desc);

alter table public.tournaments enable row level security;
alter table public.tournament_divisions enable row level security;
alter table public.tournament_teams enable row level security;
alter table public.tournament_team_contacts enable row level security;
alter table public.tournament_courts enable row level security;
alter table public.tournament_matches enable row level security;
alter table public.tournament_activity_log enable row level security;

drop policy if exists "Public tournaments are readable" on public.tournaments;
create policy "Public tournaments are readable"
  on public.tournaments for select
  using (public_status = 'public');

drop policy if exists "Public tournament divisions are readable" on public.tournament_divisions;
create policy "Public tournament divisions are readable"
  on public.tournament_divisions for select
  using (
    exists (
      select 1 from public.tournaments t
      where t.id = tournament_divisions.tournament_id
        and t.public_status = 'public'
    )
  );

drop policy if exists "Public tournament teams are readable" on public.tournament_teams;
create policy "Public tournament teams are readable"
  on public.tournament_teams for select
  using (
    exists (
      select 1 from public.tournaments t
      where t.id = tournament_teams.tournament_id
        and t.public_status = 'public'
    )
  );

drop policy if exists "League managers can read tournament team contacts" on public.tournament_team_contacts;
create policy "League managers can read tournament team contacts"
  on public.tournament_team_contacts for select
  using (
    exists (
      select 1
      from public.user_roles ur
      where ur.user_id = auth.uid()
        and ur.role in ('league_manager', 'commissioner')
    )
  );

drop policy if exists "Public tournament courts are readable" on public.tournament_courts;
create policy "Public tournament courts are readable"
  on public.tournament_courts for select
  using (
    exists (
      select 1 from public.tournaments t
      where t.id = tournament_courts.tournament_id
        and t.public_status = 'public'
    )
  );

drop policy if exists "Public tournament matches are readable" on public.tournament_matches;
create policy "Public tournament matches are readable"
  on public.tournament_matches for select
  using (
    exists (
      select 1 from public.tournaments t
      where t.id = tournament_matches.tournament_id
        and t.public_status = 'public'
    )
  );

drop policy if exists "League managers can read tournament logs" on public.tournament_activity_log;
create policy "League managers can read tournament logs"
  on public.tournament_activity_log for select
  using (
    exists (
      select 1
      from public.user_roles ur
      where ur.user_id = auth.uid()
        and ur.role in ('league_manager', 'commissioner')
    )
  );

comment on table public.tournaments is
  'Tournament events. Public pages read public tournaments; admin writes should use trusted server routes with an event code or app login.';

comment on column public.tournaments.admin_code is
  'Shared event code for tournament admin routes. For higher security, migrate this to a hashed value.';
