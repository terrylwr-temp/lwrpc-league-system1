# PBCC nightly partner/group/court balancing — diagnosis and design review

2026-09-16. Local synthetic diagnosis only. No PBCC application changes, production schedule edits, notifications or deployment. Existing local LMS-0740 ratings candidate is unrelated and remains untouched.

## Confirmed defects

app/lib/roundRobinSchedule.js uses fixed six-round designs for eight/nine players. A successful preset bypasses dynamic court balancing. Its validation checks partner/opponent history but not group adjacency or court history. The eight-player preset repeats both complete groups across rounds 1->2, 3->4 and 5->6, sometimes moving them to the other numbered court. Changing court numbers does not change group identity.

Synthetic baseline six-round results: eight players have unique partners and perfect 3/3 court counts, but six repeated consecutive quartets and some pairs together four times. Nine players have unique partners and unique byes, but two consecutive triple overlaps and two players with 4/2 court counts. Seventh rounds leave the fixed design and use randomized fallback; one observed replay had shared-court pairs five times for eight players, and multiple 4/2 court splits for nine. Seven-round figures are observed outcomes, not deterministic guarantees.

The fallback retries unique-partner construction then silently relaxes the all-history prohibition. Triple clusters are approximated by pair costs rather than counted explicitly. Court-assignment overlap compares same numbered courts, which misses moving an entire group to another court. Current tests only exercise six rounds and permit shared-court pairs four times (eight players) and court imbalance two (nine players).

## History weaknesses

Next-round code rebuilds history from saved matches, which is the right basis, but maps participants to the currently selected roster before requiring two complete teams. If a former participant is now omitted/on a manual bye, a historical court involving that person can be discarded, losing the remaining participants' partner/group/court history. History should first be normalized against the whole night's identity set, with availability applied only when choosing the next round.

History arrays are concatenated without deduplication. Bye counters count occurrences per record rather than distinct session/round/player. Not-played status is not distinguished. Last-game group identity should be retained per player through a bye, alongside previous session-round adjacency. Official saved participants should drive history; scores are not required to know that a played game occurred. Pending versus explicitly not-played assignments need distinct treatment so scheduling does not count an unplayed matchup as a played exposure.

## Mathematical conflicts requiring agreed priorities

Seven games on two courts cannot be at most half on either court: closest is 4/3. A five-game player after a bye needs 3/2. Court targets should use each player's actual appearances, not count a bye as a court assignment.

For eight players on two full courts, avoiding every repeated same-court pair in consecutive games is impossible: each old group of four must split between two new groups, and some pair remains together. Repeated partnerships are a different constraint and can be avoided for up to seven games from a clean eight-player start.

Even six-round perfect 3/3 court balance conflicts with keeping every same-court pair together at most three times. Each player would need a distinct six-bit court pattern of weight three. Pair co-presence <=3 requires Hamming distance >=4. Exhaustive enumeration of all 20 patterns yields maximum compatible set size four, not eight. Thus pair-group repetition must sometimes exceed half even with perfect court-number balance. Do not advertise mutually impossible guarantees.

## Proposed bounded implementation

1. Keep actual past assignments fixed. Normalize/deduplicate all current-night players/matches first; preserve partner pairs, court counts, pair/triple/quartet groups, bye counts and each player's last played group. Apply current availability afterward.
2. Plan the remaining six/seven-round horizon jointly, not only a greedy next game. Use stable player IDs, explicit court identities and a deterministic bounded search with measurable results. Preserve manual byes and re-plan only future assignments after attendance changes.
3. Treat no repeated nightly partner as a hard constraint. If past edits/exhaustion make it infeasible, return a specific conflict; never silently repeat partners. Distinguish search-limit exhaustion from proven infeasibility.
4. Rotate byes fairly. Optimize per-player court targets (3/3, 4/3, or 3/2 according to appearances) and reject avoidable consecutive triples/quartets across any court number, including a returning player's last played game.
5. Count pairs/triples/quartets explicitly. Minimize unavoidable pair adjacency and excessive group exposure after higher priorities; report remaining exceptions honestly. The relative priority of exact court balance versus group diversity must be confirmed because both cannot always be absolute.
6. Keep normal/larger rosters and ladder mode isolated from the bounded two-court change. No database/security changes expected. Show an assignment-quality summary before saving. Do not regenerate completed games or send messages during acceptance.

## Required controls

Eight/nine players x six/seven rounds; batch and next-game modes; reordered names/IDs; automatic/manual bye and return; dropped/late player; edited prior partner/court; duplicate history; history without scores; explicitly not-played games; impossible partner continuation; search budget; no mutation of supplied history; court-name/number mapping; larger roster and ladder regression. Count every pair/triple/quartet across all courts, not only repeated court numbers. Record full-night metrics and remaining exceptions.

Evidence: .local-validation/pbcc-night-audit.mjs and its output. Implementation awaits resolution of constraint priorities. This is scheduling behavior, outside automatic FAST FIX authorization. Production deployment or schedule writes are not part of this diagnosis.

## Approved implementation follow-up

Owner confirmed priorities and emphasized breaking up consecutive court groups and spacing recurring pairs. Implemented locally as LMS-0741 / 0.1.563; see docs/lms-0741-pbcc-night-balancing-local-review.md for the algorithm, measured results and explicit limitations. No production deployment or schedule mutation.
