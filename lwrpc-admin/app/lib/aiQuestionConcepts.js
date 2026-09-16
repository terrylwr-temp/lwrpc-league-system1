// Shared bounded concepts for interpretation, conversation and official evidence.
// This module identifies questions; it supplies no policy, URL, rating or product.
export const APPAREL_OBJECT = /\b(?:apparel|clothing|blouses?|shirts?|jerseys?|uniforms?|shorts|skirts?|dresses|jackets?|shoes|hats?)\b/i;
export function conceptText(value) {
  return String(value || '').replace(/[’‘]/g, "'").toLowerCase().replace(/\bpickleballs?(?:'s)?\b/g, 'pickleball').replace(/\s+/g, ' ').trim();
}
export function apparelQuestion(value) { return APPAREL_OBJECT.test(value); }
export function officialQuestionConcept(question) {
  const q = conceptText(question);
  const leagues = ['weekday','saturday','primetime'].filter(x => new RegExp(`\\b${x}\\b`).test(q));
  const division = /\b(?:league|division|team|dupr|weekday|saturday|primetime|players?|match|combined|total|limit|mean|format)\b/.test(q) ? q.match(/\b\d{1,2}\.\d\b/)?.[0] || null : null;
  const base = { leagues, division, question: q };
  const make = (kind, extra = {}) => ({ ...base, kind, ...extra });
  const duprEntry = /\benter(?:ed|ing|s)?\s+(?:in|into|to)\s+dupr\b/.test(q)
    && !/\b(?:how|where|players?|members?|teams?|ratings?|register|registration|account)\b/.test(q);
  if (leagues.length===1 && /\bdupr\b/.test(q) && (
    /\b(?:games?|matches|doubles|picklebreaker)\b/.test(q)
    && /\b(?:post(?:ed|ing)?|upload(?:ed|s|ing)?|submit(?:ted|s)?|record(?:ed|s)?|reported)\b/.test(q)
    || duprEntry && /\b(?:league|games?|matches|doubles|picklebreaker)\b/.test(q))
    && !/\b(?:did|have|has|already|my|our)\b/.test(q))
    return make('dupr_posting', { query: `${leagues[0]} DUPR Posting` });
  const navigation = /\b(?:where|locate|find|show|direct|need)\b/.test(q) || /^(?:(?:the|official|lwrpc|lwr|pickleball|club|lms|dupr|usa|usap)\s+)*(?:captains? guide|players? guide|rulebook|important dates)[.!?]*$/.test(q);
  const procedural = /\b(?:how|where|forgot|reset|unable|can't|cannot|log|sign)\b/.test(q);
  if (/\b(?:password|log\s*in|log into|logging|sign\s*in|sign into)\b/.test(q) && procedural) return make('account_help', { operation: /\b(?:reset|forgot|password)\b/.test(q) ? 'password' : 'login', query: /password/.test(q) ? 'reset password' : 'logging into LMS' });
  if (/\b(?:website|online)\b/.test(q) && !/\b(?:register|registration|enter|update|roster)\b/.test(q)) {
    const entity = /\blms\b|league management system/.test(q) ? 'lms' : /\bdupr\b/.test(q) ? 'dupr' : /\b(?:club|lwr|pc)\b/.test(q) ? 'club' : null;
    if (entity) return make('website', { entity, query: `${entity} website` });
  }
  if (/\bmembership\b/.test(q) && /\b(?:manage|renew|pay|payment|portal)\b/.test(q)) return make('membership_help', { query: 'club membership renewals payments profile' });
  if (apparelQuestion(q) && /\b(?:color|colour|wear|restriction|restrictions)\b/.test(q)) return make('apparel', { query: 'apparel color' });
  const nvz = /\b(?:kitchen|nvz|non[ -]volley zone)\b/.test(q);
  if (nvz) {
    const opponentClaim = /\b(?:other|opposing)\s+team\b|\bopponents?\b/.test(q)
      && /\b(?:claim(?:s|ed|ing)?|call(?:s|ed|ing)?|say(?:s|ing)?|said|insist(?:s|ed|ing)?|disagree(?:s|d|ing|ment)?)\b/.test(q);
    if (opponentClaim && /\bfault\b/.test(q)) return make('nvz_fault_call', { query: 'non-volley zone fault opponent disagreement between teams' });
    if (/\b(?:same|equivalent|define|definition|what is)\b/.test(q) || /\bis the kitchen (?:the )?non[ -]volley zone\b/.test(q)) return make('nvz_definition', { query: 'What is the non-volley zone?' });
    if (/\bline\b/.test(q) && /\b(?:part|include|inside|belong)\b/.test(q)) return make('nvz_boundary', { query: 'non-volley zone boundary lines' });
    if (/\b(?:stand|standing|be|stay)\b/.test(q) && /\b(?:not|without)\s+volley(?:ing)?\b/.test(q)) return make('nvz_presence', { query: 'non-volley zone allowable contact' });
  }
  if (/\bpicklebreakers?\b/.test(q) && /\bpartners?\b/.test(q)
    && /\b(?:switch|swap|change|changing|different|same|keep)\b/.test(q)
    && !/\b(?:ratings?|dupr|eligible|eligibility|rosters?|injur\w*|substitut\w*)\b/.test(q)) {
    return make('picklebreaker_partners', { query: 'Picklebreaker same partners as the Mixed Round' });
  }
  const mixed = /\bmixed\b/.test(q);
  if (mixed && /\b(?:additional|other than|same|only|just|gender)\b/.test(q) && /\b(?:players?|someone|participate|play|use|teams?)\b/.test(q) && !division) return make('mixed_participation', { query: 'Saturday mixed round additional players' });
  const rating = /\b(?:dupr|rating|ratings|aggregate)\b/.test(q) || (division && /\b(?:mean|total|combined|limit)\b/.test(q));
  const count = /\bhow many\b/.test(q) && /\b(?:players?|men|women|courts?)\b/.test(q) || /\b(?:need|require|required|minimum)\b.{0,24}\b(?:six|four|twelve|\d+)\s+players?\b/.test(q);
  if (count || rating && /\b(?:combined|aggregate|whole team|total|individual|limits?|mean)\b/.test(q)) {
    const operation = /\bcourts?\b/.test(q) ? 'courts' : /\broster\b/.test(q) ? 'roster' : count ? 'fielded' : /\bindividual\b/.test(q) ? 'individual_rating' : 'pair_rating';
    return make('composition', { operation, alsoRating: count && rating, query: `${leagues.join(' ')} ${division || ''} ${operation.includes('rating') ? 'Team DUPR Rating Requirements' : division ? 'Division Match Format' : 'Roster Courts'}`.trim() });
  }
  if (/\b(?:rally|picklebreaker|scoring freeze)\b/.test(q) && !/\b(?:ball|paddle|crack|break|damage)\b/.test(q)) return make('scoring', { phase: /\bpicklebreaker\b/.test(q) ? 'picklebreaker' : 'rally', query: /picklebreaker/.test(q) ? 'Picklebreaker Match Format' : `${leagues.join(' ')} ${division || ''} Rally Scoring Rules`.trim() });
  if (leagues.length && division && /\bflex league\b|\bnormally play\b|\b(?:captains?).{0,30}change.{0,30}(?:time|date)\b/.test(q)) return make('format',{operation:'schedule',query:`${leagues.join(' ')} ${division} Division Match Format`});
  if ((/\b(?:format|different)\b/.test(q) || /\b(?:what|which)\s+(?:kind|type)s?\s+of\s+games?\b|\bwhat games?\b/.test(q)) && (leagues.length || division)) return make('format', { query: division?`${leagues.join(' ')} ${division} Division Match Format`:'Match Format' });
  // A named substantive object wins over a request to find its information.
  if (navigation && !/\b(?:ball|balls|pickleball's|roster|serve|scoring|rating|dupr limit|match setup|scores?)\b/.test(q)) {
    const document = /\b(?:usap|usa pickleball)\b/.test(q) && /\b(?:rules?|rulebook)\b/.test(q) ? 'usap' : /\bimportant dates\b/.test(q) ? 'dates' : /\bcaptains?\b/.test(q) && /\bguide\b/.test(q) ? 'captain' : /\bplayers?\b/.test(q) && /\bguide\b/.test(q) ? 'player' : /\b(?:rules?|guidelines)\b/.test(q) ? 'rules' : null;
    if (document) return make('document_navigation', { document, query: null });
  }
  return null;
}

export function generalDocumentedProcedure(question) {
  const q = conceptText(question);
  return /\b(?:where|how)\s+(?:do|can)\s+i\b/.test(q) && /\b(?:enter|submit|verify|update|manage|change|reset|sign|log)\b/.test(q) && /\b(?:scores?|roster|password|membership|lms)\b/.test(q);
}
