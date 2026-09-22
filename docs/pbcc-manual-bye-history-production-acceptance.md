# LMS-0752 / 0.1.575 — PBCC nine/ten-player manual-bye history production acceptance

**PBCC 9/10-Player Manual-Bye History — PRODUCTION ACCEPTED.** 2026-09-21. The owner authorized the controlled release and production-safe verification. No live PBCC session was created, started, advanced, edited, or used to generate assignments for this acceptance.

## Deployment and rollback

| Item | Accepted value |
| --- | --- |
| Production domain | https://league.lwrpickleballclub.com |
| Version | LMS-0752 / 0.1.575 |
| Release commit | `f92bdca7d11053f9922b8dcf371791f062170f88` |
| Vercel deployment | `dpl_Dn5HnVTevoPd6v2PTn1EavbXEog2` |
| Immutable deployment | https://lwrpc-admin-87cnsad3l-terry-lwrpc.vercel.app |
| Vercel status | READY, production target, production aliases assigned |
| Rollback version | LMS-0751 / 0.1.574 |
| Retained rollback deployment | `dpl_4F3Ch2FMsD18NuosH7gXTP8LzdpF` |
| Rollback URL | https://lwrpc-admin-i3zvuov55-terry-lwrpc.vercel.app |

Local HEAD and GitHub `main` both resolved to the full release commit after push. Vercel created the candidate production deployment from that push, reported it READY, assigned `league.lwrpickleballclub.com`, and the production UI reported LMS-0752. Vercel CLI did not expose source-commit metadata for this deployment, so the commit binding is supported by the matching local/remote Git head, the immediately triggered production build, and the embedded LMS-0752 identity served by the resulting immutable deployment.

The retained LMS-0751 deployment was rechecked READY before release and remains the known-good application rollback target. This release has no database migration, so application rollback does not require reversing a schema or business-data change.

## Scoped release

The release commit changes only the PBCC manual-bye/history path, its planner/history helpers, focused tests, the local review, and version files. For nine players on two courts it plans with all nine joined players and requires the one selected bye. For ten players on two courts it plans with all ten joined players and requires the two selected byes. The chosen byes are persisted once, and later rounds use saved partner, court, bye, trio, quartet, adjacency, and streak history.

A balanced complete-night plan is reused only when its saved court and bye prefix exactly matches the actual saved rows. Manually edited history remains authoritative. Unique partners remain a hard constraint; bye fairness, court balance, and trio/quartet spacing remain optimization goals when manual history makes a perfect result impossible. Existing 8-player, normal 9-player automatic-bye, and normal 10-player automatic-bye behavior remains on the protected paths. The detailed defect and design evidence is in [the local review](pbcc-manual-bye-history-local-review.md).

The commit contains nine intended files: the action route, two scheduling modules, two focused test files, version/package files, and the local review. Existing unrelated working-tree documentation remained outside the commit and deployment.

## Automated verification

| Gate | Result |
| --- | --- |
| Nine/ten-player focused manual-bye tests | **19/19 PASS** |
| Protected 8/9/10-player, two-court matrix | **12/12 PASS** |
| Full automated suite | **1,431/1,431 PASS** |
| Lint | **PASS — 0 errors, 11 existing warnings** |
| Production build | **PASS** |
| Diff/whitespace check | **PASS** |

The 19 focused tests cover first-round and consecutive manual byes, manual/automatic ordering, six- and seven-game nights, repeated Next Game, saved-session continuation and reload, edited prior rounds, changed byes/courts/players, reconstructed partner/court/bye/trio/quartet history, deliberately repeated manual byes, impossible saved court skew, validation, and unchanged automatic scheduling. The protected matrix covers batch and Next Game generation for 8, 9, and 10 players across six- and seven-game nights.

The focused 19-test set and protected 12-scenario matrix were run again after deployment against the exact local/remote release commit and passed. The full suite, lint, build, and diff checks passed before push on the release candidate; the final versioned production build also passed.

## Normal LMS and PBCC production smoke

Read-only normal-LMS checks passed before and after deployment under the Commissioner session:

| Surface | Before LMS-0751 | After LMS-0752 |
| --- | --- | --- |
| Dashboard, All Seasons | 1,842 active members; 16 players on teams; 103 teams; 3.854 average Season DUPR | Same |
| Teams & Rosters | 103 of 121 teams | Same |
| Members | 1,842 of 2,024 members | Same |
| PBCC Admin | One upcoming/current match; 10 joined; 0 waitlist | Same |

The production footer showed LMS-0752 on every postdeployment surface. No postdeployment browser warning or error was recorded. The retained log contained one earlier session-expired error at 11:27:24 UTC, before the candidate deployment was created, and it was resolved by the owner's sign-in.

## Operational table fingerprints

Read-only whole-row count and SHA-256 fingerprints were captured before deployment at 2026-09-21 11:04:02 UTC and after verification at 11:34:45 UTC. All **10/10** PBCC operational tables matched exactly:

| Table | Count before/after | Hash result |
| --- | ---: | --- |
| `round_robin_groups` | 1 / 1 | Match |
| `round_robin_courts` | 4 / 4 | Match |
| `round_robin_players` | 21 / 21 | Match |
| `round_robin_player_groups` | 4 / 4 | Match |
| `round_robin_player_group_members` | 22 / 22 | Match |
| `round_robin_sessions` | 21 / 21 | Match |
| `round_robin_session_players` | 313 / 313 | Match |
| `round_robin_matches` | 69 / 69 | Match |
| `round_robin_player_session_results` | 106 / 106 | Match |
| `round_robin_activity_log` | 315 / 315 | Match |

No PBCC schedule, player, match, score, result, group, court, session, membership, activity-log, notification, or other business-data row changed during deployment and verification.

## Live verification limitation

The production PBCC UI has no read-only preview for manual-bye generation. Starting a session, selecting byes and invoking Next Game would persist real assignments. Those actions were intentionally not performed. Manual-bye generation, saved/reloaded history, edited-round continuation, partner uniqueness, court balance, and trio/quartet history were therefore verified with synthetic data against the exact deployed commit rather than by altering the real upcoming match.

**Final status: PBCC 9/10-Player Manual-Bye History — PRODUCTION ACCEPTED.**
