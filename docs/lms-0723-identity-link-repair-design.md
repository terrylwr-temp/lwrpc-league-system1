# LMS-0723 / 0.1.545 — identity-link repair design and read-only dry run

**Subsequent implementation/concurrency review STOP:** the owner's no-broad-table-lock restriction requires a revised shared-writer protocol. A real PostgreSQL multi-session experiment reproduced a competing-candidate race and identified an expected-state guard gap. [Results and precise continuation boundary](lms-0723-identity-concurrency-stop.md). Earlier design-complete text below is historical; no production repair occurred.

2026-09-07. **DESIGN COMPLETE — STOP FOR OWNER REVIEW. No production repair authorized or performed in this pass. LMS-0723 remains deployed, NOT production accepted.**

This follows the accepted [SELF_RATING diagnosis](lms-0723-self-rating-authorization-diagnosis.md). Production comparisons were privileged SELECT-only operations in project `glikrmmgirilnmamxxyl`. No Auth/member/role updates, migration, backup export, model/embedding calls, deployment, version change or production Live RPC test occurred. The local test harness uses invented identifiers and data in an in-memory database.

## 1. Current identity schema and cause

| Object | Relevant fields and constraints | Meaning |
|---|---|---|
| `auth.users` | `id` UUID; `email`; `email_confirmed_at`; `email_change`; `deleted_at`; `banned_until`; `is_anonymous` | Auth identity and current matching eligibility. Passwords/tokens are not selected. |
| `public.members` | `id` UUID; `email`; `is_active_member` | Operational member identity. Email is not unique after normalization. |
| `public.user_roles` | `id` UUID PK; nullable `user_id` UUID UNIQUE; nullable `member_id` UUID; non-null `role` text default `player`; `created_at`, `updated_at` timestamptz | Combined account link and effective application role. |
| Role FK | `user_id → auth.users.id ON DELETE CASCADE`; `member_id → members.id ON DELETE SET NULL` | Auth/member removal can remove/detach a relationship. |

Member ID has a nonunique index. There is no production trigger on Auth users, members or role rows to establish links. There is no inbound FK referencing `user_roles` row IDs. Production has **121 role rows: 40 fully linked, 1 Auth-only, 80 member-only**. No member currently has multiple role rows or multiple distinct role values. Members total 1,951.

The live lookup requires `user_roles.user_id = verified actor ID`, a non-null member link, an active member and an allowed role. It correctly denies the split acceptance identity before season/rating access. Existing dashboard/admin identity helpers can instead resolve normalized email to a member and its role. That legacy behavior explains why normal manager screens work while Live LMS denies the same account.

This is an incomplete account-infrastructure invariant, not established corruption. Nullable link columns plus independent account/member role writers allow the split. Current code demonstrates mechanisms that can preserve or create incomplete relationships; there is no authoritative historical audit proving which workflow created the two May 9 acceptance rows. Do not attribute those historical writes to a particular person or import without evidence.

## 2. Exclusive production classification

Snapshot: **2026-09-07 13:45:26 UTC** (09:45:26 America/New_York). All **172 Auth accounts** classified exactly once. [Exact read-only query and protected manual-review projection](lms-0723-identity-classification-query.md). Email normalization is only `lower(btrim(email))`; no fuzzy/name/alias/plus/dot transformation. Count all matching member rows, including inactive rows, to avoid choosing among duplicate identities.

| Category | Count | Disposition |
|---|---:|---|
| A — complete, link and unique matching member agree | 39 | No mutation. |
| B — unique safe existing member-role row | 14 | Link its null `user_id`; preserve member, role and row ID. |
| C — unique safe identical-role split | 1 | Acceptance account; narrowly audited consolidation proposed below. |
| D — no member match after preceding safety gates | 0 | None in this exclusive bucket. |
| E — duplicate match after preceding safety gates | 0 | None currently matched by an eligible Auth account. |
| F — existing-link discrepancy/conflict | 2 | No automatic reassignment. |
| G — unusable/unverified Auth matching state | 8 | No automatic link; verification/review needed. |
| H — inactive matching member | 1 | Membership-state review; do not activate the member. |
| H — no existing role authority row | 107 | Identity candidate exists, but role provisioning is a separate policy decision. |
| **Total** | **172** | **15 eligible link-only repairs; 39 no-op; 118 held for review/policy.** |

