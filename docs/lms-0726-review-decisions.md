# LMS-0726 / 0.1.548 — Teams, candidates and shared route decisions

**Foundation continuation:** [Security-foundation implementation plan](lms-0726-security-foundation-plan.md) is the current continuation. Owner selected HOLD FOR LEAGUE REVIEW for unknown required Add Player facts: no provisional roster row. Six shared read functions remain; one separate atomic normal-write function and internal audit table are proposed for review. No implementation or production mutation.

**Final gate:** [DESIGN BLOCKED](lms-0726-final-design-gate.md). Full candidate eligibility is UNKNOWN with current authorized facts; numeric rating/false NR flag cannot prove RATED. Direct email/RF/rating/private-team bypasses confirmed. Independent normal Add Player admission validation remains missing.

**DESIGN ONLY — STOP FOR REVIEW.** This implements the owner's review direction in documentation, not application code. Six server-only functions and two shared data projections remain the budget. No SQL application, mini-LMS deletion, deployment, model call, personal-data read or Auth-account creation occurred.

This document supersedes G1–G3 and the candidate output in the previous [read-boundary design](lms-0726-read-boundary-design.md). Its signatures/ownership/rollback remain as repeated below. Source-query evidence remains historical, including legacy broad selectors; it is not a proposed permission grant.

## 1. Current evidence and Rules baseline

Reviewed the actual Teams page, Team Detail/Manage Roster, Captain Dashboard entry points, permissions/navigation, standings, live-match and division-detail routes. Current official Rules were read directly from the existing active corpus, without retrieval/model generation: **LWR Pickleball Club DUPR League Rules, active version `v20260908162017-f0aad5ad`**. [Retained non-personal evidence](lms-0726-review-rules-evidence.json), chunk ordinals 6, 7, 9 and 10, pages 2–3.

Rule 3.4 assigns community by primary address at season start. Rule 3.5 permits cross-community participation, with the exception requiring BOTH an own-community team in the division AND roster availability for additional players. Rule 3.6 prioritizes local players; it is not a blanket prohibition on outsiders. Rule 3.7 allows same-community multiple-team/substitute participation subject to other requirements. Rules 4.1/4.2 concern established Season DUPR; 4.1.1 classifies RF below 29 as NR; complete Rule 4.5 permits NR participation with placement guidance and Captain responsibility. No source/corpus changes proposed.

The actual roster loader's candidate filtering is less complete than those Rules. Current database member location is not proven to be a season-start community record. No authoritative roster-capacity/availability field was found in the reviewed teams/division schema. Do not infer availability from roster count, a guessed maximum, absence of a team, or the commissioner's knowledge. This limits automated eligibility certification, not legitimate candidate discovery.

## 2. Legacy Teams access decision

**Proposed intended contract: `/teams` is the administrative Teams & Rosters workspace for effective League Manager/Commissioner. Captain/Co-Captain/Club Pro enter their assigned team's real Manage Roster through Captain Dashboard.** They do not need the global administrative Teams workspace to do that job. Player uses Player Dashboard, published competition information and standings, not private Team Detail.

Evidence of purpose: `adminNavigation.js` assigns the Teams & Rosters card to `league_manager`, describes creation/roster management, and Captain Dashboard explicitly links Manage Roster to `/teams/${selectedCaptainTeam.id}` (near lines 3096 and 3469). `/teams` nevertheless calls `requireRole(captain)` and lists all loaded teams. Its normal filter is active/search, not an ownership filter. Team Detail likewise accepts any team UUID after a Captain threshold; `canModifyRoster` is role/lock based, not sufficient relationship authorization.

Those direct-route gaps are incidental/legacy overbreadth, not evidence of an intended Commissioner-like Captain entitlement. Exact original intent cannot be proven from code alone; the owner direction plus actual navigation/workflow supports this bounded proposed product contract. Global private team access will change explicitly, while legitimate roster work and shared competition browsing remain.

