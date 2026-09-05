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
  return String(candidate?.content || '').replace(/\r/g, '').split(/\n\s*\n|\n(?=\s*(?:[•]\s*|o\s+|\d+(?:\.\d+)*\.\s))/).map(text => text.trim()).filter(Boolean);
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
