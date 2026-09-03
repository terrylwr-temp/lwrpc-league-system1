const DEFAULTS = {
  enabled: false,
  documentsBucket: "ai-official-documents",
  maxPdfBytes: 25 * 1024 * 1024,
  maxPdfPages: 150,
  chatModel: "gpt-5.5",
  embeddingModel: "text-embedding-3-small",
  embeddingDimensions: 1536,
  retrievalLimit: 8,
  evidenceThreshold: 0.35,
  maxOutputTokens: 700,
  rateLimitPerHour: 20,
};

function positiveInteger(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function unitInterval(value, fallback) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 1 ? parsed : fallback;
}

function text(value, fallback) {
  return String(value || "").trim() || fallback;
}

export function readAiAssistantConfig(env = process.env) {
  return Object.freeze({
    enabled: String(env.LWR_AI_ENABLED || "").trim().toLowerCase() === "true",
    documentsBucket: text(env.LWR_AI_DOCUMENTS_BUCKET, DEFAULTS.documentsBucket),
    maxPdfBytes: positiveInteger(env.LWR_AI_MAX_PDF_BYTES, DEFAULTS.maxPdfBytes),
    maxPdfPages: positiveInteger(env.LWR_AI_MAX_PDF_PAGES, DEFAULTS.maxPdfPages),
    chatModel: text(env.LWR_AI_CHAT_MODEL, text(env.OPENAI_MODEL, DEFAULTS.chatModel)),
    embeddingModel: text(env.LWR_AI_EMBEDDING_MODEL, DEFAULTS.embeddingModel),
    embeddingDimensions: positiveInteger(env.LWR_AI_EMBEDDING_DIMENSIONS, DEFAULTS.embeddingDimensions),
    retrievalLimit: positiveInteger(env.LWR_AI_RETRIEVAL_LIMIT, DEFAULTS.retrievalLimit),
    evidenceThreshold: unitInterval(env.LWR_AI_EVIDENCE_THRESHOLD, DEFAULTS.evidenceThreshold),
    maxOutputTokens: positiveInteger(env.LWR_AI_MAX_OUTPUT_TOKENS, DEFAULTS.maxOutputTokens),
    rateLimitPerHour: positiveInteger(env.LWR_AI_RATE_LIMIT_PER_HOUR, DEFAULTS.rateLimitPerHour),
  });
}

export const aiAssistantConfig = readAiAssistantConfig();

