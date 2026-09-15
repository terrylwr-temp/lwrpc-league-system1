# LMS-0726 / 0.1.548 — atomic Add Player and final cutover gate

**Continuation:** [Four-blocker resolution](lms-0726-four-blockers-resolution.md) supersedes the earlier isolation/lock proposal, NR aggregate admission prerequisite, unresolved Remove behavior and cutover dependency assumptions. Still design-only and CONDITIONAL.

**DESIGN ONLY — STOP FOR REVIEW.** This report supersedes the generic `lms_normal_mutate` proposal, its generic audit table, inferred location-only Club Pro mutation authority, and any earlier sequence starting real-LMS View-As parity before Phase 2 security acceptance. No implementation, SQL mutation, deployment, deletion or OpenAI calls. Accepted production remains 0.1.547.

Evidence: [foundation plan](lms-0726-security-foundation-plan.md), [source dependencies](lms-0726-foundation-dependencies.md), [database constraints/policies](lms-0726-write-boundary-metadata.json), [official Rules](lms-0726-foundation-rules-evidence.json), [exact cutover manifest](lms-0726-final-cutover-manifest.md). Source locations are baseline locations, not promises that line numbers will remain unchanged after implementation.

## 1. Exact proposed Add Player boundary

```sql
public.lms_roster_add_player(
  p_actor uuid,
  p_team uuid,
  p_candidate uuid,
  p_request uuid
) RETURNS jsonb
```

One operation: attempt to add the candidate to that roster. No operation selector, arbitrary update JSON, supplied table name, override flag or View-As proof. Browser submits only team ID, candidate ID and a UUID request key. The normal server verifies the real Auth session online and supplies `p_actor`; it never copies that value from the request. SQL independently resolves the actor's current member/role/team authorization. Actor UUID alone is not a credential.

Proposed normal endpoint: `POST /api/teams/[id]/roster`, strictly typed body `{candidateId,requestId}`. Normal origin/session/CSRF checks and accepted View-As mutation rejection run before database access. An isolated View-As session cannot use this endpoint, including when its real actor is Commissioner. No cross-origin normal administrator cookie fallback. Reject additional authority-bearing fields rather than silently using them.

| Security property | Proposed definition |
|---|---|
| Schema/name | `public.lms_roster_add_player` |
| Owner | Dedicated `lms_roster_writer`, NOLOGIN, NOSUPERUSER, NOBYPASSRLS, NOINHERIT; not owner of business tables |
| Execution | SECURITY DEFINER, `search_path = ''`; fully qualified references, no dynamic SQL |
| EXECUTE | Owner plus trusted normal server database role only; revoke PUBLIC, anon, authenticated, `lms_page_reader`, `lms_view_as_executor` |
| Server role | Proposed `lms_normal_executor`, restricted server connection; EXECUTE on reviewed normal functions, no direct business DML; never shipped to browser or isolated View-As runtime |
| Table writes | INSERT on `public.team_members(team_id,member_id)` for Add; narrow internal success-receipt/outbox writes described below. Add body has no member/rating/team UPDATE or membership DELETE |
| Reads | Explicit identity/role/assignment and admission columns from user_roles, members, teams, divisions, leagues, seasons, locations, member_season_ratings and team_members. No wildcard or unrelated season read; exact existing field inventory is the upper bound, not a reason to grant every field |
| RLS | Dedicated writer policies for these exact operations; function performs business authorization independently. Existing browser policies do not provide the new writer's authorization. No BYPASSRLS, table-owner shortcut, authenticated-role grant or service-role direct-insert fallback |
| Private objects | No browser schema USAGE/table privileges/function EXECUTE; default function EXECUTE revoked in the creating transaction |

**Not yet executable DDL:** final column grants depend on authoritative fact mappings in §3 and the locking implementation in §7. A design that lists a table without its final required columns is not a completed least-privilege migration. The proposed restricted connection replaces an assumed service-role REST transaction for these atomic writes; existing read entry-point grants remain as previously designed. Connection provisioning and transaction behavior require implementation review. Do not silently fall back to separate REST validation and insertion.

