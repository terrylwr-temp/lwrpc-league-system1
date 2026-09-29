# Swap with Bye release review

Release branch: codex/schedule-bye-swap-release, from accepted Production f9f90d9. The approved cfbe4a1 feature was cherry-picked without the unrelated roster acceptance documentation. The owner explicitly authorized persistent audit records before release on September 28, 2026.

## Scoped audit addition

The new migration 20260929003943_schedule_editor_swap_with_bye_audit.sql follows the unapplied 20260928213736_schedule_editor_swap_with_bye.sql. It creates only schedule_editor_private.bye_swap_audit and replaces the new feature RPC with a signature requiring p_actor_user_id. The trusted server supplies authorization.user.id from the existing online authentication/League Manager check; a client actor field is ignored. No existing authorization, roster, score, standings, generation or eligibility rule changes.

The audit stores action, acting Auth user UUID, match/bye/league/division UUIDs, date/week, Home/Away side, removed/incoming/opponent UUIDs and the same timestamp used on both changed rows. It inserts within the same transaction. Audit insertion failure rolls back the match and bye updates. Failed/stale/replayed requests do not add history. UUID identity has no sequence; history has no cascading business-row foreign keys.

The private schema has no anonymous/authenticated access and remains outside exposed Data API schemas. Explicit revokes precede service_role USAGE, SELECT and INSERT grants. RLS is enabled with no client policies. Service cannot UPDATE or DELETE audit records. The RPC remains SECURITY INVOKER with empty search path and bounded locks, callable only by service_role. All original snapshot, division/date/week, duplicate, lineup and score guards remain byte-for-byte equivalent.

The original and audit migrations contain no existing business-data migration. The replaced function belongs solely to this new, previously unapplied feature. Neither migration changes existing business table privileges, policies or triggers. The prior application remains compatible with these additive objects. Application rollback restores the accepted deployment without deleting audit history or undoing legitimate swaps; no database rollback is necessary. Optional later removal of the unused RPC requires separate review and must retain history.

## Staging and verification

Preview previously shared Production Supabase. An isolated branch qrvwqomqbgciwssitniz was approved at $0.01344/hour. Its historical migration replay failed because the live base schema predates recorded migrations. A read-only schema snapshot populated the isolated branch (80 empty application/private tables and their function/security definitions); no Production business rows or Auth users were copied and Production migration history was not repaired. Disposable fixture accounts and schedules will be created only in that branch.

Focused audit-enabled tests: 39/39 passed. Full automated suite: 1,605/1,605 passed (510.3 seconds). Lint: 0 errors and 11 existing warnings. Clean Production build: passed, 85 routes. Both exact reviewed migrations have been applied once to isolated staging; the resulting function body, SECURITY INVOKER, empty search path, 3-second lock timeout, service-only EXECUTE, private audit RLS/no-client access and SELECT/INSERT-only service grants were verified. Browser-observed authenticated staging acceptance and Production promotion remain pending. The previous synthetic local browser checks are not authenticated staging acceptance.

## Release prerequisites

Review exact migration definitions and grants on isolated staging, execute authenticated swaps against disposable schedules, verify audit history and conflict/lineup/score/atomic rollback behavior, preserve normal editor operations, then apply each exact migration once to Production and promote a verified artifact. Do not run a live Production swap or create Production fixtures. Production smoke must cancel before confirming any live swap. Capture business integrity and test the accepted deployment as rollback.

## Acceptance-discovered compatibility correction

Read-only live discovery found all 299 scheduled matches have existing generated defaults home_score=0, away_score=0, score_status=not_entered, with no entered/verified/finalized timestamps. cfbe4a1 incorrectly treated these defaults as real results and hid every swap action. A Swap-only correction recognizes both NULL legacy scores or both zero scores explicitly marked not_entered; any entered score status, nonzero/partial totals, entered timestamps, game score (including zero), lineup or played state remains protected. Existing generation and score behavior is unchanged. Migration 20260929010400_schedule_editor_swap_with_bye_unplayed_defaults.sql replaces only the new RPC guard; the prior reviewed migrations are unmodified. Final focused tests: 43/43 passed. Final full automated suite: 1,609/1,609 passed (500.8 seconds); focused: 43/43. Lint: 0 errors, 11 existing warnings. Fresh clean Production build: passed, 85 routes. Staging browser acceptance and Production remain pending.

## Atomic installation sequencing correction

Automatic approval review rejected the original five-argument base migration in Production as stale. The deployment script incorrectly continued after that tool error. The audit migration failed transactionally on its missing prerequisite, and only the six-argument unplayed-defaults function migration was applied; the accepted application remained deployed and no business swap occurred. Production preflight confirms no audit schema/table and only the current service-only RPC.

The current atomic installer 20260929012528_schedule_editor_swap_with_bye_atomic_install.sql creates the reviewed private audit objects and current six-argument RPC together. It never creates a legacy overload, refuses an unexpected legacy overload or audit-column drift, retains all existing audit records, and preserves the reviewed private grants/RLS and function body. It supports empty/partial installations and the already-correct staged state. It does not repair/delete migration history or touch existing business rows. Focused regressions cover the partial installation and retained history; all gates are rerun before this exact installer is staged and applied to Production. The original base and audit migrations remain unapplied to Production; final acceptance must report the actual applied names honestly.

Final atomic-installer gates: 45/45 focused regressions; 1,611/1,611 full automated tests, no failures/skips/cancellations (507.2 seconds); lint 0 errors/11 existing warnings; fresh clean Production build passed with 85 routes. The exact atomic installer was applied once to isolated staging. Catalog definitions and security match the previously accepted six-argument RPC and private audit table exactly; all six existing staging audit records retained the identical fingerprint.
