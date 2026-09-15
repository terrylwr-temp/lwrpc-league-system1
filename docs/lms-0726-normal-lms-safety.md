**2026-09-09 current status — LMS-0726 / 0.1.548: READY FOR CONTROLLED PRODUCTION REVIEW.** Member-directory read RPC is proven read-only and correctly classified in the fixture. Accepted/candidate/restored Member Administration, normal safe member/roster/Match Setup writes, isolated View-As, SQL removal/application rollback and zero migration-caused business-row changes verified. Final 1,010/1,010 tests; build/types/PDF/diff PASS; lint 0 errors/10 existing warnings. No application/candidate SQL changes for this correction; no deployment, production mutation or OpenAI calls. [Final report, evidence limits and production sequence](lms-0726-member-final-readiness.md). This supersedes earlier NOT READY fixture-stop entries; production acceptance remains pending.

**2026-09-09 current status — LMS-0726 / 0.1.548: NOT READY.** Commissioner count fixture fixed and PostgreSQL-verified; 1,007 tests passed; scoped migration/application rollback compatibility verified. Restored accepted Member Administration exposes a second fixture gap: `admin_member_directory_page` read RPC is rejected by the synthetic write allowlist. Comprehensive normal/rollback acceptance is incomplete. Earlier page-presence pass claims are superseded by the [current gate report](lms-0726-fixture-final-gates.md). No application/SQL change for this fixture correction; no production mutation/deployment/OpenAI calls.

# LMS-0726 / 0.1.548 — normal LMS safety gate

Owner instruction `d8f2fb85-e03d-4029-a9cd-b0ec4d550a45` is the highest-priority acceptance requirement. Local rescoped implementation is approved; production SQL and deployment remain prohibited. This document supplements the approved parity plan and does not authorize broader hardening.

## Implementation boundary

Normal LMS is the baseline. Registration, team creation/editing, Captain/Co-Captain assignments, cross-community roster workflows, Add/Remove Player, Match Setup entry/copy/submission/validation/notifications, scheduling, matches, standings, ratings, members, Club Pro and manager workflows, Ask LWR, authentication and email must retain their accepted behavior.

Adapt View-As reads to the existing UI. Normal authenticated identity remains effective identity. Normal requests must not depend on context resolution, the isolated hostname, maintenance, or View-As service availability. Failed target resolution closes only View-As. Prefer a reviewed page limitation to risking a working normal subsystem.

Only the approved four bounded read functions, restricted internal read role/schema and existing dispatcher extension may enter the release migration. No business-row DML, normal privilege revokes, broad RLS changes, normal write replacement, policy binding, admission/removal redesign or Phase 2. Preserve the separate deferred hardening bundle.

## Evidence and shared-change register

`lms-0726-normal-source-baseline.json` records 258 local source/configuration hashes before rescoped page adaptation. This is a local working-tree baseline including accepted uncommitted LMS-0724/0725 work; it is NOT a production data snapshot or independent verification of deployed source identity. Do not regenerate it to hide changes.

Every changed existing application file must appear in the final shared-change register with:

- file and baseline/current hashes;
- classification: VIEW-AS-ONLY EFFECT or NORMAL + VIEW-AS SHARED EFFECT;
- concrete behavior changed and normal path preserved;
- normal regression evidence (test/result artifact and scenario);
- paired target/View-As evidence where applicable.

A source hash or static assertion alone does not establish workflow parity. Shared changes require executed normal workflow tests. Compare normal Player/Captain synthetic fixtures first, including normal writes and authorization; then the same target in View-As. Test desktop, 390px and 320px, keyboard/focus, navigation/history and isolated failure. No OpenAI calls for these tests.

Current state: baseline captured; final shared-change register and normal workflow regression evidence remain pending. No parity/production-ready claim is made by this gate document.

## Future controlled production sequence (requires later approval)

A. Capture a read-only deployment/source reference plus schema/ACL baseline and business-data counts/fingerprints for members/roles, teams/rosters, matches/lineups/scores, schedules, standings inputs, ratings/Season DUPR/RF, locations, active seasons/divisions/leagues. Include authentication, all role dashboards, teams, Match Setup, Ask LWR and accepted View-As behavior. Keep sensitive row contents out of reports.

