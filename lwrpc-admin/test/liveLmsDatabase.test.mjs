import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runLive} from '../app/lib/liveLmsService.js';
process.env.SUPABASE_SERVICE_ROLE_KEY='synthetic-test-secret';
import {PGlite} from '@electric-sql/pglite';
const migration=await readFile(new URL('../supabase/migrations/20260907110701_lms0723_live_intelligence.sql',import.meta.url),'utf8');
const correction=await readFile(new URL('../supabase/migrations/20260907131012_lms0723_server_session_validation.sql',import.meta.url),'utf8');
const id=n=>`10000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
async function fixture(){
 const db=new PGlite();
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;
 create table auth.users(id uuid primary key);
 create table auth.sessions(id uuid primary key,user_id uuid,not_after timestamptz);
 create table members(id uuid primary key,first_name text,last_name text,email text,phone text,is_active_member boolean);
 create table user_roles(user_id uuid unique,member_id uuid,role text);
 create table seasons(id uuid primary key,name text,is_active boolean);
 create table leagues(id uuid primary key,season_id uuid,name text,is_active boolean);
 create table divisions(id uuid primary key,league_id uuid,name text,is_active boolean);
 create table teams(id uuid primary key,division_id uuid,name text,is_active boolean,captain_member_id uuid,co_captain_member_id uuid,co_captain_2_member_id uuid,club_pro_member_id uuid);
 create table team_members(team_id uuid,member_id uuid,is_active boolean);
 create table member_season_ratings(member_id uuid,season_id uuid,season_dupr_rating numeric,season_primetime_rating numeric,dupr_doubles_rating text);
 create table locations(id uuid primary key,name text);
 create table matches(id uuid primary key,home_team_id uuid,away_team_id uuid,location_id uuid,scheduled_date date,scheduled_time time,status text,is_published boolean);
 create table system_settings(setting_key text,setting_value text);

 grant usage on schema public to service_role;
 grant select on all tables in schema public to service_role;
 grant update(user_id) on user_roles to service_role;grant update(id) on members to service_role;
 grant update on teams,team_members,seasons,divisions,leagues to service_role;
 alter default privileges in schema public grant all on tables to anon,authenticated,service_role;
 alter default privileges in schema public grant execute on functions to anon,authenticated,service_role;
 insert into seasons values('${id(20)}','Synthetic Current',true);
 insert into leagues values('${id(21)}','${id(20)}','Synthetic League',true);
 insert into divisions values('${id(22)}','${id(21)}','Synthetic Division',true);
 insert into teams values('${id(30)}','${id(22)}','Synthetic Team',true,'${id(2)}','${id(3)}','${id(4)}','${id(5)}'),('${id(31)}','${id(22)}','Other Team',true,null,null,null,null);
 insert into locations values('${id(40)}','Synthetic Courts');
 insert into system_settings values('timezone','America/New_York');
 insert into matches values('${id(50)}','${id(30)}','${id(31)}','${id(40)}',current_date+2,'12:00','scheduled',true);
 `);
 for(let n=1;n<=9;n++){
  await db.query('insert into members values($1,$2,$3,$4,$5,true)',[id(n),'Synthetic',`Person${n}`,`synthetic${n}@example.invalid`,'DO NOT READ']);
  await db.query('insert into user_roles values($1,$2,$3)',[id(100+n),id(n),['player','captain','captain','captain','club_pro','club_pro','league_manager','commissioner','player'][n-1]]);
  await db.query('insert into auth.sessions values($1,$2,null)',[id(200+n),id(100+n)]);
  await db.query('insert into member_season_ratings values($1,$2,3.72,4.1,\'NR\')',[id(n),id(20)]);
 }
 await db.exec(`insert into team_members values('${id(30)}','${id(1)}',true),('${id(31)}','${id(9)}',true);`);
 await db.exec(await readFile(new URL('../supabase-ai-assistant-lms-0712-stage6.sql',import.meta.url),'utf8'));
 await db.exec(await readFile(new URL('../supabase-ai-assistant-lms-0716-stage7a.sql',import.meta.url),'utf8'));
 await db.exec(migration);
 await db.exec('create role supabase_auth_admin; alter table auth.sessions owner to supabase_auth_admin; alter table auth.sessions enable row level security; revoke usage on schema auth from ai_live_session_reader;');
 await db.exec(correction);
 return db;
}
async function call(db,n,query){
 await db.exec('set role service_role');
 try{return (await db.query('select ai_live_lookup($1,$2,$3) result',[id(100+n),id(500+n),query])).rows[0].result;}finally{await db.exec('reset role');}
}
test('0723 effective permissions, server auth boundary and six capability projections',async t=>{
 const db=await fixture();try{
  await t.test('six deterministic capabilities',async()=>{
   const rating=await call(db,1,{intent:'SELF_RATING',rating:'season'});assert.equal(rating.value,'3.72');assert.ok(!JSON.stringify(rating).includes('example.invalid'));
   const managed=await call(db,2,{intent:'PLAYER_RATING',name:'Synthetic Person1',rating:'primetime'});assert.equal(managed.value,'4.1');
   assert.equal((await call(db,2,{intent:'PLAYER_CONTACT',name:'Synthetic Person1'})).value,'synthetic1@example.invalid');
   assert.equal((await call(db,1,{intent:'SELF_TEAM'})).team,'Synthetic Team');
   const roster=await call(db,1,{intent:'TEAM_ROSTER'});assert.deepEqual(roster.players,[{label:'Synthetic Person1'}]);assert.ok(!JSON.stringify(roster).includes('3.72'));
   assert.equal((await call(db,1,{intent:'NEXT_MATCH'})).opponent,'Other Team');
  });
  await t.test('field ACL proves minimal projections instead of response filtering',async()=>{
   await db.exec('revoke select on members,member_season_ratings from service_role;grant select(id,first_name,last_name,is_active_member) on members to service_role;grant select(member_id,season_id,season_dupr_rating) on member_season_ratings to service_role;');
   assert.equal((await call(db,1,{intent:'SELF_RATING',rating:'season'})).value,'3.72');
   await assert.rejects(call(db,2,{intent:'PLAYER_CONTACT',name:'Synthetic Person1'}),/permission/);
   await db.exec('grant select(email) on members to service_role;revoke select on member_season_ratings from service_role;');
   assert.equal((await call(db,2,{intent:'PLAYER_CONTACT',name:'Synthetic Person1'})).value,'synthetic1@example.invalid');
  });
 }finally{await db.close();}
});
test('0723 role matrix, stale relationships, browser denial, replay and feedback transitions',async()=>{
 const db=await fixture();try{
  for(const n of [2,3,4,5,7,8])assert.equal((await call(db,n,{intent:'PLAYER_CONTACT',name:'Synthetic Person1'})).status,'success',`role ${n}`);
  for(const n of [1,6])assert.ok(['denied','not_found'].includes((await call(db,n,{intent:'PLAYER_CONTACT',name:'Synthetic Person1'})).status));
  assert.equal((await call(db,2,{intent:'PLAYER_CONTACT',name:'Synthetic Person9'})).status,'not_found');
  assert.equal((await call(db,2,{intent:'PLAYER_CONTACT',subject:id(9)})).status,'not_found');
  assert.equal((await call(db,1,{intent:'TEAM_ROSTER',team:id(31)})).status,'denied');
  await db.exec(`update user_roles set role='player' where member_id='${id(2)}'`);
  assert.equal((await call(db,2,{intent:'PLAYER_CONTACT',subject:id(1)})).status,'denied');
  await db.exec(`update teams set co_captain_member_id=null where id='${id(30)}'`);
  assert.equal((await call(db,3,{intent:'PLAYER_CONTACT',subject:id(1)})).status,'not_found');
  for(const role of ['anon','authenticated']){
   await db.exec(`set role ${role}`);await assert.rejects(db.query('select ai_live_lookup($1,$2,$3)',[id(107),id(501),{intent:'SELF_RATING',rating:'season'}]),/permission/);
   await assert.rejects(db.query('select * from ai_live_private.feedback'),/permission/);await db.exec('reset role');
  }
  const before=(await db.query("select relname,relacl::text from pg_class where relname in('members','ai_answer_feedback_events') order by relname")).rows;
  await db.exec(correction);assert.deepEqual((await db.query("select relname,relacl::text from pg_class where relname in('members','ai_answer_feedback_events') order by relname")).rows,before);
  await db.exec('set role service_role');
  for(const value of [true,true,false,false])await db.query('select ai_live_feedback($1,$2,$3,$4)',[id(101),id(900),value,{intent:'SELF_RATING',status:'success',relationship:'self',origin:'player_interface'}]);
  assert.deepEqual((await db.query('select helpful from ai_live_private.feedback order by at')).rows.map(x=>x.helpful),[true,false]);
  await assert.rejects(db.exec('delete from ai_live_private.feedback'),/permission/);await assert.rejects(db.exec('update ai_live_private.access_audit set decision=\'denied\''),/permission/);
  await db.exec('reset role');
 }finally{await db.close();}
});

