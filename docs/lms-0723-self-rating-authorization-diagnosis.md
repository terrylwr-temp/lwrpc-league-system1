# LMS-0723 self-rating authorization diagnosis — read-only

2026-09-07. **Primary root cause: fragmented Auth-user/member identity linkage in production user_roles.** LMS-0723 / 0.1.545 remains deployed, NOT production accepted. Diagnosis only; no SQL/function/grant/RLS change, linking, member update, deployment, rollback, model or embedding call.

The acceptance identity is represented below as A1 (Auth account), M1 (member), R1 (Auth-bound role row) and R2 (member-bound role row). These are report aliases, not stored identifiers. No rating values, email addresses or raw auth/member UUIDs are included.

## 1. Authentication result — PASS

The existing outcome 541109b7-3f52-49bc-84ac-ce410c44dc5e at 2026-09-07 13:29:22.795 UTC reports LIVE_LMS_DATA / SELF_RATING / denied, not an authentication failure. Deployed commit a2d4af0 calls `authenticateRequestIdentity`, awaits online `getUser(token)`, validates the returned immutable ID and token consistency, and only then constructs the server database client. Authentication failure cannot produce this RPC result: it returns sanitized 401/503 before runLive.

Thus the failed request passed getUser and established a non-null verified Auth ID. This conclusion follows from the deployed control flow plus its actual outcome, not a newly captured JWT or a replay. No token/session was read for diagnosis. The still-signed-in profile identifies the same acceptance member and Commissioner role; a targeted read-only email correlation found exactly one matching Auth account and one member. The Auth account's email is confirmed. Full Auth objects were not retrieved.

## 2. Subject and capability — PASS

Exact raw question: `What is my Season DUPR?`. No prior context survived the deployment reload. Local read-only execution of the deployed deterministic parser returns:

`{intent: SELF_RATING, subjectKind: SELF, rating: season}`

No name, explicit-person, ambiguous subject, team or season identifier is supplied. No person-name resolution is required. The server passes named RPC parameters `p_actor: principal.user.id`, a generated p_request and the allowlisted p_query. Production function arguments are `p_actor uuid, p_request uuid, p_query jsonb`; no ordering/member-ID substitution was found. Browser actor/member/role fields cannot replace p_actor.

## 3. Auth-user → LMS-member mapping — FAIL

Read-only targeted production results:

| Record | Auth user binding | Member binding | Role/status |
|---|---|---|---|
| A1 | One confirmed Auth account matching the profile member email | No complete user_roles path to M1 | Auth account exists |
| M1 | No complete user_roles path from A1 | One member matching the signed-in profile | is_active_member = true |
| R1 | A1 | **NULL** | commissioner; created 2026-05-09 01:18:45.921258 UTC |
| R2 | **NULL** | M1 | commissioner; created 2026-05-09 11:37:32.491574 UTC |

There is exactly one user_roles row for A1, but its member_id is NULL. The active profile member has a separate role row whose user_id is NULL. Neither row satisfies the required complete immutable relationship. These rows predate LMS-0723; why the legacy workflows originally created separate rows has not been inferred from timestamps alone.

The user-ID column is UNIQUE, so an UPDATE that simply puts A1 into R2 would collide with R1. A one-sided email backfill is therefore not a safe universal repair. No mapping was modified.

## 4. Current-season result — NOT REACHED

The production request denied before season resolution. No season was selected and no current-season lookup caused this denial.

Read-only diagnostic inventory finds two authoritative `is_active = true` seasons:

- 2026 Fall Season
- 26/27 Saturday Season

The existing SELF_RATING logic uses these flags, not today's date, and clarifies when multiple active seasons exist without an already validated choice. Once the identity link is repaired, the expected first response for this question is therefore a season choice, not an invented default or numeric rating. A valid selection must be carried in the encrypted context and reauthorized.

## 5. Rating row and field — SEPARATE MISSING-DATA CONDITIONS

Diagnostic reads used counts and null/non-null classifications only for M1; no rating values were selected into the report.

| Active season | M1 rating rows | Requested Season DUPR |
|---|---:|---|
| 2026 Fall Season | 0 | No rating row |
| 26/27 Saturday Season | 1 | season_dupr_rating is NULL |

These are respectively B (authorized member but no row, after linking) and C (row exists, requested field NULL), not the cause of today's authorization denial. There is no evidence of a wrong season/member key. After linking and season selection, existing logic should return `missing` for either current state.

The requested field is precisely `member_season_ratings.season_dupr_rating` (numeric), filtered by target member ID and authorized season ID. PrimeTime uses the separate numeric `season_primetime_rating`. `dupr_doubles_rating` is text and is not substituted. Current/official DUPR remains unsupported by this Phase 1 capability.

