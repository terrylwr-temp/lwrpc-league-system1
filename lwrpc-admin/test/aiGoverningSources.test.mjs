import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { defaultDocumentAuthorityRank, normalizeDocumentMetadata, documentMetadataForm } from "../app/lib/aiDocumentMetadata.js";
import { governingSourceClass, INSUFFICIENT_EVIDENCE_ANSWER } from "../app/lib/aiGoverningSources.js";
process.env.OPENAI_API_KEY ||= "fixture-key";
const { selectAnswerEvidence, generateOfficialAnswer } = await import("../app/lib/aiAnswerGeneration.js");
const { evaluateEvidence } = await import("../app/lib/aiRetrieval.js");

// Controlled synthetic evidence: these are selector fixtures, not a transcription
// or certification of the actual 2026 rulebook. Production PDF review is pending.
function evidence(id, type, content, extra = {}) {
  return { chunkId: id, documentId: id, documentVersionId: `${id}-v1`, documentTitle: id, documentType: type, documentAuthorityRank: defaultDocumentAuthorityRank(type), content, combinedScore: .6, exactScore: .8, keywordScore: .5, pageNumber: 1, ...extra };
}
const usap = (content, extra) => evidence("usap", "usap_rulebook", content, extra);
const lwr = (content, extra) => evidence("lwr", "league_rules", content, extra);
const retrieval = (question, suppliedEvidence) => ({ request: { question }, evidence: { sufficient: true, threshold: .35 }, suppliedEvidence });
const ids = (selected) => selected.map(({ chunkId }) => chunkId);
const source = (item) => ({ ...item, officialDocumentUrl: "https://example.test/fixture.pdf", citation: item.documentTitle });

async function generate(input, expected) {
  let request;
  const answer = await generateOfficialAnswer({ retrieval: input, supabase: null, resolveSources: async (_, selected) => selected.map(source), fetchImpl: async (_, options) => {
    request = JSON.parse(options.body);
    return { ok: true, json: async () => ({ status: "completed", output_text: JSON.stringify({ answer: expected, conflict: false }) }) };
  } });
  return { answer, request };
}

test("LMS-0706 catalog type, default rank, edit roundtrip and exact fallback", async () => {
  const metadata = normalizeDocumentMetadata({ title: "2026 USA Pickleball Official Rulebook", documentType: "usap_rulebook", scopeKind: "all" });
  assert.equal(metadata.document_type, "usap_rulebook");
  assert.equal(metadata.authority_rank, 2);
  assert.equal(documentMetadataForm(metadata).documentType, "usap_rulebook");
  assert.equal(defaultDocumentAuthorityRank("league_supplement"), 1);
  assert.equal(governingSourceClass("captain_guide"), "lwr_supporting_guide");
  assert.equal(INSUFFICIENT_EVIDENCE_ANSWER, "I couldn't find an applicable rule or guide in the official LWR Pickleball Club or USA Pickleball materials. Please contact League Management for clarification.");
  assert.equal(evaluateEvidence([], .35).stage4Fallback, INSUFFICIENT_EVIDENCE_ANSWER);
  const sql = await readFile(new URL("../supabase-ai-assistant-lms-0706-usap-rulebook.sql", import.meta.url), "utf8");
  assert.match(sql, /drop constraint ai_documents_document_type_check/);
  for (const type of ["league_rules", "league_supplement", "usap_rulebook", "captain_guide", "player_guide", "lms_guide", "other"]) assert.ok(sql.includes(`'${type}'`));
  assert.doesNotMatch(sql, /create table|create policy|storage\.|create.*function/i);
});

for (const [name, question, localText, usapText, ruleNumber] of [
  ["medical retirement", "Someone got hurt halfway through the game and can't finish. What do we do?", "A player who cannot finish an incomplete match must have the score recorded under the LWR retirement procedure.", "A player who cannot finish must receive the USAP retirement outcome instead.", "5.7"],
  ["scoring freeze", "How does scoring freeze work?", "Scoring freeze means the receiving team cannot score after the league freeze threshold.", "Scoring freeze does not apply; the receiving team may score under this fixture.", "5.6"],
  ["match ball", "What type of balls will we be using?", "Match balls must be Franklin Outdoor X-40 Optic balls.", "Match balls may be any approved ball under this fixture.", "5.2"],
]) test(`LMS-0706 ${name}: direct LWR conflict excludes USAP before model and citations`, async () => {
  const input = retrieval(question, [usap(usapText, { combinedScore: .9, documentAuthorityRank: 1 }), lwr(localText, { ruleNumber, documentAuthorityRank: 9 })]);
  const { answer, request } = await generate(input, localText);
  assert.deepEqual(ids(answer.selectedEvidence), ["lwr"]);
  assert.deepEqual(ids(answer.sources), ["lwr"]);
  assert.equal(answer.answer, localText);
  assert.equal(answer.conflict.requiresClarification, false);
  assert.ok(!request.input[0].content.includes(usapText));
  assert.match(request.input[0].content, /lwr_controlling/);
  assert.match(input.suppliedEvidence[0].evidenceSelectionReason, /directly applicable LWR rule/);
});

