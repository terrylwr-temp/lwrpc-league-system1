# LMS-0724 / 0.1.546 — Dispatcher ownership replay correction

2026-09-07. **Local correction and validation complete; STOP before production.** No production migration, DNS/domain, Vercel origin, deployment, operational-data or Auth changes. LMS-0723 / 0.1.545 remains the accepted production baseline. This supersedes the replay blocker in the home-location correction report; historical failures remain recorded there.

## Exact root cause

Object: `public.lms_view_as(text,jsonb) RETURNS jsonb` (parameters p_op text, p_input jsonb). Intended final owner: `lms_view_as_executor`, NOLOGIN/NOINHERIT, no superuser/BYPASSRLS. Function remains PL/pgSQL SECURITY DEFINER, volatile, parallel unsafe, non-strict, fixed empty search_path.

The old replay statement was:

`CREATE OR REPLACE FUNCTION public.lms_view_as(p_op text,p_input jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS ...`

First application ran as the non-superuser migration operator (production postgres; isolated synthetic_migration_owner), which owned the newly created function and completed the reviewed final ownership transfer. Replay ran as that same operator, but the dispatcher was now owned by lms_view_as_executor. The existing migration-operator membership is INHERIT FALSE / SET TRUE, so ownership privileges were not inherited. CREATE OR REPLACE required ownership and failed before later grant/ownership statements. Superuser tests had masked that restriction.

## Bounded correction

The pending migration now prepares its existing approved helper/role/policy footprint before a dispatcher definition block. The block holds the exact reviewed body once as a literal, then checks the exact regprocedure identity.

- Absent: CREATE FUNCTION with that body; apply exact revokes/service_role EXECUTE; perform the original first-application transfer to the dedicated executor.
- Present: verify owner, exact body equality (stronger than a version-label-only check), language, argument names/defaults, return type, function kind, security mode, volatility, parallel mode, strict/leakproof/set-return flags, fixed configuration and ACLs. If matching, perform **no dispatcher DDL or ACL mutation**.
- Drift: raise `LMS-0724 dispatcher definition/owner/security drift: public.lms_view_as(text,jsonb)`; transaction rolls back. No ownership seizure, replacement, or silent skip.

No new role membership or privilege was added to solve replay. The already-reviewed first-application membership/ownership mechanics remain; no SET ROLE to the executor is used as a replay workaround. No superuser or inherited executor privilege is granted to the migration operator. The dispatcher remains owned by lms_view_as_executor after every successful run.

All signature-specific operations use `(text,jsonb)`. A separate integer overload was deliberately created in the isolated database and remained unchanged.

## Real PostgreSQL results

PostgreSQL 17.11, non-superuser migration operator with the relevant production-like CREATEROLE/BYPASSRLS, database CREATE, schema/table ownership and broad default table/sequence grants. Cluster-superuser access was used only to create the synthetic test environment and deliberately inject negative fixtures; the migration itself always ran under the non-superuser role.

| Control | Result |
| --- | --- |
| Clean application | PASS |
| Immediate replay | PASS; dispatcher definition/owner/ACL unchanged |
| Second replay | PASS; same final object/security snapshot |
| Partial retry: dispatcher correct, later maintenance function missing | PASS; missing maintenance function recreated, dispatcher untouched |
| Wrong dispatcher owner | Clear drift failure; no ownership seizure |
| Wrong dispatcher body | Clear drift failure; no overwrite |
| Wrong search_path | Clear drift failure |
| Added anon EXECUTE | Clear drift failure; no permission accumulation |
| Integer overload | Unchanged; still returns its original value |
| One-use handoff concurrent exchange | Exactly one winner, one denial |
| Concurrent admitted read / Exit | Serialized; subsequent read denied |

Snapshots compare all View-As function owners/bodies/ACLs/configuration, private relation ACLs, policy definitions, indexes, trigger count and context count across successful replays. No duplicate objects, contexts or triggers appeared. No View-As triggers are introduced by this migration. Existing approved policy/helper recreation remains transactional and reaches the same final state.

The migration is one transaction; a normal interrupted transaction rolls back. The explicit partial fixture additionally proves bounded recovery when the later maintenance object is missing despite an already-correct dispatcher. Unexpected dispatcher security state fails instead of attempting recovery.

## Final privilege and scope footprint

- Dispatcher: executor-owned SECURITY DEFINER, fixed empty search_path, exact server service_role EXECUTE, no PUBLIC/anon/authenticated EXECUTE. Replay checks for unexpected ACL recipients/grant options and required service-role EXECUTE.
- Private tables: RLS; no direct browser/service_role table access. Executor retains the previously reviewed bounded context writes and append-only audit/diagnostic/attempt operations. Maintenance remains separately protected.
- Existing operational tables: explicit approved column SELECT only, plus the same key-column UPDATE grants needed for row-share locking; no broad SELECT, no new runtime role inheritance or operational mutation path.
- home_location_id fix preserved. Independent production-catalog contract verifies all 54 approved read columns/types. Missing teams.location_id SELECT/GRANT fails. Legitimate matches.location_id is unchanged.
- Club Pro primary/secondary home-location and explicit-team positives pass; same league/division, wrong/absent location and real-actor privilege-bleed negatives pass. Dashboard scope does not broaden the narrower Live contact capability.
- Dedicated origin, server actor authentication, target-effective reads, one-use binding, 30-minute context, real-actor audit attribution, normal-session isolation and event-code route guards are unchanged.

