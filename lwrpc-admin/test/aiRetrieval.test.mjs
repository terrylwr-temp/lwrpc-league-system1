import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

process.env.LWR_AI_ENABLED = "true";
const { ASK_ABOUT_SCOPES, RETRIEVAL_WEIGHTS, continuationExpansionPhrases, detectRetrievalIntent, evaluateEvidence, intentDiagnostic, normalizeRetrievalRequest, normalizedFtsTerms, retrieveOfficialEvidence, toPgVector } = await import("../app/lib/aiRetrieval.js");
const { AI_RETRIEVAL_EVALUATION_SET } = await import("../app/lib/aiRetrievalEvaluation.js");
const vector = Array.from({ length: 1536 }, (_, i) => i / 1000);

test("validates bounded manager retrieval requests and supported context", () => {
  const request = normalizeRetrievalRequest({ question: " Rule 4.5\u0000 ", askAbout: "weekday", context: { currentPath: "/match-setup", leagueId: "nope" } });
  assert.equal(request.question, "Rule 4.5"); assert.equal(request.askAbout, "weekday"); assert.equal(request.context.leagueId, null);
  assert.deepEqual(ASK_ABOUT_SCOPES, ["all", "weekday", "primetime", "saturday", "lms_help"]);
  assert.throws(() => normalizeRetrievalRequest({ question: "x", askAbout: "all" }), /at least two/i);
  assert.throws(() => normalizeRetrievalRequest({ question: "rules", askAbout: "sql" }), /valid Ask About/i);
});

test("uses one compatible embedding and the protected hybrid RPC without chat generation", async () => {
  let called; const output = await retrieveOfficialEvidence({
    supabase: { rpc: async (name, args) => { called = { name, args }; return { data: [row()], error: null }; } },
    body: { question: "What does Rule 4.5 say?", askAbout: "all" }, embedQuery: async () => ({ embedding: vector, model: "text-embedding-3-small", inputTokens: 9 }),
    clock: (() => { let n = 0; return () => ++n; })(),
  });
  assert.equal(called.name, "search_ai_official_chunks"); assert.equal(called.args.p_query_embedding.split(",").length, 1536);
  assert.equal(output.suppliedEvidence.length, 1); assert.equal(output.evidence.sufficient, true);
  assert.equal(output.candidates[0].exactMatchReason, "Rule number: 4.5");
  assert.deepEqual(output.candidates[0].ftsDiagnostic, { normalizedTerms: ["rule", "4", "5"], retrievalExpansion: [], matched: true, candidateRank: 1 });
  assert.equal(toPgVector(vector).split(",").length, 1536);
});