The previously reported **40 structurally complete / 132 incomplete** remains correct. One of those 40 has a normalized email disagreement and is conservatively held in F rather than presumed wrong and relinked. Email changes do not invalidate durable identity: investigate that discrepancy; never overwrite the immutable link simply because email differs. The other F case is an incomplete account whose candidate member is already linked to another Auth user.

Of the **132 incomplete**, **15** are eligible under this proposal and **117** remain held. The **118 overall held** includes the structurally complete discrepancy. Within the held population, **107 need a role-provisioning policy decision**, while **11 need identity/account-state review**. Do not describe all 118 as proven identity conflicts.

There is one no-member email match in the full population, but that account is unconfirmed and therefore classified G first. There are nine unconfirmed Auth accounts overall; one already has an existing durable link, so only eight enter G. No pending email changes were present. One duplicate normalized member-email group exists overall but is not a candidate for these Auth accounts. No duplicate normalized Auth-email group or member bound to multiple Auth users was found.

Classification precedence: existing durable link agreement/disagreement first; unusable/unconfirmed/deleted/banned/anonymous/pending-change state; zero/multiple email matches; competing Auth binding; inactive member; multiple or incompatible role rows; safe existing-role link or equal-role split; absent role authority/manual. This keeps buckets exclusive without hiding the underlying no-match counts.

### The 107 implicit-Player accounts

Existing browser helpers default an absent role to Player. That suggests a future bounded **explicit Player provisioning** policy could safely cover much of this cohort, but writing a new authorization row is more than repairing an existing link. This pass does not silently authorize 107 new role rows. Recommend owner review of one cohort policy rather than 107 redundant individual approvals: verified unique active member + no existing role anywhere → create a durable Player role, if that baseline is explicitly accepted. Until then, the proposed maintenance SQL rejects `no_existing_role_authority`. No promotion or inference of Captain/Pro/Manager status.

## 3. Acceptance account and exact row behavior

Aliases used to avoid exporting personal identifiers: A1 = verified Auth identity, M1 = unique active member, R1 = Auth-only Commissioner row, R2 = member-only Commissioner row. Confirmed exact normalized email matches one member and one Auth user; no competing binding. Both roles are Commissioner.

**New compatibility finding:** merely updating `R1.member_id = M1` while retaining R2 would create two rows for M1. Existing `members/[id]`, team Captain/Pro assignment, and location Pro assignment use `.eq('member_id',...).maybeSingle()`. That would break their single-row assumption. The earlier diagnosis's tentative update-only suggestion is superseded by this design finding.

Proposed C repair, only when all guards pass:

1. Snapshot both role rows in the protected audit transaction.
2. Delete R2 only after proving it is the sole member-only row, its role exactly equals R1, and no FK references role-row IDs.
3. Set R1.member_id to M1, retaining R1.id, A1, Commissioner and created_at; update updated_at truthfully.
4. Append before/after audit and commit together. No intermediate state is visible to other transactions.

This consolidation is required to preserve existing single-role readers, not for tidiness. Commissioner authorization is preserved; no distinct role is discarded. If either role differs or references appear, STOP that candidate. This deletion is **proposed only**, subject to owner review.

For B, set the existing member row's user_id; no row deletion or role changes. An Auth-only row with no member role can receive member_id after the same guards, but there are zero current candidates of that shape. Already correct links are no-op. Missing roles, ambiguous identities and distinct-role splits are rejected.

## 4. Post-link SELF_RATING readiness

Read-only production check confirms two active seasons:

| Active season | Acceptance member's Season DUPR state |
|---|---|
| 2026 Fall Season | No rating row |
| 26/27 Saturday Season | Row exists, `season_dupr_rating` is NULL |

