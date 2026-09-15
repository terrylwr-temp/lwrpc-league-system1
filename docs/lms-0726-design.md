# LMS-0726 / 0.1.548 - View-As real LMS UI parity design

**Latest review:** [Owner-directed authorization decisions](lms-0726-review-decisions.md) defines intended Teams roles, cross-community candidate scope, minimal candidate fields and shared route guards; supersedes earlier unresolved G1–G3 discussion. Design only.

**DIAGNOSIS / DESIGN ONLY - STOP FOR REVIEW.** LMS-0725 / 0.1.547 remains the accepted deployed release. LMS-0726 is the planned release identifier only; application version files have not changed. No application implementation, code deletion, SQL, deployment, production request or OpenAI call was performed in this diagnosis.

The Member Detail action-row requirement is included in this design and mandatory acceptance gates M01-M15. It will not be implemented separately ahead of this review.

Source-backed appendices:

- [Read-projection/database boundary continuation](lms-0726-read-boundary-design.md): supersedes the tentative SQL discussion below. SQL is required; six proposed shared functions (two data projections), explicit field/grant matrix, current source queries, normal-route policy conflicts G1–G3, and review gates. No implementation authorized by this report.

- [File, route, loader and API inventory](lms-0726-inventory.md): 51 page routes, 77 View-As-related source/test/script references, 45 API route files; physical LOC and direct query/mutation evidence.
- [Machine-readable census](lms-0726-inventory.json).
- [Role/route and acceptance matrix](lms-0726-acceptance-matrix.md), including Member Detail button visibility, target validity, mobile and accessibility.

The inventory is exhaustive for the checked-in page files and textual View-As references scanned, not proof that a regex discovers every indirect permission or dynamic mutation. Scope-sensitive routes have explicit implementation proof gates; no ambiguous route is to be enabled by guessing permissions.

## 1. Root cause of the mini-LMS

The accepted implementation deliberately isolated a bounded renderer from the normal browser Auth graph. `proxy.js` rewrites every isolated-origin page URL to `/view-as` and denies ordinary API paths. `app/layout.tsx` also replaces all normal children/providers with `ViewAsPage`. That page owns a five-button navigation array, summary cards/tables and a separate Ask form. The `snapshot` operation calls a purpose-built database summary with 100-team/500-roster/100-match/200-standing bounds. The prior LMS-0724 report records this bounded architecture.

Normal pages depend heavily on browser Supabase Auth and direct queries. Reusing them unchanged would initialize Auth or request data through the wrong identity. The mini-LMS avoided that integration work but sacrificed product parity. This is the architectural cause supported by source; no claim is made about an undocumented author's motivation.

## 2. Mini-LMS inventory

There are no separate checked-in mini dashboard/team/match/standings page files. Those five views are branches inside `app/view-as/page.js` (about 70 physical lines, many very long). Its navigation, summary dashboard, teams/roster cards, published-match cards, standings table, manager-tools unavailable branch, separate Ask form/exchange/source wrapper, button styling and bounded-summary footer are obsolete presentation.

Mixed infrastructure is in that same file: handoff listener, protected request transport, context storage, refresh/validation, expiry/purge, source blob lifecycle and Exit. Extract and preserve these responsibilities before deleting the obsolete page. `app/api/view-as/read/route.js` is about 70 lines and mixes lifecycle/status, snapshot, Ask and source operations; retain the security/Ask/source dispatcher, replace only snapshot presentation dependencies. `view_as_private.snapshot` in the historical migration is about two dozen compact SQL lines; remove its active function/dispatch only through an approved migration after callers are gone. Historical migrations remain immutable.

`proxy.js` and `app/layout.tsx` contain the two catch-all substitutions. No standalone mini CSS file was found: classes and button constants are inline in the page. Do not delete `design-preview/page.module.css`: despite its name, the real AppHeader uses it. Likewise real design-preview view components serve actual dashboards and are not mini-LMS leftovers.

## 3. KEEP / ADAPT / REMOVE

KEEP: `viewAsBoundary.js`, `viewAsCrypto.js`, `viewAsServer.js` security semantics; start/bootstrap/exchange API flow; one-time handoff; private context/credential/audit storage; actor authentication; authorization locks; mutation/event-code protection; cleanup/maintenance; existing security test suites and historical migrations/reports. Keep `runEligibility`, Live service, evidence/source validation and Q78 architecture unchanged.

