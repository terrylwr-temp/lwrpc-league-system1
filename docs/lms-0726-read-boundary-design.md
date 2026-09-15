# LMS-0726 / 0.1.548 — shared reads and database boundary

**Final gate supersedes readiness assumptions:** [DESIGN BLOCKED report](lms-0726-final-design-gate.md). Underlying authenticated SELECT bypasses are confirmed; six-function output minimization alone is not a confidentiality boundary. No implementation approval.

**Owner-directed revision:** [Teams/candidate/route decisions](lms-0726-review-decisions.md) supersedes G1–G3, the Teams role gate, candidate/ratings payload, and published-display field scope below. Global Teams is proposed manager-only; assigned Captain/Club Pro Manage Roster remains; candidates omit email/raw RF; both modes share server guards. No implementation approval.

**DESIGN ONLY — STOP FOR REVIEW.** Production remains accepted LMS-0725 / 0.1.547. No application changes, migration file, SQL mutation, deletion, deployment, benchmark or OpenAI request in this continuation. Database access was limited to schema, policy, role and function metadata, not member records.

SQL **is required** for the protected relational reads. Existing authenticated SELECT policies and the five-view snapshot do not implement full effective-user authorization. Proposed architecture: **six new functions, of which two are composable data projections**, one new non-login read executor, one new private schema, and one additive operation in the existing View-As dispatcher. No table, Auth session, per-screen RPC, or per-role-combination RPC is proposed. Normal and View-As consume the same contracts and projection bodies.

This review also exposes a policy conflict: current normal Captain Teams/Team Detail reads are broader than the requested relationship scope. The recommended narrower scope below cannot honestly be called an unchanged normal experience for those direct routes. Review that reconciliation before approving implementation. The rest of the design does not treat excess browser payload as an entitlement.

## 1. Evidence and exact current inventory

- [Exact current queries](lms-0726-current-reads.md): 592 source expressions across 85 files; each preserves the complete selector, embedded joins, aliases, filters and source line. Includes server/helper calls and mutation-return selectors, which are explicitly distinguished from page reads. These are not 592 calls per page load.
- [Machine-readable query evidence](lms-0726-read-expressions.json).
- [Database metadata](lms-0726-database-catalog.json): 57 tables, 794 columns, 113 public-table policies, 11 selected function definitions/signatures/ACL records. This is metadata, not a data export or a census of every function in the database.
- [Proposed field matrix](lms-0726-read-fields.md) and [machine-readable field groups](lms-0726-read-fields.json): 28 explicit column groups; every named column checked against the observed schema. Each lists required/proposed maximum versus available and excluded columns. No group is a generic selectable table interface.
- Accepted [route inventory](lms-0726-inventory.md), [architecture](lms-0726-design.md) and [acceptance matrix](lms-0726-acceptance-matrix.md) remain applicable. This document supersedes their tentative database discussion.

Metadata confirms `lms_view_as_executor` is NOLOGIN, not superuser, and not BYPASSRLS. It has column grants, not whole-table SELECT grants. In particular, its current match and standings grants cannot render the real pages. `members`, ratings, teams, locations, standings and lineups have broad authenticated read policies; those policies do not prove a target is entitled to every row. An anon table grant alone also does not prove public access: RLS applies independently.

## 2. Page/read classification and identity dependencies

**A** reuse trusted existing operation; **B** adapt shared application loader without a new database projection; **C** use a new bounded relational projection; **D** do not simulate target Auth/device/capability state. A page may contain several classes. All field names and current joins are in the source appendix; proposed output groups are defined below. Auth column means current browser Auth dependency, not a requirement to create target Auth.

