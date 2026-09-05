import { isRosterTroubleshooting } from "./aiRosterTroubleshooting.js";
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
  const value = String(question || "").replace(/[’‘]/g, "'").replace(/\s+/g, " ").trim();
  // Completed personal actions and rating values take precedence over how-to exemptions.
  const owned = /\b(?:my|our|mine|ours)\b/i.test(value);
  const ratingValue = owned && /\b(?:dupr|rating)\b/i.test(value)
    && /\b(?:what(?:'s| is)|tell|know|show|check)\b/i.test(value)
    && !/\b(?:how|determined|calculated|rule|requirements?|allowed|range)\b/i.test(value);
  const completedAction = /\b(?:did|have|has)\s+(?:i|we)\b[\s\S]{0,70}\b(?:submit(?:ted)?|save[ds]?|enter(?:ed)?)\b/i.test(value);
  const personalSchedule = /\bwho\s+(?:am\s+i\s+playing|do\s+we\s+play)\b/i.test(value)
    || /\bmy\s+next\s+(?:opponent|match)\b/i.test(value)
    || /\bwhere\s+do\s+i\s+play\s+next\b/i.test(value);
  if (ratingValue || completedAction || personalSchedule) return true;
  if (isOfficialConfigurationGuidance(value) || isOfficialTeamRosterGuidance(value) || isRosterTroubleshooting(value)) return false;
  return PERSONAL_OPERATIONAL_PATTERNS.some((pattern) => pattern.test(value))
    || /\b(?:did|have|can)\s+(?:i|we)\b[\s\S]{0,50}\b(?:already\s+)?(?:submit(?:ted)?|save[ds]?|enter(?:ed)?)\b/i.test(value)
    || /\b(?:did|have|can)\b[\s\S]{0,50}\b(?:mine|ours)\b[\s\S]{0,50}\b(?:submit(?:ted)?|save[ds]?|enter(?:ed)?)\b/i.test(value)
    || /\b(?:show|list)\b[\s\S]{0,40}\b(?:my|our)\s+(?:roster|team)\b/i.test(value);

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

export async function runPlayerOfficialAnswer({ body, role, userId, memberId = null, supabase, retrieveOfficialEvidence, generateOfficialAnswer, now = Date.now, answerId }) {
  const rawQuestion = body?.question;
  const resolution = resolveOfficialConversation({ question: rawQuestion, userId, receipt: body?.conversationReceipt, now: now() });
  if (resolution.kind === "protected") return { retrieval: null, conversationResolution: resolution, result: playerFallbackResult("protected") };
  if (resolution.kind === "clarification") return {
    retrieval: null, conversationResolution: resolution,
    result: clarificationResult(resolution, userId, now()),
  };

  const retrieval = await retrieveOfficialEvidence({ supabase, body: playerRetrievalBody({ ...body, question: resolution.effectiveQuestion }, role) });
  retrieval.conversationResolution = { ...resolution, rawLiveDataGuard: false, effectiveLiveDataGuard: false };
  const retrievalClarification = clarificationFromRetrieval(resolution, retrieval);
  if (retrievalClarification) return {
    retrieval, conversationResolution: retrievalClarification,
    result: clarificationResult(retrievalClarification, userId, now()),
  };
  const answer = await generateOfficialAnswer({ retrieval, supabase });
  return { answer, retrieval, conversationResolution: retrieval.conversationResolution, result: toPlayerAnswerResult(answer, userId, {
    originalQuestion: resolution.rawQuestion, effectiveQuestion: resolution.effectiveQuestion, memberId, retrieval, now: now(), answerId,
  }) };
}

export function resolveOfficialConversation(args) {
  if (isUnsupportedOperationalQuestion(args.question)) return { ...protectedResolution(args.question, "raw_live_data_guard"), receiptSupplied: Boolean(args.receipt) };
  const resolution = resolveConversationTurn(args);
  const effectiveLiveDataGuard = resolution.kind === "resolved" ? isUnsupportedOperationalQuestion(resolution.effectiveQuestion) : null;
  return { ...resolution, receiptSupplied: Boolean(args.receipt), rawLiveDataGuard: false, effectiveLiveDataGuard, ...(effectiveLiveDataGuard ? { kind: "protected" } : {}) };
}

export function playerFallbackResult(kind = "insufficient_evidence") {
  return Object.freeze({ kind, answer: INSUFFICIENT_EVIDENCE_ANSWER, evidenceSufficient: false, conflict: false, sources: [], conversationReceipt: null, feedbackReceipt: null });
}

export function toPlayerAnswerResult(answer, userId, { originalQuestion = "", effectiveQuestion = "", memberId = null, retrieval = null, now = Date.now(), answerId } = {}) {
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
    assistantVersion: APP_VERSION, model: answer?.model, now, answerId,
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
    conversationReceipt: ["color_subject", "player_entry_object"].includes(resolution.clarification.category) ? createClarificationReceipt(userId, resolution.clarificationQuestion || resolution.rawQuestion, resolution.clarification.category, { now }) : null,
  };
}

function protectedResolution(rawQuestion, classification) {
  return { kind: "protected", classification, rawQuestion: String(rawQuestion || ""), effectiveQuestion: "", priorContextAvailable: false, priorContextPurpose: null, receiptValidation: "not_checked_raw_guard", clarificationConsumed: false, contextSuperseded: false, rawLiveDataGuard: true, effectiveLiveDataGuard: null };
}
