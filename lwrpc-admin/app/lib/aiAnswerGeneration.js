import { aiAssistantConfig } from "./aiAssistantConfig.js";
import { governingSourceClass, INSUFFICIENT_EVIDENCE_ANSWER, selectGoverningEvidence } from "./aiGoverningSources.js";

export { INSUFFICIENT_EVIDENCE_ANSWER };
export const CONFLICT_ANSWER = "The supplied official LWR Pickleball Club sources appear to conflict on this point. Please contact League Management for clarification.";

const MAX_SELECTED_CHUNKS = 4;
const DIRECT_RELEVANCE_DELTA = .10;

export class OfficialAnswerModelError extends Error {
  constructor(category, message, details = {}) {
    super(message);
    this.name = "OfficialAnswerModelError";
    this.category = category;
    this.safeDiagnostic = { category, label: diagnosticLabel(category), ...details };
  }
}

export function answerGenerationDiagnostic(error) {
  return error instanceof OfficialAnswerModelError
    ? error.safeDiagnostic
    : { category: "server_failure", label: "Server-side answer generation failure" };
}

export function selectAnswerEvidence(retrieval) {
  if (!retrieval?.evidence?.sufficient) return [];
  const authorityReviewCandidates = Array.isArray(retrieval.authorityReviewCandidates) && retrieval.authorityReviewCandidates.length
    ? retrieval.authorityReviewCandidates
    : retrieval.suppliedEvidence;
  if (authorityReviewCandidates?.some((candidate) => candidate.documentType === "usap_rulebook")) {
    // The review set is bounded before this point. It is used only to decide
    // applicability and authority; the selected evidence sent to GPT remains
    // capped by MAX_SELECTED_CHUNKS.
    return selectGoverningEvidence({ ...retrieval, suppliedEvidence: authorityReviewCandidates }, { detectIntents: detectedEvidenceIntents, intentSupport, selectLocal: selectLwrAnswerEvidence, limit: MAX_SELECTED_CHUNKS });
  }
  return selectLwrAnswerEvidence(retrieval);
}

function selectLwrAnswerEvidence(retrieval) {
  if (!retrieval?.evidence?.sufficient) return [];
  const candidates = Array.isArray(retrieval.suppliedEvidence) ? retrieval.suppliedEvidence : [];
  const primary = candidates[0];
  if (!primary) return [];
  const cutoff = Math.max(Number(retrieval.evidence.threshold) || aiAssistantConfig.evidenceThreshold, Number(primary.combinedScore) - DIRECT_RELEVANCE_DELTA);
  const intents = detectedEvidenceIntents(retrieval.request?.question);
  const selected = [primary, ...candidates.slice(1).filter((candidate) => (
    Number(candidate.combinedScore) >= cutoff
    && hasDirectRelevance(candidate)
    && materiallyContributes(candidate, primary, retrieval.request?.question)
  ))];
  if (!intents.length) return classifyAnswerEvidence(selected.slice(0, MAX_SELECTED_CHUNKS), retrieval.request?.question);

  // A compound question needs direct evidence for each independently detected
  // official concept.  Intent evidence is evaluated within a paragraph/list
  // item, then the strongest direct passage for each intent is reserved before
  // optional support can consume the bounded evidence budget.
  const requiredIntentEvidence = intents.map((intent) => ({ intent, candidate: bestIntentEvidence(candidates, intent, retrieval.request?.question) })).filter(({ candidate }) => candidate);
  const bestIntentByChunkId = new Map();
  for (const { intent, candidate } of requiredIntentEvidence) {
    const existing = bestIntentByChunkId.get(candidate.chunkId) || [];
    bestIntentByChunkId.set(candidate.chunkId, [...existing, intent]);
  }
  const requiredCandidates = requiredIntentEvidence.map(({ candidate }) => candidate);
  const selectedForModel = [...requiredCandidates, ...selected.filter((candidate) => (
    requiredCandidates.some((required) => required.chunkId === candidate.chunkId)
    || (questionRequestsProcedure(retrieval.request?.question) && supportsAnyEvidenceIntent(candidate, intents, retrieval.request?.question) && materiallyContributes(candidate, primary, retrieval.request?.question))
    || isMoreAuthoritativeThanRequired(candidate, requiredCandidates, intents, retrieval.request?.question)
  ))]
    .filter((candidate, index, collection) => collection.findIndex((item) => item.chunkId === candidate.chunkId) === index)
    .filter((candidate) => supportsAnyEvidenceIntent(candidate, intents, retrieval.request?.question));
  return classifyAnswerEvidence(selectedForModel.slice(0, MAX_SELECTED_CHUNKS), retrieval.request?.question, bestIntentByChunkId);
}

