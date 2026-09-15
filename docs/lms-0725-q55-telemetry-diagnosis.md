# LMS-0725 / 0.1.547: Q55 and telemetry diagnosis

September 8, 2026. **Deployed, NOT production accepted. Stop for review.** No application correction, SQL mutation, deployment, corpus change, Approved Answer, production question, embedding call or answer-model call in this diagnosis. Production remains 70 answer/routing passes, Q55 failed, 28 unrun. View-As UI parity remains deferred.

## 1. Q55 root cause and evidence limits

The current implementation correctly recognizes `When is my Season DUPR established?` as rating / policy_date and routes to official documents. The possessive is not the cause of this production failure. The first observable incorrect result is Stage 4 selecting no applicable evidence despite a sufficient Stage 3 retrieval and an active governing provision.

Persisted outcome `c4fa447f-9949-427d-8022-26b8b6b08ef8`: 18:00:10.119–18:00:16.551 UTC, 6432ms, HTTP 200, `stage4_no_applicable_evidence`, Stage 3 invoked/sufficient, 32 candidates, no selected evidence/sources, model skipped. Both Live guards false; standalone player-interface request. No personal rating lookup was needed or indicated. Top eight candidates include all three Important Dates sections and two Rules chunks, but not Rule 4.1. Only eight candidate identities were preserved; the other 24 cannot be reconstructed from this outcome.

Trace: raw question → standalone effective question → rating/policy_date, no league restriction → document retrieval → 32 candidates → bounded active-policy completion → applicability/selection empty → source validation and generation not reached → insufficient-evidence result, no citation. The completion substage itself was not recorded.

`completePolicyEvidence` shares one 5000ms abort signal across the catalog read and sequential document-chunk reads. Every error, missing/oversized catalog, empty/oversized chunk set or timeout becomes `status: unavailable`. `selectPolicyEvidence` then returns an empty list, without distinguishing operational unavailability from absent policy. The persisted diagnostics omit completion status, duration and error class. This is a proven observability and failure-classification defect. It is a plausible explanation for Q55, **not proof that this historical request timed out**. Inconsistent completion candidates or another selection failure cannot be excluded from the retained trace.

Unchanged-code local replay with the current saved evidence selects four exact source containers for Q55; forcing unavailable completion selects none. Prior Q54 without “my” also passed in production (outcome `43466ae0-8df2-4686-8f59-5cf472263626`). These findings rule out a deterministic possessive-routing defect for Q55 but do not recover its lost operational error.

## 2. Before/after recommendation

Before: document policy route already correct; evidence-read failures collapse to apparent source insufficiency. After proposed correction: retain that route; record sanitized completion stage/status/class/duration and counts; distinguish unavailable retrieval from a true source gap. Preserve active-version bounds and exact-source validation. Do not substitute a numeric rating, approved answer, historical source or fabricated evidence. Do not blindly increase timeouts before measuring the failing operation.

## 3. Exact current governing evidence

Fresh read-only active/ready/searchable-source checks are saved in [current evidence](lms-0725-q55-current-evidence.json). Rules version `f0aad5ad-cf08-46c2-94fd-686ceb1271c0`, chunk `d51e615b-a4f2-460f-8a81-da9abfbd46af`, page 3:

> 4.1. Season DUPR Ratings: A player's Season DUPR Rating is established on the date
> communicated to all captains prior to the first scheduled league match and remains in
> eƯect for the duration of the season.

The extraction's `eƯect` spelling is retained here. The answer should explain establishment on the date communicated to captains before the first scheduled league match, and duration for the season.

Important Dates version `f811e60f-9af8-444f-b009-9594a530acd6` has the following exact separate line under each Weekday, Saturday and PrimeTime heading:

> • Sept. 27, Sunday – Season DUPR ratings recorded

The Fall 2026 year comes from the document title, separately from the quoted passage. Chunk identities: Weekday `c4ab8544-decb-4ea1-b856-2df4a2d196f1` page 1; Saturday `f9f05921-2ee9-46fc-9b44-e5a861d7dd6f` page 1; PrimeTime `950a54ab-aa3b-4f43-9c51-88ce0ca803ae` page 2. Therefore current Fall 2026 recording is September 27 for those three leagues. Keep their source scopes separate.

## 4. Qualifications

The active DUPR Captains Guide, version `816a2cd7-d0c9-4c27-b41a-90eccc39cc9b`, chunk `846a9a9a-89c3-4769-99fb-c931a9ee2feb`, page 7, states:

