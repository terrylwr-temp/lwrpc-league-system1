import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {selectAnswerEvidence,generateOfficialAnswer,resolveOfficialSources} from '../app/lib/aiAnswerGeneration.js';
import {selectPolicyEvidence,needsPolicyEvidence} from '../app/lib/aiPolicyEvidence.js';
import {excerptSelection,excerptReferences} from '../app/lib/aiEvidenceExcerpts.js';
import {trustedSelectedRuleIdentity} from '../app/lib/aiSelectedRuleIdentity.js';
import {runPlayerOfficialAnswer,resolveOfficialConversation,isUnsupportedOperationalQuestion} from '../app/lib/askLwrPlayerAnswer.js';
import {readFeedbackReceipt} from '../app/lib/aiConversation.js';
import {qualityOutcome,qualityFeedback,qualityException} from '../app/lib/aiQualitySnapshots.js';
import {retainPassageReader,completeSelectedPassages,conflictingSelectedTargets} from '../app/lib/aiPassageContinuations.js';
import {liveIntent} from '../app/lib/liveLmsIntent.js';

process.env.OPENAI_API_KEY='synthetic-fidelity-key';
process.env.SUPABASE_SERVICE_ROLE_KEY='synthetic-fidelity-receipt';
process.env.AI_QUALITY_HMAC_KEY='synthetic-fidelity-hmac-at-least-32-bytes';
const snapshot=JSON.parse(fs.readFileSync(new URL('../../docs/lms-0725-current-official-evidence.json',import.meta.url)));
const benchmark=JSON.parse(fs.readFileSync(new URL('../../docs/lms-0725-before.json',import.meta.url)));
const candidates=snapshot.evidence.map(c=>({chunkId:c.id,documentId:c.document.id,documentVersionId:c.document_version_id,documentTitle:c.document.title,documentType:c.document.document_type,documentAuthorityRank:c.document.authority_rank,content:c.content,ruleNumber:c.rule_number,heading:c.heading,sectionLabel:c.section_label,pageNumber:c.page_number,chunkOrdinal:c.chunk_ordinal,combinedScore:.8}));
const retrieval=question=>({request:{question,askAbout:'all',context:{}},candidates,suppliedEvidence:candidates,authorityReviewCandidates:candidates,policyEvidence:{status:'complete',candidates},evidence:{sufficient:true,threshold:.35},metrics:{retrievalMs:0,totalMs:0}});
function database(){
 const counts={reads:0,signs:0};
 const versions=[...new Map(snapshot.evidence.map(c=>[c.document_version_id,{id:c.document_version_id,document_id:c.document.id,storage_bucket:'official-fixture',storage_path:c.document_version_id+'.pdf',processing_status:'ready',document:{...c.document,status:'active',active_version_id:c.document_version_id}}])).values()];
 const chunks=snapshot.evidence.map(c=>({...c,is_searchable:true}));
 return {counts,from(table){assert.ok(['ai_document_versions','ai_document_chunks'].includes(table));counts.reads++;let rows=table==='ai_document_versions'?versions:chunks;return {select(){return this;},in(key,values){rows=rows.filter(r=>values.includes(r[key]));return this;},then(resolve,reject){return Promise.resolve({data:rows,error:null}).then(resolve,reject);}};},storage:{from(){return {async createSignedUrl(path){counts.signs++;return {data:{signedUrl:'https://example.invalid/'+path},error:null};}};}}};
}
const blocker='What date can I start entering my roster for weekday league';
const userId='10000000-0000-4000-8000-000000000001';
const answerId='10000000-0000-4000-8000-000000000002';
const reply='You can start updating your Weekday roster on September 28, 2026. League Management will notify you when rosters are unlocked.';
function modelRecorder(){const calls=[];return {calls,fetch:async(url,init)=>{assert.equal(url,'https://api.openai.com/v1/responses');calls.push(JSON.parse(init.body));return {ok:true,json:async()=>({status:'completed',model:'fixture-model',output_text:JSON.stringify({answer:reply,conflict:false})})};}};}

