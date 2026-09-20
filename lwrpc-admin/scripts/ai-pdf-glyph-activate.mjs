// Activate only a fully reviewed Stage 2.2 reprocess receipt. Uses the normal
// activation RPC; it does not edit source text or chunks directly.
import fs from 'node:fs';
import {createClient} from '@supabase/supabase-js';

const sourceVersionId=process.argv[2];
if(!sourceVersionId||process.argv[3]!=='--execute')throw Error('Usage: node scripts/ai-pdf-glyph-activate.mjs <reviewed-source-version-id> --execute');
process.loadEnvFile('.env.local');
const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const receiptPath=`../.local-validation/ai-pdf-glyph-reprocess-${sourceVersionId}.json`;
const receipt=JSON.parse(fs.readFileSync(receiptPath,'utf8'));
if(receipt.status!=='ready_inactive'||receipt.mismatches?.length)throw Error('Reprocess receipt is not a fully reviewed ready version.');
const baseline=JSON.parse(fs.readFileSync('../.local-validation/ai-pdf-glyph-active-baseline.json','utf8')).output.find(x=>x.versionId===sourceVersionId);
if(!baseline||baseline.documentId!==receipt.documentId)throw Error('Reviewed baseline mismatch.');
async function read(query){const {data,error,count}=await query;if(error)throw error;return {data,count};}
const document=(await read(db.from('ai_documents').select('id,status,active_version_id').eq('id',receipt.documentId).single())).data;
const old=(await read(db.from('ai_document_versions').select('id,processing_status,activated_by_member_id').eq('id',sourceVersionId).single())).data;
const next=(await read(db.from('ai_document_versions').select('id,processing_status,processing_error,chunk_count,checksum_sha256').eq('id',receipt.newVersionId).single())).data;
if(document.status!=='active'||document.active_version_id!==sourceVersionId||old.processing_status!=='ready'||next.processing_status!=='ready'||next.processing_error||next.chunk_count!==receipt.chunkCount||next.checksum_sha256!==baseline.sha256||!old.activated_by_member_id)throw Error('Activation precondition changed; stop.');
const {data:chunks,error:chunkError}=await db.from('ai_document_chunks').select('chunk_ordinal,content,is_searchable').eq('document_version_id',receipt.newVersionId).order('chunk_ordinal');
if(chunkError)throw chunkError;
if(chunks.length!==baseline.chunks.length||chunks.some((c,i)=>c.chunk_ordinal!==baseline.chunks[i].chunk_ordinal||c.content!==baseline.chunks[i].content.replace(/Ư/g,'ff')||c.is_searchable!==baseline.chunks[i].is_searchable))throw Error('Persisted chunk comparison changed; stop.');
const embedded=(await read(db.from('ai_document_chunks').select('id',{count:'exact',head:true}).eq('document_version_id',receipt.newVersionId).eq('is_searchable',true).not('embedding','is',null))).count;
if(embedded!==receipt.searchableCount)throw Error('Searchable embedding count changed; stop.');
const {error:activationError}=await db.rpc('activate_ai_document_version',{p_document_id:receipt.documentId,p_version_id:receipt.newVersionId,p_actor_member_id:old.activated_by_member_id});
if(activationError)throw activationError;
const activated=(await read(db.from('ai_documents').select('status,active_version_id').eq('id',receipt.documentId).single())).data;
const version=(await read(db.from('ai_document_versions').select('processing_status,activated_at,activated_by_member_id').eq('id',receipt.newVersionId).single())).data;
if(activated.status!=='active'||activated.active_version_id!==receipt.newVersionId||version.processing_status!=='ready'||!version.activated_at||version.activated_by_member_id!==old.activated_by_member_id)throw Error('Activation postcondition failed; inspect production state immediately.');
const result={sourceVersionId,newVersionId:receipt.newVersionId,documentId:receipt.documentId,activatedAt:version.activated_at,actorMemberId:version.activated_by_member_id,searchableEmbedded:embedded,status:'active_ready'};
fs.writeFileSync(`../.local-validation/ai-pdf-glyph-activation-${sourceVersionId}.json`,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
