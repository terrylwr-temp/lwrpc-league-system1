import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {selectAnswerEvidence,generateOfficialAnswer} from '../app/lib/aiAnswerGeneration.js';
import {questionLeague,leagueCompatible,operationWords} from '../app/lib/aiQuestionApplicability.js';
import {runPlayerOfficialAnswer} from '../app/lib/askLwrPlayerAnswer.js';
import {createClarificationReceipt,resolveConversationTurn} from '../app/lib/aiConversation.js';
import {qualityOutcome,qualityException} from '../app/lib/aiQualitySnapshots.js';

process.env.SUPABASE_SERVICE_ROLE_KEY='0717-isolated-receipt-fixture';
process.env.AI_QUALITY_HMAC_KEY='0717-isolated-quality-fixture-key-only';
process.env.OPENAI_API_KEY='0717-model-fixture-only';
const rows=JSON.parse(await readFile(new URL('./fixtures/lms0717-production-evidence.json',import.meta.url),'utf8'));
const ids=selected=>selected.map(c=>c.chunkId);
const text=selected=>selected.map(c=>c.content).join('\n');
function retrieval(index,question=rows[index].question){const r=structuredClone(rows[index].retrieval);r.request.question=question;return r;}
const saturday='f9f05921-2ee9-46fc-9b44-e5a861d7dd6f',weekday='c4ab8544-decb-4ea1-b856-2df4a2d196f1',primetime='950a54ab-aa3b-4f43-9c51-88ce0ca803ae',roster='c524d6d2-34d8-41ed-8fd6-40cf4c5e0e09';

for(const index of [9,10,11]) test(`0717 no applicable policy: ${rows[index].question}`,async()=>{
 const r=retrieval(index);
 // Also prove that inflated retrieval confidence cannot create applicability.
 for(const field of ['suppliedEvidence','authorityReviewCandidates','intentEvidenceCandidates']) for(const c of r[field]) c.combinedScore=Math.max(.6,c.combinedScore);
 r.evidence.sufficient=true;
 assert.deepEqual(selectAnswerEvidence(r),[]);
 const answer=await generateOfficialAnswer({retrieval:r,resolveSources:()=>assert.fail('no source resolution'),fetchImpl:()=>assert.fail('no model')});
 assert.equal(answer.modelCallSkipped,true);assert.equal(answer.evidenceSufficient,false);assert.deepEqual(answer.sources,[]);
});
for(const index of [12,13]) test(`0717 explicit document scope preserved: ${rows[index].question}`,()=>{
 const selected=selectAnswerEvidence(retrieval(index));assert.ok(selected.length);
 assert.ok(selected.every(c=>/waiver/i.test(c.heading)));assert.match(text(selected),/release[\s\S]*liability/i);
 assert.doesNotMatch(text(selected),/3\.1\.|reimbursement|refund/i);
});

for(const [question,id] of [[rows[0].question,saturday],[rows[1].question,saturday],['When can I start adding players to my roster for the Weekday League?',weekday],['When can I start adding players to my roster for the PrimeTime League?',primetime]])test(`0717 league roster timing: ${question}`,()=>{
 const selected=selectAnswerEvidence(retrieval(0,question));assert.deepEqual(ids(selected),[id]);
 assert.match(text(selected),/Sept\. 28[\s\S]*updating rosters/);assert.doesNotMatch(text(selected),/Match Setup|ENTER\/VERIFY|three \(3\) days/);
});
test('0717 bounded alias and all-league scope',()=>{
 assert.deepEqual(questionLeague(rows[0].question),['saturday']);
 for(const q of ['What happens this weekend?','When can my team register for another weekend league?','Weekend tournament equipment?'])assert.deepEqual(questionLeague(q),[]);
 assert.equal(leagueCompatible({heading:'All leagues — General Rules'},rows[0].question),true);
 assert.equal(leagueCompatible({heading:'Weekday DUPR League Key Dates'},rows[0].question),false);
 const r=retrieval(8,'When must I submit my lineup for the Saturday League?');const selected=selectAnswerEvidence(r);
 assert.ok(selected.some(c=>c.chunkId==='3080dcfb-af85-489b-b3a6-d98e2626f7be'));
});
test('0717 morphology stays within roster context',()=>{
 assert.equal(operationWords('adding added updating removing entered'),'add add update remove enter');
 for(const verb of ['add','adding','added','update','updating','remove','removing'])assert.deepEqual(ids(selectAnswerEvidence(retrieval(0,`When can I start ${verb} players to my roster for the Saturday League?`))),[saturday]);
});
test('0717 production how-to excludes calendar-only and enforcement passages',()=>{
 for(const i of [4,5]){const selected=selectAnswerEvidence(retrieval(i));assert.deepEqual(ids(selected),[roster]);assert.match(text(selected),/Manage Roster/);assert.doesNotMatch(text(selected),/Retroactive|forfeit|not posted|Match Setup|Sept\. 28/i);}
});
test('0717 requested enforcement retains actual Rule 5.5',()=>{
 for(const q of ['What are the consequences of retroactive player additions?','Is a match forfeited for an ineligible player?']){
  const selected=selectAnswerEvidence(retrieval(4,q));assert.ok(selected.length,q);assert.match(text(selected),/5\.5\.|Retroactive Additions/i);assert.match(text(selected),/forfeit/i);
 }
});
test('0717 actual Match Setup, score entry and accepted compound stay separate',()=>{
 const lineup=selectAnswerEvidence(retrieval(6));assert.ok(lineup.length);assert.doesNotMatch(text(lineup),/save that team|PICKLEBREAKER|ENTER\/VERIFY/i);
 const scores=selectAnswerEvidence(retrieval(7));assert.ok(scores.length);assert.match(text(scores),/enter.*scores/i);assert.doesNotMatch(text(scores),/CREATE\/UPDATE TEAM ROSTER/);
 const compound=selectAnswerEvidence(retrieval(8));assert.deepEqual(ids(compound),[weekday,'3080dcfb-af85-489b-b3a6-d98e2626f7be']);assert.match(text(compound),/no later than three/);assert.doesNotMatch(text(compound),/ENTER\/VERIFY|Retroactive/i);
});
test('0717 an unsupported independent issue prevents partial grounded generation',()=>{
 assert.deepEqual(selectAnswerEvidence(retrieval(0,`${rows[1].question} And what is the club policy on complimentary helicopter travel?`)),[]);
});

