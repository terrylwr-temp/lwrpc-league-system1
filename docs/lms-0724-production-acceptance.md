# LMS-0724 production migration and acceptance

**FINAL STATUS — LMS-0724 / 0.1.546 — PRODUCTION ACCEPTED (September 8, 2026).** Remaining testable gates passed. Independent Player session unavailable; blank embedded PDF reproduces in a control without LMS security headers while the identical PDF renders top-level. Measured timings and unavailable subdivisions are explicit. Maintenance: 36 successes/0 failures at the final 11:17 UTC checkpoint; no active or unsanitized ended contexts. Integrity verified, with concurrent team/Captain registration accounted for. [Final acceptance report](lms-0724-final-production-acceptance.md). PRODUCTION PROBE BLOCKED BY SAFETY CONTROL retained. No next version or redeployment. Entries below are historical unless explicitly identified as future work.

**Latest continuation, September 8 at 11:04 UTC:** owner sign-in restored Commissioner access. A legitimate Player preview remained usable with credentials/metadata unchanged across a natural cron tick; explicit Exit then cleared all credential/code/context fields, retained actor/effective audit and left zero active contexts. Job 3: 23 successful executions, zero failures. Original Commissioner session preserved. Source region/qualified answer pass, but the in-app PDF remains visually blank. Independent normal-Player session, normal-browser PDF and detailed timing gates remain pending; **LMS-0724 is NOT PRODUCTION ACCEPTED**. [Continuation evidence](lms-0724-maintenance-correction.md). The login prerequisite mentioned below is resolved.

Current status: **LMS-0724 / 0.1.546 deployed; NOT production accepted. Maintenance correction PASS on September 8, 2026.** Exactly one approved every-minute job (ID 3) ran successfully at 10:42 and 10:43 UTC; expired credentials cleared, context metadata/history preserved, repeat execution safe. [Exact SQL and complete evidence](lms-0724-maintenance-correction.md). Browser continuation currently requires sign-in after inactivity logout; normal-Player, normal-browser PDF and detailed timing gates remain pending. LMS-0723 / 0.1.545 remains the last accepted baseline. Earlier stops below are historical; do not replay migrations or the schedule.

**Read-only maintenance diagnosis completed September 7, 2026 at approximately 10:05 PM Eastern:** pg_cron is enabled, but no View-As job exists and retained history has zero maintenance runs. One expired context still awaits ciphertext erasure. The original migration installed the function, while its deployment checklist left periodic scheduling as a separate step that was omitted. No cleanup-function defect is demonstrated. [Detailed diagnosis, proposed guarded schedule SQL and exact validation plan](lms-0724-maintenance-diagnosis.md). Proposal only: invoke the existing function every minute using database-local pg_cron; no schedule/cleanup/migration/deployment executed. Await approval.

Exact approved file: 20260907201448_lms0724_view_as.sql. SHA-256: 58C333EA3C9684A60475B3E285BA160A3717DA3AFFCAE4888A31E0F2C539F1E0. Applied unchanged once using Supabase apply_migration to glikrmmgirilnmamxxyl following direct user authorization. The service recorded migration name lms0724_view_as with generated history version **20260908004527**; the approved source filename remains unchanged. Do not reapply the source because its local filename timestamp differs from the service-recorded timestamp.

Post-application read-only verification:

- Exactly one LMS-0724 migration record; four private RLS-enabled tables, six indexes and the reviewed constraints/two context FKs. Eight internal FK triggers; zero custom user triggers.
- Dispatcher exact body MD5 b4d2b0a12d404aa15272146fa06d63dc equals the approved source literal. Executor owner, SECURITY DEFINER, fixed empty search_path and exact service_role EXECUTE verified.
- Executor NOLOGIN/NOINHERIT, no superuser/BYPASSRLS. Only migration operator postgres has recorded executor membership; no runtime/browser member. Multiple grantor entries express non-inherited ownership-administration and explicit SET capability, not extra runtime principals.
- PUBLIC/browser function access absent; anon/authenticated denied dispatcher and maintenance EXECUTE. service_role has EXECUTE but no direct access to any private table. Executor has no broad operational table SELECT; exact approved column grants include teams.home_location_id, never teams.location_id.
- Twelve executor-only public SELECT policies and four private policies. Original policy/function fingerprints unchanged after excluding explicitly added View-As objects.
- Members, teams, rosters, matches, Auth users, identity-link rows, documents, versions, chunks and Approved Answer revision fingerprints exactly unchanged across application. No context, audit or diagnostic row created by migration.
- Production replay was not executed. Exact dispatcher/catalog state is compared to the reviewed artifact whose non-superuser clean/replay/partial/drift tests passed locally.

DNS/HTTPS and the two exact origin variables plus sensitive encryption key were configured previously. HMAC unchanged. No target session created.

