// Synthetic local semantic check. No production configuration or connection.
import {spawnSync} from 'node:child_process';
import {mkdtemp,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {dashboardFixtureSql} from '../test/helpers/normalDashboardFixtureQuery.mjs';
const bin=path.join(tmpdir(),'lms0723-pg17-runtime/pgsql/bin');
const dir=await mkdtemp(path.join(tmpdir(),'lms0726-fixture-semantics-'));
const env={...process.env};for(const key of Object.keys(env))if(key.startsWith('PG'))delete env[key];
const run=(name,args)=>{const r=spawnSync(path.join(bin,name),args,{env,windowsHide:true,encoding:'utf8',stdio:name==='pg_ctl.exe'?'ignore':'pipe'});if(r.status!==0)throw Error(r.stderr||r.stdout||String(r.error));return r.stdout;};
let started=false;
try{
 run('initdb.exe',['-D',dir,'-U','postgres','-A','trust']);
 run('pg_ctl.exe',['-D',dir,'-o','-h 127.0.0.1 -p 56187','-w','start']);started=true;
 const sql=s=>run('psql.exe',['-X','-qAt','-v','ON_ERROR_STOP=1','-h','127.0.0.1','-p','56187','-U','postgres','-d','postgres','-c',s]).trim();
 const testSource=await readFile('test/lms0726FixtureFilters.test.mjs','utf8');
 await sql(testSource.match(/await db\.exec\(`([\s\S]*?)`\);/)[1]);
 const outcomes=[];
 for(const [division,league,status,expected]of [['10','1','verified',[1,2,3]],['20','1','verified',[5]],['10','2','verified',[6]],['10','1','pending',[7]],['99','1','verified',[]],['','1','verified',[]]]){
  const params=new URLSearchParams({select:'id,match_lines!inner(matches!inner(league_id,division_id,score_status))','match_lines.matches.league_id':`in.(${league})`,'match_lines.matches.division_id':`in.(${division})`,'match_lines.matches.score_status':`eq.${status}`,or:'(home_score.not.is.null,away_score.not.is.null,game_status.not.is.null)'});
  const query=dashboardFixtureSql(params);const quote=v=>"'"+String(v).replaceAll("'","''")+"'";
  const bound=query.text.replace(/\$(\d+)/g,(_,n)=>{const v=query.values[Number(n)-1];return Array.isArray(v)?'ARRAY['+v.map(quote).join(',')+']':quote(v);});
  const result=JSON.parse(sql(`select coalesce(json_agg(t.id),'[]') from (${bound}) t`));assert.deepEqual(result,expected);outcomes.push({division,league,status,ids:result});
 }
 console.log(JSON.stringify({postgres:sql('show server_version'),passed:true,cases:outcomes},null,2));
}finally{if(started)run('pg_ctl.exe',['-D',dir,'-m','immediate','-w','stop']);}
