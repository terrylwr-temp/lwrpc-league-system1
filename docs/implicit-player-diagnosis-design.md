# Implicit Player — bounded diagnosis/design

September 9, 2026. OWNER RESOLVED: PLAYER IS IMPLICIT BASELINE ROLE. Diagnosis only; accepted production remains LMS-0727 / 0.1.549. Next bounded release, version not changed. No application implementation, SQL execution, account/role changes, deployment, or OpenAI calls. Evidence is repository source and the just-completed accepted-production baseline; this is not a fresh production catalog or member census.

## 1. Current effective-role logic

`app/lib/memberLookup.js:25` initializes `highestRoleForMembers` to Player and chooses the highest explicit recognized role. `permissions.js` orders Player < Captain < Club Pro < League Manager < Commissioner. `auth.js:43` and `login/page.js:81` resolve signed-in membership by email and use that helper. A team assignment is not required. The server's `authorizeAdminRequest` likewise defaults to Player. Explicit roles remain stored independently; existing code commonly uses a highest role for permission hierarchy rather than a new combined-role system.

Validity is separate: normal email resolution treats null active status as active and can fall back to inactive rows; auth also returns Player with a null member ID if no member is resolved. These are existing permissive identity behaviors, NOT a safe definition of View-As target validity. Do not copy these fallbacks into View-As.

## 2. Members display and creation

`app/members/page.js:745,1601` displays the first stored role, or Player when absent. Normal Add Member deliberately inserts a role only for a non-Player choice (`:383`). This directly supports implicit Player semantics. Existing explicit Player rows remain valid; the stale-Captain correction action can explicitly change a role to Player, but it is unrelated and must not be invoked. No label change or backfill is needed.

## 3. View-As target-role logic

`ViewAsStartButton` gets availability from `/api/view-as/start?target=...`; the API authenticates the REAL actor and asks the `lms_view_as` SQL dispatcher for preflight. Start, handoff and subsequent reads independently revalidate. The dispatcher calls `view_as_private.member_role(uuid)`.

That helper, defined in `20260907201448_lms0724_view_as.sql:35`, starts from `user_roles JOIN members`, requires active=true, selects the highest recognized role, rejects conflicting Auth linkage (multiple user IDs / one user linked across members), and returns null when no role exists. `actor_member` independently requires a uniquely linked active actor. The accepted LMS-0726 dispatcher retains these calls. `lock_authorization` locks member and role records and repeats authorization checks.

## 4. Exact inconsistency

An otherwise valid active member with zero assigned roles is Player in normal navigation and Members, but null/invalid in View-As. The button correctly reflects that server denial; hiding/showing logic is not the root cause. Marilyn's label is correct. Her eligibility must remain conditional on all other checks; no account-specific change is proposed.

## 5. Other affected subsystems

- **Required within this correction:** current `view_as_private.lookup(uuid,uuid,uuid,uuid,jsonb)` in `20260908203904_lms0725_eligibility_self.sql:216` independently starts from a role-row join and denies a no-role target. Fixing preflight alone would leave View-As Ask LWR Live SELF/eligibility broken.
- **Presentation:** dispatcher returns stored `roles` separately from scalar effective `role`; shared banner currently prints `viewer.roles`. With no assigned roles this would be blank. Use effective Player as a display fallback while preserving assigned-role data and explicit multi-role display. Page projections should retain an empty stored-role array, not fabricate a database assignment.
- **Separate material inconsistency:** normal `ai_live_private.lookup(uuid,uuid,jsonb)` (`same migration:31`) requires an Auth-linked role row. Normal document Ask LWR uses the baseline-role server helper instead. Thus no-role normal document/navigation and Live SELF authorization are inconsistent. Fixing authenticated member linkage requires its own bounded identity review; do not introduce an email fallback into Live SQL as part of this View-As correction.
- Account-entry `identity_repair_private` prospective linking updates an existing member role row; a truly no-role member cannot acquire that linkage through this path. Do not create roles/Auth accounts to bypass it.
- Members' first-row role display and normal highest-role selection can differ for multi-role records. Preserve current behavior; do not launch a multi-role refactor.

This is a targeted source audit, not a claim that every historical import or RLS path has been exhaustively certified. No current no-role population count was queried; it is unnecessary to settle the owner-confirmed policy.

## 6. Smallest correction

Propose two existing private SQL function body changes plus a banner fallback and deterministic controls:

