# LMS-0717 AI Quality Hardening — diagnosis for review

2026-09-05. **Diagnosis only; production remains accepted LMS-0716 / 0.1.538, Stage 7A complete.** No application, SQL, official document/corpus/embedding, metadata, environment or production changes. No deployment or version increment. This report is a diagnosis artifact, not an implementation approval.

Proposed sequence after review: **LMS-0717 / 0.1.539 — AI Quality Hardening**, then separately authorized **LMS-0718 / 0.1.540 — Stage 7B AI Feedback & Review**. The roadmap's previous Stage 7B version reservation is superseded by this owner instruction; update established version/roadmap locations during implementation, not this diagnosis.

## Evidence and limits

Nine fresh retrieval/selection-only replays used the existing production search RPC and configured embedding model for the supplied test questions. They bypassed application answer routes and Stage 7 capture; no new telemetry or feedback was created. Normal limits were 32 candidates, 8 handoff, 12 authority review, .35 sufficiency threshold and four selected chunks. No answer model was called in this pass. Exact historical generated wording remains an owner observation; fresh ranks and selections below are not claimed as the unretained historical trace.

The accepted prior reimbursement diagnosis supplies its six-question replay, exact model input/output and LMS-0715 comparison. It is reused rather than repeating model calls. Current selector/generator code retains those paths. A fresh corpus inventory confirms the active USAP version contains **666 total chunks: 586 searchable, 80 excluded**. These counts are not a new corpus defect or a change; do not reactivate excluded fragments. The seven active documents have 716 searchable chunks in total.

All **209 existing tests passed unchanged**. This proves the current regression baseline, not that the reported defects are covered. Fresh full retrieval data is retained locally in `lwrpc-admin/.next/lms0717-diagnosis-traces.json`; the durable relevant source excerpts and ranks are included below. No credentials, query embeddings, model headers or signed URLs are included in this report.

## 1. Reimbursement Stage 3/4/generation failure

See `lms-0716-reimbursement-diagnosis.md` for the full prior trace. For the original long policy question, Stage 3 top score was .4707. Uppercase LWR acronym matching contributed exactScore=.95 despite zero keyword scores; rank/authority brought related club text above the .35 gate. Stage 4 selected Code of Conduct p1 (rank1/.4707), Player Requirements p2 (rank3/.4531), waiver p14 (rank5/.4480), and Team/Game Rules p4 (rank6/.4462). None establishes the requested reimbursement policy.

The gate is especially inconsistent across paraphrases: the two shorter controls undergo existing corpus-grounded LWR PC → lwrpc query normalization and finish below threshold. Prior verified controls:

| Question | Top score | Current outcome / selected evidence |
|---|---:|---|
| Does LWR PC reimburse me for lost prescription sunglasses? | .3173 | insufficient_evidence; no evidence/model |
| Does LWR PC reimburse members for lost personal property? | .3299 | insufficient_evidence; no evidence/model |
| What does the LWR waiver say about personal property? | .4939 | waiver p14, rank1 |
| What does the waiver release the club from liability for? | .5190 | waiver p14, rank1 |

Preserve these distinctions without matching reimbursement/sunglasses as special phrases. Explicit requests to summarize a waiver may use the actual waiver summary with its limits; they must not infer that an unstated property scenario is covered. An applicability question such as whether the waiver establishes a specific property remedy still requires that proposition in the source.

## 2. Exact generic applicability weakness

Source anchors: `app/lib/aiAnswerGeneration.js:27` (dispatch), `:43` (local selector), `:79` (intents), `:103` (support), `:340` (relevance/material contribution), `:351` (roles), `:454` (prompt); `aiGoverningSources.js:154` (issue selection).

