create table if not exists public.system_settings (
  setting_key text primary key,
  setting_value text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.system_settings enable row level security;

drop policy if exists "System settings are readable by authenticated users" on public.system_settings;
create policy "System settings are readable by authenticated users"
  on public.system_settings
  for select
  to authenticated
  using (true);

drop policy if exists "League managers can insert system settings" on public.system_settings;
drop policy if exists "Commissioners can insert system settings" on public.system_settings;
create policy "Commissioners can insert system settings"
  on public.system_settings
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.user_roles
      where user_roles.user_id = auth.uid()
        and user_roles.role = 'commissioner'
    )
  );

drop policy if exists "League managers can update system settings" on public.system_settings;
drop policy if exists "Commissioners can update system settings" on public.system_settings;
create policy "Commissioners can update system settings"
  on public.system_settings
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.user_roles
      where user_roles.user_id = auth.uid()
        and user_roles.role = 'commissioner'
    )
  )
  with check (
    exists (
      select 1
      from public.user_roles
      where user_roles.user_id = auth.uid()
        and user_roles.role = 'commissioner'
    )
  );

insert into public.system_settings (setting_key, setting_value)
values
  ('club_name', 'Lakewood Ranch Pickleball Club'),
  ('club_short_name', 'LWRPC'),
  ('system_name', 'LWRPC League Management System'),
  ('browser_tab_title', 'LWR PC League Management'),
  ('logo_url', 'https://lwrpickleballclub.com/lwrpc-logo.png'),
  ('main_email', 'info@lwrpickleballclub.com'),
  ('support_email', 'info@lwrpickleballclub.com'),
  ('club_website', 'https://lwrpickleballclub.com'),
  ('membership_url', 'https://lwrpickleballclub.com/manage-membership'),
  ('league_site_url', 'https://league.lwrpickleballclub.com'),
  ('timezone', 'America/New_York')
on conflict (setting_key) do nothing;
