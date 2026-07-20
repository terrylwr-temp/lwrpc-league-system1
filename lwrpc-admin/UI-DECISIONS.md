# Design Preview UI Decisions

Keep this file short. Update it whenever a Design Preview choice is approved, rejected, or intentionally deferred.

## Approved baseline

- Colors: deep navy (`#102e64`) and club blue (`#1558d5`) lead navigation and primary actions; white cards sit on a very light blue-gray (`#f7f9fc`); emerald communicates positive status; coral/red is reserved for losses, errors, and logout.
- Spacing: use an 8px rhythm, generally 8/16/24/32px; dashboard cards use 16-24px padding and 14-22px corner radii.
- Typography: sidebar labels use a clean semibold face at a comfortable navigation size; card labels and detail text must remain readable without relying on very small 8-10px type.
- Field layouts: labels stay above controls; related fields may use two columns on desktop and collapse to one column on mobile; primary actions remain easy to reach at the bottom of a form or dialog.
- Desktop: show the full bold club name in the upper-left sidebar. The signed-in identity is a profile button in the upper-right, not a sidebar account block.
- Club identity: the upper-left logo/name links to `https://lwrpickleballclub.com`; the profile image/initials control remains a true circle so uploaded portraits crop consistently.
- Mobile: preserve the compact header and fixed bottom navigation; touch targets should be at least 44px; dense secondary team content may move into dialogs rather than crowd the dashboard.
- Identity: always show the authenticated member name and actual system role. Profile photos are saved in the image-only public avatar bucket with user-scoped upload/delete access; accept JPG, PNG, or WebP up to 2 MB.
- Role navigation: players see only Dashboard, without a redundant Player subtype or switcher. Captain-or-higher users see the active dashboard type and allowed Player/Captain/Admin choices; mobile provides the same conditional dashboard selector.
- Team context: show the active team name and team selector only when a member belongs to multiple teams. Schedule, Standings, Results, roster, rating, and documents all follow that selection.
- Sidebar: League Documents expands near the lower navigation and lists only documents available for the selected team's league; User Guide is available from the header instead.
- Header actions: the question-mark button opens the User Guide; a separate envelope button emails League Management. User Guide is not repeated in the sidebar.
- Sidebar accordion: opening Dashboard modes, team choices, or league documents closes any other expanded sidebar selection. Expandable items show a right-facing chevron that rotates downward while open; non-expandable items do not show it.
- Play history: My Play History appears directly below My Team and opens the existing grouped play-history view with its full scope selector.
- Dashboard interactions: schedule and result rows open existing match details; completed matches include a Match Score Details action; View Team opens the full roster.
- Match context: show Home Match or Away Match in a pill beside Next Match; keep the date/time prominent at 15px desktop and 13px mobile; use the supplied blue-and-silver Website Emblem artwork as the exact Next Match artwork; upcoming schedules include published bye weeks. Recent Results keeps the same home-versus-away sequence for both the displayed team names and score blocks, labels the selected team's side Your Team and the other side Opponent, and keeps Home/Away as secondary match metadata. Team names are not repeated inside the score blocks.
- Sidebar popups: Schedule opens Division Team Schedules; Standings opens the selected division's standings-points bar chart.
- Standings context: show League | Division on one line in the Division Rank card. In the popup, show Season and League above Division with equal visual emphasis. Player and Captain standings summaries and popups highlight the division-configured top playoff/championship teams.
- Team record: show the selected team's win-loss record and total Team Points.
- Roster: The Squad card displays the actual team name prominently above only the captain and co-captains; View Team opens the full roster with leadership first and players alphabetically by last name. A member name with an email address opens a mail message.
- Mobile header: show the club logo at left, the active dashboard name and a clearly readable active team name centered, and compact actions at right. Keep this entire identity/action row sticky at the top while dashboard content scrolls; Dashboard and My Team remain direct bottom-navigation choices.
- Shared presentation: Match Details keeps its existing logic and actions but uses the preview's navy/club-blue shell; loading branding starts with "League Management System" so cached settings do not cause a name flash.
- Copyright: show a readable copyright line at the bottom of the desktop sidebar and above the fixed bottom navigation on mobile; repeat copyright and the application version in the Profile popup footer.
- Help: the question-mark icon opens User Guide; a separate envelope icon starts the existing Contact League email flow.
- Architecture: the approved dashboard designs are the only live dashboard UIs at `/player-dashboard`, `/captain-dashboard`, and `/`. The retired `/design-preview` URLs permanently redirect to those canonical routes while the shared views continue to reuse existing authentication, permissions, queries, selectors, and modals.
- Captain dashboard: `/captain-dashboard` reuses Captain authentication, team context, statistics, schedules, byes, standings, results, league documents, roster data, permissions, and the live Match Setup workflow. Dashboard actions must call existing business logic instead of duplicating it.
- Standings access: Division Rank is an interactive card on Player and Captain dashboards; it and every Standings full-view action open the same division standings popup.
- Captain match actions: the Next Match hero keeps View Match and adds Email Opposing Captains, Match Score Sheet, and Enter Match Scores using the existing Captain rules and red/green status colors; its Match Setup status panel mirrors the current Captain workflow.
- Captain alerts: use the single label "Pending Match Verifications" throughout; when verification is pending, its sidebar item, summary card, and panel header use red alert styling.
- Captain workspace: keep four larger-type, two-column actions ordered View Team, Manage Roster, Division Schedules, and Division Captains; Division Schedules opens the same live Division Team Schedules popup used by the Player Dashboard, and the pending-verification panel receives more desktop width.
- Dashboard button typography: labeled buttons across Player, Captain, and Admin dashboards should generally use at least 14px desktop type, with readable 10-13px mobile navigation labels; compact close, help, profile, and other icon-only controls are exempt.
- Captain match tools: each upcoming match has a Match Tools dialog containing View Match, Email Captains, Match Score Sheet, Enter Match Scores, and the full current Match Setup status/actions. View Match uses the same filled blue treatment as Email Captains, and all four action labels use larger 14px type. The Match Setup button opens the shared live lineup editor in the preview shell.
- Rating eligibility: Match Setup and every score-entry view use the current season rating for the division rating type. Players below the division minimum, above its maximum, or without a valid rating are labeled ineligible; lineup saves and score entry/submission are blocked with exact warnings. Ratings are refreshed immediately before save/submit, and the Match Setup API revalidates them server-side.
- Results: Recent Results starts collapsed with Show More/Show Less, retains Match Score Details per match, shows Total Team Points in the header, and colors the entire row light green for wins or light red for losses while keeping the W/L badge dark and high contrast.
- Schedule summaries: Upcoming Schedule and Captain Upcoming Matches & Byes show the count of upcoming matches in the header; bye rows remain visible but are excluded from that match count.
- Roster email: when contact visibility permits and an email exists, the entire player row/card in View Team is a keyboard-accessible email action, not only the name text.
- Schedule scope: Division Team Schedules labels its division selector "Selected Scope" and separates League and Division with a vertical bar, never a question mark.
- Sidebar context: dashboard type, selected team, and league details use the same bright, bold treatment as the selected-season value; the footer label is "Selected season" and appears only once. Its value always follows the active team's division season.
- Mobile header: the active team name below Player Dashboard or Captain Dashboard uses larger, bold navy type.
- Captain dialogs: Division Captains and View Team open their existing live-data popups directly from Design Preview, using the navy/club-blue preview shell.