test('0717 missing-object clarification bypasses retrieval; signed replies resolve and standalone supersedes',async()=>{
 const userId=randomUUID(),question='When can I start adding players';
 const execution=await runPlayerOfficialAnswer({body:{question},userId,role:'player',retrieveOfficialEvidence:()=>assert.fail('no retrieval'),generateOfficialAnswer:()=>assert.fail('no generation')});
 assert.equal(execution.result.kind,'clarification');assert.match(execution.result.answer,/team roster.*match lineup/);assert.deepEqual(execution.result.sources,[]);assert.equal(execution.result.feedbackReceipt,null);
 for(const [reply,pattern,index] of [['Team roster',/team roster/,0],['Match lineup',/match lineup/,6]]){
  let asked;
  const e=await runPlayerOfficialAnswer({body:{question:reply,conversationReceipt:execution.result.conversationReceipt},userId,role:'player',retrieveOfficialEvidence:async({body})=>{asked=body.question;return retrieval(index,body.question);},generateOfficialAnswer:async()=>({answer:'Fixture',evidenceSufficient:false,sources:[]})});
  assert.match(asked,pattern);assert.equal(e.conversationResolution.clarificationConsumed,true);
 }
 const complete=resolveConversationTurn({question:rows[1].question,userId,receipt:execution.result.conversationReceipt});assert.equal(complete.kind,'resolved');assert.equal(complete.effectiveQuestion,rows[1].question);assert.equal(complete.contextSuperseded,true);
 const expired=createClarificationReceipt(userId,question,'player_entry_object',{now:1});
 for(const receipt of [expired,execution.result.conversationReceipt.slice(0,-4)+'oops'])assert.notEqual(resolveConversationTurn({question:'Team roster',userId,receipt}).classification,'clarification_response');
 assert.notEqual(resolveConversationTurn({question:'Team roster',userId:randomUUID(),receipt:execution.result.conversationReceipt}).classification,'clarification_response');
});
test('0717 corrected results retain observational 0716 capture semantics',async()=>{
 const userId=randomUUID();
 for(const [index,expected] of [[0,'answer'],[4,'answer'],[9,'insufficient_evidence'],[3,'clarification']]){
  const e=await runPlayerOfficialAnswer({body:{question:rows[index].question},userId,role:'player',retrieveOfficialEvidence:async()=>retrieval(index),generateOfficialAnswer:async({retrieval:r})=>{
   const selected=selectAnswerEvidence(r);return {answer:'Fixture result',evidenceSufficient:!!selected.length,selectedEvidence:selected,sources:[],model:null};
  }});
  assert.equal(e.result.kind,expected);assert.equal('applicabilityDiagnostic' in e.result,false);
  const o=qualityOutcome({id:randomUUID(),origin:'player_interface',started:1000,completed:1100,execution:e});const d=qualityException(o,e);
  assert.equal(o.final_kind,expected);assert.equal(!!d.p_occurrence,expected==='insufficient_evidence');
 }
});
test('0717 disclaimer occurs once immediately above composer with responsive accessible text',async()=>{
 const ui=await readFile(new URL('../app/components/AskLwrAssistant.js',import.meta.url),'utf8');
 const disclaimer='Ask LWR PC AI may make mistakes. Check Official Sources for important information.';
 assert.equal(ui.split(disclaimer).length-1,1);assert.match(ui,/text-center text-xs leading-4 text-slate-500">Ask LWR PC AI.*<\/p>\s*<form onSubmit=\{submit\}/);
 assert.match(ui,/htmlFor="ask-lwr-question"/);assert.match(ui,/placeholder="Ask a question"/);
});
