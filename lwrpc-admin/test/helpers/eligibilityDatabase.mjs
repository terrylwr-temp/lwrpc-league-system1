import {runEligibility} from '../../app/lib/aiEligibilityService.js';
import {catalog,sourceDatabase} from './eligibilityFixture.mjs';
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {fixture,id} from './viewAsFixture.mjs';
const read=name=>readFile(new URL('../../'+name,import.meta.url),'utf8');
export async function eligibilityDatabase(db){
 db=await fixture(db);
 for(const f of ['supabase-ai-assistant-lms-0712-stage6.sql','supabase-ai-assistant-lms-0716-stage7a.sql','supabase/migrations/20260907110701_lms0723_live_intelligence.sql'])await db.exec(await read(f));
 await db.exec('revoke usage on schema auth from ai_live_session_reader');
 for(const f of ['20260907131012_lms0723_server_session_validation.sql','20260908011413_lms0724_view_as_authorization_locks.sql','20260908114532_lms0725_clarification_choices.sql'])await db.exec(await read('supabase/migrations/'+f));
 await db.exec(`alter table member_season_ratings add column dupr_reliability_rating numeric(6,3);update member_season_ratings set dupr_reliability_rating=80,dupr_doubles_rating='3.7';`);
 await db.exec(`update member_season_ratings set dupr_reliability_rating=28.999 where member_id='${id(1)}'`);
 return db;
}
export async function eligibilityMatrix(db){
 const sql=await read('supabase/migrations/20260908203904_lms0725_eligibility_self.sql');
 const meta=async()=> (await db.query("select oid::regprocedure::text signature,proowner,prosecdef,proacl,proconfig from pg_proc where proname in ('lookup','ai_live_lookup','lms_view_as') order by oid")).rows;
 const rls=async()=>(await db.query("select polname,polrelid,polroles,pg_get_expr(polqual,polrelid) qual from pg_policy order by oid")).rows;
 const beforeRls=await rls();
 const before=await meta();for(let i=0;i<3;i++){await db.exec(sql);assert.deepEqual(await meta(),before);}
 assert.deepEqual(await rls(),beforeRls);
 const lookup=async(actor,q)=>{await db.exec('set role service_role');try{return(await db.query('select public.ai_live_lookup($1,$2,$3) result',[actor,id(990),q])).rows[0].result;}finally{await db.exec('reset role');}};
 const q={intent:'ELIGIBILITY_SELF',subjectKind:'SELF',rating:'season',season:id(20)};
 for(const n of [1,2,3,4,5,7,8]){const r=await lookup(id(100+n),q);assert.equal(r.status,'success');assert.equal(Number(r.rf),n===1?28.999:80);assert.deepEqual(Object.keys(r).sort(),['rating','rf','season','seasonRef','sourceIsNr','status','value']);}
 for(const extra of [{subjectKind:'EXPLICIT_PERSON',name:'Synthetic Person9'},{member:id(9)},{subject:id(9)},{target:id(9)}])assert.equal((await lookup(id(101),{...q,...extra})).status,'denied');
 for(const n of [102,105,108])assert.equal((await lookup(id(n),{...q,subjectKind:'EXPLICIT_PERSON',subject:id(9)})).status,'denied');
 for(const role of ['anon','authenticated']){await db.exec('set role '+role);await assert.rejects(db.query('select public.ai_live_lookup($1,$2,$3)',[id(101),id(991),q]));await db.exec('reset role');}
 const proof={id:id(770),actor:id(108),target:id(1),browser:'b'.repeat(64),code:'c'.repeat(64),context:'d'.repeat(64),binding:'synthetic',credential:'synthetic',expires:new Date(Date.now()+600000).toISOString()};
 const call=async(op,extra={})=>{await db.exec('set role service_role');try{return(await db.query('select public.lms_view_as($1,$2) result',[op,{...proof,...extra}])).rows[0].result;}finally{await db.exec('reset role');}};
 await call('start');await call('exchange');
 const v=await call('live',{request:id(992),query:q});assert.equal(v.status,'success');assert.equal(Number(v.rf),28.999);
 process.env.SUPABASE_SERVICE_ROLE_KEY='synthetic-eligibility-view-only';
 await db.exec(`update member_season_ratings set dupr_reliability_rating=29 where member_id='${id(1)}';update member_season_ratings set dupr_reliability_rating=30 where member_id='${id(8)}';`);
 const effectiveAnswer=await runEligibility({body:{question:'Can I play DUPR5?'},principal:{user:{id:id(108)},receiptBinding:'synthetic-view',supabase:sourceDatabase()},origin:'view_as',viewerId:proof.id,loadCatalog:async()=>catalog,lookup:async query=>({data:await call('live',{request:id(996),query:{...query,season:id(20)}})}),persist:async()=>true});assert.equal(effectiveAnswer.eligibility.classification,'NR');
 const forged=await call('live',{target:id(8),request:id(993),query:q});assert.ok(forged.denied||forged.status==='denied');
 const wrong=await call('live',{request:id(994),query:{...q,member:id(8)}});assert.equal(wrong.status,'denied');
 await call('end');assert.equal((await call('live',{request:id(995),query:q})).denied,true);
 await db.exec(`update members set is_active_member=false where id='${id(9)}'`);assert.equal((await lookup(id(109),q)).status,'denied');
 await db.exec(`update members set is_active_member=true where id='${id(9)}';delete from user_roles where user_id='${id(109)}';`);assert.equal((await lookup(id(109),q)).status,'denied');
 const audit=(await db.query("select actor,target,intent,decision from ai_live_private.access_audit where intent='ELIGIBILITY_SELF'")).rows;assert.ok(audit.some(a=>a.actor===id(108)&&a.target===id(8)));assert.ok(audit.some(a=>a.decision==='denied'));
 const viewAudit=(await db.query("select actor,effective_member,subject from view_as_private.audit_events where capability='ELIGIBILITY_SELF' and event='SENSITIVE_READ'")).rows;assert.equal(viewAudit.length,2);assert.ok(viewAudit.every(a=>a.actor===id(108)&&a.effective_member===id(1)&&a.subject===id(1))); 
 process.env.SUPABASE_SERVICE_ROLE_KEY='synthetic-eligibility-matrix-only';
 let telemetryWrites=0;
 for(const question of ['Can I play DUPR5?',"What is my Reliability Factor?",'Can I play PrimeTime 9?']){
 const result=await runEligibility({body:{question},principal:{user:{id:id(106)},receiptBinding:'synthetic',supabase:sourceDatabase()},loadCatalog:async()=>catalog,lookup:async query=>({data:await lookup(id(106),{...query,season:id(20)})}),persist:async(_db,make)=>{const args=make();assert.doesNotMatch(JSON.stringify(args),/sourceIsNr|dupr_reliability|member_id/);await db.exec('set role service_role');try{await db.query('select public.capture_ai_quality($1,$2,$3,$4)',[args.p_outcome,null,null,null]);telemetryWrites++;}finally{await db.exec('reset role');}return true;}});assert.notEqual(result.kind,'technical_error');}
 assert.equal(telemetryWrites,3);assert.equal(Number((await db.query("select count(*) n from ai_request_outcomes where resolver_classification='eligibility_deterministic'")).rows[0].n),3);
 await db.exec(await readFile(new URL('../../../docs/lms-0725-eligibility-rollback.sql',import.meta.url),'utf8'));assert.deepEqual(await meta(),before);assert.deepEqual(await rls(),beforeRls);
 assert.equal((await db.query("select has_column_privilege('lms_view_as_executor','public.member_season_ratings','dupr_reliability_rating','SELECT') allowed")).rows[0].allowed,false);
 return {rollback:'PASS',telemetryOutcomes:3,rlsUnchanged:true,inactiveMember:'DENIED',revokedRole:'DENIED',apply:'PASS',replay:'PASS',secondReplay:'PASS',metadataPreserved:true,selfRoles:7,wrongSubject:'DENIED',browser:'DENIED',forgedViewTarget:'DENIED',effectiveRf:'PASS',audit:'PASS'};
}