| Page / current source | Current reads and joins | Current authorization / execution; Auth, member, role dependencies | Proposed classification / shared loader |
|---|---|---|---|
| `/` → AdminDashboardClient | seasons → leagues → divisions; members count; teams; matches; line_games counts joined to match_lines/matches; team_byes; standings; ratings; roster; document metadata; system settings | Browser `requireRole(league_manager)`, role/member lookup; filters are browser state. Auth/member/role yes | C `loadDashboard(viewer, filters)` for admin relational DTO; B settings/guides/composition |
| `/player-dashboard` | email-resolved member; team_members → teams → divisions → leagues → seasons; matches with teams/locations, match_lines/games/player joins; byes; standings; ratings; lineups; division schedule | Browser Auth email, member resolution and `requireRole(player)`; member ID is substantive scope; role selects dashboard | C `loadDashboard` player contract; C `loadProfile`, `loadCompetition` lazy schedule/history; B guides/settings. No target Auth needed |
| `/captain-dashboard` | member; divisions/hierarchy; locations by both Club Pro IDs; teams by captain/co-captain/Club Pro/location; matches with opponent, lines/games, score status; submitter names; roster; standings; season ratings; byes; lineups; templates | Browser Auth email + role; team relationship predicates in `loadData`; Auth/member/role yes | C `loadDashboard` captain contract; lazy C setup/roster/history; B settings/notices/formatters |
| Captain roster popup | `team.roster`, rating lookup and player season-record calculations from loaded dashboard state; no query in `RosterModal` | Inherits authorized team; roster-locked condition in `openRosterModal` | B same popup and selectors from C dashboard DTO; do not invent a candidate search here |
| Manage Roster `/teams/[id]` | team/hierarchy/location/captain contacts; team_members → members; active/null-active member candidates; locations; season ratings; roster members' other teams and match-line history | Browser `requireRole(captain)`; route ID selects team. Current broad read is not a relationship check. Role controls locked roster/home-community override | C `loadRoster(viewer, teamId, candidateFilter)`; field/scope rules in section 11. Locked normal page redirects below manager: preserve unless separately reviewed |
| Match Setup in Captain Dashboard | team_members with member contact/self-rating/DUPR ID; match_lineups by match AND team; season ratings; inherited match/division/line configuration; optional score-sheet template | Browser team state; no target Auth intrinsically needed; role/team required | C `loadMatchSetup(viewer, matchId, teamId)`; B existing calculations/template rendering; never invoke lineup save/default insertion |
| `/teams` | leagues/seasons, divisions, locations, teams with leadership/member joins; optional division schedules/byes/standings/ratings; roster-copy reads belong to mutation workflow | Browser minimum Captain; team listing currently has no target-relationship filter | C `loadTeams`; policy conflict G1 below. Manager creation/copy lookup data remains effective-manager-only; no copy workflow in View-As |
| `/matches` | Redirect to `/scoring` | No independent reads | B existing redirect with effective role guard |
| `/scoring` | leagues, divisions, teams, locations, matches, score submitter members, division_lines/match_lines/games | Browser manager guard | C `loadCompetition` admin scoring contract; no writes/default seeding |
| `/matches/[id]`, `/score-entry/[id]` | match → home/away teams, division/league; roster/member names; lines/games; saved lineups; season ratings; score submitter/verifier names | Browser Captain guard; identity/team checks also determine score actions. Reads are not all equivalent to mutation authorization | C `loadMatch(viewer, id)`; scoped read-only same component. Preserve existing score authorization on normal writes |
| `/live-match/[id]` | matches, match_lines, line_games | Browser Supabase; absence of literal guard does not establish public access | C shared published match display. No anonymous exposure inferred |
| `/standings` | leagues → seasons, divisions; standings → teams; optional match/schedule/byes, roster-rating context | Browser `requireRole(player)` | C competition contract for authenticated/shared standings. It is not proven anon-public; no new standings-only RPC |
| `/ratings` | seasons, ratings → member, memberships/teams, member list | Browser manager guard | C `loadPeople` administrative rating contract; only effective LM/Commissioner may receive existing administrative RF fields |
| `/members`, `/members/[id]` | members, roles, locations, seasons/ratings, membership/team hierarchy, match-line history; server directory/last-login endpoints | Browser manager guard plus server endpoint guards | C `loadPeople` for relational data; B existing server directory/last-login read logic after effective-manager check. Admin Auth metadata is not a target session; do not return tokens |
| Profile dialog in dashboards | self member fields/photo/notification preference, name/rating display | Browser email currently locates member | C `loadProfile` using effective member; no manager member-detail substitution. D password/device settings only |
| Ask drawer / Ask page | accepted answer, clarification, source-receipt, Live/eligibility operations; drawer's team-context lookup | Existing normal auth or `resolveEffectiveViewer`; server evidence/Live functions | A accepted answer/Live/eligibility/source internals; B same UI/transport and effective team context (reuse dashboard C data, no new Ask projection). Never run inference merely to test UI |
| Official / approved document viewers | citation/receipt-bound server document access, source version and provenance | Normal receipt/Auth or accepted View-As context/source binding | A existing source validation; B shared viewer transport. Cannot replay normal receipt as target; no new broad SQL |
| `/help/[role]`, guides, `/print` | static role help; league document metadata/storage link; current-tab printable payload | Static rendering or previously authorized payload | B role selection, same-origin asset transport and local print; no page-data RPC for static text. Never copy administrator-tab print state |
| `/leagues`, `/seasons`, `/divisions`, `/divisions/[id]` | hierarchy/configuration, division_lines, templates, match-line dependency checks | Browser manager guards except legacy unguarded detail | C competition admin-config contract. Recommend explicit effective manager guard for division detail (G3) |
| `/scheduling`, `/schedule-editor` | hierarchy, teams, matches, locations, schedule settings, court availability, blackout dates, lines/games; member leadership labels | Browser manager | C competition scheduling contract; candidate schedule calculations B pure; no generation/reset/persist reads-with-side-effects |
| `/locations`, `/score-sheets` | locations/member leadership; score_sheet_templates | Browser Commissioner | C admin-config contract; existing normal writes unchanged |
| `/member-import` | members/location lookup and import-batch summary; import row writes | Browser manager | C people administrative lookup + importBatch summary. No import_rows payload or import execution in View-As |
| `/system-setup`, `/email-options`, `/league-communications` | existing settings/template/communication server endpoints | Commissioner/manager route and endpoint guards | B named server read loaders with effective role and explicit existing response serializers; no new page SQL merely to proxy an existing bounded endpoint. Send/save/preview-send remains blocked |
| AI console/review/management routes | existing server documents, approved revisions, diagnostics, feedback/review lists | Existing manager-checked server services | B inject trusted effective-manager authorization into same read handlers; preserve existing pagination/DTOs. No service request as real manager fallback; all mutation/process/activation operations remain blocked |
| Round-robin/tournament public/display/standings | existing public event projections/endpoints | Event `public_status`/publication predicates; public RLS on associated event tables | A public projection logic, B same-origin read transport. Use anon/public branch so real-actor event privileges cannot expand results |
| Event admin/player routes | manager role or event code/player capability/session | Not implied by LMS member identity | B target effective-manager read where endpoint supports that authority; D code/private player session if not held in target context. Do not borrow Tab A credentials |
| Login, reset password, passkeys, push subscriptions | Auth/session/device state | Target Auth/device-specific | D. Narrow unavailable controls, retain rest of shared shell |
| Design-preview redirects / old `/view-as` | redirects / obsolete snapshot summary | Existing routing/context | B redirects; old summary is not a parity read and is removed only after acceptance |

