# LMS-0725 / 0.1.547 — league dates and compact Ask LWR help

**LOCAL CORRECTION COMPLETE — STOP FOR REVIEW. Not deployed; LMS-0725 is NOT production accepted.** The owner-confirmed new Rules upload is included in the final benchmark. View-As UI parity remains the next mandatory work only after AI cleanup production acceptance.

## 1. Exact start-date root cause

Both reported variants were interpreted without changing their wording, routed to official documents, and correctly identified as Weekday, but classified as unresolved rather than an official league-date question. Gender/category and the requested event were not represented. The existing bounded policy completion covered roster dates, ratings and scoring, but not season-start dates.

The second production trace (`4d889612-bd9b-4439-b4cb-82d55fa084db`) ranked the correct Weekday Important Dates chunk first at **.7569**; Stage 3 was sufficient. Generic applicability nevertheless rejected the bullet because its strict lexical/operative matching did not connect natural “starting date” / “league start” wording with “Season Starts” and the separately scoped heading. Stage 4 selected zero sources, returned `stage4_no_applicable_evidence`, and skipped generation and citation. This was retrieved-but-not-selected evidence, not missing official knowledge.

The first exact variant has the same locally reproduced pipeline failure. A separate production trace for that variant was not captured; the owner reported its production failure. [Before-correction traces](lms-0725-league-date-before.json), [captured production failure](lms-0725-league-date-production-failure.json).

## 2. Important Dates source structure

The active `2026 Fall League Important Dates` version remains `f811e60f-9af8-444f-b009-9594a530acd6`. It contains separate league headings and chronological bullet lists: Weekday and Saturday on page 1; PrimeTime on page 2. The relevant exact Weekday bullet is:

> • Oct. 14 (Women)/15(Men) – Weekday DUPR Season Starts

The source explicitly pairs Women with 14 and Men with 15. The league heading is a separate exact source range, retained as verified scope metadata. It is not concatenated onto the bullet as an invented quote. The Women's result uses the original bullet range **267–321** and heading range **0–29** in chunk `c4ab8544-decb-4ea1-b856-2df4a2d196f1`.

Unlabeled alternatives such as Dec. 2/3 remain alternatives; no gender or division assignment is inferred from their order. Weekday 9.1 has only the league-wide date schedule. Saturday explicitly separates DUPR7 from DUPR6/8. No required source-processing gap was found.

## 3. Correction and scope

- Added official league-date intent for season start/first league match, registration opening/closing, championship/playoffs and regular-season end. Existing roster-opening behavior remains intact.
- Preserved league, explicit gender/category and requested year. Ambiguous league questions receive signed clickable league clarification; another user's receipt cannot supply that context.
- Added Important Dates to the bounded current-source completion path for those intents. No reduced evidence threshold, date constants, fallback answer store or corpus rewrite.
- Selected exact date bullets and separate verified heading ranges. Calendar metadata is revalidated from active source content/title immediately before generation and retained in source snapshots.
- Kept a published date separate from actual roster release; selected unlock and notification conditions must both survive the answer.
- Kept date answers focused on the requested schedule. Optional venue/construction details must preserve tentative qualifications. Division answers identify a league-wide schedule when no separate division date exists.

Application files: `app/lib/aiLeagueDateFacts.js`, `aiLeagueDateEvidence.js`, `aiRequestIntent.js`, `aiPolicyEvidence.js`, `aiEvidenceExcerpts.js`, `aiAnswerGeneration.js`, `aiConversation.js`, `askLwrPlayerAnswer.js`; welcome files listed below. All paths are relative to `lwrpc-admin`.

## 4. Exact Women's Weekday results

Final current-source generated answers:

- `when does the women weekday dupr league start` → “The Women’s Weekday DUPR League season starts Oct. 14, 2026, for the 2026 Fall League.”
- `What is the starting date for the women's weekday dupr league` → “The women’s Weekday DUPR League season starts on Oct. 14, 2026, for the 2026 Fall League.”

Both cite **2026 Fall League Important Dates — Weekday DUPR League Key Dates — Page 1**, with exact validated source ranges. Both are permanent regression cases Q64/Q65.

## 5. Paired date controls

| Scope/event | Final supported date |
|---|---|
| Women's Weekday season start | Oct. 14, 2026 |
| Men's Weekday season start | Oct. 15, 2026 |
| Weekday / Weekday 9.1 | League-wide Women Oct. 14 / Men Oct. 15, 2026 |
| PrimeTime start | Oct. 16, 2026 |
| Saturday DUPR7 start | Oct. 17, 2026 |
| Saturday DUPR6 and DUPR8 start | Oct. 24, 2026 |
| Weekday / Saturday registration opens | Sept. 7, 2026 |
| PrimeTime registration closes | Oct. 4, 2026 |
| Weekday championships / regular-season end | Dec. 9/10 / Dec. 2/3, 2026 |
| PrimeTime championship / regular-season end | Dec. 11 / Dec. 4, 2026 |
| Saturday playoffs / regular-season end | Mar. 6/13 / Feb. 20/27, 2027 |

