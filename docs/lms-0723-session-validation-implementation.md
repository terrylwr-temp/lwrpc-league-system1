# LMS-0723 server-side session validation correction — local review

2026-09-07. **Implemented locally; STOP before corrective production migration or redeployment.** Version remains LMS-0723 / 0.1.545. Production still runs the original deployed LMS-0723 and is NOT production accepted. Accepted baseline remains LMS-0722 / 0.1.544.

## 1. Implemented server-auth path

Bearer request → `authenticateRequestIdentity` → online Supabase `getUser(token)` → projected verified user ID and opaque receipt binding → deterministic live intent/subject router → service-only RPC → current database authorization → minimum projection → deterministic response. No database call authenticates through auth.sessions. No invalid live request falls through to document retrieval.

## 2. getUser integration

The trusted helper is in the existing `serverSupabase.js` module and uses the established Supabase public-key client mechanism. It does not reuse email-derived role resolution. Legacy document-route authorization remains unchanged. The manager answer route now handles live requests before the legacy email helper, with the mandatory database manager_test role check retained. Online Auth is called anew for answer, follow-up, live feedback and live review.

After successful provider verification, the helper checks returned user ID, token sub agreement, session UUID and expiry, then immediately derives a domain-separated HMAC receipt binding. Claim decoding cannot establish authentication. The full user, metadata, email, JWT and raw session ID never leave this boundary.

## 3. Session reader removal

The corrective migration removes the old four live function signatures, installs the approved replacements, drops `ai_live_private.session_valid`, revokes its three session-column grants and private-schema access, and drops `ai_live_session_reader`. Isolated checks prove the role/helper no longer exist. The original applied migration is preserved as history; do not replay it. Production removal is pending approval/application. No dormant reader access remains in the tested corrected database.

## 4. Final RPC exposure

New signatures:

- `ai_live_private.lookup(uuid,uuid,jsonb)`
- `public.ai_live_lookup(uuid,uuid,jsonb)`
- `public.ai_live_feedback(uuid,uuid,boolean,jsonb)`
- `public.ai_live_review(uuid)`

Each is SECURITY INVOKER, empty search_path, with explicit revocation of default PUBLIC/anon/authenticated/service grants followed by only service EXECUTE. Isolated effective privilege checks cover all four. Actual SQL calls under normal `authenticated` and `anon` roles are denied. Trusted service invocation succeeds after the server-derived actor handoff. Old overloads are removed; no browser-selectable requester RPC was introduced.

These tests exercise PostgreSQL's actual browser role, not a running PostgREST instance. An HTTP Data API negative probe of the new signatures remains a post-migration gate; production currently has the old signatures.

## 5. Database authorization

Active user-ID/member mapping, current roles and team/roster relationships remain inside the protected functions. Current role removal and Captain/Co-Captain/roster relationship removal are tested. No email fallback or authorization cached in conversation context. Locks and final relationship rechecks remain.

The service role already bypasses application RLS: explicit function checks and field projections are the live authorization enforcement, not application RLS policies. No table-policy, auth ownership, default privilege or bypass-role broadening occurred. The isolated fixture now includes separately owned auth.sessions, enabled RLS and no reader schema usage before applying the correction. Successful corrected lookups do not depend on that table.

## 6. Subject-resolution regression

SELF, EXPLICIT_PERSON, FOLLOWUP_REFERENT and NONE remain unchanged. Named rating/email/team requests resolve only within the approved authorization population. Nonexistent, unauthorized, ambiguous and forged/stale-reference cases retain permanent tests; explicit failure never returns requester data. New Question and independent document questions clear live references as before.

## 7. Token validation

Tests cover valid verified identity; absent/malformed bearer; malformed/forged/expired JWT; wrong signing key; provider rejection; token-sub/user mismatch; invalid/null session identity; another user's valid identity; cross-user receipt use. A controlled cryptographic Auth contract double validates synthetic signatures; it is not represented as a deployed Auth service.

The real Supabase JavaScript SDK is additionally exercised against a controlled `session_not_found` Auth response, proving the SDK error becomes sanitized 401 before any live RPC/model transport. Read-only production probes also returned 403 `bad_jwt` and no user for malformed and locally forged synthetic tokens. No real user token was captured or printed.

