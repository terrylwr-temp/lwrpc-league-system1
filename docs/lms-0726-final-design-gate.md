# LMS-0726 / 0.1.548 — final design gate

**Foundation continuation:** [Security-foundation implementation plan](lms-0726-security-foundation-plan.md) is the current continuation. Owner selected HOLD FOR LEAGUE REVIEW for unknown required Add Player facts: no provisional roster row. Six shared read functions remain; one separate atomic normal-write function and internal audit table are proposed for review. No implementation or production mutation.

**DESIGN BLOCKED — STOP FOR REVIEW.** The requested isolated proof confirms that current authenticated database reads bypass the proposed candidate-email, RF, unrelated-rating and private-team boundaries. Per the owner's RF stop condition, further probes stopped after this proof. No corrective application code, migration, production mutation, mini-LMS deletion, deployment or OpenAI call was performed. Diagnostic files and synthetic local database setup are test evidence, not application implementation.

The prior Teams/candidate/route decisions remain accepted in principle. This report supersedes any implication that six narrow read functions alone are sufficient to secure normal-browser access, or that a numeric candidate rating can establish eligibility.

## 1. Evidence and limits

- [Exact grants, columns, RLS policies and browser dependencies](lms-0726-data-api-inventory.md): **17 tables, 294 columns, 78 policies**.
- [Production metadata snapshot](lms-0726-data-api-catalog.json): owners, table/column ACLs, effective privileges, RLS flags, exact policy expressions and nine existing authorization-function definitions. Production inspection read metadata only.
- [Write-boundary metadata](lms-0726-write-boundary-metadata.json): triggers and constraints for members, ratings, roster membership and saved lineups.
- [Isolated read proof](lms-0726-direct-read-proof.json): PostgreSQL **17.11**, loopback only, **72 result records** (17 table visibility checks plus one five-bypass summary for each of four contexts).
- Existing [current source expressions](lms-0726-current-reads.md), [field manifest](lms-0726-read-fields.md), [review decisions](lms-0726-review-decisions.md), and [active Rules evidence](lms-0726-review-rules-evidence.json).

The local proof reproduces production column types, table SELECT grants, RLS enablement and every SELECT policy for the 17 tables. Rows are synthetic. Application Player/Captain/Club Pro contexts all execute as non-owner, non-superuser `authenticated`; their application-role labels do not affect these unconditional SELECT policies. Anon executes as `anon`. It does not clone DML policies/triggers/constraints or make production/PostgREST HTTP requests. Results prove database authorization under those roles, not the absence of a separate gateway firewall. The normal app's direct Supabase table calls establish that this is a relevant access path. No claim is made that a production member's records were downloaded.

## 2. Candidate meaning and eligibility states

The actual list means **members a Captain may consider/select**, not League-certified eligible players. Evidence: active/null-active candidates are listed, including missing DUPR ID/rating and known range-mismatch states; the current add workflow handles missing information after selection. Cross-community discovery is permitted where configured. No complete certification service backs the dropdown's current “Eligible” label.

Use separate concepts:

| Internal field | States / meaning | Player-facing recommendation |
|---|---|---|
| `eligibilityStatus` | `CONFIRMED`, `FAILED`, `UNKNOWN` | Eligible; Not eligible; Eligibility needs League or lineup review |
| `ratingCheckStatus` | Existing missing-ID/missing-rating/range comparison | No DUPR ID; Rating needed; Outside displayed division range; Within displayed division range |
| `nrReviewRequired` | Existing authorized raw-DUPR NR flag only | NR placement review, when true; false does NOT mean RATED |
| `validationNeeds` | Fixed non-sensitive categories: `LEAGUE_VALIDATION`, `COMMUNITY_VALIDATION`, `LINEUP_VALIDATION` | Short explanation of what remains to be checked |

**Current candidate projection returns UNKNOWN for full eligibility.** It has no authorized rule-complete source from which to emit CONFIRMED. Keep the enum for an explicitly approved future authoritative result; do not create that entitlement now. FAILED requires a conclusive, applicable necessary-condition failure from already-authorized facts with no unresolved exception. A numeric range mismatch alone is not such proof when RF/NR status and placement exceptions are unknown. Keep it as the existing range warning, not a final eligibility verdict.

