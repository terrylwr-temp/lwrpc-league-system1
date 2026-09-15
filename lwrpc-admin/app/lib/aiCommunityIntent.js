// Policy topic only. No Live lookup, facts, or authorization is inferred here.
export function isCommunityParticipationQuestion(value) {
 const q=String(value||'').normalize('NFKC').replace(/[’‘]/g,"'").toLowerCase();
 if(!/\bcommunit(?:y|ies)\b/.test(q))return false;
 // Keep requests for recorded personal fields out of the policy exemption.
 if(/\b(?:show|check|look up|what|which|who)\b[^?!.]*\b(?:my rating|my team|my roster|registered|assigned|email|phone)\b/.test(q))return false;
 const elsewhere=/\bplay elsewhere\b/.test(q)&&/\b(?:my|our|own) community\b/.test(q);
 const relation=elsewhere||/\b(?:another|other|different|own|cross)[ -]communit(?:y|ies)\b|\bcommunity where (?:i|we|you) live\b/.test(q);
 return relation&&(/\b(?:play|playing|join|joining|form|eligibility rules)\b/.test(q)||/\bteams?\b/.test(q)&&/\b(?:rules?|allowed|permitted|same)\b/.test(q))
   || /\b(?:my|our) community(?:'s)? team\b[^?]*\bfull\b/.test(q);
}
