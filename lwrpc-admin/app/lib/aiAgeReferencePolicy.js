import {excerptSelection,sourceRange} from './aiEvidenceExcerpts.js';

// A request for a stored personal age is different from applying an official rule
// to a hypothetical fact supplied in the question. No personal lookup is added.
export function requestsStoredAge(q) {
 return (/^when (?:do|does|will|did) .{1,60} turn \d{2,3}\b/.test(q)&&!/\b(?:have to|need to|must|required)\b/.test(q)) || /\b(?:age|birthday|birth date|dob|date of birth)\b/.test(q)&&/\b(?:stored|recorded|profile|account|database|look up|lookup|check my|show my|tell me my|change my|update my)\b/.test(q) || /\bhow old am i\b/.test(q);
}
export function ageReferenceIntent(q) {
 if(requestsStoredAge(q)||/\b(?:dob|date of birth|email|phone|rating|dupr|roster|scores?|change|update|delete)\b/.test(q.replace(/\bdupr league\b/g,'league')))return null;
 const age=/\bage\b|\bturn(?:ing)?\s+\d{2,3}\b|\bbe\s+\d{2,3}\b|\b\d{2,3}\+/.test(q);
 const reference=/\b(?:date|cutoff|cut off|based|basing|determin\w*|turn|turning|when|season starts?|season begins?)\b/.test(q);
 if(!age||!reference)return null;
 return {ageThreshold:q.match(/\b(?:turn(?:ing)?|be)\s+(\d{2,3})\b/)?.[1]||q.match(/\b(\d{2,3})\+/)?.[1]||null};
}
export function selectAgeReferenceEvidence(candidates,intent) {
 const matches=[];
 for(const c of candidates){
  if(c.documentType!=='league_rules')continue;
  const heading=c.content.split('\n')[0];
  const league=heading.match(/^(?:\d+(?:\.\d+)*\.?\s+)?(Weekday|Saturday|PrimeTime) (?:DUPR )?League\s*$/i)?.[1]?.toLowerCase();
  if(!league||intent.leagues.length&&!intent.leagues.includes(league))continue;
  const start=c.content.indexOf('Player Age Eligibility:');
  if(start<0)continue;
  const policy=c.content.slice(start).split(/\n(?=\d+\.\d+\.?\s)/)[0].trimEnd();
  if(!/\bage\b[\s\S]*\b(?:determined|based)\b[\s\S]*\b(?:as of|date)\b/i.test(policy))continue;
  const requirement=c.content.match(/\bThe [^\n]+League is exclusively for players age\b[\s\S]*?\./i)?.[0];
  if(!requirement)continue;
  if(!intent.leagues.length&&(!intent.ageThreshold||!new RegExp(`\\bage ${intent.ageThreshold}\\b`).test(requirement)))continue;
  const scopeBindings=[{...sourceRange(c,heading),kind:'league'}];
  matches.push(excerptSelection(c,[requirement,policy].map(text=>({text,applicability:{role:'requirement',league},scopeBindings})),'eligibility_reference_date'));
 }
 // An unnamed age category can identify a league only when the current rules
 // establish one unambiguous matching league. Never pick by numeric similarity.
 if(!intent.leagues.length&&new Set(matches.flatMap(c=>c.excerptItems.map(i=>i.applicability.league))).size!==1)return [];
 return matches.length<=4?matches:[];
}
