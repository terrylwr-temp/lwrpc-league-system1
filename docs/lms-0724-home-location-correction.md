# LMS-0724 / 0.1.546 — Home-location correction and replay STOP

2026-09-07. Approved column correction completed locally. **Validation STOP: newly demonstrated non-superuser migration replay failure.** No production mutation, migration, domain configuration, deployment or new version. LMS-0723 / 0.1.545 remains production accepted.

## Root cause and complete location-reference inventory

The local synthetic fixture supplied a nonexistent production team column. Corrected the two executable SQL assumptions and the fixture:

| File / location | Prior assumption | Correction |
| --- | --- | --- |
| supabase/migrations/20260907201448_lms0724_view_as.sql:219 | snapshot `t.location_id` | `t.home_location_id` |
| same migration:328 | teams SELECT column grant `location_id` | `home_location_id` |
| test/helpers/viewAsFixture.mjs:43 | adds teams.location_id | adds teams.home_location_id |

All other migration location_id references are legitimate **matches.location_id**: Live next-match venue join (193), snapshot match venue join (224), and match column grant (332). Fixture matches.location_id (19) remains. The new schema test intentionally attempts invalid teams.location_id SELECT/GRANT and asserts failure. The production column contract contains matches.location_id and teams.home_location_id. No View-As server helper, route, client component or generated/TypeScript type supplies another team-location assumption; SQL owns this relationship.

Historical wrong-column references remain explicitly historical in lms-0724-production-preflight-stop.md (original evidence and proposal). Implementation report/roadmap now lead with this correction/replay status. No attempt was made to rewrite the prior evidence. Complete search output is retained locally in .local-validation/logs/lms0724-location-inventory.txt.

## Club Pro relationship and scope

Existing app/captain-dashboard/page.js:269–289 fetches locations assigned through club_pro_member_id or club_pro_2_member_id, then adds home_location_id to the team's bounded relationship filter alongside explicit captain/co-captain/Club Pro team assignments. Production foreign keys independently confirm teams.home_location_id → locations.id and both location Club Pro fields → members.id.

The View-As snapshot now uses exactly that home-location relationship. It retains active team/division/league/season constraints. The real actor does not enter the target scope predicate. No existing role policy or ordinary Live function changed. A location-authorized dashboard team does **not** confer the narrower Live contact capability; regression verifies denial. Division standings/opponent summaries retain their separately approved scope; team/roster access is not granted merely by shared league/division.

Positive controls cover primary and second location Club Pro assignments and explicit team Club Pro assignment. Negative controls cover a team in the same league/division, absent home location, another location assigned to another Club Pro, and a Commissioner actor. Removing/changing the location association removes target team access on refetch.

## Schema contract and grants

A compact independent catalog snapshot, test/fixtures/lms0724-production-columns.json, records the **54 approved read columns** and PostgreSQL types across 12 tables, verified by read-only production information_schema queries. The contract is not generated from the fixture or migration. Tests compare migration SELECT column grants and fixture types against it, reject the nonexistent column, and inspect actual column SELECT/UPDATE privileges plus absence of broad table SELECT. Refresh requires a new authoritative schema review, not copying a failing fixture.

Read-only review covered all 54 granted columns; none is missing after correction. UUID identity/relationship columns, text role/name fields, boolean active flags, numeric ratings/standings and match date/time types were verified. A secondary fixture mismatch, standings_points int vs production numeric, was corrected in the fixture only. Production FKs confirm team captains/co-captains/Club Pro → members, team division → divisions, roster → team/member, user_roles → auth.users/member, and home location → locations. No production schema or relation was redesigned.

Grant delta is one column substitution only. Existing explicit SELECT lists and key-column UPDATE privileges for row locking are unchanged; no SELECT *, broad table SELECT, browser grants or unrelated policies added. The pending context/audit definitions are unchanged, including private-schema RLS, server-only dispatcher, fixed search_path and audit context foreign keys. Final non-superuser replay security is **not yet validated**, as below.

## New blocker: non-superuser replay

