import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {existingEvidenceCase,confirmExistingEvidence} from '../app/lib/aiExistingEvidenceDecision.js';
process.env.SUPABASE_SERVICE_ROLE_KEY='isolated-existing-evidence-only';
const f=JSON.parse(await readFile(new URL('./fixtures/lms0721-saturday-existing-evidence.json',import.meta.url)));
function setup(role='commissioner'){
 const user=randomUUID(),caseId=randomUUID(),group=randomUUID(),events=[];
 const c={id:caseId,group_id:group,status:'new',revision:1,created_at:'2026-09-06T10:00:00Z',action_category:'unclassified'};
 const chunk={id:f.chunkId,document_version_id:f.documentVersionId,content:f.content,heading:f.heading,rule_number:f.ruleNumber,page_number:9,is_searchable:true};
 const source={chunk_id:chunk.id,document_id:f.documentId,document_version_id:f.documentVersionId,content:chunk.content,rule_number:chunk.rule_number,document_title:f.title,page_number:9};
 const records={ai_manager_review_cases:c,ai_question_groups:{id:group,family:'unanswered',canonical_question:f.question},ai_approved_answers:null,ai_document_chunks:chunk,
  ai_document_versions:{id:f.documentVersionId,document_id:f.documentId,processing_status:'ready',document:{id:f.documentId,title:f.title}},
  ai_documents:{id:f.documentId,active_version_id:f.documentVersionId,status:'active',document_type:'league_rules'}};
 const db={from(name){assert.ok(Object.hasOwn(records,name),'Unexpected table '+name);const q={};for(const m of ['select','eq'])q[m]=()=>q;q.maybeSingle=async()=>({data:records[name]});return q;},async rpc(name,args){
  if(name==='ai_approved_source_review')return {data:[source]};
  assert.equal(name,'ai_review_case_action');assert.equal(args.p_action,'category');
  const prior=events.find(e=>e.p_operation===args.p_operation);if(prior){assert.deepEqual(args,prior);return {data:{revision:2,replayed:true}};}
  if(args.p_revision!==c.revision)return {error:{message:'review_revision_conflict'}};
  events.push(args);c.action_category=args.p_value;c.revision++;return {data:{revision:c.revision}};
 }};
 return {auth:role?{user:{id:user},role,supabase:db}:{error:'sign in',status:401},caseId,events,c,chunk,records};
}
for(const role of ['commissioner','league_manager','club_pro','captain','player',null])test(`existing-evidence decision role ${role||'anonymous'}`,async()=>{
 const x=setup(role);if(!['commissioner','league_manager'].includes(role)){
  await assert.rejects(existingEvidenceCase(x.auth,x.caseId));await assert.rejects(confirmExistingEvidence(x.auth,{}));assert.equal(x.events.length,0);return;
 }
 const context=await existingEvidenceCase(x.auth,x.caseId),s=context.sources.find(s=>s.ruleNumber==='6.2.2');assert.ok(s);assert.equal(s.containerRuleNumber,'6.2.1');
 const body={action:'existing-evidence',token:context.decisionToken,operation:randomUUID(),evidence:[{chunkId:s.chunkId,passageHash:s.passageHash}]};
 const response=await confirmExistingEvidence(x.auth,body);assert.equal(response.decisionRecorded,true);assert.equal(x.c.status,'new');assert.equal(x.c.action_category,'ai_retrieval_selection');
 assert.equal(x.events.length,1);assert.match(x.events[0].p_note,/Rule 6\.2\.2 — Page 9/);assert.match(x.events[0].p_note,new RegExp(s.passageHash));assert.ok(x.events[0].p_note.includes(f.documentVersionId));assert.equal(x.events[0].p_actor,x.auth.user.id);
 assert.equal((await confirmExistingEvidence(x.auth,body)).replayed,true);assert.equal(x.events.length,1);
});
test('forged, duplicate, stale and unbounded references fail before category mutation',async()=>{
 const x=setup(),ctx=await existingEvidenceCase(x.auth,x.caseId),s=ctx.sources.find(s=>s.ruleNumber==='6.2.2');
 const body={action:'existing-evidence',token:ctx.decisionToken,operation:randomUUID(),evidence:[{chunkId:s.chunkId,passageHash:s.passageHash}]};
 for(const evidence of [[],[{}],[{chunkId:randomUUID(),passageHash:s.passageHash}],[{chunkId:s.chunkId,passageHash:'a'.repeat(64)}],[{...body.evidence[0],passage:'forged'}],[...body.evidence,...body.evidence],Array(3).fill(body.evidence[0])])await assert.rejects(confirmExistingEvidence(x.auth,{...body,evidence}));
 await assert.rejects(confirmExistingEvidence(x.auth,{...body,note:'forged'}));
 x.records.ai_documents.active_version_id=randomUUID();await assert.rejects(confirmExistingEvidence(x.auth,body),/current/);assert.equal(x.events.length,0);
});
test('two distinct provisions remain individually identified and a Reviewing case stays Reviewing',async()=>{
 const x=setup();x.c.status='reviewing';const ctx=await existingEvidenceCase(x.auth,x.caseId);
 await confirmExistingEvidence(x.auth,{action:'existing-evidence',token:ctx.decisionToken,operation:randomUUID(),evidence:ctx.sources.map(s=>({chunkId:s.chunkId,passageHash:s.passageHash}))});
 assert.equal(x.events.length,1);assert.match(x.events[0].p_note,/Rule 6\.2\.1/);assert.match(x.events[0].p_note,/Rule 6\.2\.2/);assert.ok(x.events[0].p_note.length<=4000);assert.equal(x.c.status,'reviewing');
});
test('decision UI requires explicit choice, keeps authority block after No, and retains safe retest',async()=>{
 const ui=await readFile(new URL('../app/ai-assistant/review/ExistingEvidenceDecision.js',import.meta.url),'utf8');
 const panel=await readFile(new URL('../app/ai-assistant/review/ApprovedAnswersPanel.js',import.meta.url),'utf8');
 assert.match(ui,/Yes — Existing Evidence Answers It/);assert.match(ui,/No — Continue with Approved Answer/);assert.match(ui,/proceed&&/);assert.match(ui,/setProceed\(true\)/);assert.match(ui,/Close source \/ Back to decision/);
 assert.match(panel,/<ExistingEvidenceDecision[^>]+>\{caseData\.blocked\?/);assert.match(ui,/retest\(data.question\)/);assert.match(panel,/router.push\('\/ai-assistant\/console'\)/);
 assert.match(ui,/pending.current/);assert.match(ui,/retry.current.operation/);assert.doesNotMatch(ui,/action:'(?:create|activate|status)'/);
});
