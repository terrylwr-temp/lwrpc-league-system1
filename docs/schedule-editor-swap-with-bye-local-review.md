# Schedule Editor — Swap with Bye local implementation review

## Scope and operational purpose

Requested feature: `/schedule-editor` can replace a selected Home or Away team with an active team holding a recorded bye in the same division and exact date/week. This supports a controlled correction to an existing schedule without regenerating it. Existing schedule-edit workflows could be affected by the additional bye read and the new confirmation flow; their handlers are preserved.

Work is isolated on `codex/schedule-editor-swap-bye` in the reusable managed checkout. Base is accepted roster application `f9f90d9` plus documentation-only acceptance `a8931eb`. Unrelated original-workspace changes remain intact. This feature is **not deployed**, and its migration is **not applied to Production**. Only read-only schema/privilege/trigger discovery used the live database; all swap executions used local fixtures.

## User workflow

An underlined team name in a match is clickable when a valid bye choice exists; its tooltip/accessibility label identifies **Swap with Bye**. Clicking the selected Home or Away team opens **Swap Team with Bye**. The modal shows division, date/week, current matchup/positions, the available bye teams, the resulting matchup, and the removed team's bye. Confirmation stays disabled until a choice is selected. Cancel/Escape sends no request. Confirm sends one authorized request and refreshes the editor after success; a conflict remains visible in the modal.

Choices use team/division IDs and authoritative `team_byes` records. They exclude inactive teams, other divisions, different dates/weeks, already scheduled teams, duplicate bye records, and byes owned by another copied schedule setting. Existing unassigned legacy bye rows retain their league/division/date/week interpretation. Same-Location teams are eligible; Location ID/name plays no part in candidate selection.

Only unplayed draft/scheduled matches are offered. The server additionally rejects existing lineups, assigned match-line players, or game scores, protecting match setup and scoring data. Existing Reset Scores and other editor behavior are unchanged.

## Server validation and atomic persistence

New route: `POST /api/schedule-editor/swap-with-bye`. It applies the existing View-As denial before the existing online-authenticated `authorizeAdminRequest(..., 'league_manager')` check. Captain/player callers cannot use this operation. The client sends match/bye IDs, selected side, and complete stored-row snapshots with display relationships removed. No service credential is exposed to clients.

New unapplied migration: `lwrpc-admin/supabase/migrations/20260928213736_schedule_editor_swap_with_bye.sql`. It adds only the `schedule_editor_swap_with_bye(uuid,text,uuid,jsonb,jsonb)` function; it creates no table, changes no existing rows, grants, RLS policies, triggers or eligibility rules. It is SECURITY INVOKER with empty search path, explicit revoke from PUBLIC/anon/authenticated/service_role and execute granted only to service_role. Existing service table privileges were confirmed read-only and are sufficient. No application table privileges were broadened.

The function rechecks both complete snapshots, existence, same active division, all three active teams, exact bye date/week and schedule ownership, no other same-date/same-week match for incoming/removed/opponent teams, and no conflicting bye. Typed PostgreSQL snapshots handle timestamp formatting and detect changes even when another editor fails to update `updated_at`.

It updates the selected match side and transfers the selected bye row to the removed team **in one transaction**. Aside from `updated_at`, every other match and bye column is preserved: IDs, opponent, date/week, time, location/courts, publication/status, notes, format relationships and schedule-setting ownership. It does not create/delete matches or byes, regenerate anything, move to the incoming team's home Location, reverse home/away, recalculate standings or change scores.

Concurrency uses transaction-local table locks because existing editor/generator writes do not participate in an advisory-lock protocol. SHARE ROW EXCLUSIVE locks on matches/byes serialize swaps against those existing writes; SHARE locks protect team/division/lineup/score checks. Reads continue normally. Lock acquisition is bounded at three seconds; contention/deadlock/serialization errors return a retryable 409. This can briefly delay writes across the affected tables, which must be reviewed before release. No permanent constraint/trigger is added to change existing scheduling behavior. Concurrent requests and failure rollback are exercised in isolated PGlite; true multi-backend contention has not been run against Production.

## History and recovery