Inactive-member exclusion and already-on-roster exclusion remain discovery predicates. “Already on roster” is not an ineligibility judgment. Missing data is UNKNOWN, not failure. No decision may be upgraded by real-actor Commissioner authority under View-As.

## 3. Unknown RF, participation and aggregate facts

Raw RF remains unavailable to candidate discovery at **both query and response** layers. Do not run the Ask SELF lookup for another candidate, derive a hidden RF-based verdict, or request another person's RF merely because the server could access it. There is no reviewed Captain-wide RF-derived eligibility service to reuse.

The existing `hasNrDuprDoublesRating` check reads the selected season's raw-DUPR NR indicator and drives an information-check alert. It is not a complete league NR calculation. A false flag and numeric Season DUPR do not prove RATED: numeric Season DUPR may coexist with NR under RF below 29. Candidate `displayRating` remains a numeric display only.

Community-at-season-start and own-community roster availability are not established by current candidate fields. Rule 3.5's exception requires own-community team AND availability; preserve UNKNOWN when either relevant fact is missing. Do not guess availability from team existence/counts. Participation, waiver/age/DUPR-club requirements not established from the authorized candidate contract stay unverified. No DOB/address or extra membership records are added to solve this.

Pair/team aggregate conditions cannot be certified from an individual candidate list without the actual selected lineup and applicable rule/configuration. An individually favorable rating comparison still leaves full eligibility UNKNOWN. Match Setup stays roster-only and uses its own authorized line/side data; it does not inherit candidate-directory authority.

## 4. Real Manage Roster UX

Keep the useful name, relevant Season/PrimeTime rating and selection controls. Replace the unqualified numeric-range “Eligible” wording with “Within displayed division range” and a compact “Eligibility needs League or lineup review” state. Show specific existing missing-ID/rating or range warnings without exposing security terminology. Cross-community candidates remain discoverable where the intended current workflow allows them; UNKNOWN is neither automatic acceptance nor automatic exclusion.

For a future independently authoritative confirmed result, display Eligible; for an authorized necessary failure, display Not eligible with a short reason. Current candidate data does not produce either a full pass or a numeric-only full failure. Both normal and View-As use the same DTO/state calculation; read-only mode disables Add/Remove, not discovery. The candidate field manifest is amended by `eligibilityStatus` and `validationNeeds`; all previous email/phone/raw-RF exclusions remain.

## 5. Final Add Player: independent validation is missing

The source in `/teams/[id]` rechecks some **browser-held** candidate data before a direct `supabase.from('team_members').insert({team_id,member_id})`: home-community flag, missing ID/rating, numeric range and already-on-roster. Browser-held checks are not trusted server validation. The database INSERT policy is exactly `private.current_user_can_manage_team(team_id)`; that helper checks administrator or direct captain/co-captain/Club Pro assignment. It does not check candidate eligibility, roster locks, range, RF/NR exception, community/availability or lineup conditions.

The inspected `team_members` constraints are primary key, member/team foreign keys and unique team/member pair. No non-internal team_members trigger was returned. Thus the database enforces relationship authority and uniqueness, **not final roster admission rules**. A Captain able to manage a team can bypass client admission checks with a direct insert of an existing member, subject to those constraints. This is an in-scope normal-write security blocker based on policy/constraint analysis; no production or isolated DML exploit was executed after the read stop condition.

Minimum required follow-up: a trusted normal Add Player mutation boundary must independently derive actor/team authority, reload candidate and league/season state, check roster lock and applicable admission rules, and perform the insert atomically with relevant validation/locking. It must not trust candidate display status, browser-supplied roles or browser rating values. Unknown facts need an explicitly approved provisional-review admission policy or a validation hold; do not invent that business decision. Current client behavior allows some missing-information additions and blocks numeric range even for NR, so blindly moving it server-side does not resolve the policy conflict.

