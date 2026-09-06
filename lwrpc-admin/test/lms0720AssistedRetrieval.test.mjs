import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
process.env.LWR_AI_ENABLED='true';
const {retrieveOfficialEvidence}=await import('../app/lib/aiRetrieval.js');
const {selectAnswerEvidence,selectAnswerEvidenceWithAssistance}=await import('../app/lib/aiAnswerGeneration.js');
const fixtures=JSON.parse(await readFile(new URL('./fixtures/lms0720-assisted-retrieval-production.json',import.meta.url),'utf8'));
async function replay(fixture,override) {
 const calls=[],embeddings=[];
 const retrieval=await retrieveOfficialEvidence({body:{question:fixture.question},embedQuery:async q=>{embeddings.push(q);return {embedding:Array(1536).fill(.017)};},supabase:{rpc:async(name,args)=>{
  calls.push(args);assert.equal(name,'search_ai_official_chunks');assert.equal(args.p_limit,32);
  assert.equal(args.p_query_embedding,calls[0].p_query_embedding);
  const search=fixture.searches[calls.length-1];
  if(override&&calls.length>1)return override;
  assert.ok(search,'no extra search');assert.equal(args.p_query_text,search.query);
  return {data:structuredClone(search.rows),error:null};
 }}});
 return {retrieval,calls,embeddings};
}
for(const fixture of fixtures)test('0720 actual original/assisted sequence: '+fixture.question,async()=>{
 const {retrieval:r,calls,embeddings}=await replay(fixture);
 const before=selectAnswerEvidence(r),originalQuestion=r.request.question;
 if(fixture.searches.length===2)assert.equal(before.length,0);
 const selected=await selectAnswerEvidenceWithAssistance(r);
 assert.deepEqual(selected.map(c=>c.chunkId),fixture.expectedSelectedIds);
 assert.equal(calls.length,fixture.searches.length);assert.deepEqual(embeddings,[fixture.question]);
 assert.equal(r.request.question,originalQuestion);assert.equal(r.evidence.threshold,.35);
 assert.ok(r.candidates.length<=32);assert.ok(r.suppliedEvidence.length<=8);assert.ok(r.authorityReviewCandidates.length<=12);assert.ok(selected.length<=4);
 if(calls.length===2){
  assert.equal(r.interpretationAssistance.original.length,fixture.searches[0].rows.length);
  assert.equal(r.interpretationAssistance.assisted.length,fixture.searches[1].rows.length);
  for(const c of r.candidates){
   const p=c.retrievalProvenance,winning=p.winningOrigin==='original'?p.original:p.assisted;
   for(const key of ['semanticScore','keywordScore','exactScore','authorityScore','contextScore','combinedScore'])assert.equal(c[key],winning[key]);
  }
  assert.equal(new Set(r.candidates.map(c=>c.chunkId)).size,r.candidates.length);
  assert.equal(r.interpretationAssistance.reason,fixture.question.includes('comunity')||fixture.question.includes('medcal')?'stage4_no_applicable_evidence':'stage3_insufficient_evidence');
 }
 await selectAnswerEvidenceWithAssistance(r);assert.equal(calls.length,fixture.searches.length);
 assert.ok(!JSON.stringify(r).includes('[0.017'),'vector must not serialize');
 if(fixture.question.includes('comunity'))assert.match(selected[0].content,/roster availability/);
});
for(const response of [{data:[],error:null},{data:null,error:{message:'private upstream detail'}}])test('0720 exhausted/failed assistance stays bounded '+Boolean(response.error),async()=>{
 const {retrieval:r,calls}=await replay(fixtures[0],response);
 assert.deepEqual(await selectAnswerEvidenceWithAssistance(r),[]);
 assert.deepEqual(await selectAnswerEvidenceWithAssistance(r),[]);assert.equal(calls.length,2);
 assert.ok(!JSON.stringify(r).includes('private upstream detail'));
});
for(const question of ['What if I am plaing the ball?','Can I join the team named Roster?','Can I play for the community named Satrday?','NR DUPR 3.50 Rule 5.7.2 user@medcal.org ID-roser'])test('0720 no assisted RPC for veto/entity/precision: '+question,async()=>{
 const {retrieval:r,calls}=await replay({question,searches:[{query:question,rows:[]}]});
 assert.deepEqual(await selectAnswerEvidenceWithAssistance(r),[]);assert.equal(calls.length,1);
});

for(const index of [0,1,2])test('0720 generation follows completed retry '+index,async()=>{
 process.env.OPENAI_API_KEY='synthetic-test-only';
 const {generateOfficialAnswer}=await import('../app/lib/aiAnswerGeneration.js');
 const {retrieval:r,calls}=await replay(fixtures[index]);let modelCalls=0;
 const result=await generateOfficialAnswer({retrieval:r,supabase:null,
 resolveSources:async(_db,evidence)=>{assert.equal(calls.length,2);assert.ok(evidence.length);return evidence.map(c=>({...c,citation:c.documentTitle,officialDocumentUrl:'https://example.test/official.pdf'}));},
 fetchImpl:async(_url,options)=>{modelCalls++;assert.equal(calls.length,2);assert.ok(JSON.parse(options.body).input[0].content.includes(fixtures[index].question));return {ok:true,status:200,json:async()=>({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({answer:'Synthetic grounded test response.',conflict:false})}]}]})};}
 });
 assert.equal(modelCalls,1);assert.equal(result.evidenceSufficient,true);
});
