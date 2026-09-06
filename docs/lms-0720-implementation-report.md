# LMS-0720 / 0.1.542 — Ask LWR Robustness Hardening

Status: implemented and locally validated; NOT deployed or production accepted. Production remains accepted LMS-0719 / 0.1.541. Stage 7A/B and Stages 1–6 remain accepted. Live LMS Intelligence has not started.

## Changes and rationale

The existing corpus typo normalizer could suggest a correction without downstream intent/applicability recognizing it. It also depended on returned vocabulary and could suggest valid-word/entity changes. LMS-0720 introduces one deterministic matcher-only interpretation helper. Original raw/effective wording remains the persistence, generation-question, feedback, receipt and grouping input. The normal embedding and SQL query are unchanged user wording.

`aiQuestionInterpretation.js` returns up to four immutable annotations containing original token, UTF-16 source span, canonical term, edit distance, independent context, explainable confidence (`unique_edit_1_with_context`) and policy `lms0720-v1`. Its temporary matching view is used only by deterministic consumers. It does not call a model, embedding provider, external dictionary or database.

The reviewed targets are using, playing, volley, damaged, cracked, broken, roster, lineup, community, season, medical, Saturday, Weekday and PrimeTime. Placing is a competing concept that vetoes ambiguous `plaing`. Exactly one insertion, deletion, substitution or adjacent transposition is allowed; source length is 4–24 letters, target length at least five. No distance-two or chained correction is enabled. Context is checked against original text, not speculative corrections. Work is bounded to 2,400 characters and four annotations.

Exact recognized terms and reviewed valid confusables win over fuzzy matches. Protected numeric/identifier/email/URL/quoted and explicitly named entity spans win over interpretation. Examples covered include step/stop, play, Rose, rooster, valley, team named Roster, community named Satrday, NR, DUPR, dates, decimal ratings and Rule 5.7.2. This is intentionally not a general spellchecker or entity recognizer: unfamiliar or ambiguous wording can remain unanswered.

The existing corpus normalizer remains available as a diagnostic candidate generator. Its suggestions no longer rewrite/retry the normal RPC query. This explicitly implements the approved original-query constraint. One existing regression was updated to assert the new contract rather than a second rewritten RPC call; the remainder of the baseline suite is retained. Manager diagnostics distinguish corpus suggestions from accepted interpretations. FTS diagnostic terms still describe the actual original RPC query; interpretation is separately labeled.

## Guards and conversation

Protection evaluates raw original, raw interpreted, validated receipt context, original effective and interpreted effective wording. Either original/interpreted guard result wins before retrieval. `what comunity am i registered with` is protected without retrieval or generation; `Can I join a team in another comunity?` remains general document RAG.

Conversation classification uses the matching view but keeps original text in effective-question composition. A valid roster-league clarification can interpret `Weekdy`; its stored effective question retains `Weekdy`. Season DUPR continuation similarly preserves typed `Seson`/`Satrday` spelling while resolving the existing subject. No interpretation annotation or rewritten question is added to a receipt. Existing expiry, binding, reset and standalone behavior remain intact.

## Evidence recovery

Paired tests use captured production-format evidence and bounded existing authority windows, comparing typo selection to the correctly spelled control. They are deterministic local selection tests, not new production retrieval/generation acceptance.

| Family | Recovery and preserved evidence |
|---|---|
| usin/useing/playng | Existing selected-equipment probe; Captains Guide provision pairing the League's responsibility with its named match ball. Brand remains evidence-derived. |
| volly | Existing NVZ general/contact paths; no global ball selection. |
| damged/craked | Existing damaged/fracture paths, 10.G/10.G.1 and 20.F/20.F.1 qualifications. No universal replay answer. |
| comunity | Qualified Rule 3.5 passage, including own-community roster availability; trusted specific identity retained. |
| roser | Team-roster instructions rather than individual-match lineup instructions. |
| linep | Existing Match Setup/lineup provision. |
| Seson | Existing Season DUPR selection. |
| medcal | Existing complete incomplete-match evidence family. |
| Satrday/Weekdy/PrimeTme | League category recognized only with explicit league/timing context or a validated league-choice receipt. Recognition does not create evidence; unresolved correctly spelled timing questions can remain insufficient. |

## Medical follow-up correction

Exact sequence: `Medical issue during match` followed by `What if one team has 7 points?`. The stored effective question remains `Regarding Medical issue during match, What if one team has 7 points?`.

Previously generic applicability required “regarding” in the source. Numeric matching also accidentally found seven in the label 5.7. The validated resolver now emits a bounded medical-score descriptor derived afresh from its authenticated immediate subject and the current score-condition grammar. The descriptor is not read from a client request body and is not persisted in Stage 7/receipts.

