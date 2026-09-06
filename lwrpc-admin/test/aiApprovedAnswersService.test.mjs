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

const {approvedDetail,approvedPreflight}=await import('../app/lib/aiApprovedAnswersService.js');
const {validateApprovedDraft}=await import('../app/lib/aiApprovedAnswersShared.js');
const managerDraft=()=>({title:'Synthetic administration',topic_key:'synthetic-admin',canonical_question:'How is synthetic check-in handled?',approved_answer:'Confirm synthetic check-in with the organizer.',league_scope:'all',temporal_scope:'standing',effective_on:'2026-01-01',public_links:[]});

test('0721 manager creation retains content, source review, dynamic guard and exact retry identity',async()=>{
 const user=randomUUID(),operation=randomUUID(),id=null,draft=managerDraft();let event=null;const mutations=[];
 let sources=[];const db={from:name=>{
  if(name==='ai_approved_answer_events')return query(event);
  if(name==='ai_approved_answers')return query({source_review_case_id:null});
  throw Error('Unexpected case or Stage 7 access: '+name);
 },rpc:async(name,args)=>{
  if(name==='ai_approved_source_review')return {data:sources};
  assert.equal(name,'ai_approved_answer_action');mutations.push(args);
  event={answer_id:randomUUID(),revision_id:randomUUID(),actor_user_id:user,action:'created',after_state:{content_hash:args.p_body.content_hash}};
  return {data:{answerId:event.answer_id,revisionId:event.revision_id}};
 }};
 const body={action:'create',id,operation,draft,staticPolicyConfirmed:true};
 await assert.rejects(approvedMutation(db,{...body,id:undefined},user),/reference/);
 await assert.rejects(approvedMutation(db,{...body,staticPolicyConfirmed:false},user),/Confirm/);
 await assert.rejects(approvedMutation(db,{...body,draft:{...draft,approved_answer:''}},user));
 await assert.rejects(approvedMutation(db,{...body,draft:{...draft,canonical_question:'What is my DUPR?'}},user),/protected|live/i);
 sources=[{chunk_id:randomUUID(),content:'Synthetic check-in must be handled by the organizer.'}];
 await assert.rejects(approvedMutation(db,body,user),/directly answers/);
 sources=[{chunk_id:randomUUID(),content:'Related administrative material.'}];
 await assert.rejects(approvedMutation(db,body,user),/missing-policy distinction/);
 sources=[];
 const created=await approvedMutation(db,body,user);assert.equal(mutations.length,1);assert.equal(mutations[0].p_id,null);
 assert.equal(mutations[0].p_body.approved_answer,validateApprovedDraft(draft).approved_answer);
 assert.equal((await approvedMutation(db,body,user)).revisionId,created.revisionId);assert.equal(mutations.length,1);
 await assert.rejects(approvedMutation(db,{...body,id:randomUUID()},user),/different action/);
 await assert.rejects(approvedMutation(db,{...body,draft:{...draft,title:'Different'}},user),/different action/);
});

test('0721 detail skips NULL case lookup; genuine case navigation is retained',async()=>{
 const id=randomUUID(),answer_id=randomUUID(),group_id=randomUUID(),caseId=randomUUID();let caseLink=null,lookups=0;
 const db={from:name=>{
  if(name==='ai_approved_answer_revisions')return query({id,answer_id,activated_by_user_id:null});
  if(name==='ai_approved_answers')return query({id:answer_id,source_review_case_id:caseLink});
  if(name==='ai_approved_answer_events')return query([]);
  if(name==='ai_manager_review_cases'){lookups++;return query({group_id,status:'new'});}
  throw Error(name);
 }};
 assert.equal((await approvedDetail(db,id)).linkedCase,null);assert.equal(lookups,0);
 caseLink=caseId;assert.equal((await approvedDetail(db,id)).linkedCase.group_id,group_id);assert.equal(lookups,1);
});

test('0721 activation checks overlapping Drafts as well as Active managed policy',async()=>{
 const id=randomUUID(),answer_id=randomUUID();const revision={...managerDraft(),id,answer_id,status:'draft',row_version:1,content_hash:'a'.repeat(64)};
 for(const status of ['draft','active']){
  const sibling={...revision,id:randomUUID(),answer_id:randomUUID(),status};
  const db={from:()=>{const q=query(revision);q.in=(_k,values)=>{assert.deepEqual(values,['active','draft']);return query([sibling]);};return q;},rpc:async name=>({data:name==='ai_approved_source_review'?[]:'manifest'})};
  const result=await approvedPreflight(db,id,randomUUID());assert.equal(result.blocked,true);assert.equal(result.token,null);assert.equal(result.overlaps[0].status,status);
 }
});