The Women's-league question without an identified league and the generic league-start question ask which league. An explicit Women's Weekday 2027 request correctly receives insufficient evidence; the current 2026 date is not substituted. League-wide first-match wording does not claim a checked individual-team fixture.

## 6. Expanded benchmark and run provenance

**89/89 routes; 68/68 generated answers reviewed passing.** The original 63 cases remain, including all 45 generated answers. Appended Q64–Q89 add 26 cases: 23 generated date answers, 2 expected clarifications and 1 expected wrong-year insufficient-evidence result. Overall there are 16 Live/protected no-model routes and 4 clarifications.

Final results combine the current-source full run's original 63 cases with the final date-only run's 26 cases. The last instruction change is conditional on `object=league_date`, which is false for every original case; the audit checks this explicitly. Therefore the final 45 existing answers use the same applicable generation instructions, selectors and active sources as the final application. This is not presented as one uninterrupted 68-call final run.

The runner exercises real intent, conversation clarification, selectors, exact-source gate and configured OpenAI generation using a saved current-source fixture. Ranking, database reads and signed URLs are fixtures. It is **not production HTTP/vector retrieval replay**, nor an end-to-end Live LMS authorization benchmark.

[89-case matrix](lms-0725-league-dates-final-matrix.md), [final audit and call ledger](lms-0725-league-dates-final-audit.json), [current full run](lms-0725-league-dates-current-full-model-results.json), [final date run](lms-0725-league-dates-current-dates-model-results.json).

### Intermediate findings retained

The owner intentionally uploaded Rules version `f0aad5ad-cf08-46c2-94fd-686ceb1271c0` during validation. The refreshed bounded fixture contains 109 chunks. The text diff adds a cover/contents representation and an age-eligibility paragraph; tested calendar/scoring provisions are unchanged. A newly included table-of-contents reference exposed a mechanics selector that matched a section name anywhere in a chunk. It now requires the actual Rally Scoring Rules heading; empty TOC selection is excluded without raising excerpt budgets. A permanent current-source regression covers this.

An intermediate Q21 answer omitted notification; the runner stopped. A shared selected-unlock qualification instruction corrected it. Final review found Q81 added venue information without its tentative construction qualification; the date-only instruction was tightened and Q81 plus all new dates rerun. These intermediate outputs remain in the call ledger; they are not counted as final passes.

There were **223 outbound request attempts in this local correction**, including **222 completed generated responses** and **1 sandbox/network failure with no model response**. This includes the pre-upload full run, source-refresh runs, stopped intermediate runs and targeted rechecks. Earlier corrections' 121 and 42 calls are separate. Only explicitly authorized bounded official excerpts were sent to the existing configured model, with `store:false`; no Live member data, credentials as prompt input, or original PDF uploads. Three earlier production acceptance questions are separate from this local ledger.

## 7–8. Evidence, dates and years

Every generated answer passed exact contiguous source-text checks and current-version source resolution before dispatch. Separate nonadjacent items and scope bindings remain separate. Forged text, altered scope and supplied fake date-period metadata are rejected or rederived. The shared strict source validator remains intact.

For the tested season, calendar 2026 comes from the verified active document title. Saturday's chronological December-to-January transition grounds 2027 for February/March; this derivation is explicit metadata, not a rewritten source quote or the current date. Ambiguous season-range titles and unordered month lists leave calendar year unknown. Explicit conflicting requested years do not borrow another season's answer.

In the **final observed answers**, review found cross-league leakage 0, accepted synthetic excerpts 0, incorrect grounded dates 0, incorrect grounded years 0, omitted material qualifications for the requested facts 0, and unsupported grounded answers 0. Date-only answers need not include unrelated logistics. These are bounded observed results, not guarantees about every future model response.

## 9–10. Compact welcome and supported Live help

Initial screen:

**How can I help?**

Ask me about LWR leagues, rules, important dates, scoring, DUPR, Match Setup, or your authorized LMS information.

**? What can I ask?**

The input precedes this small welcome block. Detailed examples live in shared `AskLwrWelcome.js`, using an accessible modal dialog. Three semantic groups contain all 12 requested examples: LWR leagues & rules, My LMS information, USA Pickleball rules. The Live group includes “Available information depends on your LMS role and what you're authorized to access.”

All four advertised Live reads map to implemented intents: SELF_RATING, SELF_TEAM, TEAM_ROSTER and NEXT_MATCH. No AI roster editing, score entry, messaging or profile mutations are advertised. Selecting an example closes help and submits the exact question through the existing handler. No copy/paste is required.

## 11. Desktop/mobile/accessibility

