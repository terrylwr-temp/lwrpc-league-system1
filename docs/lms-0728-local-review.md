# LMS-0728 / 0.1.550 — implicit Player consistency

LOCAL IMPLEMENTATION COMPLETE — STOP FOR REVIEW. Production remains accepted LMS-0727 / 0.1.549. No production SQL, deployment, account modification, role backfill or OpenAI calls. Governing design: [implicit Player diagnosis](implicit-player-diagnosis-design.md).

## Release results

| Requested item | Result |
|---|---|
| 1. Version | LMS-0728 / package 0.1.550, local only. |
| 2. Root cause | Normal membership role resolution and Add Member support implicit Player, but both the private View-As target resolver and View-As Live lookup required a stored role. |
| 3. Two functions | `view_as_private.member_role(uuid)` and `view_as_private.lookup(uuid,uuid,uuid,uuid,jsonb)` only. Full contracts below. |
| 4. Migration | `20260909202216_lms0728_implicit_player.sql`, created using Supabase CLI. |
| 5. SHA-256 | `fa1c8db02e06c505997d97a7d256f5e85518fd8c11404447fba61a50626e4102` |
| 6. Implicit Player | Existing active=true member with zero assigned roles resolves Player. Team membership is not required. Missing/inactive/null-active/conflicting identity remains invalid. |
| 7. Explicit Player | Stored Player still resolves Player; stored roles are not synthesized, removed or rewritten. |
| 8. Captain/multi-role | Existing recognized-role ordering retained; Captain/Club Pro/manager precedence and original role arrays remain. Co-Captain team relationships are untouched. |
| 9. Invalid targets | Missing, inactive, null-active, unsupported-role-only and conflicting Auth linkage controls deny. An unsupported role is not mistaken for absence of roles. |
| 10. Member Detail button | Existing server preflight now recognizes implicit Player. Actual Member Detail action-row button verified at 1280/390/320px. Button component and normal page are byte-identical to accepted production. |
| 11. Banner | Empty assigned-role array falls back to validated effective Player display. Explicit role-list display unchanged. |
| 12. Live SELF | Existing proof/locks precede resolution through the same target-role helper. Target SELF rating and self-only eligibility/RF pass; no extra fields or cross-player permission added. |
| 13. Implicit Player View-As | Synthetic no-role member opens shared real Player Dashboard, displays Player and READ-ONLY, rejects a mutation and exits to normal origin. Unrostered no-role database/page control also passes. |
| 14. Privacy/security | Actor Player/Captain initiation deny; LM/Commissioner preflight allow; forged target, cross-player and invalid target deny. Private calls from anon/authenticated/service_role deny outside dispatcher. Existing origin/proxy/receipt/maintenance/expiry tests retained. |
| 15. Normal LMS | 309/313 accepted runtime files unchanged; only banner and three version files differ. Normal Player/Captain and Member Detail browser controls pass; existing normal role/auth, routing, roster/Match Setup, match/standings and fixture regressions pass in the full suite. No normal business-page rewrite. See evidence limits below. |
| 16. LMS-0726 | One shared presentation retained; no mini-LMS restored. Page adapters, target-only data, read-only server denial, Entry/Exit and normal-origin isolation verified. Existing maintenance and lock tests pass. |
| 17. LMS-0727 | Accepted cross-community application source is byte-identical; deterministic cross-community suite passes. No generation benchmark rerun. |
| 18. Normal Ask LWR issue | **B — separate post-release MUST-FIX.** Normal `ai_live_private.lookup` still requires Auth-linked role rows; normal identity linking is not changed by these two private View-As functions. No email authorization fallback or role creation added. |
| 19. PostgreSQL | PostgreSQL 17.11, production-compatible non-superuser postgres role/membership setup: baseline clean apply, replay, second replay, partial recovery, rollback, metadata/ACL/RLS checks and five unsafe-drift variants pass. Existing active-member lock blocks concurrent invalidation; committed role insertion is revalidated. |
| 20. Business integrity | All public fixture business rows fingerprint-identical across migration/replay/rollback; exactly two function bodies change. Synthetic state changes for test cases occur separately. No production connection made. |
| 21. Standard checks | Full suite 1,042/1,042; final targeted additions pass. Lint zero errors/11 existing warnings. TypeScript, PDF bundle check and production build pass. Git diff check recorded separately. |
| 22. Cost | Zero OpenAI calls, zero model cost. Browser verification blocks external network requests; no real member data used. |
| 23. SQL/grants | Two CREATE OR REPLACE private functions within guarded transaction. No new objects, policies, grants/revokes, schema changes, role backfill or business DML. Existing runtime audit/attempt writes inside lookup preserved. |
| 24. Production sequence | Review and separately authorize exact migration/package first; then normal-first sequence below. Nothing deployed. |

## Exact function contracts

Both functions retain owner `postgres`, SECURITY INVOKER, empty `search_path`, existing signatures, OIDs and ACLs. Execute is limited to owner and `lms_view_as_executor`; browser roles/PUBLIC are not granted execution. `service_role` calls the accepted public dispatcher, not these functions directly. The dispatcher is the existing SECURITY DEFINER boundary; functions do not acquire new privileges. Private-schema access and effective execution were verified, not just the word “private.” [Function hashes](lms-0728-function-manifest.json).

### view_as_private.member_role(p_member uuid) RETURNS text

SQL/STABLE. Reads `public.members(id,is_active_member)` and `public.user_roles(member_id,user_id,role)`. Calls no business mutation. Callers: accepted dispatcher preflight/start/resolve/exchange/read lifecycle, existing protected `lock_authorization`, and now the corrected View-As lookup. No normal login/normal Live lookup caller is changed.

