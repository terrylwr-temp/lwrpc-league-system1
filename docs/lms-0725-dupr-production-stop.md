# LMS-0725 / 0.1.547 — DUPR limitation corrected; acceptance stopped at Q55

**Deployed, NOT PRODUCTION ACCEPTED.** September 8, 2026. The approved official-DUPR limitation correction passed its production retest. Acceptance then stopped at **Q55: “When is my Season DUPR established?”**, which incorrectly returned insufficient evidence. No correction or further acceptance question followed that failure. View-As UI parity remains deferred; LMS-0724 remains the last production-accepted release.

## Required report

1. **Root cause of omitted limitation.** The combined `ambiguous` / `choiceKind` formatter returned “Which rating and season do you mean?” before reaching the older `rating_clarification` message containing the official-DUPR limitation.

2. **Exact correction.** `runLive` now passes its resolved query to `liveMessage`. Generic SELF_RATING/PLAYER_RATING ambiguity with `rating: clarify` includes “Current official DUPR isn't available through this Live LMS lookup.” Existing combined choices remain unchanged. An exact unique typed option label now takes precedence over partial word matching: otherwise “Season DUPR” could match both its own label and the longer “PrimeTime Season DUPR” label. No SQL, authorization, model configuration or corpus change.

3. **Generic DUPR behavior.** Local regressions pass for “What's my DUPR?”, “What is my DUPR rating?”, “What is my rating on DUPR?” and “Can you tell me my DUPR?”. The exact production gate **What's my DUPR** passed with the limitation and four authorized rating/season combinations. No serial rating-then-season clarification was reintroduced.

4. **Explicit Season DUPR.** Local and production Q51 pass: supported Season DUPR proceeds to the required season choice without the unrelated official-DUPR limitation. The explicit 2026 Fall wording is also covered locally.

5. **Explicit PrimeTime Season DUPR.** Local and production Q52 pass: supported PrimeTime rating choices stay uncluttered and retain their distinct meaning.

6. **Current official DUPR.** Production Q53 and local current/official variants pass: capability unavailable, no substitution of a stored Season DUPR or PrimeTime value. No lookup is made for the unsupported official rating request.

7. **Authorized choices.** The correction formats choices already returned by the existing authorized lookup. It adds no choices, actor override or access scope. Local tests verify forged browser role/member fields are ignored and follow-up receipts remain bound to the effective target. Production showed the same four combined choices as before.

8. **Resolved question.** Production keyboard selection of Season DUPR / 2026 Fall displayed **What's my Season DUPR for the 2026 Fall Season?**, rather than “1” or an opaque button token. Local tests exercise opaque, numeric and exact typed selections and requery on each selection.

9. **Missing-data distinction.** Production selected response: **You don't currently have a Season DUPR recorded for 2026 Fall Season.** The substantive card did not repeat the unrelated capability limitation. Earlier clarification remains in conversation history by design. Local tests distinguish missing values, successful supported values, denied subjects and unavailable official DUPR.

10. **View-As behavior.** Local actual-component checks passed in normal and View-As modes at 1440px, 390px and 320px. View-As transport carried its effective-context header, with no normal Authorization header or actor override. Tests cover target-bound receipts, reauthorization and refetch. Full production View-As/effective-user/Exit/diagnostic acceptance was **NOT RUN** before the Q55 stop; local fixtures do not substitute for it.

11. **Zero model/embedding evidence.** The deterministic correction made zero local provider calls. Tests replace network fetch with a failing sentinel for rating follow-ups. Production Live outcome telemetry records model null, Stage 3 false, model skipped and SELF_RATING/self relationship. Q50 took 85 ms; selected missing-value lookup 66 ms; Q51 62 ms; Q52 65 ms; Q53 unsupported official rating 4 ms. These are recorded server totals; unavailable subdivisions are not invented. No rating choices or personal rating values were sent to the answer model by this workflow.

12. **Full local validation.** 94 focused tests and **882/882 full tests PASS**. Lint PASS with 10 existing warnings; typecheck, PDF server bundle verification, production build and diff checks PASS. Existing **99/99** routing/evidence preflight passes; ten new deterministic tests cover the required wording and state distinctions. Actual UI: limitation, combined buttons, keyboard selection, resolved question, missing data, New Question reset and no overflow/page errors pass at desktop/390/320 in both modes. Prior 78/78 generated-answer validation remains preserved: document generation was unaffected, so no unnecessary provider rerun was made. Prior 22 production answers were not repeated.