Authorization precedes candidate eligibility reads and detailed results. Player, unrelated Captain and location-only Club Pro receive the same `NOT_AUTHORIZED` envelope regardless of candidate existence/status. For authorized actors, candidate identifiers must still be within the bounded managed-team discovery domain; protected facts used internally are not returned.

Current database `private.current_user_can_manage_team` permits explicit manager administration and a matching Captain/Co-Captain/Club Pro assignment on the target team. Preserve those explicit assignments. Club Pro location-based dashboard visibility is **not** an additional roster-write grant. Resolve league, division, season, home location, roster lock and team state from the selected team; never accept browser labels.

## 2. Input/output and deterministic review hold

All four UUIDs are required. `p_request` supports safe retry, not extra authority. No caller-supplied rating, RF, NR, role, limits, location decision, pair sum or eligibility result.

Results have fixed shape `{status, reasonCodes, message, membershipId}`; membershipId is non-null only for an authorized existing/added membership. Allowed expected statuses:

- `ADDED`: committed new membership; response returned only after transaction commit.
- `ALREADY_ON_ROSTER`: existing membership, no insert or new side effect.
- `REVIEW_REQUIRED`: required admission fact unknown; no membership or pending-roster row.
- `NOT_ELIGIBLE`: required admission fact conclusively fails; no insert.
- `NOT_AUTHORIZED`: uniform access denial before protected evaluation.
- `INVALID_TEAM` / `INVALID_CANDIDATE`: only after sufficient authorization; otherwise uniform access denial.
- `REQUEST_CONFLICT`: same actor/request key reused for different operation/arguments.

Unexpected database/system failures remain errors; no conversion to ADDED or eligibility failure. A retry-exhausted transaction reports a retriable service error. Sensitive database exception text is not returned.

Evaluation order: authorize → resolve valid resource/candidate → detect authorized existing membership → evaluate applicable admission facts. Any conclusively failed required condition yields NOT_ELIGIBLE; otherwise any unknown required condition yields REVIEW_REQUIRED; otherwise insert. NOT_APPLICABLE conditions do not participate. Existing membership is not retroactively certified by ALREADY_ON_ROSTER.

Safe review categories: `MEMBERSHIP_VERIFICATION`, `DUPR_ACCOUNT_VERIFICATION`, `DIVISION_ELIGIBILITY_REVIEW`, `COMMUNITY_ELIGIBILITY_REVIEW`, `SEASON_INFORMATION_REVIEW`. Do not return raw RF, DOB, email, address, rating arrays, internal role mappings or detailed private evidence.

Message: “League review required. This player's eligibility cannot be fully verified from the available League information. Ask League Management to review the listed requirement before trying again.” Display safe categories only. No new review queue, pending table or automatic approval. League Management verifies/corrects authoritative information through existing authorized workflows, then the Captain retries. If the required fact has no durable representation, repeated retry cannot solve it: its source mapping must be reviewed first. No automatic notification or persistent hold event is proposed.

## 3. Admission-stage matrix

Rules baseline: `v20260908162017-f0aad5ad`. P/F/U below mean PASS/FAIL/UNKNOWN. A database numeric value, active flag or empty field cannot be substituted for a different official fact.

