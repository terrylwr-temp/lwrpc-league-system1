# LMS-0722 additional cross-league boundary diagnosis

Exact reported question: `What kind of games will be played in the primetime league`.

Raw/effective question is unchanged; standalone, public rules/format intent, no live-data guard. The old matcher recognizes the word PrimeTime as league context but lacks the bounded “what kind of games” format intent. The corrected concept is `format`, league `primetime`, no division. The trusted source baseline is Rules **v20260907001227-e4d9bf77**, ID `e4d9bf77-e15e-4d80-84ba-2f7259970ba6`.

## Exact initial Stage 3 candidates

| Rank | Score | Rule/heading | Chunk |
|---:|---:|---|---|
| 1 | 0.4845 | PrimeTime DUPR League Key Dates | 950a54ab-aa3b-4f43-9c51-88ce0ca803ae |
| 2 | 0.4804 | 6.3 | 4b995b95-fdbb-420c-8c1b-5e4ed96d2ea1 |
| 3 | 0.4641 | PrimeTime DUPR League Divisions | 87733046-7616-43c1-909e-d9538fd6c5b3 |
| 4 | 0.4567 | Saturday League PrimeTime League | 471a928f-3197-4586-9520-6d2bc5ff7d3f |
| 5 | 0.4462 | 1 | e84c086d-03aa-4c0c-9683-79a6779e8d54 |
| 6 | 0.4272 | Saturday League PrimeTime League | b7e27441-a259-417e-8ffa-c7e75bf1c654 |
| 7 | 0.3886 | 6.2.3 | 5241048b-3490-4ef8-99af-59347ac40040 |
| 8 | 0.3727 | 6.3.4 | 1bffb661-5e6b-4a67-9c0b-03860016c4fc |
| 9 | 0.3713 | 21.A.3 | 8f8fdf7c-3bcc-4501-953a-6cceb1f5d60c |
| 10 | 0.3705 | 21.F.1 | 9d5ab0dd-453d-408d-8e92-d94d276470b4 |
| 11 | 0.3697 | 21.F.3 | 536619ca-b02e-454a-8fa3-d1f4cc8d8f94 |
| 12 | 0.3635 | 21.B.5 | b926746e-4004-4001-a20b-9c2664982b7e |

Full original and bounded-assisted RPC rows/ranks/component scores are in [current replay](lms-0722-current-replay.json). Original vectors are not saved. The [baseline artifact](lms-0722-cross-league-baseline.json) runs the accepted HEAD LMS-0721 selector on these current initial candidates. It selects **only** `471a928f-3197-4586-9520-6d2bc5ff7d3f`, rank 4/.4567, the malformed summary. This reproduces the selection boundary; the owner-reported generated hybrid is historical evidence, not a newly fabricated baseline model answer.

## Actual page/chunk boundaries

- Saturday's numbered section is 6.2, pp9–11; PrimeTime begins at 6.3 on p12 (`4b995b95-fdbb-420c-8c1b-5e4ed96d2ea1`). The p13 summary is a **multi-column table**, not a prose provision declaring shared league scope.
- PrimeTime p12 6.3.1 chunk `7d64b74d-6294-43da-bb5d-70d6350ddfe5` also contains sibling 6.3.2, which establishes the four-player requirement. It must be cited as 6.3.2 when that child is selected.
- PrimeTime p12 6.3.3 (`b630cf6e-d96d-4e78-9610-7f3c89546839`) says Round Robin, 2 out of 3 to 11 by 2, potential Picklebreaker 15 by 2 Rally. Its final sentence is cut after “game”; following chunks mistakenly have broad rule IDs `2` and `3` because game numbers look like rule starts. The correction does not cross that incompatible identity to invent end-switch/timeout details; only complete supported propositions survive.
- PrimeTime 6.3.6 starts p12 (`4babcc12-196a-44a6-b1e5-aa129c8411b6`) and continues p13 (`f9b4f86a-2cd2-4480-a007-b77b23f9ecea`) under the **same** stored identity. Its continuation contains the 15 by 2 Rally target, then begins 6.3.7 Forfeits. A same-rule continuation can be retained; the next numbered sibling must not be added.
- The p13 table's first header chunk `c8eb729d-b087-46bd-b714-ab0824051789` contains “Weekday League Weekday League (9.1).” The following chunk `471a928f-3197-4586-9520-6d2bc5ff7d3f` stores heading/section label **Saturday League PrimeTime League**, no rule identity, document scope `all`.

