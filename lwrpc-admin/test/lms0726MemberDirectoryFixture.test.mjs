import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {pageFixture,id} from './helpers/viewAsPageFixture.mjs';
import {classifyFixtureRpc,executeFixtureReadRpc} from './helpers/fixtureRpcManifest.mjs';
const context={credential:'synthetic-service',readOnly:true};
const definition=await readFile(new URL('./fixtures/lms0726-member-directory.sql',import.meta.url),'utf8');

test('0726 read RPC manifest denies unknown, writes, View-As mutation and wrong credential',async()=>{
 assert.equal(classifyFixtureRpc('admin_member_directory_page',context).kind,'READ');
 for(const name of ['admin_master_reset_all','unknown_mutating_rpc','lms_view_as','constructor'])assert.throws(()=>classifyFixtureRpc(name,context),/denied/);
 assert.throws(()=>classifyFixtureRpc('admin_master_reset_all',{readOnly:false}),/denied/);
 assert.equal(classifyFixtureRpc('admin_master_reset_all',{readOnly:false,allowedWrites:['admin_master_reset_all']}).kind,'WRITE');
 assert.throws(()=>classifyFixtureRpc('admin_member_directory_page',{credential:'synthetic-anon'}),/denied/);
});

test('0726 exact member directory SQL executes read-only with search, roles, roster filters and paging',async()=>{
 const db=await pageFixture();try{
  await db.exec(definition);
  await db.query('update members set is_active_member=false where id=$1',[id(9)]);
  const before=(await db.query('select jsonb_agg(to_jsonb(m) order by id) data from members m')).rows[0].data;
  const read=body=>executeFixtureReadRpc(db,'admin_member_directory_page',body,context);
  const all=await read({p_include_inactive:true});assert.equal(all.total_count,9);assert.equal(all.rows.length,9);
  const active=await read({});assert.equal(active.filtered_count,8);
  const found=await read({p_search:'Person2'});assert.deepEqual(found.rows.map(r=>r.id),[id(2)]);assert.equal(found.rows[0].user_roles[0].role,'captain');assert.ok(found.rows[0].teams.length);
  assert.equal((await read({p_search:'does not exist'})).rows.length,0);
  assert.equal((await read({p_search:'   '})).filtered_count,8);
  assert.equal((await read({p_offset:999})).rows.length,0);
  assert.equal((await read({p_limit:0})).rows.length,1);
  const descending=await read({p_sort_direction:'desc',p_offset:1,p_limit:2});assert.deepEqual(descending.rows.map(r=>r.id),[id(7),id(6)]);
  const roster=await read({p_current_roster_only:true});assert.ok(roster.rows.some(r=>r.id===id(2)));assert.ok(!roster.rows.some(r=>r.id===id(8)));
  assert.equal((await read({p_sort_key:'role',p_sort_direction:'desc'})).rows[0].id,id(8));
  assert.deepEqual((await db.query('select jsonb_agg(to_jsonb(m) order by id) data from members m')).rows[0].data,before);
  await assert.rejects(read({unreviewed:true}),/argument/);
  // A deliberately corrupted SQL implementation is still blocked by transaction mode.
  await db.exec(definition.replace(/AS \$function\$[\s\S]*?\$function\$/, () => "AS $$with changed as (delete from public.members returning id) select jsonb_build_object('count',count(*)) from changed$$"));
  await assert.rejects(read({}),/read-only/);
  assert.deepEqual((await db.query('select jsonb_agg(to_jsonb(m) order by id) data from members m')).rows[0].data,before);
 }finally{await db.close();}
});

