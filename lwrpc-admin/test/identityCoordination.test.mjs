import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {reconcileSignedInAccount} from '../app/lib/accountIdentity.js';
import {ensureAssignedMemberRole} from '../app/lib/identityRoleWriter.js';
const migration=await readFile(new URL('../supabase/migrations/20260907143225_lms0723_identity_coordination.sql',import.meta.url),'utf8');
const id=n=>`30000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
async function fixture(){
 const db=new PGlite();
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create role supabase_auth_admin;create schema auth;
 create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,email_change text,deleted_at timestamptz,banned_until timestamptz,is_anonymous boolean default false,is_sso_user boolean default false,created_at timestamptz default '2020-01-01',last_sign_in_at timestamptz);
 create unique index users_email_partial_key on auth.users(email) where is_sso_user=false;
 create table members(id uuid primary key,email text,is_active_member boolean,created_at timestamptz default '2020-01-01',phone text);
 create table user_roles(id uuid primary key default gen_random_uuid(),user_id uuid unique references auth.users on delete cascade,member_id uuid references members on delete set null,role text not null default 'player',created_at timestamptz default '2020-01-01',updated_at timestamptz default '2020-01-01');
 insert into auth.users(id,email,email_confirmed_at) values('${id(1)}','one@example.invalid',now()),('${id(2)}','two@example.invalid',now());
 insert into members(id,email,is_active_member) values('${id(11)}','one@example.invalid',true),('${id(12)}','two@example.invalid',true);
 insert into user_roles(id,user_id,member_id,role) values('${id(21)}',null,'${id(11)}','captain'),('${id(22)}','${id(2)}','${id(12)}','commissioner');
 alter default privileges grant all on tables to anon,authenticated,service_role;
 alter default privileges grant execute on functions to anon,authenticated,service_role;`);
 await db.exec(migration);return db;
}
async function reviewedText(db,shape='member_row'){
 return (await db.query(`select jsonb_build_object('manifest_id',$1::text,'project_id','glikrmmgirilnmamxxyl',
  'status','PROPOSED_NOT_APPROVED_FOR_MUTATION','candidates',jsonb_build_array(jsonb_build_object(
  'auth',$2::text,'member',$3::text,'shape',$4::text,'expected',identity_repair_private.state($2::uuid,$3::uuid))))::text s`,[id(99),id(1),id(11),shape])).rows[0].s;
}
async function approveSynthetic(db,text){
 // Isolated owner fixture only: never alter the production approval pin.
 await db.query(`update identity_repair_private.config set approved_manifest_id=$1,
  approved_manifest_sha256=encode(sha256(convert_to($2,'UTF8')),'hex')`,[id(99),text]);
}
async function seal(db,shape='member_row'){
 const text=await reviewedText(db,shape);await approveSynthetic(db,text);
 return (await db.query('select identity_repair_private.seal_manifest($1,$2) s',[text,id(2)])).rows[0].s;
}
const repair=async db=>(await db.query('select identity_repair_private.repair($1) s',[id(1)])).rows[0].s;
test('0723 identity manifest pins existing roles, repair/audit/replay/committed rollback',async()=>{
 const db=await fixture();try{
  assert.equal(await seal(db),'SEALED');assert.equal(await repair(db),'REPAIRED');assert.equal(await repair(db),'ALREADY_REPAIRED');
  const rows=(await db.query('select * from identity_repair_private.events')).rows;assert.equal(rows.length,1);assert.equal(rows[0].operation,'link_member_row');assert.ok(!JSON.stringify(rows).includes('@'));
  assert.equal((await db.query('select role,user_id from user_roles where id=$1',[id(21)])).rows[0].role,'captain');
  assert.equal((await db.query('select identity_repair_private.rollback_repair($1) s',[id(1)])).rows[0].s,'ROLLED_BACK');
  assert.equal((await db.query('select user_id from user_roles where id=$1',[id(21)])).rows[0].user_id,null);
  assert.equal((await db.query('select identity_repair_private.rollback_repair($1) s',[id(1)])).rows[0].s,'ALREADY_ROLLED_BACK');
 }finally{await db.close();}
});
test('0723 expected-state refuses role change, preserves non-material phone and auth activity',async()=>{
 for(const [change,expected] of [
  [`update user_roles set role='league_manager' where id='${id(21)}'`,'STALE'],
  [`update members set phone='synthetic' where id='${id(11)}';update auth.users set last_sign_in_at=now() where id='${id(1)}'`,'REPAIRED'],
  [`update members set is_active_member=false where id='${id(11)}'`,'STALE'],
  [`update auth.users set email_change='pending@example.invalid' where id='${id(1)}'`,'STALE'],
 ]){
  const db=await fixture();try{assert.equal(await seal(db),'SEALED');await db.exec(change);assert.equal(await repair(db),expected);}finally{await db.close();}
 }
});
test('0723 identical split preserves Commissioner, rejects new references and distinct roles',async()=>{
 for(const variation of ['same','different','reference']){
  const db=await fixture();try{
   await db.exec(`update user_roles set role='commissioner' where id='${id(21)}';insert into user_roles(id,user_id,role) values('${id(23)}','${id(1)}','commissioner');`);
   assert.equal(await seal(db,'identical_split'),'SEALED');
   if(variation==='different')await db.exec(`update user_roles set role='captain' where id='${id(21)}'`);
   if(variation==='reference')await db.exec(`create table synthetic_reference(role_id uuid references user_roles(id));insert into synthetic_reference values('${id(21)}')`);
   assert.equal(await repair(db),{same:'REPAIRED',different:'STALE',reference:'REFERENCE_REVIEW'}[variation]);
   if(variation==='same'){
    assert.deepEqual((await db.query('select id,role,user_id,member_id from user_roles where user_id=$1',[id(1)])).rows[0],{id:id(23),role:'commissioner',user_id:id(1),member_id:id(11)});
    assert.equal((await db.query('select identity_repair_private.rollback_repair($1) s',[id(1)])).rows[0].s,'ROLLED_BACK');
    assert.equal((await db.query('select count(*)::int n from user_roles where user_id=$1 or member_id=$2',[id(1),id(11)])).rows[0].n,2);
   }
  }finally{await db.close();}
 }
});
test('0723 default grants, private support, browser denial and native Auth hook boundary',async()=>{
 const db=await fixture();try{
  await db.exec('alter table auth.users owner to supabase_auth_admin;grant usage on schema auth to supabase_auth_admin;');
  for(const role of ['anon','authenticated','service_role']){
   await db.exec(`set role ${role}`);
   await assert.rejects(db.query('select identity_repair_private.repair($1)',[id(1)]),/permission/);
   await assert.rejects(db.exec('select * from identity_repair_private.events'),/permission/);
   if(role!=='service_role')await assert.rejects(db.query('select public.link_future_existing_member_identity($1)',[id(1)]),/permission/);
   await db.exec('reset role');
  }
  await db.exec(`set role supabase_auth_admin;update auth.users set email_confirmed_at=now() where id='${id(1)}';reset role;`);
  assert.equal((await db.query("select count(*)::int n from pg_trigger where not tgisinternal and tgrelid='auth.users'::regclass")).rows[0].n,1);
 }finally{await db.close();}
});
test('0723 prospective linking never provisions roles or repairs old backlog; both orderings',async()=>{
 const db=await fixture();try{
  assert.equal((await db.query('select public.link_future_existing_member_identity($1) s',[id(1)])).rows[0].s,'REVIEW_REQUIRED');
  await db.exec(`insert into auth.users(id,email,email_confirmed_at,created_at) values('${id(3)}','future@example.invalid',now(),clock_timestamp());
   insert into members(id,email,is_active_member,created_at) values('${id(13)}','future@example.invalid',true,clock_timestamp());`);
  assert.equal((await db.query('select public.link_future_existing_member_identity($1) s',[id(3)])).rows[0].s,'PENDING');
  await db.exec(`insert into user_roles(member_id,role,created_at) values('${id(13)}','player',clock_timestamp())`);
  assert.equal((await db.query('select count(*)::int n from user_roles where user_id=$1',[id(3)])).rows[0].n,1);
  await db.exec(`insert into members(id,email,is_active_member,created_at) values('${id(14)}','memberfirst@example.invalid',true,clock_timestamp());
   insert into user_roles(member_id,role,created_at) values('${id(14)}','captain',clock_timestamp());
   insert into auth.users(id,email,email_confirmed_at,created_at) values('${id(4)}','memberfirst@example.invalid',now(),clock_timestamp());`);
  assert.equal((await db.query('select public.link_future_existing_member_identity($1) s',[id(4)])).rows[0].s,'LINKED');
  assert.equal((await db.query('select count(*)::int n from identity_repair_private.events where actor_kind=\'system\'')).rows[0].n,2);
 }finally{await db.close();}
});
test('0723 account endpoint binds only server-verified subject, errors expose no identity',async()=>{
 const req=new Request('http://local.invalid',{method:'POST',body:JSON.stringify({p_user:id(2),member:id(12)})});let calls=0;
 const result=await reconcileSignedInAccount(req,{authenticate:async()=>({user:{id:id(1)}}),createDatabase:()=>({rpc:(name,args)=>{
  calls++;assert.equal(name,'link_future_existing_member_identity');assert.deepEqual(args,{p_user:id(1)});return{abortSignal:async signal=>{assert.ok(signal instanceof AbortSignal);return{data:'LINKED'};}};
 }})});assert.deepEqual(result,{httpStatus:200,status:'linked'});assert.equal(calls,1);
 assert.deepEqual(await reconcileSignedInAccount(req,{authenticate:async()=>{throw Error('synthetic auth error');},createDatabase:()=>{throw Error('must not query');}}),{httpStatus:401,status:'not_authorized'});
 const busy=await reconcileSignedInAccount(req,{authenticate:async()=>({user:{id:id(1)}}),createDatabase:()=>({rpc:()=>({abortSignal:async()=>({error:{message:'protected diagnostic'}})})})});
 assert.deepEqual(busy,{httpStatus:503,status:'retry_later'});
});
test('0723 ordinary role writers report busy/stale rows and never downgrade or overwrite identity',async()=>{
 for(const kind of ['busy','stale','higher','multiple']){
  let writes=0;const filters=[];
  const builder={select(){return this;},eq(k,v){filters.push([k,v]);return this;},
   async maybeSingle(){return kind==='multiple'?{error:{code:'PGRST116'}}:{data:{id:id(21),role:kind==='higher'?'commissioner':'player'}};},
   update(payload){writes++;assert.deepEqual(Object.keys(payload).sort(),['role','updated_at']);return this;},
   async single(){return kind==='busy'?{error:{code:'55P03'}}:{data:null};}};
  const result=await ensureAssignedMemberRole({from:()=>builder},id(11),'captain');
  if(kind==='higher'){assert.equal(result,null);assert.equal(writes,0);}else assert.match(result,/busy or changed/);
  if(kind==='multiple')assert.equal(writes,0);
  if(writes)assert.ok(filters.some(([k,v])=>k==='role'&&v==='player'));
 }
});

