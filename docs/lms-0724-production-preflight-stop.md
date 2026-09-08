# LMS-0724 / 0.1.546 — Production preflight STOP

Date: 2026-09-07. Controlled deployment approval received. **Stopped before any production mutation; LMS-0724 is not deployed or production accepted.** LMS-0723 / 0.1.545 remains the accepted production baseline.

## Blocking schema mismatch

Read-only production information_schema inspection confirms `public.teams.home_location_id` exists and `public.teams.location_id` does not exist.

The reviewed migration `lwrpc-admin/supabase/migrations/20260907201448_lms0724_view_as.sql` instead uses:

- Line 219: `loc.id=t.location_id` in the target-effective snapshot's location Club Pro relationship predicate.
- Line 328: a SELECT grant on `public.teams.location_id`.

The grant references a nonexistent production column and prevents successful application. The snapshot also depends on the wrong field. This is an implementation/fixture mismatch, not unexplained operational data drift. The local fixture explicitly adds `teams.location_id` (test/helpers/viewAsFixture.mjs:43), so the earlier passing fixture-based tests did not prove compatibility with production's actual schema. No successful unauthorized read or write was observed; the mismatch was detected before application.

Per the approval's stop requirement, no correction or migration attempt was made. The reviewed migration remains unchanged. SHA-256: `04AD250C1DF74D202B09ECE5CB3C7D3DE16445E3DEC1592AE6770D4A58C4AF7C`.

## Read-only checks completed

- Supabase project: LWR PC League Management, `glikrmmgirilnmamxxyl`, ACTIVE_HEALTHY, PostgreSQL 17.6.1.155.
- Vercel project: `lwrpc-admin`, `prj_IBm5EKA3B2hciTmhvz0kIrPhZAX3`, team `team_l5rlGNrtKbyjq5Q0V4Pg9ouR`.
- Current production deployment: `dpl_5TtBANkyvJ4X9PXMpkTBaXUQhuuA`, READY, production alias `league.lwrpickleballclub.com`; commit `fe21d178e83eb364b717d70f27a02aaedeb90cd7`. That commit has LMS-0723 / package 0.1.545.
- No LMS-0724 migration record; no `view_as_private` schema, `lms_view_as` dispatcher, maintenance function, executor role, or matching executor policies currently exist. No name collisions found in these checks.
- All twelve operational relations referenced by new grants are existing RLS-enabled tables owned by postgres. Production migration role is non-superuser postgres with CREATEROLE/BYPASSRLS. Final role-transfer privileges have not been applied or validated in production.
- Reviewed origin remains `https://view-as.lwrpickleballclub.com`. Vercel's current project domains do not include it. No domain, DNS, HTTPS certificate, environment variable, encryption key, cookie, CORS or Auth configuration was changed.
- Existing public Live/identity function definitions were inspected read-only. This does not constitute completion of the full identity/session regression gate.

## Acceptance gate disposition

| Area | Status |
| --- | --- |
| Environment / deployed baseline / migration absence | Verified read-only as above |
| Migration compatibility/security | BLOCKED by missing teams.location_id; migration unapplied |
| Dedicated origin/HTTPS/session headers | Not configured; production checks pending |
| Deployment/version | Not attempted; production remains LMS-0723 / 0.1.545 |
| Member Detail entry, role visibility, sole entry, confirmation | Production verification not started |
| Isolated tabs, banner, navigation, privilege bleed | Production verification not started |
| Write blocking, omitted context, credential replay, event-code endpoints, handoff | Production verification not started |
| Target Auth/session integrity | No target/session operation performed; full acceptance verification pending |
| Ask LWR document/Live, feedback, telemetry, audits | Production verification not started |
| Expiration, role/target invalidation, multiple roles, no-Auth target | Existing isolated evidence retained; production acceptance review pending |
| Mobile/accessibility/Exit | Production verification not started |
| LMS-0723 / LMS-0722 regression | Not run in this preflight; prior accepted baseline preserved |
| Performance | No production View-As timings available |
| Corpus/Stage 7/Approved Answers/HMAC/operational integrity | No mutation attempted; full baseline capture and final integrity checks not completed after STOP |

No member, team, roster, match, Auth, corpus, Stage 7, Approved Answer or HMAC data was changed. Normal registration remains permitted. No new version started. Deferred DUPR clarification refinement remains separate.

## Proposed bounded next step — requires review

Align only the View-As team's location reference and column grant with authoritative `teams.home_location_id`; correct the fixture to match production and add a schema-contract check for every projected/granted column. Preserve legitimate `matches.location_id` references. Verify the actual location Club Pro relationship predicate and current target permissions. Revalidate migration replay, effective privileges, non-superuser migration ownership behavior, security/concurrency tests and the full suite before repeating read-only preflight. Do not add or rename a production operational column to accommodate the faulty fixture. This proposal is not implemented.