test('0723 real Stage 7 live outcomes retain no facts or unanswered occurrences',async()=>{
 const db=await fixture();try{
  const principal={user:{id:id(101)},receiptBinding:id(201),supabase:{}};
  const result=await runLive({body:{question:'What is my Season DUPR?'},principal,
   lookup:async q=>({data:await call(db,1,q)}),
   persist:async(_s,build)=>{const p=build();await db.exec('set role service_role');try{await db.query('select capture_ai_quality($1,$2,$3,$4)',[p.p_outcome,p.p_occurrence,p.p_route,p.p_feedback_id]);}finally{await db.exec('reset role');}}
  });
  assert.match(result.answer,/3.72/);
  const rows=(await db.query('select * from ai_request_outcomes')).rows;assert.equal(rows.length,1);assert.equal(rows[0].source_family,'LIVE_LMS_DATA');
  for(const forbidden of ['3.72','Synthetic Person','example.invalid',id(1)])assert.ok(!JSON.stringify(rows).includes(forbidden));
  assert.equal(Number((await db.query('select count(*) n from ai_review_occurrences')).rows[0].n),0);
 }finally{await db.close();}
});
test('0723 audit fail-closed, budgets, duplicate resolution, freshness, retention and review authorization',async()=>{
 const db=await fixture();try{
  await db.exec(`update members set first_name='Synthetic',last_name='Person1' where id='${id(9)}'`);
  assert.equal((await call(db,2,{intent:'PLAYER_CONTACT',name:'Synthetic Person1'})).value,'synthetic1@example.invalid','unauthorized duplicate never participates');
  await db.exec(`insert into team_members values('${id(30)}','${id(9)}',true)`);
  assert.equal((await call(db,2,{intent:'PLAYER_CONTACT',name:'Synthetic Person1'})).status,'ambiguous');
  await db.exec(`delete from team_members where member_id='${id(9)}';
   create function reject_live_audit() returns trigger language plpgsql as $$begin raise exception 'synthetic audit unavailable';end$$;
   create trigger reject_live_audit before insert on ai_live_private.access_audit for each row execute function reject_live_audit();`);
  await assert.rejects(call(db,2,{intent:'PLAYER_CONTACT',subject:id(1)}),/synthetic audit/);
  await db.exec('drop trigger reject_live_audit on ai_live_private.access_audit');
  await db.exec(`update team_members set is_active=false where member_id='${id(1)}'`);
  assert.equal((await call(db,2,{intent:'PLAYER_CONTACT',subject:id(1)})).status,'not_found');
  assert.equal((await call(db,1,{intent:'TEAM_ROSTER',team:id(30)})).status,'no_team');
  await db.exec(`update team_members set is_active=true where member_id='${id(1)}';delete from ai_live_private.attempts;`);
  for(let i=0;i<5;i++)assert.equal((await call(db,2,{intent:'PLAYER_CONTACT',subject:id(1)})).status,'success');
  assert.equal((await call(db,2,{intent:'PLAYER_CONTACT',subject:id(1)})).status,'rate_limited');
  await db.exec('set role service_role');
  await assert.rejects(db.query('select ai_live_review($1)',[id(101)]),/authorization/);
  assert.ok((await db.query('select ai_live_review($1) r',[id(107)])).rows[0].r.groups);
  await assert.rejects(db.query('select id from auth.sessions'),/permission/);
  const count=Number((await db.query('select count(*) n from ai_live_private.access_audit')).rows[0].n);
  await db.query('select ai_live_private.expire_records()');assert.equal(Number((await db.query('select count(*) n from ai_live_private.access_audit')).rows[0].n),count,'fresh audit retained');
  await db.exec('reset role');await db.exec("update ai_live_private.access_audit set at=now()-interval '91 days';update ai_live_private.attempts set at=now()-interval '2 days'");
  await db.exec('set role service_role;select ai_live_private.expire_records();reset role');
  assert.equal(Number((await db.query('select count(*) n from ai_live_private.access_audit')).rows[0].n),0);
 }finally{await db.close();}
});

