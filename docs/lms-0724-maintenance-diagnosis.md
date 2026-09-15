# LMS-0724 / 0.1.546 — View-As maintenance diagnosis

**Historical diagnosis superseded by the explicitly approved September 8 correction:** job 3 now invokes the exact existing function every minute; two natural executions succeeded and credentials were erased with metadata/history preserved. [Applied SQL and evidence](lms-0724-maintenance-correction.md). The diagnosis below records the earlier state; do not replay its schedule SQL. Overall LMS-0724 acceptance remains pending other gates.

Status: **DIAGNOSIS ONLY; production correction NOT applied. LMS-0724 remains NOT production accepted.** Observations September 7, 2026, approximately 10:03–10:05 PM America/New_York (September 8, 02:03–02:05Z). All production calls were read-only catalog/configuration/aggregate inspections. No cleanup function was invoked. No context, schedule, privilege, environment, deployment or approved migration was changed. This file contains proposed SQL for review, not an executable migration.

## 1. Executive finding

The maintenance function is installed correctly, but **its periodic invocation was never supplied by the repository and no corresponding production schedule exists**. This is an omitted production scheduling/configuration step, not a missing authorization migration, disabled job, demonstrated function failure or normal wait for an upcoming scheduled run.

Production contains three View-As contexts. Two are explicitly ended with credentials cleared. One expired at **2026-09-08 01:50:02Z / September 7 at 9:50:02 PM Eastern** and remains unended with encrypted credential material awaiting cleanup. Expiry denies access independently of erasure; no disclosure was observed. Acceptance must remain blocked until scheduled cleanup is established and verified.

## 2. Intended maintenance architecture

The original migration creates `public.lms_view_as_maintenance()`. It is SECURITY DEFINER, owned by postgres, with an empty search_path and fully qualified application relations. Only postgres and service_role have EXECUTE. PUBLIC, anon, authenticated and the View-As executor have no effective EXECUTE. Private tables remain inaccessible directly to browser/service roles.

The function selects up to **1,000** unended contexts per run that meet either condition:

- `expires_at <= clock_timestamp()`; or
- handoff was never exchanged (`started_at IS NULL`) and its `exchange_by` deadline has passed.

It orders by expiry and uses `FOR UPDATE SKIP LOCKED`, so a busy context is skipped for a later sweep. It calls `view_as_private.end_context(id, 'expiration')` for each selected row. In the same transaction that helper sets `ended_at` to the observed cleanup time, sets the reason, and clears **credential, code and context** to SQL NULL. It appends VIEW_AS_ENDED for a started context; an unexchanged handoff has no started lifecycle requiring this end event. Already-ended rows are not re-ended, preventing repeated end events.

The context row initially remains, including its actor/target references, original expires_at, timestamps, browser/session binding fields and audit identity. Do not describe this as deleting every digest or the whole row. Runtime reference retention supports audit correlation. These fields remain private.

Retention then deletes attempt-budget records older than 1 day, diagnostic outcomes older than 30 days and audit events older than 90 days. Context rows are deleted only when ended_at is older than 90 days and no retained diagnostic/audit FK references remain. The 1,000-row cap applies to termination, not all retention DELETE statements. Current volume is three contexts; no performance defect is established, but duration/backlog should be monitored as volume grows.

Expiry is the earlier of 30 minutes from start and the verified real actor access token expiry. Handoff exchange has a 60-second deadline. No refresh token or target Auth session is stored. The actor credential is AES-256-GCM encrypted and bound to the context ID. Cleanup erases stored ciphertext; it does not mutate Supabase Auth or revoke/refresh the real administrator session.

The dispatcher can also terminate an expired context when a later authenticated/context-bound request reaches its expiry check. Explicit Exit and authorization invalidation likewise sanitize it. These request-dependent paths are supplemental: an abandoned tab may make no further request.

## 3. Repository evidence and introduction

Paths below are relative to `C:/lwrpc-league-system`:

| Evidence | Location |
|---|---|
| Context schema, 60-second handoff and 30-minute maximum | `lwrpc-admin/supabase/migrations/20260907201448_lms0724_view_as.sql:5` |
| Atomic sanitization and end audit | Same migration, `:47` (`view_as_private.end_context`) |
| Cleanup/retention function | Same migration, `:401` (`public.lms_view_as_maintenance`) |
| Explicit maintenance EXECUTE ACL | Same migration, `:413` |
| Current dispatcher request-time expiry cleanup | `lwrpc-admin/supabase/migrations/20260908011413_lms0724_view_as_authorization_locks.sql:290` |
| Token-bounded expiry at creation | `lwrpc-admin/app/lib/viewAsServer.js:18` |
| Browser purge and expiry timer | `lwrpc-admin/app/view-as/page.js:9`, `:37` |
| Protected periodic execution required by deployment checklist | `docs/lms-0724-implementation-report.md:99` |
| Sweep even after browser closes | `docs/lms-0724-view-as-user-design.md:81` |
| Local function test | `lwrpc-admin/test/viewAsDatabase.test.mjs:50`–`:61` |

