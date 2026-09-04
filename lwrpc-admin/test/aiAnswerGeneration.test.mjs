import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

process.env.LWR_AI_ENABLED = "true";
process.env.OPENAI_API_KEY = "test-key";
const { CONFLICT_ANSWER, INSUFFICIENT_EVIDENCE_ANSWER, OfficialAnswerModelError, citationLabel, citationPageNumber, generateOfficialAnswer, pageAwareOfficialDocumentUrl, resolveOfficialSources, selectAnswerEvidence, validateTrustedSources } = await import("../app/lib/aiAnswerGeneration.js");
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
      return completedResponse({ answer: "A player must follow the supplied official rule.", conflict: false, usage: { input_tokens: 100, output_tokens: 20, total_tokens: 120 } });
    },
  });
  assert.equal(request.model, "gpt-5.5");
  assert.equal(request.store, false);
  assert.equal(request.max_output_tokens, 700);
  assert.equal(request.text.format.type, "json_schema");
  assert.equal(request.text.format.name, "official_lwr_answer");
  assert.equal(request.text.format.strict, true);
  assert.deepEqual(request.text.format.schema.required, ["answer", "conflict"]);
  assert.deepEqual(request.text.format.schema.properties, { answer: { type: "string" }, conflict: { type: "boolean" } });
  assert.match(request.instructions, /ONLY the official LWR Pickleball Club evidence/i);
  assert.match(request.instructions, /Do not use general pickleball knowledge/i);
  assert.match(request.instructions, /Answer the question directly first/i);
  assert.match(request.instructions, /Supporting guidance may explain procedure but must never override/i);
  assert.match(request.input[0].content, /Evidence 1/);
  assert.match(request.input[0].content, /Primary/);
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
    fetchImpl: async () => completedResponse({ answer: "Do not return this answer.", conflict: true }),
  });
  assert.equal(result.answer, CONFLICT_ANSWER);
  assert.equal(result.conflict.requiresClarification, true);
  assert.equal(result.sources.length, 2);
});

test("prunes merely related deadline material while retaining same-rule and explicitly requested procedural support", () => {
  const deadline = retrievalFor("When does Match Setup need to be completed?", [
    stage4Chunk("rule-deadline", .66, { documentType: "league_rules", authorityRank: 1, ruleNumber: "3.4.1", intent: "Concrete timing requirement in numbered rule", content: "Match Setup must be completed no later than three days before the scheduled match." }),
    stage4Chunk("guide-overview", .63, { documentId: "guide", documentType: "captain_guide", authorityRank: 3, ruleNumber: "", intent: "General timing language", content: "Match Setup timing and overview for captains." }),
    stage4Chunk("guide-steps", .61, { documentId: "guide", documentType: "captain_guide", authorityRank: 3, ruleNumber: "", intent: "Procedural instructions", content: "Use the Match Setup screen to select and save the lineup." }),
    stage4Chunk("related-rule", .59, { documentId: "rules-2", documentType: "league_rules", authorityRank: 1, ruleNumber: "6.2", intent: "General timing language", content: "Match Setup reminders for another requirement." }),
  ]);
  const selectedDeadline = selectAnswerEvidence(deadline);
  assert.deepEqual(selectedDeadline.map((chunk) => chunk.chunkId), ["rule-deadline"]);
  assert.equal(selectedDeadline[0].evidenceRole, "Primary / controlling");

  const procedural = retrievalFor("When and how do I complete Match Setup?", [
    deadline.suppliedEvidence[0],
    stage4Chunk("guide-procedure", .63, { documentId: "guide", documentType: "captain_guide", authorityRank: 3, ruleNumber: "", intent: "Procedural instructions", content: "Click Match Setup and save the lineup." }),
  ]);
  const selectedProcedural = selectAnswerEvidence(procedural);
  assert.deepEqual(selectedProcedural.map((chunk) => chunk.chunkId), ["rule-deadline", "guide-procedure"]);
  assert.deepEqual(selectedProcedural.map((chunk) => chunk.evidenceRole), ["Primary / controlling", "Supporting"]);
});

test("marks a selected rule as controlling when a more relevant guide also supplies procedural support", () => {
  const selected = selectAnswerEvidence(retrievalFor("How do I complete Match Setup?", [
    stage4Chunk("guide-primary", .68, { documentId: "guide", documentType: "captain_guide", authorityRank: 3, ruleNumber: "", intent: "Procedural instructions", content: "Click Match Setup, select the lineup, and save." }),
    stage4Chunk("rule-control", .63, { documentId: "rules", documentType: "league_rules", authorityRank: 1, ruleNumber: "3.4.1", intent: "Concrete timing requirement in numbered rule", content: "Match Setup must be completed no later than three days before the match." }),
  ]));
  assert.deepEqual(selected.map((chunk) => chunk.chunkId), ["guide-primary", "rule-control"]);
  assert.deepEqual(selected.map((chunk) => chunk.evidenceRole), ["Supporting", "Primary / controlling"]);
  assert.equal(selected[1].evidenceSelectionReason, "Highest-authority selected rule evidence");
});

