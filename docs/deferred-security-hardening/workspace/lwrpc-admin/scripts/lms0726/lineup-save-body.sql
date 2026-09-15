declare receipt record; match_row record; division_row record; row_value jsonb; player_ids uuid[]; result jsonb; operation_id uuid:=gen_random_uuid(); request_fingerprint text;
begin
 if p_request is null then return jsonb_build_object('status','REQUEST_CONFLICT');end if;
 if not lms_write_private.lock_match_setup(p_actor,p_match,p_team) then return jsonb_build_object('status','NOT_AUTHORIZED');end if;
 if jsonb_typeof(p_lineups) is distinct from 'array' then return jsonb_build_object('status','INVALID_LINEUP');end if;
 if jsonb_array_length(p_lineups)=0 or jsonb_array_length(p_lineups)>100 then return jsonb_build_object('status','INVALID_LINEUP');end if;
 for row_value in select value from jsonb_array_elements(p_lineups) loop
  if jsonb_typeof(row_value) is distinct from 'object' or row_value-'line_number'-'player_1_member_id'-'player_2_member_id'<>'{}'::jsonb
   or coalesce(row_value->>'line_number','') !~ '^[1-9][0-9]?$'
   or coalesce(row_value->>'player_1_member_id','') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
   or coalesce(row_value->>'player_2_member_id','') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
   or row_value->>'player_1_member_id'=row_value->>'player_2_member_id' then return jsonb_build_object('status','INVALID_LINEUP');end if;
 end loop;
 if (select count(distinct value->>'line_number') from jsonb_array_elements(p_lineups))<>jsonb_array_length(p_lineups) then return jsonb_build_object('status','INVALID_LINEUP');end if;
 request_fingerprint:=md5(p_match::text||':'||p_team::text||':'||p_lineups::text);
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_actor::text||':'||p_request::text,726));
 select * into receipt from lms_write_private.operation_receipts where actor_user_id=p_actor and request_id=p_request;
 if found then
  if receipt.operation<>'MATCH_SETUP_SAVE' or receipt.request_hash<>request_fingerprint then return jsonb_build_object('status','REQUEST_CONFLICT');end if;
  return receipt.outcome||jsonb_build_object('replayed',true);
 end if;
 select id,division_id,status,home_team_id,away_team_id into match_row from public.matches where id=p_match;
 if match_row.status='completed' then return jsonb_build_object('status','MATCH_COMPLETED');end if;
 select d.number_of_lines,d.secondary_number_of_lines into division_row from public.teams t join public.divisions d on d.id=t.division_id
  where t.id=p_team and d.id=match_row.division_id;
 if not found then return jsonb_build_object('status','INVALID_MATCH');end if;
 if division_row.number_of_lines is null then return jsonb_build_object('status','LINEUP_REVIEW_REQUIRED');end if;
 if jsonb_array_length(p_lineups)<>division_row.number_of_lines+coalesce(division_row.secondary_number_of_lines,0)
  or exists(select 1 from jsonb_array_elements(p_lineups) where (value->>'line_number')::int>division_row.number_of_lines+coalesce(division_row.secondary_number_of_lines,0)) then return jsonb_build_object('status','INVALID_LINEUP');end if;
 select array_agg(distinct member_id) into player_ids from (
  select (value->>'player_1_member_id')::uuid member_id from jsonb_array_elements(p_lineups)
  union select (value->>'player_2_member_id')::uuid from jsonb_array_elements(p_lineups)
 ) players;
 result:=lms_write_private.evaluate_eligibility(p_actor,p_team,player_ids,'LINEUP',p_match,p_lineups);
 if result->>'status' is distinct from 'PASS' then return result;end if;
 insert into public.match_lineups(match_id,team_id,line_number,player_1_member_id,player_2_member_id,updated_at)
 select p_match,p_team,(value->>'line_number')::int,(value->>'player_1_member_id')::uuid,(value->>'player_2_member_id')::uuid,transaction_timestamp() from jsonb_array_elements(p_lineups)
 on conflict(match_id,team_id,line_number) do update set player_1_member_id=excluded.player_1_member_id,player_2_member_id=excluded.player_2_member_id,updated_at=excluded.updated_at;
 result:=jsonb_build_object('status','SAVED','operationId',operation_id,'replayed',false,'notificationStatus','PENDING');
 insert into lms_write_private.operation_receipts(id,actor_user_id,request_id,operation,resource_id,subject_id,request_hash,outcome)
 values(operation_id,p_actor,p_request,'MATCH_SETUP_SAVE',p_match,p_team,request_fingerprint,result);
 insert into lms_write_private.notification_outbox(id,operation_id,event_type,channel,recipient_key,payload,payload_hash,state)
 values(gen_random_uuid(),operation_id,'MATCH_SETUP_SAVED','email','OPPOSING_CAPTAINS',jsonb_build_object('matchId',p_match,'teamId',p_team),md5(p_match::text||':'||p_team::text),'PENDING');
 return result;
end