| Role / relationship | Reads available through current Teams/Team Detail code | Product/workflow evidence | Proposed normal AND View-As |
|---|---|---|---|
| Player | `/teams` and detail client threshold denies below Captain; broad authenticated database policies separately exist | Player Dashboard, team membership, schedules/standings | Deny `/teams` and private `/teams/[id]`; retain own dashboard and published/shared competition display |
| Captain | Can enter global `/teams` directly, receive all teams/leadership data; any Team Detail UUID can load roster/candidates/history after threshold. Locked roster redirects below manager | Dashboard Manage Roster links target assigned team | Global `/teams` denies/redirects to dashboard; detail only managed team, respecting existing roster lock |
| Co-Captain | Same as Captain if durable Captain-or-higher role exists; assignment alone does not satisfy current threshold | Both co-captain team fields are recognized in dashboard | Same predicate as Captain for either co-captain field; do not invent/promote a role |
| Club Pro | Captain threshold admits global `/teams`/any detail; dashboard itself uses direct and home-location assignments | Home-location support and assigned team roster work | Global `/teams` denies; detail/setup only assigned/direct or assigned-location teams; no other-location team management |
| League Manager | Global team/leadership/roster/candidate administration | Explicit administrative navigation | Preserve intentional administrative breadth with effective-manager predicate |
| Commissioner | Same administrative access plus higher-role functions | Explicit administration | Preserve; never use real Commissioner breadth for a lower-role target |

Current reachability above is established by source plus previously inspected authenticated SELECT policies, not by probing members' records. It distinguishes page data from arbitrary database access; no claim that hiding a route repairs broad table policies.

## 3. Shared predicates and public/team distinction

Internal `E` is the server-derived effective member and role set. `manager(E)` means the existing highest-role policy is League Manager or Commissioner. `captainLevel(E)` means Captain or higher under existing role ordering. Durable multi-role and assignments are retained.

`managed(E,T)` is `captainLevel(E)` AND one of:

- E.member equals T.captain_member_id, T.co_captain_member_id, T.co_captain_2_member_id or T.club_pro_member_id;
- a locations row L has L.id = T.home_location_id and E.member equals L.club_pro_member_id or L.club_pro_2_member_id.

`privateTeam(E,T) = manager(E) OR managed(E,T)`. Team must exist; role/member validity and current assignments are rechecked under the lock coordinator. Previous-season/inactive-team browsing uses existing explicit filters and retained assignments; do not silently erase legitimate history by adding an unconditional active-team predicate. Normal roster lock rules are separate from team visibility.

`rosterRead(E,T) = privateTeam(E,T) AND (league.rosters_locked IS NOT TRUE OR manager(E))` for the real Manage Roster route. Preserve its existing locked-route redirect; dashboard's already-visible roster summary need not disappear. Candidate contract additionally requires this roster workflow and the same selected team. Match Setup requires `privateTeam(E,T)` plus T is home or away of selected match and the existing dashboard's setup availability; it never calls candidate discovery.

`teamsAdmin(E) = manager(E)`. `divisionConfig(E) = manager(E)`. `publishedCompetition(E,M)` requires a valid normal/effective member context and M.is_published = true. Do not assume anonymous access for LMS standings/live-match: inspected policies require authenticated context. A separate genuinely public event display keeps its existing public-status/capability predicate.

Public/shared team DTO is **teamPublic: id, name, abbreviation, division_id**, joined only to hierarchy names/ranks/scores/scheduled venue fields appropriate to the standings/schedule screen. A visible team name does not permit resolving its captain's contact, private notes, roster or candidate list. Competition match DTO uses **matchPublic** (field manifest); line/game display may include published participant names and scores already present in the match display, not member contact/profile fields. Private match/setup endpoints have distinct resource predicates even when they render parts of the same screen.

## 4. Actual roster candidate scope

Current `/teams/[id]` reads up to 5,001 active-or-null-active member rows, all selected-season ratings, then filters candidates in the browser. `availableMembers` excludes current roster members and filters by selected community. When `only_home_community_players` is true and viewer is below manager, it locks selection to the team's home community; a missing home location gives an empty candidate list. Otherwise the normal selector permits other communities or all communities. It matches member.location_id OR normalized member.club_location to location.name, sorts last name/first name, and labels rating status. It does not filter all ineligible players out of discovery.

Current rating display selects **one** value from the team's division.rating_type: Season PrimeTime for primetime, member.self_rating for self_rating, otherwise Season DUPR, using the team's league.season_id. `addPlayer` blocks a known numeric out-of-range rating; missing DUPR ID/rating is allowed into the existing information-check workflow. A raw DUPR value equal to NR triggers an alert after addition. The code does not consult RF for candidates, does not establish full Rule 3.5 eligibility, and does not use DOB to certify age. Preserve the distinction between discovery, range status and final admission.

