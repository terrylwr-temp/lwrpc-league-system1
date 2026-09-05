# LMS-0717 / 0.1.539 — AI Quality Hardening

**Current status (2026-09-05): LMS-0717 / 0.1.539 was deployed by the owner and is NOT production accepted. The approved correction described in the addendum below is implemented locally and has not been deployed.** LMS-0716 / Stage 7A remains production accepted; Stage 7B / LMS-0718 and Live LMS Intelligence have not started. The numbered initial-implementation sections below retain their original validation checkpoint; use the correction addendum for current results.

This implements the owner-approved diagnosis in `lms-0717-ai-quality-hardening-diagnosis.md`. No production request, external answer-model replay, database mutation, corpus processing or deployment was performed in this implementation pass.

## 1. Exact files changed for LMS-0717

Paths below are relative to `C:\lwrpc-league-system`.

| File | Change |
| --- | --- |
| `lwrpc-admin/app/lib/aiQuestionApplicability.js` | New matcher-only operation normalization, league compatibility, coherent body passages, conservative generic applicability, independent question clauses and missing-object helpers. |
| `lwrpc-admin/app/lib/aiAnswerGeneration.js` | Direct applicability before rank, complete detected-issue coverage, roster/lineup/score/enforcement separation, bounded selected passages and manager diagnostics; generic instruction against inferring a policy from silence. |
| `lwrpc-admin/app/lib/aiGoverningSources.js` | League compatibility and complete per-issue coverage; trim LWR as well as USAP input to applicable passages; bounded manager diagnostics. |
| `lwrpc-admin/app/lib/aiConversation.js` | New `player_entry_object` clarification using the existing encrypted, user-bound receipt lifecycle. |
| `lwrpc-admin/app/lib/askLwrPlayerAnswer.js` | Issue the existing clarification receipt for that new category. Guards and player response shape unchanged. |
| `lwrpc-admin/app/components/AskLwrAssistant.js` | One exact approved disclaimer immediately above the composer. |
| `lwrpc-admin/app/ai-assistant/console/page.js` | Render manager-only issue, direct/supporting/excluded role, league compatibility and reason. |
| `lwrpc-admin/app/lib/version.js` | `LMS-0717`. |
| `lwrpc-admin/package.json` | `0.1.539`. |
| `lwrpc-admin/package-lock.json` | Root/package version `0.1.539`; no dependency changes. |
| `lwrpc-admin/test/aiQualityHardening.test.mjs` | 18 focused production-fixture, clarification, capture and UI tests. |
| `lwrpc-admin/test/fixtures/lms0717-production-evidence.json` | Sanitized existing diagnosis retrieval fixtures: broad official chunks, rankings and metadata for 15 questions. No embeddings, credentials, model output or member records. |
| `lwrpc-admin/test/aiAnswerGeneration.test.mjs` | Strengthen the shared model-transport fixture from placeholder “official rule evidence” to operative scoring-freeze evidence; retain its existing assertions and all tests. |
| `docs/project-roadmap.md` | Separate accepted production from local implementation, record quality correction and Stage 7B reservation. |
| `docs/stage-7-ai-feedback-review-design.md` | Current Stage 7B reservation and phase references updated; preserve historical Stage 7A details. |
| `docs/lms-0717-implementation-report.md` | This implementation and validation report. |

Pre-existing working-tree documentation was preserved: LMS-0716 implementation/acceptance additions, `lms-0716-reimbursement-diagnosis.md`, and the approved LMS-0717 diagnosis. These are earlier task history, not new LMS-0717 functionality. Ignored build artifacts are not deployment source.

## 2. Generic applicability and deterministic coverage

The leading LWR candidate no longer survives solely because it ranks first. Every retained candidate must contain an applicable operative body passage. Heading matches, rank, acronym boosts and authority cannot independently qualify evidence. Stage 3 scores, thresholds, terminology expansion, RPCs and candidate retrieval remain unchanged. Stage 4 can inspect the already bounded authority/intent review candidates, allowing relevant evidence below the old leading-score delta to qualify.

The matcher removes conversational framing and canonicalizes bounded concepts/morphology; it does not require every literal raw question word. Medical/retirement, conduct, coaching and NVZ paraphrases retain their accepted controls. Unrecognized substantive concepts are treated conservatively rather than expanded by a model or silently discarded. This is a deterministic applicability matcher, not a claim of universal natural-language entailment.

Explicit independent interrogatives are evaluated separately. Each detected issue must have direct evidence, including after the four-chunk cap; otherwise selection returns empty and the existing `insufficient_evidence` path skips source resolution/generation. Noun conjunctions remain together to preserve qualifiers. “When and how” retains its shared object. No generated-prose parsing determines whether evidence existed.

Named-document questions select the actual document/section scope and retain its operative wording, rather than incidental requirements elsewhere to sign or consult it. The generic generation instruction requires conclusions to stay within the selected scope and prevents treating a broad release as a separate policy/entitlement. It contains no reimbursement/sunglasses/lost-property answer or special response.

## 3. Direct and supporting evidence; governing hierarchy

One strongest direct passage is reserved per detected issue. Supporting candidates must themselves support that same issue and add requested procedure, controlling requirements or distinct applicable detail. Procedure support remains available alongside a direct governing rule. Duplicate generic bodies are removed. Unrequested score-entry and enforcement paragraphs are excluded from roster procedures; only applicable verbatim passages are sent to generation.

Authority operates after applicability. Directly applicable specific LWR rules control their issue; otherwise applicable USAP rules govern. Guides explain supported procedures without globally overriding playing rules. Existing equipment/NVZ/serve-specific applicability and override rules remain intact. The selected evidence budget remains four chunks.

Manager diagnostics report bounded issues, role, league compatibility and selection/exclusion reason. These are displayed only in Test AI Assistant; the player result contract is unchanged. Capture uses its existing bounded snapshots and does not acquire new diagnostic fields or semantics.

## 4. League, morphology and procedure boundaries

