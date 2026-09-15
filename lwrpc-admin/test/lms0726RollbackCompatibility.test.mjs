import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {pageFixture,id} from './helpers/viewAsPageFixture.mjs';

test('0726 additive migration preserves accepted snapshot/context/maintenance for application-only rollback',async()=>{
 const db=await pageFixture();try{
  const tables=(await db.query("select tablename from pg_tables where schemaname='public' order by tablename")).rows.map(r=>r.tablename);
  const business=async()=>Object.fromEntries(await Promise.all(tables.map(async t=>[t,(await db.query('select row_to_json(r) data from public.'+t+' r')).rows.map(r=>JSON.stringify(r.data)).sort()])));
  const before=await business();
  const proof={id:id(770),actor:id(107),target:id(2),browser:'b'.repeat(64),code:'c'.repeat(64),context:'d'.repeat(64),binding:'synthetic',credential:'synthetic',expires:new Date(Date.now()+600000).toISOString()};
  const call=async(op,args=proof)=>{await db.exec('set role service_role');try{return (await db.query('select public.lms_view_as($1,$2) result',[op,args])).rows[0].result;}finally{await db.exec('reset role');}};
  await call('start');await call('exchange');const accepted=await call('snapshot');assert.ok(!accepted.denied);
  const maintenance=(await db.query("select pg_get_functiondef('public.lms_view_as_maintenance()'::regprocedure) body")).rows[0].body;
  await db.exec(await readFile(new URL('../supabase/migrations/20260909014356_lms0726_view_as_real_ui_reads.sql',import.meta.url),'utf8'));
  assert.deepEqual(await business(),before);
  assert.ok((await call('page_read',{...proof,contract:'dashboard',args:{}})).viewer);
  await db.exec('select public.lms_view_as_maintenance()');
  // Restored accepted application uses snapshot/status; additive SQL remains installed.
  assert.deepEqual(await call('snapshot'),accepted);assert.ok(!(await call('resolve')).denied);
  assert.equal((await db.query("select pg_get_functiondef('public.lms_view_as_maintenance()'::regprocedure) body")).rows[0].body,maintenance);
  await db.query("update view_as_private.contexts set expires_at=clock_timestamp()-interval '1 minute' where id=$1",[proof.id]);
  await db.exec('select public.lms_view_as_maintenance()');assert.equal((await call('snapshot')).denied,true);
  await db.exec('select public.lms_view_as_maintenance()');
  assert.equal((await db.query("select count(*)::int n from view_as_private.audit_events where context_id=$1 and event='VIEW_AS_ENDED' and reason='expiration'",[proof.id])).rows[0].n,1);
  assert.deepEqual(await business(),before);
 }finally{await db.close();}
});