ADAPT: root layout/proxy routing; isolated lifecycle as a provider around the real UI; `ViewAsStartButton`; AppHeader/navigation/profile/Ask transport; normal data-loading controllers; the read dispatcher; source-viewer transport. The inventory classifies every matched source/test/script reference. KEEP test files may contain obsolete presentation assertions that must be replaced individually, not removed wholesale.

REMOVE after parity proof: old ViewAsPage navigation/views/Ask wrapper/summary footer and their snapshot-only client loader; active snapshot operation/helper once unused; isolated-build fixtures and assertions that solely certify mini cards. Shared AskLwrWelcome, AskLwrChoices and source-presentation helpers remain.

## 4. Normal LMS route inventory

The appendix lists all 51 page paths and exact files. Core realities: `/` delegates to AdminDashboardClient; `/captain-dashboard` is 6,159 lines and includes Match Setup and Manage Roster; `/player-dashboard` is 4,164 lines; `/teams/[id]` is 1,814 lines; `/matches/[id]` is 2,870 lines; `/score-entry/[id]` is 803 lines. `/matches` redirects to `/scoring`. The three `/design-preview` page routes are redirects, while their imported view/style components remain live production dependencies.

Also covered: members/detail/import, ratings, teams, divisions/detail, leagues/seasons/locations, scheduling/editor/scoring/score sheets, standings/live match, communications/system/email setup, AI management/review/console/Ask, official/approved-source viewers, role help, print, tournament and round-robin public/admin/player routes, login/reset-password. Navigation links into `/pbcc` and `/tourney` modules are not evidence that an LMS role owns an event credential; module integration must retain that distinction.

## 5. Role/route matrix

See the six-role appendix. `permissions.js` implements Player < Captain < Club Pro < League Manager < Commissioner. Co-Captain is a team relationship (two co-captain fields), not a sixth stored role. Do not invent a View-As-only Co-Captain role. A co-captain fixture must reproduce the normal role record and team assignment.

Normal dashboards select highest role; team relationships and Club Pro locations further constrain actions/data. `highestRoleForMembers` and the accepted View-As member-role function use highest-role selection, while View-As also returns all role labels. Preserve the normal combined experience, including all relevant assignments, without replacing it with an independently invented union or arbitrary single-role choice. Compare multi-role fixtures in both modes. A current legacy normal-route permission inconsistency is a review issue, not permission to copy a leak.

## 6. Shared shell and navigation

Reuse actual AppHeader, adminNavigationSections, real dashboard view components, cards, tables, dialogs, fonts/CSS and AppDialogProvider. Introduce a viewer/data provider consumed by those same components. Split normal-session loading from presentation so the isolated bundle never imports/initializes `lib/auth` through shared headers/pages. Keep normal Auth/PWA/inactivity behaviors in the normal adapter only. View-As uses its own existing expiry/credential lifecycle; no PWA/offline caching of protected results.

Add the persistent banner above the shared shell, with real administrator and effective target roles clearly separated. Navigation derives from the same normal policy and effective role/relationships. Preserve normal URLs and deep links. No global/sidebar View-As entry. The manager target sees actual manager screens read-only, not an 'Exit required' mini page.

## 7. Effective-viewer abstraction

Proposed server contract: `resolveViewer(request)` returns internal realActor, effectiveMember, optional effectiveAuthUser, effectiveRoles, normal role-selection result, mode, readOnly, expiry and a validated capability context. Normal mode resolves the existing authenticated principal. Isolated mode delegates to accepted `resolveEffectiveViewer`; never accept actor, effective member or roles supplied by the browser.

Return only a non-secret viewer DTO to components. Do not serialize the stored credential, privileged client or raw authorization context. Real actor is for auditing/context validity; it is never a data-scope fallback. Every page read and source access revalidates current context/role/target. Revalidate after slow work before disclosure. Use the existing private authorization-lock helper around sensitive projections rather than replacing it with client checks.

## 8. Data-loader adaptations

A: existing pure formatters/selectors and explicit-member calculations can be shared after their inputs are authorized; existing View-As Ask/Live/eligibility already use effective-member execution.

B/C: AppHeader, AdminDashboardClient, CaptainDashboard, PlayerDashboard, member/team/match/rating/scoring pages and their dialogs depend on browser session/user/email or direct Supabase queries. Their table/RPC/mutation dependencies are enumerated per page in the appendix. Passing a target ID into these queries or mocking `auth.getUser()` is rejected.

