import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {selectAnswerEvidence, generateOfficialAnswer} from '../app/lib/aiAnswerGeneration.js';
import {evidencePassages,ballDamageKind} from '../app/lib/aiQuestionApplicability.js';
import {runPlayerOfficialAnswer,isUnsupportedOperationalQuestion} from '../app/lib/askLwrPlayerAnswer.js';
import {createClarificationReceipt,resolveConversationTurn} from '../app/lib/aiConversation.js';
import {qualityOutcome,qualityException} from '../app/lib/aiQualitySnapshots.js';
process.env.SUPABASE_SERVICE_ROLE_KEY='0717-correction-test-receipts-only';
process.env.AI_QUALITY_HMAC_KEY='0717-correction-test-grouping-only';
process.env.OPENAI_API_KEY='0717-correction-test-transport-only';
const rows=JSON.parse(await readFile(new URL('./fixtures/lms0717-correction-production-evidence.json',import.meta.url),'utf8'));
function retrieval(i,q=rows[i].question){const r=structuredClone(rows[i].retrieval);r.request.question=q;return r;}
const selected=(i,q)=>selectAnswerEvidence(retrieval(i,q));
const text=s=>s.map(c=>c.content).join('\n').replace(/\s+/g,' ');
const rules=s=>s.map(c=>c.ruleNumber);
function candidate(i,id){return rows[i].retrieval.authorityReviewCandidates.concat(rows[i].retrieval.intentEvidenceCandidates).find(c=>c.chunkId===id);}
const rule5='7a1fb421-89d9-4ddd-b089-b6ec12b2c3c9';
const guide='68591ceb-77db-464b-b590-412a886dd372';
const userId=randomUUID();
async function execute(i,q=rows[i].question,receipt){return runPlayerOfficialAnswer({body:{question:q,conversationReceipt:receipt},userId,role:'player',retrieveOfficialEvidence:async({body})=>retrieval(i,body.question),generateOfficialAnswer:async({retrieval:r})=>{
 const evidence=selectAnswerEvidence(r);return {answer:'Isolated transport fixture',evidenceSufficient:!!evidence.length,sources:[],selectedEvidence:evidence};
}});}