Proposed discovery predicate, evaluated inside `people` for BOTH modes:

1. Validate `rosterRead(E,T)` and derive division/league/season from T; the browser cannot supply a replacement season or role.
2. Require candidate.is_active_member = true OR IS NULL, matching current behavior. Exclude existing team membership exactly as current roster membership selection does; do not introduce a new is_active interpretation silently.
3. If league.only_home_community_players = true and NOT manager(E), require T.home_location_id and force that location. Reject an attempted other-location filter instead of accepting it as authority.
4. Otherwise allow the existing selected community or All option, including legitimate cross-community candidates. Validate any selected location exists. Use the current normalized name/ID match; document normalization collisions/unknown community as uncertain, not proof of Rules eligibility.
5. Apply bounded name search, stable sort (last, first, id) and pagination; return total matching candidate count and page cursors without whole-directory transfer. Cursor binds viewer/context, team, filters and season. No arbitrary candidate detail endpoint; a supplied candidate ID must still belong to this exact population and return only the candidate DTO.
6. Return the existing narrowly scoped rating/verification indicators. A candidate appearing is not a claim that membership, waiver, age, DUPR club, community availability and all Rules were independently verified.

Do not require candidate.home_location = team.home_location universally. Do not require a candidate already be a managed roster player. Conversely, authorization to discover a candidate does not authorize their email, phone, history or full season-rating rows.

## 5. Cross-community handling and known policy gaps

The candidate population preserves existing cross-community selection where the league flag allows it. The owner's Rule 3.5 qualification is retained in contextual guidance: own-community team AND roster availability, not merely own-community team existence. Local-player priority can remain guidance; do not convert it into a hard exclusion.

`only_home_community_players=true` remains an explicit configured restriction for now; this design does not silently change league configuration or declare the flag equivalent to Rule 3.5. If an active league has that flag set contrary to the intended exception, report the exact configuration conflict for owner review before changing it. No league rows were read or changed in this continuation, so no current flag values are asserted.

For unknown season-start community or own-community roster availability, return no invented Boolean. Proposed `communityEligibilityStatus=NOT_VERIFIED` is honest context, not a blocker silently added to current normal admission. A rule-complete automated decision would need authoritative availability/community facts and separate business-rule review. This release should establish read authorization and preserve discovery; it must not invent data, change admission writes or grant RF access to claim complete eligibility.

## 6. Exact candidate output and sensitive fields

Candidate response: `{id, first_name, last_name, ratingType, seasonId, displayRating, hasDuprId, ratingCheckStatus, nrReviewRequired, communityEligibilityStatus}`. Only id/name are direct member output. `ratingType` is the selected division's existing type; `seasonId` is its league's season. `displayRating` is that one authorized numeric value or null, not all rating columns. `hasDuprId` is a Boolean, not the raw ID. `ratingCheckStatus` is one of `NO_DUPR_ID`, `RATING_MISSING`, `OUTSIDE_RANGE`, `IN_RANGE_NOT_FULL_ELIGIBILITY`, in that missing-ID, missing-rating, outside-range, otherwise-in-range presentation priority. `nrReviewRequired` independently derives only from the existing raw-DUPR NR indicator already consumed by Manage Roster, never from RF. Neither indicator alters normal add authorization. Current add code blocks a known out-of-range numeric value before considering the NR alert; this can conflict with a rule-complete NR placement interpretation. Record that mismatch for separate admission-policy review rather than silently changing writes or claiming this status certifies Rule 4.5 compliance.

The updated field manifest distinguishes **candidate** output (id/first_name/last_name) from **candidateInternal** inputs (id/first_name/last_name/location_id/club_location/is_active_member/dupr_id/self_rating). Internal inputs are not serialized. Rating derivation may read the selected season's relevant numeric column and dupr_doubles_rating only to compute the already-used NR flag; raw rows/NR value are not returned. No candidate RF access at any layer, including server calculation. No query to Ask SELF RPC for candidates. Community status remains NOT_VERIFIED until authoritative facts are separately approved.