Git first records the original migration and deployment checklist in commit **f9c94b948739e34be071b6af6ffbef52eebccfdc**, September 7, 2026 at 20:47:38 -0400, “LMS-0724 isolated read-only View As User”. This is repository introduction evidence, not an inferred production activation time.

Production history separately records original migration name `lms0724_view_as` at `20260908004527` and authorization correction `lms0724_view_as_authorization_locks` at `20260908014218`, once each. The correction does not add/replace maintenance scheduling. Its SHA-256 still equals **BD542EFFFC01A3897BDB95D454B7CCB9D80CF8F867C324D9EBBD8B3628A2D8E0**.

No cron.schedule call, Vercel crons configuration, Edge Function, application maintenance endpoint or workflow invoking this function was found in repository searches. No tracked vercel.json or GitHub workflow was found. The deployed commit's implementation checklist explicitly says to configure protected periodic execution, but specifies neither a concrete provider nor cadence. Thus an every-minute cadence below is a recommendation, not a previously implemented setting.

The early architecture document includes preliminary retention/digest language and an earlier no-token design. For this diagnosis, the approved dedicated-origin implementation and exact deployed SQL govern actual behavior; do not interpret the older proposed 24-hour window as an installed timer. Nothing in the deployed cleanup function waits 24 hours before erasing ciphertext once maintenance runs.

## 4. Production read-only findings

Project: `glikrmmgirilnmamxxyl`, database postgres, the previously verified LWRPC production project.

| Check | Observed state |
|---|---|
| pg_cron extension | 1.6.4 |
| Scheduler enabled | cron.launch_active_jobs=on |
| Run logging | cron.log_run=on |
| Scheduler database | postgres |
| Existing scheduled jobs | Two: player-match reminders every 15 minutes; match-setup reminders at 12:00 daily cron expression. Both active, running as postgres. Unrelated command payloads were not printed. |
| Matching View-As cleanup job | **None**, including disabled jobs |
| Expected command | No job invoking `lms_view_as_maintenance` or `view_as_private` |
| Existing execution history | 8,269 retained rows, June 14 through September 8 at 02:00Z |
| Matching maintenance execution history | **0**, latest execution NULL |
| Maintenance function installed | Yes; definition matches the original cleanup implementation |
| Manual-call history | Cannot establish: track_functions=none and no function statistics. Absence of cron history does not prove nobody ever called the function manually. |
| Supabase Edge Functions | Empty list |
| Vercel deployment | Unchanged READY deployment dpl_FF21fdcEUy5TBzYvK4xanXMNTrxR, source commit f9c94b9 |
| Expired/unended contexts | **1** |
| Expired contexts retaining ciphertext | **1** |
| Unexchanged handoffs due | 0 |
| Ended contexts retaining ciphertext | 0 |
| Expiration end audit | 0 |

The Vercel connector project/deployment responses do not expose a cron-job inventory; do not claim a complete Vercel scheduler audit from those responses. No deployed-repository endpoint/configuration exists to invoke maintenance through Vercel. Unknown out-of-band external automation cannot be categorically excluded, but none is evidenced and it has not cleaned the due context. The intended database cleanup dependency is plainly unfulfilled.

No ciphertext, selector, binding value, Auth ID or unrelated member data was selected for this diagnosis. Context inspections returned counts and timestamps only.

## 5. Root cause and coverage gap

The deployment checklist required scheduling as a separate operational step. The exact original migration installed the function and permissions but did not create a job; the authorization correction correctly remained unrelated to scheduling. The production setup omitted that separate step.

The first acceptance context reached its actor-token deadline. `ViewAsPage` called local `purge()`, removed the sessionStorage selector and stopped subsequent context refresh requests because the handle was null. It did not invoke server cleanup. The privileged maintenance sweep is what must handle this case, and no sweep was scheduled. The row therefore remains awaiting cleanup. The access deadline has not been extended.

The existing local test explicitly calls maintenance, but only after request-time expiry/invalidation has already ended the tested contexts. It does not prove scheduler installation, unattended-expiry termination or retention boundaries. This helped allow an installed callable function to be mistaken for complete operational maintenance. There is no demonstrated cleanup-function defect from the current read-only evidence; unattended and retention cases should receive isolated coverage before approving the schedule.

## 6. Security impact and acceptance

This is a credential-erasure, lifecycle-audit and retention gap. Expired access remains denied, and private-table/EXECUTE restrictions remain intact. It is not evidence of cross-player disclosure, privilege escalation, valid expired sessions or target Auth modification. Nevertheless, encrypted actor material and private records can persist beyond intended cleanup timing indefinitely without a sweep, and expiration audit is missing until termination runs.

**LMS-0724 cannot currently be production accepted.** Do not weaken the expiry check, extend credential lifetimes or expose a browser cleanup route to resolve this.

## 7. Smallest proposed correction — NOT APPLIED

