# LMS-0725 / 0.1.547 — corrected production acceptance stopped

**Deployed; NOT PRODUCTION ACCEPTED. September 8, 2026.** Acceptance stopped at the required DUPR clarification qualification. No correction, redeployment, SQL or further acceptance questions followed the failure. LMS-0724 / 0.1.546 remains the last production-accepted baseline. View-As UI parity remains deferred.

## Stop reason

Exact question: **What's my DUPR**

Production displayed **Which rating and season do you mean?** and four combined choices: PrimeTime Season DUPR / Season DUPR for 2026 Fall Season and 26/27 Saturday Season. It did **not** display the required explanation that current official DUPR is unavailable through this Live lookup. This fails approval gate 16, although the Live route and combined choices worked.

Outcome: `889692bc-ea61-482d-853f-2976f34edf9f`, 17:19:19.521–17:19:19.563 UTC, HTTP 200, 42 ms, SELF_RATING / self / ambiguous, no model, Stage 3 not invoked. No rating value or personal DOB was returned.

Read-only code inspection identifies the early `ambiguous && choiceKind` return in `liveMessage` in `lwrpc-admin/app/lib/liveLmsIntent.js`. It returns only the combined-choice question, bypassing the official-DUPR limitation in the older `rating_clarification` message. **No code correction applied.** Proposed bounded correction for review: retain the combined choices and add the required limitation specifically for combined rating/season clarification; preserve all authorization, other ambiguity wording, and model boundaries. Add coverage for that actual combined branch and replay the production gate before resuming acceptance.

## Required 27-item report

| # | Area | Actual result |
|---|---|---|
| 1 | Deployment | READY `dpl_6ajhMvN7dTuRaZXJaDP3RrPM92dL`, September 8 at 17:09:36.497 UTC. Normal and View-As production aliases point to it. Package 0.1.547; telemetry LMS-0725. |
| 2 | Roster-date replays | Q07 and Q08 PASS: Sept. 28, 2026, with registration/setup, League Management activation, captain assignment, unlock and notification qualifications. Q07 HTTP 200, correct Weekday evidence. Help example Q09 also PASS. |
| 3 | Women's Weekday dates | Q64 and Q65 PASS: Oct. 14, 2026, current Important Dates / Weekday scope. |
| 4 | Paired league dates | Q70 Men Oct. 15; Q72 Weekday 9.1 explicitly uses league-wide Women Oct. 14 / Men Oct. 15 rather than claiming a separate division date; Q73 PrimeTime Oct. 16; Q74 Saturday DUPR7 Oct. 17 and DUPR6/8 Oct. 24. All 2026 and correct sources. Additional variants/year controls NOT RUN. |
| 5 | Rally applicability | Q30 PASS: Rule 5.3 Standard default; narrow Weekday 9.1 Picklebreaker exception at a 2–2 tie, game to 15 by 2. Q35 PASS, without promoting Rally to all Weekday 9.1 games. |
| 6 | Rally mechanics | Q45 PASS: serving/receiving scoring, side-out, server/side rules, freeze/unfreeze and serving requirement for the game-winning point retained. |
| 7 | Compact welcome | PASS observed on deployed app: concise “How can I help?” copy, prominent input, no permanently expanded examples. |
| 8 | Help dialog | PASS observed: grouped LWR, My LMS information and USA Pickleball examples; role/authorization qualification; semantic headings and accessible close button. |
| 9 | Clickable examples | One representative roster example PASS: closes dialog and submits exact “When can I start entering my roster?” through existing interaction. Other representative categories NOT RUN. |
| 10 | Live discoverability | PASS observed help lists Season DUPR, team, roster and next-match examples with role/access qualification. No advertised mutation. |
| 11 | DUPR clarification | **FAIL required official-DUPR limitation**. Combined button choices and natural wording appear; required limitation omitted. Acceptance stopped here. |
| 12 | Resolved question / missing data / reset | NOT RUN after stop. New Question used successfully between standalone tests, but pending-clarification reset and resolved/missing-data acceptance remain unverified in this deployment. |
| 13 | Exact evidence / Q57 | Q07 and Q90 persisted source ranges verified against the current source fixture. Q90 keeps age threshold [27,160) and age-reference policy [656,950) separate; PrimeTime heading binding [0,26) remains metadata. Q57 production replay NOT RUN. |
| 14 | Date/year accuracy | No incorrect date/year observed in the 22 generated answers. All ten added Q90–Q99 controls PASS, including the exact owner failure, eight natural eligibility variants and event/reference pair. Remaining historical year controls NOT RUN. |
| 15 | Expanded benchmark | Local 99/99 PASS. Production: 23 cases attempted, 22 observed-answer passes, Q50 required clarification qualification FAIL, 76 NOT RUN. Original 89 are retained; no full production pass claimed. |
| 16 | Generated answers | Local full run 78/78 PASS. Production 22/78 generated cases completed and reviewed; 56 NOT RUN. |
| 17 | Quality totals | Observed generated subset: zero wrong dates/years, cross-league leakage, mechanics-as-applicability errors or unsupported grounded answers. Exact-range checks on Q07/Q90 found no synthetic excerpt. One required clarification qualification omission. Full-benchmark zero-error totals NOT established. |
| 18 | View-As compatibility | NOT RUN in this production acceptance before stop. No View-As context created or parity work performed. Previous local verification is not substituted for this gate. |
| 19 | Desktop/mobile/accessibility | Default signed-in production viewport: compact screen, semantic help, accessible close, keyboard Enter, Escape and focus return verified. Production 390px/320px and remaining focus/tap-target/clarification checks NOT RUN. Prior local checks passed; viewport capability discovered but no override applied. |
| 20 | Performance | Q07 5,526 ms; Q08 3,505; Q64 2,845; Q65 3,582; Q30 3,046; Q45 4,243; Q90 4,189; Q50 clarification 42. These are server outcome totals. Routing/evidence/validation/model/citation subdivisions are unavailable; no invented timings. Substantive Live SELF timing NOT RUN. |
| 21 | LMS-0724 regression | Maintenance active every minute, 60 successes / 0 failures in previous hour at 17:21 UTC; security-function and policy fingerprints unchanged. Focused View-As read-only/Exit/effective-user/diagnostic UI gates NOT RUN. |
| 22 | LMS-0723 regression | Existing user-role/identity-link rows unchanged. Q50 Live SELF clarification has model null, model skipped, Stage 3 false. Remaining SELF value, missing data, explicit-person and contact-denial tests NOT RUN. |
| 23 | LMS-0722 regression | Weekday 9.1 and Rally winning-point controls PASS. PrimeTime/Saturday player count, Saturday mixed-only, website, password help and document navigation NOT RUN. |
| 24 | Telemetry/privacy | All 23 requests HTTP 200 with successful quality capture. 22 document-generated outcomes and one deterministic Live clarification. Two intentional Helpful votes on Q07/Q90 persisted correlated source ranges. No agent retrieval of DOB/personal Live values for age questions. No full remaining privacy benchmark claimed. |
| 25 | Integrity | Corpus, Approved Answers/revisions/events, business rows, roles/identity links, security functions and policies unchanged. Prior 233 outcomes and 21 feedback rows match pre-deploy hashes. Original HTTP 500 row unchanged. Exactly one LMS-0725 migration; none added. HMAC environment metadata consistent; no key read/change or byte comparison. |
| 26 | Limitations | Acceptance stopped on the required qualification omission; remaining tests are explicitly NOT RUN. Local model fixture validation is not production retrieval validation. No independent normal-player session or completed production mobile/View-As testing claimed. |
| 27 | Final status | **LMS-0725 / 0.1.547 — NOT PRODUCTION ACCEPTED; STOP BEFORE CORRECTION.** Next mandatory View-As real-LMS UI parity/removal work remains deferred until acceptance. No new version started. |

