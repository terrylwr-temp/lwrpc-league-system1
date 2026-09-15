# LMS-0726 / 0.1.548 — four-blocker resolution

**CONDITIONAL — DESIGN ONLY; STOP FOR REVIEW.** No application implementation, SQL mutation, deployment, deletion or OpenAI calls. Read-only queries inspected current configuration, official Rules and catalog metadata; no member contact/rating records or live mutation probes. This report supersedes conflicting details in the previous atomic gate. Production remains accepted 0.1.547.

## 1. Authoritative admission mapping and conflict result

The [complete admission matrix](lms-0726-authoritative-admission-matrix.md) covers every current configured division, every requested condition, its database representation and season/league/division scope. [Current metadata](lms-0726-four-blockers-evidence.json) and [active Rules/ACL evidence](lms-0726-four-blockers-rules-acl.json) are preserved. Active Rules version remains `v20260908162017-f0aad5ad`. The [owner PT9 resolution](lms-0726-pt9-owner-resolution.md) updates the historical snapshot and closes that discrepancy.

Read-only findings:

- 18 active divisions, three active leagues, two active seasons. All three leagues currently have rosters_locked=true; the existing manager exception remains operationally relevant.
- Weekday and Saturday min/max values correspond to the Rules only when comparing properly truncated Season DUPR. This does not independently prove Rated classification or the freeze/adjustment provenance of a numeric rating.
- **MPT 9 and WPT 9 discrepancy CLOSED:** after intentional owner administration, read-only verification returned 3.4–4.8 for both. Owner approved that normalized Season DUPR representation of current Rules 3.4–4.899. No precision change or continued conflict hold for this resolved discrepancy. Future PT9 table entries must not replace the current entry. See [owner resolution](lms-0726-pt9-owner-resolution.md).
- Weekday/Saturday home-only=true cannot encode the full Rule3.5 cross-community exception. An affected decision must hold instead of silently rejecting solely on location inequality or silently overriding the setting.
- Membership/waiver status fields exist, but full authoritative verification semantics are not established. Age, season-start community, roster availability, policy-bound NR treatment and several eligibility facts lack safe structured representation.

**Final behavior:** an established applicable conflict returns `POLICY_CONFIGURATION_CONFLICT`, no insert. Missing required fact or missing verified policy mapping returns `REVIEW_REQUIRED`, no insert. These are distinct from `NOT_ELIGIBLE`, which requires a conclusive fact under a verified applicable rule. Return safe categories only. No pending roster record, raw RF, contact, DOB or candidate evidence payload.

A mutation must not interpret document chunks or reproduce threshold/age/NR constants independently in SQL. Proposed minimum missing object is a private versioned policy binding to existing season/league/division configuration and active Rules version, with requirement stage, authoritative source, VERIFIED/UNMAPPED/CONFLICT status and configuration revision/hash. Existing min/max values remain in divisions, not a duplicate table. A trusted configuration workflow must invalidate/review the binding when relevant configuration or Rules change. Automatic NR/age decisions would additionally require approved structured semantics and facts; absent those, hold. This missing schema is explicitly a design decision, not disguised as an already available field.

**Correction to the prior report:** Rule4.5.1 describes NR adjustment for aggregate calculations. A missing pair adjustment must not itself block Add when it is required only for future Match Setup. An independently unresolved required individual-placement classification may still hold admission. Pair sums and actual lineup composition are never Add prerequisites.

## 2. Exact lineup boundary and minimum correction

Current boundary: `lwrpc-admin/app/api/match-lineups/route.js`, POST, called by `app/captain-dashboard/page.js` around 2192. It rejects View-As, validates normal Auth, resolves match side and assigned team, checks roster membership, loads season ratings, compares individual bounds and pair maximum, rejects duplicate players by team type, then service-role upserts `match_lineups`.