The current selector appendix is authoritative for current columns/joins, including `head:true`, broad selectors and optional reads. Shared `lib` functions are not automatically class A: browser-called identity helpers must become trusted server binding. Current normal loaders are generally **not** safe as-is merely with a substituted member ID.

## 3. Existing functions and services to reuse

| Existing function/service | Exact reuse and restriction |
|---|---|
| `public.lms_view_as(p_op text,p_input jsonb)` | Keep existing lifecycle, credential/binding validation, denial and audit semantics. Add one `page_read` branch; no caller-supplied effective role/member. Owner remains `lms_view_as_executor`, SECURITY DEFINER, empty search_path, execute service_role only (plus owner) |
| `view_as_private.actor_member(p_actor uuid)`; `view_as_private.member_role(p_member uuid)` | Reuse current identity/role rules inside trusted binding; not browser identity lookup APIs |
| `view_as_private.lock_authorization(p_proof jsonb,p_kind text,p_subject uuid,p_team uuid,p_season uuid)` | Keep accepted identity/context locking; new lock coordinator invokes its identity operation for View-As. Its existing Live intent whitelist is NOT expanded to mean arbitrary page authorization; additional page relationship locks belong in the new coordinator |
| `view_as_private.lookup(p_actor uuid,p_member uuid,p_context uuid,p_request uuid,p_query jsonb)` | Keep effective Live/SELF eligibility behavior unchanged; do not use it as a generic page query or widen its intents |
| `public.ai_live_lookup(p_actor uuid,p_request uuid,p_query jsonb)` → `ai_live_private.lookup` | Existing normal Live boundary remains; server-only, not a page-wide data API |
| `view_as_private.end_context(p_id uuid,p_reason text)`, `public.lms_view_as_maintenance()`, `ai_live_private.expire_records()` | Lifecycle/retention unchanged; not page loaders |
| `view_as_private.snapshot(p_target uuid,p_role text)` | NOT reused for real screens. Retire only after all callers are removed and parity/security pass |
| `resolveEffectiveViewer`, `viewRpc`, `runLive`, `runEligibility`, `runPlayerOfficialAnswer`, `resolveOfficialDocumentViewerSource`, `readApprovedViewer`, `publicApprovedRevision` | Keep accepted server semantics; inject shared UI transport. Source/eligibility authorization and badges remain unchanged |
| Pure standings/history/rating-display/guide helpers | B reuse on authorized DTOs; no separate View-As business implementation |

## 4. Shared application contract

One `resolveViewer(request)` constructs an internal principal. Normal mode verifies the authenticated user online and resolves the member/roles server-side. View-As delegates to `resolveEffectiveViewer`, then binds the request to the accepted context/browser proof. The browser may send a **resource selector**, never authority.

Named shared loaders: `loadShell`, `loadDashboard`, `loadTeams`, `loadRoster`, `loadMatchSetup`, `loadMatch`, `loadCompetition`, `loadPeople`, `loadProfile`, `loadDocument`, `loadAdministrativeRead`. Both transports call these same functions. They select a fixed contract, validate an exact argument schema and compose DTOs; no `normalDashboardLoader`/`viewAsDashboardLoader` business copies.

Normal transport: a protected normal-origin read endpoint, online Auth validation, then `public.lms_page_read`. Isolated transport: accepted `/api/view-as/read` allowlist, `resolveEffectiveViewer`, then existing `lms_view_as('page_read', trustedInput)`. Static assets/public content use ordinary shared functions through the protected same-origin adapter, not a privileged data RPC.

The UI gets `viewer {memberId, displayName, roles, dashboardRole, mode, readOnly, expiresAt}` and the identical contract DTO in both modes. Real actor is shown/audited separately, never used for page role checks. No credentials, raw proof, Auth token, privileged Supabase client, or private schema objects are serialized. Protected data is loaded only after isolated tab validation; initial document GET renders a non-sensitive shell.

## 5. Exact proposed function surface

All return `jsonb`; no dynamic SQL, SQL fragments, table names, arbitrary columns, JSON-path filters or arbitrary joins accepted. Every argument rejects unknown keys. UUID resource inputs must pass the contract predicate before a row is returned.

