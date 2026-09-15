import fs from 'node:fs';
import {questionIntent} from '../app/lib/aiRequestIntent.js';
import {selectAnswerEvidence} from '../app/lib/aiAnswerGeneration.js';
import {officialDatePeriod} from '../app/lib/aiLeagueDateFacts.js';
import {officialDocumentPeriod} from '../app/lib/aiEvidenceExcerpts.js';
const s=JSON.parse(fs.readFileSync('../docs/lms-0725-current-official-evidence.json'));
const candidates=s.evidence.map(c=>({chunkId:c.id,documentId:c.document.id,documentVersionId:c.document_version_id,documentTitle:c.document.title,documentType:c.document.document_type,documentAuthorityRank:c.document.authority_rank,content:c.content,ruleNumber:c.rule_number,heading:c.heading,sectionLabel:c.section_label,pageNumber:c.page_number,chunkOrdinal:c.chunk_ordinal,combinedScore:.8}));
for(const c of JSON.parse(fs.readFileSync('../docs/lms-0725-league-date-cases.json')).cases){const r={request:{question:c.question},policyEvidence:{status:'complete',candidates},evidence:{sufficient:true,threshold:.35}};const selected=selectAnswerEvidence(r);console.log(JSON.stringify({id:c.id,intent:questionIntent(c.question),items:selected.map(x=>({text:x.selectedPassages,period:x.excerptItems.map(i=>officialDatePeriod(candidates.find(y=>y.chunkId===x.chunkId).content,i.start,officialDocumentPeriod(x.documentTitle)))}))}));}
