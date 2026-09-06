import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
process.env.LWR_AI_ENABLED='true';process.env.OPENAI_API_KEY='synthetic-test';
const {chooseApprovedEvidence}=await import('../app/lib/aiApprovedAnswersSelection.js');
const {MATERIAL_SUPPLEMENT_INSTRUCTION,hasMaterialSupplements,supplementalPromptMetadata}=await import('../app/lib/aiSupplementContract.js');
const {managedFormalPassages,trustedPassageHeading}=await import('../app/lib/aiApprovedSourceBinding.js');
const {retrieveOfficialEvidence}=await import('../app/lib/aiRetrieval.js');
const {generateOfficialAnswer}=await import('../app/lib/aiAnswerGeneration.js');
const formal={chunkId:randomUUID(),documentId:randomUUID(),documentVersionId:randomUUID(),documentType:'league_rules',documentAuthorityRank:1,documentTitle:'Synthetic Review Policy',content:'An organizer may request a review.',combinedScore:.9};
const revision={id:randomUUID(),answer_id:randomUUID(),revision_number:1,status:'active',activated_at:'2026-01-01',effective_on:'2026-01-01',expires_on:null,league_scope:'all',temporal_scope:'standing',authority_manifest_hash:'m',title:'Synthetic Review Procedure',topic_key:'review',canonical_question:'Can an organizer request a review?',approved_answer:'An organizer may request a review. Every request must include a written summary.',related_chunk_id:formal.chunkId,content_hash:'a'.repeat(64)};
const row=r=>({revision:r,semantic_score:.95,manifest:'m'});
test('material flag is established only by complementary selection, not retrieval or managed-only fallback',()=>{
 const combined=chooseApprovedEvidence(revision.canonical_question,[formal],[row(revision)]);
 assert.equal(combined.selected[1].materialSupplement,true);
 assert.equal(combined.selected[1].content,revision.approved_answer);
 assert.match(combined.selected[1].evidenceRole,/materially selected/);
 const alone=chooseApprovedEvidence(revision.canonical_question,[],[row(revision)]);
 assert.equal(hasMaterialSupplements(alone.selected),false);
 assert.equal(hasMaterialSupplements([formal]),false);
 assert.equal(supplementalPromptMetadata({...formal,materialSupplement:true}),'');
});
test('conflicting supplement remains excluded and warns; redundant consistent text need not repeat',()=>{
 const bad={...revision,approved_answer:'An organizer may not request a review.'};
 const conflict=chooseApprovedEvidence(revision.canonical_question,[formal],[row(bad)]);
 assert.equal(conflict.warnings.length,1);assert.deepEqual(conflict.selected,[formal]);assert.equal(hasMaterialSupplements(conflict.selected),false);
 const redundant=chooseApprovedEvidence(revision.canonical_question,[formal],[row({...revision,approved_answer:formal.content})]);
 assert.equal(redundant.warnings.length,0);assert.match(MATERIAL_SUPPLEMENT_INSTRUCTION,/Merge genuinely redundant statements once/);
});
test('future bounded selected supplements share contract; current selector still selects at most one',()=>{
 const other={...revision,id:randomUUID(),answer_id:randomUUID(),topic_key:'review-other',approved_answer:'An organizer may request a review. Keep a copy of the request.'};
 const selected=chooseApprovedEvidence(revision.canonical_question,[formal],[row(revision),row(other)]).selected;
 assert.equal(selected.filter(s=>s.sourceKind==='approved_answer').length,1);
 assert.match(MATERIAL_SUPPLEMENT_INSTRUCTION,/each marked source/);
});

