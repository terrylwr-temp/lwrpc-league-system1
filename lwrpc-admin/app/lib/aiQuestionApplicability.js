import { schedulingQuestionKind, schedulingPassageApplies } from './aiSchedulingApplicability.js';
// Stage 4 matcher-only analysis. Never rewrites a stored document or retrieval score.
export function operationWords(value) {
  return String(value || '').toLowerCase().replace(/\b(adding|added|updating|updated|removing|removed|entering|entered|deleting|deleted|changing|changed)\b/g,
    word => ({adding:'add',added:'add',updating:'update',updated:'update',removing:'remove',removed:'remove',entering:'enter',entered:'enter',deleting:'delete',deleted:'delete',changing:'change',changed:'change'})[word]);
}

export function questionLeague(question) {
  const value = operationWords(question);
  const explicit = ['saturday', 'weekday', 'primetime'].filter(league => new RegExp(`\\b${league}\\b`).test(value));
  if (explicit.length) return explicit;
  // The assistant's league roster context is LWR; an unrelated weekend event is not.
  return /\bweekend\s+league\b/.test(value) && /\b(?:roster|team|lwr|club)\b/.test(value)
    && !/\b(?:another|other|external|elsewhere)\b/.test(value) ? ['saturday'] : [];
}

export function leagueCompatible(candidate, question) {
  const requested = questionLeague(question);
  if (!requested.length) return true;
  const scope = [candidate.documentScopeKind, candidate.scopeKind, candidate.scopeLeague, candidate.sectionLabel, candidate.heading].filter(Boolean).join(' ').toLowerCase();
  if (/\ball\s+leagues?\b/.test(scope)) return true;
  const named = ['saturday', 'weekday', 'primetime'].filter(league => new RegExp(`\\b${league}\\b`).test(scope));
  return !named.length || requested.some(league => named.includes(league));
}

export function evidencePassages(candidate) {
  const blocks = String(candidate?.content || '').replace(/\r/g, '').split(/\n\s*\n|\n(?=\s*(?:[•]\s*|o\s+|\d+(?:\.\d+)*\.\s))/).map(text => text.trim()).filter(Boolean);
  const units = [];
  const leagueHeading = blocks[0] === candidate?.heading && /\bleague\s+key\s+dates\b/i.test(blocks[0]) && questionLeague(blocks[0]).length === 1 ? blocks[0] : '';
  for (let i = 0; i < blocks.length; i++) {
    const parent = blocks[i];
    if (leagueHeading && /^•\s/.test(parent) && /\bseason\s+dupr\s+ratings?\s+recorded\b/i.test(parent)) {
      units.push(`${leagueHeading}\n${parent}`);
      continue;
    }
    const number = parent.match(/^(\d+(?:\.\d+)*)\.\s/)?.[1];
    if (number && /:\s*$/.test(parent)) {
      const children = [];
      while (i + 1 < blocks.length && blocks[i + 1].match(/^(\d+(?:\.\d+)*)\.\s/)?.[1]?.startsWith(`${number}.`)) children.push(blocks[++i]);
      units.push([parent, ...children].join('\n'));
    } else if (/^o\s/.test(parent) && /:\s*$/.test(parent) && /\b(?:shall|must|will|may|provide|require)\b/i.test(parent)) {
      // Keep only each relevant child with its own adjacent governing parent.
      // The other bullets remain separate units and must qualify independently.
      let children = 0;
      while (i + 1 < blocks.length && /^\s/.test(blocks[i + 1])) {
        units.push(`${parent}\n${blocks[++i]}`); children++;
      }
      if (!children) units.push(parent);
    } else units.push(parent);
  }
  return units;
}

export function isRosterParticipationQuestion(question) {
  const q = String(question || '').toLowerCase().replace(/[’‘]/g, "'");
  // Generic permission/obligation, never a named person's membership lookup.
  return /\b(?:a|any|an active)\s+player\b/.test(q) && /\broster\b/.test(q)
    && (/\bcan\s+(?:i|we)\s+(?:use|play|field)\s+(?:a|any)\s+player\b/.test(q) && /\b(?:not|isn't|wasn't|without)\b/.test(q)
      || /\bdoes\s+a\s+player\s+(?:have|need)\s+to\s+be\s+on\b/.test(q) && /\b(?:play|playing|participating)\b/.test(q)
      || /\bwhat\s+happens\s+if\s+a\s+player\b/.test(q) && /\b(?:not|isn't|wasn't)\b/.test(q));
}

