// Diagnostic experiment only. NOT a deployable repair. Synthetic, loopback PostgreSQL.
import {spawn,spawnSync} from 'node:child_process';
import {mkdtemp,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
const bin=process.argv[2] || path.join(tmpdir(),'lms0723-pg17-runtime/pgsql/bin');
const dir=await mkdtemp(path.join(tmpdir(),'lms0726-page-read-races-'));
const data=path.join(dir,'data'); const port='56188';
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
 run('initdb.exe',['-D',data,'-U','postgres','-A','trust','--no-locale','-E','UTF8']);run('pg_ctl.exe',['-D',data,'-l',path.join(dir,'server.log'),'-o',`-h 127.0.0.1 -p ${port}`,'-w','start']);started=true;
 const gate=new Session();const quote=v=>v==null?'null':typeof v==='number'?String(v):`'${(typeof v==='object'?JSON.stringify(v):String(v)).replaceAll("'","''")}'`;
 const adapter={exec:s=>gate.ok(s),query:async(s,p=[])=>{s=s.replace(/\$(\d+)/g,(_,n)=>quote(p[Number(n)-1]));if(/^\s*select\b/i.test(s))return{rows:JSON.parse(await gate.ok(`select coalesce(json_agg(x),'[]') from (${s.replace(/;\s*$/,'')}) x`))};await gate.ok(s);return{rows:[]}}};
 await pageFixture(adapter);await gate.ok(await readFile('test/fixtures/lms0726-member-directory.sql','utf8'));
 const tables=(await adapter.query("select tablename from pg_tables where schemaname='public' order by 1")).rows;
 const fingerprint=async()=>{let rows=[];for(const {tablename}of tables)rows.push(await gate.ok(`select coalesce(jsonb_agg(to_jsonb(t) order by to_jsonb(t)::text),'[]') from public.${tablename} t`));return JSON.stringify(rows)};
 const before=await fingerprint();const cases=[];
 for(const args of ['',"p_search=>'Person2'","p_search=>'missing'","p_sort_key=>'role',p_sort_direction=>'desc',p_limit=>1"]){cases.push(JSON.parse(await gate.ok(`begin read only; select public.admin_member_directory_page(${args}); commit;`)))}
 assert.equal(cases[0].total_count,9);assert.equal(cases[1].rows[0].id,id(2));assert.equal(cases[2].rows.length,0);assert.equal(cases[3].rows[0].id,id(8));assert.equal(await fingerprint(),before);
 const dispatcher=await gate.ok("select pg_get_functiondef('public.lms_view_as(text,jsonb)'::regprocedure)");const maint=await gate.ok("select pg_get_functiondef('public.lms_view_as_maintenance()'::regprocedure)");
 const grantQuery="select table_name,column_name,privilege_type from information_schema.column_privileges where table_schema='public' and grantee='lms_view_as_reader' order by 1,2,3";
 const grants=(await adapter.query(grantQuery)).rows;const prior=new Set(grants.map(r=>JSON.stringify(r)));
 await gate.ok(await readFile('supabase/migrations/20260909014356_lms0726_view_as_real_ui_reads.sql','utf8'));await gate.ok('select public.lms_view_as_maintenance()');assert.equal(await fingerprint(),before);
 const proof={id:id(777),actor:id(107),target:id(2),browser:'b'.repeat(64),code:'c'.repeat(64),context:'d'.repeat(64),binding:'synthetic',credential:'synthetic',expires:new Date(Date.now()+600000).toISOString()};const call=op=>`select public.lms_view_as(${quote(op)},${quote(proof)}::jsonb);`;
 await gate.ok('set role service_role;'+call('start')+call('exchange')+'reset role;');const snapshot=await gate.ok('set role service_role;'+call('snapshot')+'reset role;');
 let removal='begin;\n'+dispatcher+';\n';for(const name of ['view_as_private.page_read','lms_read_private.people','lms_read_private.competition','lms_read_private.lock_viewer'])removal+=`drop function ${name}(jsonb,text,jsonb);\n`;
 for(const r of (await adapter.query("select tablename from pg_policies where schemaname='public' and policyname='lms0726_internal_page_read'")).rows)removal+=`drop policy lms0726_internal_page_read on public.${r.tablename};\n`;
 for(const r of (await adapter.query(grantQuery)).rows)if(!prior.has(JSON.stringify(r)))removal+=`revoke ${r.privilege_type}(${r.column_name}) on public.${r.table_name} from lms_view_as_reader;\n`;
 removal+='commit;';await gate.ok(removal);assert.equal(await gate.ok('set role service_role;'+call('snapshot')+'reset role;'),snapshot);await gate.ok('select public.lms_view_as_maintenance()');assert.equal(await fingerprint(),before);assert.equal(await gate.ok("select pg_get_functiondef('public.lms_view_as_maintenance()'::regprocedure)"),maint);assert.deepEqual((await adapter.query(grantQuery)).rows,grants);assert.equal(JSON.parse(await gate.ok('begin read only;select public.admin_member_directory_page();commit;')).total_count,9);
 console.log(JSON.stringify({postgres:await gate.ok('show server_version'),directoryReadOnly:true,cases:cases.map(r=>({count:r.filtered_count,ids:r.rows.map(x=>x.id)})),upgradeBusinessRowsUnchanged:true,sqlRemovalBusinessRowsUnchanged:true,acceptedSnapshotAfterRemoval:true,acceptedDirectoryAfterRemoval:true,maintenanceUnchanged:true,readerGrantsRestored:true,removalSql:removal},null,2));
}finally{for(const session of sessions)session.p.stdin.end('\\q\n');if(started)run('pg_ctl.exe',['-D',data,'-m','immediate','-w','stop']);}
