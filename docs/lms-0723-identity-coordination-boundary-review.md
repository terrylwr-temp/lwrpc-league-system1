# LMS-0723 / 0.1.545 — shared coordination design: Auth boundary review

**CURRENT — Shared identity coordination implemented locally and validated; STOP BEFORE PRODUCTION.** The owner approved the bounded app-owned Auth coordination hook. [Implementation, 19-part review and controlled continuation plan](lms-0723-identity-coordination-implementation.md). Original 14 links + 1 identical split only; 107 no-role accounts deferred. LMS-0723 / 0.1.545 remains deployed, NOT production accepted. No production repair, migration or deployment. Earlier stop/design entries below are historical.

2026-09-07. No production change. No new repair migration or application change implemented in this pass. The approved population remains at most the original 14 existing-role links plus one identical Commissioner split. All 107 no-role accounts and other held accounts remain excluded.

## Boundary requiring clarification

The new approval requires every relevant identity writer to share coordination, but section 6 also prohibits modifying Supabase Auth internals and says coordination should protect the LMS side. Native Auth signup/invitation/confirmation/email-change/account-state operations do not call an LMS application helper.

Supabase explicitly documents an **application-owned trigger on auth.users** as an integration mechanism, and warns that a failing trigger can block signups: [official user-management documentation](https://supabase.com/docs/guides/auth/managing-user-data). Such a hook can call an LMS-private coordination function without changing Auth data, sessions or managed Auth functions. Nevertheless, whether that hook is within the owner's intended restriction must be settled before implementation. No hook has been created.

Read-only production inspection confirms no non-internal triggers on auth.users, members or user_roles. Auth has exact-email uniqueness only through `users_email_partial_key ... WHERE is_sso_user = false`; the lower-email index is nonunique. This is **not** proof of universal `lower(trim(email))` uniqueness across all Auth identities. It does not establish that SSO is currently enabled or used. Do not invent that production condition, or rely on this partial index as a complete reconciliation invariant.

A shared protocol on public.members/user_roles can cover the previously failing LMS member-insert race. It cannot by itself claim to coordinate native Auth changes. Repeated reads/getUser calls do not acquire a shared transaction lock for the separate Auth writer. Supported narrow row locking may protect an already existing Auth row, but does not establish a shared boundary for a newly inserted matching row. Broad Auth locks, new managed Auth uniqueness constraints, and auth.sessions access are not proposed.

Question presented to owner: does section 6 exclude the documented application-owned Auth coordination hook, or may that bounded hook be included? This is a scope clarification, not another request to approve the already approved 15 repairs. Dependent implementation remains paused while the answer is pending.

## Exact current writer inventory

| Writer | Relevant operation | Coordination requirement |
|---|---|---|
| `app/api/member-password-reset-check/route.js`, `linkUserRoles` | Updates null user_id on existing member-role rows; Auth invite/recovery is a separate service call | Replace unchecked multi-row linking with guarded coordinated operation; do not link unconfirmed invitations; handle BUSY/STALE explicitly without uncoordinated fallback. |
| `app/members/page.js` | Member creation, initial member-only role insertion, stale Captain role correction | Material member/role writes must participate. No new role provisioning for the deferred 107. |
| `app/members/[id]/page.js` | Member email/status edit, role update/insert | Coordinate material writes; preserve role authorization and last-Commissioner guard. Role update already uses single-row returned data and can report a stale deleted role-row ID. |
| `app/member-import/page.js` | Member inserts and updates, including email/membership state | Coordinate at database write boundary, including bulk imports; unaffected fields should not require identity coordination. |
| `public.bulk_import_members` | Production database import writer found by catalog inspection | Must participate even if an application route bypasses the page implementation. |
| `app/teams/page.js`, `upgradeMemberToCaptain`, `upgradeMemberToClubPro` | Role insert/update for Captain/Co-Captain/Pro assignments | Coordinate role writes and check failures/affected rows. Plain team creation/update is outside identity locking. |
| `app/locations/page.js`, Pro helper | Role insert/update | Same role-write protocol. Location merge updating only member location fields is non-material to identity reconciliation. |
| `public.admin_master_reset_all` | Production function updates Captain role rows to Player | Database-level coverage needed; do not execute this destructive workflow for acceptance. |
| `app/api/admin/delete-member/route.js` and `public.delete_inactive_member` | Deletes member; may delete linked Auth identity through supported admin API; role FK actions | Coordinate affected LMS identity removal; preserve existing authorization and cascade behavior. No execution in this pass. |
| Native Supabase Auth API/dashboard workflows | Auth creation, verified-email/current identity state, deletion | Requires the boundary clarification above; do not pretend an LMS-only helper covers these writers. |
| Proposed repair and future existing-role reconciliation | Link/consolidation under pinned review | Same protocol plus repair-specific expected-state guard and private audit. |

Read-only catalog inspection found the named public functions by their member/role DML bodies. No table/function was executed or altered. Ordinary directory/auth/role-guard reads are not writers.

Non-material member writes inspected: `app/lib/profilePhotos.js` (profile image URLs), `app/ratings/page.js` (DUPR ID), tournament member phone edits in `app/api/tournaments/action/route.js`, and location merge location fields. These must not acquire identity coordination merely because they update the members table. Generic member updated_at can change for these unrelated reasons and should not alone invalidate review.

## Proposed LMS coordination design, pending Auth boundary

Use transaction-scoped coordination over deterministic, domain-separated keys for Auth UUID, member UUID and exact normalized reconciliation email; include old and new values for material updates. Sort/deduplicate the complete key set. Preserve full immutable IDs and exact normalized comparisons as the authority checks. If a 64-bit advisory-key hash collides, it must cause only conservative BUSY/serialization, never identify two people as equal or bypass a guard. No authorization decision may use the hash as identity.

Database write-boundary coverage is preferable to patching only selected JavaScript callers: imports, maintenance functions and FK effects also write these tables. A row trigger can run after PostgreSQL has already locked a target row, so blindly blocking on a coordination lock there can invert the repair's lock order. Evaluate **try-lock/fail-fast** behavior for such writers and repair row locks, with controlled BUSY/transaction rollback, rather than claiming sorted advisory keys alone eliminate every deadlock. No error may fall through to an unlocked write. Application callers must surface/retry BUSY through their normal error handling.

The final mechanism must also revalidate the writer after the repair commits. A writer that waited must not simply create a competing durable binding. New distinct role rows cannot be prohibited merely by a one-role-per-member index; identity uniqueness and role multiplicity must remain separate.

Existing UNIQUE(user_id) already enforces one non-null Auth ID per current role table, but does not enforce one member per Auth-independent fragment. Do not replace or extend uniqueness until compatibility with legitimate multiple-role cases is proven. No additional index has been approved by inference or added here.

## Exact expected-state design

Pin the original reviewed cohort in a protected manifest (maximum 15), never dynamically enumerate and repair all newly safe accounts. For each entry retain expected Auth/member IDs, classification, sorted role-row IDs, expected user_id/member_id/role values and role updated_at. Include both exact fragments for consolidation. Include member active status and normalized-email comparison state; include Auth confirmed/current email, pending change, deleted/banned/anonymous/provider state relevant to eligibility. Do not export raw email into the repository or audit.

Under the final shared boundary: compare the pinned material state first; then rerun minimum candidate/link uniqueness checks; then mutate and audit atomically. Any changed material state returns `STALE / REQUIRES RE-REVIEW`, with no opportunistic re-review-and-repair inside that call. Recognize an idempotent replay only from the exact prior operation and verified after-state, not merely any now-complete link. Non-material phone/photo/location changes do not invalidate identity review; role updated_at changes are conservatively material. Sign-in timestamps and password hashes are not identity matching state and must not be selected or stored.

Acceptance consolidation remains R1 canonical, R2 removed only when both pinned fragments are unchanged and identical-role, no new competing identity or FK reference exists, and before/after audit commits with it. No reference repointing has been identified or performed.

## Implementation/validation disposition

This pass expanded the inventory and identified the Auth integration boundary. No corrected migration or all-writer protocol has been implemented or claimed tested. The earlier real multi-session failure and its baseline validation remain recorded in [the concurrency stop report](lms-0723-identity-concurrency-stop.md); those tests are not represented as validation of this new design.

After the boundary is resolved: finalize the smallest protocol, create a new corrective migration through project conventions, implement checked participating writers and pinned expected state, then run exact forward/reverse/role-change/same-identity/consolidation races, opposing-key/timeout cases, unchanged registration, permissions under production defaults, audit/rollback, post-link missing-data/telemetry and the full requested validation suite. Stop before production migration, repair or deployment. Do not reapply prior Live/session migrations or change version.