export function ratingQuestionKind(question) {
  const q = String(question || '').toLowerCase();
  if (/\bseason(?:'s)?\s+dupr\b/.test(q) && /\b(?:what\s+is|how|determin\w*|establish\w*|calculat\w*|truncat\w*)\b/.test(q)) return 'Season DUPR determination';
  if (/\breliability\s+factor\b/.test(q)) return 'DUPR Reliability Factor';
  if (/\bnr\b|\bnot\s+rated\b/.test(q) && /\b(?:what|mean|definition|classified)\b/.test(q)) return 'NR definition';
  return '';
}

export function isSeasonRatingDateQuestion(question) {
  return /^\s*(?:when\s+(?:are|were|will|do)|(?:on\s+)?what\s+date\b)/i.test(question)
    && /\bseason\s+dupr(?:['’]s|s)?(?:\s+ratings?)?\b/i.test(question)
    && /\brecorded\b/i.test(question)
    && !/\b(?:and|scores?|rosters?|lineups?|match\s+setup|calculated|determined)\b/i.test(question);
}

export function seasonRatingDatePassages(candidate, question) {
  if (!isSeasonRatingDateQuestion(question) || !leagueCompatible(candidate, question) || candidate?.documentType === 'usap_rulebook') return [];
  return evidencePassages(candidate).filter(p => /\bleague\s+key\s+dates\s*\n•\s*[^\n]+\bseason\s+dupr\s+ratings?\s+recorded\b/i.test(p));
}

export function isCommunityParticipationQuestion(question) {
  const q = String(question || '').toLowerCase();
  return /\bcommunit(?:y|ies)\b/.test(q)
    && /\b(?:join(?:ing)?|play|form|eligibility\s+rules)\b/.test(q)
    && (/\bteams?\b/.test(q) || /\bplay\s+for\s+(?:another|a\s+different|the)\s+community\b/.test(q));
}

export function communityParticipationPassages(candidate) {
  if (candidate?.documentType !== 'league_rules') return [];
  // Recognize the complete conditional participation proposition in the body;
  // a community heading or a roster/guest procedure is not permission.
  return evidencePassages(candidate).filter(p => /\bplayers?\s+may\s+(?:form|join)\s+teams?\b/i.test(p)
    && /\bother\s+communities\b/i.test(p) && /\bnot\s+permitted\s+to\s+play\b/i.test(p)
    && /\bif\b[\s\S]*\bown\s+community\b[\s\S]*\bteam\b[\s\S]*\bdivision\b/i.test(p));
}

export function ratingApplicablePassages(candidate, question) {
  const kind = ratingQuestionKind(question);
  if (!kind || candidate.documentType === 'usap_rulebook') return [];
  return evidencePassages(candidate).filter(p => {
    // Definitions/determination are distinct from applications in a UI or a
    // particular age/division schedule. Match facts in the body, not a heading.
    if (/\bmatch\s+setup|\broster\s*&\s*courts|\bteam'?s\s+dupr\s+rating\s+is\s+calculated/i.test(p)) return false;
    const reliability = /\breliability\s+factor\b/i.test(p) && /\b(?:below|above|less|minimum|required|classified|not rated)\b/i.test(p);
    const definition = /\bnot rated\b[\s\S]{0,20}\bNR\b|\bNR\b[\s\S]{0,20}\bnot rated\b/i.test(p);
    if (kind === 'NR definition') return definition && /\b(?:classified|means|is|below)\b/i.test(p);
    if (kind === 'DUPR Reliability Factor') return reliability;
    const established = /\bseason\s+dupr\s+rating\b[\s\S]{0,90}\b(?:established|set|determined)\b/i.test(p);
    const truncated = /\bdupr\s+ratings?\b[\s\S]{0,90}\btruncat\w*\b/i.test(p) && /\bseason/i.test(p);
    const nrAssignment = /\bnr\s+player\b[\s\S]{0,120}\bassigned\b[\s\S]{0,60}\bseason\s+dupr/i.test(p);
    const consistentAssignment = /\bhighest\s+adjusted\s+season\s+dupr\b/i.test(p) && /\bconsistently\b/i.test(p);
    return established || truncated || reliability || nrAssignment || consistentAssignment;
  });
}

export function ballDamageKind(question) {
  const q = String(question || '').toLowerCase().replace(/-/g, ' ');
  if (/\b(?:color|colour|specifications?|brand|extra|spare|returned|placed)\b/.test(q)) return '';
  const damage = '(?:crack(?:s|ed|ing)?|break(?:s|ing)?|broken|damag(?:e|ed)|soft|degraded)';
  const linked = new RegExp(`\\b${damage}\\s+balls?\\b|\\bballs?\\s+(?:(?:is|are|was|becomes?|became|gets?|got|has|been|being)\\s+){0,3}${damage}\\b`).test(q);
  if (!linked) return '';
  return /\b(?:soft|degraded)\b/.test(q) ? 'soft' : /\b(?:crack\w*|break\w*|broken)\b/.test(q) ? 'fracture' : 'general';
}

export function plausibleRosterTimingLeagues(question, candidates) {
  const q = operationWords(question);
  if (questionLeague(q).length || /\b(?:lineup|match\s+setup|pairings?)\b/.test(q)
    || !/\b(?:when|date|deadline|start|open)\b/.test(q)
    || !/\b(?:roster|team)\b/.test(q) || !/\b(?:add|update|remove|open|start)\b/.test(q)) return [];
  const leagues = new Set();
  for (const c of candidates || []) {
    if (Number(c.combinedScore) < .35 || !/\b(?:updating|update|open\w*)\s+rosters?\b/i.test(c.content || '')) continue;
    for (const league of questionLeague([c.heading, c.sectionLabel].join(' '))) leagues.add(league);
  }
  return [...leagues];
}

const FRAMING = new Set('what which who when where why how does do did is are was were can could would should will a an and about at be by for from in of on or the to with i we you my our your this that it need needs must rule rules official lwr pickleball club please explain mean means meaning definition work works type kind using use someone player players game games match matches halfway through during got there any considerations consideration policy pc happen happens if has another play'.split(' '));
function conceptWords(value) {
  return operationWords(value).replace(/\b(?:non(?:-\s*|\s+)volley\s+zone|kitchen|nvz)\b/g, 'nvz').replace(/\b(?:volleys|volleying|volleyed)\b/g, 'volley').replace(/can't finish|cannot finish|cannot complete|unable to finish|medical issue|injur(?:y|ed)|hurt/g,'retirement')
    .replace(/\byell\b|\binsult\b|\babusive\b|\babuse\b/g,'conduct').replace(/\bfinish\b/g,'complete')
    .replace(/\bscoring\b/g,'score').replace(/\b(?:requirements?|required|requires)\b/g,'require')
    .replace(/\b(?:ratings)\b/g,'rating').replace(/\b(?:members)\b/g,'member').replace(/\b(?:coaches|coaching)\b/g,'coach').replace(/\bcourts\b/g,'court').replace(/\bnon-players?\b/g,'nonplayer');
}

export function genericApplicablePassages(candidate, question) {
  if (!leagueCompatible(candidate, question)) return [];
  const scheduling = schedulingQuestionKind(question);
  if (scheduling) return candidate.documentType === 'usap_rulebook' ? [] : evidencePassages(candidate).filter(p => schedulingPassageApplies(p, scheduling));
  if (ratingQuestionKind(question)) return ratingApplicablePassages(candidate, question);
  const q = conceptWords(question);
  // A request for the contents of a named document is a summary, not a new policy.
  const summary = q.match(/\bwhat\s+does\s+(?:the\s+)?(.+?)\s+(?:say|release)\b/);
  // Canonical concepts replace conversational paraphrases; literal-word matching is
  // reserved for unrecognized substantive terms, never the whole raw question.
  const words = [...new Set(((summary ? summary[1] : q).match(/[a-z0-9]+/g) || []).filter(word => !FRAMING.has(word)))];
  if (!words.length) return [];
  // Named-document summaries must come from that document/section, not an
  // incidental requirement elsewhere to accept or consult it.
  if (summary && !words.every(word => new Set(conceptWords([candidate.documentTitle, candidate.heading, candidate.sectionLabel].join(' ')).match(/[a-z0-9]+/g) || []).has(word))) return [];
  return evidencePassages(candidate).filter(passage => {
    const text = conceptWords(passage);
    const tokens = new Set(text.match(/[a-z0-9]+/g) || []);
    if (!words.every(word => tokens.has(word))) return false;
    // Topic references and titles alone never establish an operative fact.
    return /\b(?:must|shall|may|cannot|can|only|require|allowed|permitted|prohibited|is|are|means|recorded|below|above|releases?|use|select|click|save|provide)\b/.test(text);
  });
}

export function missingPlayerObject(question) {
  const value = operationWords(question);
  return /\b(?:add|enter)\s+(?:new\s+)?players?\b/.test(value)
    && /\b(?:when|how|start|begin)\b/.test(value)
    && !/\b(?:rosters?|teams?|league|season|lineups?|pairings?|match|scores?|tournament|event|database|directory|registration)\b/.test(value);
}

export function playerObjectReply(question) {
  const value = String(question || '').trim().replace(/[?.!]+$/, '');
  if (/^(?:(?:to|on|into|for)\s+)?(?:(?:my|our|the|a)\s+)?(?:team\s+|season\s+)?roster$/i.test(value)) return 'team roster';
  if (/^(?:(?:to|on|into|for)\s+)?(?:(?:my|our|the|a)\s+)?(?:match\s+lineup|lineup|match\s+setup|player\s+pairings)$/i.test(value)) return 'match lineup';
  return '';
}

// Independent interrogatives are separate issues. Noun conjunctions retain their
// qualifiers; they are not silently reduced to one supported topic.
export function questionClauses(question) {
  if (/^when\s+and\s+how\b/i.test(String(question || ''))) return [String(question)];
  return String(question || '').split(/\?\s*|;\s*|\s+and\s+(?=(?:when|what|how|can|does|is|where|why)\b)/i).map(value => value.trim()).filter(Boolean);
}
