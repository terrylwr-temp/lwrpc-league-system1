import { officialQuestionConcept, conceptText } from './aiQuestionConcepts.js';
import { evidencePassages } from './aiQuestionApplicability.js';

// Structural context is fetched from the same immutable version, never inferred
// from a manager decision or from the player's proposed league/rating.
export function passageScope(candidate, passage) {
  const number = passage.match(/^\s*(\d+(?:\.\d+)*)\.\s/)?.[1] || candidate.ruleNumber || '';
  const contexts = [candidate, ...(candidate.structuralContext || [])];
  const ancestors = [];
  for (const item of contexts) {
    for (const m of String(item.content || '').matchAll(/(?:^|\n)\s*(\d+(?:\.\d+)*)\.\s*([^\n]+)/g)) {
      if (number === m[1] || number.startsWith(m[1]+'.')) ancestors.push({ number:m[1], label:m[2] });
    }
  }
  ancestors.sort((a,b)=>a.number.length-b.number.length);
  const labels = [candidate.documentTitle, candidate.sectionLabel, candidate.heading, ...ancestors.map(x=>x.label)].join(' ');
  const leagueNames = ['weekday','saturday','primetime'];
  const fallbackLeagues=leagueNames.filter(l=>new RegExp(`\\b${l}\\b`,'i').test(labels));
  const league = [...ancestors].reverse().map(x=>leagueNames.find(l=>new RegExp(`\\b${l}\\b`,'i').test(x.label))).find(Boolean)
    || (fallbackLeagues.length===1?fallbackLeagues[0]:null);
  const division = [...ancestors].reverse().filter(x=>/division/i.test(x.label)).map(x=>x.label.match(/\b\d{1,2}\.\d\b/)?.[0]).find(Boolean) || null;
  return { league, division, formatContext:ancestors.some(x=>/match(?: day)? format/i.test(x.label)), ambiguousLeague:!league&&fallbackLeagues.length>1, rule: number, phase: /picklebreaker/i.test(passage) ? (/match(?: day)? format/i.test(passage)?'regular_and_picklebreaker':'picklebreaker') : /rally scoring rules/i.test(candidate.content)&&!league?'general_rally_mechanics':'unspecified', provenance: 'same_version_structure' };
}

function hasDivisionException(candidate,plan) {
  if(!plan.division)return false;
  return (candidate.structuralContext||[]).some(context=>evidencePassages(context).some(p=>{
    const scope=passageScope({...candidate,ruleNumber:context.ruleNumber,content:context.content},p);
    return scope.division===plan.division && plan.leagues.includes(scope.league);
  }));
}