| Proposed signature | Purpose / caller | Owner; security; grants |
|---|---|---|
| `public.lms_page_read(p_actor uuid,p_contract text,p_args jsonb)` | Normal server entry only. p_actor comes from verified server Auth result, not request JSON. Calls shared read coordinator with normal proof | `lms_page_reader`; DEFINER; search_path `''`; EXECUTE service_role only, revoke PUBLIC/anon/authenticated |
| `view_as_private.page_read(p_proof jsonb,p_contract text,p_args jsonb)` | Existing locked View-As dispatcher entry; accepted proof supplied internally | `lms_page_reader`; DEFINER; search_path `''`; EXECUTE `lms_view_as_executor` only, revoke PUBLIC/anon/authenticated/service_role |
| `lms_read_private.read(p_actor uuid,p_proof jsonb,p_contract text,p_args jsonb)` | Single shared composition/dispatch; exactly one of normal actor or View-As proof. Calls lock coordinator, then fixed projection(s); builds exact contract DTO | `lms_page_reader`; INVOKER; search_path `''`; owner execution only |
| `lms_read_private.lock_viewer(p_actor uuid,p_proof jsonb,p_contract text,p_args jsonb)` | Atomic identity/role/context/resource authorization and ordered locks; returns internal viewer/scope keys, never page contents | `postgres`; DEFINER; search_path `''`; EXECUTE `lms_page_reader` only; no browser/service_role execute |
| `lms_read_private.competition(p_viewer jsonb,p_contract text,p_args jsonb)` | Explicit hierarchy/team/match/line/game/standing/configuration projections; pages in sections 2 and 6 | `lms_page_reader`; INVOKER; search_path `''`; owner only |
| `lms_read_private.people(p_viewer jsonb,p_contract text,p_args jsonb)` | Explicit self/roster/candidate/admin-member/rating/role/import-summary projections; pages in sections 2 and 6 | `lms_page_reader`; INVOKER; search_path `''`; owner only |

**Count: 6 new functions = 2 entry wrappers + 1 shared coordinator + 1 lock coordinator + 2 data projections.** One existing function body changes additively (`lms_view_as`). Snapshot retirement is a later removal in the same release sequence, not a seventh new function. Entry wrappers have no duplicated domain query logic. All six are server-only; no browser role can call any directly.

Normal p_actor is a trusted-server assertion, not cryptographically independently proven by the SQL UUID. The service_role trust boundary already exists and must stay inaccessible to browsers. SQL independently resolves member/role/relationships; it never accepts a caller-provided effective role. A compromised service credential is outside what a function taking a trusted server assertion can prevent.

## 6. Fixed contracts, arguments and output

Exact field groups are in [read-fields](lms-0726-read-fields.md). Output collections are named below; absent collections are omitted, not populated with unrelated rows. Envelope: `{contract, viewer, data, page:{nextCursor,hasMore}}`. Null/empty distinctions from current pages are preserved. Computed notices, scores, setup status and records use existing shared pure functions; they do not need new database columns.

| Contract | Allowed arguments | Output groups / predicate |
|---|---|---|
| `shell` | none | identity, roles, setting; effective self only; settings fixed keys |
| `dashboard.player` | `includePrevious:boolean`, `cursor:string|null`, `limit:integer` | selfProfile; own membership/team/hierarchy; published related match/line/game/bye; standing for selected divisions; permitted roster display names/contacts and rating. No unrelated candidates |
| `dashboard.captain` | same plus optional `teamId:uuid` | selfProfile; managed teams/hierarchy/location; related match/line/game/bye; rosterPerson/membership/rating; standings; lineup-derived setup status; submitter personName. Assigned teams determined server-side |
| `dashboard.admin` | optional `seasonId,leagueId,divisionId` UUIDs, cursor/limit | hierarchy, team, match, bye, standing; aggregate counts for members/matches/games (numbers, not member rows). Effective manager only |
| `teams` | optional `divisionId`, `includeInactive`, cursor/limit | team/hierarchy/location, leadership personName; contacts only in authorized detail contracts. Effective manager all; Captain/Club Pro scoped pending G1; Player route remains denied |
| `roster` | required `teamId`; cursor/limit | team/hierarchy/location, membership, rosterPerson, rating and permitted roster-member history via matchLine/game/match/personName. Manager or managed team; preserve locked roster route behavior |
| `roster.candidates` | `teamId`; optional `locationId,search,cursor,limit` | candidate + relevant season rating; only selected team's authorized candidate pool, exclude existing roster. No RF. See section 11 |
| `match.setup` | `matchId,teamId` | selected match/team/hierarchy/divisionLine; selected-side lineup; selected-side membership/rosterPerson/rating; scoreTemplate. Validate team is a side AND manageable by effective viewer |
| `match.detail` | `matchId` | match/team/location/hierarchy/divisionLine/matchLine/game, authorized lineup/roster/rating and submitter personName. Publication/team/role gates; no unrelated match |
| `competition.standings` | `divisionId`, cursor/limit | standing + team names/hierarchy; authenticated shared read, no member directory |
| `competition.schedule` | `divisionId`; optional `teamId`, cursor/limit | published match/team/location/bye/hierarchy and narrowly needed display ratings; same existing division schedule selection, no management rights inferred |
| `competition.config` | enum `section=seasons|leagues|divisions|locations|scoreSheets`; optional resource ID/cursor/limit | named season/league/division/divisionLine/location/scoreTemplate groups only. Manager for hierarchy; Commissioner for locations/templates |
| `competition.scheduling` | `leagueId`; optional `divisionId`, cursor/limit | scheduleSetting/courtAvailability/blackout + hierarchy/team/match/location/divisionLine. Effective manager |
| `competition.scoring` | optional league/division/status, cursor/limit | match/matchLine/game/divisionLine/team/location/personName. Effective manager |
| `people.self` | none | selfProfile. Subject always effective member |
| `people.members` | optional `memberId,search,locationId,cursor,limit` | adminMember/roles/location; effective manager. History/rating lazy via same coordinator, not whole directory on shell load |
| `people.ratings` | `seasonId`; optional member/search/cursor/limit | adminRating + personName and narrowly needed membership; effective manager only |
| `people.importSummary` | cursor/limit | importBatch + importer personName; effective manager; no raw import rows |

