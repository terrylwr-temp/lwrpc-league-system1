import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { createConversationContext, CURRENT_CONTEXT_KEY } from "../app/lib/askLwrConversationState.js";
import { ASK_LWR_INITIAL_COPY, assistantPageContext } from "../app/lib/askLwrAssistantConfig.js";
process.env.SUPABASE_SERVICE_ROLE_KEY = "stage-six-correction-fixture";
process.env.OPENAI_API_KEY = "fixture-key-never-sent";
const { createClarificationReceipt, createFollowUpReceipt, resolveConversationTurn, readConversationReceipt, clarificationFromRetrieval } = await import("../app/lib/aiConversation.js");
const { runPlayerOfficialAnswer, resolveOfficialConversation } = await import("../app/lib/askLwrPlayerAnswer.js");
const { selectAnswerEvidence, generateOfficialAnswer } = await import("../app/lib/aiAnswerGeneration.js");
const userId = "11111111-1111-4111-8111-111111111111";
const color = "Are there any color considerations?";
const kitchen = "Can I volley in the kitchen?";
const matchBall = "what kind of ball are we using";
const setup = "When does Match Setup need to be completed?";
const pending = () => createClarificationReceipt(userId, color, "color_subject");
const controls = [kitchen, matchBall, "What are the USA Pickleball requirements for a legal ball?", "What happens if the ball is damaged during play?"];
function memoryStorage() {
  const values = new Map();
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
}
for (const question of controls) test(`LMS-0712 standalone precedence: ${question}`, () => {
  for (const receipt of [null, pending(), createFollowUpReceipt(userId, setup), "malformed", createClarificationReceipt(userId, color, "color_subject", { now: 0 })]) {
    const r = resolveOfficialConversation({ question, userId, receipt });
    assert.equal(r.kind, "resolved"); assert.equal(r.rawQuestion, question); assert.equal(r.effectiveQuestion, question);
    assert.equal(r.rawLiveDataGuard, false); assert.equal(r.effectiveLiveDataGuard, false);
    assert.equal(r.clarificationConsumed, false);
    if (r.priorContextAvailable) assert.equal(r.contextSuperseded, true);
  }
});
for (const subject of ["Ball", "Paddle", "Ball.", "the outdoor ball", "our team clothing", "the paddle surface", "Shoes"]) test(`LMS-0712 bounded subject fragment: ${subject}`, () => {
  const r = resolveOfficialConversation({ question: subject, userId, receipt: pending() });
  assert.equal(r.classification, "clarification_response"); assert.equal(r.clarificationConsumed, true);
  assert.equal(r.priorContextPurpose, "clarification"); assert.equal(r.receiptValidation, "valid");
  assert.equal(r.rawQuestion, subject); assert.equal(r.effectiveQuestion, `Are there any color considerations for ${subject.replace(/[.?!]+$/, "")}?`);
  assert.equal(clarificationFromRetrieval(r, { candidates: [{}] }), null);
});
test("LMS-0712 unrelated ambiguity never repeats color or overwrites actual raw diagnostics", () => {
  for (const receipt of [pending(), "bad", createClarificationReceipt(userId, color, "color_subject", { now: 0 })]) {
    const r = resolveOfficialConversation({ question: "What if I step in after I hit it?", receipt, userId });
    assert.equal(r.rawQuestion, "What if I step in after I hit it?");
    assert.notEqual(r.clarification?.category, "color_subject");
  }
  const r = resolveConversationTurn({ question: "Which equipment is allowed?", userId, receipt: pending() });
  assert.equal(r.classification, "standalone_supersedes_context");
  assert.equal(clarificationFromRetrieval({ ...r, rawQuestion: color }, { candidates: [] }), null);
});
test("LMS-0712 guards raw personal follow-ups and composed effective questions", () => {
  let r = resolveOfficialConversation({ question: "Did I already submit mine?", receipt: createFollowUpReceipt(userId, setup), userId });
  assert.equal(r.kind, "protected"); assert.equal(r.rawLiveDataGuard, true); assert.equal(r.receiptValidation, "not_checked_raw_guard");
  r = resolveOfficialConversation({ question: "What about tomorrow?", receipt: createFollowUpReceipt(userId, "Who do we play next?"), userId });
  assert.equal(r.kind, "protected"); assert.equal(r.rawLiveDataGuard, false); assert.equal(r.effectiveLiveDataGuard, true);
});
test("LMS-0712 ordinary and kitchen follow-up context remains usable", () => {
  for (const [prior, question] of [[setup, "What about Saturday league?"], [kitchen, "What if I step in after I hit it?"]]) {
    const r = resolveOfficialConversation({ question, userId, receipt: createFollowUpReceipt(userId, prior) });
    assert.equal(r.classification, "follow_up"); assert.ok(r.effectiveQuestion.includes(prior.slice(0, -1)));
  }
});
test("LMS-0712 explicit null survives restoration and never reads display receipts", () => {
  const storage = memoryStorage(); storage.setItem("lwr-ask-ai-exchanges", JSON.stringify([{ result: { conversationReceipt: "stale" } }]));
  const state = createConversationContext(storage); assert.equal(state.current(), null);
  state.complete(state.begin(), "pending"); assert.equal(createConversationContext(storage).current(), "pending");
  const request = state.begin(); assert.equal(request.receipt, "pending"); assert.equal(createConversationContext(storage).current(), null);
  state.complete(request, null); assert.equal(state.current(), null);
  assert.equal(JSON.parse(storage.getItem(CURRENT_CONTEXT_KEY)).receipt, null);
  assert.equal(createConversationContext(storage).begin().receipt, null);
});
test("LMS-0712 late completion cannot replace a newer request context", () => {
  const state = createConversationContext(memoryStorage()); const old = state.begin(), latest = state.begin();
  state.complete(latest, "latest"); state.complete(old, "stale"); assert.equal(state.current(), "latest");
});
function candidate(id, content, extra = {}) {
  return { chunkId: `33333333-3333-4333-8333-${String(id).padStart(12, "0")}`, documentId: "44444444-4444-4444-8444-444444444444", documentVersionId: "55555555-5555-4555-8555-555555555555", documentTitle: "Official rulebook fixture", documentType: "usap_rulebook", documentAuthorityRank: 2, combinedScore: .6, semanticScore: .5, keywordScore: .5, exactScore: .5, pageNumber: 13, content, ...extra };
}
const ballColor = candidate(1, "3.C.3 Color. The ball must be one uniform color, except for identification\nmarkings. Colors may vary.", { ruleNumber: "3.C.3" });
const paddle = candidate(2, "The paddle must be made of rigid material.");
const general = candidate(3, "All volleys must be initiated outside of the non-volley zone.", { ruleNumber: "11.A", pageNumber: 30 });
const momentum = candidate(4, "When a volleying player's momentum causes contact with the non-volley zone, even after the ball becomes dead, it is a fault.", { ruleNumber: "11.A.2", pageNumber: 30 });
const guide = candidate(5, "The League shall provide: Match Balls: Franklin Outdoor X-40 Optic balls for all regular season matches.", { documentType: "captain_guide", documentTitle: "LWR Captains Guide fixture", heading: "Match Balls", pageNumber: 10 });
const legal = candidate(6, "Ball Specifications. The complete list of approved balls is posted on the USA Pickleball website.", { ruleNumber: "3.C" });
const damaged = candidate(7, "Damaged Ball. A broken or cracked ball will be replaced.", { ruleNumber: "10.G" });
const candidates = [ballColor, paddle, general, momentum, guide, legal, damaged];
function retrieval(question, suppliedEvidence = candidates) { return { request: { question }, candidates: suppliedEvidence, suppliedEvidence, authorityReviewCandidates: suppliedEvidence, evidence: { sufficient: true, threshold: .35 }, environment: { evidenceThreshold: .35 } }; }
for (const question of ["Are there any color considerations for Ball?", "Are there any color restrictions for the ball?", "What color requirements are there for a ball?"]) test(`LMS-0712 bounded color evidence: ${question}`, () => {
  assert.deepEqual(selectAnswerEvidence(retrieval(question)).map(c => c.chunkId), [ballColor.chunkId]);
});
for (const question of ["Are there any color considerations for Paddle?", "Are there any red color considerations for Ball?", "Are there any color considerations for Ball at night?", "What pressure must the ball have?", "What happens if the ball is damaged during play?", "What are the USA Pickleball requirements for a legal ball?"]) test(`LMS-0712 color negative control: ${question}`, () => {
  assert.ok(!selectAnswerEvidence(retrieval(question)).some(c => c.chunkId === ballColor.chunkId));
});
async function turn(question, receipt) {
  let stage3 = 0, stage4 = 0, model = 0;
  const r = await runPlayerOfficialAnswer({ body: { question, conversationReceipt: receipt }, userId, role: "player", retrieveOfficialEvidence: async ({ body }) => { stage3++; return retrieval(body.question, /for Paddle/.test(body.question) ? candidates.filter(c => c.documentType === "usap_rulebook") : candidates); }, generateOfficialAnswer: async args => {
    stage4++; return generateOfficialAnswer({ ...args, resolveSources: async (_, selected) => selected.map(c => ({ ...c, officialDocumentUrl: "https://example.test/official.pdf" })), fetchImpl: async () => { model++; return { ok: true, json: async () => ({ status: "completed", output_text: JSON.stringify({ answer: "Grounded fixture answer", conflict: false }) }) }; } });
  } });
  return { ...r, stage3, stage4, model };
}
for (const subject of ["Ball", "Paddle"]) test(`LMS-0712 integrated Color -> ${subject} -> standalone with authoritative receipt`, async () => {
  const state = createConversationContext(memoryStorage());
  async function submit(question) { const request = state.begin(); const out = await turn(question, request.receipt); state.complete(request, out.result.conversationReceipt); return out; }
  const initial = await submit(color); assert.equal(initial.result.kind, "clarification"); assert.equal(initial.stage3, 0);
  const answer = await submit(subject); assert.equal(answer.stage3, 1); assert.equal(answer.stage4, 1); assert.equal(answer.conversationResolution.clarificationConsumed, true);
  if (subject === "Ball") {
    assert.equal(answer.result.kind, "answer"); assert.equal(answer.model, 1); assert.ok(answer.result.feedbackReceipt);
    assert.equal(readConversationReceipt(state.current(), userId).purpose, "follow_up");
  } else { assert.equal(answer.result.kind, "insufficient_evidence"); assert.equal(answer.model, 0); assert.equal(state.current(), null); assert.equal(answer.result.feedbackReceipt, null); }
  const next = await submit(subject === "Ball" ? kitchen : matchBall); assert.equal(next.result.kind, "answer"); assert.equal(next.stage3, 1);
  assert.equal(next.conversationResolution.effectiveQuestion, subject === "Ball" ? kitchen : matchBall);
});
test("LMS-0712 integrated standalone source paths and kitchen momentum", async () => {
  for (const [question, rule] of [[kitchen, "11.A"], [controls[2], "3.C"], [controls[3], "10.G"]]) {
    const r = await turn(question, pending()); assert.equal(r.result.kind, "answer"); assert.ok(r.result.sources.some(s => s.ruleNumber === rule));
  }
  const first = await turn(kitchen); const next = await turn("What if I step in after I hit it?", first.result.conversationReceipt);
  assert.equal(next.result.kind, "answer"); assert.ok(next.result.sources.some(s => s.ruleNumber === "11.A.2"));
  const protectedTurn = await turn("Did I already submit mine?", createFollowUpReceipt(userId, setup)); assert.equal(protectedTurn.stage3, 0); assert.equal(protectedTurn.stage4, 0);
});
test("LMS-0712 mobile layout and feedback rendering contracts", async () => {
  const ui = await readFile(new URL("../app/components/AskLwrAssistant.js", import.meta.url), "utf8");
  const css = await readFile(new URL("../app/components/AskLwrAssistant.module.css", import.meta.url), "utf8");
  assert.match(ui, /createPortal\(/); assert.match(ui, /document\.body\)/); assert.match(ui, /visualViewport/); assert.match(ui, /node\.inert = true/);
  assert.doesNotMatch(ui, /exchanges\.find\(\(entry\) => entry\.result\?\.conversationReceipt/);
  assert.match(css, /max-width: 639px/); assert.match(css, /100dvh/); assert.match(css, /z-index: 10000/); assert.match(css, /background: #f8fafc/);
  assert.match(css, /safe-area-inset-top/); assert.match(css, /safe-area-inset-bottom/); assert.match(css, /width: 44px; height: 44px/); assert.match(css, /font-size: 14px/);
  assert.match(ui, /min-h-0 flex-1 flex-col overflow-y-auto/); assert.match(ui, /min-w-0 flex-1/); assert.match(ui, /sm:w-\[min\(92vw,640px\)\]/);
  assert.match(ui, /result\.kind === "answer" && Boolean\(result\.feedbackReceipt\)/);
  assert.ok(ui.indexOf('{result.answer}</p>') < ui.indexOf('{feedbackEligible && <FeedbackControls'));
  assert.ok(ui.indexOf('{feedbackEligible && <FeedbackControls') < ui.indexOf('Official Source{'));
});
test("LMS-0712 welcome copy and balanced suggestions use normal submit", async () => {
  assert.equal(ASK_LWR_INITIAL_COPY, "Ask me about LWR Pickleball Club leagues, DUPR requirements, scoring, Match Setup, Captain procedures, league formats, and more. You also have access to the complete USA Pickleball Rulebook, so you can ask me about pickleball rules, faults, serving, the kitchen (NVZ), equipment, and other rules of play.");
  for (const path of ["/player-dashboard", "/captain-dashboard", "/match-setup", "/standings"]) assert.deepEqual(assistantPageContext(path).suggestions, [setup, "What kind of ball are we using?", kitchen, "What are the rules for a legal serve?"]);
  const ui = await readFile(new URL("../app/components/AskLwrAssistant.js", import.meta.url), "utf8"); assert.match(ui, /onClick=\{\(\) => submit\(null, suggestion\)\}/); assert.match(ui, /min-h-11 max-w-full/);
});
