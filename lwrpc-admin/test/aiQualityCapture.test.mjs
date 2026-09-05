import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {normalizeQualityQuestion,assertNormalizedQuestion,qualityFingerprint} from '../app/lib/aiQualityGrouping.js';
import {qualityOutcome,qualityException,qualityFeedback} from '../app/lib/aiQualitySnapshots.js';
import {observeQualityRequest,persistQuality} from '../app/lib/aiQualityCapture.js';
import {runPlayerOfficialAnswer} from '../app/lib/askLwrPlayerAnswer.js';
import {createFeedbackReceipt,readFeedbackReceipt,feedbackTransition} from '../app/lib/aiConversation.js';
process.env.AI_QUALITY_HMAC_KEY='separate-quality-fixture-key-at-least-32-bytes';
process.env.SUPABASE_SERVICE_ROLE_KEY='quality-receipt-fixture';
const userId=randomUUID();
const source={documentId:randomUUID(),documentVersionId:randomUUID(),chunkId:randomUUID(),documentType:'usap_rulebook',documentTitle:'Official USAP Rules',pageNumber:3};
const retrieval={candidates:[source],evidence:{sufficient:true},environment:{evidenceThreshold:.35,retrievalLimit:8,authorityReviewLimit:12}};
function execution(kind='answer',question='Can I volley in the kitchen?'){return {result:{kind,answer:'Fixture answer',feedbackReceipt:kind==='answer'?'sealed':null},answer:{answer:'Fixture answer',evidenceSufficient:kind==='answer',selectedEvidence:[source],sources:[source],model:'fixture'},retrieval,conversationResolution:{rawQuestion:question,effectiveQuestion:question,classification:'standalone'}};}
function outcome(e,origin='player_interface'){return qualityOutcome({id:randomUUID(),origin,started:1000,completed:1100,execution:e});}
const store=rows=>({rpc:(_n,p)=>({abortSignal:async()=>{rows.push(p);return {error:null};}})});
test('0716 Unicode expansion retained; byte boundary and boundary+1',()=>{
 const n=normalizeQualityQuestion('İ'.repeat(2400));assert.equal([...n].length,4800);assert.equal(Buffer.byteLength(n),7200);
 for(const text of ['é'.repeat(16384),'x'.repeat(32768)]){assert.doesNotThrow(()=>assertNormalizedQuestion(text));assert.equal(normalizeQualityQuestion(text),text);assert.throws(()=>normalizeQualityQuestion(text+'a'),/quality_normalized_size/);}
});
test('0716 conservative versioned fingerprints preserve material distinctions',()=>{
 const fp=q=>qualityFingerprint(q,'player_interface','unanswered').fingerprint;
 assert.equal(fp(' What BALL are we using?? '),fp('what ball are we using'));assert.equal(fp('Café?'),fp('Cafe\u0301?'));
 for(const q of ['What are the legal ball specifications?','What ball are we not using?','What ball are we using in 2027?'])assert.notEqual(fp(q),fp('What ball are we using?'));
 assert.notEqual(fp('question'),qualityFingerprint('question','manager_test','unanswered').fingerprint);
 assert.notEqual(fp('question'),qualityFingerprint('question','player_interface','conflict').fingerprint);
 assert.throws(()=>qualityFingerprint('question','player_interface','unanswered',{key:''}));
});
test('0716 unvoted grounded metadata only; correlated receipt and unchanged result keys',async()=>{
 const rows=[];const e=await observeQualityRequest({supabase:store(rows),persist:(s,b)=>persistQuality(s,b,{log:()=>{}}),run:answerId=>runPlayerOfficialAnswer({body:{question:'Can I volley in the kitchen?'},role:'player',userId,answerId,retrieveOfficialEvidence:async()=>structuredClone(retrieval),generateOfficialAnswer:async()=>execution().answer})});
 assert.equal(readFeedbackReceipt(e.result.feedbackReceipt,userId).answerId,rows[0].p_outcome.id);assert.equal(rows[0].p_outcome.feedback_eligible,true);assert.equal(rows[0].p_occurrence,null);assert.equal(rows[0].p_route,null);
 assert.doesNotMatch(JSON.stringify(rows),/Can I volley|Fixture answer/);assert.ok(!JSON.stringify(rows).includes(userId));
 assert.deepEqual(Object.keys(e.result).sort(),['answer','conflict','conversationReceipt','evidenceSufficient','feedbackReceipt','kind','sources'].sort());
});
for(const kind of ['insufficient_evidence','conflict'])test(`0716 automatic ${kind} detail without vote`,()=>{const e=execution(kind),o=outcome(e),d=qualityException(o,e);assert.equal(d.p_occurrence.answer_id,o.id);assert.equal(d.p_occurrence.occurrence_kind,kind);assert.equal(d.p_occurrence.selection_snapshot.selectedEvidence[0].chunkId,source.chunkId);});
test('0716 candidate conflict hint alone creates no occurrence',()=>{const e=execution();e.answer.conflict={potentialConflict:true};assert.equal(qualityException(outcome(e),e).p_occurrence,null);});
for(const kind of ['protected','clarification'])test(`0716 ${kind} no text, group or feedback`,()=>{const e=execution(kind,'What is my DUPR?');e.retrieval=null;e.answer={};e.conversationResolution.rawLiveDataGuard=kind==='protected';const o=outcome(e);assert.equal(o.final_kind,kind);assert.equal(o.feedback_eligible,false);assert.equal(qualityException(o,e).p_occurrence,null);assert.doesNotMatch(JSON.stringify(o),/DUPR/);if(kind==='protected'){assert.equal(o.guard_classification,'raw_live_data_guard');assert.equal(o.stage3_invoked,false);assert.equal(o.source_family,'none');}});
test('0716 clarification ending in no source retains bounded resolver only',()=>{const e=execution('insufficient_evidence');Object.assign(e.conversationResolution,{classification:'clarification_response',clarificationConsumed:true,conversation:['secret'],receipt:'secret'});const d=qualityException(outcome(e),e);assert.equal(d.p_occurrence.resolver_snapshot.clarificationConsumed,true);assert.doesNotMatch(JSON.stringify(d),/secret/);});
test('0716 manager tests separate and ineligible',()=>{const o=outcome(execution(),'manager_test');assert.equal(o.origin,'manager_test');assert.equal(o.feedback_eligible,false);});
test('0716 legacy receipt and four-click append-only transition unchanged',()=>{const r=createFeedbackReceipt({userId,originalQuestion:'Question?',effectiveQuestion:'Question?',answer:'Answer',assistantVersion:'LMS-0715'});const c=readFeedbackReceipt(r,userId);assert.equal(qualityFeedback(c).p_occurrence.origin,'legacy_unknown');const events=[];let last;for(const v of [true,true,false,false])if(feedbackTransition(last,v)){events.push(v);last=v;}assert.deepEqual(events,[true,false]);assert.equal(feedbackTransition(false,true),true);assert.throws(()=>readFeedbackReceipt(r,randomUUID()));});
test('0716 privacy redaction isolates group and excludes chunks/URLs/vectors',()=>{const e=execution('insufficient_evidence','Email player@example.com');e.answer.selectedEvidence=[{...source,content:'UNSAFE',embedding:[1],signedUrl:'https://bad?token=secret'}];const d=qualityException(outcome(e),e);assert.equal(d.p_route,null);assert.equal(d.p_occurrence.redaction_applied,true);assert.doesNotMatch(JSON.stringify(d),/player@example|UNSAFE|https:|embedding/);});
test('0716 build/oversize/write/logger/timeout failures fail open',async()=>{
 for(const build of [()=>{throw Error('secret');},()=>normalizeQualityQuestion('é'.repeat(16384)+'a')])assert.equal(await persistQuality({},build,{log:()=>{throw Error('logger');}}),false);
 const e=execution();assert.equal(await observeQualityRequest({run:async()=>e,persist:async()=>{throw Error('storage');}}),e);
 assert.equal(await observeQualityRequest({run:async()=>e,persist:(s,b)=>persistQuality(s,()=>{b();normalizeQualityQuestion('é'.repeat(16384)+'a');},{log:()=>{}})}),e);
 let aborted=false;const logs=[];const hanging={rpc:()=>({abortSignal:s=>new Promise(resolve=>s.addEventListener('abort',()=>{aborted=true;resolve({error:{message:'secret'}});}))})};
 assert.equal(await persistQuality(hanging,()=>({}),{budgetMs:10,log:(...a)=>logs.push(a)}),false);assert.equal(aborted,true);assert.deepEqual(logs,[['capture_failed','persistence']]);
});
test('0716 technical failure operational only and original error preserved',async()=>{let p;const error=Error('private');await assert.rejects(observeQualityRequest({run:async(_id,t)=>{t.stage3Invoked=true;throw error;},persist:async(_s,b)=>{p=b();}}),e=>e===error);assert.equal(p.p_outcome.final_kind,'technical_error');assert.equal(p.p_outcome.stage3_invoked,true);assert.equal(p.p_occurrence,null);assert.doesNotMatch(JSON.stringify(p),/private/);});
test('0716 static migration and player payload boundaries',async()=>{const sql=await readFile(new URL('../supabase-ai-assistant-lms-0716-stage7a.sql',import.meta.url),'utf8');assert.equal((sql.match(/create table if not exists/g)||[]).length,6);assert.equal((sql.match(/enable row level security/g)||[]).length,6);assert.match(sql,/octet_length\(normalized_question\) between 1 and 32768/);assert.doesNotMatch(sql,/alter table public\.ai_answer_feedback_events|update public\.ai_answer_feedback_events|delete from public\.ai_answer_feedback_events/i);assert.match(sql,/security invoker/);assert.match(sql,/pg_advisory_xact_lock/);const route=await readFile(new URL('../app/api/ask-lwr/route.js',import.meta.url),'utf8');assert.match(route,/json\(\{ success: true, result \}\)/);});
