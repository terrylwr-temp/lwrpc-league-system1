import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

process.env.SUPABASE_SERVICE_ROLE_KEY = "test-viewer-secret";
const TEST_USER_ID = "11111111-1111-4111-8111-111111111111";
const TEST_DOCUMENT_ID = "22222222-2222-4222-8222-222222222222";
const TEST_VERSION_ID = "33333333-3333-4333-8333-333333333333";
const TEST_CHUNK_ID = "44444444-4444-4444-8444-444444444444";

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
  assert.match(ASK_LWR_INITIAL_COPY, /complete USA Pickleball Rulebook/);
});

test("player response is deliberately limited to plain answer and trusted citations", () => {
  const result = toPlayerAnswerResult({
    answer: "A player may not continue.", evidenceSufficient: true,
    conflict: { requiresClarification: false }, model: "gpt-5.5", metrics: { totalTokens: 99 },
    sources: [{ documentId: TEST_DOCUMENT_ID, documentVersionId: TEST_VERSION_ID, chunkId: TEST_CHUNK_ID, documentTitle: "League Rules", pageNumber: 5, ruleNumber: "5.7", citation: "League Rules — Rule 5.7 — Page 5", officialDocumentUrl: "https://signed.example/rules#page=5" }],
  }, TEST_USER_ID);
  assert.deepEqual(Object.keys(result).sort(), ["answer", "conflict", "conversationReceipt", "evidenceSufficient", "feedbackReceipt", "kind", "sources"]);
  assert.equal(result.sources[0].documentId, undefined); assert.equal(result.sources[0].chunkId, undefined);
  assert.match(result.sources[0].officialDocumentUrl, /^\/official-document\//);
  assert.doesNotMatch(result.sources[0].officialDocumentUrl, /signed\.example|secret-id|chunk-id/);
});

test("player-safe sources preserve the validated page-aware URL without rebuilding it", () => {
  for (const pageNumber of [1, 10, 17]) {
    const [source] = toPlayerAnswerResult({ answer: "Grounded", evidenceSufficient: true, conflict: {}, sources: [{ documentId: TEST_DOCUMENT_ID, documentVersionId: TEST_VERSION_ID, chunkId: TEST_CHUNK_ID, documentTitle: "LWRPC-Captains Guide to the LMS", pageNumber, officialDocumentUrl: "https://signed.example/captains-guide.pdf?token=real#page=10" }] }, TEST_USER_ID).sources;
    assert.equal(source.pageNumber, pageNumber);
    assert.match(source.officialDocumentUrl, /^\/official-document\//);
  }
  const [sourceWithoutPage] = toPlayerAnswerResult({ answer: "Grounded", evidenceSufficient: true, conflict: {}, sources: [{ documentId: TEST_DOCUMENT_ID, documentVersionId: TEST_VERSION_ID, chunkId: TEST_CHUNK_ID, documentTitle: "Guide", pageNumber: null, officialDocumentUrl: "https://signed.example/guide.pdf?token=real" }] }, TEST_USER_ID).sources;
  assert.match(sourceWithoutPage.officialDocumentUrl, /^\/official-document\//);
});

test("personal or live LMS questions do not enter document RAG without a future data tool", () => {
  for (const question of ["What place is my team in?", "What place are we in for our division?", "Who do we play next?", "What was our last score?", "What is my Season DUPR?", "How many matches have we won?"]) assert.equal(isUnsupportedOperationalQuestion(question), true, question);
  assert.equal(isUnsupportedOperationalQuestion("How are standings determined?"), false);
  assert.equal(isUnsupportedOperationalQuestion("What does NR mean?"), false);
  for (const question of ["When do I need to enter my match lineup?", "When is my match lineup due?", "How do I enter my match lineup?", "When do I enter my lineup and how do I do it?", "When do captains submit their roster?"]) assert.equal(isUnsupportedOperationalQuestion(question), false, question);
  for (const question of ["When can I add players to my Weekday team?", "When can I add someone to my Weekday team?", "When can I remove a player from my team?", "When can we start changing players on our Weekday team?", "When does the Weekday roster open?"]) assert.equal(isUnsupportedOperationalQuestion(question), false, question);
  for (const question of ["When can I add a player to tomorrow's lineup?", "Can I change who's playing in Friday's match?"]) assert.equal(isUnsupportedOperationalQuestion(question), false, question);
  assert.equal(isUnsupportedOperationalQuestion("Who is in my lineup?"), true);
  assert.equal(isUnsupportedOperationalQuestion("Who is on my team?"), true);
  assert.equal(isUnsupportedOperationalQuestion("What is the lineup for tonight?"), false);
  assert.deepEqual(playerFallbackResult(), { kind: "insufficient_evidence", answer: INSUFFICIENT_EVIDENCE_ANSWER, evidenceSufficient: false, conflict: false, sources: [], conversationReceipt: null, feedbackReceipt: null });
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
    "When does Match Setup need to be completed?", "When do I need to enter my match lineup?", "How do I enter my match lineup?", "Can I yell at or insult another player during a match?", "How does a Picklebreaker work?",
  ];
  for (const question of supportedQuestions) {
    let requestBody; let generated = false;
    const output = await runPlayerOfficialAnswer({
      body: { question, context: { currentPath: "/members", featureModule: "Member Administration", teamId: "not-forwarded" } }, role: "commissioner", userId: TEST_USER_ID, supabase: { marker: "server" },
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
  assert.equal(retrieveCalls, 0); assert.equal(live.result.kind, "protected"); assert.equal(live.result.answer, INSUFFICIENT_EVIDENCE_ANSWER);
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

test("the shared AI trigger covers every authenticated header shell without changing guide access", async () => {
  const [header, trigger, playerDashboard, captainDashboard, adminDashboard, scoreEntry, assistant, route, page, managerRoute] = await Promise.all([
    readFile(new URL("../app/components/AppHeader.js", import.meta.url), "utf8"),
    readFile(new URL("../app/components/AskLwrTrigger.js", import.meta.url), "utf8"),
    readFile(new URL("../app/design-preview/DesignPreviewView.js", import.meta.url), "utf8"),
    readFile(new URL("../app/design-preview/captain/CaptainDesignPreviewView.js", import.meta.url), "utf8"),
    readFile(new URL("../app/design-preview/admin/AdminDesignPreviewView.js", import.meta.url), "utf8"),
    readFile(new URL("../app/score-entry/[id]/page.js", import.meta.url), "utf8"),
    readFile(new URL("../app/components/AskLwrAssistant.js", import.meta.url), "utf8"),
    readFile(new URL("../app/api/ask-lwr/route.js", import.meta.url), "utf8"),
    readFile(new URL("../app/ask-lwr/page.js", import.meta.url), "utf8"),
    readFile(new URL("../app/api/ai-assistant/answer/route.js", import.meta.url), "utf8"),
  ]);
  assert.match(trigger, /aria-label="Ask LWR Pickleball Club AI"/); assert.match(trigger, /title="Ask LWR Pickleball Club AI"/); assert.match(trigger, /AskLwrAssistantDrawer/); assert.match(trigger, /useState/);
  assert.match(header, /AskLwrTrigger role=\{role\}/); assert.doesNotMatch(header, /AskLwrAssistantDrawer|assistantOpen|name="sparkles"/);
  for (const dashboard of [playerDashboard, captainDashboard, adminDashboard]) {
    assert.match(dashboard, /AskLwrTrigger/);
    assert.doesNotMatch(dashboard, /Icon name="help"|aria-label="Open User Guide"/);
  }
  assert.match(playerDashboard, /AskLwrTrigger role=\{role\}/); assert.match(captainDashboard, /AskLwrTrigger role=\{role\}/); assert.match(adminDashboard, /AskLwrTrigger role=\{dashboard\.role\}/);
  assert.match(scoreEntry, /import AskLwrTrigger from "\.\.\/\.\.\/components\/AskLwrTrigger"/);
  assert.match(scoreEntry, /const \[currentUserRole, setCurrentUserRole\] = useState\("captain"\)/);
  assert.match(scoreEntry, /if \(user\?\.role\) setCurrentUserRole\(user\.role\)/);
  assert.match(scoreEntry, /<AskLwrTrigger role=\{currentUserRole\} compact \/>/);
  for (const feature of ["AskLwrAssistantDrawer", "role=\"dialog\"", "aria-modal=\"true\"", "Finding the official answer", "Browse Guides &amp; Rules", "openGuideDocument", "LEAGUE_DOCUMENT_TYPES", "officialDocumentUrl"]) assert.match(assistant, new RegExp(feature));
  for (const diagnostic of ["semanticScore", "keywordScore", "exactScore", "authorityScore", "combinedScore", "totalTokens", "estimatedGenerationCostUsd"]) assert.doesNotMatch(assistant, new RegExp(diagnostic));
  assert.match(route, /authorizeAdminRequest\(req, "player"\)/); assert.match(route, /runPlayerOfficialAnswer/); assert.doesNotMatch(route, /OPENAI_API_KEY/);
  assert.match(page, /AskLwrAssistantPage/); assert.match(page, /requireRole\(router, "player"\)/);
  assert.match(managerRoute, /authorizeAdminRequest\(req, "league_manager"\)/);
  assert.doesNotMatch(`${header}\n${trigger}\n${playerDashboard}\n${captainDashboard}\n${adminDashboard}\n${assistant}\n${route}\n${page}`, /Ask LWR Pickleball AI/);
  assert.ok(assistant.indexOf("<form onSubmit={submit}") < assistant.indexOf("exchanges.map"));
  assert.ok(assistant.indexOf("exchanges.map") < assistant.indexOf("Browse Guides &amp; Rules"));
  assert.match(assistant, /\[\{ id: exchangeId, question: nextQuestion, pending: true \}, \.\.\.current\]/);
  assert.doesNotMatch(assistant, />New Conversation</);
  assert.match(assistant, /if \(entry\.pending\).*Finding the official answer/s);
  assert.match(assistant, /if \(entry\.requestError\).*TECHNICAL_ERROR/);
  assert.match(assistant, /bg-blue-100\/70.*>Question/s);
  assert.match(assistant, /bg-emerald-50\/70.*(?:Clarification|Answer)/s);
  assert.match(assistant, /SESSION_EXCHANGES_KEY/);
  assert.match(assistant, /slice\(0, MAX_SESSION_EXCHANGES\)/);
  assert.doesNotMatch(assistant, /ask-lwr-question[^>]*disabled=\{working\}/);
  assert.match(assistant, /Get answers from official LWR PC information and USAP Rules/);
  assert.match(assistant, /placeholder="Ask a question"/); assert.doesNotMatch(assistant, /Ask a question about anything regarding LWR Pickleball Club or leagues/);
  assert.match(assistant, /href=\{source\.officialDocumentUrl\}/);
  assert.doesNotMatch(assistant, /#page=/);
});

test("the standard authenticated route shell retains the shared AI trigger", async () => {
  const routes = [
    "../app/members/page.js", "../app/ratings/page.js", "../app/teams/page.js", "../app/leagues/page.js", "../app/divisions/page.js",
    "../app/scheduling/page.js", "../app/matches/[id]/page.js", "../app/scoring/page.js", "../app/standings/page.js", "../app/ask-lwr/page.js",
  ];
  const pages = await Promise.all(routes.map((route) => readFile(new URL(route, import.meta.url), "utf8")));
  for (const pageSource of pages) assert.match(pageSource, /<AppHeader\b/);
});