## Automated validation

- `npm test`: **666 passed**, zero failures.
- `npm run lint`: zero errors, **six pre-existing warnings**.
- `npx tsc --noEmit --incremental false`: passed.
- `npm run verify:ai-pdf-server-bundle`: passed after compilation. An earlier attempt ran while build output was unavailable and was repeated after build; it was not counted as a pass.
- `npm run build`: compiled successfully (14.6s), then the known `.next/cache/.tsbuildinfo` EPERM prevented cache writing. Separate nonincremental type check passed; this was not a compilation failure.
- Isolated clean production build: passed, including Proxy.
- Final real PostgreSQL migration/security/replay/concurrency runner: passed with production-like broad defaults.
- Schema-contract, dedicated-origin omission/replay/event-code tests and Club Pro controls: included in passing tests above.
- `git diff --check`: passed.

## Local browser checks

Fresh local synthetic browser, normal localhost:3074 and isolated 127.0.0.1:3074; no production account, corpus or model access. Actual View-As components/routes and corrected migration exercised against the synthetic database.

- Member Detail-only mounting is enforced by regression. Local harness reuses the actual entry button. Keyboard initiation opens the confirmation dialog with focus on Cancel; cancel/reopen works. Preflight occurs before confirmation.
- Fresh handoff succeeds; heading receives focus, opener is severed, no sb-* normal Auth storage exists in isolated localStorage.
- Omitted-context POSTs to member delete, match lineups, team delete, Approved Answers, tournaments/action and round-robin/action all return 403. Browser fetch to the normal-origin test mutation is blocked by CSP. Automated receipt/marker/raw credential controls also pass.
- Target SELF Season DUPR returns the synthetic target's 3.72 value, not the manager's identity; deterministic Live path, feedback disabled.
- Refresh retains valid context and target dashboard. Keyboard focus reaches Exit and Enter returns to the normal Member Detail URL for the original selected target.
- 390px and 320px: no horizontal overflow; Exit is entirely inside viewport with 44px height. Navigation wraps cleanly, Ask composer and answers remain readable. Desktop and both mobile screenshots inspected.
- Screenshots: .local-validation/lms0724-replay-mobile390.png, lms0724-replay-mobile320.png, lms0724-replay-desktop.png (synthetic, ignored local artifacts).

The normal Member Detail return URL was verified; its full real-data page and real-host source viewer acceptance remain production gates. This local harness does not manufacture production membership or document data. Old browser contexts from a destroyed prior fixture database were discarded before fresh-session testing; those stale handles did not produce target data.

## Corrected migration and exact changes

Pending migration: `lwrpc-admin/supabase/migrations/20260907201448_lms0724_view_as.sql`.

**SHA-256: `58C333EA3C9684A60475B3E285BA160A3717DA3AFFCAE4888A31E0F2C539F1E0`**.

No production migration history entry was created. Prior local hashes are superseded and must not be deployed.

This pass changes that migration, scripts/lms0724-concurrency-tests.mjs, this report, the implementation-report status and roadmap status. Earlier home-location schema/fixture/tests remain included without reverting their corrections. No app/runtime authorization/UI or version change in this replay pass.

## Controlled production continuation — only after review

1. Approve final artifact/hash. Repeat read-only Supabase/Vercel/baseline/migration-absence/object-collision/schema-contract/identity-session and immutable AI baseline checks. Normal registration is legitimate concurrent activity.
2. Configure only reviewed https://view-as.lwrpickleballclub.com and approved server-only View-As configuration. Verify DNS/HTTPS, exact routing and isolation; preserve normal LMS origin, target Auth, HMAC and corpus configuration.
3. Apply this final pending migration exactly once through the reviewed non-superuser production path. Verify owners, security mode/search_path, effective grants/RLS and operational/AI integrity before application deployment.
4. Deploy LMS-0724 / 0.1.546 through the normal pipeline; confirm READY and live version.
5. Execute the approved 43-gate production sequence: sole Member Detail entry/roles, confirmation, isolated tabs, effective target pages, direct/omitted-context/credential/event-code attacks, handoff/exit/audit, Live/document/privacy/telemetry, desktop/mobile/accessibility, minimal accepted AI regressions, latency and integrity. Use isolated evidence where legitimate roster/match/role-change prerequisites are absent; do not manufacture production data.
6. Stop on any security/privacy failure before correction. Report actual gates and limitations, then obtain production acceptance. Do not start another version or implement deferred DUPR UX.

**STOP: nothing applied/configured/deployed in production.**

Final ordinary-tab check: after isolated-tab Exit, the original synthetic administrator tab's authenticated test server action returned HTTP 200 and syntheticWrites=1. The fixture-only action changes server memory, not production or operational tables. Local fixture listeners were stopped after validation.