Revoke direct roster INSERT only after the replacement mutation path is deployed/tested. This cannot be honestly solved by allowing writes inside one of the six read-only functions. Whether an existing narrow mutation function can be reused or an additional one is necessary remains a separately reviewed design item; no seventh function is silently added.

## 6. Exact current exposure

All 17 scoped tables have RLS enabled, FORCE RLS false, owner postgres. Anon and authenticated have table-level SELECT/INSERT/UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER grants (raw ACL also contains MAINTAIN). Browser column ACLs add no restriction; table grants cover every column. Column REVOKE alone cannot counter an existing table-level SELECT grant.

For each table, the authenticated SELECT policy is USING(true). Anon has no applicable SELECT policy. Application-role differences do not narrow authenticated SELECT. See the inventory for every column and policy name/expression, including separate accepted View-As executor column grants. No matching public view was found by the bounded definition search; this is not a complete indirect-view/RPC audit.

| Tables | SELECT today | Relevant current DML policy boundary (analysis, not DML test) |
|---|---|---|
| members | All authenticated rows/columns, including email and administrative fields | Own member or manager UPDATE, all granted columns; INSERT/DELETE manager via current_user_role. Identity coordination triggers exist; no claim about every trigger-side effect |
| member_season_ratings | All authenticated rows/seasons, including raw RF | Manager INSERT/UPDATE/DELETE |
| teams | All authenticated teams, leadership IDs, home location and private notes | Manager INSERT/UPDATE; no DELETE policy in snapshot, so DELETE sees no permitted rows |
| team_members | All authenticated team/member relationships | Direct managed-team helper for INSERT/UPDATE/DELETE; no final eligibility/roster-lock check |
| match_lineups | All authenticated saved lineups, player IDs and both sides | Managed-lineup-team helper for CRUD; helper checks team assignment, not whether team is a side of supplied match. FK/unique constraints do not establish that relationship |
| matches | All authenticated matches, including unpublished and private metadata | Manager INSERT/DELETE; managed-match UPDATE |
| match_lines | All authenticated lines, participant IDs and rating snapshots | Manager INSERT/DELETE; managed-match UPDATE |
| line_games | All authenticated games | Managed match-line INSERT/UPDATE; manager DELETE |
| team_byes | All authenticated byes | Managed-team INSERT/UPDATE/DELETE |
| user_roles | All authenticated Auth/member/role relationships | Commissioner INSERT/UPDATE/DELETE |
| seasons, leagues, divisions, division_lines, locations, team_standings | All authenticated rows/columns | Manager CRUD through existing helpers |
| score_sheet_templates | All authenticated templates | Manager/Commissioner via member-email/role predicate; page navigation's Commissioner threshold is narrower |

Anon CRUD is not authorized merely by its table grants: no applicable policies here. UPDATE requires both an eligible row and policy/column privileges; INSERT requires WITH CHECK; DELETE requires USING. Do not equate grants with successful writes. TRUNCATE is not a standard PostgREST table CRUD endpoint; this report does not call that ACL an HTTP truncate exploit.

The managed-team/lineup helper currently lacks the Captain Dashboard's location-based Club Pro branch. That is an existing read/write scope mismatch; do not broaden write rights silently while closing read leaks.

## 7. Effective direct-read results by role

| Context | Unrelated candidate email | Raw RF | Unrelated season rating | Private team notes/leadership | Unrelated roster relationships |
|---|---|---|---|---|---|
| anon | No rows | No rows | No rows | No rows | No rows |
| authenticated Player | **Readable** | **Readable** | **Readable** | **Readable** | **Readable** |
| authenticated Captain | **Readable** | **Readable** | **Readable** | **Readable** | **Readable** |
| authenticated Club Pro | **Readable** | **Readable** | **Readable** | **Readable** | **Readable** |

All 17 tables returned the unrelated synthetic row to each authenticated context. These are confirmed database-level bypasses, not merely GRANT findings. Limiting the new RPC output while retaining these permissions would be ineffective confidentiality. The RF proof activates the owner's STOP requirement; correction validation and additional mutation probes have not been run.

## 8. Public/private distinction and minimum correction proposal