Use the already-enabled database pg_cron facility to invoke the existing reviewed function **every minute**, as the existing protected postgres scheduler identity. No new role, grant, RLS policy, secret, HTTP endpoint, Edge Function or application redeployment is required. No owner authentication token goes into the job command. This restores the intended sweep, with normal cleanup lag approximately one cadence plus execution/queue/lock delay; it is not a hard real-time guarantee.

After separate approval, record this setup in a new additive scheduling migration or the established controlled SQL configuration record. Do not edit/reapply either SHA-approved migration. Generate any future migration filename using the established CLI process; no new executable migration file was created during diagnosis.

Proposed guarded SQL for review only:

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

Before executing, independently confirm exact production project, migration/function hashes, owner/ACL, scheduler identity and absence of collisions. The name guard intentionally stops replay or a conflicting setup instead of silently overwriting a named job. Use one controlled operator; this is not a general concurrent provisioning API. Supabase documents that scheduling the same name replaces a job, hence the explicit guard. [Official Supabase Cron documentation](https://supabase.com/docs/guides/cron/quickstart).

Let the first scheduled tick perform the existing cleanup; a separate manual cleanup call is unnecessary. The first run may also delete already-age-eligible private attempts/telemetry/audit under the existing retention function, so approval must cover those bounded existing effects. No SQL in this report was executed.

## 8. Exact validation plan after approval

1. **Isolated first:** apply existing migrations to production-like PostgreSQL/RLS defaults. Create only synthetic local cases for expired started context, expired unexchanged handoff, valid context, already-ended context, locked context and 1,001 due contexts. Verify only eligible rows are sanitized, one end event per started context, no duplicate end on rerun, SKIP LOCKED and later-tick catch-up. Test audit failure rolls back erasure/termination together. Exercise 1/30/90-day retention boundaries and FK-preserved context rows; verify no operational/Auth change. Validate actual scheduling under postgres and name-collision stop behavior without grants.
2. **Read-only production preflight:** verify project, original/corrective migration recorded once, exact approved corrective hash unchanged, maintenance owner/SECDEF/search_path/ACL unchanged, cron enabled, schedule absent. Snapshot eligible counts, minimum dates, private audit counts and operational/schema/ACL fingerprints. Exclude secrets from output. Distinguish legitimate concurrent user activity.
3. **Only after explicit approval:** install exactly the reviewed schedule through the approved configuration/migration method; do not manually mutate context rows. Confirm exactly one job, active=true, every-minute cadence, postgres database/username and exact function command. Existing two jobs remain unchanged.
4. **Observe scheduled execution:** wait for its first completed tick, ordinarily within two minutes, inspect cron.job_run_details status/start/end/duration. Failure or no run beyond that observation window requires investigation before acceptance, not broader grants or retries with different SQL. No raw credential or member values in run output.
5. **Verify cleanup effects:** the previously due context has non-null ended_at and reason expiration; credential/code/context NULL; original expiry/actor/target audit correlation preserved. One VIEW_AS_ENDED with expiration for that started context. Its row remains retained. Valid contexts are untouched. Due backlog reaches zero unless a documented lock/new expiry explains it. Confirm subsequent tick succeeds without a duplicate end event.
6. **Verify retention safely:** compare real age-eligible private rows to preflight and verify unaffected newer rows. If no real 30/90-day data exists, state production retention boundaries are not directly exercised and retain isolated evidence. Do not manufacture aged production data. No member/team/roster/match/Auth, identity-link, corpus, Stage 7 or Approved Answer modification.
7. **Security/health:** confirm browser and executor maintenance denial, no new grants/policies, seven removed UPDATE privileges remain absent, unchanged job command and hash. Track latest successful run, duration and count/oldest age of overdue contexts via privileged aggregate inspection; follow up on failures or persistent backlog. Any separate monitoring automation requires its own authorized setup.
8. Update acceptance evidence and only then resume outstanding non-maintenance gates. No next version.

## 9. Remaining LMS-0724 gates

- Maintenance scheduling, unattended erasure, expiration audit and repeat-run success are currently blocked pending approval.
- Independent normal-Player production verification remains outstanding; retain isolated authorization evidence.
- Detailed production timing breakdown remains unmeasured; prior recorded SELF processing is 173ms, not full browser round-trip or isolated helper timing.
- PDF visual rendering in a normal browser remains unverified due to the in-app Electron PDF renderer failure.
- Production mutation probes remain **PRODUCTION PROBE BLOCKED BY SAFETY CONTROL**, with no retry or bypass. Isolated evidence remains the approved substitute for those probes.
- Preserve passed SELF/privacy, document qualification/league scope, telemetry separation, feedback and focused UI gates. Remaining broader gates not explicitly passed stay pending.

## 10. Diagnostic changes and stop

Only local documentation is changed: this report, acceptance report and roadmap. No commit/push, production deployment or code/SQL implementation. The existing authorization migration hash is unchanged. **Stop for review and approval before scheduling or cleanup.**
