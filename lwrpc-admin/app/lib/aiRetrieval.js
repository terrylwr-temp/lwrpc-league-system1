import { aiAssistantConfig } from "./aiAssistantConfig.js";

export const ASK_ABOUT_SCOPES = Object.freeze(["all", "weekday", "primetime", "saturday", "lms_help"]);
export const RETRIEVAL_WEIGHTS = Object.freeze({ semantic: 0.47, keyword: 0.24, exact: 0.19, authority: 0.06, context: 0.04 });
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function normalizeRetrievalRequest(body = {}) {
  const question = clean(body.question, 1000);
  if (question.length < 2) throw new Error("Enter a question with at least two characters.");
  const askAbout = clean(body.askAbout || "all", 40).toLowerCase();
  if (!ASK_ABOUT_SCOPES.includes(askAbout)) throw new Error("Choose a valid Ask About value.");
  const context = body.context && typeof body.context === "object" ? body.context : {};
  return Object.freeze({
    question,
    normalizedQuery: question.toLowerCase(),
    askAbout,
    context: Object.freeze({
      currentPath: clean(context.currentPath, 240),
      featureModule: clean(context.featureModule, 120),
      seasonId: uuid(context.seasonId), leagueId: uuid(context.leagueId), divisionId: uuid(context.divisionId), teamId: uuid(context.teamId),
      userRole: clean(context.userRole, 40).toLowerCase(),
    }),
  });
}

export async function retrieveOfficialEvidence({ supabase, body, embedQuery = createQueryEmbedding, clock = performance.now.bind(performance) }) {
  if (!aiAssistantConfig.enabled) throw new Error("Ask LWR Pickleball AI retrieval is disabled. Set LWR_AI_ENABLED=true on the server.");
  assertEmbeddingConfiguration();
  const request = normalizeRetrievalRequest(body);
  const started = clock();
  const embedding = await embedQuery(request.question);
  if (!Array.isArray(embedding.embedding) || embedding.embedding.length !== aiAssistantConfig.embeddingDimensions) throw new Error("The embedding provider returned an unexpected vector size.");
  const embeddingDone = clock();
  const { data, error } = await supabase.rpc("search_ai_official_chunks", {
    p_query_embedding: toPgVector(embedding.embedding), p_query_text: request.question, p_ask_about: request.askAbout,
    p_current_path: request.context.currentPath || null, p_feature_module: request.context.featureModule || null,
    p_season_id: request.context.seasonId, p_league_id: request.context.leagueId, p_division_id: request.context.divisionId,
    p_team_id: request.context.teamId, p_user_role: request.context.userRole || null,
    p_limit: Math.max(aiAssistantConfig.retrievalLimit * 4, 24),
  });
  if (error) throw new Error(`Official-document retrieval failed: ${error.message}`);
  const candidates = (data || []).map(candidateFromRow);
  const suppliedEvidence = candidates.slice(0, aiAssistantConfig.retrievalLimit);
  const evidence = evaluateEvidence(suppliedEvidence, aiAssistantConfig.evidenceThreshold);
  return {
    request, candidates, suppliedEvidence, evidence, conflict: conservativeConflictDiagnostic(suppliedEvidence),
    environment: { embeddingModel: embedding.model || aiAssistantConfig.embeddingModel, embeddingDimensions: aiAssistantConfig.embeddingDimensions, evidenceThreshold: aiAssistantConfig.evidenceThreshold, retrievalLimit: aiAssistantConfig.retrievalLimit },
    metrics: { embeddingInputTokens: finiteOrNull(embedding.inputTokens), embeddingMs: Math.round(embeddingDone - started), retrievalMs: Math.round(clock() - embeddingDone), totalMs: Math.round(clock() - started) },
  };
}

export async function createQueryEmbedding(question, fetchImpl = fetch) {
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured on the server.");
  assertEmbeddingConfiguration();
  const response = await fetchImpl("https://api.openai.com/v1/embeddings", {
    method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: JSON.stringify({ model: aiAssistantConfig.embeddingModel, input: question, dimensions: aiAssistantConfig.embeddingDimensions, encoding_format: "float" }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result?.error?.message || "The embedding provider could not process this question.");
  const row = result?.data?.[0];
  if (!Array.isArray(row?.embedding) || row.embedding.length !== aiAssistantConfig.embeddingDimensions) throw new Error("The embedding provider returned an unexpected vector size.");
  return { embedding: row.embedding, model: result.model || aiAssistantConfig.embeddingModel, inputTokens: result?.usage?.prompt_tokens ?? result?.usage?.total_tokens ?? null };
}

export function evaluateEvidence(chunks, threshold) {
  const top = chunks[0];
  const signal = top && (top.semanticScore >= .12 || top.keywordScore >= .05 || top.exactScore > 0);
  const sufficient = Boolean(top && top.combinedScore >= threshold && signal);
  return Object.freeze({ sufficient, threshold, topScore: top?.combinedScore ?? null, stage4Fallback: sufficient ? "Evidence meets the configured threshold." : "I couldn't find an official LWR Pickleball Club rule or guide that specifically addresses this question. Please contact League Management for clarification." });
}

export function conservativeConflictDiagnostic(chunks) {
  // Retrieval cannot determine a semantic contradiction. Avoid false alarms;
  // retain competing high-scoring evidence for administrator inspection.
  const competing = chunks.filter((chunk) => chunk.combinedScore >= .35).slice(0, 3);
  return { potentialConflict: false, competingEvidence: competing.length > 1 ? competing : [], limitation: "Stage 3 does not infer contradictions from text similarity alone; competing high-scoring sources are shown for manual review." };
}

export function toPgVector(values) {
  if (!Array.isArray(values) || values.length !== aiAssistantConfig.embeddingDimensions || values.some((value) => !Number.isFinite(value))) throw new Error("Query embedding dimensions do not match the official-document index.");
  return `[${values.join(",")}]`;
}

function candidateFromRow(row) {
  return {
    chunkId: row.chunk_id, documentId: row.document_id, documentVersionId: row.document_version_id, documentTitle: row.document_title,
    documentType: row.document_type, documentAuthorityRank: Number(row.document_authority_rank), documentScopeKind: row.document_scope_kind,
    pageNumber: row.page_number, sectionLabel: row.section_label || "", heading: row.heading || "", ruleNumber: row.rule_number || "", content: row.content || "",
    semanticScore: number(row.semantic_score), keywordScore: number(row.keyword_score), exactScore: number(row.exact_score), authorityScore: number(row.authority_score), contextScore: number(row.context_score), combinedScore: number(row.combined_score), vectorRank: row.vector_rank ?? null, keywordRank: row.keyword_rank ?? null, exactMatch: Boolean(row.exact_match),
  };
}
function assertEmbeddingConfiguration() { if (aiAssistantConfig.embeddingDimensions !== 1536) throw new Error("LWR_AI_EMBEDDING_DIMENSIONS must remain 1536 until the AI chunk schema is migrated and reindexed."); }
function clean(value, max) { return String(value || "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max); }
function uuid(value) { const id = String(value || "").trim(); return UUID.test(id) ? id : null; }
function number(value) { const parsed = Number(value); return Number.isFinite(parsed) ? Math.round(parsed * 10000) / 10000 : 0; }
function finiteOrNull(value) { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : null; }
