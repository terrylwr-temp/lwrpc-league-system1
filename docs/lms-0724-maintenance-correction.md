# LMS-0724 / 0.1.546 — approved maintenance schedule correction

**FINAL STATUS — LMS-0724 / 0.1.546 — PRODUCTION ACCEPTED (September 8, 2026).** Remaining testable gates passed. Independent Player session unavailable; blank embedded PDF reproduces in a control without LMS security headers while the identical PDF renders top-level. Measured timings and unavailable subdivisions are explicit. Maintenance: 36 successes/0 failures at the final 11:17 UTC checkpoint; no active or unsanitized ended contexts. Integrity verified, with concurrent team/Captain registration accounted for. [Final acceptance report](lms-0724-final-production-acceptance.md). PRODUCTION PROBE BLOCKED BY SAFETY CONTROL retained. No next version or redeployment. Entries below are historical unless explicitly identified as future work.

## Signed-in continuation — September 8, 2026, 11:01–11:04 UTC

Owner signed in; the prior inactivity-login blocker is resolved. The session is Commissioner, not an independent normal Player. Used the same approved Player target through Members → Member Detail → confirmation. New legitimate context created 11:01:16.531614Z, expiry 11:31:16.499Z. Its credentials remained present, ended_at remained NULL and metadata hash `18053b89e35faed5bd210c906b916a37` remained identical across the successful 11:02 scheduled tick. The preview remained usable. This supplements the isolated tests with actual production active-context protection.

Matches showed no authorized published matches; Standings showed the correctly scoped empty table. No manager tools or business mutations were exposed. PrimeTime match-format answer remained league-scoped, with Rule 6.3.3 / page 12 official source. Protected source action opened the expected source region, but the in-app PDF viewport was visually blank again (`about:blank` accessibility subtree). A normal-browser PDF check remains required; only the in-app browser is connected. One separated document diagnostic recorded 4,879 ms; that is the existing branch interval, not a full round trip or component timing breakdown.

Exited through the UI at 11:03:44.980904Z: reason explicit_exit; credential/code/context all NULL; STARTED and ENDED events retain distinct actor/effective member references; no target Auth link was created; zero active contexts remain. Original Commissioner session still shows Edit Member and View As User. Temporary exited tab closed. By 11:04:00.043035Z, job 3 had **23 successful runs, zero failures**.

**Status remains NOT PRODUCTION ACCEPTED.** Sign-in is no longer a blocker. Remaining prerequisites are an independent legitimate normal-Player session, PDF visual verification in a connected normal browser, and required detailed timing evidence (the current implementation does not separately instrument helper/lookup/formatting, and this continuation does not authorize application changes). Retain all previously passed gates and the PRODUCTION PROBE BLOCKED BY SAFETY CONTROL limitation. No application/SQL/grant/RLS/deployment/version changes in this continuation.

September 8, 2026. **Maintenance correction PASS; LMS-0724 remains DEPLOYED, NOT PRODUCTION ACCEPTED.** LMS-0723 / 0.1.545 remains the last production-accepted baseline. No next version started.

## Authorization and exact function

The owner's explicit maintenance-schedule approval authorized exactly one reviewed pg_cron job. Applied through Supabase execute_sql to the previously verified production project `glikrmmgirilnmamxxyl`, as postgres in database postgres. No manual cleanup call occurred in production.

Verified `public.lms_view_as_maintenance()` (zero arguments, returns void), owner postgres, PL/pgSQL SECURITY DEFINER, fixed empty search_path. ACL exactly `{postgres=X/postgres,service_role=X/postgres}`. Effective EXECUTE false for anon, authenticated and lms_view_as_executor; PUBLIC absent. Body MD5 `b33c163b8a739d361f939aa5704bb5cf` matches the original reviewed local migration after newline normalization.

Its exact helper is `view_as_private.end_context(uuid,text)`, owner postgres, SECURITY INVOKER, empty search_path, ACL `{postgres=X/postgres,lms_view_as_executor=X/postgres}`. Body MD5 `08495e8b5de5305aebbf070622bb00b9` also matches the reviewed migration. No ownership, grants, functions or RLS changes.

