# LMS-0723 / 0.1.545 — pending production review

**CURRENT — LMS-0723 / 0.1.545 PRODUCTION ACCEPTED (2026-09-07).** Exact approved 16-candidate repair completed and replayed safely; coordination migration applied once; commit adb4389d9c2a88501a907fe46e6fcbdb46c31002 deployed. All currently testable acceptance gates passed. Owner confirmed concurrent member edits and registration activity as intentional. Real roster/match and logout-revocation limitations remain explicitly recorded. [Final production evidence and limitations](lms-0723-manifest-production-acceptance.md). No new version or View As User work started. Earlier status entries below are historical and superseded by this result.

**Read-only SELF_RATING diagnosis complete:** acceptance identity is split across an Auth-only Commissioner role row (member_id NULL) and a member-only Commissioner row (user_id NULL). The immutable member INNER JOIN returns no row. [Exact cause, population counts and proposed bounded link correction](lms-0723-self-rating-authorization-diagnosis.md). No linking/code/SQL/deployment change performed. LMS-0723 / 0.1.545 remains NOT production accepted.

**LATEST: session redesign migrated and deployed; first SELF_RATING gate DENIED — STOP.** Corrective recorder 20260907132549; READY commit a2d4af0. No further tests/correction after the first self question returned an access denial. [Production evidence and full gate disposition](lms-0723-session-redesign-production-acceptance.md). LMS-0723 / 0.1.545 remains NOT production accepted. Concurrent intentional registration is permitted; earlier registration-baseline stop is superseded.

**Controlled session-redesign preflight STOP before mutation:** two team creations and five updated team rows since the prior acceptance stop require confirmation of the intentional current registration baseline. [Read-only evidence](lms-0723-session-redesign-production-preflight-stop.md). Corrective migration remains unapplied; no redeployment. LMS-0723 / 0.1.545 remains NOT production accepted.

**Session redesign implemented locally; STOP for review before corrective migration/deployment.** [Implementation, security evidence and revocation limitations](lms-0723-session-validation-implementation.md). LMS-0723 / 0.1.545 remains deployed and NOT production accepted; LMS-0722 remains the accepted baseline. Earlier design-only/local status entries are historical.

**2026-09-07 session redesign: diagnosis/design complete; awaiting review.** [Trusted server-auth boundary and exact corrective SQL proposal](lms-0723-session-validation-redesign.md). No implementation, SQL application, permission/RLS change or deployment in this pass. LMS-0723 / 0.1.545 remains deployed, NOT production accepted; LMS-0722 / 0.1.544 remains the accepted baseline. Online revocation and session-lifetime semantics are explicit validation gates. Earlier stop/local-deployment statements below are historical.

**LATEST CORRECTION STOP:** read-only pre-mutation review found auth.sessions RLS enabled with no policies and a non-owner/non-bypass reader. Schema USAGE alone cannot fix session validation; the executor also lacks grant option. No corrective mutation/retest/redeployment. [Masked RLS boundary and footprint](lms-0723-auth-rls-boundary-stop.md). LMS-0723 remains deployed, NOT production accepted.


**CURRENT STATUS: LMS-0723 / 0.1.545 DEPLOYED, NOT PRODUCTION ACCEPTED.** Migration applied once (server version 20260907123652), commit d7da5f6 deployed READY. First live SELF_RATING failed: ai_live_session_reader lacks USAGE on auth schema despite its column grants. Acceptance stopped; no corrective change or rollback. [Full evidence, matrix, seasonal limitations and next review](lms-0723-production-session-permission-stop.md). Earlier local/preflight states below are historical.


## Current authorized production sequence — 2026-09-07

Owner accepted the seasonal empty-roster/match limitation and authorized continuation using isolated evidence for unavailable relationship gates. Production migration applied once successfully: server migration version 20260907123652, name lms0723_live_intelligence, exact reviewed local file 20260907110701_lms0723_live_intelligence.sql, SHA-256 A069AB845DEEBBEB5477B824D4825B0338872AAA3CFB2591305A567F168AE44D. The MCP migration recorder assigns its execution timestamp; do not reapply the local filename as a missing migration.