> o Player DUPR Ratings: Season DUPR ratings are updated in the LMS before the season starts
> and remain visible to captains all season. For players added midseason, their rating is based on
> the date the league's season ratings were originally recorded.

No applicable longer-season mid-season reset provision was found in the current active searchable official corpus. Do not invent one or import remembered historical wording. The returned reset matches concern passwords. Rule 4.1 says duration of season; it does not use the word “locked.” Explain locking through that policy, without implying an undocumented system operation.

Methodology is a separate question: Rule 4.2 truncates ratings to the nearest tenth; 4.1.1 and 4.5–4.5.2 cover NR/reliability and assigned aggregate ratings. Rule 4.3 applies the rating/division rules to age-based subratings and specifies a 50+ fallback when 65+ is not established. PrimeTime Rule 6.3 specifies 65+ ratings; 6.3.2 says players not 65 at season start are NR. Preserve that narrower qualification when discussing methodology; do not apply a blanket fallback to that subgroup. These details do not supply an alternative establishment date. All exact provisions are retained separately in the evidence file.

## 5. Possessive state versus policy

The requested operation must take precedence over “my”: current value/membership/next scheduled match requests are Live state; establishment, permitted entry dates and scheduling procedures are document policy. Q55 currently follows this rule. The new change-during-season contrast does not. Policy questions must not read member, rating, roster, team, DOB or email data. Preserve effective-user authorization for actual Live questions, including View-As.

## 6. Permanent contrast controls

| Question | Current local result | Required result |
|---|---|---|
| What is my Season DUPR? | SELF_RATING / season | Live; zero answer-model/embedding calls |
| When is my Season DUPR established? | policy_date; four exact containers with healthy completion | Document policy; successful production telemetry |
| How is my Season DUPR determined? | action_policy; three exact containers | Document methodology |
| When is Season DUPR locked? | Unresolved; no dedicated policy selection | Document policy |
| Can my Season DUPR change during the season? | **Incorrect SELF_RATING** | Document policy |
| What is my PrimeTime Season DUPR? | SELF_RATING / primetime | Supported Live; zero model/embedding calls |
| When is my PrimeTime Season DUPR established? | policy_date; two exact containers | Document policy scoped to PrimeTime |
| What is my current official DUPR? | SELF_RATING / unsupported | Existing capability limitation |

These are local routing/selection observations, not generated-answer or production passes. [Control results](lms-0725-q55-controls.json) preserve the exact separate ranges and observed gaps; [permanent expectations](lms-0725-q55-cases.json) append Q100–Q103 without changing application behavior.

## 7. Exact telemetry event identities

Deployment `dpl_4m9BT41z6J2fGpthJpmHYHo2VSyy`; both `POST /api/ask-lwr`, player_interface, normal signed-in context, **not View-As**, document-generated `answer`, no clarification or feedback vote. Both delivered successfully with HTTP 200.

| Case / question | Request UTC | Failure event UTC | Delivered result |
|---|---|---|---|
| Q23: when can i add plyers to my team | 17:51:04 | 17:51:10.446 | September 28 roster date, applicable registration/activation conditions; four source containers |
| Q36: Is Weekday all rally? | 17:56:29 | 17:56:34.270 | No; standard default plus applicable Weekday Picklebreaker rally exception; three containers |

Both logs record only `capture_failed`, stage `persistence`, assistant version and timestamp. Error class and sanitized error detail were **not retained**. No outcome UUID was persisted or logged for either event. Case/time correlation is available; an exact answer UUID is not. See [HTTP evidence](lms-0725-dupr-production-http.txt) and [50-request reconciliation](lms-0725-dupr-production-outcomes.json).

## 8. Telemetry root causes: what is proven

Answer execution completed → `qualityOutcome` builds allowlisted metadata → `qualityException` returns null occurrence/route for normal answers → `capture_ai_quality` RPC under 500ms client deadline → database transaction → observer returns original answer regardless of capture failure.

The first observable failure boundary is `persistQuality`; the exact first failed operation inside it is unknowable from existing logs. Build exceptions, RPC errors (including database errors), and timeout all emit the identical event. RPC error details are discarded before the generic catch. Local fault injection reproduces this loss of distinction for all three classes. No historical timeout, constraint, enum, serialization, null field, payload size or shared cause is proven. Do not describe the two events as sharing an underlying cause merely because their log labels match.

## 9. Persistence shape and layer impact

