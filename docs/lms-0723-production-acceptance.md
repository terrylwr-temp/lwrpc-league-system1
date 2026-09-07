# LMS-0723 / 0.1.545 — pending production review

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