## 8. Revocation findings and limits

Production public Auth health reports **v2.196.0**. The version-matched source routes `/user` through `requireAuthentication`, which verifies the JWT, loads its user and nonempty session, rejects a missing session, and rejects banned users. This is version-matched source evidence that online getUser detects deleted sessions, not merely local signature verification. [Auth middleware](https://github.com/supabase/auth/blob/v2.196.0/internal/api/auth.go), [user-route wiring](https://github.com/supabase/auth/blob/v2.196.0/internal/api/api.go).

Logout has global/local/other-session scopes; only affected sessions should be rejected. [Version-matched logout](https://github.com/supabase/auth/blob/v2.196.0/internal/api/logout.go). The implementation rejects any token the provider rejects, regardless of decoded claims.

Time-box/inactivity/single-session policy changes are not a promise of immediate rejection by getUser. Supabase documents enforcement on refresh and possible JWT-lifetime delay. This does not reproduce the old helper's exact not_after predicate. [Supported session semantics](https://supabase.com/docs/guides/auth/sessions).

**Limitations requiring acceptance review:** no disposable authenticated Supabase test session or local Docker-backed Auth service was available in this workspace. No owner session was revoked, no Auth user was created, and no production session was mutated. Thus an actual valid-token → logout/revoke → replay test was NOT performed. The strongest safe checks performed were live malformed/signature rejection, version-matched source inspection, and SDK/synthetic provider rejection tests. These must not be called an end-to-end hosted revocation pass. The project's private time-box/inactivity/JWT-lifetime configuration was not exposed by the public health probe; no numerical revocation window is claimed. Before production continuation, review these semantics and either validate an explicitly approved disposable session against the current provider or accept the documented validation limitation. If the observed/required window is unacceptable, stop for design review; no auth-schema workaround.

## 9. Timeout and fail-closed behavior

Authentication has a hard **5,000 ms** budget using a deadline race plus AbortController on SDK transport. The race also bounds an unresponsive dependency that ignores abort. Timeout, throws, upstream failure or malformed provider state return sanitized 503. Invalid credentials return sanitized 401. Both use private/no-store. The privileged client is constructed only after successful identity validation. No cached identity, client identity, SELF recovery, document snapshot or answer-model fallback.

The token remains bearer-only; no cookie authentication or permissive CORS was added. Optional explicit Origin filtering was not needed for this bounded correction; existing browser same-origin transport remains. No claim of an origin allowlist or XSS protection is made.

## 10. Direct-RPC and forged-requester evidence

Database tests SET ROLE anon/authenticated and execute the protected lookup: permission denied. They also reject private feedback reads. Catalog effective grants are checked for all four signatures after migration and replay. Trusted server tests supply forged user/member/team/subject/role inputs, assert the exact RPC actor equals the verified getUser identity, and assert forged fields/session IDs are absent from arguments. Separate database cases deny forged team/target access and changed relationships. Service credentials remain server-only; compromise of that credential remains a trusted-server compromise, not something these function grants can prevent.

## 11. Field projections

All six capabilities retain their existing projections: selected self/authorized-player rating; authorized player email only; team/division/league/season identity; paged roster names; next qualifying published match fields. Column-ACL tests prove rating succeeds without contact-column permission, contact fails until email SELECT is granted, and contact succeeds without rating-table SELECT. No unrelated field fetch is added by this correction.

## 12. Stage 7 and feedback privacy

Live telemetry remains metadata-only, with no question/name/value/subject/receipt/auth material. Auth failures stop before quality/document-answer capture and do not log provider objects. Live feedback remains its private sanitized path; same-value selections remain idempotent and changes append events.

Raw session IDs were also removed from future private audit inserts. The approved migration makes the existing session_id column nullable, preserving historical records without backfill or deletion. Actor/target identifiers remain only in the separately approved private security audit. Retention and append-only restrictions are unchanged.

Receipt encryption still binds purpose and user, now with an opaque session HMAC instead of a raw session ID. Refresh in the same session works; another session/user, expired or missing binding fails. Old-format receipts require a fresh question. No Stage 7 HMAC configuration changed.

## 13. Zero-model/embedding evidence and document regressions

Six-capability execution tests install a failing external fetch and assert zero network/model/embedding calls while exercising deterministic answers and metadata-only capture. Authentication itself is the expected Auth network call; it does not send the question or live facts. The real-SDK rejection test admits only `/auth/v1/user` transport. Stage 7 database tests confirm no protected facts/unanswered occurrence.

The full existing suite passes, retaining PrimeTime/Saturday counts, league format separation, Rally qualification, Saturday mixed-only, website, password help, navigation and cross-league controls. No retrieval/selection/generation code or corpus was changed.

## 14. Validation

- `npm test`: **638 passed, 0 failed**.
- `npm run lint`: passed, six existing warnings, zero errors.
- `npx tsc --noEmit --incremental false`: passed.
- `npm run verify:ai-pdf-server-bundle`: passed.
- Normal `npm run build`: compiled successfully; stopped at known EPERM writing `.next/cache/.tsbuildinfo`. Standalone types passed; this is not a compilation failure.
- Isolated clean production build: **passed**, exit 0, all routes generated.
- `git diff --check`: passed (line-ending notices only).

Logs: `lms-0723-session-tests.log`, `-focused.log`, `-lint.log`, `-types.log`, `-pdf.log`, `-build.log`, `-isolated-build.log`, `-diff.log`, `-auth-probe.log` in this docs directory. Synthetic timing results are not production latency benchmarks.

## 15. Exact corrective migration and changed files

Migration: `lwrpc-admin/supabase/migrations/20260907131012_lms0723_server_session_validation.sql`, created with the Supabase CLI and populated verbatim from the approved SQL appendix (apart from its identifying comment). Tested against the original migration and on correction replay. Not applied to production.

Application files changed:

- `app/lib/serverSupabase.js`
- `app/lib/liveLmsService.js`
- `app/lib/liveLmsReceipts.js`
- `app/api/ask-lwr/route.js`
- `app/api/ask-lwr/feedback/route.js`
- `app/api/ai-assistant/answer/route.js`
- `app/api/ai-assistant/live-review/route.js`

Tests: `test/liveLms.test.mjs`, `test/liveLmsDatabase.test.mjs`, new `test/liveLmsAuthentication.test.mjs`. New explicit opt-in read-only probe: `scripts/lms0723-auth-readonly-probe.mjs` (not part of npm test). Documentation: this report, session design, architecture, implementation, acceptance and roadmap status links. Historical applied SQL and version files unchanged.

## 16. Exact future production continuation

1. Stop for owner review now, including revocation/lifetime evidence limitations.
2. After separate approval, read-only preflight correct project, original recorder, function/role dependencies, ACL/RLS and unchanged production baseline. Review effective revoke permissions; no CASCADE or auth ownership workaround.
3. Apply only this corrective migration once in a controlled signature-transition window. Do not reapply original LMS-0723 SQL. Verify old overload/helper/reader absence, new grants, browser Data API denial, historical audits and unchanged existing table/RLS permissions.
4. Only after database/security gates pass, deploy the reviewed LMS-0723 / 0.1.545 commit through the normal pipeline. Verify alias/commit. Old deployed live calls fail safely between signature replacement and deployment; coordinate the window.
5. First production test: **What is my Season DUPR?** Require fresh auth, SELF_RATING, bounded current authorization, truthful value/missing/season clarification, LIVE LMS DATA, sanitized telemetry, zero model/embedding. A technical_error fails: stop.
6. Resume remaining previously approved live/feedback/audit/manager/document/integrity gates. Do not repeat unrelated passed gates unnecessarily; do not change corpus or manufacture fixtures.
7. Report pass/fail/deferred gates before declaring production acceptance. No next phase/version.

## 17. Remaining limitations

The end-to-end hosted revocation experiment and private lifetime configuration review above remain explicit acceptance-review items. Corrected HTTP production RPC/UI checks and successful production capture latency are pending deployment authorization. Seasonal zero roster memberships/Captain pairs/matches remain owner-accepted limitations; real relationship tests wait for legitimate rosters near late September and real matches. No production data was manufactured. No corrective migration, deployment, rollback, real-session mutation, model/embedding call or version change occurred in this pass.