Limits: default 100, maximum 200 rows per collection page; search at most 100 characters; UUID cursors are opaque server-issued, bind contract/filter/context, and cannot expand scope. A match detail has at most one match and its bounded configuration/lines/games; enforce explicit defensive 200 child-row cap with a surfaced error rather than silently truncating. Roster/candidate/history lists paginate. Active/previous-season toggles remain actual UI controls; never return the entire LMS to filter in the browser. Request-specific contract/group schemas prohibit arbitrary field-group combinations.

These are proposed bounds, not measured existing maxima. Paired fixtures must prove they retain the same visible counts/navigation; do not silently truncate the existing UI to meet a cap.

## 7. Field minimization and unresolved normal-data contracts

The field matrix gives explicit maximum columns and exclusions. Project no wildcard, including nested member/ratings rows. Emit `roles(member_id,role)` only for the subject or the effective-manager member page; `user_roles.user_id` is authorization-only. Profile contains no billing/provider identifiers. Administrative member group explicitly excludes stripe customer ID, billing method, recurring billing ID and IP address. Do not return those merely because current `select('*')` fetched them.

The `rating` group carries the existing numeric season/PrimeTime value and existing raw DUPR/NR display input **only for the authorized roster/candidate/history context that already uses it**. Dashboard consumers needing only numeric values receive that subset. RF is absent. `adminRating` retains the existing effective-manager ratings page's administrative fields. Ask SELF RF/eligibility remains exclusively in its accepted RPC. A Captain/Club Pro team role cannot select adminRating, request another person's SELF result, or turn a page DTO into an Ask evidence source.

**G1 — Teams direct-route conflict.** `/teams` minimum-role guard is Captain; loaded/listed teams are not relationship-scoped. Team Detail loads selected ID without proving it is the target's team. Recommend server-managed-team predicates in both modes, retaining shared standings/division schedule browsing. This narrows those legacy normal routes, so requires an explicit review decision; do not label it perfect parity with current unrestricted direct-route behavior.

**G2 — Candidate selection.** Existing availableMembers filters active/null-active rows, excludes roster, applies selected location by ID OR normalized club_location/name, and enforces home-community restriction below manager when `only_home_community_players` is true. With restriction false, normal UI allows selecting other/all locations. Proposed design preserves that policy for an authorized managed team, with server-side filtering/pagination and only candidate fields. Do not silently replace it with home-location-only candidates, and do not permit Club Pro to manage other-location teams. Review whether unrestricted candidate locations are intended; they are not inherited from the real actor.

**G3 — Unguarded legacy detail/display.** Divisions detail lacks the normal literal role guard; live-match lacks proof of anon-public access. Proposed effective-manager division config and published authenticated match display need review as explicit boundaries. Do not enable either on isolated origin merely because the URL renders normally.

**Field completeness gate:** administrative `select('*')` and server API response shapes require paired render assertions against the explicit field manifest during implementation. The manifest is an exact proposed ceiling, not a claim that every excluded legacy column has already passed a rendering regression test. If a displayed field is missing, revise its named contract for review; never broaden to `*`. Existing API-only administrative services are class B with their current serializers; this proposal does not grant the new executor all AI/event tables.

## 8. Binding, locks and read-only enforcement

`lock_viewer` must enforce mutually exclusive normal/view proof. View-As validates current active context, browser binding, real actor identity, target, actor LM/Commissioner authority, target validity and expiry through the accepted boundary. It invokes existing identity locking and rechecks after obtaining locks. Normal mode derives member from authenticated actor using accepted identity resolution; missing/ambiguous mapping denies rather than picking an arbitrary row.

Within the same SQL transaction, lock relevant member and role rows, selected teams, memberships and Club Pro location mappings, then hierarchy/selected match in consistent sorted order. Re-read predicates after locks. Revocation/deactivation/team-side changes racing the projection must either win before authorization and deny or serialize after the completed authorized read. Row-lock coordinator owns the narrow lock privilege; do not grant UPDATE to the projection executor merely to use FOR SHARE. Prevent concurrent role additions from escaping an existing-row-only lock: coordinate on the stable member row and ensure role/relationship writers participate or prove equivalent serializable behavior. This is a required race-test gate, not something current SELECT policies solve.

