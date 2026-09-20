// Download read-only source PDFs for active glyph occurrences and one historical
// Code of Conduct sample. Files stay in ignored local validation directory.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {createClient} from '@supabase/supabase-js';

process.loadEnvFile('.env.local');
const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const audit=JSON.parse(fs.readFileSync('../.local-validation/ai-pdf-glyph-audit-before.json','utf8'));
const selected=new Map();
for(const occurrence of audit.occurrences){
  if(occurrence.isActive||occurrence.documentTitle==='LWR Pickleball Club Code of Conduct')selected.set(occurrence.versionId,occurrence);
}
const output=[];
fs.mkdirSync('../.local-validation/ai-pdf-glyph-sources',{recursive:true});
for(const occurrence of selected.values()){
  const {data,error}=await db.storage.from(occurrence.storageBucket).download(occurrence.storagePath);
  if(error)throw error;
  const bytes=Buffer.from(await data.arrayBuffer());
  const hash=createHash('sha256').update(bytes).digest('hex');
  if(hash!==occurrence.pdfChecksum)throw Error(`Checksum mismatch for ${occurrence.versionId}`);
  const path=`../.local-validation/ai-pdf-glyph-sources/${occurrence.versionId}.pdf`;
  fs.writeFileSync(path,bytes);
  output.push({document:occurrence.documentTitle,versionId:occurrence.versionId,path,sha256:hash,bytes:bytes.length,pages:[...new Set(audit.occurrences.filter(o=>o.versionId===occurrence.versionId).map(o=>o.page))].sort((a,b)=>a-b)});
}
fs.writeFileSync('../.local-validation/ai-pdf-glyph-source-files.json',JSON.stringify(output,null,2)+'\n');
console.log(JSON.stringify(output,null,2));