| Sensitive field | Exact permitted workflow / effective role | Candidate treatment |
|---|---|---|
| email, phone | Own profile; assigned roster contact for Captain/Co-Captain/Club Pro under privateTeam; intentional LM/Commissioner member administration | Absent, even if that person could separately be queried under an independently authorized roster workflow |
| raw DUPR ID | Current managed roster display/administration where used; own profile | Boolean hasDuprId only |
| Season DUPR / PrimeTime | One relevant selected-season rating for candidate selection; scoped roster and own display; effective-manager ratings administration | One selected numeric display, no unrelated seasons/rating types |
| raw DUPR/NR | Existing managed/admin rating workflow; internally only to derive existing candidate NR-review indication | No raw value or extra numeric DUPR returned |
| raw RF | Accepted Ask SELF only; existing intentional effective-manager ratings administration | Neither read nor returned for candidate/Match Setup/Club Pro support |
| community/location | Candidate filter validation inside server; existing managed roster community display; own profile/admin | Not necessary in candidate rows when selector supplies context; no address/DOB |
| membership/renewal | Existing managed-roster status display, self profile/admin | Active/null-active filter only; no membership status, renewal date, waiver or billing fields in candidate output |
| history, other-team membership | Existing authorized managed-roster history and own history; manager administration | None before roster entitlement; discovery never grants history |
| roles, administrative notes/provider IDs | Effective identity/navigation, manager member administration only | None |

The page's old generic `rating` array must not be sent alongside candidate DTOs. That would bypass the minimization. Admin callers may separately request explicitly administrative contracts; using the candidate contract still produces the same minimal shape. Do not add mode-specific extra fields.

## 7. Match Setup and no-Auth targets

Match Setup's member set is **the selected team's existing roster**, joined to that match/season and selected side. It receives only fields that its actual display/normal workflow needs; any email-sending input stays on the normal mutation path where possible. It receives no candidate search, all-community list, candidate RF or whole-season ratings. Changing team ID must re-run side and managed-team authorization. Other-side lineup details obey existing reveal rules; status-only views use derived completeness rather than hidden player rows.

No-Auth Captain/Club Pro uses accepted durable member/role/team/location identity; the same predicates and candidate DTO apply. Co-Captain assignment without the normal durable Captain-level role is not an automatic role upgrade. No Auth account/session is created, and neither actor Auth nor actor role broadens target access.

## 8. Flagged route/security matrix

All proposed guards run server-side before protected data loading and again inside the fixed SQL contract. Client redirects are UX only. In View-As initial navigation may render a non-sensitive shell until the tab's protected context is restored; no protected SSR using administrator cookies.

| Route | Sensitivity / intended normal role | Current guard and gap | Shared proposed guard / View-As behavior | Normal behavior proposed to change |
|---|---|---|---|---|
| `/teams` | Administrative team/leadership management; LM/Commissioner | Client minimum Captain, broad listing; inconsistent manager navigation | teamsAdmin(E); unauthorized deny/redirect, never actor fallback | Direct Captain/Club Pro global admin access ends |
| `/teams/[id]` | Roster contacts/history/candidates; manager or assigned Captain/Co-Captain/Club Pro | Client Captain threshold + roster-lock logic; UUID not ownership proof | rosterRead(E,T), fixed DTOs; same real page read-only | Unrelated-team access denied; candidate payload minimized |
| `/captain-dashboard` plus roster/setup subreads | Private assigned-team operational data; Captain-level durable role/assignments | Client role and relationship filtering; related follow-up queries not independently trusted | captainLevel plus managed resource set on every subread | Direct forged team/modal requests denied; normal assigned workflow unchanged |
| `/matches/[id]`, `/score-entry/[id]` | Private score/roster/setup information; manager or assigned Captain-level match side | Client Captain check; action permissions stronger than some reads | manager OR managed(E,home/away), with existing match/score availability. Same component read-only in View-As | Unrelated private score-entry URL denied; published results still available via display |
| `/live-match/[id]` | Published match participants/scores; valid member context | No local role/publication guard; broad match selector | publishedCompetition(E,M), matchPublic/participant names/games only | Unpublished or anonymous URL denied; sensitive notes/metadata omitted |
| `/divisions/[id]` | Administrative division/line configuration; manager | No explicit route role guard | divisionConfig(E); same guard as parent admin route | Non-manager direct configuration URL denied |
| `/standings` and shared schedule dialogs | Shared authenticated competition info; Player+ | Client Player check/publication filters | Valid E + selected division/publication predicate; minimal competition DTO | Prevent bypass of filters through forged private-resource request; legitimate division browsing unchanged |
| `/members/[id]`, `/ratings` | Administrative PII/ratings; LM/Commissioner | Client manager role plus existing endpoint guards/direct table reads | Explicit effective-manager shared read contract; separate real-actor View-As-start check | Lower-role target direct URL denied even when real actor is Commissioner |

