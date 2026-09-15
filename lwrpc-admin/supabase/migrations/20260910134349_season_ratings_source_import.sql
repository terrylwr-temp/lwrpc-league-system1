-- Source refresh only. No writes to members, member_season_ratings or league operations.
begin;
create schema if not exists ratings_source_private;
revoke all on schema ratings_source_private from public, anon, authenticated;
create table ratings_source_private.sources (
 season_id uuid not null,
 member_id uuid not null,
 data jsonb not null check (jsonb_typeof(data)='object'),
 revision bigint not null default 1,
 updated_at timestamptz not null default now(),
 import_id uuid not null,
 primary key(season_id,member_id)
);
-- No new foreign keys on business tables: source storage must not block existing deletion workflows.
create table ratings_source_private.batches (
 id uuid primary key, actor uuid not null, season_id uuid not null,
 file_hash text not null, payload jsonb not null, before_rows jsonb not null,
 result jsonb not null, created_at timestamptz not null default now()
);
alter table ratings_source_private.sources enable row level security;
alter table ratings_source_private.batches enable row level security;
revoke all on all tables in schema ratings_source_private from public,anon,authenticated,service_role;

create function ratings_source_private.authorize(p_actor uuid) returns void
language plpgsql security definer set search_path='' as $$
declare identity jsonb;
begin
 identity:=ai_live_private.resolve_identity(p_actor);
 if coalesce(identity->>'role','') not in ('league_manager','commissioner') then
  raise exception 'Only League Managers and Commissioners may import source ratings.' using errcode='42501';
 end if;
end $$;

create function ratings_source_private.snapshot(p_actor uuid,p_season uuid,p_ids jsonb) returns jsonb
language plpgsql security definer set search_path='' set statement_timeout='5s' as $$
declare season jsonb; result jsonb;
begin
 perform ratings_source_private.authorize(p_actor);
 if jsonb_typeof(p_ids) is distinct from 'array' or jsonb_array_length(p_ids)>1000 then raise exception 'Invalid ID list';end if;
 select jsonb_build_object('id',id,'name',name) into season from public.seasons where id=p_season and is_active is true;
 if season is null then raise exception 'Active target season required';end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',m.id,'name',trim(coalesce(m.first_name,'')||' '||coalesce(m.last_name,'')),
  'dupr_id',m.dupr_id,'is_active_member',m.is_active_member,
  'source',case when s.member_id is null then null else jsonb_build_object('data',s.data,'revision',s.revision) end,
  'seasonRatings',case when r.member_id is null then null else jsonb_build_object('seasonDupr',r.season_dupr_rating,'primetime',r.season_primetime_rating,'rf',r.dupr_reliability_rating) end
 ) order by m.id),'[]'::jsonb) into result from public.members m
 left join ratings_source_private.sources s on s.member_id=m.id and s.season_id=p_season
 left join public.member_season_ratings r on r.member_id=m.id and r.season_id=p_season
 where upper(trim(m.dupr_id)) in (select jsonb_array_elements_text(p_ids));
 return jsonb_build_object('season',season,'members',result);
end $$;

create function ratings_source_private.commit_import(p_actor uuid,p_payload jsonb) returns jsonb
language plpgsql security definer set search_path='' set lock_timeout='1s' set statement_timeout='5s' as $$
declare item jsonb; stored ratings_source_private.sources; prior ratings_source_private.batches;
 batch uuid; season uuid; member uuid; count_matches integer; source_id text; result jsonb;
 before_rows jsonb:='[]'; started timestamptz:=clock_timestamp(); patch jsonb; k text;
