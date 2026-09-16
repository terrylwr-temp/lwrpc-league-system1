import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fixture,id,source} from './helpers/uploadWorkingDatabase.mjs';
import {asService} from './helpers/ratingsSourceDatabase.mjs';
import {ratingsUploadRequest,verifyUpload,signUpload} from '../app/lib/seasonRatingsUploadServer.js';
import {finishRatingsUpload,uploadCompletionSummary} from '../app/lib/seasonRatingsUploadResult.js';
const deployed=fs.readFileSync(new URL('./fixtures/ratingsUpload/deployed-functions.sql',import.meta.url),'utf8');
const csv='duprId,doubles,doublesReliability,metrics,""\nABC123,3.237,30,"{ ""subscores"": {""doubles"": {""over_65"":3.478}}}"';
const args={actor:id(101),token:'session',secret:'local-only-secret'};
async function setup(){const db=await fixture();await db.exec(deployed);await db.exec('delete from member_season_ratings');return db;}
function client(db){return {rpc(name,params){return {abortSignal:async()=>{
 try {const q=name==='season_ratings_workflow_preview'?'select public.season_ratings_workflow_preview($1,$2,$3,$4) result':'select public.season_ratings_workflow_commit($1,$2) result';const values=name==='season_ratings_workflow_preview'?[params.p_actor,params.p_season,params.p_operation,params.p_upload]:[params.p_actor,params.p_payload];return {data:(await asService(db,q,values)).rows[0].result};}
 catch(error){return {error};}
 }};}};}
const preview=(db,extra={})=>ratingsUploadRequest({...args,db:client(db),...extra,body:{action:'preview',seasonId:id(20),csv,...extra.body}});
const commit=(db,p,extra={})=>ratingsUploadRequest({...args,db:client(db),...extra,body:{action:'commit',confirmed:true,seasonId:id(20),receipt:p.receipt,...extra.body}});
const state=async db=>(await db.query("select jsonb_build_object('ratings',(select jsonb_agg(to_jsonb(r) order by member_id) from member_season_ratings r),'sources',(select jsonb_agg(to_jsonb(s) order by member_id) from ratings_source_private.sources s),'batches',(select count(*) from ratings_source_private.batches)) s")).rows[0].s;

test('unchanged source after Delete recreates missing working inputs, full precision, finals blank, exact replay',async()=>{const db=await setup();try{
 await db.query('insert into ratings_source_private.sources values($1,$2,$3,1,now(),$4)',[id(20),id(1),source(30,'3.237',3.478),id(900)]);
 const before=await state(db),p=await preview(db);assert.deepEqual(await state(db),before);assert.equal(p.rows[0].action,'FILL');assert.deepEqual(p.rows[0].fills,{doubles:'3.237',rf:30,age:3.478});
 const result=await commit(db,p);assert.equal(result.counts.doubles,1);assert.equal(result.counts.rf,1);assert.equal(result.counts.age,1);
 const stored=(await db.query('select * from member_season_ratings')).rows[0];assert.equal(stored.dupr_doubles_rating,'3.237');assert.equal(Number(stored.dupr_reliability_rating),30);assert.equal(Number(stored.dupr_age_based_rating),3.478);assert.equal(stored.season_dupr_rating,null);assert.equal(stored.season_primetime_rating,null);
 const after=await state(db);assert.deepEqual(await commit(db,p),result);assert.deepEqual(await state(db),after);
 const repeat=await preview(db);assert.equal(repeat.rows[0].action,'RECORD');assert.deepEqual(repeat.rows[0].fills,{});assert.match(repeat.rows[0].reason,/already populated/);
 await commit(db,repeat);assert.deepEqual((await state(db)).ratings,after.ratings);
}finally{await db.close();}});

test('both seasons independently fill missing rows and preserve populated inputs, zero RF, final ratings and notes',async()=>{const db=await setup();try{
 await db.query('insert into seasons values($1,$2,true)',[id(21),'Second season']);
 await db.query('insert into member_season_ratings(member_id,season_id,dupr_doubles_rating,dupr_reliability_rating,season_dupr_rating,season_primetime_rating,notes) values($1,$2,$3,0,4.1,4.2,$4)',[id(1),id(20),'NR','keep']);
 const p=await preview(db);assert.deepEqual(p.rows[0].fills,{age:3.478});await commit(db,p);
 const second=await preview(db,{body:{seasonId:id(21)}});await commit(db,second,{body:{seasonId:id(21)}});
 const rows=(await db.query('select * from member_season_ratings order by season_id')).rows;assert.equal(rows.length,2);assert.equal(rows[0].dupr_doubles_rating,'NR');assert.equal(Number(rows[0].dupr_reliability_rating),0);assert.equal(Number(rows[0].season_dupr_rating),4.1);assert.equal(Number(rows[0].season_primetime_rating),4.2);assert.equal(rows[0].notes,'keep');assert.equal(rows[1].dupr_doubles_rating,'3.237');
}finally{await db.close();}});