| Condition | Roster Add: P / F / U | Later enforcement / manual review |
|---|---|---|
| Real actor and exact managed team | Valid authorized assignment / denied / deny unresolved identity | Recheck every mutation; no review hold that leaks candidate facts |
| Valid team/hierarchy/season and roster state | Consistent open roster or existing authorized manager lock exception / invalid or locked / review unresolved admission state | Season processing manages transitions; Add cannot repair hierarchy |
| Candidate identity and member status | Valid candidate / known invalid or inactive / review unknown required membership fact | Active-or-null discovery is not membership certification |
| Valid LWR membership (3.1) | Required membership verified / known invalid / review missing verification | Recheck where required before participation; exact durable membership-validity source still needs mapping |
| DUPR account/ID (3.2) | Required account established / known invalid / review missing or unverifiable account | Owner hold replaces current missing-ID provisional add; nonempty ID alone does not prove all account facts |
| Division individual/NR placement | Authoritative applicable placement passes / Rated outside initial legal bounds / review missing classification or required placement context | Preserve existing-season grandfathering under 4.7/4.8 where authoritative; do not recalculate historical ratings |
| Season community and actual cross-community rule (3.4/3.5) | Same applicable community or permitted cross-community / own-community team AND available place prohibits move / review unresolved material community/availability | Present location mapping alone does not certify residence at season start |
| Configured home-community restriction | Existing allowed assignment or existing scoped manager exception / applicable prohibition / review unresolved rule/config conflict | Do not silently replace official cross-community rule with ID inequality |
| Required NR season adjustment (4.5.1/4.5.2) | Existing authoritative applicable adjustment / established invalid adjustment / review missing required placement context | Season processing establishes highest applicable adjusted Season DUPR; Add reads it, never writes a guessed rating |
| Pair aggregate (4.6) | NOT APPLICABLE; absence of a partner is not UNKNOWN admission | Actual Match Setup pairs: known valid PASS, known excess FAIL, missing required rating/NR context holds lineup |
| Prior regular-season matches for championship | NOT APPLICABLE to ordinary roster add | Championship lineup/match eligibility; insufficient participation FAIL there, unknown required history holds there |
| Waiver and DUPR club membership (3.1/3.3) | Participation prerequisites; no evidence establishes a separate universal roster-add gate merely from these clauses | Must establish before participation. If a reviewed division-admission rule makes either a prerequisite to joining that division, it becomes required there; exact stage/source mapping remains a readiness issue, not invented policy |
| PrimeTime age requirement | Required to establish legal PrimeTime division admission: verified PASS / known failure FAIL / unknown REVIEW_REQUIRED; other divisions N/A | 65 by Dec. 31 of season starting year; protected age fact stays internal |
| Roster before play / retroactive exception (5.6) | Ordinary add does not certify past matches or apply a retroactive override | Match/score stage requires roster and applicable historical membership/account/rating conditions; explicit exception workflow only |
| Equipment, conduct, match completion, posting | NOT APPLICABLE | Match/score/export stage, not certification by roster insertion |
| Team capacity | No general numeric roster cap established in current Add Player path: NOT APPLICABLE as a new universal cap | Rule 3.5 availability remains a separate material fact; do not invent a cap to derive it |

This matrix identifies the rule-stage boundary and the remaining evidence gaps explicitly. It does **not** claim the schema currently certifies membership validity, season-start community, own-community roster availability, waiver/club verification or every season placement exception. Required unresolved facts produce holds; missing participation-only facts must not be indiscriminately moved to Add Player to avoid resolving their proper stage. Final authoritative mappings and the waiver/club stage interpretation must be frozen before broad implementation approval.

## 4. RF / NR, participation and community details

Internal classification: authoritative raw NR OR authoritative RF strictly below 29 establishes NR. RF=29 does not trigger the RF rule. A numeric Season DUPR can coexist with NR. Rated requires sufficient authoritative evidence; missing RF/NR context is not Rated. Never expose RF or borrow another member's Ask SELF capability to perform admission.

NR may join any division under Rule 4.5 subject to other requirements. Do not apply ordinary Rated min/max as an NR admission rejection. Where a season adjustment is required, resolve the official existing adjustment rather than guessing `max - 0.5` and persisting it during Add. Apply the actual pair calculation later using the applicable adjusted value and highest-adjustment rule.

Discovery keeps legitimate cross-community candidates. For Rule 3.5, exclusion depends on both an own-community team in the relevant division and roster availability. A known false component can settle that conjunction; an unknown component only causes review when it can change the outcome. Different location IDs alone never establish the prohibition. Current ID/name fallback is discovery evidence, not season-start residence proof.

No general audited eligibility override was found. Existing manager access to locked rosters/configured community exceptions does not confer an “approve unknown facts” switch. Holds and known official failures apply to managers too outside an explicitly established existing exception.

## 5. Match Setup boundary

`lwrpc-admin/app/api/match-lineups/route.js` already checks normal auth, rejects View-As mutations, checks match side, direct team authority, selected roster players, duplicate players and pair maximum. It reads numeric ratings without complete RF/NR classification, then performs a later service upsert. That is not a complete atomic eligibility boundary.

