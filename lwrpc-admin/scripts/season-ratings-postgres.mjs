// Synthetic PostgreSQL 17 on loopback only; no environment database URL is used.
import { spawn, spawnSync } from 'node:child_process';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { schema, migration, id, payload } from '../test/helpers/ratingsSourceDatabase.mjs';
const bin = path.join(tmpdir(), 'lms0723-pg17-runtime/pgsql/bin');
const dir = await mkdtemp(path.join(tmpdir(), 'ratings-source-test-'));
const data = path.join(dir, 'data'), port = '56203';
const env = { ...process.env }; for (const k of Object.keys(env)) if (k.startsWith('PG')) delete env[k];
const run = (exe,args) => { const r=spawnSync(path.join(bin,exe),args,{env,windowsHide:true,encoding:'utf8',stdio:exe==='pg_ctl.exe'?'ignore':'pipe'}); if(r.status!==0)throw Error(r.stderr||r.stdout||String(r.error)); };
const sessions=[];
class Session {
  constructor() {
    this.buffer='';this.errors='';this.pending=null;
    this.p=spawn(path.join(bin,'psql.exe'),['-X','-qAt','-h','127.0.0.1','-p',port,'-U','postgres','-d','postgres'],{env,windowsHide:true,stdio:'pipe'});
    this.p.stdout.on('data',b=>{this.buffer+=b;if(this.pending&&this.buffer.includes(this.pending.marker)){const {resolve,marker,timer}=this.pending;clearTimeout(timer);const out=this.buffer.slice(0,this.buffer.indexOf(marker)).trim();this.buffer=this.buffer.slice(this.buffer.indexOf(marker)+marker.length).trimStart();this.pending=null;resolve({out,error:this.errors});this.errors='';}});
    this.p.stderr.on('data',b=>{this.errors+=b;});sessions.push(this);
  }
  q(sql) { assert.equal(this.pending,null);return new Promise((resolve,reject)=>{const marker='DONE_'+Math.random().toString(16).slice(2);const timer=setTimeout(()=>reject(Error('Local query timeout')),15000);this.pending={resolve,marker,timer};this.p.stdin.write(sql+'\n;\n\\echo '+marker+'\n');}); }
  async ok(sql) { const r=await this.q(sql);assert.doesNotMatch(r.error,/ERROR:|FATAL:/);return r.out; }
}
const quote=x=>"'"+JSON.stringify(x).replaceAll("'","''")+"'::jsonb";
const call=p=>`set role service_role;select public.season_ratings_source_commit('${id(101)}',${quote(p)});reset role;`;
let started=false;
try {
  run('initdb.exe',['-D',data,'-U','postgres','-A','trust','--no-locale','-E','UTF8']);
  run('pg_ctl.exe',['-D',data,'-l',path.join(dir,'server.log'),'-o',`-h 127.0.0.1 -p ${port}`,'-w','start']);started=true;
  const a=new Session(),b=new Session();
  await a.ok(schema);await a.ok(migration);
  const fingerprint=()=>a.ok("select jsonb_agg(to_jsonb(r) order by member_id) from member_season_ratings r");
  const frozen=await fingerprint();
  await a.ok(`begin;update members set first_name='Concurrent legitimate write' where id='${id(1)}';`);
  const t=Date.now();const blocked=await b.q(call(payload()));assert.match(blocked.error,/lock timeout/);assert.ok(Date.now()-t<3000);
  await a.ok('rollback;');await b.ok('reset role;');
  assert.equal(await a.ok('select count(*) from ratings_source_private.sources'),'0');
  await a.ok(`insert into members values('${id(3)}','Duplicate','Inactive','ABC123',false);`);
  assert.match((await b.q(call(payload()))).error,/identity changed/);await b.ok('reset role;');await a.ok(`delete from members where id='${id(3)}';`);
  await b.ok(call(payload()));
  const next=payload({id:id(901)});next.updates.forEach(x=>{x.expectedRevision=1;x.data.rf=30;});
  await b.ok('begin;'+call(next));
  assert.match((await a.q(`set lock_timeout='100ms';update members set dupr_id='ABC124' where id='${id(1)}';`)).error,/lock timeout/);
  await b.ok('rollback;');await a.ok("set lock_timeout='0';");
  assert.equal(await a.ok('select max(revision) from ratings_source_private.sources'),'1');
  // Full-size import measures time under the production-compatible table lock.
  await a.ok(`insert into members select ('00000000-0000-0000-0000-'||lpad(n::text,12,'0'))::uuid,'Synthetic','Fixture','ID'||n,true from generate_series(3,879)n;`);
  const large=payload({id:id(902)});large.updates=Array.from({length:879},(_,i)=>({line:i+2,duprId:i===0?'ABC123':i===1?'DEF456':'ID'+(i+1),memberId:id(i+1),expectedRevision:i<2?1:0,data:{doubles:'3.237',rf:29,ageMissing:true,rfMissing:false,doublesMissing:false}}));
  const start=Date.now();await b.ok(call(large));const duration=Date.now()-start;assert.ok(duration<5000);
  assert.equal(await a.ok('select count(*) from ratings_source_private.sources'),'879');
  assert.equal(await fingerprint(),frozen);
  const result={postgres:await a.ok('show server_version'),loopbackOnly:true,memberWriteContention:'import aborts within 1s lock timeout',identityPhantom:'rejected',identityWriteDuringCommit:'blocked',outerRollback:'no source changes',batch879Ms:duration,seasonDataUnchanged:true};
  await writeFile(new URL('../../docs/season-ratings-postgres-results.json',import.meta.url),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
} finally {
  for(const s of sessions)s.p.kill();
  if(started)run('pg_ctl.exe',['-D',data,'-m','immediate','-w','stop']);
}
