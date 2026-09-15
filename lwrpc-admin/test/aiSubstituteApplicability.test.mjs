import test from 'node:test';
import assert from 'node:assert/strict';
import {revision,variants,unrelated,row} from './fixtures/lms0731-substitute.mjs';
import {chooseApprovedEvidence,APPROVED_SEMANTIC_MIN} from '../app/lib/aiApprovedAnswersSelection.js';
process.env.LWR_AI_ENABLED='true';process.env.OPENAI_API_KEY='synthetic-local-only';
const options={date:'2026-09-10'};
for(const question of variants)test('0731 equivalent policy: '+question,()=>{
 const result=chooseApprovedEvidence(question,[],[row()],options);
 assert.equal(result.selected.length,1);assert.equal(result.selected[0].content,revision.approved_answer);
 assert.equal(result.diagnostics[0].reason,'substitute_policy_equivalent');assert.equal(result.diagnostics[0].decision,'selected');
});
for(const question of unrelated)test('0731 unrelated rejected even at high similarity: '+question,()=>{
 assert.equal(chooseApprovedEvidence(question,[],[{...row(),semantic_score:.99}],options).selected.length,0);
});
for(const patch of [{status:'draft'},{status:'retired'},{activated_at:null},{effective_on:'2026-09-11'},{expires_on:'2026-09-10'},{league_scope:'weekday'},{authority_manifest_hash:'stale'},{temporal_scope:'season',season_id:'season-other'}])test('0731 lifecycle/scope: '+JSON.stringify(patch),()=>{
 assert.equal(chooseApprovedEvidence(variants[1],[],[row(patch)],options).selected.length,0);
});
test('0731 scoped eligibility and immutable source identity; formal priority and unsupported facet',()=>{
 assert.equal(APPROVED_SEMANTIC_MIN,.65);
 assert.equal(chooseApprovedEvidence(variants[1],[],[row({league_scope:'weekday'})],{...options,scope:'weekday'}).selected.length,1);
 const formal={documentType:'league_rules',content:'The governing formal evidence.',chunkId:'formal'};
 assert.deepEqual(chooseApprovedEvidence(variants[1],[formal],[row()],options).selected,[formal]);
 assert.equal(chooseApprovedEvidence(variants[8],[],[row({approved_answer:'Substitutes must meet division DUPR rating requirements.'})],options).selected.length,0);
 assert.equal(chooseApprovedEvidence(variants[1],[],[{...row(),semantic_score:NaN}],options).selected.length,0);
 const unrelatedPolicy=row({canonical_question:'What ball do we use?',approved_answer:'Use the approved ball.'});
 assert.equal(chooseApprovedEvidence(variants[1],[],[unrelatedPolicy],options).selected.length,0);
});
test('0731 integration: one search, no extra embedding, polarity instruction, source revalidation and bounded diagnostics',async()=>{
 const {retrieveOfficialEvidence}=await import('../app/lib/aiRetrieval.js');
 const {generateOfficialAnswer}=await import('../app/lib/aiAnswerGeneration.js');
 let searches=0,embeddings=0,models=0,sourceChecks=0;
 const db={rpc:async name=>name==='search_ai_approved_answers'?(searches++,{data:[row()]}):{data:[]}};
 const retrieval=await retrieveOfficialEvidence({supabase:db,body:{question:variants[1]},embedQuery:async()=>{embeddings++;return {embedding:Array(1536).fill(.01)};}});
 const answer=await generateOfficialAnswer({retrieval,supabase:db,resolveSources:async(_db,rows)=>{sourceChecks++;return rows.map(r=>({...r,citation:r.documentTitle}));},fetchImpl:async(_url,opts)=>{
  models++;assert.match(JSON.parse(opts.body).instructions,/inverse permission question may require No/);
  return {ok:true,json:async()=>({output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({answer:'No. Substitute status does not waive division eligibility; NR rules apply.',conflict:false,supported:true})}]}]})};
 }});
 assert.equal(answer.evidenceSufficient,true);assert.equal(searches,1);assert.equal(embeddings,1);assert.equal(models,1);assert.equal(sourceChecks,2);
 assert.equal(answer.sources[0].approvedRevisionId,revision.id);
 assert.ok(JSON.stringify(retrieval.approvedRetrieval.selection).length<500);
 assert.ok(!JSON.stringify(retrieval.approvedRetrieval.selection).includes(variants[1]));
});
