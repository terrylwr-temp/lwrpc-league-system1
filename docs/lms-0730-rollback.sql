-- Reviewed local rollback candidate only. No business rows touched.
begin;
grant lms_view_as_reader to postgres with admin false, inherit false, set true;
grant create on schema view_as_private to lms_view_as_reader;
set local role lms_view_as_reader;
create or replace function view_as_private.page_read(p_proof jsonb,p_contract text,p_args jsonb) returns jsonb language plpgsql security definer set search_path='' as $fn$
declare v jsonb; result jsonb;
begin
 v:=lms_read_private.lock_viewer(p_proof,p_contract,p_args);
 result:=lms_read_private.competition(v,p_contract,p_args)||lms_read_private.people(v,p_contract,p_args);
 perform lms_read_private.lock_viewer(p_proof,p_contract,p_args);
 return jsonb_build_object('viewer',v,'tables',result);
end $fn$;
drop function lms_read_private.schedule_captains(jsonb,jsonb);
reset role;
revoke create on schema view_as_private from lms_view_as_reader;
revoke lms_view_as_reader from postgres granted by postgres;
commit;
