# LWRPC League Management System Roadmap

Last updated: 2026-06-05

## Purpose

This file is the durable project memory for the LWRPC League Management System. Future development should treat this as the first place to understand what exists, what still needs work, and what decisions have already been made.

## Workspace Layout

- `C:\lwrpc-league-system` is the overall project workspace and Git repository root.
- `C:\lwrpc-league-system\lwrpc-admin` is the Next.js admin/player/captain web application.
- `C:\lwrpc-league-system\import-members.js` is the original member import script.
- `C:\lwrpc-league-system\members.csv` is a MembershipWorks export used for member import history/testing.
- `C:\lwrpc-league-system\lwrpc-admin\supabase-scoring-schema-updates.sql` contains scoring-related database schema updates.

For future Codex sessions, open `C:\lwrpc-league-system` as the workspace so both the import/history files and the admin app are visible.

## Current Application

The web app is a Next.js app using:

- Next.js `16.2.4`
- React `19.2.4`
- Supabase client `@supabase/supabase-js`
- Resend package installed for email support

The app currently includes pages for:

- Admin dashboard
- Login and password reset
- Members and member detail
- Member CSV import
- Ratings
- Users and role management
- Leagues
- Divisions and division line configuration
- Locations
- Teams and team detail
- Scheduling setup
- Schedule editor
- Matches and match detail
- Score entry
- Live match view
- Standings
- Captain dashboard
- Player dashboard
- Scoring operations for league managers to review due matches, filter unverified scores, edit reminder email copy, and send score-entry reminders to captains
- Club Setup for deployment-level club branding and contact defaults, intended to make separate club deployments easier to configure
- Tournament public display rotation across court detail, court-only, and current standings views, with tournament team check-in/edit workflows and regular-season standing tie-break support
- A standalone Round Robin module lives under `/round-robin` with a default `/round-robin/rpro` group. It uses separate `round_robin_*` Supabase tables, a code-gated manager API, saved player/court lists with Edit/Delete actions and manager-side search filters, a paged searchable LMS member picker with manual player entry fallback, reusable invited-player groups with current-player popups and Edit/Delete actions, session planning/opening/editing through Add/Edit Session modals with a right-side searchable upcoming/past session panel, per-session Players popups grouped by Joined/Declined/Waitlist/Invited status with manager Join/Decline controls and a saved-player selector to manually add a Joined player, safe session delete/cancel actions, start-session court confirmation that generates the first game, per-session court names seeded from court defaults, host/co-host fields with phone-verified host controls, waitlist-aware player confirmation, phone-based player response links at `/round-robin/[group]/player` with saved-device sign-in, automatic phone formatting, Club Setup branding, player record/history cards with past session results, a minimal host/live-session screen with Exit back to the session list or player page, one-game-at-a-time generation, score entry, player swap/shuffle controls, result summaries, and SMS broadcasts with a persistent testing/off switch, editable templates, new-session texts, pending-signup reminders, and current-player update texts. The public, player, and manager views use a more dimensional court presentation with clearer contrast, richer session cards, larger date/time cues, strongly defined top buttons/tabs, and a cleaner operational color system. It is intentionally isolated from league match and tournament tables.
- Round Robin host/co-host player cards treat playing sessions as live-only controls: Join/Decline responses are hidden, Resume and Finish are exposed to assigned hosts, Finish confirms before completion, and result SMS uses an editable ranked-results template with joined-count and available-spots placeholders.
- Round Robin manager SMS supports joined, invited-only, session, and all-player recipient scopes plus per-template test sends to a single phone number; Saved Players include a Stats popup with current-session, month, year, and all-time filters.
- Round Robin live play keeps manager-code entry separate from host/co-host resume: the `/player` Manager button clears host shortcuts and asks for the manager code, while Resume Session opens the assigned live session directly. Live court score inputs sit near the center of each side, use editable score boxes plus a Save Score action, and player chips are visually distinct from score entry.
- Round Robin live-session stats re-rank only the players shown in the current game popup, and the manager-code field avoids password-manager injection to prevent extension-caused hydration mismatches.
- Round Robin host/co-host resume uses a live-session verification screen instead of the manager-code form, and Next Game, Finish, and Exit auto-save complete unsaved score entries from the current round before continuing; score-entry keyboard flow moves from the first score box to the second score box without tabbing through player chips.
- Round Robin player record stats use Current Month, Last Month, Current Year, and All filters without average-rank summaries; the manager-code field stays text-based for password-manager stability while visually masking entered characters.
- Round Robin past-session history is limited to players with saved results from that played session. Player and manager session-result popups show only played-player stats plus all saved rounds, courts, teams, scores, and byes; manager Past Sessions can duplicate a completed session into a prefilled Add Session modal with the date cleared.
- Round Robin SMS sending uses one template-driven send action: selecting a text type loads that template and drives the send button label, with Pending Reminder automatically targeting invited players who have not joined or declined while other text types use the Recipients selector.
- Round Robin past-session rankings are filtered from the actual saved match lineups, so manager and player history popups only rank players who appeared in that session's games/byes; player Past Sessions are hidden unless that player appeared in those saved lineups.
- Round Robin session setup texting defaults are state-aware: new sessions default to texting invited players when created if SMS is enabled, edited sessions default to no text and can optionally text all joined players when updated, and the checkbox is disabled whenever SMS sending is off.
- Round Robin page shells use the full browser width instead of centered narrow content wrappers, and completed sessions hide the manager-side Players action in favor of results/history actions.
- Round Robin SMS has an explicit Texting Session selector; recipients, placeholders, pending reminders, broadcast texts, and template tests are rendered/sent against the selected session. Round Robin routes opt out of the LMS sidebar padding with `full-screen-main` so they do not reserve empty left space.
- Round Robin session starts are blocked in every manager/host UI path unless at least 4 players are joined, matching the server-side guard. Next-game generation treats previous-round partner pairs as a hard exclusion so the same two players cannot be teammates in back-to-back rounds.
- Round Robin live-session Stats, Next Game, Finish, and Exit actions all auto-save every complete unsaved score pair across all displayed rounds before continuing.
- Round Robin scored rounds are visually marked as complete with an emerald-tinted round panel and a Round Complete badge once every court in that round has saved scores.

