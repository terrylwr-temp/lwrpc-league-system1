import {isCommunityParticipationQuestion} from './aiCommunityIntent.js';
// Classification only: no personal data, policy constants, authorization or provider.
function rfCondition(question) {
 const match=question.match(/\b(?:dupr\s+)?(?:reliability(?:\s+(?:score\s*\/\s*factor|score|factor))?|rf)\s+(?:(?:is|of|at)\s+)?(less than|below|under|at most|no more than|or below|greater than|above|over|at least|or above|exactly|equal to)?\s*(\d+(?:\.\d{1,3})?)\s*%?\s*(or below|or above)?/);
 if(!match)return null;
 const operator=({'less than':'lt',below:'lt',under:'lt','at most':'lte','no more than':'lte','or below':'lte','greater than':'gt',above:'gt',over:'gt','at least':'gte','or above':'gte',exactly:'eq','equal to':'eq'}[match[1]||match[3]]) || 'eq';
 return operator ? {operator,value:match[2]} : null;
}
export function eligibilityIntent(value) {
 const q=String(value||'').normalize('NFKC').replace(/[’‘]/g,"'").trim().toLowerCase();
 if(q.length>1000)return null;
 if(isCommunityParticipationQuestion(q))return null;
 const suppliedRf=rfCondition(q);
 const decimal=suppliedRf?(q.match(/\bdupr(?:\s+rating)?\s+(?:of\s+)?(\d{1,2}\.\d)\b/)?.[1]||q.match(/\b(\d{1,2}\.\d)\s+(?:in\s+)?dupr\b/)?.[1]||null):(q.match(/\b\d{1,2}\.\d\b/)?.[0]||null);
 const generalRfRule=suppliedRf&&(/\b(?:nr|not rated)\b/.test(q)&&/\b(?:rule|classif\w*|appl\w*|considered|am i)\b/.test(q)||/\bwhat happens\b/.test(q))
   && !/\b(?:can i (?:play|be)|am i (?:eligible|allowed)|do i qualify)\b/.test(q);
 if(generalRfRule)return {kind:'source_rf_policy',personal:false,rfCondition:suppliedRf,decimal};
 const privateRf=/\b(?:reliability factor|rf)\b/.test(q)&&(/\b(?:my|his|her|their|your|teammate|player's|member's)\b/.test(q)||/\w+'s\s+(?:reliability factor|rf)/.test(q));
 const personal=/\b(?:can i (?:play|be)|am i (?:eligible|allowed)|do i qualify)\b/.test(q);
 const policy=/\b(?:requirements?|range|eligible|eligibility|qualif\w*|what age|nr)\b/.test(q);
 const label=q.match(/\b([mws]?dupr)\s*(\d{1,2})(?!\.\d)\b/)||q.match(/\b((?:[mw]\s*)?pt|primetime|prime time)\s*(\d{1,2})\b/);
 const prime=/\bprime\s*time\b/.test(q);
 if(prime&&!label&&/\b(?:turn|65)\b/.test(q))return null; // Existing conditional age-policy path; no personal lookup.
 const referential=/\b(?:this|that) division\b/.test(q);
 if(!(personal||policy)||!(label||decimal||prime||referential||suppliedRf))return privateRf?{personal:true,kind:'unsupported_personal_rf'}:null;
 const leagues=['weekday','saturday','primetime'].filter(l=>new RegExp(l==='primetime'?'\\bprime\\s*time\\b':`\\b${l}\\b`).test(q));
 if(label?.[1].startsWith('s')&&!leagues.length)leagues.push('saturday');
 if(label&&/pt|prime/.test(label[1])&&!leagues.length)leagues.push('primetime');
 return {personal,kind:personal?'personal_eligibility':'division_policy',number:label?.[2]||null,exactLabel:label?label[1].replaceAll(' ','').toUpperCase()+label[2]:null,leagues,decimal,rfCondition:suppliedRf,referential,ageOnly:!personal&&prime&&/\bage\b/.test(q)};
}
export const isEligibilityReceipt=v=>typeof v==='string'&&v.startsWith('live1.eligibility.');
export const needsEligibility=b=>Boolean(eligibilityIntent(b?.question))||isEligibilityReceipt(b?.conversationReceipt)||(!b?.conversationReceipt&&/^choice:/.test(b?.question||''));
