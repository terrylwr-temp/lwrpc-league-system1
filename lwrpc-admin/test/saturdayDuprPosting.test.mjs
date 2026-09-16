import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
process.env.LWR_AI_ENABLED='true';
const {officialQuestionConcept}=await import('../app/lib/aiQuestionConcepts.js');
const {liveIntent}=await import('../app/lib/liveLmsIntent.js');
const {isUnsupportedOperationalQuestion}=await import('../app/lib/askLwrPlayerAnswer.js');
const {retrieveOfficialEvidence}=await import('../app/lib/aiRetrieval.js');
const {selectAnswerEvidence,selectAnswerEvidenceWithAssistance}=await import('../app/lib/aiAnswerGeneration.js');
const {trustedSelectedRuleIdentity}=await import('../app/lib/aiSelectedRuleIdentity.js');
const {sources,scope}=JSON.parse(fs.readFileSync(new URL('./fixtures/saturday-dupr-posting.json',import.meta.url)));
const row=sources.find(r=>r.content.includes('6.2.3.6.'));
const candidate=r=>({chunkId:r.id,documentId:r.document_id,documentVersionId:r.active_version_id,documentTitle:r.title,documentType:r.document_type,documentAuthorityRank:r.authority_rank,pageNumber:r.page_number,ruleNumber:r.rule_number,heading:r.heading,content:r.content,combinedScore:.8,structuralContext:scope.map(s=>({ruleNumber:s.rule_number,content:s.content}))});
const candidates=sources.map(candidate);
const retrieval=(q,list=candidates)=>({request:{question:q},candidates:list,authorityReviewCandidates:list,suppliedEvidence:list,evidence:{sufficient:true,threshold:.35}});
const questions=['Do all games in the Saturday league post to DUPR','Are all Saturday league games submitted to DUPR?','Which Saturday games get uploaded to DUPR?','Do Saturday mixed doubles games post to DUPR?','Are Saturday Picklebreaker games recorded in DUPR?','Are Saturday league results posted to DUPR for all matches?'];
questions.push('Will the Saturday league games be entered into DUPR','Saturday league will you enter into dupr','Are Saturday games entered in DUPR?','Will Saturday mixed doubles be entered into DUPR?');
for(const q of questions)test(q,()=>{
 assert.equal(officialQuestionConcept(q)?.kind,'dupr_posting');assert.equal(liveIntent(q),null);assert.equal(isUnsupportedOperationalQuestion(q),false);
 const selected=selectAnswerEvidence(retrieval(q));assert.equal(selected.length,1);
 assert.match(selected[0].content,/All gender-based games will be submitted/);assert.match(selected[0].content,/Mixed doubles games and any Picklebreaker/);assert.match(selected[0].content,/will not be\s+submitted or posted to DUPR/);
 assert.equal(selected[0].pageNumber,10);assert.equal(selected[0].sourceClassification,'lwr_controlling');assert.equal(selected[0].passageScopes[0].league,'saturday');
 assert.equal(trustedSelectedRuleIdentity(selected[0],{content:row.content,rule_number:row.rule_number}),'6.2.3.6');
});
test('existing assisted search retrieves posting clause and same-version league context',async()=>{
 const calls=[];const rpcRow=r=>({chunk_id:r.id,document_id:r.document_id,document_version_id:r.active_version_id,document_title:r.title,document_type:r.document_type,document_authority_rank:r.authority_rank,page_number:r.page_number,rule_number:r.rule_number,heading:r.heading,content:r.content,semantic_score:.8,keyword_score:.8,combined_score:.8});
 const db={rpc:async(name,args)=>{calls.push(args.p_query_text);return {data:(args.p_query_text==='saturday DUPR Posting'?[row]:sources.filter(s=>s.rule_number==='5.7')).map(rpcRow),error:null};},from:()=>{const b={select:()=>b,in:()=>b,eq:()=>b,order:()=>b,limit:async()=>({data:scope,error:null})};return b;}};
 const r=await retrieveOfficialEvidence({supabase:db,body:{question:questions[0]},embedQuery:async()=>({embedding:Array(1536).fill(0),inputTokens:0})});
 const selected=await selectAnswerEvidenceWithAssistance(r);assert.equal(selected.length,1);assert.match(selected[0].content,/6\.2\.3\.6\./);assert.equal(calls.filter(q=>q==='saturday DUPR Posting').length,1);assert.equal(r.request.question,questions[0]);
});
test('rank-16 posting clause enters existing bounded authority review with verified league scope',async()=>{
 const rpcRow=(r,index)=>({chunk_id:r.id,document_id:r.document_id,document_version_id:r.active_version_id,document_title:r.title,document_type:r.document_type,document_authority_rank:r.authority_rank,page_number:r.page_number,rule_number:r.rule_number,heading:r.heading,content:r.content,semantic_score:.8,keyword_score:.8,combined_score:.57-index*.005});
 const general=sources.find(s=>s.rule_number==='5.7');
 const ranked=[...Array.from({length:15},(_,i)=>({...general,id:`unrelated-${i}`})),row];
 const db={rpc:async()=>({data:ranked.map(rpcRow),error:null}),from:()=>{const b={select:()=>b,in:()=>b,eq:()=>b,order:()=>b,limit:async()=>({data:scope,error:null})};return b;}};
 const r=await retrieveOfficialEvidence({supabase:db,body:{question:questions[0]},embedQuery:async()=>({embedding:Array(1536).fill(0),inputTokens:0})});
 const original=r.candidates.map(c=>[c.chunkId,c.combinedScore]);
 const selected=await selectAnswerEvidenceWithAssistance(r);
 assert.equal(selected.length,1);assert.match(selected[0].content,/6\.2\.3\.6\./);
 assert.equal(r.authorityReviewCandidates.length,12);assert.equal(r.suppliedEvidence.length,8);
 assert.equal(r.authorityReviewCandidates[8].chunkId,row.id);
 assert.deepEqual(r.candidates.map(c=>[c.chunkId,c.combinedScore]),original);
});
test('generic submission rule, wrong league, unscoped and missing clauses cannot replace Saturday posting',()=>{
 assert.deepEqual(selectAnswerEvidence(retrieval(questions[0],candidates.filter(c=>c.ruleNumber==='5.7'))),[]);
 assert.deepEqual(selectAnswerEvidence(retrieval(questions[0],[{...candidate(row),structuralContext:[]}])),[]);
 assert.deepEqual(selectAnswerEvidence(retrieval('Do all Weekday games post to DUPR?')),[]);
 assert.deepEqual(selectAnswerEvidence(retrieval(questions[0],[])),[]);
});
test('personal status, score entry and Saturday format stay separate',()=>{
 for(const q of ['Did my Saturday games post to DUPR?','Have our Saturday scores already been uploaded to DUPR?','Where do I enter match scores?','How does the Saturday Picklebreaker work?'])assert.notEqual(officialQuestionConcept(q)?.kind,'dupr_posting');
 assert.equal(officialQuestionConcept('How does the Saturday Picklebreaker work?')?.kind,'scoring');
});
test('DUPR entry procedure, identity, ratings and historical status are not posting policy',()=>{
 for(const q of ['How do I enter Saturday games into DUPR?','Where do I enter Saturday games into DUPR?','Will Saturday league players be entered into DUPR?','Will Saturday league ratings be entered into DUPR?','Did Saturday games enter into DUPR?','Have Saturday games already been entered into DUPR?','Will my Saturday games be entered into DUPR?','Saturday and Weekday league will you enter into DUPR'])assert.notEqual(officialQuestionConcept(q)?.kind,'dupr_posting',q);
});

