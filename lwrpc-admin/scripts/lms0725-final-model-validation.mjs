import fs from 'node:fs';
import assert from 'node:assert/strict';
// Explicitly authorized official non-personal document benchmark only. No application
// endpoint, Supabase, Storage or telemetry network access is allowed by this runner.
const provider=process.argv.includes('--execute');
if(provider)process.loadEnvFile('.env.local');else process.env.OPENAI_API_KEY='offline-validation-fixture';
const {generateOfficialAnswer,resolveOfficialSources}=await import('../app/lib/aiAnswerGeneration.js');
const {liveIntent}=await import('../app/lib/liveLmsIntent.js');
const {isUnsupportedOperationalQuestion,resolveOfficialConversation}=await import('../app/lib/askLwrPlayerAnswer.js');
const snapshot=JSON.parse(fs.readFileSync(new URL('../../docs/lms-0725-current-official-evidence.json',import.meta.url)));
const benchmark=JSON.parse(fs.readFileSync(new URL('../../docs/lms-0725-before.json',import.meta.url)));
const candidates=snapshot.evidence.map(c=>({chunkId:c.id,documentId:c.document.id,documentVersionId:c.document_version_id,documentTitle:c.document.title,documentType:c.document.document_type,documentAuthorityRank:c.document.authority_rank,content:c.content,ruleNumber:c.rule_number,heading:c.heading,sectionLabel:c.section_label,pageNumber:c.page_number,chunkOrdinal:c.chunk_ordinal,combinedScore:.8}));
const retrieval=question=>({request:{question,askAbout:'all',context:{}},candidates,suppliedEvidence:candidates,authorityReviewCandidates:candidates,policyEvidence:{status:'complete',candidates},evidence:{sufficient:true,threshold:.35},metrics:{retrievalMs:0,totalMs:0}});
function database(){
 const counts={reads:0,signs:0};
 const versions=[...new Map(snapshot.evidence.map(c=>[c.document_version_id,{id:c.document_version_id,document_id:c.document.id,storage_bucket:'official-fixture',storage_path:c.document_version_id+'.pdf',processing_status:'ready',document:{...c.document,status:'active',active_version_id:c.document_version_id}}])).values()];
 return {counts,from(table){assert.ok(['ai_document_versions','ai_document_chunks'].includes(table));counts.reads++;let rows=table==='ai_document_versions'?versions:snapshot.evidence.map(c=>({...c,is_searchable:true}));return {select(){return this;},in(key,values){rows=rows.filter(r=>values.includes(r[key]));return this;},then(resolve,reject){return Promise.resolve({data:rows,error:null}).then(resolve,reject);}};},storage:{from(){return {async createSignedUrl(path){counts.signs++;return {data:{signedUrl:'https://example.invalid/'+path},error:null};}};}}};
}

