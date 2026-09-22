# LMS-0753 / 0.1.576 — PBCC next-round label production acceptance

**PBCC Next-Round Label — FAST FIX PRODUCTION ACCEPTED.** 2026-09-21. The owner explicitly authorized the production deployment after the automatic approval review required fresh deployment authorization. No live PBCC round was created, started, advanced, or edited for acceptance.

## Deployment and rollback

| Item | Accepted value |
| --- | --- |
| Production domain | https://league.lwrpickleballclub.com |
| Version | LMS-0753 / 0.1.576 |
| Release commit | `507338323a198ca69bedea1bd1d4464fcd3e9750` |
| Vercel deployment | `dpl_AjDzPziNLEqW3ycdz89wHPx1KDPK` |
| Immutable deployment | https://lwrpc-admin-f9cdhz25q-terry-lwrpc.vercel.app |
| Vercel status | READY, production target, production aliases assigned |
| Rollback version | LMS-0752 / 0.1.575 |
| Retained rollback deployment | `dpl_Dn5HnVTevoPd6v2PTn1EavbXEog2` |
| Rollback commit | `f92bdca7d11053f9922b8dcf371791f062170f88` |
| Rollback URL | https://lwrpc-admin-87cnsad3l-terry-lwrpc.vercel.app |

Local `HEAD` and `origin/main` both resolved to the full LMS-0753 release commit after push. Vercel reported the resulting production deployment READY, assigned the production aliases, and the production UI reported LMS-0753. The retained LMS-0752 deployment remains the known-good application rollback target. This release has no database migration or data conversion.

## Scoped correction

The later-round player/bye selection modal now uses **Create Next Round** for its heading and idle confirmation button, and **Creating Next Round...** while planning is in progress. The initial-round workflow remains **Start Match**, **Start and Generate First Game**, and **Starting...**.

The release commit contains exactly six intended files: the PBCC admin page, one focused test, version/package files, and the local review. It changes no scheduler, planner, score, session, API, database, authorization, or PBCC write-path behavior. Existing unrelated working-tree documentation remained outside the release commit.

## Timing finding

Next Game reconstructs the full saved partner, court, bye, trio, quartet, and streak history, then recalculates and validates the remaining balanced night before persisting a new round. Three-round planner-only measurements were 2.82–2.96 seconds for nine players and 3.91–4.27 seconds for ten players. Supabase access, result rebuilding, activity logging, UI refresh, and a cold function start can add time. A several-second wait is expected under the current balancing design. Repeated waits above roughly 10–15 seconds or an operation that never finishes should be investigated separately.

No planner search limit or balancing rule was changed. Detailed diagnosis and timing evidence are in [the local review](pbcc-next-round-label-local-review.md).

## Verification

| Gate | Result |
| --- | --- |
| Focused next-round label regression | **1/1 PASS**, including a postdeployment rerun against the exact release commit |
| Protected 8/9/10-player two-court matrix | **12/12 PASS** |
| Lint | **PASS — 0 errors, 11 existing warnings** |
| Production build | **PASS** |
| Diff/whitespace and six-file release scope | **PASS** |
| Production browser console | **PASS — no warnings or errors** |

The protected matrix covers 8, 9, and 10 players, six- and seven-game nights, batch generation, and repeated Next Game generation. The release did not touch the planner, so the accepted LMS-0752 manual-bye/history coverage remains unchanged.

## Normal LMS production smoke

Read-only Commissioner checks passed before and after deployment:

| Surface | Before LMS-0752 | After LMS-0753 |
| --- | --- | --- |
| Dashboard, All Seasons | 1,841 active members; 16 players on teams; 112 teams; 3.854 average Season DUPR | Same |
| Teams & Rosters | 112 of 125 teams | Same |
| Members | 1,841 of 2,027 members | Same |
| PBCC Admin | 0 upcoming/current at the preflight instant | 1 legitimate newly opened upcoming session; 0 joined at the smoke-check instant |

The production footer showed LMS-0753 on Dashboard, Teams & Rosters, Members, and PBCC Admin.

## PBCC operational table comparison

Read-only whole-row count and SHA-256 fingerprints were captured before deployment at 2026-09-22 00:12:12 UTC and after deployment at 00:21:19 UTC. Six tables matched exactly: groups, courts, players, player groups, player-group membership, and matches. Four tables reflected a real PBCC completion/repeat event at 00:19:10–00:19:12 UTC:

- the September 21 session was completed;
- its 16 player result rows were rebuilt;
- the next weekly session for September 24 was opened;
- 17 invited-player rows and three activity-log rows were created;
- the activity descriptions record **Match completed**, **Next weekly session opened**, and the invitation event, including result and invitation texts sent.

The exact changed-table counts were sessions 21 to 22, session players 313 to 330, activity rows 350 to 353, and results 122 to 122 with changed contents. During the later comparison window, two invited players changed their response status to joined at 00:27:45 and 00:29:36 UTC. These are concurrent operational actions and player responses. They are unrelated to LMS-0753: the release has no changed data/API/write path, the browser acceptance used only read-only navigation, and no live match control was invoked.

The observed production changes are therefore explained, expected club activity. No PBCC mutation is attributable to the deployment or acceptance actions. Dynamic response-status fingerprints cannot remain byte-for-byte stable while invited players are actively responding.

## Live verification limitation

Production has no read-only preview of the later-round modal. Opening this mode requires a started session with a saved round, and confirming it would persist assignments. Acceptance therefore did not manufacture a live match or advance a real session. The exact deployed commit was verified through the focused source regression, protected scheduling matrix, immutable Git identity, production version identity, normal-LMS smoke checks, and empty production browser console.

**Final status: PBCC Next-Round Label — FAST FIX PRODUCTION ACCEPTED.**
