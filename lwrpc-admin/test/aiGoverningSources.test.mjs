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

test("LMS-0708 authority review keeps an unrelated LWR rule from suppressing USAP fallback", () => {
  const usapEvidence = usap("A player must not volley while touching the non-volley zone.", { ruleNumber: "11.A", combinedScore: .72 });
  const unrelatedLwr = lwr("Captains must submit lineups through Match Setup before the scheduled match.", { ruleNumber: "5.4", combinedScore: .41 });
  const input = { ...retrieval("Can I volley in the kitchen?", [usapEvidence]), authorityReviewCandidates: [usapEvidence, unrelatedLwr] };
  assert.deepEqual(ids(selectAnswerEvidence(input)), ["usap"]);
});

test("LMS-0708 production-shaped medical density fixture selects the rank-11 LWR rule before model generation", async () => {
  const question = "Medical issue during match";
  const usapMedical = (id, ruleNumber, score, content) => evidence(id, "usap_rulebook", content, { ruleNumber, pageNumber: ruleNumber === "21.C.9" ? 59 : 58, documentAuthorityRank: 2, combinedScore: score, semanticScore: 0, keywordScore: 0, exactScore: .85 });
  const topEight = [
    usapMedical("usap-21-c-8", "21.C.8", .5199, "21.C.8 Medical Time-Out Validity. A medical time-out must be requested for a valid condition."),
    usapMedical("usap-21-c-1", "21.C.1", .4927, "21.C.1 A player may request a medical time-out before a match begins."),
    usapMedical("usap-21-c", "21.C", .4875, "21.C Medical Time-Outs. A player may request a medical time-out under this section."),
    usapMedical("usap-21-c-5", "21.C.5", .4836, "21.C.5 A medical time-out begins when the referee announces the time-out."),
    usapMedical("usap-21-c-10", "21.C.10", .4830, "21.C.10 An invalid medical condition may result in a technical warning."),
    usapMedical("usap-21-c-3", "21.C.3", .4660, "21.C.3 Each player is allowed one medical time-out per match."),
    usapMedical("usap-21-c-2", "21.C.2", .4611, "21.C.2 A medical time-out may be requested between games."),
    usapMedical("usap-21-c-9", "21.C.9", .4518, "21.C.9 Match Retirement. A match retirement is imposed when a player is not able to continue play after the 15-minute medical time-out period expires. A player may use their available standard time-outs to allow more time before the match must be retired (Rule 21.A.4). In doubles, if the retiring player's partner decides to continue, the match will resume following all applicable rules. The retiring player must leave the playing surface."),
  ];
  const lwr57 = evidence("lwr-5-7", "league_rules", "5.7. Incomplete Matches: Forfeits vs. Retirements: If a player cannot complete a match for any reason, the scoring and DUPR eligibility depend on the current score: 5.7.1. Under 6 Points (Forfeit): If neither team has reached 6 points, the match is a Forfeit, recorded as 0-0, and excluded from DUPR. 5.7.2. 6+ Points (Retired): If at least one team has 6 or more points, the match is recorded as Retired. Current scores are entered, and results will be posted to DUPR. 5.7.3. Note: In both scenarios, the opposing team is credited with the win.", { ruleNumber: "5.7", pageNumber: 5, documentAuthorityRank: 1, combinedScore: .4242, keywordScore: .25, exactScore: .85 });
  const review = [
    ...topEight,
    usapMedical("usap-21-c-6", "21.C.6", .4481, "21.C.6 A medical time-out may not exceed 15 minutes."),
    usapMedical("usap-21-c-7", "21.C.7", .4328, "21.C.7 The referee starts the medical time-out when play stops."),
    lwr57,
    usapMedical("usap-21-a-4", "21.A.4", .4145, "21.A.4 A player may use a standard time-out as allowed by this rule."),
  ];
  const input = { ...retrieval(question, topEight), authorityReviewCandidates: review };
  const { answer, request } = await generate(input, "LWR Rule 5.7 controls the recorded outcome.");
  assert.equal(input.suppliedEvidence.length, 8);
  assert.equal(input.authorityReviewCandidates.indexOf(lwr57), 10, "LWR Rule 5.7 is Stage 3 rank 11 in the authority-review window");
  assert.equal(lwr57.sourceClassification, "lwr_controlling");
  assert.match(lwr57.governingDiagnostics[0].reason, /Direct local passage/);
  const usap219 = input.authorityReviewCandidates.find(({ ruleNumber }) => ruleNumber === "21.C.9");
  assert.equal(usap219.sourceClassification, "usap_governing_fallback");
  assert.equal(usap219.governingDiagnostics[0].overridden, true);
  assert.deepEqual(ids(answer.selectedEvidence), ["lwr-5-7"]);
  assert.deepEqual(ids(answer.sources), ["lwr-5-7"]);
  assert.match(request.input[0].content, /Under 6 Points \(Forfeit\)/);
  assert.doesNotMatch(request.input[0].content, /15-minute medical/);
});