Double-elimination tournament standings show generated championship/finals games even while one or both sides are still waiting on bracket advancement. Winners Bracket rounds stay labeled as `Round X`; the generated championship game between the Winners Bracket winner and Elimination Bracket winner is labeled `Finals`, with a reset game labeled `Finals If Necessary`.

Tournament bracket home/away sides are balanced during bracket generation and as teams advance into later games. Championship reset logic uses bracket-loss history instead of assuming the Winners Bracket team is always the home team.

## Multi-Club Deployment Direction

For future clubs, prefer a separate Vercel deployment, Supabase project, and GitHub repo/branch per club instead of putting all clubs in one shared database. This keeps data isolation simple, reduces operational risk, and avoids every query needing club-level tenancy filters. The Club Setup page stores club-specific defaults such as club name, logo URL, website, main league email, support email, league site URL, and timezone. Locations support two member-backed Club Pro assignments; either Club Pro is upgraded to the `club_pro` role and sees teams at that home location in Captain Dashboard.

## Data Source

Supabase is the shared source of truth. The admin app currently reads Supabase values from:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

The parent project has service-role credentials for server-side/import tasks:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Keep service-role credentials out of browser code. Use them only in trusted server scripts or route handlers.

## Roles

The app appears to use role-based navigation and access checks around:

- `player`
- `captain`
- `club_pro`
- `league_manager`
- `commissioner`

Role logic lives in `lwrpc-admin/app/lib/permissions.js` and auth/session logic lives in `lwrpc-admin/app/lib/auth.js`.

Role levels are hierarchical: `player < captain < club_pro < league_manager < commissioner`. Login routing sends players to the Player Dashboard, captains and club pros to the Captain Dashboard, and league managers/commissioners to the Admin Dashboard. Commissioner is the only role allowed to manage user roles, and the app now blocks changing the last remaining Commissioner to another role from both the User Roles page and Member Detail page.

Auth guards should resolve role access through the signed-in user's member email/member id before falling back to `user_roles.user_id`, because some role rows may exist before an auth user is linked. Captain navigation intentionally keeps captains focused on the Captain Dashboard instead of showing the broader sidebar League Operations groups.

Captain Dashboard operations use clickable status blocks for Pending Score Verification, Upcoming Matches, and Completed Matches. These blocks sit under My Teams, scope counts/results to the selected captain team, and the selected team card is highlighted. League Documents on captain team cards are collapsed by default. Password reset/account setup requests log whether Supabase accepted the `recovery` or `invite` email path so delivery issues can be diagnosed from server logs; Supabase Auth rate-limit errors are shown as a friendly "wait a minute" message.

Member Administration now uses the same password-reset/account-setup route as the login screen. If a member has no Supabase Auth user yet, the action sends a Supabase invite/setup email; if the auth user exists, it sends a recovery/reset email. Role capability help is shared in `app/components/RoleCapabilityModal.js` and used from Users, Members, and Member Detail.

Display dates/times should use `app/lib/dateTime.js` helpers so dates render as `mm/dd/yyyy` and stored SQL times such as `12:00:00` render as `12:00 PM`. Captain access to Team Roster Management should return captains to the Captain Dashboard, hide Season Ratings, and block locked-roster additions when the selected player is outside range or missing the required season rating.

League setup now supports a `leagues.rosters_locked` flag. When enabled, captains can view rosters but only `league_manager` and `commissioner` roles can add or remove roster players.

Scoring reminders use the existing notification route and SendGrid/Twilio helper stack. The scoring reminder email template can be stored in `notification_templates` when the schema update has been applied, with browser local storage as a fallback.