The current league Schedule Editor has no schedule-edit audit/history store or trigger; its score audit display is specific to entered/verified scores. Tournament and Round Robin activity logs belong to separate modules. Therefore no separate audit system was created. The RPC result identifies `SWAP_WITH_BYE`, division/date/week, match, removed/replacement/opponent IDs and timestamp; this result is not persisted audit history.

The migration is additive and remains local. If a later reviewed release needs recovery, restore the prior accepted application first, then drop only the new function:

```sql
drop function public.schedule_editor_swap_with_bye(uuid,text,uuid,jsonb,jsonb);
```

Do not apply this rollback as a way to undo actual business swaps. Reversing any accepted schedule change would require separate authorized business-data action. No database recovery was needed for this local implementation.

## Regression and browser verification

Focused automated coverage executes the actual candidate logic, actual editor cancel/confirm handlers, the server handler and actual migration in isolated PostgreSQL fixtures. It covers one/multiple/no byes, foreign/inactive teams, exact dates/weeks, copied/legacy ownership, both selected sides, removed-team bye transfer, retained opponent/all other columns, duplicate scheduling/byes, changed/deleted/incomplete snapshots, existing lineups/players/game scores, verified/played locks, failed second-update rollback, conflicting/replayed requests, invalid/unauthorized callers, service-only invoker privileges, and the existing View-As route registry.

The full suite initially caught the requirement that every route expose an explicit View-As guard call; the new route callback was made explicit without changing the boundary or weakening the registry. Final gates are rerun after this correction.

Local browser verification uses a synthetic League Manager identity and synthetic schedule/byes, with Auth/role/data responses intercepted. The expired real session was not bypassed or reused for an authenticated acceptance claim. The swap endpoint was captured rather than forwarded; the actual database operation is tested separately by the PGlite regression tests. Browser checks passed: two valid same-Location choices, exclusion of foreign/busy teams, result preview, disabled confirmation before selection, cancel/no mutation, Home and Away saves, transferred byes/exact position, stale-conflict message/no mutation, no-bye action hiding, and existing Swap Home modal opening/cancellation. Zero page/HTTP errors and zero forwarded Production writes/mail. Agent-browser confirmed the local login page renders and has no framework error overlay. Local server-only settings configuration is absent, so fixture tests stubbed public branding; no Production secrets/configuration were changed.

Validation logs, fresh build identities, handler-preservation comparison and browser evidence remain ignored under `.local-validation/schedule-bye-swap/`. Final passing counts and the clean build result will be recorded after completion. Owner review is required before any deployment/migration or live schedule acceptance.

## Final verification result

- Focused Swap with Bye plus existing View-As boundary checks: **36/36 passed**, zero failures/cancellations/skips.
- Full automated `npm test`: **1,602/1,602 passed**, zero failures/cancellations/skips; **501.8 seconds** on the final run.
- Final `npm run lint`: **0 errors, 11 existing warnings**, no new warning.
- Final clean Production build: compilation/types passed and **85/85 routes** generated, using fresh `scripts/lms0723-isolated-build.mjs` output. All four changed/new runtime files matched that output byte for byte.
- Local browser fixture checks: **6/6 groups passed**, zero page/HTTP errors, zero forwarded business writes/mail. These are synthetic local UI observations, not authenticated Production acceptance.
- Parsed comparison against `a8931eb` confirmed **34 existing editor helper/edit function bodies unchanged**. Only existing `renderScheduledMatch` changed to expose the new team action. Existing home/away swapping, court/blackout calculations, selection, date/time editing, publish/balance, notes, reset, delete and standings handlers are preserved.
- Read-only Production discovery found no noninternal matches/bye triggers and confirmed the new RPC is absent (**0 functions**), so no migration was applied.
- Final scoped whitespace/diff review passed. No dependency, environment configuration, migration of existing data, RLS or ordinary eligibility change was introduced.

Review artifacts: `docs/schedule-editor-swap-with-bye-modal.png`, `docs/schedule-editor-swap-with-bye-browser-fixtures.json`, and `docs/schedule-editor-swap-with-bye-validation.json`. All content uses synthetic fixtures and contains no credentials. This is local implementation acceptance only; deployment and any live schedule operation remain pending owner review.
