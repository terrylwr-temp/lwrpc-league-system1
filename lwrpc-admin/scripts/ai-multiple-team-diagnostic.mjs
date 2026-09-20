// Read-only official-source and retrieval trace. Run from lwrpc-admin.
import fs from 'node:fs';
import {createClient} from '@supabase/supabase-js';

process.loadEnvFile('.env.local');
process.env.LWR_AI_ENABLED='true';
const {retrieveOfficialEvidence}=await import('../app/lib/aiRetrieval.js');
const {selectAnswerEvidence,selectAnswerEvidenceWithAssistance}=await import('../app/lib/aiAnswerGeneration.js');
const {aiAssistantConfig}=await import('../app/lib/aiAssistantConfig.js');
const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const questions=process.env.AI_QUESTIONS?.split('|').filter(Boolean)||['Can we have players on multiple teams?'];
const {data:documents,error:documentsError}=await db.from('ai_documents').select('id,title,document_type,status,active_version_id,authority_rank,scope_kind').eq('document_type','league_rules');
if(documentsError)throw documentsError;
const versions=[];
const chunks=[];
for(const document of documents){
  const {data:version,error:versionError}=await db.from('ai_document_versions').select('id,version_label,processing_status,chunk_count,processed_at,created_at').eq('id',document.active_version_id).maybeSingle();
  if(versionError)throw versionError;
  versions.push({documentId:document.id,...version});
  const {data:rows,error:chunksError}=await db.from('ai_document_chunks').select('id,document_version_id,chunk_ordinal,page_number,rule_number,heading,section_label,content,is_searchable,embedding_model').eq('document_version_id',document.active_version_id).order('chunk_ordinal');
  if(chunksError)throw chunksError;
  for(const row of rows||[])if(/\b(?:1\.1|3\.7)\b|more than one team|multiple community teams/i.test(row.content||''))chunks.push({documentId:document.id,id:row.id,versionId:row.document_version_id,ordinal:row.chunk_ordinal,page:row.page_number,rule:row.rule_number,heading:row.heading,section:row.section_label,searchable:row.is_searchable,embedded:row.embedding_model!=null,embeddingModel:row.embedding_model,content:row.content});
}
const cases=[];
for(const question of questions){
  const searches=[];
  const client=new Proxy(db,{get(target,key){if(key==='rpc')return (name,args)=>{
    const response=target.rpc(name,args);
    if(name!=='search_ai_official_chunks')return response;
    return Promise.resolve(response).then(out=>{searches.push({query:args.p_query_text,candidates:(out.data||[]).map((row,index)=>({rank:index+1,id:row.chunk_id,versionId:row.document_version_id,documentType:row.document_type,rule:row.rule_number,heading:row.heading,page:row.page_number,semantic:row.semantic_score,keyword:row.keyword_score,exact:row.exact_score,authority:row.authority_score,context:row.context_score,combined:row.combined_score,vectorRank:row.vector_rank,keywordRank:row.keyword_rank,exactMatch:row.exact_match,content:row.content}))});return out;});
  };return Reflect.get(target,key);}});
  const retrieval=await retrieveOfficialEvidence({supabase:client,body:{question}});
  const before=selectAnswerEvidence(retrieval);
  const after=await selectAnswerEvidenceWithAssistance(retrieval);
  cases.push({question,searches,threshold:aiAssistantConfig.evidenceThreshold,evidence:retrieval.evidence,legacySelected:before.map(c=>({id:c.chunkId,rule:c.ruleNumber,content:c.content})),selected:after.map(c=>({id:c.chunkId,rule:c.ruleNumber,content:c.content})),queryUnderstanding:retrieval.queryUnderstanding,policyDiagnostic:retrieval.policyDiagnostic,conceptAssistance:retrieval.conceptAssistance});
}
const output={recordedAt:new Date().toISOString(),method:'Read-only active catalog/chunks and existing retrieval/selection; no answer generation or database writes.',documents,versions,chunks:chunks.filter(c=>/3\.7\. Players are permitted|5\.1\.2\. A player may be listed/.test(c.content)),cases:cases.map(c=>({...c,searches:c.searches.map(s=>({...s,candidates:s.candidates.map(candidate=>{const scores={...candidate};delete scores.content;return scores;})}))}))};
fs.writeFileSync(process.env.AI_DIAGNOSTIC_OUTPUT||'../docs/ai-multiple-team-before.json',JSON.stringify(output,null,2)+'\n');
console.log(JSON.stringify({documents,versions,chunks:chunks.map(({id,rule,heading,page,searchable,embedded,content})=>({id,rule,heading,page,searchable,embedded,content})),cases:cases.map(c=>({question:c.question,searches:c.searches.map(s=>({query:s.query,top:s.candidates.slice(0,12).map(({rank,id,rule,heading,semantic,keyword,exact,authority,combined,vectorRank,keywordRank})=>({rank,id,rule,heading,semantic,keyword,exact,authority,combined,vectorRank,keywordRank}))})),evidence:c.evidence,legacySelected:c.legacySelected,selected:c.selected,understanding:{status:c.queryUnderstanding.status,initialFailure:c.queryUnderstanding.initialFailure,plan:c.queryUnderstanding.plan,fallbackReason:c.queryUnderstanding.fallbackReason,rescue:c.queryUnderstanding.rescue}}))},null,2));
