grant select(id,is_active_member) on public.members to lms_roster_writer;
grant select(user_id,member_id,role) on public.user_roles to lms_roster_writer;
grant select(id,division_id,captain_member_id,co_captain_member_id,co_captain_2_member_id,club_pro_member_id) on public.teams to lms_roster_writer;
grant select(id,league_id) on public.divisions to lms_roster_writer;
grant select(id,rosters_locked) on public.leagues to lms_roster_writer;
grant select(id,team_id,member_id),delete on public.team_members to lms_roster_writer;
grant select(id,status,home_team_id,away_team_id) on public.matches to lms_roster_writer;
grant select(match_id,team_id,player_1_member_id,player_2_member_id) on public.match_lineups to lms_roster_writer;
grant select(match_id,home_player_1_id,home_player_2_id,away_player_1_id,away_player_2_id) on public.match_lines to lms_roster_writer;
grant select,insert on lms_write_private.operation_receipts to lms_roster_writer;
do $policies$ declare t text; begin
 foreach t in array array['members','user_roles','teams','divisions','leagues','team_members','matches','match_lineups','match_lines'] loop
  if not exists(select 1 from pg_catalog.pg_policies where schemaname='public' and tablename=t and policyname='lms0726_roster_internal_read') then
   execute format('create policy lms0726_roster_internal_read on public.%I for select to lms_roster_writer using(true)',t);
  end if;
 end loop;
 if not exists(select 1 from pg_catalog.pg_policies where schemaname='public' and tablename='team_members' and policyname='lms0726_roster_internal_remove') then
  create policy lms0726_roster_internal_remove on public.team_members for delete to lms_roster_writer using(true);
 end if;
 if not exists(select 1 from pg_catalog.pg_policies where schemaname='lms_write_private' and tablename='operation_receipts' and policyname='lms0726_roster_receipt_read') then
  create policy lms0726_roster_receipt_read on lms_write_private.operation_receipts for select to lms_roster_writer using(true);
  create policy lms0726_roster_receipt_write on lms_write_private.operation_receipts for insert to lms_roster_writer with check(true);
 end if;
end $policies$;

grant select(season_id) on public.leagues to lms_roster_writer;
grant insert(team_id,member_id) on public.team_members to lms_roster_writer;
grant select(member_id,season_id,dupr_doubles_rating) on public.member_season_ratings to lms_roster_writer;
grant insert on lms_write_private.notification_outbox to lms_roster_writer;
grant select(id,is_active_member,dupr_id,waiver_status,location_id) on public.members to lms_eligibility_reader;
grant select(user_id,member_id,role) on public.user_roles to lms_eligibility_reader;
grant select(id,division_id,home_location_id,captain_member_id,co_captain_member_id,co_captain_2_member_id,club_pro_member_id) on public.teams to lms_eligibility_reader;
grant select(id,league_id,min_dupr,max_dupr,team_dupr_max,rating_type,number_of_lines,secondary_number_of_lines,primary_team_type,secondary_team_type) on public.divisions to lms_eligibility_reader;
grant select(id,season_id,only_home_community_players) on public.leagues to lms_eligibility_reader;
grant select(id,is_active) on public.seasons to lms_eligibility_reader;
grant select(team_id,member_id) on public.team_members to lms_eligibility_reader;
grant select(member_id,season_id,season_dupr_rating,season_primetime_rating,dupr_doubles_rating,dupr_reliability_rating) on public.member_season_ratings to lms_eligibility_reader;
grant select(id,home_team_id,away_team_id) on public.matches to lms_eligibility_reader;
grant select(id,status,active_version_id) on public.ai_documents to lms_eligibility_reader;
grant select(id,version_label) on public.ai_document_versions to lms_eligibility_reader;
grant select on lms_write_private.policy_bindings to lms_eligibility_reader;
do $eligibility_policies$ declare t text; begin
 foreach t in array array['members','user_roles','teams','divisions','leagues','seasons','team_members','member_season_ratings','matches','ai_documents','ai_document_versions'] loop
  if not exists(select 1 from pg_catalog.pg_policies where schemaname='public' and tablename=t and policyname='lms0726_eligibility_internal_read') then
   execute format('create policy lms0726_eligibility_internal_read on public.%I for select to lms_eligibility_reader using(true)',t);
  end if;
 end loop;
 if not exists(select 1 from pg_catalog.pg_policies where schemaname='public' and tablename='team_members' and policyname='lms0726_roster_internal_add') then
  create policy lms0726_roster_internal_add on public.team_members for insert to lms_roster_writer with check(true);
 end if;
 if not exists(select 1 from pg_catalog.pg_policies where schemaname='public' and tablename='member_season_ratings' and policyname='lms0726_roster_internal_read') then
  create policy lms0726_roster_internal_read on public.member_season_ratings for select to lms_roster_writer using(true);
 end if;
 if not exists(select 1 from pg_catalog.pg_policies where schemaname='lms_write_private' and tablename='policy_bindings' and policyname='lms0726_eligibility_internal_read') then
  create policy lms0726_eligibility_internal_read on lms_write_private.policy_bindings for select to lms_eligibility_reader using(true);
 end if;
 if not exists(select 1 from pg_catalog.pg_policies where schemaname='lms_write_private' and tablename='notification_outbox' and policyname='lms0726_roster_outbox_write') then
  create policy lms0726_roster_outbox_write on lms_write_private.notification_outbox for insert to lms_roster_writer with check(true);
 end if;