Neither supports returning a numeric Season DUPR or asserting NR. The field is numeric; NR in another text rating field is not a substitute. Active flags, not date/name heuristics, govern current season choices.

Synthetic reproduction uses the deployed live migration and session correction. Before the simulated repair: `denied`. After: `SELF_RATING` reaches the two-season `ambiguous` choice response; choosing either gives `missing` with null value. Commissioner role remains unchanged, the member has exactly one role row, an unauthorized ordinary-player lookup remains denied, and rollback restores the original split and removes the uncommitted audit event. No actual production rating values were copied into the fixture.

This proves the database path, not a new live browser acceptance pass. Existing `getUser(token)` already passed the prior deployed test; the local test does not pretend to contact Auth. After an approved real repair, first retest must verify the season choice and truthful missing-data response, not insist on a nonexistent rating.

## 5. Multiple roles and current writers

The current schema cannot place the same `user_id` on multiple role rows because it is UNIQUE. The application uses one effective role, hierarchical upgrades, and separate team/roster relationships; it is not a normalized many-to-many role-assignment model. Preserve all distinct role rows if encountered and stop for role-model review. Do not choose the highest role and delete the others; do not remove UNIQUE(user_id) or redesign RBAC in this repair.

| Current workflow | Observed behavior / prospective correction |
|---|---|
| `app/api/member-password-reset-check/route.js` | Finds Auth by normalized email or invites it, then updates member-role rows whose user_id is null. `linkUserRoles` ignores returned update errors, inserts nothing if no role exists, and can hit UNIQUE(user_id) on a split. Do not use this route as a dry-run tool: it sends email and writes links. Check errors and replace ad hoc linking with reviewed reconciliation after verified-email eligibility. A newly invited, unconfirmed account must remain pending. |
| `app/member-import/page.js` | Inserts/updates member data and import audit records; no durable Auth reconciliation. Import completion/member-email changes should enqueue reconciliation, never rebind an already linked member by changed email. Import audit tables are import-specific, unsuitable as a general identity audit. |
| `app/members/page.js` | Member creation can insert a member-bound role with user_id null; role correction changes existing roles. Preserve those roles and last-Commissioner protections. Trigger/retry safe link after creation; no role inference from team names. |
| `app/members/[id]/page.js` | Reads member role with maybeSingle; updates role or inserts member-only row. Keep existing immutable link on a role change; reconcile only null links. |
| `app/teams/page.js` | Captain/Co-Captain/Pro workflows upgrade a single role or insert member-only role. Use atomic existing-role update/link handling; never create a second canonical role row after reconciliation. |
| `app/locations/page.js` | Similar Pro-role helper, including maybeSingle. Same safeguard. |
| `app/lib/auth.js`, `memberLookup.js`, `serverSupabase.js`, login/role guards | Legacy email-based display/admin resolution and default Player explain the discrepancy. Do not add any such fallback to live RPC authorization. |
| `app/api/admin/delete-member/route.js` | Authorized inactive-member deletion can clean linked Auth accounts; preserve last-Commissioner checks, FK semantics and separate cleanup. Identity audit must survive deletion without cascade. |

No general signup/createUser implementation or identity-link Auth trigger was found beyond the invite/recovery path. This is a code-inventory finding, not proof that historical accounts were created only through that path; dashboard/admin/manual Auth creation remains possible.

## 6. Repair architecture, atomicity and concurrency

Recommend a restricted **database-owner maintenance operation plus private audit** for the initial backlog, then separately reviewed prospective account infrastructure. It avoids an unrestricted identity editor or a browser-callable repair RPC. [Exact SQL proposal](lms-0723-identity-repair-sql-proposal.md) includes object creation, explicit default-grant revocation and the guarded operation. It is documentation only, not an executable migration in the app's migration directory.

Use one reviewed identity per transaction. Re-read confirmed current Auth state, exact uniqueness across all Auth/member rows, active membership, role state, FK references and competing bindings immediately before mutation. Manifest candidate IDs are expectations, not authority to bypass guards. Complete identities are no-op; immutable links are not rewritten on email changes.

