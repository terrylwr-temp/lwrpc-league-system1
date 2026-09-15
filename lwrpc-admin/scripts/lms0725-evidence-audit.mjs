import fs from 'node:fs';
import assert from 'node:assert/strict';
// Opt-in provider checks use only public official-document fixtures. No application
// endpoint, Supabase, Storage or telemetry network access is allowed by this runner.
const provider=process.argv.includes('--provider');
if(provider)process.loadEnvFile('.env.local');
const {selectAnswerEvidence,generateOfficialAnswer,resolveOfficialSources}=await import('../app/lib/aiAnswerGeneration.js');
const {selectPolicyEvidence}=await import('../app/lib/aiPolicyEvidence.js');
const {liveIntent}=await import('../app/lib/liveLmsIntent.js');
const {isUnsupportedOperationalQuestion}=await import('../app/lib/askLwrPlayerAnswer.js');
const snapshot=JSON.parse(fs.readFileSync(new URL('../../docs/lms-0725-official-evidence.json',import.meta.url)));
const benchmark=JSON.parse(fs.readFileSync(new URL('../../docs/lms-0725-before.json',import.meta.url)));
const candidates=snapshot.evidence.map(c=>({chunkId:c.id,documentId:c.document.id,documentVersionId:c.document_version_id,documentTitle:c.document.title,documentType:c.document.document_type,documentAuthorityRank:c.document.authority_rank,content:c.content,ruleNumber:c.rule_number,heading:c.heading,sectionLabel:c.section_label,pageNumber:c.page_number,chunkOrdinal:c.chunk_ordinal,combinedScore:.8}));
const retrieval=question=>({request:{question,askAbout:'all',context:{}},candidates,suppliedEvidence:candidates,authorityReviewCandidates:candidates,policyEvidence:{status:'complete',candidates},evidence:{sufficient:true,threshold:.35},metrics:{retrievalMs:0,totalMs:0}});
function database(){
 const counts={reads:0,signs:0};
 const versions=[...new Map(snapshot.evidence.map(c=>[c.document_version_id,{id:c.document_version_id,document_id:c.document.id,storage_bucket:'official-fixture',storage_path:c.document_version_id+'.pdf',processing_status:'ready',document:{...c.document,status:'active',active_version_id:c.document_version_id}}])).values()];
 return {counts,from(table){assert.ok(['ai_document_versions','ai_document_chunks'].includes(table));counts.reads++;let rows=table==='ai_document_versions'?versions:snapshot.evidence.map(c=>({...c,is_searchable:true}));return {select(){return this;},in(key,values){rows=rows.filter(r=>values.includes(r[key]));return this;},then(resolve,reject){return Promise.resolve({data:rows,error:null}).then(resolve,reject);}};},storage:{from(){return {async createSignedUrl(path){counts.signs++;return {data:{signedUrl:'https://example.invalid/'+path},error:null};}};}}};
}
const questions=['What date can I start entering my roster for weekday league','Does the Weekday DUPR League use Rally Scoring?','Does Saturday use Rally Scoring?','Does PrimeTime use Rally Scoring?'];
const output={recordedAt:new Date().toISOString(),method:'Local saved official-source snapshot. Actual source validator and generation pipeline. Fixture metadata and signing; no production requests or writes. Candidate scores are fixture constants, not a semantic retrieval rerun.',cases:[]};
for(const c of benchmark.cases){const live=liveIntent(c.question),route=live?(live.intent==='UNSUPPORTED'?'PROTECTED':'LIVE'):isUnsupportedOperationalQuestion(c.question)?'PROTECTED':'DOCUMENT';assert.equal(route,c.expectedRoute);const selected=route==='DOCUMENT'?selectAnswerEvidence(retrieval(c.question)):[];const sources=selected.length?await resolveOfficialSources(database(),selected):[];output.cases.push({id:c.id,question:c.question,route,sourceContainers:sources.length,excerptItems:sources.reduce((n,s)=>n+(s.excerptItems?.length||s.selectedPassages?.length||1),0),validation:selected.length?'PASS':'Not applicable: deterministic route or no selected document evidence',pass:true});}
output.examples=[];
for(const q of questions){const r=retrieval(q),selected=selectPolicyEvidence(r),db=database(),sources=await resolveOfficialSources(db,selected);output.examples.push({question:q,counts:db.counts,sources:sources.map(s=>({documentId:s.documentId,documentVersionId:s.documentVersionId,chunkId:s.chunkId,citation:s.citation,pageNumber:s.pageNumber,excerptItems:s.excerptItems}))});}
const sample=selectPolicyEvidence(retrieval(questions[1]));
const legacy=sample.map(({excerptItems,...rest})=>rest); // Same valid exact passages; isolate representation overhead.
async function time(selected){const db=database(),start=performance.now();const sources=await resolveOfficialSources(db,selected);JSON.stringify(sources);return performance.now()-start;}
for(let i=0;i<30;i++){await time(legacy);await time(sample);}
const base=[],exact=[];for(let i=0;i<300;i++){base.push(await time(legacy));exact.push(await time(sample));}
const stats=values=>{values.sort((a,b)=>a-b);return {medianMs:values[Math.floor(values.length*.5)],p95Ms:values[Math.floor(values.length*.95)]};};
output.performance={method:'30 warmups; 300 alternating measured runs; in-memory same valid source selection; includes source validation, citation labels/signing fixture and JSON packaging. Excludes network and model latency.',legacy:stats(base),separateExcerpts:stats(exact)};
if(provider){output.provider=[];for(const question of questions){let calls=0;const db=database();const answer=await generateOfficialAnswer({retrieval:retrieval(question),supabase:db,fetchImpl:async(url,init)=>{assert.equal(url,'https://api.openai.com/v1/responses');assert.equal(JSON.parse(init.body).store,false);assert.equal(db.counts.reads,2);calls++;return fetch(url,{...init,signal:AbortSignal.timeout(60000)});}});output.provider.push({question,answer:answer.answer,model:answer.model,calls,metrics:answer.metrics,sources:answer.sources.map(s=>({citation:s.citation,chunkId:s.chunkId,excerptItems:s.excerptItems}))});console.log(JSON.stringify({question,answer:answer.answer,model:answer.model,calls}));}}
fs.writeFileSync(new URL(`../../docs/lms-0725-correction-${provider?'provider':'audit'}.json`,import.meta.url),JSON.stringify(output,null,2)+'\n');
console.log(JSON.stringify({cases:output.cases.length,pass:output.cases.filter(c=>c.pass).length,performance:output.performance,providerCalls:output.provider?.length||0}));
