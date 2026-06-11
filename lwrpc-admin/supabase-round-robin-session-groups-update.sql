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

alter table public.round_robin_sessions
  add column if not exists session_name text,
  add column if not exists location text,
  add column if not exists max_players integer,
  add column if not exists repeats_weekly boolean not null default false,
  add column if not exists host_player_id uuid references public.round_robin_players(id) on delete set null,
  add column if not exists cohost_player_id uuid references public.round_robin_players(id) on delete set null,
  add column if not exists invited_group_ids uuid[] not null default '{}'::uuid[],
  add column if not exists opened_at timestamptz,
  add column if not exists started_at timestamptz;

create index if not exists round_robin_player_groups_group_idx on public.round_robin_player_groups(group_id);
create index if not exists round_robin_player_group_members_group_idx on public.round_robin_player_group_members(player_group_id);
create index if not exists round_robin_player_group_members_player_idx on public.round_robin_player_group_members(player_id);
create index if not exists round_robin_sessions_host_idx on public.round_robin_sessions(host_player_id);
create index if not exists round_robin_sessions_cohost_idx on public.round_robin_sessions(cohost_player_id);

alter table public.round_robin_player_groups enable row level security;
alter table public.round_robin_player_group_members enable row level security;

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

grant select on public.round_robin_player_groups to authenticated;
grant select on public.round_robin_player_group_members to authenticated;

comment on table public.round_robin_player_groups is
  'Reusable invited-player groups for standalone round robin sessions.';

insert into public.round_robin_player_groups (group_id, name, description, is_active)
select g.id, 'Open Play', 'Default invited player group', true
from public.round_robin_groups g
where g.slug = 'rpro'
on conflict (group_id, name) do nothing;
