# LMS-0723 / 0.1.545 — identity coordination implementation

2026-09-07. LOCAL IMPLEMENTATION COMPLETE; STOP BEFORE PRODUCTION. LMS-0723 remains deployed but NOT production accepted. No production migration, repair, deployment, backup export, model call or embedding call occurred during this correction. The owner explicitly approved the bounded application-owned Auth coordination hook after the boundary review.

## 1. Writer inventory

The detailed inventory is retained in [the boundary review](lms-0723-identity-coordination-boundary-review.md). Covered at the database write boundary:

- Native Auth creation/invitation, verification/current-email/pending-email/account-state changes and deletion: app-owned BEFORE trigger on auth.users, returning NEW unchanged.
- Account login and password-recovery linking: verified-server-subject endpoint and bounded prospective RPC; no client-supplied identity target.
- Member create/edit/import, member-email/active-state updates and deletion: BEFORE member trigger, including public.bulk_import_members and public.delete_inactive_member.
- All role inserts/updates/deletes, including Commissioner/Manager assignments, Captain/Co-Captain/Pro helpers, member-role editing and public.admin_master_reset_all: BEFORE role trigger. Existing authorization remains authoritative.
- Prospective member/role completion: AFTER member and role triggers call the same guarded linker.
- Reviewed repair/consolidation/rollback: private functions use the same keys and exact state guards.

Profile photos, phone, location and other non-identity member changes are outside coordination. Unchanged identity columns sent with profile/sign-in updates return early. Ordinary team/registration rows have no new trigger or lock. Catalog inspection was read-only; destructive maintenance functions were not executed.

## 2. Mechanism and rationale

Sorted transaction-scoped advisory try-locks coordinate all material writers, plus NOWAIT locks on the exact reviewed role/manifest rows. This closes the demonstrated uncoordinated duplicate-candidate race. SERIALIZABLE on repair alone did not do so. A permanent table-wide lock would interfere with registration; a new uniqueness constraint on member_id would conflate role multiplicity with identity.

Row triggers can run after tuple locks have been acquired. Therefore they never wait for advisory locks: unavailable coordination raises 55P03 identity_busy and rolls back the write. Repair returns BUSY. No fallback writes without coordination. PostgreSQL transaction end releases all coordination locks automatically.

## 3. Keys

U: immutable Auth UUID; M: immutable member UUID; R: role UUID for role writers; E: SHA-256 of lower(trim(email)). Material updates acquire old and new keys. Sets are sorted and deduplicated. Advisory keys include an LMS namespace. A hash collision causes conservative contention only; complete IDs, normalized equality and full reviewed state remain authoritative. Emails/hashes never authorize a Live request. Audit does not retain raw email.

## 4. Exact mutation guard

The sealed owner manifest pins Auth/member IDs, approved shape, Auth normalized-email digest, confirmation/pending-change/deleted/banned/anonymous/SSO state, member normalized-email digest and active flag, and every candidate role ID, user_id, member_id, role and creation/update marker. Immediately before mutation the private repair takes row locks and compares the entire state, then repeats eligibility/uniqueness and shape checks under coordination. Difference means STALE; there is no automatic newly-safe repair.

Non-material phone/photo/location/profile timestamps, Auth last_sign_in and password changes are not identity-review markers. Confirmation/current email, pending change, active state, role values/markers and fragments are material. The guard also rejects duplicate matching Auth/member candidates, a competing durable binding, incomplete/unverified/ambiguous identities and altered role multiplicity.

## 5. Constraints and role multiplicity

Existing production UNIQUE(user_id), nonunique member-role index, Auth partial exact-email uniqueness and nonunique normalized email index remain unchanged. No new operational-table uniqueness index is added. Distinct legitimate member-role rows remain permitted by existing schema; this migration does not impose one role per member. Repair holds ambiguous/multiple role shapes for review rather than collapsing them.

New constraints apply only to the private manifest/config/audit (including one member per reviewed entry and permitted operation/shape values). Coordination plus guarded full-state validation is required in addition to existing constraints. New fully bound role relationships are checked for unique verified matching identity; existing role-only updates are not forced through repair-specific matching.

## 6. Commissioner consolidation

Only the approved identical split is eligible. The Auth-only Commissioner row is retained, filled with the member UUID, and the identical member-only fragment is deleted atomically. Both reviewed rows and their exact role/identity state must match. Any inbound role-row FK causes REFERENCE_REVIEW, conservatively requiring explicit reference review. No role promotion/demotion occurs. Audit stores exact before/after rows; any constraint/audit failure rolls the entire operation back.

## 7. Prospective prevention

