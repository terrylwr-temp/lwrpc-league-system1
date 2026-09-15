import { sourceRfClassification, rulesRfThreshold } from './rfPolicy.js';
import {excerptSelection} from './aiEvidenceExcerpts.js';
// Reviewed current-season binding, not a threshold store. Future/version changes
// require a new explicit policy binding; no automatic inheritance.
export const ELIGIBILITY_POLICY_BINDING=Object.freeze({version:'6ae10e5f-fdde-41be-a941-d1b7ed360d1a',seasons:['3780e56b-adeb-46be-ab1c-b754bc8aa737','073a4b31-7e66-460c-87bb-65ff29d1d341']});
export function decimal(value){if(value===null||value===undefined||value==='')return null;const s=String(value);if(!/^\d+(?:\.\d{1,6})?$/.test(s))return null;const [a,b='']=s.split('.');const n=Number(a)*1000000+Number(b.padEnd(6,'0'));return Number.isSafeInteger(n)?n:null;}
export function rfClassification(rf,policy){return sourceRfClassification(rf,policy?.threshold);}
const leagueOf=s=>['weekday','saturday','primetime'].find(l=>String(s).toLowerCase().includes(l))||null;
export function policyTables(candidates){const tables=[];for(const c of candidates){const league=leagueOf(c.content.split('\n')[0]);if(!league||!/^\w+ DUPR League Divisions/.test(c.content))continue;
 for(const match of c.content.matchAll(/^(?:[MSW]?DUPR\s*(\d+)|PrimeTime\s+(\d+)\s+\(PT\s+\d+\))\s+(\d+(?:\.\d+)?)\s+to\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)[ \t]*$/gm))tables.push({league,number:match[1]||match[2],min:match[3],max:match[4],pair:match[5],candidate:c,text:match[0]});
 }return tables;}
export function divisionOptions(divisions,intent){const wanted=divisions.filter(d=>d.active&&(!intent.leagues.length||intent.leagues.includes(d.league))&&(!intent.number||d.name.match(/\d+/)?.[0]===intent.number)&&(!intent.exactLabel||!/^([mw]dupr|[mw]pt)/i.test(intent.exactLabel)||d.name.replaceAll(' ','').toUpperCase()===intent.exactLabel));
 const groups=new Map();for(const d of wanted){const key=JSON.stringify([d.league,d.seasonId,d.name.match(/\d+/)?.[0],d.min,d.max,d.pair,d.rating]);if(!groups.has(key))groups.set(key,{...d,ids:[],names:[]});groups.get(key).ids.push(d.id);groups.get(key).names.push(d.name);}
 return [...groups.values()].map(d=>({...d,label:d.names.join(' / ')+' — '+d.seasonName}));}