for(const mode of ['combined','formal-only','approved-only','redundant','conflict'])test('generation handoff and structured output: '+mode,async()=>{
 const r={...revision,approved_answer:mode==='redundant'?formal.content:mode==='conflict'?'An organizer may not request a review.':revision.approved_answer};
 let captured,models=0;
 const db={rpc:async name=>({data:name==='search_ai_approved_answers'?(mode==='formal-only'?[]:[row(r)]):[]})};
 const retrieval=await retrieveOfficialEvidence({supabase:db,body:{question:r.canonical_question},embedQuery:async()=>({embedding:Array(1536).fill(.01)})});
 retrieval.evidence={...retrieval.evidence,sufficient:mode!=='approved-only',threshold:.35};
 retrieval.suppliedEvidence=mode==='approved-only'?[]:[formal];retrieval.authorityReviewCandidates=retrieval.suppliedEvidence;
 const expected=mode==='combined'||mode==='approved-only'?r.approved_answer:formal.content;
 const answer=await generateOfficialAnswer({retrieval,supabase:db,resolveSources:async(_db,rows)=>rows.map(s=>({...s,citation:s.documentTitle,officialDocumentUrl:'https://example.invalid/test.pdf'})),fetchImpl:async(_url,options)=>{
  models++;captured=JSON.parse(options.body);const managed=mode!=='formal-only'&&mode!=='conflict';
  return {ok:true,json:async()=>({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({answer:expected,conflict:false,...(managed?{supported:true}:{})})}]}]})};
 }});
 assert.equal(models,1);assert.equal(answer.answer,expected);
 assert.equal(captured.instructions.includes(MATERIAL_SUPPLEMENT_INSTRUCTION),['combined','redundant'].includes(mode));
 if(mode==='combined'){assert.match(captured.input[0].content,/Material contribution contract: REQUIRED/);assert.ok(captured.input[0].content.includes(r.approved_answer));assert.match(answer.answer,/written summary/);}
 if(mode==='conflict'){assert.equal(retrieval.authorityWarnings.length,1);assert.ok(!captured.input[0].content.includes(r.approved_answer));}
});

const scheduling=JSON.parse(readFileSync(new URL('./fixtures/lms0721-scheduling-passage.json',import.meta.url)));
const fixtures=JSON.parse(readFileSync(new URL('./fixtures/lms0719-diagnosis-provisions.json',import.meta.url)));
for(const rule of ['5.10','5.11','3.5','4.5','5.5','5.7'])test('truthful trusted citation heading: '+rule,()=>{
 const stored=rule==='5.10'||rule==='5.11'?scheduling:fixtures.map(f=>({...f,rule_number:f.ruleNumber})).find(f=>managedFormalPassages(f).some(p=>p.ruleNumber===rule));
 const selected=managedFormalPassages(stored).find(p=>p.ruleNumber===rule);
 const source={content:selected.passage,selectedPassages:[selected.passage],ruleNumber:rule,boundRelatedPassage:true};
 const heading=trustedPassageHeading(source,{...stored,section_label:stored.section_label||'Trusted Parent Section'});
 assert.ok(heading);
 if(rule==='5.11')assert.equal(heading,'Rescheduling & Score Submission Deadlines');
 if(rule==='5.10')assert.equal(heading,'Video Recording');
 if(rule!=='5.10')assert.notEqual(heading,'Video Recording');
 const label=selected.passage.split('\n')[0].replace(/^\d+(?:\.\d+)*\.\s+/,'').match(/^([^:]{1,120}):/)?.[1];
 if(label)assert.equal(heading,label);
});
test('unheaded sibling uses truthful parent, never neighboring title; forged heading is ignored',()=>{
 const stored={rule_number:'8.1',heading:'Unrelated Neighbor',section_label:'GENERAL REQUIREMENTS',content:'8.1. Unrelated Neighbor: A fact.\n8.2. All applications must include a reference.'};
 const source={content:'8.2. All applications must include a reference.',selectedPassages:['8.2. All applications must include a reference.'],ruleNumber:'8.2',boundRelatedPassage:true,heading:'Invented title'};
 assert.equal(trustedPassageHeading(source,stored),'GENERAL REQUIREMENTS');
 assert.equal(trustedPassageHeading(source,{...stored,section_label:'Rule 8.1'}),'');
 assert.throws(()=>trustedPassageHeading({...source,content:source.content+' invented'},stored));
});
