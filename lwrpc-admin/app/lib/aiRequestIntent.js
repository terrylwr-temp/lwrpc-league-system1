import {registrationReleaseIntent} from './aiRegistrationReleaseIntent.js';
import {isCommunityParticipationQuestion} from './aiCommunityIntent.js';
import {ageReferenceIntent} from './aiAgeReferencePolicy.js';
import {leagueDateIntent} from './aiLeagueDateFacts.js';
import {isRosterTroubleshooting} from './aiRosterTroubleshooting.js';
import {matchingQuestion} from './aiQuestionInterpretation.js';

// Describes the requested proposition, never the answer or an authorization grant.
export function questionIntent(value) {
 const q=matchingQuestion(String(value||'').slice(0,1000)).normalize('NFKC').replace(/[’‘]/g,"'").toLowerCase();
 const bounded=registrationReleaseIntent(q);if(bounded)return bounded;
 const leagues=['weekday','saturday','primetime'].filter(l=>new RegExp(`\\b${l}\\b`).test(q));
 const division=q.match(/\b\d{1,2}\.\d\b/)?.[0]||null;
 const action=/\b(?:add(?:ing)?|enter(?:ing)?|build(?:ing)?|fill(?:ing)?|start(?:ing)?|begin(?:ning)?|updat(?:e|ing)|remov(?:e|ing)|open(?:s|ing)?|clos(?:e|es|ing))\b/.test(q);
 const lineup=/\b(?:lineups?|pairings?|match setup)\b/.test(q);
 const roster=/\brosters?\b/.test(q)||/\bplayers?\b/.test(q)&&action&&!/\b(?:scores?|database|directory|tournament|event|registration)\b/.test(q);
 const rating=/\b(?:dupr|rating)\b/.test(q);
 const temporal=/\b(?:when|date|deadline|due|opens?|closes?|yet|now|already)\b/.test(q);
 const permission=/\b(?:can|may|allowed|permitted)\b/.test(q);
 const procedure=/\b(?:how|where)\s+(?:do|can|should)\s+(?:i|we)\b/.test(q);
 const completed=/\b(?:did|have|has)\s+(?:i|we)\b/.test(q);
 const mixed=/\b(?:and|also)\b.*\b(?:when|can|policy|eligible|rating|dupr|email)\b/.test(q)&&/\b(?:my|our)\b/.test(q);
 const ratingOperation=rating&&/\b(?:establish(?:ed|ment)?|recorded|determined|calculated|set|truncated|lock(?:ed|s)?|chang(?:e|ed|es)|reset|remain(?:s)?|stay(?:s)?|duration|effective|updated)\b/.test(q);
 const ratingMethod=/\b(?:how|method)\b/.test(q)&&/\b(?:determined|calculated|truncated)\b/.test(q);
 const ratingPolicy=ratingOperation&&(/\b(?:when|how|date|can|may|does|do|policy|duration)\b/.test(q));
 if(isCommunityParticipationQuestion(q))return {kind:'community_policy',object:'community_participation',leagues,division,personalWording:/\b(?:i|my|me|our|we)\b/.test(q),matchingQuestion:q};
 let kind='unresolved',object=null;
 if(!completed&&!mixed&&!isRosterTroubleshooting(q)){
  if(roster&&action&&(temporal||permission||procedure)){object=lineup?'lineup':'roster';kind=procedure?'procedure':temporal?'policy_date':'action_policy';}
  else if(ratingPolicy){object='rating';kind=ratingMethod?'action_policy':'policy_date';}
 }
 if(!mixed&&!completed&&/\b(?:rally|scoring|score|picklebreaker)\b/.test(q)&&!/\b(?:ball|paddle|crack|damage)\b/.test(q)){
  if(/\b(?:rally|picklebreaker)\b/.test(q)&&(/\b(?:how|serving|freeze|side out)\b/.test(q)||/\bwhat are\b.*rally scoring rules/.test(q))){kind='scoring_mechanics';object='scoring';}
  else if(leagues.length&&/\b(?:use|uses|scoring method|all rally|rally)\b/.test(q)){kind='scoring_applicability';object='scoring';}
 }
 const age=ageReferenceIntent(q);
 if(age){kind='eligibility_reference_date';object='age_eligibility';}
 if(!age&&!completed&&!mixed&&!/\b(?:did|was|were|already)\b/.test(q)&&/\b(?:when|deadline|due)\b/.test(q)&&/\bscores?\b/.test(q)&&/\b(?:enter\w*|submit\w*|record\w*)\b/.test(q)){kind='deadline';object='score_entry';}
 const date=kind==='unresolved'?leagueDateIntent(q):null;
 if(date){kind='policy_date';object='league_date';}
 return {kind,object,leagues,division,...(age?{ageThreshold:age.ageThreshold}:{}),...(date?{gender:date.gender,category:date.category,policyYear:q.match(/\b20\d{2}\b/)?.[0]||null}:{}),event:age?'reference_date':date?.event||(/\b(?:clos\w*|deadline|last day)\b/.test(q)?'closing':/\bremov\w*\b/.test(q)?'removal':'opening'),phase:/\bpicklebreaker\b/.test(q)?'picklebreaker':/\bregular\b/.test(q)?'regular':'unspecified',currentDate:kind==='policy_date'&&/\b(?:yet|now|already)\b/.test(q),matchingQuestion:q};
}
export const isDocumentIntent = intent => ['community_policy','policy_date','action_policy','procedure','scoring_applicability','scoring_mechanics','eligibility_reference_date','deadline'].includes(intent.kind);
