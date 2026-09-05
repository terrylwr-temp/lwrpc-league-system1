import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID } from "node:crypto";

const RECEIPT_VERSION = 1;
const CONTEXT_TTL_MS = 20 * 60 * 1000;
const FEEDBACK_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_QUESTION_LENGTH = 1000;
const MAX_RECEIPT_LENGTH = 30000;

export const CLARIFICATION_COLOR = "color_subject";
export const COLOR_CLARIFICATION = "What are you asking about—the ball, paddle, clothing, or something else?";

export function createFollowUpReceipt(userId, effectiveQuestion, { now = Date.now() } = {}) {
  return sealReceipt({ sub: requiredUserId(userId), purpose: "follow_up", effectiveQuestion: cleanQuestion(effectiveQuestion), exp: now + CONTEXT_TTL_MS });
}

export function createClarificationReceipt(userId, originalQuestion, category, { now = Date.now() } = {}) {
  return sealReceipt({ sub: requiredUserId(userId), purpose: "clarification", originalQuestion: cleanQuestion(originalQuestion), category: cleanCategory(category), exp: now + CONTEXT_TTL_MS });
}

export function readConversationReceipt(receipt, userId, { now = Date.now() } = {}) {
  const claims = openReceipt(receipt);
  if (claims.sub !== requiredUserId(userId) || claims.exp <= now || !["follow_up", "clarification"].includes(claims.purpose)) throw new Error("This conversation context has expired. Please ask the full question again.");
  if (claims.purpose === "follow_up" && !cleanQuestion(claims.effectiveQuestion)) throw new Error("This conversation context is invalid.");
  if (claims.purpose === "clarification" && (!cleanQuestion(claims.originalQuestion) || !cleanCategory(claims.category))) throw new Error("This conversation context is invalid.");
  return claims;
}

export function resolveConversationTurn({ question, userId, receipt, now = Date.now() } = {}) {
  const rawQuestion = cleanQuestion(question);
  let prior = null;
  let receiptError = null;
  if (receipt) {
    try { prior = readConversationReceipt(receipt, userId, { now }); } catch (error) { receiptError = error; }
  }
  const diagnostics = { priorContextPurpose: prior?.purpose || null, receiptValidation: receipt ? (prior ? "valid" : "invalid_or_expired") : "absent", clarificationConsumed: false };

  if (isCompleteStandaloneQuestion(rawQuestion)) {
    return {
      ...diagnostics, kind: "resolved", classification: prior ? "standalone_supersedes_context" : "standalone", rawQuestion, effectiveQuestion: rawQuestion,
      priorContextAvailable: Boolean(prior), contextSuperseded: Boolean(prior), clarification: null,
    };
  }

  if (prior?.purpose === "clarification") {
    const subject = clarificationSubject(rawQuestion);
    if (subject && prior.category === CLARIFICATION_COLOR && requiresColorSubjectClarification(prior.originalQuestion)) return {
      ...diagnostics, clarificationConsumed: true,
      kind: "resolved", classification: "clarification_response", rawQuestion, effectiveQuestion: clarifiedQuestion(prior.originalQuestion, prior.category, subject),
      priorContextAvailable: true, contextSuperseded: false, clarification: null,
    };
  }

  if (requiresColorSubjectClarification(rawQuestion)) return { ...diagnostics, ...clarificationResolution(rawQuestion, CLARIFICATION_COLOR, "missing_color_subject", Boolean(prior)), contextSuperseded: Boolean(prior) };

  if (prior?.purpose === "follow_up" && isContextualFollowUp(rawQuestion)) {
    return {
      ...diagnostics, kind: "resolved", classification: "follow_up", rawQuestion, effectiveQuestion: composeFollowUp(prior.effectiveQuestion, rawQuestion),
      priorContextAvailable: true, contextSuperseded: false, clarification: null,
    };
  }

  if ((receiptError || prior?.purpose === "clarification") && isContextualFollowUp(rawQuestion)) {
    return {
      ...diagnostics, kind: "clarification", classification: receiptError ? "expired_context" : "unresolved_follow_up", rawQuestion, effectiveQuestion: "", priorContextAvailable: Boolean(prior), contextSuperseded: Boolean(prior),
      clarification: { category: "full_question", message: "Please ask the full question again so I can check the official rules." },
    };
  }

  return {
    ...diagnostics, kind: "resolved", classification: "standalone_fragment", rawQuestion, effectiveQuestion: rawQuestion,
    priorContextAvailable: Boolean(prior), contextSuperseded: Boolean(prior), clarification: null,
  };
}

