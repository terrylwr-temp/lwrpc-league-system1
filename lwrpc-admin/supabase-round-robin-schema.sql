create extension if not exists pgcrypto;

create table if not exists public.round_robin_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique,
  public_status text not null default 'public' check (public_status in ('public', 'private', 'archived')),
  mode text not null default 'daily_round_robin' check (mode in ('daily_round_robin', 'ladder')),
  admin_code text,
  schedule_day text,
  schedule_time time,
  timezone text not null default 'America/New_York',
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.round_robin_players (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.round_robin_groups(id) on delete cascade,
  member_id uuid references public.members(id) on delete set null,
  display_name text not null,
  first_name text,
  dupr_id text,
  email text,
  phone text,
  is_active boolean not null default true,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.round_robin_courts (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.round_robin_groups(id) on delete cascade,
  name text not null,
  description text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (group_id, name)
);

create table if not exists public.round_robin_player_groups (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.round_robin_groups(id) on delete cascade,
  name text not null,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (group_id, name)
);

create table if not exists public.round_robin_player_group_members (
  id uuid primary key default gen_random_uuid(),
  player_group_id uuid not null references public.round_robin_player_groups(id) on delete cascade,
  player_id uuid not null references public.round_robin_players(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (player_group_id, player_id)
);

create table if not exists public.round_robin_sessions (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.round_robin_groups(id) on delete cascade,
  session_name text,
  location text,
  session_date date not null default current_date,
  starts_at time,
  mode text not null default 'daily_round_robin' check (mode in ('daily_round_robin', 'ladder')),
  status text not null default 'draft' check (status in ('draft', 'open', 'playing', 'done', 'cancelled')),
  court_count integer not null default 1,
  round_count integer not null default 6,
  max_players integer,
  repeats_weekly boolean not null default false,
  host_player_id uuid references public.round_robin_players(id) on delete set null,
  cohost_player_id uuid references public.round_robin_players(id) on delete set null,
  invited_group_ids uuid[] not null default '{}'::uuid[],
  settings jsonb not null default '{}'::jsonb,
  summary_text text,
  opened_at timestamptz,
  started_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.round_robin_session_players (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.round_robin_sessions(id) on delete cascade,
  player_id uuid references public.round_robin_players(id) on delete set null,
  display_name text not null,
  dupr_id text,
  email text,
  phone text,
  source text not null default 'roster' check (source in ('roster', 'guest')),
  response_status text not null default 'joined' check (response_status in ('invited', 'joined', 'declined', 'waitlist')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (session_id, player_id)
);

create table if not exists public.round_robin_matches (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.round_robin_sessions(id) on delete cascade,
  round_number integer not null,
  court_number integer not null default 1,
  court_name text,
  team1_players jsonb not null default '[]'::jsonb,
  team2_players jsonb not null default '[]'::jsonb,
  bye_players jsonb not null default '[]'::jsonb,
  team1_score integer,
  team2_score integer,
  status text not null default 'scheduled' check (status in ('scheduled', 'complete', 'not_played')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.round_robin_player_session_results (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.round_robin_sessions(id) on delete cascade,
  player_id uuid references public.round_robin_players(id) on delete set null,
  display_name text not null,
  games integer not null default 0,
  wins integer not null default 0,
  losses integer not null default 0,
  points_for integer not null default 0,
  points_against integer not null default 0,
  point_diff integer not null default 0,
  byes integer not null default 0,
  rank integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (session_id, player_id)
);

create table if not exists public.round_robin_activity_log (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.round_robin_groups(id) on delete cascade,
  session_id uuid references public.round_robin_sessions(id) on delete set null,
  log_type text not null default 'event',
  message text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists round_robin_players_group_idx on public.round_robin_players(group_id);
create index if not exists round_robin_players_member_idx on public.round_robin_players(member_id);
create index if not exists round_robin_courts_group_idx on public.round_robin_courts(group_id);
create index if not exists round_robin_player_groups_group_idx on public.round_robin_player_groups(group_id);
create index if not exists round_robin_player_group_members_group_idx on public.round_robin_player_group_members(player_group_id);
create index if not exists round_robin_player_group_members_player_idx on public.round_robin_player_group_members(player_id);
create index if not exists round_robin_sessions_group_idx on public.round_robin_sessions(group_id, session_date desc);
create index if not exists round_robin_sessions_host_idx on public.round_robin_sessions(host_player_id);
create index if not exists round_robin_sessions_cohost_idx on public.round_robin_sessions(cohost_player_id);
create index if not exists round_robin_session_players_session_idx on public.round_robin_session_players(session_id);
create index if not exists round_robin_matches_session_idx on public.round_robin_matches(session_id, round_number, court_number);
create index if not exists round_robin_results_session_idx on public.round_robin_player_session_results(session_id, rank);
create index if not exists round_robin_activity_log_group_idx on public.round_robin_activity_log(group_id, created_at desc);

alter table public.round_robin_groups enable row level security;
alter table public.round_robin_players enable row level security;
alter table public.round_robin_courts enable row level security;
alter table public.round_robin_player_groups enable row level security;
alter table public.round_robin_player_group_members enable row level security;
alter table public.round_robin_sessions enable row level security;
alter table public.round_robin_session_players enable row level security;
alter table public.round_robin_matches enable row level security;
alter table public.round_robin_player_session_results enable row level security;
alter table public.round_robin_activity_log enable row level security;

drop policy if exists "Public round robin groups are readable" on public.round_robin_groups;
create policy "Public round robin groups are readable"
  on public.round_robin_groups for select
  using (public_status = 'public');

drop policy if exists "League managers can read round robin groups" on public.round_robin_groups;
create policy "League managers can read round robin groups"
  on public.round_robin_groups for select
  using (
    exists (
      select 1 from public.user_roles ur
      where ur.user_id = auth.uid()
        and ur.role in ('league_manager', 'commissioner')
    )
  );

drop policy if exists "League managers can read round robin players" on public.round_robin_players;
create policy "League managers can read round robin players"
  on public.round_robin_players for select
  using (
    exists (
      select 1 from public.user_roles ur
      where ur.user_id = auth.uid()
        and ur.role in ('league_manager', 'commissioner')
    )
  );

drop policy if exists "Public round robin courts are readable" on public.round_robin_courts;
create policy "Public round robin courts are readable"
  on public.round_robin_courts for select
  using (
    exists (
      select 1 from public.round_robin_groups g
      where g.id = round_robin_courts.group_id
        and g.public_status = 'public'
    )
  );

drop policy if exists "League managers can read round robin player groups" on public.round_robin_player_groups;
create policy "League managers can read round robin player groups"
  on public.round_robin_player_groups for select
  using (
    exists (
      select 1 from public.user_roles ur
      where ur.user_id = auth.uid()
        and ur.role in ('league_manager', 'commissioner')
    )
  );

drop policy if exists "League managers can read round robin player group members" on public.round_robin_player_group_members;
create policy "League managers can read round robin player group members"
  on public.round_robin_player_group_members for select
  using (
    exists (
      select 1 from public.user_roles ur
      where ur.user_id = auth.uid()
        and ur.role in ('league_manager', 'commissioner')
    )
  );

drop policy if exists "Public round robin sessions are readable" on public.round_robin_sessions;
create policy "Public round robin sessions are readable"
  on public.round_robin_sessions for select
  using (
    exists (
      select 1 from public.round_robin_groups g
      where g.id = round_robin_sessions.group_id
        and g.public_status = 'public'
    )
  );

drop policy if exists "Public round robin session players are readable without contacts" on public.round_robin_session_players;
drop policy if exists "League managers can read round robin session players" on public.round_robin_session_players;
create policy "League managers can read round robin session players"
  on public.round_robin_session_players for select
  using (
    exists (
      select 1 from public.user_roles ur
      where ur.user_id = auth.uid()
        and ur.role in ('league_manager', 'commissioner')
    )
  );

drop policy if exists "Public round robin matches are readable" on public.round_robin_matches;
create policy "Public round robin matches are readable"
  on public.round_robin_matches for select
  using (
    exists (
      select 1
      from public.round_robin_sessions s
      join public.round_robin_groups g on g.id = s.group_id
      where s.id = round_robin_matches.session_id
        and g.public_status = 'public'
    )
  );

drop policy if exists "Public round robin results are readable" on public.round_robin_player_session_results;
create policy "Public round robin results are readable"
  on public.round_robin_player_session_results for select
  using (
    exists (
      select 1
      from public.round_robin_sessions s
      join public.round_robin_groups g on g.id = s.group_id
      where s.id = round_robin_player_session_results.session_id
        and g.public_status = 'public'
    )
  );

drop policy if exists "League managers can read round robin logs" on public.round_robin_activity_log;
create policy "League managers can read round robin logs"
  on public.round_robin_activity_log for select
  using (
    exists (
      select 1 from public.user_roles ur
      where ur.user_id = auth.uid()
        and ur.role in ('league_manager', 'commissioner')
    )
  );

grant select on public.round_robin_groups to anon, authenticated;
grant select on public.round_robin_courts to anon, authenticated;
grant select on public.round_robin_player_groups to authenticated;
grant select on public.round_robin_player_group_members to authenticated;
grant select on public.round_robin_sessions to anon, authenticated;
grant select on public.round_robin_session_players to authenticated;
grant select on public.round_robin_matches to anon, authenticated;
grant select on public.round_robin_player_session_results to anon, authenticated;

comment on table public.round_robin_groups is
  'Standalone nightly round robin and ladder groups. Writes are performed by trusted server routes after manager code validation.';

comment on table public.round_robin_player_groups is
  'Reusable invited-player groups for standalone round robin sessions.';

comment on column public.round_robin_groups.admin_code is
  'Shared manager code for round robin admin routes. For higher security, migrate this to a hashed value.';

insert into public.round_robin_groups (name, slug, public_status, mode, admin_code, schedule_day, schedule_time)
values ('Round Robin Pro', 'rpro', 'public', 'daily_round_robin', 'rpro', null, null)
on conflict (slug) do nothing;

insert into public.round_robin_player_groups (group_id, name, description, is_active)
select g.id, 'Open Play', 'Default invited player group', true
from public.round_robin_groups g
where g.slug = 'rpro'
on conflict (group_id, name) do nothing;

insert into public.round_robin_courts (group_id, name, description, sort_order)
select g.id, court.name, court.description, court.sort_order
from public.round_robin_groups g
cross join (
  values
    ('Court 1', 'Permanent 1', 1),
    ('Court 2', 'Permanent 2', 2),
    ('Court 3', '', 3),
    ('Court 4', '', 4)
) as court(name, description, sort_order)
where g.slug = 'rpro'
on conflict (group_id, name) do nothing;
