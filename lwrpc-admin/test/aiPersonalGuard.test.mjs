import test from "node:test";
import assert from "node:assert/strict";
import { isUnsupportedOperationalQuestion, runPlayerOfficialAnswer, resolveOfficialConversation } from "../app/lib/askLwrPlayerAnswer.js";
import { createFollowUpReceipt } from "../app/lib/aiConversation.js";
import { conversationDiagnostics } from "../app/lib/aiConversationDiagnostics.js";
process.env.SUPABASE_SERVICE_ROLE_KEY = "guard-test-only";
const userId = "11111111-1111-4111-8111-111111111111";
const protectedQuestions = ["What is my DUPR?", "What's my DUPR?", "What is my current DUPR?", "Do you know my DUPR?", "What's my rating?", "What is my player rating?", "Can you tell me my DUPR?", "Did I already submit my lineup?", "Did I already submit my match scores?", "Have I entered my scores yet?", "Who am I playing Friday?", "Who do we play Friday?", "Who is my next opponent?", "When is my next match?", "Where do I play next?", "Who is on my roster?", "Who is on my team?", "Is John Smith on my roster?", "Show me my roster."];
const officialQuestions = ["What does NR mean?", "What is the DUPR Reliability Factor rule?", "How is Season DUPR determined?", "What DUPR is allowed in this division?", "What DUPR range can play in Weekday DUPR 7?", "How do I submit my lineup?", "When do I submit my lineup?", "How do I enter match scores?", "When does Match Setup need to be completed?", "What day does DUPR 9 normally play?", "Can captains change the scheduled DUPR 9 match time?", "What are the Saturday league dates?", "I'm changing my roster but I can't find a player in the list, why?", "Why can't I find a player when changing my roster?", "Why won't a player show up when I try to add them?", "What should I check if a player isn't available to add to my roster?"];
for (const question of protectedQuestions) test(`protected: ${question}`, async () => {
  const output = await runPlayerOfficialAnswer({ body: { question }, userId, role: "player", retrieveOfficialEvidence: () => assert.fail("Stage 3 must be skipped"), generateOfficialAnswer: () => assert.fail("Stage 4 must be skipped") });
  assert.equal(output.result.kind, "protected"); assert.equal(output.result.feedbackReceipt, null); assert.equal(output.result.conversationReceipt, null); assert.deepEqual(output.result.sources, []);
});
for (const question of officialQuestions) test(`official guidance: ${question}`, async () => {
  assert.equal(isUnsupportedOperationalQuestion(question), false);
  let calls = 0;
  const output = await runPlayerOfficialAnswer({ body: { question }, userId, role: "player", retrieveOfficialEvidence: async () => { calls++; return { evidence: { sufficient: false } }; }, generateOfficialAnswer: async () => ({ evidenceSufficient: false, sources: [] }) });
  assert.equal(calls, 1); assert.equal(output.result.kind, "insufficient_evidence");
});
for (const question of ["What if I step in after I hit it?", "What if I step in the kitchen after I hit it?"]) test(`kitchen receipt boundaries: ${question}`, async () => {
  const now = Date.now();
  const valid = resolveOfficialConversation({ question, userId, now, receipt: createFollowUpReceipt(userId, "Can I volley in the kitchen?", { now }) });
  assert.equal(valid.classification, "follow_up"); assert.match(valid.effectiveQuestion, /volley in the kitchen/);
  for (const receipt of [undefined, "malformed", createFollowUpReceipt(userId, "Can I volley in the kitchen?", { now: now - 3600000 })]) {
    const output = await runPlayerOfficialAnswer({ body: { question, conversationReceipt: receipt }, userId, role: "player", now: () => now, retrieveOfficialEvidence: () => assert.fail("missing usable context skips retrieval"), generateOfficialAnswer: () => assert.fail("must skip") });
    assert.equal(output.result.kind, "clarification"); assert.equal(output.result.conversationReceipt, null);
  }
});
test("manager diagnostics whitelist evidence IDs and omit receipt/history", () => {
  const resolution = resolveOfficialConversation({ question: "What is my DUPR?", userId, receipt: "secret-token" });
  const diagnostic = conversationDiagnostics({ ...resolution, history: "secret-history" });
  assert.equal(diagnostic.receiptSupplied, true); assert.equal(diagnostic.receiptValidation, "not_checked_raw_guard"); assert.equal(diagnostic.stage3Invoked, false); assert.equal(diagnostic.finalResponseKind, "protected");
  assert.doesNotMatch(JSON.stringify(diagnostic), /secret-token|secret-history/);
  const answer = conversationDiagnostics({ kind: "resolved", classification: "follow_up" }, { stage3Invoked: true, answer: { evidenceSufficient: true, selectedEvidence: [{ chunkId: "chunk", ruleNumber: "11.A.2", text: "excluded passage", url: "secret-url" }] } });
  assert.equal(answer.inheritedContext, true); assert.equal(answer.finalResponseKind, "answer"); assert.deepEqual(answer.selectedEvidence, [{ chunkId: "chunk", ruleNumber: "11.A.2" }]);
});
