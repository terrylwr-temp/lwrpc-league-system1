CREATE OR REPLACE FUNCTION ratings_workflow_private.valid_source(s jsonb)
 RETURNS boolean
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO ''
AS $function$
begin
 if s is null or jsonb_typeof(s)<>'object' then return false;end if;
 if s?'doubles' and (jsonb_typeof(s->'doubles')<>'string' or not(s->>'doubles'='NR' or (s->>'doubles' ~ '^[2-8][.][0-9]{3}$' and (s->>'doubles')::numeric between 2 and 8))) then return false;end if;
 if s?'rf' and (jsonb_typeof(s->'rf')<>'number' or s->>'rf' !~ '^[0-9]+$' or (s->>'rf')::numeric not between 0 and 100) then return false;end if;
 if s?'age' and (jsonb_typeof(s->'age')<>'number' or s->>'age' !~ '^[0-9]+([.][0-9]{1,3})?$' or (s->>'age')::numeric not between 2 and 8 or coalesce(s->>'ageSource','') not in ('over_65','over_50')) then return false;end if;
 return s ?| array['doubles','rf','age'];
 exception when invalid_text_representation or numeric_value_out_of_range then return false;
end $function$;
CREATE OR REPLACE FUNCTION ratings_workflow_private.context(p_actor uuid, p_season uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare season jsonb; rows jsonb;
begin
 perform ratings_source_private.authorize(p_actor);
 select jsonb_build_object('id',id,'name',name) into season from public.seasons where id=p_season and is_active is true;
 if season is null then raise exception 'Active season required';end if;
 if (select count(*) from public.members)>5000 then raise exception 'Population exceeds reviewed bound';end if;
 -- Expand each source batch ONCE, rather than scanning its JSON once per member.
 with ids as materialized(select upper(trim(dupr_id)) key,count(*) n from public.members group by 1),
 evidence as materialized(select b.id,b.created_at,u->>'memberId' member,u->>'duprId' dupr,u->'data' data
 from ratings_source_private.batches b cross join lateral jsonb_array_elements(b.payload->'updates') u
 where b.season_id=p_season and (b.result->>'updated') ~ '^[1-9][0-9]*$'),
 matched as (select s.member_id,count(e.id) n from ratings_source_private.sources s
 join public.members m on m.id=s.member_id left join evidence e on e.id=s.import_id and e.member=s.member_id::text and e.dupr=upper(trim(m.dupr_id)) and e.data=s.data
 where s.season_id=p_season group by s.member_id),
 placements as (select tm.member_id,jsonb_agg(jsonb_build_object('team',t.id,'division',d.id,'league',l.id,'max',d.max_dupr,'ratingType',d.rating_type) order by t.id) divisions
 from public.team_members tm join public.teams t on t.id=tm.team_id join public.divisions d on d.id=t.division_id join public.leagues l on l.id=d.league_id
 where l.season_id=p_season and t.is_active is distinct from false and d.is_active is distinct from false and l.is_active is distinct from false group by tm.member_id)
 select coalesce(jsonb_agg(jsonb_build_object('memberId',m.id,'name',trim(coalesce(m.first_name,'')||' '||coalesce(m.last_name,'')),
 'duprId',upper(trim(m.dupr_id)),'active',m.is_active_member,'unique',coalesce(i.n,0)=1,'identityValid',coalesce(v.n,0)=1,
 'source',s.data,'sourceImport',s.import_id,'sourceRevision',s.revision,'sourceTime',b.created_at,
 'working',jsonb_build_object('doubles',r.dupr_doubles_rating,'rf',r.dupr_reliability_rating,'age',r.dupr_age_based_rating),
 'current',r.season_dupr_rating,'notes',r.notes,'primetime',r.season_primetime_rating,'inputBasis',coalesce(w.basis,'{}'),
 'clearedAt',w.cleared_at,'divisions',coalesce(p.divisions,'[]')) order by m.id),'[]') into rows
 from public.members m left join ids i on i.key=upper(trim(m.dupr_id))
 left join public.member_season_ratings r on r.member_id=m.id and r.season_id=p_season
 left join ratings_source_private.sources s on s.member_id=m.id and s.season_id=p_season
 left join ratings_source_private.batches b on b.id=s.import_id
 left join matched v on v.member_id=m.id left join placements p on p.member_id=m.id
 left join ratings_workflow_private.input_state w on w.member_id=m.id and w.season_id=p_season;
 return jsonb_build_object('season',season,'rules',ratings_workflow_private.policy(),'members',rows);
end $function$;
CREATE OR REPLACE FUNCTION ratings_workflow_private.plan(p_actor uuid, p_season uuid, p_operation text, p_upload jsonb DEFAULT '[]'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
 SET statement_timeout TO '8s'
AS $function$
declare ctx jsonb; candidates jsonb; row jsonb; s jsonb; w jsonb; fills jsonb; result jsonb[]:=array[]::jsonb[]; action text; reason text;
 classification text; proposed_notes text; proposed numeric; highest numeric; field text; changed int:=0; doubles int:=0; rf int:=0; age int:=0;
 protected int:=0; missing int:=0; nr int:=0; review int:=0; inactive int:=0; creates int:=0; updates int:=0; unchanged int:=0;
begin
 if p_operation not in ('upload','transfer','clear','clean') then raise exception 'Unsupported ratings operation';end if;
 if jsonb_typeof(p_upload)<>'array' or jsonb_array_length(p_upload)>1000 then raise exception 'Invalid upload';end if;
 ctx:=ratings_workflow_private.context(p_actor,p_season);
 if p_operation='upload' then
  select coalesce(jsonb_agg(coalesce(m,'{}')||jsonb_build_object('incoming',u,'uploadMatches',(select count(*) from jsonb_array_elements(p_upload) z where z->>'duprId'=u->>'duprId')) order by u->>'line'),'[]') into candidates
  from jsonb_array_elements(p_upload) u left join jsonb_array_elements(ctx->'members') m on m->>'duprId'=u->>'duprId';
 else candidates:=ctx->'members';end if;
 for row in select value from jsonb_array_elements(candidates) loop
  fills:='{}';proposed:=null;proposed_notes:=row->>'notes';classification:='UNKNOWN';action:='DEFER';reason:='Missing working inputs';w:=row->'working';
  s:=case when p_operation='upload' then row->'incoming'->'data' else row->'source' end;
  if row->>'memberId' is null then reason:='DUPR ID not found';
  elsif p_operation<>'clear' and row->>'active' is distinct from 'true' then action:='SKIP';reason:='Inactive or unverified activity';inactive:=inactive+1;
  elsif p_operation in ('upload','transfer') then
   if p_operation='transfer' and (s is null or s='null'::jsonb) then reason:='No imported source';
   elsif row->>'unique' is distinct from 'true' or (p_operation='upload' and (coalesce(row->'incoming'->>'duprId','')='' or (row->>'uploadMatches')::int<>1)) then action:='REVIEW';reason:='Ambiguous DUPR identity';
   elsif p_operation='transfer' and row->>'identityValid' is distinct from 'true' then action:='REVIEW';reason:='Source identity/batch no longer matches';
   elsif p_operation='transfer' and row->>'clearedAt' is not null and (row->>'sourceTime')::timestamptz<=(row->>'clearedAt')::timestamptz then reason:='Inputs intentionally cleared; upload a newer snapshot';
   elsif not ratings_workflow_private.valid_source(s) or row->'incoming'->>'error' is not null then action:='REVIEW';reason:='Invalid source or noninteger RF';
   else
    foreach field in array array['doubles','rf','age'] loop
     if w->>field is not null then protected:=protected+1;
     elsif s->>field is null or s->>(field||'Missing')='true' then missing:=missing+1;
     else fills:=fills||jsonb_build_object(field,s->field);end if;
    end loop;
    if fills<>'{}' then action:='FILL';reason:='Fill blank working inputs only';
    elsif p_operation='upload' then action:='RECORD';reason:='Existing inputs preserved; record source evidence only';
    else action:='NO CHANGE';reason:='No eligible blank working fields to fill';end if;
   end if;
  elsif p_operation='clear' then
   if w->>'doubles' is not null or w->>'rf' is not null or w->>'age' is not null or row->'inputBasis'<>'{}' then action:='CLEAR';reason:='Clear working inputs; final Season DUPR and PrimeTime preserved';fills:=w;
   else action:='NO CHANGE';reason:='Working inputs already blank';end if;
  else
   if w->>'doubles' is null or w->>'rf' is null then reason:='Missing required working Doubles/RF';missing:=missing+1;
   elsif w->>'rf' !~ '^[0-9]+([.]0+)?$' or (w->>'rf')::numeric not between 0 and 100
    or not(w->>'doubles'='NR' or w->>'doubles' ~ '^[2-8]([.][0-9]{1,3})?$' and (w->>'doubles')::numeric between 2 and 8) then action:='REVIEW';reason:='Invalid working input';
   elsif w->>'doubles'='NR' and (w->>'rf')::numeric>(ctx->'rules'->>'threshold')::numeric then action:='REVIEW';reason:='Conflicting NR marker and RF';
   else
    classification:=case when w->>'doubles'='NR' or (w->>'rf')::numeric<=(ctx->'rules'->>'threshold')::numeric then 'NR' else 'RATED' end;
    if classification='NR' then
     select max((d->>'max')::numeric) into highest from jsonb_array_elements(row->'divisions') d where d->>'ratingType'='dupr' and d->>'max' is not null;
     if highest is null then
      if row->>'current' is not null then action:='NO CHANGE';proposed:=(row->>'current')::numeric;reason:='RETAIN ESTABLISHED NR RATING';
      else nr:=nr+1;reason:='WAITING FOR DIVISION';end if;
     else proposed:=trunc(highest-(ctx->'rules'->>'adjustment')::numeric,1);reason:='Current highest applicable regular division maximum minus Rules adjustment';end if;
    else proposed:=trunc((w->>'doubles')::numeric,1);reason:='Truncate Working Doubles under current Rules';end if;
    if proposed is not null and reason<>'RETAIN ESTABLISHED NR RATING' then
     select string_agg(line,E'\n' order by ordinal) into proposed_notes from regexp_split_to_table(coalesce(row->>'notes',''),E'\n') with ordinality t(line,ordinal)
     where trim(line) !~ '^Season DUPR rating is adjusted based on the Reliability rating (of|threshold of) .+ (and automatically adjusted to NR|and treated as NR for the division-based Season DUPR adjustment)[.]$';
     if proposed_notes='' and row->>'notes' is null then proposed_notes:=null;end if;
    end if;
    if proposed is not null then action:=case when row->>'current' is null then 'CREATE' when (row->>'current')::numeric=proposed and proposed_notes is not distinct from row->>'notes' then 'NO CHANGE' else 'UPDATE' end;end if;
   end if;
  end if;
  if action in ('FILL','RECORD','CLEAR','CREATE','UPDATE') then changed:=changed+1;end if;
  if action='CREATE' then creates:=creates+1;elsif action='UPDATE' then updates:=updates+1;elsif action='NO CHANGE' then unchanged:=unchanged+1;elsif action='REVIEW' then review:=review+1;end if;
  if fills->>'doubles' is not null then doubles:=doubles+1;end if;if fills->>'rf' is not null then rf:=rf+1;end if;if fills->>'age' is not null then age:=age+1;end if;
  result:=array_append(result,row||jsonb_build_object('action',action,'reason',reason,'fills',fills,'proposed',proposed,'proposedNotes',proposed_notes,'classification',classification));
 end loop;
 return jsonb_build_object('season',ctx->'season','rules',ctx->'rules','operation',p_operation,'fingerprint',md5(ctx::text||p_upload::text||case when p_operation in ('upload','transfer') then ':full-source-precision-v2' else '' end),
 'counts',jsonb_build_object('total',jsonb_array_length(candidates),'affected',changed,'doubles',doubles,'rf',rf,'age',age,'protectedFields',protected,'missing',missing,'nrDeferred',nr,'review',review,'inactive',inactive,'create',creates,'update',updates,'noChange',unchanged,'primeTimeUpdates',0),'rows',to_jsonb(result));
end $function$;
CREATE OR REPLACE FUNCTION ratings_workflow_private.commit_run(p_actor uuid, p_payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
 SET lock_timeout TO '1s'
 SET statement_timeout TO '8s'
AS $function$
declare batch uuid; season uuid; operation text; prior ratings_workflow_private.runs; plan jsonb; row jsonb; member uuid; before jsonb; history jsonb:='[]';
 result jsonb; basis jsonb; field text; source jsonb; source_batch uuid; import_updates jsonb:='[]'; import_before jsonb:='[]'; detail text;
begin
 perform ratings_source_private.authorize(p_actor);
 if p_payload->>'actor' is distinct from p_actor::text or octet_length(p_payload::text)>2097152 then raise exception 'Invalid operation identity';end if;
 batch:=(p_payload->>'id')::uuid;season:=(p_payload->>'seasonId')::uuid;operation:=p_payload->>'operation';
 if batch is null or season is null or operation not in ('upload','transfer','clear','clean') then raise exception 'Invalid operation';end if;
 perform pg_advisory_xact_lock(hashtextextended('ratings-working-'||season::text,0));
 select * into prior from ratings_workflow_private.runs where id=batch;
 if found then if prior.actor<>p_actor or prior.payload<>p_payload then raise exception 'Run identity collision';end if;return prior.result-'basis';end if;
 begin
  if (p_payload->>'expires')::timestamptz is null or (p_payload->>'expires')::timestamptz<=clock_timestamp() then raise exception 'Preview expired';end if;
  lock table public.members,public.user_roles,public.seasons,public.teams,public.team_members,public.divisions,public.leagues,public.ai_documents,public.ai_document_versions,public.ai_document_chunks in share mode;
  lock table public.member_season_ratings,ratings_source_private.sources,ratings_source_private.batches,ratings_workflow_private.input_state in share row exclusive mode;
  if operation='clean' then
   if p_payload->>'cleanVersion' is distinct from 'combined-clean-v2' or jsonb_typeof(p_payload->'rfCutoff') is distinct from 'number' then raise exception 'Selected RF cutoff and combined preview required';end if;
   plan:=ratings_workflow_private.clean_plan(p_actor,season,(p_payload->>'rfCutoff')::numeric);
  else plan:=ratings_workflow_private.plan(p_actor,season,operation,coalesce(p_payload->'upload','[]'));end if;
  if plan->>'fingerprint' is distinct from p_payload->>'fingerprint' then raise exception 'Inputs, source, identity, roster or Rules changed; preview again';end if;
  for row in select value from jsonb_array_elements(plan->'rows') where value->>'action' in ('FILL','RECORD','CLEAR','CREATE','UPDATE') or (operation='clean' and value->'primeTime'->>'action' in ('CREATE','UPDATE')) loop
   member:=(row->>'memberId')::uuid;
   select to_jsonb(r) into before from public.member_season_ratings r where r.member_id=member and r.season_id=season;
   history:=history||jsonb_build_array(jsonb_build_object('memberId',member,'rating',before,'inputBasis',row->'inputBasis','clearedAt',row->'clearedAt','sourceRow',(select to_jsonb(s) from ratings_source_private.sources s where s.season_id=season and s.member_id=member)));
   if operation in ('upload','transfer') then
    source:=case when operation='upload' then row->'incoming'->'data' else row->'source' end;
    source_batch:=case when operation='upload' then batch else (row->>'sourceImport')::uuid end;
    if operation='upload' then
     import_updates:=import_updates||jsonb_build_array(jsonb_build_object('memberId',member,'duprId',row->>'duprId','data',source));
     import_before:=import_before||jsonb_build_array(jsonb_build_object('memberId',member,'source',row->'source'));
     insert into ratings_source_private.sources(season_id,member_id,data,import_id) values(season,member,source,batch)
     on conflict(season_id,member_id) do update set data=excluded.data,revision=ratings_source_private.sources.revision+1,updated_at=now(),import_id=batch;
    end if;
    if row->'fills'<>'{}' then
     insert into public.member_season_ratings(member_id,season_id,dupr_doubles_rating,dupr_reliability_rating,dupr_age_based_rating)
     values(member,season,row->'fills'->>'doubles',(row->'fills'->>'rf')::numeric,(row->'fills'->>'age')::numeric)
     on conflict(member_id,season_id) do update set dupr_doubles_rating=coalesce(public.member_season_ratings.dupr_doubles_rating,excluded.dupr_doubles_rating),dupr_reliability_rating=coalesce(public.member_season_ratings.dupr_reliability_rating,excluded.dupr_reliability_rating),dupr_age_based_rating=coalesce(public.member_season_ratings.dupr_age_based_rating,excluded.dupr_age_based_rating);
     basis:=row->'inputBasis';
     for field in select jsonb_object_keys(row->'fills') loop basis:=basis||jsonb_build_object(field,jsonb_build_object('import',source_batch,'raw',source->field,'value',row->'fills'->field,'ageSource',source->'ageSource','selectedAt',clock_timestamp()));end loop;
     insert into ratings_workflow_private.input_state(season_id,member_id,basis) values(season,member,basis)
     on conflict(season_id,member_id) do update set basis=excluded.basis;
    end if;
   elsif operation='clear' then
    update public.member_season_ratings set dupr_doubles_rating=null,dupr_reliability_rating=null,dupr_age_based_rating=null where member_id=member and season_id=season;
    insert into ratings_workflow_private.input_state(season_id,member_id,basis,cleared_at) values(season,member,'{}',clock_timestamp())
    on conflict(season_id,member_id) do update set basis='{}',cleared_at=excluded.cleared_at;
   else
    update public.member_season_ratings set season_dupr_rating=case when row->>'action' in ('CREATE','UPDATE') then (row->>'proposed')::numeric else season_dupr_rating end,
     notes=case when row->>'action' in ('CREATE','UPDATE') then row->>'proposedNotes' else notes end,
     season_primetime_rating=case when row->'primeTime'->>'action' in ('CREATE','UPDATE') then (row->'primeTime'->>'proposed')::numeric else season_primetime_rating end where member_id=member and season_id=season;
    if not found then raise exception 'Working rating row disappeared';end if;
   end if;
  end loop;
  if operation='upload' and jsonb_array_length(import_updates)>0 then
   insert into ratings_source_private.batches(id,actor,season_id,file_hash,payload,before_rows,result) values(batch,p_actor,season,p_payload->>'fileHash',jsonb_build_object('updates',import_updates),import_before,jsonb_build_object('importId',batch,'updated',jsonb_array_length(import_updates),'seasonValuesChanged',0));
  end if;
  result:=jsonb_build_object('status','success','counts',plan->'counts','basis',jsonb_build_object('rules',plan->'rules','rows',plan->'rows'),'primeTimeUpdates',coalesce((plan->'primeTimeCounts'->>'create')::int,0)+coalesce((plan->'primeTimeCounts'->>'update')::int,0),'rfCutoff',plan->'rfCutoff','regularCounts',plan->'regularCounts','primeTimeCounts',plan->'primeTimeCounts');
 exception when others then get stacked diagnostics detail=message_text;result:=jsonb_build_object('status','failed','reason',detail,'affected',0);history:='[]';end;
 insert into ratings_workflow_private.runs(id,actor,season_id,operation,payload,before_rows,result) values(batch,p_actor,season,operation,p_payload,history,result);
 return result-'basis';
end $function$;
