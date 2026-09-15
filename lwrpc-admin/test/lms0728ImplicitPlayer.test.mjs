import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {implicitPlayerFixture,migrationName,readMigration} from './helpers/implicitPlayerFixture.mjs';
const sql=await readMigration(migrationName);
import {implicitMatrix} from './helpers/implicitPlayerMatrix.mjs';

test('0728 normal implicit Player and explicit role precedence remain unchanged',async()=>{
 const source=await readFile(new URL('../app/lib/memberLookup.js',import.meta.url),'utf8');
 const scope={ROLE_LEVELS:{player:1,captain:2,club_pro:3,league_manager:4,commissioner:5}};vm.createContext(scope);
 vm.runInContext(source.replace(/^import .*;\r?$/gm,'').replaceAll('export ','')+'\nglobalThis.resolve=highestRoleForMembers;',scope);
 assert.equal(scope.resolve([{id:'valid',is_active_member:true,user_roles:[]}]),'player');
 for(const role of Object.keys(scope.ROLE_LEVELS))assert.equal(scope.resolve([{user_roles:[{role}]}]),role);
 assert.equal(scope.resolve([{user_roles:[{role:'captain'},{role:'player'},{role:'club_pro'}]}]),'club_pro');
 const login=await readFile(new URL('../app/login/page.js',import.meta.url),'utf8');assert.match(login,/highestRoleForMembers\(activeMembers/);
});
test('0728 implicit Player role, page and Live privacy matrix',async()=>{const db=await implicitPlayerFixture();try{await implicitMatrix(db);}finally{await db.close();}});
test('0728 rollback and partial recovery retain metadata and business data',async()=>{const db=await implicitPlayerFixture();try{
 const meta=async()=>(await db.query("select oid,proowner,proacl,proconfig,prosecdef from pg_proc where pronamespace='view_as_private'::regnamespace order by oid")).rows;
 const before=await meta();await db.exec(sql);assert.deepEqual(await meta(),before);
 const rollback=await readFile(new URL('../../docs/lms-0728-rollback.sql',import.meta.url),'utf8');await db.exec(rollback);
 const onlyRole=sql.slice(sql.indexOf('create or replace function view_as_private.member_role'),sql.indexOf('create or replace function view_as_private.lookup'));
 await db.exec(onlyRole);await db.exec(sql);await db.exec(rollback);assert.deepEqual(await meta(),before);
 await db.exec('alter function view_as_private.member_role(uuid) security definer');await assert.rejects(db.exec(sql),/drift/);await db.exec('rollback');
}finally{await db.close();}});