`weekend league` resolves to Saturday only in an LWR/club/team/roster league context, with explicit unrelated/other-event language excluded. An isolated “weekend” is not translated. The actual question and stored document remain unchanged; this is a Stage 4 compatibility signal, not a Stage 3 query rewrite. Explicit Saturday, Weekday and PrimeTime scopes reject mismatched named-league evidence; genuinely general/all-league rules remain eligible.

Adding/added, updating/updated, removing/removed and corresponding entry/change variants normalize only for matching. Roster intent still requires its object/context. Timing prefers compatible direct calendar evidence; a general how-to does not select a calendar-only paragraph. Removal instructions require removal language. Match Setup requires its actual timing/UI procedure, preventing the Picklebreaker “save that team for the finish” paragraph from acting as a lineup instruction. Completed score entry has its own intent.

The exact weekend production fixture selects Saturday Important Dates rank 8, `.4901`, and its verbatim September 28 roster-opening bullet. No date is hardcoded into application logic. General roster entry selects Manage Roster procedure rather than Rule 5.5. Explicit retroactive/ineligible-player questions retain the actual forfeiture provision.

## 5. Missing-object clarification

`When can I start adding players` now returns:

> Do you mean adding players to your team roster or entering players into a match lineup?

This happens before retrieval or generation, with no Official Sources or feedback receipt. Bounded “Team roster” and “Match lineup/Match Setup” replies consume the existing sealed clarification context and build the corresponding effective question. A complete standalone question supersedes pending context. Invalid, expired or other-user receipts cannot be consumed as clarification context. Complete Saturday-roster questions proceed directly. Stage 7A observes clarification metadata only, with no automatic unanswered occurrence/group/case.

## 6. Production-realistic regression results

These are local deterministic replays of captured broad official evidence, not new live production or live-model answers.

| Case | Verified result |
| --- | --- |
| Original long reimbursement policy question; lost-sunglasses and lost-personal-property variants | Empty selection, insufficient evidence, no source resolution/model call; also tested with artificially elevated fixture confidence to prove rank cannot create applicability. |
| Waiver personal-property wording and liability-release wording | Actual waiver scope/release passages retained; unrelated membership waiver prerequisite excluded; no invented reimbursement content. Live final prose remains a production acceptance check. |
| Exact weekend question; explicit Saturday equivalent | Only Saturday roster-opening bullet; no Match Setup or ENTER/VERIFY SCORES. |
| Weekday and PrimeTime equivalents | Only the corresponding league's roster-opening bullet. |
| All-league Match Setup rule with Saturday question | General Rule 5.4 remains eligible. |
| Roster morphology variants | Same compatible roster timing evidence; no context-free adding-to-roster inference. |
| General roster entry, including “enter” and “add” | Manage Roster guide; no calendar-only, retroactive/forfeit or Match Setup passage. |
| Retroactive additions and ineligible-player forfeiture | Actual Rule 5.5 enforcement retained. |
| Friday lineup | Actual lineup timing; no Picklebreaker/score-entry contamination. |
| Enter match scores | Actual score-entry procedure. |
| Accepted LMS-0705 roster + Friday lineup compound | Weekday Important Dates plus Rule 5.4, without score entry/enforcement. |
| Supported roster question + unsupported independent question | No partial grounded generation. |
| Missing-object clarification and both valid replies | No initial retrieval; correct receipt resolution and standalone supersession. |
| Corrected outcomes through player helper + Stage 7A snapshot builders | Answer/insufficient/clarification kinds preserved; only insufficient evidence produces an automatic occurrence. |
| Disclaimer and accepted mobile controls | Single exact text above composer; static responsive/accessibility contracts pass. |

All 209 pre-existing tests remain present and pass, including LMS-0705 compound; medical 5.7; coaching 5.8; Franklin Outdoor X-40 Optic; USAP 11.A/11.A.2/11.A.3 and 7.A.2/7.A.2.a; legal/damaged/color ball; Color→Ball/Paddle; personal/live guards; roster troubleshooting; receipts; four-click feedback; and Stage 7A Unicode/privacy/grouping/security/fail-open behavior. The new suite brings the total to **227 passing tests**.

## 7. Disclaimer and UI scope

The exact text appears once in the existing scroll flow immediately above the composer:

> Ask LWR PC AI may make mistakes. Check Official Sources for important information.

It uses centered 12px text, 16px line height, muted slate gray and natural wrapping. No banner, per-answer repetition, new focusable control or legal language. Existing phone viewport/safe-area/keyboard handling, opaque panel, desktop drawer, composer label and sources remain unchanged. Responsive/accessibility verification in this pass is static regression coverage; actual phone keyboard and visual acceptance are explicitly included below, not claimed as newly tested on hardware.

## 8. Validation

| Check | Result |
| --- | --- |
| `npm test` | PASS: 227 tests, zero failures. |
| `npm run lint` | PASS: zero errors, six existing warnings (captain dashboard hook dependency; three intentional stripped source IDs in player helper; two unused player dashboard helpers). |
| `npx tsc --noEmit --incremental false` | PASS. |
| `npm run verify:ai-pdf-server-bundle` | PASS; also passed against the fresh isolated production output. |
| `npm run build` | Normal compilation succeeded in 14.8s; then the established `.next/cache/.tsbuildinfo` EPERM write lock prevented the incremental type-check artifact. This is not a compilation failure. |
| Established isolated clean production build | PASS: compilation 26.9s, TypeScript 3.6s, 71/71 pages, final optimization. |
| `git diff --check` | PASS. |

The isolated build is under `lwrpc-admin/.next/lms0717-clean-build`, using copied application source, existing dependency junction and inherited local environment without copying `.env` files. Only the temporary tracing/bundler root is anchored to the repository. An initial build attempt placed its log inside `.next`, causing Next cleanup to hit that open log; the log was moved to the system temp directory before the normal compilation above. Neither filesystem issue is concealed as a successful normal build.

The unchanged Stage 3, Stage 7A capture/grouping/snapshot code, player route and Stage 7A SQL were additionally checked against Git. No SQL migration, schema, HMAC key/version, feedback route/schema, document, embedding, active corpus, USAP version or processing changes occurred. No production mutation/deployment occurred.

