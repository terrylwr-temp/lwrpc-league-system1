import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {interpretQuestion,matchingQuestion,medicalScoreContext} from '../app/lib/aiQuestionInterpretation.js';
process.env.LWR_AI_ENABLED='true';
process.env.AI_QUALITY_HMAC_KEY='synthetic-local-0720-only-'.repeat(3);
process.env.AI_QUALITY_HMAC_KEY_VERSION='1';
const {selectAnswerEvidence}=await import('../app/lib/aiAnswerGeneration.js');
const {resolveOfficialConversation,runPlayerOfficialAnswer}=await import('../app/lib/askLwrPlayerAnswer.js');
import {createFollowUpReceipt,createClarificationReceipt,readConversationReceipt} from '../app/lib/aiConversation.js';
import {trustedSelectedRuleIdentity} from '../app/lib/aiSelectedRuleIdentity.js';
process.env.SUPABASE_SERVICE_ROLE_KEY='synthetic-local-0720-test-key';
const load=async name=>JSON.parse(await readFile(new URL('./fixtures/'+name,import.meta.url),'utf8'));
const captures=[...await load('lms0717-production-evidence.json'),...await load('lms0717-correction-production-evidence.json')];
const current=await load('lms0719-diagnosis-provisions.json');
const pairs=[
 ['What kind of balls will we be usin','using','what kind of ball are we using'],
 ['What kind of ball are we useing','using','what kind of ball are we using'],
 ['What ball are we playng with?','playing','what kind of ball are we using'],
 ['Can I volly in the kitchen?','volley','Can I volley in the kitchen?'],
 ['What if I volly and step into the kitchen?','volley','Can I step into the kitchen after hitting a volley?'],
 ['What happens if the ball is damged?','damaged','What happens if the ball is damaged during play?'],
 ['What happens if the ball is craked during a rally?','cracked','What happens if the ball cracks during a rally?'],
 ['How do I add someone to my roser?','roster','How do I enter players on my roster'],
 ["When do I submit my linep?",'lineup',"When do I need to submit my lineup for Friday's match?"],
 ['How is Seson DUPR determined?','season','How is Season DUPR calculated?'],
 ['What happens with a medcal issue during a match?','medical','What happens if a player has a medical issue and cannot finish the game?'],
 ['When can I add players for Satrday league?','saturday','When can I add players to my roster for the Saturday League?'],
];
function retrieval(question,source) {
 const r=structuredClone(captures.find(c=>c.question===source).retrieval);
 r.request.question=question;
 for(const key of ['candidates','suppliedEvidence','authorityReviewCandidates','intentEvidenceCandidates']) r[key]=(r[key]||[]).map(c=>({...c,...current.find(x=>x.chunkId===c.chunkId)}));
 return r;
}
for(const [question,canonical,source] of pairs) test('0720 production-format paired recovery: '+question,()=>{
 const interpreted=interpretQuestion(question);assert.equal(interpreted.annotations.length,1);assert.equal(interpreted.annotations[0].canonical,canonical);
 const annotation=interpreted.annotations[0];assert.equal(question.slice(annotation.start,annotation.end),annotation.originalToken);assert.equal(annotation.editDistance,1);
 const r=retrieval(question,source), before=JSON.stringify(r.request);
 const selected=selectAnswerEvidence(r), correct=selectAnswerEvidence(retrieval(interpreted.matchingView,source));
 assert.ok(selected.length,question);assert.deepEqual(selected.map(c=>c.content),correct.map(c=>c.content));assert.equal(JSON.stringify(r.request),before);
 assert.ok(r.authorityReviewCandidates.length<=12);assert.ok(selected.length<=4);
});
test('0720 community typo retains qualified specific Rule 3.5',()=>{
 const c=current.find(c=>c.content.includes('3.5.'));
 const r={request:{question:'Can I join a team in another comunity?'},evidence:{sufficient:true,threshold:.35},suppliedEvidence:[{...c,combinedScore:.6}]};
 const selected=selectAnswerEvidence(r);assert.equal(selected.length,1);assert.match(selected[0].content,/roster availability/);
 assert.equal(trustedSelectedRuleIdentity(selected[0],{content:c.content,rule_number:c.ruleNumber}),'3.5');
});
for(const q of ['Can I step into the kitchen?','Can I play a point?','What if I am plaing the ball?','Is Rose eligible for this team?','Can I join the team named Roster?','Can I play for the community named Satrday?','Can I join Satrday team?','NR DUPR 3.50 09/28 Rule 5.7.2','https://example.com/comunity user@medcal.org ID-roser-123','How do I add someone to my rooster?','How do I add ID-roser to my team?','Is Comunity eligible for this team?','Can I volley in a valley?']) test('0720 abstains: '+q,()=>assert.deepEqual(interpretQuestion(q).annotations,[]));
test('0720 bounded edits, no chaining, and signed league slot',()=>{
 assert.equal(matchingQuestion('How do I add someone to my rosetr?'),'How do I add someone to my roster?');
 assert.equal(interpretQuestion('How do I add someone to my rstr?').annotations.length,0);
 assert.equal(interpretQuestion('What if I volly in the kichen?').annotations.length,0);
 assert.equal(interpretQuestion('Weekdy').annotations.length,0);
 assert.equal(matchingQuestion('Weekdy',{leagueChoice:true}),'weekday');
 assert.equal(matchingQuestion('When does PrimeTme start?'),'When does primetime start?');
 assert.equal(interpretQuestion('How do I add roser roser roser roser roser?').annotations.length,4);
 const receipt=createClarificationReceipt('test','When can I add players to my roster?','roster_league',{now:1});
 const r=resolveOfficialConversation({question:'Weekdy',userId:'test',receipt,now:2});
 assert.equal(r.classification,'clarification_response');assert.match(r.effectiveQuestion,/Weekdy League/);assert.equal(r.rawQuestion,'Weekdy');
});
test('0720 guards original and interpreted wording before any retrieval',async()=>{
 for(const question of ['what comunity am i registered with','What is my DUPR?','What team am I on?']) {
  const result=await runPlayerOfficialAnswer({body:{question},userId:'test',role:'player',retrieveOfficialEvidence:()=>assert.fail('protected retrieval'),generateOfficialAnswer:()=>assert.fail('protected model')});
  assert.equal(result.result.kind,'protected');assert.equal(result.conversationResolution.rawQuestion,question);
 }
 assert.equal(resolveOfficialConversation({question:'Can I join a team in another comunity?',userId:'test'}).kind,'resolved');
});
for(const score of [0,5,6,7,8,11]) test('0720 signed medical score condition '+score,()=>{
 const prior='Medical issue during match',question=`What if one team has ${score} points?`;
 const receipt=createFollowUpReceipt('test',prior,{now:1});
 const resolution=resolveOfficialConversation({question,userId:'test',receipt,now:2});
 assert.equal(resolution.classification,'follow_up');assert.equal(resolution.medicalScoreContext.score,score);
 assert.equal(resolution.effectiveQuestion,`Regarding ${prior}, ${question}`);
 assert.equal(readConversationReceipt(receipt,'test',{now:2}).effectiveQuestion,prior);
 const r=retrieval(resolution.effectiveQuestion,'What happens if a player has a medical issue and cannot finish the game?');r.conversationResolution=resolution;
 const selected=selectAnswerEvidence(r);assert.equal(selected.length,1);assert.match(selected[0].content,/5\.7\.1[\s\S]*5\.7\.2[\s\S]*5\.7\.3/);
 assert.equal(trustedSelectedRuleIdentity(selected[0],{content:r.authorityReviewCandidates.find(c=>c.chunkId===selected[0].chunkId).content,rule_number:'5'}),'5.7');
 // A rule label containing the score is not an operative score condition.
 const fake={...selected[0],content:`5.${score}. A player cannot complete a match. Scoring depends on current score.`,combinedScore:.6};
 assert.deepEqual(selectAnswerEvidence({...r,authorityReviewCandidates:[fake],intentEvidenceCandidates:[]}),[]);
});
test('0720 medical boundaries reject missing, expired, wrong-user and unrelated context',()=>{
 const question='What if one team has 7 points?', receipt=createFollowUpReceipt('test','Medical issue during match',{now:1});
 for(const args of [{},{receipt,now:1200002},{receipt,userId:'other'}]) {
  const r=resolveOfficialConversation({question,userId:'test',now:2,...args});assert.equal(r.kind,'clarification');assert.equal(r.medicalScoreContext,undefined);
 }
 const unrelated=createFollowUpReceipt('test','Can I volley in the kitchen?',{now:1});
 assert.equal(resolveOfficialConversation({question,userId:'test',receipt:unrelated,now:2}).medicalScoreContext,null);
 assert.equal(medicalScoreContext('Medical issue during match','What if one team has 7 points and wants reimbursement?'),null);
 assert.equal(medicalScoreContext('Medical issue during match and reimbursement','What if one team has 7 points?'),null);
});
test('0720 Season continuation preserves signed typo spelling in its effective question',()=>{
 const receipt=createFollowUpReceipt('test','When are Seson DUPR ratings recorded?',{now:1});
 const r=resolveOfficialConversation({question:'When are they recorded for the Satrday league?',userId:'test',receipt,now:2});
 assert.equal(r.classification,'follow_up');assert.match(r.effectiveQuestion,/Seson DUPR/);assert.match(r.effectiveQuestion,/Satrday League/);
});
test('0720 manager diagnostics are separate from unchanged player/telemetry presentation',async()=>{
 const manager=await readFile(new URL('../app/ai-assistant/console/page.js',import.meta.url),'utf8');
 assert.match(manager,/Accepted interpretation:/);assert.match(manager,/Corpus suggestions \(not automatically applied\)/);assert.match(manager,/break-words/);
 const snapshots=await readFile(new URL('../app/lib/aiQualitySnapshots.js',import.meta.url),'utf8');
 assert.doesNotMatch(snapshots,/interpretQuestion|matchingView|medicalScoreContext/);
});
test('0720 interpretation overhead is bounded and measurable',()=>{
 const start=performance.now();for(let i=0;i<1000;i++)interpretQuestion(pairs[i%pairs.length][0]);
 const elapsed=performance.now()-start;console.log(`0720 interpretation benchmark: 1000 calls ${elapsed.toFixed(2)}ms; mean ${(elapsed/1000).toFixed(3)}ms`);assert.ok(elapsed<5000);
});
test('0720 equipment typo and correct spelling use the same existing probe budget',async()=>{
 const {retrieveOfficialEvidence}=await import('../app/lib/aiRetrieval.js');
 const baseline=captures.find(c=>c.question==='what kind of ball are we using').retrieval;
 const pool=[...baseline.candidates,...baseline.intentEvidenceCandidates];
 const ball=pool.find(c=>c.documentType==='captains_guide'&&c.content.includes('Franklin')) || pool.find(c=>c.content.includes('Franklin'));
 assert.ok(ball);
 const row=c=>Object.fromEntries(Object.entries(c).map(([key,value])=>[key.replace(/[A-Z]/g,x=>'_'+x.toLowerCase()),value]));
 const budgets=[];
 for(const question of ['What kind of balls will we be usin','What kind of balls will we be using']) {
  const embeddings=[],rpc=[];
  const r=await retrieveOfficialEvidence({body:{question},embedQuery:async text=>{embeddings.push(text);return {embedding:Array(1536).fill(.01)};},supabase:{rpc:async(name,args)=>{rpc.push(args);return {data:args.p_query_text==='match balls'?[row(ball)]:baseline.candidates.map(row),error:null};}}});
  assert.equal(embeddings[0],question);assert.equal(rpc[0].p_query_text,question);assert.equal(r.request.question,question);
  assert.equal(embeddings.length,2);assert.equal(rpc.filter(c=>c.p_query_text==='match balls').length,1);
  assert.ok(selectAnswerEvidence(r).some(c=>c.content.includes('Franklin')));
  budgets.push([embeddings.length,rpc.length]);
 }
 assert.deepEqual(budgets[0],budgets[1]);
 console.log('0720 equipment budget (typo and correct): '+JSON.stringify(budgets));
});
test('0720 Stage 7 keeps original typo wording and protected diagnostics empty',async()=>{
 const {qualityOutcome,qualityException}=await import('../app/lib/aiQualitySnapshots.js');
 const q='Can I join a team in another comunity?';
 const resolution=resolveOfficialConversation({question:q,userId:'test'});
 const execution={result:{kind:'insufficient_evidence',answer:'No source'},conversationResolution:resolution,retrieval:{evidence:{sufficient:false},interpretation:interpretQuestion(q)}};
 const outcome=qualityOutcome({id:'10000000-0000-4000-8000-000000000001',origin:'player_interface',started:1,completed:2,execution});
 const snapshot=qualityException(outcome,execution).p_occurrence;
 assert.equal(snapshot.original_question,q);assert.equal(snapshot.effective_question,q);
 assert.doesNotMatch(JSON.stringify(outcome.diagnostic_snapshot),/comunity|interpretation/);
 const protectedOutcome=qualityOutcome({id:outcome.id,origin:'player_interface',started:1,completed:2,execution:{...execution,result:{kind:'protected'}}});
 assert.deepEqual(protectedOutcome.diagnostic_snapshot,{});
});