- `selectAnswerEvidence` first requires the Stage 3 sufficient flag. When any USAP candidate exists in the bounded review pool, it invokes governing selection; otherwise it invokes local selection directly.
- Governing selection filters candidates at .35 and looks for direct USAP applicability. If none applies and there is no selected-equipment control, it calls the local LWR selector with the LWR candidates. **This fallback bypasses the generic directPassages test for LWR.** USAP presence does not by itself guarantee a stricter LWR check.
- The local selector takes `candidates[0]` unconditionally. No `hasDirectRelevance`, material-contribution or issue-support predicate is applied to that primary in the no-intent path. Optional candidates must exceed `max(threshold, primaryScore-.10)`, have exactScore>0, keywordScore>0 or a non-None retrieval intent evidenceMatch, and pass materiallyContributes.
- Material contribution succeeds for a different same-rule chunk, any more-authoritative candidate, procedural instructions for a how-to request, or any additional question term. None alone demonstrates the requested proposition. The question-term filter still treats substantive-looking filler such as start/adding as signals.
- If no specialized intent is detected, the first four survive immediately. If intents exist, the selector reserves strongest per-intent evidence then filters optional evidence by intent support. It does **not require that every detected issue has a direct match**: missing entries are simply filtered out. The governing path likewise reserves covered issues without a global completeness assertion.
- Classification chooses the lowest-authority-rank rule/supplement from the already-selected set as controlling, even when it only concerns a different issue. Guides can be useful direct procedural evidence; they cannot control playing rules. Current labels conflate that useful role with a broad generic fallback.
- The prompt labels an empty intent-support list as “Direct official evidence.” That is an assertion without supporting selector proof. Current generic code does not reliably separate direct, contextual and tangential content.

## 3. Generation/status and deterministic sufficiency

`aiAnswerGeneration.js:151` skips only if Stage 3 fails or the selected list is empty. Its prompt explicitly permits saying evidence does not support all of a question and forbids guessing. Structured output contains only answer and conflict; it has no unsupported field. Any valid nonempty model output yields `evidenceSufficient: true` (`:225`), regardless of a missing-policy admission in its prose. `askLwrPlayerAnswer.js:112` consequently assigns answer unless conflict is true. Prior LMS-0715 and LMS-0716 replays both admitted missing policy yet returned answer. Valid JSON is not evidence sufficiency.

Recommend a deterministic pre-generation rule: each substantive requested issue must have at least one coherent, directly applicable official passage with matching subject/action/condition and necessary league/procedural scope. Rank/authority may order these matches, never create them. Unsupported or incomplete issue coverage should take the existing skippedAnswer/insufficient_evidence path, not be repaired by interpreting model prose. Do not introduce a second answerability model or parse phrases like “does not state.” The generative summarizer still requires prompt constraints and testing; deterministic matching is conservative evidence validation, not a proof that arbitrary generated language can never err.

Do not copy the current generic `terms.every(...)` rule wholesale into the LWR path. Its sentence-level literal matching and filler sensitivity would reject valid procedures and waiver-summary controls. Use bounded, testable issue profiles and coherent operative passages, with conservative generic subject/proposition matching. Preserve numbers, negation, conditions, league and action/object qualifiers; normalize only known framing and bounded inflections. Missing confidence in applicability must not fall back to the first rank.

## 4–6. Weekend/Saturday timing and contamination

Fresh original question: `When can I start adding players to my roster for the weekend league`.

| Candidate | Rank / combined score | Result |
|---|---|---|
| DUPR Captains Guide p7, CREATE/UPDATE TEAM ROSTER | 1 / .6991 | selected |
| DUPR League Rules p4, Team/Game Rules, includes 5.4 | 2 / .6514 | selected, labeled controlling |
| DUPR Captains Guide p9, ENTER/VERIFY SCORES | 3 / .6497 | selected |
| Important Dates p2, PrimeTime | 4 / .5176 | not selected |
| Important Dates p1, Weekday | 5 / .5125 | not selected |
| Important Dates p1, Saturday | 8 / .4901 | not selected |

The exact applicable source is **2026 Fall League Important Dates, page 1, Saturday DUPR League Key Dates**, chunk `f9f05921-2ee9-46fc-9b44-e5a861d7dd6f`:

> Sept. 28, Monday - Can start updating rosters

The source exists inside both normal handoff and authority review. It is not missing or unembedded. The document identifies the 2026 fall calendar; the October Saturday season starts are later, and registration opening is a different event.

Why contamination occurs:

1. Stage 3 detects roster terminology from roster/league plus **when**. Its broad chunk-level concept signals can match update/players/date scattered through Match Setup and score-entry chunks. All three selected candidates have keyword=.95 and exact=.85. This is recall, not answer applicability.
2. Stage 4 requires whole-word add/remove/delete/drop/update/change/lock/open/close. **Adding does not match add.** All selected intentSupport arrays are empty. The LMS-0705 specific roster/match filters never run.
3. Generic cutoff is .5991. Saturday .4901, Weekday .5125 and PrimeTime .5176 all fail despite being actual roster calendar sources. The primary guide stays; p4 passes because its authority is stronger than the guide; p9 adds the literal **weekend**, present in its score-verification deadline but absent from the primary. This explains the score-entry selection exactly.
4. No weekend→Saturday alias or league-text compatibility exists for the original query. Every candidate reports leagueTextDiagnostic=None. Stage 3 terminologyDiagnostic says Team/season roster management even for p4/p9, illustrating why that coarse diagnostic cannot prove Stage 4 support.

The fresh replay does **not select a Weekday-specific chunk** for this exact question. Weekday material is retrieved, not selected; do not claim the historical unretained answer did so. There is nevertheless no league-scope rejection in the specialized roster support function.

Controlled comparisons:

- Replacing only weekend with Saturday in a fresh retrieval moves Saturday to rank2/.6742 with “League-text/context compatibility: saturday”; guide remains rank1/.6965 and p4 rank3/.6672. All three are selected because **adding** still misses the intent. Alias alone is insufficient.
- Fresh `When can I add players to my roster for the Saturday League?` detects roster intent and selects only Saturday Dates (rank3/.6737).
- Holding the original weekend candidates/ranks fixed and changing only question wording to add (with either weekend or Saturday) selects **PrimeTime**, rank4/.5176. Calendar support strength120 ties across leagues and ranking wins. This is a diagnostic input comparison using unchanged code, not an implemented normalization.

Recommendation: recognize **weekend league** as a bounded Saturday League reference only within LWR league context, without overriding an explicit different league or treating any weekend event as Saturday. Apply league compatibility before strength/authority/rank. No query/RPC change is needed for these cases: the correct Saturday chunk is already retrieved. An internal question-scope analysis is sufficient initially; do not widen retrieval limits or globally substitute weekend. If an actual ambiguous/non-LWR weekend league is encountered, clarify rather than assume.

## 7. Missing-object ambiguity

`When can I start adding players` resolves standalone. Its fresh Stage 3 top is .4003, but that is a USAP withdrawal/start-of-bracket fragment; only USAP candidates clear .35 in the bounded review set. With no directly applicable USAP passage, the LWR fallback is empty. Hence current insufficient_evidence is Stage 4 rejection, not proof that roster instructions are absent.

Recommend pre-retrieval clarification for bounded adding/entering-players requests with a genuinely missing destination/object: team roster versus match lineup/Match Setup (or another procedure). Suggested concise prompt: “Do you mean adding players to your team roster or entering players into a match lineup?” This is intent clarification, not a guessed object. Explicit roster and explicit lineup questions remain standalone. Avoid broadly clarifying every mention of players; preserve complete questions, guards and standalone supersession.

Current structured clarification supports only color_subject: `aiConversation.js:44–53,129–139`; `askLwrPlayerAnswer.js:121` creates a clarification receipt only for color_subject. A new bounded operation-object category needs both recognition and category-specific reply composition/receipt support. Consume “team roster” or “match lineup” only with a valid matching clarification receipt; unrelated complete questions supersede. Keep the existing raw and effective personal/live-data guards in their current order and preserve Color→Ball/Paddle behavior.

First turn becomes clarification before retrieval/generation and Stage 7A stores lightweight metadata only. The clarified normal retrieval can then answer or produce a true source gap. Do not retroactively rewrite the earlier unanswered occurrence or its group.

## 8. General roster-entry procedure versus enforcement

Fresh `How do I enter players on my roster` has no specialized Stage 4 intent because enter is absent from the roster verbs. It selects:

| Source | Rank / score | Why admitted |
|---|---|---|
| Captains Guide p7 CREATE/UPDATE TEAM ROSTER | 1 / .4967 | unconditional primary |
| Rules p6, heading Roster Continuity, 5.13.3 | 5 / .4195 | more authoritative than guide |
| Rules p5, Team/Game Rules, contains 5.5 | 6 / .4139 | more authoritative than guide |
| Rules p12, heading Scheduling, 6.3.1 | 7 / .4023 | more authoritative than guide |

Cutoff=.3967; all three optional rule chunks have exactScore=.85. Their Stage 3 procedural evidenceMatch is None, but exactScore plus authority suffices. Higher-ranked score-entry chunks do not materially add a question signal here and are excluded. Four slots fill before p4.

Exact relevant source: **DUPR League Rules, Rule 5.5, page 5**. Stored chunk heading/ruleNumber is broad Team/Game Rules/5; the body identifies 5.5:

> 5.5. Roster Requirements & Retroactive Additions: All active players must appear on the team’s roster in the LMS prior to match play. Retroactive additions are permitted without penalty only if the player is a valid LWR PC member with an eligible DUPR account and rating. Failure to meet these requirements will result in a match forfeit, and the match will not be posted to DUPR.

The reported enforcement statement is substantively supported, with an important precision: the stored passage says **is a valid member**, not a historical status adjudication about a particular player. Do not claim a live eligibility finding or resolve timing ambiguity beyond the text. It is not necessary to explain Manage Roster/Add Player. Membership/DUPR/division prerequisites may legitimately support the procedure; retroactive remedies/forfeiture are a distinct issue. The primary guide already states prerequisites directly.

A fresh `How do I add players to my roster?` selects only guide p7 (rank1/.7137), showing the lexical-path discontinuity. Even recognizing enter is insufficient as a general design unless supporting evidence is tested for material contribution and issue scope. Preserve Rule 5.5 for actual retroactive-addition/ineligible-player/forfeiture questions; do not blacklist its document, page or text. Preserve essential prerequisite passages and exclude rescheduling, playoffs and unrelated age-based league restrictions unless asked.

## 9. Smallest safe common architecture

Keep existing retrieval, governing profiles, evidence cap, source validation and telemetry. Tighten the selector seam rather than replace accepted NVZ/equipment behavior:

1. Build a bounded internal issue description: action, object, requested answer type (timing/procedure/eligibility/remedy/document summary), substantive conditions and league scope. Include adding/entering roster variants without conflating match lineups or scores.
2. Evaluate coherent verbatim body passages against each issue. Structural headings help establish scope but cannot manufacture a proposition. Do not combine scattered paragraphs into support. Procedural guides can be direct for a procedure.
3. Require direct evidence for every substantive issue before generation. Preserve supported compound issues before optional support; if coverage cannot fit the established cap or a requested issue is unsupported, use the existing fallback rather than falsely claim completeness.
4. Rank applicable matches using existing issue-specific strength and LWR/USAP precedence. Reject cross-league evidence before comparison. Do not let global authority replace the applicable USAP issue or the primary procedural guide.
5. Admit supporting content only for a named material prerequisite, same-issue continuation or requested detail not already covered. Different same-rule text, stronger authority, or one extra word is insufficient. Explicitly distinguish direct/context/tangential internally.
6. Send only eligible verbatim local passages where a broad LWR chunk otherwise contains unrelated remedies or topics, following the existing USAP selected-passage precedent. Retain original chunk/source/page identity and trusted validation. Do not rewrite corpus text or invent excerpts. This closes contamination from siblings inside an otherwise valid selected chunk.
7. Use truthful model-input support labels and existing non-invention instructions. Do not convert a nonempty selected set or valid model JSON into unconditional proof that all issues are answerable. Do not parse generated prose to repair kind afterward.

This is a bounded architecture proposal, not implemented code. Deterministic generic matching requires realistic positive controls before approval of a fail-closed rollout; merely replacing primary admission with every-literal-term matching is not acceptable.