## 9. Exact deployment and production acceptance sequence — after review approval

1. Review the listed source/test/documentation diff and approve LMS-0717. Keep existing historical acceptance documents. Confirm application/package versions are LMS-0717 / 0.1.539 and dependencies are unchanged. Do not include ignored build/diagnostic artifacts.
2. Deploy the reviewed application revision through the established `lwrpc-admin` production pipeline using the normal application source root. This report does not authorize that deployment. **No migration, database setup, corpus processing, activation or environment/HMAC change is required.** Record the deployed revision and deployment ID; verify the displayed LMS-0717 version.
3. In manager Test AI Assistant, run the original long reimbursement question and both short variants. Require `insufficient_evidence`, no selected evidence and no answer-model call. Run the two explicit waiver questions; confirm selected waiver scope and final prose describe only the documented release/limits, with no invented policy.
4. Run weekend, Saturday, Weekday and PrimeTime roster timing. Require the compatible roster-opening passage and its current document date; reject unrelated league dates, Match Setup and score-entry sources. Run the all-league Match Setup control.
5. Run “How do I enter players on my roster”; require useful Manage Roster instructions without unrequested forfeiture. Run retroactive/ineligible-player controls and verify the actual enforcement provision is still available. Run Match Setup-only, score-entry-only and the accepted roster + Friday lineup compound; inspect bounded manager selection/exclusion diagnostics.
6. In player Ask LWR, run missing-object adding players. Require clarification, no sources/feedback, and no initial retrieval/generation. Resolve once to roster and once to Match Setup on separate exchanges. Verify complete standalone supersession and existing Color→Ball/Paddle behavior.
7. Confirm Stage 7A outcomes correlate with the corrected final kinds: grounded roster results get lightweight answer telemetry; unsupported policy results get automatic unanswered occurrence/group/case without a vote; repeated identical unsupported requests share a deterministic group/case; clarification remains metadata-only. Confirm manager_test separation. Read stored results without exposing member IDs, secrets or signed URLs; do not alter rows to force a pass.
8. Verify protected “What is my DUPR?” remains protected, not a missing-rule problem. Recheck existing Helpful→Helpful→Not Helpful→Not Helpful on one grounded answer only if acceptance requires a fresh release-level feedback check: exactly two events for one answer, proper LMS-0717 snapshot/version, existing Stage 7A correlation.
9. Smoke-test the accepted medical/coaching/equipment/NVZ/serve/roster-troubleshooting controls. Verify answer/source/UI payload behavior remains unchanged apart from the approved clarification/outcome correction and disclaimer.
10. Check desktop and an actual narrow phone, keyboard open/closed: disclaimer once above composer, clean wrapping, usable input, visible close, reachable answers/feedback/sources, no dashboard overlap, preserved Escape/focus behavior. Confirm no manager-only diagnostics appear in player responses.
11. Review sanitized capture logs/health using the existing authorized access path. No deliberate production outage, HMAC change, schema break or corpus mutation is part of acceptance. Preserve the owner-accepted LMS-0716 operational test limitations unless separately authorized to revisit them.
12. If an unexpected security, capture, scope or answer regression appears, stop and record the question, selected evidence and sanitized diagnostics for review. After all applicable gates pass, obtain owner production acceptance and update the roadmap. **Do not start LMS-0718 or Live LMS Intelligence.**

No claim of LMS-0717 production acceptance is made by this local implementation report.

## Correction addendum — production failures, including cracked ball (2026-09-05)

**Current release: LMS-0717 / 0.1.539, deployed but NOT production accepted. This correction is local, not deployed.** The initial report above is historical; this addendum supersedes its validation and deployment status. No new release number was created.

### Diagnosis and correction

1. **Parent/child structure.** The deployed passage splitter separated the Captains Guide's `o The League shall provide:` from its ` Match Balls:` child. Neither fragment then established the complete equipment assignment. The corrected semantic unit preserves the adjacent governing parent with one qualifying child, not all fee/waiver/administration siblings. Numbered parents ending in a colon retain their contiguous numbered descendants as one conditional unit; unrelated sibling rules remain independent. Actual production text, including extracted PDF bullet characters and line breaks, is preserved verbatim.
2. **Selected match ball.** `what kind of ball are we using` now selects only Captains Guide page 10's parent + Match Balls bullet. Diagnosis found the normal guide at rank 62, outside the normal review, and the existing bounded probe at rank 1 / .6498. The previously implemented probe already supplied the evidence; no Stage 3 change was required. The selected official text specifies Franklin Outdoor X-40 Optic for regular-season/playoff matches. No answer/brand is hardcoded.
3. **Medical 5.7.** Explicit medical wording and the original injury question had actual Rule 5 evidence at rank 7 / .4798 and rank 1 / .425 respectively. Splitting 5.7's condition from 5.7.1–5.7.3 lost its operative outcomes. The correction selects that complete bounded subtree and excludes 5.5, 5.6 and 5.8. Tests cover `Medical issue during match`, the explicit cannot-finish question, and `Someone got hurt halfway through the game and can't finish. What do we do?`.
4. **Season DUPR.** A method-specific profile connects determined/calculated/established/set/truncated to the official establishment and truncation passages, not a literal repetition of the question's verb. It keeps 4.1, 4.2, 4.1.1 and applicable NR/consistent-rating qualifications from 4.5.1–4.5.2. Material qualifications do not depend on an unrelated aggregate paragraph ranking first. `How is my Season DUPR determined?` receives a narrow official-method guard exemption; `What is my Season DUPR?` remains protected. The regression covers the complete guard-to-selection path.
5. **Tangential exclusions.** NR/Not Rated and Reliability Factor definitions stay with 4.1.1 rather than admitting age schedules, roster screens or Match Setup merely through overlapping words. Its own cross-reference to Rule 4.5 remains verbatim; that is distinct from adding unrelated 4.5 paragraphs. General Season DUPR excludes team aggregate calculations and calendar/application instructions. Coach, roster troubleshooting, kitchen, serve and reimbursement controls remain intact.
6. **Roster participation guard.** Generic player participation questions have a narrow exemption; named-player roster lookups and personal roster listings remain protected before retrieval. Complete permission questions are recognized before pronoun-based follow-up classification, so `that's` does not cause an unnecessary clarification. All three approved permission variants and four protected lookup variants are tested end to end.
7. **Rule 5.5.** Only the roster participation/retroactive-addition provision is selected. It retains pre-match roster requirements, retroactive admission **only if** valid club membership and eligible DUPR account/rating, and the failure consequence: forfeit and no DUPR posting. It excludes 5.4 and the scheduling page. General Manage Roster how-to remains free of unrequested enforcement.
8. **Second clarification.** After `When can I start adding players` → `On my team roster`, active Weekday, Saturday and PrimeTime roster-opening sections are all plausible. Previously the rank/score ordering chose PrimeTime (.4933 vs Weekday .4749 and Saturday .461). The player now asks which league before generation. Signed, user-bound clarification context retains the full effective question; a bounded league reply resolves it. Explicit league/weekend context and the accepted roster + Friday lineup compound remain direct. Manager Test AI Assistant uses the same post-retrieval check and issues object/league receipts, preserving actual retrieval diagnostics and manager_test separation. No capture schema or logic changed.
9. **Disclaimer spacing.** Desktop drawer and embedded body use an 8px top gap; the existing disclaimer has an 8px bottom gap before the composer. Mobile's existing 12px body padding, safe areas, viewport/keyboard handling, own scroll, overlay, focus and close behavior are unchanged. Responsive checks are static source/layout contracts in this pass. No new actual-phone keyboard or browser-render verification is claimed; those remain in the acceptance checklist.
10. **Production-format fixtures.** `test/fixtures/lms0717-correction-production-evidence.json` records 27 sanitized read-only production retrievals: full official chunks, rule identities, ranks/scores, scope and bounded probe evidence. No embeddings, credentials, model answers, signed document URLs or member records. The 30 new correction tests use these actual passages, including structural children and distractor candidates. Mock model transport proves which evidence reaches generation, not that a live model has produced acceptable final prose.

