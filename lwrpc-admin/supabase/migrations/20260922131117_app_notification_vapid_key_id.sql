alter table if exists public.app_notification_subscriptions
  add column if not exists vapid_key_id text;