D: extract each real page's read model into a named, typed data operation with validated resource IDs, pagination and explicit relationship rules. A normal adapter preserves existing authorized behavior; an isolated adapter uses the secured read dispatcher and bounded server projection. No generic table/query/filter RPC. Resource IDs select a resource, never select the effective subject. Shared UI consumes identical DTOs and pure display calculations. Eliminate duplicate queries from header/page/modal by request/context-scoped reuse; do not globally cache sensitive DTOs.

## 9. Captain Dashboard

Reuse the actual dashboard, including team selection, upcoming/published matches, notices, setup completeness, roster information, results/history and captain navigation. Extract its monolithic loading/controller logic in bounded steps, keeping the render tree or extracting shared subcomponents used by both modes. Scope teams to captain/co-captain relationships plus current Club Pro rules; never use the real manager's all-team data and hide rows later. Cover empty and multi-team states.

## 10. Match Setup

The actual `setupMatch/setupTeam/setupRoster/setupLineups/setupRatings` dialog and handlers live in CaptainDashboard. Reuse that dialog and its instructions/layout, with authorized lineups, ratings and permitted opposing-team state. Preserve reveal/publication timing and team-side permissions. Local selection/view tabs may remain interactive; disable editing controls and omit save/submit/email side effects. Manual requests must still be rejected centrally. Score entry and match-detail variants have their own route gates in the inventory.

## 11. Manage Roster

Reuse the current captain roster modal (`rosterTeam`, `openRosterModal`) and team-detail roster views; do not create a new summary page. Display exactly the target-authorized roster/candidates/status, with add/remove/save unavailable in View-As. Audit identityRoleWriter and implicit role writes as well as obvious roster CRUD. No opening/loading a read page may trigger role repair or defaults insertion.

## 12. Player

Reuse PlayerDashboard with its team/match/history/profile/guide states. Member context replaces Auth-email lookup only inside the trusted loader. Profile editing/upload, notification subscription and other writes are blocked; substantive profile information stays visible where normal permissions allow. Preserve normal navigation rather than exposing manager Members/Ratings pages to players.

## 13. Club Pro

Reuse normal captain-style entry and existing Club Pro data behavior. Captain loading includes assigned captain/co-captain teams and the Club Pro location mapping against `teams.home_location_id`; carry precisely that scope into the secured projection. Do not substitute deprecated `location_id`, all-location reads, or only direct team.club_pro_member_id if that loses normal scope. RF remains SELF-only even when team support permissions are broader.

## 14. Ask LWR

Reuse the exact AskLwrTrigger/AskLwrAssistant drawer and Exchange, AskLwrWelcome, choices and source classification. Inject request/source-opening/feedback policy adapters, not a second Ask component. View-As calls existing effective-user Ask logic and diagnostic telemetry; feedback disabled, no ordinary feedback receipt/history persistence. Keep compact help, actionable examples, clarification behavior, citations and three badges. Preserve all LMS-0725 eligibility and cost/Q78 behavior; use deterministic fixtures, no generation benchmark.

## 15. No target Auth account

Valid active member/role context can support dashboard, team/roster/match/standings/rating/policy reads without a target Auth session. Auth user ID is optional and may not be synthesized. Identity/session settings, password/passkey management, push-device state and event capabilities unavailable from that context receive narrow page/control limitations. Keep the rest of the actual LMS shell/screens; never fall back to the mini-LMS. Ambiguous or invalid member-role mapping still denies initiation.

## 16. Dedicated-origin routing: recommended option

Recommend hostname-aware, explicit allowlisted dispatch into the SAME normal page components, wrapped by an isolated provider. Replace the catch-all `/view-as` rewrite and root children replacement after the first shared routes are safe. Keep dedicated-origin CSP/no-referrer/no-store/no-frame protections and ordinary API/Server Action denial. Unknown routes fail closed. An internal route registry is deployment policy, not a second UI tree.

Compared options: a broad rewrite directly into unchanged pages is unsafe because it mounts browser Auth and writable loaders; a copied dedicated route tree perpetuates duplicate UI. A shared component registry with small origin adapters isolates transport without copying screens. Normal URLs remain `/captain-dashboard`, etc.; preserve query parameters only through route-specific allowlists.