### Cracked-ball trace and smallest generic correction

Question and effective question are identical: **`What happens if we have a cracked ball when playing a point?`** No inherited history is needed. Stage 3 is sufficient at the existing .35 threshold and already retrieves the applicable damaged-ball provisions. Normal top score is **.5366**. The unchanged Stage 3 lexical expansion diagnostics are retained in the fixture; semantic retrieval already connects this phrasing to the correct rulebook evidence. This correction does not add terminology expansion to Stage 3.

The deployed Stage 4 gives the broad club-selected-equipment intent precedence because of `what`, `we` and `playing`. It therefore diverts away from damaged-ball applicability; the then-broken parent/bullet splitter rejects the guide assignment too. Final production/current-deployed result is **insufficient_evidence**, selected evidence empty, model skipped. Restoring only the bullet parent would expose the older wrong-match-ball selection; therefore the damage issue must take precedence within Stage 4. The Stage 3 probe may still appear in diagnostics, but its evidence cannot control this damage question.

The existing passing test asks `What happens if the ball is damaged during play?`: it lacks the club-intent combination and matches the old damage adjective detector. Its simplified 20.F fixture only says a broken/cracked ball will be replaced; it does not exercise the real 10.G/10.G.1 agreement condition, 20.F/20.F.1 referee condition, competing rules, or verb forms. `cracks` and `breaks` were not recognized by the old damaged/broken/cracked matcher. The after-rally cracked variant already reached USAP but could over-select the referee-duty cross-reference.

The new **Stage 4-only** damage profile links ball directly to cracked/cracks/cracking, broken/breaks/breaking, damaged, soft or degraded. Point/play/rally and conversational framing do not require literal duplication in each rule. Damage precedence and bounded complete-question routing prevent diversion or an unnecessary `What if...` clarification. This is not exact-sentence handling. Legal specifications, color, selection, extra/spare/returned/placed-ball questions do not gain damaged-ball applicability. There is no generic-ball fallback.

Stage 4 retains verbatim rule chunks and their conditions, ordered by operative role within the existing four-chunk cap:

| Selected rule | Location | Material condition retained |
| --- | --- | --- |
| 10.G | 2026 USA Pickleball Official Rulebook, p29 | Continue to rally end; replace when all players agree. |
| 10.G.1 | Same, p29 | Replay only when all players agree broken/cracked ball affected outcome; absent agreement, rally result stands. |
| 20.F | Same, p54 | Referee appeal/replacement determination; explicitly modifies 10.G. |
| 20.F.1 | Same, p54 | Referee determines broken/cracked ball affected outcome before replay with replacement; modifies 10.G.1. |

These are separately stored, complete USAP provisions: 10.G.1 supplies its own replay condition rather than borrowing arbitrary adjacent text. 20.F/20.F.1 preserve refereed scope. Redundant referee-duty pointer 17.D.14 (p45) adds no replacement/replay condition and is excluded. 10.G.2 remains available for soft/degraded/general-damage questions with **no replay**; it is not incorrectly substituted for the cracked-ball replay condition. Returned/extra/placement/legal-ball and guide-assignment evidence is excluded from the crack issue.

All five required natural variants select 10.G, 10.G.1, 20.F and 20.F.1 and reach `answer` in the isolated player-path test. Model transport receives the complete agreement/no-agreement and referee qualifications. No universal replay answer is inserted. Final live-generated wording is still a production acceptance gate.

### Exact Stage 3 candidate inventory for the production cracked-ball wording

The normal retrieval returned 32 candidates; ranks 1–12 form the existing bounded authority-review window. Scores below are the recorded combined Stage 3 scores, unchanged by correction. Applicable 10.G/10.G.1/20.F/20.F.1 are already inside that window. Candidates outside it are not added to Stage 4 by this fix. The separate existing guide probe is listed afterward.

