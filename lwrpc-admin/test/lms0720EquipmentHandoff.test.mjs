import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
process.env.LWR_AI_ENABLED='true';
const {retrieveOfficialEvidence}=await import('../app/lib/aiRetrieval.js');
const {selectAnswerEvidence}=await import('../app/lib/aiAnswerGeneration.js');
const fixture=JSON.parse(await readFile(new URL('./fixtures/lms0720-equipment-handoff-production.json',import.meta.url),'utf8'));
const base=fixture.retrieval;
const equipment=base.candidates[31];
assert.equal(equipment.chunkId,'68591ceb-77db-464b-b590-412a886dd372');
assert.equal(base.lwrMatchEquipmentProbe.normalStage3Rank,32);
const row=c=>Object.fromEntries(Object.entries(c).map(([key,value])=>[key.replace(/[A-Z]/g,x=>'_'+x.toLowerCase()),value]));
const questions=['What kind of balls will we be usin','What kind of ball are we useing','What ball are we playng with?','What kind of balls will we be using'];
for(const question of questions) for(const rank of [1,8,12,13,32,42]) test(`0720 equipment handoff rank ${rank}: ${question}`,async()=>{
 const normal=base.candidates.filter(c=>c.chunkId!==equipment.chunkId);
 if(rank<=32)normal.splice(rank-1,0,equipment);
 const calls=[],embeddings=[];
 const r=await retrieveOfficialEvidence({body:{question},embedQuery:async q=>{embeddings.push(q);return {embedding:Array(1536).fill(.01)};},supabase:{rpc:async(name,args)=>{
  calls.push(args);
  return {data:args.p_query_text==='match balls'?[row({...equipment,combinedScore:.6498})]:args.p_limit===80?[...normal.map(row),...Array.from({length:42-normal.length-1},()=>row(normal[0])),row(equipment)]:normal.map(row),error:null};
 }}});
 assert.equal(r.suppliedEvidence.length,8);assert.equal(r.authorityReviewCandidates.length,12);
 assert.equal(r.intentEvidenceCandidates.length,rank<=12?0:1);
 assert.equal(r.lwrMatchEquipmentProbe.deduplicatedAgainstNormal,rank<=12);
 assert.equal(r.request.question,question);assert.equal(embeddings[0],question);assert.equal(calls[0].p_query_text,question);
 assert.equal(embeddings.length,2);assert.equal(calls.length,rank<=32?2:3);
 const selected=selectAnswerEvidence(r);
 assert.equal(selected.length,1);assert.equal(selected[0].chunkId,equipment.chunkId);assert.match(selected[0].content,/Franklin Outdoor X-40 Optic/);
 assert.doesNotMatch(selected[0].content,/Waiver|League Fees/i);
 // One full chunk contains multiple semantic provisions. Normal/probe paths
 // retain identical text; selection can still choose the useful child passage.
 assert.equal(r.candidates.find(c=>c.chunkId===equipment.chunkId)?.content ?? equipment.content,equipment.content);
});
test('0720 ineligible normal occurrence does not suppress threshold-qualified probe',async()=>{
 const normal=[{...equipment,combinedScore:.2},...base.candidates.slice(0,11)];
 const r=await retrieveOfficialEvidence({body:{question:questions[0]},embedQuery:async()=>({embedding:Array(1536).fill(.01)}),supabase:{rpc:async(name,args)=>({data:(args.p_query_text==='match balls'?[{...equipment,combinedScore:.6498}]:normal).map(row),error:null})}});
 assert.equal(r.intentEvidenceCandidates.length,1);assert.equal(r.lwrMatchEquipmentProbe.deduplicatedAgainstNormal,false);
 // Stage 3's original sufficiency gate still owns the request; no threshold bypass.
 assert.equal(r.evidence.sufficient,false);assert.deepEqual(selectAnswerEvidence(r),[]);
});