Related control finding: fresh Match Setup-only question selected guide p7 rank1/.4758 plus **Rules p16 Picklebreaker “The Lineups”**, rank5/.4008. The latter passes the weak local Match Setup support path at strength75, labeled “Direct Match Setup procedure passage”: it contains **lineup** plus **save** in “save that team for the finish.” The procedural matcher treats this strategic use of save like a UI save action; its structural Picklebreaker heading is not excluded. Its stronger rule authority then admits it. The exact current support test must be constrained to individual-match submission, not any lineup discussion. This reinforces the same scope/material-contribution design; do not bolt on a Picklebreaker blacklist. The compound LMS-0705 question still selected Dates rank6/.4817 and Rules p4 containing 5.4 rank4/.5035. Both results belong in realistic regressions.

## 10. Production-realistic regression plan

Freeze the full original candidates, order, scores, document types/authority, headings, rule/page identity and body text for the nine traces; do not reduce them to idealized one-sentence fixtures. Supplement with the prior reimbursement candidates and accepted LMS-0705/LMS-0711 fixtures. Use isolated mocked generation for expected status and exact evidence assertions; do not insert production feedback for tests.

| Fixture family | Required assertions |
|---|---|
| Long reimbursement + actual tangential LWR pool | no direct support, no answer-model call, insufficient_evidence; short paraphrases remain no-source |
| Explicit waiver summaries | actual p14 summary survives, no invented property coverage or remedy; source-specific qualifier limits preserved |
| Weekend/Saturday timing | correct Saturday Dates retained at rank8; adding/add/enter variants; reject PrimeTime/Weekday and match/score chunks even with higher rank; non-LWR weekend and explicit conflicting league negative controls |
| Roster how-to | Manage Roster procedure + only essential prerequisites; no p5 remedy, p6 reschedule/playoff, p12 age-based restrictions unless actually requested |
| Retroactive/ineligible/forfeit | correct Rule 5.5 remains directly applicable; no blanket removal of enforcement |
| Match Setup-only | direct submission deadline/procedure; reject p9 score entry and p16 Picklebreaker; include broad p4/guide siblings |
| Score-entry-only | actual score instructions remain; no forced roster intent |
| Compound roster + Friday lineup | preserve existing LMS-0705 Dates + Rule 5.4; independent coverage before support; unsupported second issue must not be silently dropped |
| Missing operation object | clarify before retrieval; no unmatched fallback group; valid receipt+team roster/lineup replies run normal retrieval; standalone supersession and expired/foreign receipts |
| Generic positive/negative pairs | NR, Season DUPR, Reliability Factor, conduct/procedures with framing variants; tangential top candidate versus lower direct passage; authority order cannot change applicability |

Retain all user-required LWR controls: Franklin Outdoor X-40 Optic, medical 5.7, coach access 5.8, roster troubleshooting without live diagnosis, NR/Season DUPR/Reliability Factor. Retain USAP 11.A, 11.A.2, 11.A.3, 7.A.2 versus 7.A.2.a, 3.C/legal-ball, damaged ball and 3.C.3 color. Preserve Color→Ball, Color→Paddle legitimate no-source, personal guards, viewer security, mobile layout, feedback semantics and Stage 7 neutrality. Re-run the existing 209 tests plus new production-shaped fixtures; passing today's 209 alone is insufficient.

Future disclaimer UI tests: exact text once above composer, muted/centered/responsive wrapping, safe-area/keyboard/scroll/close behavior and source links unchanged. Future validation: npm test, lint, nonincremental tsc, PDF server bundle verification, build (isolated clean fallback only for the known cache lock), git diff --check, bounded desktop/mobile checks. No new corpus processing or production writes are needed for local regressions.

## 11–14. Files, SQL/telemetry compatibility and implementation scope

Expected application/test files after approval:

- `app/lib/aiAnswerGeneration.js`: primary/optional applicability, per-issue completeness, material contribution and truthful prompt labels.
- `app/lib/aiGoverningSources.js`: preserve specialized precedence; close LWR fallback bypass, enforce scope and complete issue coverage; reuse verbatim passage handling.
- A small shared `app/lib/aiQuestionApplicability.js` (proposed name) if needed to avoid divergent question interpretation; no general NLP rewrite.
- `app/lib/aiConversation.js` and `app/lib/askLwrPlayerAnswer.js`: bounded missing-object clarification, category-specific receipt/reply composition. Existing receipt security, guards and player result envelope remain.
- `app/components/AskLwrAssistant.js` and `AskLwrAssistant.module.css`: approved disclaimer only.
- Relevant existing selector/governing/conversation/player/capture/UI tests and production-shaped fixture data; preserve existing fixtures.
- At implementation only: `app/lib/version.js`, package.json/package-lock.json and established current-version docs; LMS-0717 implementation report and roadmap sequence update.