test('0717 correction actual list parent survives without unrelated sibling bullets',()=>{
 const raw=candidate(0,guide);assert.match(raw.content,/provide:\n Match Balls/);
 const s=selected(0);assert.deepEqual(s.map(c=>c.chunkId),[guide]);
 assert.match(text(s),/^o The League shall provide:  Match Balls: Franklin/);
 assert.doesNotMatch(text(s),/Waiver|fee|administration|Picklebreaker/i);
 assert.deepEqual(evidencePassages({content:s[0].content}),s[0].selectedPassages);
 const raw5=candidate(3,rule5),units=evidencePassages(raw5),medical=units.find(p=>p.startsWith('5.7.'));
 for(const n of ['5.7.1.','5.7.2.','5.7.3.'])assert.ok(medical.includes(n));
 assert.doesNotMatch(medical,/5\.5\.|5\.8\./);assert.equal(units.filter(p=>p.startsWith('5.8.')).length,1);
});
for(const [i,q] of [[3,rows[3].question],[3,'Medical issue during match'],[21,rows[21].question]])test(`0717 correction medical: ${q}`,async()=>{
 const e=await execute(i,q);assert.equal(e.result.kind,'answer');const s=e.answer.selectedEvidence;
 assert.deepEqual(s.map(c=>c.chunkId),[rule5]);assert.match(text(s),/5\.7\.1\.[\s\S]*5\.7\.2\.[\s\S]*5\.7\.3\./);
 assert.doesNotMatch(text(s),/5\.5\.|5\.8\.|5\.6\./);
});
for(const i of [8,19,20])test(`0717 correction rating method: ${rows[i].question}`,async()=>{
 const e=await execute(i);assert.equal(e.result.kind,'answer');const t=text(e.answer.selectedEvidence);
 for(const re of [/4\.1\./,/4\.2\./,/truncated/i,/4\.1\.1\./,/4\.5\.1\./,/eligible|assigned/i])assert.match(t,re);
 assert.doesNotMatch(t,/Match Setup|Scheduling|Sept\. 28|4\.6\.|4\.3\./);
});
test('0717 correction NR and Reliability Factor retain only material definition',()=>{
 for(const q of ['What does NR mean?','What is the DUPR Reliability Factor?']){
  const s=selected(7,q);assert.equal(s.length,1);assert.match(text(s),/^4\.1\.1\./);assert.match(text(s),/below 29/);
  assert.doesNotMatch(text(s),/Scheduling|4\.2\.|4\.3\.|4\.5\.1|\bage\b|Match Setup/);
 }
});
for(const q of ["Can I use a player that's not on my roster?",'Does a player have to be on the roster before playing?',"What happens if a player wasn't on the roster?"])test(`0717 correction guard through selector: ${q}`,async()=>{
 assert.equal(isUnsupportedOperationalQuestion(q),false);const e=await execute(1,q);assert.equal(e.result.kind,'answer');
 const t=text(e.answer.selectedEvidence);assert.match(t,/^5\.5\./);assert.match(t,/Retroactive[\s\S]*without penalty only if[\s\S]*valid LWR PC member[\s\S]*eligible DUPR[\s\S]*forfeit[\s\S]*not be posted to DUPR/);
 assert.doesNotMatch(t,/5\.4\.|Scheduling|5\.7\.|three \(3\) days/);
});
for(const q of ['Who is on my roster?','Show me my roster.','Is John Smith on my roster?','Did I already add John Smith to my roster?','What is my DUPR?','What is my Season DUPR?'])test(`0717 correction protected: ${q}`,async()=>{
 const e=await runPlayerOfficialAnswer({body:{question:q},userId,role:'player',retrieveOfficialEvidence:()=>assert.fail('protected: no retrieval'),generateOfficialAnswer:()=>assert.fail('protected: no generation')});
 assert.equal(e.result.kind,'protected');
 const o=qualityOutcome({id:randomUUID(),origin:'player_interface',started:1000,completed:1010,execution:e});assert.equal(qualityException(o,e).p_occurrence,null);
});
test('0717 correction two-stage object and league clarification preserves signed context',async()=>{
 const first=await execute(2,'When can I start adding players');assert.equal(first.result.kind,'clarification');
 const second=await execute(2,'On my team roster',first.result.conversationReceipt);assert.equal(second.result.kind,'clarification');
 assert.equal(second.conversationResolution.clarificationQuestion,rows[2].question);
 assert.match(second.result.answer,/Which league/);for(const league of ['Saturday','Weekday','PrimeTime'])assert.ok(second.result.answer.includes(league));
 assert.equal(second.answer,undefined);assert.equal(second.result.feedbackReceipt,null);assert.deepEqual(second.result.sources,[]);
 const o=qualityOutcome({id:randomUUID(),origin:'player_interface',started:1000,completed:1010,execution:second});assert.equal(o.final_kind,'clarification');assert.equal(qualityException(o,second).p_occurrence,null);
 for(const [reply,league] of [['Saturday','saturday'],['Weekday League','weekday'],['PrimeTime','primetime'],['Weekend','saturday']]){
  const third=await execute(2,reply,second.result.conversationReceipt);assert.equal(third.result.kind,'answer');
  assert.match(third.conversationResolution.effectiveQuestion,new RegExp(league,'i'));assert.equal(third.answer.selectedEvidence.length,1);assert.match(third.answer.selectedEvidence[0].heading,new RegExp(league,'i'));
 }
 const standalone=await execute(17,rows[17].question,second.result.conversationReceipt);assert.equal(standalone.result.kind,'answer');assert.equal(standalone.conversationResolution.contextSuperseded,true);
 for(const receipt of [createClarificationReceipt(userId,rows[2].question,'roster_league',{now:1}),second.result.conversationReceipt.slice(0,-3)+'bad'])assert.notEqual(resolveConversationTurn({question:'Saturday',receipt,userId}).classification,'clarification_response');
 assert.notEqual(resolveConversationTurn({question:'Saturday',receipt:second.result.conversationReceipt,userId:randomUUID()}).classification,'clarification_response');
});
test('0717 correction named league and accepted roster/Friday-lineup compound do not ask another question',async()=>{
 for(const i of [5,17]){const e=await execute(i);assert.equal(e.result.kind,'answer');assert.doesNotMatch(text(e.answer.selectedEvidence),/ENTER\/VERIFY|5\.5\./);}
});
for(const i of [22,23,24,25,26])test(`0717 correction production damaged ball: ${rows[i].question}`,async()=>{
 const e=await execute(i);assert.equal(e.result.kind,'answer');assert.equal(e.conversationResolution.effectiveQuestion,rows[i].question);
 const s=e.answer.selectedEvidence;assert.deepEqual(rules(s),['10.G','10.G.1','20.F','20.F.1']);
 const t=text(s);assert.match(t,/play must continue until the end of the rally/i);assert.match(t,/all players agree[\s\S]*affected the outcome[\s\S]*replayed/i);
 assert.match(t,/If all players do not agree[\s\S]*result of the rally stands/i);assert.match(t,/referee determines[\s\S]*affected the outcome[\s\S]*replayed/i);
 assert.doesNotMatch(t,/17\.D\.14|Ball Specifications|Returned Ball|Extra Ball|Franklin/);
 for(const c of s)assert.equal(c.content,candidate(i,c.chunkId).content,'actual official rule remains verbatim');
});
test('0717 correction damage morphology is bounded to the ball, separate from specifications/other objects',()=>{
 for(const q of ['A cracked ball during play','The ball breaks during a point','A damaged ball in a rally'])assert.ok(ballDamageKind(q));
 for(const q of ['A broken paddle hit the ball','What ball are we using?','What is the ball color?','What are the ball specifications?','An extra ball during play','A returned ball during play','A placed ball during a rally','What ball?'])assert.equal(ballDamageKind(q),'');
 const s=selected(15);assert.ok(rules(s).includes('10.G.2'));assert.match(text(s),/result of the prior rally stands/i);
 const soft=selected(15,'What happens if the ball is soft during play?');assert.ok(rules(soft).includes('10.G.2'));assert.ok(!rules(soft).includes('10.G.1'));assert.ok(!rules(soft).includes('20.F.1'));
});
test('0717 correction preserved real production equipment and USAP controls',()=>{
 for(const [i,rule] of [[9,'11.A'],[10,'11.A.2'],[11,'11.A.3'],[12,'7.A.2'],[13,'7.A.2.a'],[16,'3.C.3']])assert.deepEqual(rules(selected(i)),[rule]);
 assert.ok(rules(selected(14)).some(r=>r.startsWith('3.C')));assert.ok(rules(selected(14)).every(r=>!r.startsWith('10.G')&&!r.startsWith('20.F')));
 assert.equal(selected(0)[0].chunkId,guide);assert.match(text(selected(4)),/^5\.8\./);assert.doesNotMatch(text(selected(6)),/5\.5\.|5\.4\.|ENTER\/VERIFY/);
 assert.deepEqual(selected(18),[]);
 for(const q of ['What is the ball reimbursement policy?','What if an extra ball is placed near me?'])assert.ok(selected(22,q).every(c=>!['10.G','10.G.1','20.F','20.F.1'].includes(c.ruleNumber)));
});
test('0717 correction actual model transport receives qualified replay evidence, not universal replay text',async()=>{
 let request;
 const answer=await generateOfficialAnswer({retrieval:retrieval(22),resolveSources:async(_,s)=>s.map(c=>({...c,verified:true,citation:c.heading,officialDocumentUrl:'/official-source-test'})),fetchImpl:async(_,options)=>{
  request=JSON.parse(options.body);return {ok:true,status:200,json:async()=>({status:'completed',model:'gpt-5.5',output:[{type:'message',role:'assistant',content:[{type:'output_text',text:JSON.stringify({answer:'Isolated model fixture; see supplied conditional rules.',conflict:false})}]}]})};
 }});
 assert.equal(answer.evidenceSufficient,true);assert.equal(answer.modelCallSkipped,false);const payload=JSON.stringify(request);
 assert.match(payload,/all players do not agree/);assert.match(payload,/referee determines/);assert.doesNotMatch(payload,/Franklin|17\.D\.14/);
});
test('0717 correction manager route uses shared clarification before generation and retains manager origin',async()=>{
 const route=await readFile(new URL('../app/api/ai-assistant/answer/route.js',import.meta.url),'utf8');
 assert.match(route,/origin: "manager_test"/);assert.match(route,/clarificationFromRetrieval\(conversationResolution, retrieval\)/);
 assert.ok(route.indexOf('if (clarification)')<route.indexOf('generateOfficialAnswer({ retrieval'));
 assert.match(route,/\["color_subject", "player_entry_object", "roster_league"\]/);
});
test('0717 correction desktop disclaimer has eight-pixel top/bottom gaps; existing mobile owner remains',async()=>{
 const ui=await readFile(new URL('../app/components/AskLwrAssistant.js',import.meta.url),'utf8');
 assert.equal((ui.match(/sm:pt-2/g)||[]).length,2);assert.match(ui,/mb-2 shrink-0 px-1 text-center text-xs leading-4 text-slate-500/);
 const css=await readFile(new URL('../app/components/AskLwrAssistant.module.css',import.meta.url),'utf8');assert.match(css,/\.scroll/);assert.match(css,/100dvh/);assert.match(css,/safe-area-inset-bottom/);
});

