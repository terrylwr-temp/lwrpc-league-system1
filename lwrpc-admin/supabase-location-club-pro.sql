-- Adds a member-backed Club Pro assignment to locations.
-- Existing free-text locations.club_pros data is left untouched.

alter table public.locations
  add column if not exists club_pro_member_id uuid;

alter table public.locations
  add column if not exists club_pro_2_member_id uuid;

alter table public.locations
  drop constraint if exists locations_club_pro_member_id_fkey;

alter table public.locations
  drop constraint if exists locations_club_pro_2_member_id_fkey;

alter table public.locations
  add constraint locations_club_pro_member_id_fkey
  foreign key (club_pro_member_id)
  references public.members(id)
  on delete set null;

alter table public.locations
  add constraint locations_club_pro_2_member_id_fkey
  foreign key (club_pro_2_member_id)
  references public.members(id)
  on delete set null;

create index if not exists locations_club_pro_member_id_idx
  on public.locations(club_pro_member_id);

create index if not exists locations_club_pro_2_member_id_idx
  on public.locations(club_pro_2_member_id);
