import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {handleReviewRequest} from '../app/lib/aiReviewHttp.js';
import {reviewFilters,reviewToken,readReviewToken,reviewAction,reviewDetail,reviewSource,reviewReport} from '../app/lib/aiReviewService.js';
import {consumeReviewRetest,feedbackPercent,reviewRoleAllowed} from '../app/lib/aiReviewShared.js';
import {adminNavigationSections} from '../app/lib/adminNavigation.js';
import {isNavigationPathActive} from '../app/lib/navigationActiveState.js';
process.env.SUPABASE_SERVICE_ROLE_KEY='isolated-review-signing-fixture-only';
const user=randomUUID(),caseId=randomUUID(),answer=randomUUID(),group=randomUUID();

for(const role of ['commissioner','league_manager','club_pro','captain','player',null])test(`0718 server authorization ${role||'anonymous'}`,async()=>{
 const allowed=reviewRoleAllowed(role);let reads=0;
 const authorize=async()=>role?{role,user:{id:user},supabase:{rpc:async()=>{reads++;return {data:{grounded:2}};}}}:{error:'denied',status:401};
 const r=await handleReviewRequest(new Request('http://local/api/ai-assistant/review?tab=summary'),authorize);
 assert.equal(r.status,allowed?200:role?403:401);assert.equal(reads,allowed?1:0);assert.match(r.headers.get('cache-control'),/no-store/);
 if(!allowed)for(const suffix of ['', '?op=source']){
  const denied=await handleReviewRequest(new Request('http://local/api/ai-assistant/review'+suffix,{method:'POST',body:'{}'}),authorize);
  assert.equal(denied.status,role?403:401);assert.equal(reads,0);
 }
 const menu=adminNavigationSections(role).flatMap(s=>s.cards);assert.equal(menu.some(c=>c.path==='/ai-assistant/review'),allowed);
});
test('0718 each manager navigation leaf highlights alone',()=>{
 const cards=adminNavigationSections('commissioner').flatMap(s=>s.cards);
 for(const path of ['/ai-assistant','/ai-assistant/console','/ai-assistant/review'])for(const suffix of ['','/']){
  const active=cards.filter(c=>isNavigationPathActive(path+suffix,c.path,[],c.exact));assert.equal(active.length,1);assert.equal(active[0].path,path);
 }
});
test('0718 bounded filters, literal search and zero denominators',()=>{
 assert.throws(()=>reviewFilters(new URLSearchParams({limit:'500'})),/filters/);
 assert.throws(()=>reviewFilters(new URLSearchParams({search:'x'.repeat(201)})),/filters/);
 assert.throws(()=>reviewFilters(new URLSearchParams({from:'invalid'})),/date/);
 assert.equal(reviewFilters(new URLSearchParams({search:'%_query'})).search,'%_query');
 assert.equal(feedbackPercent(1,22),'4.55%');assert.equal(feedbackPercent(0,0),'No feedback');
});
test('0718 actor-bound signed review tokens and server-derived mutation identity',async()=>{
 const token=reviewToken({user,caseId,revision:3,cutoff:'2026-09-05T12:00:00Z'});
 assert.equal(readReviewToken(token,user).revision,3);assert.throws(()=>readReviewToken(token,randomUUID()),/Refresh/);
 assert.throws(()=>readReviewToken(token+'x',user),/Refresh/);
 let call;const db={rpc:async(name,args)=>{call={name,args};return {data:{revision:4}};}};
 await reviewAction(db,{token,operation:randomUUID(),action:'category',value:'ai_retrieval_selection',note:'Test passed'},user);
 assert.equal(call.args.p_actor,user);assert.equal(call.args.p_revision,3);
 await assert.rejects(reviewAction(db,{token,operation:randomUUID(),actor:randomUUID(),action:'note',note:'Forged'},user),/Invalid/);
 await assert.rejects(reviewAction({rpc:async()=>({error:{message:'review_revision_conflict'}})},{token,operation:randomUUID(),action:'note',note:'Note'},user),e=>e.status===409);
});
test('0718 cursor is bound to actor, filter and reporting cutoff',async()=>{
 const rows=Array.from({length:26},(_,i)=>({id:randomUUID(),latest_activity:`2026-09-05T12:00:${String(i).padStart(2,'0')}Z`,sort_priority:2}));
 let args;const db={rpc:async(name,a)=>{args=a;return {data:{rows}};}};
 const p=new URLSearchParams({from:'2026-09-01',to:'2026-09-06'});const first=await reviewReport(db,p,user);assert.equal(first.rows.length,25);assert.ok(first.next);
 p.set('cursor',first.next);await reviewReport(db,p,user);assert.equal(args.p_filters.asof,first.asof);
 p.set('search','different');await assert.rejects(reviewReport(db,p,user),/Filters changed/);
});
test('0718 prefill consumes once, expires, retains effective text and never executes',()=>{
 let value=JSON.stringify({question:'Effective question',expires:2000});const storage={getItem:()=>value,removeItem:()=>{value=null;}};
 assert.equal(consumeReviewRetest(storage,1000),'Effective question');assert.equal(consumeReviewRetest(storage,1000),null);
 value=JSON.stringify({question:'Old',expires:500});assert.equal(consumeReviewRetest(storage,1000),null);
});
function database(records) {
 const calls=[];
 return {calls,from(table){const predicates=[];const q={select(fields){calls.push({table,fields});return q;},eq(k,v){predicates.push([k,v]);return q;},order(){return q;},limit(){return q;},async maybeSingle(){const rows=records[table]||[];return {data:rows.find(r=>predicates.every(([k,v])=>r[k]===v))||null};}};return q;},rpc(){return {eq(){return this;},async maybeSingle(){return {data:{helpful:false,event_count:2}};}};},storage:{from(){return {async createSignedUrl(){return {data:{signedUrl:'https://official.example/fixture.pdf?token=synthetic'}};}};}}};
}
test('0718 detail joins retained answer snapshot, hides actor IDs, does not acknowledge unseen wall time',async()=>{
 const records={ai_review_occurrences:[{id:randomUUID(),answer_id:answer,group_id:group,original_question:'Original',effective_question:'Effective',recorded_at:'2026-09-05T12:00:00Z',source_snapshot:[],selection_snapshot:{candidates:[]},assistant_version:'LMS-0717'}],
  ai_answer_feedback_events:[{id:randomUUID(),answer_id:answer,generated_answer:'Retained answer',created_at:'2026-09-05T13:00:00Z'}],ai_request_outcomes:[{id:answer,final_kind:'answer',completed_at:'2026-09-05T11:59:59Z'}],
  ai_manager_review_cases:[{id:caseId,group_id:group,revision:2,created_at:'2026-09-05T12:00:00Z'}]};
 const db=database(records);const d=await reviewDetail(db,new URLSearchParams({answer}),user);
 assert.equal(d.output,'Retained answer');assert.equal(d.effective,'Effective');assert.equal(d.currentFeedback,false);assert.equal(d.legacy,false);
 assert.equal(readReviewToken(d.reviewToken,user).cutoff,'2026-09-05T13:00:00Z');
 assert.ok(db.calls.every(c=>!c.fields.includes('auth_user_id')&&!c.fields.includes('actor_user_id')));
 records.ai_request_outcomes=[];records.ai_review_occurrences=[];const legacy=await reviewDetail(database(records),new URLSearchParams({answer}),user);
 assert.equal(legacy.legacy,true);assert.equal(legacy.completedAt,null);assert.equal(legacy.reviewToken,null);
});
test('0718 historical source preserves cited version and rejects mismatched chunk/guessed source',async()=>{
 const doc=randomUUID(),version=randomUUID(),chunk=randomUUID();
 const records={ai_answer_feedback_events:[{id:randomUUID(),answer_id:answer,original_question:'Question',generated_answer:'Answer',source_snapshot:[{documentId:doc,documentVersionId:version,chunkId:chunk}]}],
  ai_document_versions:[{id:version,document_id:doc,processing_status:'ready',storage_bucket:'official',storage_path:'old.pdf',document:{id:doc,active_version_id:randomUUID(),status:'active',title:'Official historical fixture'}}],
  ai_document_chunks:[{id:chunk,document_version_id:version,page_number:9}]};
 const s=await reviewSource(database(records),answer,0,user);assert.equal(s.historical,true);assert.match(s.url,/#page=9$/);
 await assert.rejects(reviewSource(database(records),answer,1,user),/unavailable/);
 records.ai_document_chunks[0].document_version_id=randomUUID();await assert.rejects(reviewSource(database(records),answer,0,user),/unavailable/);
});
test('0718 UI has bounded modal, honest health, history and manual retest without player edits',async()=>{
 const page=await readFile(new URL('../app/ai-assistant/review/page.js',import.meta.url),'utf8');
 const css=await readFile(new URL('../app/ai-assistant/review/review.module.css',import.meta.url),'utf8');
 assert.match(page,/showModal/);assert.match(page,/Status decision|status decision/);assert.match(page,/health\?\.status==='degraded'\?'Degraded':'Unknown'/);
 assert.match(page,/Next page/);assert.match(page,/Historical\/inactive version/);assert.match(page,/Retest Question/);
 assert.match(css,/100dvh/);assert.match(css,/safe-area-inset/);assert.match(css,/focus-visible/);
});
