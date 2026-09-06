import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {managedFormalPassages,validateManagedPassage} from '../app/lib/aiApprovedSourceBinding.js';
import {trustedSelectedRuleIdentity} from '../app/lib/aiSelectedRuleIdentity.js';
import {sourceReviewFindings,approvedBoundSource,approvedMutation,approvedContentHash} from '../app/lib/aiApprovedAnswersService.js';
import {validateApprovedDraft} from '../app/lib/aiApprovedAnswersShared.js';
const scheduling=JSON.parse(await readFile(new URL('./fixtures/lms0721-scheduling-passage.json',import.meta.url)));
const fixtures=JSON.parse(await readFile(new URL('./fixtures/lms0719-diagnosis-provisions.json',import.meta.url)));

test('managed and ordinary citations share trusted production sibling identities',()=>{
 const options=managedFormalPassages(scheduling);assert.deepEqual(options.map(p=>p.ruleNumber),['5.10','5.11']);
 for(const p of options)assert.equal(validateManagedPassage(scheduling,p.passage,p.ruleNumber).ruleNumber,p.ruleNumber);
 assert.equal(trustedSelectedRuleIdentity({content:options[1].passage},scheduling),'5.11');
 const findings=sourceReviewFindings('As a captain, can I change our scheduled match date or time?',[{...scheduling,chunk_id:scheduling.id}]);
 assert.equal(new Set(findings.map(p=>p.selectionKey)).size,2);assert.equal(findings[1].ruleNumber,'5.11');assert.equal(findings[1].containerRuleNumber,'5.10');
 assert.throws(()=>validateManagedPassage(scheduling,options[1].passage,'5.10'));
 assert.throws(()=>validateManagedPassage(scheduling,options[1].passage+' Invented.','5.11'));
 assert.throws(()=>validateManagedPassage(scheduling,'5.11. Rescheduling','5.11'));
});
test('cross references never become selected identities; a complete parent family stays at its parent',()=>{
 const stored={rule_number:'5.10',content:'5.10. Recording: See Rule 5.11 for scheduling.\n5.11. Scheduling: Both coaches agree.'};
 assert.equal(managedFormalPassages(stored)[0].ruleNumber,'5.10');
 const family={rule_number:'5',content:'5.7. Medical: The following applies.\n5.7.1. First condition.\n5.7.2. Second condition.\n5.8. Other rule.'};
 const p=managedFormalPassages(family).find(p=>p.ruleNumber==='5.7');assert.match(p.passage,/5\.7\.2/);assert.equal(validateManagedPassage(family,p.passage,'5.7').ruleNumber,'5.7');
});
test('production LWR and USAP provision controls retain supported identities',()=>{
 for(const id of ['3.5','4.5','5.5','5.7','11.A.2','7.A.2.a','10.G.1']){
  const matches=fixtures.flatMap(f=>managedFormalPassages({...f,rule_number:f.ruleNumber}));
  assert.ok(matches.some(p=>p.ruleNumber===id),id);
 }
 const website={rule_number:'1',content:'1. GENERAL\n1.1. Club main website: https://lwrpickleballclub.com\n1.2. League management website: https://league.lwrpickleballclub.com'};
 const findings=sourceReviewFindings('What is the website for the club',[{...website,chunk_id:randomUUID()}]);
 assert.ok(findings.some(p=>p.ruleNumber==='1.1'&&p.direct));
 const nr=fixtures.find(f=>f.content.includes('4.5. Players'));
 assert.ok(sourceReviewFindings('NR',[{...nr,rule_number:nr.ruleNumber,chunk_id:nr.chunkId}]).some(p=>p.ruleNumber==='4.5'));
});
function q(data){const x={};for(const k of ['select','eq'])x[k]=()=>x;x.maybeSingle=async()=>({data});return x;}
test('server binds saved and historical revisions to their exact container; changed, stale and forged selections fail',async()=>{
 const document=randomUUID(),version=scheduling.document_version_id,passage=managedFormalPassages(scheduling)[1].passage;
 const revision={related_chunk_id:scheduling.id,related_passage:passage,related_rule_identity:'5.11'};
 const meta={id:document,active_version_id:version,status:'active',document_type:'league_rules'};
 const db={from:name=>q(name==='ai_document_chunks'?{...scheduling,is_searchable:true}:name==='ai_documents'?meta:{id:version,document_id:document,processing_status:'ready',document:{title:'LWR Rules'}})};
 assert.equal((await approvedBoundSource(db,revision,{current:true})).ruleNumber,'5.11');
 await assert.rejects(approvedBoundSource(db,{...revision,related_rule_identity:'5.10'},{current:true}));
 await assert.rejects(approvedBoundSource(db,{...revision,related_passage:passage+' false'},{current:true}));
 meta.active_version_id=randomUUID();await assert.rejects(approvedBoundSource(db,revision,{current:true}),/current/);
 const historical=await approvedBoundSource(db,revision);assert.equal(historical.documentVersionId,version);assert.equal(historical.passage,passage);assert.equal(historical.containerRuleNumber,'5.10');
});
test('Draft binding participates in content hash and server save rejects browser label forgery before mutation',async()=>{
 const related=managedFormalPassages(scheduling)[1],document=randomUUID(),user=randomUUID();let writes=0;
 const draft={title:'Scheduling',topic_key:'schedule',canonical_question:'How is scheduling handled?',approved_answer:'Both captains must agree.',league_scope:'all',temporal_scope:'standing',effective_on:'2026-01-01',related_chunk_id:scheduling.id,related_passage:related.passage,related_rule_identity:'5.11'};
 assert.notEqual(approvedContentHash(validateApprovedDraft(draft)),approvedContentHash(validateApprovedDraft({...draft,related_passage:managedFormalPassages(scheduling)[0].passage,related_rule_identity:'5.10'})));
 const db={from:name=>q(name==='ai_approved_answer_events'?null:name==='ai_document_chunks'?{...scheduling,is_searchable:true}:name==='ai_documents'?{active_version_id:scheduling.document_version_id,status:'active',document_type:'league_rules'}:{id:scheduling.document_version_id,document_id:document,processing_status:'ready',document:{title:'Rules'}}),rpc:async name=>{if(name==='ai_approved_source_review')return {data:[]};writes++;return {data:{}};}};
 const body={action:'create',id:null,operation:randomUUID(),staticPolicyConfirmed:true,draft};
 await assert.rejects(approvedMutation(db,{...body,draft:{...draft,related_rule_identity:'5.10'}},user),/binding/);assert.equal(writes,0);
 await approvedMutation(db,body,user);assert.equal(writes,1);
});
test('binding is byte bounded and is not silently truncated',()=>{
 const make=n=>({rule_number:'5.11',content:'5.11. '+ 'x'.repeat(n-6)});
 assert.equal(managedFormalPassages(make(16384))[0].passage.length,16384);
 assert.deepEqual(managedFormalPassages(make(16385)),[]);
 const unicode={rule_number:'5.11',content:'5.11. '+ 'İ'.repeat(8190)};
 assert.deepEqual(managedFormalPassages(unicode),[]);
});