test("LMS-0708 preserves the explicit medical continuation control question", () => {
  const lwr57 = lwr("5.7. Incomplete Matches: Forfeits vs. Retirements: If a player cannot complete a match for any reason, the scoring and DUPR eligibility depend on the current score. Under 6 Points (Forfeit): if neither team has reached 6 points, the match is a Forfeit. 6+ Points (Retired): if at least one team has 6 or more points, the match is recorded as Retired.", { ruleNumber: "5.7", pageNumber: 5, combinedScore: .4878 });
  const usap219 = usap("21.C.9 Match Retirement. A match retirement is imposed when a player is not able to continue play after the 15-minute medical time-out period expires. A player may use their available standard time-outs to allow more time before the match must be retired (Rule 21.A.4).", { ruleNumber: "21.C.9", pageNumber: 59, combinedScore: .4646 });
  const input = { ...retrieval("What happens if a player has a medical issue and cannot finish the game?", [usap219, lwr57]), authorityReviewCandidates: [usap219, lwr57] };
  const selected = selectAnswerEvidence(input);
  assert.deepEqual(ids(selected), ["lwr"]);
  assert.equal(selected[0].sourceClassification, "lwr_controlling");
});

test("LMS-0709 selects the production USAP NVZ rule by player-question scope", () => {
  const rule11a = usap("11.A Allowable Contact. All volleys must be initiated outside of the non-volley\nzone. A player, or anything in contact with the player, may contact the non-\nvolley zone at any time except during the act of volleying a ball.", { chunkId: "usap-11-a", ruleNumber: "11.A", pageNumber: 30, combinedScore: .4766, heading: "Allowable Contact" });
  const rule11a1 = usap("11.A.1 Fault – Non-Volley Zone Contact While Volleying. When a\nvolleying player or anything that has contact with the volleying\nplayer (including the player’s partner) contacts the non-volley\nzone, it is a fault against the player.", { chunkId: "usap-11-a-1", ruleNumber: "11.A.1", pageNumber: 30, combinedScore: .4245, heading: "11.A Allowable Contact — Fault – Non-Volley Zone Contact While Volleying" });
  const rule11a2 = usap("11.A.2 Fault – Non-Volley Zone Momentum. When a volleying player’s\nmomentum causes the player to contact anything (including the\nplayer’s partner) that is in contact with the non-volley zone, even\nafter the ball becomes dead, it is a fault against the volleying\nplayer.", { chunkId: "usap-11-a-2", ruleNumber: "11.A.2", pageNumber: 30, combinedScore: .4292, heading: "11.A Allowable Contact — Fault – Non-Volley Zone Momentum" });
  const rule11a3 = usap("11.A.3 Fault – Failure to Exit the Non-Volley Zone Before Volleying.\nAfter contacting the non-volley zone, when a player volleys a ball\nbefore both feet contact the playing surface completely outside\nthe non-volley zone, it is a fault against the player.", { chunkId: "usap-11-a-3", ruleNumber: "11.A.3", pageNumber: 30, combinedScore: .6956, heading: "11.A Allowable Contact — Fault – Failure to Exit the Non-Volley Zone Before Volleying." });
  const adaptiveContact = usap("25.B.2.d Fault – Non-Volley Zone Contact While Volleying. When a player’s assistive device, or anything that has contact with the volleying player (including the player’s partner) contacts the non-volley zone, it is a fault against the player.", { chunkId: "usap-25-b-2-d", ruleNumber: "25.B.2.d", pageNumber: 74, combinedScore: .4242, heading: "25.B.2 Assistive Devices — Fault – Non-Volley Zone Contact While Volleying." });
  const adaptiveMomentum = usap("25.B.2.e Fault – Non-Volley Zone Momentum. When a volleying player’s momentum causes the player’s assistive device to contact anything (including the player’s partner) that is in contact with the non-volley zone, even after the ball becomes dead, it is a fault against the player.", { chunkId: "usap-25-b-2-e", ruleNumber: "25.B.2.e", pageNumber: 74, combinedScore: .4160, heading: "25.B.2 Assistive Devices — Fault – Non-Volley Zone Momentum." });
  const definition = usap("3.A.4.c Non-Volley Zone. The 7-foot by 20-foot (2.13.m by\n6.08 m) area of the court adjacent to each end of the\nnet. The non-volley zone lines run parallel to the net, 7\nfeet (2.13 m) from the net on each end between the\ntwo sidelines. All lines that bound the non-volley zone\nare part of the zone. The non-volley zone is two-\ndimensional and does not extend above the playing\nsurface.", { chunkId: "usap-3-a-4-c", ruleNumber: "3.A.4.c", pageNumber: 12, combinedScore: .7727, heading: "3.A.4 Lines and Areas — Non-Volley Zone" });
  const unrelated = usap("20.E.2.h Replay – Volley Serve, Questionable Ball Height. When it is questionable whether the ball was no higher than the server’s waist when the paddle contacted the ball to make a volley serve, the referee may call for a replay.", { chunkId: "usap-20-e-2-h", ruleNumber: "20.E.2.h", pageNumber: 54, combinedScore: .4293 });

  assert.deepEqual(ids(selectAnswerEvidence(retrieval("Can I volley in the kitchen?", [rule11a, unrelated, rule11a2, rule11a3]))), ["usap-11-a"]);
  assert.deepEqual(ids(selectAnswerEvidence(retrieval("Can I volley in the NVZ?", [rule11a, definition, rule11a3, rule11a1, adaptiveContact, rule11a2, adaptiveMomentum]))), ["usap-11-a"]);

  // Production had 11.A at rank 11 for this wording. LMS-0708's bounded
  // authority-review set brings it to Stage 4 without widening model input.
  const nonVolleyInput = {
    ...retrieval("Can I volley in the non-volley zone?", [definition, rule11a3, rule11a2, unrelated]),
    authorityReviewCandidates: [definition, rule11a3, rule11a2, unrelated, rule11a],
  };
  assert.deepEqual(ids(selectAnswerEvidence(nonVolleyInput)), ["usap-11-a"]);

  assert.deepEqual(ids(selectAnswerEvidence(retrieval("Can I step into the kitchen after hitting a volley?", [unrelated, rule11a, rule11a2, adaptiveMomentum, rule11a3]))), ["usap-11-a-2"]);
  assert.deepEqual(ids(selectAnswerEvidence(retrieval("Can I volley before fully exiting the non-volley zone?", [rule11a, rule11a2, rule11a3]))), ["usap-11-a-3"]);
  assert.deepEqual(ids(selectAnswerEvidence(retrieval("What is the non-volley zone?", [definition, rule11a, rule11a3]))), ["usap-3-a-4-c"]);
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
