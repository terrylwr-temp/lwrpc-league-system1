-- Source fragment for the reviewed corrective migration; never run separately.
create or replace function view_as_private.lock_authorization(
 p_proof jsonb, p_kind text, p_subject uuid default null, p_team uuid default null, p_season uuid default null
) returns boolean language plpgsql security definer set search_path='' as $$
declare c record; a uuid; r text; t uuid; intent text;
begin
 if p_proof is null or octet_length(p_proof::text)>4096
 or p_kind not in('identity','subject','season','team','membership') then return false;end if;
 -- Both handoff and established requests must possess the browser-bound proof.
 -- No arbitrary context ID or caller-supplied actor/target is sufficient.
 select x.id,x.actor,x.target,x.started_at,x.expires_at into c from view_as_private.contexts x
 where x.browser=p_proof->>'browser'
 and ((x.started_at is null and x.code=p_proof->>'code' and x.exchange_by>clock_timestamp())
   or (x.started_at is not null and x.context=p_proof->>'context'))
 and (not(p_proof?'id') or x.id=(p_proof->>'id')::uuid)
 and (not(p_proof?'actor') or x.actor=(p_proof->>'actor')::uuid)
 and (not(p_proof?'target') or x.target=(p_proof->>'target')::uuid)
 and x.ended_at is null and x.expires_at>clock_timestamp()
 for update;
 if not found then return false;end if;
 a:=view_as_private.actor_member(c.actor);r:=view_as_private.member_role(c.target);
 if a is null or coalesce(view_as_private.member_role(a) not in('commissioner','league_manager'),true) or r is null then return false;end if;
 -- Lock only the context's actor/target authorization records. No facts returned.
 perform 1 from public.members m where m.id in(a,c.target) order by m.id for share;
 perform 1 from public.user_roles u where u.member_id in(a,c.target) order by u.member_id,u.role for share;
 if a is distinct from view_as_private.actor_member(c.actor)
 or coalesce(view_as_private.member_role(a) not in('commissioner','league_manager'),true)
 or r is distinct from view_as_private.member_role(c.target)
 or c.expires_at<=clock_timestamp() then return false;end if;
 if p_kind='identity' then return true;end if;
 if c.started_at is null then return false;end if;
 intent:=p_proof->>'intent';
 if intent is null or intent not in('SELF_RATING','PLAYER_RATING','PLAYER_CONTACT','SELF_TEAM','TEAM_ROSTER','NEXT_MATCH') then return false;end if;
 t:=coalesce(p_subject,c.target);
 if p_kind='subject' then
  if t<>c.target then
   if r='player' or intent='SELF_RATING' then return false;end if;
   if r not in('commissioner','league_manager') then
    -- The exact subject must belong to a team granted to the EFFECTIVE user.
    -- Lock the granting membership and its active hierarchy, then recheck.
    perform 1 from public.team_members tm join public.teams z on z.id=tm.team_id
     join public.divisions d on d.id=z.division_id join public.leagues l on l.id=d.league_id join public.seasons s on s.id=l.season_id
     where tm.member_id=t and tm.is_active and z.is_active and d.is_active and l.is_active and s.is_active
     and c.target in(z.captain_member_id,z.co_captain_member_id,z.co_captain_2_member_id,z.club_pro_member_id)
     order by z.id for share of tm,z,d,l,s;
    if not found then return false;end if;
   end if;
  end if;
  perform 1 from public.members where id=t and is_active_member for share;
  return found and c.expires_at>clock_timestamp();
 elsif p_kind='season' then
  if p_season is null or intent not in('SELF_RATING','PLAYER_RATING') then return false;end if;
  if t<>c.target and (r='player' or intent='SELF_RATING') then return false;end if;
  if intent<>'SELF_RATING' and r not in('commissioner','league_manager') then
   perform 1 from public.team_members tm join public.teams z on z.id=tm.team_id
    join public.divisions d on d.id=z.division_id join public.leagues l on l.id=d.league_id
    where tm.member_id=t and tm.is_active and z.is_active and d.is_active and l.is_active and l.season_id=p_season
    and c.target in(z.captain_member_id,z.co_captain_member_id,z.co_captain_2_member_id,z.club_pro_member_id)
    order by z.id for share of tm,z,d,l;
   if not found then return false;end if;
  end if;
  perform 1 from public.seasons where id=p_season and is_active for share;
  return found and c.expires_at>clock_timestamp();
 elsif p_kind in('team','membership') then
  if p_team is null or intent not in('SELF_TEAM','TEAM_ROSTER','NEXT_MATCH') then return false;end if;
  if t<>c.target and r='player' then return false;end if;
  perform 1 from public.teams z join public.divisions d on d.id=z.division_id
   join public.leagues l on l.id=d.league_id join public.seasons s on s.id=l.season_id
   where z.id=p_team and z.is_active and d.is_active and l.is_active and s.is_active
   and (r in('commissioner','league_manager') or (r in('captain','club_pro') and c.target in(z.captain_member_id,z.co_captain_member_id,z.co_captain_2_member_id,z.club_pro_member_id))
     or exists(select 1 from public.team_members tm where tm.team_id=z.id and tm.member_id=c.target and tm.is_active))
   for share of z,d,l,s;
  if not found then return false;end if;
  if p_kind='membership' then
   perform 1 from public.team_members where team_id=p_team and member_id=t and is_active for share;
   return found and c.expires_at>clock_timestamp();
  end if;
  -- A player roster membership used as the grant cannot disappear mid-read.
  if r='player' then
   perform 1 from public.team_members where team_id=p_team and member_id=c.target and is_active for share;
   if not found then return false;end if;
  end if;
  return c.expires_at>clock_timestamp();
 end if;
 return false;
end $$;
revoke all on function view_as_private.lock_authorization(jsonb,text,uuid,uuid,uuid) from public,anon,authenticated,service_role;
grant execute on function view_as_private.lock_authorization(jsonb,text,uuid,uuid,uuid) to lms_view_as_executor;
