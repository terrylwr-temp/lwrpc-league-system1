-- League Communications send history.
create table if not exists public.league_communication_history (
  id uuid primary key default gen_random_uuid(),
  audience text not null,
  scope text not null,
  subject text not null,
  body text not null,
  recipient_count integer not null default 0,
  sent_count integer not null default 0,
  status text not null default 'sent',
  sent_by_member_id uuid references public.members(id) on delete set null,
  sent_by_email text,
  created_at timestamptz not null default now()
);
alter table public.league_communication_history
  add column if not exists attachment_names text[] not null default '{}';
create index if not exists league_communication_history_created_at_idx on public.league_communication_history (created_at desc);