test('concurrent input change rejects the whole commit without overwriting data',async()=>{const db=await setup();try{const p=await preview(db);await db.query('insert into member_season_ratings(member_id,season_id,dupr_doubles_rating) values($1,$2,$3)',[id(1),id(20),'4.111']);const before=await state(db);await assert.rejects(commit(db,p),/changed/);assert.deepEqual(await state(db),before);}finally{await db.close();}});

test('database failure rolls back sources and ratings together',async()=>{const db=await setup();try{
 await db.exec("create function public.fail_upload() returns trigger language plpgsql as $$begin raise exception 'synthetic write failure';end$$; create trigger reject_fixture before insert on public.member_season_ratings for each row execute function public.fail_upload()");const p=await preview(db),before=await state(db);await assert.rejects(commit(db,p),/synthetic write failure/);assert.deepEqual(await state(db),before);
}finally{await db.close();}});

test('nonmatching, duplicate, inactive and invalid rows cannot write working ratings',async()=>{const db=await setup();try{
 await db.query('update members set is_active_member=false where id=$1',[id(2)]);
 const p=await preview(db,{body:{csv:'duprId,doubles,doublesReliability\nUNKNOWN,3.237,30\nABC123,3.237,30\nABC123,3.237,30\nDEF456,3.237,30\n,3.237,30'}});assert.equal(p.counts.ready,0);assert.equal(p.receipt,null);
 const invalid=await preview(db,{body:{csv:'duprId,doubles,doublesReliability\nABC123,3.237,29.5'}});assert.equal(invalid.counts.ready,0);assert.equal(invalid.rows[0].action,'REVIEW');
}finally{await db.close();}});

test('real DB role checks deny player/captain and revoked manager; upload endpoint denies other operations',async()=>{const db=await setup();try{
 await assert.rejects(preview(db,{actor:id(102)}),/Only|authorization/);await db.query("update user_roles set role='captain' where user_id=$1",[id(102)]);await assert.rejects(preview(db,{actor:id(102)}),/Only|authorization/);
 const p=await preview(db);await db.query("update user_roles set role='player' where user_id=$1",[id(101)]);await assert.rejects(commit(db,p),/Only|authorization/);
 for(const operation of ['clean','clear','transfer'])await assert.rejects(preview(db,{body:{operation}}),/Upload only/);
}finally{await db.close();}});

test('receipt tampering/session/season/expiry/old policy and missing confirmation fail before commit',async()=>{const db=await setup();try{
 const p=await preview(db);
 for(const extra of [{token:'other'},{body:{seasonId:id(21)}},{body:{confirmed:false}},{body:{receipt:p.receipt+'x'}},{now:Date.now()+700000}])await assert.rejects(commit(db,p,extra));
 const raw=verifyUpload(p.receipt,args.actor,args.token,args.secret);await assert.rejects(commit(db,{receipt:signUpload({...raw,operation:'clean'},args.actor,args.token,args.secret)}));
 await assert.rejects(commit(db,{receipt:signUpload({...raw,policy:'source-only-v1'},args.actor,args.token,args.secret)}));assert.equal((await db.query('select count(*) as n from member_season_ratings')).rows[0].n,0);
}finally{await db.close();}});

test('success uses actual counts, clears stale state before refresh, and refresh failure retains success',async()=>{
 const events=[],actual={counts:{affected:1,doubles:1,rf:1,age:1,protectedFields:2,missing:0,inactive:0,review:0}};
 await finishRatingsUpload({commit:async()=>actual,clearPreview:()=>events.push('cleared'),showSuccess:r=>events.push(uploadCompletionSummary(r,'Second season')),refresh:async()=>{events.push('refetched');throw Error('read failure');},showRefreshError:()=>events.push('refresh error')});
 assert.equal(events[0],'cleared');assert.match(events[1],/1 member rows processed/);assert.match(events[1],/Second season/);assert.deepEqual(events.slice(2),['refetched','refresh error']);
 const retained=[];await assert.rejects(finishRatingsUpload({commit:async()=>{throw Error('transaction failure');},clearPreview:()=>retained.push('clear'),showSuccess:()=>retained.push('success'),refresh:()=>retained.push('refresh')}));assert.deepEqual(retained,[]);
});