const {hasUnapprovedEmail}=await import('../app/lib/publicOrganizationalContacts.js');
const {createHash}=await import('node:crypto');
const {excerptReferences}=await import('../app/lib/aiEvidenceExcerpts.js');
const output={recordedAt:new Date().toISOString(),mode:provider?'authorized-provider':'offline-preflight',method:'Saved official snapshot; actual selectors, source gate and configured generation integration. Fixture ranking/metadata/signing, not production retrieval or HTTP replay. No Live data, production endpoints, embeddings or telemetry calls.',calls:0,cases:[]};
const only=process.argv.find(x=>x.startsWith('--only='))?.slice(7);
const phase=process.argv.includes('--failed-first')?'failed-first':'full';
const outputPath=new URL(`../../docs/lms-0725-final-${phase}${only?'-'+only:''}-${provider?'model-results':'preflight'}.json`,import.meta.url);
const failedIds=new Set(['Q07','Q09','Q10','Q11','Q12','Q13','Q14','Q17','Q18','Q21','Q29','Q46','Q54','Q55','Q56','Q57','Q42']);
const persist=()=>fs.writeFileSync(outputPath,JSON.stringify(output,null,2)+'\n');
for(const c of benchmark.cases){
 if(phase==='failed-first'&&!failedIds.has(c.id))continue;
 if(only&&c.id!==only)continue;
 const live=liveIntent(c.question),route=live?(live.intent==='UNSUPPORTED'?'PROTECTED':'LIVE'):isUnsupportedOperationalQuestion(c.question)?'PROTECTED':'DOCUMENT';
 assert.equal(route,c.expectedRoute);
 const record={id:c.id,question:c.question,route,routePass:true,calls:0};output.cases.push(record);
 if(route!=='DOCUMENT'){record.status='deterministic_no_model';persist();continue;}
 const resolution=resolveOfficialConversation({question:c.question,userId:'local-benchmark-only'});
 if(resolution.kind==='clarification'){record.status='clarification_no_model';record.clarification=resolution.clarification;persist();continue;}
 const r=structuredClone(retrieval(resolution.effectiveQuestion)),db=database();let boundEvidence;
 try{
 const answer=await generateOfficialAnswer({retrieval:r,supabase:db,resolveSources:async(db,selected)=>{const sources=await resolveOfficialSources(db,selected);boundEvidence=structuredClone(selected.map(e=>({...e,excerptItems:sources.find(s=>s.chunkId===e.chunkId)?.excerptItems})));return sources;},fetchImpl:async(url,init)=>{
  assert.equal(url,'https://api.openai.com/v1/responses');assert.equal(db.counts.reads,2);
  const payload=JSON.parse(init.body);assert.equal(payload.store,false);
  const content=payload.input[0].content;assert.equal(hasUnapprovedEmail(content),false);
  assert.ok(!/local-benchmark-only|example\.invalid|Bearer |SUPABASE_|OPENAI_API_KEY/i.test(content));
  const selected=boundEvidence;assert.ok(selected.length>0&&selected.length<=4);
  // Check exact selection again immediately before outbound dispatch.
  await resolveOfficialSources(database(),selected);
  record.evidence=selected.map(s=>({documentTitle:s.documentTitle,documentVersionId:s.documentVersionId,chunkId:s.chunkId,pageNumber:s.pageNumber,ruleNumber:s.ruleNumber,...excerptReferences(s),passages:(s.selectedPassages||[s.content]).map(text=>({characters:text.length,sha256:createHash('sha256').update(text).digest('hex')}))}));
  record.literalSourceFidelity=selected.every(s=>(s.selectedPassages||[s.content]).every(text=>snapshot.evidence.find(c=>c.id===s.chunkId)?.content.includes(text)));
  assert.equal(record.literalSourceFidelity,true,'Every outbound source passage must be an exact contiguous saved source excerpt.');
  record.payloadCharacters=content.length;record.configuredModel=payload.model;
  if(!provider)return {ok:true,json:async()=>({status:'completed',model:'offline-fixture',output_text:JSON.stringify({answer:'Offline dispatch check only.',conflict:false})})};
  record.calls++;output.calls++;record.status='dispatched';persist();
  return fetch(url,{...init,signal:AbortSignal.timeout(90000)});
 }});
 record.status=answer.modelCallSkipped?'no_selected_evidence':provider?'generated':'preflight_pass';
 if(provider){record.answer=answer.answer;record.model=answer.model;record.metrics=answer.metrics;record.conflict=answer.conflict;}
 if(provider&&failedIds.has(c.id)){
 const text=answer.answer||'';const checks=[];
 if(Number(c.id.slice(1))<=23)checks.push(/(?:Sept(?:ember)?\.?\s+28|28\s+Sept)/i.test(text),/2026/.test(text),/unlock/i.test(text),/notif/i.test(text));
 if(['Q54','Q55','Q57'].includes(c.id))checks.push(/2026/.test(text),/(?:Sept(?:ember)?\.?\s+27|27\s+Sept)/i.test(text));
 if(['Q54','Q55'].includes(c.id))checks.push(/captains/i.test(text),/(?:first|prior|before)/i.test(text),/season/i.test(text));
 if(c.id==='Q56')checks.push(/truncat/i.test(text),/(?:tenth|decimal)/i.test(text),/29/.test(text),/highest/i.test(text),/0\.5/.test(text),!/as an? NR(?:\/adjusted)? player/i.test(text));
 if(c.id==='Q42')checks.push(/Standard Scoring/i.test(text),/Picklebreaker/i.test(text),/2[–-]2/.test(text));
 if(c.id==='Q29')checks.push(/visiting/i.test(text),/prompt/i.test(text),/submit/i.test(text),/verif/i.test(text),/match date|scheduled date/i.test(text),/forfeit|cancel/i.test(text),/ineligible/i.test(text));
 if(c.id==='Q46')checks.push(/serv/i.test(text),/winn?ing point|game-winning/i.test(text),/unfreez|unfrozen/i.test(text));
 record.requiredChecks=checks;record.materialPass=checks.every(Boolean)&&record.status==='generated';
 }
 record.sources=(answer.sources||[]).map(s=>({citation:s.citation,chunkId:s.chunkId,pageNumber:s.pageNumber,ruleNumber:s.ruleNumber,...excerptReferences(s)}));
 }catch(error){record.status='failed';record.error={name:error.name,category:error.category||'local_validation',message:error.message};}
 persist();console.log(JSON.stringify({id:record.id,status:record.status,calls:record.calls,...(provider?{answer:record.answer,materialPass:record.materialPass}: {})}));
 if(provider&&(record.status==='failed'||failedIds.has(c.id)&&!record.materialPass)){output.stoppedOn=c.id;persist();break;}
}
console.log(JSON.stringify({calls:output.calls,statuses:output.cases.reduce((a,c)=>(a[c.status]=(a[c.status]||0)+1,a),{})}));
