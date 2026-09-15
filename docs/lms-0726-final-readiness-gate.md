# LMS-0726 / 0.1.548 — final readiness specification

Design only. PrimeTime9 remains CLOSED at owner-approved normalized 3.4–4.8. No application implementation, production mutation, deployment, deletion, notification send or OpenAI call. This continuation supersedes earlier proposals where expressly stated. Historical evidence remains intact.

## 1. Removal authorization: verified capability versus owner policy

[Active guides and database evidence](lms-0726-remove-authorization-evidence.json) establish the following trace:

`/teams/[id]` → `requireRole('captain')` → roster-row Remove button at line1346 → `removePlayer` at880 → direct `team_members.delete().eq('id',membershipId)` at893 → authenticated DELETE grant → RLS `private.current_user_can_manage_team(team_id)` → row deletion. There is no existing separate manager RPC.

The button is rendered with each roster member. `canModifyRoster` permits role level Captain or higher when unlocked, or LM/Commissioner while locked. A page effect redirects lower roles when locked. `hasRole` orders Player < Captain < Club Pro < LM < Commissioner. Co-Captain is a team assignment, not a separate stored role. The database helper permits the assigned captain, either co-captain or direct Club Pro with a qualifying stored role, and broader LM/Commissioner. It does not check `rosters_locked`. All three currently active leagues are locked in the read-only snapshot.

| Actor | Technical UI when unlocked | Technical UI with current locks | Technical direct DELETE predicate | Final intended bounded removal |
|---|---|---|---|---|
| Assigned Captain | Button enabled | Disabled/redirect | Allows assigned team despite lock | Allow assigned team only when roster restrictions permit |
| Authorized Co-Captain with Captain role | Button enabled | Disabled/redirect | Allows assigned team despite lock | Same as Captain, explicitly confirmed by owner |
| Direct Club Pro | Role hierarchy enables button | Disabled/redirect | Allows direct assigned team despite lock | No permission solely from Club Pro role; separate documented authority required |
| Location-only Club Pro | Client can show enabled control when unlocked | Disabled/redirect | No assigned-team predicate from location alone | Deny solely on location/Club Pro visibility |
| League Manager / Commissioner | Enabled | Enabled | Broad management predicate | Existing management scope and lock exception |
| Player | Route denied | Route denied | Denied absent qualifying management role | Deny |
| View-As | Accepted isolated UI is read-only | Read-only | Executor has no DELETE privilege | Always deny, including real Commissioner |

These are source/catalog findings, not a destructive production DELETE probe. A UI lacking an exact team relationship check may expose a control whose action is denied by RLS. Anon has a table DELETE grant but no applicable DELETE policy; grant alone does not establish row access.

The active **LWRPC-Captains Guide to the LMS**, page8, version `v20260903215721-7ec16cf5`, documents roster removal through Captain Tools. The active **LWR Pickleball Club DUPR Captains Guide**, page7, version `v20260908144326-816a2cd7`, explicitly documents Captain roster control. Owner subsequently confirmed **Captain and authorized Co-Captain removal with enforced transactional locks**, not manager-only removal. Earlier manager-only and Co-Captain-denial proposals are withdrawn. Existing direct lock bypass is an authorization defect, not intended permission.

One `public.lms_roster_remove_player(p_actor uuid,p_team uuid,p_membership uuid,p_request uuid) RETURNS jsonb` serves every authorized role. Resolve role/team authority first; downstream checks/effects do not branch by remover role except the existing manager roster-lock exception. No admission/RF/rating/age recheck for removal. Exact membership/team identity, current roster state and affected future-state dependencies are locked/revalidated. Delete membership only; completed historical participation/results never change. No arbitrary direct DELETE remains after Phase2. Smallest safe option is this bounded replacement because the only current path is direct browser DELETE, which Phase2 removes.

## 2. Deterministic normalization and admission

[Every current division and condition mapping](lms-0726-authoritative-admission-matrix.md) remains the authoritative census: 18 divisions, two seasons, three leagues. Its explicit ABSENT/UNKNOWN sources are not replaced with fabricated member facts. Current Rules and guide evidence supply requirement applicability; structured data supplies operands. No PostgreSQL PDF parsing or AI-assisted runtime eligibility.

Comparison contract:

1. Positive finite ratings only. Parse decimal values exactly and use integer tenths for comparisons; avoid binary floating-point equality/tolerance rules.
2. At season processing, raw rating truncates toward zero to one decimal (current Ratings `truncateToTenth` intent). A verified stored Season rating is already in that domain. Do not round an arbitrary candidate value during admission to turn failure into pass; malformed/non-domain or unverified provenance is UNKNOWN.
3. For a published inclusive interval, normalize lower bound with ceiling-to-tenth and upper bound with floor-to-tenth. Compare structured bounds in the same domain. Thus 3.4–4.899 and 3.4–4.8 have identical admitted one-decimal values; 3.3–4.9 does not. Do not blindly truncate a non-tenth lower bound downward.
4. Classify NR before ordinary numeric bounds. Authoritative raw NR OR RF strictly below the configured 29 threshold establishes NR. RF=29 does not trigger the RF rule. Missing evidence does not establish Rated. A numeric Season DUPR may coexist with NR. RF is internal only.
5. Ordinary initial Rated bounds use selected division min/max and the applicable frozen Season rating. NR placement follows reviewed structured NR policy, not ordinary Rated rejection. Actual adjusted NR pair values and highest-adjustment context apply at lineup, not as a missing-partner admission gate.
6. Any relevant verified policy/config mismatch returns POLICY_CONFIGURATION_CONFLICT; missing required fact/binding returns REVIEW_REQUIRED; both produce no membership. Conclusive failure under verified policy returns NOT_ELIGIBLE. Known PASS only when every required admission condition is established. Duplicate returns ALREADY_ON_ROSTER after authorization; it does not certify current eligibility.

The current rating editor rounds division values to two decimals; current Ratings cleanup truncates positive Season ratings to one decimal. Its prompted reliability threshold is not itself authoritative League policy. The shared structured binding must specify strict RF<29; no SQL copy of an editable client threshold, no change to accepted Ask LWR generation.

Stage assignment: membership, required DUPR identity, applicable individual/NR division placement, community restriction and applicable age are admission gates; unknown required operands hold. Waiver/DUPR club membership are required player-participation conditions; the active Captain Guide places these checks in roster creation, so include them as required admission checks with absent/unverified source yielding review. Match staffing counts are not roster caps. Pair aggregate, line shape, current roster presence and championship qualifying history belong to lineup/match. Equipment/conduct/forfeit/posting rules apply at match/score/export. Rating freeze, truncation, age-based fallback and season adjustment provenance are established by season processing. No general manager override of unknown facts; only accepted operational lock exceptions.

The existing schema cannot establish every required source (notably verified season age, season-start community and community availability). The final mapping for those inputs is explicitly `UNAVAILABLE -> UNKNOWN -> REVIEW_REQUIRED`, not an unresolved placeholder and not permission to insert. This may hold real admissions until authoritative facts are available. No newly invented pending roster or unrestricted “approve anyway” record is proposed.

## 3. Lineup reuse inventory and validation

| Consumer | Current reuse / mutation | Final boundary |
|---|---|---|
| Captain Dashboard `openMatchSetup` 1781, `setSetupLineups` 1838 | Existing same-match/team rows populate editable state | Populate is convenience; no certification/no notification; display current validity |
| Captain Dashboard `saveMatchSetup` / POST `/api/match-lineups` around2192 | Existing or edited IDs submit | Bounded save independently validates current roster, match/team, configuration, NR/individual/pair facts and allowed line blocks in one transaction |
| Match Detail `applySavedLineup` 889 (W082) | Saved pair copied into match_lines; client has rating check and stale member fallback | Typed server assignment transaction uses same current eligibility evaluator, not stale embedded player objects; no independent copy authorization |
| Match Detail `updateLinePlayer` (W081) | Manual replacement/duplicated assignment | Same match/side/current-lineup evaluation as copied input |
| Match Detail saved-pair dropdowns 2396–2419 | Filters saved pairs with browser numeric checks | Server validity is authoritative; UI filtering supplementary |
| Captain Dashboard `openMatchScoreSheet` 1855 | Saved rows populate printable score sheet | Future invalid/incomplete setup cannot be presented as a valid completed setup; historical score sheets preserved |
| Scoring `resetMatchScheduleRows` (W145–146), `generateMatchScheduleRows` (W143–144) | Clears setup/lines then regenerates templates | Manager parent transaction; resetting templates is not permission to carry old eligibility |
| Teams `copyTeamsForDivision` / `copyTeamToDivision` (W157–160) | Copies teams and membership IDs, not a prior valid eligibility decision | Destination-season admission revalidation; all-or-nothing selected copy operation, safe review result on required unknown; no partial roster inserts |
| Player Dashboard, Division detail, AI insights, matchSetupReminders | Read/display/count existing setup | Read only; counts do not establish eligibility; no notification from simply loading a copy |

