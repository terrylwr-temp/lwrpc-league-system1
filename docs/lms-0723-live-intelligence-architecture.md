# LMS-0723 / 0.1.545 — Live LMS Intelligence: architecture and authorization design

Diagnosis date: 2026-09-07. **Design only; implementation is not authorized by this report.** Current application remains **LMS-0722 / 0.1.544**, deployed and production accepted. Inspected checkout: `42778fd3066f89e7f6f8dabb00b09c952ebfbbbf`. Proposed implementation identifier: LMS-0723 / 0.1.545; no version files changed.

## Recommendation and decision gates

Build six small, read-only, deterministic capabilities: self Season rating, authorized person Season rating, authorized person email, own/managed team identity, own/managed roster, and next published team match. Do not send Phase 1 live questions, names, facts or results to an embedding/answer model. Do not implement eligibility decisions, historical ratings, contact harvesting, reverse-email search or broad manager analytics in Phase 1.

The core authorization rule is the intersection of an explicitly supported capability, the current authenticated principal, an authoritative resource relationship, permitted fields, and current season/publication scope. A higher role or a retrieved row is not sufficient by itself. Resolve authorization before reading the protected value. A model never makes or overrides an access decision.

**There are existing authorization mismatches that need owner review before implementation.** Production metadata shows broad authenticated SELECT policies on member and operational tables; the UI imposes narrower visibility in several places. Email-based server role resolution also differs from user-ID-based database relationship checks. Do not copy these exposures into AI. In particular, do not simply call the existing `authorizeAdminRequest(req, 'player')` and then run service-role member queries.

Required design decisions:

1. Approve a live principal derived from verified Auth identity and the protected `user_roles.user_id → member_id` binding, with no email-based role escalation or silent duplicate-member selection. Separately review existing email/self-update authorization exposure.
2. Approve Captain/Co-Captain person lookup limited to the current rosters of teams they are explicitly assigned to manage. Recruiting/community-wide candidates are deferred. League Manager/Commissioner single-person lookups may use their existing member-directory population, defaulting to active members and an explicit operational context.
3. Approve team-assigned Club Pro access on the same bounded basis. Location-only Club Pro scope needs reconciliation: the dashboard grants visibility, while current write helpers do not recognize that relationship. Do not treat Club Pro as a generic “Captain or above” permission.
4. Approve intentionally narrow Phase 1 contact behavior: no other-player email for ordinary players, even though own-roster contacts are currently exposed by parts of the dashboard. Public organizational contact information remains a separate documented-information capability.
5. Approve sanitized live outcome/feedback contracts and database changes before connecting live results to Stage 7. The current document-answer feedback path persists full answer text and must not receive live answers.

The supplied attachment ends mid-sentence at section 46 (“If current LMS permissions support it, recommend”). This report covers every supplied requirement and does not assume unseen additional authorization.

## Evidence and inspection method

Read-only production inspection used the existing project `glikrmmgirilnmamxxyl`: catalog metadata, column names/types, grants, RLS policies, constraints, indexes, triggers and existing authorization function definitions. No member rows, contact values, ratings, rosters, schedules or Auth users were queried. No production role impersonation or authorization exploit was attempted. Browser login is unnecessary for this design pass; role behavior below is established from code and database definitions, not a claim of six live persona sessions.

Primary code references (paths relative to `lwrpc-admin/`):

| Reference | What it establishes |
|---|---|
| `app/lib/auth.js:44`, `app/lib/memberLookup.js:12`, `app/lib/permissions.js:1` | Client role resolution, duplicate-email selection, role hierarchy and dashboard routing |
| `app/lib/serverSupabase.js:41` | Token validation, email-based member lookup, highest eligible role, service client |
| `app/api/admin/member-directory/route.js:13` | League Manager member directory; Commissioner role-directory mode; bounded RPC pages |
| `app/captain-dashboard/page.js:269` | Team captain/co-captain/pro and location-pro dashboard visibility |
| `app/captain-dashboard/page.js:1782`, `:4036` | Own-team Match Setup data and roster contact display |
| `app/teams/[id]/page.js:48`, `:119`, `:145`, `:720`, `:935` | Roster page access, broad candidate fetch, location filtering and client add checks |
| `app/player-dashboard/page.js:172`, `:229`, `:513`, `:1147`, `:2563`, `:3100` | Self/team context, roster/contact fetching, division views and contact hiding |
| `app/api/match-lineups/route.js:57`, `:143`, `:188` | Server authentication, explicit team manager relationship, roster/rating/line checks |
| `app/lib/ratingEligibility.js:7`, `app/ratings/page.js:884` | Rating type selection, numeric limits, separate operational rating cleanup |
| `app/lib/divisionOptions.js:1`, `app/lib/systemSettings.js:12` | Active season/league/division filtering and configured club timezone |
| `app/api/ask-lwr/route.js:12`, `app/lib/askLwrPlayerAnswer.js:17` | Existing player authorization and protected/document routing boundary |
| `app/lib/aiConversation.js:19`, `:133`, `:235` | User-bound encrypted document receipts; full feedback payload |
| `app/api/ask-lwr/feedback/route.js:12`, `app/lib/aiQualitySnapshots.js:33` | Full legacy feedback storage versus sanitized Stage 7 outcomes |