Propose a separate single-purpose `public.lms_match_setup_save(p_actor uuid,p_match uuid,p_team uuid,p_lineups jsonb,p_request uuid) RETURNS jsonb`, under its own least-privilege writer, normal-only EXECUTE and the same transaction requirements. Lineup JSON is schema-bounded line/player IDs, never ratings/authority. Validate the actual match/team/pairs and insert/update in one transaction. Retain existing UI. A clear/reset path, including W145, also needs a bounded authorized effect before tightening; whether combined into the existing score-reset transaction or a separate clear function is an explicit remaining function-body review item. Do not hide it inside a generic mutation RPC.

## 6. Remove Player is required

`app/teams/[id]/page.js:893` (W162) directly deletes team_members. It will break after revocation unless replaced.

Proposed `public.lms_roster_remove_player(p_actor uuid,p_team uuid,p_membership uuid,p_request uuid) RETURNS jsonb`. Exact membership must belong to the authorized team. Normal-only path, current roster lock/manager exception, identity and assignment revalidation, idempotency and atomic deletion. No member record deletion. Return REMOVED / ALREADY_ABSENT or safe denial/conflict. Preserve confirmation and existing lineup impact rules; inspect dependent saved lineups/history before finalizing deletion/cascade behavior. No new removal notification was found and none is invented. Grants for Remove must not let Add's callable body perform arbitrary DELETE; owner privileges and each fixed body are reviewed together.

## 7. Transaction, concurrent changes and idempotency

**Chosen transaction boundary:** a restricted normal-server PostgreSQL connection starts `BEGIN ISOLATION LEVEL SERIALIZABLE`, calls the bounded function, then commits. Authorization reads and all material validation/insertion occur inside it. An ordinary sequence of Supabase REST reads followed by insert does not meet this contract; setting default isolation inside an already-running RPC is not equivalent. Pooler/driver support must be proven before adopting this design.

Serialize roster operations on a team using a transaction advisory lock derived server-side from that team UUID. Advisory locks are coordination, not authorization. Acquire material existing rows in one documented global order (identity/roles, hierarchy/team, candidate, season rating, memberships); hold locks through commit. Acquire strong enough locks on authorization and eligibility rows to block relevant changes until the operation commits. Protect absent-row/predicate decisions, such as rating absence or own-community availability, through serializable conflict detection **and** a common writer protocol where required. Do not claim one team advisory lock protects independently written ratings or roles.

Final locking SQL is a readiness gate: PostgreSQL locking clauses may require privileges beyond SELECT. Use a reviewed narrowly scoped internal lock helper or a demonstrably sufficient writer design; do not grant broad member/role UPDATE just to obtain row locks. All relevant administrative writers, including retained C operations that change league/season/division facts, must participate in the reviewed protocol or pass an equivalent concurrency proof. If that requires moving a C writer, reclassify it before cutover; 82 is the current privilege-dependency count, not a guarantee no race-driven change will be necessary.

Existing UNIQUE(team_id,member_id) independently guarantees at most one membership. Concurrent duplicate insert conflict must return the current authorized existing membership after a safe retry, not produce a second audit/notification. SERIALIZABLE failures/deadlocks retry the **whole** transaction with the same request key, bounded attempts. No side effects before commit, no stale validation reuse and no lost-update overwrite.

Required deterministic database tests (not run in this design pass): simultaneous same team/candidate; different candidates under any actual capacity rule; role/Captain removal; team assignment change; division/season change; member deactivation; rating/NR/RF change; absent rating inserted; community availability change; duplicate request after response loss; reused key/different payload; remove/re-add and retry old key. Assert membership count, result, serial ordering and side-effect count, not only HTTP status. Include retained manager writers in race tests. Existing unique-constraint evidence is not a substitute for these tests.

## 8. Audit and notifications

Current Team Detail Add inserts membership, then calls `sendRatingCheckAlert` for missing ID/rating/raw NR. It has no general roster-add audit/history insert. Missing required ID/rating will now hold, so those paths must not send “added” notifications. A successful permitted NR add retains the applicable existing alert. No hold notification policy or ordinary all-add email exists in this path.

