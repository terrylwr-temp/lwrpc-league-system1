# LMS-0723 / 0.1.545 — Live LMS Intelligence Phase 1

**CURRENT — LMS-0723 / 0.1.545 PRODUCTION ACCEPTED (2026-09-07).** Exact approved 16-candidate repair completed and replayed safely; coordination migration applied once; commit adb4389d9c2a88501a907fe46e6fcbdb46c31002 deployed. All currently testable acceptance gates passed. Owner confirmed concurrent member edits and registration activity as intentional. Real roster/match and logout-revocation limitations remain explicitly recorded. [Final production evidence and limitations](lms-0723-manifest-production-acceptance.md). No new version or View As User work started. Earlier status entries below are historical and superseded by this result.

**CURRENT — Fresh read-only identity review complete; proposed protected manifest awaiting approval.** [Review, checksum, counts and repair procedure](lms-0723-fresh-identity-manifest-review.md). 176 Auth accounts; 15 proposed existing-role links plus one identical split (16 total); 107 no-role deferred. Original historical cohort is not reconstructed. Existing migration cap is 14 links + 1 split and remains unchanged; scope-limit decision required before execution. Manifest saved encrypted outside repository. No production migration/repair/deployment; LMS-0723 / 0.1.545 remains NOT production accepted.

**CURRENT — Controlled production identity continuation stopped before mutation:** the original 15-candidate protected manifest/reviewed state was not retained in the earlier aggregate dry run. [Preflight findings and required recovery/re-review](lms-0723-identity-production-preflight-stop.md). Session migration remains applied; coordination migration remains unapplied. No repair or deployment. LMS-0723 / 0.1.545 remains NOT production accepted.

**CURRENT — Shared identity coordination implemented locally and validated; STOP BEFORE PRODUCTION.** The owner approved the bounded app-owned Auth coordination hook. [Implementation, 19-part review and controlled continuation plan](lms-0723-identity-coordination-implementation.md). Original 14 links + 1 identical split only; 107 no-role accounts deferred. LMS-0723 / 0.1.545 remains deployed, NOT production accepted. No production repair, migration or deployment. Earlier stop/design entries below are historical.

**LATEST — identity repair concurrency STOP.** [Multi-session results, validation and required design correction](lms-0723-identity-concurrency-stop.md). The no-broad-lock experimental replacement permits a concurrent duplicate candidate to commit alongside the repair; the approved proposal also lacks an exact expected-role-state guard. No final repair migration/app implementation or production mutation. Only local diagnostic artifacts/documentation were added. Remain LMS-0723 / 0.1.545, deployed and NOT production accepted.

**Identity-link design/read-only dry run complete — STOP FOR REVIEW.** [Complete report and SQL proposal](lms-0723-identity-link-repair-design.md): 172 accounts classified, 15 link-only repair candidates, 30 isolated synthetic checks passed. No production repair/migration/backup export/deployment. The acceptance split requires audited identical-role consolidation to avoid breaking single-row role readers; production Season DUPR is absent in both active seasons. LMS-0723 / 0.1.545 remains NOT production accepted.

**Read-only SELF_RATING diagnosis complete:** acceptance identity is split across an Auth-only Commissioner role row (member_id NULL) and a member-only Commissioner row (user_id NULL). The immutable member INNER JOIN returns no row. [Exact cause, population counts and proposed bounded link correction](lms-0723-self-rating-authorization-diagnosis.md). No linking/code/SQL/deployment change performed. LMS-0723 / 0.1.545 remains NOT production accepted.

**LATEST: session redesign migrated and deployed; first SELF_RATING gate DENIED — STOP.** Corrective recorder 20260907132549; READY commit a2d4af0. No further tests/correction after the first self question returned an access denial. [Production evidence and full gate disposition](lms-0723-session-redesign-production-acceptance.md). LMS-0723 / 0.1.545 remains NOT production accepted. Concurrent intentional registration is permitted; earlier registration-baseline stop is superseded.

**Controlled session-redesign preflight STOP before mutation:** two team creations and five updated team rows since the prior acceptance stop require confirmation of the intentional current registration baseline. [Read-only evidence](lms-0723-session-redesign-production-preflight-stop.md). Corrective migration remains unapplied; no redeployment. LMS-0723 / 0.1.545 remains NOT production accepted.

