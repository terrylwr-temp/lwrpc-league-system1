# LMS-0751 / 0.1.574 — PBCC ten-player two-court production acceptance

**PBCC 10-Player / 2-Court Scheduling — PRODUCTION ACCEPTED.** 2026-09-20 EDT / 2026-09-21 UTC. The owner authorized controlled deployment and read-only production verification. No live PBCC match, session, roster, game, score, notification, or other business record was created or edited for this acceptance.

## Deployment and recovery

| Item | Verified value |
| --- | --- |
| Production domain | https://league.lwrpickleballclub.com |
| Version | LMS-0751 / 0.1.574 |
| Release commit | `3a086d67a9108da377ab143ab4514056045c7f0d` |
| READY deployment | `dpl_4F3Ch2FMsD18NuosH7gXTP8LzdpF` |
| Immutable deployment | https://lwrpc-admin-i3zvuov55-terry-lwrpc.vercel.app |
| READY time | 2026-09-21 00:32:59 UTC |
| READY application rollback | `dpl_7TCcZGcsr7Y8UMfsoBk2puvBHnbe`, commit `ebe215ee2c085ec39c04053f24106c7104f50d0e` |
| Rollback URL | https://lwrpc-admin-e2r70x9gh-terry-lwrpc.vercel.app |

GitHub main, local HEAD, and Vercel's production source metadata all matched the release commit. Vercel reported READY with no alias error and assigned the production domain to it. The accepted LMS-0750 deployment was rechecked READY as an application rollback target. No database migration is included; an application rollback would not require reversing business data.

## Scoped release and verification

The commit contains only the bounded two-court planner's ten-player/two-bye extension, the scheduler entry conditions, focused tests and complete-night verifier, the PBCC review, and the LMS/package version bump. It has no SQL, authentication, authorization, PBCC API write-path, or unrelated application change. Earlier AI/PDF documentation edits remained outside this commit. [The local review](pbcc-ten-player-two-court-review.md) contains the baseline defects and before/after scheduling metrics.

On the exact LMS-0751 tree before push: **12/12** two-court complete-night scenarios passed (8/9/10 players × six/seven games × batch/Next Game); **1,412/1,412** automated tests passed; lint passed with zero errors and 11 existing warnings; the production build and staged diff check passed. Ten-player cases checked two byes per round, one/two byes per player, unique partners, court difference at most one, no consecutive trio/quartet exposure, saved-game prefix continuation, six-to-seven extension, and continuation after a manually edited first round. Protected eight/nine and other roster/ladder scope controls remained green. Logs: `.local-validation/pbcc0751-{verifier,full-tests,lint,build}.txt`.

## Production preflight and normal LMS first

Before deployment, the real Commissioner All Seasons dashboard loaded 1,839 active members, 103 selected-scope teams, 16 roster assignments, and a 3.854 average Season DUPR. Teams & Rosters showed 103 of 121 teams; Members showed 1,839 of 2,021. PBCC Admin showed one legitimate upcoming match with ten joined players. No PBCC session was marked playing. Forty-three migrations were applied, latest `20260919112713`; all three scheduled jobs were active, had most recently succeeded, and had zero failures over 24 hours. Ten PBCC operational tables were fingerprinted before release.

After Vercel READY, the real Commissioner normal LMS checks ran **before** PBCC acceptance: the All Seasons dashboard retained the same four values; Teams & Rosters again showed 103 of 121; Members again showed 1,839 of 2,021. Each page loaded under LMS-0751. PBCC Admin loaded under LMS-0751 with the same one upcoming ten-joined-player match. The browser reported zero warning/error logs for the postdeployment checks. Vercel's runtime-error view showed no group attributed to the candidate deployment; its one listed `url.parse()` deprecation group was historical and last attributed to the LMS-0750 deployment.

## Production-safe scheduling evidence and limitation

The deployed Vercel deployment identifies the exact commit whose built source passed the 12 complete-night replays and 1,412 protected tests. This is the strongest safe evidence for live generation behavior. The production PBCC UI has no read-only generation preview: Start Session and Next Game persist match assignments. The real upcoming ten-player match was therefore **not** used to generate six/seven games, repeat Next Game, edit prior rounds, or create a test session. Accordingly, the six/seven-game, bye, partner, court, group, saved-prefix and edited-history outcomes are verified against the exact deployed source locally, not by mutating production games. The bounded planner does not claim global optimality for arbitrary changed attendance/history; it fails without assigning repeated partners if search finds no continuation within its limit.

## Data integrity and final status

Pre/post whole-row hash and count comparisons matched exactly for all **10/10 PBCC operational tables**: groups, courts, players, player groups/members, sessions, session players, matches, player session results, and activity log. The production normal LMS dashboard/team/member counts also matched pre/post. No production business-data write or notification was issued by this task. The source diff contains no data migration or write-path change. The retained READY LMS-0750 deployment is the recovery target if later operational monitoring identifies a regression.

**Final status: PBCC 10-Player / 2-Court Scheduling — PRODUCTION ACCEPTED**, with live assignment generation explicitly unexercised to protect real PBCC data.