function detectedEvidenceIntents(question) {
  const value = String(question || "").toLowerCase();
  const roster = /\b(?:add|remove|delete|drop|update|change|lock|open|close)\b/.test(value) && /\b(?:player|players|person|someone|member|members|roster|team)\b/.test(value) && /\b(?:team|league|season|roster)\b/.test(value);
  // This selector intent is intentionally narrower than a general reference to
  // a match or game.  It governs Match Setup evidence only; injury, conduct,
  // scoring, and other match questions retain the normal Stage 4 selection.
  const match = /\b(?:lineup|pairings?|match\s+setup)\b/.test(value);
  return [roster && "Team/season roster management", match && "Individual-match Match Setup"].filter(Boolean);
}

function bestIntentEvidence(candidates, intent, question) {
  return candidates
    .map((candidate, index) => ({ candidate, index, support: intentSupport(candidate, intent, question) }))
    .filter(({ support }) => support)
    .sort((left, right) => right.support.strength - left.support.strength || authorityRank(left.candidate) - authorityRank(right.candidate) || Number(right.candidate.combinedScore) - Number(left.candidate.combinedScore) || left.index - right.index)[0]?.candidate;
}

function isMoreAuthoritativeThanRequired(candidate, required, intents, question) {
  return required.some((selected) => supportsAnyEvidenceIntent(candidate, intents, question) && isMoreAuthoritative(candidate, selected));
}

function supportsEvidenceIntent(candidate, intent, question = "") { return Boolean(intentSupport(candidate, intent, question)); }