begin
 if p_payload->>'policy' is distinct from 'source-only-v1' or jsonb_typeof(p_payload->'updates') is distinct from 'array'
  or jsonb_array_length(p_payload->'updates') not between 1 and 1000 or octet_length(p_payload::text)>2097152 then raise exception 'Invalid import payload';end if;
 batch:=(p_payload->>'id')::uuid; season:=(p_payload->>'seasonId')::uuid;
 if batch is null or season is null or p_actor is null then raise exception 'Invalid import identity';end if;
 -- SHARE closes duplicate-ID phantoms without modifying any identity writer.
 -- Short timeout: normal member/role writes take priority over this import.
 lock table public.members in share mode;
 lock table public.user_roles in share mode;
 perform ratings_source_private.authorize(p_actor);
 perform pg_advisory_xact_lock(hashtextextended('ratings-source-'||season::text,0));
 select * into prior from ratings_source_private.batches where id=batch;
 if found then
  if prior.actor<>p_actor or prior.payload<>p_payload then raise exception 'Import ID collision';end if;
  return prior.result;
 end if;
 if (p_payload->>'expires')::timestamptz is null or (p_payload->>'expires')::timestamptz<=clock_timestamp() then raise exception 'Preview expired';end if;
 perform 1 from public.seasons where id=season and is_active is true for share;
 if not found then raise exception 'Target season changed; preview again';end if;
 if (select count(distinct x->>'duprId') from jsonb_array_elements(p_payload->'updates') x)<>jsonb_array_length(p_payload->'updates')
 or (select count(distinct x->>'memberId') from jsonb_array_elements(p_payload->'updates') x)<>jsonb_array_length(p_payload->'updates') then raise exception 'Duplicate import identity';end if;
 for item in select value from jsonb_array_elements(p_payload->'updates') order by value->>'memberId' loop
  if clock_timestamp()-started>interval '4 seconds' then raise exception 'Import time budget exceeded; no rows committed';end if;
  source_id:=item->>'duprId';member:=(item->>'memberId')::uuid;
  if source_id is null or source_id='' or source_id<>upper(trim(source_id)) or member is null then raise exception 'Invalid DUPR identity';end if;
  select count(*) into count_matches from public.members where upper(trim(dupr_id))=source_id;
  if count_matches<>1 or not exists(select 1 from public.members where id=member and upper(trim(dupr_id))=source_id and is_active_member is distinct from false) then raise exception 'DUPR identity changed; preview again';end if;
  select * into stored from ratings_source_private.sources where season_id=season and member_id=member for update;
  if (item->>'expectedRevision') is null or coalesce(stored.revision,0)<>(item->>'expectedRevision')::bigint then raise exception 'Source ratings changed; preview again';end if;
  patch:=item->'data';
  if jsonb_typeof(patch) is distinct from 'object' then raise exception 'Invalid source data';end if;
  if exists(select 1 from jsonb_object_keys(patch) key where key not in ('doubles','rf','age','ageSource','ageMissing','rfMissing','doublesMissing')) then raise exception 'Unexpected source field';end if;
  if patch?'doubles' and (jsonb_typeof(patch->'doubles')<>'string' or not (patch->>'doubles'='NR' or (patch->>'doubles' ~ '^[2-8][.][0-9]{3}$' and (patch->>'doubles')::numeric between 2 and 8))) then raise exception 'Invalid doubles';end if;
  foreach k in array array['rf','age'] loop
   if patch?k and (jsonb_typeof(patch->k)<>'number' or patch->>k !~ '^[0-9]+([.][0-9]{1,3})?$') then raise exception 'Invalid numeric source';end if;
  end loop;
  if patch?'rf' and (patch->>'rf')::numeric not between 0 and 100 then raise exception 'Invalid RF';end if;
  if patch?'age' and (patch->>'age')::numeric not between 2 and 8 then raise exception 'Invalid age rating';end if;
  if patch?'ageSource' and patch->>'ageSource' not in ('over_65','over_50') then raise exception 'Invalid age source';end if;
  foreach k in array array['ageMissing','rfMissing','doublesMissing'] loop
   if jsonb_typeof(patch->k) is distinct from 'boolean' then raise exception 'Missing presence metadata';end if;
  end loop;
  before_rows:=before_rows||jsonb_build_array(jsonb_build_object('memberId',member,'source',case when stored.member_id is null then null else to_jsonb(stored) end));
  insert into ratings_source_private.sources(season_id,member_id,data,revision,import_id)
  values(season,member,patch,1,batch)
  on conflict(season_id,member_id) do update set data=excluded.data,revision=ratings_source_private.sources.revision+1,updated_at=now(),import_id=batch;
 end loop;
 result:=jsonb_build_object('importId',batch,'updated',jsonb_array_length(p_payload->'updates'),'seasonValuesChanged',0);
 insert into ratings_source_private.batches(id,actor,season_id,file_hash,payload,before_rows,result)
 values(batch,p_actor,season,p_payload->>'fileHash',p_payload,before_rows,result);
 return result;
end $$;

-- Only trusted server calls can enter; actor is obtained from verified Auth, never request JSON.
create function public.season_ratings_source_snapshot(p_actor uuid,p_season uuid,p_ids jsonb) returns jsonb
language sql security invoker set search_path='' as $$ select ratings_source_private.snapshot(p_actor,p_season,p_ids) $$;
create function public.season_ratings_source_commit(p_actor uuid,p_payload jsonb) returns jsonb
language sql security invoker set search_path='' as $$ select ratings_source_private.commit_import(p_actor,p_payload) $$;
revoke all on all functions in schema ratings_source_private from public,anon,authenticated,service_role;
revoke all on function public.season_ratings_source_snapshot(uuid,uuid,jsonb),public.season_ratings_source_commit(uuid,jsonb) from public,anon,authenticated,service_role;
grant usage on schema ratings_source_private to service_role;
grant execute on function ratings_source_private.snapshot(uuid,uuid,jsonb),ratings_source_private.commit_import(uuid,jsonb) to service_role;
grant execute on function public.season_ratings_source_snapshot(uuid,uuid,jsonb),public.season_ratings_source_commit(uuid,jsonb) to service_role;
commit;
