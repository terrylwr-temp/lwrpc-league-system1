# Swap with Bye — Production acceptance

Accepted September 28, 2026 (final integrity capture September 29, 01:45 UTC).

## Release identity and scope

- Deployed commit: `b5ca721a07fddafbe103a5c607e2c791d370cf5b` on `codex/schedule-bye-swap-release`.
- Production deployment: `dpl_GgeYTJ33HqjjwpGBsVck7a9Jhwb3`, https://lwrpc-admin-4bqslau7r-terry-lwrpc.vercel.app.
- Live site: https://league.lwrpickleballclub.com. All four existing Production aliases were verified against this exact deployment and commit.
- Staged artifact: `dpl_2EQWYr8zoqDgg49S5atyNP6haMZ7`, https://lwrpc-admin-bbz4a87ji-terry-lwrpc.vercel.app, same commit.
- Previous accepted application / tested rollback: `f9f90d9089ae0cd75e210120b53fd29fdd486591`, `dpl_3x7zNpSooMX93jREXDyqTZNuozWw`, https://lwrpc-admin-8zav4dkn3-terry-lwrpc.vercel.app.

The complete cumulative diff against accepted Production contains only Swap with Bye implementation, its tests, documentation and required migrations. The original `cfbe4a1` feature was cherry-picked without unrelated roster acceptance documentation. The owner subsequently approved persistent audit history. Staging also found that existing generated matches use zero totals with `score_status=not_entered`; the new Swap guard now recognizes those unplayed defaults while preserving protection for entered results, actual game scores including zero, and lineups. No existing generation, roster, eligibility, standings, scoring or other scheduling rule was changed. Existing editor handlers remain unchanged.

The isolated Preview artifact embeds its staging Supabase URL, so promoting it directly would use the wrong database. The same reviewed commit was built separately with Production configuration and `--skip-domain`, checked while unaliased, then promoted without rebuilding. All live aliases remained on the accepted baseline until candidate acceptance passed.

## Automated regression coverage

| Gate | Result |
| --- | --- |
| Focused Swap with Bye tests | 45/45 passed |
| Full automated suite | 1,611/1,611 passed; no failures, skips or cancellations; 507.2 seconds |
| Lint | 0 errors; 11 existing warnings |
| Fresh isolated Production build | Passed; 85 routes; compiled in 107 seconds |
| Remote Production artifact build | Passed; 85 routes; compiled in 12.1 seconds |
| Diff whitespace check | Passed |

Focused coverage includes both positions, candidate filtering, duplicate and stale protection, full-row snapshot requirements, existing lineup/score protection, authenticated actor binding, service-only RPC/private audit privileges, audit insertion rollback, retained audit history, and completing a partial installation without a legacy callable overload. These are automated regressions, separate from the deployed browser checks below.

## Migration installation and security

Isolated Supabase staging: `qrvwqomqbgciwssitniz`, branch `schedule-bye-swap-acceptance`, branch ID `ab303c72-1015-44f3-960a-24730836b507`. The owner approved its organization and $0.01344/hour cost. Historical replay lacked the original LMS base schema; an empty schema snapshot populated staging. No Production business rows or Auth accounts were copied. All fixture accounts, matches, byes and failure-injection objects were confined to staging.

Each of these migrations appears exactly once in staging history:

- `schedule_editor_swap_with_bye`
- `schedule_editor_swap_with_bye_audit`
- `schedule_editor_swap_with_bye_unplayed_defaults`
- `schedule_editor_swap_with_bye_atomic_install`

Actual Production migration history contains exactly one application of each:

| Name | Recorded version |
| --- | --- |
| `schedule_editor_swap_with_bye_unplayed_defaults` | `20260929012345` |
| `schedule_editor_swap_with_bye_atomic_install` | `20260929013942` |

The original base and audit migrations were **not applied to Production**. Automatic approval review rejected the outdated five-argument base function. The initial batch incorrectly continued: the dependent audit migration failed transactionally, while the six-argument defaults migration succeeded. The accepted application stayed live and no swap ran. The current-only atomic installer was then added, regression tested, installed and browser tested in staging, and applied once to Production. This completed the reviewed private audit objects and current RPC together without creating the rejected overload or changing business rows. Historical migration records were not rewritten. Future migration tooling must account for this actual history rather than blindly replaying the original chain.

Reviewed installer file: `20260929012528_schedule_editor_swap_with_bye_atomic_install.sql`; SHA-256 `961aab0dce11ff4b376a1c04cef35c9f7c6a4ae1e5550de2c5f7519decb144c4`.

After installation, Production audit columns, defaults, constraints, policies, triggers and function body matched staged catalog definitions exactly. Function/security verification confirmed:

- One six-argument RPC, `SECURITY INVOKER`, empty search path, three-second lock timeout; service-only EXECUTE, denied to anon/authenticated.
- Private `schedule_editor_private.bye_swap_audit`, 14 reviewed columns and three constraints, RLS enabled, no client policies or triggers and no sequences.
- No anonymous/authenticated schema access; service role has schema USAGE and table SELECT/INSERT only, without UPDATE/DELETE.
- Acting Auth user comes from existing server authorization; client actor values are ignored. Match, bye and audit insert persist in one transaction.
- No existing business-table grants, policies or triggers changed. Short bounded table locks serialize conflicting writes; reads remain available.