export function eligibilityPolicy(candidates,division,binding=ELIGIBILITY_POLICY_BINDING){
 const current=candidates.filter(c=>c.documentVersionId===binding.version&&c.documentType==='league_rules');
 if(!binding.seasons.includes(division.seasonId)||!current.length)return {status:'POLICY_SCOPE_UNKNOWN'};
 const tables=policyTables(current).filter(t=>t.league===division.league&&t.number===division.name.match(/\d+/)?.[0]);
 if(tables.length!==1)return {status:'POLICY_UNKNOWN'};const table=tables[0];
 const rf=current.find(c=>rulesRfThreshold(c.content)!==null);
 const threshold=rulesRfThreshold(rf?.content);
 const nr=current.find(c=>/^Rated\) are eligible to participate in any division\./.test(c.content));
 const assignment=current.find(c=>/^4\.5\.1\./m.test(c.content));const pair=current.find(c=>/^4\.5\.2\./m.test(c.content)&&/adding the[\s\S]*Season DUPR Ratings of both players/.test(c.content));
 const enforcement=current.find(c=>/^4\.6\.1\./m.test(c.content));const participation=current.find(c=>/^3\. PLAYER REQUIREMENTS/.test(c.content));const roster=current.find(c=>/5\.6\. Roster Requirements/.test(c.content));
 const age=division.league==='primetime'?current.find(c=>/6\.3\.2\./.test(c.content)&&/12\/31 of the season/.test(c.content)):null;
 if(threshold===null||!nr||!assignment||!pair||!enforcement||!participation||!roster||(division.league==='primetime'&&!age))return {status:'POLICY_UNKNOWN'};
 const evidence=[excerptSelection(table.candidate,[{text:table.text}],'requirement'),...[rf,nr,assignment,pair,enforcement,participation,roster,...(age?[age]:[])].map(c=>excerptSelection(c,[{text:c.content}],'requirement'))];
 const min=decimal(table.min),max=decimal(table.max),pairMax=decimal(table.pair),configMax=decimal(division.max);
 // Config bounds operate on tenths; a stored 2.80 is consistent with 2.899.
 const maxCompatible=configMax===max||configMax===Math.floor(max/100000)*100000;
 const conflict=decimal(division.min)!==min||!maxCompatible||decimal(division.pair)!==pairMax||division.rating!==(division.league==='primetime'?'primetime':'season');
 return {status:conflict?'POLICY_CONFLICT':'READY',threshold,min:table.min,max:table.max,pair:table.pair,evidence,version:binding.version,league:division.league,number:table.number,divisionLabel:division.names?.join(' / ')||division.name};
}
export function evaluateEligibility(policy,input){
 const unknown=['PAIR_AGGREGATE_UNKNOWN','PARTICIPATION_UNKNOWN'];
 if(policy.status!=='READY')return {outcome:policy.status==='POLICY_CONFLICT'?'POLICY_CONFIGURATION_CONFLICT':'CANNOT_DETERMINE',classification:'RF_UNKNOWN',individual:'UNKNOWN',unresolved:unknown};
 let classification=rfClassification(input?.rf,policy);
 if(classification==='RATED')classification=input?.sourceIsNr===true?'NR':input?.sourceIsNr===false?'RATED':'RF_UNKNOWN';
 if(classification==='RF_UNKNOWN')return {outcome:'CANNOT_DETERMINE',classification,individual:'UNKNOWN',unresolved:['RF_UNKNOWN',...unknown]};
 if(classification==='NR')return {outcome:'PARTIALLY_CONFIRMED',classification,individual:'NR_RULES',unresolved:['NR_PLACEMENT_UNCONFIRMED',...unknown]};
 const rating=decimal(input?.value);if(rating===null)return {outcome:'CANNOT_DETERMINE',classification,individual:'UNKNOWN',unresolved:['RATING_MISSING',...unknown]};
 const pass=rating>=decimal(policy.min)&&rating<=decimal(policy.max);
 return {outcome:pass?'PARTIALLY_CONFIRMED':'NOT_ELIGIBLE',classification,individual:pass?'PASS':'FAIL',unresolved:unknown};
}
export function eligibilityText(policy,input,evaluation,personal=true){
 if(policy.status==='POLICY_CONFLICT')return 'The current official Rules and LMS division configuration disagree for this division. I cannot conclusively determine eligibility until League Management resolves that conflict.';
 if(policy.status!=='READY')return 'I cannot establish the complete current eligibility policy for this season and division. Please ask League Management to confirm the applicable policy.';
 const parts=[`The official ${policy.divisionLabel} individual rating range is ${policy.min}–${policy.max}, and the maximum combined Season DUPR of the two players is ${policy.pair}.`];
 if(personal){if(evaluation.classification==='RF_UNKNOWN')parts.push("I cannot establish whether you are Rated or Not Rated (NR), because the applicable Reliability Factor or independent rating status is missing or unavailable. A numeric Season DUPR alone cannot confirm your eligibility.");
 else if(evaluation.classification==='NR')parts.push(`Your applicable rating inputs classify you as Not Rated (NR) under the current Rules. The ordinary individual rating range does not determine your NR placement, even if a numeric adjusted Season DUPR is recorded.`);
 else if(evaluation.individual==='UNKNOWN')parts.push("Your applicable Season DUPR is not recorded or available, so I cannot compare it with the individual requirement.");
 else parts.push(`Your recorded Season DUPR of ${input.value} ${evaluation.individual==='PASS'?'meets':'does not meet'} this individual rating requirement.${evaluation.individual==='FAIL'?' You do not meet this necessary requirement for the selected division.':' This confirms only the individual rating condition, not your complete eligibility.'}`);}
 parts.push(`A Reliability Factor of ${policy.threshold} or below makes a player NR. NR players may participate in any division under Rule 4.5, with professional guidance recommended and the captain responsible for proper placement. For pair aggregates, Rule 4.5.1 initially assigns an NR player the division's maximum individual rating minus 0.5. Rule 4.5.2 uses the highest adjusted rating when the player participates in multiple divisions; it is not a numerical comparison of NR with the ordinary range.`);
 parts.push("Pair compliance cannot be confirmed without the proposed pair and applicable ratings. Membership and waiver, DUPR ID and club membership, community placement and roster requirements also apply; those participation conditions have not been verified here.");
 if(policy.league==='primetime')parts.push("PrimeTime also requires age eligibility under Rule 6.3.2 and the applicable age-based rating. No date of birth or age was retrieved or verified.");
 return parts.join('\n\n');
}