Postmigration: four private RLS tables; anon/authenticated lack schema/data/RPC access; service SELECT/INSERT only on attempts/audit/feedback and SELECT only on retention_runs; UPDATE/DELETE denied. All six functions have empty fixed search_path; protected lookups are invoker, narrow session/retention helpers retain constrained owners. Public ACL hash 8484d4920b24d644ac6d1bfcda71c3b4 and public policy hash e646b6159c90bd2e013a6c9ee9708016 unchanged. No corpus/environment/HMAC changes. Deployment and application acceptance follow; not production accepted yet.

Historical prerequisite stops below are superseded by the owner's explicit seasonal limitation approval.


**Latest controlled-production preflight: STOP before mutation.** Production has zero roster memberships / authorized Captain-to-roster-player pairs and zero matches. Required production-positive fixtures are unavailable. [Read-only evidence and gate matrix](lms-0723-production-prerequisite-stop.md). No migration/deployment occurred.


The approved subject-resolution correction is implemented locally. Both original synthetic blockers are now permanent passing regression controls. See [complete correction report and production continuation](lms-0723-subject-resolution-report.md). Stop for owner review; no production migration/deployment has occurred. Production remains accepted LMS-0722 / 0.1.544.

The production gates below remain pending. The prior stop records are preserved as historical evidence and are superseded only by local correction validation, not by production acceptance.

## Historical preflight stops


**Latest correction review: STOP — named-person team resolution requires a pending RPC migration change.** See [synthetic evidence and proposed scope](lms-0723-subject-resolution-stop.md). The approved routing correction has not been implemented; no production changes occurred.

The controlled production sequence stopped during local migration/application security review, before any production query, migration, deployment or acceptance event in this pass. No application correction was made.

## Confirmed blocker: explicit named subject is replaced by requester

Natural wording: `Tell me [managed player]'s Season DUPR.`

Isolated reproduction used the existing synthetic PostgreSQL fixture: a Captain explicitly manages the requested player's team. The Captain's synthetic rating was made different from the requested player's synthetic rating to prevent a coincidentally matching number from hiding a subject error.

Observed:

| Check | Result |
|---|---|
| Explicit requested name parsed | Yes |
| Expected capability | PLAYER_RATING |
| Actual capability | SELF_RATING |
| Returned requested player's subject | No |
| Returned requester's subject/value | Yes |
| Final kind | answer |
| Production writes / deployment | None |

Root cause: `liveLmsIntent.js` treats any `me` in the sentence as a self reference. Although the possessive parser correctly extracts the named player, the rating branch chooses `self ? SELF_RATING : PLAYER_RATING`. The protected SQL SELF_RATING branch then binds the target to the authenticated member, ignoring the supplied name. Here `me` identifies the recipient of the response, not the person whose rating was requested.

This is a materially incorrect live result. It is not a demonstrated unauthorized disclosure: the returned value belonged to the requester, and the reproduction used only synthetic data. It also shows that the prior passing suite did not cover this natural wording; the six canonical cases alone were insufficient to detect it.

## Required review before resuming

Recommend a bounded subject-resolution correction within LMS-0723: distinguish the explicit named subject from conversational recipient wording, preserve genuine self queries, and never silently substitute the requester when another person is named. Add authorization-aware controls for `Tell me`, `Show me`, explicit possessives, genuine `my` questions and ambiguous/mixed subjects. Revalidate the corrected router through the actual protected SQL operation with different synthetic requester/target values, not parser-only assertions. No correction is authorized by this stop report and none was performed.

## Gate disposition

Migration/security review: stopped on the application authorization-to-subject handoff before mutation. Production baseline/count/hash collection, RLS/default-grant verification, migration, READY/version verification and production tests were not completed in this pass.

All production Player/Captain/Co-Captain/Club Pro/Manager/Commissioner tests, six-capability projection/model-call evidence, follow-up/New Question, cross-user isolation, provenance, telemetry, feedback, contact audit, LMS-0722 sanity, Approved Answer history, activation follow-up, production latency and final integrity checks remain pending. Do not treat earlier local test results as those production gates passing.

**LMS-0723 / 0.1.545 is NOT production accepted and was NOT deployed by this sequence.** The previously accepted production baseline remains LMS-0722 / 0.1.544; this pass made no production changes. No new version or subsequent phase was started.
