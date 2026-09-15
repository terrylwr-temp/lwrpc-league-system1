# LMS-0729 / 0.1.551 - complete local implementation review

LOCAL VALIDATION COMPLETE - STOP BEFORE PRODUCTION. Accepted production remains LMS-0728 / 0.1.550. This report supersedes the earlier SQL-boundary checkpoint following the owner's restricted-reader approval. No production migration or deployment has occurred.

## 1. Exact restricted reader

`lms_view_as_reader`, already used by accepted shared View-As page reads. No new role.

## 2. Existing privilege footprint

Captured read-only before adjustment in [reader footprint](lms-0729-reader-footprint-before.json): NOLOGIN, NOINHERIT, NOSUPERUSER, NOCREATEROLE, NOCREATEDB, NOREPLICATION, NOBYPASSRLS. Reader is not a member of another role. Its postgres membership has ADMIN true, INHERIT false, SET false, granted by supabase_admin. It has 238 column SELECT grants across 19 public business tables, no table-wide grants, and 19 existing role-specific SELECT policies. Exact columns, policies, schema privileges, memberships and four existing function ACLs are recorded in that JSON. Existing `competition` and `people` functions are owner-only; `page_read` is executable by the executor; `lock_viewer` is executable by the reader. Browser roles have no private schema access.

## 3. Four standings columns

| public.team_standings column | Purpose | Existing reader SELECT | Executor before/after |
|---|---|---|---|
| division_id | Bind record to the selected team's exact division | Yes | Denied / Denied |
| league_id | Verify record belongs to that division's league | Yes | Denied / Denied |
| matches_played | Return authoritative stored matchup count | Yes | Denied / Denied |
| match_ties | Preserve stored record and count completeness | Yes | Denied / Denied |

No grant was added for these columns. Existing team_id/wins/losses/points access remains unchanged.

## 4. Private function design and role mechanics

`lms_read_private.team_record(uuid,text,jsonb)` is a fixed, minimal SECURITY DEFINER function owned by `lms_view_as_reader`, with empty search_path and fully qualified public table references. It is in the reader's existing private schema, avoiding extra reader schema privileges. Only service_role and lms_view_as_executor receive EXECUTE and the necessary schema USAGE. No browser-accessible public wrapper is added.

Migration-only ownership setup temporarily gives postgres SET on the existing reader and grants reader CREATE in this schema; it creates/replaces the function under SET LOCAL ROLE, restores postgres, revokes CREATE, and removes the temporary postgres-granted membership. The original supabase_admin membership remains unchanged. Runtime calls use PostgreSQL's automatic SECURITY DEFINER context restoration, not runtime SET ROLE. Clean/replay comparisons confirm no retained role/CREATE expansion.

## 5. Minimum output

Success fields: status, intent, relationship, teamRef, seasonRef, team/division/league/season display labels, wins, losses, ties, played and points. Clarification returns at most five permitted team choices plus moreChoices. Error/no-team/missing results contain only bounded status/provenance information. No member email/phone, member identifiers, RF, unrelated ratings, roster, rank/place, or unrelated standings metrics are returned. Stored values are reused; there is no second standings calculation. Missing/inconsistent values produce a limitation.

## 6. Authorization boundary

Normal API authenticates the real Auth user and calls the existing server-only RPC. New `ai_live_private.resolve_identity(uuid)` uses the existing identity coordination locks, validates active membership and linkage, and returns the effective role. View-As retains its existing protected proof, live context, actor/target validation and dispatcher before supplying the effective target to the helper. The reader's technical visibility never supplies caller authority.

SELF candidates are current roster relationships or actual team Captain/Co-Captain/Club Pro assignments, not community inference or manager-wide visibility. One candidate answers, several clarify, none returns a natural limitation. An exact named-team query may return only the authenticated standings facts explicitly approved in the owner's visibility contract. It does not grant member-detail access. Explicit season/scope filters and team selection stay bound through sealed clarification receipts. Team, division, league and season provenance are joined in one statement snapshot; no unrelated records are combined.

## 7. Browser denial

Anon/authenticated direct private-function calls fail. Browser-supplied actor/member/role/team parameters are ignored by the application parameter allowlist; team choices come from signed actor-bound receipts and are revalidated in SQL. Forged team/target/receipt controls pass. An unrestricted arbitrary team UUID without the authorized SELF relationship or exact named-team query is denied. View-As cannot substitute its real Commissioner's team.

## 8. RLS