These are the implicated parity routes, not a newly authorized full-application audit. Known broad authenticated members/ratings table policies remain a material **separate Data API path**: server route guards alone cannot make direct table reads private. The six-function design does not claim otherwise. Before claiming normal-user field privacy against arbitrary direct Data API requests, review and test a bounded read-policy/column-grant migration with all remaining normal consumers and mutation SELECT dependencies. That work is not silently included in unchanged baseline RLS or falsely marked solved here. No new out-of-scope sensitive route was probed; this existing limitation is retained as a security sign-off gate. Stop before implementation/SQL approval if the requested security claim includes closing that path without a reviewed dependency plan.

## 9. Exact six functions and two shared projections

No seventh function is needed for these decisions. Signatures below all return jsonb. Unknown contracts/argument keys deny; no dynamic table/column/query input. The same `lms_read_private.read` selects the same competition/people functions in both modes.

| Exact signature | Owner / mode / search_path | EXECUTE grant after revoking PUBLIC/anon/authenticated |
|---|---|---|
| `public.lms_page_read(p_actor uuid,p_contract text,p_args jsonb)` | lms_page_reader / SECURITY DEFINER / `''` | service_role only, plus inherent owner |
| `view_as_private.page_read(p_proof jsonb,p_contract text,p_args jsonb)` | lms_page_reader / SECURITY DEFINER / `''` | lms_view_as_executor only, plus owner; no service_role direct entry |
| `lms_read_private.read(p_actor uuid,p_proof jsonb,p_contract text,p_args jsonb)` | lms_page_reader / SECURITY INVOKER / `''` | owner only |
| `lms_read_private.lock_viewer(p_actor uuid,p_proof jsonb,p_contract text,p_args jsonb)` | postgres / SECURITY DEFINER / `''` | lms_page_reader only, plus owner |
| `lms_read_private.competition(p_viewer jsonb,p_contract text,p_args jsonb)` | lms_page_reader / SECURITY INVOKER / `''` | owner only |
| `lms_read_private.people(p_viewer jsonb,p_contract text,p_args jsonb)` | lms_page_reader / SECURITY INVOKER / `''` | owner only |

Normal: online verified Auth → shared resolveViewer → public.lms_page_read(trusted actor, fixed contract, validated resource args) → read → lock_viewer → projections. View-As: accepted resolveEffectiveViewer → lms_view_as page_read branch → private page_read(trusted accepted proof) → SAME read → lock_viewer → SAME projections. No browser-selected effective member, role or location authority. Stored actor credential remains in the accepted boundary only.

`competition` replaces legacy direct teams/division/schedule/standing/match/line/game/configuration reads across Teams, dashboards, Match Setup and display pages. Its public/shared groups cannot include private team/contact fields. `people` replaces browser email-resolution reads, all-candidate-member loads, all-season rating loads and private roster/member reads with fixed self/roster/candidate/admin contracts. Both projections are used by normal LMS as well as View-As; there are no paired normal/view business loaders. Existing Ask/source functions remain accepted and unchanged.

Fixed contract amendments: `teams` now requires manager; `roster`/`roster.candidates` require rosterRead; `match.setup` requires managed selected match side; `match.detail` private score path requires manager/managed side; published display uses competition published contract with matchPublic; division configuration requires manager; candidate output is the exact DTO in section 6 rather than candidate + rating rows. Contract enum branches do not add RPCs. Rest of the prior contract catalog remains subject to these narrower field/role overrides.

## 10. Updated SQL/grant plan

Proposed filename remains `<CLI-generated-timestamp>_lms0726_shared_page_reads.sql`; no SQL file authored/applied. One NOLOGIN/NOSUPERUSER/NOBYPASSRLS/NOINHERIT runtime role `lms_page_reader`, one private schema `lms_read_private`, six functions, one additive delegation in existing `public.lms_view_as`. No Auth, member, role, team, ratings or source rows changed.

Column grants: exact union of reviewed [field JSON](lms-0726-read-fields.json); candidateInternal is server-only and not a new client entitlement. No blanket SELECT; no writes; no public/browser execution. RF column access, already needed by explicitly administrative ratings contract in the overall projection, MUST be absent from candidate/setup SQL branches, not merely stripped after reading. Full function review and fixture query tracing must prove this. Private helper locks alone inspect accepted identity/context; read executor gets no credential/Auth table access.

