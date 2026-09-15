declare receipt record; result jsonb; operation_id uuid:=gen_random_uuid();
begin
 if p_request is null then return jsonb_build_object('status','REQUEST_CONFLICT');end if;
 if not lms_write_private.lock_match_setup(p_actor,p_match,null) then return jsonb_build_object('status','NOT_AUTHORIZED');end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_actor::text||':'||p_request::text,726));
 select * into receipt from lms_write_private.operation_receipts where actor_user_id=p_actor and request_id=p_request;
 if found then
  if receipt.operation<>'MATCH_SETUP_RESET' or receipt.resource_id<>p_match then return jsonb_build_object('status','REQUEST_CONFLICT');end if;
  return receipt.outcome||jsonb_build_object('replayed',true);
 end if;
 if exists(select 1 from public.matches where id=p_match and status='completed') then return jsonb_build_object('status','MATCH_COMPLETED');end if;
 delete from public.match_lineups where match_id=p_match;
 delete from public.match_lines where match_id=p_match;
 result:=jsonb_build_object('status','RESET','operationId',operation_id,'replayed',false,'notificationStatus','NOT_APPLICABLE');
 insert into lms_write_private.operation_receipts(id,actor_user_id,request_id,operation,resource_id,request_hash,outcome)
 values(operation_id,p_actor,p_request,'MATCH_SETUP_RESET',p_match,md5(p_match::text),result);
 return result;
end