`p_viewer` is internal output of this coordinator, never deserialized from the browser. It carries effective member/role, fixed authorized resource scope and mode. Neither projection accepts a real-actor role. View-As's real actor remains relevant only for continued context validity/audit.

The handler revalidates context after slow non-transactional work and before disclosure. No cross-user/context data cache; deduplication is request/context scoped and purged on Exit/expiry. Preserve no-store/CSP/referrer/binding/origin controls and earlier actor-token expiry within the 30-minute maximum. No target Auth/session, offline cache, direct Supabase browser initialization, or ordinary API/Server Action allowance in View-As.

No read contract invokes writes, role repair, save-on-mount, lineup defaults insertion, schedule generation, notification sending, feedback persistence or import/AI processing. Existing normal mutation paths and RLS remain unchanged. UI disabling is supplementary; server and isolated-origin mutation denial remain mandatory.

## 9. Player design

Bind effective member directly instead of repeating browser Auth-email lookup. Own team membership and hierarchy produce the real dashboard/team tabs; publication predicates determine upcoming activity; line/game history produces existing records; standings/division schedules keep their legitimate shared competition scope. Own profile uses selfProfile, not the manager Member Detail DTO. Related roster/opponent labels are attached only to selected competition data, never a directory dump. Role-selected navigation uses the same highest-role rule. No target Auth account is required for these member-based reads.

## 10. Captain Dashboard and Match Setup

Captain Dashboard scopes teams by captain_member_id, both co-captain fields, direct club_pro_member_id, and locations whose club_pro_member_id/club_pro_2_member_id equal effective member, joined to teams.home_location_id. Preserve combined assignments and previous-season toggle. Do not infer Co-Captain as a new stored role.

Load upcoming/completed/pending match groups, rosters, season records, standings, byes, submitter names and setup status for those teams. The current dashboard's lineup query can fetch both sides to derive status. Return derived completeness/status for the other side where that is all the page needs; do not send opposing saved private lineup identities just to compute a count. Detailed selected-side setup receives lineups only after match/team authorization. Any normal reveal rule that permits more must be explicit in the contract and tested in both modes.

`openMatchSetup` currently performs two parallel reads (team_members/member join and match_lineups), then one whole-season rating read. Replace that with one shared contract containing the selected team's roster, selected-side lineups and ratings for those roster IDs/season. Reuse division/line rules and template rendering. Empty lineups remain empty/read-only; no default-row insertion. Save, email, flex-date and score submission paths stay blocked. Real normal writes retain their existing handlers.

## 11. Manage Roster

Distinguish dashboard `RosterModal` (already a read popup, no candidate fetch) from actual `/teams/[id]` Manage Roster. The latter reads roster, eligible/contextual candidates, home-community rule, season rating/NR display, members' other-team labels and play history. New contract must retain these states and counts, with add/remove/email unavailable.

Candidate predicate: validate viewer may manage selected team; load its division/league/season; enforce roster lock route behavior; select active-or-null-active members not on roster; if home-community restriction applies, require team.home_location_id and apply its location ID/name match; otherwise validate requested location exists and apply the same normal selector, or the normal all-locations option. Compute filters server-side, paginate consistently, and return only candidate group plus permitted season rating data. IDs from the browser are filters, never independent authority. Existing false-eligibility labels must not be upgraded into new authoritative personal eligibility rules.

Current `.range(0,5000)` means up to 5,001 candidates, followed by client filtering. Current ratings load is all rows for the season. Neither excess payload is necessary to preserve the visible candidate UI. Roster history is member-set scoped; it must not grow into every member's history.

## 12. Club Pro and combined roles

Use the same team relationship predicate as Captain Dashboard, including both location Club Pro fields and `home_location_id`. Direct team.club_pro_member_id is an additional existing relation, not a substitute for location ownership. Selected location is not a grant. Club Pro at location A cannot request roster/manage/setup for B through a supplied team/location ID. Public/shared division schedules remain distinct from management access.

Keep highest-role navigation and all relevant relationship assignments; a Captain+Club Pro fixture must exercise both. Effective LM/Commissioner may use their normal administrative read contracts; the real LM/Commissioner viewing a Player cannot. Role changes during a context invalidate/re-evaluate through the accepted boundary.

## 13. Public data and no-Auth limitations

Public/static help, compiled guide content and public event displays do not need new privileged SQL. Observed event RLS predicates use parent `public_status='public'`; preserve them and existing public serializers. Blackout SELECT policy is public true, but that does not make the entire scheduling screen public. Ordinary LMS standings table policy is authenticated, so it belongs in the shared competition projection, not an invented anonymous path.

All C relational contracts above use member/role/resource relationships and work without target Auth, subject to valid accepted target. B manager services must separate member-role authorization from browser-session acquisition. Password, passkeys, push/device subscriptions and code/session-only event state are D. A member without Auth may truthfully have no last-login record; an authorized effective manager may see that absence through the existing administrative metadata service, without creating or impersonating an account. Missing target Auth is not a reason to show a mini-LMS.

## 14. Proposed grants, RLS and ownership