test('0723 current-season ambiguity, self continuation, roster pagination, schedule and team isolation',async()=>{
 const db=await fixture();try{
  const principal={user:{id:id(101)},receiptBinding:id(201),supabase:{}};
  const live=body=>runLive({body,principal,lookup:async q=>({data:await call(db,1,q)}),persist:async()=>{}});
  const clarification=await live({question:'What is my DUPR?'});assert.equal(clarification.kind,'clarification');
  const rating=await live({question:'Season DUPR',conversationReceipt:clarification.conversationReceipt});assert.match(rating.answer,/3.72/);
  await db.exec(`insert into seasons values('${id(23)}','Another Active Season',true)`);
  const seasons=await call(db,1,{intent:'SELF_RATING',rating:'season'});assert.equal(seasons.status,'ambiguous');assert.equal(seasons.choices.length,2);
  await db.exec(`update seasons set is_active=false where id='${id(23)}'`);
  for(let n=300;n<328;n++){await db.query('insert into members values($1,$2,$3,null,null,true)',[id(n),'Roster',String(n)]);await db.query('insert into team_members values($1,$2,true)',[id(30),id(n)]);}
  const first=await call(db,1,{intent:'TEAM_ROSTER'}),second=await call(db,1,{intent:'TEAM_ROSTER',offset:25});assert.equal(first.players.length,25);assert.equal(first.more,true);assert.equal(second.players.length,4);assert.equal(second.more,false);
  await db.exec(`insert into matches values('${id(51)}','${id(30)}','${id(31)}','${id(40)}',current_date+1,'09:00','scheduled',false),('${id(52)}','${id(30)}','${id(31)}','${id(40)}',current_date-1,'09:00','scheduled',true),('${id(53)}','${id(30)}','${id(31)}','${id(40)}',current_date+1,'09:00','completed',true)`);
  const match=await call(db,1,{intent:'NEXT_MATCH'});assert.equal(match.status,'success');assert.equal(match.time,'12:00:00');assert.equal(match.timezone,'America/New_York');
  await db.exec(`insert into matches values('${id(54)}','${id(30)}','${id(31)}','${id(40)}',current_date+2,'12:00','scheduled',true)`);
  assert.equal((await call(db,1,{intent:'NEXT_MATCH'})).status,'ambiguous');
  await db.exec(`update matches set is_published=false;delete from ai_live_private.attempts;`);
  assert.equal((await call(db,1,{intent:'NEXT_MATCH'})).status,'no_match');
  assert.equal((await call(db,1,{intent:'TEAM_ROSTER',teamName:'Other Team'})).status,'no_team');
  assert.equal((await call(db,7,{intent:'TEAM_ROSTER',teamName:'Other Team'})).team,'Other Team');
  assert.equal((await call(db,1,{intent:'SELF_RATING',rating:'season',origin:'manager_test'})).status,'denied');
  await db.exec(`update members set is_active_member=false where id='${id(1)}'`);
  assert.equal((await call(db,1,{intent:'SELF_RATING',rating:'season'})).status,'denied');
 }finally{await db.close();}
});

