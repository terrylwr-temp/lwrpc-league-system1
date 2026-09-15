// Diagnostic experiment only. NOT a deployable repair. Synthetic, loopback PostgreSQL.
import {spawn,spawnSync} from 'node:child_process';
import {mkdtemp,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
const bin=process.argv[2] || path.join(tmpdir(),'lms0723-pg17-runtime/pgsql/bin');
const dir=await mkdtemp(path.join(tmpdir(),'lms0726-page-read-races-'));
const data=path.join(dir,'data'); const port='56186';
const env={...process.env}; for(const k of Object.keys(env))if(k.startsWith('PG'))delete env[k];
const run=(exe,args)=>{const r=spawnSync(path.join(bin,exe),args,{env,windowsHide:true,encoding:'utf8',stdio:exe==='pg_ctl.exe'?'ignore':'pipe'});if(r.status!==0)throw Error(`${exe}: ${r.stderr||r.stdout||r.error||r.status}`);return r.stdout;};
let started=false; const sessions=[];
import {pageFixture,id} from '../test/helpers/viewAsPageFixture.mjs';
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


try{
 run('initdb.exe',['-D',data,'-U','postgres','-A','trust','--no-locale','-E','UTF8']);
 run('pg_ctl.exe',['-D',data,'-l',path.join(dir,'server.log'),'-o',`-h 127.0.0.1 -p ${port}`,'-w','start']);started=true;
 const gate=new Session(),reader=new Session(),writer=new Session();
 const quote=v=>v==null?'null':typeof v==='number'?String(v):`'${(typeof v==='object'?JSON.stringify(v):String(v)).replaceAll("'","''")}'`;
 const adapter={exec:sql=>gate.ok(sql),query:async(sql,params=[])=>{const bound=sql.replace(/\$(\d+)/g,(_,n)=>quote(params[Number(n)-1]));if(/^\s*select\b/i.test(bound))return{rows:JSON.parse(await gate.ok(`select coalesce(json_agg(x),'[]') from (${bound.replace(/;\s*$/,'')}) x;`))};await gate.ok(bound);return{rows:[]};}};
 await pageFixture(adapter);
 const sql=await readFile(process.env.LMS0726_READ_MIGRATION || 'supabase/migrations/20260909014356_lms0726_view_as_real_ui_reads.sql','utf8');
 await gate.ok(sql);await gate.ok(sql);await gate.ok(sql);
 const proof={id:id(770),actor:id(107),target:id(2),browser:'b'.repeat(64),code:'c'.repeat(64),context:'d'.repeat(64),binding:'synthetic',credential:'synthetic',expires:new Date(Date.now()+600000).toISOString()};
 const call=(op,input=proof)=>`select public.lms_view_as(${quote(op)},${quote(input)}::jsonb);`;
 await gate.ok('set role service_role;'+call('start')+call('exchange')+'reset role;');
 const page=call('page_read',{...proof,contract:'dashboard',args:{}});
 const initial=JSON.parse(await reader.ok('set role service_role;begin;'+page));assert.ok(initial.viewer.managed.includes(id(30)));
 let changed=false;const revocation=writer.ok(`update public.teams set captain_member_id=null where id='${id(30)}';`).then(()=>changed=true);
 await new Promise(r=>setTimeout(r,200));assert.equal(changed,false,'team revocation waits for authorized read');await reader.ok('commit;');await revocation;
 const revoked=JSON.parse(await reader.ok(page));assert.deepEqual(revoked.viewer.managed,[]);assert.ok(!revoked.tables.members.some(r=>r.id===id(1)&&r.email));
 await writer.ok(`update public.teams set captain_member_id='${id(2)}' where id='${id(30)}';`);
 await reader.ok('begin;'+page);let unpublished=false;const publication=writer.ok(`update public.matches set is_published=false where id='${id(50)}';`).then(()=>unpublished=true);
 await new Promise(r=>setTimeout(r,200));assert.equal(unpublished,false);await reader.ok('commit;');await publication;
 const hidden=JSON.parse(await reader.ok(page));assert.ok(!hidden.tables.matches.some(m=>m.id===id(50)));await writer.ok(`update public.matches set is_published=true where id='${id(50)}';`);
 await reader.ok('begin;'+page);const writerPid=await writer.ok('select pg_backend_pid();');let hierarchyChanged=false;
 const hierarchy=writer.ok(`update public.leagues set is_active=false where id='${id(21)}';`).then(()=>hierarchyChanged=true);
 await new Promise(r=>setTimeout(r,200));assert.equal(hierarchyChanged,false);assert.equal(await gate.ok(`select wait_event_type from pg_stat_activity where pid=${writerPid};`),'Lock');
 await reader.ok('commit;');await hierarchy;const inactive=JSON.parse(await reader.ok(page));assert.ok(inactive.viewer.managed.includes(id(30)));assert.equal(inactive.tables.leagues.find(l=>l.id===id(21)).is_active,false);
 await writer.ok(`update public.leagues set is_active=true where id='${id(21)}';begin;update public.user_roles set role='player' where member_id='${id(2)}';`);
 let readDone=false;const afterRole=reader.ok(page).then(text=>{readDone=true;return JSON.parse(text);});await new Promise(r=>setTimeout(r,200));assert.equal(readDone,false,'read waits for role revocation');await writer.ok('commit;');const lower=await afterRole;assert.ok(lower.denied===true||lower.viewer?.role==='player');if(lower.viewer)assert.deepEqual(lower.viewer.managed,[]);
 for(const role of ['anon','authenticated','service_role']){const denied=await gate.q(`set role ${role};select view_as_private.page_read('{}','dashboard','{}');`);assert.match(denied.error,/permission denied/);await gate.ok('reset role;');}
 await gate.ok(`update view_as_private.contexts set expires_at=clock_timestamp()-interval '1 second';`);assert.equal(JSON.parse(await reader.ok(page)).denied,true);
 console.log(JSON.stringify({postgres:await gate.ok('show server_version;'),cleanApply:true,replay:2,teamRevocationSerialized:true,roleRevocationSerialized:true,hierarchyChangeSerialized:true,authorizedHistoricalScopePreserved:true,publicationRevocationSerialized:true,publicHelperDenied:true,expiredDenied:true,business:'Only explicitly seeded synthetic race mutations; no production connection.'},null,2));
}finally{for(const session of sessions)session.p.stdin.end('\\q\n');if(started)run('pg_ctl.exe',['-D',data,'-m','immediate','-w','stop']);}