Initial document navigation carries no `x-view-as-context` header. Therefore render only non-sensitive shell/loading until the isolated provider restores its existing tab-bound context and validates through the read endpoint. Do not SSR protected data from an unvalidated GET. Do not put the opaque context in URLs. Missing context after copied URL/new tab denies safely; refresh/back/forward in the established tab revalidate and cancel stale requests. External links use safe no-referrer/noopener behavior. Images/PDFs must use approved same-origin read transport or bounded public assets; do not loosen CSP to arbitrary Supabase connections.

## 17. Read-only treatment

Allowed controls: navigation, filters, sort, pagination, selecting tabs, opening details and safe local printing of already authorized data. Keep form layout/data where it explains the normal page; use disabled fieldsets/buttons with an accessible READ-ONLY explanation, suppress submit/autosave effects. Hide destructive/irrelevant actions when consistent with normal screen layout. Feedback remains disabled. Read-only does not mean blanking the substantive screen. Real Tab A is unchanged.

## 18. Mutation/security inventory

The appendix lists all 45 API route files/methods plus per-page direct Supabase mutations. Guard all ordinary API methods and Server Actions on isolated origin, including GET endpoints with side effects, and reject View-As credentials replayed to normal origin. Enumerated families: member/profile/photo, user roles/identity repair, roster/team/division/league/season/location CRUD, match setup/lineups/emails, score/game/match edits, scheduling/reset, communications/notifications, AI sources/processing/activation/Approved Answers/review/feedback, tournament and round-robin event-code operations.

Do not expose the normal Supabase browser client in View-As: direct database writes bypass the app HTTP guard. Keep the existing read dispatcher allowlist; POST status/Ask/source/exit are narrowly intentional operations, not permission to ordinary POST. Re-audit imports and mount effects as well as buttons. Preserve role invalidation locks, target Auth untouched, replay/omit-context defenses and credential cleanup.

## 19. Parity tests

Build local paired fixtures with the same synthetic target, role rows, teams, match state and data DTOs. Render the same component under normal and isolated adapters and compare navigation, substantive DOM/data, tables/cards and dialogs. Compare denied routes as well as allowed routes. Use network spies that fail if View-As calls Supabase directly, ordinary mutations, OpenAI or target Auth. Exercise real secured reads in an isolated database with negative/race tests before production review. Do not fabricate production users or personal RF values.

## 20. Allowed differences

Only banner/READ-ONLY/Exit, mutation treatment, disabled feedback, necessary narrow unavailable-Auth notices and diagnostic/audit behavior differ. Timing/loading may reflect context validation but not different data. Target naming, navigation, visibility, tables and substantive states must otherwise match. A missing Captain tool, different roster contents or mini card is a parity defect.

## 21. Deletion plan

First extract lifecycle and prove each replacement route. After paired tests and dependency search, delete old page presentation and its route substitution; remove snapshot client call, dispatch branch and database summary only when no consumers remain. Replace presentation assertions in viewAsBoundary/fixture/isolated verification and source-classification tests with actual shared-page assertions; preserve every security case. Keep historical migration/report files. Run import/build/route tests and search for mini nav labels, snapshot calls, `/view-as` rewrite and old bounds footer. No supported final dual-interface mode.

## 22. Files / LOC estimate

Current standalone obsolete presentation container: one ~70-line densely formatted page; approximately 25-40 physical lines are mini navigation/rendering and the remainder mixes security/transport. Snapshot helper is ~24 compact SQL lines, plus dispatch/rewrite/layout/test fragments. These small physical counts understate JSX complexity. No standalone mini stylesheet exists to delete. Expected final removal: the old page file after infrastructure extraction, snapshot-only operation/helper through an approved forward migration, and obsolete test fragments. Final added/adapted file counts depend on the approved loader split; do not claim savings by deleting security history. Report exact before/after LOC and dependency counts during implementation. Target: zero duplicate presentation LOC, even if shared authorization adapters increase total security code.

## 23. SQL requirement

The button placement and target eligibility preflight are application-only: the existing GET `/api/view-as/start?target=...` already returns trusted eligibility/name. No new SQL needed for that requirement.

Full-page parity is not supported by the existing summary projection. Recommend a separately reviewed, additive bounded read-operation family inside the accepted locked dispatcher for dashboard, team/roster, match/setup/score display, authorized member/rating and manager page data. Validate context/roles, lock authorization rows using the accepted helper, enforce resource relationships and return minimal DTOs in the same protected operation. Inventory required existing tables/columns from the appendix; add only necessary executor SELECT column grants. No new target identity/Auth or arbitrary-query endpoint, no public/anon/authenticated grants to private helpers, no service-role data loaded for client filtering.

