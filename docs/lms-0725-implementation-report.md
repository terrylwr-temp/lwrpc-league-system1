# LMS-0725 / 0.1.547 implementation review

**Implemented and validated locally on September 8, 2026. STOP BEFORE PRODUCTION.** LMS-0724 / 0.1.546 remains the accepted production baseline. This implements the approved [diagnosis/design](lms-0725-diagnosis-design.md). No production deployment, SQL application, corpus change/reprocessing or Approved Answer was performed. The separately recorded View-As UI parity correction remains next only after this release is production accepted.

## Routing and roster evidence

A shared, deterministic semantic descriptor classifies what is being asked about an entity: current state, date, policy, procedure, or scoring applicability/mechanics. Live nouns alone do not select Live LMS. Both the Live gate and document pipeline consume the distinction. Privacy, unsupported personal eligibility/completed-action checks and mixed protected questions retain their guards. Named roster queries retain team identity; count requests count the authorized population rather than a displayed page. Contextual spelling normalization handles natural wording without a table of the 18 failing questions.

Roster policy/date/procedure uses active, ready official documents. Structural evidence completion retains genuine document/version/chunk/page identity and authority metadata. It reads at most 24 catalog entries, selects at most four relevant documents, reads at most 160 searchable chunks per selected document, and shares a five-second timeout. Answer selection remains bounded to four chunks. This adds bounded document reads, not classification model calls. Missing/incomplete controlling evidence fails closed; the new path cannot substitute an Approved Answer patch.

The inspected current Important Dates version `f811e60f-9af8-444f-b009-9594a530acd6` establishes September 28, 2026 for Weekday, Saturday and PrimeTime. The date is parsed from official text and year, never hardcoded in application logic. Explicit league scope survives even when dates match. Generic opening questions answer directly when all relevant dates and conditions agree; divergent dates yield bounded league choices. Captain guide unlock/notification qualifications accompany dates. Procedure requests use current Captain Tools/Add Player instructions; removal policy is separate. A closing-date or different-year request cannot silently receive the 2026 opening date.

For “yet/now/already,” the server compares the current America/New_York calendar date against parsed official openings and supplies before-opening/on-or-after-opening context to grounded generation. This does not claim that a particular team is unlocked or that the player is eligible. Boundary tests cover both sides of the published opening. See [official snapshot](lms-0725-official-evidence.json).

## Scoring applicability and qualifications

Applicability now requires the complete Rule 5.3 default/express-exception obligation plus the relevant league/division/format passages. Mechanics-only passages cannot satisfy that obligation. Numbered clauses are completed across adjacent chunks; unrelated league headings/tables are excluded. A narrower game exception cannot become a league-wide rule. Incomplete obligations or evidence exceeding the bounded selection fail closed.

The current Rules version is `5e8efa91-4f6c-47eb-9747-b122f0ebf656`; Rule 5.3 spans pages 4–5. The following matrix describes supported current substance and locally checked scope, not a production model replay:

| Control | Required substance | Local result |
|---|---|---|
| Weekday general / scoring method / all Rally | Standard default, with the conditional 9.1 Picklebreaker exception clearly bounded | PASS |
| Weekday regular games | Standard; do not broaden the Picklebreaker exception | PASS |
| Weekday 9.1 general | Standard regular games; Rally only for the specified Picklebreaker if played | PASS |
| Weekday 9.1 Picklebreaker | Only at the specified 2–2 condition; Rally to 15, win by 2 | PASS |
| Weekday 8.1 | Standard; exclude 9.1/Picklebreaker evidence | PASS |
| Saturday general | Regular Rally format and separately scoped Picklebreaker | PASS |
| Saturday regular games | Rally to 15, win by 1 | PASS |
| Saturday Picklebreaker | Specified 12–12 condition; Rally to 25, win by 2 | PASS |
| PrimeTime general | Standard default plus conditional Picklebreaker exception | PASS |
| PrimeTime regular games | Standard default | PASS |
| PrimeTime Picklebreaker | Only at specified 2–2 condition; Rally to 15, win by 2 | PASS |
| Rally mechanics / mechanics in a Picklebreaker | Mechanics evidence; do not infer league applicability | PASS, existing regression coverage retained |
| Must I serve to win? | Retain the material winning-point-on-serve qualification | PASS, LMS-0722 regression retained |
| 24-all without scoring method | Ask Standard/Rally before retrieval; use valid immediate context if present | PASS |
| Freeze again without a valid referent | Ask for full question rather than invent context | PASS |
| Mechanics-only applicability or incomplete default | No sufficient selection | PASS |