| Lineup condition | Current server enforcement | Required bounded correction |
|---|---|---|
| Match/team identity | Team must be home/away | Repeat within transaction, bind league/division/season consistently |
| Requester | Current role/assignment read | Locked current identity and exact team authority; no location-only write inference |
| Roster | Selected IDs checked on target roster | Lock/revalidate at save; removal race must serialize |
| Season rating | Selected season numeric rating queried; self-rating branch exists | Read configured type; no browser rating; verified NR/season policy, no numeric-implies-Rated inference |
| Individual limits | Current numeric min/max independently checked | Policy/config conflict check and official NR/season exceptions from trusted structured configuration |
| Pair maximum | Numeric pair sum compared with team_dupr_max | Keep LINEUP-only; use authoritative applicable NR aggregate value, not raw numeric shortcut |
| Missing numeric rating | Current divisionRatingIssue rejects | Preserve refusal; broaden safely to required unknown classification only under reviewed workflow |
| Line shape | Positive line and two distinct players | Also reject line outside configured primary/secondary blocks; current fallback type accepts out-of-range line numbers |
| Duplicate player | Per computed team type | Preserve intended mixed/gender reuse; validate actual configured blocks |
| Gender/age/participation | No complete authoritative proof | Do not certify from names or ratings; required unrepresented facts need review outcome |
| Save | Separate validate then upsert | One locked transaction; no side effects before commit |

Proposed `public.lms_match_setup_save(p_actor uuid,p_match uuid,p_team uuid,p_lineups jsonb,p_request uuid) RETURNS jsonb`. Typed line/player IDs only; additional rating/NR/eligibility/role fields reject. Saves selected lines with existing upsert semantics, not silently deleting omitted lines. Idempotent operation receipt includes a canonical payload hash. Existing Captain Dashboard notification is currently sent separately after save (around 2225); bind it to committed save identity and preserve recipients/preferences server-side.

Required unknown lineup facts have no established general League review workflow in current code. **Owner decision still needed:** proposed `LINEUP_REVIEW_REQUIRED`, no save, preserve last saved lineup and ask League Management to resolve the missing requirement. This is a proposal, not a new forfeiture, approval override, pending queue or silently adopted workflow. Known invalid lineup returns `LINEUP_NOT_ELIGIBLE`; conflict returns `POLICY_CONFIGURATION_CONFLICT`; successful save returns `SAVED`; expected auth/resource errors remain bounded.

W145/W146 are manager schedule regeneration's lineup/line reset in `app/scoring/page.js`, not Remove Player. Proposed `public.lms_match_setup_reset(p_actor uuid,p_match uuid,p_request uuid) RETURNS jsonb`, manager-only; clear that match's saved lineups/lines in the same transaction as parent regeneration/edit. Do not expose unrestricted clear via empty save payload. This resolves the earlier unidentified clear boundary.

## 3. Protected locking and privilege footprint

No broad UPDATE grants to browser, read executor or normal business writer for locks. Proposed three private helpers perform fixed lock-and-scope validation only:

1. `lms_write_private.lock_roster_add(p_actor uuid,p_team uuid,p_candidate uuid) RETURNS boolean`.
2. `lms_write_private.lock_roster_remove(p_actor uuid,p_team uuid,p_membership uuid) RETURNS boolean`.
3. `lms_write_private.lock_match_setup(p_actor uuid,p_match uuid,p_team uuid) RETURNS boolean` (reset uses null team only after manager authorization).

Each: owner postgres, SECURITY DEFINER, search_path `''`, fully qualified objects, no dynamic table names, no data result, no side effects beyond locks. EXECUTE only by its designated normal business-writer role; PUBLIC/anon/authenticated/View-As/read executor have neither private schema access nor EXECUTE. Normal executor invokes business functions, not helpers. Validate exact input/resource/actor relationship before expensive locking and again after lock acquisition; no general table-reading bypass. Owner privilege is encapsulated in the fixed helper; there is no new business UPDATE privilege footprint.

**Concrete safe baseline for review:** use fixed relation locks inside the short transaction, rather than assuming a team advisory lock protects uncoordinated manager writers. Add locks the following existing tables in this order using SHARE ROW EXCLUSIVE: user_roles, members, seasons, leagues, divisions, locations, teams, member_season_ratings, team_members; also the proposed policy-binding table once defined. Remove locks only user_roles, members, seasons, leagues, divisions, teams, team_members in the same relative order. Lineup locks Add's set then matches and match_lineups (and relevant match_lines when required for reset/history eligibility). Identity/session validity uses the already accepted identity/session coordinator before this common order; final helper implementation must preserve its established ordering. Any extra qualifying-history source must be added to the fixed lock list before claiming that fact authoritative.

