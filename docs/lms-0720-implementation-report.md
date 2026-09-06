# LMS-0720 / 0.1.542 — Ask LWR Robustness Hardening

Status: DEPLOYED, NOT PRODUCTION ACCEPTED. The equipment handoff correction is deployed and passes; resumed acceptance stopped at the USAP volley typo Stage 3 failure. Last accepted baseline is LMS-0719 / 0.1.541. Stage 7A/B and Stages 1–6 remain accepted. Live LMS Intelligence has not started.

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


## Controlled deployment and acceptance stop — 2026-09-06 UTC

The owner authorized deployment and bounded acceptance. Commit `e0479bd4491ebf7b89b463f554d02ace509cae8f` was pushed to main through the existing GitHub integration. Vercel production deployment `dpl_2cjJd3mAM2oVmWp2pnTKJECGXLAL` reached READY and was assigned to league.lwrpickleballclub.com. The live footer showed LMS-0720; committed package/lock version is 0.1.542. Previous production was accepted commit 7b6dc2d. No migration or environment action was taken.

### First acceptance request: FAILED

At 02:02:33.211 UTC the signed-in user-interface request was:

`What kind of balls will we be usin`

Exact production answer:

> I couldn't find an applicable rule or guide in the official LWR Pickleball Club or USA Pickleball materials. Please contact League Management for clarification.

Outcome/answer ID: `676bb995-b582-42dc-a6c5-b92473bdaab9`.

- Version LMS-0720, origin player_interface, standalone with no prior context.
- Final kind insufficient_evidence; reason stage4_no_applicable_evidence.
- Stage 3 invoked and sufficient; top captured score .4693; 32 candidates, handoff 8, authority review 12, threshold .35.
- Equipment probe invoked=true and retrieved=true.
- Selected evidence count zero; model_call_skipped=true; feedback_eligible=false; source snapshot empty.
- Request execution total_ms=2185; completed 02:02:35.396 UTC. Sanitized hosting log reports capture_succeeded at 02:02:35.437 UTC, approximately 41 ms after completion. This is an observation, not an injected fail-open/latency test or measurement of embedding call counts.

No second equipment test or further player/manager answer was submitted. No feedback click was made. Legitimate failure telemetry was retained.

### Read-only localization; no correction made

The deployed probe deduplicates against all normal candidates, while Stage 4 receives only the first 12 normal candidates plus probe handoff candidates. If the validated equipment source is already in normal ranks 13–32, it is removed from the probe handoff despite being absent from Stage 4's normal review window.

An in-memory local replay with production-format Captains Guide evidence demonstrated both branches for the exact typo:

| Source placement | Accepted interpretation | Probe retrieved | Probe handoff | Selected |
|---|---|---|---|---|
| Outside normal 32 | usin → using | true | 1 | Captains Guide, page 10 |
| Normal rank 32 | usin → using | true | 0 | none |

This reproduces the mechanism consistent with the previously diagnosed rank-32 typo case. Current persisted telemetry retains only eight normal candidates, so it does not independently establish the exact probe-source rank for this new request. No further production retrieval/model replay was performed after the stop. The earlier local regression covered the outside-normal-window case using the correctly spelled capture and missed the within-32/outside-12 handoff gap.

### Passed read-only checks

Before/after snapshots at 02:00:11.299944 and 02:03:11.859138 UTC were identical for all listed integrity checks:

| Object | Count / fingerprint |
|---|---|
| Documents | 7 / e09b264f001475ddcb7647cb0e8d0124 |
| Versions | 19 / d324fae4f3c24b6910853664872b2fde |
| Chunks, including embeddings | 1507 / 36547317916a81a41abc7f0b4ab2ab09 |
| Existing feedback full rows | 14 / ca177b10d875affcfb20b465be22f8d1 |
| Public relation/RLS/ACL metadata | 4c33be7a67a5fca12691974940f94ffb |
| Columns | 0e3693168ecf0dfd4b818ab9a7934943 |
| Constraints | f3a61578b93312ee724b1dd1509d800e |
| Indexes | 3aa2aca9026a7da22a18eacd7559fa03 |
| Functions/ACLs | 184a19b0c93aa33eed8ad045dc10cbc3 |
| Policies | e646b6159c90bd2e013a6c9ee9708016 |

