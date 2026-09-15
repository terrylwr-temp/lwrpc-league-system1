import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {questionIntent} from '../app/lib/aiRequestIntent.js';
import {selectPolicyEvidence} from '../app/lib/aiPolicyEvidence.js';
import {officialDatePeriod} from '../app/lib/aiLeagueDateFacts.js';
import {officialDocumentPeriod,revalidateExcerptItems} from '../app/lib/aiEvidenceExcerpts.js';
import {clarificationFromRetrieval,resolveConversationTurn,createClarificationReceipt} from '../app/lib/aiConversation.js';
import {ASK_LWR_HELP_GROUPS,ASK_LWR_INITIAL_COPY} from '../app/lib/askLwrAssistantConfig.js';
import {liveIntent} from '../app/lib/liveLmsIntent.js';
const snapshot=JSON.parse(fs.readFileSync(new URL('../../docs/lms-0725-league-dates-current-evidence.json',import.meta.url)));
const cases=JSON.parse(fs.readFileSync(new URL('../../docs/lms-0725-league-date-cases.json',import.meta.url))).cases;
const candidates=snapshot.evidence.map(c=>({chunkId:c.id,documentId:c.document.id,documentVersionId:c.document_version_id,documentTitle:c.document.title,documentType:c.document.document_type,content:c.content,heading:c.heading,pageNumber:c.page_number,chunkOrdinal:c.chunk_ordinal,combinedScore:.8}));
const chunks=new Map(snapshot.evidence.map(c=>[c.id,{...c,is_searchable:true}]));
const retrieval=question=>({request:{question},candidates,policyEvidence:{status:'complete',candidates},evidence:{sufficient:true}});
for(const c of cases)test(`0725 date ${c.id}: ${c.question}`,()=>{
 const intent=questionIntent(c.question);assert.equal(intent.object,'league_date');assert.equal(liveIntent(c.question),null);
 const r=retrieval(c.question),resolution=resolveConversationTurn({question:c.question,userId:'fixture-user'});
 const clarify=clarificationFromRetrieval(resolution,r);
 if(c.expectedKind==='clarification'){assert.equal(clarify.clarification.category,'league_date');assert.deepEqual(clarify.clarification.options,['Weekday','Saturday','PrimeTime']);return;}
 assert.equal(clarify,null);
 const selected=selectPolicyEvidence(r);
 if(c.expectedKind==='insufficient_evidence'){assert.deepEqual(selected,[]);return;}
 assert.ok(selected.length>0);
 for(const source of selected){
  assert.equal(source.documentType,'league_supplement');assert.match(source.documentTitle,/Important Dates/);
  const stored=chunks.get(source.chunkId);
  const verified=revalidateExcerptItems(source,stored,chunks,officialDocumentPeriod(source.documentTitle));
  for(const item of verified){assert.equal(stored.content.slice(item.start,item.end),item.text);assert.equal(item.officialDatePeriod.calendarYear,String(c.expectedYear));assert.ok(intent.leagues.includes(item.applicability.league));assert.equal(item.scopeBindings.length,1);assert.doesNotMatch(item.text,/Note:/);}
 }
 const text=selected.flatMap(s=>s.selectedPassages).join('\n');
 assert.match(text,new RegExp(c.expectedMonth,'i'));for(const day of c.expectedDays)assert.match(text,new RegExp('\\b'+day+'\\b'));
 if(['Q64','Q65','Q66','Q67','Q68','Q70','Q71','Q72'].includes(c.id))assert.match(text,/14 \(Women\)\/15\(Men\)/);
 if(c.id==='Q75'||c.id==='Q88')assert.doesNotMatch(text,/Oct\. 24/);
 if(c.id==='Q76'||c.id==='Q77')assert.doesNotMatch(text,/Oct\. 17/);
});
test('0725 date metadata is revalidated, never accepted from caller; altered text or scope fails',()=>{
 const selected=selectPolicyEvidence(retrieval('When are Saturday playoffs?'))[0],stored=chunks.get(selected.chunkId);
 selected.excerptItems[0].officialDatePeriod={calendarYear:'2099',seasonLabel:'fabricated'};
 assert.equal(revalidateExcerptItems(selected,stored,chunks,officialDocumentPeriod(selected.documentTitle))[0].officialDatePeriod.calendarYear,'2027');
 const altered=structuredClone(selected);altered.excerptItems[0].text+=' invented';assert.throws(()=>revalidateExcerptItems(altered,stored,chunks,officialDocumentPeriod(selected.documentTitle)));
 const scope=structuredClone(selected);scope.excerptItems[0].applicability.league='weekday';assert.throws(()=>revalidateExcerptItems(scope,stored,chunks,officialDocumentPeriod(selected.documentTitle)));
});
test('0725 ambiguous source period and unordered dates cannot manufacture a calendar year',()=>{
 const content='Saturday DUPR League Key Dates\n• Dec. 4 - Season Starts\n• Jan. 9 - Championship';
 assert.equal(officialDatePeriod(content,content.indexOf('• Jan'),officialDocumentPeriod('26/27 Important Dates')).calendarYear,null);
 const unordered='Saturday DUPR League Key Dates\n• May 4 - Season Starts\n• April 9 - Championship';
 assert.equal(officialDatePeriod(unordered,unordered.indexOf('• April'),officialDocumentPeriod('2026 Important Dates')).calendarYear,null);
});
test('0725 signed league clarification preserves gender/date intent and rejects another user context',()=>{
 process.env.SUPABASE_SERVICE_ROLE_KEY='local-date-test-secret-at-least-32-characters';
 const question="What day does the women's league start?",receipt=createClarificationReceipt('fixture-user',question,'league_date');
 const resolved=resolveConversationTurn({question:'Weekday',userId:'fixture-user',receipt});
 assert.equal(resolved.clarificationConsumed,true);assert.equal(questionIntent(resolved.effectiveQuestion).gender,'women');assert.deepEqual(questionIntent(resolved.effectiveQuestion).leagues,['weekday']);
 const denied=resolveConversationTurn({question:'Weekday',userId:'other-user',receipt});assert.equal(denied.receiptValidation,'invalid_or_expired');assert.notEqual(denied.clarificationConsumed,true);
});
test('0725 compact welcome advertises four implemented read intents and retains all existing benchmark cases',()=>{
 assert.ok(ASK_LWR_INITIAL_COPY.length<140);assert.equal(ASK_LWR_HELP_GROUPS.length,3);
 assert.deepEqual(ASK_LWR_HELP_GROUPS[1].questions.map(q=>liveIntent(q)?.intent),['SELF_RATING','SELF_TEAM','TEAM_ROSTER','NEXT_MATCH']);
 const base=JSON.parse(fs.readFileSync(new URL('../../docs/lms-0725-before.json',import.meta.url))).cases;assert.equal(base.length,63);assert.equal(new Set([...base,...cases].map(c=>c.id)).size,89);
});

test('0725 current Rules table of contents is not an operative Rally mechanics section',()=>{
 const selected=selectPolicyEvidence(retrieval('How does Rally Scoring work?'));
 assert.ok(selected.length>0);assert.ok(selected.every(c=>!c.content.includes('........................')));
 const text=selected.flatMap(c=>c.selectedPassages).join('\n');
 assert.match(text,/game-winning point only while serving/);assert.match(text,/unfreeze|unfrozen/);
 for(const c of selected)revalidateExcerptItems(c,chunks.get(c.chunkId),chunks,officialDocumentPeriod(c.documentTitle));
});