Neither numeric Season field can itself store the literal NR. Do not label NULL as NR or borrow NR from the official/imported field. A future explicit NR representation requires an authoritative data contract; this diagnosis proposes no such schema or behavior change. Tests should preserve truthful missing behavior when Season DUPR is NULL, even when another rating field contains NR.

## 6. Exact failing database branch

In `ai_live_private.lookup`, after the non-null p_actor guard:

```sql
select u.member_id,u.role into v_member,v_role
from public.user_roles u
join public.members m on m.id=u.member_id
where u.user_id=p_actor
  and m.is_active_member is true
  and u.role in ('player','captain','club_pro','league_manager','commissioner')
for share of u,m;
```

For A1, R1.member_id is NULL, so the INNER JOIN produces zero rows. R2 cannot substitute because its user_id is NULL. A diagnostic SELECT reproducing these predicates returned **zero matching rows**.

The exact resulting denial is:

```sql
if v_member is null then
  return jsonb_build_object('status','denied');
end if;
```

This occurs before the subject guards, rate-budget attempt insert, population resolution, active-season resolution and rating query. Private attempt count remains zero, corroborating the early return. The public wrapper returns the denied result unchanged. No privileged lookup RPC was executed during diagnosis because it can write attempts/audit.

M1 is active; commissioner is explicitly allowed. SELF_RATING does not require Captain status, roster membership or season participation. No archived/deleted-status predicate was found in this entry gate. Empty rosters/matches are unrelated.

## 7. Existing application identity comparison

The signed-in dashboard/profile shows M1 and Commissioner. The existing browser auth/member helpers (`auth.js`, `memberLookup.js`) identify a member through the authenticated user's email and read roles by member relationship. The legacy server `authorizeAdminRequest` likewise calls getUser, then queries members by email and combines attached role rows. This can find M1/R2 even though R2 has no user_id.

Live Intelligence intentionally queries user_roles by immutable Auth user ID, which finds R1 but cannot join a member. This is the previously identified **email-based application identity versus incomplete user-ID-based database identity mismatch**. The live denial is correct for the incomplete link; the owner being recognized by another screen does not justify bypassing it.

## 8. Player-facing denial mapping

The database returns exactly `status: denied`. It does not return requester_not_mapped, rating_not_found or season_not_found and then lose that distinction in the UI. `liveMessage` maps denied to `I can't access that player information for your account.` The server records protected/denied with unresolved relationship.

That common denial is privacy-safe but unhelpful for a SELF identity-link problem. A separately approved bounded classification such as requester_not_mapped could give SELF a generic account-link/support message, with sanitized diagnostics distinguishing a missing mapping from missing rating. It must never expose whether an inaccessible named player exists. This message refinement is optional and not necessary to repair the underlying data link; no message change was made.

## 9. Primary root cause and exclusions

**A1 has an Auth-bound Commissioner role row without a member_id; M1 has a separate member-bound Commissioner role row without a user_id. The complete immutable link required by the INNER JOIN does not exist.**

This is not failed getUser, a token timeout, an argument-order error, a wrong rating type, an inactive acceptance member, a Captain-only restriction, a season-resolution failure, a missing rating causing denied, a roster shortage or a session-reader regression. Season ambiguity and missing ratings are real subsequent states, but they were not reached.

## 10. Production identity scope — counts only

Snapshot counts can change with legitimate account/registration activity:

| Classification | Count |
|---|---:|
| Auth accounts | 172 |
| Complete member links | 40 |
| Complete active/allowed live mappings | 40 |
| Auth accounts without complete member link | 132 |
| Auth accounts matching exactly one normalized member email | 171 |
| Auth accounts matching no member email | 1 |
| Auth accounts matching multiple member emails | 0 |
| Duplicate normalized Auth-email accounts | 0 |
| Duplicate normalized member-email groups | 1 |
| Total user_roles rows | 121 |
| Fully bound user_roles rows | 40 |
| Auth-only role rows | 1 |
| Member-only role rows | 80 |
| Unlinked unique-email candidates | 131 |
| Unlinked confirmed unique-email candidates | 124 |
| Active, confirmed unique-email candidates | 123 |
| Unique-email unlinked candidates with member role rows | 17 |
| Unique-email unlinked candidates without member role rows | 114 |
| Candidate member already linked to another Auth account | 1 |

These are diagnostic candidate counts, **not an approved backfill set**. The duplicate member-email group does not currently match an Auth account. Not every Auth account has a member, not every matching member has a role, and one potential target already has another Auth binding. Do not automatically grant roles to the 114 candidates without member role rows or overwrite the conflicting binding. The 132 missing links describe current live eligibility, not proof that all 132 should be authorized.

