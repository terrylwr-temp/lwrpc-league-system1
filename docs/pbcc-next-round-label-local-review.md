# LMS-0753 / 0.1.576 — PBCC next-round label FAST FIX

## Reported behavior

After a PBCC match had started and at least one round existed, the Next Round workflow correctly opened the player/bye selection modal and generated another round. The modal heading and final confirmation button still said **Start Match**, which incorrectly described the action. The top-level action already said **Next Round**.

## Root cause and correction

`StartSessionModal` already receives `mode="initial"` or `mode="round"` and uses that state for player instructions and court/scoring controls. Its heading, idle confirmation label, and busy confirmation label did not use the mode consistently.

The scoped correction now shows:

- Initial workflow: **Start Match**, **Start and Generate First Game**, then **Starting...**
- Later-round workflow: **Create Next Round**, then **Creating Next Round...**

No scheduler, score validation, session, database, authorization, or PBCC write-path logic changed.

## Timing investigation

The two-court 9/10-player planner recalculates and validates the remaining balanced night against saved partner, court, bye, trio, and quartet history before a round is inserted. A local three-round synthetic benchmark measured planner-only time as follows:

| Players | Round 1 | Round 2 | Round 3 |
| --- | ---: | ---: | ---: |
| 9 | 2.96 s | 2.82 s | 2.93 s |
| 10 | 4.07 s | 3.91 s | 4.27 s |

Network, Supabase reads/writes, result rebuilding, activity logging, application refresh, and a Vercel cold start can add to those values. A several-second wait is therefore expected under the current balancing design. The label fix makes the in-progress operation explicit. No planner search limit or balancing standard was weakened.

## Local verification

- Focused next-round label test: **1/1 PASS**
- Protected 8/9/10-player two-court matrix: **12/12 PASS**
- Lint: **PASS — 0 errors, 11 existing warnings**
- Production build: **PASS**

Production deployment remains gated on the required signed-in normal LMS preflight.