Preserve intentional public/shared team names, hierarchy, standings and published scores through existing sound public routes or the shared `teamPublic`/`matchPublic` contracts. Current ordinary LMS table SELECT is authenticated, not anonymous public. Public event policies remain outside this correction. Do not expose participant/contact/private notes merely because a team name is visible.

The smallest sound approach must address **table-level grants**, migrate dependent browser reads, and preserve or replace mutation dependencies. Proposal for review, not an applied or fully certified migration:

| Object | Before | Required after / disposition |
|---|---|---|
| members | Browser whole-table SELECT; authenticated all rows | Remove whole-table SELECT; no direct candidate email/profile columns. Migrate member/profile/roster/admin reads to shared contracts. Any retained direct identifier/profile access needs explicit column+row policy and mutation dependency proof; no blanket self-edit of administrative fields |
| member_season_ratings | Browser whole-table SELECT; all seasons/RF | Remove whole-table SELECT; no direct raw RF or unrelated rating access. All rating reads through scoped self/roster/candidate/admin contracts. A self-only row policy alone is insufficient because raw RF itself must not become a general browser rating read |
| teams | Browser whole-table SELECT includes private fields | Remove whole-table SELECT; if retaining direct shared reads, regrant only reviewed teamPublic columns, retaining intended audience. Private team/leadership/notes through manager/scoped contracts |
| team_members | Browser all relationships | Remove broad direct SELECT; roster relationships through shared authorized contracts. Direct mutation selector/RETURNING dependencies must be migrated or narrowly supported |
| match_lineups | Browser all saved lineups | Remove broad direct SELECT; selected-side/authorized reveal contracts only; normal save/readback compatibility must be proved |
| matches, match_lines | Browser unpublished/private metadata | Replace broad SELECT with reviewed published-display column/row contract or migrate all direct reads. Prefer shared published DTO until exact compatible direct policy is reviewed; do not regrant all columns |
| user_roles | Browser all user/member mappings | Migrate browser identity/navigation/admin-role readers; remove broad mapping SELECT. Trusted identity/role resolution and intended administrative view remain |
| seasons/leagues/divisions/locations/standings/line_games/byes/templates | Authenticated broadly shared competition/configuration | Do not blindly revoke. Retain sound intended shared reads only where field and publication joins are sufficient; scoped/private dependencies migrate. Remaining per-column publication review is a blocker to a final grant manifest, not permission to expose them by default |
| team_members INSERT (and mutation bypasses implicated above) | Direct management-only admission check | Trusted independent admission mutation first; remove bypassing direct INSERT after replacement. Exact policy/locking/unknown-admission treatment requires review |

**No unconditional revoke script is approved by this report.** Removing table SELECT may break UPDATE filters, RETURNING/select and client role lookups, even when INSERT/UPDATE grants remain. Regranting sensitive columns to authenticated to repair those failures would reopen the leak. The exact post-cutover safe column/row matrix and mutation replacements are not yet verified; consequently this is DESIGN BLOCKED, not an implementation-ready SQL package.

Reuse sound existing manager/team write predicates where applicable. Do not replace them wholesale merely for SECURITY DEFINER uniformity. Tighten only the proven bypasses; preserve accepted View-As credential isolation and mutation denial.

## 9. Direct browser dependency migration

The inventory enumerates every matched direct `.from(...).select(...)` source expression for each of the 17 tables, including server/helper files clearly distinguished from browser pages. Critical normal consumers: shared Auth/member lookup/navigation, Admin/Player/Captain dashboards, Teams/Team Detail, Match Setup, matches/score entry/live match/scoring, Members/Member Detail/Ratings/import, standings/schedule dialogs, scheduling/editor, seasons/leagues/divisions/locations/templates, and Ask drawer's team context. Optional history and dialog reads are dependencies too.

Classification:

- **A retain:** genuinely sound public/static or authenticated shared-field read with sufficient RLS/column/publication enforcement; not private member/rating SELECT(true).
- **B migrate:** private member, role, team, roster, candidate, lineup, ratings and private match data to the six shared server functions; normal and View-As use identical contracts.
- **C revoke after replacement:** browser table/column permissions that still allow wider data than those contracts, including email/RF/unrelated ratings. Existing SQL helper calls and write selectors need dependency testing before cutover.