test('0723 exact manifest checksum admits 16 approved entries, rejects substitution, and isolates stale peers',async()=>{
 const db=await fixture();try{
  for(let n=3;n<=17;n++)await db.exec(`insert into auth.users(id,email,email_confirmed_at) values('${id(n)}','synthetic${n}@example.invalid',now());
   insert into members(id,email,is_active_member) values('${id(100+n)}','synthetic${n}@example.invalid',true);
   insert into user_roles(member_id,role) values('${id(100+n)}','player');`);
  const text=(await db.query(`select jsonb_build_object('manifest_id',$1::text,'project_id','glikrmmgirilnmamxxyl',
   'status','PROPOSED_NOT_APPROVED_FOR_MUTATION','candidates',(select jsonb_agg(jsonb_build_object('auth',a.id,'member',m.id,
    'shape','member_row','expected',identity_repair_private.state(a.id,m.id)) order by a.id)
    from auth.users a join members m on a.email=m.email join user_roles r on r.member_id=m.id where r.user_id is null))::text s`,[id(99)])).rows[0].s;
  assert.equal(JSON.parse(text).candidates.length,16);
  const sealText=async value=>(await db.query('select identity_repair_private.seal_manifest($1,$2) s',[value,id(2)])).rows[0].s;
  assert.equal(await sealText(text),'MANIFEST_MISMATCH'); // Production pin cannot accept synthetic batch.
  await approveSynthetic(db,text);
  assert.equal(await sealText(text+' '),'MANIFEST_MISMATCH');
  assert.equal(await sealText(text.replace(id(3),id(80))),'MANIFEST_MISMATCH');
  await db.exec(`update user_roles set role='league_manager' where id='${id(21)}'`);
  assert.equal(await sealText(text),'SEALED'); // Never refresh stale expected state.
  assert.equal(await repair(db),'STALE');
  assert.equal((await db.query('select identity_repair_private.repair($1) s',[id(3)])).rows[0].s,'REPAIRED');
  assert.equal((await db.query('select identity_repair_private.repair($1) s',[id(80)])).rows[0].s,'NOT_REVIEWED');
  assert.equal(await sealText(text),'SEALED');
  assert.equal((await db.query('select count(*)::int n from identity_repair_private.reviewed')).rows[0].n,16);
  assert.equal((await db.query('select count(*)::int n from identity_repair_private.events')).rows[0].n,1);
  assert.equal((await db.query('select run_id from identity_repair_private.events')).rows[0].run_id,id(99));
 }finally{await db.close();}
});