function intentSupport(candidate, intent, question) {
  const asksTiming = asksForTiming(question);
  const structural = [candidate?.sectionLabel, candidate?.heading].filter(Boolean).join(" ").toLowerCase();
  for (const passage of localEvidencePassages(candidate)) {
    if (intent === "Team/season roster management") {
      if (isMatchSpecificPassage(passage)) continue;
      const rosterOperation = /\b(?:update|updating)\s+(?:your\s+|team\s+)?rosters?\b/.test(passage)
        || /\b(?:add|remove|delete|drop)\b[^.\n]{0,70}\bplayers?\b/.test(passage)
        || /\b(?:team|season)\s+roster\b[^.\n]{0,70}\b(?:add|remove|delete|drop|update|change|open|close|lock)\b/.test(passage)
        || /\b(?:add|remove|delete|drop|update|change)\b[^.\n]{0,70}\b(?:team|season)\s+roster\b/.test(passage);
      if (!rosterOperation) continue;
      const calendarDate = /\b(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\.?\s+\d{1,2}\b/.test(passage);
      const timing = calendarDate || /\b(?:date|deadline|open|close|lock|throughout\s+the\s+season|prior\s+to\s+(?:the\s+)?(?:commencement|start)\s+of\s+(?:each\s+)?season)\b/.test(passage);
      return { intent, strength: calendarDate ? 120 : asksTiming && timing ? 100 : 75, reason: calendarDate ? "Direct roster calendar/timing passage" : timing ? "Direct roster timing passage" : "Direct team roster-management passage" };
    }
    if (intent === "Individual-match Match Setup") {
      if (/\b(?:enter|verify|submit(?:ting)?)\s+(?:match\s+)?scores?|score\s+(?:entry|verification)|forfeit|weather\b/.test(structural)) continue;
      const configuration = /\bmatch\s+setup\b|\b(?:lineups?|player\s+pairings?|upcoming\s+match\s+rosters?)\b/.test(passage);
      if (!configuration || /\b(?:enter|verify|submit(?:ting)?)\s+(?:match\s+)?scores?\b/.test(passage)) continue;
      const deadline = /\b(?:no\s+later\s+than|within)\b[^.\n]{0,70}\b(?:three|3|days?|hours?|weeks?)\b/.test(passage)
        || /\b(?:must|shall)\s+submit\b[^.\n]{0,100}\b(?:match\s+setup|lineups?|rosters?)\b/.test(passage);
      const timing = deadline || /\b(?:before|prior\s+to)\b[^.\n]{0,70}\b(?:match\s+date|match\s+day|scheduled\s+match)\b/.test(passage);
      const procedure = /\b(?:click|save|button|screen|complete)\b/.test(passage);
      if (!timing && !procedure) continue;
      return { intent, strength: deadline ? 120 : questionRequestsProcedure(question) && procedure ? 115 : timing ? 95 : 75, reason: deadline ? "Direct Match Setup deadline passage" : timing ? "Direct Match Setup timing passage" : "Direct Match Setup procedure passage" };
    }
  }
  return null;
}

function supportsAnyEvidenceIntent(candidate, intents, question = "") { return intents.some((intent) => supportsEvidenceIntent(candidate, intent, question)); }

function localEvidencePassages(candidate) {
  const structural = [candidate?.sectionLabel, candidate?.heading].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
  const blocks = String(candidate?.content || "").replace(/\r/g, "").split(/\n(?=\s*(?:[•]\s*|o\s+|\d+(?:\.\d+)*\.\s))/);
  return blocks.map((block) => `${structural}\n${block}`.replace(/\s+/g, " ").trim().toLowerCase()).filter(Boolean);
}

function isMatchSpecificPassage(passage) { return /\b(?:match\s+setup|upcoming\s+match|match\s+rosters?|match\s+lineups?|player\s+pairings?)\b/.test(passage); }
function asksForTiming(question) { return /\b(?:when|deadline|due|date|open|close|lock|start)\b/i.test(String(question || "")); }

export async function generateOfficialAnswer({ retrieval, supabase, fetchImpl = fetch, clock = performance.now.bind(performance), resolveSources = resolveOfficialSources }) {
  const started = clock();
  if (!retrieval?.evidence?.sufficient) return skippedAnswer(retrieval, clock, started);

  const selectedEvidence = selectAnswerEvidence(retrieval);
  annotateEvidenceSelection(retrieval, selectedEvidence);
  if (selectedEvidence.length === 0) return skippedAnswer(retrieval, clock, started);
  const sourcesStarted = clock();
  const sources = await resolveSources(supabase, selectedEvidence);
  const sourceResolutionMs = Math.round(clock() - sourcesStarted);
  validateTrustedSources(selectedEvidence, sources);

  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured on the server.");
  const generationStarted = clock();
  let response;
  try {
    response = await fetchImpl("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: JSON.stringify({
      model: aiAssistantConfig.chatModel,
      reasoning: { effort: "low" },
      max_output_tokens: aiAssistantConfig.maxOutputTokens,
      store: false,
      text: {
        verbosity: "low",
        format: {
          type: "json_schema",
          name: "official_lwr_answer",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            required: ["answer", "conflict"],
            properties: { answer: { type: "string" }, conflict: { type: "boolean" } },
          },
        },
      },
      instructions: [
        "You are the official Lakewood Ranch Pickleball Club AI Assistant.",
        "Answer the user's question using ONLY the uploaded official LWR Pickleball Club or USA Pickleball evidence supplied with this request.",
        "Do not use general pickleball knowledge, outside rules, internet knowledge, prior model knowledge, or assumptions.",
        "You may summarize and simplify supplied evidence, but may not invent, extend, reinterpret, or change an official rule.",
        "Preserve exact numbers, dates, deadlines, scores, ratings, requirements, and equipment names from the evidence.",
        "Answer the question directly first, in plain language. Keep it concise; use bullets only when they make multiple required steps or outcomes clearer. Do not summarize every supplied chunk.",
        "When direct evidence prohibits the action as the user describes it, begin with the negative result; when it permits the action, begin with the affirmative result. Do not begin affirmatively when the supplied rule prohibits the described conduct.",
        "Determine authority separately for each supported question intent. Direct applicability comes before authority rank. lwr_controlling rules modify the corresponding USAP rule only for the same specifically addressed issue. usap_governing_fallback governs its supported issue when no directly applicable LWR rule modifies it. Never apply a rank globally across unrelated issues. lwr_supporting_guide may explain procedure but cannot independently override a governing playing rule. Supporting guidance may explain procedure but must never override, weaken, or reinterpret controlling rule evidence. Do not blend an overridden USAP outcome into an LWR rule for league play.",
        "Do not add citations, sources, links, or source labels; the server attaches verified citations. If evidence does not support all of the question, say so without guessing. If supplied sources materially conflict on the requested point, set conflict to true and do not give a definitive answer. Do not treat complementary detail as a conflict.",
      ].join(" "),
      input: [{ role: "user", content: answerPrompt(retrieval.request.question, selectedEvidence) }],
      }),
    });
  } catch {
    throw new OfficialAnswerModelError("api_request_failure", "The answer model request could not be completed.");
  }
  let result;
  try {
    result = await response.json();
  } catch {
    if (!response.ok) throw new OfficialAnswerModelError("api_request_failure", "The answer model could not generate an official-document answer.", { httpStatus: Number(response.status) || null });
    throw new OfficialAnswerModelError("response_extraction_parsing_failure", "The answer model response could not be parsed.");
  }
  const generationMs = Math.round(clock() - generationStarted);
  if (!response.ok) throw new OfficialAnswerModelError("api_request_failure", "The answer model could not generate an official-document answer.", { httpStatus: Number(response.status) || null, providerCode: cleanProviderCode(result?.error?.code) });
  const modelOutput = extractStructuredModelOutput(result);
  const conflict = Boolean(modelOutput.conflict);
  const answer = conflict ? CONFLICT_ANSWER : sanitizeAnswer(modelOutput.answer);
  if (!answer) throw new Error("The answer model returned an empty official-document answer.");
  const usage = usageFromResponse(result);
  return {
    answer,
    evidenceSufficient: true,
    modelCallSkipped: false,
    selectedEvidence,
    sources,
    model: result.model || aiAssistantConfig.chatModel,
    conflict: { potentialConflict: conflict, requiresClarification: conflict, competingSources: conflict ? sources : [] },
    diagnostic: { category: "validated_structured_output", label: "Structured output validated", responseStatus: result.status || "completed" },
    metrics: { generationMs, sourceResolutionMs, totalMs: Math.round(clock() - started), ...usage, estimatedGenerationCostUsd: estimateGenerationCost(result.model || aiAssistantConfig.chatModel, usage) },
  };
}