The existing 19 reader policies permit its restricted SELECT column footprint. The helper applies the narrower effective-user projection. No RLS policy, BYPASSRLS attribute or ordinary write policy is changed. This release does not address the separately deferred Data API hardening project.

## 9-10. Before/after privilege regression

Isolated PostgreSQL verifies identical public table ACLs, column ACLs, RLS policies, executor/reader role attributes and memberships before/after clean apply and replays. Existing private-function metadata/ACLs remain unchanged except reviewed function bodies. Reader gains ownership of this one new bounded function; trusted callers gain invocation/schema USAGE only. No new reader or executor business-table privilege, browser grant, or normal-write authorization change.

## 11-12. Migration and exact candidate hash

Migration: `20260909212951_lms0729_live_identity_team_record.sql`

SHA-256: `ff532799ad343fbac176406cff4e675372341b8fda0ae4a6b633e3672d2c0cba`

Three replaced bodies: ai_live_private.lookup, view_as_private.lookup, public.ai_live_feedback. Two new helpers: resolve_identity and team_record. Two feedback CHECK constraints add TEAM_RECORD and LMS-0729 compatibility. No deferred security-foundation SQL is included. [Function manifest](lms-0729-function-manifest.json), [rollback](lms-0729-rollback.sql), and source templates/generator are retained for review. This is not a production-approved hash.

## 13. PostgreSQL validation

[PostgreSQL 17.11 results](lms-0729-postgres-results.json): isolated loopback server with production-compatible nonsuperuser postgres, reader/executor role constraints, RLS enabled and restricted grants. PASS: clean apply, replay, second replay, partial installation recovery, owner/security/search_path, no role leakage, rollback, business fingerprints, table/column ACLs and RLS equality. Rejects unexpected body, definer mode, search_path, owner, ACL, reader login/BYPASSRLS and browser schema access. Concurrent member deactivation, Auth-email change and role insertion are blocked by the existing identity coordination mechanism while identity is locked.

The psql fixture explicitly preserves captured CR/LF function bodies, so exact source guards are exercised rather than bypassed. Initial fixture transport/role issues were corrected in the harness; final production-compatible run passes.

Rollback restores the accepted three function bodies, removes the two new helpers and their new caller schema grants, and preserves business rows. It deliberately retains additive feedback CHECK compatibility so legitimate LMS-0729 feedback would not be deleted or invalidate rollback. Application rollback to accepted LMS-0728 remains compatible with additive candidate SQL; SQL rollback is a separate reviewed action.

## 14. Team-record controls

PASS: Player, Captain, both Co-Captains, actual Club Pro assignment, manager SELF does not enumerate all teams, explicit Player, no record, forged team, bounded multi-team choices, signed choice round-trip, pagination, named-team minimal standings, historical season separation, explicit scope, invalid league provenance, inconsistent count limitation, rank absence, and no protected output. Raw future matches are not read or recomputed by this helper; records reuse the existing stored standings semantics.

## 15. Implicit Player identity

PASS: active uniquely resolvable zero-role member receives effective Player without role/account writes; explicit Captain and member-only higher-role combination are retained; unknown-role, inactive, banned/deleted/anonymous/pending-email/unconfirmed zero-role, duplicate member/Auth-email and conflicting linkage states deny. Existing coordinated writer prevents conflicting durable links. No backfill or account creation.

## 16. Feedback identity

Normal feedback uses the same resolver and existing sealed feedback receipt. Duplicate identical feedback is idempotent; deactivated identity denies. Receipt rebinding to a different user fails. Metadata remains the existing bounded operational shape, not prompts or protected Live facts. View-As has no feedback receipt/control and retains endpoint rejection.

## 17. Deferred rank

All requested place/rank/advanced-why variants return a deterministic Live capability limitation, never a document insufficient-evidence fallback. No rank query/calculation or normal sorter change. Rules-calculation/tie-break policy questions stay document-routed in deterministic routing tests. [Mandatory future rank review](post-lms-0729-rank-consistency.md) remains deferred.

## 18. View-As regression

SQL effective target/forged team/real-actor bleed/denial controls pass. Local browser passes the real confirmation, isolated tab, shared Player Dashboard, deterministic record, no feedback, 403 mutation denial and Exit; original administrator tab remains intact. Screenshots verify desktop/390px/320px. [Browser results](lms-0729-browser-results.json).