test('0723 synthetic six-capability timing benchmark (no external auth/model)',async t=>{
 const db=await fixture();try{
  for(const [question,n] of [['What is my Season DUPR?',1],["What is Synthetic Person1's Season DUPR?",2],["What is Synthetic Person1's email address?",2],['What team am I on?',1],['Show my roster',1],['When is my next match?',1]]){
   const result=await runLive({body:{question},principal:{user:{id:id(100+n)},receiptBinding:id(200+n),supabase:{}},lookup:async q=>({data:await call(db,n,q)}),persist:async()=>{}});
   assert.equal(result.kind,'answer');assert.ok(result.live.timing.databaseQueryMs>=0);
   t.diagnostic(JSON.stringify({capability:result.live.operation,...result.live.timing,authMs:null,auth:'injected synthetic principal; production verification pending'}));
  }
 }finally{await db.close();}
});


test('0723 permanent named rating blocker: protected resolution never reads requester rating',async()=>{
 const db=await fixture();const originalFetch=globalThis.fetch;let network=0;
 globalThis.fetch=async()=>{network++;throw Error('external call forbidden');};
 try{
  // A projection guard raises if the requester value is fetched, even if later hidden.
  await db.exec(`update member_season_ratings set season_dupr_rating=1.25 where member_id='${id(2)}';
   alter table member_season_ratings rename to synthetic_rating_storage;
   create function public.synthetic_rating_guard(subject uuid,value numeric) returns numeric language plpgsql volatile as $$ begin
    if subject='${id(2)}' then raise exception 'REQUESTER RATING WAS FETCHED';end if;return value;end $$;
   create view member_season_ratings with(security_invoker=true) as select member_id,season_id,
    public.synthetic_rating_guard(member_id,season_dupr_rating) season_dupr_rating,season_primetime_rating,dupr_doubles_rating from synthetic_rating_storage;
   grant select on member_season_ratings to service_role;`);
  const principal={user:{id:id(102)},receiptBinding:id(202),supabase:{}};
  let seen,snapshot;
  const live=question=>runLive({body:{question},principal,lookup:async q=>{seen=q;return {data:await call(db,2,q)};},persist:async(_db,build)=>{snapshot=build();}});
  const good=await live("Tell me Synthetic Person1's Season DUPR.");
  assert.equal(seen.intent,'PLAYER_RATING');assert.equal(seen.subjectKind,'EXPLICIT_PERSON');assert.equal(seen.name,'Synthetic Person1');
  assert.equal(good.kind,'answer');assert.match(good.answer,/Synthetic Person1.*3\.72/);assert.doesNotMatch(good.answer,/1\.25/);
  await assert.rejects(call(db,2,{intent:'SELF_RATING',rating:'season'}),/REQUESTER RATING WAS FETCHED/,'guard actually detects requester projection');
  const denied=await live("Tell me Synthetic Person9's Season DUPR");assert.equal(denied.kind,'protected');
  const missing=await live("Tell me Nonexistent Person's Season DUPR");assert.equal(missing.answer,denied.answer,'no existence oracle outside authorized population');
  await db.exec('revoke select on members from service_role;grant select(id,first_name,last_name,is_active_member) on members to service_role;');
  const email=await live("Tell me Synthetic Person9's email");assert.equal(email.kind,'protected');assert.equal(snapshot.p_outcome.reason_code,'not_found');
  const safe=JSON.stringify(snapshot);for(const secret of ['Synthetic Person9','3.72','1.25','example.invalid',id(9)])assert.ok(!safe.includes(secret));
  assert.equal(snapshot.p_outcome.model_call_skipped,true);assert.equal(snapshot.p_outcome.stage3_invoked,false);assert.equal(network,0);
 }finally{globalThis.fetch=originalFetch;await db.close();}
});

