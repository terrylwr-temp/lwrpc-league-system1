import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fixture} from './helpers/viewAsFixture.mjs';
const sql=await readFile(new URL('../supabase/migrations/20260907201448_lms0724_view_as.sql',import.meta.url),'utf8');
const contract=JSON.parse(await readFile(new URL('./fixtures/lms0724-production-columns.json',import.meta.url),'utf8'));
test('0724 independent production column contract, minimum effective grants and missing-column failure',async()=>{const db=await fixture();try{
 const expected=contract.columns;
 for(const row of expected){const actual=(await db.query("select udt_name from information_schema.columns where table_schema='public' and table_name=$1 and column_name=$2",[row.table_name,row.column_name])).rows;assert.equal(actual[0]?.udt_name,row.udt_name,row.table_name+'.'+row.column_name);}
 const declared=[...sql.matchAll(/grant select\(([^)]+)\).*?on public\.(\w+) to lms_view_as_executor;/g)].flatMap(m=>m[1].split(',').map(column_name=>({table_name:m[2],column_name})));
 assert.deepEqual(declared.map(r=>r.table_name+'.'+r.column_name).sort(),expected.map(r=>r.table_name+'.'+r.column_name).sort());
 assert.equal((await db.query("select count(*)::int n from information_schema.columns where table_schema='public' and table_name='teams' and column_name='location_id'")).rows[0].n,0);
 await assert.rejects(db.exec('select t.location_id from public.teams t'),/does not exist/);
 await assert.rejects(db.exec('grant select(location_id) on public.teams to lms_view_as_executor'),/does not exist/);
 for(const table of [...new Set(expected.map(r=>r.table_name))]){
  const columns=(await db.query("select column_name from information_schema.columns where table_schema='public' and table_name=$1",[table])).rows;
  assert.equal((await db.query("select has_table_privilege('lms_view_as_executor',$1,'SELECT') p",['public.'+table])).rows[0].p,false);
  for(const {column_name} of columns){const privileges=(await db.query("select has_column_privilege('lms_view_as_executor',$1,$2,'SELECT') s,has_column_privilege('lms_view_as_executor',$1,$2,'UPDATE') u",['public.'+table,column_name])).rows[0];assert.equal(privileges.s,expected.some(r=>r.table_name===table&&r.column_name===column_name));const updateColumn={members:'id',user_roles:'member_id',seasons:'id',leagues:'id',divisions:'id',teams:'id',team_members:'member_id'}[table];assert.equal(privileges.u,column_name===updateColumn);}
 }
}finally{await db.close();}});