B. Apply only reviewed structural/security/read infrastructure. Compare migration object inventory, business-data integrity and unchanged normal write ACLs. Zero LMS-0726 business mutations is required.

C. Test NORMAL LMS FIRST: authentication; Commissioner, Captain and Player dashboards; team creation/editing/assignments; Manage Roster/Add/Remove/display/cross-community behavior; Match Setup/copy/submission/validation; scheduling/matches/standings/ratings/members; Club Pro/manager authorization; Ask LWR; normal notifications. Any critical regression immediately stops acceptance and triggers restoration of the accepted application. Production write smoke tests require specifically authorized safe records/actions; do not modify live operational records merely to prove a test.

D. Recheck normal live-data integrity. Account for concurrent legitimate owner/player activity using observation times and existing audit/update evidence. A count difference alone is not proof of release mutation. Investigate unexplained changes before proceeding.

E. Only after normal gates pass: View-As entry, real-page parity, target-effective/read-only security, mobile/accessibility, then cleanup dependency verification.

## Rollback requirement

Before production approval, rehearse restoring the independently identified last production-accepted application locally against the additive schema. Preserve ordinary read/write compatibility. Do not claim rollback tested until the rehearsal and normal smoke results are recorded. Restoration must not require business-data recovery: this release must not modify business rows. Do not drop accepted LMS-0724 security functions or blindly reverse shared migrations. Any optional retirement of new read infrastructure requires a separate dependency/ACL review.

## Mini-LMS deletion gate

Delete only obsolete presentation after core parity/security/navigation/mobile/accessibility passes and dependency proof identifies no required security/shared-normal consumer. Preserve normal routes, loaders, Ask LWR and LMS-0724 context/audit/maintenance infrastructure.

## Executed initial local safety evidence

- `lms-0726-normal-boundary-results.txt`: 8/8 focused tests pass (two new normal/isolation controls plus six accepted boundary regressions).
- Normal routing matrix: 19 page paths and six representative API paths, with View-As configured and absent. A synthetic unavailable fetch service receives zero calls. Normal requests pass through without isolated rewrite/CSP.
- Isolated mutation matrix: six paths with omitted context, expired synthetic context and ordinary synthetic bearer credential all deny; replayed context on the normal origin denies.
- `node scripts/lms0726-normal-source-diff.mjs`: 258 baseline source/configuration files checked; zero changed existing application files at this checkpoint.
- Focused ESLint on the new test and comparison script passes.

These checks establish only boundary routing and unchanged source at this point. They do not certify actual normal login, database writes, dashboards, mobile parity, migration safety or rollback. Those final implementation gates remain pending. No production access/mutation, deployment or OpenAI requests were used for this evidence.

## September 9 local review update

The initial checkpoint above is superseded by [the local implementation report](lms-0726-local-parity-acceptance.md) and [final shared-change register](lms-0726-final-source-change-register.json). 25 baseline files changed; 233 remain identical; 16 new scoped files are inventoried. Actual core normal/View-As browser comparisons, normal synthetic Add/Remove, baseline auth/settings/boundary checks, 1003 deterministic tests and scoped PostgreSQL concurrency/replay tests passed. Build/types/PDF/diff pass, lint has 10 warnings and no errors. Mini presentation was removed after those core checks; final no-Auth shared Captain and roster history/refresh smoke also passed.

The rollback requirement remains open: recovered local source hashes do not independently identify the accepted deployment source. No complete exact-deployment local rollback rehearsal or comprehensive fresh browser write-through run of every normal manager workflow is claimed. These limitations are explicit in the report and must be resolved for unconditional production readiness. Production was untouched; no OpenAI calls.

## Final safety-gate follow-up

See [September 9 final gate report](lms-0726-final-safety-gates.md). Exact accepted-source provenance is now verified against the deployment manifest (300 files), superseding the source-provenance limitation above. The complete rollback rehearsal remains unperformed: accepted-baseline normal Dashboard testing exposed an unsupported query in the local fixture, so work stopped before the candidate migration. Status remains NOT READY; prior checks are not represented as a new completed final-gate run.