13. **Production retest/deployment.** READY deployment **dpl_4m9BT41z6J2fGpthJpmHYHo2VSyy**, URL [deployed application](https://lwrpc-admin-kimlznnvi-terry-lwrpc.vercel.app), READY at 17:36:57.160 UTC. Normal and View-As aliases verified. Version remains 0.1.547 / LMS-0725. First Q50 outcome **13d99089-dad8-4f60-8a73-277fb2193f64**, HTTP 200, correct limitation/choices. Selected follow-up **1763fc94-d8e6-436c-88bd-7c6ea093c1de**, HTTP 200, correct resolved/missing result.

14. **Remaining benchmark results.** Of the previously unrun 76 cases, **47 produced correct observed results, Q55 failed, and 28 remain unrun**. The corrected Q50 retest adds another pass; combined with the earlier 22 passes, cumulative answer/routing observations are **70 PASS / 1 FAIL / 28 NOT RUN**. These are not a completed production acceptance claim. Two otherwise-correct answers, Q23 and Q36, also have persistence gaps described below. Q04/Q05 were initially blocked by automatic review; after the owner's explicit confirmation they passed through normal authorized UI, returning the empty Artisan Lakes roster. No bypass was used. A later automatic-review timeout was retried once as permitted.

15. **Quality totals.** No wrong date/year, cross-league leakage, mechanics-as-applicability error or unsupported grounded answer was observed in completed answer checks. Q55 is **one known evidence-completeness failure**, so the required zero-failure gate is not met. This continuation observed 36 generated responses, of which 34 have persisted model outcomes; Q23/Q36 persistence failed. With the earlier 22 generated passes, 58 generated responses have been observed; one required generated case failed before model execution and 19 remain unrun. Exact-source/Q57/year controls still pending are not marked passed. Full production mobile/View-As, remaining privacy, source and broader acceptance requirements remain incomplete.

16. **Final status.** **LMS-0725 / 0.1.547 — NOT PRODUCTION ACCEPTED; STOP BEFORE CORRECTION.** The official-DUPR limitation correction is deployed and its production retest passed. Q55 and the newly observed persistence gaps require review. No additional correction, new version, SQL or View-As parity work was started.

## Q55 failure evidence

Question: **When is my Season DUPR established?**

Response: “I couldn't find an applicable rule or guide in the official LWR Pickleball Club or USA Pickleball materials. Please contact League Management for clarification.”

Immediately preceding Q54, **When is Season DUPR established?**, correctly returned Rule 4.1's communicated pre-match establishment date, remaining in effect for the season, plus **September 27, 2026** from Important Dates.

Q55 outcome **c4fa447f-9949-427d-8022-26b8b6b08ef8**, 18:00:10.119–18:00:16.551 UTC, HTTP 200, 6,432 ms. Standalone document route; raw/effective Live guards false. Stage 3 sufficient; Stage 4 `stage4_no_applicable_evidence`; zero selected sources; model skipped. Current Important Dates chunks ranked .7626, .7613 and .75. The authoritative corpus remains active and unchanged. The exact underlying selection defect has not been diagnosed or corrected in this stopped pass.

## Telemetry and integrity

All **50** acceptance HTTP requests (49 benchmark cases plus one selection follow-up) returned HTTP 200. **48** outcomes persisted. Q23 at 17:51:04 and Q36 at 17:56:29 logged `capture_failed` at persistence despite correct visible answers. These gaps were discovered in the final log reconciliation after Q55 stopped acceptance. They are preserved, not silently retried or backfilled.

At the final read-only checkpoint:

- Corpus unchanged: 7 documents, 25 versions, 1,893 chunks; full-row fingerprints match prior validation.
- Approved Answers unchanged: 1 answer, 2 revisions, 7 events.
- One existing LMS-0725 migration, no new migration or SQL mutation.
- Maintenance healthy: active every minute; 60 successes, 0 failures in prior hour.
- Members, ratings, roster rows, security functions and policies unchanged.
- All prior 256 outcome rows and 23 feedback rows unchanged, including the original HTTP 500. No feedback votes were submitted in this continuation.
- **Concurrent additions:** one team at 17:43:23.528 UTC and two role rows at 17:43:23.717/.917 UTC. Prior 94 teams and 164 role rows retain their exact baseline hashes. Counts are now 95 teams and 166 roles. This workflow performed no team/role mutations; the source of the concurrent additions was not independently identified.
- No environment/HMAC/model setting changed by this workflow. No secret bytes inspected.

Remaining benchmark IDs: **Q56, Q57, Q58–Q63, Q66–Q69, Q71, Q75–Q89**.

## Artifacts

- [Correction and local validation](lms-0725-dupr-limitation-correction.md)
- [Production deployment, Q55 trace and integrity](lms-0725-dupr-production-evidence.json)
- [Case/outcome correlation, including capture gaps](lms-0725-dupr-production-outcomes.json)
- [HTTP and persistence logs](lms-0725-dupr-production-http.txt)
- [Deployment log](lms-0725-dupr-deploy.txt)
- [Local benchmark preflight](lms-0725-dupr-preflight.json)
- [UI results](lms-0725-dupr-ui-results.json), [320px normal](lms-0725-dupr-normal-320.png), [320px View-As](lms-0725-dupr-view-as-320.png)
- [Prior 22 production passes and original acceptance requirements](lms-0725-final-production-stop.md)

The repository contains the intentionally pending release changes. No blanket reset, unrelated refactor, commit or rollback was performed.
