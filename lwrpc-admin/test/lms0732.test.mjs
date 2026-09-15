import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {questionIntent} from '../app/lib/aiRequestIntent.js';
import {liveIntent} from '../app/lib/liveLmsIntent.js';
import {selectPolicyEvidence} from '../app/lib/aiPolicyEvidence.js';
import {completePolicyEvidence} from '../app/lib/aiPolicyEvidence.js';
import {database} from './fixtures/lms0732-documents.mjs';
import {resolveConversationTurn,clarificationFromRetrieval,createClarificationReceipt,createFollowUpReceipt} from '../app/lib/aiConversation.js';
import {revalidateExcerptItems,officialDocumentPeriod} from '../app/lib/aiEvidenceExcerpts.js';
const source=JSON.parse(fs.readFileSync(new URL('../../docs/lms-0732-current-source-verification.json',import.meta.url)));
export const candidates=source.passages.filter(c=>c.is_searchable).map(c=>({chunkId:c.chunk_id,documentId:c.document_id,documentVersionId:c.version_id,documentTitle:c.title,documentType:c.title.includes('Dates')?'league_supplement':'captain_guide',documentAuthorityRank:c.authority_rank,pageNumber:c.page_number,heading:c.heading,sectionLabel:c.section_label,chunkOrdinal:c.chunk_ordinal,content:c.content,combinedScore:.8}));
export const retrieval=(question,rows=candidates)=>({request:{question},candidates:rows,policyEvidence:{status:'complete',candidates:rows},evidence:{sufficient:true}});
const controls=JSON.parse(fs.readFileSync(new URL('../../docs/lms-0732-offline-routing-diagnosis.json',import.meta.url))).rows;
for(const {question} of controls.slice(0,17).filter(x=>x.question!=='How do I register it?'))test('0732 document '+question,()=>{
 const intent=questionIntent(question);assert.ok(['team_registration','schedule_release'].includes(intent.object));assert.equal(liveIntent(question),null);
 const r=retrieval(question),resolved=resolveConversationTurn({question,userId:'fixture'});assert.equal(resolved.kind,'resolved');assert.equal(clarificationFromRetrieval(resolved,r),null);
 const selected=selectPolicyEvidence(r);assert.equal(selected.length,intent.object==='team_registration'?2:intent.leagues.length||3);
 for(const c of selected){const stored=candidates.find(x=>x.chunkId===c.chunkId);const chunks=new Map(candidates.map(x=>[x.chunkId,{...x,document_version_id:x.documentVersionId,is_searchable:true,content:x.content}]));revalidateExcerptItems(c,chunks.get(c.chunkId),chunks,officialDocumentPeriod(c.documentTitle));assert.ok(stored);
 if(intent.object==='schedule_release'){assert.match(c.content,/Oct\. 7/);assert.doesNotMatch(c.content,/Open Registration|Season Starts|rosters/);if(intent.leagues.length)assert.ok(intent.leagues.includes(c.excerptItems[0].applicability.league));}
 }
});
test('0732 exact original retains context',()=>{const p=questionIntent(controls[1].question);assert.deepEqual(p.leagues,['primetime']);assert.equal(p.season.label,'2026 Fall Season');assert.equal(p.policyYear,'2026');});
test('0732 Captain needs-to-do form is procedural',()=>{const q='What a Captain needs to do to register a team';assert.equal(questionIntent(q).object,'team_registration');assert.equal(liveIntent(q),null);});
test('0732 live contrasts',()=>{assert.equal(liveIntent('What is my PrimeTime Season DUPR for 2026 Fall?').intent,'SELF_RATING');assert.equal(liveIntent('What is my next match?').intent,'NEXT_MATCH');for(const q of ["Is my team's schedule ready?",'Is my PrimeTime team registered?','What teams are registered in PrimeTime?'])assert.equal(liveIntent(q).intent,'UNSUPPORTED');assert.equal(questionIntent('How do I create a schedule?').object,null);});
test('0732 incomplete procedure fails closed',()=>{assert.deepEqual(selectPolicyEvidence(retrieval(controls[1].question,candidates.filter(c=>c.pageNumber!==5))),[]);});
test('0732 source year and missing coverage fail closed',()=>{assert.deepEqual(selectPolicyEvidence(retrieval('When will 2027 Fall PrimeTime schedules be sent?')),[]);assert.deepEqual(selectPolicyEvidence(retrieval('When will schedules be sent?',candidates.filter(c=>!c.heading.includes('Saturday')))),[]);});
test('0732 different future dates clarify only unresolved applicable league',()=>{
 process.env.SUPABASE_SERVICE_ROLE_KEY='local-0732-fixture-secret-at-least-32-characters';
 const rows=structuredClone(candidates);rows.find(c=>c.heading.includes('PrimeTime')).content=rows.find(c=>c.heading.includes('PrimeTime')).content.replace('Oct. 7','Oct. 8');
 const q='When will 2026 Fall schedules be sent?',r=retrieval(q,rows),resolution=resolveConversationTurn({question:q,userId:'fixture'}),clarify=clarificationFromRetrieval(resolution,r);
 assert.deepEqual(clarify.clarification.options,['Weekday','PrimeTime']);assert.deepEqual(selectPolicyEvidence(r),[]);
 const receipt=createClarificationReceipt('fixture',q,clarify.clarification.category);
 const chosen=resolveConversationTurn({question:'PrimeTime',receipt,userId:'fixture'});assert.equal(chosen.kind,'resolved');assert.equal(questionIntent(chosen.effectiveQuestion).season.label,'2026 Fall Season');assert.deepEqual(questionIntent(chosen.effectiveQuestion).leagues,['primetime']);
 assert.equal(resolveConversationTurn({question:'Saturday',receipt,userId:'fixture'}).kind,'clarification');assert.notEqual(resolveConversationTurn({question:'PrimeTime',receipt,userId:'other'}).clarificationConsumed,true);
});
test('0732 procedure referent requires valid context',()=>{process.env.SUPABASE_SERVICE_ROLE_KEY='local-0732-fixture-secret-at-least-32-characters';const question='How do I register it?';assert.equal(resolveConversationTurn({question,userId:'fixture'}).kind,'clarification');const receipt=createFollowUpReceipt('fixture',controls[1].question);const resolved=resolveConversationTurn({question,userId:'fixture',receipt});assert.equal(resolved.effectiveQuestion,controls[1].question);});
test('0732 conflicting season league does not retrieve',()=>{const q='When will 2026 Fall Saturday schedules be sent?';assert.equal(resolveConversationTurn({question:q,userId:'fixture'}).kind,'clarification');assert.deepEqual(selectPolicyEvidence(retrieval(q)),[]);});
test('0732 active completion reads existing source rows and closes on missing versions',async()=>{
 const r={request:{question:'When will schedules be sent?'}};await completePolicyEvidence(database(),r);assert.equal(r.policyEvidence.status,'complete');assert.equal(selectPolicyEvidence(r).length,3);
 const missing={from(){return {select(){return this;},eq(){return this;},limit(){return Promise.resolve({data:[],error:null});}};}};
 const absent={request:{question:controls[1].question}};await completePolicyEvidence(missing,absent);assert.equal(absent.policyEvidence.status,'unavailable');assert.deepEqual(selectPolicyEvidence(absent),[]);
});
test('0732 BY qualifiers survive selection and differing qualifiers require clarification',()=>{
 const rows=structuredClone(candidates);for(const c of rows)if(c.documentType==='league_supplement')c.content=c.content.replace('Schedules completed and sent','Schedules completed and sent by this date');
 const q='When will schedules be sent?';const selected=selectPolicyEvidence(retrieval(q,rows));assert.equal(selected.length,3);assert.ok(selected.every(c=>c.content.includes('by this date')));
 rows.find(c=>c.heading.includes('Saturday')).content=rows.find(c=>c.heading.includes('Saturday')).content.replace(' by this date','');assert.deepEqual(selectPolicyEvidence(retrieval(q,rows)),[]);
});