## PrimeTime correction and validation

The corrected implementation separates eligibility reference dates from event dates, roster dates and deadlines. It selects current Rule 6.3 from Rules version `f0aad5ad-cf08-46c2-94fd-686ceb1271c0`, chunk `78cab232-56b4-454f-aa08-76151dab4bf5`, page 12. December 31 and age 65 come from source evidence, not application constants. The exact production answer preserved “December 31 of the current calendar year” and eligibility before the season-start birthday. The hypothetical December birthday case answered conditionally and did not perform a DOB lookup.

All ten added controls passed in production: Q90–Q97 age variants, Q98 PrimeTime event start Oct. 16, 2026, and Q99 age-reference date. All nine age-policy answers cited Rule 6.3, page 12; the event control cited Important Dates. Local age correction: 99 cases, 78 generated answers, 872 tests, lint/typecheck/PDF/build/diff checks PASS. Lint has 10 pre-existing warnings. Model ledger: **79 local calls in this age correction** (one exact replay plus 78 full-run calls), plus **22 production answer-model calls** in this deployment acceptance. Earlier validation ledgers remain separate. No model was called for Q50 Live clarification.

## Evidence and integrity

- [Local correction](lms-0725-age-reference-correction.md), [full local generated validation](lms-0725-age-reference-full-model-results.json).
- [Deployment, all 23 outcome IDs/timings, stop detail and final fingerprints](lms-0725-final-production-stop-evidence.json).
- [All production HTTP request logs](lms-0725-final-production-http.txt).
- [First roster answer and exact source ranges](lms-0725-final-Q07-production.json).
- [Exact age answer and source ranges](lms-0725-final-age-production.json).
- [Preflight](lms-0725-final-preflight.json), [business/history baseline](lms-0725-final-business-before.json), [production environment metadata](lms-0725-final-production-env-metadata.txt).

Final corpus counts/hashes match preflight: 7 documents, 25 versions, 1,893 chunks; Approved Answers 1 answer, 2 revisions, 7 events. Business unchanged: 1,951 members, 94 teams, 1,012 ratings, zero roster rows, 164 role rows. Historical 233 outcome rows and 21 feedback rows remain byte-equivalent under ordered full-row JSON fingerprints. Final totals are 256 outcomes and 23 feedback rows: exactly the 23 acceptance requests and two intentional votes. Original failed outcome `f3d73d4a-f89b-4ed1-aad8-bdd3dc6a18c7` fingerprint remains `ef951d614d6ffc7f0ae49220f7638b6b`.

Deployment uploaded the reviewed dirty workspace from repository root. Vercel's old Git commit metadata is not an identifier for these uploaded changes. No rollback or additional production mutation was performed after the stop.