Normal successful unvoted answers send source family/count and diagnostic metadata; they do **not** send source excerpts, scope/date text, question text, generated answer, or the multiple-exact-evidence representation. Thus the proposed multiple-excerpt schema mismatch is not supported for these two events. Different intents and source counts passed through the same metadata-only path.

Representative Q23/Q36 payloads (not recovered historical bytes) are 860 bytes each, contain no excerpt sentinel, and both insert successfully in isolated PostgreSQL. Replaying identical arguments gives one outcome each. Current production RPC body was fetched read-only and matches the local SQL body used for those checks. It uses a per-answer transaction advisory lock, exact existing-outcome comparison, and returns immediately for null occurrence. Its declared statement/lock budgets are 450ms/150ms; the app budget is 500ms. These are diagnostic leads, not proof of the historical error.

## 10. Privacy, fail-open behavior and idempotency

Retain sanitization, Live-value exclusion, effective-user authorization and separate View-As origins. Proposed logs should contain only answer correlation ID, safe enumerated operation/error class, SQLSTATE when allowlisted, duration and attempt count—not raw exception messages, inputs, credentials, tokens, URLs or member values. Completion diagnostics likewise need no official passage text.

If a retry is later justified, build and freeze arguments once; reuse the same answer ID and timestamps. Do not rebuild a changing outcome on retry. The RPC serializes by answer ID and rejects mismatched repeats. Existing transaction/idempotency tests cover occurrences, review cases/events and feedback replay. Preserve fail-open answer delivery and expose eventual telemetry failure operationally. Do not backfill or rewrite either missing historical outcome; future retests are new events.

## 11. SQL boundary

**No SQL/schema correction is currently demonstrated as necessary.** Initial diagnostic instrumentation and the two routing gaps can be addressed application-only. No SQL change is authorized or proposed here. If later evidence requires database timeout/RPC/schema changes, provide the exact migration for separate review before mutation.

## 12. Expanded benchmark and validation

Keep all 99 cases; append four new questions Q100–Q103 for **103 question cases**, including all eight requested contrasts. Telemetry fault/replay/privacy controls are separate technical tests, not inflated question counts. Existing Q51/Q52/Q53/Q55 supply the other four contrasts. Expected generated-document cases increase from 78 to 82 if all four new cases are answerable through validated current evidence; this is a plan, not an executed pass.

Diagnosis completed: eight local contrasts; Q55 healthy/unavailable completion comparison; exact-range checks for selected excerpts; three injected telemetry failure classes; two representative PostgreSQL shape/replay checks; **24 existing telemetry/database tests passed**. Zero network/model calls from the diagnostic runner. No full benchmark/model rerun or app build was needed for this diagnosis-only change; previous 882-test result remains historical, not re-certified here.

After separately approved correction: run all 103 routing cases, generated-answer benchmark, exact-evidence, telemetry, Stage 7/feedback and View-As regressions; retain DUPR limitation/choices, ten age-reference controls, roster dates, league starts, Rally applicability/Rule 5.3, Q57, year handling, compact help and clickable examples. Run npm test, lint, tsc --noEmit --incremental false, verify:ai-pdf-server-bundle, build and git diff --check. Validate mobile 390/320 and effective-user Live examples if touched.

## 13. Smallest proposed correction

Application-only, subject to review: (a) extend operation-first rating policy recognition to locked/change-during-season, with dedicated evidence selection retaining current qualifications; (b) preserve sanitized completion diagnostics and distinguish operational retrieval failure from genuine missing evidence; (c) preserve safe telemetry build/RPC/deadline diagnostics and correlation IDs without blocking answers. Use isolated fault injection to determine any bounded retry strategy; do not weaken exact-evidence gates, increase timeouts blindly, flatten sources, edit corpus or add Approved Answers. The historical exact causes remain unproven, so a specific transport/timeout repair cannot honestly be certified from current evidence.

## 14. Production continuation, after separate approval

Complete reviewed local correction and all required checks; obtain controlled deployment authorization. First production question: Q55 verbatim. Require document-policy route, current Rule 4.1 evidence, complete timing/duration answer, valid citation and persisted telemetry. Then retest Q23 and Q36 shapes and reconcile both outcomes. Exercise new policy contrasts and any approved diagnostic checks before resuming the 28 stopped cases, preserving existing strict stop-on-material-failure rules. Reconcile every answer against telemetry, then complete outstanding acceptance requirements. No production continuation occurred during this diagnosis; no acceptance claim and no View-As parity work.
