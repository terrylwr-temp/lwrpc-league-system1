import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {evidencePassages} from '../app/lib/aiQuestionApplicability.js';
import {trustedSelectedRuleIdentity} from '../app/lib/aiSelectedRuleIdentity.js';
import {bindOfficialExcerpts,officialDocumentPeriod} from '../app/lib/aiEvidenceExcerpts.js';
import {selectPolicyEvidence,rosterDateFacts,policyCalendarContext} from '../app/lib/aiPolicyEvidence.js';
const snapshot=JSON.parse(fs.readFileSync(new URL('../../docs/lms-0725-current-official-evidence.json',import.meta.url)));
const candidates=snapshot.evidence.map(c=>({chunkId:c.id,documentId:c.document.id,documentVersionId:c.document_version_id,documentTitle:c.document.title,documentType:c.document.document_type,documentAuthorityRank:c.document.authority_rank,content:c.content,ruleNumber:c.rule_number,heading:c.heading,sectionLabel:c.section_label,pageNumber:c.page_number,chunkOrdinal:c.chunk_ordinal,combinedScore:.8}));
const retrieval=question=>({request:{question},policyEvidence:{status:'complete',candidates},evidence:{sufficient:true,threshold:.35}});

test('0725 global extraction: every unit in current 108-chunk bounded official snapshot is literal source text',()=>{
 for(const c of snapshot.evidence)for(const text of evidencePassages(c)){
  assert.ok(c.content.includes(text),c.id);trustedSelectedRuleIdentity({content:text,selectedPassages:[text]},c);
 }
});
test('0725 Q57 compatibility loophole closed: synthetic heading/date fails; separate exact items pass',()=>{
 const c=candidates.find(c=>c.documentType==='league_supplement'&&/Saturday/.test(c.heading));
 const stored=snapshot.evidence.find(s=>s.id===c.chunkId),line=c.content.split('\n').find(l=>/ratings recorded/.test(l));
 assert.throws(()=>trustedSelectedRuleIdentity({content:c.heading+'\n'+line,selectedPassages:[c.heading+'\n'+line]},stored),/not present/);
 const selected=selectPolicyEvidence(retrieval('When are Season DUPR ratings recorded for Saturday?'));
 assert.equal(selected.length,1);assert.equal(selected[0].selectedPassages[0],line);assert.equal(selected[0].excerptItems[0].applicability.league,'saturday');assert.equal(selected[0].excerptItems[0].scopeBindings.length,1);
 trustedSelectedRuleIdentity(selected[0],stored);
});
test('0725 nonadjacent list child gets exact separate governing parent, not siblings or synthetic prose',()=>{
 const content='o The League shall provide:\n Balls: Official match balls.\n Administration: Scheduling support.';
 const c={chunkId:'c',documentVersionId:'v',content,documentType:'league_rules'};
 const child=' Administration: Scheduling support.';
 const bound=bindOfficialExcerpts({...c,content:child,selectedPassages:[child]}, {content});
 assert.equal(bound.excerptItems.length,2);assert.deepEqual(bound.excerptItems.map(i=>i.text),['o The League shall provide:',child]);
 assert.ok(bound.excerptItems.every(i=>content.slice(i.start,i.end)===i.text));assert.ok(!bound.excerptItems.some(i=>i.text.includes('Official match balls')));
});
test('0725 table text preserves original rows, columns, labels and CRLF; invented table sentence is rejected',()=>{
 const content='Division | Courts | Players\r\nWeekday 8.1 | 2 | 4\r\nWeekday 9.1 | 3 | 6';
 const c={chunkId:'table',documentVersionId:'version',content,documentType:'league_rules'};
 assert.deepEqual(evidencePassages(c),[content]);
 const bound=bindOfficialExcerpts(c,{content});assert.equal(bound.excerptItems[0].text,content);
 assert.throws(()=>trustedSelectedRuleIdentity({content:'Weekday 8.1 requires 4 players.',selectedPassages:['Weekday 8.1 requires 4 players.']},{content}),/not present/);
});
test('0725 year derivation preserves exact period labels and never collapses season ranges',()=>{
 for(const [title,year] of [['2026 Fall Season','2026'],['26/27 Saturday Season',null],['2026–27 Saturday Season',null],['2026-2027',null],['Important Dates',null]]){
  assert.deepEqual(officialDocumentPeriod(title),{seasonLabel:title,calendarYear:year,derivation:'revalidated_active_document_title'});
 }
 const dated=candidates.filter(c=>c.documentType==='league_supplement').map(c=>({...c,documentTitle:'26/27 Saturday Season'}));
 assert.ok(rosterDateFacts(dated).every(f=>f.date===null&&f.period.seasonLabel==='26/27 Saturday Season'));
 const context=policyCalendarContext({...retrieval('Can I add players to my roster yet?'),policyEvidence:{status:'complete',candidates:dated}});
 assert.ok(context.publishedOpenings.every(p=>p.comparison==='undetermined'));
});
test('0725 formerly missing evidence is selected from current sources with all distinct rating requirements',()=>{
 const timing=selectPolicyEvidence(retrieval('When is my Season DUPR established?'));
 assert.ok(timing.some(c=>c.content.includes('date\ncommunicated')));assert.equal(timing.length,4);
 const method=selectPolicyEvidence(retrieval('How is my Season DUPR calculated?')).flatMap(c=>c.selectedPassages).join('\n');
 for(const pattern of [/truncated to the nearest tenth/,/Reliability Factor below 29/,/Age-based/,/minus 0.5/,/highest adjusted Season/])assert.match(method,pattern);
 const scores=selectPolicyEvidence(retrieval('How do I enter match scores?')).flatMap(c=>c.selectedPassages).join('\n');
 for(const pattern of [/Click Submit/,/only on or after/,/opposing captain/,/ineligible player/i,/Full Match Cancellations/])assert.match(scores,pattern);
 const mechanics=selectPolicyEvidence(retrieval('How does Rally Scoring work in a Picklebreaker?')).flatMap(c=>c.selectedPassages).join('\n');assert.match(mechanics,/game-winning point only while serving/);assert.match(mechanics,/unfreeze|unfrozen/);
});
