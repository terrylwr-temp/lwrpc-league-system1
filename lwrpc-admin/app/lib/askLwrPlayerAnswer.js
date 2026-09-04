import { INSUFFICIENT_EVIDENCE_ANSWER } from "./aiAnswerGeneration.js";
import { officialDocumentViewerHref } from "./aiOfficialDocumentViewer.js";

const PERSONAL_OPERATIONAL_PATTERNS = [
  /\b(?:what|which|who|when|where)\b[\s\S]{0,80}\b(?:my|our|i|we)\b[\s\S]{0,80}\b(?:team|roster|lineup|standing|place|match|score|season\s+dupr|court)\b/i,
  /\b(?:who\s+do\s+we\s+play|our\s+next\s+match|my\s+(?:next|last)\s+match|my\s+season\s+dupr|my\s+roster|my\s+team(?:'s)?\s+(?:place|standing|record))\b/i,
  /\bwhat\s+place\s+(?:are|is)\s+(?:we|i)\b/i,
  /\b(?:how\s+many\s+matches\s+have\s+we\s+won|what\s+was\s+our\s+last\s+score)\b/i,
];

export function isUnsupportedOperationalQuestion(question) {
  const value = String(question || "").replace(/\s+/g, " ").trim();
  // A member can naturally use “my lineup” while asking for an official
  // deadline or how-to. That is document guidance, not a request for their
  // live lineup data, and must reach the existing evidence-gated RAG path.
  if (isOfficialConfigurationGuidance(value) || isOfficialTeamRosterGuidance(value)) return false;
  return PERSONAL_OPERATIONAL_PATTERNS.some((pattern) => pattern.test(value));
}

function isOfficialConfigurationGuidance(value) {
  return /\b(?:lineups?|rosters?|pairings?)\b/i.test(value)
    && /\b(?:when|deadline|due|how|enter|submit|set|save|complete|change|assign)\b/i.test(value);
}

function isOfficialTeamRosterGuidance(value) {
  const membershipOperation = /\b(?:add|remove|delete|drop|update|change|changing|lock|open|close)\b/i.test(value);
  const member = /\b(?:player|players|person|someone|member|members|roster)\b/i.test(value);
  const teamContext = /\b(?:team|league|season)\b/i.test(value);
  const timing = /\b(?:when|deadline|due|date|dates|open|close|lock)\b/i.test(value);
  const matchSpecific = /\b(?:match|game|lineup|pairings?|match\s+setup|tomorrow)\b/i.test(value);
  return membershipOperation && member && teamContext && timing && !matchSpecific;
}

export function playerRetrievalBody(body = {}, role = "player") {
  const context = body?.context && typeof body.context === "object" ? body.context : {};
  return {
    question: body.question,
    askAbout: "all",
    // Current-page fields only boost relevance. Scope IDs are deliberately not
    // trusted from the browser, and the authenticated role is authoritative.
    context: { currentPath: context.currentPath, featureModule: context.featureModule, userRole: role },
  };
}

export async function runPlayerOfficialAnswer({ body, role, userId, supabase, retrieveOfficialEvidence, generateOfficialAnswer }) {
  if (isUnsupportedOperationalQuestion(body?.question)) return { retrieval: null, result: playerFallbackResult() };
  const retrieval = await retrieveOfficialEvidence({ supabase, body: playerRetrievalBody(body, role) });
  const answer = await generateOfficialAnswer({ retrieval, supabase });
  return { retrieval, result: toPlayerAnswerResult(answer, userId) };
}

export function playerFallbackResult() {
  return Object.freeze({ answer: INSUFFICIENT_EVIDENCE_ANSWER, evidenceSufficient: false, conflict: false, sources: [] });
}

export function toPlayerAnswerResult(answer, userId) {
  return {
    answer: String(answer?.answer || INSUFFICIENT_EVIDENCE_ANSWER),
    evidenceSufficient: answer?.evidenceSufficient === true,
    conflict: answer?.conflict?.requiresClarification === true,
    sources: (answer?.sources || []).map((source) => ({
      documentTitle: String(source.documentTitle || "Official LWR Pickleball Club document"),
      pageNumber: source.pageNumber || null,
      ruleNumber: String(source.ruleNumber || ""),
      sectionLabel: String(source.sectionLabel || ""),
      heading: String(source.heading || ""),
      citation: String(source.citation || source.documentTitle || "Official LWR Pickleball Club document"),
      officialDocumentUrl: officialDocumentViewerHref(source, userId),
    })).filter((source) => source.officialDocumentUrl),
  };
}
