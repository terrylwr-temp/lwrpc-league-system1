# LWRPC League Management System

This is the project-wide instruction file for Codex.

## Workspace

Open and work from:

`C:\lwrpc-league-system`

The Next.js app lives in:

`C:\lwrpc-league-system\lwrpc-admin`

Project memory and roadmap live in:

`C:\lwrpc-league-system\docs\project-roadmap.md`

## Important Context

This system manages Lakewood Ranch Pickleball Club league operations: members, ratings, users, leagues, divisions, teams, schedules, matches, scores, standings, captain workflows, and player dashboards.

Supabase is the shared source of truth. Client-side Supabase access uses public anon credentials. Service-role credentials must only be used from trusted server-side scripts or handlers.

## Next.js Rule

The admin app uses a newer Next.js version with breaking changes. Before editing Next.js app code, read the relevant local guide in:

`lwrpc-admin\node_modules\next\dist\docs`

Follow deprecation notices and local conventions.

## Development Priorities

1. Preserve the existing Supabase-backed workflows.
2. Keep role-based access intact for `player`, `captain`, and `league_manager`.
3. Avoid unrelated refactors.
4. Document project-level discoveries in `docs\project-roadmap.md`.
5. Keep secrets out of committed files.

## Verification

For app changes, run from `lwrpc-admin`:

```powershell
npm run lint
npm run build
```

The app currently builds successfully, but lint has warnings that should be reduced over time.

## Future Supabase table migrations

For every future migration creating a `public` table, follow `docs/supabase-public-table-migration-template.md` and add a grant contract under `lwrpc-admin/test/migration-grant-contracts/`. Historical migrations and standalone SQL files are not templates and do not need retroactive edits.

- Deliberately specify `anon`, `authenticated`, and `service_role` access separately. For each, grant only required `SELECT`, `INSERT`, `UPDATE`, `DELETE`, or no privileges. Never rely on Supabase automatic default privileges or use `GRANT ALL` on new application tables.
- Immediately `REVOKE ALL ON TABLE ... FROM PUBLIC, anon, authenticated, service_role`, then apply only reviewed grants. Grants and RLS are separate controls: enable RLS where appropriate and add explicit policies for permitted client operations.
- For server-only/internal data, consider a non-exposed private schema instead of `public`. For identity/serial-backed tables, explicitly review and declare required sequence privileges, including `USAGE`, `SELECT`, `UPDATE`, or none, and revoke defaults before granting.
- Run the migration grant-readiness gate in `npm test`. It executes new public-table migrations in an isolated database without old automatic Data API grants and checks the declared contract.

## Permanent live-production protection

Read and follow docs/live-lms-production-protection.md for LMS-0726 and every future release. Normal Tier 1 league workflows and business data take priority over new features. Test normal LMS first; preserve exact accepted behavior, require explicit authorization for business-data changes, and retain tested application/database recovery paths. Never create production test rows or mutate live scores, schedules or rosters for acceptance without explicit authorization. Keep unrelated security hardening in a separately reviewed release.

## FAST FIX lane

Read and follow `docs/lms-fast-fix-workflow.md` for small, localized application defects. The owner authorizes direct application deployment and targeted production replay after all FAST FIX gates pass, without separate design/implementation approval. Stop for review at any listed escalation condition; production business-data mutation is never included.
