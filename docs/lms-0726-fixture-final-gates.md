**2026-09-09 current status — LMS-0726 / 0.1.548: READY FOR CONTROLLED PRODUCTION REVIEW.** Member-directory read RPC is proven read-only and correctly classified in the fixture. Accepted/candidate/restored Member Administration, normal safe member/roster/Match Setup writes, isolated View-As, SQL removal/application rollback and zero migration-caused business-row changes verified. Final 1,010/1,010 tests; build/types/PDF/diff PASS; lint 0 errors/10 existing warnings. No application/candidate SQL changes for this correction; no deployment, production mutation or OpenAI calls. [Final report, evidence limits and production sequence](lms-0726-member-final-readiness.md). This supersedes earlier NOT READY fixture-stop entries; production acceptance remains pending.

# LMS-0726 / 0.1.548 — fixture correction and final safety-gate result

**NOT READY for controlled production review. No deployment.** The Commissioner count fixture defect is resolved. Acceptance stopped at a second, independently observed accepted-baseline fixture gap: Member Administration's read RPC is not implemented by the synthetic REST harness. This is not evidence of a candidate application regression. Earlier page-presence matrices are not comprehensive workflow certification and must not be read as such.

## 1–4. Exact gap, correction, permanent tests and PostgreSQL comparison

The unchanged accepted `countScopedPlayedGames` query selects `id,match_lines!inner(matches!inner(league_id,division_id,score_status))` from `line_games`, ANDs league/division/status filters and ORs `home_score.not.is.null,away_score.not.is.null,game_status.not.is.null`. The original local display adapter lacked this nested inner-join/filter and `not.is.null` combination. Supabase/PostgREST supports these SQL semantics.

The test-only `test/helpers/normalDashboardFixtureQuery.mjs` executes parameterized SQL with real inner joins, scoped predicates, and IS NULL/IS NOT NULL. It computes results from rows, not expected-value stubs. It rejects unreviewed fields/operators/selections. Zero and empty text count as non-null; absent relationships and all-null rows do not match. The accepted Dashboard/application query was not edited.

Two permanent fixture tests cover matching/non-matching rows, null/empty/zero, missing joins, combined scopes/OR, empty and multiple IN values, and unsupported shapes. An additional rollback compatibility test checks accepted snapshot/resolve, candidate page reads, maintenance, expiry, audit and business-row preservation. Focused result: **3/3 passed**. Native **PostgreSQL 17.11** independently matches all six semantic cases. See [fixture explanation](lms-0726-fixture-correction.md), [focused results](lms-0726-fixture-focused-results.txt), [native semantic results](lms-0726-fixture-postgres-results.json).

The normal workflow fixture also gained HEAD/count response metadata and narrowly validated lineup upsert metadata/ON CONFLICT handling, plus six distinct synthetic roster players, valid saved lineups and the match's league link. These are test-only prerequisites, not candidate SQL changes.

## 5–7. Accepted baseline, candidate and comparison

Exact accepted deployment `dpl_7V7DQdKkpz8w9T39eGt6KbqeeMN8` was reconstructed from 300 verified source files ([provenance](lms-0726-accepted-source-provenance.json)). Accepted Commissioner Dashboard passed first after the count correction; candidate passed subsequently. The restored accepted Commissioner Dashboard also loaded as Synthetic Person8/Commissioner, with GAMES PLAYED 0 and no unsupported-filter error. That zero is appropriate for the synthetic dataset, independently complemented by positive-count SQL cases.

Core normal page captures showed the intended Member Detail View-As button placement change and release labels. They did not establish every backend operation's success. Some captures included transient loading or an unsettled synthetic identity. Those captures are excluded from a full parity-pass claim. The final direct browser observation exposed the directory failure below; the old comparison artifact is superseded by this report.

## 8. Normal-LMS regression and the stop condition

Completed meaningful synthetic checks include normal login, reload/session persistence and logout; Commissioner, Player, Captain, Co-Captain, League Manager and Club Pro page/navigation observations; team creation and persisted edit; normal Captain Add/Remove; positive normal Match Setup save against both accepted and candidate source; matches, standings and ratings display observations. Team/roster write evidence came from earlier synthetic iterations of the same unchanged candidate. Positive setup save returned HTTP 200 in both versions; external notification delivery was unavailable because the fixture intentionally has no mail credentials. No delivered-email claim is made.

Candidate View-As Player, Captain, Club Pro and combined-role checks loaded the shared LMS UI and persistent target/actor/read-only banner. Match Setup displayed the saved six-player lineup with disabled editing/save/email controls. Earlier 320px/390px/accessibility evidence remains applicable because no UI code changed in this pass.

**New exact blocker:** restored accepted `/members` calls GET `/api/admin/member-directory?mode=members&page=1&pageSize=100&search=&includeInactive=false&currentRosterOnly=false&sort=member&direction=asc`. The unchanged protected server handler calls `admin_member_directory_page` through Supabase RPC (HTTP POST). The synthetic harness dispatches only the accepted View-As RPC specially; this other POST falls into the synthetic table-write allowlist and is rejected as `Synthetic write outside smoke-test scope`. The API returns HTTP 500 and the UI shows that Notice with an empty directory. The POST is a read RPC, not an attempted business mutation.

