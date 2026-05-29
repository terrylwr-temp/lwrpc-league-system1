-- Score sheet template management.
-- Run this in Supabase SQL editor before using Admin > Score Sheets.

create table if not exists public.score_sheet_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  sheet_title text,
  template_html text not null,
  rules_text text,
  is_default boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.divisions
  add column if not exists score_sheet_template_id uuid references public.score_sheet_templates(id) on delete set null;

create unique index if not exists score_sheet_templates_single_default
  on public.score_sheet_templates (is_default)
  where is_default = true;

create index if not exists divisions_score_sheet_template_id_idx
  on public.divisions (score_sheet_template_id);

alter table public.score_sheet_templates enable row level security;

drop policy if exists "Score sheet templates are readable by authenticated users" on public.score_sheet_templates;
create policy "Score sheet templates are readable by authenticated users"
  on public.score_sheet_templates
  for select
  to authenticated
  using (true);

drop policy if exists "League managers can insert score sheet templates" on public.score_sheet_templates;
create policy "League managers can insert score sheet templates"
  on public.score_sheet_templates
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.members m
      join public.user_roles ur on ur.member_id = m.id
      where lower(m.email) = lower(auth.jwt() ->> 'email')
        and ur.role in ('league_manager', 'commissioner')
    )
  );

drop policy if exists "League managers can update score sheet templates" on public.score_sheet_templates;
create policy "League managers can update score sheet templates"
  on public.score_sheet_templates
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.members m
      join public.user_roles ur on ur.member_id = m.id
      where lower(m.email) = lower(auth.jwt() ->> 'email')
        and ur.role in ('league_manager', 'commissioner')
    )
  )
  with check (
    exists (
      select 1
      from public.members m
      join public.user_roles ur on ur.member_id = m.id
      where lower(m.email) = lower(auth.jwt() ->> 'email')
        and ur.role in ('league_manager', 'commissioner')
    )
  );

drop policy if exists "League managers can delete score sheet templates" on public.score_sheet_templates;
create policy "League managers can delete score sheet templates"
  on public.score_sheet_templates
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.members m
      join public.user_roles ur on ur.member_id = m.id
      where lower(m.email) = lower(auth.jwt() ->> 'email')
        and ur.role in ('league_manager', 'commissioner')
    )
  );