// This post-retrieval check deliberately inspects only query completeness and
// the presence of active candidates. It never turns candidates into an answer.
export function clarificationFromRetrieval(resolution, retrieval) {
  if (resolution?.kind !== "resolved" || !requiresColorSubjectClarification(resolution.effectiveQuestion)) return null;
  const hasCandidates = Array.isArray(retrieval?.candidates) && retrieval.candidates.length > 0;
  return { ...resolution, ...clarificationResolution(resolution.rawQuestion, CLARIFICATION_COLOR, hasCandidates ? "missing_color_subject_with_active_candidates" : "missing_color_subject", resolution.priorContextAvailable), clarificationQuestion: resolution.effectiveQuestion };
}

export function createFeedbackReceipt({ userId, memberId = null, originalQuestion, effectiveQuestion, answer, sources = [], selectedEvidence = [], retrieval, assistantVersion, model, now = Date.now() } = {}) {
  const answerId = randomUUID();
  return sealReceipt({
    sub: requiredUserId(userId), purpose: "feedback", exp: now + FEEDBACK_TTL_MS, answerId, memberId: cleanId(memberId),
    originalQuestion: cleanQuestion(originalQuestion), effectiveQuestion: cleanQuestion(effectiveQuestion), answer: String(answer || "").trim().slice(0, 6000),
    sources: safeSources(sources), selectedEvidence: safeEvidence(selectedEvidence),
    retrieval: safeRetrievalSnapshot(retrieval), assistantVersion: String(assistantVersion || "").slice(0, 80), model: String(model || "").slice(0, 120),
  });
}

export function readFeedbackReceipt(receipt, userId, { now = Date.now() } = {}) {
  const claims = openReceipt(receipt);
  if (claims.sub !== requiredUserId(userId)) throw new Error("This feedback link has expired. Please ask the question again if you would still like to provide feedback.");
  if (claims.purpose !== "feedback") throw new Error("This feedback link has expired. Please ask the question again if you would still like to provide feedback.");
  if (claims.exp <= now) throw new Error("This feedback link has expired. Please ask the question again if you would still like to provide feedback.");
  if (!validUuid(claims.answerId)) throw new Error("This feedback link has expired. Please ask the question again if you would still like to provide feedback.");
  if (!cleanQuestion(claims.originalQuestion) || !cleanQuestion(claims.effectiveQuestion) || !String(claims.answer || "").trim()) throw new Error("This feedback link is invalid.");
  return claims;
}

export function feedbackTransition(previousHelpful, nextHelpful) {
  return typeof previousHelpful !== "boolean" || previousHelpful !== nextHelpful;
}

function clarificationResolution(originalQuestion, category, reason, priorContextAvailable) {
  return {
    kind: "clarification", classification: "clarification_required", rawQuestion: cleanQuestion(originalQuestion), effectiveQuestion: "", priorContextAvailable,
    contextSuperseded: false, clarification: { category, reason, message: category === CLARIFICATION_COLOR ? COLOR_CLARIFICATION : "Please clarify what you mean." },
  };
}

function composeFollowUp(priorQuestion, followUp) {
  const prior = cleanQuestion(priorQuestion);
  const current = cleanQuestion(followUp);
  if (/^what\s+about\b/i.test(current)) return `Regarding ${prior.replace(/[?!.]+$/, "")}, ${current}`;
  if (/^does\s+that\b/i.test(current)) return `${current.replace(/^does\s+that\b/i, "Does the prior official-rule topic")} (${prior})`;
  return `Regarding ${prior.replace(/[?!.]+$/, "")}, ${current}`;
}

function requiresColorSubjectClarification(question) {
  const value = String(question || "").toLowerCase();
  return /\bcolou?r\b/.test(value)
    && /\b(?:considerations?|requirements?|rules?|restrictions?|matter)\b/.test(value)
    && !/\b(?:ball|pickleball|paddle|clothing|apparel|shirt|jersey|court|surface|uniform|shoes|hat)\b/.test(value);
}

function clarificationSubject(question) {
  const value = cleanQuestion(question).replace(/[?.!]+$/, "").trim();
  // A bounded noun fragment, including natural multiword answers, not a word-count
  // shortcut that would consume a new independent question as a subject.
  return /^(?:(?:the|a|an|my|our)\s+)?(?:(?:indoor|outdoor|pickleball|playing|court|team|uniform|paddle)\s+){0,3}(?:ball|paddle|clothing|apparel|shirt|jersey|court|surface|uniform|shoes|hat)(?:\s+colou?r)?$/i.test(value) ? value : "";
}

function clarifiedQuestion(originalQuestion, category, subject) {
  const base = cleanQuestion(originalQuestion).replace(/[?.!]+$/, "");
  if (category === CLARIFICATION_COLOR) return `${base} for ${subject}?`;
  return `${base}: ${subject}`;
}