| Rank | Rule / heading | Page | Score | Correction disposition |
| --- | --- | --- | --- | --- |
| 1 | 10.G | 29 | 0.5366 | Selected: directly applicable condition |
| 2 | 17.D.14 | 45 | 0.5316 | Excluded: redundant duty/cross-reference |
| 3 | 20.F | 54 | 0.5306 | Selected: directly applicable condition |
| 4 | 20.F.1 | 54 | 0.5248 | Selected: directly applicable condition |
| 5 | 10.G.1 | 29 | 0.5154 | Selected: directly applicable condition |
| 6 | 25.C.3 | 76 | 0.4977 | Excluded: different ball issue/condition |
| 7 | 10.C.5 | 28 | 0.4778 | Excluded: different ball issue/condition |
| 8 | 10.C.3 | 28 | 0.4758 | Excluded: different ball issue/condition |
| 9 | 10.C.4 | 28 | 0.4670 | Excluded: different ball issue/condition |
| 10 | 13.I.2.b | 34 | 0.4668 | Excluded: different ball issue/condition |
| 11 | 9.B.1 | 26 | 0.4663 | Excluded: different ball issue/condition |
| 12 | 13.E.1 | 32 | 0.4627 | Excluded: different ball issue/condition |
| 13 | 10.D.2 | 29 | 0.4620 | Outside unchanged authority-review window |
| 14 | 13.I.1.a | 33 | 0.4600 | Outside unchanged authority-review window |
| 15 | 10.G.2 | 29 | 0.4590 | Outside unchanged authority-review window |
| 16 | 10.C.2 | 28 | 0.4587 | Outside unchanged authority-review window |
| 17 | 10.C.1 | 28 | 0.4586 | Outside unchanged authority-review window |
| 18 | 13.F.1 | 32 | 0.4574 | Outside unchanged authority-review window |
| 19 | 25.A.9.a | 72 | 0.4545 | Outside unchanged authority-review window |
| 20 | 25.B.3.c | 75 | 0.4543 | Outside unchanged authority-review window |
| 21 | 13.I.1.b | 33 | 0.4541 | Outside unchanged authority-review window |
| 22 | 24.B.1 | 69 | 0.4535 | Outside unchanged authority-review window |
| 23 | 13.I.2.a | 34 | 0.4510 | Outside unchanged authority-review window |
| 24 | 13.D.1 | 32 | 0.4502 | Outside unchanged authority-review window |
| 25 | 10.C | 28 | 0.4487 | Outside unchanged authority-review window |
| 26 | 9.B | 26 | 0.4469 | Outside unchanged authority-review window |
| 27 | 13.B.1 | 32 | 0.4463 | Outside unchanged authority-review window |
| 28 | 22.B.4 | 62 | 0.4455 | Outside unchanged authority-review window |
| 29 | 13.B.2 | 32 | 0.4439 | Outside unchanged authority-review window |
| 30 | 3.C.5 | 13 | 0.4424 | Outside unchanged authority-review window |
| 31 | 13.C | 32 | 0.4420 | Outside unchanged authority-review window |
| 32 | 13.A | 32 | 0.4372 | Outside unchanged authority-review window |

Existing bounded guide probe: Captains Guide p10, probe rank 1, score .6498, normal rank outside the 32 returned candidates. Excluded from the damage issue: equipment selection before play does not govern damage during a point.

### Exact correction files (relative to repository root)

| File | Correction |
| --- | --- |
| `lwrpc-admin/app/lib/aiQuestionApplicability.js` | Structural units, rating/roster/damage issue helpers, plausible league detection. |
| `lwrpc-admin/app/lib/aiAnswerGeneration.js` | Issue precedence and material rating/roster evidence selection. |
| `lwrpc-admin/app/lib/aiGoverningSources.js` | Structural units, damage applicability and bounded conditional rule ordering. |
| `lwrpc-admin/app/lib/aiConversation.js` | Complete explicit issue routing and bounded league clarification receipts/resolution. |
| `lwrpc-admin/app/lib/askLwrPlayerAnswer.js` | Narrow roster permission/method guard exemptions and league clarification receipt. |
| `lwrpc-admin/app/api/ai-assistant/answer/route.js` | Manager parity for object/league clarification and post-retrieval diagnostics. |
| `lwrpc-admin/app/components/AskLwrAssistant.js` | Desktop top gap and disclaimer-to-composer gap. |
| `lwrpc-admin/test/aiQualityHardeningCorrection.test.mjs` | 30 focused production-format, guard/conversation/model-transport/manager/UI regressions. |
| `lwrpc-admin/test/fixtures/lms0717-correction-production-evidence.json` | 27 sanitized actual retrieval fixtures. |
| `docs/lms-0717-implementation-report.md` | This diagnosis, correction, validation and acceptance addendum. |
| `docs/project-roadmap.md` | Deployed/unaccepted status, correction checkpoint, retained defect-history requirement. |

### Final correction validation

| Check | Result |
| --- | --- |
| Full `npm test` from app | **PASS: 257 tests**, 0 failures; all 227 previous tests preserved plus 30 new. |
| `npm run lint` | PASS, 0 errors and the same six existing warnings documented above. |
| `npx tsc --noEmit --incremental false` | PASS. |
| `npm run verify:ai-pdf-server-bundle` | PASS against normal output and fresh isolated output. |
| `npm run build` | Compilation PASS (10.8s), followed by known EPERM writing `.next/cache/.tsbuildinfo`; normal build exit 1 is recorded, not concealed. |
| Isolated clean production build | PASS: compilation 22.9s, TypeScript 2.4s, 71/71 pages and final optimization. |
| `git diff --check` | PASS. |

The correction clean build lives in ignored `.next/lms0717-correction-clean-build`; it copies source, uses the installed dependency junction, inherits environment without copying or printing secrets, and anchors only its temporary tracing/bundler root to the repository. Logs are in the system temporary directory to avoid locking Next's output cleanup. One test command was initially invoked at the repository root, which has no test script; the required full test run was then run successfully from `lwrpc-admin`.