HMAC route key versions remain [1]. No key value or environment variable was read, printed or changed. Successful capture created an unanswered occurrence and New review case using key_version=1, normalizer_version=1. Original and effective question both retain `What kind of balls will we be usin`; normalized grouping text is `what kind of balls will we be usin`, not `using`. Existing feedback full-row hashes are unchanged; new feedback correlation was not exercised.

Deterministic checks on the deployed commit passed for step, plaing ambiguity, play, team named Roster, community named Satrday, NR 3.50, 09/28 and Rule 5.7.2: unchanged text, zero accepted annotations, no production telemetry/model calls.

### Outstanding gates and decision

LMS-0720 / 0.1.542 is DEPLOYED BUT NOT PRODUCTION ACCEPTED. No rollback, code correction, configuration change or subsequent deployment was performed. Local report/status updates after the stop are not pushed, avoiding an additional deployment.

Outstanding because testing stopped at the first genuine defect: additional equipment typo; USAP volley/cracked-ball answers; LWR community/roster/Season typo answers; league typo; protected typo privacy/guard acceptance; direct medical answer; exact seven-point follow-up and its evidence; New Question reset; actual manager interpretation diagnostics; correctly spelled baseline sanity; Stage 7B page/workflow UI; new feedback correlation; full production call-budget comparison. These are not reported as passes based on local tests.

Physical-phone keyboard behavior remains untested. Live LMS Intelligence and the next version have not started. A bounded correction requires owner authorization before implementation; preserve this failed acceptance record and telemetry.


## Authorized equipment handoff correction — same LMS-0720 / 0.1.542

Before editing, a fresh read-only production retrieval of the exact failed question confirmed source chunk 68591ceb-77db-464b-b590-412a886dd372, version 5d1dd639-d77f-4ecc-8d56-14d7f70f491d, at normal rank 32 with score .3564 and probe rank 1. The interpretation was usin → using; the source was absent from the top-12 review; deduplication returned zero probe candidates and selection returned zero. The replay generated no answer or telemetry.

The captured production-format fixture is `lwrpc-admin/test/fixtures/lms0720-equipment-handoff-production.json`. It preserves the failing rank/window topology and full official source content. `lwrpc-admin/test/lms0720EquipmentHandoff.test.mjs` adds 25 tests: all three requested typo wordings plus the correctly spelled control at normal ranks 1, 8, 12, 13, 32 and outside the normal pool (42), plus an ineligible-normal-candidate control.

The correction in `aiRetrieval.js` constructs the existing authority-review handoff before the probe and passes that exact candidate set to deduplication. A probe is suppressed only if its chunk is already represented by an eligible normal downstream candidate. A normal occurrence below the unchanged evidence threshold does not suppress the qualified probe; the request's original Stage 3 sufficiency gate still cannot be bypassed. Normal pool presence remains a separate diagnostic (`presentInNormalPool`); `deduplicatedAgainstNormal` now describes actual downstream deduplication.

Identity remains the established immutable chunk ID. Both SQL paths return full stored chunks with the same source/version identity; no passage projection/truncation occurs at this boundary. Different semantic passages from that chunk therefore remain available to the existing later passage selector. The tests use the real multi-provision Captains Guide chunk and confirm exactly one selected equipment provision/source, without fees or waiver text. A same-ID/different-selected-passage input is not structurally produced by these retrieval paths, so no new passage-merging architecture was introduced.

No normal candidate limit, top-eight handoff, 12-candidate authority review, four-evidence cap, threshold, weight, query, embedding strategy, interpretation/guard, citation, Stage 7, feedback or player-layout change was made. No SQL/RPC, corpus, HMAC or environment change. Version remains LMS-0720 / 0.1.542. The historical failed production outcome and New case remain untouched.

Correction validation: full suite 411 passed (386 retained + 25 new); lint passed with the six existing warnings; explicit type and PDF-bundle checks passed. The normal production build compiled in 10.8 seconds before the known .next/cache/.tsbuildinfo EPERM cache-write failure. An earlier attempt encountered an open temporary log under .next during cleanup; logs were moved outside the build directory and the command rerun. Isolated clean production build and final diff checks are completed before the authorized redeployment. No failures were hidden or treated as successful normal builds.

Call-count regressions: typo and correct wording each use the existing two embeddings. When the source is at rank 32, two RPCs suffice (normal query plus probe); when absent from the normal 32, the established diagnostic rank RPC remains, for three RPCs. No new call is introduced by the handoff correction. All tested rank placements select exactly one Captains Guide equipment source.


