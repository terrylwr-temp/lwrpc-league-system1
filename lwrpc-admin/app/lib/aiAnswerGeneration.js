import { aiAssistantConfig } from "./aiAssistantConfig.js";

export const INSUFFICIENT_EVIDENCE_ANSWER = "I couldn't find an official LWR Pickleball Club rule or guide that specifically addresses this question. Please contact League Management for clarification.";
export const CONFLICT_ANSWER = "The supplied official LWR Pickleball Club sources appear to conflict on this point. Please contact League Management for clarification.";

const MAX_SELECTED_CHUNKS = 4;
const DIRECT_RELEVANCE_DELTA = .10;

export function selectAnswerEvidence(retrieval) {
  if (!retrieval?.evidence?.sufficient) return [];
  const candidates = Array.isArray(retrieval.suppliedEvidence) ? retrieval.suppliedEvidence : [];
  const top = candidates[0];
  if (!top) return [];
  const cutoff = Math.max(Number(retrieval.evidence.threshold) || aiAssistantConfig.evidenceThreshold, Number(top.combinedScore) - DIRECT_RELEVANCE_DELTA);
  return candidates.filter((candidate, index) => index === 0 || (
    Number(candidate.combinedScore) >= cutoff && hasDirectRelevance(candidate)
  )).slice(0, MAX_SELECTED_CHUNKS);
}

export async function generateOfficialAnswer({ retrieval, supabase, fetchImpl = fetch, clock = performance.now.bind(performance), resolveSources = resolveOfficialSources }) {
  const started = clock();
  if (!retrieval?.evidence?.sufficient) return skippedAnswer(retrieval, clock, started);

  const selectedEvidence = selectAnswerEvidence(retrieval);
  if (selectedEvidence.length === 0) return skippedAnswer(retrieval, clock, started);
  const sourcesStarted = clock();
  const sources = await resolveSources(supabase, selectedEvidence);
  const sourceResolutionMs = Math.round(clock() - sourcesStarted);
  validateTrustedSources(selectedEvidence, sources);

  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured on the server.");
  const generationStarted = clock();
  const response = await fetchImpl("https://api.openai.com/v1/responses", {
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
        "Answer the user's question using ONLY the official LWR Pickleball Club evidence supplied with this request.",
        "Do not use general pickleball knowledge, outside rules, internet knowledge, prior model knowledge, or assumptions.",
        "You may summarize and simplify supplied evidence, but may not invent, extend, reinterpret, or change an official rule.",
        "Preserve exact numbers, dates, deadlines, scores, ratings, requirements, and equipment names from the evidence.",
        "Use clear conversational language for a player or captain, normally one to three short paragraphs. Do not add citations, sources, links, or source labels; the server attaches verified citations.",
        "If evidence does not support all of the question, say so without guessing. If supplied sources materially conflict on the requested point, set conflict to true and do not give a definitive answer. Do not treat complementary detail as a conflict.",
      ].join(" "),
      input: [{ role: "user", content: answerPrompt(retrieval.request.question, selectedEvidence) }],
    }),
  });
  const result = await response.json().catch(() => ({}));
  const generationMs = Math.round(clock() - generationStarted);
  if (!response.ok) throw new Error(result?.error?.message || "The answer model could not generate an official-document answer.");
  const modelOutput = parseModelOutput(result.output_text);
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
    metrics: { generationMs, sourceResolutionMs, totalMs: Math.round(clock() - started), ...usage, estimatedGenerationCostUsd: estimateGenerationCost(result.model || aiAssistantConfig.chatModel, usage) },
  };
}

export async function resolveOfficialSources(supabase, evidence, signedUrlSeconds = 900) {
  const versionIds = [...new Set(evidence.map((chunk) => chunk.documentVersionId).filter(Boolean))];
  const { data, error } = await supabase.from("ai_document_versions")
    .select("id, document_id, storage_bucket, storage_path, processing_status, document:ai_documents!inner(id, title, status, active_version_id)")
    .in("id", versionIds);
  if (error) throw new Error(`Official source lookup failed: ${error.message}`);
  const versions = new Map((data || []).map((version) => [version.id, version]));
  return Promise.all(evidence.map(async (chunk) => {
    const version = versions.get(chunk.documentVersionId);
    const document = version?.document;
    if (!version || !document || version.document_id !== chunk.documentId || document.id !== chunk.documentId || document.status !== "active" || document.active_version_id !== version.id || version.processing_status !== "ready") {
      throw new Error("An answer source is no longer an eligible active official document version.");
    }
    const { data: signed, error: signError } = await supabase.storage.from(version.storage_bucket).createSignedUrl(version.storage_path, signedUrlSeconds);
    if (signError || !signed?.signedUrl) throw new Error(`Official source link could not be created: ${signError?.message || "unknown Storage error"}`);
    const officialDocumentUrl = chunk.pageNumber ? `${signed.signedUrl}#page=${encodeURIComponent(chunk.pageNumber)}` : signed.signedUrl;
    return {
      documentId: chunk.documentId,
      documentVersionId: chunk.documentVersionId,
      chunkId: chunk.chunkId,
      documentTitle: chunk.documentTitle || document.title,
      pageNumber: chunk.pageNumber || null,
      ruleNumber: chunk.ruleNumber || "",
      sectionLabel: chunk.sectionLabel || "",
      heading: chunk.heading || "",
      officialDocumentUrl,
      citation: citationLabel(chunk),
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
  if (chunk.ruleNumber) details.push(`Rule ${chunk.ruleNumber}`);
  if (chunk.heading) details.push(chunk.heading);
  else if (chunk.sectionLabel) details.push(chunk.sectionLabel);
  if (chunk.pageNumber) details.push(`Page ${chunk.pageNumber}`);
  return [chunk.documentTitle || "Official LWR Pickleball Club document", ...details].join(" — ");
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

function answerPrompt(question, evidence) {
  return `User question:\n${question}\n\nOfficial LWR evidence only:\n${evidence.map((chunk, index) => `[Evidence ${index + 1}]\nDocument: ${chunk.documentTitle}\nRule: ${chunk.ruleNumber || "not supplied"}\nSection: ${chunk.sectionLabel || "not supplied"}\nHeading: ${chunk.heading || "not supplied"}\nPage: ${chunk.pageNumber || "not supplied"}\nText:\n${chunk.content}`).join("\n\n")}`;
}

function parseModelOutput(value) {
  try {
    const parsed = JSON.parse(String(value || ""));
    if (typeof parsed?.answer !== "string" || typeof parsed?.conflict !== "boolean") throw new Error("invalid shape");
    return parsed;
  } catch { throw new Error("The answer model returned an invalid structured official-document response."); }
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
