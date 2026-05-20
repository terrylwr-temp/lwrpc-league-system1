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

Role logic lives in `lwrpc-admin/app/lib/permissions.js` and auth/session logic lives in `lwrpc-admin/app/lib/auth.js`.

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
