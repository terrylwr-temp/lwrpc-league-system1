-- Run once in the Supabase SQL Editor before deploying the password-reset hardening.
-- This table is only used by the server-side service-role client.

create table if not exists public.password_reset_rate_limits (
  rate_limit_key text primary key,
  window_started_at timestamptz not null default now(),
  request_count integer not null default 0 check (request_count >= 0),
  updated_at timestamptz not null default now()
);

alter table public.password_reset_rate_limits enable row level security;

revoke all on table public.password_reset_rate_limits from anon, authenticated;

create or replace function public.consume_password_reset_rate_limit(
  p_rate_limit_key text,
  p_window_seconds integer,
  p_max_requests integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  allowed boolean;
begin
  if p_window_seconds < 1 or p_max_requests < 1 then
    raise exception 'Rate-limit window and maximum must be positive.';
  end if;

  insert into public.password_reset_rate_limits (
    rate_limit_key,
    window_started_at,
    request_count,
    updated_at
  )
  values (p_rate_limit_key, now(), 1, now())
  on conflict (rate_limit_key) do update
  set
    window_started_at = case
      when public.password_reset_rate_limits.window_started_at <= now() - make_interval(secs => p_window_seconds)
        then now()
      else public.password_reset_rate_limits.window_started_at
    end,
    request_count = case
      when public.password_reset_rate_limits.window_started_at <= now() - make_interval(secs => p_window_seconds)
        then 1
      else public.password_reset_rate_limits.request_count + 1
    end,
    updated_at = now()
  returning request_count <= p_max_requests into allowed;

  return coalesce(allowed, false);
end;
$$;

revoke all on function public.consume_password_reset_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_password_reset_rate_limit(text, integer, integer) to service_role;