RLS: preserve existing normal writes and accepted lms_view_as_executor grants/policies. New lms_page_reader SELECT policies TO that role permit the fixed code to read its granted columns; the fixed code implements exact effective-member/resource predicates. These policies are not target-scoped by themselves and do not solve the legacy Data API exposure described in section 8. Do not modify ordinary authenticated SELECT policies without that separate dependency review. No runtime role owns public tables. Empty search_path, qualified names, no user-chosen executable identifiers; revoke default PUBLIC EXECUTE in the creation transaction.

Lock/revalidation: preserve accepted View-As proof/identity locking; lock relevant members/roles, team, location mapping, memberships and hierarchy, re-read relationships and publication/roster flags before projecting. Candidate cursor membership must be recalculated on each request. Role additions as well as removals and cross-community mapping changes need race tests; do not assume locking existing role rows prevents insert phantoms. Any need to change writer synchronization must be reported before altering normal writes.

Replay/idempotency: verify exact role attributes/signatures/owners/ACL/search_path and approved hashes; identical replay succeeds, drift fails; no blind overwrite. Test initial apply/two identical replays/failure rollback in isolated DB. No business backfill. Rollback restores prior dispatcher, removes only new entries/functions/role-specific policies/grants/schema/role after dependency checks, retains old snapshot until parity/removal approval. Never CASCADE unknown dependencies. Later snapshot retirement remains a forward migration after consumer removal; historical migration files remain intact.

## 11. Security controls (design, not executed)

| ID | Fixture / attempted access | Expected result in both modes |
|---|---|---|
| RD01 | Player direct `/teams` or private `/teams/:id` | Deny/redirect; own dashboard/shared standings remain |
| RD02 | Captain managed Team Detail vs unrelated UUID | Managed real page; unrelated denies before roster/candidate load |
| RD03 | Both co-captain fields, with/without durable Captain-level role | Assigned role-valid fixture succeeds; no implicit role upgrade |
| RD04 | Candidate active/null-active, existing roster, inactive | Exact normal discovery set; existing roster/inactive excluded |
| RD05 | Candidate outside selected authorized filter / forged candidate ID | No row; cannot turn selector into general member lookup |
| RD06 | Legitimate cross-community candidate, league allows broader scope | Discoverable; not excluded solely by home-location mismatch |
| RD07 | Own-community team with unknown roster availability | No invented Rule 3.5 failure or full-eligibility pass |
| RD08 | only_home restriction, forged other-location filter, missing home | Denied filter / empty guarded population; no manager fallback |
| RD09 | Candidate who has email, phone, raw RF in fixture | No such output keys; candidate branch performs no RF read |
| RD10 | Candidate vs same person's separately authorized managed-roster contact | Candidate remains minimal; roster entitlement assessed independently |
| RD11 | NR raw-DUPR flag, missing rating/ID, known range mismatch | Existing review/range behavior represented; no new RF computation/admission rule |
| RD12 | Match Setup selected-team roster vs nonroster candidate | Existing roster only; no candidate population, no all-season ratings |
| RD13 | Club Pro location A versus team at B | A authorized through home_location mapping; B private team/candidates denied |
| RD14 | View-As forged team/member/role/context | Accepted boundary plus SQL resource predicate denies |
| RD15 | Real Commissioner viewing Player/Captain, asks for manager contract | Effective-role denial; no actor privilege bleed |
| RD16 | No-Auth target equivalent to normal Captain durable relationships | Same candidate IDs/DTO, no Auth account/session |
| RD17 | Divisions detail, private match, unpublished live-match direct URLs | Explicit shared server guard; denied target gets no substantive data |
| RD18 | Direct browser calls to six functions | ACL denial; no service credential in UI |
| RD19 | Context expiry/end/revocation/location change during read; cursor replay | Deny or serialized authorized result; no stale expanded scope |
| RD20 | Paired normal/View-As render; page/response snapshot | Same legitimate population/statuses, banner/read-only differences only |
| RD21 | Candidate metadata/parallel response/network trace | No hidden contacts, RF, raw ratings array or directory prefetch |
| RD22 | Known direct Data API bypass of route scope | Explicitly track existing exposure; cannot declare globally fixed by RD18 or route guard tests |