test('0725 exact blocker: real source gate before model, citations, result, Stage 7 and feedback serialize',async()=>{
 const db=database(),model=modelRecorder(),r=retrieval(blocker);
 const execution=await runPlayerOfficialAnswer({body:{question:blocker},role:'league_manager',userId,answerId,supabase:db,retrieveOfficialEvidence:async()=>r,generateOfficialAnswer:args=>generateOfficialAnswer({...args,fetchImpl:model.fetch})});
 assert.equal(execution.result.kind,'answer');assert.equal(model.calls.length,1);assert.match(execution.result.answer,/September 28, 2026/);assert.equal(execution.result.sources.length,2);
 assert.match(execution.result.sources[0].citation,/2026 Fall League Important Dates.*Weekday.*Page 1/);assert.match(execution.result.sources[1].citation,/Captains Guide.*Page 5/);
 assert.match(model.calls[0].input[0].content,/sourceText/);assert.match(model.calls[0].input[0].content,/derivedApplicability/);
 assert.doesNotMatch(model.calls[0].input[0].content,/Weekday DUPR League Key Dates\\n• Sept\. 28/);
 assert.equal(db.counts.reads,2);assert.equal(db.counts.signs,2);
 for(const source of execution.result.sources){assert.match(source.officialDocumentUrl,/^\/official-document\//);assert.ok(source.excerptItems.every(i=>Number.isInteger(i.start)&&i.end>i.start));assert.ok(source.excerptItems.every(i=>!('text' in i)));}
 const claims=readFeedbackReceipt(execution.result.feedbackReceipt,userId);assert.equal(claims.answerId,answerId);assert.ok(claims.selectedEvidence.every(e=>e.excerptItems.length));
 const feedback=qualityFeedback(claims);assert.ok(feedback.p_occurrence.selection_snapshot.selectedEvidence.every(e=>e.excerptItems.length));
 const outcome=qualityOutcome({id:answerId,origin:'player_interface',started:0,completed:1,execution,stage3Invoked:true});assert.equal(outcome.final_kind,'answer');assert.equal(outcome.selected_evidence_count,2);
 JSON.parse(JSON.stringify({execution:execution.result,feedback,outcome}));
});

test('0725 fidelity A/B/C/D/E/F: exact ranges separate, altered text and scope rejected without model',async()=>{
 const c=candidates.find(c=>c.chunkId==='c4ab8544-decb-4ea1-b856-2df4a2d196f1');
 const stored=snapshot.evidence.find(x=>x.id===c.chunkId);
 const lines=c.content.split('\n'),heading=lines[0],date=lines.find(l=>l.includes('Sept. 28'));
 const one=excerptSelection(c,[{text:date}],'opening_date');
 assert.equal((await resolveOfficialSources(database(),[one])).length,1);
 const two=excerptSelection(c,[{text:heading},{text:date}],'opening_date');
 assert.equal(two.excerptItems.length,2);assert.equal((await resolveOfficialSources(database(),[two]))[0].excerptItems.length,2);
 assert.throws(()=>trustedSelectedRuleIdentity({...c,content:heading+'\n'+date,selectedPassages:[heading+'\n'+date]},stored),/not present/);
 assert.throws(()=>trustedSelectedRuleIdentity({...c,content:'league = Weekday\n'+date,selectedPassages:['league = Weekday\n'+date]},stored),/not present/);
 const valid=selectPolicyEvidence(retrieval(blocker));assert.equal((await resolveOfficialSources(database(),valid)).length,2);
 const bad=structuredClone(valid);bad[0].excerptItems[0].applicability.league='saturday';await assert.rejects(resolveOfficialSources(database(),bad),/scope does not match/);
 const invalid=structuredClone(valid);invalid[0].content='fabricated';invalid[0].selectedPassages=['fabricated'];
 const model=modelRecorder();await assert.rejects(generateOfficialAnswer({retrieval:retrieval(blocker),supabase:database(),resolveSources:db=>resolveOfficialSources(db,invalid),fetchImpl:model.fetch}),/not present|range/);assert.equal(model.calls.length,0);
 const overflow=structuredClone(valid);overflow[1].excerptItems[0].end++;await assert.rejects(resolveOfficialSources(database(),overflow),/range/);
 const drift=structuredClone(valid);drift[0].excerptItems[0].start++;await assert.rejects(resolveOfficialSources(database(),drift),/range/);
 assert.deepEqual(excerptSelection(c,[{text:date},{text:date}],'opening_date').excerptItems,one.excerptItems);
});

for(const c of benchmark.cases)test(`0725 integrated benchmark ${c.id}: routing plus real source validation`,async()=>{
 const live=liveIntent(c.question);assert.equal(live?(live.intent==='UNSUPPORTED'?'PROTECTED':'LIVE'):isUnsupportedOperationalQuestion(c.question)?'PROTECTED':'DOCUMENT',c.expectedRoute);
 if(c.expectedRoute!=='DOCUMENT')return;
 assert.notEqual(resolveOfficialConversation({question:c.question,userId}).kind,'protected');
 const r=retrieval(c.question),selected=selectAnswerEvidence(r);
 if(needsPolicyEvidence(c.question))assert.ok(selected.length>0,c.question);
 if(selected.length){const sources=await resolveOfficialSources(database(),selected);assert.equal(sources.length,selected.length);for(const item of selected){const stored=snapshot.evidence.find(x=>x.id===item.chunkId);trustedSelectedRuleIdentity(item,stored);}JSON.parse(JSON.stringify(sources));}
});

for(const league of ['Weekday','Saturday','PrimeTime'])test(`0725 ${league} applicability: order-independent exact excerpts, scope, default and qualifications`,async()=>{
 const q=`Does ${league} use Rally Scoring?`,r=retrieval(q),selected=selectPolicyEvidence(r);
 const reversed=selectPolicyEvidence({...r,policyEvidence:{status:'complete',candidates:[...candidates].reverse()}});assert.deepEqual(reversed,selected);
 const db=database(),sources=await resolveOfficialSources(db,selected);assert.equal(db.counts.reads,2);assert.equal(db.counts.signs,1);
 assert.ok(sources.some(s=>s.ruleNumber==='5.3'));if(league==='Weekday')assert.ok(sources.some(s=>s.ruleNumber==='6.1.9.7'&&s.pageNumber===8));
 assert.ok(sources.flatMap(s=>s.excerptItems).every(i=>!i.applicability.league||i.applicability.league===league.toLowerCase()));
 const text=selected.flatMap(s=>s.selectedPassages).join('\n');assert.match(text,/Standard Scoring/);assert.match(text,/expressly identifies Rally/);assert.match(text,/only when/);
 assert.match(text,league==='Saturday'?/12-12/:/2–2/);
 for(const source of sources)for(const item of source.excerptItems){assert.equal(snapshot.evidence.find(c=>c.id===item.chunkId).content.slice(item.start,item.end),item.text);assert.ok(item.ruleNumber!==undefined);}
 const model=modelRecorder();await generateOfficialAnswer({retrieval:r,supabase:database(),fetchImpl:model.fetch});assert.equal(model.calls.length,1);assert.match(model.calls[0].instructions,/game-winning point|qualifications/);
});

test('0725 historical metadata shape unchanged; excerpt references never persist source prose',()=>{
 assert.deepEqual(excerptReferences({chunkId:'legacy'}),{});
 const selected=selectPolicyEvidence(retrieval(blocker));const refs=excerptReferences(selected[0]);assert.ok(refs.excerptItems.length);assert.doesNotMatch(JSON.stringify(refs),/Sept\. 28|sourceText|signedUrl/);
 const outcome=qualityOutcome({id:answerId,started:0,completed:1,execution:{result:{kind:'insufficient_evidence'},answer:{selectedEvidence:selected},retrieval:retrieval(blocker)},stage3Invoked:true});
 const exception=qualityException(outcome,{result:{kind:'insufficient_evidence',answer:'No answer'},answer:{selectedEvidence:selected},retrieval:retrieval(blocker)});assert.ok(exception.p_occurrence.selection_snapshot.selectedEvidence[0].excerptItems.length);
});

test('0725 exact cross-chunk parts bypass legacy continuation rewriting and retain conflicts',async()=>{
 const r=retrieval('Does Weekday use Rally Scoring?'),selected=selectPolicyEvidence(r);
 let reads=0;retainPassageReader(r,{from(){reads++;throw Error('Unexpected continuation read');}});
 assert.deepEqual(await completeSelectedPassages(r,selected),selected);assert.equal(reads,0);
 const make=(value,league='weekday')=>({sourceClassification:'lwr_controlling',documentAuthorityRank:1,excerptItems:[{text:`Picklebreaker game to ${value}`,applicability:{league,division:'9.1'}}]});
 assert.equal(conflictingSelectedTargets([make(21),make(15)]),true);
 assert.equal(conflictingSelectedTargets([make(21),make(15,'saturday')]),false);
});
