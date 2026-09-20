// Read-only active-source chunk snapshot for PDF normalization comparison.
import fs from 'node:fs';
import {createClient} from '@supabase/supabase-js';

process.loadEnvFile('.env.local');
const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const sourceFiles=JSON.parse(fs.readFileSync('../.local-validation/ai-pdf-glyph-source-files.json','utf8')).filter(x=>x.document!=='LWR Pickleball Club Code of Conduct');
const output=[];
for(const source of sourceFiles){
  const {data:document,error:documentError}=await db.from('ai_documents').select('id,active_version_id,status').eq('active_version_id',source.versionId).maybeSingle();
  if(documentError)throw documentError;
  if(!document||document.status!=='active')throw Error(`Active pointer changed for ${source.versionId}`);
  const {data:chunks,error:chunkError}=await db.from('ai_document_chunks').select('id,chunk_ordinal,page_number,section_label,rule_number,heading,content,is_searchable,embedding_model').eq('document_version_id',source.versionId).order('chunk_ordinal');
  if(chunkError)throw chunkError;
  output.push({...source,documentId:document.id,chunks});
}
fs.writeFileSync('../.local-validation/ai-pdf-glyph-active-baseline.json',JSON.stringify({recordedAt:new Date().toISOString(),output},null,2)+'\n');
console.log(JSON.stringify(output.map(({chunks,...source})=>({...source,chunkCount:chunks.length,glyphCount:chunks.reduce((n,c)=>n+(c.content.match(/Ư/g)||[]).length,0)})),null,2));