export async function resolveOfficialSources(supabase, evidence, signedUrlSeconds = 900) {
  const versionIds = [...new Set(evidence.map((chunk) => chunk.documentVersionId).filter(Boolean))];
  const chunkIds = [...new Set(evidence.map((chunk) => chunk.chunkId).filter(Boolean))];
  const { data, error } = await supabase.from("ai_document_versions")
    // ai_documents also references ai_document_versions through active_version_id.
    // Use the version ownership FK explicitly so PostgREST does not attempt an
    // ambiguous relationship embed when it validates a citation source.
    .select("id, document_id, storage_bucket, storage_path, processing_status, document:ai_documents!ai_document_versions_document_id_fkey!inner(id, title, status, active_version_id)")
    .in("id", versionIds);
  if (error) throw new Error(`Official source lookup failed: ${error.message}`);
  const { data: chunkData, error: chunkError } = await supabase.from("ai_document_chunks")
    .select("id, document_version_id, is_searchable, page_number, rule_number, section_label, heading")
    .in("id", chunkIds);
  if (chunkError) throw new Error(`Official source chunk lookup failed: ${chunkError.message}`);
  const versions = new Map((data || []).map((version) => [version.id, version]));
  const chunks = new Map((chunkData || []).map((chunk) => [chunk.id, chunk]));
  return Promise.all(evidence.map(async (chunk) => {
    const version = versions.get(chunk.documentVersionId);
    const document = version?.document;
    const citedChunk = chunks.get(chunk.chunkId);
    if (!version || !document || !citedChunk || version.document_id !== chunk.documentId || document.id !== chunk.documentId || document.status !== "active" || document.active_version_id !== version.id || version.processing_status !== "ready" || citedChunk.document_version_id !== version.id || citedChunk.is_searchable !== true) {
      throw new Error("An answer source is no longer an eligible active official document version.");
    }
    const { data: signed, error: signError } = await supabase.storage.from(version.storage_bucket).createSignedUrl(version.storage_path, signedUrlSeconds);
    if (signError || !signed?.signedUrl) throw new Error(`Official source link could not be created: ${signError?.message || "unknown Storage error"}`);
    // Source metadata comes from the revalidated database chunk, not the
    // retrieval payload. This keeps the citation bound to its live source.
    const sourceChunk = {
      ...chunk,
      documentTitle: document.title,
      pageNumber: citationPageNumber(citedChunk.page_number),
      ruleNumber: citedChunk.rule_number || "",
      sectionLabel: citedChunk.section_label || "",
      heading: citedChunk.heading || "",
    };
    const pageNumber = sourceChunk.pageNumber;
    const officialDocumentUrl = pageAwareOfficialDocumentUrl(signed.signedUrl, pageNumber);
    return {
      documentId: chunk.documentId,
      documentVersionId: chunk.documentVersionId,
      chunkId: chunk.chunkId,
      documentTitle: sourceChunk.documentTitle,
      pageNumber,
      ruleNumber: sourceChunk.ruleNumber,
      sectionLabel: sourceChunk.sectionLabel,
      heading: sourceChunk.heading,
      officialDocumentUrl,
      citation: citationLabel(sourceChunk),
      storageBucket: version.storage_bucket,
      storagePath: version.storage_path,
    };
  }));
}

