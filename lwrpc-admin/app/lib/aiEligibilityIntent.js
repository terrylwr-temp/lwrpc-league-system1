import {isCommunityParticipationQuestion} from './aiCommunityIntent.js';
// Classification only: no personal data, policy constants, authorization or provider.
export function eligibilityIntent(value) {
 const q=String(value||'').normalize('NFKC').replace(/[’‘]/g,"'").trim().toLowerCase();
 if(q.length>1000)return null;
 if(isCommunityParticipationQuestion(q))return null;
 const suppliedRf=q.match(/\b(?:reliability factor|rf)\s+(?:is|of)\s+(\d+(?:\.\d{1,3})?)\b/);
 if(suppliedRf&&/\b(?:nr|not rated|what happens)\b/.test(q))return {kind:'source_rf_policy',personal:false,rf:suppliedRf[1]};
 const privateRf=/\b(?:reliability factor|rf)\b/.test(q)&&(/\b(?:my|his|her|their|your|teammate|player's|member's)\b/.test(q)||/\w+'s\s+(?:reliability factor|rf)/.test(q));
 const personal=/\b(?:can i (?:play|be)|am i (?:eligible|allowed)|do i qualify)\b/.test(q);
 const policy=/\b(?:requirements?|range|eligible|eligibility|qualif\w*|what age|nr)\b/.test(q);
 const label=q.match(/\b([mws]?dupr)\s*(\d{1,2})\b/)||q.match(/\b((?:[mw]\s*)?pt|primetime|prime time)\s*(\d{1,2})\b/);
 const decimal=q.match(/\b\d{1,2}\.\d\b/)?.[0]||null;
 const prime=/\bprime\s*time\b/.test(q);
 if(prime&&!label&&/\b(?:turn|65)\b/.test(q))return null; // Existing conditional age-policy path; no personal lookup.
 const referential=/\b(?:this|that) division\b/.test(q);
 if(!(personal||policy)||!(label||decimal||prime||referential))return privateRf?{personal:true,kind:'unsupported_personal_rf'}:null;
 const leagues=['weekday','saturday','primetime'].filter(l=>new RegExp(l==='primetime'?'\\bprime\\s*time\\b':`\\b${l}\\b`).test(q));
 if(label?.[1].startsWith('s')&&!leagues.length)leagues.push('saturday');
 if(label&&/pt|prime/.test(label[1])&&!leagues.length)leagues.push('primetime');
 return {personal,kind:personal?'personal_eligibility':'division_policy',number:label?.[2]||null,exactLabel:label?label[1].replaceAll(' ','').toUpperCase()+label[2]:null,leagues,decimal,referential,ageOnly:!personal&&prime&&/\bage\b/.test(q)};
}
export const isEligibilityReceipt=v=>typeof v==='string'&&v.startsWith('live1.eligibility.');
export const needsEligibility=b=>Boolean(eligibilityIntent(b?.question))||isEligibilityReceipt(b?.conversationReceipt);