Future account/member/existing-role linking shares coordination and uniqueness guards. It never provisions a role. It requires a newly created Auth/member/role row after installation and a single existing member-role shape. Old backlog and sealed reviewed entries return REVIEW_REQUIRED; missing roles remain PENDING. No identical-split consolidation is attempted prospectively.

Member/role-created-last ordering is handled by protected AFTER hooks. Auth-created-last ordering is completed at the next verified login/recovery call. A pending/busy link does not block ordinary successful sign-in; Live authorization remains fail-closed until durable identity exists. Normal separately authorized Captain/Pro assignment still creates/promotes roles as before and now reports failed/stale writes instead of silently ignoring them. No 107-account bulk provisioning is introduced.

## 8. Previously failing forward race

[Real PostgreSQL results](lms-0723-identity-coordination-results.json), PostgreSQL 17.11 on Windows (production catalog: 17.6 Linux). Synthetic loopback cluster only. A barrier exists only in the harness's in-memory migration copy immediately before mutation; deployable SQL contains no test barrier.

While repair held validated state, competing member insertion, member-email update, Auth duplicate insertion, Auth material-state update and conflicting role insertion all failed BUSY before mutation, within the 1.5-second assertion. After commit, competing durable bindings failed conflict/uniqueness checks. The legitimate Auth state update succeeded on retry after repair, preserving normal account maintenance.

## 9. Reverse race

A duplicate member committed first. Repair returned STALE with no link. It did not reinterpret the changed population as an approved new candidate.

## 10. Role-change race

A legitimate role change held coordination first. Repair returned BUSY, then STALE after the writer committed. The League Manager role change was preserved. Non-material phone/sign-in updates did not invalidate a safe review.

## 11. Same-identity/idempotency

Two sessions targeting the same member link or identical Commissioner consolidation yielded one REPAIRED and one BUSY; retry returned ALREADY_REPAIRED. Exactly one repair audit event remained. Committed guarded rollback restored both exact Commissioner fragments; repeated rollback returned ALREADY_ROLLED_BACK.

## 12. Deadlock/time bounds

Opposing key order tests returned bounded BUSY, without deadlock or unlocked fallback. All key acquisition is deterministic and nonblocking; repair role/manifest locking is NOWAIT. New migration DDL has local 1.5-second lock and 10-second statement limits. The server identity RPC request has a 3-second abort signal; login has a 6-second client bound. These are not claims that all legacy application SQL is deadlock-free: ordinary preexisting tuple/constraint locking remains PostgreSQL behavior, and clients must handle aborted transactions normally. The supported tested identity patterns do not introduce lock waits/inversion.

## 13. Registration impact

No operational team/member/roster/match data is repaired by migration installation. Only private config is initialized. During held identity repairs, real separate-session ordinary team updates completed in milliseconds; exact measured values are in the results JSON. No broad LOCK TABLE is used by the protocol. DDL necessarily takes PostgreSQL's brief installation locks and aborts promptly if unavailable. No production registration freeze is needed. Changing counts from legitimate registration remain expected; later acceptance checks provenance rather than demanding an obsolete snapshot.

## 14. Audit/security and Live regression

Private schema/tables/functions explicitly revoke PUBLIC/anon/authenticated/service_role defaults. Private tables have RLS enabled and no browser policies. Repair/manifest/rollback require the maintenance owner. Only the future-existing-role wrapper is granted service_role EXECUTE. The new login endpoint derives its target from server getUser(token), ignoring body-supplied IDs. The existing password-recovery infrastructure obtains the Auth UUID through its supported server-admin Auth lookup/invitation; the RPC still independently requires verified, active, uniquely matching prospective state. Neither path accepts a caller-provided member/Auth UUID as authority. All privileged functions use an empty search_path and qualified relations. Existing member/role/feedback ACLs remain unchanged in effective database tests.

Native Auth owner can execute the installed trigger without receiving private schema/repair privileges. The hook does not change Auth NEW values, sessions, managed functions, auth grants, or session validation. A material identity conflict may abort an Auth write; caller retries/reviews, never bypasses the hook.

Owner repair events carry run/actor/operator, target IDs and exact role before/after state; prospective links carry explicit system provenance. No unrelated team updates generate identity events. Private audit contains security-sensitive identifiers and stays outside browser/telemetry/model output.

Actual existing Live SQL plus service tests preserve SELF subject resolution, authorized Captain access, unrelated named-person denial, minimum projection without member email access, two-active-season clarification and authorized missing-value behavior. The actual encrypted follow-up receipt resolves choice 1 to missing, not NR/numeric invention. Capture payloads have zero model tokens, no question/personal facts/target IDs, no occurrence/group route. No Live implementation, Stage 7 semantics or model pipeline changed.

## 15. Exact implementation files

New:

- lwrpc-admin/supabase/migrations/20260907143225_lms0723_identity_coordination.sql
- lwrpc-admin/app/lib/accountIdentity.js
- lwrpc-admin/app/api/account-identity/route.js
- lwrpc-admin/app/lib/identityRoleWriter.js
- lwrpc-admin/test/identityCoordination.test.mjs
- lwrpc-admin/scripts/lms0723-identity-coordination-tests.mjs

Modified application files:

- lwrpc-admin/app/login/page.js
- lwrpc-admin/app/api/member-password-reset-check/route.js
- lwrpc-admin/app/teams/page.js
- lwrpc-admin/app/locations/page.js

Documentation: this report, boundary review, project-roadmap.md, lms-0723-implementation-report.md; coordination test results and validation logs. Earlier stop/proposal files remain historical and must not be used as executable repair instructions. Earlier dirty files from other releases are not part of this correction. No version file changed; package/application remain 0.1.545 / LMS-0723.

## 16. Validation

645/645 npm tests passed; 7 focused coordination tests passed. Lint: zero errors, six existing warnings. Type check and PDF server-bundle verification passed. Real PostgreSQL multi-session suite passed, including the actual Live follow-up/capture boundary. Normal production build compiled successfully in 15.2 seconds, then failed only on the known .next/cache/.tsbuildinfo EPERM write lock. The established isolated clean production build passed (compilation, types, page generation and routes). Independent nonincremental type check passed. git diff --check passed after correcting documentation EOF whitespace. Logs: lms-0723-coordination-{tests,focused,lint,types,pdf,concurrency,build}.log.

## 17. Reclassification of original 15

Before any future production repair, recover the protected exact owner-reviewed original UUID cohort (14 existing-role links + 1 split). The earlier repository dry run retained aggregates only, not a PII manifest. Do not substitute a fresh query of every currently safe account. If the original cohort cannot be established, stop for owner review.

Read current state for only that cohort, compare with the reviewed evidence, and present held/changed entries for re-review. Supply pinned expected states to seal_manifest, with original run/Commissioner actor, maximum 14 member_row and 1 identical_split. Sealing itself rechecks locked current state and classification. Repair never expands the set. Any subsequent material change returns STALE. The 107 no-role identities and all other held identities remain excluded; no assumption that all 15 still qualify.

## 18. Backup and rollback

Before a future authorized repair retain protected row-level original role data and reviewed state plus migration function/ACL definitions outside repository/chat. Private events also capture exact original role rows transactionally. Rollback only by reviewed target through rollback_repair after exact after-state comparison and reference review. It restores exact row UUIDs/roles/timestamps, appends an event, and refuses to overwrite intervening changes. Never restore Auth/member/team tables or broad snapshots.

If application correction must be withdrawn, first stop new reconciliation calls in an approved deployment; remove only the five named app-owned triggers (member_writer, role_writer, auth_writer, future_role, future_member), public future wrapper and private executable helpers in reviewed dependency order. Retain protected audit/manifest until retention is approved. Never CASCADE-drop blindly; inspect dependencies and preserve existing Live/session functions/grants. Do not remove coordination while a repair is executing. Advisory locks need no persistent rollback. Schema rollback is a separate reviewed maintenance operation, not automatically executed by this task.

## 19. Production continuation — NOT AUTHORIZED IN THIS PASS

1. Owner reviews this report and explicitly authorizes controlled continuation.
2. Read-only verify project glikrmmgirilnmamxxyl, current migration history, expected Auth/member/role schema/ACLs and no new-object collisions; record current operational provenance baseline.
3. Verify original protected cohort and current classifications; resolve any changed/ambiguous candidates before sealing. Retain protected exact role backup.
4. Apply ONLY new corrective migration 20260907143225 once. Do not reapply the already-deployed Live/session migrations. Verify triggers, function ownership/search_path, effective browser/service permissions, existing ACL preservation and Auth integration state. Stop on discrepancy.
5. Deploy reviewed application changes through normal pipeline only after DB security passes. Verify general sign-in/registration and bounded pending/retry behavior; do not manufacture users, rosters or matches.
6. Seal only approved unchanged candidates; execute guarded repair under short owner transaction bounds. BUSY can retry with the same manifest; STALE/REFERENCE_REVIEW stops that identity for review. Audit exact changes and verify no unrelated mutations.
7. First live acceptance: verified owner SELF_RATING, season clarification and authorized missing behavior where values are absent. Then resume remaining previously approved LMS-0723 privacy/security/regression gates. No live facts reach model/embeddings/quality occurrence snapshots.
8. Keep unavailable real roster/match relationship gates deferred under the owner's seasonal limitation. Isolated tests remain evidence until legitimate authorized data exists. Do not manufacture relationships.
9. Report acceptance or blockers. LMS-0723 remains NOT accepted until this separate production sequence succeeds.