test("preserves compact primary evidence for the five production Stage 4 evaluation cases", () => {
  const cases = [
    ["Someone got hurt halfway through the game and can't finish. What do we do?", { documentType: "league_rules", authorityRank: 1, ruleNumber: "5.7", content: "A player who cannot finish an incomplete match is recorded according to the score." }],
    ["What does NR mean?", { documentType: "league_rules", authorityRank: 1, ruleNumber: "4.1.1", content: "A Reliability Factor below 29 is Not Rated (NR)." }],
    ["What type of balls will we be using?", { documentId: "captains", documentType: "captain_guide", authorityRank: 3, ruleNumber: "", content: "Match Balls: Franklin Outdoor X-40 Optic balls." }],
    ["When does Match Setup need to be completed?", { documentType: "league_rules", authorityRank: 1, ruleNumber: "3.4.1", intent: "Concrete timing requirement in numbered rule", content: "Match Setup must be completed three days before the scheduled match." }],
    ["Can I yell at or insult another player during a match?", { documentId: "conduct", documentType: "other", authorityRank: 2, ruleNumber: "1", intent: "Behavioral standard and prohibition", content: "Respectful conduct is required; abusive language is prohibited." }],
  ];
  for (const [question, options] of cases) {
    const selected = selectAnswerEvidence(retrievalFor(question, [stage4Chunk(`case-${options.ruleNumber || options.documentId}`, .58, options)]));
    assert.equal(selected.length, 1, question);
    assert.equal(selected[0].chunkId, `case-${options.ruleNumber || options.documentId}`, question);
  }
});

test("builds concise trusted citation labels without duplicated rule metadata", () => {
  assert.equal(citationLabel({ documentTitle: "LWR Pickleball Club Code of Conduct", ruleNumber: "1", heading: "Rule 1", pageNumber: 1 }), "LWR Pickleball Club Code of Conduct — Rule 1 — Page 1");
  assert.equal(citationLabel({ documentTitle: "LWR Pickleball Club DUPR League Rules", ruleNumber: "5.7", heading: "Rule 5.7 — Incomplete Matches", pageNumber: 5 }), "LWR Pickleball Club DUPR League Rules — Rule 5.7 — Incomplete Matches — Page 5");
  assert.equal(citationLabel({ documentTitle: "LWR Pickleball Club DUPR Captains Guide", sectionLabel: "League Fees and Waiver", pageNumber: 10 }), "LWR Pickleball Club DUPR Captains Guide — League Fees and Waiver — Page 10");
});

test("adds a browser-only PDF page fragment only for a valid cited chunk page", () => {
  const signedUrl = "https://storage.example.test/object/sign/ai-official-documents/captains-guide.pdf?token=real";
  assert.equal(pageAwareOfficialDocumentUrl(signedUrl, 1), `${signedUrl}#page=1`);
  assert.equal(pageAwareOfficialDocumentUrl(signedUrl, 10), `${signedUrl}#page=10`);
  assert.equal(pageAwareOfficialDocumentUrl(signedUrl, 17), `${signedUrl}#page=17`);
  assert.equal(pageAwareOfficialDocumentUrl(signedUrl, null), signedUrl);
  assert.equal(pageAwareOfficialDocumentUrl(signedUrl, 0), signedUrl);
  assert.equal(pageAwareOfficialDocumentUrl(signedUrl, "not-a-page"), signedUrl);
  assert.equal(citationPageNumber("10"), 10);
  assert.equal(citationPageNumber(-1), null);
});

test("classifies a native Responses API refusal without exposing its text", async () => {
  await assert.rejects(
    generateWithResponse({ status: "completed", output: [messageOutput([{ type: "refusal", refusal: "I cannot answer that." }])] }),
    modelError("model_refusal"),
  );
});

test("classifies an incomplete max-output-token Responses result", async () => {
  await assert.rejects(
    generateWithResponse({ status: "incomplete", incomplete_details: { reason: "max_output_tokens" }, output: [] }),
    modelError("incomplete_max_output_tokens"),
  );
});

test("classifies missing, malformed, and schema-invalid native structured output", async () => {
  await assert.rejects(generateWithResponse({ status: "completed", output: [messageOutput([])] }), modelError("missing_structured_output"));
  await assert.rejects(generateWithResponse({ status: "completed", output: [messageOutput([{ type: "output_text", text: "```json\n{ bad json }\n```" }])] }), modelError("response_extraction_parsing_failure"));
  await assert.rejects(generateWithResponse({ status: "completed", output: [messageOutput([{ type: "output_text", text: JSON.stringify({ answer: "An answer", conflict: "false" }) }])] }), modelError("schema_validation_failure"));
});

