declare receipt record; t record; evaluated jsonb; membership uuid; operation_id uuid:=gen_random_uuid();result jsonb;
begin
 if p_request is null then return jsonb_build_object('status','REQUEST_CONFLICT');end if;
 if not lms_write_private.lock_roster_add(p_actor,p_team,p_candidate) then return jsonb_build_object('status','NOT_AUTHORIZED');end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_actor::text||':'||p_request::text,726));
 select * into receipt from lms_write_private.operation_receipts where actor_user_id=p_actor and request_id=p_request;
 if found then
  if receipt.operation<>'ROSTER_ADD' or receipt.resource_id<>p_team or receipt.subject_id<>p_candidate then return jsonb_build_object('status','REQUEST_CONFLICT');end if;
  return receipt.outcome||jsonb_build_object('replayed',true);
 end if;
 select l.rosters_locked,l.season_id into t from public.teams tm join public.divisions d on d.id=tm.division_id join public.leagues l on l.id=d.league_id where tm.id=p_team;
 if not found then return jsonb_build_object('status','INVALID_TEAM');end if;
 if t.rosters_locked is distinct from false and not exists(select 1 from public.user_roles u where u.user_id=p_actor and u.role in('league_manager','commissioner')) then return jsonb_build_object('status','ROSTER_LOCKED');end if;
 select id into membership from public.team_members where team_id=p_team and member_id=p_candidate;
 if found then return jsonb_build_object('status','ALREADY_ON_ROSTER','membershipId',membership,'notificationStatus','NOT_APPLICABLE');end if;
 evaluated:=lms_write_private.evaluate_eligibility(p_actor,p_team,array[p_candidate],'ADMISSION',null,null);
 if evaluated->>'status' is distinct from 'PASS' then return evaluated;end if;
 insert into public.team_members(team_id,member_id) values(p_team,p_candidate) returning id into membership;
 result:=jsonb_build_object('status','ADDED','membershipId',membership,'operationId',operation_id,'replayed',false,'notificationStatus','NOT_APPLICABLE');
 if exists(select 1 from public.member_season_ratings where member_id=p_candidate and season_id=t.season_id and upper(btrim(dupr_doubles_rating))='NR') then result:=result||jsonb_build_object('notificationStatus','PENDING');end if;
 insert into lms_write_private.operation_receipts(id,actor_user_id,request_id,operation,resource_id,subject_id,request_hash,outcome)
 values(operation_id,p_actor,p_request,'ROSTER_ADD',p_team,p_candidate,pg_catalog.md5(p_team::text||':'||p_candidate::text),result);
 if result->>'notificationStatus'='PENDING' then
  insert into lms_write_private.notification_outbox(id,operation_id,event_type,channel,recipient_key,payload,payload_hash,state)
  values(gen_random_uuid(),operation_id,'ROSTER_RATING_CHECK','email','LEAGUE_INFO',jsonb_build_object('teamId',p_team,'memberId',p_candidate),pg_catalog.md5(p_team::text||':'||p_candidate::text),'PENDING');
 end if;
 return result;
end