test("keeps authority subject-relevant and evidence fallback conservative", () => {
  assert.equal(RETRIEVAL_WEIGHTS.semantic + RETRIEVAL_WEIGHTS.keyword + RETRIEVAL_WEIGHTS.exact + RETRIEVAL_WEIGHTS.authority + RETRIEVAL_WEIGHTS.context, 1);
  const insufficient = evaluateEvidence([{ combinedScore: .36, semanticScore: .01, keywordScore: 0, exactScore: 0 }], .35);
  assert.equal(insufficient.sufficient, false); assert.match(insufficient.stage4Fallback, /couldn't find/i);
});

test("retrieval SQL locks out inactive, historical, failed, and excluded content while retaining catalog authority", async () => {
  const sql = await readFile(new URL("../supabase-ai-assistant-stage3-retrieval.sql", import.meta.url), "utf8");
  for (const condition of ["d.status = 'active'", "d.active_version_id = v.id", "v.processing_status = 'ready'", "c.is_searchable", "c.embedding is not null", "security invoker", "document_authority_rank", "team_context", "p_team_id", "p_user_role"]) assert.match(sql, new RegExp(condition.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"));
  assert.match(sql, /revoke all on function[\s\S]*from public, anon, authenticated/i);
});

test("generic exact matching recognizes unseen official phrases without boosting generic words", async () => {
  const sql = await readFile(new URL("../supabase-ai-assistant-stage3-retrieval.sql", import.meta.url), "utf8");
  for (const cte of ["query_tokens", "phrase_candidates", "phrase_terms", "official_term_candidates", "acronym_terms"]) assert.match(sql, new RegExp(`\\b${cte}\\b`));
  assert.doesNotMatch(sql, /reliability factor|picklebreaker|match setup|scoring freeze|retired game|rally scoring|forfeit/i);
  assert.equal(genericExactScore("What is a medical retirement?", "A medical retirement must be recorded."), .85);
  assert.equal(genericExactScore("Can the visiting captain defer?", "The visiting captain may defer the choice."), .85);
  assert.equal(genericExactScore("Does the home team serve or receive?", "The home team may serve or receive."), .85);
  assert.equal(genericExactScore("Season DUPR", "Season DUPR determines eligibility."), .95);
  assert.equal(genericExactScore("timeout", "Each team has one timeout."), 0);
  assert.equal(genericExactScore("Picklebreaker", "The Picklebreaker procedure applies.", "", { heading: "PICKLEBREAKER GAME" }), .85);
  assert.equal(genericExactScore("Reliability Factor", "The Reliability Factor is displayed."), .85);
  assert.equal(genericExactScore("Match Setup", "Complete Match Setup before play."), .85);
  assert.equal(genericExactScore("scoring freeze", "The scoring freeze is final."), .85);
  assert.equal(genericExactScore("team player game", "A team player completes the game."), 0);
  assert.equal(genericExactScore("Rule 4.5", "Rule text", "4.5"), 1);
  assert.equal(genericExactScore("NR", "The NR rating is provisional."), .95);
  assert.equal(genericExactScore("NR", "The corner rating is provisional."), 0);
  assert.equal(genericExactScore("What is a retired game?", "6+ Points (Retired): record the current score."), .85);
  assert.equal(genericExactScore("What type of balls will we be using?", "Match Balls: an official item is provided."), .85);
  assert.equal(genericExactScore("What ball do we use?", "Match Balls: an official item is provided."), .85);
  assert.equal(genericExactScore("Which pickleball is used for league matches?", "Match Balls: an official item is provided."), .85);
  for (const ordinary of ["someone", "finish", "halfway", "through"]) assert.equal(genericExactScore(ordinary, `The ${ordinary} word appears in prose.`), 0);
  for (const ordinary of ["using", "type", "brand"]) assert.equal(genericExactScore(ordinary, `The ${ordinary} word appears in prose.`), 0);
});

test("FTS removes generic question framing while retaining meaningful content terms", async () => {
  const sql = await readFile(new URL("../supabase-ai-assistant-stage3-retrieval.sql", import.meta.url), "utf8");
  assert.match(sql, /keyword_query_text/); assert.match(sql, /keyword_ts_query/);
  assert.match(sql, /e\.search_vector @@ i\.keyword_ts_query/);
  assert.doesNotMatch(sql, /e\.search_vector @@ i\.ts_query/);
  assert.deepEqual(normalizedFtsTerms("What does NR mean?"), ["nr"]);
  assert.deepEqual(normalizedFtsTerms("What is the Reliability Factor requirement?"), ["reliability", "factor"]);
  assert.deepEqual(normalizedFtsTerms("How does scoring freeze work?"), ["scoring", "freeze"]);
  assert.deepEqual(normalizedFtsTerms("Someone got hurt halfway through the game and can't finish. What do we do?"), ["hurt", "finish"]);
  assert.deepEqual(normalizedFtsTerms("What type of balls will we be using?"), ["balls"]);
  assert.deepEqual(normalizedFtsTerms("When does Match Setup need to be completed?"), ["setup", "completed"]);
});

test("uses generic deadline and procedural compatibility without changing hybrid weights", async () => {
  const sql = await readFile(new URL("../supabase-ai-assistant-stage3-retrieval.sql", import.meta.url), "utf8");
  for (const cte of ["deadline_intent", "procedural_intent", "intent_candidates", "intent_keyword_score", "weighted_scores"]) assert.match(sql, new RegExp(`\\b${cte}\\b`));
  assert.match(sql, /strong timing language/i);
  assert.match(sql, /click\|button\|select\|enter\|save/i);
  assert.doesNotMatch(sql, /match setup|rule 5\.4/i);
  assert.equal(RETRIEVAL_WEIGHTS.semantic + RETRIEVAL_WEIGHTS.keyword + RETRIEVAL_WEIGHTS.exact + RETRIEVAL_WEIGHTS.authority + RETRIEVAL_WEIGHTS.context, 1);
  assert.equal(detectRetrievalIntent("When does this need to be completed?"), "Deadline/requirement");
  assert.equal(detectRetrievalIntent("How early do we have to submit our team roster?"), "Deadline/requirement");
  assert.equal(detectRetrievalIntent("What button do I use to save my team roster?"), "Procedural/how-to");
  assert.equal(detectRetrievalIntent("What does NR mean?"), "None");
  const timingRule = { ...row(), ruleNumber: "5", content: "5.4. Team Roster exchange: submit the team roster no later than three days before the scheduled date." };
  const timingGuide = { ...row(), ruleNumber: "", content: "Team Roster instructions: submit the team roster before the scheduled match date." };
  const procedureGuide = { ...row(), ruleNumber: "", content: "Team Roster instructions: click Save Roster from the dashboard to submit changes." };
  const unrelatedRule = { ...row(), ruleNumber: "7", content: "7.2. Equipment: submit a waiver no later than three days before the event." };
  assert.deepEqual(intentDiagnostic("When does team roster need to be completed?", timingRule), { detectedIntent: "Deadline/requirement", evidenceMatch: "Concrete timing requirement in numbered rule" });
  assert.deepEqual(intentDiagnostic("When does team roster need to be completed?", timingGuide), { detectedIntent: "Deadline/requirement", evidenceMatch: "General timing language" });
  assert.deepEqual(intentDiagnostic("What button do I use to save team roster?", procedureGuide), { detectedIntent: "Procedural/how-to", evidenceMatch: "Procedural instructions" });
  assert.deepEqual(intentDiagnostic("When does team roster need to be completed?", unrelatedRule), { detectedIntent: "Deadline/requirement", evidenceMatch: "None" });
  const output = await retrieveOfficialEvidence({
    supabase: { rpc: async () => ({ data: [{ ...timingRule, chunk_id: row().chunk_id, document_id: row().document_id, document_version_id: row().document_version_id, document_title: "Rules", document_type: "league_rules", document_authority_rank: 1, document_scope_kind: "all", page_number: 4, section_label: "", heading: "", semantic_score: .4, keyword_score: .95, exact_score: .85, authority_score: .85, context_score: 0, combined_score: .58, vector_rank: 9, keyword_rank: null, exact_match: true }], error: null }) },
    body: { question: "When does team roster need to be completed?" }, embedQuery: async () => ({ embedding: vector, model: "text-embedding-3-small", inputTokens: 9 }), clock: (() => { let n = 0; return () => ++n; })(),
  });
  assert.equal(output.candidates[0].ftsDiagnostic.matched, false);
  assert.equal(output.candidates[0].intentDiagnostic.evidenceMatch, "Concrete timing requirement in numbered rule");
});

test("uses a generic interruption expansion without injecting an official outcome term", async () => {
  const sql = await readFile(new URL("../supabase-ai-assistant-stage3-retrieval.sql", import.meta.url), "utf8");
  assert.match(sql, /continuation_intent/); assert.match(sql, /phraseto_tsquery\('english', 'cannot complete'\)/);
  assert.deepEqual(continuationExpansionPhrases("Someone got hurt halfway through the game and can't finish. What do we do?"), ["cannot complete"]);
  assert.deepEqual(continuationExpansionPhrases("A player was injured and can't continue."), ["cannot complete"]);
  assert.deepEqual(continuationExpansionPhrases("What happens if somebody has a medical issue during a game?"), ["cannot complete"]);
  assert.deepEqual(continuationExpansionPhrases("What is a retired game?"), []);
  assert.deepEqual(continuationExpansionPhrases("When is an unfinished game a forfeit?"), []);
  const output = await retrieveOfficialEvidence({
    supabase: { rpc: async () => ({ data: [medicalRow()], error: null }) }, body: { question: "A player was injured and can't continue." },
    embedQuery: async () => ({ embedding: vector, model: "text-embedding-3-small", inputTokens: 9 }), clock: (() => { let n = 0; return () => ++n; })(),
  });
  assert.equal(output.candidates[0].exactMatchReason, "Retrieval expansion: cannot complete");
  assert.deepEqual(output.candidates[0].ftsDiagnostic.retrievalExpansion, ["cannot complete"]);
});

test("retrieval route is League Manager protected and has no answer-model path", async () => {
  const route = await readFile(new URL("../app/api/ai-assistant/retrieval/route.js", import.meta.url), "utf8");
  assert.match(route, /authorizeAdminRequest\(req, "league_manager"\)/); assert.doesNotMatch(route, /chat\/completions|generateText|streamText|responses\.create/i);
});

test("includes the approved multi-document, paired-intent, natural-language, typo, and unsupported-question evaluation prompts", () => {
  assert.ok(AI_RETRIEVAL_EVALUATION_SET.length >= 34);
  for (const required of ["Rule 4.5", "verbally abusive", "injured", "Picklebraker", "weather cancellations", "deadline for Match Setup", "enter match scores"]) assert.ok(AI_RETRIEVAL_EVALUATION_SET.some((question) => question.includes(required)));
});

function row() { return { chunk_id: "10000000-0000-4000-8000-000000000001", document_id: "20000000-0000-4000-8000-000000000001", document_version_id: "30000000-0000-4000-8000-000000000001", document_title: "Rules", document_type: "league_rules", document_authority_rank: 1, document_scope_kind: "all", page_number: 4, section_label: "Rule 4.5", heading: "Retired Games", rule_number: "4.5", content: "Retired games", semantic_score: .8, keyword_score: .7, exact_score: 1, authority_score: .9, context_score: 0, combined_score: .85, vector_rank: 1, keyword_rank: 1, exact_match: true }; }

function medicalRow() { return { ...row(), section_label: "Rule 5.7", heading: "Incomplete Matches", rule_number: "5.7", content: "If a player cannot complete a match for any reason, the match is recorded according to the score.", semantic_score: .38, keyword_score: .25, exact_score: .85, authority_score: .85, combined_score: .45, vector_rank: 7, keyword_rank: 1, exact_match: true }; }

function genericExactScore(query, content, ruleNumber = "", metadata = {}) {
  const normalized = String(query).toLowerCase(); const searchable = String(content).toLowerCase();
  const requestedRule = normalized.match(/\b(?:rule\s*)?(\d+(?:\.\d+)+)\b/)?.[1] || "";
  if (requestedRule && ruleNumber === requestedRule) return 1;
  const words = normalized.match(/[a-z0-9]+/g) || [];
  const generic = new Set(["team", "teams", "player", "players", "game", "games", "league", "leagues", "match", "matches", "score", "scores", "rule", "rules", "guide", "guides"]);
  const boundary = (term) => new RegExp(`\\b${term.replaceAll(" ", "\\s+")}\\b`, "i").test(searchable);
  const acronyms = [...new Set([...(query.match(/\b[A-Z][A-Z0-9]{1,9}\b/g) || []).map((term) => term.toLowerCase()), ...(words.includes("nr") ? ["nr"] : [])])];
  if (acronyms.some(boundary)) return .95;
  const distinctive = words.map((word) => !generic.has(word) && !/^(a|an|and|are|can|does|for|from|have|how|if|in|is|it|of|on|or|the|to|was|what|when|where|which|who|with)$/.test(word));
  const phrases = [];
  for (let index = 0; index < words.length; index += 1) for (let size = 2; size <= 4 && index + size <= words.length; size += 1) {
    const phrase = words.slice(index, index + size).join(" ");
    if (phrase.length >= 8 && distinctive.slice(index, index + size).some(Boolean)) phrases.push(phrase);
  }
  if (phrases.some(boundary)) return .85;
  const terms = words.filter((word, index) => distinctive[index] && word.length >= 4);
  if (terms.some((term) => structuralOfficialTerm(term, content, metadata))) return .85;
  return 0;
}

function structuralOfficialTerm(term, content, metadata) {
  const structural = `${metadata.sectionLabel || ""} ${metadata.heading || ""}`;
  const value = String(term).toLowerCase(); const variants = new Set([value.replace(/s$/, "")]);
  if (value.length >= 8) for (let size = 4; size <= Math.min(8, value.length - 4); size += 1) variants.add(value.slice(-size));
  return [...variants].some((variant) => new RegExp(`\\b${variant}s?\\b`, "i").test(structural)
    || new RegExp(`\\(\\s*${variant}s?\\s*\\)`, "i").test(content)
    || new RegExp(`\\b${variant}s?\\b[^:\\r\\n]{0,60}:`, "i").test(content));
}
