grant lms_view_as_reader to postgres with admin false, inherit false, set true;
grant create on schema lms_read_private to lms_view_as_reader;
set local role lms_view_as_reader;
create or replace function lms_read_private.team_record(p_member uuid,p_role text,p_query jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb; off integer:=coalesce((p_query->>'choiceOffset')::integer,0);
begin
 if p_member is null or p_role is null or p_role not in('player','captain','club_pro','league_manager','commissioner')
 or not exists(select 1 from public.members where id=p_member and is_active_member is true)
 or p_query->>'intent' is distinct from 'TEAM_RECORD' or off<0 or off>5000 or octet_length(p_query::text)>4096
 or exists(select 1 from jsonb_object_keys(p_query) k where k not in('intent','origin','subjectKind','self','projection','team','teamName','season','seasonName','scopeName','choiceOffset'))
 or coalesce(p_query->>'self','') not in('true','false') or (p_query->>'self'='false' and nullif(btrim(p_query->>'teamName'),'') is null)
 or coalesce(p_query->>'projection','record') not in('record','wins','losses','played','points')
 or (p_query?'team' and p_query->>'team' !~* '^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$') or (p_query?'season' and p_query->>'season' !~* '^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$')
 then return jsonb_build_object('status','denied');end if;
 -- One statement snapshot binds relationship, hierarchy, choices and result.
 with candidates as materialized (
  select t.id,t.name team,d.id division_id,d.name division,l.id league_id,l.name league,s.id season_id,s.name season
  from public.teams t join public.divisions d on d.id=t.division_id join public.leagues l on l.id=d.league_id join public.seasons s on s.id=l.season_id
  where ((not(p_query?'seasonName') and t.is_active is true and d.is_active is true and l.is_active is true and s.is_active is true)
    or (p_query?'seasonName' and (lower(s.name)=lower(p_query->>'seasonName') or p_query->>'seasonName'='__clarify_history__' and s.is_active is false)))
  and (not(p_query?'scopeName') or lower(d.name)=lower(p_query->>'scopeName') or lower(l.name)=lower(p_query->>'scopeName'))
  and (not(p_query?'season') or s.id=(p_query->>'season')::uuid)
  and (not(p_query?'teamName') or lower(btrim(t.name))=lower(btrim(p_query->>'teamName')))
  and ((p_query->>'self'='true' and (exists(select 1 from public.team_members tm where tm.team_id=t.id and tm.member_id=p_member and tm.is_active is true)
    or p_member in(t.captain_member_id,t.co_captain_member_id,t.co_captain_2_member_id,t.club_pro_member_id)))
    or (p_query->>'self'='false' and nullif(btrim(p_query->>'teamName'),'') is not null))
 ), selected as (select * from candidates where not(p_query?'team') or id=(p_query->>'team')::uuid),
 choices as (select id team,team||' — '||division||', '||league||', '||season label from candidates order by candidates.team,division,league,season,id offset off limit 6),
 snapshot as (select c.*,st.match_wins,st.match_losses,st.match_ties,st.matches_played,st.standings_points,st.team_id standing_team from selected c
 left join public.team_standings st on st.team_id=c.id and st.division_id=c.division_id and st.league_id=c.league_id)
 select case when (select count(*) from candidates)=0 then jsonb_build_object('status','no_team')
 when p_query?'team' and (select count(*) from selected)=0 then jsonb_build_object('status','denied')
 when (select count(*) from selected)>1 then jsonb_build_object('status','ambiguous','choiceKind','team and season','choices',(select coalesce(jsonb_agg(to_jsonb(c)),'[]') from (select * from choices limit 5)c),'moreChoices',(select count(*) from choices)>5)
 when (select count(*) from snapshot)<>1 then jsonb_build_object('status','missing')
 else (select jsonb_build_object('status',case when standing_team is null or match_wins is null or match_losses is null or match_ties is null or matches_played is null or standings_points is null or least(match_wins,match_losses,match_ties,matches_played,standings_points)<0 or match_wins+match_losses+match_ties<>matches_played then 'missing' else 'success' end,
 'teamRef',id,'seasonRef',season_id,'team',team,'division',division,'league',league,'season',season,'wins',match_wins,'losses',match_losses,'ties',match_ties,'played',matches_played,'points',standings_points) from snapshot)
 end into result;
 return result||jsonb_build_object('intent','TEAM_RECORD','relationship',case when p_query->>'self'='true' then 'self' else 'team' end);
end $$;
revoke all on function lms_read_private.team_record(uuid,text,jsonb) from public,anon,authenticated,service_role,lms_view_as_executor;
grant execute on function lms_read_private.team_record(uuid,text,jsonb) to service_role,lms_view_as_executor;
reset role;
revoke create on schema lms_read_private from lms_view_as_reader;
revoke lms_view_as_reader from postgres granted by postgres;
grant usage on schema lms_read_private to service_role,lms_view_as_executor;
