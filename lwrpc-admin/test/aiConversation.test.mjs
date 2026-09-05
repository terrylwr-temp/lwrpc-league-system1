import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

process.env.SUPABASE_SERVICE_ROLE_KEY = "stage-six-test-secret";
const USER_ID = "11111111-1111-4111-8111-111111111111";
const MEMBER_ID = "22222222-2222-4222-8222-222222222222";
const DOCUMENT_ID = "33333333-3333-4333-8333-333333333333";
const VERSION_ID = "44444444-4444-4444-8444-444444444444";
const CHUNK_ID = "55555555-5555-4555-8555-555555555555";

const { createClarificationReceipt, createFeedbackReceipt, createFollowUpReceipt, feedbackTransition, readConversationReceipt, readFeedbackReceipt, resolveConversationTurn } = await import("../app/lib/aiConversation.js");
const { runPlayerOfficialAnswer } = await import("../app/lib/askLwrPlayerAnswer.js");

test("LMS-0712 clarifies a missing color subject and resolves Paddle or Ball without asserting a rule", () => {
  const initial = resolveConversationTurn({ question: "Are there any color considerations?", userId: USER_ID });
  assert.equal(initial.kind, "clarification"); assert.equal(initial.clarification.category, "color_subject");
  const receipt = createFollowUpReceipt(USER_ID, "irrelevant");
  assert.equal(readConversationReceipt(receipt, USER_ID).purpose, "follow_up");
  const pending = createClarificationReceipt(USER_ID, initial.rawQuestion, initial.clarification.category);
  for (const [reply, expected] of [["Paddle.", /color considerations for Paddle/i], ["Ball.", /color considerations for Ball/i]]) {
    const resolved = resolveConversationTurn({ question: reply, userId: USER_ID, receipt: pending });
    assert.equal(resolved.kind, "resolved"); assert.equal(resolved.classification, "clarification_response"); assert.match(resolved.effectiveQuestion, expected);
  }
});

test("LMS-0712 follows only a signed immediate question and supersedes it for a standalone question", () => {
  const receipt = createFollowUpReceipt(USER_ID, "Can I volley in the kitchen?");
  const followUp = resolveConversationTurn({ question: "What if I step in after I hit it?", userId: USER_ID, receipt });
  assert.equal(followUp.classification, "follow_up"); assert.match(followUp.effectiveQuestion, /volley in the kitchen/i); assert.match(followUp.effectiveQuestion, /step in after/i);
  const standalone = resolveConversationTurn({ question: "When does Match Setup need to be completed?", userId: USER_ID, receipt });
  assert.equal(standalone.classification, "standalone_supersedes_context"); assert.equal(standalone.effectiveQuestion, "When does Match Setup need to be completed?");
  const saturday = resolveConversationTurn({ question: "What about Saturday league?", userId: USER_ID, receipt: createFollowUpReceipt(USER_ID, "When does Match Setup need to be completed?") });
  assert.equal(saturday.classification, "follow_up"); assert.match(saturday.effectiveQuestion, /Match Setup/i); assert.match(saturday.effectiveQuestion, /Saturday league/i);
});

test("LMS-0712 runs normal insufficient-evidence handling after a clarification response", async () => {
  const initial = resolveConversationTurn({ question: "Are there any color considerations?", userId: USER_ID });
  const output = await runPlayerOfficialAnswer({
    body: { question: "Clothing.", conversationReceipt: createClarificationReceipt(USER_ID, initial.rawQuestion, initial.clarification.category) }, role: "player", userId: USER_ID, supabase: null,
    retrieveOfficialEvidence: async ({ body }) => ({ request: { question: body.question }, evidence: { sufficient: false }, candidates: [], environment: { evidenceThreshold: .35, retrievalLimit: 8, authorityReviewLimit: 12, embeddingModel: "fixture" } }),
    generateOfficialAnswer: async () => ({ answer: "I couldn't find an applicable rule or guide in the official LWR Pickleball Club or USA Pickleball materials. Please contact League Management for clarification.", evidenceSufficient: false, conflict: {}, sources: [] }),
  });
  assert.equal(output.conversationResolution.classification, "clarification_response"); assert.match(output.retrieval.request.question, /Clothing/i); assert.equal(output.result.kind, "insufficient_evidence");
});