**Session redesign implemented locally; STOP for review before corrective migration/deployment.** [Implementation, security evidence and revocation limitations](lms-0723-session-validation-implementation.md). LMS-0723 / 0.1.545 remains deployed and NOT production accepted; LMS-0722 remains the accepted baseline. Earlier design-only/local status entries are historical.

**2026-09-07 session redesign: diagnosis/design complete; awaiting review.** [Trusted server-auth boundary and exact corrective SQL proposal](lms-0723-session-validation-redesign.md). No implementation, SQL application, permission/RLS change or deployment in this pass. LMS-0723 / 0.1.545 remains deployed, NOT production accepted; LMS-0722 / 0.1.544 remains the accepted baseline. Online revocation and session-lifetime semantics are explicit validation gates. Earlier stop/local-deployment statements below are historical.

**LATEST CORRECTION STOP:** read-only pre-mutation review found auth.sessions RLS enabled with no policies and a non-owner/non-bypass reader. Schema USAGE alone cannot fix session validation; the executor also lacks grant option. No corrective mutation/retest/redeployment. [Masked RLS boundary and footprint](lms-0723-auth-rls-boundary-stop.md). LMS-0723 remains deployed, NOT production accepted.


**CURRENT STATUS: LMS-0723 / 0.1.545 DEPLOYED, NOT PRODUCTION ACCEPTED.** Migration applied once (server version 20260907123652), commit d7da5f6 deployed READY. First live SELF_RATING failed: ai_live_session_reader lacks USAGE on auth schema despite its column grants. Acceptance stopped; no corrective change or rollback. [Full evidence, matrix, seasonal limitations and next review](lms-0723-production-session-permission-stop.md). Earlier local/preflight states below are historical.


**Latest controlled-production preflight: STOP before mutation.** Production has zero roster memberships / authorized Captain-to-roster-player pairs and zero matches. Required production-positive fixtures are unavailable. [Read-only evidence and gate matrix](lms-0723-production-prerequisite-stop.md). No migration/deployment occurred.


Status: bounded subject-resolution router/RPC correction implemented locally; stop for owner review before production migration/deployment. Both synthetic subject blockers are corrected. [Correction report, exact migration diff and validation](lms-0723-subject-resolution-report.md). Earlier preflight stops and 627-test results below are historical. **LMS-0723 is not deployed or production accepted.** Accepted production remains LMS-0722 / 0.1.544.

## Authorized six capabilities

| Registry capability | Phase 1 behavior |
|---|---|
| SELF_RATING | Auth-user-bound member, active season, explicitly selected Season or PrimeTime Season DUPR |
| PLAYER_RATING | One authorized person, one requested Season rating |
| PLAYER_CONTACT | One authorized person's email; no phone or other contact/profile fields |
| SELF_TEAM (TEAM_IDENTITY) | Current authorized team/division/league/season; bounded choices when ambiguous |
| TEAM_ROSTER | Authorized team roster names, 25 per page; no contacts or ratings |
| NEXT_MATCH (TEAM_NEXT_MATCH) | Next future published team match, opponent, venue, club-local date/time; not a personal lineup claim |

No answer-model or embedding call belongs to these capabilities. Current official/imported DUPR, historical values, eligibility, reverse email, bulk extraction, other sensitive fields and uncontrolled mixed live/rule requests remain unsupported. Ambiguous DUPR asks for Season versus PrimeTime Season DUPR; no substitution of a Season value for current official DUPR. A stored numeric Season value is not inferred from a separate NR marker, and missing values remain missing.

## Authorization and privacy boundary

The live route verifies the bearer with Supabase Auth before decoding its session ID. The database checks that current session still exists and is unexpired. It resolves `user_roles.user_id -> member_id` and current role, requires an active member, and derives active season/league/division/team relationships. Email is not an authorization key. Existing email-based authorization for unrelated document/LMS paths was not redesigned.