Notifications use server-only environment variables for Twilio Programmable Messaging and Twilio SendGrid. Required SMS vars are `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and either `TWILIO_FROM_PHONE_NUMBER` or `TWILIO_MESSAGING_SERVICE_SID`. Required email vars are `SENDGRID_API_KEY` and `SENDGRID_FROM_EMAIL`; `SENDGRID_FROM_NAME` defaults to Lakewood Ranch Pickleball Club. Keep actual secret values in Vercel/server environment settings, not committed files.

The Admin Dashboard includes a Notification Test panel that sends test email and/or SMS messages through `/api/notifications`, using the same SendGrid and Twilio environment variables as live score reminder workflows.

Print workflows should use the generic `/print` page so print previews open on an app URL and include the LWRPC copyright/page footer inside the document. Browser print dialogs may still show their own headers/footers unless disabled by the user.

Captain Dashboard's generated match score sheet lives in `lwrpc-admin/app/captain-dashboard/page.js` as printable HTML. Score sheet formats are managed from `/score-sheets` and stored in `score_sheet_templates`; Divisions can select a saved format through `divisions.score_sheet_template_id`. The default/fallback format matches the original Weekday DUPR League Score Sheet styling and uses placeholders such as `{{match_date}}`, `{{home_team}}`, `{{lineup_rows}}`, and `{{score_entry_table}}`. Score entry rows are generated from each Division's configured game lines and their `games_per_line` values; the score detail table intentionally uses a compact `Game N: Line Name` first column plus Line Type, Game Format, `Away Score:`, and `Home Score:` columns. The copyright/version/page footer is handled by the shared print page, outside the editable template body. The Supabase update is in `lwrpc-admin/supabase-score-sheet-templates.sql`.

Divisions now support `team_dupr_max`, a combined doubles-team rating cap based on the division rating type. This is not a full roster cap; captains are blocked from saving match setup lineups over the cap, duplicate players are blocked within a match setup, and saved lineups are checked when used in score entry.

Scoring operations can export verified scores for DUPR using the club DUPR CSV format. Verified, not-yet-exported matches are selected by default; already exported verified matches can be manually reselected for override re-export. The match list is sorted by scheduled date with the most current date first. The DUPR Export action includes only match lines marked to Post to DUPR, skips lines marked Not Posted to DUPR, and export tracking uses `matches.score_exported_at`. When League Managers or Commissioners open a match from Scoring Operations, the match detail route receives `?from=scoring`; only that scoped path unlocks editing verified scores and uses Submit/Verify Scores to save, auto-verify, rebuild standings, and notify all match captains that scores changed. Captain Dashboard score-entry behavior remains separate.

Captain Dashboard has a match setup workflow for upcoming matches. Captains can save doubles pairings per match line in `match_lineups`; completed setups show a status badge on match cards, opposing captains receive an email with the submitted lineup, and the match score-entry screen can then populate game players from those saved lineups.

Score entry is restricted to captains assigned to the match. Match score rows use Team 1/Team 2 style labels for line slots, and saved match setup choices are scoped to the matching team slot.

Teams & Rosters supports assigning captains/co-captains from outside the team's home community through an explicit all-communities toggle. Team lists are grouped by league/division and start collapsed as accordions.
Season rollover tools include copying a league's divisions into a target league, copying all teams from one division into another division with optional roster copy, and a Commissioner-only Season Reset on the Admin Dashboard. Season Reset marks the selected season's leagues/divisions/teams inactive, zeroes affected standings rows, and clears that season's member ratings while preserving matches, scores, schedules, byes, rosters, player history, members, users, locations, templates, notifications, and system settings.

Standings points are calculated from configured game-line scoring rules rather than only from match-level win/loss/tie points. Each division line defaults to `standings_points_mode = 'line_result'`, where the line winner receives configured `team_win_points`; `standings_points_mode = 'per_game'` awards configured `team_win_points` for each completed score-row win. Standings displays sort teams by the division's configured Standings Tiebreak Order. Divisions can set `playoff_team_count` to highlight the top ranked teams as Playoffs/Championship Day teams in standings displays. The visible app version is centralized in `lwrpc-admin/app/lib/version.js`, displayed near the copyright footer, and now uses the non-date `LMS-####` build counter format. Increment the build counter with each update.

Player Dashboard uses inline panels for play history, division standings, and upcoming matches. Team summaries appear above the dashboard action buttons and include captain/co-captain contact details. Play history includes top-level games/wins/losses totals plus individual game scores when entered.
Player Dashboard and Captain Dashboard My Teams show browser-style team tabs when more than one team is visible, with only one full team card expanded at a time. Player Dashboard My Teams cards mirror the Captain Dashboard team card rank/stat treatment: Rank is a raised blue action that opens League Standings for the team's league/division, and the header shows Players, Season Points, and W-L-T summary stats.
Player Dashboard Team Matches mirrors the Captain Dashboard completed-match card format, including green/red headers for selected-team wins/losses and the `Match Score Details` button. Completed match score-detail popups outline the winning home/away player card with a bold border.
The Player and Captain My Teams browser-style tabs use a small hover lift and shadow so tabs feel clickable without changing selection until clicked.
LoadingScreen renders default system settings for its initial server/client pass and then refreshes cached branding after mount, preventing hydration mismatches while preserving the fast cached-branding behavior.
Player Dashboard Play History Scope team filters must pass the logged-in member id into `filterHistoryRows()` so each match line resolves the player's actual home/away team before applying a `team:<id>` filter. Team filters match the resolved player-side team id first, then fall back to same-name team identity when roster/current team ids differ from historical match team ids.
Schedule Editor's Swap action uses an in-app confirmation modal instead of a browser prompt, showing the proposed new home team, a full-width red/green court availability banner, separate lines for Courts available, Current Courts Used, either Courts Used After Swap or Overbooked Courts by depending on availability, and current vs after-swap Home/Away counts for both teams. Schedule Editor match rows label the match-opening action as `Open Scores`, open that route with scoring override plus a Schedule Editor return target so Submit/Verify Scores rebuilds standings and returns correctly, and use a compact layout with date over time, location over status, a standalone Published/Not Published pill, and a two-row action grid.
Player Dashboard and Captain Dashboard member lookups should tolerate duplicate member rows for the signed-in email by choosing the first active member record, then the oldest record. Do not use exact-one Supabase calls for these email lookups, because users without a current roster/captain assignment should see the existing empty-state message instead of a "JSON object requested, multiple (or no) rows returned" error.

