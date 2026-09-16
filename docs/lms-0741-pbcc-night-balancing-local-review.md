# LMS-0741 / 0.1.563 — PBCC nightly balancing local review

Status: LOCAL ONLY, NOT DEPLOYED. Owner approved unique partners as a hard rule, closest court splits, avoiding consecutive triples/quartets where feasible, and minimizing repeated pairs with particular emphasis on spacing. No production session, assignment, score, roster, notification or configuration was changed. No SQL, schema, grants or authorization change.

## What changed

The normal two-court scheduler for eight/nine selected players now plans the remaining night jointly. It enumerates valid next-round partitions and partner pairings, keeps a bounded beam of continuations, exhaustively considers court orientations for surviving plans, and improves spacing with a deterministic seeded search. Independent circle and binary pairing constructions supply additional unique-partner seeds for fresh nights. These constructions use positions/IDs, never specific member names.

The search cannot introduce repeated partners: initial choices reject used pairs; subsequent improvements only regroup existing teams or reorder future rounds, preserving every partnership. Search exhaustion returns an actionable error rather than silently allowing repeats. The error says no continuation was found within the limit; it does not claim an exhaustive impossibility proof.

Court assignments are optimized over the whole continuation. The objective penalizes consecutive groups of four/three across ANY court number, excess court imbalance beyond the nearest integer split, repeated pairs across three playing appearances, adjacent pair exposure and cumulative group exposure. The additional emphasis on group streaks follows the owner's clarification. Pairs/triples/quartets are counted explicitly. Byes retain last and penultimate played groups rather than clearing history.

History is built from full saved teams before considering current availability. Former/omitted participants no longer cause an entire past court to be discarded. Saved records and bye metadata are deduplicated. Explicit not_played games consume no partner/group/court exposure; their round numbers remain occupied. Other saved assignments, including pending ones without scores, reserve their partnerships so generation cannot duplicate them. Planned byes are balanced by current-night counts.

A verified saved-game prefix retains the deterministic whole-night continuation, avoiding repeated replanning that could abandon a good court split. Changed participants, manual assignments, or not-played games invalidate that shortcut and replan against actual saved history. No completed game is rewritten. Normal default remains six rounds; the configured default/planned horizon supports seven, and Next Game can extend the night subject to unique-partner feasibility.

The new planner is confined to eight/nine players on two courts. One-court, larger-roster and season-history/ladder paths retain the previous scheduler. Batch ladder generation explicitly bypasses this planner. Generation responses include quality diagnostics; Admin/Host match-start/next-round notices explain partner, court and group results without promising impossible pair separation.

## Measured target-case results

Synthetic IDs only. Both batch generation and game-by-game replay are checked.

| Players | Night rounds | Court split per player | Repeated partners | Consecutive trio/quartet | Maximum same-court pair games |
|---|---|---|---|---|---|
| 8 | 6 | 3/3 | 0 | 0 | 4 |
| 8 | 7 | 4/3 | 0 | 0 | 5 |
| 9 | 6 | 3/2 after a bye; otherwise 3/3 | 0 | 0 | 4 |
| 9 | 7 | 3/3 after a bye; otherwise 4/3 | 0 | 0 | 4 |

Nine-player plans give six/seven distinct players one bye; nobody receives two. Eight-player plans avoid pair streaks across three playing appearances in the measured cases. The final nine-player six-round plan also avoids those streaks; the seven-round plan has one such player-exposure exception across a bye. These are observed synthetic results, not claims of global optimality for arbitrary edited history.

The old eight-player preset repeated two entire quartets across rounds 1->2, 3->4 and 5->6. The old nine-player six-round design allowed two players a 4/2 court split and consecutive trios. Improved group/court spacing can increase cumulative opponent/co-court counts: the old nine-player six-round pair cap was three; the new plan allows four. The old opponent-count control is explicitly superseded by the approved court/group-spacing priorities, not silently claimed to remain unchanged. The verification script reports those counts and enforces the stronger court/adjacent-group controls for six AND seven rounds.

## Limits and safety

A literal half-night limit and zero adjacent pair overlap cannot all be guaranteed (see the design review). Seven appearances require 4/3 court use. With eight players, some same-court pair overlap between adjacent rounds is unavoidable. With perfect six-game 3/3 court splits, a pair cap of three cannot accommodate eight players. This candidate minimizes pair streaks but does not claim that every recurring pair is separated by a game or appears together at most half the night.

The search is deterministic and bounded, not a proof of optimality. Arbitrary prior assignments or attendance changes may leave imperfect court/group balance or no continuation found. The response discloses remaining group/court exceptions; partners are never silently relaxed. Planning typically takes a few seconds locally for the target cases. No production latency or live-session acceptance is claimed.

Existing API transaction/concurrency behavior is unchanged. In particular, initial Start Session may save attendance before generation; this candidate does not redesign that flow. No production fixture session was created to test it.

## Verification and release boundary

Eleven new tests cover all four target cases and prefix continuation, bye/omitted-player history, duplicate records/byes, explicit not-played games, edited history, immutable inputs, exhausted partnerships, cancelled-game extension, invalid IDs and scope controls. A separate script replays all eight batch/sequential scenarios. Full test/lint/build results are recorded below once final checks complete.

Base: ed44777 (LMS-0740 / 0.1.562). Keep local for review. Scheduling changes are excluded from automatic FAST FIX deployment. Any later production acceptance must be read-only against existing sessions or use specifically authorized fixtures; never generate real matches or send notifications merely for acceptance. Application rollback does not undo administrator-created assignments.

## Final verification evidence

- Full automated suite after final spacing weights: 1,306/1,306 passed.
- Final focused scheduler suite: 11/11 passed, including added six-to-seven extension assertions for both roster sizes.
- Complete-night replay: 8/8 batch/sequential scenarios passed (8/9 players x 6/7 games x both modes).
- Production build: passed. Diff whitespace check: passed.
- ESLint reported 0 errors and the same 11 existing warnings. The final shell process terminated abnormally after printing that result; a standalone confirmation is being retained before marking the lint gate complete.

Evidence files: .local-validation/pbcc-night-all-tests-final.log, pbcc-night-focused-final.log, pbcc-night-sequential-final.log, pbcc-night-build-release.log, pbcc-night-lint-release.log and pbcc-night-lint-confirmed.log. The additional spacing experiment used only synthetic IDs and was not deployed.

Standalone lint confirmation completed with exit 0: 0 errors, 11 pre-existing warnings. All local verification gates above are complete. Ready for owner review; NOT DEPLOYED or production accepted.
