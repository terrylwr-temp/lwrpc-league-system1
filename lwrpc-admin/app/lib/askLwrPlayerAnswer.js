import { INSUFFICIENT_EVIDENCE_ANSWER } from "./aiAnswerGeneration.js";
import { officialDocumentViewerHref } from "./aiOfficialDocumentViewer.js";
import { APP_VERSION } from "./version.js";
import { clarificationFromRetrieval, createClarificationReceipt, createFeedbackReceipt, createFollowUpReceipt, resolveConversationTurn } from "./aiConversation.js";

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
  return PERSONAL_OPERATIONAL_PATTERNS.some((pattern) => pattern.test(value))
    || /\b(?:did|have|can)\s+(?:i|we)\b[\s\S]{0,50}\b(?:already\s+)?(?:submit(?:ted)?|save[ds]?|enter(?:ed)?)\b/i.test(value)
    || /\b(?:did|have|can)\b[\s\S]{0,50}\b(?:mine|ours)\b[\s\S]{0,50}\b(?:submit(?:ted)?|save[ds]?|enter(?:ed)?)\b/i.test(value);
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

export async function runPlayerOfficialAnswer({ body, role, userId, memberId = null, supabase, retrieveOfficialEvidence, generateOfficialAnswer, now = Date.now }) {
  const rawQuestion = body?.question;
  if (isUnsupportedOperationalQuestion(rawQuestion)) return { retrieval: null, conversationResolution: protectedResolution(rawQuestion, "raw_live_data_guard"), result: playerFallbackResult("protected") };

  const resolution = resolveConversationTurn({ question: rawQuestion, userId, receipt: body?.conversationReceipt, now: now() });
  if (resolution.kind === "clarification") return {
    retrieval: null, conversationResolution: resolution,
    result: clarificationResult(resolution, userId, now()),
  };
  if (isUnsupportedOperationalQuestion(resolution.effectiveQuestion)) return { retrieval: null, conversationResolution: { ...resolution, effectiveLiveDataGuard: true }, result: playerFallbackResult("protected") };

  const retrieval = await retrieveOfficialEvidence({ supabase, body: playerRetrievalBody({ ...body, question: resolution.effectiveQuestion }, role) });
  retrieval.conversationResolution = { ...resolution, rawLiveDataGuard: false, effectiveLiveDataGuard: false };
  const retrievalClarification = clarificationFromRetrieval(resolution, retrieval);
  if (retrievalClarification) return {
    retrieval, conversationResolution: retrievalClarification,
    result: clarificationResult(retrievalClarification, userId, now()),
  };
  const answer = await generateOfficialAnswer({ retrieval, supabase });
  return { retrieval, conversationResolution: retrieval.conversationResolution, result: toPlayerAnswerResult(answer, userId, {
    originalQuestion: resolution.rawQuestion, effectiveQuestion: resolution.effectiveQuestion, memberId, retrieval, now: now(),
  }) };
}

export function playerFallbackResult(kind = "insufficient_evidence") {
  return Object.freeze({ kind, answer: INSUFFICIENT_EVIDENCE_ANSWER, evidenceSufficient: false, conflict: false, sources: [], conversationReceipt: null, feedbackReceipt: null });
}

export function toPlayerAnswerResult(answer, userId, { originalQuestion = "", effectiveQuestion = "", memberId = null, retrieval = null, now = Date.now() } = {}) {
  const evidenceSufficient = answer?.evidenceSufficient === true;
  const conflict = answer?.conflict?.requiresClarification === true;
  const sources = (answer?.sources || []).map((source) => ({
    documentId: source.documentId, documentVersionId: source.documentVersionId, chunkId: source.chunkId,
    documentTitle: String(source.documentTitle || "Official LWR Pickleball Club document"),
    pageNumber: source.pageNumber || null,
    ruleNumber: String(source.ruleNumber || ""),
    sectionLabel: String(source.sectionLabel || ""),
    heading: String(source.heading || ""),
    citation: String(source.citation || source.documentTitle || "Official LWR Pickleball Club document"),
    officialDocumentUrl: officialDocumentViewerHref(source, userId),
  })).filter((source) => source.officialDocumentUrl);
  const eligibleForFeedback = evidenceSufficient && !conflict && sources.length > 0;
  const feedbackReceipt = eligibleForFeedback ? createFeedbackReceipt({
    userId, memberId, originalQuestion, effectiveQuestion, answer: answer?.answer, sources: answer?.sources || [], selectedEvidence: answer?.selectedEvidence || [], retrieval,
    assistantVersion: APP_VERSION, model: answer?.model, now,
  }) : null;
  return {
    kind: conflict ? "conflict" : evidenceSufficient ? "answer" : "insufficient_evidence",
    answer: String(answer?.answer || INSUFFICIENT_EVIDENCE_ANSWER),
    evidenceSufficient, conflict,
    sources: sources.map(({ documentId, documentVersionId, chunkId, ...source }) => source),
    conversationReceipt: evidenceSufficient ? createFollowUpReceipt(userId, effectiveQuestion || originalQuestion, { now }) : null,
    feedbackReceipt,
  };
}

function clarificationResult(resolution, userId, now) {
  return {
    kind: "clarification", answer: resolution.clarification.message, evidenceSufficient: false, conflict: false, sources: [], feedbackReceipt: null,
    conversationReceipt: createClarificationReceipt(userId, resolution.rawQuestion, resolution.clarification.category, { now }),
  };
}

function protectedResolution(rawQuestion, classification) {
  return { kind: "protected", classification, rawQuestion: String(rawQuestion || ""), effectiveQuestion: "", priorContextAvailable: false, contextSuperseded: false, rawLiveDataGuard: true, effectiveLiveDataGuard: false };
}