The atomic staging installation retained all six prior fixture audit records with the same fingerprint. No audit-history deletion or business-data migration was performed.

## Browser-observed authenticated staging acceptance

The final staged artifact passed 20 recorded cases using real staging Auth, role lookup, API requests and database writes. Auth, business reads and swap responses were not simulated. Production Supabase requests were blocked; reminder/email sending was blocked or stubbed. There were no page errors, unexpected HTTP errors, Production requests or sent emails.

| Requested behavior | Browser/database observation |
| --- | --- |
| Normal LMS first | Dashboard, Teams, Members, Matches, Standings and Scheduling loaded while authenticated |
| Home swap | Real API 200; incoming team became Home; Away opponent retained |
| Away swap | Real API 200; incoming team became Away; Home opponent retained |
| Metadata | Every stored match field except selected team and updated timestamp remained equal; date/week, time, court/location, format, notes and publication metadata retained |
| Bye transfer | Selected incoming team's recorded bye transferred to the removed team for the same division/date/week |
| Multiple byes | Both eligible fixture teams offered; busy and other-division teams excluded |
| No eligible bye | Swap actions absent |
| Division isolation | Foreign division bye excluded |
| Duplicate protection | Newly introduced conflicting match rejected after modal opened; no partial write or audit |
| Stale request | Full-row metadata change rejected with 409; no partial write or audit |
| Existing lineup | Server rejected swap with 409 and preserved rows |
| Game score/result | Actual game score of zero and entered match result with zero totals each rejected with 409 |
| Cancel | No changed match/bye/audit rows |
| Audit | Persisted removed/incoming/opponent, match/bye/league/division/date/week/side and actual Auth actor; audit timestamp equaled both row-update timestamps |
| Atomicity/concurrency | Two real concurrent requests produced one success, one conflict and one audit; four independent database observations saw only complete prior/final state |
| Audit failure | Staging-only injected audit INSERT failure rolled back both business updates; injection objects removed afterward |
| Security | Actual anon/authenticated direct RPC calls denied; real captain role denied server swap without changes |
| Existing editor workflow | Existing Swap Home review/cancel and a separate real confirmed Swap Home save passed on disposable fixtures; byes and new audit unchanged by the old operation |

## Browser-observed Production acceptance

Using the owner's real authenticated Commissioner session, both the unaliased candidate and promoted live site passed checks of Dashboard, Teams, Members, Matches, Standings, Ratings, Scheduling, Division Schedules, Schedule Editor, Player Dashboard and Captain Dashboard. The actual observed database host was Production `glikrmmgirilnmamxxyl.supabase.co`.

Schedule Editor displayed 299 matches and 186 eligible per-team Swap with Bye actions. A live eligible matchup opened the modal, allowed selection, displayed the expected resulting Home/Away matchup and enabled confirmation. The modal was then canceled. No live Swap with Bye, live existing-editor save, lineup/score mutation or Production fixture creation was executed. Production mutations are intentionally supported by staged execution and automated regression evidence, not claimed as live browser execution. Other real role sessions were not separately signed into Production.

Both candidate/live checks had zero page errors, HTTP errors, forwarded business writes and sent emails. The deployment runtime error scan returned zero records. The three existing active database cron jobs had zero failed runs in the last day.

## Production integrity and recovery

The release and acceptance made **no Production business-data writes and sent no test email**. Production audit count remains zero; all 299 matches and 36 byes retained their original fingerprints. No schedule or score changed through acceptance.

Concurrent Production work had already been confirmed by the owner. Across the 45 monitored business tables, 42 retained identical fingerprints; observed changes were members (2,062 rows, same count), roster `team_members` (1,074 to 1,077), and `scheduling_special_requests` (9 to 10). These changes occurred while the accepted application remained live or during read-only acceptance. The migration changes only feature schema/function definitions, its swap was never invoked, and browser guards forwarded zero business mutations. This report therefore does not claim the whole live database was globally static during concurrent work.

Rollback deployment `dpl_3x7zNpSooMX93jREXDyqTZNuozWw` passed all 11 authenticated normal-page checks **after** the final Production schema installation. Recovery command: `npx vercel rollback dpl_3x7zNpSooMX93jREXDyqTZNuozWw --yes`. No live alias rollback was performed merely as a test. The prior application safely coexists with the additive RPC/audit objects; preserve those objects and audit history on application rollback. Do not reverse legitimate future swaps or drop history without separate approval.

Read-only backup verification found seven completed physical daily backups; latest completed backup ID `1809950460`, timestamp `2026-09-28T11:00:59.148Z`. PITR is disabled. No backup restore was performed.

The isolated staging branch remains available for review at the approved $0.01344/hour (about $0.32/day) until removed. Credentials, Auth sessions and temporary Vercel bypass URLs are excluded from this report and committed source.