Real-component local browser tests passed at **1440px, 390px and 320px**. The input is initially visible without scrolling; no horizontal overflow. The help dialog is bounded and scrollable rather than permanently expanding the welcome. Tests cover keyboard activation, semantic dialog name/headings, all 12 example buttons, forward/reverse focus containment, 2px visible focus, accessible close, Escape closing only help, and focus returning to its trigger. The parent drawer ignores hidden dialog controls in its focus loop. No browser page/console errors occurred.

The browser fixture uses actual application components with synthetic local auth/responses; it sends no production requests. Accessibility verification covers DOM/keyboard behavior, not a manual screen-reader session or physical mobile keyboard/hardware.

[Browser results](lms-0725-welcome-browser-results.json), [390px initial screenshot](lms-0725-welcome-initial390.png), [320px help screenshot](lms-0725-welcome-help320.png).

## 12. View-As compatibility

The same compact component is used on the existing View-As Ask LWR screen. At 390px and 320px, the four exact Live examples were submitted through the real existing `ask` handler to `/api/view-as/read`, carrying only the existing `x-view-as-context` handle. No normal-session Authorization header, actor identity, role override or alternate permission path was added. The input remains visible; banner and Exit remain present.

[View-As browser results](lms-0725-welcome-viewas-results.json). This is a local transport/UI check with a synthetic player target and Commissioner actor, not a claim of new production role acceptance. Existing server-side target authorization, read-only mutation guards and dedicated-origin isolation are preserved and covered by the full existing tests. No View-As presentation parity work was started.

## 13. Required validation

- `npm test`: **857/857 pass**, including 31 new date/current-source tests and existing role/View-As/evidence/security coverage. [Log](lms-0725-league-dates-full-test.txt)
- `npm run lint`: pass, 0 errors / 10 pre-existing warnings. [Log](lms-0725-league-dates-lint.txt)
- `npx tsc --noEmit --incremental false`: pass. [Log](lms-0725-league-dates-typecheck.txt)
- `npm run verify:ai-pdf-server-bundle`: pass against final build. [Log](lms-0725-league-dates-pdf.txt)
- `npm run build`: pass. The initial sandbox attempt compiled but could not write the existing TypeScript cache; the authorized build outside that sandbox completed successfully. [Log](lms-0725-league-dates-build.txt)
- `git diff --check`: pass. [Log](lms-0725-league-dates-diff.txt)
- Current-source offline routing/source gate: 89 expected outcomes, including 68 valid generation dispatches. Final generated answers: 68 reviewed passes with the run provenance described above.
- Actual-component browser: all 12 examples at three widths, all four effective-user Live examples at both mobile widths; local synthetic responses only.

Two historical welcome-copy assertions were updated to the newly approved compact design. The new mechanics test fixture was corrected to include real chunk ordinals so it exercises continuation resolution; the final complete suite passes.

## 14. SQL and production state

**No SQL migration required.** No production SQL mutation, corpus reprocessing or Approved Answer was made by this correction. Only read-only diagnosis/integrity queries were issued. The owner’s separate Rules upload was explicitly confirmed and incorporated.

Approved Answer counts/hashes remain unchanged; the existing LMS-0725 migration is still applied once; View-As maintenance recorded 60 successes / 0 failures in the checked hour. The previous HTTP 500 history remains present. The earlier approved corrected deployment and three targeted production passes are documented separately in [production pause report](lms-0725-corrected-production-pause.md). New dates/help changes are **local only**.

## 15. Exact production continuation sequence after review

1. Obtain the owner’s instruction to deploy this reviewed local correction; the current instruction explicitly says STOP FOR REVIEW.
2. Revalidate active source versions/content and deployed baseline, migration-once state, Approved Answer integrity and View-As maintenance. Reconcile any further owner changes before using the benchmark snapshot.
3. Deploy the reviewed LMS-0725 / 0.1.547 code through the existing production pipeline; verify READY, normal and dedicated View-As aliases, and version. Apply no SQL or environment changes.
4. Recheck both exact Women's Weekday failures first, then the previously failed exact weekday roster-date question. Require supported dates, conditions and Important Dates citations; stop immediately on a material failure.
5. Replay all 89 benchmark cases in production, including the original 63 / 45 generated cases, all new league/date pairs, expected clarifications and wrong-year negative control. Record real HTTP outcomes, source resolution, date/year accuracy, latency and Stage 7 evidence.
6. Complete authenticated normal-user and effective-user Live/role boundaries, clickable clarification/context/reset, feedback, PDF/source viewing, 390px/320px keyboard/focus help, and View-As banner/Exit/mutation/isolation gates. Use existing acceptance authorization for bounded test feedback; do not mutate business records.
7. Verify final data/history/corpus/Approved Answer/HMAC metadata/maintenance integrity, distinguishing concurrent owner actions from test activity. Mark accepted only when all gates pass.
8. Only after LMS-0725 production acceptance, return to the recorded mandatory View-As parity correction: one existing LMS UI under normal or secure effective-user context, retaining the accepted security infrastructure and deleting obsolete parallel presentation after parity validation.