Original migration `lms0724_view_as` and correction `lms0724_view_as_authorization_locks` each remain recorded once (20260908004527 / 20260908014218). Local correction SHA-256 remains `BD542EFFFC01A3897BDB95D454B7CCB9D80CF8F867C324D9EBBD8B3628A2D8E0`.

## Exact applied SQL — controlled configuration record, do not replay

The following is identical to the reviewed diagnosis SQL. Submitted once, succeeded, then independently verified. This is a configuration evidence record, not a migration to reapply.

```sql
BEGIN;
DO $schedule$
BEGIN
  IF current_database() <> 'postgres' OR current_user <> 'postgres' THEN
    RAISE EXCEPTION 'Unexpected database or scheduling role';
  END IF;
  IF to_regprocedure('public.lms_view_as_maintenance()') IS NULL THEN
    RAISE EXCEPTION 'Reviewed maintenance function missing';
  END IF;
  IF EXISTS (
    SELECT 1 FROM cron.job
    WHERE jobname = 'lms0724-view-as-maintenance'
       OR command ILIKE '%lms_view_as_maintenance%'
  ) THEN
    RAISE EXCEPTION 'Existing maintenance schedule requires review';
  END IF;
  PERFORM cron.schedule(
    'lms0724-view-as-maintenance',
    '* * * * *',
    'SELECT public.lms_view_as_maintenance();'
  );
END
$schedule$;
COMMIT;
```

Job **3**, `lms0724-view-as-maintenance`, active=true, every minute (`* * * * *`), database/username postgres. Exact command `SELECT public.lms_view_as_maintenance();`, MD5 `761916a187669698fdbc101fe53ae678`. Preflight inspected all jobs, including disabled jobs; only two unrelated jobs existed, with no other View-As purpose. Postflight shows exactly three total, one View-As job. Jobs 1 and 2 retain names, schedules, active state, database, username and command hashes `70ac03d96ac51d41b587185e05aa0f8e` / `90cc35f9736a459e30fd56295c4d4338`.

