import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const { ASK_LWR_INITIAL_COPY, assistantPageContext } = await import("../app/lib/askLwrAssistantConfig.js");
const { INSUFFICIENT_EVIDENCE_ANSWER } = await import("../app/lib/aiAnswerGeneration.js");
const { isUnsupportedOperationalQuestion, playerFallbackResult, toPlayerAnswerResult } = await import("../app/lib/askLwrPlayerAnswer.js");

test("centralizes page-aware suggestions without fabricating LMS scope IDs", () => {
  assert.equal(assistantPageContext("/match-setup", "captain").featureModule, "Match Setup");
  assert.match(assistantPageContext("/match-setup", "captain").suggestions[0], /Match Setup/i);
  assert.equal(assistantPageContext("/player-dashboard?view=standings", "player").featureModule, "Standings");
  assert.equal(assistantPageContext("/player-dashboard", "player").featureModule, "LMS");
  assert.match(ASK_LWR_INITIAL_COPY, /official documents/i);
});

test("player response is deliberately limited to plain answer and trusted citations", () => {
  const result = toPlayerAnswerResult({
    answer: "A player may not continue.", evidenceSufficient: true,
    conflict: { requiresClarification: false }, model: "gpt-5.5", metrics: { totalTokens: 99 },
    sources: [{ documentId: "secret-id", chunkId: "chunk-id", documentTitle: "League Rules", pageNumber: 5, ruleNumber: "5.7", citation: "League Rules — Rule 5.7 — Page 5", officialDocumentUrl: "https://signed.example/rules#page=5" }],
  });
  assert.deepEqual(Object.keys(result).sort(), ["answer", "conflict", "evidenceSufficient", "sources"]);
  assert.equal(result.sources[0].documentId, undefined); assert.equal(result.sources[0].chunkId, undefined);
  assert.equal(result.sources[0].officialDocumentUrl, "https://signed.example/rules#page=5");
});

test("personal or live LMS questions do not enter document RAG without a future data tool", () => {
  for (const question of ["What place is my team in?", "Who do we play next?", "What was our last score?", "What is my Season DUPR?", "How many matches have we won?"]) assert.equal(isUnsupportedOperationalQuestion(question), true, question);
  assert.equal(isUnsupportedOperationalQuestion("How are standings determined?"), false);
  assert.equal(isUnsupportedOperationalQuestion("What does NR mean?"), false);
  assert.deepEqual(playerFallbackResult(), { answer: INSUFFICIENT_EVIDENCE_ANSWER, evidenceSufficient: false, conflict: false, sources: [] });
});

test("global entry, reusable drawer, guide browser, and standalone route remain player focused", async () => {
  const [header, assistant, route, page, managerRoute] = await Promise.all([
    readFile(new URL("../app/components/AppHeader.js", import.meta.url), "utf8"),
    readFile(new URL("../app/components/AskLwrAssistant.js", import.meta.url), "utf8"),
    readFile(new URL("../app/api/ask-lwr/route.js", import.meta.url), "utf8"),
    readFile(new URL("../app/ask-lwr/page.js", import.meta.url), "utf8"),
    readFile(new URL("../app/api/ai-assistant/answer/route.js", import.meta.url), "utf8"),
  ]);
  assert.match(header, /aria-label="Ask LWR Pickleball AI"/); assert.match(header, /name="sparkles"/); assert.doesNotMatch(header, /name="help"/);
  for (const feature of ["AskLwrAssistantDrawer", "role=\"dialog\"", "aria-modal=\"true\"", "Checking official LWR rules and guides", "Browse Guides &amp; Rules", "New Conversation", "openGuideDocument", "LEAGUE_DOCUMENT_TYPES", "officialDocumentUrl"]) assert.match(assistant, new RegExp(feature));
  for (const diagnostic of ["semanticScore", "keywordScore", "exactScore", "authorityScore", "combinedScore", "totalTokens", "estimatedGenerationCostUsd"]) assert.doesNotMatch(assistant, new RegExp(diagnostic));
  assert.match(route, /authorizeAdminRequest\(req, "player"\)/); assert.match(route, /isUnsupportedOperationalQuestion/); assert.match(route, /toPlayerAnswerResult/); assert.doesNotMatch(route, /OPENAI_API_KEY/);
  assert.match(page, /AskLwrAssistantPage/); assert.match(page, /requireRole\(router, "player"\)/);
  assert.match(managerRoute, /authorizeAdminRequest\(req, "league_manager"\)/);
});
