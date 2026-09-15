import {excerptSelection} from './aiEvidenceExcerpts.js';
import {evidencePassages} from './aiQuestionApplicability.js';

export function selectRegistrationEvidence(candidates,intent) {
 if(intent.contextConflict)return [];
 const rows=candidates.filter(c=>c.documentType==='captain_guide'&&/^HOW TO REGISTER YOUR TEAM\b/i.test(c.heading||c.sectionLabel||''));
 if(!rows.length||rows.length>4||new Set(rows.map(c=>c.documentVersionId)).size!==1)return [];
 const text=rows.map(c=>c.content).join('\n');
 // A truncated first page is not a complete registration procedure.
 if(!/Register My Team!/i.test(text)||!/payment information/i.test(text)||!/confirmation email/i.test(text)||!/League Management[\s\S]*activate your team/i.test(text)||!/rosters[\s\S]*unlocked/i.test(text))return [];
 return [...rows].sort((a,b)=>a.chunkOrdinal-b.chunkOrdinal).map(c=>excerptSelection(c,evidencePassages(c).map(text=>({text,applicability:{role:'procedure'}})),'procedure'));
}