1. Resolve `member_role` from an existing member with active=true. Preserve all identity-conflict checks and explicit role precedence. Only a genuinely empty assigned-role set gets Player; unknown/unsupported explicit roles must not silently become baseline Player. Missing/inactive/null-active/invalid identities remain denied. No target Auth requirement is added.
2. In View-As `lookup`, use that same validated target role/member instead of requiring a role row. Preserve context proof, protected locks, capability/SELF boundaries, audit, and eligibility/RF restrictions. Manager-test restrictions remain enforced.
3. Banner fallback uses validated effective role when stored roles are empty. Existing button, confirmation, routes, page projection and dispatcher can continue consuming the same contract. Do not synthesize role rows.

No normal roster/team code or normal identity behavior changes. Explicit role arrays are preserved. No broad shared-helper refactor.

## 7. Security implications

This deliberately widens target eligibility only to otherwise valid implicit Players under the owner's new policy; it does not widen initiating authority. `actor_member` and explicit Commissioner/League Manager checks remain unchanged. Player does not pass a higher-role test. Preserve origin isolation, online real-actor authentication, single-use handoff, expiry, no nesting, audit, Exit/maintenance and server mutation denials.

No-role means no role row exists to lock: the existing protected member lock must remain mandatory. Verify concurrent deactivation and role insertion/change against the actual identity writer triggers in the isolated database; do not assume an empty role query locks future inserts. Failure to establish safe serialization stops implementation review; do not grant broad UPDATE/DELETE for locks.

## 8. Permanent role controls (planned, not run)

Active valid/no roles -> Player; explicit Player -> Player; no team -> still Player; Captain/Club Pro/LM/Commissioner -> same effective hierarchy; multi-role -> highest role and original role list preserved; missing/inactive/null-active -> deny; conflicting linkage -> deny; unknown explicit role -> fail closed. No database role/Auth inserts occur. Actor without explicit managerial authority cannot initiate. Include concurrent validity/role change controls.

## 9. View-As controls (planned)

Implicit Player with and without target Auth -> preflight, confirmation, exchange, shared Player Dashboard, empty-team state and effective SELF. Explicit Player and Captain regressions; higher/multi-role regressions. Ask LWR Live uses target only, never real manager authority; SELF ratings/RF remain bounded and personal data does not enter model prompts. Mutation attempts deny across API/route paths; replay/expiry/nesting/isolation/Exit remain intact. Button visible only for real authorized actor plus valid target; absent without a gap otherwise. Desktop, 390px, 320px and keyboard/focus/confirmation tests. Use synthetic local fixtures; no model generation required.

## 10. SQL requirement — STOP BEFORE IMPLEMENTATION/MUTATION

**Application-only is insufficient.** Minimum proposed SQL is replacement of the two private function bodies above, retaining signatures, owners, security-invoker settings, empty search_path and current ACLs. No new schema, tables, role rows, grants, policies or business-data changes are proposed. Current dispatcher/lock helper should not need replacement, subject to concurrency proof. No migration has been generated/applied. A separately reviewed exact migration/hash and rollback are required before production SQL. This stops at the owner's requested design gate; it is not an automatic-approval rejection.

## 11. Normal LMS regression plan

Freeze accepted LMS-0727 package as comparison/rollback. Deterministic synthetic tests first: existing role resolution, login routing, normal Player/Captain/manager pages, roster controls, schedules, Match Setup, matches, scores, standings, ratings and Ask LWR source/classification. Run existing relevant security/fixture suite, lint/build/type checks after approved implementation. Verify no source delta in normal business workflows. Proposed SQL must pass object/ACL diff, business fingerprints, concurrency and rollback in isolation. No tests were run for this documentation-only diagnosis and no PASS is claimed for planned controls.

## 12. Controlled production sequence

After design/implementation authorization: local correction and deterministic acceptance -> exact candidate/migration/rollback review -> explicit production authorization -> fresh deployment/source/security/migration baseline and all 19 business fingerprints -> apply only approved SQL once -> verify exact objects/ACLs and unchanged business data -> exact application deployment -> NORMAL LMS FIRST (including genuine owner Captain/Player checks) -> integrity checkpoint -> valid implicit/explicit Player and Captain View-As, target-only deterministic Live checks, Exit -> final integrity/security/maintenance check -> acceptance report. Do not create Auth/roles or live test rosters. Stop on any normal regression, unexpected SQL/object change or business mutation; no automatic corrective SQL. No OpenAI call is needed for this release's role/security controls. Deferred broad Data API hardening stays separate.
