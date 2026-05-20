# LWRPC League Management System Roadmap

Last updated: 2026-05-20

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
- `league_manager`
- `commissioner`

Role logic lives in `lwrpc-admin/app/lib/permissions.js` and auth/session logic lives in `lwrpc-admin/app/lib/auth.js`.

League setup now supports a `leagues.rosters_locked` flag. When enabled, captains can view rosters but only `league_manager` and `commissioner` roles can add or remove roster players.

Scoring reminders use the existing notification route and SendGrid/Twilio helper stack. The scoring reminder email template can be stored in `notification_templates` when the schema update has been applied, with browser local storage as a fallback.

Print workflows should use the generic `/print` page so print previews open on an app URL and include the LWRPC copyright/page footer inside the document. Browser print dialogs may still show their own headers/footers unless disabled by the user.

Divisions now support `team_dupr_max`, a combined doubles-team rating cap based on the division rating type. This is not a full roster cap; captains are blocked from saving match setup lineups over the cap, duplicate players are blocked within a match setup, and saved lineups are checked when used in score entry.

Scoring operations can export verified scores for DUPR using the club DUPR CSV format. Verified, not-yet-exported matches are selected by default; already exported verified matches can be manually reselected for override re-export. Export tracking uses `matches.score_exported_at`.

Captain Dashboard has a match setup workflow for upcoming matches. Captains can save doubles pairings per match line in `match_lineups`; completed setups show a status badge on match cards, opposing captains receive an email with the submitted lineup, and the match score-entry screen can then populate game players from those saved lineups.

Score entry is restricted to captains assigned to the match. Match score rows use Team 1/Team 2 style labels for line slots, and saved match setup choices are scoped to the matching team slot.

Teams & Rosters supports assigning captains/co-captains from outside the team's home community through an explicit all-communities toggle. Team lists are grouped by league/division and start collapsed as accordions.

Standings points are calculated from configured game line `team_win_points` multiplied by games won on each line, rather than only from match-level win/loss/tie points. The visible app version is centralized in `lwrpc-admin/app/lib/version.js` and displayed near the copyright footer.

Player Dashboard uses inline panels for play history, division standings, and upcoming matches. Team summaries appear above the dashboard action buttons and include captain/co-captain contact details. Play history includes top-level games/wins/losses totals plus individual game scores when entered.

Phone numbers entered or imported through member workflows are normalized to `(999) 999-9999` formatting when enough digits are present, with extensions preserved as `x123`.

Member email addresses are normalized to lowercase and validated for basic email shape before manual save or import.

## Verified Status

As of 2026-05-20:

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