Players have self rating, current team, own roster and next-match access. Other-player contact/rating is denied. Captains, both co-captain assignments and team-assigned Club Pros resolve other people only within active rosters of explicitly managed teams. Same location, league or division is not a grant; location-only Club Pro remains denied for other-person lookup. Managers/Commissioners have bounded single-person directory lookup and selected-team operations, not conversational bulk exports. Test AI uses the caller's actual identity; browser role/member/team IDs cannot impersonate anyone.

Resolution reads IDs and safe names before the value query. Rating and email use separate SQL projections. The final transaction locks/rechecks the subject and granting relationships before projection; stale receipts are not authorization. Duplicate authorized names are not auto-selected. If safe labels cannot distinguish them, the UI directs the manager to the authorized roster/support workflow. Matching is exact-full-name first, otherwise bounded substring clarification; no global fuzzy search or nearest-person guessing is implemented. Team choices are limited to five per page; rosters to 25. Requested team names narrow the already-authorized team population.

All live responses use private/no-store headers and a LIVE LMS DATA card with device-local checked time. Opaque AES-GCM live receipts have a separate key domain, purpose, user/session binding and five-minute context TTL. They retain references only, never names, emails or values. Feedback receipts last 24 hours and contain sanitized correlation metadata. New Question, sign-out and account switch clear live state. The shared session context excludes live exchanges and receipts from browser storage; display values exist only in UI memory. Returning to an independent document question clears the live receipt before the existing document resolver.

## Stage 7 contract

The normal lightweight outcome relation accepts the explicit `LIVE_LMS_DATA` source family. Live outcomes contain capability, result code, relationship class, origin, version and timings; no raw/effective question, target IDs, names, values, roster, match details or result hashes. Live denial/not-found is not insufficient official evidence and creates no unanswered occurrence, fingerprint route, managed-knowledge candidate or missing-rule case.

Live feedback is deliberately separate from `ai_answer_feedback_events`. The protected feedback route recognizes the purpose-bound live receipt before the document serializer. An advisory transaction lock serializes transitions per answer: Helpful, repeated Helpful, Not Helpful, repeated Not Helpful results in exactly two events. Document feedback remains on its original path.

AI Feedback & Review has a separate live diagnostics panel grouping current feedback by capability/result/relationship/origin/version. It shows counts and time, never a historical private answer or target. Manager tests are separated from player-origin groups. A new test uses current permissions and data; historical live facts cannot be reconstructed from telemetry. The existing document review workflow and historical source viewing remain intact.

Quality capture is bounded and fail-open. Required contact audit and durable limits are fail-closed: a failed audit insert prevents disclosure. Attempts are limited to 10/minute and 100/day per principal; contact attempts additionally to 5/minute and 30/day. Denial audit retains only references/reason codes, not raw search strings or protected values.

## Exact migration/security review

Local CLI-generated migration: `lwrpc-admin/supabase/migrations/20260907110701_lms0723_live_intelligence.sql`.

New private schema `ai_live_private`:

- `attempts(actor, at, contact)` and actor/time index.
- `access_audit(id, actor, session_id, target, request_id, intent, decision, at)`; target omitted on denials.
- `feedback(id, answer_id, actor, intent, result_code, relationship, origin, helpful, assistant_version, at)` and answer/time index.
- `retention_runs(at, attempts, audit, feedback)` containing deletion counts only.

New functions:

- `ai_live_private.session_valid(uuid,uuid)`: narrow SECURITY DEFINER owned by non-login/non-bypass `ai_live_session_reader`; SELECT only `auth.sessions.id/user_id/not_after`.
- `ai_live_private.lookup(uuid,uuid,uuid,jsonb)` and public `ai_live_lookup` wrapper: SECURITY INVOKER; service-role-only; explicit principal/session/relationship guards, fixed projections, no dynamic SQL or operational writes.
- `public.ai_live_feedback(uuid,uuid,uuid,boolean,jsonb)`: service-only, session-validated transition append.
- `public.ai_live_review(uuid,uuid)`: service-only; current user-ID manager/Commissioner authorization inside the function.
- `ai_live_private.expire_records()`: SECURITY DEFINER owned by non-login/non-bypass `ai_live_retention`; fixed expiry rules and a count-only execution record.