Source scan found no distinct cross-match “copy prior setup” command beyond the above current reuse/population paths. Future implementations must use the same validator; this is not permission to create another copy feature.

Unknown required lineup fact: `LINEUP_REVIEW_REQUIRED`, no submission, keep last stored assignments visible with invalid/review status; no new forfeit or manager override. Known stale invalidity rejects submission. Legitimate Rules grandfathering requires authoritative season evidence; past validity alone is insufficient. Copied but uncommitted input sends no submission/change notification.

Current removal does not delete future saved assignments; no cascade references team_members. No source explicitly specifies automatic clearing versus invalidation after roster removal. **FINAL OWNER DECISION: block removal until lineup corrected.** Under the same transaction locks, inspect saved setup/lineup references for the selected player/team in future or unplayed matches. If any remain, return REMOVAL_NOT_ALLOWED with reason FUTURE_LINEUP_DEPENDENCY and authorized affected-match identifiers; do not delete membership, alter assignments, create a successful-removal receipt or send a removal notification. Captain/Co-Captain/manager corrects and submits those setups first (or uses an already authorized manager reset); then removal retries with fresh validation. No role bypasses this dependency rule, including Commissioner. Completed historical matches are excluded and never rewritten. Do not auto-clear or mark-and-remove; the membership stays until correction.

## 4. Notification contract

[All 82 current notification rows](lms-0726-final-notification-matrix.md) record existence, audience, trigger, timing, channel/provider and present dedup behavior. Current email/SMS helpers use Brevo. These paths do not request app/push fallback; do not invent it. Separate scheduled reminders retain their existing scheduling semantics and are not 82-write events.

Existing Add rating-check notice is conditional, not a general player-added message. Required missing facts now hold; successful applicable raw-NR add retains its existing League-info email. Remove currently has no notification. Score submitted/changed/verified and flex-date changes have existing Captain notices. Match Setup save (server mutation outside the 82) retains opposing-Captain notices after successful save. Recipient contact resolution moves server-side; no candidate email returned for notification purposes.

One bounded durable idempotency contract for all these migrated business events:

- Immutable operation UUID and canonical request hash per real actor/request ID. Reused key/different request conflicts; current authorization rechecked before replay disclosure.
- Membership/score/setup effect and one receipt/outbox event are committed atomically. Side effects never occur inside the database transaction.
- Outbox uniqueness covers operation/event/channel/recipient identity; a retry of a logical operation never creates a new event. Multi-statement W IDs share the parent operation event, not per-row notices.
- Sender claims committed event durably. Brevo email uses stable event UUID as idempotency key and byte-stable payload; short retries occur only within supported dedup lifetime. SENT remains permanently non-resendable while receipt retained.
- For SMS or an ambiguous email outcome beyond the provider window, do not automatically resend. Mark AMBIGUOUS and require operational reconciliation. This preserves non-duplication rather than making an impossible guarantee of eventual exactly-once delivery. Current UI already directs manual League contact on Add notification failure; keep truthful outcome.
- A provider failure cannot roll back committed business data. Return ADDED/REMOVED/SAVED with separate notification state; never falsely report mutation failure. Known pre-send configuration/no-recipient failure records FAILED or SKIPPED, not SENT.

No current durable outbox was found in these helpers. Minimum persistence: operation_receipts and notification_outbox, private/RLS-protected. No generic messaging platform, no pending-roster table. The owner selected blocking removal until lineup correction. No new removal-change event is introduced. Existing Match Setup correction/submission notices remain tied to that separate committed operation; Remove itself has no existing notice to preserve.

## 5. Migration specification and replay discipline

The [Phase1 function/column specification](lms-0726-final-migration-spec.md) defines the additive object inventory, fixed signatures/owners/EXECUTE and table footprints. No default PUBLIC EXECUTE survives creation; no browser UPDATE/DELETE is added for locks. Old browser dependencies remain during Phase1. Phase2 is separately gated and cannot be bundled into an unverified additive release.