Because existing writers do not take reconciliation advisory locks, advisory locks alone cannot exclude a new duplicate email/role row. The maintenance proposal takes **brief** SHARE table locks on Auth users/members and SHARE ROW EXCLUSIVE on user_roles, in a fixed order, then row locks. This closes those phantom races without changing existing writers during the dry-run design. It never locks teams/rosters/matches. A 1.5-second lock timeout and 5-second statement timeout cause rollback/reclassification/retry rather than holding registration hostage. Commit immediately per identity; no human pause inside a transaction. These locks can briefly delay account/member/role writes; normal team registration must remain open. If contention makes this impractical, stop and redesign with coordinated writer locking before approving bulk execution—do not silently weaken uniqueness checks.

Real multi-session contention, lock timeout and deadlock/retry behavior still need an isolated PostgreSQL test before production application; the in-memory simulation does not claim to prove concurrent sessions. Role changes before lock acquisition are re-read; changes after acquisition wait. If a role changed to a distinct value, split consolidation rejects it. After commit, normal authorized role changes remain legitimate activity. New duplicates created later by legacy code are a prospective prevention concern, not justification for runtime email fallback.

## 7. Audit, manual review, security and reversal

No existing general-purpose identity audit was found. AI/Stage 7 events, Live access audit, notification history, tournament/round-robin activity and import batches are purpose-specific; do not put identity mappings into them. Add the proposed private events table: operation, database timestamp, run, authorizing actor, database operator, Auth/member UUIDs, method, and role-row before/after states. No email/name/password/token/rating copies. No FK cascades that erase historical identity repair evidence.

The new private schema is not exposed through PostgREST. RLS enabled, no browser policies, explicit REVOKE for PUBLIC/anon/authenticated/service_role on schema/table/function regardless of defaults. SECURITY INVOKER and empty search_path; only database owner can run maintenance. No existing user_roles or Auth privileges/RLS/functions are changed. Existing user_roles authenticated read policy and Commissioner-only writes remain as-is; the repair does not widen them. No direct auth.sessions access or custom session reader is restored.

Use a protected on-demand SQL report of held category + Auth/member/role UUIDs for authorized manual review; do not commit a list of 172 people. F: inspect existing binding history before reassignment, never auto-unlink. G: verified-email/account recovery process, not a synthetic verification bypass. H inactive: membership decision. H absent role: cohort Player-provisioning policy. D/E when present: correct authoritative member data only with separate owner approval. Retain category/reason counts and run time, not personal payloads, in public project docs.

Before future mutation, obtain a fresh exact manifest of 15 currently eligible role-row changes, protected pre-change snapshots and a database recovery point under normal operational backup procedures. None was exported here. Audit stores per-row rollback mapping within the same commit. Proposed retention: keep repair provenance for the account/member lifecycle plus one year after closure, subject to owner retention approval; secure backup copies follow existing backup policy, never a repository file.

Rollback is guarded maintenance, not a blanket snapshot restore: lock the same objects; compare current affected rows exactly with recorded after_rows, confirm no new conflicting role/identity/FK state, and restore only that event's before_rows (including R2's original ID/timestamps for the split). Remove a newly completed binding before restoring its previous state to respect UNIQUE(user_id). Append a `rollback` event with the same run linkage; never delete the original event. If intervening legitimate edits exist, STOP for a reviewed compensating change. Do not roll back teams, member edits, registrations or unrelated identities. A production rollback implementation must be validated with the final approved SQL; the current harness proves transaction rollback before commit only.

## 8. Prospective prevention

Put reconciliation in ordinary account/member infrastructure, never in AI routing. Account-first: after email is confirmed, server-verified account setup calls a restricted self-only reconciliation operation; no member match means pending, not fabricated membership. Member-first: import/create and role-assignment completion schedules an authenticated server maintenance job to reconcile existing verified accounts. A small retry queue/job may handle ordering races, but must use the same guarded idempotent operation and surface only ambiguous cases to authorized management.

