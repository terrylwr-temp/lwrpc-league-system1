import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {trustedSelectedRuleIdentity as identity} from '../app/lib/aiSelectedRuleIdentity.js';
import {managedFormalPassages,trustedPassageHeading} from '../app/lib/aiApprovedSourceBinding.js';
import {selectAnswerEvidence,resolveOfficialSources} from '../app/lib/aiAnswerGeneration.js';
const stored=JSON.parse(readFileSync(new URL('./fixtures/lms0721-scheduling-passage.json',import.meta.url)));
const provisions=managedFormalPassages(stored);
const fixtures=JSON.parse(readFileSync(new URL('./fixtures/lms0719-diagnosis-provisions.json',import.meta.url)));

test('0721 ordinary post-retirement selection resolves sibling 5.11 without managed records',async()=>{
 const documentId='9c200d0f-be41-4c73-9f47-41c18dcd0132';
 const candidate={chunkId:stored.id,documentId,documentVersionId:stored.document_version_id,documentType:'league_rules',documentAuthorityRank:1,ruleNumber:stored.rule_number,content:stored.content,heading:stored.heading,combinedScore:.4723};
 const selected=selectAnswerEvidence({request:{question:'Can we reschedule our match?',askAbout:'all'},suppliedEvidence:[candidate],authorityReviewCandidates:[candidate],evidence:{sufficient:true,threshold:.35}});
 assert.equal(selected.length,1);assert.equal(selected[0].content,provisions[1].passage);assert.equal(selected[0].boundRelatedPassage,undefined);
 const reads=[];
 const db={from(name){reads.push(name);assert.ok(['ai_document_versions','ai_document_chunks'].includes(name));return {select:()=>({in:async()=>({data:name==='ai_document_chunks'?[{...stored,is_searchable:true}]:[{id:stored.document_version_id,document_id:documentId,processing_status:'ready',storage_bucket:'official',storage_path:'fixture.pdf',document:{id:documentId,title:'LWR Pickleball Club DUPR League Rules',status:'active',active_version_id:stored.document_version_id}}]})})};},storage:{from:()=>({createSignedUrl:async()=>({data:{signedUrl:'https://example.invalid/fixture.pdf'}})})}};
 const [result]=await resolveOfficialSources(db,selected);
 assert.equal(result.ruleNumber,'5.11');assert.equal(result.heading,'Rescheduling & Score Submission Deadlines');assert.equal(result.pageNumber,5);
 assert.equal(result.documentId,documentId);assert.equal(result.documentVersionId,stored.document_version_id);assert.equal(result.chunkId,stored.id);
 assert.match(result.citation,/Rule 5\.11 — Rescheduling & Score Submission Deadlines — Page 5/);
 assert.deepEqual(reads,['ai_document_versions','ai_document_chunks']);
});
test('0721 actual sibling selection retains 5.10 and its own heading',()=>{
 const selected={content:provisions[0].passage};assert.equal(identity(selected,stored),'5.10');assert.equal(trustedPassageHeading(selected,stored),'Video Recording');
});
test('0721 prose references and forged selected labels cannot establish sibling identity',()=>{
 const text='5.10. Video Recording: See Rule 5.11 for scheduling.';
 const chunk={rule_number:'5.10',content:text+'\n5.11. Scheduling: Both coaches agree.'};
 assert.equal(identity({content:text,ruleNumber:'5.11'},chunk),'5.10');
 const inline='5.10. Video Recording: 5.11. Scheduling is discussed elsewhere.';
 assert.equal(identity({content:'5.11. Scheduling is discussed elsewhere.'},{rule_number:'5.10',content:inline}),'5.10');
 assert.throws(()=>identity({content:provisions[1].passage+' Invented.'},stored),/not present/);
});
for(const id of ['3.5','4.5','5.5','5.7','11.A.2','7.A.2.a','10.G.1'])test('0721 ordinary production identity remains '+id,()=>{
 const matches=fixtures.flatMap(f=>managedFormalPassages({...f,rule_number:f.ruleNumber}).map(p=>({f,p})));
 const {f,p}=matches.find(x=>x.p.ruleNumber===id);assert.equal(identity({content:p.passage},{...f,rule_number:f.ruleNumber}),id);
 if(id==='5.7')assert.match(p.passage,/5\.7\.1[\s\S]*5\.7\.2/);
});
test('0721 combined selected siblings remain bounded and exclude unselected neighbors',()=>{
 assert.equal(identity({selectedPassages:provisions.map(p=>p.passage)},stored),'5.10, 5.11');
 assert.equal(identity({selectedPassages:[provisions[1].passage]},stored),'5.11');
 const many={rule_number:'5.1',content:Array.from({length:5},(_,i)=>`5.${i+1}. Policy ${i+1}.`).join('\n')};
 assert.equal(identity({selectedPassages:many.content.split('\n')},many),'5.1');
});
