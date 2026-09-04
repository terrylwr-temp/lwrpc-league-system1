import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

process.env.LWR_AI_ENABLED = "true";
process.env.OPENAI_API_KEY = "test-key";
const { CONFLICT_ANSWER, INSUFFICIENT_EVIDENCE_ANSWER, generateOfficialAnswer, resolveOfficialSources, selectAnswerEvidence, validateTrustedSources } = await import("../app/lib/aiAnswerGeneration.js");
const { AI_RETRIEVAL_EVALUATION_SET } = await import("../app/lib/aiRetrievalEvaluation.js");

test("skips the answer model and returns the exact fallback when Stage 3 evidence is insufficient", async () => {
  let modelCalls = 0;
  const result = await generateOfficialAnswer({
    retrieval: { evidence: { sufficient: false, threshold: .35, stage4Fallback: INSUFFICIENT_EVIDENCE_ANSWER }, suppliedEvidence: [] },
    supabase: null,
    fetchImpl: async () => { modelCalls += 1; throw new Error("must not call model"); },
  });
  assert.equal(modelCalls, 0);
  assert.equal(result.answer, INSUFFICIENT_EVIDENCE_ANSWER);
  assert.equal(result.evidenceSufficient, false);
  assert.equal(result.modelCallSkipped, true);
  assert.deepEqual(result.sources, []);
});

test("selects direct high-quality evidence, grounds the Responses request, and attaches only trusted sources", async () => {
  const retrieval = sufficientRetrieval();
  assert.deepEqual(selectAnswerEvidence(retrieval).map((item) => item.chunkId), ["chunk-1", "chunk-2"]);
  let request;
  const result = await generateOfficialAnswer({
    retrieval,
    supabase: null,
    resolveSources: async (_supabase, evidence) => evidence.map((chunk) => sourceFor(chunk)),
    fetchImpl: async (_url, options) => {
      request = JSON.parse(options.body);
      return { ok: true, json: async () => ({ model: "gpt-5.5", output_text: JSON.stringify({ answer: "A player must follow the supplied official rule.", conflict: false }), usage: { input_tokens: 100, output_tokens: 20, total_tokens: 120 } }) };
    },
  });
  assert.equal(request.model, "gpt-5.5");
  assert.equal(request.store, false);
  assert.equal(request.max_output_tokens, 700);
  assert.match(request.instructions, /ONLY the official LWR Pickleball Club evidence/i);
  assert.match(request.instructions, /Do not use general pickleball knowledge/i);
  assert.match(request.input[0].content, /Evidence 1/);
  assert.match(request.input[0].content, /official rule evidence/);
  assert.doesNotMatch(request.input[0].content, /tangential evidence/i);
  assert.equal(result.answer, "A player must follow the supplied official rule.");
  assert.equal(result.evidenceSufficient, true);
  assert.equal(result.modelCallSkipped, false);
  assert.deepEqual(result.sources.map((source) => source.chunkId), ["chunk-1", "chunk-2"]);
  assert.equal(result.metrics.inputTokens, 100);
  assert.equal(result.metrics.outputTokens, 20);
  assert.equal(result.metrics.estimatedGenerationCostUsd, .0011);
});

test("returns a conservative clarification instead of a definitive model answer when supplied evidence conflicts", async () => {
  const result = await generateOfficialAnswer({
    retrieval: sufficientRetrieval(), supabase: null,
    resolveSources: async (_supabase, evidence) => evidence.map((chunk) => sourceFor(chunk)),
    fetchImpl: async () => ({ ok: true, json: async () => ({ model: "gpt-5.5", output_text: JSON.stringify({ answer: "Do not return this answer.", conflict: true }), usage: {} }) }),
  });
  assert.equal(result.answer, CONFLICT_ANSWER);
  assert.equal(result.conflict.requiresClarification, true);
  assert.equal(result.sources.length, 2);
});

test("rejects citations that are not from supplied exact active-version evidence", () => {
  const evidence = selectAnswerEvidence(sufficientRetrieval());
  assert.throws(() => validateTrustedSources(evidence, [sourceFor(evidence[0]), { ...sourceFor(evidence[1]), chunkId: "not-supplied" }]), /citation did not correspond/i);
});