test("classifies an API failure separately from structured-output failures", async () => {
  await assert.rejects(
    generateOfficialAnswer({
      retrieval: sufficientRetrieval(), supabase: null,
      resolveSources: async (_supabase, evidence) => evidence.map((chunk) => sourceFor(chunk)),
      fetchImpl: async () => ({ ok: false, status: 400, json: async () => ({ error: { code: "invalid_request_error" } }) }),
    }),
    (error) => error instanceof OfficialAnswerModelError && error.category === "api_request_failure" && error.safeDiagnostic.providerCode === "invalid_request_error",
  );
});

test("classifies an unparsable successful API payload as response extraction failure", async () => {
  await assert.rejects(
    generateOfficialAnswer({
      retrieval: sufficientRetrieval(), supabase: null,
      resolveSources: async (_supabase, evidence) => evidence.map((chunk) => sourceFor(chunk)),
      fetchImpl: async () => ({ ok: true, status: 200, json: async () => { throw new Error("not JSON"); } }),
    }),
    modelError("response_extraction_parsing_failure"),
  );
});

test("rejects citations that are not from supplied exact active-version evidence", () => {
  const evidence = selectAnswerEvidence(sufficientRetrieval());
  assert.throws(() => validateTrustedSources(evidence, [sourceFor(evidence[0]), { ...sourceFor(evidence[1]), chunkId: "not-supplied" }]), /citation did not correspond/i);
});

test("uses the explicit ownership FK in the production dual-relationship schema and revalidates the cited searchable chunk", async () => {
  const evidence = [selectAnswerEvidence(sufficientRetrieval())[0]];
  const calls = [];
  const versionQuery = { select(value) { calls.push(["versions-select", value]); return this; }, in(column, values) { calls.push(["versions-in", column, values]); return Promise.resolve({ data: [{ id: "version-1", document_id: "document-1", storage_bucket: "ai-official-documents", storage_path: "documents/document-1/version-1/rules.pdf", processing_status: "ready", document: { id: "document-1", title: "LWR League Rules", status: "active", active_version_id: "version-1" } }], error: null }); } };
  const chunkQuery = { select(value) { calls.push(["chunks-select", value]); return this; }, in(column, values) { calls.push(["chunks-in", column, values]); return Promise.resolve({ data: [{ id: "chunk-1", document_version_id: "version-1", is_searchable: true, page_number: 5, rule_number: "5.7", section_label: "Incomplete Matches", heading: "Incomplete Matches" }], error: null }); } };
  const supabase = { from: (table) => table === "ai_document_versions" ? versionQuery : chunkQuery, storage: { from: () => ({ createSignedUrl: async () => ({ data: { signedUrl: "https://storage.example.test/rules.pdf?token=real" }, error: null }) }) } };
  const [source] = await resolveOfficialSources(supabase, evidence);
  assert.match(calls[0][1], /ai_document_versions_document_id_fkey!inner/);
  assert.deepEqual(calls[2], ["chunks-select", "id, document_version_id, is_searchable, page_number, rule_number, section_label, heading"]);
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

function retrievalFor(question, suppliedEvidence) {
  return { request: { question }, evidence: { sufficient: true, threshold: .35 }, suppliedEvidence };
}

function stage4Chunk(chunkId, combinedScore, options = {}) {
  return {
    ...chunk(chunkId, combinedScore, .85, .5, options.content || "Official evidence"),
    documentId: options.documentId || "rules", documentVersionId: "version-1", documentType: options.documentType || "league_rules", documentAuthorityRank: options.authorityRank ?? 1,
    ruleNumber: options.ruleNumber ?? "3.4.1", sectionLabel: options.sectionLabel || "Match Setup", heading: options.heading || "Match Setup",
    intentDiagnostic: { evidenceMatch: options.intent || "None" },
  };
}

function completedResponse({ answer, conflict, usage = {} }) {
  return {
    ok: true,
    status: 200,
    json: async () => ({ object: "response", id: "resp_test", status: "completed", model: "gpt-5.5", output: [
      { type: "reasoning", id: "rs_test", summary: [] },
      messageOutput([{ type: "output_text", text: JSON.stringify({ answer, conflict }), annotations: [] }]),
    ], usage }),
  };
}

function messageOutput(content) {
  return { type: "message", id: "msg_test", status: "completed", role: "assistant", content };
}

function generateWithResponse(result) {
  return generateOfficialAnswer({
    retrieval: sufficientRetrieval(), supabase: null,
    resolveSources: async (_supabase, evidence) => evidence.map((chunk) => sourceFor(chunk)),
    fetchImpl: async () => ({ ok: true, status: 200, json: async () => ({ object: "response", id: "resp_test", model: "gpt-5.5", ...result }) }),
  });
}

function modelError(category) {
  return (error) => error instanceof OfficialAnswerModelError && error.category === category;
}