All functions pin an empty search_path and qualify relations. All four private relations enable RLS. Public/anon/authenticated get no schema/table/function access. Service role gets SELECT/INSERT on attempts/audit/feedback and SELECT on retention run counts, with no direct UPDATE/DELETE/TRUNCATE. Revokes precede final grants to neutralize production defaults. The retention role has DELETE/SELECT only on expired private rows through RLS and INSERT on count-only retention records; it cannot read current audit rows or member facts. The session-reader role cannot read tokens, refresh-token columns, or member data. Temporary CREATE on the new schema is revoked after function ownership changes. Neither role is login-enabled or bypass-RLS.

Existing table changes: only the `ai_request_outcomes` source-family check and protected-source check are extended to admit the typed live source. No existing LMS operational, document or feedback table ACL or RLS policy is changed; the Auth-session column grant to the new constrained reader is explicitly described below. The existing feedback/document/version/chunk/corpus data and permissions are unchanged. No project-wide default privilege change is made. The narrow new session-reader grant is explicit; service_role itself receives no Auth-session SELECT grant. Read-only production metadata confirmed the migration owner can grant each of the three required session columns. No sessions or member facts were inspected.

Retention: attempts expire after one day; private live feedback/audit after 90 days. The controlled deployment plan must arrange a daily trusted database invocation of `ai_live_private.expire_records()` after approval. No scheduler or production job was installed. Count-only retention execution records contain no personal references. Existing Stage 7 outcome retention remains its existing separately governed mechanism.

Rollback: first roll back/disable the application live dispatcher through the normal reviewed pipeline. Retain audit/feedback metadata through its approved retention period. Do not drop private tables during application rollback or remove the new outcome source value while live rows exist. Dropping roles/functions or reversing the constraint requires an explicit reviewed database rollback. Older document-only application code does not require destructive data rollback.

## Local validation and benchmark

Final validation:

| Check | Result |
|---|---|
| npm test | **627 passed**, no failures/skips; includes the full accepted LMS-0722 suite |
| npm run lint | Passed, six pre-existing warnings, no errors |
| npx tsc --noEmit --incremental false | Passed |
| npm run verify:ai-pdf-server-bundle | Passed |
| npm run build | Compiled successfully, then the known `.next/cache/.tsbuildinfo` EPERM lock prevented writing type-build cache |
| Isolated clean production build | Passed after the final code changes |
| git diff --check | Passed |

An initial build caught a duplicate UI import during integration; it was corrected before the successful compilation/isolated build. The remaining normal-build failure is the cache-write lock, not a compilation failure.

Synthetic timing snapshot (milliseconds; this is not a production latency claim):

| Capability | Resolution | Field query | Formatting | Total excluding Auth/capture |
|---|---:|---:|---:|---:|
| SELF_RATING | 5 | 2 | 2 | 15 |
| PLAYER_RATING | 5 | 2 | 1 | 9 |
| PLAYER_CONTACT | 3 | 1 | 1 | 6 |
| SELF_TEAM | 1 | 3 | 0 | 6 |
| TEAM_ROSTER | 1 | 1 | 1 | 6 |
| NEXT_MATCH | 2 | 5 | 1 | 10 |

Resolution includes in-database authorization/person context; total also includes the PGlite call boundary. Auth verification was injected, so its measurement is unavailable locally rather than falsely reported as zero. See `lms-0723-tests.log`, `lms-0723-lint.log`, `lms-0723-types.log`, `lms-0723-pdf.log`, `lms-0723-build.log` and `lms-0723-isolated-build.log`.
 Tests use synthetic identities and isolated PGlite PostgreSQL, including real legacy feedback and Stage 7 migrations. No production member fixtures, feedback events, password resets, document processing or external answer-model benchmarks were used.

Required coverage includes all roles, both co-captains, location-only versus team-assigned Pro, unauthorized duplicate names, forged references, removed role/roster/member/session, exact column privileges, audit failure, rate limits, feedback transitions, migration replay, RLS/default grants, restricted retention, current season ambiguity, self-rating clarification/follow-up, roster pagination, publication/time/status/tie gates, team isolation, manager_test separation, real Stage 7 no-fact persistence, receipt expiry/user/session binding, browser-storage exclusions, document-context transition, and quality fail-open behavior.

