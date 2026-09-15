# Season Ratings baseline-differential release review

Owner exception applies only to candidate `1cf9fb25fc94288c92b035678d6fe8b4fabae000`; permanent release policy is unchanged.

Accepted production baseline: `9109c716f232f10e9ca1fe612bc5203717accf78`, deployment `dpl_4j1HcDHg8aj8GeZKkPoAGFogGLKp` (READY; retained recovery target).

Exact `npm test` in clean baseline and candidate worktrees: baseline 1,207 tests / 1,197 pass / 10 fail; candidate 1,217 tests / 1,207 pass / 10 fail. Candidate-only failures: **0**. Material failure blocks match after removal of timing/stack paths and presentation line endings only. Assertion values, error codes, SQL and metadata remain in the comparison.

30 focused tests PASS. Lint PASS (six pre-existing warnings); production build, TypeScript, PDF bundle and diff checks PASS.

Only two application files differ: `SeasonRatingsWorkflow.js` and `seasonRatingsWorkflowServer.js`. The remaining seven files are scoped tests, browser fixture configuration and review documentation. No Ask LWR routing/date implementation, SQL, schema, RLS or grants change. Initializer, Delete and Copy are unchanged. All 1,158 deployment files verified against committed Git blob identities.

Security tests confirm maintenance-off authorized Upload/Clean with a valid receipt, denial for invalid/expired/stale or wrong-session receipts, unauthorized roles, and maintenance-off Transfer/Clear. Existing atomic transactions and revalidation remain in place. Deployment explicitly sets both maintenance and Phase 1 flags false. Production acceptance invokes previews and cancels dialogs only.

## Ten-failure equivalence matrix

| Test | Baseline and candidate failure (identical) | Classification and reason unrelated |
|---|---|---|
| 0725 formerly missing evidence is selected from current sources with all distinct rating requirements | Evidence assertion actual false; expected true for `date\ncommunicated` | Stale test expectation for accepted Important Dates routing; Ask implementation unchanged. |
| 0725 policy operation: When is my Season DUPR established? | Actual `season_rating_date`; expected `rating` | Stale test expectation for accepted date intent; Ask implementation unchanged. |
| 0725 policy operation: When is Season DUPR established? | Actual `season_rating_date`; expected `rating` | Stale test expectation for accepted date intent; Ask implementation unchanged. |
| 0725 policy operation: When is my Season DUPR set? | Actual `season_rating_date`; expected `rating` | Stale test expectation for accepted date intent; Ask implementation unchanged. |
| 0725 policy operation: When is my Season DUPR locked? | Actual `season_rating_date`; expected `rating` | Stale test expectation for accepted date intent; Ask implementation unchanged. |
| 0725 policy operation: When does my Season DUPR lock? | Actual `season_rating_date`; expected `rating` | Stale test expectation for accepted date intent; Ask implementation unchanged. |
| 0725 policy operation: When is my PrimeTime Season DUPR established? | Actual `season_rating_date`; expected `rating` | Stale test expectation for accepted date intent; Ask implementation unchanged. |
| 0728 rollback and partial recovery retain metadata and business data | P0001 LMS-0728 function drift: view_as_private.lookup | Pre-existing fixture/line-ending identity mismatch after rollback: raw CRLF hash rejected; identical LF body accepted by guard. SQL unchanged. |
| 0729 SQL identity, record, feedback and effective View-As | P0001 LMS-0729 function drift public.ai_live_feedback | Pre-existing fixture/line-ending identity mismatch on second application: LF hash rejected; equivalent CRLF hash matches guard. SQL unchanged. |
| 0724 review-only rollback restores prior function and privilege state without data changes | Deep equality: prosrc LF versus CRLF | Pre-existing fixture line endings; normalized bodies and all compared owner/ACL/security/config metadata identical. SQL unchanged. |

The three database diagnostics ran only in isolated PGlite fixtures. No identity guard was bypassed, no tests were altered to green, and no production migration was executed. These are real baseline test failures, not resolved by this release; the evidence establishes line-ending-sensitive fixtures/guards, not a newly observed production business defect.

Evidence: `season-ratings-release-equivalence.json` includes both complete material errors and matching hashes; `season-ratings-release-fixture-classification.json` records line-ending hashes and metadata comparison; full baseline/candidate logs are retained separately.

## Final production report — September 11, 2026

