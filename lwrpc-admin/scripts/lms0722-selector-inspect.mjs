import fs from 'node:fs';
import {selectAnswerEvidence} from '../app/lib/aiAnswerGeneration.js';
import {officialQuestionConcept} from '../app/lib/aiQuestionConcepts.js';
const d=JSON.parse(fs.readFileSync('../docs/lms-0722-diagnostic-replay.json'));
const s=JSON.parse(fs.readFileSync('../docs/lms-0722-source-inspection.json'));
const p=JSON.parse(fs.readFileSync('../docs/lms-0722-recall-inspection.json'));
const context=s.map(x=>({documentVersionId:x.document_version_id,ruleNumber:x.rule_number,content:x.content}));
function candidate(v){const c=d.chunks[v.id]||s.find(x=>x.id===v.id)||{...Object.values(d.chunks).find(x=>x.title===v.title),...v};return {chunkId:v.id,documentId:c.documentId,documentVersionId:c.documentVersionId||c.document_version_id,documentTitle:c.title,documentType:c.type||c.document_type,documentAuthorityRank:(c.type||c.document_type)==='league_rules'?1:3,pageNumber:c.page??c.page_number,ruleNumber:c.rule??c.rule_number,sectionLabel:c.section??c.section_label,heading:c.heading,content:c.content,combinedScore:v.score,keywordScore:v.keyword,exactScore:v.exact,structuralContext:context.filter(x=>x.documentVersionId===(c.documentVersionId||c.document_version_id))};}
for(const c of d.cases){
 const candidates=(c.candidates||[]).map(candidate);let r={request:{question:c.question},candidates,authorityReviewCandidates:candidates.slice(0,12),suppliedEvidence:candidates.slice(0,8),evidence:{sufficient:c.stage3Sufficient,threshold:.35}};
 let selected=selectAnswerEvidence(r);const probe=p.find(x=>x.question===c.question);
 if(!selected.length&&probe){let map=new Map(candidates.map(c=>[c.chunkId,c]));for(const x of probe.projected32){let a=candidate(x),old=map.get(x.id);if(!old||old.combinedScore<a.combinedScore)map.set(x.id,a);}r.candidates=[...map.values()].sort((a,b)=>b.combinedScore-a.combinedScore).slice(0,32);r.authorityReviewCandidates=r.candidates.slice(0,12);r.suppliedEvidence=r.candidates.slice(0,8);r.evidence.sufficient=r.candidates[0]?.combinedScore>=.35;selected=selectAnswerEvidence(r);}
 console.log(c.family,JSON.stringify(c.question),officialQuestionConcept(c.question)?.kind||'-',selected.map(x=>`${x.ruleNumber}:${x.content.slice(0,85).replace(/\n/g,' ')}`).join('|')||'NONE');
}