The subject permits only the reviewed medical/incomplete-match vocabulary; an unrelated subject or additional substantive qualification is not silently discarded. Score follow-ups require a complete bounded team/points condition; additional reimbursement or other qualifiers do not activate this path. No receipt, expired receipt, wrong user or reset retains existing clarification behavior. Unrelated context receives no medical descriptor.

Stage 4 checks bounded, threshold-qualified, league-compatible LWR league-rule candidates for operative incomplete-match score-dependent provisions. Structural numeric labels are removed for the score-condition check. The query number need not appear in the source; the source must express an actual numerical points condition. Neither the numerical threshold nor outcome/brand/rule destination is hardcoded.

The current source supplies 5.7 and its 5.7.1–5.7.3 family. The entire family remains selected, so the unchanged trusted source-identity logic displays Rule 5.7. USAP does not override that directly applicable LWR evidence. Tests cover scores 0, 5, 6, 7, 8 and 11 and reject a rule-number-only fake as score evidence. Generated branch wording still comes from the selected official passage through the normal model pipeline.

## Manager UI, Stage 7 and performance

Test AI Assistant adds a wrapping diagnostics panel for accepted original-to-canonical annotations, context/reason, policy and local timing. Corpus suggestions are explicitly labeled as not automatically applied. Player components/layout are unchanged. Manager diagnostics have static regression/build coverage; authenticated desktop/mobile rendering remains in the production acceptance plan below.

No Stage 7 schema, snapshot implementation, grouping, HMAC, capture, feedback correlation or viewer code changed. Snapshot tests verify actual typo wording remains original/effective text and protected diagnostic snapshots remain empty. No interpretation is persisted in Stage 7. No production key/configuration was read or changed during implementation; synthetic keys are confined to local tests.

Final full-suite benchmark: 1,000 interpretation calls took 337.17 ms, mean 0.337 ms on this machine under concurrent test load. This is local CPU timing, not production latency. Earlier isolated focused timing was approximately 0.16 ms/call.

Mocked retrieval calls using captured equipment rows show typo and correct spelling each use two embedding calls and three RPCs: original query, existing match-equipment probe, existing expanded-rank diagnostic. The latter occurs when the equipment chunk is absent from the normal candidate window. The first embedding/query retain original text. No typo-specific embedding/model/database call was introduced. All generated answers continue to use the existing answer-model path; no external model was called during these local tests.

## Exact LMS-0720 file set

1. `lwrpc-admin/app/lib/aiQuestionInterpretation.js` — new bounded helper and medical descriptor derivation.
2. `lwrpc-admin/app/lib/askLwrPlayerAnswer.js` — original/interpreted guard precedence.
3. `lwrpc-admin/app/lib/aiConversation.js` — matcher-only classification, original spelling, validated descriptor and league clarification checks.
4. `lwrpc-admin/app/lib/aiRetrieval.js` — original normal query, separate corpus/accepted diagnostics, existing probe eligibility and interpretation timing.
5. `lwrpc-admin/app/lib/aiAnswerGeneration.js` — internal matcher view, bounded medical applicability and matching diagnostics.
6. `lwrpc-admin/app/ai-assistant/console/page.js` — manager-only interpretation diagnostics.
7. `lwrpc-admin/test/lms0720.test.mjs` — 40 new focused regressions.
8. `lwrpc-admin/test/aiRetrieval.test.mjs` — update one query-rewrite assertion to the approved original-query contract.
9. `lwrpc-admin/app/lib/version.js` — LMS-0720.
10. `lwrpc-admin/package.json` — 0.1.542.
11. `lwrpc-admin/package-lock.json` — root application versions 0.1.542; no dependency change.
12. `docs/project-roadmap.md` — current implementation versus accepted production status.
13. `docs/lms-0720-implementation-report.md` — this report.

`docs/lms-0719-implementation-report.md` already had uncommitted acceptance updates when this implementation started and was not edited in LMS-0720. Preexisting roadmap acceptance history was preserved. Review those historical documentation changes separately when preparing a commit.

## Validation

- Full `npm test`: 386 passed, zero failures/skips; 346 existing tests retained, including the one intentionally updated RPC-contract assertion, plus 40 new tests.
- `npm run lint`: passed, zero errors and six existing warnings (captain hook dependency, three unused source identifiers, two unused player-dashboard declarations).
- `npx tsc --noEmit --incremental false`: passed.
- `npm run verify:ai-pdf-server-bundle`: passed.
- `npm run build`: compiled successfully in 13.0 seconds, then hit the established `.next/cache/.tsbuildinfo` EPERM write lock. This is a cache-write failure after compilation, not an application compilation error.
- Isolated clean production build: passed compilation, TypeScript, page-data collection, all 72 static pages and optimization. Used `.next/lms0720-clean`, final app/public/config/package inputs, existing node_modules junction, repository tracing root and environment inherited in memory without displaying/copying secrets.
- `git diff --check`: passed.

