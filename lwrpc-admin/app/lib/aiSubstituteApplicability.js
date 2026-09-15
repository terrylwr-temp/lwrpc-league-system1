// Intent recognition only: no policy answer, numerical eligibility, or user facts.
const subject = /\b(?:subs?|substitutes?(?: players?)?|replacement players?)\b/i;
export function substituteEligibilityIntent(value) {
 const text=String(value||'').toLowerCase();
 if(!subject.test(text)||/\b(?:subscription|submarine|sandwich|sub contractor)\b/.test(text))return null;
 const domain=/\b(?:dupr|division|eligibility|eligible|qualify|requirements?|nr|not rated)\b/.test(text);
 if(!domain)return null;
 if(/\b(?:what(?:'s| is)|show|look up|tell me)\b[\s\S]*\b(?:my|our|their|his|her)\b[\s\S]*\b(?:rating|dupr)\b/.test(text))return null;
 // Do not let a second, unrelated requested policy inherit substitute evidence.
 if(/\b(?:community|communities|ball|paddle|schedule|released|registration|sign up|serve|kitchen|lineup order)\b/.test(text))return null;
 const nr=/\b(?:nr|not rated)\b/.test(text);
 const requirement=/\b(?:range|limits?|minimum|maximum|requirements?|eligibility|eligible|qualify|rules?|required|have to|must|waiv\w*|exceed|above|below)\b/.test(text)||nr&&/\b(?:can|may|allowed)\b/.test(text);
 if(!requirement)return null;
 return {family:'substitute_eligibility',facet:nr?'nr':'division',inverse:/\b(?:outside|above|below|exceed|waiv\w*|different|not (?:in|within)|without)\b/.test(text)};
}
export function substitutePolicyMatch(question, revision) {
 const canonical=substituteEligibilityIntent(revision?.canonical_question);
 if(!canonical)return null;
 const requested=substituteEligibilityIntent(question);
 if(!requested)return {matches:false,reason:'substitute_policy_not_requested'};
 const policy=String(revision?.approved_answer||'');
 // A narrow canonical question cannot license inference from silence. The immutable
 // answer must explicitly cover the requested facet and the common requirements.
 const common=subject.test(policy)&&/\bdivision\b/i.test(policy)&&/\b(?:eligibility|requirements?)\b/i.test(policy)&&/\b(?:dupr|rating)\b/i.test(policy);
 const covers=common&&(requested.facet!=='nr'||/\b(?:nr|not rated)\b/i.test(policy));
 return {matches:covers,reason:covers?'substitute_policy_equivalent':'substitute_facet_not_supported'};
}