For committed-operation retry and alert deduplication, propose narrowly scoped internal `lms_write_private.roster_operation_receipts` and `roster_notification_outbox`, **not pending-roster records**. Receipt: actor UUID, request UUID (unique together), operation ADD/REMOVE, team UUID, subject UUID, membership UUID, committed result, timestamp. Same key/different tuple conflicts. Persist successful changes only; denied/held attempts create neither roster nor “added” history. Outbox: receipt ID, membership ID, fixed event type, delivery state/attempt metadata; unique membership/event for each committed add. No RF, prompts, contacts or rating evidence stored. Recipient information resolved by the authorized sender only when needed. RLS enabled; no browser access; narrow writer INSERT/SELECT, sender limited delivery-state updates. Retention/access policy requires review with DDL.

Insert success receipt and any applicable outbox event in the same transaction as membership. ALREADY_ON_ROSTER creates no additional event. Retry an old successful request after removal returns its recorded outcome with a clear historical-result indication; it must not silently re-add. This requires adding a bounded `replayed` boolean to successful response envelopes. No re-notification on replay.

Database uniqueness prevents duplicate queued events, **not** duplicate external emails after an ambiguous provider timeout. Require provider-supported idempotency keyed by immutable outbox event; otherwise choose reviewed at-most-once dispatch with ambiguous delivery held for manual reconciliation, not blind retries. Existing notification delivery has not been proven to support this. No claim of exactly-once delivery or completed side-effect concurrency tests is made.

## 9. All 112 browser writes and exact migration scope

| Class | Count |
|---|---:|
| A — already safely bounded RPC | 0 |
| B — must migrate before protected-table privilege removal | 82 |
| C — manager-only non-protected administration retained under current RLS | 30 |
| D — public/non-sensitive | 0 |
| E — proven obsolete/dead | 0 |
| F — other | 0 |
| Total | 112 |

B takes precedence over C. These are static browser table-write expressions, not all network calls. [Every W ID, file, line, table, operation and class](lms-0726-final-cutover-manifest.md) and [machine-readable classification](lms-0726-final-write-classification.json) identify the exact 82. Shared helpers, existing server routes, storage and compound side effects are additional gates in the original 162-expression inventory. No speculative dead-code deletion or rewrite of all 112.

Protected P: members, user_roles, member_season_ratings, teams, team_members, locations, matches, match_lines, line_games, match_lineups, team_byes. Their manager writes move too because the proposed browser revocation would otherwise break them. Retained C writes still need role tests and concurrency review; no Commissioner-only role administration becomes League Manager administration.

## 10. Phase 1 additive migration and application cutover

Preserve six read functions: `public.lms_page_read`, `view_as_private.page_read`, `lms_read_private.read`, `lms_read_private.lock_viewer`, `lms_read_private.competition`, `lms_read_private.people`, with previously reviewed signatures. Add only the single-purpose Add, Remove and required atomic Match Setup boundary, narrow private success receipt/outbox objects, restricted roles/policies and new-object grants. No generic mutation dispatcher. Additional internal lock/clear signatures are not yet frozen; **do not represent this list as final runnable migration contents**.

Phase 1 revokes default/public execution on new functions and grants only designated executors. Existing business-table browser privileges remain during compatibility. Prepare and rehearse application artifacts before the production additive window. The proposed 15-minute compatibility window remains a bounded deployment plan, not a claim exposure is fixed while old grants remain. Abort/rollback before Phase 2 if it cannot be met; never leave permanent dual authorization paths.

Application order and per-table revoke prerequisites are in the [cutover manifest](lms-0726-final-cutover-manifest.md): identity/profile helpers and shared guards; Player/Captain dashboards; Team Detail and team-copy roster paths; Match Setup/match/score/schedule paths; member/import/ratings/roles administration; location/team merge and season/division compound operations. All 292 inventoried read expressions are reconciled by protected table/contract; not every expression necessarily needs replacement. Replace protected browser writes with typed server boundaries, preserving approved field/resource semantics. Do not use service credentials to recreate arbitrary browser payload access.

Normal/effective viewer contracts may be prepared and security-tested as infrastructure. **Real-LMS View-As page parity begins only after Phase 2 security acceptance**, per the owner's final sequencing requirement.

## 11. Pre-tightening gates