No production interaction, browser-generated feedback, SQL/migration, Stage 3 SQL/RPC, weight/threshold/limit, corpus/document/chunk/embedding/active-version, HMAC or deployment change occurred. No Next.js or dependency upgrade occurred. No Live LMS Intelligence work started.

## Controlled deployment and exact production acceptance sequence

Not executed. Deploy only after owner review/authorization through the normal repository/Vercel production pipeline.

1. Review the 13-file LMS-0720 set and separate historical acceptance-document changes. Commit the approved set; verify LMS-0720 / 0.1.542 together. Use the existing lwrpc-admin production pipeline. No migration, processing, activation or environment-variable action is required. Confirm the deployment version before testing; retain the accepted LMS-0719 deployment for rollback if required.
2. In player Ask LWR, press New Question between independent tests. Ask `What kind of balls will we be usin`; expect the Captains Guide selected match ball, with the typed question unchanged. Repeat `What kind of ball are we useing` and `What ball are we playng with?` if the first test passes.
3. Ask `Can I volly in the kitchen?`, then separately `What if I volly and step into the kitchen?`; verify the appropriate NVZ evidence and contact qualifications. Check a correctly spelled control and an existing momentum follow-up.
4. Ask `Can I join a team in another comunity?`; verify Rule 3.5 and the own-community/team/division/roster-availability qualification. Ask `How do I add someone to my roser?`, `When do I submit my linep?`, and `How is Seson DUPR determined?`; verify the separate roster/Match Setup/Season DUPR paths and specific sources.
5. Ask `What happens if the ball is damged?` and `What happens if the ball is craked during a rally?`; verify applicable 10.G/20.F families, player/referee qualifications and no unconditional replay assertion. Retest legal-ball specifications and the selected LWR ball as distinct controls.
6. Ask `When can I add players for Satrday league?`; verify Saturday scope. Trigger the established multi-league roster clarification and reply `Weekdy`; verify the chosen league while retaining typed spelling. Ask `When does PrimeTme start?`; compare to the correctly spelled version. It may remain insufficient if no applicable evidence exists; category recovery alone must not fabricate a date.
7. Ask `what comunity am i registered with`; verify protected fallback, no Official Sources and no retrieval/model invocation. Recheck the general cross-community rule typo remains allowed. Test `community named Satrday`, `plaing`, `step` and numeric/NR controls in manager diagnostics for abstention.
8. Press New Question. Ask exactly `Medical issue during match`; verify the grounded complete Rule 5.7 family. Immediately ask `What if one team has 7 points?`; verify a grounded response under the official score-dependent rule, retaining common qualifications and Rule 5.7 citation. Test below/at/above the source threshold using fresh valid immediate medical contexts as needed.
9. Press New Question and ask the same seven-point question again; expect no inherited medical interpretation and existing clarification. Repeat after unrelated kitchen context. Verify normal close/reopen context and Season DUPR follow-up behavior remain accepted.
10. Repeat representative typo tests in manager Test AI Assistant. Verify accepted interpretation, reason and policy appear only in diagnostics; corpus suggestions are distinct. Verify wrapping at phone width and unchanged desktop manager controls. Player text/composer/mobile layout must show no autocorrect UI.
11. On a grounded typo answer, perform the approved Helpful → Helpful → Not Helpful → Not Helpful sequence. Read-only inspect its feedback/outcome correlation: two events, same answer, actual raw/effective wording, current version, exact sources. Inspect one naturally insufficient typo outcome if available: grouping must use the established effective wording, not the matching view. Do not manufacture no-source policy outcomes to satisfy this check. Protected telemetry must remain minimal.
12. Check sanitized hosting logs/capture health through existing authorized tools and compare request/model/embedding counts. A recovered equipment typo may use the existing second probe embedding; no third/typo-specific embedding is expected. Ordinary typo interpretation adds no call. Measure production latency rather than treating local CPU timing as a hosted latency result.
13. Smoke-test New Question, Rule 5.5, Rule 3.5, Season DUPR, reimbursement insufficient evidence, manager feedback review/historical viewer, feedback and mobile layout. Stop on unexpected behavior; do not make unapproved production corrections. Record acceptance separately after these checks pass.
