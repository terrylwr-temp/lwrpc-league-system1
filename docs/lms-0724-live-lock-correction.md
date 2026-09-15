# LMS-0724 / 0.1.546 — View-As Live authorization lock correction

Status: **exact correction applied to production; SELF and cross-player privacy retests PASS. LMS-0724 remains NOT production accepted: STOP on missing scheduled expiry/retention maintenance.** Applied once as history version `20260908014218`, without application redeployment. Helper security, unchanged policies and removal of all seven UPDATE privileges verified after acceptance reads. See [production continuation, evidence and remaining gates](lms-0724-production-acceptance.md). LMS-0723 / 0.1.545 remains the last accepted baseline. Local validation and earlier pre-production statements below are historical; do not reapply the correction.

## Root cause and exact path

Member Detail handoff creates an actor/target/browser-bound context. The server decrypts the real actor credential only server-side, calls getUser, and resolves the effective Player through public.lms_view_as(text,jsonb). The read route sends SELF_RATING through the deterministic Live service to view_as_private.lookup(uuid,uuid,uuid,uuid,jsonb). The public dispatcher is SECURITY DEFINER owned by lms_view_as_executor; the lookup is SECURITY INVOKER and therefore executes as lms_view_as_executor.

The first failing query is:

```sql
select u.member_id,u.role into v_member,v_role
from public.user_roles u join public.members m on m.id=u.member_id
where u.member_id=p_member and m.is_active_member is true
and u.role in ('player','captain','club_pro','league_manager','commissioner')
order by case u.role when 'commissioner' then 5 when 'league_manager' then 4
 when 'club_pro' then 3 when 'captain' then 2 else 1 end desc
limit 1 for share of u,m;
```

