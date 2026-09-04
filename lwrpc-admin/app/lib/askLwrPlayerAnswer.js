import { INSUFFICIENT_EVIDENCE_ANSWER } from "./aiAnswerGeneration.js";

const PERSONAL_OPERATIONAL_PATTERNS = [
  /\b(?:what|which|who|when|where)\b[\s\S]{0,80}\b(?:my|our|i|we)\b[\s\S]{0,80}\b(?:team|roster|standing|place|match|score|season\s+dupr|court)\b/i,
  /\b(?:who\s+do\s+we\s+play|our\s+next\s+match|my\s+(?:next|last)\s+match|my\s+season\s+dupr|my\s+roster|my\s+team(?:'s)?\s+(?:place|standing|record))\b/i,
  /\b(?:how\s+many\s+matches\s+have\s+we\s+won|what\s+was\s+our\s+last\s+score)\b/i,
];

export function isUnsupportedOperationalQuestion(question) {
  const value = String(question || "").replace(/\s+/g, " ").trim();
  return PERSONAL_OPERATIONAL_PATTERNS.some((pattern) => pattern.test(value));
}

export function playerFallbackResult() {
  return Object.freeze({ answer: INSUFFICIENT_EVIDENCE_ANSWER, evidenceSufficient: false, conflict: false, sources: [] });
}

export function toPlayerAnswerResult(answer) {
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
      officialDocumentUrl: String(source.officialDocumentUrl || ""),
    })).filter((source) => source.officialDocumentUrl),
  };
}