## Corrected deployment and resumed acceptance — stopped on new volley failure

Commit `8b2e0cd3b7663b55ac230cde102510e6a382722a` was pushed through the normal main/GitHub production integration. Deployment `dpl_DHjvBt8AwxNaGeiu3PkaUuFZDEsW` reached READY and owns league.lwrpickleballclub.com. Version remains LMS-0720 / 0.1.542. All 411 tests, lint (six existing warnings), explicit type/PDF checks, isolated clean production build and diff check passed before this redeployment. Only the authorized handoff correction, its fixture/tests and status documentation were committed; no environment/migration/corpus action occurred.

### Equipment acceptance: all four PASS

| Exact production question | Exact answer text, excluding feedback prompt | Sources |
|---|---|---|
| What kind of balls will we be usin | The league will use Franklin Outdoor X-40 Optic balls for all regular season and playoff matches. | One Captains Guide source, page 10 |
| What kind of ball are we useing | The club uses Franklin Outdoor X-40 Optic balls for all regular season and playoff matches. | One Captains Guide source, page 10 |
| What ball are we playng with? | League matches use Franklin Outdoor X-40 Optic balls for all regular season and playoff matches. | One Captains Guide source, page 10 |
| What kind of balls will we be using | The league will use Franklin Outdoor X-40 Optic balls for all regular season and playoff matches. | One Captains Guide source, page 10 |

Each displayed the original question, with no autocorrect UI and one logical Official Source: `LWR Pickleball Club DUPR Captains Guide — LEAGUE FEES AND WAIVER — Page 10`. No duplicated source was displayed. New Question separated the independent controls.

The first successful answer/outcome ID is `24f3a145-b095-4a45-a31e-42092f38b522`. Stored final kind answer, selected evidence count one, Stage 3 sufficient, equipment probe invoked/retrieved true. Total execution 3286 ms. One Helpful click was made solely to verify the retained typo snapshot/correlation; no repeated feedback sequence was run. Feedback recorded at 02:16:16.924905 UTC has original/effective `What kind of balls will we be usin`, LMS-0720, and exactly one source. Its grounded_feedback occurrence references the same answer/outcome and uses grouping text `what kind of balls will we be usin`, key_version=1 and normalizer_version=1.

### Next test: FAILED; further acceptance stopped

Exact question: `Can I volly in the kitchen?`.

Exact answer:

> I couldn't find an applicable rule or guide in the official LWR Pickleball Club or USA Pickleball materials. Please contact League Management for clarification.

Outcome `e34d7d14-0c38-4c3d-ba82-0f467b558988`, started 2026-09-06 02:17:20.040 UTC:

- final kind insufficient_evidence;
- reason stage3_insufficient_evidence;
- top captured score .1826, below unchanged .350 threshold;
- 32 candidates, handoff eight, review twelve;
- equipment probe not invoked (appropriate for this question);
- model skipped, zero selected evidence, 568 ms execution;
- original/effective text both retain `Can I volly in the kitchen?`.

This is a distinct production recall/gating failure, not the repaired equipment deduplication path. No further retrieval/model replay, code correction, threshold/query/SQL change, rollback or deployment was made. The correctly spelled candidate-window tests do not establish that a misspelled original production query passes Stage 3. Further diagnosis/correction requires authorization while preserving the approved scope constraints.

### Integrity, logging and limitations

Pre-correction snapshot 02:12:58.585071 UTC and post-test snapshot 02:17:56.581500 UTC have identical document/version/chunk full-row hashes (7/19/1507), public relation/RLS/ACL, columns, constraints, indexes, functions/ACL and policies fingerprints listed in the prior stop section. HMAC route versions remain [1]. No key/environment value was exposed or changed.

All prior 14 feedback rows retain hash `ca177b10d875affcfb20b465be22f8d1`; the only added feedback is the intended Helpful event (total now 15). Historical failed usin occurrence `eb755c37-d52d-46af-ad90-70b4e85e036d` retains full-row hash `cd838f8508712587036389a6963f0188`. It was not deleted, rewritten or marked Resolved.

Sanitized Vercel capture_succeeded logs and HTTP 200 were observed for the four equipment requests, one Helpful submission and failed volley request. Production records confirm existing probe activation; exact embedding-provider call counts are not separately instrumented. Local regressions prove two existing embeddings and two RPCs for the rank-32 topology, with the third existing rank-diagnostic RPC only when the source is outside the normal pool. No new call site was introduced.