Conceptually this locks the viewed member's active member row and linked role, not the Commissioner's rating. Both public.members and public.user_roles have RLS enabled. view_as_executor_read is a SELECT policy for the dedicated executor. The existing UPDATE policies are for authenticated, which the NOINHERIT executor does not inherit. Thus no UPDATE policy applies to its FOR SHARE query. PostgreSQL applies UPDATE-policy USING predicates to SELECT FOR SHARE too; default deny removes the rows. Production read-only EXPLAIN showed LockRows with One-Time Filter false. [PostgreSQL policy semantics](https://www.postgresql.org/docs/17/sql-createpolicy.html).

The resulting null v_member triggers status denied. Ordinary preflight/snapshot SELECT succeeds for the same legitimate Player. Enabling production-equivalent operational RLS in the local fixture reproduces this exact denial before correction. This proves case B: the effective Player is entitled to SELF but the locking mechanics prevent the authorized lookup.

The dispatcher also attempted a FOR SHARE over the context actor/target member and role rows without checking its row count. That query was silently filtered as well. Further Live subject/season/team/membership locking queries have the same policy interaction, so fixing only the first query would leave both concurrency and other capabilities broken.

## Bounded correction

New private function:

`view_as_private.lock_authorization(jsonb,text,uuid,uuid,uuid) returns boolean`

- SECURITY DEFINER; fixed empty search_path; fully qualified relation names; no dynamic table/column selection.
- Owner is the trusted migration owner (postgres in reviewed production), which must already own the unchanged private lookup. A non-superuser table-owner migration role was also tested on real PostgreSQL. Ownership is not transferred to a runtime/browser role.
- EXECUTE only for the existing lms_view_as_executor and implicit owner. Explicit revoke from PUBLIC, anon, authenticated and service_role, overriding default grants. Private schema remains unexposed; no browser-accessible helper or new public signature.
- Requires the browser-bound hashed handoff/context proof, unexpired/unended matching context, and matching actor/target when supplied. IDs alone do not authorize access. Handoff proof is accepted only during its existing unconsumed exchange window. Live lock operations require a started context.
- Derives actor and target from the context. Revalidates active actor identity and Commissioner/League Manager authorization, and effective target role before and after identity locks. Unknown actor roles fail closed.
- Reads only context ID, actor, target, started_at and expires_at into its local record. It does not load the encrypted credential or return any row, name, email, rating, token or administrator data.
- Whitelisted operations lock exact identity rows, a permitted subject, a permitted active season, or an authorized team/membership and its hierarchy. Other-player locks require the EFFECTIVE user's manager/team authorization. Location-only Club Pro visibility does not become Live contact authority.
- Returns only Boolean success/failure. Capability projection and result generation remain in the invoker lookup with its existing effective-user checks.

The dispatcher sends validated context proof internally to the private lookup. The lookup verifies actor/context/target equality and removes that internal proof from its query object before ordinary query validation. The application still sends the same parameters; there are no Next.js, routing, model, receipt or player UI changes.

The helper retains physical row locks until the enclosing transaction completes, rather than removing concurrency protection or requiring ordinary writers to adopt a new advisory-lock convention. Context consumption/Exit continue using their existing row locks. Server getUser and post-response revalidation remain unchanged.

## Exact privilege/schema footprint

Changes are limited to one new private helper, replacement bodies of the existing private lookup and public dispatcher, and removal of the executor's former key-column UPDATE privileges:

| Table | UPDATE privilege removed |
|---|---|
| public.members | id |
| public.user_roles | member_id |
| public.seasons | id |
| public.leagues | id |
| public.divisions | id |
| public.teams | id |
| public.team_members | member_id |

No new SELECT privileges, browser grants, memberships, BYPASSRLS role attributes, RLS policies, tables, triggers or indexes. RLS remains enabled and policy definitions are unchanged. Existing executor column SELECT grants remain as previously approved; the correction adds no general browsing privilege. Operational UPDATE attempts fail by privilege, even independently of RLS. The helper's owner-level locking ability is restricted by its context/capability predicates, not exposed as a generic definer lookup.

The corrective migration validates old-or-corrected function bodies, owner/security/search_path and unexpected function ACLs before replacement; helper name/body/owner/config collisions stop it. Dispatcher replacement temporarily restores CREATE on public to its existing owner, performs the replacement as that owner, restores the actual migration operator role and revokes CREATE in the same transaction. No ownership handoff to an ordinary runtime principal occurs. Replay preserves the final state.

## Validation evidence

- **671 tests passed**, including the original suite and five new correction tests.
- **Real PostgreSQL 17.11:** original RLS denial reproduced; non-superuser migration apply and replay pass; target SELF returns synthetic 3.72; cross-player email denied; wrong actor/target/browser/context denied; helper direct invocation denied to all browser/service roles; all seven direct operational UPDATE attempts denied.
- **Concurrency:** an in-flight successful Live read holds the target row against deactivation until commit. If actor-role loss wins first, the waiting request observes it and denies. Existing handoff/Exit and context-expiry regressions remain in the full suite.
- Corrected Player SELF missing-data path passes; corrected SELF_TEAM, TEAM_ROSTER and NEXT_MATCH pass. Captain contact succeeds for an authorized roster member and fails for an unrelated member. Location-only Club Pro snapshot scope remains available without granting contact access.
- Expired/ended contexts, proof substitution, target tampering and helper ACL drift tests pass. Private helper returns only Boolean. Replay leaves RLS policies unchanged. Review-only rollback restores original function/ACL state and retains operational rows.
- Normal LMS-0723 source/functions/routes are unchanged. Existing normal Player/manager authorization, subject resolution, identity and Live tests pass in the full regression suite. No live normal-Player production session was impersonated or manufactured.
- Local browser with operational RLS enabled: keyboard initiation and dedicated localhost/127.0.0.1 handoff succeed; SELF displays the target synthetic rating; other-player email is denied; feedback stays disabled; keyboard Exit succeeds and original administrator's local action remains usable.
- Local 390px/320px checks: no horizontal overflow; Exit 44px; banner, wrapped navigation and Ask LWR remain usable. No UI code was changed. The prior production Cancel-focus observation remains deferred; this correction does not claim to repair it.
- Actual **isolated loopback** HTTP omitted-context probes return 403 for member deletion, match lineups, team deletion, Approved Answers, tournament and round-robin actions, and nested View-As start. Normal-origin View-As marker replay returns 403. Existing context/credential replay and origin tests also pass.
- Live remains deterministic: no model/embedding code was modified or invoked by the successful SELF/contact UI requests. Synthetic fixture uses no production/model credentials. Existing View-As diagnostic-only persistence, minimum fields, disabled feedback and no normal-player telemetry remain unchanged. The historical production denial is retained untouched.
- npm run lint passes with six pre-existing warnings; tsc --noEmit --incremental false passes; PDF server bundle verification passes.
- npm run build compiles successfully (10.7s), then encounters the established EPERM writing .next/cache/.tsbuildinfo. The isolated clean production build passes. This is recorded separately from compilation/type-check failures.
- git diff --check passes. No version increment; original approved migration hash remains unchanged.

The local development server's first handoff was interrupted by route compilation/reload; warmed-route retest passed. This is not reported as a production acceptance result.

## Safety-control limitation

Production mutation/event-code probes remain **PRODUCTION PROBE BLOCKED BY SAFETY CONTROL**. They were not attempted again, bypassed or replaced by a new production testing endpoint. Retain isolated boundary evidence and the existing deployed-source/header inspection. These checks must not be described as executed production mutation probes.

## Review artifacts and rollback

Corrective migration: `lwrpc-admin/supabase/migrations/20260908011413_lms0724_view_as_authorization_locks.sql`

SHA-256: **BD542EFFFC01A3897BDB95D454B7CCB9D80CF8F867C324D9EBBD8B3628A2D8E0**

Original `20260907201448_lms0724_view_as.sql` remains byte-identical, SHA-256 `58C333EA3C9684A60475B3E285BA160A3717DA3AFFCAE4888A31E0F2C539F1E0`. Do not reapply it; its production history timestamp differs from its local filename as already documented.

Review-only rollback: `docs/lms-0724-lock-correction-rollback.sql`, SHA-256 `754F91EC2B0AB9F586CC3CC35411CFB981CFE1053FE7B34583B537F3FAB8D6BB`. It restores the previous dispatcher/lookup and seven key UPDATE grants, then drops the helper. It restores the known-denying behavior, not production acceptance. No data/history is removed. Separate explicit production approval is required before running rollback; any drift should stop it.

Exact local files for this correction:

- Corrective migration above.
- `lwrpc-admin/scripts/lms0724-lock-correction-source.sql` — helper source fragment, not independently runnable.
- `lwrpc-admin/scripts/lms0724-build-lock-migration.mjs` — deterministic local artifact generator.
- `lwrpc-admin/scripts/lms0724-lock-postgres-tests.mjs` — loopback PostgreSQL validation.
- `lwrpc-admin/scripts/lms0724-local-verification.mjs` — optional corrected-RLS fixture flag.
- `lwrpc-admin/test/viewAsLockCorrection.test.mjs` — five regression tests.
- This report, rollback artifact, project roadmap, implementation report and production acceptance report.

## Production continuation — requires explicit approval

1. Approve the exact corrective migration/hash. No production correction is authorized by this local pass.
2. Read-only verify the intended project, original applied migration mapping, current dispatcher/private lookup owners and body hashes, existing grants/policies, absent corrective migration, expected helper absence, and current legitimate operational baseline. Do not freeze registration.
3. Rehash immediately before applying this correction once, unchanged. Do not run earlier migrations or an unbounded migration push. Do not process corpus or change HMAC/environment values.
4. Before any acceptance continuation, verify exact helper/body/owner/search_path/ACL, dispatcher owner/ACL, all seven removed UPDATE privileges, unchanged RLS/browser grants and unrelated functions, no operational/Auth/history mutation. Stop on discrepancy.
5. No application runtime code changed, so the already deployed LMS-0724 application is compatible with the correction. Any Git/deployment continuation must follow subsequent explicit approval; this pass performs neither.
6. First real View-As Player retest: `What is my Season DUPR?` — confirm target season/value or missing state, then other-player email denial, distinct audit attribution, zero model/embedding and diagnostic-only capture. Exit and verify credentials cleared.
7. Resume pending production gates at the recorded stop, preserving passed gates and the explicit blocked-probe/data-dependent limitations. Stop on any security/identity/privacy failure. Do not mark accepted until required remaining gates pass or the owner explicitly accepts their stated limitations.