No code was added to Stage 3 retrieval or its shared equipment probe, SQL/RPC, migrations, corpus, documents, processing, embeddings, activation, metadata, feedback/capture routes, six-table schema, HMAC configuration or Stage 7A snapshot/grouping logic. Version files remain **LMS-0717 / 0.1.539**. No database writes, feedback test events, deployment or external answer-model replay were performed in this correction pass. The diagnosis used read-only existing-corpus retrieval for public test questions; local generation tests use a mock transport. Existing production defect outcomes/occurrences/groups are legitimate history and remain untouched. Stage 7A remains observational and production accepted.

### Exact production acceptance sequence after owner deployment

This is a review checklist, not authorization to deploy automatically. Use the normal existing application-only production pipeline for this source after review. No migration or corpus processing step is required. Keep version 0.1.539; identify the corrected deployment by its new source commit/deployment ID because the version is intentionally unchanged.

1. Confirm the corrected source is deployed and the visible build is LMS-0717 / 0.1.539. Record deployment/source identity. Preserve LMS-0716 accepted limitations and existing defect telemetry. Stop on an unexpected security, capture or behavior regression.
2. In **Test AI Assistant**, run `what kind of ball are we using`. Require only the page-10 parent + Match Balls bullet, no waiver/fees, and grounded official selected-ball wording. Check player Ask LWR uses the same result.
3. Run `Medical issue during match`, `What happens if a player has a medical issue and cannot finish the game?`, and `Someone got hurt halfway through the game and can't finish. What do we do?`. Require 5.7 plus 5.7.1–5.7.3 and accurate distinctions between the documented retirement/forfeit outcomes, no unrelated 5.5/5.8. Run `Can a coach or non-player be on the court during play?` separately; require 5.8.
4. Run `What is Season DUPR?`, `How is Season DUPR calculated?`, `How is my Season DUPR determined?`, `What does NR mean?`, and `What is the DUPR Reliability Factor?`. Inspect establishment/truncation and material NR qualifications for the method, definition-only context for NR/reliability; reject team aggregate/scheduling/Match Setup tangents. Confirm `What is my Season DUPR?` and `What is my DUPR?` remain protected.
5. Run all three permission questions: `Can I use a player that's not on my roster?`; `Does a player have to be on the roster before playing?`; `What happens if a player wasn't on the roster?`. Require Rule 5.5's full eligibility and failure conditions, no 5.4/scheduling. Then `Who is on my roster?`, `Show me my roster.`, `Is John Smith on my roster?`, and `Did I already add John Smith to my roster?` must remain protected with no retrieval/model call. The name is a synthetic test string, never a member lookup.
6. In a fresh conversation, `When can I start adding players` must ask team roster vs Match Setup with no retrieval. Reply `On my team roster`: require a second league question, no model/Official Sources/feedback. Reply `Saturday`: require only compatible roster-opening evidence. Repeat league resolution for Weekday and PrimeTime where needed. Explicit `When can I start adding players to my roster for the weekend league` must resolve Saturday without a second clarification. The compound `When can I add a player to my team and when do I submit my lineup for Friday's match?` must retain roster-opening + 5.4 without added clarification. Verify the same sequence in manager testing, including receipt diagnostics.
7. Run the five cracked-ball questions exactly:
   - `What happens if we have a cracked ball when playing a point?`
   - `What happens if the ball cracks during a rally?`
   - `What if the ball breaks while we're playing the point?`
   - `What happens if we discover the ball is cracked after the rally?`
   - `Can we replay a point if the ball breaks?`

   Require applicable 10.G/10.G.1 and 20.F/20.F.1, `answer` final kind, and final prose that distinguishes all-player agreement from referee determination. Continue-to-rally-end and affected-outcome conditions must survive. Without all-player agreement in the applicable non-refereed rule, the result stands. Discovery after a rally does not itself grant replay. No universal replay claim, no selected-match-ball answer, no unrelated 17.D.14/returned/extra-ball rule.
8. Run `What happens if the ball is damaged during play?` and `What happens if the ball is soft during play?`; soft/degraded evidence must retain 10.G.2's no-replay condition. Retest `What are the USA Pickleball requirements for a legal ball?`, `Are there any color considerations for Ball?`, selected match ball, and unrelated generic/extra/returned-ball questions. Damage rules must not spread to a different issue merely because it contains “ball”.
9. Retest `Can I volley in the kitchen?` (11.A), `Can I step into the kitchen after hitting a volley?` (11.A.2), `Can I volley before fully exiting the non-volley zone?` (11.A.3), `Can I serve with one foot over the court but not touching it?` (7.A.2), and server-contact-at-serve (7.A.2.a). Verify affirmative/negative wording respects each condition. Confirm Color → Ball/Paddle, standalone supersession and valid kitchen follow-ups.
10. Retest `Why can't I find a player when changing my roster?`, general Manage Roster how-to, Match Setup-only, score-entry-only and original unsupported reimbursement/generic-policy controls from the initial checklist. Require applicable procedures without tangential enforcement and no inferred policy from silence. Explicit waiver summaries must remain scoped to their actual document.
11. On desktop and an actual narrow phone, check the disclaimer once immediately above the composer: desktop top gap about 8px, bottom gap 8px, muted centered text; phone wrapping, keyboard open/closed, visible close, reachable answers/feedback/Official Sources, no dashboard overlap. Preserve focus, Escape and viewer behavior. No manager diagnostics may leak to the player payload.
12. Review resulting Stage 7A capture read-only: grounded results lightweight, clarification/protected metadata not unanswered cases, genuine insufficient evidence automatically captured, manager_test separated. Verify normal feedback correlation and existing legacy behavior; perform a fresh four-click Helpful→Helpful→Not Helpful→Not Helpful sequence only if needed for this release's acceptance, expecting two events on one answer. Do not delete legitimate defect history. Inspect sanitized health/logs through existing authorized paths; no HMAC/schema changes or deliberate production outage.
13. Record generated-answer results, source/selection checks and any remaining failures. **Production acceptance is pending these deployed checks and owner review. Do not start LMS-0718 / Stage 7B or Live LMS Intelligence.**

## Final bounded correction — signed timing context and community eligibility