League Standings team names open the shared Division Team Schedules/Standings modal used by captain workflows, showing all teams in the selected division, division schedule/byes, standings summaries, and verified match details.
League Standings includes a prominent role-aware Back to Dashboard action above the standings filters, returning players to Player Dashboard, captains/club pros to Captain Dashboard, and league managers/commissioners to Admin Dashboard.

Phone numbers entered or imported through member workflows are normalized to `(999) 999-9999` formatting when enough digits are present, with extensions preserved as `x123`.

Member email addresses are normalized to lowercase and validated for basic email shape before manual save or import.

Password onboarding uses Supabase reset-password emails. The login page tells first-time users to use Forgot Password, Member Administration can send a reset/set-password email for a member, and Player Dashboard has a Change Password header action that opens the reset password screen directly for the logged-in player.

Member Administration loads each member's current team memberships for a Teams count button. Clicking it opens a modal with the member's active team list and league/division context.
Member Administration also has a Current Rosters Only filter. Team membership data is loaded in paged reads from `team_members` to avoid oversized Supabase `.in(...)` requests that can fail in the browser. The Deactivate placeholder action lives on the member edit screen and is visible only to `league_manager` / `commissioner` users until the members table has an active/status field.

The captain Division Team Schedules modal displays each division team's season match record from `team_standings` beside team names. The shared Division Team Schedules/Standings popup keeps captain/co-captain names in the selected-team header's top-right area as a truncated line to preserve screen space.

Season setup now lives on its own `/seasons` page under the League Setup sidebar. Teams also lives under League Setup with Seasons, Leagues, and Divisions. Locations, Email Options, Score Sheets, and Club Setup live under the System Setup sidebar. `/leagues` is focused on league information, roster lock status, and league document mappings, with create/edit on the left and the current league list on the right.

League setup supports five league-specific PDF document mappings stored on `leagues`: Code of Conduct, Captains Guide, League Rules, Score Sheet, and League Waiver. The app expects the columns from `lwrpc-admin/supabase-league-documents.sql`, uses `NEXT_PUBLIC_SUPABASE_LEAGUE_DOCUMENTS_BUCKET` or `league-documents` as the default bucket, and uses `NEXT_PUBLIC_SUPABASE_LEAGUE_DOCUMENTS_PREFIX` or `private` as the default Storage folder prefix for listing PDFs. Captain Dashboard team cards show configured league document buttons and open PDFs in an embedded viewer with download and print/open controls.
Player Dashboard team cards show player-facing league document buttons for Code of Conduct, League Rules, and League Waiver using the same embedded PDF viewer. Captains still see all configured league documents, including Captains Guide and Score Sheet.

Teams & Rosters displays roster counts on each team's Roster button.
Season Ratings has Current Rosters Only and Missing Doubles Rating filters, highlights players missing a doubles rating, and omits member email addresses from the ratings table.

## Verified Status

As of 2026-05-21:

- `npm run build` succeeds in `lwrpc-admin`.
- `npm run lint` succeeds with no warnings.

## Known Issues And Cleanup

1. Reconcile notification documentation and implementation.
   The README mentions Twilio and SendGrid, while the app dependency list includes `resend` and `.env.local` uses `RESEND_API_KEY`. Confirm the intended provider stack and update code/docs accordingly.

2. Replace default Next.js README content.
   `lwrpc-admin/README.md` still contains mostly default create-next-app text. It should become project-specific setup and operations documentation.

3. Document Supabase schema.
   The code references many tables, but there is no single schema map. Add table descriptions, important relationships, and RLS assumptions.

4. Add tests or scripted smoke checks.
   High-risk areas include standings calculation, score verification, schedule generation, member import, and role-based access.

5. Review secret handling.
   Keep `.env` and `.env.local` local-only. Never commit live service-role keys or email/SMS provider keys.

## Roadmap

### Phase 1: Project Memory And Developer Setup

- Add root-level project documentation.
- Replace the default admin README with real setup steps.
- Document required environment variables.
- Document how to run, build, lint, and deploy.
- Document Supabase tables and major workflows.

### Phase 2: Reliability Pass

- Keep lint at zero warnings as new pages are added.
- Confirm notification provider implementation.
- Add smoke tests for critical pages or workflows.
- Add unit-level coverage for scoring and standings helpers where possible.
- Check all role-gated pages for consistent unauthorized handling.

### Phase 3: League Operations Polish

- Verify season, league, division, team, and roster workflows end to end.
- Validate schedule generation against real club rules.
- Confirm court availability and blackout behavior.
- Improve error messaging for failed Supabase operations.
- Add loading and empty states consistently where missing.

### Phase 4: Scoring And Standings Hardening

- Validate match score entry for all configured line formats.
- Confirm picklebreaker scoring behavior.
- Confirm captain score verification/dispute flow.
- Confirm standings recalculation behavior after edits.
- Add audit trail or history for score changes if not already present.

### Phase 5: Member And Rating Operations

- Validate MembershipWorks CSV import against current exports.
- Confirm inactive/missing member handling.
- Confirm DUPR, Primetime, and self-rating import/update flows.
- Add import result logging that can be reviewed later.

### Phase 6: Deployment And Admin Operations

- Document Vercel deployment setup.
- Document Supabase production configuration.
- Document admin account bootstrap process.
- Document backup/export strategy.
- Add a release checklist for league season launch.

## Suggested Next Tasks

1. Rewrite `C:\lwrpc-league-system\lwrpc-admin\README.md`.
2. Create `C:\lwrpc-league-system\docs\supabase-schema.md`.
3. Fix lint warnings in small batches.
4. Confirm the intended email/SMS notification provider.
5. Add a release checklist for league season launch.

