// Controlled Stage 2.2 reprocess through the production document-processing
// function. Creates a new inactive version; never edits existing chunks or
// activates a version. Run only after the local PDF preflight and authorization.
import fs from 'node:fs';
import {randomUUID} from 'node:crypto';
import {createClient} from '@supabase/supabase-js';

const sourceVersionId=process.argv[2];
if(!sourceVersionId||process.argv[3]!=='--execute')throw Error('Usage: node scripts/ai-pdf-glyph-reprocess.mjs <approved-active-version-id> --execute');
process.loadEnvFile('.env.local');
process.env.LWR_AI_ENABLED='true';
const {processAiDocumentVersion}=await import('../app/lib/aiDocumentProcessing.js');
const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const baseline=JSON.parse(fs.readFileSync('../.local-validation/ai-pdf-glyph-active-baseline.json','utf8')).output.find(x=>x.versionId===sourceVersionId);
const preflight=JSON.parse(fs.readFileSync('../.local-validation/ai-pdf-glyph-preflight.json','utf8')).output.find(x=>x.versionId===sourceVersionId);
if(!baseline||!preflight)throw Error('Source is absent from the reviewed active baseline/preflight.');
const receiptPath=`../.local-validation/ai-pdf-glyph-reprocess-${sourceVersionId}.json`;
if(fs.existsSync(receiptPath))throw Error('A prior reprocess receipt exists; inspect it before another attempt.');
async function read(query){const {data,error,count}=await query;if(error)throw error;return {data,count};}
const document=(await read(db.from('ai_documents').select('id,status,active_version_id').eq('id',baseline.documentId).single())).data;
if(document.status!=='active'||document.active_version_id!==sourceVersionId)throw Error('Active source pointer changed; stop.');
const source=(await read(db.from('ai_document_versions').select('id,document_id,source_kind,storage_bucket,storage_path,original_filename,file_size_bytes,checksum_sha256,processing_status,activated_by_member_id').eq('id',sourceVersionId).single())).data;
if(source.document_id!==baseline.documentId||source.processing_status!=='ready'||source.checksum_sha256!==baseline.sha256)throw Error('Source version no longer matches reviewed PDF.');
const newVersionId=randomUUID();
const versionLabel=`v${new Date().toISOString().replace(/[-:TZ.]/g,'').slice(0,14)}-${newVersionId.slice(0,8)}`;
const actorMemberId=source.activated_by_member_id||null;
await read(db.from('ai_document_versions').insert({id:newVersionId,document_id:baseline.documentId,version_label:versionLabel,source_kind:source.source_kind,storage_bucket:source.storage_bucket,storage_path:source.storage_path,original_filename:source.original_filename,file_size_bytes:source.file_size_bytes,processing_status:'queued',processed_by_member_id:actorMemberId}));
fs.writeFileSync(receiptPath,JSON.stringify({sourceVersionId,newVersionId,versionLabel,documentId:baseline.documentId,startedAt:new Date().toISOString(),status:'queued'},null,2)+'\n');
let result;
try{result=await processAiDocumentVersion({supabase:db,versionId:newVersionId,actorMemberId});}
catch(error){fs.writeFileSync(receiptPath,JSON.stringify({sourceVersionId,newVersionId,versionLabel,documentId:baseline.documentId,status:'failed',error:String(error.message||error)},null,2)+'\n');throw error;}
const chunks=(await read(db.from('ai_document_chunks').select('id,chunk_ordinal,page_number,section_label,rule_number,heading,content,is_searchable,embedding_model').eq('document_version_id',newVersionId).order('chunk_ordinal'))).data;
const embeddedCount=(await read(db.from('ai_document_chunks').select('id',{count:'exact',head:true}).eq('document_version_id',newVersionId).eq('is_searchable',true).not('embedding','is',null))).count;
const current=(await read(db.from('ai_documents').select('active_version_id,status').eq('id',baseline.documentId).single())).data;
const version=(await read(db.from('ai_document_versions').select('processing_status,processing_error,chunk_count,checksum_sha256,processing_warnings').eq('id',newVersionId).single())).data;
const norm=value=>value||null;
const mismatches=[];
if(chunks.length!==preflight.chunks.length)mismatches.push(`chunk count ${chunks.length} != ${preflight.chunks.length}`);
for(let i=0;i<Math.min(chunks.length,preflight.chunks.length);i++){
  const got=chunks[i],want=preflight.chunks[i];
  for(const [left,right] of [['chunk_ordinal','chunkOrdinal'],['page_number','pageNumber'],['section_label','sectionLabel'],['rule_number','ruleNumber'],['heading','heading']])if(norm(got[left])!==norm(want[right]))mismatches.push(`chunk ${i+1}: ${left}`);
  if(got.content!==want.content)mismatches.push(`chunk ${i+1}: content`);
  if(got.is_searchable!==(want.isSearchable!==false))mismatches.push(`chunk ${i+1}: searchability`);
}
if(current.active_version_id!==sourceVersionId||current.status!=='active')mismatches.push('active pointer changed during processing');
if(version.processing_status!=='ready'||version.processing_error||version.chunk_count!==chunks.length||version.checksum_sha256!==baseline.sha256)mismatches.push('version processing state/checksum mismatch');
if(embeddedCount!==chunks.filter(c=>c.is_searchable).length)mismatches.push('searchable chunk missing embedding');
const remainingGlyphs=chunks.reduce((sum,c)=>sum+(c.content.match(/Ư/g)||[]).length,0);
if(remainingGlyphs)mismatches.push(`${remainingGlyphs} malformed glyphs remain`);
const receipt={sourceVersionId,newVersionId,versionLabel,documentId:baseline.documentId,finishedAt:new Date().toISOString(),status:mismatches.length?'review_failed':'ready_inactive',pageCount:result.pageCount,chunkCount:chunks.length,searchableCount:chunks.filter(c=>c.is_searchable).length,embeddedCount,remainingGlyphs,processingWarnings:version.processing_warnings,mismatches};
fs.writeFileSync(receiptPath,JSON.stringify(receipt,null,2)+'\n');
console.log(JSON.stringify(receipt,null,2));
if(mismatches.length)process.exitCode=1;
