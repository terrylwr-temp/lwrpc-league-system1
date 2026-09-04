import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const { ASK_LWR_INITIAL_COPY, assistantPageContext, canBrowseLeagueDocument, visibleDashboardGuideKeys } = await import("../app/lib/askLwrAssistantConfig.js");
const { INSUFFICIENT_EVIDENCE_ANSWER } = await import("../app/lib/aiAnswerGeneration.js");
const { normalizedFtsTerms } = await import("../app/lib/aiRetrieval.js");
const { isUnsupportedOperationalQuestion, playerFallbackResult, playerRetrievalBody, runPlayerOfficialAnswer, toPlayerAnswerResult } = await import("../app/lib/askLwrPlayerAnswer.js");

test("centralizes page-aware suggestions without fabricating LMS scope IDs", () => {
  assert.equal(assistantPageContext("/match-setup", "captain").featureModule, "Match Setup");
  assert.match(assistantPageContext("/match-setup", "captain").suggestions[0], /Match Setup/i);
  assert.equal(assistantPageContext("/player-dashboard?view=standings", "player").featureModule, "Standings");
  assert.equal(assistantPageContext("/members", "commissioner").featureModule, "Member Administration");
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

test("player-safe sources preserve the validated page-aware URL without rebuilding it", () => {
  for (const pageNumber of [1, 10, 17]) {
    const url = `https://signed.example/captains-guide.pdf?token=real#page=${pageNumber}`;
    const [source] = toPlayerAnswerResult({ answer: "Grounded", evidenceSufficient: true, conflict: {}, sources: [{ documentTitle: "LWRPC-Captains Guide to the LMS", pageNumber, officialDocumentUrl: url }] }).sources;
    assert.equal(source.pageNumber, pageNumber);
    assert.equal(source.officialDocumentUrl, url);
  }
  const [sourceWithoutPage] = toPlayerAnswerResult({ answer: "Grounded", evidenceSufficient: true, conflict: {}, sources: [{ documentTitle: "Guide", pageNumber: null, officialDocumentUrl: "https://signed.example/guide.pdf?token=real" }] }).sources;
  assert.equal(sourceWithoutPage.officialDocumentUrl, "https://signed.example/guide.pdf?token=real");
});

test("personal or live LMS questions do not enter document RAG without a future data tool", () => {
  for (const question of ["What place is my team in?", "What place are we in for our division?", "Who do we play next?", "What was our last score?", "What is my Season DUPR?", "How many matches have we won?"]) assert.equal(isUnsupportedOperationalQuestion(question), true, question);
  assert.equal(isUnsupportedOperationalQuestion("How are standings determined?"), false);
  assert.equal(isUnsupportedOperationalQuestion("What does NR mean?"), false);
  assert.deepEqual(playerFallbackResult(), { answer: INSUFFICIENT_EVIDENCE_ANSWER, evidenceSufficient: false, conflict: false, sources: [] });
});

test("normalizes generic question framing so FTS keeps the substantive Balls term", async () => {
  const sql = await readFile(new URL("../supabase-ai-assistant-stage3-retrieval.sql", import.meta.url), "utf8");
  assert.deepEqual(normalizedFtsTerms("What kind of balls are we using?"), ["balls"]);
  assert.match(sql, /matches\|type\|kind\|using/i);
  assert.match(sql, /'type', 'kind', 'using'/i);
});

test("player route passes realistic unrelated-page context to the shared Stage 3/4 pipeline without scope filtering", async () => {
  const supportedQuestions = [
    "What kind of balls are we using?", "What does NR mean?", "Someone got hurt halfway through the game and can't finish. What do we do?",
    "When does Match Setup need to be completed?", "Can I yell at or insult another player during a match?", "How does a Picklebreaker work?",
  ];
  for (const question of supportedQuestions) {
    let requestBody; let generated = false;
    const output = await runPlayerOfficialAnswer({
      body: { question, context: { currentPath: "/members", featureModule: "Member Administration", teamId: "not-forwarded" } }, role: "commissioner", supabase: { marker: "server" },
      retrieveOfficialEvidence: async ({ body }) => { requestBody = body; return { evidence: { sufficient: true } }; },
      generateOfficialAnswer: async ({ retrieval }) => { generated = retrieval.evidence.sufficient; return { answer: "Grounded answer", evidenceSufficient: true, conflict: {}, sources: [] }; },
    });
    assert.equal(generated, true, question); assert.equal(output.result.evidenceSufficient, true, question);
    assert.deepEqual(requestBody, { question, askAbout: "all", context: { currentPath: "/members", featureModule: "Member Administration", userRole: "commissioner" } });
  }
  assert.deepEqual(playerRetrievalBody({ question: "What does NR mean?", context: { seasonId: "untrusted" } }, "player"), { question: "What does NR mean?", askAbout: "all", context: { currentPath: undefined, featureModule: undefined, userRole: "player" } });
});

test("unsupported and insufficient paths do not manufacture an operational or aggressive-serve answer", async () => {
  let retrieveCalls = 0;
  const live = await runPlayerOfficialAnswer({ body: { question: "What place are we in for our division?" }, role: "player", supabase: null, retrieveOfficialEvidence: async () => { retrieveCalls += 1; }, generateOfficialAnswer: async () => { throw new Error("must not generate"); } });
  assert.equal(retrieveCalls, 0); assert.deepEqual(live.result, playerFallbackResult());
  const unsupportedEvidence = await runPlayerOfficialAnswer({ body: { question: "Can I make an aggressive serve?" }, role: "player", supabase: null, retrieveOfficialEvidence: async () => ({ evidence: { sufficient: false } }), generateOfficialAnswer: async () => ({ answer: INSUFFICIENT_EVIDENCE_ANSWER, evidenceSufficient: false, conflict: {}, sources: [] }) });
  assert.deepEqual(unsupportedEvidence.result, playerFallbackResult());
});

test("guide browsing mirrors existing role entry points without changing RAG scope", () => {
  assert.deepEqual(visibleDashboardGuideKeys("player"), ["player_guide_pdf"]);
  assert.deepEqual(visibleDashboardGuideKeys("captain"), ["player_guide_pdf", "captain_guide_pdf"]);
  assert.deepEqual(visibleDashboardGuideKeys("club_pro"), ["player_guide_pdf", "captain_guide_pdf"]);
  assert.deepEqual(visibleDashboardGuideKeys("league_manager"), ["player_guide_pdf", "captain_guide_pdf", "admin_guide_pdf"]);
  assert.deepEqual(visibleDashboardGuideKeys("commissioner"), ["player_guide_pdf", "captain_guide_pdf", "admin_guide_pdf"]);
  assert.equal(canBrowseLeagueDocument("player", "captains_guide"), false); assert.equal(canBrowseLeagueDocument("captain", "captains_guide"), true);
});

test("global entry, reusable drawer, guide browser, and standalone route remain player focused", async () => {
  const [header, assistant, route, page, managerRoute] = await Promise.all([
    readFile(new URL("../app/components/AppHeader.js", import.meta.url), "utf8"),
    readFile(new URL("../app/components/AskLwrAssistant.js", import.meta.url), "utf8"),
    readFile(new URL("../app/api/ask-lwr/route.js", import.meta.url), "utf8"),
    readFile(new URL("../app/ask-lwr/page.js", import.meta.url), "utf8"),
    readFile(new URL("../app/api/ai-assistant/answer/route.js", import.meta.url), "utf8"),
  ]);
  assert.match(header, /aria-label="Ask LWR Pickleball Club AI"/); assert.match(header, /name="sparkles"/); assert.doesNotMatch(header, /name="help"/);
  for (const feature of ["AskLwrAssistantDrawer", "role=\"dialog\"", "aria-modal=\"true\"", "Finding the official answer", "Browse Guides &amp; Rules", "New Conversation", "openGuideDocument", "LEAGUE_DOCUMENT_TYPES", "officialDocumentUrl"]) assert.match(assistant, new RegExp(feature));
  for (const diagnostic of ["semanticScore", "keywordScore", "exactScore", "authorityScore", "combinedScore", "totalTokens", "estimatedGenerationCostUsd"]) assert.doesNotMatch(assistant, new RegExp(diagnostic));
  assert.match(route, /authorizeAdminRequest\(req, "player"\)/); assert.match(route, /runPlayerOfficialAnswer/); assert.doesNotMatch(route, /OPENAI_API_KEY/);
  assert.match(page, /AskLwrAssistantPage/); assert.match(page, /requireRole\(router, "player"\)/);
  assert.match(managerRoute, /authorizeAdminRequest\(req, "league_manager"\)/);
  assert.doesNotMatch(`${header}\n${assistant}\n${route}\n${page}`, /Ask LWR Pickleball AI/);
  assert.ok(assistant.indexOf("<form onSubmit={submit}") < assistant.indexOf("exchanges.map"));
  assert.ok(assistant.indexOf("exchanges.map") < assistant.indexOf("Browse Guides &amp; Rules"));
  assert.match(assistant, /\[\{ id: exchangeId, question: nextQuestion, pending: true \}, \.\.\.current\]/);
  assert.match(assistant, /setExchanges\(\[\]\); setQuestion\(""\);/);
  assert.match(assistant, /if \(entry\.pending\).*Finding the official answer/s);
  assert.match(assistant, /if \(entry\.requestError\).*TECHNICAL_ERROR/);
  assert.match(assistant, /SESSION_EXCHANGES_KEY/);
  assert.match(assistant, /slice\(0, MAX_SESSION_EXCHANGES\)/);
  assert.doesNotMatch(assistant, /ask-lwr-question[^>]*disabled=\{working\}/);
  assert.match(assistant, /href=\{source\.officialDocumentUrl\}/);
  assert.doesNotMatch(assistant, /#page=/);
});
