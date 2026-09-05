import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {selectAnswerEvidence,generateOfficialAnswer} from '../app/lib/aiAnswerGeneration.js';
import {runPlayerOfficialAnswer,isUnsupportedOperationalQuestion} from '../app/lib/askLwrPlayerAnswer.js';
import {createFollowUpReceipt,createClarificationReceipt,readConversationReceipt,resolveConversationTurn} from '../app/lib/aiConversation.js';
import {communityParticipationPassages} from '../app/lib/aiQuestionApplicability.js';
import {qualityOutcome,qualityException} from '../app/lib/aiQualitySnapshots.js';
process.env.SUPABASE_SERVICE_ROLE_KEY='final-0717-local-test-receipt-only';
process.env.OPENAI_API_KEY='final-0717-test-transport-only';
process.env.AI_QUALITY_HMAC_KEY='final-0717-local-test-grouping-only';
const fixture=JSON.parse(await readFile(new URL('./fixtures/lms0717-final-production-evidence.json',import.meta.url),'utf8'));
const old=JSON.parse(await readFile(new URL('./fixtures/lms0717-correction-production-evidence.json',import.meta.url),'utf8'));
const first="When are Season DUPR's recorded?",userId=randomUUID(),now=Date.now();
function retrieval(kind,question){const candidates=structuredClone(fixture.cases[kind]);return {request:{question},candidates,suppliedEvidence:candidates,authorityReviewCandidates:candidates,evidence:{sufficient:true,threshold:.35},environment:{evidenceThreshold:.35,retrievalLimit:8,authorityReviewLimit:12}};}
const sources=evidence=>evidence.map(c=>({...c,citation:c.heading,officialDocumentUrl:'/local-fixture-source'}));
const text=s=>s.map(c=>c.content).join('\n');
async function execute(kind,question,receipt){return runPlayerOfficialAnswer({body:{question,conversationReceipt:receipt},userId,role:'player',now:()=>now,retrieveOfficialEvidence:async({body})=>retrieval(kind,body.question),generateOfficialAnswer:async({retrieval:r})=>{
 const s=selectAnswerEvidence(r);return {answer:'Local answer fixture',evidenceSufficient:s.length>0,selectedEvidence:s,sources:sources(s)};
}});}

