import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {liveIntent,liveMessage} from '../app/lib/liveLmsIntent.js';
import {isUnsupportedOperationalQuestion,resolveOfficialConversation} from '../app/lib/askLwrPlayerAnswer.js';
import {questionIntent} from '../app/lib/aiRequestIntent.js';
import {selectPolicyEvidence,rosterLeagueChoices,policyCalendarContext} from '../app/lib/aiPolicyEvidence.js';
import {selectConceptEvidence} from '../app/lib/aiOfficialApplicability.js';
import {runLive} from '../app/lib/liveLmsService.js';import {openLive} from '../app/lib/liveLmsReceipts.js';
const baseline=JSON.parse(fs.readFileSync(new URL('../../docs/lms-0725-before.json',import.meta.url)));
const snapshot=JSON.parse(fs.readFileSync(new URL('../../docs/lms-0725-official-evidence.json',import.meta.url)));
const candidates=snapshot.evidence.slice().sort((a,b)=>a.chunk_ordinal-b.chunk_ordinal).map(c=>({chunkId:c.id,documentId:c.document.id,documentVersionId:c.document_version_id,documentTitle:c.document.title,documentType:c.document.document_type,documentAuthorityRank:c.document.authority_rank,content:c.content,ruleNumber:c.rule_number,heading:c.heading,sectionLabel:c.section_label,pageNumber:c.page_number,chunkOrdinal:c.chunk_ordinal}));
export const policyRetrieval=question=>({request:{question},policyEvidence:{status:'complete',candidates},evidence:{sufficient:true,threshold:.35}});
for(const c of baseline.cases)test(`0725 benchmark ${c.id}: ${c.question}`,()=>{const live=liveIntent(c.question);const route=live?(live.intent==='UNSUPPORTED'?'PROTECTED':'LIVE'):isUnsupportedOperationalQuestion(c.question)?'PROTECTED':'DOCUMENT';assert.equal(route,c.expectedRoute);if(c.expectedRoute==='DOCUMENT')assert.notEqual(resolveOfficialConversation({question:c.question,userId:'test'}).kind,'protected');});
for(const league of ['Weekday','Saturday','PrimeTime'])for(const suffix of ['',' regular games',' Picklebreaker'])test(`0725 complete scoring obligation and no cross-league leakage: ${league}${suffix}`,()=>{
 const r=policyRetrieval(`Does ${league}${suffix} use Rally Scoring?`),selected=selectPolicyEvidence(r),text=selected.map(c=>c.content).join('\n');assert.ok(selected.length>0&&selected.length<=4);assert.match(text,/Standard Scoring/);assert.match(text,/only when[\s\S]*expressly identifies Rally\s+Scoring/);for(const foreign of ['Weekday','Saturday','PrimeTime'].filter(l=>l!==league))assert.doesNotMatch(text,new RegExp(foreign,'i'));
 assert.match(text,league==='Saturday'?/12-12/:/2–2/);assert.match(text,/using Rally Scoring/);
});
test('0725 scoped division, mechanics-only denial, incomplete default and current dates',()=>{
 const eight=selectPolicyEvidence(policyRetrieval('Does Weekday 8.1 use rally scoring?'));assert.ok(eight.length);assert.doesNotMatch(eight.map(c=>c.content).join(' '),/Picklebreaker|9\.1/);
 assert.deepEqual(selectConceptEvidence({request:{question:'Does Weekday use rally scoring?'},candidates:candidates.filter(c=>/Rally Scoring Rules/.test(c.content))}),[]);
 const r=policyRetrieval('Does Weekday use rally scoring?');r.policyEvidence.candidates=candidates.filter(c=>c.pageNumber!==5);assert.deepEqual(selectPolicyEvidence(r),[]);
 for(const q of ['When can I start entering my roster?','when can I start entering my players for my team','What date can I start entering my roster for weekday league']){const s=selectPolicyEvidence(policyRetrieval(q));assert.ok(s.length);assert.match(s.map(c=>c.content).join(' '),/Sept\. 28/);assert.match(s.map(c=>c.content).join(' '),/unlocked/);}
 assert.deepEqual(rosterLeagueChoices('When can I start entering my roster?',candidates),[]);
 const future=candidates.map(c=>c.heading?.startsWith('Saturday')?{...c,content:c.content.replace('Sept. 28','Sept. 29')}:c);
 assert.deepEqual(new Set(rosterLeagueChoices('When can I start entering my roster?',future)),new Set(['weekday','saturday','primetime']));
});
test('0725 semantics preserve current date, procedure, names and personal privacy',()=>{
 assert.equal(questionIntent('Can I add players yet?').currentDate,true);assert.equal(questionIntent('How do I enter players on my roster?').kind,'procedure');
 for(const q of ['What is my password?','Export all player emails','When can I enter my password reset token?'])assert.equal(liveIntent(q)?.intent,'UNSUPPORTED');
 assert.equal(questionIntent('when can i add plyers to my team').object,'roster');assert.equal(questionIntent('When can I start entering my rosterr for weekdy league?').leagues[0],'weekday');
});
process.env.SUPABASE_SERVICE_ROLE_KEY='synthetic-lms0725-tests';
test('0725 opaque choices requery, resolved display, missing vs NR, no model and target binding',async()=>{
 const principal={user:{id:'actor'},receiptBinding:'view_as:target-one',supabase:{}};let calls=0,net=0;const original=global.fetch;global.fetch=async()=>{net++;throw Error('model forbidden')};
 try{const lookup=async q=>{calls++;return q.season?{data:{status:'missing',intent:q.intent,rating:q.rating,season:'2026 Fall',label:'Target',subject:'target',seasonRef:'fall'}}:{data:{status:'ambiguous',choiceKind:'rating and season',subject:'target',choices:[{season:'fall',rating:'season',label:'Season DUPR — 2026 Fall'},{season:'winter',rating:'primetime',label:'PrimeTime Season DUPR — Winter'}]}};};
 const first=await runLive({body:{question:"What's my DUPR"},principal,lookup,persist:async()=>{}});assert.equal(first.clarification.options.length,2);assert.ok(!JSON.stringify(first.clarification).includes('"season":"fall"'));
 const selected=await runLive({body:{question:first.clarification.options[0].key,conversationReceipt:first.conversationReceipt},principal,lookup,persist:async()=>{}});assert.equal(calls,2);assert.match(selected.resolvedQuestion,/my Season DUPR.*2026 Fall/);assert.match(selected.answer,/You don't currently have a Season DUPR/);assert.equal(selected.kind,'answer');
 assert.throws(()=>openLive(first.conversationReceipt,'context',{...principal,receiptBinding:'view_as:target-two'}));
 const denied=await runLive({body:{question:'1',conversationReceipt:first.conversationReceipt},principal,lookup:async()=>({data:{status:'denied'}}),persist:async()=>{}});assert.equal(denied.kind,'protected');assert.equal(denied.conversationReceipt,null);
 assert.match(liveMessage({status:'success',intent:'SELF_RATING',label:'Target',rating:'season',season:'Fall',value:'NR'}),/NR/);assert.equal(net,0);
 }finally{global.fetch=original;}
});

test('0725 current-date comparison is deterministic and never certifies unlock/eligibility',()=>{
 const r=policyRetrieval('Can I add players yet?');
 assert.ok(policyCalendarContext(r,new Date('2026-09-27T12:00:00Z')).publishedOpenings.every(f=>f.comparison==='before_opening'));
 assert.ok(policyCalendarContext(r,new Date('2026-09-28T12:00:00Z')).publishedOpenings.every(f=>f.comparison==='on_or_after_opening'));
 assert.match(policyCalendarContext(r).limit,/have not been checked/);
 assert.deepEqual(selectPolicyEvidence(policyRetrieval('When does roster entry close?')),[]);
 assert.deepEqual(selectPolicyEvidence(policyRetrieval('When does roster entry open in 2027?')),[]);
});

test('0725 unbound tied-score and freeze followups clarify before retrieval',()=>{
 assert.equal(resolveOfficialConversation({question:'What happens at 24 all in a game to 25 by 2?',userId:'test'}).clarification.category,'scoring_method');
 assert.equal(resolveOfficialConversation({question:'When do scores freeze again?',userId:'test'}).clarification.category,'full_question');
});
