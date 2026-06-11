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
create index if not exists round_robin_sessions_group_idx on public.round_robin_sessions(group_id, session_date desc);
create index if not exists round_robin_session_players_session_idx on public.round_robin_session_players(session_id);
create index if not exists round_robin_matches_session_idx on public.round_robin_matches(session_id, round_number, court_number);
create index if not exists round_robin_results_session_idx on public.round_robin_player_session_results(session_id, rank);
create index if not exists round_robin_activity_log_group_idx on public.round_robin_activity_log(group_id, created_at desc);

alter table public.round_robin_groups enable row level security;
alter table public.round_robin_players enable row level security;
alter table public.round_robin_courts enable row level security;
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
grant select on public.round_robin_sessions to anon, authenticated;
grant select on public.round_robin_session_players to authenticated;
grant select on public.round_robin_matches to anon, authenticated;
grant select on public.round_robin_player_session_results to anon, authenticated;

comment on table public.round_robin_groups is
  'Standalone nightly round robin and ladder groups. Writes are performed by trusted server routes after manager code validation.';

comment on column public.round_robin_groups.admin_code is
  'Shared manager code for round robin admin routes. For higher security, migrate this to a hashed value.';

insert into public.round_robin_groups (name, slug, public_status, mode, admin_code, schedule_day, schedule_time)
values ('Round Robin Pro', 'rpro', 'public', 'daily_round_robin', 'rpro', null, null)
on conflict (slug) do nothing;

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
