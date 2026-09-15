create or replace function ai_live_private.resolve_identity(p_actor uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare m uuid; n integer; r text; linked uuid;
begin
 if p_actor is null then return null;end if;
 select count(distinct member_id),min(member_id::text)::uuid into n,linked from public.user_roles where user_id=p_actor;
 if n>1 then return null;end if;
 m:=linked;
 if m is null then
  select count(*),min(b.id::text)::uuid into n,m from auth.users a join public.members b on lower(btrim(b.email))=lower(btrim(a.email)) where a.id=p_actor;
  if n<>1 then return null;end if;
 end if;
 perform identity_repair_private.take_keys(identity_repair_private.keys_for(p_actor,m));
 if not exists(select 1 from auth.users where id=p_actor and deleted_at is null and is_anonymous is not true and (banned_until is null or banned_until<=statement_timestamp())) then return null;end if;
 if not exists(select 1 from public.members where id=m and is_active_member is true) then return null;end if;
 if exists(select 1 from public.user_roles where (user_id=p_actor and member_id is distinct from m) or (member_id=m and user_id is not null and user_id<>p_actor)) then return null;end if;
 if linked is null then
  if exists(select 1 from public.user_roles where member_id=m) or not identity_repair_private.eligible(p_actor,m) then return null;end if;
  r:='player';
 else
  select role into r from public.user_roles where member_id=m and role in('player','captain','club_pro','league_manager','commissioner')
  order by case role when 'commissioner' then 5 when 'league_manager' then 4 when 'club_pro' then 3 when 'captain' then 2 else 1 end desc limit 1;
 end if;
 if r is null then return null;end if;
 return jsonb_build_object('memberId',m,'role',r);
end $$;
revoke all on function ai_live_private.resolve_identity(uuid) from public,anon,authenticated,service_role;
grant execute on function ai_live_private.resolve_identity(uuid) to service_role;
