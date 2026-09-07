// Diagnostic experiment only. NOT a deployable repair. Synthetic, loopback PostgreSQL.
import {spawn,spawnSync} from 'node:child_process';
import {mkdtemp,readFile,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
const bin=process.argv[2] || path.join(tmpdir(),'lms0723-pg17-runtime/pgsql/bin');
const dir=await mkdtemp(path.join(tmpdir(),'lms0723-concurrency-'));
const data=path.join(dir,'data'); const port='56173';
const env={...process.env}; for(const k of Object.keys(env))if(k.startsWith('PG'))delete env[k];
const run=(exe,args)=>{const r=spawnSync(path.join(bin,exe),args,{env,windowsHide:true,encoding:'utf8',stdio:exe==='pg_ctl.exe'?'ignore':'pipe'});if(r.status!==0)throw Error(`${exe}: ${r.stderr||r.stdout||r.error||r.status}`);return r.stdout;};
let started=false; const sessions=[]; const results=[];
const id=n=>`20000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
class Session{
 constructor(){
  this.pending=null;this.buffer='';this.errors='';
  this.p=spawn(path.join(bin,'psql.exe'),['-X','-qAt','-h','127.0.0.1','-p',port,'-U','postgres','-d','postgres'],{env,windowsHide:true,stdio:'pipe'});
  this.p.stdout.on('data',b=>{this.buffer+=b; if(this.pending&&this.buffer.includes(this.pending.marker)){
   const {resolve,marker,timer}=this.pending;clearTimeout(timer);const out=this.buffer.slice(0,this.buffer.indexOf(marker)).trim();
   this.buffer=this.buffer.slice(this.buffer.indexOf(marker)+marker.length).trimStart();this.pending=null;resolve({out,error:this.errors});this.errors='';
  }});
  this.p.stderr.on('data',b=>this.errors+=b);
  this.p.on('error',e=>this.pending?.reject(e));sessions.push(this);
 }
 q(sql){assert.equal(this.pending,null);return new Promise((resolve,reject)=>{const marker=`DONE_${Math.random().toString(16).slice(2)}`;
  const timer=setTimeout(()=>reject(Error('isolated query timeout')),20000);
  this.pending={resolve,reject,marker,timer};this.p.stdin.write(`${sql}\n;\n\\echo ${marker}\n`);
 });}
 async ok(sql){const r=await this.q(sql);assert.ok(!/ERROR:|FATAL:/.test(r.error),r.error);return r.out;}
}

// Real independent-session verification of the actual corrective migration.
try {
 run('initdb.exe',['-D',data,'-U','postgres','-A','trust','--no-locale','-E','UTF8']);
 run('pg_ctl.exe',['-D',data,'-l',path.join(dir,'server.log'),'-o',`-h 127.0.0.1 -p ${port}`,'-w','start']);started=true;
 const a=new Session(),b=new Session(),gate=new Session();
 const version=await gate.ok('show server_version;');
 const quote=v=>v==null?'null':typeof v==='number'?String(v):`'${(typeof v==='object'?JSON.stringify(v):String(v)).replaceAll("'","''")}'`;
 const adapter={exec:sql=>gate.ok(sql),query:async(sql,params=[])=>{
  const bound=sql.replace(/\$(\d+)/g,(_,n)=>quote(params[Number(n)-1]));
  if(/^\s*select\b/i.test(bound))return{rows:JSON.parse(await gate.ok(`select coalesce(json_agg(x),'[]') from (${bound.replace(/;\s*$/,'')}) x;`))};
  await gate.ok(bound);return{rows:[]};
 }};
 // Reuse the existing production-shaped Live fixture without changing its tests.
 const fixtureUrl=new URL('../test/liveLmsDatabase.test.mjs',import.meta.url);
 const fixtureText=await readFile(fixtureUrl,'utf8');
 const fixtureSource=fixtureText.slice(fixtureText.indexOf('async function fixture(){'),fixtureText.indexOf('async function call(db'))
  .replaceAll('import.meta.url',JSON.stringify(fixtureUrl.href));
 const liveMigration=await readFile(new URL('../supabase/migrations/20260907110701_lms0723_live_intelligence.sql',import.meta.url),'utf8');
 const sessionMigration=await readFile(new URL('../supabase/migrations/20260907131012_lms0723_server_session_validation.sql',import.meta.url),'utf8');
 const createFixture=new Function('PGlite','readFile','id','migration','correction',`${fixtureSource}; return fixture;`);
 await createFixture(function(){return adapter;},readFile,id,liveMigration,sessionMigration)();
 await gate.ok(`alter table auth.users add email text,add email_confirmed_at timestamptz,add email_change text,
  add deleted_at timestamptz,add banned_until timestamptz,add is_anonymous boolean default false,add is_sso_user boolean default false,
  add created_at timestamptz default '2020-01-01',add last_sign_in_at timestamptz;
  alter table members add created_at timestamptz default '2020-01-01';
  alter table user_roles add id uuid default gen_random_uuid() primary key,add created_at timestamptz default '2020-01-01',add updated_at timestamptz default '2020-01-01';
  insert into auth.users(id,email,email_confirmed_at) select r.user_id,m.email,'2020-01-01' from user_roles r join members m on m.id=r.member_id;
  alter table user_roles add foreign key(user_id) references auth.users(id) on delete cascade,add foreign key(member_id) references members(id) on delete set null;
  create unique index users_email_partial_key on auth.users(email) where is_sso_user=false;
  create index user_roles_member_id_idx on user_roles(member_id);
  create index idx_members_email on members(lower(email));
  delete from member_season_ratings where member_id='${id(7)}';
  insert into seasons values('${id(23)}','Synthetic Second Active',true);
  insert into member_season_ratings values('${id(7)}','${id(23)}',null,null,'NR');
  create temp table base_roles as select * from user_roles;
  create temp table base_members as select * from members;
  create temp table base_auth as select * from auth.users;
 `);
 const aclQuery="select json_agg(x order by x.relname) from (select relname,relacl::text from pg_class where oid in('public.members'::regclass,'public.user_roles'::regclass,'public.ai_answer_feedback_events'::regclass)) x;";
 const beforeAcl=await gate.ok(aclQuery);
 let sql=await readFile(new URL('../supabase/migrations/20260907143225_lms0723_identity_coordination.sql',import.meta.url),'utf8');
 // Only the isolated copy has a deterministic barrier immediately before mutation.
 sql=sql.replace(' before_data:=identity_repair_private.role_rows(u,r.member_id);',` IF current_setting('test.barrier',true)='on' THEN PERFORM pg_advisory_xact_lock(4723,1); END IF;
 before_data:=identity_repair_private.role_rows(u,r.member_id);`);
 await gate.ok(sql);assert.equal(await gate.ok(aclQuery),beforeAcl);
 const callRepair=n=>`select identity_repair_private.repair('${id(100+n)}');`;
 async function reset(){
  await gate.ok(`truncate identity_repair_private.reviewed,identity_repair_private.events;
   update identity_repair_private.config set sealed=false;
   delete from user_roles;delete from members where id not in(select id from base_members);delete from auth.users where id not in(select id from base_auth);
   update members m set email=b.email,is_active_member=b.is_active_member from base_members b where m.id=b.id;
   update auth.users a set email=b.email,email_change=null,email_confirmed_at=b.email_confirmed_at,banned_until=null,deleted_at=null from base_auth b where a.id=b.id;
   insert into user_roles select * from base_roles;
   update user_roles set user_id=null where member_id='${id(1)}';
   update user_roles set member_id=null,role='commissioner' where user_id='${id(107)}';
   insert into user_roles(member_id,role,created_at,updated_at) values('${id(7)}','commissioner','2020-01-01','2020-01-01');
  `);
  const manifest=await gate.ok(`select jsonb_build_object('manifest_id','${id(950)}','project_id','glikrmmgirilnmamxxyl',
   'status','PROPOSED_NOT_APPROVED_FOR_MUTATION','candidates',jsonb_build_array(
   jsonb_build_object('auth','${id(101)}','member','${id(1)}','shape','member_row','expected',identity_repair_private.state('${id(101)}','${id(1)}')),
   jsonb_build_object('auth','${id(107)}','member','${id(7)}','shape','identical_split','expected',identity_repair_private.state('${id(107)}','${id(7)}'))))::text;`);
  // Synthetic owner fixture, not a production approval-pin update.
  await gate.ok(`update identity_repair_private.config set approved_manifest_id='${id(950)}',approved_manifest_sha256=encode(sha256(convert_to(${quote(manifest)},'UTF8')),'hex');`);
  assert.equal(await gate.ok(`select identity_repair_private.seal_manifest(${quote(manifest)},'${id(108)}');`),'SEALED');
 }
 async function barrier(){for(let i=0;i<100;i++){
  if(Number(await gate.ok("select count(*) from pg_locks where locktype='advisory' and classid=4723 and objid=1 and not granted;")))return;
  await new Promise(r=>setTimeout(r,20));
 }throw Error('barrier not reached');}
 async function held(n,work){
  await gate.ok('select pg_advisory_lock(4723,1);');
  const pending=a.q(`begin;set local test.barrier='on';${callRepair(n)}commit;`);await barrier();
  try{await work();}finally{await gate.ok('select pg_advisory_unlock(4723,1);');}
  const result=await pending;assert.equal(result.error,'');assert.match(result.out,/REPAIRED/);
 }
 for(const n of [1,7]){
  await reset();
  await held(n,async()=>{
   assert.equal(await b.ok(`begin;${callRepair(n)}commit;`),'BUSY');
   const t=performance.now();await b.ok(`update teams set name=name where id='${id(30)}';`);
   results.push({gate:'unrelated team update',milliseconds:Math.round((performance.now()-t)*100)/100});
  });
  assert.equal(await b.ok(callRepair(n)),'ALREADY_REPAIRED');
  assert.equal(await gate.ok('select count(*) from identity_repair_private.events;'),'1');
  results.push({gate:n===1?'same-identity repair':'concurrent consolidation',result:'BUSY then idempotent no-op; one audit'});
 }
 for(const writer of ['member_insert','member_email_update','auth_insert','auth_state_update','role_insert']){
  await reset();
  if(writer==='member_email_update')await gate.ok(`insert into members(id,email,is_active_member) values('${id(70)}','different@example.invalid',true);`);
  const statements={
   member_insert:`insert into members(id,email,is_active_member) values('${id(70)}','synthetic1@example.invalid',true);`,
   member_email_update:`update members set email='synthetic1@example.invalid' where id='${id(70)}';`,
   auth_insert:`insert into auth.users(id,email,email_confirmed_at,is_sso_user) values('${id(170)}','synthetic1@example.invalid',now(),true);`,
   auth_state_update:`update auth.users set email_change='changed@example.invalid' where id='${id(101)}';`,
   role_insert:`insert into user_roles(user_id,member_id,role) values('${id(109)}','${id(1)}','player');`,
  };
  await held(1,async()=>{
   const start=performance.now();const result=await b.q(`begin;${statements[writer]}commit;`);
   assert.match(result.error,/identity_busy/);assert.ok(performance.now()-start<1500);
  });
  if(writer!=='auth_state_update')assert.match((await b.q(statements[writer])).error,/identity_conflict|duplicate key/);
  else await b.ok(statements[writer]);
  assert.equal(await gate.ok(`select count(*) from members where lower(btrim(email))='synthetic1@example.invalid';`),'1');
  results.push({gate:`exact forward race: ${writer}`,result:writer==='auth_state_update'?'BUSY before mutation; legitimate Auth state update succeeds on retry':'competing writer refused BUSY before repair mutation; competing binding rejected on retry'});
 }
 await reset();
 await b.ok(`insert into members(id,email,is_active_member) values('${id(70)}','synthetic1@example.invalid',true);`);
 assert.equal(await a.ok(callRepair(1)),'STALE');
 results.push({gate:'reverse race: duplicate committed first',result:'STALE; no repair'});
 await reset();
 await b.ok(`begin;update user_roles set role='league_manager',updated_at=now() where member_id='${id(1)}';`);
 assert.equal(await a.ok(callRepair(1)),'BUSY');await b.ok('commit;');assert.equal(await a.ok(callRepair(1)),'STALE');
 assert.equal(await gate.ok(`select role from user_roles where member_id='${id(1)}';`),'league_manager');
 results.push({gate:'role change first',result:'BUSY then STALE; legitimate role preserved'});
 await reset();
 await b.ok(`update members set phone='synthetic changed' where id='${id(1)}';update auth.users set last_sign_in_at=now() where id='${id(101)}';`);
 assert.equal(await a.ok(callRepair(1)),'REPAIRED');
 results.push({gate:'non-material phone/sign-in change',result:'repair succeeds'});
 await reset();
 await a.ok("begin;select identity_repair_private.take_keys(array['opposing-a','opposing-b']);");
 const opposing=await b.q("begin;select identity_repair_private.take_keys(array['opposing-b','opposing-a']);commit;");
 assert.match(opposing.error,/identity_busy/);await a.ok('commit;');
 results.push({gate:'opposing key order',result:'bounded BUSY; no deadlock or fallback'});
 await reset();
 await gate.ok('alter table identity_repair_private.events add constraint synthetic_audit_failure check(false);');
 assert.equal(await a.ok(callRepair(7)),'STALE');
 assert.equal(await gate.ok(`select count(*) from user_roles where user_id='${id(107)}' or member_id='${id(7)}';`),'2');
 assert.equal(await gate.ok('select count(*) from identity_repair_private.events;'),'0');
 await gate.ok('alter table identity_repair_private.events drop constraint synthetic_audit_failure;');
 results.push({gate:'audit constraint failure',result:'entire consolidation rolled back; zero events'});
 for(const role of ['anon','authenticated','service_role']){
  await b.ok(`set role ${role};`);
  assert.match((await b.q(callRepair(1))).error,/permission denied/);
  assert.match((await b.q('select * from identity_repair_private.reviewed;')).error,/permission denied/);
  if(role!=='service_role')assert.match((await b.q(`select public.link_future_existing_member_identity('${id(101)}');`)).error,/permission denied/);
  await b.ok('reset role;');
 }
 results.push({gate:'private support/effective grants',result:'browser and service cannot repair/read manifest; existing ACLs unchanged'});
 // Verify native Auth role can invoke only the hook, not privileged repair helpers.
 await gate.ok('alter table auth.users owner to supabase_auth_admin;grant usage on schema auth to supabase_auth_admin;');
 await b.ok(`set role supabase_auth_admin;update auth.users set email_confirmed_at=now() where id='${id(101)}';reset role;`);
 results.push({gate:'native Auth hook',result:'works without granting Auth role private schema/function access'});
 await reset();assert.equal(await a.ok(callRepair(1)),'REPAIRED');assert.equal(await a.ok(callRepair(7)),'REPAIRED');
 const lookup=async(n,q)=>{await gate.ok('set role service_role;');try{return JSON.parse(await gate.ok(`select ai_live_lookup('${id(100+n)}','${id(600+n)}',${quote(q)}::jsonb)::text;`));}finally{await gate.ok('reset role;');}};
 const choices=await lookup(7,{intent:'SELF_RATING',rating:'season'});assert.equal(choices.status,'ambiguous');assert.equal(choices.choices.length,2);
 for(const season of [id(20),id(23)])assert.equal((await lookup(7,{intent:'SELF_RATING',rating:'season',season})).status,'missing');
 const own=await lookup(1,{intent:'SELF_RATING',rating:'season',season:id(20)});assert.equal(own.subject,id(1));
 assert.equal((await lookup(1,{intent:'PLAYER_CONTACT',name:'Synthetic Person9'})).status,'denied');
 assert.equal((await lookup(2,{intent:'PLAYER_CONTACT',name:'Synthetic Person9'})).status,'not_found');
 assert.equal((await lookup(2,{intent:'PLAYER_CONTACT',name:'Synthetic Person1'})).status,'success');
 await gate.ok('revoke select on members,member_season_ratings from service_role;grant select(id,first_name,last_name,is_active_member) on members to service_role;grant select(member_id,season_id,season_dupr_rating) on member_season_ratings to service_role;');
 assert.equal((await lookup(7,{intent:'SELF_RATING',rating:'season',season:id(20)})).status,'missing');
 results.push({gate:'post-repair Live security/projection',result:'two-season clarification then missing; own subject correct; unrelated named player denied; Captain relationship and email field boundary preserved'});
 process.env.SUPABASE_SERVICE_ROLE_KEY='synthetic-only-receipt-key';
 const {runLive}=await import('../app/lib/liveLmsService.js');
 const captured=[];
 const options={principal:{user:{id:id(107)},receiptBinding:'synthetic-session',authMs:0,supabase:{}},
  lookup:async q=>({data:await lookup(7,q)}),persist:async(_db,build)=>{captured.push(build());}};
 const first=await runLive({...options,body:{question:'What is my Season DUPR?'}});
 assert.equal(first.kind,'clarification');assert.ok(first.conversationReceipt);
 const followup=await runLive({...options,body:{question:'1',conversationReceipt:first.conversationReceipt}});
 assert.equal(followup.kind,'answer');assert.equal(followup.answer,'That requested value is not recorded in the authorized LMS data.');
 for(const payload of captured){
  assert.equal(payload.p_occurrence,null);assert.equal(payload.p_route,null);
  assert.equal(payload.p_outcome.model,null);assert.equal(payload.p_outcome.model_call_skipped,true);
  assert.equal(payload.p_outcome.stage3_invoked,false);assert.equal(payload.p_outcome.input_tokens,0);
  for(const forbidden of [id(107),id(7),'synthetic7@example.invalid','Season DUPR?','identity_repair'])assert.ok(!JSON.stringify(payload).includes(forbidden));
 }
 assert.deepEqual(captured.map(p=>p.p_outcome.reason_code),['ambiguous','missing']);
 results.push({gate:'actual Live service follow-up and capture boundary',result:'encrypted choice receipt resolves missing; telemetry contains no personal facts, IDs or question; zero model/embedding calls'});
 assert.equal(await gate.ok(`select identity_repair_private.rollback_repair('${id(107)}');`),'ROLLED_BACK');
 assert.equal(await gate.ok(`select identity_repair_private.rollback_repair('${id(107)}');`),'ALREADY_ROLLED_BACK');
 assert.equal((await lookup(7,{intent:'SELF_RATING',rating:'season'})).status,'denied');
 results.push({gate:'committed guarded rollback',result:'both Commissioner fragments restored; repeated rollback no-op'});
 const result={syntheticOnly:true,productionMutations:0,serverVersion:version,answerModelCalls:0,embeddingCalls:0,results,status:'PASS'};
 await writeFile(new URL('../../docs/lms-0723-identity-coordination-results.json',import.meta.url),JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify(result,null,2));
} finally {
 for(const s of sessions){s.p.stdin.end('\\q\n');s.p.kill();}
 if(started)run('pg_ctl.exe',['-D',data,'-m','fast','-w','stop']);
}