test("LMS-0706 Match Setup stays under Rule 5.4 despite higher USAP score", () => {
  const selected = selectAnswerEvidence(retrieval("When do I submit my lineup for Friday's match?", [usap("The match must follow the serving sequence.", { combinedScore: .9 }), lwr("Captains must submit upcoming match rosters through Match Setup no later than three days prior to the scheduled match.", { ruleNumber: "5.4" })]));
  assert.deepEqual(ids(selected), ["lwr"]);
});

for (const [question, text] of [
  ["Can I volley in the kitchen?", "A player must not volley while touching the non-volley zone."],
  ["Can a serve touch the baseline?", "A serve must be delivered without the server touching the baseline."],
  ["Must the ball bounce twice?", "The ball must bounce twice before volleys are permitted in this fixture."],
]) test(`LMS-0706 ordinary uploaded USAP fallback: ${question}`, async () => {
  const { answer, request } = await generate(retrieval(question, [usap(text)]), text);
  assert.equal(answer.modelCallSkipped, false);
  assert.deepEqual(ids(answer.selectedEvidence), ["usap"]);
  assert.match(request.input[0].content, /usap_governing_fallback/);
});

test("LMS-0706 general LWR material, title-only matches and scattered terms do not suppress USAP", () => {
  for (const general of [
    lwr("Captains must check the kitchen area before the match."),
    lwr("Players must consult the USAP kitchen volley rules."),
    lwr("Kitchen volley rules are discussed in the official rulebook."),
    lwr("A volley must be controlled. The kitchen must be clean."),
    lwr("Captains must inspect the court.", { heading: "Volley in the kitchen" }),
    lwr("A volley must be controlled.\n\nThe kitchen must be clean."),
  ]) {
    const selected = selectAnswerEvidence(retrieval("Can I volley in the kitchen?", [general, usap("Players must not volley while touching the kitchen.")]));
    assert.deepEqual(ids(selected), ["usap"]);
  }
});

test("LMS-0706 a general serving rule does not override a specific baseline issue", () => {
  const selected = selectAnswerEvidence(retrieval("Can a serve touch the baseline?", [lwr("Players must serve in the league's assigned order."), usap("A serve must be delivered without the server touching the baseline.")]));
  assert.deepEqual(ids(selected), ["usap"]);
});

test("LMS-0706 a guide cannot independently override a USAP playing rule, even at rank 1", () => {
  const selected = selectAnswerEvidence(retrieval("Can I volley in the kitchen?", [evidence("guide", "captain_guide", "Players may volley in the kitchen in this conflicting guide fixture.", { documentAuthorityRank: 1 }), usap("Players must not volley while touching the kitchen.")]));
  assert.deepEqual(ids(selected), ["usap"]);
});

test("LMS-0706 mixed intents retain LWR lineup and USAP volley rules independently", async () => {
  const input = retrieval("When do I submit my lineup and can I volley in the kitchen?", [lwr("Match Setup lineup must be submitted no later than three days before the scheduled match.", { ruleNumber: "5.4" }), usap("Players must not volley while touching the kitchen.")]);
  const { answer, request } = await generate(input, "Submit three days before the match. Do not volley in the kitchen.");
  assert.deepEqual(ids(answer.selectedEvidence), ["lwr", "usap"]);
  assert.match(request.instructions, /authority separately for each supported question intent/);
});

test("LMS-0706 mixed USAP chunk cannot leak an overridden sibling passage", async () => {
  const overridden = "Match balls may be any approved ball.";
  const applicable = "Players must not volley while touching the kitchen.";
  const input = retrieval("What balls are we using and can I volley in the kitchen?", [lwr("Match balls must be Franklin Outdoor X-40 Optic balls."), usap(`${overridden}\n\n${applicable}`)]);
  const { answer, request } = await generate(input, "Use Franklin Outdoor X-40 Optic balls. Do not volley in the kitchen.");
  assert.deepEqual(ids(answer.selectedEvidence), ["lwr", "usap"]);
  assert.ok(!request.input[0].content.includes(overridden));
  assert.ok(request.input[0].content.includes(applicable));
  assert.ok(input.suppliedEvidence[1].content.includes(overridden), "raw retrieval remains reviewable");
});

test("LMS-0706 insufficient, below-threshold and unrelated USAP evidence still skip generation", async () => {
  for (const input of [
    { ...retrieval("Can I volley in the kitchen?", [usap("Players must not volley in the kitchen.")]), evidence: { sufficient: false, threshold: .35 } },
    retrieval("Can I volley in the kitchen?", [usap("Players must not volley in the kitchen.", { combinedScore: .349 })]),
    retrieval("Can I volley in the kitchen?", [usap("Captains must record scores.")]),
  ]) {
    const result = await generateOfficialAnswer({ retrieval: input, fetchImpl: () => assert.fail("must not call model"), resolveSources: () => assert.fail("must not resolve sources") });
    assert.equal(result.answer, INSUFFICIENT_EVIDENCE_ANSWER);
    assert.equal(result.modelCallSkipped, true);
  }
});

test("LMS-0706 does not select an unfinished USAP condition as governing evidence", () => {
  const selected = selectAnswerEvidence(retrieval(
    "What is the fault for spin or manipulation on release?",
    [usap("20.E.1.e Fault – Volley Serve and Drop Serve, Spin or Manipulation on Release. When the server")],
  ));
  assert.deepEqual(ids(selected), []);
});