test('0717 final recording dates use original heading plus one original bullet, without calendar siblings',()=>{
 const r=retrieval('timing',first),s=selectAnswerEvidence(r);assert.equal(s.length,3);
 for(const c of s){assert.match(c.content,/League Key Dates\n• Sept\. 27, Sunday – Season DUPR ratings recorded$/);assert.doesNotMatch(c.content,/Sept\. 28|Registration|Schedules|Championship|4\.2\./);assert.equal(c.selectedPassages.length,1);}
 // The date is source data, not a hardcoded answer or selected date.
 for(const c of r.suppliedEvidence)c.content=c.content.replace('Sept. 27, Sunday','Oct. 3, Saturday');
 for(const c of selectAnswerEvidence(r))assert.match(c.content,/Oct\. 3, Saturday/);
});
for(const league of ['Weekday','Saturday','PrimeTime'])test(`0717 final signed Season DUPR continuation: ${league}`,async()=>{
 const one=await execute('timing',first);assert.equal(one.result.kind,'answer');assert.ok(one.result.conversationReceipt);
 const claims=readConversationReceipt(one.result.conversationReceipt,userId,{now});assert.equal(claims.purpose,'follow_up');assert.equal(claims.effectiveQuestion,first);
 const raw=`When are they recorded for the ${league.toLowerCase()} league?`;
 const two=await execute('timing',raw,one.result.conversationReceipt);assert.equal(two.result.kind,'answer');assert.equal(two.conversationResolution.classification,'follow_up');
 assert.equal(two.conversationResolution.effectiveQuestion,`When are Season DUPR ratings recorded for the ${league} League?`);
 assert.equal(two.answer.selectedEvidence.length,1);assert.match(text(two.answer.selectedEvidence),new RegExp(`^${league} DUPR League Key Dates`));
 const o=qualityOutcome({id:randomUUID(),origin:'player_interface',started:now,completed:now+1,execution:two});assert.equal(o.final_kind,'answer');assert.equal(qualityException(o,two).p_occurrence,null);
});
test('0717 final plural timing continuation cannot inherit ambiguous, absent, invalid, expired or clarification context',async()=>{
 const raw='When are they recorded for the weekday league?';
 const receipts=[undefined,'invalid',createFollowUpReceipt(userId,first,{now:now-3600000}),createFollowUpReceipt(randomUUID(),first,{now}),createFollowUpReceipt(userId,'When are Season DUPR ratings and match scores recorded?',{now}),createFollowUpReceipt(userId,'When are team rosters recorded?',{now}),createClarificationReceipt(userId,first,'color_subject',{now})];
 for(const conversationReceipt of receipts){const e=await runPlayerOfficialAnswer({body:{question:raw,conversationReceipt},userId,role:'player',now:()=>now,retrieveOfficialEvidence:()=>assert.fail('ambiguous continuation must not retrieve'),generateOfficialAnswer:()=>assert.fail('must not generate')});assert.equal(e.result.kind,'clarification');assert.equal(e.result.feedbackReceipt,null);assert.deepEqual(e.result.sources,[]);}
});
test('0717 final inheritance uses only immediate signed subject; standalone questions supersede',()=>{
 const receipt=createFollowUpReceipt(userId,first,{now});
 const q='When are Season DUPR ratings recorded for the Saturday League?';
 assert.equal(resolveConversationTurn({question:q,userId,receipt,now}).classification,'standalone_supersedes_context');
 assert.equal(resolveConversationTurn({question:'When are match scores recorded?',userId,receipt,now}).effectiveQuestion,'When are match scores recorded?');
 const next=createFollowUpReceipt(userId,'What are the rules for a legal serve?',{now});
 assert.equal(resolveConversationTurn({question:'When are they recorded?',userId,receipt:next,now}).kind,'clarification');
});
test('0717 final date scope cannot be borrowed from a different or unrelated heading',()=>{
 const r=retrieval('timing','When are Season DUPR ratings recorded for the Weekday League?');
 for(const c of r.suppliedEvidence){if(c.heading.startsWith('Weekday'))c.heading='Team Registration';}
 assert.deepEqual(selectAnswerEvidence(r),[]);
});
const allowed=[
 'Can I join a team in another community?',
 'Can I play on a team from a different community?',
 "Can I play for another community's team?",
 'Do I have to play for the community where I live?',
 'Can players from different communities form a team?',
 'Can I play for another community if my community already has a team in my division?',
 'Can I play for another community if my community does not have a team in my division?',
 "What are the eligibility rules for joining another community's team?",
 'Can I play for another community?',
];
for(const q of allowed)test(`0717 final general eligibility through player path: ${q}`,async()=>{
 assert.equal(isUnsupportedOperationalQuestion(q),false);const e=await execute('community',q);assert.equal(e.result.kind,'answer');const s=e.answer.selectedEvidence;assert.equal(s.length,1);
 assert.equal(s[0].chunkId,'9e053a2d-c36d-4f0f-8ae6-545433af12e3');assert.equal(s[0].selectedPassages.length,1);
 assert.equal(s[0].content,communityParticipationPassages(fixture.cases.community[0])[0]);
 assert.match(s[0].content,/^3\.5\.[\s\S]*may form teams[\s\S]*however[\s\S]*not\s+permitted[\s\S]*if their own community already has a\s+team in their division/);
 assert.doesNotMatch(s[0].content,/3\.4\.|3\.6\.|3\.7\.|guest|Home Court|Manage Roster/);
});
const protectedQuestions=[
 'What community am I registered with?', 'Which community am I registered with?', 'What team am I on?',
 'Am I currently eligible for Team X?', 'Am I personally eligible for Team X right now?',
 'Is John Smith eligible for this team?', 'Does my community currently have a team in my division?',
];
for(const q of protectedQuestions)test(`0717 final live affiliation through player path: ${q}`,async()=>{
 const e=await runPlayerOfficialAnswer({body:{question:q,conversationReceipt:createFollowUpReceipt(userId,allowed[0],{now})},userId,role:'player',now:()=>now,retrieveOfficialEvidence:()=>assert.fail('no lookup/retrieval'),generateOfficialAnswer:()=>assert.fail('no model')});
 assert.equal(e.result.kind,'protected');assert.equal(e.result.feedbackReceipt,null);assert.deepEqual(e.result.sources,[]);
 const o=qualityOutcome({id:randomUUID(),origin:'player_interface',started:now,completed:now+1,execution:e});assert.equal(o.final_kind,'protected');assert.equal(o.stage3_invoked,false);assert.deepEqual(o.diagnostic_snapshot,{});assert.equal(qualityException(o,e).p_occurrence,null);
});
test('0717 final Rule 3.5 wins over high-ranked real procedural/host/server distractors; no sentence or rule-id hardcoding',()=>{
 const r=retrieval('community',allowed[0]);for(const c of r.suppliedEvidence)c.combinedScore=.9;
 const governing=r.suppliedEvidence.find(c=>c.documentType==='league_rules');governing.ruleNumber='changed-metadata';governing.content=governing.content.replace('3.5.','3.55.');
 assert.match(text(selectAnswerEvidence(r)),/^3\.55\./);
 const without={...r,suppliedEvidence:r.suppliedEvidence.filter(c=>c!==governing),authorityReviewCandidates:[]};assert.deepEqual(selectAnswerEvidence(without),[]);
 for(const q of ['How do I join the community mailing list?','Where is the team playing location?']){r.request.question=q;assert.ok(!selectAnswerEvidence(r).some(c=>c.content.startsWith('3.55.')));}
});
test('0717 final accepted roster obligation is not blocked by affiliation guard',async()=>{
 const r=structuredClone(old[1].retrieval);const q='Does a player have to be on the roster before playing?';r.request.question=q;
 const e=await runPlayerOfficialAnswer({body:{question:q},userId,role:'player',retrieveOfficialEvidence:async()=>r,generateOfficialAnswer:async({retrieval:r})=>({answer:'Fixture',evidenceSufficient:selectAnswerEvidence(r).length>0,sources:[]})});assert.equal(e.result.kind,'answer');
});
test('0717 final real model transport preserves community condition and referee scope instructions',async()=>{
 for(const r of [retrieval('community',allowed[0]),structuredClone(old[22].retrieval)]){
  let request;const a=await generateOfficialAnswer({retrieval:r,resolveSources:async(_,s)=>sources(s),fetchImpl:async(_,options)=>{request=JSON.parse(options.body);return {ok:true,status:200,json:async()=>({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({answer:'Local transport fixture',conflict:false})}]}]})};}});
  assert.equal(a.evidenceSufficient,true);assert.match(request.instructions,/conditional permission and its limiting exception together/);assert.match(request.instructions,/when a referee is officiating/);assert.match(request.instructions,/does not by itself establish that a referee is present/);
  if(r.request.question===allowed[0]){assert.match(request.input[0].content,/own community already has a/);assert.doesNotMatch(request.input[0].content,/3\.4\.|3\.6\.|3\.7\./);}else assert.deepEqual(a.selectedEvidence.map(c=>c.ruleNumber),['10.G','10.G.1','20.F','20.F.1']);
 }
});