Retain M01–M15 for Member Detail button: normal action row, matching neighboring styles, real LM/Commissioner only, valid target, no gap, independent server check, approved confirmation/handoff, desktop/390/320 and accessibility. No standalone implementation before design review.

## 12. NORMAL USER BEHAVIOR UNCHANGED

- Intentional LM/Commissioner global Teams/Member/Ratings administration stays available under effective-manager contracts.
- Captain/Co-Captain/Club Pro Manage Roster entry from their actual dashboard and authorized team remains; existing roster-lock behavior remains.
- Candidate discovery supports legitimate other-community/All selection where configuration allows, including current missing-information and range-review states. No invented automatic Rule 3.5 or RF rejection.
- Match Setup uses selected team's roster and existing line/season rules; normal save/add/remove/notification authorization is not changed by this read design.
- Player dashboard, shared standings/published schedules and permitted score displays remain available with the appropriate minimal data.
- Existing Ask SELF RF/privacy, source badges, security infrastructure, production model and cost policy remain unchanged.

## 13. NORMAL USER BEHAVIOR PROPOSED TO CHANGE

| Change | Why / impact requiring review |
|---|---|
| Captain/Club Pro direct global `/teams` no longer works | It is an administrative workspace by current navigation; their legitimate roster path is dashboard → assigned Team Detail |
| Unrelated private Team Detail/match URLs deny below manager | UUID knowledge/client threshold was not relationship authorization; fixes scoped direct-route defect |
| Non-manager division-config URL denies; unpublished/anonymous live display denies | Establish explicit same server contract before reuse; publication/membership cannot be inferred from URL |
| Candidate email/contact/profile/membership/raw rating payload disappears | Candidate discovery is not managed-roster contact or directory entitlement; visible dropdown needs name and one rating/status only |
| Candidate pool is paginated/filtered on server | Avoid 5,001-row whole-directory download and all-season rating dump; keep logical population/count/search coverage |
| “Eligible” candidate label becomes qualified rating-check status | Existing code checks a numeric range, not every Rule/community/availability/RF requirement; avoids false certification without changing admission writes |
| Published display strips unused private match/line metadata | Displaying a public/shared result is not private operational-detail authorization |

No silent configuration correction, RF permission expansion, target-role repair, member creation or new cross-community admission prohibition is included. Direct Data API policy closure is not falsely claimed as an unchanged behavior or completed fix.

## 14. Bounded implementation sequence after approval

**A. Shared viewer abstraction.** Resolve normal authenticated principal or accepted effective View-As principal server-side; keep real actor separate; no target Auth. Freeze role/relationship/no-Auth fixtures.

**B. Shared route guards.** Apply the route/resource matrix equally to normal and View-As endpoints before data loading. Review normal behavior changes and the existing direct Data API limitation before security sign-off; do not ship a weak-normal/strong-View-As claim.

**C. Shared read projections.** Implement exactly six functions/two projections in isolated DB; explicit candidate/public/private field schemas; grant/replay/rollback/race tests. No production SQL without its later approval.

**D. Real LMS page reuse.** Replace current browser business reads with shared contracts in both modes; Captain Dashboard/Manage Roster/Match Setup first, then Player/Club Pro/admin/other approved routes. Preserve cross-community discovery and status uncertainty; adapt Member Detail button in same release.

**E. Read-only treatment.** Keep same screens and discovery/help controls; block mutations/server actions/direct client initialization and side-effect effects. Viewing candidate options remains possible without enabling Add/Remove. Preserve banner/Exit and isolated-origin flow.

**F. Parity validation.** RD01–RD22, existing security cases, M01–M15; desktop/390/320, keyboard/focus, route/deep-link/expiry tests; identical legitimate population and minimal payload; deterministic checks, no OpenAI requests.

**G. Mini-LMS deletion.** Only after real-page parity and read-only/security proof, remove obsolete presentation/navigation/loaders/styles/tests and snapshot consumers; review later forward snapshot retirement. Do not keep two interfaces.

**H. Cleanup/tests/docs.** Dependency/bundle search, deterministic regressions, lint/build and measured query budgets; report exact normal behavior changes, database compatibility and any remaining security limitations. Stop again for controlled production SQL/deployment acceptance approval.

**STOP FOR REVIEW.** G1–G3 now have explicit proposed decisions; six-function budget preserved. Owner approval of implementation has not been given. Unknown Rules eligibility facts remain explicit rather than being filled with invented values.