test('0717 correction manager clarification executes without model and retains actual retrieval diagnostics',async()=>{
 const {runInNewContext}=await import('node:vm');
 const {resolveOfficialConversation,playerFallbackResult}=await import('../app/lib/askLwrPlayerAnswer.js');
 const {clarificationFromRetrieval,createFollowUpReceipt}=await import('../app/lib/aiConversation.js');
 const {conversationDiagnostics}=await import('../app/lib/aiConversationDiagnostics.js');
 const route=await readFile(new URL('../app/api/ai-assistant/answer/route.js',import.meta.url),'utf8');
 const fn=runInNewContext(route.slice(route.indexOf('async function runManagerAnswer('),route.indexOf('async function eligibleDocuments('))+';runManagerAnswer',{
  performance,resolveOfficialConversation,playerFallbackResult,clarificationFromRetrieval,createClarificationReceipt,createFollowUpReceipt,conversationDiagnostics,
  retrieveOfficialEvidence:async({body})=>retrieval(2,body.question),generateOfficialAnswer:()=>assert.fail('clarification must skip model'),eligibleDocuments:()=>assert.fail('no catalog needed for clarification'),
 });
 const auth={user:{id:userId},supabase:{}},trace={};
 const first=await fn(auth,{question:'When can I start adding players'},trace);assert.equal(first.result.kind,'clarification');assert.ok(first.response.conversationReceipt);
 const next=await fn(auth,{question:'On my team roster',conversationReceipt:first.response.conversationReceipt},trace);
 assert.equal(next.result.kind,'clarification');assert.equal(trace.stage3Invoked,true);assert.equal(next.response.retrieval.candidates.length,32);
 assert.equal(next.response.retrieval.conversationResolution.finalResponseKind,'clarification');assert.ok(next.response.conversationReceipt);assert.equal(next.response.answer.modelCallSkipped,true);
 const o=qualityOutcome({id:randomUUID(),origin:'manager_test',started:1000,completed:1010,execution:next});assert.equal(o.final_kind,'clarification');assert.equal(o.origin,'manager_test');assert.equal(qualityException(o,next).p_occurrence,null);
});
