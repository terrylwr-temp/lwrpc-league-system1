import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createFeedbackController, resetFeedbackPending } from "../app/lib/askLwrFeedbackState.js";
const response = (helpful, changed = true) => ({ ok: true, json: async () => ({ success: true, result: { helpful, changed, feedbackId: "event" } }) });
function fixture(fetchImpl, authorization = async () => ({ Authorization: "fixture" })) {
  let entry = { id: "answer", result: { feedbackReceipt: "fixture-receipt" } };
  const patches = [];
  const submit = createFeedbackController({ fetchImpl, getAuthorizationHeaders: authorization, updateEntry: (_, patch) => { patches.push(patch); entry = { ...entry, ...patch }; } });
  return { submit: value => submit(entry, value), rawSubmit: submit, entry: () => entry, patches };
}
test("LMS-0714 four-click sequence sends two requests and leaves confirmed controls usable", async () => {
  const votes = [];
  const f = fixture(async (url, options) => { assert.equal(url, "/api/ask-lwr/feedback"); const body = JSON.parse(options.body); assert.equal(body.receipt, "fixture-receipt"); votes.push(body.helpful); return response(body.helpful); });
  for (const vote of [true, true, false, false]) {
    await f.submit(vote);
    assert.equal(f.entry().feedback.helpful, vote); assert.equal(f.entry().feedbackWorking, false); assert.equal(f.entry().feedbackError, false);
  }
  assert.deepEqual(votes, [true, false]);
});
test("LMS-0714 synchronous lock blocks rapid opposite clicks before rerender", async () => {
  let release; const waiting = new Promise(resolve => { release = resolve; }); let calls = 0;
  const f = fixture(async () => { calls++; await waiting; return response(true); });
  const staleEntry = f.entry(); const first = f.rawSubmit(staleEntry, true);
  assert.equal(f.entry().feedbackWorking, true); assert.equal(f.entry().feedback, undefined);
  await f.rawSubmit(staleEntry, false); assert.equal(calls, 1);
  release(); await first;
  assert.equal(f.entry().feedback.helpful, true); assert.equal(f.entry().feedbackWorking, false);
  await f.rawSubmit(staleEntry, true); assert.equal(calls, 1);
});
test("LMS-0714 unchanged server response clears pending and uses server-confirmed value", async () => {
  const f = fixture(async () => response(false, false));
  await f.submit(true);
  assert.equal(f.entry().feedback.helpful, false); assert.equal(f.entry().feedbackWorking, false);
});
for (const failure of ["http", "network", "malformed", "invalid", "authorization"]) test(`LMS-0714 ${failure} error clears pending, preserves confirmed vote and permits retry`, async () => {
  let fail = false;
  const f = fixture(async (_, options) => {
    if (fail) {
      if (failure === "network") throw new Error("private details");
      if (failure === "http") return { ok: false, json: async () => ({ error: "private details" }) };
      if (failure === "malformed") return { ok: true, json: async () => { throw new Error("bad json"); } };
      if (failure === "invalid") return { ok: true, json: async () => ({ success: true, result: {} }) };
    }
    return response(JSON.parse(options.body).helpful);
  }, async () => { if (fail && failure === "authorization") throw new Error("private auth details"); return {}; });
  await f.submit(true); fail = true; await f.submit(false);
  assert.equal(f.entry().feedback.helpful, true); assert.equal(f.entry().feedbackWorking, false); assert.equal(f.entry().feedbackError, true);
  assert.doesNotMatch(JSON.stringify(f.entry()), /private/);
  fail = false; const retry = f.submit(false); assert.equal(f.entry().feedbackError, false); await retry;
  assert.equal(f.entry().feedback.helpful, false); assert.equal(f.entry().feedbackWorking, false);
});
test("LMS-0714 restored feedback never restores an abandoned pending flag", () => {
  const restored = resetFeedbackPending({ feedbackWorking: true, feedback: { helpful: true } });
  assert.equal(restored.feedbackWorking, false); assert.equal(restored.feedback.helpful, true);
});
test("LMS-0714 selected controls remain enabled with accessible pressed state", async () => {
  const ui = await readFile(new URL("../app/components/AskLwrAssistant.js", import.meta.url), "utf8");
  const controls = ui.slice(ui.indexOf("function FeedbackControls"), ui.indexOf("async function loadLeagueGuides"));
  assert.equal((controls.match(/disabled=\{Boolean\(entry.feedbackWorking\)\}/g) || []).length, 2);
  assert.match(controls, /aria-pressed=\{selected === true\}/); assert.match(controls, /aria-pressed=\{selected === false\}/);
  assert.match(controls, /cursor-pointer disabled:cursor-wait/); assert.doesNotMatch(controls, /disabled=\{[^}]*selected/);
  assert.match(ui, /map\(resetFeedbackPending\)/);
});