function isContextualFollowUp(question) {
  const value = cleanQuestion(question).toLowerCase();
  return /^(?:what\s+about|what\s+if|does\s+that|and\s+what|and\s+does)\b/.test(value)
    || /\b(?:that|it|mine|ours)\b/.test(value) && value.split(/\s+/).length <= 12;
}

function isCompleteStandaloneQuestion(question) {
  const value = cleanQuestion(question);
  if (!value) return false;
  if (requiresColorSubjectClarification(value) || clarificationSubject(value) || isContextualFollowUp(value)) return false;
  return value.split(/\s+/).length >= 3 || /[?]$/.test(value);
}

function safeSources(sources) {
  return (sources || []).slice(0, 4).map((source) => ({
    documentId: cleanId(source?.documentId), documentVersionId: cleanId(source?.documentVersionId), chunkId: cleanId(source?.chunkId),
    documentTitle: String(source?.documentTitle || "").slice(0, 300), pageNumber: positiveNumber(source?.pageNumber), ruleNumber: String(source?.ruleNumber || "").slice(0, 120),
    sectionLabel: String(source?.sectionLabel || "").slice(0, 300), heading: String(source?.heading || "").slice(0, 300), citation: String(source?.citation || "").slice(0, 600),
  }));
}

function safeEvidence(evidence) {
  return (evidence || []).slice(0, 4).map((item) => ({
    documentId: cleanId(item?.documentId), documentVersionId: cleanId(item?.documentVersionId), chunkId: cleanId(item?.chunkId), ruleNumber: String(item?.ruleNumber || "").slice(0, 120),
    pageNumber: positiveNumber(item?.pageNumber), sourceClassification: String(item?.sourceClassification || "").slice(0, 80), evidenceRole: String(item?.evidenceRole || "").slice(0, 160),
    evidenceSelectionReason: String(item?.evidenceSelectionReason || "").slice(0, 500),
  }));
}

function safeRetrievalSnapshot(retrieval) {
  return {
    threshold: number(retrieval?.environment?.evidenceThreshold), retrievalLimit: positiveNumber(retrieval?.environment?.retrievalLimit), authorityReviewLimit: positiveNumber(retrieval?.environment?.authorityReviewLimit),
    embeddingModel: String(retrieval?.environment?.embeddingModel || "").slice(0, 120), resolver: retrieval?.conversationResolution ? {
      classification: String(retrieval.conversationResolution.classification || "").slice(0, 120), priorContextAvailable: Boolean(retrieval.conversationResolution.priorContextAvailable), contextSuperseded: Boolean(retrieval.conversationResolution.contextSuperseded),
    } : null,
  };
}

function sealReceipt(claims) {
  const payload = Buffer.from(JSON.stringify({ v: RECEIPT_VERSION, ...claims }));
  const iv = randomBytes(12); const cipher = createCipheriv("aes-256-gcm", receiptKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(payload), cipher.final()]);
  return [iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), ciphertext.toString("base64url")].join(".");
}

function openReceipt(receipt) {
  const parts = String(receipt || "").split(".");
  if (String(receipt || "").length > MAX_RECEIPT_LENGTH || parts.length !== 3 || parts.some((part) => !part)) throw new Error("This receipt is invalid.");
  try {
    const [iv, tag, ciphertext] = parts.map((part) => Buffer.from(part, "base64url"));
    const decipher = createDecipheriv("aes-256-gcm", receiptKey(), iv); decipher.setAuthTag(tag);
    const claims = JSON.parse(Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8"));
    if (claims?.v !== RECEIPT_VERSION || !Number.isFinite(claims.exp)) throw new Error("invalid_claims");
    return claims;
  } catch { throw new Error("This receipt is invalid."); }
}

function receiptKey() {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE || process.env.SERVICE_ROLE_KEY;
  if (!secret) throw new Error("Supabase server credentials are not configured.");
  return createHash("sha256").update("lwr-ai-stage6-receipt:v1:").update(secret).digest();
}
function cleanQuestion(value) { return String(value || "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, MAX_QUESTION_LENGTH); }
function cleanCategory(value) { return String(value || "").replace(/[^a-z0-9_-]/gi, "").slice(0, 80); }
function requiredUserId(value) { const id = String(value || "").trim(); if (!id) throw new Error("A signed-in user is required."); return id; }
function cleanId(value) { const id = String(value || "").trim(); return validUuid(id) ? id : null; }
function validUuid(value) { return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || "")); }
function positiveNumber(value) { const parsed = Number(value); return Number.isFinite(parsed) && parsed > 0 ? parsed : null; }
function number(value) { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : null; }