Metadata findings are observed configuration, not proof that every intended permission has been exercised. Supabase distinguishes table grants from row policies and service-role bypass; see its [RLS documentation](https://supabase.com/docs/guides/database/postgres/row-level-security). The changelog markdown fetch was unavailable; no feature implementation depended on it. Local Next.js route-handler documentation and the Next.js skill were also reviewed; route authorization must be enforced server-side, independently of page navigation.

## Existing authorization architecture

### Roles and visible workflows

There is no separate Co-Captain application role. `user_roles.role` uses Player, Captain, Club Pro, League Manager and Commissioner. Co-Captain is a team assignment in either of two columns. The client hierarchy is `player < captain < club_pro < league_manager < commissioner`; this describes existing `hasRole`, not the proposed permission policy.

| Role/relationship | Existing application access | Existing write boundary and qualifications |
|---|---|---|
| Player | Player Dashboard; self profile, own teams, rosters, published matches and history; standings and active division views | Profile updates through existing paths; no member-directory UI or captain Match Setup authority merely from being a player |
| Captain | Captain Dashboard, Teams/Rosters routes; directly assigned teams; roster contacts/ratings and Match Setup; opposing captain contacts for matches | Team roster and match RLS use user-ID role plus explicit team assignment; client controls alone are not sufficient |
| Co-Captain 1/2 | Same team relationship paths as Captain when the account has the required app role | Both team co-captain columns are recognized in team/match authorization; `team_members.role` alone does not grant management |
| Club Pro | Captain Dashboard; team-level assignment; also teams whose home location names this member as either location Club Pro | Team-level assignment recognized by RLS and Match Setup route. Location-only assignment is absent from those write checks. Not a general member administrator |
| League Manager | Member directory/details, ratings, leagues/divisions, schedule editor/scoring, AI management/review; broad league operations | Server member-directory route and operational write policies allow managers; no per-league manager assignment was found in inspected core authorization |
| Commissioner | Manager capabilities plus role administration, locations configuration and Commissioner-only operations | Role-management route/policies restrict role changes; existing last-Commissioner application guard remains unrelated to AI |

`/matches` redirects to `/scoring`, which is manager-gated; players/captains have their own match views/actions. `/standings` is player-gated. `/teams` and `/teams/[id]` are captain-gated at page level; the latter loads the supplied team without a client relationship gate before reading its data. `/members` and `/members/[id]` require League Manager. `/locations` requires Commissioner for configuration, although venue information is displayed in ordinary match views. Read access and edit access are distinct.

### Production database protections

All inspected core tables have RLS enabled. Their SELECT grants exist for `anon` and `authenticated`, but the inspected SELECT policies apply to **authenticated** with `USING true`. Thus anon's table grant alone is not permission to read rows; authenticated users have broad row visibility. This covers members, user roles, member season ratings, teams, team members, seasons, leagues, divisions, locations/court availability, matches, lineups, match lines and standings. These policies do not enforce publication or field-level contact restrictions.

Operational write policies are narrower:

- `private.current_user_can_manage_team` allows a current user-ID-based manager role or a Captain/Club Pro role bound to one of the team's captain, two co-captain or team-pro member IDs.
- `current_user_can_manage_match` delegates through either participating team. `current_user_can_manage_match_lineup` uses the lineup team relationship.
- Most configuration/rating writes require League Manager/Commissioner. User-role writes require Commissioner.
- Member update policy permits the authenticated user's bound member row or managers; catalog privileges include UPDATE on email, active-member and location fields. No non-internal member trigger was found to narrow those columns.
- `admin_member_directory_page` is SECURITY INVOKER and not executable by anon/authenticated; the protected manager server route calls it with server access. This is a useful bounded-route precedent, not a reusable person/contact permission grant for Captains.

### Mismatches requiring separate review

| Finding | Consequence for live AI design |
|---|---|
| Authenticated member SELECT is unscoped and includes contact/private columns | Do not equate database readability with intended AI disclosure. Use explicit minimal projections and reviewed population predicates |
| Player Dashboard fetches email/phone for match-team rosters, while some views hide contact columns | Hiding fields after fetching is not a security boundary; do not reproduce that pattern |
| Team roster candidate loading fetches up to 5,001 active-or-null members and their emails before location filtering | “Visible in candidate data” does not justify AI-wide email search or disclosure |
| `authorizeAdminRequest` resolves roles through email; private team helpers use Auth user ID; `current_user_role` uses JWT email and an unordered first match | Different routes can disagree about identity/role; a new shared live principal must fail closed on inconsistency |
| Member email is not unique and is self-updatable under current policy/grants | Email cannot be a trustworthy join for privilege escalation. This creates a serious potential authorization path that needs separate security review; no exploit was attempted |
| Active-member fallback accepts inactive rows when no active match exists | Membership validity and role validity are not consistently enforced; define behavior explicitly before live launch |
| Location-level Club Pro dashboard visibility differs from write authorization | Do not extend location-pro access or actions through AI without reconciling the intended relationship |
| Roster eligibility is split across browser checks, rating cleanup and server lineup checks | There is no single demonstrated complete eligibility engine to call for a universal “eligible” decision |

These are pre-existing findings from diagnosis. No RLS, identity data, screen or policy was changed. Broad authenticated reads and the email/identity mismatch should be reviewed as security prerequisites, not silently accepted because LMS-0722 was functionally accepted.

## Authoritative relationships and season resolution

Use verified Auth user ID to resolve `user_roles.user_id`, its role and `member_id`. That user-ID column is unique; member email is not. Read only identity/role/relationship metadata at this stage, never another member's protected fields. Require a valid bound member and an allowed current account state. If the binding is missing or contradicts an email-based legacy association, stop with an account-support message; do not merge duplicates or select the highest role across email matches. Remediation needs a separate approved linking workflow. Display names and client team IDs are never authority.

Authoritative chain:

- Self/team player relationship: bound member → `team_members.member_id` → team.
- Team management: role plus `teams.captain_member_id`, `co_captain_member_id`, `co_captain_2_member_id`, or `club_pro_member_id`.
- Location pro: `locations.club_pro_member_id` / `club_pro_2_member_id` joined to `teams.home_location_id`; a separate relationship class, pending the decision above.
- Team → division via `teams.division_id`; division → league via `divisions.league_id`; league → season via `leagues.season_id`.
- Community: use `members.location_id` and team home-location IDs when reliable. Legacy `club_location` text matching is used in the UI but must not independently authorize a contact lookup. Report unmatched mappings; do not globally equate free-text locations.

Current context resolution order: an explicitly requested team/season validated against the operation's authorized set; otherwise a server-validated selected team; otherwise the unique eligible own/managed team; otherwise bounded team/season clarification. Filter current scope using explicit active season, league, division and team state, not calendar date alone. Existing UI treats `is_active !== false` as active; legacy nulls and `team_members.is_active` must receive a documented rule before implementation. Prefer explicit active records for live Phase 1 and fail closed on ambiguous legacy status; do not silently remove or grant access through a new interpretation. Multiple active seasons can coexist. Do not pick the first returned row.

An active rating season may be uniquely resolvable for a self lookup even without a team; if there is more than one applicable season, ask. Division/rating type still needs explicit resolution. A team's next match is not proof that the player is in its lineup. Say “your team's next match” unless a separately authorized lineup operation establishes participation.

## Authorization matrix for the proposed live layer

This is a **recommended Phase 1 ceiling and future boundary**, not a claim that current RLS already implements it. All access requires authentication; “non-sensitive” below does not mean public/anonymous. Omitted capabilities remain unsupported even if a table is readable.

Codes: **S** self; **T** explicitly managed current team roster; **O** player's own current team; **D** published division/league information; **M** bounded manager population; **X** unsupported/prohibited initially; **F** later capability needing approval. Club Pro **T** means team-assigned only; location-only expansion is held. Co-Captains require the same verified assignment/role as Captains.

| Field/entity | Player | Captain / Co-Captain | Club Pro | League Manager | Commissioner | Phase 1 / qualification |
|---|---|---|---|---|---|---|
| Member display name | S, O roster | S, T | S, T | M | M | Only authorized result/resolution population; no global directory suggestion |
| Email | X for other people; S later | T single person | T single person | M single person | M single person | Phase 1 contact capability; ordinary-player contact lookup withheld; no bulk/reverse search |
| Phone | X | X | X | X | X | Stored, but excluded Phase 1 even where a screen shows it |
| Community/location affiliation | S/O limited context | T safe disambiguation | T | M | M | Only if needed; no all-community person permission |
| Membership status / renewal | F:S | F:T | F:T | F:M | F:M | Stored; no payment/billing data; not a Phase 1 fact output |
| DUPR ID | F:S | F:T | F:T | F:M | F:M | Stored; can be added as a small later self intent, not retrieved with rating/email |
| Current official DUPR | F:S | F:T | F:T | F:M | F:M | LMS stores season-associated imported doubles value; not a live DUPR service reading |
| Season DUPR | S | S, T | S, T | M | M | Phase 1, explicit season and rating type; no recomputation |
| PrimeTime age-based Season rating | S | S, T | S, T | M | M | Same rating capability with explicit type; not proof of age eligibility |
| Reliability Factor | F:S | F:T | F:T | F:M | F:M | `dupr_reliability_rating` exists; defer output/NR inference |
| NR status | F:S | F:T | F:T | F:M | F:M | Distinguish stored NR marker, missing numeric value, and operational NR classification |
| DOB / exact age | X | X | X | X | X | No DOB field found in inspected core member schema; never infer from notes |
| PrimeTime age eligibility | F:S | F:T | F:T | F:M | F:M | Requires authoritative facts not demonstrated by current schema; unknown, not inferred |
| Team / division / league identity | S/O | S/T | S/T | M | M | Phase 1; named-team manager lookup bounded |
| Roster membership/list | O | T | T | M | M | Phase 1 names only; roster is not Match Setup and membership is not eligibility |
| Captain / Co-Captain identity | O | T | T | M | M | Names/roles in identity results if requested; no automatic contact expansion |
| Schedule / next match | O published | T published | T published | M published initially | M published initially | Phase 1 next match; future D navigation can mirror published standings views |
| Opponent team | O published match | T published match | T published match | M | M | Team name, no automatic opposing-player/contact disclosure |
| Match location / court venue | O match | T match | T match | M | M | Venue name and documented venue address if requested; no member residential address |
| Match Setup status | F:O | F:T | F:T | F:M | F:M | Distinguish absent/partial/complete; do not infer full completion from any row |
| Lineup/pairings | F:O published visibility | F:T | F:T | F:M | F:M | No hidden/opponent prepublication lineup inference from broad SELECT |
| Scores / team record | F:O/D | F:T/D | F:T/D | F:M | F:M | Deterministic future capability; distinguish entered, verified and finalized |
| Standings | F:D | F:D | F:D | F:M | F:M | Existing player standings visible; no need to broaden Phase 1 |
| Forfeit / retirement | F:O/D result | F:T/D result | F:T/D result | F:M | F:M | Result code only by default; private dispute/result notes excluded |
| Court capacity / location info | F:D venue | F:T/D venue | F:T/D venue | F:M | F:M | Facility metadata is not personal residence data; configuration remains separate |
| Payment IDs, billing, IPs, private notes, auth IDs/tokens | X | X | X | X | X | Never Phase 1 model/UI/quality-log fields |

No automatic **own-community** population is recommended. Sharing a location or division does not establish an email entitlement. The existing available-player dropdown and member SELECT policy are too broad to use as that entitlement.

### Exact Captain contact decision

Allow “What is John Smith's email?” only if: authenticated current principal has Captain/Club Pro/manager capability; selected active team is authorized; John resolves uniquely **inside that team's current roster**; the contact operation is permitted for that relationship; rate/audit checks pass; and the final read rechecks that same relationship. Then project only display name and email. The ability to email roster players is evidenced by the existing Captain Dashboard contact table and Match Setup email workflow.

Do not allow unrelated members, all potential recruits, everyone in a community, everyone in a division, or a supplied team ID to widen the search. An opposing captain's contact is supported by an existing match workflow, but defer that distinct capability instead of folding it into generic person email. Managers may search their member-directory population for one operationally requested contact; bulk contact export is unsupported regardless of role.

Players already see some own-roster contacts and captain contacts in the UI. The owner's requested denial control for another player's email is therefore a deliberately narrower AI policy; it must be acknowledged as such, not described as current universal LMS behavior.

## Capability registry and deterministic query contracts

Registry entries are fixed server code: allowed roles/relationships, parameter schema, person population selector, field projection, query handler, formatter, telemetry schema, limits and navigation actions. A parser selects an enum and untrusted parameter candidates only. There is no arbitrary SQL, table/column selector, user-supplied filter expression, model-authored RPC name or privileged general query tool.

| Phase 1 intent | Parameters after validation | Population and projection | Result/limit |
|---|---|---|---|
| SELF_RATING | season handle; explicit rating kind | Bound member; selected rating value, season label, relevant type, row update time | One deterministic rating or missing/clarification; no contact fields |
| PLAYER_RATING | authorized team/context, name/ref, season, rating kind | T roster or M directory; minimal person resolution then one rating value | One person; no all-roster rating dump |
| PLAYER_CONTACT | authorized team/context, name/ref; email only | T roster or M directory; authorize before selecting email | One email; no phone/rating/notes; security audit required |
| SELF_TEAM / TEAM_IDENTITY | validated selected team or authorized choice | Self team_members or manager assignment; team/division/league/season display labels | Clarify among multiple teams; at most five choices per page |
| TEAM_ROSTER | authorized team | O/T/M team_members; display names and explicit captain/co-captain labels where needed | 25 rows/page, no email/phone/ratings by default |
| NEXT_MATCH | authorized team | Published matches for O/T/M; team names, scheduled date/time, venue, status | One next match; bounded same-time ties; TEAM_NEXT_MATCH is an alias, not a second policy |

No action writes are included. “Open Match Setup” navigates only; it does not enter/save players. Self DUPR ID can be a later seventh capability if explicitly preferred, but should not inflate the first proof of authorization.

Next match: use `matches.is_published = true`; exclude completed/cancelled; evaluate scheduled date/time in the configured club timezone. Handle time-TBD/date-TBD separately. An overdue incomplete match is not silently the next scheduled future match. Do not turn byes into matches. If multiple teams or same-time fixtures are ambiguous, clarify. No match found means no upcoming published match is available, not proof that none has been scheduled privately. Current schema stores date and time separately; do not assume UTC for venue-local scheduling.

### Future Captain and manager operations

| Question family | Planned operation and boundary |
|---|---|
| Who is NR / missing DUPR ID on my roster? | TEAM_RATING_STATUS, T names plus requested status only; exact NR semantics first |
| Who is over our division limit? | TEAM_RATING_EXCEPTIONS, T and selected season/type; deterministic numeric comparison, not universal eligibility |
| Who is entered / not entered in Match Setup? | MATCH_SETUP_STATUS, authorized T + match; compare expected line slots with lineup rows. “Not entered” does not mean everyone on the roster must play |
| Last match score / team's record | TEAM_LAST_RESULT / TEAM_RECORD, O/T and finalized/verified status; existing standing/scoring helpers, not an LLM calculation |
| Missing setup this week | MANAGER_MISSING_SETUP, M scoped season/league/date range, expected slots, team names/status; max 25/page |
| Missing scores | MANAGER_MISSING_SCORES, M published matches in bounded date range, distinguish not played/pending verification from missing score |
| All NR in Weekday 9.1 | MANAGER_RATING_STATUS, M explicit league AND division AND season; 25/page, no contacts |
| Roster eligibility problems/outside range | Reusable deterministic partial eligibility checks with coverage flags; never claim all rules checked |
| Counts by division/league; teams without captain | MANAGER_COUNTS / MANAGER_TEAM_ASSIGNMENTS; aggregate first, deduplicate players versus registrations, inspect authoritative assignment columns |

Manager limits are not bypassed by natural-language requests. Bulk queries need a separate supported registry entry, explicit filter, pagination and no model payload containing hundreds of people.

## Request architecture and data boundaries

1. Verify bearer credential server-side using trusted Auth verification. For contact access and immediate revocation requirements, also validate current session/revocation state; `getUser` alone must not be described as guaranteeing immediate invalidation of every already-issued JWT.
2. Resolve current user-ID principal and permitted capability. Reject unsupported sensitive operations before any candidate lookup.
3. Parse locally into document guidance, supported live capability, live clarification, future mixed eligibility, or protected/unsupported. A name is data, never an instruction. Existing documented password reset, general rule and document navigation paths retain their accepted behavior.
4. Resolve allowed team/season context from server relationships. Treat current page and browser IDs as hints requiring verification.
5. Search names only in that operation's authorized candidate population, projecting IDs internally, names and approved distinguishing labels. Do not fetch email to decide whether email access is permitted.
6. Query the one authorized field set, repeating principal/relationship predicates in the same database operation as the value projection. Application prechecks alone are insufficient if membership/roles change between calls.
7. Format deterministic output and a minimal LIVE LMS DATA card. Create only a protected minimal referent/feedback receipt. No static RAG/embedding call for Phase 1 live lookups.
8. Write sanitized operational/quality metadata; never pass the full execution object or answer text to generic document capture. Return `Cache-Control: private, no-store`; redact request/response bodies from hosting/APM logs.

Route design: keep the player Ask LWR entry point, but add a typed dispatcher before `runPlayerOfficialAnswer`'s protected fallback. The existing document function remains intact for document questions. Recognized live requests never fall through to RAG on authorization failure, timeout, missing member, or unsupported scope. In uncertain routing, ask a bounded clarification or deny; do not embed a possible person/contact query. No global exemption for first-person questions. Manager Test AI must use the same caller authorization; it cannot impersonate a player by passing a role or member ID.

### Database defense in depth

Prefer a caller-scoped Supabase client forwarding the verified user JWT to a small capability RPC, so `auth.uid()` is authoritative at the database boundary. Resolve permissions from current protected rows, not user-editable JWT `user_metadata`, browser state, or a cached role claim. A client-callable function must be safe even when invoked without the Next route.

Use SECURITY INVOKER where caller policies can enforce the exact authorized population. Current broad RLS is not that protection. If a narrowly privileged definer is necessary for identity/contact/audit internals, it must have a constrained owner, pinned empty search_path/qualified references, explicit auth.uid checks, fixed projections, no dynamic SQL, no writes to operational data, no caller-supplied actor override, and explicit EXECUTE revoke/regrant. Put internal helpers in a non-exposed schema; any exposed wrapper enforces the full policy itself. Do not use postgres-owned unrestricted definer as a shortcut.

If service_role is unavoidable for a particular operation, its wrapper must require a server-verified principal, perform relationship authorization again inside the protected operation before projection, and be inaccessible to browser roles. Restrict privileges to the minimum needed and test production-like defaults. A general service client with application-only filtering is not sufficient. Resolve the existing identity mismatch and review broad legacy reads before claiming defense-in-depth across the LMS. Do not rewrite old RLS opportunistically in this release without separate scope approval and full LMS regression tests.

Role/team changes committed before a subsequent request must take effect immediately: no cached role, team population or contact results. The final guarded database read gives statement/transaction-time authorization; it cannot promise revocation retroactively after an already-authorized response has been sent.

## Person resolution, enumeration and errors

Normalize Unicode/case/spacing for local matching, but retain original names for authorized display. Exact full-name match first, within the authorized set; exact does not guarantee uniqueness. Partial names produce at most five safe candidates from that same set. For misspellings, allow only a bounded local/database similarity step within the set, with minimum input length and no automatic “closest person wins.” Ask the user to select. Never search global members then deny after discovering an inaccessible person.

Candidate labels may use name and already-authorized team label. Community only if that field is already allowed; no email, phone, DOB, membership status, rating or private account metadata as disambiguators. If safe labels cannot distinguish people, direct to the existing authorized roster/support workflow. A candidate handle is short-lived and bound to caller/session and requested capability; selection triggers fresh authorization.

For a person outside scope and a nonexistent person, use the same response shape: “I couldn't find that player within the players you're authorized to access.” If the role cannot use the capability at all: “I can't access that player information for your account.” Do not confirm existence via status codes, counts, suggestions or noticeably different global-search paths. Missing-field wording is allowed only after authorized unique resolution: “No email is available in the authorized LMS data” or “No Season DUPR is recorded for that season.” Duplicate authorized names prompt clarification. Database/auth errors return a generic retry message and sanitized reason code, never a SQL error or record payload.

Proposed starting limits, requiring validation/owner approval: person search 10/minute and 100/day per principal; email disclosure 5/minute and 30/day; one email per request, no wildcard/list intent; roster 25/page; manager analytics 25/page and a separate 10/minute budget. Use durable shared enforcement, not per-server memory; audit only code/count metadata on denied enumeration. Server-side repeated pagination cannot bypass a daily contact budget. Rate-limit the protected operation as well as the app route where direct RPC execution is available. Prefer a generic rate-limit response without revealing the authorized population size.

## Rating and eligibility semantics

`member_season_ratings` is unique by member+season and contains `season_dupr_rating`, `season_primetime_rating`, text `dupr_doubles_rating` (including NR), `dupr_reliability_rating`, timestamps and notes. Member `self_rating` is separate. There is no demonstrated current external DUPR API lookup in this path. Imported doubles rating must be described as the LMS-recorded/imported value, with available freshness; query time is not the time DUPR itself measured it.

“What is John's DUPR?” should clarify current LMS-recorded doubles versus Season DUPR, and PrimeTime type when relevant. Do not silently return Season DUPR or infer a type solely from a decimal such as 9.1. Explicit Season DUPR uses the selected season and the team's rating_type, labeled plainly. Return stored precision consistent with the LMS; illustrative numbers in the request are not policy rules. Never recompute frozen Season ratings from live/imported doubles ratings during a lookup.

NR is not the same as null. An NR doubles marker can coexist with an assigned numeric Season rating. Rating cleanup applies a configurable reliability threshold; the raw columns alone do not prove the effective historical cleanup decision. Missing rating, stored NR and operational league NR classification need distinct result states. Phase 1 should avoid unrequested NR/eligibility commentary.

The current deterministic `currentMemberRating` and `divisionRatingIssue` helpers can be reused for future checks. The Match Setup server route checks roster presence, relevant Season rating, individual min/max, pair aggregate maximum and lineup constraints. It does not establish every membership, waiver, community, age or league-policy requirement. Roster addition allows missing information with a manager notification and performs some checks in the client. It is therefore unsafe to label a proposed new “eligibility engine” as already complete.

Future `PLAYER_ELIGIBILITY` should return checked facts, rule/check identifiers, pass/fail/unknown, and coverage gaps from a shared deterministic read-only evaluator extracted from the governing workflows after authorization. Do not call a save/add route to perform a check. Do not infer a numeric pair limit without the second player. Do not equate no observed failure with eligible. Rule 3.5 roster availability is not established merely by a team row or a nominal roster count; its fact source must be identified. No DOB/age field was found in the inspected members schema, so age eligibility may be unknown. Do not mine free-text notes for it.

Future combined answers have two evidence classes: authorized LIVE LMS DATA and selected OFFICIAL SOURCES. Deterministic checks govern the factual result; formal LWR/USAP authority and applicability remain unchanged. If the database configuration and active rule conflict, explain the bounded discrepancy or refer for review rather than letting the model pick a policy. An optional future model formatter receives only explicitly approved minimal facts (prefer pseudonymous subject labels), check results and applicable rule passages. Sending personal live facts externally requires separate explicit approval; current approval for official-document benchmarks does not authorize it.

## UI, freshness and conversation

Use deterministic concise text plus a small expandable **LIVE LMS DATA** card: source “League Management System,” selected season/team, rating type or requested field, and “Checked [local date/time].” Show last updated/imported time separately where authoritative; do not substitute it for query time. No internal table names, auth IDs or raw record dumps. Email answers show only requested email/name and an optional mailto action; no attached phone/address. Official document cards remain under **OFFICIAL SOURCES**, not rebranded as live facts.

No sensitive response caching in CDN, framework cache, shared runtime, service worker, local storage, corpus, embeddings or Approved Answers. Keep live facts in the active session's UI memory only; clear on sign-out/account switch and New Question as appropriate. Never reuse facts from a previous answer to respond to a follow-up. Re-fetch with current authorization.

The existing document receipts use AES-GCM, user binding, 20-minute context and 24-hour feedback TTL, and contain the effective question/full feedback snapshot. Do not reuse their payload contract for live data. Proposed live receipt uses a separate purpose/version and key domain, bound to verified user AND session/conversation nonce, containing only necessary opaque subject/team/season references, capability and expiry (suggested five minutes), not names/emails/ratings. This can remain stateless and encrypted; an opaque server-side reference store is an alternative if approved infrastructure exists. Reauthorize every referent and every request. Possession of a valid receipt does not grant access. New Question clears live references; cross-tab/account changes cannot carry another user's reference. On expiry ask for the person/context again.

“What team is he on?” after a rating lookup reuses only the authorized referent. It must not reveal all of that person's teams to a Captain who can see only one managed roster. Return only relationships permitted by the new operation, or deny. A document follow-up and a live referent must not accidentally overwrite each other's semantics.

Navigation uses a server-generated allowlisted action descriptor for an authorized resource, resolved by existing routes. Existing `/teams/[id]` routes use UUIDs; a UUID is not authorization. Prefer opaque short-lived action handles or existing dashboard context and human labels, but do not promise to eliminate all UUID paths without a separate navigation change. Destination routes must reauthorize independently. No tokens in display text, arbitrary redirects, or fabricated internal routes; never expose a private match page merely because a model generated a URL.

## Stage 7 outcomes, feedback and review privacy

Do not plug live answers into the current document feedback serializer. It writes `original_question`, `effective_question`, `generated_answer` and snapshots from the receipt to `ai_answer_feedback_events` before Stage 7 sanitization. Existing name/email heuristics are not an adequate live-data security boundary.

Recommend versioned typed live telemetry with allowlisted values: answer/request ID, intent enum, authorization relationship class (self/team/manager), origin (player_interface/manager_test), result code, timestamps, duration, projection/check version and source family **LIVE_LMS_DATA**. For future mixed answers retain only trusted Rules identities and a distinct mixed-live source class. No raw/effective live question, name, email, rating, roster, schedule, target ID or result-text hash in ordinary quality telemetry. Even hashing low-entropy ratings/names can leak; do not do it.

Use normal lightweight request outcomes after explicitly extending their contracts. Current `source_family` constraints accept only lwr/usap/mixed/none/unknown, so live provenance cannot truthfully be squeezed into an existing value. Keep `final_kind=answer` for successful live responses if approved; use allowlisted live result metadata for missing/denied/ambiguous outcomes. Denied live requests must not become insufficient official evidence or a missing-rule case. Live technical errors remain technical; no RAG fallback.

Feedback still follows Helpful → repeated Helpful no event → Not Helpful second event. A live feedback receipt contains no protected result; it binds caller/session, answer ID, intent, permitted diagnostic class and version. Prefer extending feedback with an explicit payload/source kind and a bounded safe live metadata object; legacy text columns can carry a constant label such as “PLAYER_RATING result (live values not retained)” rather than fabricated original wording. Update the UI to label these fields as redacted live diagnostics, not an original answer transcript. Existing static rows and validators remain compatible. If clean separation cannot be maintained with that additive contract, use a separate live-feedback relation joined by answer ID; make that schema choice concrete before implementation rather than relying on current serializers.

Live negative feedback should group by capability + reason/check version + safe relationship class, never normalized names or the original question. Use a separate deterministic namespace so it does not collide with official unanswered-question groups. Do not create ordinary insufficient-evidence occurrences for live not-found/denied. Manager review can display “PLAYER_RATING succeeded; value not retained; Helpful/Not Helpful,” timing and diagnostic version. It may offer “Run a new authorized check”; it cannot reconstruct historical private facts or grant access based on the reviewer role alone. Each new check uses current permissions and data. Existing historical official citations remain reproducible by version; live values explicitly are not.

## Security audit, retention and operational failures

Security audit is distinct from Stage 7 quality review. Audit successful contact disclosure and supported manager bulk/eligibility operations with actor/session reference, target reference where necessary for investigation, capability, relationship, time, decision and request ID—**not the email or rating value**. Store references in a restricted security schema with explicitly authorized security-review access; general AI reviewers do not automatically get it. A target ID is itself personal provenance, so minimize retention and access. No raw name search strings; denied searches log coarse reason and throttling counters only.

Suggested retention for owner approval: live quality outcomes/feedback metadata 90 days, restricted contact-access audit 90 days, anonymous aggregate operational counters thereafter if useful, live referents five minutes, rate counters only as long as the relevant minute/day window. Existing static Stage 7 retention remains unchanged. A production retention mechanism and deletion privileges must be designed explicitly; an “append-only” table cannot simultaneously rely on unrestricted service-role deletes. Use a narrowly authorized retention operation for expired audit records, with its own execution audit. No hidden historical store of every live fact.

Quality capture remains bounded/fail-open and does not fail an already authorized answer. **Contact security audit is different:** if required audit/rate enforcement cannot be recorded/enforced, fail closed before returning the email. Avoid logging full errors. A read-only security decision can create a minimal audit event in the future, but no audit table or event was created during this diagnosis.

## Likely changes after separate implementation approval

No code or SQL is supplied or created in this design pass. Expected application boundaries:

- New server-only principal/authorization service, capability registry/router, authorized person resolver, live read service, deterministic formatter, live receipt module and sanitized live quality/feedback serializer.
- `app/api/ask-lwr/route.js` dispatcher and live-safe observation boundary; `askLwrPlayerAnswer.js` remains the official-document path.
- Existing Ask LWR panel gains live fact card/clarification/navigation rendering, New Question/account-switch clearing and typed feedback support. No redesign of accepted mobile layout.
- `app/api/ask-lwr/feedback/route.js`, `aiConversation.js`, `aiQualitySnapshots.js`/`aiQualityCapture.js` get a discriminated live branch without changing document-answer semantics.
- AI Feedback & Review display/filter for sanitized live telemetry, plus Test AI Assistant's same-caller live mode; no impersonation bypass.
- Reuse rating helpers and active-context utilities; any extraction of eligibility logic is a later scoped change, not Phase 1.

Likely database work: bounded capability functions/projections and private authorization helpers; restricted audit/rate-limit storage or an explicitly approved durable equivalent; additive live source/payload metadata and constraint/validator changes for outcomes/feedback/review; indexes for authorized name resolution after query-plan review. An identity-link remediation or existing RLS correction is a separate prerequisite decision, not implicit permission to change old policies. No live member embeddings, document/corpus migration or Approved Answer schema for facts.

Migration review must cover effective grants under production default privileges, function owner/search_path/EXECUTE, browser direct-RPC tests, RLS, idempotency, old feedback compatibility and retention access. No migrations/functions/RPCs were created in this pass. No version bump until actual approved implementation.

## Test plan and implementation sequence

1. **Resolve policy/identity prerequisites.** Owner accepts the matrix and exclusions; settle location-Pro, duplicate/inactive identity, Player teammate contact and recruiting-population decisions. Review legacy broad reads and self-updatable identity fields. Build only after authorization is concrete.
2. **Isolated authorization harness first.** Synthetic users for Player, Captain, two Co-Captains, team Pro, location-only Pro, Manager, Commissioner, unbound and inactive users; duplicate names/emails; active/inactive seasons and teams. Never use production member fixtures.
3. **Principal + self rating + identity slice.** Verified user-ID binding, no email role merge, explicit season/type clarification, deterministic templates, no model/RAG call; prove deny-before-field-query.
4. **Managed person rating/contact.** Search within T/M population, minimal projection, final transactional reauthorization, durable throttles and contact audit. Defer contact rollout if its stricter security prerequisites are not ready.
5. **Roster/next match.** Pagination, team scope, publication, local date/time, no lineup inference, ties/TBD/byes, safe navigation with destination authorization.
6. **Receipts/feedback/Stage 7.** Cross-user/session rejection, expiry/replay, New Question, no raw facts in receipts/logs/snapshots, typed live grouping and old-document compatibility.
7. **Full automated validation and controlled deployment plan.** Preserve the entire accepted LMS-0722 suite, all 28 quality controls and Cross-League Leakage = 0. Run npm test, lint, TypeScript noEmit, PDF server-bundle verification, normal/isolated production build and diff checks when implementation is authorized. Production acceptance must use explicit owner-authorized accounts/data and test actions, not arbitrary real-member browsing.

Required allow/deny tests:

- Self rating succeeds; another person's rating denied to a Player; Captain own roster allowed and unrelated/same-community-only/nonrostered candidate denied; manager exact operational lookup allowed.
- Captain loses role or team assignment, player leaves roster, member binding changes, team/season becomes inactive: next request and old receipt deny. No long-lived permissions cache.
- Club Pro without team assignment has no Captain-wide access. Location-only case behaves according to the separately approved policy, not numeric role hierarchy.
- Player requests another player's email or private manager contact; Captain requests all emails; any role requests DOB/password/reset token/payment/private notes; deny before candidate/value query. Public `info@lwrpickleballclub.com` from trusted documentation remains ordinary RAG/public contact behavior.
- Exact and duplicate full names, partial names, misspellings, authorized/unauthorized people sharing a name, zero matches and missing email; max-five safe choices; no unauthorized existence leak.
- Verify SQL/service spies show rating never projects email/phone and contact never projects ratings/DOB/notes. Direct RPC requests, forged team IDs, malformed parameters, cross-session receipts and prompt-injection strings cannot widen scope.
- Role changes between candidate resolution and final field lookup are caught; audit/rate failures prevent contact disclosure; quality capture failures do not affect ordinary authorized answers.
- Stored doubles NR versus numeric Season rating, null/zero, PrimeTime versus ordinary rating, multiple active seasons, no-team self lookup, imported freshness, last-season request deferred; no silent official-versus-season substitution.
- Roster count versus fielded players, next match versus personal lineup, published versus unpublished, cancelled/completed/overdue/TBD, opponent team versus contact population, venue versus home address.
- Helpful repeated clicks preserve transition semantics without retaining sensitive text. Stage 7 live outcomes never create missing-rule cases or Approved Answer candidates. Inspect browser storage, receipts, DB snapshots, hosting logs and model/embedding call spies for secrets/PII.
- Generic policy questions, password help, document navigation, apparel, selected equipment, league player counts, mixed-only, Rally Scoring qualification, kitchen/NVZ, managed threshold .65 and historical citations remain unchanged.

This diagnosis establishes the architecture and the owner decisions needed to implement it. It does not authorize changes to current permissions. **LMS-0723 implementation has not started.**


## Approved Phase 1 implementation addendum — 2026-09-07

The owner subsequently authorized LMS-0723 / 0.1.545 implementation. The original diagnosis above records its historical pre-implementation state. The concrete implementation and migration are documented in [the implementation report](lms-0723-implementation-report.md).

The service-only, database-guarded fallback is used because legacy authenticated RLS is broader than the approved live population. Verified user ID and session are supplied only by the protected route; all exposed RPCs deny browser execution. A non-login constrained session reader has only the three necessary Auth-session columns, with no new service-role Auth grants. Each operation repeats current principal/relationship checks before its fixed field projection. Contact audit/rate failures close disclosure.

Live feedback is a separate private relation, not a disguised document snapshot. Normal lightweight outcomes explicitly admit LIVE_LMS_DATA and never create official unanswered groups for live denials. The manager panel groups sanitized metadata in its own namespace. Private audit/feedback retention is a fixed 90-day operation under a constrained role; attempts expire after one day. Deployment scheduling and real-account acceptance require separate approval. Existing operational/document table policies and grants remain unchanged.

All production work remains unapplied. Current production acceptance is LMS-0722 / 0.1.544; this addendum does not declare LMS-0723 production accepted.


## Approved subject-resolution correction — 2026-09-07

The owner approved correcting both the recipient-pronoun router defect and the protected lookup's named-person team fallback. Subject state is explicit: SELF, EXPLICIT_PERSON, FOLLOWUP_REFERENT, NONE or AMBIGUOUS. The requested subject is established before choosing self versus cross-person policy; conversational `me` is not ownership. Competing subjects are unsupported.

The existing lookup operation resolves raw names only in its authorized population, uses that resolved identity for team filtering and final relationship checks, and rejects absent/invalid required person references rather than defaulting to requester. The public wrapper, table/column definitions, RLS, grants, roles and capability populations are unchanged. Protected referents are encrypted and user/session-bound; new self/explicit questions cannot inherit stale subject context. No separate rating operation is used as a person-resolution shortcut.

[Exact implementation, migration diff, synthetic matrix and validation](lms-0723-subject-resolution-report.md). This is still LMS-0723 / 0.1.545 and is local only; production migration/deployment awaits owner review.