test('0723 six-capability subject invariant, authorized population, ambiguity and effective projections',async()=>{
 const db=await fixture();try{
  const fresh=async(n,q)=>{await db.exec('delete from ai_live_private.attempts');return call(db,n,q);};
  for(const intent of ['SELF_RATING','PLAYER_RATING','PLAYER_CONTACT','SELF_TEAM','TEAM_ROSTER','NEXT_MATCH']){
   const named={intent,rating:'season',subjectKind:'EXPLICIT_PERSON',name:'Synthetic Person1'};
   const allowed=await fresh(2,named);
   assert.equal(allowed.status,intent==='SELF_RATING'?'denied':'success',intent);
   for(const name of ['Synthetic Person9','Nonexistent Person'])assert.equal((await fresh(2,{...named,name})).status,intent==='SELF_RATING'?'denied':'not_found',intent);
   for(const extra of [{subjectKind:'EXPLICIT_PERSON'},{subjectKind:'FOLLOWUP_REFERENT'},{subjectKind:'FOLLOWUP_REFERENT',subject:'forged'},{subjectKind:'FOLLOWUP_REFERENT',subject:id(9)},{subjectKind:'SELF',name:'Synthetic Person1'}]){
    const r=await fresh(2,{intent,rating:'season',...extra});assert.ok(['denied','not_found'].includes(r.status),`${intent} ${JSON.stringify(extra)} ${r.status}`);
   }
  }
  // Exact second blocker, including old parameter shape: raw name must not be ignored.
  assert.equal((await fresh(2,{intent:'SELF_TEAM',name:'Synthetic Person9'})).status,'not_found');
  assert.equal((await fresh(2,{intent:'SELF_TEAM',subject:id(9)})).status,'not_found');
  for(const intent of ['PLAYER_RATING','PLAYER_CONTACT','SELF_TEAM','TEAM_ROSTER','NEXT_MATCH']){
   assert.equal((await fresh(1,{intent,rating:'season',subjectKind:'EXPLICIT_PERSON',name:'Synthetic Person1'})).status,'denied','player cross-person policy unchanged');
   assert.equal((await fresh(2,{intent,rating:'season',subjectKind:'EXPLICIT_PERSON',name:'Synthetic Person'})).status,'ambiguous');
  }
  // Do not let an authorized but unrelated managed team win selection for a named person.
  await db.exec(`update teams set captain_member_id='${id(2)}' where id='${id(31)}'`);
  for(const intent of ['SELF_TEAM','TEAM_ROSTER','NEXT_MATCH']){
   const r=await fresh(2,{intent,subjectKind:'EXPLICIT_PERSON',name:'Synthetic Person9'});assert.equal(r.status,'success');assert.equal(r.team,'Other Team');assert.equal(r.subject,id(9));
  }
  // Effective field ACLs: all team operations work without contact or rating access.
  await db.exec('revoke select on members,member_season_ratings from service_role;grant select(id,first_name,last_name,is_active_member) on members to service_role;');
  for(const intent of ['SELF_TEAM','TEAM_ROSTER','NEXT_MATCH'])assert.equal((await fresh(2,{intent,name:'Synthetic Person1',subjectKind:'EXPLICIT_PERSON'})).status,'success');
  await assert.rejects(fresh(2,{intent:'PLAYER_CONTACT',name:'Synthetic Person1'}),/permission/);
  await assert.rejects(fresh(2,{intent:'PLAYER_RATING',name:'Synthetic Person1',rating:'season'}),/permission/);
  await db.exec('grant select(member_id,season_id,season_dupr_rating) on member_season_ratings to service_role;');
  for(const [n,intent] of [[1,'SELF_RATING'],[2,'PLAYER_RATING']])assert.equal((await fresh(n,{intent,rating:'season',...(n===2?{name:'Synthetic Person1'}:{})})).status,'success');
  await db.exec('revoke select on member_season_ratings from service_role;grant select(email) on members to service_role;');
  assert.equal((await fresh(2,{intent:'PLAYER_CONTACT',name:'Synthetic Person1'})).status,'success');
 }finally{await db.close();}
});

