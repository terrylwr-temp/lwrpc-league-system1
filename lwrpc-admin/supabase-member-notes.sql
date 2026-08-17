-- Adds private administrative notes for a member.
-- Run this in the Supabase SQL editor before deploying the matching app changes.

alter table public.members
  add column if not exists notes text;

comment on column public.members.notes is
  'Private administrative notes. Visible only while editing a member.';
