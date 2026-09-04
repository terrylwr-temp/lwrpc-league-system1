import { aiAssistantConfig } from "./aiAssistantConfig.js";

export const ASK_ABOUT_SCOPES = Object.freeze(["all", "weekday", "primetime", "saturday", "lms_help"]);
export const RETRIEVAL_WEIGHTS = Object.freeze({ semantic: 0.47, keyword: 0.24, exact: 0.19, authority: 0.06, context: 0.04 });
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const GENERIC_EXACT_TERMS = new Set(["team", "teams", "player", "players", "game", "games", "league", "leagues", "match", "matches", "score", "scores", "rule", "rules", "guide", "guides", "another"]);
const QUERY_FRAMING_TERMS = new Set(["what", "which", "who", "when", "where", "why", "how", "does", "do", "did", "is", "are", "was", "were", "can", "could", "would", "should", "will", "mean", "meaning", "work", "works", "requirement", "requirements", "explain", "explained", "tell", "show", "say", "says", "define", "definition", "describe", "described", "please", "someone", "somebody", "anyone", "anybody", "we", "us", "our", "i", "me", "my", "you", "your", "they", "them", "their", "he", "she", "it", "this", "that", "got", "get", "gets", "halfway", "through", "then", "just", "really", "t", "game", "games", "match", "matches", "type", "using", "use", "used", "brand", "playing", "need", "must", "required", "deadline", "due", "latest", "early", "long", "before"]);
const COMMON_QUERY_STOPWORDS = new Set(["a", "an", "and", "about", "at", "be", "by", "for", "from", "have", "in", "of", "on", "or", "the", "to", "with"]);

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
  const candidates = (data || []).map((row) => candidateFromRow(row, request.question));
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

function candidateFromRow(row, question) {
  const candidate = {
    chunkId: row.chunk_id, documentId: row.document_id, documentVersionId: row.document_version_id, documentTitle: row.document_title,
    documentType: row.document_type, documentAuthorityRank: Number(row.document_authority_rank), documentScopeKind: row.document_scope_kind,
    pageNumber: row.page_number, sectionLabel: row.section_label || "", heading: row.heading || "", ruleNumber: row.rule_number || "", content: row.content || "",
    semanticScore: number(row.semantic_score), keywordScore: number(row.keyword_score), exactScore: number(row.exact_score), authorityScore: number(row.authority_score), contextScore: number(row.context_score), combinedScore: number(row.combined_score), vectorRank: row.vector_rank ?? null, keywordRank: row.keyword_rank ?? null, exactMatch: Boolean(row.exact_match),
  };
  const ftsTerms = normalizedFtsTerms(question);
  const intent = intentDiagnostic(question, candidate);
  return {
    ...candidate,
    exactMatchReason: exactMatchReason(question, candidate),
    ftsDiagnostic: {
      normalizedTerms: ftsTerms,
      retrievalExpansion: continuationExpansionPhrases(question),
      matched: candidate.keywordRank !== null,
      candidateRank: candidate.keywordRank,
    },
    intentDiagnostic: intent,
  };
}

export function normalizedFtsTerms(question) {
  return (String(question || "").toLowerCase().match(/[a-z0-9]+/g) || [])
    .filter((term) => !QUERY_FRAMING_TERMS.has(term) && !COMMON_QUERY_STOPWORDS.has(term));
}

export function continuationExpansionPhrases(question) {
  const value = String(question || "").toLowerCase();
  const hasInterruption = /\b(?:injur(?:y|ed|ies)?|hurt|medical|illness|emergency|cannot|unable|can['’]?t|won['’]?t|stop(?:ped|ping)?|quit|leave)\b/.test(value);
  const hasActivity = /\b(?:players?|participants?|teams?|games?|matches?|play(?:ing)?|finish|continue|complete)\b/.test(value);
  return hasInterruption && hasActivity ? ["cannot complete"] : [];
}

