import fs from 'node:fs';
const q=value=>`'${String(value).replaceAll("'","''")}'`;
const base=new URL('../../../docs/',import.meta.url);
export const admissionRows=JSON.parse(fs.readFileSync(new URL('lms-0726-final-admission-contracts.json',base),'utf8'));
const initial=JSON.parse(fs.readFileSync(new URL('lms-0726-four-blockers-evidence.json',base),'utf8')).configuration;
const correction=JSON.parse(fs.readFileSync(new URL('lms-0726-pt9-owner-correction-evidence.json',base),'utf8')).configuration;
export const configurations=initial.map(row=>({...row,...correction.find(fix=>fix.division===row.division)}));
const number=value=>value==null?'null':Number(value);
export function configurationHash(row){return `md5(jsonb_build_object('min',${number(row.min_dupr)}::numeric,'max',${number(row.max_dupr)}::numeric,'pair',${number(row.team_dupr_max)}::numeric,'type',${q(row.rating_type)},'homeOnly',${row.only_home_community_players===true})::text)`;}
export function policySeedSql(){
 let sql='\n-- Reviewed admission bindings; unavailable personal facts remain unknown.\n';
 for(const row of admissionRows){
  const config=configurations.find(item=>item.division_id===row.divisionId);
  if(!config)throw Error(`Missing reviewed division ${row.divisionId}`);
  const mapped=['nr_classification','individual_bounds','duplicate','roster_lock','team_season_identity','pair_aggregate','lineup_roster','home_only_setting'].includes(row.condition);
  const sourceKind=mapped?'EXISTING_COLUMN':'UNAVAILABLE';
  const params={applicable:row.applicable};
  if(row.condition==='nr_classification')Object.assign(params,{operator:'LT',threshold:29});
  if(row.condition==='individual_bounds')Object.assign(params,{nrPlacement:'ANY_DIVISION',seasonProvenance:'UNAVAILABLE',normalization:'DECIMAL_TENTHS_DOMAIN'});
  const stage=row.stage.split('/')[0];
  const tuple=[row.seasonId,row.leagueId,row.divisionId,row.condition,stage];
  const predicate=tuple.map((value,i)=>`${['season_id','league_id','division_id','condition_code','stage'][i]}=${q(value)}`).join(' and ');
  const comparison=({nr_classification:'NR_CLASSIFICATION',individual_bounds:'INTEGER_TENTH_RANGE',duplicate:'EXISTS',roster_lock:'ROSTER_LOCK',team_season_identity:'VERIFIED_BOOLEAN',pair_aggregate:'PAIR_SUM',lineup_roster:'CURRENT_ROSTER',home_only_setting:'COMMUNITY_CONJUNCTION'})[row.condition]||'UNAVAILABLE';
  const payload=[...tuple,'v20260908162017-f0aad5ad',row.source,sourceKind,comparison,JSON.stringify(params)].map(q);
  const expectedHash=configurationHash(config);
  const status=mapped?'VERIFIED':'UNMAPPED';
  sql+=`do $seed$ begin
 if not exists(select 1 from public.divisions d join public.leagues l on l.id=d.league_id where d.id=${q(row.divisionId)} and l.id=${q(row.leagueId)} and l.season_id=${q(row.seasonId)}) then raise exception 'LMS0726 admission hierarchy drift: ${row.divisionId}';end if;
 if exists(select 1 from lms_write_private.policy_bindings where ${predicate} and (rules_version<>'v20260908162017-f0aad5ad' or source_ref<>${q(row.source)} or source_kind<>${q(sourceKind)} or comparison<>${q(comparison)} or parameters<>${q(JSON.stringify(params))}::jsonb or config_hash<>${expectedHash} or status<>${q(status)})) then raise exception 'LMS0726 admission binding drift: ${row.divisionId}/${row.condition}';end if;
 insert into lms_write_private.policy_bindings(season_id,league_id,division_id,condition_code,stage,rules_version,source_ref,source_kind,comparison,parameters,config_hash,status)
 values(${payload.join(',')},${expectedHash},${q(status)}) on conflict(season_id,league_id,division_id,condition_code,stage) do nothing;
end $seed$;\n`;
 }
 return sql;
}

