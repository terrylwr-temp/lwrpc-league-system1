# LMS-0726 / 0.1.548 — role-drift diagnosis and local correction

**STOP FOR REVIEW. NOT DEPLOYED. NOT PRODUCTION ACCEPTED.** Production remains LMS-0725. This pass used production SELECTs only; no migration retry, role change, application deployment, notification or OpenAI call occurred.

## 1–5. Exact failure and expected/actual matrix

The original `lwrpc-admin/supabase/migrations/20260909014356_lms0726_view_as_real_ui_reads.sql`, line 8, second DO block (`$scope_guard$`), raises `View-As read role drift` if either:

1. `lms_view_as_reader` has SUPERUSER, LOGIN, CREATEDB, CREATEROLE, REPLICATION, BYPASSRLS or INHERIT; or
2. **any** `pg_auth_members` row has that role as roleid or member.

The preceding DO block, line 5, creates the role when absent using NOLOGIN, NOINHERIT, NOBYPASSRLS. Production role absence before/after the failed transaction is confirmed. This is not a leftover partial role. The role was created inside the failed transaction and rolled back.

The precise incompatible assumption is the second branch. The production migration principal is `postgres`, a **non-superuser with CREATEROLE**, with empty `createrole_self_grant`. PostgreSQL automatically grants the creator ADMIN OPTION on a created role. The original guard rejects that automatic membership even when INHERIT and SET are false. This behavior is documented in [PostgreSQL 17 client settings](https://www.postgresql.org/docs/17/runtime-config-client.html#GUC-CREATEROLE-SELF-GRANT).

The failed transaction's ephemeral membership is no longer available in production catalogs. Its exact state was reproduced in isolated PostgreSQL under the observed production principal attributes; the unchanged original migration raised the identical exception at the same block/line. This distinguishes directly observed production metadata from reconstructed transaction state.

| Property | Expected by original migration | Actual production / reproduced transient state | Result and classification |
| --- | --- | --- | --- |
| Reader exists before apply | May be absent; create it | Absent; also absent after rollback | Match |
| LOGIN | false | false after CREATE in reproduction | Match; security-critical |
| SUPERUSER | false | false | Match; security-critical |
| BYPASSRLS | false | false | Match; security-critical |
| INHERIT | false | false | Match; security-critical |
| CREATEDB | false | false | Match; security-critical |
| CREATEROLE | false | false | Match; security-critical |
| REPLICATION | false | false | Match; security-critical |
| Reader member of another role | No | No | Match; security-critical |
| Any member of reader | None | `postgres`, grantor bootstrap superuser `supabase_admin` (OID 10) | **Difference: automatic trusted administrative membership** |
| That membership's ADMIN | No row expected | true | Compatible only for the exact trusted migration principal/automatic grantor; not benign for arbitrary users |
| That membership's INHERIT / SET | No row expected | false / false | No automatic read privilege or SET ROLE use |
| Connection limit | Not checked; CREATE defaults -1 | -1 in local CREATE; production reader absent | Compatible, irrelevant to a NOLOGIN role |
| Role configuration | Original guard does not check | No settings in reproduction; absent in production | Corrected guard rejects settings |
| Role owner | Not applicable | PostgreSQL roles do not have an owning role | Grantor is not an owner |
| Schema/function/table/column/default ACLs before CREATE | No reader-owned objects/grants | Reader and new schema absent | Match |
| Migration principal SUPERUSER | Fixture implicitly relied on true | Production false | Material fixture mismatch |
| Migration principal CREATEROLE | Must create role | true | Match |
| `createrole_self_grant` | Fixture did not model it | Empty | ADMIN grant still exists; SET/INHERIT are not automatically added |

Production `postgres` also has LOGIN, INHERIT, CREATEDB, REPLICATION and BYPASSRLS; these are attributes of the existing administrative principal, **not** of the reader. They were not changed. Production database owner is postgres; `view_as_private` owner is postgres; public schema is owned by pg_database_owner. See [read-only evidence](lms-0726-role-drift-production-evidence.json).

## 6–9. Provenance and fixture gap

Repository search found original reader creation only in the LMS-0726 SQL and its local generator (`scripts/lms0726-build-page-reads.mjs`). Earlier applied LMS-0724 creates **lms_view_as_executor**, not the reader. LMS-0725 extends the accepted executor's limited reads; it does not create the reader. Production history contains the accepted LMS-0724/0725 migrations and no LMS-0726 entry.

The existing executor has two production membership rows: bootstrap-granted ADMIN=true/INHERIT=false/SET=false to postgres, and postgres-granted ADMIN=false/INHERIT=false/SET=true to postgres. The latter is explicitly established by accepted LMS-0724 SQL. The first matches PostgreSQL's non-superuser role-creation mechanism. There is no evidence that manual configuration or a partial failed migration caused the new reader failure.

The prior native fixture initialized PostgreSQL with bootstrap superuser **postgres**, then performed DDL as that superuser. It reproduced accepted data/functions but not production's role-creation and ownership execution context. Superuser role creation has no automatic creator-membership row and superuser function replacement bypasses ownership restrictions. Thus previous native passes were insufficient for this deployment boundary.

The new fixture starts bootstrap `supabase_admin`, creates and seeds postgres, then demotes the synthetic postgres to the observed non-superuser attributes and recreates both accepted executor membership rows. It makes postgres database owner. It runs migration statements as the postgres session, not as a superuser or SET ROLE surrogate. Browser/service NOLOGIN roles are exercised through SET ROLE inside the isolated fixture, never by manufacturing production credentials. Local PG is 17.11/Windows versus production 17.6/Linux: the relevant PostgreSQL 17 role semantics are reproduced, not a claim of identical hosting platforms.

## 10–16. Smallest locally validated correction and final footprint

Corrected standalone replacement for the **unapplied** original:

`lwrpc-admin/supabase/migrations/20260909153000_lms0726_view_as_real_ui_reads_role_compat.sql`

SHA-256: `e46a527351d8dd1cef6c4f23e4cda2a9e3a2389308846c115b89e0cbc28fa207`

Original retained unchanged at SHA-256 `690f3c2777f760b84fee2b756ef64060c844924ded304d7ae22344e015d28125`. **Do not bulk-apply both files.** The corrected file is a full replacement candidate awaiting review; the original remains as immutable failed-attempt evidence. The original generator was not run or changed.

The correction:

1. Retains every original restricted-role, function-body/owner/ACL, column-grant and policy check. Allows only the automatic incoming ADMIN-only membership from bootstrap superuser OID 10 to the current/session postgres principal, with INHERIT=false and SET=false. All other incoming/outgoing memberships still fail.
2. Rejects unexpected migration principal, role settings, role-owned relations/schemas, role-specific default ACLs, persistent schema CREATE and unexpected reader-owned functions. It does not blindly ALTER existing roles or DROP anything to force compatibility.
3. Uses an explicit transaction-only grant to postgres, ADMIN=false/INHERIT=false/SET=true, explicitly granted by postgres, and temporary CREATE on the two private schemas. Reader-owned functions are created/replaced while SET LOCAL ROLE is the reader. These grants are removed before commit; only the exact automatic ADMIN-only membership remains on the production-compatible baseline.
4. Replaces the dispatcher as its existing executor owner, using the already accepted postgres SET membership and temporary CREATE on public, then revokes CREATE. The original migration also silently depended on superuser function-replacement rights; the production-compatible fixture exposed `must be owner of function lms_view_as` when that issue was left unresolved. The accepted LMS-0724 lock migration already uses temporary schema CREATE for owner-controlled DDL. No persistent executor permission expansion is introduced.

All five function bodies remain byte-identical to the original reviewed candidate, including the dispatcher extension. The correction changes the guard and the DDL execution context, not target scope, projection fields or locking semantics. [Source proof](lms-0726-role-compat-source-check.json).

| Function | Owner | Security | Final EXECUTE |
| --- | --- | --- | --- |
| lms_read_private.lock_viewer(jsonb,text,jsonb) | postgres | DEFINER; empty search_path | postgres and reader |
| lms_read_private.competition(jsonb,text,jsonb) | reader | INVOKER; empty search_path | reader |
| lms_read_private.people(jsonb,text,jsonb) | reader | INVOKER; empty search_path | reader |
| view_as_private.page_read(jsonb,text,jsonb) | reader | DEFINER; empty search_path | reader and accepted executor |
| public.lms_view_as(text,jsonb) | accepted executor | Existing DEFINER; empty search_path | Existing accepted ACL preserved |

Final reader footprint: **238 column SELECT privileges on 19 reviewed tables, zero table-level privileges, 19 SELECT policies, no business write grants, no persistent CREATE, no SET/INHERIT membership**. It owns only the three reviewed read functions. The postgres-owned lock helper performs the already reviewed protected locking checks; the reader does not receive UPDATE/DELETE to obtain locks. Existing normal-LMS role policies and application handlers remain unchanged.

Reusing lms_view_as_executor is not equivalent: it has accepted private lifecycle/audit mutation privileges and narrowly granted UPDATE privileges for earlier locking. postgres/supabase_admin/service_role also have broader authority. Retaining the separate NOLOGIN/NOBYPASSRLS reader is the bounded architecture; its only administrative member is the existing trusted database migration principal.

## 17–18. RLS and browser boundary

The reader is NOBYPASSRLS and owns no business tables. Existing reviewed SELECT policies permit its column-limited reads; the protected entry/helper determines effective-user scope. RLS is explicitly enabled on the new fixture's public tables. Projection succeeds through the accepted dispatcher, while direct helper calls from anon, authenticated and service_role fail. No browser, Player, Captain or Club Pro membership in the reader is granted. The existing privileged server dispatcher remains the only application entry. The correction does not change normal browser Data API exposure; that separate hardening work stays open.

Temporary DDL privileges exist only within the transaction for the trusted migration principal/owners, are not committed, and are absent in both successful end states. Guard checks prevent silently revoking pre-existing unexpected persistent CREATE as a normalization workaround.

## 19–24. Reproduction, replay, integrity and rollback

| Control | Result |
| --- | --- |
| Unchanged original, production-compatible principal | Exact role-drift exception reproduced; transaction rolled back |
| Unchanged original, prior bootstrap-superuser baseline | Passes, explaining prior false confidence |
| Corrected clean baseline | PASS, first apply + two replays |
| Corrected production-compatible baseline | PASS, first apply + two replays |
| Unsafe states | 19/19 rejected on each baseline |
| Partial recovery | Missing people function, members policy and one SELECT grant safely reconstructed |
| Compatible existing role | Post-removal bounded remaining role/schema successfully reused on reapply |
| Function ownership/ACL inventory | Matches reviewed owners, body hashes, empty search_path and exact EXECUTE footprint |
| Target-effective read | Synthetic Captain's managed team and identity preserved |
| Direct helper use | anon/authenticated/service_role denied |
| Concurrent authorization/publication changes | Team/role/hierarchy/publication races serialize; expiry denied |
| Normal Member Administration | Exact directory result unchanged before/after correction, removal and reapply |
| Normal policies | Unchanged except the 19 explicitly scoped reader SELECT policies |
| Local business data | All 23 public fixture tables unchanged across apply/replay/recovery/removal; includes the 19 production integrity-control tables |
| SQL removal rollback | Accepted dispatcher/snapshot restored under production-compatible owner execution; maintenance preserved; no business restoration |
| Reapply after removal | Corrected target-effective page read restored |
| Application/boundary regressions | 15/15 targeted tests passed; all 312 staged application-package file hashes unchanged |

Unsafe controls: LOGIN, SUPERUSER, INHERIT, BYPASSRLS, CREATEDB, CREATEROLE, REPLICATION, browser membership, outbound membership, creator SET, creator INHERIT, role configuration, table UPDATE, broad table SELECT, column UPDATE, persistent CREATE, helper EXECUTE to browser, wrong function owner, reader default ACL. Each is injected only in isolated rollback transactions; the migration rejects the unsafe state rather than repairing it.

Evidence: [production-compatible run](lms-0726-role-drift-production-compatible.json), [clean run](lms-0726-role-drift-clean.json), [concurrency run](lms-0726-role-compat-races.json), [15 regression tests](lms-0726-role-compat-regression.txt). Permanent fixture: `scripts/lms0726-role-drift-postgres.mjs`; existing race runner accepts an explicit local migration path. Earlier 1,010-test/build/lint evidence applies to unchanged application source; no new full test suite/build/browser acceptance is claimed for this SQL-only pass.

The final production integrity check has **17 tables exactly unchanged**, plus one new team and one linked Captain role created at 15:26:13 UTC during this read-only diagnosis. Filtering only those newly created rows yields **exactly the original teams and roles fingerprints**. All pre-existing rows in all 19 tables therefore match. This is independently occurring team/Captain registration-shaped activity, not migration DML; the creating person's identity was not established or needed for diagnosis. Do not describe the total live counts as unchanged: teams 97→98, roles 169→170. [Concurrent-activity evidence](lms-0726-role-drift-concurrent-activity.json), [final fingerprints](lms-0726-role-drift-business-final.json).

The prior failed production transaction had already been verified fully rolled back with all 19 fingerprints identical immediately afterward. No production writes occurred in this pass. No business restoration is appropriate. No application rollback was needed; the prior application-first rollback rehearsal remains applicable because application bytes are unchanged.

## 25–29. Review boundary and controlled continuation

No shared UI/application changes. No deferred eight-function foundation, 360 policies, 82-write migration, Add/Remove redesign, Phase 2 tightening or next version. OpenAI calls/tokens/cost: **0 / 0 / $0**.

After explicit approval of the **new hash**, proposed continuation is:

1. Refresh read-only production project/deployment identity, migration history, postgres/reader/executor attributes and memberships, schemas/ACLs, maintenance and all 19 fingerprints. Account for legitimate ongoing registration. Recheck all application-package hashes and the corrected SQL hash.
2. Apply only the reviewed corrected replacement once; do not apply the original or bulk-run pending migrations. Unexpected principal, membership, privilege, object or hash state means STOP.
3. Verify exactly one corrected history entry and exact source; four helper functions plus dispatcher; final owners/EXECUTE/search_path, 238 column grants/19 SELECT policies, automatic ADMIN-only membership, no persisted SET/INHERIT/CREATE, no normal privilege drift and no candidate-caused business change. Any failure means STOP, no automatic correction/deployment.
4. Only then deploy the unchanged reviewed application package to normal and isolated origins. Require READY.
5. Normal Commissioner/Captain/Player/other available legitimate sessions FIRST, safe roster/Match Setup controls and compact Ask checks; no manufactured roster/match data or model benchmark. Compare integrity before View-As. Material normal regression triggers the approved application-first rollback.
6. Then execute the previously approved View-As target parity, read-only/identity isolation, navigation, mobile/accessibility, telemetry, Exit/maintenance and final integrity gates. Report unavailable production data/session coverage honestly. Production acceptance requires the required gates, not merely migration success.

**Current status: diagnosis proven; corrected SQL locally validated; STOPPED FOR REVIEW. LMS-0726 / 0.1.548 remains NOT DEPLOYED and NOT PRODUCTION ACCEPTED.**
