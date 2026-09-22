# PBCC ten players on two courts — local review

**Subsequently deployed and [production accepted](pbcc-ten-player-two-court-production-acceptance.md) as LMS-0751 / 0.1.574.** The local results below remain the release's synthetic scheduling evidence; no live match generation was used for acceptance.

2026-09-20. Local synthetic schedules only. No production PBCC session, match, score, roster, notification, configuration or database row was changed. This is a scheduling change outside FAST FIX deployment authorization.

## Existing behavior and requirements

LMS-0741's bounded whole-night planner applied only to eight/nine selected players on two courts. Ten selected players used the older round-by-round fallback in both batch Start Session and Next Game. The approved priorities are unique nightly partners, fair byes, closest possible per-player court split based on actual appearances, avoiding consecutive groups of three/four where feasible, and spacing recurring same-court pairs. A six/seven-game ten-player night has two byes per game: each player receives one or two, not the zero/one distribution possible with nine players.

Before the change, a deterministic ten-player, two-court synthetic replay found:

| Mode | Games | Maximum court difference | Consecutive trio exposures | Repeated partners | Bye spread |
| --- | ---: | ---: | ---: | ---: | ---: |
| Batch | 6 | 3 (several 4/1 or 1/4 splits) | 0 | 0 | 1–2 |
| Next Game | 6 | 1 | 0 | 0 | 1–2 |
| Batch | 7 | 2 | 0 | 0 | 1–2 |
| Next Game | 7 | 2 | 3 | 0 | 1–2 |

This replay was a diagnostic sample, not a guarantee of the fallback's behavior for other attendance/history.

## Local correction

The bounded two-court planner now includes ten players. Its candidate rounds choose two distinct byes and eight participants. The search preserves the hard no-repeated-partner filter, chooses the lowest available bye counts, and optimizes court orientation and group spacing over the remaining night. Its independent circle seed uses the fifth team as the two byes, preserving partner uniqueness. A seed is accepted only if its final bye spread is no worse than the bounded search's result. The existing saved-prefix, not-played and history logic remains shared with eight/nine players. Other roster sizes, one court, season-history fallback and ladder remain outside this planner.

After the change, the same replay reports:

| Mode | Games | Court difference | Consecutive trio/quartet exposures | Repeated partners | Bye spread | Maximum same-court pair games |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Batch | 6 | 1 | 0/0 | 0 | 1–2 | 3 |
| Next Game | 6 | 1 | 0/0 | 0 | 1–2 | 3 |
| Batch | 7 | 1 | 0/0 | 0 | 1–2 | 4 |
| Next Game | 7 | 1 | 0/0 | 0 | 1–2 | 4 |

The planner is bounded and does not prove global optimality for arbitrary edited histories. If it finds no unique-partner continuation within its limit, it fails without silently repeating a partner. A player with five appearances can have a 3/2 court split; with six, a 3/3 split. Some same-court pair recurrence remains. The route's existing first-court bye metadata supports two byes per round.

## Verification and release boundary

Permanent focused tests now cover ten players at six/seven rounds, saved-prefix continuation, six-to-seven extension, identity/court/partner/bye invariants, and a manually edited first round. The complete-night verifier includes ten-player batch and game-by-game scenarios alongside the protected eight/nine cases. Final gates: 12/12 complete-night scenarios, 1,412/1,412 full automated tests, lint with zero errors and 11 existing warnings, production build, and diff whitespace check all pass. A fresh local seven-round plan took about five seconds; this is local timing, not production latency evidence.

This is a local review candidate, not a production deployment or acceptance. Production PBCC assignment creation would require separate owner-reviewed release and safe acceptance under the live LMS protection rule.

## LMS-0751 controlled release preflight

The owner subsequently authorized controlled production deployment. The scoped release is LMS-0751 / 0.1.574. Re-run gates on that exact version: 12/12 complete-night scenarios, 1,412/1,412 tests, lint 0 errors/11 existing warnings, production build, and diff check pass. Current production and GitHub main are the accepted LMS-0750 commit `ebe215ee2c085ec39c04053f24106c7104f50d0e`, READY deployment `dpl_7TCcZGcsr7Y8UMfsoBk2puvBHnbe`; retain it as the application rollback target.

Read-only preflight loaded the real Commissioner All Seasons dashboard (1,839 active members, 103 selected-scope teams, 16 roster assignments), Teams & Rosters (103 of 121 teams), Members (1,839 of 2,021), and PBCC Admin (one upcoming match with ten joined players). Ten PBCC operational tables were fingerprinted before deployment. Forty-three migrations are applied, latest `20260919112713`; all three scheduled jobs are active, succeeded most recently, and report zero failures over 24 hours. No schema or data migration is in this release. Start Session and Next Game both persist matches, and no read-only live-generation endpoint exists, so production acceptance must not invoke them against the real ten-player match.
