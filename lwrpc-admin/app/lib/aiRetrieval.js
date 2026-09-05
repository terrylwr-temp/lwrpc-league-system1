import { aiAssistantConfig } from "./aiAssistantConfig.js";
import { governingSourceClass, INSUFFICIENT_EVIDENCE_ANSWER } from "./aiGoverningSources.js";

export const ASK_ABOUT_SCOPES = Object.freeze(["all", "weekday", "primetime", "saturday", "lms_help"]);
export const RETRIEVAL_WEIGHTS = Object.freeze({ semantic: 0.47, keyword: 0.24, exact: 0.19, authority: 0.06, context: 0.04 });
// Stage 4 needs a small, bounded look beyond the model-evidence handoff when
// deciding whether a directly applicable LWR rule controls a USAP fallback.
// Production medical-issue evidence placed the controlling rule at rank 11.
export const AUTHORITY_REVIEW_LIMIT = 12;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const GENERIC_EXACT_TERMS = new Set(["team", "teams", "player", "players", "game", "games", "league", "leagues", "match", "matches", "score", "scores", "rule", "rules", "guide", "guides", "another"]);
const QUERY_FRAMING_TERMS = new Set(["what", "which", "who", "when", "where", "why", "how", "does", "do", "did", "is", "are", "was", "were", "can", "could", "would", "should", "will", "mean", "meaning", "work", "works", "requirement", "requirements", "explain", "explained", "tell", "show", "say", "says", "define", "definition", "describe", "described", "please", "someone", "somebody", "anyone", "anybody", "we", "us", "our", "i", "me", "my", "you", "your", "they", "them", "their", "he", "she", "it", "this", "that", "got", "get", "gets", "halfway", "through", "then", "just", "really", "t", "game", "games", "match", "matches", "type", "kind", "using", "use", "used", "brand", "playing", "need", "must", "required", "deadline", "due", "latest", "early", "long", "before"]);
const COMMON_QUERY_STOPWORDS = new Set(["a", "an", "and", "about", "at", "be", "by", "for", "from", "have", "in", "of", "on", "or", "the", "to", "with"]);
// These are precision-sensitive values/categories. They must be entered as
// written rather than silently normalized by a lexical typo heuristic.
const PROTECTED_FUZZY_TERMS = new Set(["nr", "dupr", "rating", "ratings", "score", "scores", "date", "dates", "rule", "rules"]);

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
  if (!aiAssistantConfig.enabled) throw new Error("Ask LWR Pickleball Club AI retrieval is disabled. Set LWR_AI_ENABLED=true on the server.");
  assertEmbeddingConfiguration();
  const request = normalizeRetrievalRequest(body);
  const started = clock();
  const embedding = await embedQuery(request.question);
  if (!Array.isArray(embedding.embedding) || embedding.embedding.length !== aiAssistantConfig.embeddingDimensions) throw new Error("The embedding provider returned an unexpected vector size.");
  const embeddingDone = clock();
  const rpcArgs = (queryText) => ({
    p_query_embedding: toPgVector(embedding.embedding), p_query_text: queryText, p_ask_about: request.askAbout,
    p_current_path: request.context.currentPath || null, p_feature_module: request.context.featureModule || null,
    p_season_id: request.context.seasonId, p_league_id: request.context.leagueId, p_division_id: request.context.divisionId,
    p_team_id: request.context.teamId, p_user_role: request.context.userRole || null,
    p_limit: Math.max(aiAssistantConfig.retrievalLimit * 4, 24),
  });
  let { data, error } = await supabase.rpc("search_ai_official_chunks", rpcArgs(request.question));
  if (error) throw new Error(`Official-document retrieval failed: ${error.message}`);
  const typoNormalizations = deriveTypoNormalizations(request.question, data || []);
  const retrievalQuery = applyTypoNormalizations(request.question, typoNormalizations);
  if (retrievalQuery !== request.question) {
    ({ data, error } = await supabase.rpc("search_ai_official_chunks", rpcArgs(retrievalQuery)));
    if (error) throw new Error(`Official-document retrieval failed: ${error.message}`);
  }
  const retrievalRequest = {
    ...request,
    retrievalQuery,
    typoNormalizations,
    terminologyAliases: nvzTerminologyAliasPhrases(request.question, data || []),
    terminologyExpansionEnabled: isDocumentGroundedMatchConfiguration(retrievalQuery, data || []),
  };
  const candidates = (data || []).map((row, index) => ({ ...candidateFromRow(row, retrievalRequest), stage3Rank: index + 1 }));
  const suppliedEvidence = candidates.slice(0, aiAssistantConfig.retrievalLimit);
  const authorityReviewCandidates = candidates.slice(0, AUTHORITY_REVIEW_LIMIT);
  authorityReviewCandidates.forEach((candidate, index) => {
    candidate.authorityReview = { included: true, rank: index + 1, limit: AUTHORITY_REVIEW_LIMIT };
  });
  const evidence = evaluateEvidence(suppliedEvidence, aiAssistantConfig.evidenceThreshold);
  return {
    request, candidates, suppliedEvidence, authorityReviewCandidates, evidence, conflict: conservativeConflictDiagnostic(suppliedEvidence),
    environment: { embeddingModel: embedding.model || aiAssistantConfig.embeddingModel, embeddingDimensions: aiAssistantConfig.embeddingDimensions, evidenceThreshold: aiAssistantConfig.evidenceThreshold, retrievalLimit: aiAssistantConfig.retrievalLimit, authorityReviewLimit: AUTHORITY_REVIEW_LIMIT },
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
  return Object.freeze({ sufficient, threshold, topScore: top?.combinedScore ?? null, stage4Fallback: sufficient ? "Evidence meets the configured threshold." : INSUFFICIENT_EVIDENCE_ANSWER });
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

function candidateFromRow(row, request) {
  const candidate = {
    chunkId: row.chunk_id, documentId: row.document_id, documentVersionId: row.document_version_id, documentTitle: row.document_title,
    documentType: row.document_type, sourceClassification: governingSourceClass(row.document_type), documentAuthorityRank: Number(row.document_authority_rank), documentScopeKind: row.document_scope_kind,
    pageNumber: row.page_number, sectionLabel: row.section_label || "", heading: row.heading || "", ruleNumber: row.rule_number || "", content: row.content || "",
    semanticScore: number(row.semantic_score), keywordScore: number(row.keyword_score), exactScore: number(row.exact_score), authorityScore: number(row.authority_score), contextScore: number(row.context_score), combinedScore: number(row.combined_score), vectorRank: row.vector_rank ?? null, keywordRank: row.keyword_rank ?? null, exactMatch: Boolean(row.exact_match),
  };
  const query = request.retrievalQuery || request.question;
  const ftsTerms = normalizedFtsTerms(query);
  const intent = intentDiagnostic(query, candidate, request.terminologyExpansionEnabled);
  return {
    ...candidate,
    exactMatchReason: exactMatchReason(query, candidate),
    terminologyDiagnostic: terminologyDiagnostic(query, candidate, request.terminologyExpansionEnabled),
    leagueTextDiagnostic: leagueTextDiagnostic(query, candidate),
    ftsDiagnostic: {
      normalizedTerms: ftsTerms,
      retrievalExpansion: [...continuationExpansionPhrases(query), ...(request.terminologyAliases || [])],
      typoNormalization: request.typoNormalizations || [],
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
  const hasActivity = /\b(?:players?|participants?|teams?|games?|match(?:es)?|play(?:ing)?|finish|continue|complete)\b/.test(value);
  return hasInterruption && hasActivity ? ["cannot complete"] : [];
}

// This is an additive, context-bounded diagnostic for the matching SQL CTE.
// It never replaces the player's query or asserts a rule outcome; the active
// official corpus still supplies the candidate rules and their wording.
export function nvzTerminologyAliasPhrases(question, rows = []) {
  const value = String(question || "").toLowerCase();
  const mentionsAlias = /\b(?:kitchen|nvz)\b|\bnon[ -]volley\s+zone\b/.test(value);
  const pickleballContext = /\b(?:volley|serve|court|fault|step|momentum|paddle|ball|play(?:ing)?)\b/.test(value)
    || (/\b(?:non[ -]volley\s+zone|nvz)\b/.test(value) && /\b(?:what|where|define|dimension|zone|line)\b/.test(value));
  const corpus = rows.map((row) => [row?.content, row?.heading, row?.section_label].filter(Boolean).join(" ")).join(" ").toLowerCase();
  const officialTermPresent = /\bnon(?:-\s*|\s+)volley\s+zone\b/.test(corpus);
  return mentionsAlias && pickleballContext && officialTermPresent ? ["non-volley zone", "NVZ"] : [];
}

export function detectRetrievalIntent(question) {
  const value = String(question || "").toLowerCase();
  if (isConductIntent(value)) return "Behavior/conduct";
  const deadline = /\b(?:when|deadline|due|latest|early)\b/.test(value)
    || /\bhow\s+(?:early|long\s+before|many\s+(?:days?|hours?|weeks?)\s+before)\b/.test(value)
    || /\b(?:need|must|required)\s+(?:to\s+)?(?:be\s+)?(?:completed|submitted|done)\b/.test(value);
  const procedural = /\bhow\s+(?:do|can|to)\b/.test(value) || /\bwhere\s+(?:do|can)\b/.test(value) || /\bwhat\s+(?:button|screen)\b/.test(value);
  return [deadline && "Deadline/requirement", procedural && "Procedural/how-to"].filter(Boolean).join(" + ") || "None";
}

export function intentDiagnostic(question, candidate, terminologyEnabled = true) {
  const intent = detectRetrievalIntent(question);
  const searchable = [candidate.sectionLabel, candidate.heading, candidate.ruleNumber, candidate.content].filter(Boolean).join(" ").toLowerCase();
  if (intent === "None" || (intent !== "Behavior/conduct" && !hasDirectQueryPhrase(question, searchable) && terminologyDiagnostic(question, candidate, terminologyEnabled) === "None")) return { detectedIntent: intent, evidenceMatch: "None" };
  const concreteTiming = /\b(?:no\s+later\s+than|at\s+least|within)\b[\s\S]{0,60}\b(?:days?|hours?|weeks?)\b/.test(searchable) || /\b(?:deadline|due)\b/.test(searchable);
  const timing = concreteTiming || /\b(?:before|prior\s+to)\s+(?:the\s+)?(?:scheduled\s+)?(?:match|match\s+date|date)\b/.test(searchable);
  const procedure = /\b(?:click|button|select|enter|save|screen|dashboard|steps?|dropdown)\b/.test(searchable);
  const conductStandard = /\b(?:respect|respectful|sportsmanship|conduct|decorum|behavior)\b/.test(searchable);
  const conductExample = /\b(?:trash\s+talk|profanity|aggressive|abusive|harass(?:ment)?|paddle\s+throwing)\b/.test(searchable);
  const conductProhibition = /\b(?:avoid|prohibit(?:ed|ion)?|not\s+(?:be\s+)?tolerated|violation|disciplin(?:ary|e)|must|shall)\b/.test(searchable);
  const conductAudience = /\b(?:players?|opponents?|partners?|members?|captains?|spectators?)\b/.test(searchable);
  const matches = [];
  if (intent.includes("Deadline/requirement") && concreteTiming && /\b\d+(?:\.\d+)+\.\s/.test(candidate.content || "")) matches.push("Concrete timing requirement in numbered rule");
  else if (intent.includes("Deadline/requirement") && concreteTiming) matches.push("Concrete timing requirement");
  else if (intent.includes("Deadline/requirement") && timing) matches.push("General timing language");
  if (intent.includes("Procedural/how-to") && procedure) matches.push("Procedural instructions");
  if (matches.length) return { detectedIntent: intent, evidenceMatch: matches.join(" + ") };
  if (intent === "Behavior/conduct" && conductStandard && (conductExample || (conductProhibition && conductAudience))) return { detectedIntent: intent, evidenceMatch: "Behavioral standard and prohibition" };
  return { detectedIntent: intent, evidenceMatch: "None" };
}

export function terminologyDiagnostic(question, candidate, enabled = true) {
  const value = String(question || "").toLowerCase();
  const teamRoster = /\b(?:team|season|league|rosters?)\b/.test(value) && /\b(?:add|remove|delete|drop|update|change|lock|open|close|when|deadline|due|date)\b/.test(value);
  const asksForConfiguration = /\b(?:starting\s+)?lineups?\b|\brosters?\b|\bplayer\s+pairings?\b/.test(value)
    && /\b(?:when|deadline|due|latest|early|how|enter|submit|set|save|complete|change|assign)\b/.test(value);
  const searchable = [candidate.sectionLabel, candidate.heading, candidate.content].filter(Boolean).join(" ").toLowerCase();
  if (teamRoster && /\b(?:add|remove|delete|drop|update|change|lock|open|close)\b/.test(searchable) && /\b(?:player|players|team|rosters?)\b/.test(searchable)) return "Team/season roster management";
  return enabled && !teamRoster && asksForConfiguration && /\bmatch\s+setup\b/.test(searchable) && /\b(?:lineups?|rosters?|pairings?)\b/.test(searchable)
    ? "Individual-match Match Setup"
    : "None";
}

export function leagueTextDiagnostic(question, candidate) {
  const query = String(question || "").toLowerCase();
  const text = [candidate.sectionLabel, candidate.heading, candidate.content].filter(Boolean).join(" ").toLowerCase();
  const league = ["weekday", "primetime", "saturday"].find((term) => new RegExp(`\\b${term}\\b`).test(query) && new RegExp(`\\b${term}\\b`).test(text));
  return league ? `League-text/context compatibility: ${league}` : "None";
}

export function isDocumentGroundedMatchConfiguration(question, rows = []) {
  const value = String(question || "").toLowerCase();
  const hasConfiguration = /\b(?:starting\s+)?lineups?\b|\brosters?\b|\bplayer\s+pairings?\b/.test(value);
  const hasGuidanceIntent = /\b(?:when|deadline|due|latest|early|how|enter|submit|set|save|complete|change|assign)\b/.test(value);
  if (!hasConfiguration || !hasGuidanceIntent) return false;
  const corpus = rows.map((row) => [row?.content, row?.heading, row?.section_label].filter(Boolean).join(" ").toLowerCase()).join(" ");
  if (!/\bmatch\s+setup\b/.test(corpus) || !/\b(?:lineups?|rosters?|pairings?)\b/.test(corpus)) return false;
  const allowed = new Set(["lineup", "lineups", "roster", "rosters", "pairing", "pairings", "starting", "enter", "submit", "set", "save", "complete", "change", "assign"]);
  return normalizedFtsTerms(value).filter((term) => !allowed.has(term)).every((term) => new RegExp(`\\b${escapeRegExp(term)}\\b`, "i").test(corpus));
}

export function deriveTypoNormalizations(question, rows = []) {
  const vocabulary = new Map();
  const structural = new Set();
  for (const row of rows) {
    const text = [row?.content, row?.heading, row?.section_label].filter(Boolean).join(" ").toLowerCase();
    const heading = [row?.heading, row?.section_label].filter(Boolean).join(" ").toLowerCase();
    for (const term of text.match(/[a-z]{4,}/g) || []) vocabulary.set(term, (vocabulary.get(term) || 0) + 1);
    for (const term of heading.match(/[a-z]{4,}/g) || []) structural.add(term);
  }
  const words = String(question || "").match(/[A-Za-z]+/g) || [];
  const corrections = [];
  for (const original of words) {
    const source = original.toLowerCase();
    if (source.length < 4 || PROTECTED_FUZZY_TERMS.has(source) || QUERY_FRAMING_TERMS.has(source) || COMMON_QUERY_STOPWORDS.has(source) || vocabulary.has(source) || /^[A-Z0-9]{2,}$/.test(original)) continue;
    const limit = source.length <= 6 ? 1 : 2;
    const matches = [...vocabulary.keys()].filter((term) => !PROTECTED_FUZZY_TERMS.has(term) && Math.abs(term.length - source.length) <= limit && (vocabulary.get(term) >= 2 || structural.has(term))).map((term) => ({ term, distance: editDistance(source, term) })).filter((match) => match.distance <= limit).sort((a, b) => a.distance - b.distance || a.term.localeCompare(b.term));
    if (matches.length && (matches.length === 1 || matches[0].distance < matches[1].distance)) corrections.push({ from: source, to: matches[0].term });
  }
  // A missing space is a common typo. Join adjacent query words only when the
  // resulting compound already occurs often enough (or structurally) in the
  // retrieved official vocabulary; this is not a fixed phrase dictionary.
  for (let index = 0; index + 1 < words.length; index += 1) {
    const from = `${words[index].toLowerCase()} ${words[index + 1].toLowerCase()}`;
    const to = `${words[index]}${words[index + 1]}`.toLowerCase();
    if (!PROTECTED_FUZZY_TERMS.has(to) && vocabulary.has(to) && (vocabulary.get(to) >= 2 || structural.has(to))) corrections.push({ from, to });
  }
  return [...new Map(corrections.map((item) => [item.from, item])).values()].slice(0, 4);
}

export function applyTypoNormalizations(question, normalizations = []) {
  let value = String(question || "");
  for (const { from, to } of normalizations) value = value.replace(new RegExp(`\\b${from}\\b`, "gi"), to);
  return value;
}

function escapeRegExp(value) { return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

function editDistance(left, right) {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let i = 1; i <= left.length; i += 1) {
    const current = [i];
    for (let j = 1; j <= right.length; j += 1) current[j] = Math.min(current[j - 1] + 1, previous[j] + 1, previous[j - 1] + (left[i - 1] === right[j - 1] ? 0 : 1));
    previous.splice(0, previous.length, ...current);
  }
  return previous[right.length];
}

function exactMatchReason(question, candidate) {
  if (!candidate.exactMatch) return "None";
  const query = String(question || "");
  const words = query.toLowerCase().match(/[a-z0-9]+/g) || [];
  const searchable = [candidate.sectionLabel, candidate.heading, candidate.ruleNumber, candidate.content].filter(Boolean).join(" ").toLowerCase();
  const requestedRule = query.toLowerCase().match(/\b(?:rule\s*)?(\d{1,2}(?:\.(?:[a-z]|\d+)){1,6})\b/i)?.[1] || "";
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