export function detectRetrievalIntent(question) {
  const value = String(question || "").toLowerCase();
  if (isConductIntent(value)) return "Behavior/conduct";
  const deadline = /\b(?:when|deadline|due|latest|early)\b/.test(value)
    || /\bhow\s+(?:early|long\s+before|many\s+(?:days?|hours?|weeks?)\s+before)\b/.test(value)
    || /\b(?:need|must|required)\s+(?:to\s+)?(?:be\s+)?(?:completed|submitted|done)\b/.test(value);
  if (deadline) return "Deadline/requirement";
  if (/\bhow\s+(?:do|can|to)\b/.test(value) || /\bwhere\s+(?:do|can)\b/.test(value) || /\bwhat\s+(?:button|screen)\b/.test(value)) return "Procedural/how-to";
  return "None";
}

export function intentDiagnostic(question, candidate) {
  const intent = detectRetrievalIntent(question);
  const searchable = [candidate.sectionLabel, candidate.heading, candidate.ruleNumber, candidate.content].filter(Boolean).join(" ").toLowerCase();
  if (intent === "None" || (intent !== "Behavior/conduct" && !hasDirectQueryPhrase(question, searchable))) return { detectedIntent: intent, evidenceMatch: "None" };
  const concreteTiming = /\b(?:no\s+later\s+than|at\s+least|within)\b[\s\S]{0,60}\b(?:days?|hours?|weeks?)\b/.test(searchable) || /\b(?:deadline|due)\b/.test(searchable);
  const timing = concreteTiming || /\b(?:before|prior\s+to)\s+(?:the\s+)?(?:scheduled\s+)?(?:match|match\s+date|date)\b/.test(searchable);
  const procedure = /\b(?:click|button|select|enter|save|screen|dashboard|steps?|dropdown)\b/.test(searchable);
  const conductStandard = /\b(?:respect|respectful|sportsmanship|conduct|decorum|behavior)\b/.test(searchable);
  const conductExample = /\b(?:trash\s+talk|profanity|aggressive|abusive|harass(?:ment)?|paddle\s+throwing)\b/.test(searchable);
  const conductProhibition = /\b(?:avoid|prohibit(?:ed|ion)?|not\s+(?:be\s+)?tolerated|violation|disciplin(?:ary|e)|must|shall)\b/.test(searchable);
  const conductAudience = /\b(?:players?|opponents?|partners?|members?|captains?|spectators?)\b/.test(searchable);
  if (intent === "Deadline/requirement" && concreteTiming && /\b\d+(?:\.\d+)+\.\s/.test(candidate.content || "")) return { detectedIntent: intent, evidenceMatch: "Concrete timing requirement in numbered rule" };
  if (intent === "Deadline/requirement" && concreteTiming) return { detectedIntent: intent, evidenceMatch: "Concrete timing requirement" };
  if (intent === "Deadline/requirement" && timing) return { detectedIntent: intent, evidenceMatch: "General timing language" };
  if (intent === "Procedural/how-to" && procedure) return { detectedIntent: intent, evidenceMatch: "Procedural instructions" };
  if (intent === "Behavior/conduct" && conductStandard && (conductExample || (conductProhibition && conductAudience))) return { detectedIntent: intent, evidenceMatch: "Behavioral standard and prohibition" };
  return { detectedIntent: intent, evidenceMatch: "None" };
}