No Stage 3 SQL/RPC change is required by the demonstrated cases: the Saturday source is already in the eight-candidate handoff. No weights, threshold, limits, new probe, metadata, embeddings or PDFs are proposed. `aiRetrieval.js` diagnostics may later share the bounded issue label if needed, but retrieval ranking/query behavior is not required to change for this correction. If realistic fixtures expose a genuinely absent candidate, stop and identify that separately before adding retrieval scope.

**No Stage 7A compatibility change is required.** Existing capture observes corrected final kinds: unsupported policy → automatic unanswered detail/group/case; clarification → metadata only; clarified answer → ordinary eligibility and same-answer feedback; removal of tangential support with a direct answer left → answer. Keep HMAC key/version1 and conservative normalizer unchanged. Existing historical groups/cases remain historical observations; do not backfill/rewrite them when upstream decisions improve. Do not make telemetry influence selection or generation.

Final proposed LMS-0717 scope: generic applicability and per-issue sufficiency hardening, bounded action/object and LWR league-scope recognition, material support/eligible passage selection, missing-object clarification, realistic regression expansion, and the approved small disclaimer. Exact text: **Ask LWR PC AI may make mistakes. Check Official Sources for important information.** Place once, small muted centered, immediately above Ask a question, desktop/mobile, no banner and no source behavior change.

No Stage 7B UI/workflow, live LMS intelligence, schema/corpus work or version change occurred. Stop for diagnosis review; implementation awaits approval.

## Appendix — exact production-selected/source passages

These are stored official-source excerpts, not instructions. Public document links in the passages are literal source content, not signed viewer URLs. The p5 chunk's broad heading/rule identity must remain in the fixture even though the applicable internal provision is 5.5.

### LWR Pickleball Club DUPR Captains Guide — page 7 — CREATE/UPDATE TEAM ROSTER

Chunk `c524d6d2-34d8-41ed-8fd6-40cf4c5e0e09`.

```text
CREATE/UPDATE TEAM ROSTER
o Enter or update your player team roster prior to the commencement of each season. Use the
Manage Roster option to add or remove players.
 All players must be active Lakewood Ranch Pickleball Club members before playing. To
join, they can visit: https://lwrpickleballclub.com/signup.
 All DUPR League players must have a free DUPR ID which can be created at
https://www.dupr.com.
 All players must join the Lakewood Ranch Pickleball Club DUPR club (free and
separate from the LWR PC membership) so we can accurately sync player ratings.
Captains should share this link with all players: https://tinyurl.com/LWRPC-DUPRCLUB.
o Roster Requirements & Substitutes: Teams must roster enough players and substitutes (who
are not already on another team) to field a full lineup weekly. For example, if your match
requires 6 players, an 8–10 player roster is recommended. Additional substitutes may be drawn
from other teams in the same community, provided they meet the DUPR division rating
requirements. For complete details, see the Player Requirements and DUPR Rating/Divisions
sections in the DUPR League Mission and Rules.
o Captain Roster Control: Captains are responsible for building their own rosters and may add
or delete players throughout the season as needed provided the player is a current, valid
member of the LWR PC, has a DUPR ID and is eligible for that division.
o Player DUPR Ratings: Season DUPR ratings are updated in the LMS before the season starts
and remain visible to captains all season. For players added midseason, their rating is based on
the date the league's season ratings were originally recorded.
```

### LWR Pickleball Club DUPR League Rules — page 4 — TEAM/GAME RULES

Chunk `3080dcfb-af85-489b-b3a6-d98e2626f7be`.