Static census is not full runtime certification: dynamic table-name counts, imported helper callers, old tabs, Realtime and mutation RETURNING paths must be checked. No completed dependency migration or end-to-end revoke compatibility is claimed.

## 10. Six-function security confirmation

The following **proposed** signatures remain unchanged; all return jsonb and set search_path to empty. They do not exist as implemented LMS-0726 code yet, so ACL success is a design requirement, not an executed six-function test.

| Signature | Owner / security | Allowed EXECUTE after PUBLIC/anon/authenticated revocation |
|---|---|---|
| public.lms_page_read(p_actor uuid,p_contract text,p_args jsonb) | lms_page_reader / DEFINER | service_role plus owner |
| view_as_private.page_read(p_proof jsonb,p_contract text,p_args jsonb) | lms_page_reader / DEFINER | lms_view_as_executor plus owner; not service_role directly |
| lms_read_private.read(p_actor uuid,p_proof jsonb,p_contract text,p_args jsonb) | lms_page_reader / INVOKER | owner only |
| lms_read_private.lock_viewer(p_actor uuid,p_proof jsonb,p_contract text,p_args jsonb) | postgres / DEFINER | lms_page_reader plus owner |
| lms_read_private.competition(p_viewer jsonb,p_contract text,p_args jsonb) | lms_page_reader / INVOKER | owner only |
| lms_read_private.people(p_viewer jsonb,p_contract text,p_args jsonb) | lms_page_reader / INVOKER | owner only |

Only trusted normal Auth resolution may supply p_actor; only the accepted LMS-0724 dispatcher supplies proof. Resource IDs never authorize effective identity. Internal viewer is built under locks, not accepted from browser JSON. Fixed contract/field allowlists, no arbitrary queries, no browser grants, no data-table ownership/BYPASSRLS on runtime role. Candidate RF query and output remain prohibited even though explicit manager ratings branch may require RF. Six-function review cannot compensate for open underlying table reads.

## 11. Migration and deployment ordering

Keep `<CLI-generated-timestamp>_lms0726_shared_page_reads.sql` additive first: six read functions, private schema/role, explicit executor grants and dispatcher delegation. Do not combine blind browser revokes with an application version that still depends on browser reads.

Required order once unresolved design is approved:

1. Finish exact safe column/RLS and independent Add Player mutation design; certify normal write/RETURNING/identity dependencies in isolated production-matched schema. No production mutation at this design stage.
2. Apply separately approved additive server-read objects while old normal app still works. This does not close existing leaks; do not call the interim state secure.
3. Deploy compatible shared-read app and independently validated mutation path; migrate **all affected normal consumers**, not only View-As. Keep mini-LMS until parity proof. Use an explicit controlled cutover window and old-client handling.
4. Verify replacement paths using deterministic/synthetic tests and approved targeted acceptance. Gate completion on no remaining sensitive browser table reads.
5. Apply a separately reviewed `<CLI-generated-timestamp>_lms0726_data_api_boundary.sql` with exact table-grant removals, safe column grants/row policies, and required direct-mutation closure. No such SQL file is authored here. Block stale clients rather than falling back to broad SELECT.
6. Verify negative direct-access tests and positive normal workflow/public-field tests; only then can confidentiality be accepted. Complete parity/read-only proof, then remove obsolete mini presentation and review snapshot retirement.

No function-count increase is approved. If an atomic mutation function is technically necessary, justify it separately; do not sneak a write into the six read functions. A migration/deployment schedule cannot resolve missing admission semantics by itself.

## 12. Replay and rollback

Record exact before ACL/policy/function hashes from the metadata, verify signatures/owners/search paths, and reject drift instead of blind CREATE OR REPLACE. Test additive apply, identical replay, unexpected drift, transactional failure and rollback before production. Revoke table-level SELECT before considering column regrants; test effective privileges, not just ACL text.