## 11. Smallest safe correction

For the acceptance blocker, recommend a **bounded identity-link data correction**: complete R1.member_id with verified M1, preserving R1.user_id and existing commissioner role. Leave R2 untouched initially; it is a legacy member-role row with the same role and need not be deleted to establish the immutable relationship. Do not write A1 into R2 while R1 already owns that unique user_id. This target-specific correction does not require changing live function logic, RLS or grants.

Before any update, a protected transaction must lock/recheck the exact reviewed rows, verify confirmed A1, one active M1, one normalized email match on both sides, matching existing role, NULL R1.member_id, and no M1 binding to another Auth account. Abort on any difference. Update exactly the reviewed Auth-bound role row and verify one affected row. Record the change through the approved administrative audit/change process without publishing identity manifests or credentials. Email is evidence for this reviewed one-time link; it must not become the runtime authorization key.

For broader adoption, separately approve a reconciled candidate plan: preserve existing verified links; quarantine duplicates/conflicts/unconfirmed accounts; distinguish filling a missing field from creating a new role assignment. Explicitly review elevated roles. Never choose the highest role across competing records or infer player access solely from an email match. Establish how legitimate future accounts acquire immutable linkage through the existing account-provisioning workflow, with owner-reviewed roles and conflict handling. Do not add an automatic email fallback at query time.

## 12. Migration and data implications

Immediate fix: one controlled user_roles relationship update, subject to the checks above. No application/function correction or structural migration is inherently required for this specific account. A generic one-time linking migration would be a larger separately reviewed data operation, not the same as this targeted fix. The known UNIQUE(user_id), nullable member_id and member/Auth FKs must remain intact. No original or corrective LMS-0723 migration should be reapplied.

No live permissions are widened: the existing Commissioner identity is connected to its verified member; future access still passes current database relationship checks. Other affected identities must not be silently fixed as part of the acceptance-account correction. No source/corpus/feedback/Stage 7 mutation is needed.

## 13. Regression plan

- Reproduce split R1/R2 fixtures: before linking, SELF denies before rating read; after reviewed linking, same unchanged function succeeds or clarifies season.
- Valid linked self with Season value: return only that value and correct season/type; do not read requester contact or other rating fields.
- Zero rating row vs existing NULL field: both authorized missing data, never denied; text NR in another field must not substitute for Season DUPR.
- Multiple active seasons: deterministic choices; selection/refetch uses authoritative active flags, not date guesses.
- Missing/inactive member, unconfirmed/duplicate email candidates, conflicting role/binding or changed row during repair: data correction aborts; runtime remains fail-closed.
- Mapping correction re-run: deliberate already-linked/no-op result or guarded abort; never create duplicate user/role mappings or overwrite another account.
- Signed-out/invalid token: 401 before live lookup; auth timeout/unavailable: bounded 503; forged body requester never controls p_actor.
- Named authorized person retains its target; unauthorized/nonexistent person remains privacy-safe; explicit failure never returns SELF.
- Role/roster relationship removal takes effect next request; receipts cannot cache authorization; cross-user/session replay rejected.
- Preserve six-capability projections, zero-model/embedding spies, sanitized telemetry, feedback and document regressions.

## 14. Production continuation recommendation

Stop for review now. After explicit approval of the bounded acceptance-account link, repeat target-only read-only predicates, execute the guarded data correction, and verify the immutable link without displaying private fields. No deployment should be necessary if only the data link is corrected.

First retest remains `What is my Season DUPR?`. Given current authoritative state, expect active-season clarification, then truthful missing-data response for the selected season unless legitimate rating data has since changed. Do not require or manufacture a numeric result. Verify LIVE LMS DATA, sanitized capture, zero model/embedding and current field scope. If it fails, stop.

Only then resume the remaining controlled acceptance gates. Captain/Co-Captain roster and match tests remain deferred until legitimate data exists; no artificial relationships. Concurrent owner registrations are expected. Preserve the original denied outcome exactly. Actual logout replay retains its separately accepted limitation if unsafe/unavailable. LMS-0723 remains NOT production accepted until all testable gates pass. No new version or phase.

## Evidence limits and actions

Evidence combines the preserved denied outcome, deployed/local matching control flow, current signed-in profile, targeted immutable-link predicate queries and aggregate identity/rating-row metadata. No new production Ask request, protected lookup RPC, live feedback or acceptance event was generated. We did not extract a token or add identity data to historical telemetry. Authentication identity was established by the existing request's mandatory getUser path and uniquely correlated profile/account, not by replaying the original token. Current metadata establishes the exact missing link; the legacy cause of the two May role-row creations is not attributed without audit evidence.