## Development Notes For Codex

- Before editing Next.js code, read the relevant local docs under `lwrpc-admin/node_modules/next/dist/docs/`.
- Prefer opening the parent workspace `C:\lwrpc-league-system`.
- Use existing app patterns before introducing new abstractions.
- Avoid service-role credentials in client components.
- Keep changes scoped and document system-level decisions here.
- User-facing delete actions now use the shared `app/lib/confirmDelete.js` helper, which requires typing `DELETE` and explains the affected records or risks before destructive actions proceed.
- Members now have a `notification_preference` (`email` or `text`) used by captain match setup notices, score-entry notifications, and scoring reminders. Schedule settings also support `actual_schedule_weeks`, and Schedule Editor highlights court overbooking / blackout issues in red with a home-away counts popup.
- Footer copyright rendering uses the centralized `COPYRIGHT_YEAR` from `app/lib/version.js` so client-rendered pages do not call `new Date().getFullYear()` during hydration.
- Schedule Editor supports team-name and exact-date filters. Swap court warning text reports proposed swapped-location usage instead of the original match location.
- Captain Dashboard and Player Dashboard only load `matches.is_published = true` for upcoming/visible match lists; draft schedules remain reviewable in Schedule Editor.
- Captain Dashboard bye weeks are only shown when a published match exists for the same division/week/date, so byes do not appear automatically from an unpublished draft schedule.
- Teams & Rosters has a team schedule popup with match status, match scores, configured game lines, and game scores. Captain Dashboard has a Division Team Schedules popup next to Manage Roster that lists every team in the division and shows published schedules/results.
- Captain Dashboard's Division Team Schedules popup uses compact schedule cards that hide configured game-line details and show only date/time, teams, week/location, status, and total score.
- Compact team schedule scores now label Home and Away separately and highlight the winner. Pending Score Verification cards now open the normal score review screen without Match Setup controls, and pending-verification score entry is read-only while Validate Scores and Dispute Scores remain available to captains.
- Division Team Schedules keeps compact score boxes pinned to the right on wider layouts. Schedule Editor now shows a visible problem-match count for court/blackout issues and groups Scheduled Matches into collapsible sections based on the selected sort option.
- Schedule Editor Scheduled Matches accordions now start closed. Player Dashboard play history shows the actual team matchup on the first line without the line-score suffix, and each game score chip includes the player names from that game line.
- Player Dashboard play history metadata now stops after season, league, and division. Game score chips include both the player's team/player names and the opponent team/player names.
- Schedule Editor has an administrative Reset Match action that clears match setup, score-entry players, game scores, winners, verification/dispute/export state, and rebuilds division standings while preserving schedule details. Captain Dashboard and Player Dashboard top sections were restyled with more mobile-friendly team cards, colored summary/action blocks, and larger touch targets.
- Admin Dashboard was redesigned into a cleaner operations hub with a dark command-center header, colored quick-status blocks, grouped tool sections for league setup, people/teams, and match operations, and mobile-friendly action cards.
- Member Administration now supports manually adding members from an Add Member modal with core profile fields, notification preference, DUPR ID, renewal date, optional home-community suggestions, email validation, phone formatting, and optional initial app role assignment.
- Admin Dashboard quick-status blocks now show live Supabase counts for member records, total matches, pending score verifications, and assigned user roles instead of placeholder labels.
- Admin Dashboard quick-status blocks now show member records, players on teams, total teams, and scheduled matches for the current Sunday-through-Saturday week.
- Admin Dashboard command-center header no longer includes the duplicate Open Schedule Editor button because Schedule Editor remains available in the Match Operations tool cards.
- Admin Dashboard now places League Structure below Match Operations and replaces the bottom build-status placeholders with live operational counts for assigned app users, saved communication templates, and verified matches waiting for DUPR export.
- Admin Dashboard System Snapshot now uses assigned app users, pending score verifications, and verified matches waiting for DUPR export; live signed-in user presence is not currently tracked by the app.
- Admin Dashboard active-season metrics now scope players-on-teams, teams, this-week matches, pending verifications, average roster count, and average team DUPR rating to leagues whose season start/end dates include the current date.
- Admin Dashboard now includes an Active Season / Not Active (Current Entries) scope toggle so preseason teams and rosters can be counted before the season date window opens.
- Members use `members.is_active_member` for active/inactive status. Member Administration hides inactive members by default with an Include Inactive toggle, member edit supports deactivate/reactivate for League Manager and Commissioner roles, MembershipWorks import reactivates imported members, and ratings/team selection workflows exclude inactive members.
- Member Administration now shows active/inactive status in the listing, includes a Data Tools action to mark all members inactive before a fresh MembershipWorks import, and the MembershipWorks import protects existing member fields by only overwriting email, phone, renewal date, active flag, and membership status while filling blank identifiers/profile fields.
- Season Ratings hides the Ratings Import panel behind a Data Tools toggle by default. Player Dashboard and Captain Dashboard division schedule modals received a visual cleanup with stronger colored headers, status blocks, and more polished match/result cards.
- Player Dashboard upcoming matches now use a purple visual treatment, player/captain team cards use stronger blue information panels, Captain Dashboard pending verification is red, and Season Ratings truncates entered DUPR doubles ratings to one decimal place before saving.
- Manual member creation now satisfies the non-null MembershipWorks account constraint with a generated `manual:` account id. Future MembershipWorks CSV imports can match those members by email and replace the placeholder with the real MembershipWorks account id. Captain Dashboard upcoming match cards were restyled with Week headers, and Player Dashboard upcoming matches now separate Current Scores from a Match Details popup with team records/ranks and a map link.
- Forgot Password and member-admin login email actions use a server route with `SUPABASE_SERVICE_ROLE_KEY` (or compatible service key env names) to verify active member records, find existing Supabase Auth users, send recovery emails, invite missing auth users, and link blank `user_roles.user_id` values. The route returns a setup/configuration error if the service key is missing so anonymous RLS cannot produce false member-not-found results.
- Login and password onboarding load member email matches as lists instead of singleton rows. Historical/imported member data can contain duplicate email rows, so these flows prefer active member records and use the highest role found across active duplicate rows.
- Login now highlights "League Management System" in the title. Member Administration uses fixed table columns and non-wrapping phone/action cells for consistent row heights. Scheduling pages format displayed dates through the shared date helper, Saved Schedule Settings are client-sorted by setting name with a generated/not-generated badge, and Schedule Editor date sorting breaks ties by home team.
- Root layout uses React hydration warning suppression for browser-extension injected attributes on form controls; avoid inline layout scripts because Next.js 16 dev mode reports them as client-rendered script tags.
- Captain Dashboard match setup now marks pending setup buttons red, blocks saving until every doubles team has two players and no lineup warnings, and reports whether the opponent captain notification actually sent. The Division Team Schedules modal sorts teams by current standings, shows record plus standings points in each team block, and lets captains expand match cards to view entered line players, ratings, and game scores.
- League setup includes `leagues.match_setup_reminder_days_before`; `/api/match-setup-reminders` is a server route intended for daily scheduler/Vercel Cron use and sends email/SMS reminders to captains whose published upcoming matches still have incomplete Match Setup teams. Season Ratings has NR filters for doubles and age-based ratings plus a Copy Name action. Score entry now enforces completed-game players/scores, points-to-win rules, and DUPR max blocks, while allowing forfeit/retired exceptions and captain edits until validation. Schedule Editor Reset Scores preserves saved Match Setup teams.
- Player Dashboard play history labels forfeited/retired game details, counts those rows under Other, shows player ratings in the team header and after play-history player names, and Team Roster Management shows each roster player's games played and record beside the player details.
- Teams & Rosters Schedule now opens the same division-wide compact schedule format as captain Division Team Schedules, scoped to the selected team's division and expandable to line/player/rating/score/result details. Game-line configuration blocks duplicate Game Numbers per division and the Divisions list shows configured line counts. Admin Dashboard can maintain player/captain login popup messages with per-user dismissal, dashboards include Contact League mail links, and Schedule Editor filter width/date accordion/swap court-unavailability messaging were tightened.
- Seasons and Teams use active/inactive flags instead of deleting historical records. Inactivating a season is a double-confirmed archive action that marks all teams in that season inactive and resets their standings rows to zero while preserving leagues, divisions, teams, rosters, matches, scores, and player history for reporting.
- Teams & Rosters can copy an existing team to another active-season league/division, optionally copying roster rows. Current roster/team selection displays now filter inactive teams out of member administration, member detail, ratings current-roster filters, match scheduling selectors, schedule-generation team lists, standings, and active dashboard counts.
- Player Dashboard and Captain Dashboard now show active teams by default with a Previous Seasons Teams toggle. Player Dashboard uses the selected My Teams team for both Division Standings and Team Matches; selected team cards are highlighted by card color instead of a separate selected-label button.
- Admin Dashboard login popup message saves go through `/api/notification-templates` with server-side Supabase access to avoid `notification_templates` RLS insert failures. Season Ratings includes a Copy Ratings data tool for copying member season ratings from one season to another, and CSV imports skip matched rows without numeric ratings instead of clearing values to NR. Division game lines support `uses_saved_match_lineups` so score entry can show saved Match Setup team dropdowns only on configured lines.
- Leagues and divisions now have active/inactive flags. Current setup dropdowns for seasons, leagues, and divisions should use active records, while administration lists keep inactive records visible for reactivation. Scheduling shows League Blackout Date weekdays and schedule generation advances through blackout weeks without counting them against Actual Weeks.
- User-facing timestamp displays should format stored Supabase UTC timestamps through the shared `formatDisplayTimestamp` helper, which renders them in `America/New_York`; date-only schedule fields continue to use the date-only display helpers.
- Team schedule popups and player/captain schedule views include `team_byes` alongside published matches, filtered to published division schedule weeks so draft byes stay hidden with draft matches.
- Season Ratings now separates raw `DUPR Doubles Rating` from cleaned numeric `Season DUPR Rating`. CSV imports write the raw doubles value, and Data Tools can clean selected-season ratings by truncating numeric raw DUPR to tenths or using the player's highest selected-season division max minus 0.5 for NR values.
- Team Roster Management now hard-blocks adding players whose current rating is outside the team's rating range. If a roster add succeeds for a player missing the required rating or carrying an `NR` DUPR Doubles value, the app emails `info@lwrpickleballclub.com` with the player, team, captain names, and captain emails for league follow-up.
- Team Roster Management shows roster-add player eligibility in the Available Players dropdown, includes the rating season in the compressed team summary block, and keeps DUPR IDs out of that dropdown. Login popup reads now go through the server notification-template route so captain/player messages are not blocked by template-table RLS.
- Score workflows track `matches.score_entered_by_member_id` along with existing entered/verified timestamps. Team schedule popups show non-empty score status with the relevant timestamp, while Schedule Editor and Scoring Operations show entered/verified timestamp plus member name for completed matches. Apply `lwrpc-admin/supabase-score-audit-updates.sql` before relying on entered-by tracking in production.
- Member Administration team popups show whether the member is a Player, Captain, or Co-Captain. Season Ratings has a Missing / Invalid DUPR ID filter for blank IDs or IDs not exactly 6 characters. Season inactivation now requires typing uppercase `INACTIVATE`.
- Admin Dashboard includes a Commissioner-only server-backed Master Reset All action with three confirmations. It deletes generated match/schedule/score/standing/roster data, clears team captain fields, marks teams inactive, and resets `captain` user roles to `player` while preserving saved schedule settings and higher administrative roles.
- User Roles & Permissions shows Supabase Auth last-login timestamps through `/api/user-last-logins` using server-side service-role access. League roster-lock helper text clarifies captains cannot add/remove ineligible rated players while locked. Player and Captain dashboard section-button panels received stronger raised styling, Captain Dashboard completed match score status includes status timestamps, Season Ratings has an Edit Member shortcut beside Copy Name, and the visible app version was bumped to `2026.05.25.1200`.
- Sidebar navigation now groups Matches under Scheduling. Player Dashboard captain/co-captain contact blocks are mail links with tooltips, and Membership Info has a tooltip for the Manage Membership website. Captain Dashboard now labels standings points as Season Points, renames Division Schedules to Schedules/Standings, and the division schedule modal labels ranked teams as Teams sorted by Rank. The visible app version was bumped to `2026.05.25.1230`.
- Captain Dashboard defaults to Upcoming Matches unless any captain match is pending score verification, in which case it opens Pending Score Verification. Match Scheduler Scheduled Matches now has a search/filter box and compact match rows. The visible app version was bumped to `2026.05.25.1300`.
- Player, Captain, and Admin dashboards now include Players Guide, Captains Guide, and Admin Guide buttons. Admin Dashboard has a Dashboard Guides PDF selector using the same Supabase Storage bucket/folder/load-PDF flow as League Administration, storing guide selections in `notification_templates` as JSON guide config. The visible app version was bumped to `2026.05.25.1330`.
- Player and Captain guide buttons now render inside the header Welcome card below the signed-in user/role, and guide buttons use the same green styling as Contact League. Admin Guide uses the same green guide styling. The visible app version was bumped to `2026.05.25.1345`.
- Match score submission no longer rebuilds standings or Season Points; standings update only when scores are validated. Standings rebuilds now count only completed matches with `score_status = verified`, so Schedule Editor Reset Scores removes the reset match from standings. Resubmitting or disputing scores clears stale verification audit fields, Scoring Operations hides verified audit details unless the match is actually verified, and Filter Not Verified selects the visible not-verified matches. The visible app version was bumped to `2026.05.25.1400`.
- Player and Captain guide buttons now open guides in the embedded PDF preview modal with Download and Print controls, matching league document behavior. Team Roster Management now keeps All Locations selected after the user chooses it by separating uninitialized location state from the blank all-location filter. The visible app version was bumped to `2026.05.25.1415`.
- Admin Dashboard command-center metrics now include a Dashboard Scope selector for the default active/current scope, all seasons, a selected season, league, or division. Players On Teams, Teams, This Week, and the related operational snapshot counts recalculate from that selected scope. The visible app version was bumped to `2026.05.25.1430`.
- Admin Dashboard Players On Teams now has an All Players / Unique toggle so the card can count every roster assignment, including duplicate players across teams, or count each player only once within the selected dashboard scope. The visible app version was bumped to `2026.05.25.1445`.
- Teams now support a team-level Club Pro assignment via `teams.club_pro_member_id`. Assigned Club Pros are upgraded to the `club_pro` app role when needed, use the Captain Dashboard as their home dashboard, see assigned teams in Captain Dashboard My Teams, and are included in captain-style match setup, score notifications, reminders, team/member role displays, and contact lists. Apply `lwrpc-admin/supabase-team-club-pro-updates.sql` before deploying this change. The visible app version was bumped to `2026.05.25.1500`.
- Player Dashboard team cards now hide unassigned Captain, Co-Captain, and Club Pro contact blocks, and omit the whole contact row when a team has no assigned contacts. The visible app version was bumped to `2026.05.25.1515`.
- Captain Dashboard upcoming matches now include a Match Details popup aligned with the Player Dashboard view. Player and Captain match details include roster buttons for both teams, roster popups show each player with the correct season/age-based/self rating plus their verified season line record, and completed score details show player ratings plus line team ratings. The visible app version was bumped to `2026.05.25.1530`.
- Captain Dashboard League Documents blocks now use a stronger blue/cyan background treatment, doubles Team Rating displays now sum the two listed player ratings in Player and Captain match result views, and the sidebar club copyright line no longer adds a period after the club name. The visible app version was bumped to `2026.05.25.1545`.
- Login password-reset/setup success messages now use a centered popup instead of inline status text. Captain Dashboard action buttons are ordered Upcoming/Unverified, Completed, then Pending Score Verification, with the team Rank button styled as a raised button. User Roles & Permissions table headings sort the visible rows.
- Team Roster Management displays member membership status and renewal date in roster rows, below the season rating. Renewal dates due within 30 days or past due are highlighted in bold red. The shared loading screen uses the same full-screen centering treatment as login so it is not offset by sidebar layout assumptions while full-page loads are in progress.
- Captain Dashboard upcoming match cards include a compact Match Setup status/action area and put Match Details, Match Score Sheet, and score-entry actions below the match date/location/status details. Match Score Sheet generates a printable preview from saved home/away match setup lineups, player season ratings, match date, teams, and division. The visible app version was bumped to `2026.05.28.1731`.
- Team Roster Management, League Standings, and Division Team Schedules/Standings received mobile layout cleanup. Captain Dashboard Match Setup buttons now turn red while setup is pending and return to blue when complete.
- Round Robin live/session scheduling now uses a complete 8-player, 7-round partner rotation so every player partners with each other player exactly once before any repeats are allowed. The one-round-at-a-time generator shares this rule and falls back to strict no-repeat matching if manually edited prior rounds conflict with the fixed rotation.
- Round Robin Settings includes a typed-confirmation Master Reset that deletes all sessions, session players, generated games, scores, player-session result history, and session-linked logs for the selected Round Robin group while preserving Saved Players, Groups, and player group memberships.
- Player and Captain Dashboard Recent Results keep score blocks in the same home/away sequence as the displayed matchup, label the selected team's block Your Team and the other block Opponent, and retain Home/Away match context. Team names are not repeated inside score blocks; the selected-team block remains visually emphasized and the score uses a dedicated full-width row on mobile.
- Player and Captain mobile dashboard headers now include a hamburger menu that opens the complete dashboard navigation, restoring direct access to League Documents and My Play History. The bottom My Team/Team shortcut is now Play History on both dashboards; Captain links reuse the Player Dashboard's existing history view. The visible app version was bumped to `LMS-0530`.
- Captain Dashboard's prominent next-match Match Setup panel now looks up completion with the full match-and-team key, so saved complete lineups display Setup Complete instead of falsely remaining pending. Dashboard appearance preferences now resynchronize from browser storage on focus, page restore, cross-tab storage changes, and same-page dashboard changes so the Admin mobile drawer honors the saved light theme after resumed/mobile navigation. The visible app version was bumped to `LMS-0531`.
- Captain Dashboard no longer lists My Play History in its desktop or hamburger sidebars while retaining the requested mobile bottom Play History shortcut, and its Upcoming Match popup labels the email action Email Opposing Captains. Shared administration pages now apply the saved dashboard sidebar appearance to their desktop sidebar and mobile drawer. Player Match Lineup cards use stronger green/blue Team headers, and mobile profile footers across Player, Captain, Admin, and shared administration screens include a compact LWR PB Club System install/instructions control. The visible app version was bumped to `LMS-0532`.
- Captain Dashboard mobile bottom navigation now uses a Standings shortcut instead of Play History; tapping it opens the existing division standings popup. The visible app version was bumped to `LMS-0533`.
- Dashboard Appearance now offers a browser-saved collapsed desktop sidebar that expands on hover or keyboard focus without affecting mobile layout. Captain Match Setup shows individual rating range alongside the doubles-team maximum, uses one row for the two team-status pills with a full-width setup action, and Captain match-result audit details now appear as full-width Entered / Verified status lines that share a row when space allows. Captain standings summaries show the top six teams, and its Full View header displays the division's configured tiebreak sequence in place of the former Standings Points label. Captain team-roster dialogs now layer above both match-detail and match-results dialogs, and mobile dashboard navigation honors the sticky-header offset when scrolling to a section. The visible app version was bumped to `LMS-0538`.
- Collapsed desktop sidebars now close any expanded navigation group when the pointer leaves, preventing a retained submenu from creating blank space; submenu contents are hidden immediately while collapsed. The Player Division Standings dialog now matches Captain's header treatment by displaying the configured tiebreak sequence in the header and removing the redundant detail block. On touch devices in landscape, dashboards now retain the mobile navigation layout instead of rendering the collapsed desktop icon rail. Player Match Results now matches Captain's score audit summary with full-width Entered / Verified date, time, and member details. Player Recent Results now includes a Total Matches count badge, and My Team includes a Players count badge. Mobile Profile omits the desktop-only Collapse Sidebar preference through both responsive rendering and styling, Captain Match Tools now uses a compact two-pill Match Setup layout with a full-width action on small screens, and collapsed desktop sidebars now align the persistent system-footer copyright line to the icon rail. The Admin dashboard User Guide opens in the in-app viewer on desktop and now opens directly in the device's native PDF viewer on mobile, matching League Documents. Profile dialogs no longer include dashboard-switch shortcuts, while the Admin profile now includes the complete saved Dashboard Appearance controls. In Player and Captain Division Team Schedules, expanded match-detail game cards now use a subtle green or red result background matching their win/loss header, the winning team's roster panel now has a clear green outline, and the status chip now reads only Posted to DUPR or Not Posted to DUPR. Collapsed sidebars now remove the hidden submenu-chevron layout space so every navigation icon is centered consistently. The visible app version was bumped to `LMS-0553`.
- Admin Dashboard Club Operational Overview now labels completed match counts as verified matches and provides a three-way Average Team Rating toggle for DUPR Doubles, Season DUPR, and Age-Based team roster averages. The visible app version was bumped to `LMS-0555`.
- Captain Dashboard next-match and upcoming-match actions now read `Match Details` instead of `View Match`. The visible app version was bumped to `LMS-0556`.
- Admin Dashboard League Analytics now charts active teams by their home location instead of scheduled matches by location. The visible app version was bumped to `LMS-0557`.