Before cutover, additive objects can be rolled back after application dependency removal while preserving accepted LMS-0724 infrastructure. **After tightening, do not automatically restore broad email/RF SELECT merely to make an old build work.** Prefer rolling forward or a controlled read-only maintenance state with the secure compatible app. An old app rollback requires a reviewed compatibility plan; restoring old broad grants is an explicit security rollback requiring owner approval. Never CASCADE unknown dependencies or remove historical migrations. No rollback executed.

## 13. Normal-user impact

**NORMAL USER BEHAVIOR UNCHANGED (intended):** assigned Captain/Co-Captain/Club Pro dashboard/roster/setup use; legitimate cross-community discovery; manager administrative functions; minimum public/shared standings/results; no-Auth effective target reads; accepted Ask SELF RF and View-As security; Member Detail action-row/button requirements.

**NORMAL USER BEHAVIOR PROPOSED TO CHANGE:** direct global Teams/private unrelated routes denied below manager; direct table extraction of unrelated email/RF/ratings/roles/lineups/private team data denied; candidate “Eligible” becomes a qualified rating comparison plus UNKNOWN overall eligibility; private reads use server transport; candidate queries paginate; stale clients using revoked paths fail closed/reload. Normal Add Player requires trusted validation and an explicit unknown/provisional-admission decision. That last behavior is not yet approved and is an implementation blocker. Profile/lineup write scope also needs bounded dependency review; do not claim it unchanged if current unintended writes are removed.

## 14. Permanent acceptance controls

| Control | Required after correction | Current evidence |
|---|---|---|
| Player direct candidate email | DENIED | **FAIL: readable in isolated matched SELECT proof** |
| Captain unauthorized candidate email | DENIED | **FAIL: readable** |
| Captain raw RF | DENIED | **FAIL: readable — stop condition** |
| Captain unrelated rating | DENIED | **FAIL: readable** |
| Player private global Team Detail/relationships | DENIED | **FAIL: readable** |
| Club Pro private data outside assignment | DENIED | **FAIL: readable** |
| Intended shared/public team/standings/results | PASS with exact intended fields | Current authenticated SELECT works but is overbroad; revised boundary untested |
| Assigned normal Captain reads/setup | PASS | Replacement not implemented/tested |
| Legitimate cross-community candidate | PASS with minimum fields and honest UNKNOWN | Design defined; replacement not implemented |
| Numeric Season DUPR + unknown RF | UNKNOWN overall; never inferred RATED | Required deterministic fixture |
| Known NR / unknown participation / unknown pair aggregate | Preserve unknown or known scoped status; no blanket eligibility | Required deterministic fixtures |
| Add Player tampered display state/locked roster/out-of-scope candidate | Trusted independent validation, no client-state authority | **BLOCKER: current policy checks management only** |
| Direct six-function browser invocation | DENIED | Proposed ACL only, not an executed pass |
| Stale client/RETURNING/identity lookup after revokes | Safe compatible path or fail closed; no broad fallback | Not yet certified |

Keep RD01–RD22, RB controls, all LMS-0724 security tests and Member Detail M01–M15. Confirm anonymous and authenticated access separately; verify response field absence **and** direct underlying-table denial. Positive tests must ensure privacy correction does not destroy the real assigned-team UI.

## 15. Final readiness recommendation

**DESIGN BLOCKED.** Unknown candidate eligibility is safely definable as above, but three items prevent implementation readiness:

1. Proven direct email/RF/ratings/private-team bypasses require an exact post-cutover privilege/RLS manifest whose normal browser/mutation dependencies are migrated and verified. The current six-function proposal alone is not secure.
2. Normal Add Player lacks independent server admission validation. Unknown/provisional admission and numeric-range versus NR exception behavior need a bounded reviewed mutation design; current read-only scope cannot silently repair it.
3. Secure cutover/rollback compatibility, including SELECT-dependent writes and stale clients, has not been demonstrated. The sequence is proposed, not certified.

No unconditional SQL or application implementation is recommended. Per the requested stop condition, report these minimum correction requirements and obtain the next bounded design direction before additional probes or implementation.