- Interaction motion: dashboard buttons, text actions, clickable schedule/result rows, roster email rows, and Captain tools use a subtle 2px hover lift/slide with a soft shadow; honor reduced-motion preferences.
- Player match actions: Next Match uses "Match details" plus a read-only "Match Lineup" popup sourced from saved Match Setup lineups, showing both teams, Team-number assignments, assigned players, current-season ratings, match context, and pending setup states.
- Captain score entry: Enter Match Scores opens the existing live score workflow inside the preview popup shell; successful submission closes the popup and refreshes Captain Dashboard data.
- Match dialogs: Match Details and Match Results share the navy/club-blue gradient header, rounded 24px shell, subdued backdrop blur, and aligned light Close action. Division Schedule aligns Close with the Selected Scope field.

- Player navigation: use the explicit labels "Division Schedule" and "Division Standings" in the Player desktop sidebar so their scope is unambiguous.
- Admin dashboard: `/` reuses the existing Admin Dashboard authorization, selected-scope controls, operational counts, permission-filtered tool definitions, routes, and full League Analytics component. Dashboard Guides, Dashboard Messages, Season Reset, and Master Reset reuse their existing controls inside dashboard dialogs.

- Sidebar selection: Dashboard-view and multi-team submenus indicate the active choice with a thicker light border instead of the words Current or Active.
- Sidebar cleanup: Player desktop omits Results; Captain desktop omits Pending Match Verifications, Matches, and Standings; Captain mobile omits Scores. The underlying panels and workflows remain available from dashboard cards and match tools.
- Mobile selectors: Player and Captain stack Dashboard view above Active team using the same bordered, two-column control styling; Active team appears only for multi-team members, and Dashboard view appears only for roles allowed to switch dashboards.
- Dashboard stat cards: the helper line under Team Record, Division Rank, and the third summary metric uses the same readable type scale as the card label on Player and Captain dashboards.
- Next Match action pairing: on Player and Captain dashboards, the first match-details action uses the same default, hover, and active treatment as the adjacent action button.
- Sidebar secondary labels: dashboard type, active team name, and league name use regular font weight beneath their bold primary navigation labels.
- Admin organization: retain League Analytics, Season Reset, and Master Reset All as Admin Dashboard cards, but omit all three from the sidebar. Dashboard Messages is grouped under People & Teams after Teams & Rosters; Dashboard Guides is grouped under System Setup after Score Sheets; both retain their full management dialogs.
- Admin shell migration: the approved Admin navigation and Welcome/profile row are the shared shell for Members, Ratings, Teams, scheduling, scoring, league structure, system setup, and module screens. Keep the Welcome row vertically compact, aligned near the same top edge as the Admin Dashboard, and retain full-size help/profile controls. Existing page bodies and business logic stay intact; each route uses a consistent navy/blue page-title banner beneath the shared identity row.
- Unified Admin navigation: the Admin Dashboard and every administration route use the same shared menu definitions, ordering, labels, expandable groups, active-row treatment, and Selected Scope footer; route-specific sidebars are rejected.