```text
5. TEAM/GAME RULES
5.1. Team Home Court Expectations: All teams registering for league play are expected to
host their share of scheduled home matches by providing adequate court availability,
resulting in a balanced home-and-away schedule whenever possible. If a team cannot
reserve enough courts for all its assigned home match dates, additional matches may be
scheduled as away games. Teams that are unable to provide any courts due to limitations
within their community or facility will play all their scheduled matches as away games.
5.2. Governing Rules & Equipment Standards: All matches are governed by USA Pickleball
Rules (https://usapickleball.org/) and equipment standards including USA Pickleball
approved equipment. In the event of a conflict, specific Lakewood Ranch Pickleball Club
(LWR PC) rules shall take precedence over the corresponding USA Pickleball rules and
regulations.
5.3. Unauthorized Equipment Penalty: Games played with unauthorized paddles or
equipment will be forfeited, not recorded, and not posted to DUPR if discovered by
players/captains during or after play.
5.4. Match Setup and Roster Exchange: Home and visiting Captains must submit their
upcoming match rosters through the League Management System (LMS) using the Match
Setup button no later than three (3) days prior to the scheduled match. It is strongly
recommended that the Home Team submit its lineup first. Automated reminder emails
will be sent to all Captains. Any lineup or roster changes made after the initial submission
must be entered through Match Setup, which will automatically notify the opposing
Captain(s) of the change. Teams that have not completed Match Setup will not be able to
print a completed Match Score Sheet. Repeated failure to complete Match Setup within
```

### LWR Pickleball Club DUPR Captains Guide — page 9 — ENTER/VERIFY SCORES

Chunk `fb919a5a-ae9f-4fcf-afa4-409e656a8ee1`.

```text
 Entering Match Scores: To enter scores, click the Enter Match Scores button in the
match. This option becomes available only on or after the scheduled match date and
will be red.
 Forfeits and Weather Delays: If an entire match date is forfeited or canceled due to
weather, notify League Management. They will log the information for that match and
update the standings.
 Score Entry Process: When entering scores, use the dropdown menus to select the
players for each game (built from your Match Setup), then enter the scores in each
game block. Click Submit when finished; the system will check for errors before saving.
 Score Verification: Once scores are submitted, the opposing captain will receive an
email request to verify them, and a red notification count will appear in their Pending
Match Verifications block. The opposing captain must open the match, review the
scores, and click the verification button (or dispute button if they don’t accept the
scores as written). Both captains will then be notified, and the standings will update
automatically.
o The visiting team captain must verify match scores promptly. This ensures there is enough time
to review the results and enter them into DUPR before the end of the weekend.
```

### 2026 Fall League Important Dates — page 1 — Saturday DUPR League Key Dates

Chunk `f9f05921-2ee9-46fc-9b44-e5a861d7dd6f`.

```text
Saturday DUPR League Key Dates
• Sept. 7, Monday – Open Registration
• Sept. 27, Sunday – Season DUPR ratings recorded
• Sept. 28, Monday - Can start updating rosters
• Oct. 4, Sunday – Last day to register
• Oct. 7, Wednesday – Schedules completed and sent
• Oct. 17 - Saturday DUPR7 Season Starts
• Oct. 24 - Saturday DUPR6 / DUPR8 Season Starts
• Nov. 25 / 26 Break Week
• Dec. 5 / 12 - Last games of 1st half / break
• Jan. 9 / 16 - Start of 2nd half
• Feb. 20 / 27 - End of Regular Season
• Mar. 6 / 13 - Championship Days (PlayoƯs with top 4 teams)
• Jamboree - Mar. 20 / 27
Note:
No games the week of Nov. 22 for Thanksgiving Break
No games after Dec. 13 – Jan. 8 for Christmas Break
```

### LWR Pickleball Club DUPR League Rules — page 6 — Roster Continuity

Chunk `2a8f2b2a-c421-4516-afae-723802f8b649`.

```text
5.13.3. Roster Continuity: When a game is rescheduled, the players originally assigned to
it must participate and maintain their original positions/line assignments.
5.14. End of Season PlayoƯs/Championship Day (All Leagues)
5.14.1. Teams starting the season with fewer scheduled games than others in their
Division/Pool will receive compensatory points at the end of the season. These
points will be calculated based on the team’s average points earned per match
date, rounded to the nearest whole number (0.5 and above rounds up; 0.4 and
below rounds down).
```