Schema tables need not change based on current evidence; function bodies and possibly executor grants will. Exact SQL/signatures/column list and rollback must be a reviewable implementation artifact before mutation, not silently covered by this design. Reject an application-only shortcut that loses the lock/authorization boundary. Retire the active snapshot function only after parity/dependency proof. No migration was authored or applied here.

## 24. Performance

Current mini implementation loads one bounded snapshot repeatedly; normal dashboards contain many independent queries. Replace broad snapshots with route DTOs and lazy modal reads, deduplicate header/role/system settings within a validated request, and paginate without changing visible semantics. Measure cold/warm normal vs View-As load, request count, bytes, database time and Server-Timing validation overhead with identical fixtures. Set regression budgets from measured baseline during implementation; no production timings were measured for this design. No cross-context cache or background fetch after expiry.

## 25. Member Detail, mobile and accessibility

Current action row is `mb-6 flex flex-wrap gap-3` around line 666 of `app/members/[id]/page.js`; ViewAsStartButton is instead under the name around line 738. Neighbors are native buttons, not a shared design-system component: rounded-xl, px-4 py-2, font-semibold with normal color variants. Move the entry into that existing row and reuse a small local action-button style/component shared with neighbors; match height/padding/type/radius/focus/wrap rather than introducing a special View-As card. Preserve current read vs edit action grouping; offer entry in normal detail mode, without disrupting Save/Cancel while editing.

Use real actor eligibility plus target-specific server preflight before rendering. Current button checks `can_start` on mount and target validity only after click; adapt it to target preflight on mount/target change, hide while unresolved/denied and leave no wrapper gap. On click recheck and display the existing appConfirm with server-validated name, READ-ONLY/separate-tab explanation. Only confirmation triggers protected start; POST independently revalidates actor Commissioner/League Manager, target, origin and nested-state rules. In View-As mode hide initiation even for a manager target. Multi-role real actor eligibility is determined by trusted existing policy. Invalid/stale target checks fail closed; no disabled advertisement for unauthorized users.

M01-M15 are mandatory. Compare row with/without entry at desktop, 390px and 320px, including long labels and edit mode. Preserve semantic button, keyboard, visible focus, confirmation focus/escape/return and target invalidation races. Banner must wrap without covering real navigation, use appropriate status/region semantics and announce mode once; Exit stays keyboard-reachable. Existing 30-minute MAX expiry (earlier actor token expiry remains) purges data and prevents fallback to administrator identity.

## 26. Bounded implementation sequence after review

1. Approve this architecture and explicit SQL/function dependency; retain accepted LMS-0725 baseline. No production work during design.
2. Freeze paired role/route fixtures and security tests, resolve legacy direct-route permission gaps and exact normal multi-role/Club Pro behavior; produce exact operation/column permission contract.
3. Extract isolated lifecycle and shared viewer/data adapter interfaces with normal-mode regression coverage. Implement Member Detail action-row/preflight correction in this same release, not separately.
4. Implement/review/test bounded read projections and grants in an isolated database; preserve authorization-lock races and rollback. Stop for SQL review before any production mutation.
5. Adapt shared AppHeader/navigation/providers, then actual Captain Dashboard + Match Setup + Manage Roster; compare both modes.
6. Adapt Player/Club Pro and remaining role-accessible routes from the matrix, including manager read-only pages and source/help/event limitations. No route silently uses admin scope.
7. Reuse exact Ask UI via transport injection and deterministic LMS-0725 regressions. No model/evidence/cost-policy change.
8. Validate all paired fixtures, negative security, browser history/refresh/expiry/Exit, mobile and accessibility; measure performance.
9. Delete obsolete mini presentation and dead snapshot consumers after dependency proof; retain security tests/history. Verify one UI through source/bundle searches.
10. Run focused tests first, then full local tests, lint, typecheck, PDF verification, build and diff check. Report exact files/LOC added/adapted/removed and all limitations.
11. STOP FOR IMPLEMENTATION REVIEW. Controlled SQL/deployment/production acceptance requires the appropriate subsequent approval; no automatic release. Do not declare parity while any required route is a summary substitute.

**Review status:** design and Member Detail requirement recorded; implementation has not begun. Main approval decisions are the shared route/data-adapter approach and the bounded SQL read-projection dependency. Open direct-route/capability entries are explicit implementation gates, not pass claims.
