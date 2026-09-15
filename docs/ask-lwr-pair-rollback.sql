-- LOCAL REVIEW ONLY. Disable pair operation; preserve audit history and additive column.
begin;
do $rollback$
declare definition text;
 addition text:='if p_query->>''intent''=''ELIGIBILITY_PAIR'' then result:=ai_live_private.eligibility_pair(p_actor,p_request,p_query); if p_actor is not null and result->>''status'' in (''denied'',''not_found'',''rate_limited'') then insert into ai_live_private.access_audit(actor,request_id,intent,decision) values(p_actor,p_request,''ELIGIBILITY_PAIR'',result->>''status'');end if;return result;end if;';
begin
 select pg_get_functiondef('public.ai_live_lookup(uuid,uuid,jsonb)'::regprocedure) into definition;
 if position(addition in definition)=0 then raise exception 'Pair rollback dispatcher drift';end if;
 execute replace(definition,addition||E'\n ','');
end $rollback$;
drop function ai_live_private.eligibility_pair(uuid,uuid,jsonb);
commit;
