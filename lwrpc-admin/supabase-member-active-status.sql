-- Adds the active/inactive flag used by Member Administration and MembershipWorks import.
-- Run this in the Supabase SQL editor before deploying the matching app changes.

alter table public.members
add column if not exists is_active_member boolean default true;

update public.members
set is_active_member = true
where is_active_member is null;

alter table public.members
alter column is_active_member set default true;

alter table public.members
alter column is_active_member set not null;

comment on column public.members.is_active_member is
'Controls whether a member appears in normal league administration, roster, rating, and import workflows.';
