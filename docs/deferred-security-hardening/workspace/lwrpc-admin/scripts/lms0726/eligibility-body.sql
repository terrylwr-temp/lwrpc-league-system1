declare
 t record; m record; binding record; rating record; candidate uuid; source_version text;
 unknown_codes text[]:=array[]::text[]; failed_codes text[]:=array[]::text[];
 seen text[]; value_state text; classification text; season_value numeric; threshold numeric;
 params jsonb; expected_hash text; pair record; total numeric; values_by_member jsonb:='{}';
begin
 if p_stage is null or p_stage not in('ADMISSION','LINEUP') or p_members is null or cardinality(p_members)=0 or cardinality(p_members)>100
 or (p_stage='ADMISSION' and cardinality(p_members)<>1) then return jsonb_build_object('status','REVIEW_REQUIRED');end if;
 select tm.id,tm.is_active team_active,tm.home_location_id,d.is_active division_active,d.id division_id,d.min_dupr,d.max_dupr,d.team_dupr_max,d.rating_type,
 d.number_of_lines,d.secondary_number_of_lines,d.primary_team_type,d.secondary_team_type,
 l.id league_id,l.is_active league_active,l.season_id,l.only_home_community_players,s.is_active season_active
 into t from public.teams tm join public.divisions d on d.id=tm.division_id
 join public.leagues l on l.id=d.league_id join public.seasons s on s.id=l.season_id where tm.id=p_team;
 if not found then return jsonb_build_object('status','INVALID_TEAM');end if;
 if not exists(select 1 from public.user_roles u join public.members a on a.id=u.member_id
  join public.teams tm on tm.id=p_team where u.user_id=p_actor and a.is_active_member=true and
  (u.role in('league_manager','commissioner') or u.role='captain' and u.member_id in(tm.captain_member_id,tm.co_captain_member_id,tm.co_captain_2_member_id)
   or u.role='club_pro' and u.member_id=tm.club_pro_member_id)) then return jsonb_build_object('status','NOT_AUTHORIZED');end if;
 expected_hash:=pg_catalog.md5(jsonb_build_object('min',t.min_dupr,'max',t.max_dupr,'pair',t.team_dupr_max,'type',t.rating_type,'homeOnly',t.only_home_community_players)::text);
 select v.version_label into source_version from public.ai_documents d join public.ai_document_versions v on v.id=d.active_version_id
 where d.status='active' and exists(select 1 from lms_write_private.policy_bindings b where b.season_id=t.season_id and b.league_id=t.league_id and b.division_id=t.division_id and b.rules_version=v.version_label);
 if source_version is null then return jsonb_build_object('status',case when p_stage='LINEUP' then 'LINEUP_REVIEW_REQUIRED' else 'REVIEW_REQUIRED' end,'reasonCodes',jsonb_build_array('POLICY_SOURCE_UNAVAILABLE'));end if;
 foreach candidate in array p_members loop
  select id,is_active_member,dupr_id,waiver_status,location_id into m from public.members where id=candidate;
  if not found then return jsonb_build_object('status','INVALID_CANDIDATE');end if;
  select season_dupr_rating,season_primetime_rating,dupr_doubles_rating,dupr_reliability_rating into rating
   from public.member_season_ratings where member_id=candidate and season_id=t.season_id;
  classification:='UNKNOWN';season_value:=null;seen:=array[]::text[];
  select parameters into params from lms_write_private.policy_bindings
   where season_id=t.season_id and league_id=t.league_id and division_id=t.division_id
   and condition_code='nr_classification' and stage='ADMISSION' and status='VERIFIED'
   and rules_version=source_version and config_hash=expected_hash;
  if params->>'operator'='LT' and jsonb_typeof(params->'threshold')='number' then
   threshold:=(params->>'threshold')::numeric;
   if threshold>0 then
    if upper(btrim(rating.dupr_doubles_rating))='NR' or rating.dupr_reliability_rating<threshold then classification:='NR';
    elsif rating.dupr_reliability_rating is not null and rating.dupr_doubles_rating ~ '^[0-9]+([.][0-9]+)?$'
     and rating.dupr_doubles_rating::numeric>0 then classification:='RATED';end if;
   end if;
  end if;
  for binding in select * from lms_write_private.policy_bindings where season_id=t.season_id and league_id=t.league_id
   and division_id=t.division_id and stage='ADMISSION' order by condition_code loop
   seen:=array_append(seen,binding.condition_code);value_state:='UNKNOWN';
   if binding.status='CONFLICT' or binding.rules_version<>source_version or binding.config_hash<>expected_hash then
    return jsonb_build_object('status','POLICY_CONFIGURATION_CONFLICT','reasonCodes',jsonb_build_array('POLICY_CONFIGURATION_CONFLICT'));
   end if;
   if binding.parameters->>'applicable'='false' then continue;end if;
   if binding.status='VERIFIED' and binding.source_kind<>'UNAVAILABLE' and binding.comparison in('EXISTS','VERIFIED_BOOLEAN','INTEGER_TENTH_RANGE','NR_CLASSIFICATION','COMMUNITY_CONJUNCTION','ROSTER_LOCK','CURRENT_ROSTER','PAIR_SUM','QUALIFYING_HISTORY') and jsonb_typeof(binding.parameters->'applicable')='boolean' and binding.parameters-'applicable'-'operator'-'threshold'-'nrPlacement'-'seasonProvenance'-'normalization'-'acceptedValues'-'adjustmentProvenance'='{}'::jsonb then
    case binding.condition_code
     -- A flag or nonempty ID does not establish the additional required verified facts.
     when 'active_membership' then value_state:=case when m.is_active_member=false then 'FAIL' else 'UNKNOWN' end;
     when 'dupr_account' then value_state:='UNKNOWN';
     when 'waiver' then
      if jsonb_typeof(binding.parameters->'acceptedValues')='array' and (binding.parameters->'acceptedValues') ? m.waiver_status then value_state:='PASS';end if;
     when 'nr_classification' then value_state:=case when classification<>'UNKNOWN' then 'PASS' else 'UNKNOWN' end;
     when 'individual_bounds' then
      if classification='NR' and binding.parameters->>'nrPlacement'='ANY_DIVISION' then value_state:='PASS';
      elsif classification='RATED' and binding.parameters->>'seasonProvenance'='VERIFIED' then
       season_value:=case when t.rating_type='primetime' then rating.season_primetime_rating when t.rating_type='dupr' then rating.season_dupr_rating end;
       if season_value>0 and season_value*10=trunc(season_value*10) and t.min_dupr is not null and t.max_dupr is not null then
        value_state:=case when season_value*10 between ceil(t.min_dupr*10) and floor(t.max_dupr*10) then 'PASS' else 'FAIL' end;
       end if;
      end if;
     when 'duplicate' then value_state:=case when p_stage='LINEUP' then 'PASS' when exists(select 1 from public.team_members where team_id=p_team and member_id=candidate) then 'FAIL' else 'PASS' end;
     when 'roster_lock' then value_state:='PASS'; -- Admission parent enforces this under locks; not a lineup restriction.
     when 'home_only_setting' then value_state:=case when t.only_home_community_players=false then 'PASS' else 'UNKNOWN' end;
     when 'team_season_identity' then value_state:=case when t.season_active=false or t.league_active=false or t.division_active=false or t.team_active=false then 'FAIL' when t.season_active=true and t.league_active=true and t.division_active=true and t.team_active=true then 'PASS' else 'UNKNOWN' end;
     when 'age' then if t.rating_type<>'primetime' then value_state:='PASS';end if;
     else value_state:='UNKNOWN';
    end case;
   end if;
   if value_state='FAIL' then failed_codes:=array_append(failed_codes,binding.condition_code);
   elsif value_state='UNKNOWN' then unknown_codes:=array_append(unknown_codes,binding.condition_code);end if;
  end loop;
  if not seen @> array['active_membership','dupr_account','waiver','dupr_club_membership','nr_classification','individual_bounds','season_community','cross_community_availability','home_only_setting','team_season_identity','age','gender_division_eligibility','ban_suspension'] then
   unknown_codes:=array_append(unknown_codes,'POLICY_BINDING_UNAVAILABLE');
  end if;
  if p_stage='LINEUP' then
   if not exists(select 1 from public.team_members where team_id=p_team and member_id=candidate) then failed_codes:=array_append(failed_codes,'CURRENT_ROSTER');end if;
   if classification='NR' then
    -- Adjustment provenance is required; a numeric value alone is not authority.
    select parameters into params from lms_write_private.policy_bindings where season_id=t.season_id and division_id=t.division_id
      and condition_code='pair_aggregate' and stage='LINEUP' and status='VERIFIED' and rules_version=source_version and config_hash=expected_hash;
    if params->>'adjustmentProvenance'='VERIFIED' then
     season_value:=case when t.rating_type='primetime' then rating.season_primetime_rating else rating.season_dupr_rating end;
    end if;
   end if;
   if season_value is null or season_value<=0 or season_value*10<>trunc(season_value*10) then unknown_codes:=array_append(unknown_codes,'LINEUP_RATING');
   else values_by_member:=values_by_member||jsonb_build_object(candidate::text,season_value*10);end if;
  end if;
 end loop;
 if p_stage='LINEUP' then
  if not exists(select 1 from public.matches where id=p_match and p_team in(home_team_id,away_team_id)) then return jsonb_build_object('status','INVALID_MATCH');end if;
  if jsonb_typeof(p_lines)<>'array' or jsonb_array_length(p_lines)=0 then return jsonb_build_object('status','LINEUP_NOT_ELIGIBLE');end if;
  for pair in select value from jsonb_array_elements(p_lines) loop
   if t.team_dupr_max is null then unknown_codes:=array_append(unknown_codes,'PAIR_LIMIT');
   else
    total:=(values_by_member->>(pair.value->>'player_1_member_id'))::numeric+(values_by_member->>(pair.value->>'player_2_member_id'))::numeric;
    if total>floor(t.team_dupr_max*10) then failed_codes:=array_append(failed_codes,'PAIR_LIMIT');end if;
   end if;
  end loop;
 end if;
 if cardinality(failed_codes)>0 then return jsonb_build_object('status',case when p_stage='LINEUP' then 'LINEUP_NOT_ELIGIBLE' else 'NOT_ELIGIBLE' end,'reasonCodes',to_jsonb(failed_codes));end if;
 if cardinality(unknown_codes)>0 then return jsonb_build_object('status',case when p_stage='LINEUP' then 'LINEUP_REVIEW_REQUIRED' else 'REVIEW_REQUIRED' end,'reasonCodes',to_jsonb(unknown_codes));end if;
 return jsonb_build_object('status','PASS');
end