The directory handler is byte-identical in accepted/candidate source: SHA256 `9d85d9bbfdd00bf58fff601380707c3c39dc7e813fc44285d2ed263012a00afe`. The observed error originates in the fixture. No new production defect is inferred. However, Member Administration cannot be marked passed. The earlier regex-based matrix missed this Notice; it must also reject visible notices and failed backend requests rather than relying on page presence alone.

Per the owner's strict stop, no broader fixture RPC implementation or application change was attempted after this finding. Minimum next test work: faithfully load/execute the accepted directory RPC in the isolated fixture, reproduce its input/output semantics (search, status, roster filter, sorting, pagination/counts and role enrichment), add independent fixture controls, and rerun accepted first. Do not substitute a canned directory or bypass authorization.

Positive score-entry commit and hosted Auth/password/recovery/external mail delivery are not newly certified. Ask welcome/help/security tests are deterministic; no model-backed answer was requested. Comprehensive normal regression remains **INCOMPLETE**, not PASS.

## 9. Scoped migration verification

Exact reviewed migration remains `20260909014356_lms0726_view_as_real_ui_reads.sql`, SHA256 `690f3c2777f760b84fee2b756ef64060c844924ded304d7ae22344e015d28125`. No edit. Native PostgreSQL clean install/replay, narrow helper privileges, role/team/hierarchy/publication serialization, historical authorized scope and expired/helper denial checks passed ([results](lms-0726-final-native-postgres.txt)). Four scoped functions plus accepted dispatcher extension remain the reviewed footprint; no broad normal-workflow cutover or Phase 2 privilege changes were introduced.

## 10. Rollback rehearsal

The same isolated database progressed accepted application → exact additive migration/candidate application → exact accepted application. Upgrade and application rollback both preserved all public business-row fingerprints ([stage events](lms-0726-rehearsal-stage-results.json)). Rollback was **application first, retain additive SQL, no SQL rollback**. No business restoration was needed.

Direct browser verification after rollback confirmed the accepted mini-LMS: Synthetic Person2/Captain, real actor Synthetic Person8/Commissioner, read-only banner, Dashboard, Teams & Rosters, all six synthetic roster members, and Exit. The original normal Commissioner Dashboard remained usable. The permanent DB compatibility test additionally passed accepted snapshot/resolve after additive migration, maintenance active-context protection, expiry, repeat safety and audit behavior. This proves those compatibility checks; it does not erase the incomplete restored normal-regression gate exposed by `/members`.

Browser CLI sessions timed out during the restored matrix. Direct in-app-browser checks recovered the authoritative rollback observations above. No timeout or incomplete capture is counted as a pass. The fixture uses synthetic Auth/REST and is not a full hosted Supabase/RLS emulator; native PostgreSQL security tests provide the separate database evidence. Exact required accepted sources were restored; local test scaffolding and unused candidate helper modules are not a byte-for-byte hosted deployment artifact.

## 11. Final project checks

- Full deterministic suite: **1,007/1,007 passed**, zero failed/skipped/cancelled ([log](lms-0726-final-tests.txt)).
- Lint: **0 errors, 10 existing warnings** ([log](lms-0726-final-lint.txt)).
- Production build: **PASS** ([log](lms-0726-final-build.txt)).
- TypeScript no-emit: **PASS** ([log](lms-0726-final-types.txt)).
- PDF server bundle: **PASS** ([log](lms-0726-final-pdf.txt)).
- `git diff --check`: **PASS** (line-ending notices only).

These checks ran during the rollback phase before the later directory blocker was discovered. They are not represented as a successful end-of-all-gates rerun, since normal regression remains incomplete. The test log reports all 1,007 passed despite the Windows command wrapper returning a nonzero status; do not silently translate that wrapper status to a clean command exit. Build/types/lint completion was separately checked.

## 12–15. Scope, cost, readiness and production sequence

Registered changed/new candidate file hashes show no drift. No application code or scoped migration changed for this fixture correction. Changes are test fixtures, test scripts/tests and safety documentation. No production SQL, deployment, production business mutation, corpus/model change or notifications sent. OpenAI calls **0**, incremental API cost **$0**.

**Final: NOT READY.** The original Commissioner fixture blocker is closed. The remaining blocker is faithful normal directory RPC coverage and reliable complete normal/rollback regression, including explicit success assertions. Do not deploy or declare production accepted. The existing A–N production sequence remains a conditional plan only; no executable production recommendation is issued while this gate is open. On eventual readiness: preflight/integrity → exact scoped SQL → verify objects/ACLs → approved app deployment → normal smoke → normal integrity → View-As entry → Player → Captain → roster/Match Setup read-only → cost-controlled Ask acceptance → mobile/accessibility → final integrity → explicit acceptance. Any normal regression stops immediately; proven recovery order is accepted application first, additive SQL retained.

Deferred normal Data API/security hardening remains separate. The mandatory post-LMS-0726 cross-community Ask correction remains recorded and unimplemented.