Changes the root relation from a mandatory role join to a valid active member. Only zero assigned roles receives fallback Player. Otherwise preserves highest recognized assigned role. Keeps the existing multiple-user-ID and shared-user-across-members rejection. Null or missing member cannot fall through to Player. Identity linkage is checked when present; target Auth is still optional. RLS executes with the caller's existing privileges through the reviewed dispatcher/lock paths; no new policy is installed.

### view_as_private.lookup(p_actor uuid,p_member uuid,p_context uuid,p_request uuid,p_query jsonb) RETURNS jsonb

PL/pgSQL/VOLATILE, unchanged. Callers: `public.lms_view_as` for Live operations and its own self-only eligibility recursion. Replaces only the role-row-dependent target selection with `member_role(p_member)` after accepted context proof and protected identity locking. The real actor is never substituted for SELF. Existing subject/season/team/membership locks and denial logic remain byte-identical.

Direct read dependencies (unchanged except role resolution delegated to helper):

| Table | Read columns |
|---|---|
| members | id, first_name, last_name, email, is_active_member |
| member_season_ratings | member_id, season_id, season_dupr_rating, season_primetime_rating, dupr_doubles_rating, dupr_reliability_rating |
| teams | id, name, division_id, is_active, captain_member_id, co_captain_member_id, co_captain_2_member_id, club_pro_member_id |
| team_members | team_id, member_id, is_active |
| divisions | id, name, league_id, is_active |
| leagues | id, name, season_id, is_active |
| seasons | id, name, is_active |
| matches | id, home_team_id, away_team_id, location_id, scheduled_date, scheduled_time, status, is_published |
| locations | id, name |
| system_settings | setting_key, setting_value |
| view_as_private.attempts | actor, at, contact |

Indirect reads remain in the unchanged protected lock helper: context binding/expiry and actor/target role/relationship records. Runtime writes remain only existing `attempts(actor,contact)` and `audit_events(context_id,actor,effective_member,subject,event,capability,reason)`. Migration application does not call lookup or write these rows. Existing RF is restricted to the eligibility SELF path, not added to shared page projections or model prompts. No ordinary-user lookup behavior changes.

## Lock and validation evidence

[PostgreSQL results](lms-0728-postgres-results.json), [test log](lms-0728-targeted-tests.txt), [full suite](lms-0728-tests.txt), [runtime comparison](lms-0728-runtime-delta.json), [browser results](lms-0728-browser-results.json).

An empty role set has no tuple to lock. The correction does not invent role rows or grant writes for locking. The existing protected member lock blocks active-state changes. Adding a legitimate role can change effective permissions, which are recomputed by existing per-operation checks; an unsupported committed role makes the next resolution invalid. This is not a claim that SELECT of zero role rows takes a predicate lock. PostgreSQL tests verify active-state blocking and subsequent inserted-role revalidation. Existing context/actor/relationship concurrency controls remain in the full suite.

## Limitations and observed existing behavior

- The shared confirmation closes on Escape but does not return focus to the trigger. This was observed locally; the accepted button and AppDialogProvider are unchanged and the provider has no focus-restoration code. No accessibility PASS is claimed for focus return. Record for a separate bounded follow-up; do not expand this release into a dialog refactor.
- The local dev server's first cold handoff timed out during compilation. A warmed run completed handoff/Player/Exit without an application correction. Development HMR and blocked external-logo requests appear in console; final browser results have no uncaught page errors. These are not production observations.
- Screenshots verify button/banner at 1280, 390 and 320px. Existing synthetic long email/normal tables can overflow at 320px; the button group itself wraps. No unrelated responsive redesign performed.
- Normal workflow evidence combines exact unchanged source, existing deterministic/fixture regressions and actual normal Player/Captain/Member Detail browser controls. This is not a new full-season browser simulation of every normal write, nor a production smoke pass. Production normal-role acceptance remains mandatory.
- Local PostgreSQL is 17.11; previously observed production was 17.6. The non-superuser role setup is matched, not the hosting platform or every production extension. A fresh production catalog check is required before SQL approval/application.
- Scope remains two private functions and banner only. No broad Data API hardening and no normal Live identity fix is claimed.

## Controlled production sequence — not authorized by this local approval

1. Review this report, migration hash, [rollback SQL](lms-0728-rollback.sql), exact runtime delta and limitations. Prepare an exact package against accepted `dpl_8AoUUZpZy4iNyCkYiAAZwqWAwCN8`; retain its application rollback artifact.
2. After separate production approval, read-only preflight: production identity/version/deployment, active source, migration history, function bodies/owners/ACLs/search_path, protected-role memberships, maintenance, and all 19 business fingerprints. Stop on drift.
3. Apply only the exact approved migration once. Verify migration history/source, only two body changes, unchanged function metadata/RLS/grants and business fingerprints before application deployment. Stop on any unexpected mutation; no automatic corrective SQL.
4. Deploy exact approved app package. NORMAL LMS FIRST: Commissioner plus legitimate Captain/Player sessions, dashboards, Members/detail, teams/rosters, Match Setup, matches/standings and deterministic Ask LWR controls. No real business edits for testing. Integrity checkpoint before View-As.
5. Test otherwise-valid implicit Player, explicit Player and Captain targets through normal Member Detail; no Auth creation/backfill. Verify shared pages, banner, permissions, target SELF, isolation, read-only and Exit. No model generation is required.
6. Final business/security/maintenance checkpoint and acceptance report. Any actual regression stops acceptance. Rollback is a reviewed artifact, not authorization to mutate production automatically.