**2026-09-05: LMS-0717 / 0.1.539 remains deployed but NOT production accepted.** The prior correction is deployed (local baseline commit `306c3ad`, `717b`). This final approved correction is implemented locally and has not been deployed. Version/build identifiers remain unchanged. This section supersedes previous local test counts and acceptance checklists for the current worktree.

### Four approved corrections

1. **Immediate Season DUPR subject inheritance.** A bounded `When are they recorded ...?` continuation can inherit only the unambiguous Season DUPR recording subject in the immediately previous valid signed `follow_up` receipt. The exact production sequence now resolves to `When are Season DUPR ratings recorded for the Weekday League?`. Saturday and PrimeTime are supported, as is retaining an already supplied league on the same narrowly recognized timing continuation. No new receipt format, arbitrary browser-history access or unrestricted pronoun resolver was introduced. Missing/expired/malformed/wrong-user receipts, clarification receipts, unrelated subjects and multi-subject prior questions request the full question before retrieval. Complete standalone questions continue to supersede prior context.
2. **Recording-date applicability.** A specific timing intent separates recording dates from calculation, roster opening, Match Setup and score recording. A verified stored league Key Dates heading provides scope to its own original `Season DUPR ratings recorded` bullet. Only that heading and event bullet reach generation, without the surrounding calendar. The general question can retain all three directly applicable league event units; an explicit league retains only its matching unit. This currently yields Sept. 27 because that is the active document text, not because any date is embedded in code. A source-date mutation test demonstrates that changing fixture data changes the selected date. Rule 4.1 remains available to its existing general-policy/method paths; the announced date comes from Important Dates, not a substitute guide paragraph. No Stage 3 changes.
3. **Team/community eligibility.** A bounded participation concept recognizes joining/forming/playing on or for a community's team, cross-community wording and eligibility-rule questions. It selects the operative body proposition from the active broad Rule 3 chunk on physical page 2: **Rule 3.5**. The complete permission and own-community/division exception remain one verbatim passage. Rules 3.4/3.6/3.7 are not added automatically. Registration, roster procedure, facility guest policies, home courts and unrelated USAP server evidence cannot substitute. No global location/community equivalence or Rule 3.5 identifier lookup was added. Generic questions explain the conditional rule; a question supplying the condition can be answered under that condition without claiming a live lookup.
4. **Live-affiliation/current-eligibility guards.** The seven approved live-status examples now return `protected` before retrieval, generation or any member/team lookup. These checks precede general participation eligibility handling. General cross-community questions, supplied hypothetical conditions and roster-before-playing obligations remain document questions. There is no global first-person exemption. Existing rating/status/roster guards remain covered by the full suite.

### Rule 3.5 and referee wording

The model receives the complete original Rule 3.5 passage, including `however` and `if their own community already has a team in their division`. General instructions require conditional permission and its limiting exception to stay together and prohibit asserting unobserved community/team/eligibility facts. The negative and contrasting no-own-team hypotheticals are tested through the player path. No canned Yes/No answer was added.

Cracked-ball selection remains exactly **10.G, 10.G.1, 20.F, 20.F.1** for the accepted cracked-ball question. The generation instructions now explicitly say referee-specific procedures apply **when a referee is officiating**; tournament status alone does not establish referee presence. No changes were made to damaged-ball selection, rule content, replay conditions or USAP authority. Mock-transport assertions check these instructions and selected conditions. Final live-model wording is still a deployed acceptance check; a mock response is not evidence of live generated prose.

### Exact final-correction files

Paths are relative to `C:\lwrpc-league-system`.

| File | Change |
| --- | --- |
| `lwrpc-admin/app/lib/aiQuestionApplicability.js` | Recording event/heading units and bounded timing/community participation predicates. |
| `lwrpc-admin/app/lib/aiAnswerGeneration.js` | New narrow intent support, scoped recording-date selection, conditional-rule and referee instructions. |
| `lwrpc-admin/app/lib/aiConversation.js` | Signed immediate plural-subject timing continuation and safe unresolved fallback. |
| `lwrpc-admin/app/lib/askLwrPlayerAnswer.js` | Narrow live-affiliation/current-eligibility guards and general participation handling. |
| `lwrpc-admin/test/aiFinal0717Correction.test.mjs` | 26 new end-to-end/helper/transport negative and positive tests. |
| `lwrpc-admin/test/fixtures/lms0717-final-production-evidence.json` | Actual previously captured official chunks, including broad Rule 3, separate date headings/bullets and real distractors. |
| `docs/lms-0717-implementation-report.md` | This final implementation/validation/acceptance section. |
| `docs/project-roadmap.md` | Final local correction status, unchanged deployed/unaccepted status and historical defect retention. |

The new fixture is a **bounded selection fixture**, not a claim to preserve a complete production RPC ranking. Its provenance says so explicitly. It reuses verbatim official chunks from prior read-only captures, including Rule 3's surrounding 3.4–3.7 text, Captains Guide roster/registration, Code of Conduct host communities, LMS guide and USAP server evidence. Retained diagnosis scores are supplied where available; the adversarial test deliberately raises distractor scores. No new corpus processing, production test requests or external embedding/model calls were required for this implementation pass.

### Regression results and Stage 7A compatibility

**283 tests passed: all 257 previous tests plus 26 new tests.** The final test file covers:

- First Season DUPR timing answer issues a valid follow-up receipt; Weekday/Saturday/PrimeTime continuations resolve to the full subject and correct date section.
- Ambiguous plural subjects, wrong/missing/expired/invalid receipt and clarification-purpose receipt skip retrieval and generation; standalone supersession remains intact.
- Verbatim heading + date bullet structure, no calendar contamination, wrong-header rejection and source-driven date changes.
- All six required community-rule questions, generic eligibility wording, the supplied own-community-team condition and its contrasting absence.
- All seven protected live questions through the actual player orchestrator, with retrieval/model functions that fail the test if called.
- Rule 3.5's complete qualification and original chunk identity, renamed rule metadata, high-ranked real distractors, missing governing evidence and unrelated location/join questions.
- Existing roster-before-playing permission; model transport receives the conditional rule and referee-scope instructions without changing cracked-ball selection.
- Observational quality snapshots: corrected answers stay lightweight; protected responses have no source/diagnostic payload or unanswered occurrence; existing clarification, grouping, Unicode, security, feedback and fail-open tests remain unchanged.