- Admin typography: metric, status, action, and management blocks use the Captain Workspace scale—17px titles with 14px supporting text on desktop and 15px/13px on mobile.

- Admin profile navigation: Change Password, Player Dashboard, and Captain Dashboard use direct Next.js links; the profile closes before navigation, and password changes return to the Admin preview.

- Consolidated match operations: Scoring Operations is the single match-management destination. New Match, Current/Upcoming views, search, selection, reminders, editing, and protected deletion share one match workspace; completed matches cannot be deleted, their scored team/division structure stays locked during edits, and the former Matches route redirects to Scoring Operations. Match lists sort oldest date first, then league, division, and home team.
- DUPR operations: keep DUPR Options collapsed until requested. Export confirms the completed-game and selected-match counts before downloading and marking matches exported; selected exported matches can be confirmed and marked Not Exported for correction.
- Admin mobile navigation: the Admin Dashboard header includes the same hamburger access as administration routes and opens the complete expandable sidebar navigation in a mobile drawer.
- Mobile administration controls: Member Search keeps the title and count together, uses a consistent two-column action grid with full-size touch targets, and visually separates search inputs from directory actions. Scoring action buttons align with the search field rather than its helper text.

- Admin metric controls: Players on Teams offers All Players (roster assignments) and Unique counts using the current dashboard scope. Season Reset help must layer above the Reset dialog, and logout reassurance text remains readable at 15px.

- League structure administration: Seasons, Leagues, Divisions, and Locations open on searchable record lists. Add and Edit actions use focused modal forms instead of permanently occupying the page.
- Flex scheduling: Flex League is configured per division, not per league. For enabled divisions, only the home captain or co-captain sees an enabled Captain Dashboard control to change an unfinished match date/time within the supported window.
- Location cleanup: Merge Locations is an explicit list action and opens the complete merge workflow in a focused dialog rather than permanently displaying the cleanup form.
- Scheduling administration: saved schedule settings are list-first with search and Add Schedule controls. Adding and editing share one modal form, and the generation-status pill is the single status display on each record.
- Listing counts: administration list headers use one consistent navy count block labeled for the record type and displaying the filtered count as `x of y` against the full loaded set. Do not repeat the same count beneath Current Seasons, Leagues, Divisions, or Locations.
- Scheduling exceptions: Court Availability and League Blackout Dates are list-first, searchable sections. Add and Edit actions share focused modal forms instead of permanently displaying entry forms.
- User Roles directory: use the same 100-member page size and top-and-bottom pagination treatment as Member Administration so the full member directory is not rendered at once.
- Schedule Settings grouping: group saved settings by league behind compact Show/Hide headers that include each league's schedule count; expanded schedule cards do not repeat the league field.
- Dense admin lists: User Roles uses the compact count badge. Desktop Season Ratings contains wide tables within the white card and keeps DUPR Notes narrower; Locations omits empty Court Notes rows, and desktop Member Search has no divider gap beneath its action buttons.
- Compact role count: the User Roles count is an intrinsic-width, single-line navy pill aligned to the end of its search grid column; it must not stretch to fill the grid cell.
- Flex captain scheduling: the live Captain design exposes Modify Match Date/Time for eligible Flex Division matches in both the Next Match action row and each upcoming match's Match Tools dialog. Only home captains/co-captains can open the shared date/time editor; away captains see the disabled control.
- Player season rating: the Player Dashboard rating summary follows the currently selected team, using that team's season and division rating type. Rating queries stay scoped to members in the player's relevant team and match context so Data API row limits cannot omit the selected player's season rating.
- Dashboard card headers: Player and Captain content cards and Admin tool sections use a medium-deep slate/navy header band for clean visual separation. When Captain Pending Match Verifications is greater than zero, its summary tile and detail card use a red alert treatment, with a strong red Action Needed header.
- Dashboard appearance: immediately after Change Picture, the Profile popup shows a collapsed Dashboard Appearance header that expands/collapses on click to reveal independent Sidebar Menu and Card Headers toggles. Each persists in the current browser across Player, Captain, and Admin dashboards and does not override the Captain red pending-verification alert.
- Player season rating display: show the Player Dashboard Season Rating to one decimal place (for example, `4.0`) while preserving two-decimal precision in match-lineup details.
- Captain dashboard list expansion: Upcoming Matches & Byes shows four items initially and exposes Show More / Show Less when additional items exist. Recent Results retains the same control when more than three completed matches exist.

## Rejected ideas

- Hardcoded names, roles, teams, schedules, standings, or results in a live preview.
- A permanent standalone Logout button in the desktop sidebar.
- A notification bell when the intended action is Help / Contact League.
- Duplicate Supabase queries or separate business rules solely for the redesign.
- Changing the production dashboard before the corresponding preview section is approved.
