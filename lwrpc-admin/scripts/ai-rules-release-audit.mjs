// Read-only comparison of the two official Rules versions for release review.
import fs from 'node:fs';
import {createClient} from '@supabase/supabase-js';

process.loadEnvFile('.env.local');
const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const documentId='9c200d0f-be41-4c73-9f47-41c18dcd0132';
const versionIds=['d92d58f4-b5ee-408e-87f4-a0d35626d57a','2b548146-006e-4f66-853e-e1e61430a50e'];
async function query(builder){const {data,error,count}=await builder;if(error)throw error;return {data,count};}
const documents=(await query(db.from('ai_documents').select('id,title,document_type,status,active_version_id,updated_at,created_at').eq('document_type','league_rules'))).data;
const versions=(await query(db.from('ai_document_versions').select('*').in('id',versionIds))).data;
const chunks={};
const counts={};
for(const id of versionIds){
  chunks[id]=(await query(db.from('ai_document_chunks').select('id,document_version_id,chunk_ordinal,page_number,rule_number,heading,section_label,content,is_searchable,embedding_model,created_at').eq('document_version_id',id).order('chunk_ordinal'))).data;
  counts[id]={};
  for(const [name,filter] of [
    ['total',q=>q],['searchable',q=>q.eq('is_searchable',true)],['embedded',q=>q.not('embedding','is',null)],['unembedded',q=>q.is('embedding',null)],['unsearchable',q=>q.eq('is_searchable',false)]
  ])counts[id][name]=(await query(filter(db.from('ai_document_chunks').select('id',{count:'exact',head:true}).eq('document_version_id',id)))).count;
}
const output={recordedAt:new Date().toISOString(),documentId,documents,versions,counts,chunks};
const outputPath=process.env.AI_RULES_AUDIT_OUTPUT||'../.local-validation/ai-rules-release-audit.json';
fs.mkdirSync(new URL('../.local-validation/',import.meta.url),{recursive:true});
fs.writeFileSync(outputPath,JSON.stringify(output,null,2)+'\n');
console.log(JSON.stringify({recordedAt:output.recordedAt,documents,versions,counts,ruleChunks:Object.fromEntries(versionIds.map(id=>[id,chunks[id].filter(c=>/\b(?:3\.7|5\.1\.2)\b/.test(c.content||'')).map(c=>({id:c.id,ordinal:c.chunk_ordinal,page:c.page_number,rule:c.rule_number,heading:c.heading,section:c.section_label,searchable:c.is_searchable,embedded:!!c.embedding_model,content:c.content}))]))},null,2));
