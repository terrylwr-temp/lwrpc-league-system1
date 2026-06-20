create table if not exists public.app_notification_subscriptions (
  id uuid primary key default gen_random_uuid(),
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  app_scope text not null default 'pbcc' check (app_scope = 'pbcc'),
  round_robin_group_id uuid references public.round_robin_groups(id) on delete cascade,
  round_robin_player_id uuid references public.round_robin_players(id) on delete cascade,
  recipient_email text,
  recipient_phone text,
  user_agent text,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_success_at timestamptz,
  last_error_at timestamptz,
  last_error text
);

create index if not exists app_notification_subscriptions_recipient_phone_idx
  on public.app_notification_subscriptions(recipient_phone)
  where enabled = true and recipient_phone is not null;

create index if not exists app_notification_subscriptions_recipient_email_idx
  on public.app_notification_subscriptions(lower(recipient_email))
  where enabled = true and recipient_email is not null;

alter table public.app_notification_subscriptions enable row level security;