test("uses the explicit ownership FK in the production dual-relationship schema and revalidates the cited searchable chunk", async () => {
  const evidence = [selectAnswerEvidence(sufficientRetrieval())[0]];
  const calls = [];
  const versionQuery = { select(value) { calls.push(["versions-select", value]); return this; }, in(column, values) { calls.push(["versions-in", column, values]); return Promise.resolve({ data: [{ id: "version-1", document_id: "document-1", storage_bucket: "ai-official-documents", storage_path: "documents/document-1/version-1/rules.pdf", processing_status: "ready", document: { id: "document-1", title: "LWR League Rules", status: "active", active_version_id: "version-1" } }], error: null }); } };
  const chunkQuery = { select(value) { calls.push(["chunks-select", value]); return this; }, in(column, values) { calls.push(["chunks-in", column, values]); return Promise.resolve({ data: [{ id: "chunk-1", document_version_id: "version-1", is_searchable: true }], error: null }); } };
  const supabase = { from: (table) => table === "ai_document_versions" ? versionQuery : chunkQuery, storage: { from: () => ({ createSignedUrl: async () => ({ data: { signedUrl: "https://storage.example.test/rules.pdf?token=real" }, error: null }) }) } };
  const [source] = await resolveOfficialSources(supabase, evidence);
  assert.match(calls[0][1], /ai_document_versions_document_id_fkey!inner/);
  assert.deepEqual(calls[2], ["chunks-select", "id, document_version_id, is_searchable"]);
  assert.equal(source.documentVersionId, "version-1");
  assert.equal(source.officialDocumentUrl, "https://storage.example.test/rules.pdf?token=real#page=5");
});

test("protects the answer route and preserves the required Stage 4 evaluation prompts", async () => {
  const route = await readFile(new URL("../app/api/ai-assistant/answer/route.js", import.meta.url), "utf8");
  assert.match(route, /authorizeAdminRequest\(req, "league_manager"\)/);
  assert.match(route, /generateOfficialAnswer/);
  for (const question of ["What does NR mean?", "What is the Reliability Factor requirement?", "How does scoring freeze work?", "Someone got hurt halfway through the game and can't finish. What do we do?", "What type of balls will we be using?", "When does Match Setup need to be completed?", "How do I complete Match Setup in the LMS?", "How does a Picklebreaker work?", "Can I yell at or insult another player during a match?", "What happens if a player is verbally abusive to another player?", "Can I make an aggressive serve?"]) assert.ok(AI_RETRIEVAL_EVALUATION_SET.includes(question));
});

function sufficientRetrieval() {
  return {
    request: { question: "What is the official rule?" },
    evidence: { sufficient: true, threshold: .35 },
    suppliedEvidence: [
      chunk("chunk-1", .52, .85, 0, "official rule evidence"),
      chunk("chunk-2", .45, 0, .4, "supporting official rule evidence"),
      chunk("chunk-3", .43, 0, 0, "tangential evidence"),
      chunk("chunk-4", .29, .85, 0, "below threshold evidence"),
    ],
  };
}

function chunk(chunkId, combinedScore, exactScore, keywordScore, content) {
  return { chunkId, documentId: "document-1", documentVersionId: "version-1", documentTitle: "LWR League Rules", pageNumber: 5, ruleNumber: "5.7", sectionLabel: "Incomplete Matches", heading: "Incomplete Matches", combinedScore, exactScore, keywordScore, intentDiagnostic: { evidenceMatch: "None" }, content };
}

function sourceFor(chunk) {
  return { documentId: chunk.documentId, documentVersionId: chunk.documentVersionId, chunkId: chunk.chunkId, documentTitle: chunk.documentTitle, pageNumber: chunk.pageNumber, ruleNumber: chunk.ruleNumber, sectionLabel: chunk.sectionLabel, heading: chunk.heading, citation: `${chunk.documentTitle} — Rule ${chunk.ruleNumber} — Page ${chunk.pageNumber}`, officialDocumentUrl: `https://storage.example.test/${chunk.chunkId}#page=${chunk.pageNumber}` };
}