Across the local scoped selector controls, cross-league leakage is zero. Existing material-qualification regression tests pass. These results do not establish zero omissions or unsupported answers for a production model run: exact retrieval rankings, generated wording/citations and production qualification retention remain acceptance gates.

## Clarification, authorization and reset

The database discovers choices from the same authorized populations as before, including the Commissioner's legitimate broad access. For unspecified DUPR, up to five existing eligible seasons combine with two supported rating types into at most ten choices, without prefetching rating values. This reduces a representative type-then-season flow from three requests to two (discovery and selected lookup). Larger sets keep bounded continuation with player-facing “More choices” / “Show more players.”

A shared native-button group is used by normal Ask LWR and View-As. Choices support keyboard operation, visible focus, semantic group labels, disabled stale choices, status announcements, wrapped labels and minimum 44px targets. Opaque choice keys bind to an encrypted session/target receipt. Typed numbers 1–10, exact labels and unique label subsets remain usable; ambiguous fragments are not guessed. “Fall,” “2026 Fall,” “Saturday,” “Season DUPR” and “PrimeTime” resolve only when safe in the current choices/context.

The substantive answer card displays the resolved meaning, such as “What's my Season DUPR for the 2026 Fall Season?”, rather than “1.” Raw input remains in the transient exchange; protected Live question/value history is not newly persisted for diagnostics. Missing values identify the capability and season naturally. Authentication failure, authorization denial, authorized missing data, NR and recorded values remain distinct. Current official DUPR remains unavailable; Season DUPR is never substituted silently.

Every selected follow-up reaches fresh authentication/authorization and a fresh database lookup. A previous choice is context, not authorization. View-As choices use the effective target, retain dedicated-origin/read-only enforcement and separate diagnostic telemetry, and keep feedback disabled. New Question clears exchanges, receipt and inherited context; generation epochs prevent stale replies repopulating the UI. The View-As change here is only shared Ask LWR clarification/reset behavior, not the deferred screen-parity implementation.

Live deterministic paths retain **zero answer-model calls and zero embedding calls**. No protected Live values are sent to the model for wording or classification.

## Complete benchmark and validation

[All 63 exact questions and outcomes](lms-0725-result-matrix.md): **63 matches, zero mismatches**, versus 18 diagnosis mismatches. Exact owner wording and paraphrases are permanent regression cases. [Before](lms-0725-before.json) and [after](lms-0725-implementation-benchmark.json) retain the raw route evidence. Legitimate tied-score/freeze ambiguity is handled by clarification.

| Validation | Result / evidence |
|---|---|
| `npm test` | **750/750 pass**, zero failures/skips; [output](lms-0725-test-output.txt) |
| `npm run lint` | PASS: zero errors, six existing warnings; [output](lms-0725-lint-output.txt) |
| `npx tsc --noEmit --incremental false` | PASS, exit 0; [empty successful output](lms-0725-typecheck-output.txt) |
| `npm run build` | PASS; [output](lms-0725-build-output.txt) |
| `npm run verify:ai-pdf-server-bundle` | PASS, WorkerMessageHandler bundled; [output](lms-0725-pdf-bundle-output.txt) |
| `git diff --check` | PASS; only Git line-ending notices |
| Isolated database migration | Apply, repeat apply, unchanged owner/security/ACL/search path, authorized choices and selected values/count/missing/denial pass |
| Isolated View-As database | RLS-enabled target Player with Commissioner actor: target choices/count, unauthorized contact denial, changed-season recheck and Exit denial pass |
| Guarded rollback | Restores original function metadata and legacy clarification behavior; [latest focused database output](lms-0725-database-output.txt) |
| Existing document/Live/View-As suites | Included in full passing suite: LMS-0722 qualifications, LMS-0723 deterministic capabilities and LMS-0724 locks/maintenance/security |
| Desktop/mobile actual component | 1280×900 and 390×844 with synthetic local API responses; [desktop](lms-0725-desktop.png), [mobile](lms-0725-mobile.png) |
| Keyboard/accessibility | Tab visible focus, Space selection, resolved card, status role, stale choice disabling and New Question focus/reset checked |

