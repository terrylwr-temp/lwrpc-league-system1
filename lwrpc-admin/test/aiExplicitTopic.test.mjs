import assert from 'node:assert/strict';
import test from 'node:test';
import {createFollowUpReceipt, resolveConversationTurn} from '../app/lib/aiConversation.js';
import {resolveOfficialConversation, runPlayerOfficialAnswer} from '../app/lib/askLwrPlayerAnswer.js';

process.env.SUPABASE_SERVICE_ROLE_KEY = 'explicit-topic-test-only';
const userId = '11111111-1111-4111-8111-111111111111';
const questions = [
  'Regarding Season DUPR rating date, When is that actual date',
  'Regarding the Season DUPR rating date, when is it?',
  'Concerning Season DUPR ratings: what is that date?',
  'As for Season DUPR ratings, when are they recorded?',
  'Regarding Match Setup, when is it due?',
  'Regarding the match ball, what is it?',
];
for (const question of questions) test(`explicit current topic: ${question}`, () => {
  for (const receipt of [null, 'invalid-context', createFollowUpReceipt(userId, 'Can I volley in the kitchen?')]) {
    const result = resolveConversationTurn({question, userId, receipt});
    assert.equal(result.kind, 'resolved');
    assert.match(result.classification, /^standalone/);
    assert.equal(result.effectiveQuestion, question);
    assert.equal(result.clarification, null);
  }
});

test('dependent references still require signed context', () => {
  for (const question of ['When is that actual date?', 'Regarding that, when is it?', 'Regarding the previous date, when is it?', 'Regarding it: what is that date?']) {
    assert.equal(resolveConversationTurn({question,userId}).kind, 'clarification', question);
    const result = resolveConversationTurn({question,userId,receipt:createFollowUpReceipt(userId,'When are Season DUPR ratings recorded?')});
    assert.equal(result.classification, 'follow_up', question);
  }
});

test('explicit topics do not bypass private-data guards', () => {
  assert.equal(resolveOfficialConversation({question:'Regarding my account, what is that email?',userId}).kind,'protected');
});

test('exact player request reaches retrieval unchanged and retains its answer', async () => {
  const question = questions[0]; let retrieved = false;
  const output = await runPlayerOfficialAnswer({body:{question},userId,role:'commissioner',supabase:null,
    retrieveOfficialEvidence:async ({body})=>{assert.equal(body.question,question);retrieved=true;return {evidence:{sufficient:true}};},
    generateOfficialAnswer:async ()=>({answer:'Fixture official date.',evidenceSufficient:true,conflict:{},sources:[]}),
  });
  assert.equal(retrieved,true);assert.equal(output.result.kind,'answer');assert.equal(output.result.answer,'Fixture official date.');
});

// Recording-date intent must select the official calendar, not only Rule 4.1.
const {isSeasonRatingDateQuestion}=await import('../app/lib/aiQuestionApplicability.js');
const {questionIntent}=await import('../app/lib/aiRequestIntent.js');
const {selectPolicyEvidence}=await import('../app/lib/aiPolicyEvidence.js');
const {readFileSync}=await import('node:fs');
const snapshot=JSON.parse(readFileSync(new URL('../../docs/lms-0725-current-official-evidence.json',import.meta.url)));
const candidates=snapshot.evidence.map(c=>({chunkId:c.id,documentId:c.document.id,documentVersionId:c.document_version_id,documentTitle:c.document.title,documentType:c.document.document_type,documentAuthorityRank:c.document.authority_rank,content:c.content,ruleNumber:c.rule_number,heading:c.heading,sectionLabel:c.section_label,pageNumber:c.page_number,chunkOrdinal:c.chunk_ordinal,combinedScore:.8}));
for(const question of questions.slice(0,4))test(`named rating date selects literal calendar: ${question}`,()=>{
 assert.equal(isSeasonRatingDateQuestion(question),true);
 assert.equal(questionIntent(question).object,'rating');
 const selected=selectPolicyEvidence({request:{question},policyEvidence:{status:'complete',candidates},evidence:{sufficient:true,threshold:.35}});
 assert.equal(selected.length,3);
 for(const c of selected){assert.equal(c.documentType,'league_supplement');assert.match(c.content,/Sept\. 27.*Season DUPR ratings recorded/);assert.doesNotMatch(c.content,/communicated to all captains/);}
});
test('recording-date matcher preserves method and other-topic boundaries',()=>{
 for(const question of ['When is that actual date?',questions[4],questions[5],'How is my Season DUPR calculated?','Regarding Season DUPR rating date and scores, when is that date?'])assert.equal(isSeasonRatingDateQuestion(question),false,question);
});
