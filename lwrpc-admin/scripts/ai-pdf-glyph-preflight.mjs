// Local-only PDF processing preflight. No Supabase or embedding requests.
import fs from 'node:fs';
import {extractPdfPages,chunkPdfPages} from '../app/lib/aiDocumentProcessing.js';

const sourceFiles=JSON.parse(fs.readFileSync('../.local-validation/ai-pdf-glyph-source-files.json','utf8'));
const rulesAudit=JSON.parse(fs.readFileSync('../.local-validation/ai-rules-release-audit.json','utf8'));
const before=rulesAudit.chunks['2b548146-006e-4f66-853e-e1e61430a50e'];
const output=[];
for(const file of sourceFiles){
  const bytes=fs.readFileSync(file.path);
  const extracted=await extractPdfPages(bytes);
  const documentType=file.document.includes('League Rules')?'league_rules':file.document.includes('Important Dates')?'important_dates':file.document.includes('Captains Guide')?'captain_guide':'other';
  const chunks=chunkPdfPages(extracted.pages,{documentType});
  const text=chunks.map(c=>c.content).join('\n');
  const current=file.versionId==='2b548146-006e-4f66-853e-e1e61430a50e'?before:null;
  output.push({document:file.document,versionId:file.versionId,pageCount:extracted.pageCount,chunkCount:chunks.length,searchableCount:chunks.filter(c=>c.isSearchable!==false).length,diagnostics:extracted.diagnostics,warnings:extracted.warnings,remainingGlyphs:(text.match(/Ư/g)||[]).length,originalChunkCount:current?.length||null,oldGlyphCount:current?.reduce((sum,c)=>sum+(c.content.match(/Ư/g)||[]).length,0)||null,sourceTextMatchesNormalizedCurrent:current?current.map(c=>c.content.replace(/Ư/g,'ff')).join('\n')===text:null,chunks});
}
const path='../.local-validation/ai-pdf-glyph-preflight.json';
fs.writeFileSync(path,JSON.stringify({recordedAt:new Date().toISOString(),output},null,2)+'\n');
console.log(JSON.stringify(output.map(entry=>Object.fromEntries(Object.entries(entry).filter(([key])=>key!=='chunks'))),null,2));