The PostgreSQL 17.11 runner now applies the actual migration using a synthetic non-superuser migration role with CREATEROLE, BYPASSRLS, operational-table ownership and database/public-schema CREATE privileges matching the relevant read-only verified production capabilities. Initial application succeeds. Reapplying the identical migration fails:

`ERROR: must be owner of function lms_view_as`

First application transfers the dispatcher to lms_view_as_executor. Membership is deliberately INHERIT FALSE / SET TRUE. Replay's CREATE OR REPLACE runs as the migration role before an explicit SET ROLE, so ownership is not inherited. The earlier superuser replay tests bypassed this restriction. This is distinct from the approved location correction. No ownership/grant/security-model correction has been made. The non-superuser runner now exposes the failing gate instead of masking it.

Review proposal: a narrowly scoped replay ownership sequence that operates as the existing function owner only when necessary, without granting inherited executor access to runtime/browser roles or weakening fixed search_path. Its exact implementation and fresh validation require review. Do not substitute a superuser-only test or ignore the replay failure.

## Validation disposition

- Six View-As database tests passed, including the new Club Pro controls, existing Player/Captain target reads, manager preflight and unauthorized-role denial, audit/privacy, role loss and effective permissions.
- Seven schema-contract/boundary tests passed: 54 types/columns, effective grant footprint, missing-column SELECT/GRANT failure, origin omission/event-code route guards, credential isolation, sole Member Detail entry and receipt isolation.
- PostgreSQL 17.11 initial non-superuser application passed; replay failed as above. Concurrency assertions were not reached in this new run. Previous superuser concurrency evidence remains historical only.
- git diff --check passed.
- Full npm test, lint, tsc, PDF bundle, normal/isolated build and renewed desktop/mobile/accessibility checks were **not completed after this correction** because of the new security/migration stop. Prior implementation validation is not relabeled as validation of this revision.

## Pending migration and hash

Corrected but **not production-ready/applied**: lwrpc-admin/supabase/migrations/20260907201448_lms0724_view_as.sql.

SHA-256: `77260D512AEA612113F9721B9CDEDD3C1AA3C0B68F62B5E546CBFA23B14B6A6D`.

The old hash 04AD250C1DF74D202B09ECE5CB3C7D3DE16445E3DEC1592AE6770D4A58C4AF7C must not be deployed. A subsequent approved replay correction would require a new hash.

## Files changed in this correction

- lwrpc-admin/supabase/migrations/20260907201448_lms0724_view_as.sql
- lwrpc-admin/test/helpers/viewAsFixture.mjs
- lwrpc-admin/test/viewAsDatabase.test.mjs
- lwrpc-admin/test/viewAsSchemaContract.test.mjs (new)
- lwrpc-admin/test/fixtures/lms0724-production-columns.json (new)
- lwrpc-admin/scripts/lms0724-concurrency-tests.mjs
- docs/lms-0724-home-location-correction.md (this report)
- docs/lms-0724-implementation-report.md
- docs/project-roadmap.md

## Production continuation sequence — blocked, not authorized by this correction

1. Review the replay blocker; approve a bounded ownership correction, implement locally, then rerun non-superuser initial application/replay/effective privileges and real concurrency.
2. Complete all requested automated validation and local dedicated-origin desktop/mobile/accessibility checks. Record final migration hash; stop for production review.
3. Only after renewed production authorization: repeat read-only environment, current baseline, migration absence/collisions, column/security and immutable AI integrity preflight. Permit legitimate registration activity.
4. Configure only reviewed https://view-as.lwrpickleballclub.com and required server-only configuration; preserve normal origin/Auth/HMAC settings.
5. Apply the reviewed final migration once and verify actual resulting RLS/grants/ownership/functions before deployment.
6. Deploy LMS-0724 / 0.1.546 through the normal pipeline, verify READY/live version, then perform the approved 43-gate production acceptance sequence. Stop on any security/privacy failure; do not manufacture roster/match data or mutate operational data for testing.
7. Report actual production evidence/limitations and request final acceptance. No new LMS version or deferred DUPR UX work.
