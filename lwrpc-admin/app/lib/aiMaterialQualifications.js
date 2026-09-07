import {evidencePassages} from './aiQuestionApplicability.js';
import {passageScope} from './aiOfficialApplicability.js';

// A shared topic is not a proposition relationship. Require overlapping body
// anchors plus restrictive language, equal controlling authority and compatible
// scope. No document identities, pages, sports terms or policy values live here.
const stop = new Set('a an the and or of to in on at for with from by as is are be been being this that these those it its they their them we our you your can may shall must will would should all every any only except unless when if then than which who what how rule rules scoring team teams player players game games'.split(' '));
function anchors(text) {
 return new Set(String(text).toLowerCase().replace(/[^a-z\s]/g,' ').split(/\s+/).map(w=>w.replace(/(?:ing|ed|s)$/,'').replace(/(?:serv|scor)$/,'$&e')).filter(w=>w.length>2&&!stop.has(w)));
}
function compatible(a,b) {
 return !a.ambiguousLeague&&!b.ambiguousLeague && (!b.league||b.league===a.league) && (!b.division||b.division===a.division);
}
export function materialQualification(base,detail) {
 const restrictive=/\b(?:except|unless|only|subject to|provided that|must not|shall not|cannot)\b/i;
 if(!restrictive.test(detail))return false;
 const broad=String(base).split(/(?<=[.!?])\s+/).filter(s=>/\b(?:every|always|regardless)\b/i.test(s));
 return broad.some(s=>{
  const a=anchors(s),b=anchors(detail);
  return [...b].filter(x=>a.has(x)).length>=3;
 });
}
export function preserveMaterialQualifications(retrieval,selected) {
 if(!selected.length||retrieval.documentNavigation)return selected;
 const result=selected.map(c=>({...c}));
 const candidates=retrieval.authorityReviewCandidates||retrieval.suppliedEvidence||[];
 for(const candidate of candidates){
  if(candidate.documentType!=='league_rules'||candidate.combinedScore<(retrieval.evidence?.threshold||.35))continue;
  const related=[];
  const units=evidencePassages(candidate);
  for(const [index,p] of units.entries()){
   const scope=passageScope(candidate,p);
   const base=selected.find(c=>c.documentType==='league_rules'&&c.documentVersionId===candidate.documentVersionId&&c.documentAuthorityRank===candidate.documentAuthorityRank&&(c.selectedPassages||[c.content]).some(bp=>compatible(passageScope(c,bp),scope)&&materialQualification(bp,p)));
   if(base&&!base.content.includes(p)){
    related.push({text:p,base:base.chunkId,scope});
    if(/\bsee (?:the )?next (?:item|paragraph|provision)\b/i.test(p)&&units[index+1]&&compatible(passageScope(base,base.content),passageScope(candidate,units[index+1])))related.push({text:units[index+1],base:base.chunkId,scope:passageScope(candidate,units[index+1])});
   }
  }
  if(!related.length)continue;
  const existing=result.find(c=>c.chunkId===candidate.chunkId);
  if(existing){
   const passages=[...new Set([...(existing.selectedPassages||[existing.content]),...related.map(p=>p.text)])];
   existing.selectedPassages=passages;existing.content=passages.join('\n\n');
  }else{
   if(result.length>=4)return []; // Never silently drop a required qualification.
   const unique=[...new Map(related.map(p=>[p.text,p])).values()];
   result.push({...candidate,content:unique.map(p=>p.text).join('\n\n'),selectedPassages:unique.map(p=>p.text),passageScopes:unique.map(p=>p.scope),sourceClassification:'lwr_controlling',evidenceRole:'Material qualification',evidenceSelectionReason:'Same-authority restriction on a selected proposition; preserve together'});
  }
 }
 return result;
}