Known baseline limitation: Escape closes confirmation but does not return focus to its trigger. This same false result is recorded in accepted LMS-0728 browser evidence; the component is byte-identical. It is not claimed as an accessibility pass or silently fixed here.

## 19. Normal LMS regression and limits

Full regression passes normal authorization/workflow and existing View-As suites. Local browser exercises Commissioner, Captain and implicit Player dashboards and navigation to team, matches and standings, respecting existing role redirects. The normal Player's actual Ask LWR API/UI returns the stored record and deferred-rank limitation. No live roster/lineup/score writes were used for verification. Normal write paths are unchanged in source and database permissions; synthetic regression covers them. These local checks do not replace genuine post-deployment role acceptance.

[Accepted-package comparison](lms-0729-source-comparison.json): 308/313 existing package files unchanged; changed files are liveLmsIntent.js, liveLmsService.js, version.js, package.json and package-lock.json, plus new liveTeamRecord.js. All normal standings/sorters, dashboards, team/roster pages, Match Setup, schedules, scores and authentication/UI sources remain identical. No generic security redesign is included.

Browser harness limitations: synthetic backend counts were extended using the existing tested normal Dashboard adapter; dev HMR required a focused handoff retry. External asset requests were blocked. Unsupported synthetic operational telemetry/reminder endpoints can report errors; there were zero final browser page errors. No production behavior was altered to satisfy fixtures.

## 20. Verification totals

- npm test: 1047/1047 PASS, zero failures/skips.
- npm run lint: PASS, 0 errors; 11 existing warnings.
- npx tsc --noEmit --incremental false: PASS.
- npm run verify:ai-pdf-server-bundle: PASS.
- npm run build: PASS (Windows cache-write permission required a local rerun).
- git diff --check: PASS.
- Targeted LMS-0729 tests: 3/3 PASS, containing routing, SQL/security matrix and signed service clarification controls.
- PostgreSQL 17.11 and final local browser checks: PASS with the explicit pre-existing focus limitation above.

## 21. Calls and cost

Project answer-model calls: 0. Embedding calls: 0. Generated benchmark calls: 0. Incremental project model API cost: $0. Normal and View-As records remain deterministic; provider fetch is forbidden in routing tests. No production model or prompt changes.

## 22. Business-data integrity

No production SQL, deployment, account/role mutation or business writes. In isolated PostgreSQL, complete synthetic public-table fingerprints remain identical across migration/replays and rollback. Fixture setup/security probes intentionally manipulate synthetic data only. Production fingerprints must be freshly captured during approved deployment, distinguishing concurrent owner activity.

## 23. Exact controlled production sequence - requires separate approval

1. Review this report and exact SQL/hash; approve application candidate and production SQL separately/as explicitly scoped. Freeze candidate package hashes.
2. Verify accepted LMS-0728 deployment/version, migration history, exact helper/source/constraint/role/grant baseline, maintenance health, recovery availability and all 19 production business fingerprints. Note concurrent legitimate activity.
3. Apply only the reviewed SHA-verified migration once in its transaction. No alternative/deferred SQL.
4. Before deployment: verify once-only history/source, three changed/two new functions and two CHECK changes only, owner/search_path/ACLs, reader/executor memberships, unchanged business ACL/RLS/write authorization and fingerprints. Stop on any unexpected change; no automatic correction.
5. Deploy only the reviewed exact application package.
6. NORMAL LMS FIRST: Commissioner plus legitimate Captain/Player sessions; dashboards, teams/rosters, schedule/matches, Match Setup where available, standings and existing controls. Do not mutate live operational data merely to test. Any normal regression stops feature acceptance.
7. Business integrity checkpoint, then targeted normal implicit Player identity/feedback and deterministic record/count/points/no-team/multi-team/rank limitation. No full OpenAI benchmark or document-model questions.
8. Only then effective-role View-As records, minimum fields, no real-actor bleed, no feedback, read-only denial and Exit; desktop/mobile checks as needed.
9. Final integrity/maintenance check and explicit acceptance report. If rollback is required, first restore accepted application; evaluate the separately reviewed SQL rollback without deleting feedback or business data. Do not automatically apply corrective SQL.

## Separately recorded findings

Owner's new Division Team Schedules Captain-name finding is explained by the accepted page projection stripping other-team Captain references and member-name rows. [Separate bounded parity follow-up](post-lms-0729-view-as-schedule-captain-names.md). No attempt to broaden member visibility or bundle that SQL correction here. Existing confirmation focus-return limitation also needs a separate UI correction review.