Scheduler settings: launch_active_jobs=on, log_run=on, database_name=postgres. Job invokes only the protected function, contains no credentials and creates no browser execution path. Current [Supabase Cron documentation](https://supabase.com/docs/guides/cron/quickstart) confirms named-job overwrite behavior, which the reviewed guard prevents. Changelog fetch was unavailable (web markdown handling/local network restriction); current Cron documentation was accessible.

## Natural execution and cleanup evidence

| Run | Start UTC | End UTC | Duration | Result |
|---|---|---|---|---|
| 8304 | 2026-09-08 10:42:00.071176 | 10:42:00.102007 | 30.831 ms | succeeded, 1 row |
| 8305 | 2026-09-08 10:43:00.066236 | 10:43:00.073889 | 7.653 ms | succeeded, 1 row |

Both executions were natural scheduler ticks, not manual invocations. History records job/run identity, status, start/end and a non-sensitive `1 row` result. That message means the SELECT returned one row, not that one context was changed on each run.

The legitimate fixture expired at 2026-09-08 01:50:02Z and still held ciphertext immediately before scheduling. First tick set ended_at=10:42:00.075564Z, reason=expiration, credential/code/context=NULL. Original expires_at stayed unchanged. Full metadata fingerprint excluding those five mutable fields stayed `a7ca1a86240233331c476bb88e658eec`; this includes actor/target, original timestamps and private correlation/binding fields without printing them. Exactly one expiration VIEW_AS_ENDED was added. Audit count increased 7 to 8, context count stayed 3. Second tick left all context state and end-event count unchanged. No secret was selected, decrypted or disclosed.

Both explicitly exited contexts stayed ended/sanitized with original timestamps/reasons and metadata fingerprints `b9b33ee8762f2af38c31b024796150bf` and `d2c9e65f18c5cf8b179c2555217ce18c`.

## Active safety, retention and failure behavior

No valid active production contexts existed before/after these runs; therefore production active-row safety is vacuous, supported by the exact predicate and isolated test evidence. No extra production context was manufactured. The function selects only unended expired contexts or unexchanged handoffs past exchange_by, up to 1,000 per run, ordered by expiry with FOR UPDATE SKIP LOCKED. It never reactivates a context.

Credential retention is separate from history retention: eligible credentials are immediately nulled by each successful sweep; attempt budgets expire after 1 day, diagnostics after 30 days, audits after 90 days. Context deletion requires ended_at older than 90 days and no remaining audit/diagnostic reference. Six recent diagnostics were retained. No production rows were age-eligible at preflight, so actual 30/90-day production deletion boundaries were not exercised; isolated evidence covers them. Binding/correlation metadata intentionally remains private until context retention ends.

New isolated test `lwrpc-admin/test/viewAsMaintenance.test.mjs` uses synthetic PGlite PostgreSQL, applying both existing migrations. It verifies unattended started expiry, unexchanged expiry, byte-identical valid active row, explicit Exit preservation, retained metadata, single expiration audit, repeat idempotency, old/recent 1/30/90-day records, FK-preserved old contexts, eligible unreferenced context deletion, and atomic rollback when audit insertion fails. Focused maintenance/boundary/database/authorization-lock suites: **18 passed, 0 failed**. This is not a native pg_cron or concurrent SKIP LOCKED test; actual scheduling is evidenced by production ticks. No application code was changed; app lint/build were not rerun for this documentation/test-only correction.

If maintenance fails, its transaction rolls back termination/audit together; ciphertext may remain until a successful later scheduled run, but access expiry is independently enforced. Existing dispatcher denies ended contexts before returning credentials and denies expired contexts; the proof-bound lock helper independently requires unended/unexpired state. Maintenance cannot extend access or restore erased material through normal application paths. Existing isolated wrong-actor/tampered/replay, dedicated-origin and omitted-context write guards passed in the focused suites. Production expired-context replay was not reconstructed from private selectors. Previously passed production isolation/privacy gates remain retained evidence rather than newly repeated gates.

## Integrity

Before/after first-run fingerprints matched for public/private function definitions plus ACLs (`3b0cea8945a5ce434fee17dbec4b4063`), all policies (`1a63c008eebf086b9aa2998589239aee`), table ACLs (`d0b66fb3ae720e39847ee2358cca19b6`), column ACLs (`905a9bba51795669f6f2563e29075637`), members (`3d595ec6dd91734bfdb6bbcb5a346ad3`), teams (`67b53359b3f77196c751f1abbb8902dd`), user_roles (`cfcbb124c38a82566cffca75bb620716`), Auth users (`ef0735073261e1b6d407b1dd4553ad82`) and Auth sessions (`fa55c2d0705090c14c7a083c95961e93`). Hashes are opaque aggregate evidence, not exposed source values. Target Auth/session data was untouched in that measured interval. No deployment, endpoint, environment, version, application, grant or policy mutation was performed. No unrelated production mutation/probe was executed.

## Acceptance continuation and blockers

Maintenance gates pass. Attempted to resume browser acceptance after the second successful tick: only Codex's in-app browser is connected, with no pre-existing tabs. Production root redirects to login and explicitly reports sign-out after four hours of inactivity. Requested the owner sign in through the UI, never to send credentials. No legitimate normal-Player session is currently available. A normal browser is not connected for the outstanding PDF renderer check. Detailed production helper/lookup/formatting timing remains unmeasured; existing aggregate timings remain valid, not invented component timings.

Retain prior SELF/privacy, scoped document-answer, telemetry separation, feedback and focused UI passes. Remaining required browser/normal-Player/PDF/timing and broader uncompleted gates in `lms-0724-production-acceptance.md` stay pending; maintenance success alone is not acceptance.

**PRODUCTION PROBE BLOCKED BY SAFETY CONTROL** remains the mutation-denial limitation. No retry, bypass or unrelated mutation was attempted. The explicitly approved schedule succeeded without an approval rejection.

**Final current status: LMS-0724 / 0.1.546 — DEPLOYED, NOT PRODUCTION ACCEPTED; maintenance correction verified.** No next version or deferred Ask LWR/Live LMS quality work started.