function applies(candidate, text, plan, scope) {
  const p=conceptText(text);
  if (plan.kind==='website') {
    if(plan.entity==='club')return /\bclub\s+(?:main\s+)?website\s*:\s*https?:\/\//.test(p);
    if(plan.entity==='lms')return /\b(?:lms|league management system)\b[^\n]{0,40}website\s*:\s*https?:\/\//.test(p);
    return /\bdupr\s+(?:id|website)\b[^\n]{0,100}https?:\/\//.test(p);
  }
  if(plan.kind==='account_help')return candidate.documentType!=='usap_rulebook' && (plan.operation==='password' ? /(?:select|click|button)[\s\S]{0,60}(?:forgot|change) password/.test(p) : /(?:logging into|sign in|log in)/.test(p)&&/https?:\/\//.test(p));
  if(plan.kind==='membership_help')return /club website link[\s\S]{0,150}(?:renewals|payments|membership)/.test(p);
  if(plan.kind==='apparel')return candidate.documentType==='league_rules' && /\b(?:apparel|clothing|shirts?|jerseys?|uniforms?)\b/.test(p) && /\bcolou?r\b/.test(p) && /\b(?:must|may|shall|prohibited|allowed)\b/.test(p);
  if(plan.kind.startsWith('nvz_')) {
    if(candidate.documentType!=='usap_rulebook'||/adaptive|wheel|tournament director/i.test([candidate.heading,text].join(' ')))return false;
    if(plan.kind==='nvz_presence')return /may contact[\s\S]*except during the act of volleying/.test(p);
    return /area of the court/.test(p)&&/non-volley zone/.test(p) && (plan.kind!=='nvz_boundary'||/all lines[\s\S]*part of the zone/.test(p));
  }
  if(scope.ambiguousLeague)return false;
  if(candidate.documentType!=='league_rules' && !(plan.kind==='composition'&&plan.operation==='roster'&&candidate.documentType==='captain_guide'))return false;
  if(scope.league && plan.leagues.length && !plan.leagues.includes(scope.league))return false;
  if(scope.division && scope.division!==plan.division)return false;
  if(plan.kind==='mixed_participation')return /mixed teams[\s\S]*additional players[\s\S]*only in the mixed round/.test(p) && scope.league && (!plan.leagues.length||plan.leagues.includes(scope.league));
  if(plan.kind==='composition') {
    if(plan.operation==='pair_rating')return /adding the season dupr ratings of both players/.test(p) || /every lineup[\s\S]*individual[\s\S]*combined/.test(p);
    if(plan.operation==='individual_rating')return /individual.*rating/.test(p)&&/max team/.test(p)&&scope.league&&plan.leagues.includes(scope.league);
    if(plan.operation==='roster')return /roster enough players[\s\S]*full lineup/.test(p);
    if(!scope.league || !plan.leagues.includes(scope.league))return false;
    if(hasDivisionException(candidate,plan) && scope.division!==plan.division)return false;
    return plan.operation==='courts' ? /(?:require|requires?)\s+\d+\s+courts/.test(p) : /roster & courts|\d+\s+lines?\s*\(\d+\s+players\)/.test(p);
  }
  if(plan.kind==='format') {
    if(!scope.league||!plan.leagues.includes(scope.league))return false;
    if(hasDivisionException(candidate,plan)&&scope.division!==plan.division)return false;
    if(plan.operation==='schedule')return /flex league|scheduling:/.test(p);
    return /(?:match(?: day)? format|roster & courts|flex league|scoring:|lines?\s*\(\d+\s+players\))/.test(p) && /(?:play|games?|teams?|points|flex league)/.test(p) || scope.formatContext && /(?:play|games?|teams?|points)/.test(p);
  }
  if(plan.kind==='scoring') {
    const general = /rally scoring rules/i.test(candidate.content) && !scope.league;
    if(plan.phase==='rally') {
      if(general)return /(?:service positioning|switching sides|side outs|game points|scoring freeze|win-by-two)/.test(p);
      return Boolean(scope.league && plan.leagues.includes(scope.league) && /rally scoring/.test(p) && !/picklebreaker/.test(p) && !/scoring freeze/.test(plan.question));
    }
    return /picklebreaker/.test(p) && (scope.league ? plan.leagues.includes(scope.league) : !plan.leagues.length && /game overview/i.test(candidate.heading)) && /(?:game to \d|played to \d|picklebreaker[^.]{0,60}to \d|shall be played only when|only played if tie)/.test(p);
  }
  return false;
}

export function selectConceptEvidence(retrieval) {
  const plan=officialQuestionConcept(retrieval.request?.question);
  if(!plan||plan.kind==='document_navigation')return null;
  if(plan.kind==='scoring' && ![...(retrieval.candidates||[]),...(retrieval.suppliedEvidence||[])].some(c=>/rally scoring rules|picklebreaker/i.test(c.content)))return null;
  if(plan.kind==='composition' && plan.alsoRating)return []; // Preserve complete coverage until partial answering is separately approved.
  const candidates=[...(retrieval.authorityReviewCandidates||retrieval.suppliedEvidence||[]),...(retrieval.intentEvidenceCandidates||[])];
  const selected=[];
  for(const candidate of candidates) {
    if(candidate.combinedScore<(retrieval.evidence?.threshold||.35))continue;
    const passages=evidencePassages(candidate).filter(p=>applies(candidate,p,plan,passageScope(candidate,p)));
    if(!passages.length)continue;
    const content=passages.join('\n\n');
    if(selected.some(x=>x.content===content))continue;
    selected.push({...candidate,content,selectedPassages:passages,passageScopes:passages.map(p=>passageScope(candidate,p)),sourceClassification:candidate.documentType==='league_rules'?'lwr_controlling':candidate.documentType==='usap_rulebook'?'usap_governing_fallback':'lwr_supporting_guide',evidenceRole:'Direct',evidenceSelectionReason:`Direct ${plan.kind} proposition with trusted object and scope`});
  }
  return selected.sort((a,b)=>Number(a.documentAuthorityRank)-Number(b.documentAuthorityRank)||b.combinedScore-a.combinedScore).slice(0,4);
}