Create `lms_page_reader` NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS, with no role memberships granted to browser/application login roles. Create `lms_read_private`; revoke schema access from PUBLIC/anon/authenticated. Grant schema USAGE to lms_page_reader only (owners retain inherent access); grant needed USAGE on public and private entry schema. No CREATE privilege for runtime roles.

Projection executor SELECT columns are exactly the union of groups in read-fields.json, plus `user_roles.user_id` for binding if used by the coordinator. Prefer keep that Auth mapping inside the postgres-owned lock coordinator instead, so projection executor need not read it. No grants on auth.users, View-As credential/context stores, ai_live_private, private eligibility data, raw import rows, billing/IP fields, notification subscriptions or arbitrary AI/event tables. Internal context inspection remains solely inside the narrow lock function and accepted dispatcher.

For each listed public table, add an explicit SELECT policy **TO lms_page_reader USING (true)** only if its RLS otherwise prevents the fixed functions from reading it. This is a privileged service-function executor policy, not target-aware RLS: substantive row authorization is enforced by the locked fixed functions. Do not claim the policy itself scopes targets. Use column grants, private executable surface and fixed predicates together. No new authenticated/anon/PUBLIC table policy; no INSERT/UPDATE/DELETE grants or policies. Preserve existing accepted executor grants/policies and all normal mutation policies.

Revoke default PUBLIC EXECUTE on every new function within the creation transaction, then grant only the function table's named caller. Fully qualify every relation/function/operator where relevant; empty search_path; no temp objects or user-defined executable identifiers. `lms_page_reader` must not own public data tables (so it cannot bypass their RLS as owner). PostgreSQL-owned lock function returns only authorized identity/scope, has no generic query/body input, and receives no client-selected identity in View-As.

The exact column union and table list are machine-readable in read-fields.json. This adds no blanket SELECT ON ALL TABLES and no new permissions to the existing lms_view_as_executor beyond EXECUTE on the one private page entry. Existing private security helpers' ownership and semantics remain intact.

## 15. Attack and race acceptance matrix

| Attempt | Required result / layer |
|---|---|
| Forged effective member/user/role in JSON | Unknown authority keys rejected; effective identity comes from server/context |
| Forged team | Selected resource fails managed-team or published/shared read predicate before people data |
| Forged location | Filter cannot add authority; home-location/team rule enforced in SQL |
| Forged context/browser proof | Existing binding/credential validator denies; no protected DTO |
| Expired/ended context | Deny before projection; purge client data; recheck before disclosure |
| Wrong real actor | Actor/context mismatch denies, even if other actor is a Commissioner |
| Direct anon/authenticated RPC | EXECUTE denied on both entries and all private helpers |
| Normal-origin replay of View-As context | Existing normal-origin rejection; normal endpoint requires its own verified Auth, ignores no proof |
| Isolated request omitting context | Fail closed; never fall back to administrator/normal session |
| Commissioner privilege bleed | Real Commissioner + effective Player gets only Player DTO; adminRating/members denied |
| Captain asking for other RF/SELF | Existing SELF-only RPC denial; RF absent from page roster/candidate groups |
| Context/role revocation during read | Ordered locking/recheck serializes or denies; test role removal AND addition |
| Club Pro reassigned/location team moved during read | Lock mappings/team/hierarchy, re-evaluate; no stale location grant |
| Inject contract/table/column/sort expression | Exact enum/key validation rejects; no dynamic SQL |
| Cursor replay across target/contract/filter | Context/filter-bound cursor rejected |
| API POST/Server Action/direct DB mutation | Accepted isolated denial; no credentials/browser DB client; UI disabled is not the enforcement |
| Previous tab/source/print data reuse | Context/receipt/tab binding denies or requires fresh authorized load |

These are proposed acceptance tests, not executed passes. Add them to the existing LMS-0724 security suite; do not replace it.

## 16. Query/performance impact

Static selectors: AdminDashboardClient 22; Captain 26; Player 17; Teams 15; Team Detail 7; Match Detail 12; score-entry 7; Standings 10; Ratings 6; Members 11; Member Detail 10. These include optional and mutation-related reads, not cold-load totals. `countRows(tableName)` resolves to members/matches for dashboard counts; its wildcard with head:true is not a row-data projection.

| Interaction | Current estimate from source | Proposed normal / View-As data RPC budget |
|---|---|---|
| Cold player/captain dashboard | Approximately 10–18 relation requests plus auth/header/settings; role/modal dependent | 1 dashboard RPC + 1 shell RPC, deduplicated if composed; same in View-As plus accepted validation traffic |
| Match Setup open | 3 relation calls; optional template lookup | 1 / 1 setup RPC, template reused or included |
| Dashboard roster popup | 0 extra calls from already loaded state | 0 / 0 when DTO present |
| Team Detail initial | 5 mandatory/season-dependent reads + 2 history/team-label reads | 1 roster + 1 lazy candidate page; same in both modes |
| Candidate search/page | Whole 5,001-row fetch reused locally today | 1 filtered page RPC in either mode; adds search round trips but avoids whole directory transfer |
| Match Detail / Standings / Ratings | Multiple source reads, optional effects | 1 contract RPC per selected resource/page; lazy follow-ups identical in both modes |

