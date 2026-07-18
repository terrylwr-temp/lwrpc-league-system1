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
- Sidebar accordion: opening Dashboard modes, team choices, or league documents closes any other expanded sidebar selection.
- Play history: My Play History appears directly below My Team and opens the existing grouped play-history view with its full scope selector.
- Dashboard interactions: schedule and result rows open existing match details; completed matches include a Match Score Details action; View Team opens the full roster.
- Match context: show Home Match or Away Match in a pill beside Next Match; use the latest supplied navy/gold crossed-paddles emblem with the single inner gold ring as the exact Next Match artwork; upcoming schedules include published bye weeks; result scores follow the displayed home-team/away-team order.
- Sidebar popups: Schedule opens Division Team Schedules; Standings opens the selected division's standings-points bar chart.
- Standings context: show League | Division on one line in the Division Rank card. In the popup, show Season and League above Division with equal visual emphasis. Player and Captain standings summaries and popups highlight the division-configured top playoff/championship teams.
- Team record: show the selected team's win-loss record and total Team Points.
- Roster: The Squad card displays the actual team name prominently above only the captain and co-captains; View Team opens the full roster with leadership first and players alphabetically by last name. A member name with an email address opens a mail message.
- Mobile header: show the club logo at left, the active dashboard name and a clearly readable active team name centered, and compact actions at right; Dashboard and My Team remain direct bottom-navigation choices.
- Shared presentation: Match Details keeps its existing logic and actions but uses the preview's navy/club-blue shell; loading branding starts with "League Management System" so cached settings do not cause a name flash.
- Copyright: show a readable copyright line at the bottom of the desktop sidebar and above the fixed bottom navigation on mobile; repeat copyright and the application version in the Profile popup footer.
- Help: the question-mark icon opens User Guide; a separate envelope icon starts the existing Contact League email flow.
- Architecture: `/design-preview` reuses current authentication, permissions, queries, selectors, and modals. It must not become a second data system or add preview code to the normal dashboard's initial bundle.
- Captain preview: `/design-preview/captain` reuses Captain authentication, team context, statistics, schedules, byes, standings, results, league documents, roster data, permissions, and the live Match Setup workflow. Preview actions must call existing business logic instead of duplicating it.
- Standings access: Division Rank is an interactive card on Player and Captain dashboards; it and every Standings full-view action open the same division standings popup.
- Captain match actions: the Next Match hero keeps View Match and adds Email Opposing Captains, Match Score Sheet, and Enter Match Scores using the existing Captain rules and red/green status colors; its Match Setup status panel mirrors the current Captain workflow.
- Captain alerts: use the single label "Pending Match Verifications" throughout; when verification is pending, its sidebar item, summary card, and panel header use red alert styling.
- Captain workspace: keep four larger-type, two-column actions ordered View Team, Manage Roster, Standings, and Division Captains; the pending-verification panel receives more desktop width.
- Captain match tools: each upcoming match has a Match Tools dialog containing View Match, Email Captains, Match Score Sheet, Enter Match Scores, and the full current Match Setup status/actions. The Match Setup button opens the shared live lineup editor in the preview shell.
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
- Admin preview: `/design-preview/admin` reuses the existing Admin Dashboard authorization, selected-scope controls, operational counts, permission-filtered tool definitions, routes, and full League Analytics component. Dashboard Guides, Dashboard Messages, Season Reset, and Master Reset reuse their existing controls inside preview dialogs.

- Sidebar selection: Dashboard-view and multi-team submenus indicate the active choice with a thicker light border instead of the words Current or Active.
- Sidebar cleanup: Player desktop omits Results; Captain desktop omits Pending Match Verifications, Matches, and Standings; Captain mobile omits Scores. The underlying panels and workflows remain available from dashboard cards and match tools.
- Mobile selectors: Player and Captain stack Dashboard view above Active team; Active team appears only for multi-team members, and Dashboard view appears only for roles allowed to switch dashboards.
- Admin organization: retain League Analytics; place Email Options, Score Sheets, Club Setup, Season Reset, and Master Reset All under System Setup. Guides and Messages open as full management dialogs.
- Admin shell migration: after the core Admin preview is approved, move the sidebar into a shared Admin layout so it persists on Members, Ratings, Teams, and other administration screens.

- Admin typography: metric, status, action, and management blocks use the Captain Workspace scale—17px titles with 14px supporting text on desktop and 15px/13px on mobile.

- Admin profile navigation: Change Password, Player Dashboard, and Captain Dashboard use direct Next.js links; the profile closes before navigation, and password changes return to the Admin preview.

## Rejected ideas

- Hardcoded names, roles, teams, schedules, standings, or results in a live preview.
- A permanent standalone Logout button in the desktop sidebar.
- A notification bell when the intended action is Help / Contact League.
- Duplicate Supabase queries or separate business rules solely for the redesign.
- Changing the production dashboard before the corresponding preview section is approved.