end $eligibility_policies$;

grant select(id,division_id,status,home_team_id,away_team_id) on public.matches to lms_lineup_writer;
grant select(id,division_id) on public.teams to lms_lineup_writer;
grant select(id,number_of_lines,secondary_number_of_lines) on public.divisions to lms_lineup_writer;
grant select(match_id,team_id,line_number,player_1_member_id,player_2_member_id,updated_at),insert(match_id,team_id,line_number,player_1_member_id,player_2_member_id,updated_at),update(player_1_member_id,player_2_member_id,updated_at),delete on public.match_lineups to lms_lineup_writer;
grant select(match_id),delete on public.match_lines to lms_lineup_writer;
grant select,insert on lms_write_private.operation_receipts to lms_lineup_writer;
grant insert on lms_write_private.notification_outbox to lms_lineup_writer;
do $lineup_policies$ declare t text;begin
 foreach t in array array['matches','teams','divisions','match_lineups','match_lines'] loop
  if not exists(select 1 from pg_catalog.pg_policies where schemaname='public' and tablename=t and policyname='lms0726_lineup_read') then
   execute format('create policy lms0726_lineup_read on public.%I for select to lms_lineup_writer using(true)',t);
  end if;
 end loop;
 if not exists(select 1 from pg_catalog.pg_policies where schemaname='public' and tablename='match_lineups' and policyname='lms0726_lineup_insert') then
  create policy lms0726_lineup_insert on public.match_lineups for insert to lms_lineup_writer with check(true);
 end if;
 if not exists(select 1 from pg_catalog.pg_policies where schemaname='public' and tablename='match_lineups' and policyname='lms0726_lineup_update') then
  create policy lms0726_lineup_update on public.match_lineups for update to lms_lineup_writer using(true) with check(true);
 end if;
 foreach t in array array['match_lineups','match_lines'] loop
  if not exists(select 1 from pg_catalog.pg_policies where schemaname='public' and tablename=t and policyname='lms0726_lineup_reset') then
   execute format('create policy lms0726_lineup_reset on public.%I for delete to lms_lineup_writer using(true)',t);
  end if;
 end loop;
 if not exists(select 1 from pg_catalog.pg_policies where schemaname='lms_write_private' and tablename='operation_receipts' and policyname='lms0726_lineup_receipt_read') then
  create policy lms0726_lineup_receipt_read on lms_write_private.operation_receipts for select to lms_lineup_writer using(true);
 end if;
 foreach t in array array['operation_receipts','notification_outbox'] loop
  if not exists(select 1 from pg_catalog.pg_policies where schemaname='lms_write_private' and tablename=t and policyname='lms0726_lineup_event_insert') then
   execute format('create policy lms0726_lineup_event_insert on lms_write_private.%I for insert to lms_lineup_writer with check(true)',t);
  end if;
 end loop;
end $lineup_policies$;

grant usage on schema lms_write_private to lms_normal_executor;
grant select,insert on lms_write_private.operation_receipts to service_role,lms_normal_executor;
grant insert on lms_write_private.notification_outbox to service_role,lms_normal_executor;
grant select,update(state,first_attempt_at,claimed_at,attempts,provider_message_id,error_code) on lms_write_private.notification_outbox to lms_notification_worker;
do $normal_events$ declare t text;begin
 if not exists(select 1 from pg_catalog.pg_policies where schemaname='lms_write_private' and tablename='operation_receipts' and policyname='lms0726_normal_receipt_read') then
  create policy lms0726_normal_receipt_read on lms_write_private.operation_receipts for select to lms_normal_executor using(true);
 end if;
 foreach t in array array['operation_receipts','notification_outbox'] loop
  if not exists(select 1 from pg_catalog.pg_policies where schemaname='lms_write_private' and tablename=t and policyname='lms0726_normal_event_insert') then
   execute format('create policy lms0726_normal_event_insert on lms_write_private.%I for insert to lms_normal_executor with check(true)',t);
  end if;
 end loop;
 if not exists(select 1 from pg_catalog.pg_policies where schemaname='lms_write_private' and tablename='notification_outbox' and policyname='lms0726_worker_read') then
  create policy lms0726_worker_read on lms_write_private.notification_outbox for select to lms_notification_worker using(true);
 end if;
 if not exists(select 1 from pg_catalog.pg_policies where schemaname='lms_write_private' and tablename='notification_outbox' and policyname='lms0726_worker_update') then
  create policy lms0726_worker_update on lms_write_private.notification_outbox for update to lms_notification_worker using(true) with check(true);
 end if;
end $normal_events$;
grant select(is_active) on public.teams,public.divisions,public.leagues to lms_eligibility_reader;