test("LMS-0712 protects a personal follow-up before it can inherit document context", async () => {
  let retrievalCalls = 0;
  const output = await runPlayerOfficialAnswer({
    body: { question: "Did I already submit mine?", conversationReceipt: createFollowUpReceipt(USER_ID, "When does Match Setup need to be completed?") }, role: "player", userId: USER_ID, memberId: MEMBER_ID, supabase: null,
    retrieveOfficialEvidence: async () => { retrievalCalls += 1; }, generateOfficialAnswer: async () => assert.fail("must not generate"),
  });
  assert.equal(retrievalCalls, 0); assert.equal(output.result.kind, "protected"); assert.equal(output.conversationResolution.classification, "raw_live_data_guard");
});

test("LMS-0712 sends only the resolved effective question into normal retrieval and issues player-safe receipts", async () => {
  let retrievalQuestion = "";
  const output = await runPlayerOfficialAnswer({
    body: { question: "What if I step in after I hit it?", conversationReceipt: createFollowUpReceipt(USER_ID, "Can I volley in the kitchen?") }, role: "player", userId: USER_ID, memberId: MEMBER_ID, supabase: null,
    retrieveOfficialEvidence: async ({ body }) => {
      retrievalQuestion = body.question;
      return { request: { question: body.question }, evidence: { sufficient: true }, candidates: [{ chunkId: CHUNK_ID }], environment: { evidenceThreshold: .35, retrievalLimit: 8, authorityReviewLimit: 12, embeddingModel: "fixture" } };
    },
    generateOfficialAnswer: async () => ({ answer: "It is a fault when momentum carries the volleying player into the non-volley zone.", evidenceSufficient: true, conflict: {}, model: "fixture", selectedEvidence: [{ documentId: DOCUMENT_ID, documentVersionId: VERSION_ID, chunkId: CHUNK_ID, pageNumber: 30, ruleNumber: "11.A.2", sourceClassification: "usap_governing_fallback", evidenceRole: "Primary" }], sources: [{ documentId: DOCUMENT_ID, documentVersionId: VERSION_ID, chunkId: CHUNK_ID, documentTitle: "2026 USA Pickleball Official Rulebook", pageNumber: 30, ruleNumber: "11.A.2", citation: "Rule 11.A.2 — Page 30", officialDocumentUrl: "https://example.test/rules.pdf" }] }),
  });
  assert.match(retrievalQuestion, /Can I volley in the kitchen/i); assert.match(retrievalQuestion, /step in after/i);
  assert.equal(output.result.kind, "answer"); assert.ok(output.result.conversationReceipt); assert.ok(output.result.feedbackReceipt);
  assert.equal(readFeedbackReceipt(output.result.feedbackReceipt, USER_ID).sources[0].chunkId, CHUNK_ID);
  assert.doesNotMatch(output.result.feedbackReceipt, new RegExp(CHUNK_ID, "i"));
});

test("LMS-0712 feedback receipt is user-bound and feedback transitions are idempotent by current state", () => {
  const receipt = createFeedbackReceipt({ userId: USER_ID, originalQuestion: "Question", effectiveQuestion: "Question", answer: "Grounded answer", assistantVersion: "LMS-0712" });
  assert.equal(readFeedbackReceipt(receipt, USER_ID).purpose, "feedback");
  assert.throws(() => readFeedbackReceipt(receipt, "66666666-6666-4666-8666-666666666666"));
  assert.equal(feedbackTransition(undefined, true), true); assert.equal(feedbackTransition(true, true), false); assert.equal(feedbackTransition(true, false), true); assert.equal(feedbackTransition(false, false), false);
});

test("LMS-0712 feedback migration and player UI retain server-only feedback writes", async () => {
  const [sql, route, assistant] = await Promise.all([
    readFile(new URL("../supabase-ai-assistant-lms-0712-stage6.sql", import.meta.url), "utf8"),
    readFile(new URL("../app/api/ask-lwr/feedback/route.js", import.meta.url), "utf8"),
    readFile(new URL("../app/components/AskLwrAssistant.js", import.meta.url), "utf8"),
  ]);
  for (const field of ["answer_id", "auth_user_id", "member_id", "original_question", "effective_question", "generated_answer", "source_snapshot", "selection_snapshot", "assistant_version", "comment"]) assert.match(sql, new RegExp(`\\b${field}\\b`));
  assert.match(sql, /enable row level security/i); assert.match(sql, /revoke all on table.*from public, anon, authenticated/i); assert.doesNotMatch(sql, /ai_document_chunks.*update|activate_ai_document_version/i);
  assert.match(route, /readFeedbackReceipt/); assert.match(route, /authorizeAdminRequest\(req, "player"\)/); assert.match(route, /feedbackTransition/);
  assert.match(assistant, /👍 Helpful/); assert.match(assistant, /👎 Not Helpful/); assert.match(assistant, /api\/ask-lwr\/feedback/); assert.match(assistant, /placeholder="Ask a question"/);
});