## Production continuation — 2026-09-07 Eastern

Normal Git production pipeline deployed commit `f9c94b948739e34be071b6af6ffbef52eebccfdc`, deployment `dpl_FF21fdcEUy5TBzYvK4xanXMNTrxR`, READY with both approved hostnames. Live footer displays LMS-0724. No version or application change was made during acceptance.

Passed observations before stop:

- Commissioner Member Detail has View As User; dashboard, directory and observed navigation have no additional entry. First selected member had no linked role: preflight denied, zero contexts/audits. A legitimate active Player with a role link was then used; no Auth account or roster was fabricated.
- Confirmation identifies target and explains separate read-only tab and writable original tab. Cancel leaves zero contexts/audits. Keyboard-triggered start opens confirmation. After Cancel, focus was observed on BODY rather than the start button; retain as an accessibility follow-up, not a passed focus-restoration gate.
- Confirm opens the exact isolated origin. Banner correctly distinguishes Commissioner actor from Player target. Target has no linked Auth account and the UI truthfully explains permission preview. Snapshot shows zero authorized teams and no manager tools.
- HTTPS headers: nonce CSP, self-only connect, frame-ancestors none, X-Frame-Options DENY, no-referrer, no-store, no Access-Control-Allow-Origin. These observations do not substitute for the outstanding credential/replay/write-denial gates.

## Blocking result and read-only diagnosis

Question: `What is my Season DUPR?`

Actual: `I can't access that player information for your account.`

Expected: target-effective season clarification or rating/missing-data response. The active Player role link exists; absence of a target Auth account is supported by the approved permission-preview design and must not cause this denial.

Production audit records `READ_DENIED`, capability `SELF_RATING`, reason `denied`. One private diagnostic records `LIVE_LMS_DATA`, `protected`, `view_as`, total_ms 161. Intent/result_code columns remain null in the current diagnostic insertion; the audit supplies the capability/reason. The live branch invokes no answer model or embedding and normal outcomes/feedback counts remained 213/20.

The first identity query in `view_as_private.lookup` uses `FOR SHARE OF u,m`. The executor has SELECT policies on public.user_roles and public.members but no applicable UPDATE policies. Read-only production `EXPLAIN (VERBOSE, FORMAT JSON)` under `SET LOCAL ROLE lms_view_as_executor` for that identity-lock query produces a LockRows plan with `One-Time Filter: false`. This establishes the production row-lock/RLS boundary failure: the lookup cannot obtain its valid target identity, then returns denied. Ordinary preflight/snapshot SELECT can succeed while this locking SELECT fails. No live lookup was invoked manually and EXPLAIN was not ANALYZE.

Do not blindly add UPDATE policies: the executor already has limited key-column UPDATE privileges to support locking, and adding permissive UPDATE policies can change effective mutation capabilities. A bounded correction must preserve concurrency and database-enforced write protection together, with production-like RLS success and negative-write tests. Existing isolated fixture normally leaves operational-table RLS disabled; its separate enabled-RLS audit-failure test does not assert successful SELF lookup. That coverage gap needs review before correction.

Acceptance stopped immediately upon this failure. No code, SQL, grants, policies, corpus or environment correction followed. Remaining document AI, cross-league/Rally regression, privacy, replay, mutation-denial, mobile and broader acceptance gates are pending, not passed.

## Cleanup and integrity

Exit completed through the approved UI. Exactly one context is ended with explicit_exit; credential, code and context fields are null. VIEW_AS_STARTED / READ_DENIED / VIEW_AS_ENDED identify separate real actor and effective member. Original administrator tab remains on Member Detail with Edit Member available; the temporary returned tab was closed. No target Auth link was created.