Two initial diagnostic queries using broad version/time filters were rejected by automatic approval review because they could include unrelated users' data. Safer exact-question/time-bound and specific-outcome queries with minimal fields succeeded. No approval bypass or alternate credential path was used; no verification remains blocked by that review.

Five player questions and one Helpful event were intentionally submitted in this resumed acceptance pass. Remaining gates were not run after the genuine volley defect: cracked-ball typo, LWR/league/protected typos, medical direct/seven-point/reset sequence, actual manager interpretation diagnostics, remaining baseline sanity and Stage 7B UI. Previously passed deterministic negative controls and the automated suite remain evidence, not substitutes for these production gates. Physical-phone keyboard behavior remains untested.

Final status: **LMS-0720 / 0.1.542 DEPLOYED, NOT PRODUCTION ACCEPTED**. Equipment handoff correction is verified in production. Last accepted baseline remains LMS-0719. No next version or Live LMS Intelligence started. These final documentation updates remain local and are not pushed to avoid an additional deployment during the stop.


## Approved interpretation-assisted retrieval correction — 2026-09-06

Version remains LMS-0720 / 0.1.542; production acceptance pending the controlled redeployment and gates below.

The original question is embedded and searched first. Before generation, deterministic selection runs. If no evidence is selected and high-confidence interpretation annotations exist, one request-local capability performs a same-vector lexical search. The reason records Stage 3 insufficiency or Stage 4 zero applicability. The capability is consumed before awaiting the RPC, including on failure; there is no second attempt, token-by-token loop, spelling service, extra embedding, or premature answer-model call. Failed assistance retains the original fallback and exposes no upstream error details.

Original and assisted score pools remain separately bounded to the existing RPC window. Full chunks merge by immutable ID; the higher complete score record wins (original wins an equal-score duplicate), with chunk-ID tie-breaking across equal-ranked candidates. No independently maximized score components. The normal pool remains 32, supplied 8, authority review 12 and selected 4, with threshold .350 and unchanged applicability/hierarchy. Equipment probe execution/deduplication remains unchanged and precedes the general retry decision; successful equipment selection costs no general retry.

The original vector/client live only in a WeakMap capability, never in returned manager diagnostics, player payload, conversation, feedback or Stage 7. Original request wording remains untouched. Manager console displays bounded original/assisted ranks and score records, winning origin, reason, status and elapsed time; the existing equipment panel remains.

Files: app/lib/aiRetrieval.js; app/lib/aiAnswerGeneration.js; app/ai-assistant/console/page.js; test/lms0720AssistedRetrieval.test.mjs; test/fixtures/lms0720-assisted-retrieval-production.json; test/lms0720EquipmentHandoff.test.mjs; this report; project-roadmap.md.

Read-only live retrieval captured actual original and assisted RPC rows, without vectors, answer-model calls or database writes, for sequence fixtures. Implemented results: volly -> 11.A; roser -> Manage Roster; linep -> 5.4; comunity -> 3.5 including roster availability; medcal -> 5.7. Each made two search calls and one original embedding. Seson, damged, craked, Satrday and correctly spelled volley each made one search and one embedding. Existing equipment tests retain two embeddings and two RPCs (three only for the existing outside-pool rank diagnostic), with zero general retry.

Automated validation: 430 tests passed, including original-RPC-first, exact same vector, both retry triggers, single-use exhaustion/failure, model-after-selection, complete score provenance, limits, no-retry negatives, protected pre-retrieval controls, signed medical context and 25 equipment topology controls. Lint: zero errors and six existing warnings. Explicit nonincremental TypeScript and PDF bundle verification passed. Normal production build compiled in 12.8s, then encountered the known .next/cache/.tsbuildinfo EPERM write lock; isolated clean production build passed compilation, TypeScript, all 72 static pages and final optimization before deployment. No SQL, RPC implementation, corpus, document, chunk, embedding-generation, HMAC, Stage 7, feedback, version or player-layout change.

Acceptance sequence after successful build/deployment: first exact volly (stop immediately if incorrect), then comunity, medcal, roster/lineup, damaged/cracked, league, protected comunity, medical direct/7-point follow-up/New Question reset, manager provenance, negatives, Stage 7 privacy/wording, performance, one Franklin sanity, correct kitchen sanity, Stage 7B sanity and read-only integrity comparison. Prior failed usin/volly occurrences are retained.