test('league posting with that is self-contained without importing previous subject',async()=>{
 process.env.SUPABASE_SERVICE_ROLE_KEY ||= 'posting-test-only';
 const {resolveConversationTurn,createFollowUpReceipt}=await import('../app/lib/aiConversation.js');
 const userId='11111111-1111-4111-8111-111111111111';
 for(const question of ['For the Saturday league, will that be entered in DUPR?','Will the Saturday league games be entered into DUPR','Do all games in the Saturday league post to DUPR']){
  for(const receipt of [undefined,createFollowUpReceipt(userId,'Can I switch partners for the Picklebreaker?')]){
   const resolution=resolveConversationTurn({question,userId,receipt});
   assert.equal(resolution.kind,'resolved');assert.equal(resolution.effectiveQuestion,question);
  }
  assert.equal(officialQuestionConcept(question)?.kind,'dupr_posting');
  const selected=selectAnswerEvidence(retrieval(question));
  assert.equal(selected.length,1);assert.match(selected[0].content,/Mixed doubles games and any Picklebreaker/);
 }
 assert.equal(resolveConversationTurn({question:'Will that be entered in DUPR?',userId}).kind,'clarification');
 assert.equal(resolveConversationTurn({question:'For the Saturday league, will my rating be entered in DUPR?',userId}).effectiveQuestion,'For the Saturday league, will my rating be entered in DUPR?');
});