The six lint warnings are one captain-dashboard hook dependency, three pre-existing unused source-identity destructurings, and two unused player-dashboard declarations. No warning cleanup refactor was included.

UI verification rendered the actual normal Ask LWR component with a temporary local synthetic session/API harness; no production data was manufactured. Mobile had no horizontal overflow; measured choice heights were 44px and 66px. Selection produced the resolved season question and natural missing-rating response. New Question left zero cards, focused the composer and cleared context; Live history remained absent. The temporary route, browser mocks and dev server were removed. A transient harness Fast Refresh error and local Next cache/type artifacts were resolved; the final build passes. A physical screen-reader session and authenticated production View-As UI session were not performed. View-As assurance here is shared-component coverage plus isolated authorization/security tests, not a claimed production browser acceptance.

The full suite passed before the last additional rollback assertions; that database test was rerun afterward and passed. Application code and migration did not change after the successful full validation.

## Performance and remaining measurement

The same 63-question local routing benchmark used 100 warmup batches and 1,000 timed batches. Values below are per-question averages within each batch, not individual request latency percentiles:

| Local routing CPU | Before | After | Difference |
|---|---:|---:|---:|
| Median batch mean | 0.003162 ms | 0.104710 ms | +0.101548 ms |
| p95 batch mean | 0.004848 ms | 0.194133 ms | +0.189286 ms |

This is below the design's 1ms incremental local routing target for this workload. The after run overlapped local build/test activity; no production-latency claim follows. Clarification round-trip count improves as described above, but exact before/after RPC and end-to-end timings were not measured against production. Grounded applicability/date requests add the bounded catalog/chunk completion reads described above; ordinary deterministic Live requests add no provider calls. Production acceptance must measure total latency, retrieval completion time, clarification lookup time and model/embedding counters on identical representative requests.

## Exact implementation files

Paths below are relative to `C:/lwrpc-league-system`. Pre-existing dirty LMS-0724 files are deliberately excluded; they were preserved.

New application / migration / tests:

- `lwrpc-admin/app/lib/aiRequestIntent.js`
- `lwrpc-admin/app/lib/aiPolicyEvidence.js`
- `lwrpc-admin/app/lib/aiClarificationChoices.js`
- `lwrpc-admin/app/components/AskLwrChoices.js`
- `lwrpc-admin/scripts/lms0725-build-migration.mjs`
- `lwrpc-admin/supabase/migrations/20260908114532_lms0725_clarification_choices.sql`
- `lwrpc-admin/test/lms0725.test.mjs`
- `lwrpc-admin/test/lms0725Database.test.mjs`

Modified application / version files:

- `lwrpc-admin/app/lib/aiQuestionInterpretation.js`
- `lwrpc-admin/app/lib/liveLmsIntent.js`
- `lwrpc-admin/app/lib/liveLmsService.js`
- `lwrpc-admin/app/lib/aiRetrieval.js`
- `lwrpc-admin/app/lib/aiOfficialApplicability.js`
- `lwrpc-admin/app/lib/aiAnswerGeneration.js`
- `lwrpc-admin/app/lib/aiConversation.js`
- `lwrpc-admin/app/lib/askLwrPlayerAnswer.js`
- `lwrpc-admin/app/components/AskLwrAssistant.js`
- `lwrpc-admin/app/view-as/page.js`
- `lwrpc-admin/app/lib/version.js`
- `lwrpc-admin/package.json`
- `lwrpc-admin/package-lock.json`

Implementation documentation/evidence created or updated:

- `docs/project-roadmap.md`
- `docs/lms-0725-baseline.mjs` (separate after output; baseline preserved)
- `docs/lms-0725-implementation-report.md`
- `docs/lms-0725-result-matrix.md`
- `docs/lms-0725-implementation-benchmark.json`
- `docs/lms-0725-rollback.sql`
- `docs/lms-0725-test-output.txt`
- `docs/lms-0725-focused-output.txt`
- `docs/lms-0725-benchmark-test-output.txt`
- `docs/lms-0725-database-output.txt`
- `docs/lms-0725-lint-output.txt`
- `docs/lms-0725-typecheck-output.txt`
- `docs/lms-0725-build-output.txt`
- `docs/lms-0725-pdf-bundle-output.txt`
- `docs/lms-0725-desktop.png`
- `docs/lms-0725-mobile.png`

Diagnosis/design, official evidence, before and original benchmark files remain source artifacts, not rewritten evidence of implementation success.

## Controlled production acceptance sequence — proposed, not executed

1. Owner reviews this report and authorizes the specific production migration/deployment/acceptance scope. Until then, stop. Keep LMS-0724 accepted and do not start View-As parity.
2. Read-only preflight: verify production is still the accepted 0724 baseline, function signatures/source hashes/owners/security/search paths/ACLs match the guarded migration inputs, and active source versions still match the inspected evidence or review changed source content. Check migration history and current View-As maintenance health. Any mismatch stops the apply; do not weaken the guards.
3. Verify the exact reviewed migration SHA256: `9EF22DEB9422E7D7D1F7FA915224CC1F527CC72D043510D53F73C85F0D4ABE85`. Review [rollback SQL](lms-0725-rollback.sql) and preserve the known 0724 deployment target before changing anything. The migration changes only the normal and target-effective lookup bodies; no new grants, tables, RLS policies or security-definer privilege is intended.
4. Once specifically authorized, apply only `20260908114532_lms0725_clarification_choices.sql` through the established controlled migration workflow. Verify recorded migration and unchanged owner/ACL/security/search path, then check normal and target-effective lookup discovery with legitimate authorized sessions. Stop on a failed guard or security check.
5. Deploy the reviewed 0.1.547 artifact through the established release workflow, verify both main and dedicated View-As origins report LMS-0725, and confirm auth/session/origin controls before running content acceptance. Do not edit documents or add Approved Answers to force a pass.
6. Replay every exact owner-provided question and all 63 benchmark cases, recording route, clarification, selected source/version/page, generated substantive answer, material qualifications and available timing/counters. Specifically verify dynamic current opening dates, explicit scope, equal-date direct answer, procedure vs date, now/yet comparison, and the full scoring matrix above. Required observed outcomes: zero Live-policy misrouting, mechanics-as-applicability errors, cross-league leakage, omitted material qualifications and unsupported grounded answers. A justified bounded clarification can pass; document each one.
7. In legitimate normal Player/Captain/Commissioner sessions, test combined and typed choices, resolved question, missing/NR/value separation, official DUPR limitation, roster count/list, team, next-match where real data exists, authorized contact and denial. Do not manufacture production roster/match data. Confirm each follow-up refetches and reauthorizes; test stale/tampered/context-mismatched receipts without accessing unauthorized data. Check New Question/reset and desktop/mobile/keyboard/status behavior.
8. In a legitimate dedicated-origin View-As session, repeat representative choices for the target, verify no Commissioner expansion, server-side mutation blocking, feedback disabled, separate telemetry and zero Live model/embedding calls. Exit and confirm revoked continuation fails; confirm maintenance remains healthy. Record any unavailable legitimate session as an unpassed gate, not a synthetic production success.
9. Compare representative before/after request timings under comparable conditions: routing, discovery and selected lookup, document retrieval/completion, answer generation and total time. Record actual provider counts and absolute/delta timings; the local CPU benchmark is not a replacement for this gate. Include the retained PDF server/rendering behavior and representative existing document regressions.
10. If a release regression requires rollback, restore the known 0724 application artifact and apply the reviewed guarded rollback only under authorized incident/release scope; verify original lookup metadata/behavior and both origins. Do not apply rollback if its expected-source guard fails. Document observed failures and stop acceptance rather than patch production ad hoc.
11. Mark 0725 production accepted only after all required gates and exact overhead are evidenced. Update the roadmap with results. Then begin the already mandatory View-As same-LMS-screen parity/cleanup work, preserving security and deleting the obsolete parallel presentation after parity validation.