test('0723 named team follow-up reauthorizes; reset and new self query discard prior subject',async()=>{
 const db=await fixture();try{
  const principal={user:{id:id(102)},receiptBinding:id(202),supabase:{}};let queries=[];
  const live=body=>runLive({body,principal,lookup:async q=>{queries.push(q);return {data:await call(db,2,q)};},persist:async()=>{}});
  const rating=await live({question:"What is Synthetic Person1's Season DUPR?"});assert.equal(rating.kind,'answer');
  const team=await live({question:'What team is he on?',conversationReceipt:rating.conversationReceipt});assert.equal(team.kind,'answer');assert.equal(queries.at(-1).subjectKind,'FOLLOWUP_REFERENT');assert.equal(queries.at(-1).subject,id(1));
  await db.exec(`update team_members set is_active=false where member_id='${id(1)}'`);
  const denied=await live({question:'What team is he on?',conversationReceipt:team.conversationReceipt});assert.equal(denied.kind,'protected');assert.equal(denied.conversationReceipt,null);
  const n=queries.length;const reset=await live({question:'What team is he on?'});assert.equal(reset.kind,'protected');assert.equal(queries.length,n);
  const self=await live({question:'What is my team?',conversationReceipt:team.conversationReceipt});assert.equal(self.kind,'answer');assert.equal(queries.at(-1).subject,undefined);
 }finally{await db.close();}
});