export function validateTrustedSources(evidence, sources) {
  const supplied = new Set(evidence.map((chunk) => `${chunk.documentId}:${chunk.documentVersionId}:${chunk.chunkId}`));
  if (!Array.isArray(sources) || sources.length !== evidence.length) throw new Error("Every supplied evidence chunk must have one validated official source.");
  for (const source of sources) {
    if (!supplied.has(`${source.documentId}:${source.documentVersionId}:${source.chunkId}`)) throw new Error("A citation did not correspond to supplied official evidence.");
    if (!source.officialDocumentUrl) throw new Error("A validated official source requires its real document link.");
  }
}

export function citationLabel(chunk) {
  const details = [];
  const rule = cleanCitationDetail(chunk.ruleNumber ? `Rule ${chunk.ruleNumber}` : "");
  if (rule) details.push(rule);
  const label = cleanCitationDetail(chunk.heading || chunk.sectionLabel || "");
  const labelWithoutRepeatedRule = stripLeadingRuleReference(label, chunk.ruleNumber);
  if (labelWithoutRepeatedRule && !details.some((detail) => sameCitationDetail(detail, labelWithoutRepeatedRule))) details.push(labelWithoutRepeatedRule);
  const pageNumber = citationPageNumber(chunk.pageNumber);
  const page = cleanCitationDetail(pageNumber ? `Page ${pageNumber}` : "");
  if (page && !details.some((detail) => sameCitationDetail(detail, page))) details.push(page);
  return [chunk.documentTitle || "Official LWR Pickleball Club document", ...details].join(" — ");
}

export function citationPageNumber(value) {
  const pageNumber = Number(value);
  return Number.isInteger(pageNumber) && pageNumber >= 1 ? pageNumber : null;
}

export function pageAwareOfficialDocumentUrl(signedUrl, pageNumber) {
  const url = String(signedUrl || "");
  const validPageNumber = citationPageNumber(pageNumber);
  if (!validPageNumber) return url;
  // The fragment is never part of the Storage signature. Replace any fragment
  // only after signing so exactly one browser-side PDF page directive remains.
  return `${url.split("#", 1)[0]}#page=${validPageNumber}`;
}

function skippedAnswer(retrieval, clock, started) {
  return {
    answer: INSUFFICIENT_EVIDENCE_ANSWER,
    evidenceSufficient: false,
    modelCallSkipped: true,
    selectedEvidence: [],
    sources: [],
    model: null,
    conflict: { potentialConflict: false, requiresClarification: false, competingSources: [] },
    metrics: { generationMs: 0, sourceResolutionMs: 0, totalMs: Math.round(clock() - started), inputTokens: null, outputTokens: null, totalTokens: null, estimatedGenerationCostUsd: null },
    retrievalFallback: retrieval?.evidence?.stage4Fallback || INSUFFICIENT_EVIDENCE_ANSWER,
  };
}