The synthetic six-capability timing benchmark reports person/authorization resolution, field-query, formatting and total lookup timing. Authentication is injected locally and therefore **not measured as production Auth latency**. Application instrumentation separately records bearer-verification latency, database round trip and formatting; production latency must be measured later with approved accounts. Query-time freshness is not represented as an external DUPR measurement time.

## Exact implementation files

New:
- `lwrpc-admin/app/lib/liveLmsIntent.js`
- `lwrpc-admin/app/lib/liveLmsReceipts.js`
- `lwrpc-admin/app/lib/liveLmsService.js`
- `lwrpc-admin/app/api/ai-assistant/live-review/route.js`
- `lwrpc-admin/app/ai-assistant/review/LiveFeedbackPanel.js`
- `lwrpc-admin/supabase/migrations/20260907110701_lms0723_live_intelligence.sql`
- `lwrpc-admin/test/liveLms.test.mjs`
- `lwrpc-admin/test/liveLmsDatabase.test.mjs`
- `lwrpc-admin/scripts/lms0723-isolated-build.mjs`
- This implementation report and LMS-0723 validation logs.

Modified:
- `lwrpc-admin/app/api/ask-lwr/route.js`
- `lwrpc-admin/app/api/ask-lwr/feedback/route.js`
- `lwrpc-admin/app/api/ai-assistant/answer/route.js`
- `lwrpc-admin/app/api/ai-assistant/retrieval/route.js`
- `lwrpc-admin/app/components/AskLwrAssistant.js`
- `lwrpc-admin/app/lib/askLwrConversationState.js`
- `lwrpc-admin/app/ai-assistant/console/page.js`
- `lwrpc-admin/app/ai-assistant/review/page.js`
- `lwrpc-admin/app/lib/serverSupabase.js` (explicit `.js` import for the existing permissions module; no auth logic change).
- `lwrpc-admin/app/lib/version.js`, `lwrpc-admin/package.json`, `lwrpc-admin/package-lock.json`.
- `docs/project-roadmap.md`, `docs/lms-0723-live-intelligence-architecture.md` implementation addendum.

Pre-existing dirty LMS-0721/0722 documentation and artifacts were left intact and are not part of this implementation's change list.

## Controlled deployment and acceptance — not performed

1. Review this implementation/migration and authorize deployment separately. Confirm production remains the accepted baseline and inspect exact object/role collisions, owner memberships, session-column grants, private schema exposure, existing outcome checks and unchanged legacy ACLs.
2. Apply the single reviewed migration once through the established migration pipeline. Verify effective grants/roles/RLS/function ownership/search_path, browser denial and replay behavior before application deployment. Do not reprocess or reactivate any document.
3. Deploy LMS-0723 / 0.1.545 through the normal production pipeline only after DB checks pass. No new HMAC/model key is required; existing server secret is used only as domain-separated receipt key material.
4. Configure the approved daily private retention invocation. Verify it cannot delete fresh rows and records count-only execution results.
5. Using owner-approved accounts/data, test Player, Captain, both co-captains, team Pro, location-only Pro, Manager and Commissioner. Verify all six operations, denied cross-player contacts, revoked role/roster/session, same-answer feedback, sanitized manager diagnostics and manager_test origin. Do not enumerate real people for testing.
6. Verify desktop/mobile provenance, current local checked time, short-lived choices, New Question, sign-out/account switch, keyboard use, roster pagination and normal document questions after live questions. Verify browser storage contains no live values and hosting logs contain no personal payloads. End-to-end production/UI/session performance remains a controlled acceptance gate; local compilation is not claimed as production browser acceptance.
7. Confirm model and embedding counts remain zero for live intents; legacy document regression suite and existing authority/.65/historical viewer behavior remain unchanged.
8. Measure production authentication, resolution, query, formatting and total latency independently of document RAG. Verify contact audit failure fails closed and quality capture failure fails open using only a separately approved safe test mechanism.
9. Retain the LMS-0722 activation-history limitation: no legitimate activation occurred during this work; do not create a fake document. Verify the next actual activation when it occurs.

**Stop for owner review. No production migration, deployment, corpus change, activation or next-phase work was performed.**
