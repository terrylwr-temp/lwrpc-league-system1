import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {questionIntent} from '../app/lib/aiRequestIntent.js';import {liveIntent} from '../app/lib/liveLmsIntent.js';import {isUnsupportedOperationalQuestion} from '../app/lib/askLwrPlayerAnswer.js';
import {selectPolicyEvidence,needsPolicyEvidence} from '../app/lib/aiPolicyEvidence.js';import {selectAgeReferenceEvidence} from '../app/lib/aiAgeReferencePolicy.js';import {revalidateExcerptItems,officialDocumentPeriod} from '../app/lib/aiEvidenceExcerpts.js';
const data=JSON.parse(fs.readFileSync(new URL('../../docs/lms-0725-league-dates-current-evidence.json',import.meta.url))),cases=JSON.parse(fs.readFileSync(new URL('../../docs/lms-0725-age-reference-cases.json',import.meta.url))).cases;
const candidates=data.evidence.map(c=>({chunkId:c.id,documentId:c.document.id,documentVersionId:c.document_version_id,documentTitle:c.document.title,documentType:c.document.document_type,documentAuthorityRank:c.document.authority_rank,content:c.content,ruleNumber:c.rule_number,heading:c.heading,sectionLabel:c.section_label,pageNumber:c.page_number,chunkOrdinal:c.chunk_ordinal}));
const chunks=new Map(data.evidence.map(c=>[c.id,c]));const retrieval=q=>({request:{question:q},policyEvidence:{status:'complete',candidates}});
for(const c of cases)test(`0725 age ${c.id}: ${c.question}`,()=>{
 const intent=questionIntent(c.question);assert.equal(intent.object,c.expectedIntent);assert.equal(liveIntent(c.question),null);assert.equal(isUnsupportedOperationalQuestion(c.question),false);assert.equal(needsPolicyEvidence(c.question),true);
 const chosen=selectPolicyEvidence(retrieval(c.question));assert.equal(chosen.length,1);
 if(c.expectedIntent==='league_date'){assert.equal(chosen[0].documentType,'league_supplement');assert.match(chosen[0].content,/Oct\. 16/);return;}
 assert.equal(intent.kind,'eligibility_reference_date');assert.equal(chosen[0].documentType,'league_rules');assert.equal(chosen[0].ruleNumber,'6.3');assert.equal(chosen[0].pageNumber,12);assert.equal(chosen[0].excerptItems.length,2);
 assert.match(chosen[0].content,/December 31 of the current calendar year/);assert.match(chosen[0].content,/even if they have not yet reached/);
 const verified=revalidateExcerptItems(chosen[0],chunks.get(chosen[0].chunkId),chunks,officialDocumentPeriod(chosen[0].documentTitle));
 assert.ok(verified.every(i=>i.applicability.league==='primetime'&&i.scopeBindings.length===1));assert.ok(verified.every(i=>chunks.get(i.chunkId).content.slice(i.start,i.end)===i.text));
});
test('0725 four temporal meanings stay distinct',()=>{
 assert.equal(questionIntent('When does PrimeTime start?').object,'league_date');
 assert.equal(questionIntent('When can I enter my roster?').object,'roster');
 assert.equal(questionIntent('What date is my age based on for PrimeTime?').kind,'eligibility_reference_date');
 assert.equal(questionIntent('When must scores be entered?').kind,'deadline');
 assert.equal(selectPolicyEvidence(retrieval('When must scores be entered?'))[0].documentType,'captain_guide');
});
test('0725 stored personal age, DOB and mixed rating/contact requests remain protected',()=>{
 for(const q of ['What is my stored age for PrimeTime?','Check my profile age for PrimeTime eligibility','What is my date of birth?','How old am I?','When will I turn 65?','What is my DUPR and the PrimeTime age cutoff?','What is my email and the PrimeTime age cutoff?'])assert.equal(liveIntent(q)?.intent,'UNSUPPORTED',q);
 assert.equal(liveIntent('When do I have to turn 65?'),null);
 assert.equal(questionIntent('When did I enter my scores?').kind,'unresolved');
});
test('0725 age reference scope does not transfer PrimeTime policy to other leagues',()=>{
 for(const name of ['Weekday','Saturday'])assert.deepEqual(selectPolicyEvidence(retrieval(`What is the ${name} age cutoff date?`)),[]);
 const current=candidates.find(c=>c.content.includes('Player Age Eligibility:'));
 const another={...current,chunkId:'other-source',content:current.content.replaceAll('PrimeTime','Saturday')};
 assert.deepEqual(selectAgeReferenceEvidence([current,another],questionIntent('What date do you use to determine age for the 65+ league?')),[]);
 assert.equal(selectAgeReferenceEvidence([current,another],questionIntent('What date is age based on for PrimeTime?')).length,1);
});
test('0725 age cutoff policy comes only from source; no fixed date or year in selector',()=>{
 const source=candidates.find(c=>c.content.includes('Player Age Eligibility:'));
 const changed={...source,content:source.content.replace('December 31','December 15')};
 const chosen=selectAgeReferenceEvidence([changed],questionIntent('What date is age based on for PrimeTime?'));
 assert.match(chosen[0].content,/December 15/);assert.doesNotMatch(chosen[0].content,/December 31/);
});
test('0725 benchmark preserves all 89 earlier questions and appends the 10 requested age/event controls',()=>{
 const base=JSON.parse(fs.readFileSync(new URL('../../docs/lms-0725-before.json',import.meta.url))).cases;
 const dates=JSON.parse(fs.readFileSync(new URL('../../docs/lms-0725-league-date-cases.json',import.meta.url))).cases;
 assert.equal(new Set([...base,...dates,...cases].map(c=>c.id)).size,99);
 assert.ok([...base,...dates].every(c=>questionIntent(c.question).object!=='age_eligibility'));
});