function hasDirectRelevance(candidate) {
  return Number(candidate.exactScore) > 0 || Number(candidate.keywordScore) > 0 || candidate.intentDiagnostic?.evidenceMatch && candidate.intentDiagnostic.evidenceMatch !== "None";
}

function materiallyContributes(candidate, primary, question) {
  if (sameRule(candidate, primary) && searchableEvidenceText(candidate) !== searchableEvidenceText(primary)) return true;
  if (isMoreAuthoritative(candidate, primary)) return true;
  if (questionRequestsProcedure(question) && candidate.intentDiagnostic?.evidenceMatch === "Procedural instructions") return true;
  return addsQuestionSignal(candidate, primary, question);
}

function classifyAnswerEvidence(evidence, question, bestIntentByChunkId = new Map()) {
  const controlling = evidence
    .map((candidate, index) => ({ candidate, index }))
    .filter(({ candidate }) => isControllingRule(candidate))
    .sort((left, right) => authorityRank(left.candidate) - authorityRank(right.candidate) || left.index - right.index)[0]?.candidate;
  return evidence.map((candidate, index) => {
    const intentSupportDetails = detectedEvidenceIntents(question).map((intent) => intentSupport(candidate, intent, question)).filter(Boolean);
    const bestFor = bestIntentByChunkId.get(candidate.chunkId) || [];
    const bestIntentReason = bestFor.length ? `Best direct evidence for ${bestFor.join(" + ")}` : "";
    const annotated = { ...candidate, sourceClassification: governingSourceClass(candidate.documentType), intentSupport: intentSupportDetails.map(({ intent }) => intent), intentSupportDetails, intentSelectionDiagnostic: bestIntentReason || "Optional material support retained" };
    if (candidate === controlling) return { ...annotated, evidenceRole: "Primary / controlling", evidenceSelectionReason: [bestIntentReason, "Highest-authority selected rule evidence"].filter(Boolean).join(" · ") };
    if (index === 0 && !controlling) return { ...annotated, evidenceRole: "Primary", evidenceSelectionReason: bestIntentReason || "Highest-ranked direct evidence" };
    return { ...annotated, evidenceRole: "Supporting", evidenceSelectionReason: bestIntentReason || supportingReason(candidate, evidence[0], question) };
  });
}

function sameRule(candidate, primary) {
  return Boolean(candidate?.documentId && candidate.documentId === primary?.documentId && candidate?.ruleNumber && candidate.ruleNumber === primary?.ruleNumber);
}

function isMoreAuthoritative(candidate, primary) {
  const candidateRank = authorityRank(candidate);
  const primaryRank = authorityRank(primary);
  return Number.isFinite(candidateRank) && Number.isFinite(primaryRank) && candidateRank < primaryRank;
}

function authorityRank(candidate) {
  const rank = Number(candidate?.documentAuthorityRank);
  return Number.isFinite(rank) ? rank : Number.POSITIVE_INFINITY;
}

function isControllingRule(candidate) {
  return ["league_rules", "league_supplement"].includes(String(candidate?.documentType || ""));
}

function questionRequestsProcedure(question) {
  return /\b(?:how\s+(?:do|can|to)|steps?|click|button|screen|where\s+(?:do|can))\b/i.test(String(question || ""));
}

function addsQuestionSignal(candidate, primary, question) {
  const primaryText = searchableEvidenceText(primary);
  const candidateText = searchableEvidenceText(candidate);
  return questionTerms(question).some((term) => containsWholeTerm(candidateText, term) && !containsWholeTerm(primaryText, term));
}