Its exact relevant rows include:

```text
Saturday League PrimeTime League
Players/Team 6 4 12 (6 Men / 6 Women) 4
Courts Required 3 2 4 2
Games/Player 3 4 + 2(E) + 1(PB) 3(G) + 1(MD) + 1(PB) 4 + 2(E) + 1(PB)
Games 15 by 1 2 out of 3 to 11 by 2 15 by 1 (Rally) 2 out of 3 to 11 by 2
Picklebreaker
(tiebreaker) N/A 15 by 2 (Rally) 25 by 2 (Rally) 15 by 2 (Rally)
```

The owner corrected the table values, but flattening still obscures column-to-league attribution. No processing change is necessary to answer from the separate numbered provisions.

## Exact failed boundaries

1. `leagueCompatible` previously inspected broad heading/scope text and accepted a candidate if **any** mentioned league matched. A document marked all leagues is not proof that every contained proposition applies everywhere.
2. The summary has no numbered/paragraph boundaries for its columns. Generic word coverage admits its `games` content as a whole, without binding each value to its table column.
3. The old selector's single selected source thus contains all four league/division formats. That source supplies ambiguous mixed content toward the answer model.
4. The old citation construction correctly reflects the **stored** heading, but the stored heading itself is not a truthful identity for the selected proposition. Since the selection has no reliable subrule, it becomes “Saturday League PrimeTime League — Page 13.” Cosmetic text replacement cannot fix the underlying evidence.

## Correction and comparison

The same shared scope/format capability fixes this with the player-count and Weekday 9.1 failures: recognize the requested format/count; bind numbered selected passages to verified nearest league/division ancestry; reject ambiguous flattened scope; retain the eight initial candidates and use the four existing authority slots for matching controlling scope; keep the .35 threshold and actual scores. Format assistance uses one existing-RPC `Match Format` projection, reusing the original vector. In this request the applicable 6.3.3 is assisted RPC rank 13/.4339, previously just outside the ordinary authority window. The bounded scope-aware handoff makes it available without admitting the table or increasing the 12-source review cap.

The corrected selected text is:

```text
6.3.3. Match Format: Teams play Round Robin. 2 out of 3 to 11 (win by 2). Plus, potential
Picklebreaker to 15 (win by 2 using Rally Scoring).
```

Source: **LWR Pickleball Club DUPR League Rules — Rule 6.3.3 — Match Format — Page 12**. The generated answer reports that format, no Saturday gender/mixed/game-count structure and no 25-point target. Evidence sent to the model is the selected text with verified source identity and passage scope; no summary table is included. [Full generated results](lms-0722-generated-benchmark.md).

Saturday paired questions select their own 6.2.3 passages and continuation, including 6.2.3.5 where appropriate. They do not inherit PrimeTime best-of-three or 65+ qualifications. Player-count variants distinguish match requirements from roster capacity.

An isolated adjoining-section control additionally puts numbered Saturday A and PrimeTime B inside one broad mixed-heading chunk and proves only the requested child is selected. This tests the user's general boundary principle, rather than only rejecting this production table's literal title.

**Acceptance:** all 12 mandatory scoped controls pass local corrected-pipeline generation/evidence/citation checks, with **Cross-League Leakage = 0**. Production acceptance remains pending authorized deployment and actual UI replay. No document/RPC/corpus change, hardcoded target or phrase blacklist was introduced.