All are required PASS with recorded evidence, not current pass claims: normal Player; Captain Dashboard; scoped Team Detail; Manage Roster discovery; Add known pass/fail/unknown/NR/races; Remove and lineup impact; legitimate cross-community discovery/admission; Match Setup pair/NR/unknown; direct-assignment and location-only Club Pro distinction; manager edit/import/ratings/role/team/location/schedule/season workflows. Also self profile/photo, public/shared competition data and compound RETURNING/select-dependent writes.

Reconcile all B expressions and protected read/helper/server/dynamic consumers; instrument browser network to show no remaining direct P access. Check stale clients fail closed with reload instructions. Test auth loss and actor/target switching; no cached broader viewer data. Deterministic fixtures and isolated database tests only; no OpenAI calls. Implementation later requires lint/build per AGENTS.md, meaningful security tests and rollback rehearsal.

## 12. Phase 2 tightening and bypass gates

Only after §11 passes, proposed reviewed migration removes **ALL PRIVILEGES** on the eleven P tables from anon/authenticated. Enumerate/clear any column grants or inherited/PUBLIC privilege paths found in preflight; table revocation alone is insufficient if another route remains. New restricted writer/reader policies remain. Existing browser policies may remain without granting access; no unrelated table/policy cleanup. Remaining six inventoried shared/admin tables retain intended RLS. Public DTO audience is preserved, not automatically expanded to anonymous access.

Exact table list: `public.members`, `public.user_roles`, `public.member_season_ratings`, `public.teams`, `public.team_members`, `public.locations`, `public.matches`, `public.match_lines`, `public.line_games`, `public.match_lineups`, `public.team_byes`. Recheck catalog/role memberships immediately before generating final reviewed SQL; no migration executed here.

After tightening, direct REST/RPC tests using real role-equivalent test credentials must deny unrelated email, raw RF, unrelated ratings, unrelated private team/roster, candidate email and candidate RF. Probe selects, embeds, filters/counts, writes, RETURNING and alternate RPC/view paths, including authenticated/self/Captain/Club Pro/manager browser sessions and anon as applicable. Normal bounded authorized workflows and intended public data must still pass. View-As cannot invoke Add/Remove/lineup writes, even with real Commissioner identity, forged actor/body, replay or omitted context. Browser visibility is not authorization.

## 13. Rollback and parity

Before Phase 2: revert application transport/build to compatible accepted baseline while old grants remain; then remove only unused new objects if necessary. Preserve receipts/security history. Report baseline exposure remains and foundation release failed. Do not claim rollback fixes the original bypass.

After Phase 2: deploy only a tested compatible server-path build, or roll forward; suspend affected actions if needed. Never deploy old direct-browser app alone. An emergency full baseline rollback would require separately reviewed coordinated privilege restoration plus application restoration and explicit acceptance that original exposure returns; it is not the default recovery plan. Preserve additive schema while compatible builds depend on it.

After security acceptance, implement one shared real LMS UI using effective viewer, persistent VIEWING AS / READ-ONLY banner and Exit, dedicated origin and accepted server mutation blocks. Preserve Member Detail normal action-row styling and REAL Commissioner/League Manager + valid-target visibility; desktop/390px/320px, focus/confirmation and no empty gap gates M01–M15 remain. Delete obsolete mini routes/components/navigation/loaders/CSS/tests only after normal foundation, View-As parity and read-only acceptance.

## 14. Implementation-readiness recommendation

**Not ready for unrestricted implementation approval or production cutover.** The bounded operation design and 82/30 inventory are reviewable; these remaining items must be resolved explicitly rather than hidden behind a generic RPC:

1. Freeze authoritative admission field/source and stage mappings, especially season-start community/availability and participation verification. Unknown-hold policy is already decided; no need to ask it again.
2. Review the restricted server transaction connection and exact lock-helper/column privileges; demonstrate concurrency compatibility for all material writers, including retained C writers.
3. Freeze Remove saved-lineup behavior and the required clear/reset atomic boundary; finalize function bodies/ACLs for the additive migration.
4. Review narrow success receipts/outbox and provider deduplication or at-most-once delivery behavior. No pending roster workflow is proposed.

After those decisions, bounded implementation can proceed only with owner approval; migration acceptance still depends on actual deterministic/race/role/normal-workflow tests. This pass did not run the requested future concurrent Add tests, did not certify live cutover readiness, and did not change production.