Do not make password reset email delivery depend on successful linking, but do inspect errors and record a sanitized actionable pending state. Confirmed current email only, no invitation-time auto-link; no browser-supplied target member. Existing complete links are stable across email edits. A no-role account requires the separately approved explicit Player policy. All current member-role writers must avoid a second canonical row and preserve existing user_id/member_id during role updates. Existing Commissioner/Manager authorization, last-Commissioner guard and Captain relationships remain intact.

For a future online reconciler, review a separate narrow server-only wrapper/definer operation, immutable server-verified requester, schema access, defaults and minimal grants. Do not grant this owner maintenance function broadly, and do not move matching into runtime Live authorization. Both directions must share a locking/uniqueness protocol before replacing the brief maintenance table locks. No prospective code implemented here.

Likely future files: recovery-check route; member create/import/edit flows; team/location role helpers; a shared server reconciliation service; the smallest new private audit/maintenance migration; associated database/account tests. No Live lookup/answer-model/corpus/HMAC/Stage 7 changes should be needed. Read local Next.js docs before subsequent app edits.

## 9. Validation and exact recommended sequence

**Executed locally:** `node scripts/lms0723-identity-design-dry-run.mjs` — **30 checks passed**, no network/production connection. It runs the SQL from the proposal document against synthetic PGlite schema plus deployed live migrations. Covers A no-op, B both link shapes, C consolidation, exact case/space matching, mismatched links, member competition, missing/unconfirmed/pending email, inactive member, no role, duplicate members, different/multiple roles, role preservation, idempotence/audit count, audit-failure rollback, browser/service denial, SELF_RATING season/missing states, ordinary-player cross-player denial and transaction rollback. Syntax/execution of proposed SQL passed in that environment.

**Still required before implementation approval/deployment:** real PostgreSQL concurrent writers/timeout/retry; duplicated Auth email; deleted/banned/anonymous states; changed/added role FK; prospective invite/verification/member-first/account-first races; alias/plus non-equivalence; all current role-assignment and last-Commissioner UI controls; committed guarded rollback; effective grants under production-like defaults; existing ACL/schema/operational-integrity comparisons. Preserve all 638 existing LMS-0723 regression checks. Run full app lint/types/PDF verification/tests/build only when app implementation is authorized; none is claimed rerun for this documentation-only pass.

1. Owner reviews this design, especially identical-row consolidation, brief locking, audit retention and the separate 107-account default-Player policy. Stay LMS-0723 / 0.1.545.
2. Implement only the approved account infrastructure and exact security-reviewed migration; complete isolated effective-permission, concurrency, rollback and existing regression tests. No production changes until authorized.
3. Read-only preflight: verify correct project; current classification; schema/ACL/FK/object-name state; legitimate ongoing registration provenance. Rebuild the exact eligible manifest; do not insist old mutable counts remain identical.
4. Create protected affected-row backup/recovery point, with access and retention controls. Review exact row IDs/change counts out of public docs.
5. Apply new audit/maintenance objects only after approval; never reapply the existing Live/session migrations. Verify effective permissions including production defaults and no browser/service access.
6. Execute **acceptance account only** in its short guarded transaction; verify one durable Commissioner row, audit mapping and unchanged operational/AI data. Stop on any discrepancy.
7. Owner-authorized production SELF_RATING test: season clarification, then truthful unavailable rating for the selected season. Verify no answer model, no identity/rating payload in Stage 7, no role broadening. Stop if unexpected.
8. Process the remaining freshly eligible 14 existing-role candidates, one identity at a time, with exact pre/post/audit checks. Reclassify stale/conflicting candidates, never force them through. Held accounts remain untouched.
9. Deploy reviewed prospective infrastructure through the normal pipeline if separately authorized; verify both account ordering paths using isolated tests and legitimate production activity only. Do not create fake members/rosters.
10. Resume the previously approved LMS-0723 acceptance sequence at its stop point. Preserve roster/match seasonal deferrals and legitimate team registration. Production acceptance remains withheld until all currently testable gates pass and limitations are explicitly recorded.

No repair, backup export, deployment, version change, auth mutation, member/role mutation or next phase was performed. **Stop for review.**