Members, empty rosters/matches, document/version/chunk fingerprints, Approved Answer revisions, and unrelated function/policy fingerprints match the pre-migration baseline. Migration remains recorded once. Teams increased 88 to 90 and user_roles 150 to 153 during concurrent registration: recent captain-role changes link to recently created/updated teams. Auth updates coincide with real sign-in timestamps (including the owner's requested login). These are concurrent operational changes, not an unchanged-table claim; the acceptance run performed no team/role/Auth mutation. No roster/match relationships were manufactured.

Automatic approval review blocked the prepared empty-body unauthenticated POST denial probes before execution, interpreting them as unapproved production mutations despite approval sections 12/20/21. No probes ran, no workaround was used, and no retry occurred after the functional stop. These gates remain pending under the existing explicit test authorization.

Local documentation only was updated after stop; no additional deployment. Retain LMS-0724 / 0.1.546 as deployed but NOT accepted pending reviewed correction.

## Locally validated correction awaiting explicit production approval

The bounded RLS/locking correction has passed local validation. See [correction report](lms-0724-live-lock-correction.md) for exact migration/hash and continuation. The historical production denial and ended context remain unchanged. No corrective migration or new deployment occurred in this pass. Production probes remain PRODUCTION PROBE BLOCKED BY SAFETY CONTROL.

## Explicitly approved corrective production continuation — September 7, 2026 Eastern

### 1. Exact migration and application

Owner explicitly approved `20260908011413_lms0724_view_as_authorization_locks.sql`, SHA-256 `BD542EFFFC01A3897BDB95D454B7CCB9D80CF8F867C324D9EBBD8B3628A2D8E0`. Filename and hash were verified immediately before application. Production project `glikrmmgirilnmamxxyl` was confirmed as LWR PC League Management. The original migration was recorded once, the correction absent, and stopped function/security state matched before mutation.

Applied the exact SQL successfully through Supabase apply_migration. The correction is recorded once as name `lms0724_view_as_authorization_locks`, history version `20260908014218`. Original remains once as `lms0724_view_as`, history version `20260908004527`. Generated history timestamps differ from source filenames; this is not a reason to reapply. No application redeployment was needed: existing deployment `dpl_FF21fdcEUy5TBzYvK4xanXMNTrxR`, commit `f9c94b948739e34be071b6af6ffbef52eebccfdc`, is compatible. No version change.

### 2. Resulting helper security and privileges

- New `view_as_private.lock_authorization(jsonb,text,uuid,uuid,uuid)` is owned by postgres, SECURITY DEFINER, fixed empty search_path. Body MD5 `c19defb7b0f82ddd659dc38061ab4ef7`. Only owner/executor may execute; PUBLIC, anon, authenticated and direct service_role execution are absent.
- Dispatcher remains owned by lms_view_as_executor, SECURITY DEFINER, empty search_path; body MD5 `77ef613cac6db4df5e6849a686be0c26`. Private lookup remains SECURITY INVOKER, owned by postgres, empty search_path; body MD5 `47f7e2646aeeef5b25a842041412766b`.
- Executor is NOLOGIN/NOINHERIT, no superuser/BYPASSRLS, no public-schema CREATE. All seven operational key-column/table UPDATE checks are false, both immediately after application and after browser use. No broader SELECT grants or new policies were added.
- All-policy fingerprint `3b484a8d9faaa762a2b196e7be2c4aff`, table ACL fingerprint `9e7e4cc7898b6aa98fdad9bb2c9f779e`, unrelated column ACL fingerprint `79095cd5271956803d76fc0623201616` remained identical. Private RLS remains enabled. Unrelated functions/policies remain unchanged.

### 3. First resumed SELF and immediate cross-player gates — PASS

Created a legitimate Player preview through the original Commissioner's Member Detail confirmation. The target has a valid Player role and no linked Auth account; the supported permission-preview notice was visible. No target Auth/roster data was manufactured.

`What is my Season DUPR?` returned authorized season choices. Selecting `1` returned the truthful missing-value response for 2026 Fall Season, rather than access denied. The target's missing rating was consistent with the authorized member-detail data. The next substantive request asked for another player's email and returned `I can't access that player information for your account.` No email was disclosed. Both paths displayed LIVE LMS DATA. The Commissioner's permissions did not broaden the effective Player response.

### 4. Normal Player / LMS-0723 / Club Pro regression

Ordinary non-View-As Live functions, routes and identity-link rows were not changed. Retain the completed 671-test suite and isolated normal Player SELF, protected cross-player, explicit-person/no-self-fallback, direct RPC and getUser authentication controls. No independent normal Player production session was available in this run; do not describe that test as newly production-executed. Live model/embedding calls remain zero by the unchanged deterministic branch, corroborated by private LIVE_LMS_DATA diagnostics; no provider-call tracing was added.

Club Pro remains scoped using `teams.home_location_id`, with no `teams.location_id` reference or new permission. Retain isolated home-location and unrelated-contact denial evidence. Production roster and match dependent tests remain unavailable; no relationships were fabricated.

### 5. Dedicated origin, context and UI

Real actor/effective Player banner, disabled feedback, no nesting/manager tools and original writable administrator tab were preserved. Refresh restored the target dashboard with focus on its heading. Direct navigation to `/ai-assistant/review` on the isolated origin rendered only the target preview, not the manager page. At 390px, no horizontal overflow was observed and Exit was fully inside the viewport with a 44px touch target. Keyboard Exit succeeded, cleared credential/context/code fields and appended VIEW_AS_ENDED. Retain prior isolated expired/wrong-actor/tampered/replay and write-guard evidence. Prior Cancel focus-restoration observation remains an accessibility follow-up.

The first new context expired at 2026-09-08 01:50:02Z, earlier than 30 minutes because the initiating actor access credential expired then. This is the documented minimum of actor-token expiry and 30 minutes, not a source-viewer authorization defect. The UI purged the preview. A fresh authorized context was used for remaining document checks, then explicitly exited at 01:54:41Z. Original administrator tab/session was retained.

### 6. Ask LWR / LMS-0722 representative regressions

- Picklebreaker Rally Scoring answer was grounded and included the game-winning point serving requirement and scoring freeze. It preserved league-dependent target/win-by qualifications. Sources included the current Rules pages 15/16.
- `What is the PrimeTime match format?` returned Round Robin, 2 out of 3 games to 11 win by 2, potential Picklebreaker to 15 win by 2 using Rally Scoring; citation Rule 6.3.3, Match Format, page 12. No Saturday proposition/identity appeared. Cross-League Leakage = 0 in this representative explicitly scoped check; this is not a rerun of the full historical benchmark.
- Official Source action opened the correct titled region and PDF iframe. Visual PDF verification is incomplete: the in-app Electron renderer logged `sandboxed_renderer.bundle.js script failed to run` and a null-iterable error, and the PDF frame was blank. No application CSP violation was observed in the returned log sample. Do not label complete PDF rendering passed; normal-browser confirmation remains required.

### 7. Telemetry, feedback, audit and performance

Five private diagnostics were recorded separately with interaction_mode=view_as: three LIVE_LMS_DATA and two document. Normal outcomes remained 213 and feedback events 20, unchanged from preflight. Feedback controls are absent/disabled and no feedback receipt is emitted by the route. Diagnostic schema stores family/kind/timing/mode, not questions, answers, rating/contact facts or context credentials. `intent` and `result_code` remain null under the current insertion and are not claimed populated.

VIEW_AS_STARTED records Commissioner/Player classification and distinct actor/target references. Cross-player READ_DENIED records PLAYER_CONTACT and denied. VIEW_AS_ENDED records explicit_exit and the same actor/target distinction. READ_DENIED/ENDED role columns are null; lifecycle start supplies their role classification. No protected values were stored in these audits.

Recorded server diagnostic intervals: SELF clarification 139ms; resolved missing rating 173ms; cross-player denial 162ms; Rally document answer 5242ms; PrimeTime document answer 2736ms. These intervals cover the ask branch and post-answer revalidation, exclude initial context validation and diagnostic insert, and are not full browser round trips. The route emits initial validation in Server-Timing, but this browser tool did not expose response headers. Helper, lookup and formatting are not separately instrumented. Their individual production durations remain unmeasured; do not invent zero or attribute the aggregate to just the helper. Live paths have no model/embedding latency.

### 8. Final integrity

Member, team, roster, match, identity-link, document, version, chunk, Approved Answer revision and unrelated function/policy fingerprints match the immediate corrective baseline. No application/corpus/HMAC/environment changes occurred. Target still has zero Auth links. Auth-wide hashes changed: one unrelated update preceded corrective application; a later update belonged to the real actor during ordinary session activity. No Auth DML exists in the corrective migration or acceptance actions; do not claim all Auth rows were byte-identical. Normal concurrent registration/session activity remains permitted.

### 9. STOP: missing scheduled expiry/retention maintenance

Read-only production verification found **zero cron.job entries invoking lms_view_as_maintenance()**. No application scheduler invocation was found in the current repository. The protected maintenance function exists and is intended to erase expired credentials, append expiration audit and apply 30-day diagnostic / 90-day audit retention, but periodic production execution is not established by the observed setup.

The first expired context still has ended_at=null and retains its encrypted credential/context digest after expiry. Access is no longer valid; this is a cleanup/retention setup gap, not observed disclosure or target Auth mutation. The second context was explicitly exited and its credential/context/code are cleared. The expired ciphertext was not read or printed. No maintenance invocation, scheduler mutation or workaround was attempted after this finding, respecting the strict security stop condition.

Required next step for review: authorize/verify a protected periodic maintenance schedule and controlled cleanup using the existing reviewed function, then verify expiration audit, credential erasure and retention. Do not modify helper permissions or reapply migrations to address scheduling.

### 10. Status and limitations

**LMS-0724 / 0.1.546 — DEPLOYED, NOT PRODUCTION ACCEPTED.** Lock correction and SELF/privacy gates pass; missing maintenance scheduling blocks completion. Also outstanding: visual PDF rendering in a normal browser, independent normal Player production session where safely available, and detailed production timing breakdown. Previously blocked production mutation probes remain **PRODUCTION PROBE BLOCKED BY SAFETY CONTROL**, with approved isolated evidence retained. No retries/bypass. Original broader gates not completed before this stop remain pending; they are not inferred passed from the correction.

No new deployment, application edits, SQL edits, version increment or next-version work. Local documentation updated after stopping. The deferred Live clarification/routing UX remains future work.
