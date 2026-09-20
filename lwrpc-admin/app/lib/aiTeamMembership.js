import {evidencePassages} from './aiQuestionApplicability.js';

// Identify a question about one player's membership on more than one team.
// Team registration and captain procedures are different subjects.
export function isMultiTeamMembershipQuestion(question) {
  const text=String(question||'').toLowerCase();
  const person=/\b(?:players?|members?|someone|somebody|anyone|i|we)\b/.test(text);
  const team=/\b(?:teams?|rosters?)\b/.test(text);
  const plurality=/\b(?:multiple|two|2|second|another|only\s+one|more\s+than\s+one|more\s+than\s+a\s+single)\s+(?:\w+\s+){0,3}(?:teams?|rosters?)\b/.test(text)
    || /\b(?:limited|restricted|confined)\s+to\s+(?:only\s+)?one\s+(?:team|roster)\b/.test(text);
  const membership=/\b(?:play|plays|playing|join|joining|be|on|listed|rostered|have|limited|allowed|permitted|substitute)\b/.test(text);
  return person&&team&&plurality&&membership&&!/\b(?:register|registration|sign\s*up|purchase|payment|fee)\b/.test(text);
}

export function multiTeamMembershipPassages(candidate) {
  if(candidate?.documentType!=='league_rules')return [];
  return evidencePassages(candidate).filter(passage=>{
    const text=passage.replace(/\s+/g,' ').toLowerCase();
    return /\bplayers?\b/.test(text)
      && /\b(?:multiple|more than one|two)\b/.test(text)
      && /\b(?:teams?|rosters?)\b/.test(text)
      && /\b(?:permitted|allowed|may|can|cannot|prohibited|limited|only)\b/.test(text)
      && /\b(?:join|substitute|listed|rostered|play|participate)\b/.test(text);
  });
}

// Reuse an exact subject phrase from an already returned official passage.
// The source determines the wording; this function supplies no policy answer.
export function sourceAlignedMembershipQuery(candidates) {
  const ranked=[...(candidates||[])].filter(c=>multiTeamMembershipPassages(c).length)
    .sort((a,b)=>(b.semanticScore||0)-(a.semanticScore||0)||a.documentAuthorityRank-b.documentAuthorityRank);
  for(const candidate of ranked){
    for(const passage of multiTeamMembershipPassages(candidate)){
      const phrase=passage.replace(/\s+/g,' ').match(/\b(?:multiple|more than one|two)\s+(?:[a-z-]+\s+){0,4}(?:teams?|rosters?)\b/i)?.[0];
      if(phrase)return phrase.toLowerCase();
    }
  }
  return '';
}

export function canonicalMembershipQuery(question) {
  // Normalize person, count and roster/team vocabulary across ordinary
  // phrasing; no rule number, document title, or policy outcome is assumed.
  return isMultiTeamMembershipQuestion(question)?'more than one team roster':'';
}
