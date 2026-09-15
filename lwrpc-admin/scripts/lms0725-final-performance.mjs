import fs from 'node:fs';
import assert from 'node:assert/strict';
// Explicitly authorized official non-personal document benchmark only. No application
// endpoint, Supabase, Storage or telemetry network access is allowed by this runner.
process.env.OPENAI_API_KEY='offline-validation-fixture';
const {selectAnswerEvidence,generateOfficialAnswer,resolveOfficialSources}=await import('../app/lib/aiAnswerGeneration.js');


const snapshot=JSON.parse(fs.readFileSync(new URL('../../docs/lms-0725-current-official-evidence.json',import.meta.url)));

const candidates=snapshot.evidence.map(c=>({chunkId:c.id,documentId:c.document.id,documentVersionId:c.document_version_id,documentTitle:c.document.title,documentType:c.document.document_type,documentAuthorityRank:c.document.authority_rank,content:c.content,ruleNumber:c.rule_number,heading:c.heading,sectionLabel:c.section_label,pageNumber:c.page_number,chunkOrdinal:c.chunk_ordinal,combinedScore:.8}));
const retrieval=question=>({request:{question,askAbout:'all',context:{}},candidates,suppliedEvidence:candidates,authorityReviewCandidates:candidates,policyEvidence:{status:'complete',candidates},evidence:{sufficient:true,threshold:.35},metrics:{retrievalMs:0,totalMs:0}});
function database(){
 const counts={reads:0,signs:0};
 const versions=[...new Map(snapshot.evidence.map(c=>[c.document_version_id,{id:c.document_version_id,document_id:c.document.id,storage_bucket:'official-fixture',storage_path:c.document_version_id+'.pdf',processing_status:'ready',document:{...c.document,status:'active',active_version_id:c.document_version_id}}])).values()];
 return {counts,from(table){assert.ok(['ai_document_versions','ai_document_chunks'].includes(table));counts.reads++;let rows=table==='ai_document_versions'?versions:snapshot.evidence.map(c=>({...c,is_searchable:true}));return {select(){return this;},in(key,values){rows=rows.filter(r=>values.includes(r[key]));return this;},then(resolve,reject){return Promise.resolve({data:rows,error:null}).then(resolve,reject);}};},storage:{from(){return {async createSignedUrl(path){counts.signs++;return {data:{signedUrl:'https://example.invalid/'+path},error:null};}};}}};
}

const {bindOfficialExcerpts,revalidateExcerptItems}=await import('../app/lib/aiEvidenceExcerpts.js');
const questions=['What date can I start entering my roster for weekday league','Does the weekday dupr league use rally scoring','When are Season DUPR ratings recorded for Saturday?','How is my Season DUPR calculated?','How do I enter match scores?','How does Rally Scoring work in a Picklebreaker?'];
const stats=a=>{a.sort((x,y)=>x-y);return {medianMs:a[Math.floor(a.length*.5)],p95Ms:a[Math.floor(a.length*.95)]};};
const output={recordedAt:new Date().toISOString(),method:'Offline local CPU timings with current official snapshot and in-memory metadata/signing. 20 warmups and 200 samples per case. No network, provider or embeddings. Binding/range validation is included in source validation, not additive. Model preparation is generation start to intercepted dispatch minus measured selection and source resolution; includes applicability and prompt preparation. No equivalent pre-correction build was benchmarked, so total added production latency is not established.',cases:[]};
for(const question of questions){
 const values={selection:[],validation:[],bindingAndRangeValidation:[],modelPreparation:[],totalBeforeDispatch:[]};let counts;
 for(let i=0;i<220;i++){
  const r=retrieval(question);let start=performance.now();const selected=selectAnswerEvidence(r);const selectionMs=performance.now()-start;assert.ok(selected.length);
  start=performance.now();for(const s of selected){const stored=snapshot.evidence.find(c=>c.id===s.chunkId);revalidateExcerptItems(bindOfficialExcerpts(s,stored),stored,new Map(snapshot.evidence.map(c=>[c.id,{...c,is_searchable:true}])));}const bindingMs=performance.now()-start;
  const db=database();let validationMs=0,totalMs=0;
  start=performance.now();await generateOfficialAnswer({retrieval:retrieval(question),supabase:db,resolveSources:async(db,selected)=>{const t=performance.now();const sources=await resolveOfficialSources(db,selected);validationMs=performance.now()-t;return sources;},fetchImpl:async()=>{totalMs=performance.now()-start;return {ok:true,json:async()=>({status:'completed',model:'offline-fixture',output_text:JSON.stringify({answer:'Offline timing only.',conflict:false})})};}});
  assert.equal(db.counts.reads,2);counts=db.counts;
  if(i>=20){values.selection.push(selectionMs);values.validation.push(validationMs);values.bindingAndRangeValidation.push(bindingMs);values.modelPreparation.push(Math.max(0,totalMs-validationMs-selectionMs));values.totalBeforeDispatch.push(totalMs);}
 }
 output.cases.push({question,counts,...Object.fromEntries(Object.entries(values).map(([key,val])=>[key,stats(val)]))});
}
fs.writeFileSync(new URL('../../docs/lms-0725-final-performance.json',import.meta.url),JSON.stringify(output,null,2)+'\n');
console.log(JSON.stringify(output,null,2));