### LWR Pickleball Club DUPR League Rules — page 5 — TEAM/GAME RULES

Chunk `7a1fb421-89d9-4ddd-b089-b6ec12b2c3c9`.

```text
the required timeframe may result in forfeiture of the current or future matches, at the
discretion of League Management.
5.5. Roster Requirements & Retroactive Additions: All active players must appear on the
team’s roster in the LMS prior to match play. Retroactive additions are permitted without
penalty only if the player is a valid LWR PC member with an eligible DUPR account and
rating. Failure to meet these requirements will result in a match forfeit, and the match will
not be posted to DUPR.
5.6. DUPR Submission & Eligibility: All qualifying games will be automatically entered into
the DUPR rating system. Games that are forfeited, incomplete, or deemed ineligible will
not be recorded in DUPR (unless otherwise specified by a rule). Individuals/Players are
not authorized to independently submit any Club League scheduled games to DUPR.
5.7. Incomplete Matches: Forfeits vs. Retirements: If a player cannot complete a match for
any reason, the scoring and DUPR eligibility depend on the current score:
5.7.1. Under 6 Points (Forfeit): If neither team has reached 6 points, the match is a
Forfeit, recorded as 0-0, and excluded from DUPR.
5.7.2. 6+ Points (Retired): If at least one team has 6 or more points, the match is recorded
as Retired. Current scores are entered, and results will be posted to DUPR.
5.7.3. Note: In both scenarios, the opposing team is credited with the win. A substitute
may fill in for any remaining games in the session; however, any games left unplayed
without a substitute will be marked as forfeited.
5.8. Coaching & Court Access: Coaching is permitted only during timeouts or between
games. Coaches and non-players must always remain oƯ the court; only active players
may be on the courts.
```

### LWR Pickleball Club DUPR League Rules — page 12 — Scheduling

Chunk `03713d3b-211d-45cb-bac2-410cf3c50e44`.

```text
6.3.1. Scheduling: Women’s and men’s games are typically scheduled for Fridays at
noon.
6.3.2. Roster & Courts: 4 players / 2 lines. Requires 2 courts. Player age is determined as
of 12/31 of the season’s starting year. Players must be 65 or older and will use the
DUPR Age-Based Rating. Players who are not 65 at the start of the season will be
rated NR since they will not yet have an official 65+ age-based rating.
```

### LWR Pickleball Club DUPR Captains Guide — page 7 — CAPTAINS NORMAL WEEKLY PROCESS

Chunk `6e572a43-4aed-47a8-89fc-518ecb52e7e9`.

```text
CAPTAINS NORMAL WEEKLY PROCESS
o Captain Match Duties: For every match, captains or co-captains must set their lineup (Match
Setup), print the score sheet, and enter or validate final scores.
o Lineup Submission: Both captains must enter starting lineups in Match Setup at least 3 days
before match day. It is recommended that the Home Team enter their lineups first.
 Updates: You can modify your lineup until match day. The system automatically emails
changes to the opposing captain.
 Penalties: Repeated incomplete or late lineup submissions may result in match
forfeiture, subject to League Management discretion.
o Match Day Team Responsibilities:
o The Home team is responsible for:
 Bringing league-provided balls.
 Printing the physical score sheet and recording match results.
 Entering final scores into the system after the match.
o The Visitor team is responsible for:
 Visiting captains may print a backup score sheet, but official score recording is the
home team's duty.
```

### LWR Pickleball Club DUPR League Rules — page 16 — PICKLEBREAKER™ GAME OVERVIEW

Chunk `674b964e-b3aa-4f9a-8907-98d955dd0f13`.

```text
established order. The rotation process shall continue, as necessary, until the game is
completed and a winner is determined in accordance with the applicable scoring rules.
The Lineups: Captains determine the lineup order, making strategy an important part of the
game. They must decide whether to start with their strongest team or save that team for the
finish. The changing matchups shift the game’s momentum, while teammates cheering adds
energy and excitement that can help push a team toward victory.
With short doubles sequences and teams ready to rotate in quickly, the Picklebreaker creates a
tense, exciting finish to a full day of pickleball.
```
