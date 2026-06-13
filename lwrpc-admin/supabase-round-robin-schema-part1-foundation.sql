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

create table if not exists public.round_robin_sessions (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.round_robin_groups(id) on delete cascade,
  session_date date not null default current_date,
  starts_at time,
  mode text not null default 'daily_round_robin' check (mode in ('daily_round_robin', 'ladder')),
  status text not null default 'draft' check (status in ('draft', 'open', 'playing', 'done', 'cancelled')),
  court_count integer not null default 1,
  round_count integer not null default 6,
  settings jsonb not null default '{}'::jsonb,
  summary_text text,
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
