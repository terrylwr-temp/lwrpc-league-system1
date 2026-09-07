# LMS-0723 / 0.1.545 — manifest-bound production coordination and repair

2026-09-07. Controlled production acceptance IN PROGRESS; not yet accepted. Owner approved exactly manifest 57fb2ed9-d821-4264-a48a-1cf8105dee36, plaintext SHA-256 f28b31208beca918bff2095b549a4c70bf18bc221b48d5fa8773bcd24fc2b076: 15 existing-role links and one identical Commissioner split. The historical 14+1 limit is superseded only for this exact manifest.

## Manifest-bound correction

The pending migration now pins the approved manifest UUID and checksum in the private configuration. seal_manifest takes original manifest text plus owner actor, verifies its exact UTF-8 digest before JSONB parsing, then seals only those immutable entries and reviewed expected states. A ceiling of 16 is an additional sanity bound, not authority to select arbitrary current candidates. Whitespace changes, substituted IDs and unrelated manifests fail the digest check. There is no fresh database scan that picks repair targets.

A stale entry can be sealed with its original expected state; repair separately compares current state and invariants under the shared locks and skips it. This permits safe peers to proceed without refreshing/substituting a stale candidate. Private audit run_id binds to the approved manifest; private configuration durably pins its hash. Prospective runtime linking remains separate and uses current verified identity and existing authorized roles, not backlog-manifest membership.

Local correction files: supabase/migrations/20260907143225_lms0723_identity_coordination.sql; test/identityCoordination.test.mjs; scripts/lms0723-identity-coordination-tests.mjs. Previously validated application integration is unchanged. Release remains LMS-0723 / 0.1.545.

## Validation

646 npm tests passed, including exact-checksum rejection, 16-entry synthetic sealing, stale-before-seal preservation, independent safe-peer repair, outside-manifest denial and audit batch correlation. Eight focused tests passed. The real PostgreSQL 17.11 multi-session suite passed again: forward duplicate writer races, reverse race, role-state race, same-identity and consolidation concurrency, no-op rerun, opposing key order, bounded BUSY, Auth writer coordination, rollback and actual Live clarification/capture boundary. Only synthetic loopback data was used.

Lint: zero errors, six existing warnings. Nonincremental types and PDF server-bundle verification passed. Normal build compiled successfully then hit the established .next/cache/.tsbuildinfo EPERM write lock; isolated clean production build passed. git diff --check passed. Logs use docs/lms-0723-manifest-*.

## Production migration/preflight

Production glikrmmgirilnmamxxyl was on READY session-redesign deployment a2d4af0 / dpl_288Q8zmgsnohrzJeHcAB2BzxTAAL. Session migration was present; coordination objects absent. Current Auth/member counts and role/team state were recorded while legitimate registration continued. No roster memberships or matches exist. All 16 approved candidate states and exact 17 original role rows matched before repair; zero inbound role-row FKs were found.

Final local migration SHA-256: ecd262772c39407c0b37ae9b81f18cdccc519a517eb984bee5b138484f309452.

Applied once, production recorder **20260907185550 / lms0723_identity_coordination**. Do not reapply. All 14 function source bodies exactly match the validated submitted SQL, all five trigger event/column definitions match, owner/search_path/SECURITY attributes and effective grants match. Private tables have RLS and postgres-only ACLs; browser roles cannot execute repair or the prospective wrapper; service_role can execute only the intended public prospective wrapper. Auth ownership remains supabase_auth_admin. No Auth/session/identity/password/MFA data was modified by this migration.

Existing public/Auth/Live table ACL/RLS fingerprints, policies, pre-existing public/Live functions, member content, ratings, document/chunk content, Approved Answer history and legacy feedback hashes matched pre-migration. Team/role counts changed during concurrent registration; this was not treated as corruption. Two initial prospective-link audit events were verified against newly created team-assignment roles after installation, outside the backlog manifest, with roles preserved. They are legitimate prospective activity, not controlled backlog repairs. No roles were provisioned by the linking function.

## Protected backup and acceptance account

Verified the encrypted original manifest using both recorded ciphertext and plaintext hashes. Stored an additional DPAPI CurrentUser protected pre-repair role backup in the same restricted operational folder:

C:\Users\t_ade\.codex\private-artifacts\lms0723\57fb2ed9-d821-4264-a48a-1cf8105dee36.pre-repair-backup.dpapi

Plaintext backup SHA-256: 19819712113a2959409de9ca12b7952139ea4e7239114f69c1cdd3231c9021b8.

It contains the exact approved manifest and all 17 original role rows, verified against current production at 18:59:51 UTC, with no inbound references and a two-event prospective audit baseline hash d2ad2128ea7a06ea820a2ba23e6644dd. Decrypt/read-back verification passed; no plaintext file or candidate identity list was committed.

Manifest sealed successfully. Acceptance account repaired first: REPAIRED, one canonical Commissioner Auth/member relationship, one related role row, one consolidate_identical_split batch event; audit before_rows exactly matched backup and after_rows exactly matched current role state. The original Auth-bound row is preserved; no role promotion/demotion.

First required production UI question at 19:01:19 UTC: What is my Season DUPR? Returned LIVE LMS DATA / SELF RATING season clarification with the two active seasons. Reply 1 at 19:01:31 UTC returned: That requested value is not recorded in the authorized LMS data. This is AUTHORIZED MISSING, not DENIED, NR or fabricated numeric rating. The remaining links were released only after this gate passed.

## Remaining gates

Remaining per-identity results, no-op replay, final reconciliation, controlled Helpful correlation, security/privacy, application deployment, minimal LMS-0722 and manager-tool regression, hosting/performance and final integrity are recorded below as completed. No final production acceptance claim yet.

Unavailable real roster and match gates retain the owner's accepted seasonal limitations; no relationships/matches are manufactured. Actual logout/revocation remains a limitation if not safely replayed. No-role and held identities remain outside controlled backlog repair. View As User has not started.