| Required item | Result |
|---|---|
| 1. Accepted baseline | `9109c716f232f10e9ca1fe612bc5203717accf78`; accepted recovery deployment `dpl_4j1HcDHg8aj8GeZKkPoAGFogGLKp` retained. |
| 2. Candidate | Exact `1cf9fb25fc94288c92b035678d6fe8b4fabae000`. Clean candidate worktree, nine scoped files, two runtime files, no SQL. |
| 3. Baseline full suite | Exact `npm test`: 1,207 tests, 1,197 pass, 10 fail. |
| 4. Candidate full suite | Exact `npm test`: 1,217 tests, 1,207 pass, 10 fail. |
| 5. Equivalence | All ten identities and material error blocks match; matrix above and complete JSON evidence linked below. |
| 6. Candidate-only failures | **0**. |
| 7. Focused tests | **30/30 PASS** including receipt and role boundaries, off-gate normal actions, atomic rollback, cutoff, protected values and UI retention. |
| 8. Static/build checks | Build, lint, TypeScript, PDF bundle, diff PASS. Six pre-existing lint warnings. |
| 9. Security controls | Local tests pass: authorized Upload/Clean with valid signed receipt allowed with maintenance off; malformed/expired/stale/wrong-session receipts, unauthorized actor, Transfer/Clear denied. Existing database authorization and atomic revalidation unchanged. |
| 10. Deployed commit | Exact candidate. Deployment `dpl_6tkBP82qYfhA6amAQB8zqq5ZHFfU`, `https://lwrpc-admin-pmjqbz90c-terry-lwrpc.vercel.app`, READY; promoted and custom domain `https://league.lwrpickleballclub.com` independently resolves to this deployment. |
| 11. Upload confirmation/cancel | **PASS** in legitimate Terry Adelman Commissioner session. Real `members-list-lakewoodranchpickleballclub-091026223019.csv`: matched 706, ready 667, skipped 214, ambiguous 13, invalid 0. Import Ratings visible/enabled above table. Confirmation: 667 rows; Doubles 667, RF 667, Age-Based 557; finals unchanged and Clean not run. Clicked CANCEL. Filename and preview retained; reselecting Upload also retained both. |
| 12. Clean confirmation/cancel | **EXPECTED ZERO-CHANGE STATE — owner clarified intentional Delete Season Ratings after prior Clean**. Working inputs and final Season/PrimeTime ratings were intentionally cleared; retained source/audit history is expected. Fall, RF cutoff 29: regular affected/create/update/no-change/deferred/review all zero; PrimeTime create/update/no-change/deferred/missing-age/review zero, missing RF 1,821. Apply Clean Ratings visible above table but disabled with “No changes to apply.” Same zero-eligible state observed before deployment. No confirmation could open; no Clean execution attempted. |
| 13. Maintenance gates | Both `SEASON_RATINGS_WORKFLOW_WRITES_ENABLED=false` and `SEASON_RATINGS_PHASE1_COMMIT_ENABLED=false` supplied explicitly as runtime and build deployment overrides; both names present in deployment environment metadata. Project-wide flags were not enabled. Values are evidenced by the accepted deployment command; metadata exposes names, not decrypted runtime values. |
| 14. Transfer/Clear | Absent from normal production UI. Off-gate backend denial passes against exact candidate locally. No live commit probe was submitted, to preserve the zero-execution acceptance boundary. |
| 15. Zero-write proof | Every row count and SHA-256 digest across **19 protected business tables is identical** before/after. Rating table 1,010 rows unchanged. Fall source snapshots 659 unchanged, Saturday zero unchanged; last successful import still September 10, 15:47:26.791625 UTC, 659 rows. No import/Clean/Delete/Clear/Copy confirmation accepted; no SQL/schema/RLS/grant operation. |
| 16. Normal LMS smoke | Commissioner dashboard: 1,821 active members, zero current-scope teams/rosters/matches; Captain and Player dashboards load existing empty-team/schedule/standings/results states; Ask panel opens; Season Ratings renders and previews. No score/roster/schedule simulation possible or attempted with empty operational data. |
| 17. Baseline debt | **OPEN — MUST-FIX**, separate cleanup in `season-ratings-baseline-test-debt.md`. None of ten failures resolved. Permanent project gate not changed. |
| 18. Final release status | **DEPLOYED — OWNER WORKFLOW ACCEPTANCE IN PROGRESS.** Upload confirmation/cancel passes; blank-input Clean preview is correct following the owner’s intentional Delete. Missing-RF regression concern closed; investigation canceled. Owner will execute normal Upload/Import followed by Clean/Apply and report results. Final execution acceptance awaits those results. |

The owner clarified that Delete Season Ratings intentionally cleared working inputs and final Season/PrimeTime ratings after the prior Clean. The zero-change preview is correct and is not a regression; retained source/audit history is expected. Any proposed missing-RF investigation is canceled. Acceptance continues for the same deployed commit based on this known owner action. The owner will personally test Upload Ratings CSV → Preview Ratings → Import Ratings, then Clean Ratings → RF cutoff → Preview → Apply Clean Ratings. Codex must not execute these production actions on the owner’s behalf. No successful owner execution has yet been reported, so final workflow acceptance remains pending that evidence. The prior accepted deployment remains the recovery target. The recorded zero-write hashes cover the earlier Codex preview/cancel window; subsequent intentional owner writes are outside that comparison window.

Deployment provenance: CLI inherited ancillary `gitDirty=1` and an old commit-message field from the enclosing working directory. Those fields do not establish artifact identity. Explicit `gitCommitSha` and `reviewedCommit` equal the approved candidate, and the uploaded archive independently matches all 1,158 Git blobs. The dirty main workspace was never deployed.

## Evidence

- [Complete ten-failure assertions and hashes](season-ratings-release-equivalence.json)
- [Baseline full-suite log](season-ratings-release-baseline-full.txt)
- [Candidate full-suite log](season-ratings-release-candidate-full.txt)
- [Fixture line-ending classification](season-ratings-release-fixture-classification.json)
- [Focused tests](season-ratings-release-focused.txt)
- [Build](season-ratings-release-build.txt), [lint](season-ratings-release-lint.txt), [types](season-ratings-release-types.txt), [PDF](season-ratings-release-pdf.txt), [diff](season-ratings-release-diff.txt)
- [Before integrity snapshot](season-ratings-release-before.json), [after snapshot](season-ratings-release-after.json), [comparison](season-ratings-release-integrity-result.json)
- [Separate MUST-FIX baseline debt](season-ratings-baseline-test-debt.md)

Local operational evidence retained under `.local-validation`: `season-ratings-release-identity.json` (1,158-file blob/hash manifest); `season-ratings-release-deploy.json` and `.log`; `season-ratings-release-metadata.json`; `season-ratings-release-promote.txt`; `season-ratings-release-domain-final.json`. No credential values are in the review evidence.
