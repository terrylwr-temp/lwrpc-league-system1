import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { selectAnswerEvidence, generateOfficialAnswer } from "../app/lib/aiAnswerGeneration.js";
import { isUnsupportedOperationalQuestion } from "../app/lib/askLwrPlayerAnswer.js";
const base = JSON.parse(await readFile(new URL("./fixtures/lms0713-roster-retrieval.json", import.meta.url), "utf8"));
process.env.OPENAI_API_KEY = "fixture-only";
const questions = [base.request.question, "Why can't I find a player when changing my roster?", "Why won't a player show up when I try to add them?", "What should I check if a player isn't available to add to my roster?"];
const expected = ["c524d6d2-34d8-41ed-8fd6-40cf4c5e0e09", "61269c81-f09f-44af-adbd-3da3065e22a7"];
const sources = async (_, evidence) => evidence.map(c => ({ ...c, officialDocumentUrl: "https://example.test/official.pdf" }));
const completed = () => ({ ok: true, json: async () => ({ status: "completed", output: [{ type: "message", content: [{ type: "output_text", text: JSON.stringify({ answer: "Check the documented membership and division requirements. I cannot determine this player's actual status.", conflict: false }) }] }] }) });
for (const question of questions) test(`LMS-0713 roster evidence and scoped confidence: ${question}`, async () => {
  assert.equal(isUnsupportedOperationalQuestion(question), false);
  const retrieval = structuredClone(base); retrieval.request.question = question;
  assert.deepEqual(selectAnswerEvidence(retrieval).map(c => c.chunkId), expected);
  let sent;
  const answer = await generateOfficialAnswer({ retrieval, resolveSources: sources, fetchImpl: async (_, options) => { sent = JSON.parse(options.body); return completed(); } });
  assert.deepEqual(answer.sources.map(c => c.chunkId), expected);
  assert.match(sent.instructions, /not live LMS data/);
  assert.match(sent.instructions, /do not know the actual reason/);
  assert.match(sent.instructions, /avoid 'most likely'/);
  assert.match(sent.instructions, /Do not transfer Match Setup restrictions to Manage Roster/);
  assert.match(sent.input[0].content, /Manage Roster/);
  assert.doesNotMatch(sent.input[0].content, /Viewing Upcoming Matches|Viewing My Teams|Retroactive Additions|Incomplete Matches|Roster & Courts|Missing DUPR Info/);
  assert.equal(sent.store, false);
});
test("LMS-0713 tangential-only or below-threshold roster evidence skips generation", async () => {
  for (const evidence of [base.suppliedEvidence.filter(c => !expected.includes(c.chunkId)), base.suppliedEvidence.filter(c => expected.includes(c.chunkId)).map(c => ({ ...c, combinedScore: .349 }))]) {
    const retrieval = { ...structuredClone(base), suppliedEvidence: evidence, authorityReviewCandidates: evidence };
    assert.deepEqual(selectAnswerEvidence(retrieval), []);
    const answer = await generateOfficialAnswer({ retrieval, resolveSources: () => assert.fail("no source resolution"), fetchImpl: () => assert.fail("no GPT") });
    assert.equal(answer.modelCallSkipped, true); assert.equal(answer.evidenceSufficient, false); assert.deepEqual(answer.sources, []);
  }
});
test("LMS-0713 confidence instruction is absent from direct rule questions", async () => {
  const c = { ...base.suppliedEvidence[0], content: "All volleys must be initiated outside the non-volley zone.", ruleNumber: "11.A" };
  const retrieval = { request: { question: "Can I volley in the kitchen?" }, evidence: { sufficient: true, threshold: .35 }, suppliedEvidence: [c] };
  let sent;
  await generateOfficialAnswer({ retrieval, resolveSources: sources, fetchImpl: async (_, options) => { sent = JSON.parse(options.body); return completed(); } });
  assert.doesNotMatch(sent.instructions, /roster-availability troubleshooting|do not know the actual reason/);
  assert.match(sent.instructions, /begin with the negative result/);
});