function exactMatchReason(question, candidate) {
  if (!candidate.exactMatch) return "None";
  const query = String(question || "");
  const words = query.toLowerCase().match(/[a-z0-9]+/g) || [];
  const searchable = [candidate.sectionLabel, candidate.heading, candidate.ruleNumber, candidate.content].filter(Boolean).join(" ").toLowerCase();
  const requestedRule = query.toLowerCase().match(/\b(?:rule\s*)?(\d+(?:\.\d+)+)\b/)?.[1] || "";
  if (requestedRule && candidate.ruleNumber.toLowerCase() === requestedRule) return `Rule number: ${requestedRule}`;
  const includes = (term) => new RegExp(`\\b${term.replaceAll(" ", "\\s+")}\\b`, "i").test(searchable);
  const acronyms = [...new Set([...(query.match(/\b[A-Z][A-Z0-9]{1,9}\b/g) || []).map((term) => term.toLowerCase()), ...(words.includes("nr") ? ["nr"] : [])])];
  const acronym = acronyms.find(includes);
  if (acronym) return `Acronym: ${acronym.toUpperCase()}`;
  const distinctive = words.map((word) => !GENERIC_EXACT_TERMS.has(word) && !QUERY_FRAMING_TERMS.has(word) && !COMMON_QUERY_STOPWORDS.has(word));
  const phrases = [];
  for (let index = 0; index < words.length; index += 1) for (let size = 2; size <= 4 && index + size <= words.length; size += 1) {
    const phrase = words.slice(index, index + size).join(" ");
    if (phrase.length >= 8 && distinctive.slice(index, index + size).some(Boolean)) phrases.push(phrase);
  }
  const phrase = phrases.find(includes);
  if (phrase) return `Phrase: ${phrase}`;
  const officialTerm = words.find((word, index) => distinctive[index] && word.length >= 4 && isStructuralOfficialTerm(word, candidate));
  if (officialTerm) return `Official term: ${officialTerm}`;
  if (continuationExpansionPhrases(question).includes("cannot complete") && /\bcannot\s+complete\b/i.test(candidate.content)) return "Retrieval expansion: cannot complete";
  return "Exact query-term match";
}

function isStructuralOfficialTerm(word, candidate) {
  const structural = [candidate.sectionLabel, candidate.heading].filter(Boolean).join(" ");
  return officialTermVariants(word).some((term) => {
    const boundary = `\\b${term}s?\\b`;
    return new RegExp(boundary, "i").test(structural)
      || new RegExp(`\\(\\s*${term}s?\\s*\\)`, "i").test(candidate.content)
      || new RegExp(`${boundary}[^:\\r\\n]{0,60}:`, "i").test(candidate.content);
  });
}

function officialTermVariants(word) {
  const value = String(word || "").toLowerCase();
  const variants = new Set([value.replace(/s$/, "")]);
  if (value.length >= 8) for (let size = 4; size <= Math.min(8, value.length - 4); size += 1) variants.add(value.slice(-size));
  return [...variants].filter(Boolean);
}
function hasDirectQueryPhrase(question, searchable) {
  const words = String(question || "").toLowerCase().match(/[a-z0-9]+/g) || [];
  const distinctive = words.map((word) => !GENERIC_EXACT_TERMS.has(word) && !QUERY_FRAMING_TERMS.has(word) && !COMMON_QUERY_STOPWORDS.has(word));
  for (let index = 0; index < words.length; index += 1) for (let size = 2; size <= 4 && index + size <= words.length; size += 1) {
    const phrase = words.slice(index, index + size).join(" ");
    if (phrase.length >= 8 && distinctive.slice(index, index + size).some(Boolean) && new RegExp(`\\b${phrase.replaceAll(" ", "\\s+")}\\b`, "i").test(searchable)) return true;
  }
  return false;
}
function isConductIntent(value) {
  const interpersonalBehavior = /\b(?:yell|insult|swear|curse|verbal(?:ly)?\s+abus(?:e|ive)|harass(?:ment)?|threaten|taunt|mock|disrespect(?:ful)?|profan(?:e|ity))\b/.test(value)
    && /\b(?:another\s+)?(?:player|opponent|partner|member|captain|spectator|someone|anyone)\b/.test(value);
  const namedConduct = /\btrash\s+talk(?:ing)?\b/.test(value) || /\b(?:sportsmanship|conduct)\b/.test(value);
  const angryPaddle = /\bthrow(?:ing)?\s+(?:my\s+|a\s+)?paddle\b/.test(value) && /\b(?:angry|anger)\b/.test(value);
  return interpersonalBehavior || namedConduct || angryPaddle;
}
function assertEmbeddingConfiguration() { if (aiAssistantConfig.embeddingDimensions !== 1536) throw new Error("LWR_AI_EMBEDDING_DIMENSIONS must remain 1536 until the AI chunk schema is migrated and reindexed."); }
function clean(value, max) { return String(value || "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max); }
function uuid(value) { const id = String(value || "").trim(); return UUID.test(id) ? id : null; }
function number(value) { const parsed = Number(value); return Number.isFinite(parsed) ? Math.round(parsed * 10000) / 10000 : 0; }
function finiteOrNull(value) { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : null; }