The legitimate historical failed Season DUPR outcome `7400c1ed-8b5f-4b09-b05a-e851ac5d5e92` and community outcome `5d281b1a-3818-44da-9075-bcd370a0b3ce` remain untouched. These are useful future LMS-0718 manager-review records, not data to delete or rewrite after a fix. No Stage 7A code/schema/configuration changed.

### Final production acceptance sequence (after owner review/deployment)

No automatic deployment is authorized. Deploy the approved source through the normal **application-only** pipeline, still LMS-0717 / 0.1.539. No SQL migration, processing, re-embedding, activation or environment-key step is required. Record the new source/deployment identity because the version is intentionally unchanged.

1. **Confirm release identity and preserve prior passes.** Verify the corrected source commit is live. Retain all legitimate historical quality events and the accepted LMS-0716 Stage 7A limitations.
2. **Timing conversation.** In a fresh player conversation, ask `When are Season DUPR's recorded?`; require a grounded date answer and follow-up receipt. Immediately ask `When are they recorded for the weekday league?`; inspect manager diagnostics or authorized request diagnostics for `follow_up` and effective `When are Season DUPR ratings recorded for the Weekday League?`. Require Weekday Important Dates heading + recording bullet, current source date, no roster-opening/Match Setup/score contamination. Repeat Saturday and PrimeTime on fresh equivalent sequences. Run the explicit full Weekday question too.
3. **Context boundaries.** Verify an unrelated standalone question supersedes the timing receipt. With no usable prior subject, `When are they recorded for the weekday league?` must clarify, not guess. Recheck kitchen → `What if I step in after I hit it?`, Color → Ball, and adding-players → `On my team roster` → league clarification → `PrimeTime`.
4. **Community permission.** Run `Can I join a team in another community?`, `Can I play on a team from a different community?`, `Can I play for another community's team?`, `Do I have to play for the community where I live?`, and `Can players from different communities form a team?`. Require Rule 3.5 as the direct source and both permission and restriction in the answer. Do not accept unconditional permission/prohibition or unrelated facility/roster material.
5. **Supplied conditions.** Run `Can I play for another community if my community already has a team in my division?`; require the prohibition under that supplied condition. Contrast with `Can I play for another community if my community does not have a team in my division?`; require only the permission/qualification supported by Rule 3.5, with no claim that the system checked current teams or verified all personal eligibility conditions. A generic question must explain the condition rather than invent its truth.
6. **Live-status boundaries.** Run `What community am I registered with?`, `Which community am I registered with?`, `What team am I on?`, `Am I currently eligible for Team X?`, `Am I personally eligible for Team X right now?`, `Is John Smith eligible for this team?`, and `Does my community currently have a team in my division?`. Require `protected`, no retrieval/model calls, no personal data, sources or feedback. The name/team are synthetic test strings, not instructions to look up a member. Confirm `What are the eligibility rules for joining another community's team?` and `Does a player have to be on the roster before playing?` remain grounded document questions.
7. **Cracked ball.** Run the accepted exact cracked-ball question. Require unchanged 10.G/10.G.1/20.F/20.F.1 selection and the agreement/affected-outcome/result-stands conditions. Referee procedures must say they apply when a referee is officiating, not imply that every tournament match has a referee.
8. **Preserved production controls.** Smoke-test selected Franklin Outdoor X-40 Optic, medical 5.7, Season DUPR determination, roster participation 5.5, weekend roster timing → Saturday, missing-object and second league clarification, reimbursement → insufficient evidence, and unchanged disclaimer spacing. Broader NVZ/serve/legal-ball/color/feedback controls remain covered by the existing acceptance checklist; repeat production cases only where needed to resolve a new concern.
9. **Capture review.** Read-only confirm new final kinds are captured correctly: answer lightweight, protected/clarification outside unanswered cases, manager_test separate. Do not alter previous failed occurrences or generate fake records to force acceptance. No Stage 7A/HMAC/schema changes or deliberate production outage.
10. **Final decision.** Report actual generated-answer/source/guard/conversation results. Stop on a new material defect. Production acceptance remains pending until these checks and owner review pass. **Do not start LMS-0718 / Stage 7B or Live LMS Intelligence.**

### Final bounded-correction validation results

| Required check | Result |
| --- | --- |
| `npm test` | PASS — 283 tests, 0 failures (257 preserved + 26 new). |
| `npm run lint` | PASS — 0 errors, six existing warnings; no new warnings. |
| `npx tsc --noEmit --incremental false` | PASS. |
| `npm run verify:ai-pdf-server-bundle` | PASS against normal output and the freshly completed isolated build. |
| `npm run build` | Compilation succeeded in 16.8s; normal build then exited 1 on the known `.next/cache/.tsbuildinfo` EPERM write lock. This is not a compilation failure or a successful normal build. |
| Established isolated clean production build | PASS — compilation 29.1s, TypeScript 3.4s, 71/71 pages, final optimization. |
| `git diff --check` | PASS. |

Isolated output: `lwrpc-admin/.next/lms0717-final-clean-build`. Source/configuration copies use existing dependencies through a junction and inherited local environment without copying or printing secrets. Only the temporary copy's tracing/bundler root is anchored to the repository. Build logs reside in the system temporary directory, outside Next cleanup. This directory and the harness are ignored validation artifacts, not deployment source changes.

Final scope verification confirms unchanged Stage 3 retrieval/probe, governing-source/damaged-ball selector, Stage 7A capture/snapshots/grouping, version/package files and player UI. No SQL/schema/migrations, production data, corpus/documents/chunks/embeddings/active versions, HMAC or feedback changes occurred. No production requests, model replays, commits, deployment or LMS-0718 implementation were performed during this final correction. **Ready for implementation review; deployment and final production acceptance remain pending.**
