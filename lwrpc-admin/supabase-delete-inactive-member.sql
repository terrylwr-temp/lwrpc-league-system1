-- Permanently deletes an inactive member and every directly member-linked row.
-- Run this in the Supabase SQL Editor before deploying the matching app changes.
-- The API route is the only caller: its service-role client verifies league-manager access.

create or replace function public.delete_inactive_member(p_member_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  target_member public.members%rowtype;
  member_foreign_key record;
  affected_match_line_ids uuid[];
begin
  select *
  into target_member
  from public.members
  where id = p_member_id
  for update;

  if not found then
    raise exception 'Member not found.' using errcode = 'P0002';
  end if;

  if target_member.is_active_member is distinct from false then
    raise exception 'Only inactive members can be permanently deleted.' using errcode = 'P0001';
  end if;

  -- A match line belongs to every listed player. Remove its child game rows first
  -- so that a member's recorded match and game history is erased atomically.
  select coalesce(array_agg(id), '{}'::uuid[])
  into affected_match_line_ids
  from public.match_lines
  where p_member_id in (
    home_player_1_id,
    home_player_2_id,
    away_player_1_id,
    away_player_2_id
  );

  if cardinality(affected_match_line_ids) > 0 then
    delete from public.line_games
    where match_line_id = any(affected_match_line_ids);
  end if;

  -- Delete every table row that directly identifies this member. This discovers
  -- current and future member foreign keys, preventing a new dependent record
  -- from being silently retained when a member is erased.
  for member_foreign_key in
    select
      namespace.nspname as schema_name,
      relation.relname as table_name,
      attribute.attname as column_name
    from pg_constraint constraint_row
    join pg_class relation on relation.oid = constraint_row.conrelid
    join pg_namespace namespace on namespace.oid = relation.relnamespace
    join unnest(constraint_row.conkey) with ordinality as key_column(attribute_number, position)
      on true
    join pg_attribute attribute
      on attribute.attrelid = relation.oid
      and attribute.attnum = key_column.attribute_number
    where constraint_row.contype = 'f'
      and constraint_row.confrelid = 'public.members'::regclass
      and namespace.nspname = 'public'
  loop
    -- These rows describe ongoing teams, locations, or matches. Keep the shared
    -- record while removing the deleted member's role or scoring attribution.
    if member_foreign_key.table_name in ('teams', 'locations', 'matches', 'league_communications') then
      execute format(
        'update %I.%I set %I = null where %I = $1',
        member_foreign_key.schema_name,
        member_foreign_key.table_name,
        member_foreign_key.column_name,
        member_foreign_key.column_name
      ) using p_member_id;
    else
      execute format(
        'delete from %I.%I where %I = $1',
        member_foreign_key.schema_name,
        member_foreign_key.table_name,
        member_foreign_key.column_name
      ) using p_member_id;
    end if;
  end loop;

  delete from public.members where id = p_member_id;
end;
$function$;

revoke all on function public.delete_inactive_member(uuid) from public, anon, authenticated;
grant execute on function public.delete_inactive_member(uuid) to service_role;
