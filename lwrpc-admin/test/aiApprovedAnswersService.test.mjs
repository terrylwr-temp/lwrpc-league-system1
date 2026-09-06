import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
process.env.SUPABASE_SERVICE_ROLE_KEY='synthetic-local-test-key';
const {approvedMutation,approvedList}=await import('../app/lib/aiApprovedAnswersService.js');
const {chooseApprovedEvidence}=await import('../app/lib/aiApprovedAnswersSelection.js');
function query(data){const q={};for(const k of ['select','eq','neq','not','order','limit'])q[k]=()=>q;q.maybeSingle=q.single=async()=>({data});q.then=(a,b)=>Promise.resolve({data}).then(a,b);return q;}
test('0721 activation HTTP retry returns the recorded revision without embedding or RPC mutation',async()=>{
 const user=randomUUID(),id=randomUUID(),operation=randomUUID(),answerId=randomUUID();
 const event={answer_id:answerId,revision_id:id,actor_user_id:user,action:'activated',before_state:{id,row_version:1},after_state:{},reason:null};
 let embeddings=0,rpcs=0;const db={from:()=>query(event),rpc:()=>{rpcs++;throw Error('unexpected mutation');}};
 const result=await approvedMutation(db,{action:'activate',id,operation,expected:1,confirm:true},user,{embed:()=>{embeddings++;}});
 assert.equal(result.replayed,true);assert.equal(result.revisionId,id);assert.equal(embeddings,0);assert.equal(rpcs,0);
 await assert.rejects(approvedMutation(db,{action:'activate',id,operation,expected:2,confirm:true},user),/different action/);
 await assert.rejects(approvedMutation(db,{action:'activate',id,operation,expected:1,confirm:true},randomUUID()),/different action/);
});
test('0721 unresolved authority warning is manager-visible; retirement clears current visibility only',async()=>{
 const id=randomUUID(),answer_id=randomUUID(),outcomeId=randomUUID();
 const warning={approvedAnswerId:answer_id,approvedRevisionId:id,documentId:randomUUID(),documentVersionId:randomUUID(),chunkId:randomUUID(),leagueScope:'all',reason:'opposed_permission'};
 const outcome={id:outcomeId,completed_at:'2026-09-06T12:00:00Z',assistant_version:'LMS-0721',origin:'player_interface',diagnostic_snapshot:{authorityWarnings:[warning]}};
 const revision={id,answer_id,status:'active',authority_manifest_hash:'old',effective_on:'2026-01-01'};
 const db={from:name=>query(name==='ai_request_outcomes'?[outcome]:name==='ai_approved_answer_revisions'?[revision]:[]),rpc:async()=>({data:'current'})};
 const active=await approvedList(db);assert.equal(active.warnings.length,1);assert.equal(active.warnings[0].approvedRevisionId,id);assert.equal(active.revisions[0].eligibility,'Needs authority revalidation');
 revision.status='retired';assert.equal((await approvedList(db)).warnings.length,0);assert.deepEqual(outcome.diagnostic_snapshot.authorityWarnings,[warning]);
});
test('0721 managed knowledge cannot invent a playing-rule exception when formal recall is empty',()=>{
 const revision={id:randomUUID(),answer_id:randomUUID(),status:'active',activated_at:'2026-01-01',canonical_question:'May a serve bounce twice?',approved_answer:'A serve may bounce twice.',league_scope:'all',temporal_scope:'standing',effective_on:'2026-01-01',authority_manifest_hash:'m'};
 const rows=[{revision,manifest:'m',semantic_score:.99}];
 assert.equal(chooseApprovedEvidence(revision.canonical_question,[],rows).selected.length,0);
 const usap={documentType:'usap_rulebook',content:'The official serving provision governs.'};
 assert.deepEqual(chooseApprovedEvidence(revision.canonical_question,[usap],rows).selected,[usap]);
 const guide={documentType:'captains_guide',chunkId:randomUUID(),content:'Administrative assistance with serve questions.'};
 revision.related_chunk_id=guide.chunkId;
 assert.deepEqual(chooseApprovedEvidence(revision.canonical_question,[guide],rows).selected,[guide]);
});

const calibration=JSON.parse(await (await import('node:fs/promises')).readFile(new URL('./fixtures/lms0721-managed-calibration.json',import.meta.url),'utf8'));
test('0721 measured embedding calibration preserves paraphrases and excludes nearby different questions',()=>{
 for(const item of calibration){
  const revision={...item.policy,id:randomUUID(),answer_id:randomUUID(),status:'active',activated_at:'2026-01-01',league_scope:'all',temporal_scope:'standing',effective_on:'2026-01-01',authority_manifest_hash:'m'};
  assert.equal(chooseApprovedEvidence(item.question,[],[{revision,manifest:'m',semantic_score:item.semantic_score}]).selected.length>0,item.expected,item.question);
 }
});