One RPC is not one SQL scan. The coordinator composes fixed queries; proposed relation-scan work remains proportional to requested page/IDs, not an all-LMS snapshot. Identity/context lock work adds overhead; do not assert a latency improvement without measurement. Scope-aware pagination/index use must be EXPLAINed in an isolated fixture database. Capture actual normal vs View-As request counts, rows, bytes, p50/p95 and DB time during implementation, including Auth/context-validation calls separately. Duplicate header/member/roles/settings and repeated all-season ratings should disappear; background refresh stops on Exit/expiry.

## 17. Exact migration proposal, replay and rollback

Proposed migration slug: **`lms0726_shared_page_reads`**. File: **`<CLI-generated-timestamp>_lms0726_shared_page_reads.sql`** under the existing migrations directory. Timestamp is deliberately unassigned until implementation uses the migration tool; no migration file or SQL has been written in this design. The exact architecture is the six signatures, role, schema, column manifest, SELECT-policy footprint and one dispatcher operation above.

Apply transaction: verify accepted function/role/grant baseline; create/check exact NOLOGIN role and private schema; create six functions with explicit owners/security/search paths; revoke defaults; apply manifest column grants and executor-only SELECT policies; add dispatcher page_read delegation without modifying other operation behavior; assert forbidden roles have no EXECUTE/column expansion. No data backfill or business-row mutation. Record reviewed hashes of replaced dispatcher and new definitions.

Replay: do not use unconditional CREATE OR REPLACE to hide drift. Verify existing object signatures, owner, security mode, configuration and approved definition hash; accept an identical state; reject mismatched state. Grants/policies converge to the exact reviewed manifest. Test initial apply, identical replay, second replay, unexpected preexisting role/function/policy, transactional failure and rollback in isolated PostgreSQL. Historical migrations remain immutable.

Rollback before mini removal: withdraw page_read routing, restore accepted dispatcher body/hash, drop the two entries and dependent new private functions, remove only this migration's policies/column grants, then drop private schema/read role after dependency check. Preserve old accepted snapshot and lifecycle. After mini removal, an application rollback alone is insufficient; coordinate app/database compatibility and restore the accepted previous deployment/migration state only through a reviewed rollback. No destructive CASCADE against unknown dependencies. Final snapshot removal requires a separate forward migration after consumer proof, using a CLI-generated timestamp and slug `lms0726_retire_view_as_snapshot`.

## 18. Member Detail entry point

Application-only; no new SQL dependency. Existing target preflight GET `/api/view-as/start?target=...` supplies trusted eligibility/name. Move ViewAsStartButton into the existing `mb-6 flex flex-wrap gap-3` action row and share neighboring rounded-xl/px-4/py-2/font-semibold sizing/style. No card or separate feature panel.

Before rendering, require REAL authenticated Commissioner/League Manager, valid selected target, normal mode/no nesting. Hide unresolved/denied entry without a wrapper gap or disabled advertisement. Recheck on click and at server POST. Preserve approved named-target READ-ONLY confirmation and focus behavior, then protected handoff to isolated tab; original admin tab unchanged. M01–M15 cover desktop/390px/320px, keyboard/focus/name, target changes and invalidation. This moves presentation, not authorization.

## 19. Bounded implementation sequence and review gate

1. Review this exact surface/field manifest and resolve G1–G3. Approval must distinguish intended normal visibility from legacy broad direct-route reads. Do not implement an unreviewed compromise.
2. Freeze paired normal/effective fixtures for Player, Captain, both Co-Captain assignments, Club Pro locations, LM/Commissioner, combined roles, inactive/invalid targets and no-Auth targets. Map actual rendered fields to manifests before changing a loader.
3. Implement isolated-database migration/ACL/race/rollback tests and shared viewer contract. No production mutation follows automatically from local implementation approval.
4. Adapt existing shared shell and page loaders; first Captain Dashboard, Match Setup, Manage Roster, then Player/Club Pro and remaining effective-role screens. Same projection in both modes; normal mutation handlers remain separate.
5. Adapt existing API-only administrative/document/Ask reads with effective authorization and the same serializers; retain narrow D limitations. No model calls or benchmark needed for this work.
6. Implement Member Detail action-row placement/preflight in this release; test with/without button at desktop/390/320 and accessible confirmation.
7. Prove complete paired DOM/data parity, unauthorized fields absent, route/deep-link/refresh/expiry/Exit behavior, negative/race controls and measured query budgets. No pass while required content is a summary substitute.
8. **Only after parity and security proof**, delete mini presentation/navigation/loader/CSS/test fragments and old snapshot consumers; then review/apply the approved forward retirement migration through the later authorized release process. Retain accepted security infrastructure and historical migrations/tests.
9. Run appropriate deterministic tests, lint/build and bundle/dependency checks after app implementation. This document-only continuation did not run app tests or claim new test passes.
10. Return implementation evidence for controlled SQL/deployment/targeted production acceptance approval. No automatic deployment or large model benchmark.

**STOP FOR REVIEW.** SQL dependency is definite; six-function shared design is proposed. G1–G3 and field/lock proof gates are explicit review items, not permission to ship a partially authorized parallel LMS.
