# LMS-0723 / 0.1.545 — manifest-bound production coordination and repair

2026-09-07. **LMS-0723 / 0.1.545 — PRODUCTION ACCEPTED with the previously approved unavailable-live-gate limitations below.** Owner approved exactly manifest 57fb2ed9-d821-4264-a48a-1cf8105dee36, plaintext SHA-256 f28b31208beca918bff2095b549a4c70bf18bc221b48d5fa8773bcd24fc2b076: 15 existing-role links and one identical Commissioner split. The historical 14+1 limit is superseded only for this exact manifest.

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

## Completed production continuation

All remaining 15 reviewed links returned REPAIRED. All 16 then returned ALREADY_REPAIRED on replay without additional repair audit events. Batch membership, before/after role state and preserved roles were verified against the protected manifest/backup. No replacement candidates were selected.

Normal main-to-Vercel deployment completed: commit adb4389d9c2a88501a907fe46e6fcbdb46c31002; READY production deployment dpl_FYJNWrgD2Q6L3WZR4p45ZQPJyn18. Production alias remains league.lwrpickleballclub.com. No version increment beyond 0.1.545.

Live acceptance: SELF_RATING clarification followed by AUTHORIZED MISSING passed. One controlled Helpful event correlated with that exact missing-value answer; the manager Live feedback panel showed intent/result/relationship, channel, vote and LMS version without personal values. Private actor retention remains as designed; no claim is made that the private feedback table contains no actor identifiers. Existing document feedback remained unchanged.

Postdeployment password request returned unsupported without retrieving credentials. Explicit synthetic nonexistent-person rating request returned PLAYER_RATING/not_found without falling back to SELF. Authenticated direct RPC invocation failed with permission denied; an unauthenticated account-identity request containing synthetic substituted IDs returned 401/not_authorized. Live outcomes recorded no answer-model or embedding calls, no Stage 3 retrieval and no live values in bounded diagnostics. Official-document RAG regression requests separately used their normal model pipeline.

Nine minimal LMS-0722 production regressions passed: PrimeTime and Saturday player counts; both match formats; Picklebreaker rally scoring including game-winning serving qualification; Saturday additional mixed-only players; club website; general password-help instructions; Saturday document navigation. Fielded counts were not stated as roster maximums. Cross-League Leakage = 0 across the explicitly scoped controls. The previously accepted broad stored page-15 heading remains documented in the LMS-0722 report; no new heading correction was made.

Manager AI Feedback & Review and Approved Answers history passed. Historical feedback opened the exact retired scheduling revision 2 with its retained Rule 5.11 passage; revision 1 detail/history also remained available. A browser automation attempt initially treated a relative source URL as an absolute hostname; resolving it against the production origin opened the viewer successfully. This was not an application defect. No source token is included in this report.

AI Assistant Management showed the active Rules version prominently, truthful Activated/Activated by Unknown values, and Prior Versions (10) collapsed initially. Expansion changed aria-expanded from false to true and exposed retained versions in newest-first order with statuses/activation information. No document was processed, activated, retired or changed for this check.

Sanitized capture-success hosting logs were observed. A final error/fatal query covering the deployed build from 19:07 through 19:29:43 UTC returned no matching logs. Live service total_ms was 85 for clarification and 68 for authorized missing; these are service timings after authentication, not end-to-end latency or a measured getUser/mapping/query/render breakdown. No production fault injection was performed.

## Integrity and legitimate concurrent activity

At the 19:19:41 UTC reconciliation: 1,951 members, 176 Auth users, 139 role rows, 83 teams, zero roster memberships and zero matches. Twelve non-manifest role rows created/updated since the baseline were Captain roles correlated with continuing registration. Initial prospective-link events were independently verified as newly assigned roles outside the repair manifest. The original 107 no-role accounts were not bulk provisioned; counts may change through legitimate owner assignment. Newly safe unreviewed candidates were not substituted into this repair batch.

Existing table ACL/RLS, policies, prior public/Live functions, Auth material identity state, ratings, documents, versions, chunks, Approved Answers/revisions/events and legacy feedback hashes remained stable. Member content changed without an updated_at/import marker; the owner explicitly confirmed member edits during this run. That change is recorded as legitimate concurrent owner activity, not LMS-0723 mutation or an unresolved integrity blocker. Team/role changes were likewise attributable to registration. No operational member/team/roster/match rows were changed by the repair migration outside its approved identity-link behavior.

## Accepted limitations and conclusion

Unavailable real roster and match gates retain the owner's accepted seasonal limitations; no relationships/matches are manufactured. Actual logout/revocation remains a limitation if not safely replayed. No-role and held identities remain outside controlled backlog repair. View As User has not started.

No real roster-dependent or next-match gate was run because prerequisites remain absent. Isolated authorization/concurrency tests remain the accepted evidence until legitimate relationships and matches exist. Actual logout/revocation was not replayed in this run. Per-component authentication/render latency was not measured. These limitations are not represented as production passes. All currently testable required gates passed; no unresolved blocker remains. LMS-0723 / 0.1.545 is production accepted under the owner's approved limitations. No further migration, repair, deployment or next-version work is authorized by this conclusion.
