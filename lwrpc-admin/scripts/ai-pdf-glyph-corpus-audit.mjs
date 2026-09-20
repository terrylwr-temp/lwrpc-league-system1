// Read-only inventory of malformed PDF glyphs in all processed AI chunks.
import fs from 'node:fs';
import {createClient} from '@supabase/supabase-js';

process.loadEnvFile('.env.local');
const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
async function read(query){const {data,error,count}=await query;if(error)throw error;return {data:data||[],count};}
const documents=(await read(db.from('ai_documents').select('id,title,document_type,status,active_version_id'))).data;
const versions=(await read(db.from('ai_document_versions').select('id,document_id,version_label,processing_status,source_kind,storage_bucket,storage_path,checksum_sha256,page_count,chunk_count'))).data;
const total=(await read(db.from('ai_document_chunks').select('id',{count:'exact',head:true}))).count;
const rows=[];
for(let start=0;start<total;start+=500){
  rows.push(...(await read(db.from('ai_document_chunks').select('id,document_version_id,chunk_ordinal,page_number,rule_number,heading,content,is_searchable').order('id').range(start,start+499))).data);
}
const documentById=new Map(documents.map(d=>[d.id,d]));
const versionById=new Map(versions.map(v=>[v.id,v]));
const occurrences=[];
for(const chunk of rows){
  for(let offset=0;offset<(chunk.content||'').length;offset++)if(chunk.content[offset]==='Ư'){
    const version=versionById.get(chunk.document_version_id);
    const document=documentById.get(version?.document_id);
    occurrences.push({documentId:document?.id,documentTitle:document?.title,documentType:document?.document_type,documentStatus:document?.status,versionId:version?.id,versionLabel:version?.version_label,versionStatus:version?.processing_status,isActive:document?.active_version_id===version?.id,storageBucket:version?.storage_bucket,storagePath:version?.storage_path,pdfChecksum:version?.checksum_sha256,chunkId:chunk.id,ordinal:chunk.chunk_ordinal,page:chunk.page_number,rule:chunk.rule_number,heading:chunk.heading,offset,context:chunk.content.slice(Math.max(0,offset-65),Math.min(chunk.content.length,offset+66)).replace(/\s+/g,' ').trim(),word:chunk.content.slice(0,offset).match(/[\p{L}]+$/u)?.[0]+ 'Ư' +(chunk.content.slice(offset+1).match(/^[\p{L}]+/u)?.[0]||'')});
  }
}
const summary={recordedAt:new Date().toISOString(),chunkCount:total,documentCount:documents.length,versionCount:versions.length,occurrenceCount:occurrences.length,activeOccurrenceCount:occurrences.filter(o=>o.isActive).length,byDocument:Object.values(Object.groupBy(occurrences,o=>o.documentTitle)).map(group=>({title:group[0].documentTitle,count:group.length,activeCount:group.filter(o=>o.isActive).length,words:[...new Set(group.map(o=>o.word))].sort()})),occurrences};
const output=process.env.AI_PDF_GLYPH_AUDIT_OUTPUT||'../.local-validation/ai-pdf-glyph-audit-before.json';
fs.mkdirSync('../.local-validation',{recursive:true});
fs.writeFileSync(output,JSON.stringify(summary,null,2)+'\n');
console.log(JSON.stringify({recordedAt:summary.recordedAt,chunkCount:total,documentCount:documents.length,versionCount:versions.length,occurrenceCount:summary.occurrenceCount,activeOccurrenceCount:summary.activeOccurrenceCount,byDocument:summary.byDocument},null,2));