function containsWholeTerm(text, term) {
  return new RegExp(`\\b${String(term).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(String(text || ""));
}

function questionTerms(question) {
  const ignored = new Set(["what", "which", "who", "when", "where", "why", "how", "does", "do", "did", "is", "are", "was", "were", "can", "could", "would", "should", "will", "a", "an", "and", "about", "at", "be", "by", "for", "from", "in", "of", "on", "or", "the", "to", "with", "i", "we", "you", "my", "our", "this", "that", "it", "need", "needs", "completed", "complete"]);
  return [...new Set((String(question || "").toLowerCase().match(/[a-z0-9]+/g) || []).filter((term) => term.length >= 3 && !ignored.has(term)))];
}

function searchableEvidenceText(candidate) {
  return [candidate?.sectionLabel, candidate?.heading, candidate?.ruleNumber, candidate?.content].filter(Boolean).join(" ").toLowerCase();
}

function supportingReason(candidate, primary, question) {
  if (sameRule(candidate, primary)) return "Continuation or companion material from the same rule";
  if (isMoreAuthoritative(candidate, primary)) return "Higher-authority rule evidence required to control requirements";
  if (questionRequestsProcedure(question) && candidate.intentDiagnostic?.evidenceMatch === "Procedural instructions") return "Direct procedural guidance requested by the question";
  return "Adds a direct question signal not present in the primary evidence";
}

function annotateEvidenceSelection(retrieval, selectedEvidence) {
  const selectedById = new Map(selectedEvidence.map((candidate) => [candidate.chunkId, candidate]));
  const intents = detectedEvidenceIntents(retrieval?.request?.question);
  const question = retrieval?.request?.question;
  const candidates = [...(Array.isArray(retrieval?.suppliedEvidence) ? retrieval.suppliedEvidence : []), ...(Array.isArray(retrieval?.authorityReviewCandidates) ? retrieval.authorityReviewCandidates : [])]
    .filter((candidate, index, collection) => collection.findIndex((item) => item.chunkId === candidate.chunkId) === index);
  for (const candidate of candidates) {
    const selected = selectedById.get(candidate.chunkId);
    const intentSupportDetails = intents.map((intent) => intentSupport(candidate, intent, question)).filter(Boolean);
    const selectionMetadata = selected ? { ...selected, content: candidate.content } : null;
    Object.assign(candidate, selectionMetadata || {
      evidenceRole: "Not selected for model",
      intentSupport: intentSupportDetails.map(({ intent }) => intent),
      intentSupportDetails,
      intentSelectionDiagnostic: intentSupportDetails.length ? "Direct intent support was present, but stronger selected evidence fully covered that intent" : "No direct intent support",
      evidenceSelectionReason: candidate.governingDiagnostics?.some((detail) => detail.overridden)
        ? "Excluded USAP evidence: directly applicable LWR rule controls the same issue"
        : candidate.governingDiagnostics
        ? "Not selected: no direct applicable passage or stronger evidence covers this issue"
        : intents.length && !intentSupportDetails.length
        ? rejectedIntentReason(candidate, intents)
        : "Direct but less-specific evidence was not material beyond the selected official evidence",
    });
  }
}

function rejectedIntentReason(candidate, intents) {
  const text = searchableEvidenceText(candidate);
  const incidentalMatchSetup = intents.includes("Individual-match Match Setup")
    && /\b(?:match\s+setup|lineup|pairings?)\b/.test(text)
    && /\b(?:enter|verify|submit|score)\b/.test(text);
  const incidentalRoster = intents.includes("Team/season roster management")
    && /\b(?:team|player|roster)\b/.test(text)
    && /\b(?:add|remove|delete|drop|update|change)\b/.test(text);
  if (incidentalMatchSetup || incidentalRoster) return "Incidental or scattered related terms were rejected; no coherent local passage supports a detected question intent";
  return "Does not support a detected question intent";
}

function answerPrompt(question, evidence) {
  return `User question:\n${question}\n\nOfficial uploaded evidence only:\n${evidence.map((chunk, index) => `[Evidence ${index + 1} — ${chunk.evidenceRole || "Primary"}]\nSource classification: ${chunk.sourceClassification}\nQuestion intent supported: ${chunk.intentSupport?.join(" + ") || "Direct official evidence"}\nDocument: ${chunk.documentTitle}\nDocument type: ${chunk.documentType || "not supplied"}\nAuthority rank: ${chunk.documentAuthorityRank || "not supplied"}\nRule: ${chunk.ruleNumber || "not supplied"}\nSection: ${chunk.sectionLabel || "not supplied"}\nHeading: ${chunk.heading || "not supplied"}\nPage: ${chunk.pageNumber || "not supplied"}\nText:\n${chunk.content}`).join("\n\n")}`;
}

function cleanCitationDetail(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function stripLeadingRuleReference(label, ruleNumber) {
  if (!label || !ruleNumber) return label;
  const escapedRule = String(ruleNumber).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return cleanCitationDetail(label.replace(new RegExp(`^rule\\s*${escapedRule}(?:\\s*[-—:]\\s*|\\s+)?`, "i"), ""));
}

function sameCitationDetail(left, right) {
  const normalize = (value) => cleanCitationDetail(value).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  return normalize(left) === normalize(right);
}

export function extractStructuredModelOutput(result) {
  assertCompletedResponse(result);
  const output = Array.isArray(result?.output) ? result.output : [];
  const content = output.flatMap((item) => Array.isArray(item?.content) ? item.content : item?.type === "output_text" ? [item] : []);
  const refusal = content.find((item) => item?.type === "refusal");
  if (refusal) throw new OfficialAnswerModelError("model_refusal", "The answer model declined to answer from the supplied official evidence.");
  const outputText = content.filter((item) => item?.type === "output_text" && typeof item.text === "string").map((item) => item.text).join("")
    || (typeof result?.output_text === "string" ? result.output_text : "");
  if (!outputText.trim()) throw new OfficialAnswerModelError("missing_structured_output", "The answer model returned no structured official-document output.");
  try {
    const parsed = JSON.parse(outputText);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed) || Object.keys(parsed).length !== 2 || typeof parsed.answer !== "string" || !parsed.answer.trim() || typeof parsed.conflict !== "boolean") throw new OfficialAnswerModelError("schema_validation_failure", "The answer model output did not match the required official-answer schema.");
    return parsed;
  } catch (error) {
    if (error instanceof OfficialAnswerModelError) throw error;
    throw new OfficialAnswerModelError("response_extraction_parsing_failure", "The answer model returned structured output that could not be parsed.");
  }
}

function assertCompletedResponse(result) {
  if (result?.status === "incomplete") {
    const reason = String(result?.incomplete_details?.reason || "");
    if (reason === "max_output_tokens") throw new OfficialAnswerModelError("incomplete_max_output_tokens", "The answer model response was incomplete because it reached the output-token limit.", { incompleteReason: reason });
    throw new OfficialAnswerModelError("incomplete_response", "The answer model response was incomplete.", { incompleteReason: cleanProviderCode(reason) });
  }
  if (result?.status === "failed" || result?.error) throw new OfficialAnswerModelError("api_request_failure", "The answer model failed to generate a response.", { providerCode: cleanProviderCode(result?.error?.code) });
  if (result?.status && result.status !== "completed") throw new OfficialAnswerModelError("unexpected_response_status", "The answer model did not complete its response.", { responseStatus: cleanProviderCode(result.status) });
}

function diagnosticLabel(category) {
  return ({ api_request_failure: "API request failure", model_refusal: "Model refusal", incomplete_max_output_tokens: "Incomplete: output-token limit", incomplete_response: "Incomplete model response", missing_structured_output: "Missing structured output", schema_validation_failure: "Schema validation failure", response_extraction_parsing_failure: "Response extraction/parsing failure", unexpected_response_status: "Unexpected model response status", validated_structured_output: "Structured output validated", server_failure: "Server-side answer generation failure" })[category] || "Answer generation diagnostic";
}

function cleanProviderCode(value) {
  const code = String(value || "").replace(/[^a-z0-9_.-]/gi, "").slice(0, 80);
  return code || null;
}

function sanitizeAnswer(value) {
  return String(value || "").replace(/\r/g, "").replace(/(?:^|\n)\s*(?:sources?|citations?|references?)\s*:[\s\S]*$/i, "").replace(/\n{3,}/g, "\n\n").trim().slice(0, 6000);
}

function usageFromResponse(result) {
  const inputTokens = finiteOrNull(result?.usage?.input_tokens);
  const outputTokens = finiteOrNull(result?.usage?.output_tokens);
  const totalTokens = finiteOrNull(result?.usage?.total_tokens) ?? (inputTokens === null && outputTokens === null ? null : (inputTokens || 0) + (outputTokens || 0));
  return { inputTokens, outputTokens, totalTokens };
}

function estimateGenerationCost(model, usage) {
  if (!/^gpt-5\.5(?:-|$)/i.test(String(model || "")) || usage.inputTokens === null || usage.outputTokens === null) return null;
  return Math.round(((usage.inputTokens * .000005) + (usage.outputTokens * .00003)) * 1_000_000) / 1_000_000;
}

function finiteOrNull(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