These locks conflict with INSERT/UPDATE/DELETE writers, including the 30 retained direct manager paths, and remain held through commit. They also protect absent-row/predicate facts without granting UPDATE or requiring every legacy writer to honor an advisory lock. The helper returns no eligibility facts; business function reads fresh facts **after all locks are acquired**. This is deliberately a conservative design: it briefly blocks unrelated writes on those tables. Reads continue. Bound lock/statement timeouts and test contention; no network/email/PDF/model work under locks. This is not a claim that broad relation locking has zero latency cost.

Use a normal trusted PostgreSQL connection with an explicit **READ COMMITTED** transaction for this baseline, VOLATILE business/helper functions and fresh statements after the locks. This supersedes the earlier unproven SERIALIZABLE-plus-partial-lock proposal. Do not reuse pre-lock snapshots. If an authority/eligibility edit wins the lock first, final validation sees it; if Add holds the locks first, the edit cannot complete until Add commits. “No stale authority” means that serial ordering, not a promise that a later revocation can retroactively cancel a committed authorized operation. Deadlock/timeout aborts the whole operation; bounded retry starts anew with the same request key.

PostgreSQL documents lock conflict/transaction lifetime and READ COMMITTED statement snapshots in its [locking guide](https://www.postgresql.org/docs/17/explicit-locking.html) and [isolation guide](https://www.postgresql.org/docs/17/transaction-iso.html). The exact helper bodies, inherited identity-lock ordering and contention tests still require implementation evidence. If this conservative footprint is unacceptable, a finer-grained protocol must be reviewed rather than silently replacing it with insufficient advisory locks.

## 4. Add and Remove transactions / final outcomes

Add signature remains `public.lms_roster_add_player(p_actor uuid,p_team uuid,p_candidate uuid,p_request uuid) RETURNS jsonb`. Normal server supplies verified actor, browser supplies only team/candidate/request IDs. Begin transaction → authorize → protected Add lock/revalidation → check authorized replay/existing membership → evaluate trusted policy/config and required facts → on PASS insert membership + successful receipt + applicable outbox event → commit → return ADDED. Unique(team_id,member_id) and unique(actor,request) prevent duplicate business events. Review/failure creates neither membership nor added event. Duplicate request/different tuple returns REQUEST_CONFLICT. Replay always rechecks current access before revealing receipt details.

Final Add statuses: `ADDED`, `ALREADY_ON_ROSTER`, `NOT_ELIGIBLE`, `REVIEW_REQUIRED`, `POLICY_CONFIGURATION_CONFLICT`, `NOT_AUTHORIZED`, `INVALID_TEAM`, `INVALID_CANDIDATE`, `REQUEST_CONFLICT`, plus `ROSTER_LOCKED` for the existing operational lock. Contract: status, safe reasonCodes/message, membershipId only when authorized, operationId, replayed, notificationStatus. Notification status is operational state, never protected recipients/evidence.

Remove signature remains `public.lms_roster_remove_player(p_actor uuid,p_team uuid,p_membership uuid,p_request uuid) RETURNS jsonb`. Begin → authorize team → protected Remove lock/revalidation → existing replay/membership and team ownership → current roster lock/manager exception → delete exact membership + committed receipt → commit. **No admission eligibility checks.** An ineligible player can be removed. Concurrent duplicate removal yields one REMOVED and subsequent NOT_ON_ROSTER/replay, not two logical removals.

Final Remove statuses: `REMOVED`, `NOT_ON_ROSTER`, `NOT_AUTHORIZED`, `REMOVAL_NOT_ALLOWED`, `INVALID_TEAM`, `REQUEST_CONFLICT`. REMOVAL_NOT_ALLOWED covers current roster lock outside its manager exception, not newly invented rating or match restrictions. An unrelated membership ID is not a candidate-information oracle.

Current restrictions verified in `app/teams/[id]/page.js:880`: authority/roster lock, confirmation and exact membership deletion. No minimum roster, completed/started match ban, age/rating recheck or general season-date removal ban found. Database FKs show no dependency referencing team_members; match_lineups references members/team/match instead. Preserve member records, saved lineups and historical match lines. Removal can affect future eligibility; later lineup save/score validation must recheck the roster. Do not automatically delete history or invent a new removal prohibition. There is no existing removal notification to add. Both mutations hard-deny View-As even when real actor is Commissioner.

## 5. Existing notification mechanism and minimum persistence

Current Add calls `sendRatingCheckAlert` after insert only for missing ID/rating or raw NR. It sends the existing template to League info through `/api/notifications`; candidate email is unnecessary for that alert. No general added-member notification exists. Holds eliminate missing-required-information successful adds; successful existing NR-alert cases retain their notice. Do not broaden raw-NR alert criteria to all RF-derived classifications without policy direction. Remove has no current notice. Match Setup and flex scheduling do have existing opponent notifications.

`app/lib/notifications.js` directly POSTs to Brevo and reports success/failure. No persistent outbox or business idempotency key was found in that path. Existing Add UI already distinguishes “player added, but email failed”; retain that truthful distinction.

Minimum proposed persistence remains two narrow private tables: successful operation receipts (unique actor/request, fixed operation/resource tuple/hash, committed result) and notification outbox (unique committed operation/event/channel/recipient identity, pending/claimed/sent/failed/ambiguous, attempts and provider ID). Extend the operation identity to lineup events without building a general messaging platform. Persist no raw RF or candidate contact in results; protected delivery data remains server-side. No pending-roster table, no added audit on failure/hold. Existing successful business event and outbox enqueue commit together; sender sees only committed rows.

Use one stable UUID per actual notification event, reused unchanged across retries. Keep message/recipient version stable for retries; don't regenerate different content under the same provider key. A claimed event is not proof it was delivered. Receipt replay never enqueues a new notice. A committed mutation remains successful when delivery fails; return notification pending/failed separately and preserve the existing manual League-contact instruction where applicable.

Brevo's current [idempotency documentation](https://developers.brevo.com/docs/heterogenous-versions-batch-emails) gives a **30-minute** key lifetime and a duplicate response within that window; an older changelog says 15 minutes. Current integration sends no key. Proposed dispatch uses the documented request-body `headers.idempotencyKey`, same event UUID and bounded retries safely within the supported window. A persistent SENT state suppresses replays indefinitely. Ambiguous sends past the provider window must be held for reconciliation, never blindly resent under an expired key. SMS/app-notification deduplication must be evaluated separately for preserved lineup channels; email idempotency does not cover them.

**Limit:** outbox uniqueness plus a finite provider window cannot guarantee eventual exactly-once external delivery across arbitrary failures. Safe non-duplication is achievable by holding ambiguous delivery, potentially requiring manual resolution. Owner acceptance of that operational policy is still needed if “exactly once” also requires automatic eventual delivery. No test email, SMS or notification was sent during diagnosis.

## 6. 82 writes and 30 retained paths

The [per-expression 82-write manifest](lms-0726-82-write-operations.md) and [JSON](lms-0726-82-write-operations.json) specify replacement, current authorization basis, transaction, effects, notifications and View-As denial for every B ID. Source page/function names identify typed server operations, not callable generic table commands. W161/W162 use Add/Remove; W145/W146 use bounded match reset; protected server lineup upsert is an additional dependency outside the 82. All compound operations use one parent transaction, never isolated commits per W ID. Team copy must not become an unchecked admission bypass; whole-copy hold/rollback is the proposed disposition requiring review.

The 30 C writes span division_lines, divisions, leagues, seasons, team_standings and score_sheet_templates. Live catalog reconfirmed RLS enabled. First five use manager predicates tied to auth.uid; both admin helpers currently mean LM/Commissioner. Template DML predicates instead join members/user_roles by signed JWT email. Thus ordinary Player/Captain/Club Pro have no qualifying DML predicate; View-As executor has **no INSERT/UPDATE/DELETE/TRUNCATE privileges** on any of these six tables. Effective manager label in the UI does not give it a normal JWT.

**Necessary narrow compatibility correction:** replace score_sheet_templates INSERT/UPDATE/DELETE predicates with existing `private.current_user_is_lwrpc_admin()` (UPDATE both USING/WITH CHECK), preserving manager threshold and avoiding direct protected members/user_roles reads after Phase2. These five template browser writes stay C; their policy dependency changes. This is a material, precisely identified addition to Phase2 review, not a claim the original policies survive revocation unchanged.

Anon/authenticated also currently have TRUNCATE grants on these six tables. RLS does not protect TRUNCATE. Normal PostgREST table operations do not expose SQL TRUNCATE, but grants mean a blanket “no possible mutation path” certification is inappropriate without auditing executable RPCs. Propose revoke TRUNCATE from anon/authenticated on these six as narrowly relevant to the requested manager-only certification. No browser expression uses it; no need to migrate the 30. Final executable-RPC/role-reassignment bypass tests remain required. This pass verified catalog predicates/privileges, **not live DML denials**.

## 7. Phase 1 object inventory / function count

**Proposed count: 13 new functions, not one per screen:** six existing proposed reads; four bounded business mutations (Add, Remove, Match Setup save, manager Match Setup reset); three protected lock helpers. Six read signatures remain in the accepted read-boundary design. The four mutations and three helpers have exact signatures above. The accepted existing View-As dispatcher receives only its reviewed page-read delegation; it is not counted as a new function.

Business owners: dedicated NOLOGIN/NOSUPERUSER/NOBYPASSRLS/NOINHERIT roster writer and lineup writer, not business table owners. SECURITY DEFINER, search_path empty. Normal executor gets only approved business-function EXECUTE. Writers get explicit required-column SELECT plus roster INSERT/DELETE or lineup/reset-specific DML and internal receipt/outbox writes; **no UPDATE to acquire locks**. Private helpers are postgres-owned and inaccessible to executor/browser directly. New functions revoke PUBLIC/default execution within creation transaction. RLS policies grant only these reviewed role/table actions. Read executor remains read-only, isolated View-As cannot invoke mutation functions.

Phase1 adds these functions/roles/private schemas, two narrow receipt/outbox tables, and the necessary policy-binding design once reviewed. No old table privilege revocation. No new trigger function is hidden outside the count; relation locks coordinate existing writers. Outbox sender uses a separately restricted server transaction and private-table rights, not a new general-purpose RPC. Fixed normal administration handlers for the other B operations use reviewed server transactions; they do not add one SQL function per UI action.

**Migration exactness limit:** the missing policy-binding schema/content and channel delivery decision prevent honestly labeling this a complete executable additive migration. Function count is the fixed proposed design inventory, not a claim that final bodies, full column ACLs or tests exist. Those missing specifications are explicit CONDITIONAL items below.

## 8. Application cutover, Phase2, order and rollback

Exact existing consumers and protected reads remain in [original cutover manifest](lms-0726-final-cutover-manifest.md), now extended by the 82-write operations. Cut over shared identity/profile/role guards and read contracts; dashboards; Team Detail Add/Remove and team-copy flows; Match Setup/match/score/schedule transactions; member/import/ratings/roles; location/team merges and season/division compound administration. Protect dynamic helpers/RETURNING/Realtime paths too. No broadened Commissioner-only role edits. Retain current player UI and LMS-0725 behavior.

Phase2 proposal, after normal acceptance: revoke all table privileges plus any column/inherited grants on the eleven P tables from anon/authenticated; keep restricted executors and intended public/shared DTOs. Replace the three template DML policies as above and revoke the six unrelated-to-UI TRUNCATE entitlements identified by this review. No other retained-table DML revoke or unrelated RLS cleanup. Recheck effective grants, PUBLIC and executable bypass functions before final SQL approval. This pass executed none of these changes.

| Order | Acceptance / rollback |
|---|---|
| Rehearse before production | Complete source/config/ACL review, normal/concurrency/role tests and compatible build; no deployment until implementation separately approved |
| Phase1 additive | Old privileges still present; rollback to baseline app then remove unused additive objects only if safe; keep receipts/history |
| Application deployment | Move all protected reads/writes; rollback compatible baseline before Phase2 if failure; existing exposure remains during this temporary window |
| Normal workflow verification | Player, Captain, Team Detail, roster Add/Remove, cross-community, Match Setup, Club Pro, all managers and all 82+helpers; fail stops tightening |
| View-As as applicable | Verify effective-viewer contracts and continued mini read-only isolation; do not claim real-page parity yet |
| Phase2 tightening | Only after all consumers pass; on failure use compatible server-path build or roll forward/temporarily suspend actions; never old direct-browser build alone |
| Direct bypass verification | Protected contacts/RF/ratings/private teams deny; all 30 retained DML role boundaries and intended shared data positive controls |
| Full real-LMS parity | Begin only after Phase2 security acceptance; shared pages, persistent banner/Exit, isolated origin, hard write denial; normal Member Detail action M01–M15 |
| Mini deletion last | Only after normal foundation, parity and read-only acceptance; restore only compatible shared-UI artifacts if regression, never old broad Data API privileges |

After Phase2, any emergency restoration of the old app requires a separately reviewed coordinated privilege rollback explicitly acknowledging restoration of the original exposure. It is not a routine recovery method. The previous 15-minute proposed compatibility window applies only to a fully rehearsed rollout; it is not permission to rush unverified migration or leave two access paths indefinitely.

## 9. Required deterministic security/concurrency matrix

All tests below are planned, not executed in this design-only pass. No model calls are needed.

| ID | Case | Required result |
|---|---|---|
| F01 | Concurrent Add same player, different request IDs | One membership and one committed add event; other ALREADY_ON_ROSTER |
| F02 | Captain assignment/role removed while Add starts | Revocation wins: deny; Add wins locks: revocation waits; no commit from stale post-revocation authority |
| F03 | Eligibility/config change before final locked validation | New state governs; no stale pass; config conflict holds |
| F04–06 | Add required UNKNOWN / known FAIL / verified PASS | REVIEW_REQUIRED no insert / NOT_ELIGIBLE no insert / one ADDED |
| F07 | Synthetic future min/max mismatch or affected community policy/config conflict | POLICY_CONFIGURATION_CONFLICT, no insert |
| F08–09 | Remove eligible / ineligible player | Same authorization/state checks; both removable when workflow permits |
| F10 | Duplicate/concurrent/replayed Remove | One logical removal; NOT_ON_ROSTER or authorized receipt replay; no duplicate effects |
| F11–12 | View-As Add / Remove including real Commissioner | DENY, no DML/outbox |
| F13–15 | Forged candidate / rating / NR | Scope denial or strict payload rejection; no private-state oracle |
| F16–18 | Lineup aggregate PASS / FAIL / required UNKNOWN | Save / reject / owner-reviewed no-save result; no unverified lineup accepted |
| F19 | Notification before commit attempt / transaction abort | No externally visible event until commit; rollback emits none |
| F20 | Committed add then notification failure | ADDED retained; pending/failed delivery reported truthfully |
| F21 | Delivery replay, timeout, expired dedup window | One business event; same provider key within window; ambiguous expired send held, not blind resend |
| F22 | RF <29, =29, numeric+NR, missing classification | Trusted policy binding governs; no raw RF output; missing binding holds |
| F23 | Retained C writes with lower roles and View-As | Direct table/RPC deny; manager positive including repaired template policies |
| F24 | Lineup removal/config race, bad line number, wrong match side | Serialized final state; reject forged/out-of-range line/match |
| F25 | Protected direct select/embed/filter/returning/alternate RPC | Unrelated email/RF/ratings/private teams and candidate email/RF denied; intended public data passes |
| F26 | Repeat request after remove/re-add, changed payload | Original receipt not a new insert; same key/different payload conflicts |
| F27 | Lock contention/deadlocks/connection pooling | Bound latency; whole-transaction abort/retry; lock order and isolation behavior verified |
| F28 | Team copy partial eligibility failure and compound reset failure | Reviewed atomic disposition; no partial hidden membership/lineup effects |

## 10. Only remaining readiness items

**CONDITIONAL**, not READY FOR IMPLEMENTATION:

1. Approve/finalize the minimal structured policy binding and authoritative facts/stages; reconcile affected home-only configuration against Rules (PT9 resolved). Unknown behavior is settled; missing configuration cannot be fabricated in SQL.
2. Decide the required-unknown lineup outcome and team-copy hold disposition. Proposed: no save preserving prior lineup; entire new-copy admission transaction holds without partial memberships.
3. Accept or refine durable notification deduplication with ambiguous expired sends held for reconciliation, including existing lineup SMS/app channels; automatic eventual exactly-once delivery is not established by current architecture.
4. Freeze complete Phase1 policy-object/column ACL specifications and Phase2 template-policy/TRUNCATE changes against the above decisions. The 82 expressions are mapped, but no complete executable migration or passed race suite is claimed.

Remove restrictions and history behavior are resolved from current source/FKs. The protected lock mechanism and function inventory are now concrete proposals with an explicit contention cost. No additional owner decision about whether unknown Add facts should hold is requested. Implementation remains unauthorized; stop here for review.

