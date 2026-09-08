// Diagnostic experiment only. NOT a deployable repair. Synthetic, loopback PostgreSQL.
import {spawn,spawnSync} from 'node:child_process';
import {mkdtemp,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
const bin=process.argv[2] || path.join(tmpdir(),'lms0723-pg17-runtime/pgsql/bin');
const dir=await mkdtemp(path.join(tmpdir(),'lms0724-concurrency-'));
const data=path.join(dir,'data'); const port='56174';
const env={...process.env}; for(const k of Object.keys(env))if(k.startsWith('PG'))delete env[k];
const run=(exe,args)=>{const r=spawnSync(path.join(bin,exe),args,{env,windowsHide:true,encoding:'utf8',stdio:exe==='pg_ctl.exe'?'ignore':'pipe'});if(r.status!==0)throw Error(`${exe}: ${r.stderr||r.stdout||r.error||r.status}`);return r.stdout;};
let started=false; const sessions=[];
import {fixture,id} from '../test/helpers/viewAsFixture.mjs';
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
 let migrationOwnerReady=false;
 const adapter={exec:async sql=>{
  if(!sql.startsWith('-- LMS-0724:'))return gate.ok(sql);
  if(!migrationOwnerReady){
   await gate.ok("create role synthetic_migration_owner nologin createrole bypassrls;grant create on database postgres to synthetic_migration_owner;alter schema public owner to synthetic_migration_owner;alter default privileges for role synthetic_migration_owner grant all on tables to anon,authenticated,service_role;alter default privileges for role synthetic_migration_owner grant all on sequences to anon,authenticated,service_role;");
   const names=JSON.parse(await gate.ok("select json_agg(tablename) from pg_tables where schemaname='public';"));
   for(const name of names)await gate.ok('alter table public.'+name+' owner to synthetic_migration_owner;');
   migrationOwnerReady=true;
  }
  try{return await gate.ok('set role synthetic_migration_owner;'+sql);}finally{await gate.ok('reset role;');}
 },query:async(sql,params=[])=>{
  const bound=sql.replace(/\$(\d+)/g,(_,n)=>quote(params[Number(n)-1]));
  if(/^\s*select\b/i.test(bound))return{rows:JSON.parse(await gate.ok(`select coalesce(json_agg(x),'[]') from (${bound.replace(/;\s*$/,'')}) x;`))};
  await gate.ok(bound);return{rows:[]};
 }};

 await fixture(adapter);
 const migration=await readFile(path.join(process.cwd(),'supabase/migrations/20260907201448_lms0724_view_as.sql'),'utf8');
 const snapshot=()=>gate.ok(`select json_build_object(
 'functions',(select json_agg(x order by signature) from (select oid::regprocedure::text signature,pg_get_userbyid(proowner) owner,prosecdef,proconfig,proacl::text,md5(prosrc) body from pg_proc where pronamespace='view_as_private'::regnamespace or proname in('lms_view_as','lms_view_as_maintenance')) x),
 'indexes',(select json_agg(indexdef order by indexname) from pg_indexes where schemaname='view_as_private'),
 'policies',(select json_agg(x order by tablename,policyname) from (select tablename,policyname,roles,cmd,qual,with_check from pg_policies where policyname like 'view_as_executor%') x),
 'contexts',(select count(*) from view_as_private.contexts),
 'triggers',(select count(*) from pg_trigger where tgrelid in(select oid from pg_class where relnamespace='view_as_private'::regnamespace)),
 'acls',(select json_agg(x order by relname) from (select relname,relacl::text from pg_class where relnamespace='view_as_private'::regnamespace) x));`);
 await gate.ok("create function public.lms_view_as(integer) returns integer language sql as 'select $1';");
 const before=await snapshot();
 await adapter.exec(migration);assert.equal(await snapshot(),before,'first replay changes no function/security/object state');
 await adapter.exec(migration);assert.equal(await snapshot(),before,'second replay changes no function/security/object state');
 await gate.ok('set role synthetic_migration_owner;drop function public.lms_view_as_maintenance();reset role;');
 await adapter.exec(migration);assert.equal(await snapshot(),before,'missing later maintenance object recovered');
 const definition=await gate.ok("select pg_get_functiondef('public.lms_view_as(text,jsonb)'::regprocedure);");
 const drift=async(change,restore)=>{await gate.ok(change);const r=await gate.q('set role synthetic_migration_owner;'+migration);await gate.ok('rollback;reset role;');assert.ok(r.error.includes('LMS-0724 dispatcher definition/owner/security drift'),r.error);await gate.ok(restore);assert.equal(await snapshot(),before);};
 await drift('alter function public.lms_view_as(text,jsonb) owner to postgres;','alter function public.lms_view_as(text,jsonb) owner to lms_view_as_executor;');
 await drift("create or replace function public.lms_view_as(p_op text,p_input jsonb) returns jsonb language plpgsql security definer set search_path='' as 'begin return null;end';",definition);
 await drift("alter function public.lms_view_as(text,jsonb) set search_path=public;",definition);
 await drift('grant execute on function public.lms_view_as(text,jsonb) to anon;','revoke execute on function public.lms_view_as(text,jsonb) from anon;');
 assert.equal(await gate.ok("select rolsuper from pg_roles where rolname='synthetic_migration_owner';"),'f');
 assert.equal(await gate.ok("select public.lms_view_as(17);"),'17');
 console.log(JSON.stringify({cleanApply:'PASS',firstReplay:'PASS',secondReplay:'PASS',partialRecovery:'PASS',wrongOwner:'denied',wrongDefinition:'denied',wrongConfig:'denied',wrongGrant:'denied',overload:'unchanged'}));
 const base={id:id(700),actor:id(107),target:id(1),browser:'b'.repeat(64),code:'c'.repeat(64),context:'d'.repeat(64),binding:'synthetic',credential:'synthetic',expires:new Date(Date.now()+600000).toISOString()};
 const call=(op,input)=>'select lms_view_as('+quote(op)+','+quote(input)+'::jsonb);';
 await gate.ok('set role service_role;'+call('start',base));
 await a.ok('set role service_role;begin;'+call('exchange',base));
 let finished=false;const second=b.ok('set role service_role;'+call('exchange',base)).then(x=>{finished=true;return x;});
 await new Promise(r=>setTimeout(r,150));assert.equal(finished,false,'second exchange waits on same context row');
 await a.ok('commit;');assert.equal(JSON.parse(await second).denied,true);
  assert.equal(await gate.ok("reset role;select count(*) from view_as_private.audit_events where event='VIEW_AS_STARTED';"),'1');
 await a.ok('begin;'+call('resolve',base));
 let exited=false;const ending=b.ok(call('end',base)).then(x=>{exited=true;return x;});
 await new Promise(r=>setTimeout(r,150));assert.equal(exited,false);
 await a.ok('commit;');assert.equal(JSON.parse(await ending).ended,true);
 assert.equal(JSON.parse(await a.ok(call('resolve',base))).denied,true);
 console.log(JSON.stringify({version,handoffRace:'one winner / one denied',exitReadRace:'serialized; subsequent read denied'}));
}finally{for(const session of sessions)session.p.kill();if(started)run('pg_ctl.exe',['-D',data,'-m','immediate','-w','stop']);}