Every object is created in a migration transaction with explicit owner and ACL normalization. Clean apply creates absent expected objects; replay and second replay verify shape/owner/body signature/ACL instead of silently trusting IF NOT EXISTS. `CREATE OR REPLACE FUNCTION` does not replace explicit ownership/revoke verification. A mismatching existing object aborts with drift diagnosis; do not drop/recreate dependencies blindly. A transactional failed apply rolls back; partial historical/manual state is repaired only when compatible, otherwise stop. Compare constraints, RLS/policy expressions, role flags/memberships, function identity arguments/search_path and column types/defaults. Migration-version bookkeeping alone is not drift proof. Test clean/apply/replay/replay and deliberately injected wrong-owner/ACL/type/function-body drift in isolated PostgreSQL. No such implementation tests have run in this design pass.

## 6. Cutover, exposure and rollback

[82 final operation contracts](lms-0726-final-82-contracts.json) plus original D001–D292 read dependencies remain the exact source IDs. W162 is the single bounded Remove path for all authorized roles; W081/W082 revalidate copied/manual assignments. No UI-only authorization. The [per-consumer read cutover](lms-0726-final-read-cutover.md) resolves every inventoried read expression to shared contracts or retained intended access.

Ordered cutover: shared identity/profile/role helpers and normal read transport; Player/Captain dashboards and child loaders; Team Detail Add/Remove and Teams copies; Match Setup save/reuse, Match Detail/score entry; scoring/schedule editor/generator; members/import/ratings/role administration; locations/merges and season/division compound writes. Server helper/import/export/RETURNING dependencies are included. Old paths are removed from use, not kept as permanent fallback.

Production sequence: A backup/preflight and tested compatible artifacts; B Phase1 additive; C application cutover; D normal Player/Captain/Teams/roster/Add/Remove/cross-community/setup/reuse/Matches/Standings/Ratings/Club Pro/manager verification; E effective shared-path/isolation checks; F Phase2; G direct bypass tests; H full normal regression; I real-LMS View-As parity; J mini presentation deletion; K final acceptance. Tests use isolated PostgreSQL, read-only production verification and authorized legitimate workflows, not destructive production probes.

Between C and F the old authenticated direct reads still disclose unrelated protected contacts/RF/ratings/private team graph under existing broad SELECT policies, and legacy managed-team DML can bypass app-only restrictions. Application cutover alone does not fix that. Keep the compatibility window bounded by rehearsed deployment (prior 15-minute target); go/no-go requires every protected consumer and normal workflow PASS, compatible recovery build available, no unresolved policy/ACL drift. If not met, stop before F; do not rush security acceptance.

Phase1-only rollback: restore compatible baseline transport if necessary, retain additive objects/receipts or remove only proven unused ones. Before Phase2 app rollback remains baseline-compatible, with original exposure explicitly remaining. After Phase2 use a compatible shared-server build or roll forward/temporary action suspension. Old browser app alone is unsafe. Any emergency full baseline restoration requires coordinated reviewed privilege restoration and acknowledgment of returned exposure. Never delete audit/receipt history as rollback convenience.

Member Detail M01–M15 remain: normal action row/style, REAL LM/Commissioner plus valid target, correct confirmation, keyboard/focus, desktop/390px/320px. View-As always denies writes regardless of effective or real role. Mini deletion remains after foundation and real shared-page parity acceptance.

## 7. Readiness

**READY FOR IMPLEMENTATION — design gate only.** All outstanding owner behavior choices are resolved. Captain/authorized Co-Captain and LM/Commissioner use one Remove operation; locks apply, future/unplayed lineup dependencies block removal for every authorized role, no historical rewrite and no new Remove notification. Copied/reused input revalidates at submission; all-or-nothing destination roster copy preserves admission controls. Required missing structured facts deterministically hold, never become PASS. Policy parameters and approved normalization are shared rather than copied into each mutation.

The source/column/function/privilege specifications and consumer manifests define the implementation scope. This is not implementation permission, a tested migration, production acceptance or proof that every real candidate has sufficient facts to pass admission. Isolated PostgreSQL race/role/replay/drift tests, normal workflow regression and lint/build remain implementation acceptance requirements. No production mutation probe is required. Explicit implementation approval is still awaited; stop for review.