test('0723 final migration security state survives production-default grants and replay',async()=>{
 const db=await fixture();try{
  const snapshot=()=>db.query(`select n.nspname,c.relname,c.relrowsecurity,array(select x::text from unnest(c.relacl) x order by x::text) relacl,
   (select jsonb_agg(jsonb_build_object('name',a.attname,'type',a.atttypid,'acl',a.attacl::text) order by a.attnum)
    from pg_attribute a where a.attrelid=c.oid and a.attnum>0 and not a.attisdropped) columns
   from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','ai_live_private') and c.relkind in ('r','v') order by n.nspname,c.relname`);
  const before=(await snapshot()).rows;
  const functions=()=>db.query(`select n.nspname,p.proname,p.prosecdef,p.proconfig,array(select x::text from unnest(p.proacl) x order by x::text) proacl from pg_proc p join pg_namespace n on n.oid=p.pronamespace where p.proname in ('lookup','ai_live_lookup') order by n.nspname,p.proname`);
  const functionBefore=(await functions()).rows;
  assert.equal((await db.query("select count(*)::int n from pg_roles where rolname='ai_live_session_reader'")).rows[0].n,0);
  assert.equal((await db.query("select to_regprocedure('ai_live_private.session_valid(uuid,uuid)') helper")).rows[0].helper,null);
  assert.equal((await db.query("select relrowsecurity from pg_class where oid='auth.sessions'::regclass")).rows[0].relrowsecurity,true);
  assert.equal((await db.query("select count(*)::int n from pg_policy where polrelid='auth.sessions'::regclass")).rows[0].n,0);

  for(const row of functionBefore){assert.equal(row.prosecdef,false);assert.deepEqual(row.proconfig,['search_path=""']);}
  for(const fn of ['ai_live_private.lookup(uuid,uuid,jsonb)','public.ai_live_lookup(uuid,uuid,jsonb)','public.ai_live_feedback(uuid,uuid,boolean,jsonb)','public.ai_live_review(uuid)']){
   for(const role of ['anon','authenticated','service_role'])assert.equal((await db.query('select has_function_privilege($1,$2,\'EXECUTE\') ok',[role,fn])).rows[0].ok,role==='service_role');
  }
  for(const row of before.filter(x=>x.nspname==='ai_live_private'))assert.equal(row.relrowsecurity,true);
  await db.exec(correction);
  assert.deepEqual((await snapshot()).rows,before,'no new columns/tables or changed final ACL/RLS after replay');
  assert.deepEqual((await functions()).rows,functionBefore,'function security/ACL replay stable');
  assert.equal((await call(db,2,{intent:'SELF_TEAM',name:'Synthetic Person9'})).status,'not_found');
 }finally{await db.close();}
});
