# LMS-0732 / 0.1.554 — local implementation review

2026-09-10. **LOCAL READY — STOP FOR PRODUCTION REVIEW.** Production remains accepted LMS-0731 / 0.1.553. No deployment authorized or performed. Governing design: [approved diagnosis](lms-0732-routing-diagnosis-design.md).

## 1. Exact changed files

Compared with the accepted LMS-0731 production upload, application changes are:

- `app/lib/aiRequestIntent.js`: shared bounded procedure/publication classification.
- `app/lib/aiRegistrationReleaseIntent.js` (new): operation, explicit league/season and conflict descriptors; unsupported registration-state contrast.
- `app/lib/liveLmsIntent.js`: protect unsupported registration state; document intent retains existing Live exemption.
- `app/lib/aiRegistrationEvidence.js` (new): complete, ordered, same-version registration excerpts.
- `app/lib/aiLeagueDateFacts.js`: publication event recognition.
- `app/lib/aiLeagueDateEvidence.js`: exact release selection, complete scope coverage and date/qualifier comparison.
- `app/lib/aiPolicyEvidence.js`: existing active-ready completion/selection integration.
- `app/lib/aiConversation.js`: bounded release choices, signed continuation, conflicting context and registration referent handling.
- `app/lib/aiAnswerGeneration.js`: procedure completeness and published-date wording instructions.
- `app/lib/version.js`, `package.json`, `package-lock.json`: LMS-0732 / 0.1.554.

Validation additions: `test/lms0732.test.mjs`, `test/fixtures/lms0732-documents.mjs`, `scripts/lms0732-generated.mjs`. Paths above are relative to `lwrpc-admin`. [Candidate hashes and exact baseline comparison](lms-0732-local-candidate.json). Documentation adds this report/candidate/generated ledger and updates the roadmap. No unrelated application file differs from the accepted upload as a result of this release.

## 2–3. Root-cause corrections

Registration procedures now receive document intent before “our team” plus “DUPR” can be mistaken for SELF_RATING. Unsupported registration state remains a protected operational request, not a procedure.

Schedule publication has its own semantic event and bounded Important Dates completion/selection. Generic questions compare the complete applicable event set rather than always asking for a league. A missing source does not silently become a common answer.

## 4–6. Context and clarification

Explicit PrimeTime, Weekday and Saturday survive routing. Explicit 2026 Fall and 26/27 Saturday Season remain in the original effective question and parsed season descriptor. Calendar selection verifies the requested year. Explicit Fall excludes unrelated Saturday season choices. Contradictory league/season wording requests clarification rather than selecting conflicting evidence.

The original PrimeTime/Fall registration question resolves without SELF_RATING, season clarification or Saturday options. A generic common procedure needs no invented league clarification. “How do I register it?” requires a valid previous registration subject or asks for the object. For differing future publication dates, signed clarification preserves the original season and permits only the applicable unresolved league options; unrelated options are rejected. No general conversation/authorization redesign.

## 7–8. Registration evidence and generated answer

Current verified Captains Guide `v20260908144326-816a2cd7`, pages 4–5. Selection requires a complete same-version registration section including payment, confirmation, activation and roster unlocking. No hardcoded source UUIDs or parallel procedure text in application logic.

The original-question generation passed with an ordered answer covering: registration-open notification; Club Leagues page; Register My Team; regular Club membership sign-in; quantity one/separate registrations; required team form; payment; confirmation email; League Management activation/Captain assignment; and waiting for roster-unlock notification. Both pages appear as official sources. [Exact generated answers and citations](lms-0732-generated.json).

## 9–12. Schedule evidence and answer

Current Important Dates `v20260904112405-f811e60f`, Weekday/Saturday page 1 and PrimeTime page 2, supplies “Oct. 7, Wednesday – Schedules completed and sent.” Only that event is selected, not neighboring registration/roster/start/end bullets.

Explicit generated answer: “The 2026 Fall PrimeTime DUPR League schedules are listed to be completed and sent on Wednesday, Oct. 7, 2026.” Generic generation names all three leagues and the same date, with all three official sources and no clarification. Weekday/Saturday/PrimeTime explicit-source selection is deterministic. No release time or actual published-state claim is added. BY qualifiers remain in exact source excerpts and participate in equality checks; differing qualifiers cannot silently become one common answer.

## 13. Document/Live contrasts

Registration how-to and publication timing remain official-document knowledge, using existing source provenance. SELF_RATING and NEXT_MATCH retain Live routes. Registration state and schedule-ready state remain unsupported where no current Live capability exists. “Who do we play first?” remains protected by the existing personal-schedule guard, not silently equated with next match. Schedule creation remains existing procedural/help handling. No personal record is needed or sent to the model for either corrected family.

## 14–16. Leakage results

Focused deterministic matrix: **Cross-League = 0, Cross-Season = 0, Cross-Intent = 0 failures observed.** This is bounded test evidence, not a claim of universal natural-language coverage. Controls exercise original phrases, explicit contexts, signed constrained choices, another-user receipt rejection, missing source/year, incomplete procedure, exact-range revalidation, qualifier differences, and Live contrasts. Other application and View-As authorization boundaries are unchanged.

## 17. Other date families

Retained diagnosis remains unchanged: registration close, roster opening, league start and season end already have dedicated selection paths; Captain meeting is unresolved. No bespoke handlers were added for these families. Their existing tests remain in the full regression suite. The shared correction does not generalize the no-league rule beyond schedule release.

## 18–20. Corpus, Approved Answers and SQL

No corpus edits/reprocessing/embedding changes. No Approved Answer creation, matching changes or lifecycle changes. No SQL, migration, role/grant/RLS change, or Live authorization expansion required or performed. The supplementary other-guide read was not retried.

## 21–22. Validation and generated scenarios

Required checks and final counts are recorded in the final validation section below. Four affected generations only: original PrimeTime registration; original generic send-out schedules; explicit PrimeTime/Fall release; Saturday 26/27 registration. All four passed source/completeness checks and were reviewed. The other original schedule question (“When will the schedules be done?”) passes exact event/source selection deterministically. No full generated benchmark.

## 23. Model usage and cost

Four provider responses, requested `gpt-5.5`, returned `gpt-5.5-2026-04-23`: **10,178 input tokens, 0 cached input, 602 output, 10,780 total; estimated $0.068950** at retained configured-model accounting rates. Category LOCAL_BENCHMARK. No embedding calls, production query traffic, or telemetry writes from this fixture generation harness.

The initial restricted-network attempt failed with `api_request_failure` before any provider response; no usage was returned. It is recorded separately from the four confirmed generations, and no billed usage is asserted for it. The authorized retry completed all four. The script refuses rerunning when its results file exists. No additional generation followed the final deterministic wording extension.

## 24. Normal LMS regression

No team, roster, schedule, match, Match Setup, score, standings, rating or role implementation changed. Existing normal workflow/security, implicit Player, Live records, View-As Captain-name/email exclusion, community policy and Approved Answer lifecycle tests remain in the full suite. No production normal-role or browser acceptance was performed during local-only work; no visual component changed. Production acceptance remains a separate approval gate.

## 25. Exact controlled production sequence — not executed

1. Owner reviews this local candidate and authorizes production separately. Freeze the exact upload manifest/hashes; preserve accepted LMS-0731 rollback deployment.
2. Read-only preflight checks current deployment/version, active source identities, candidate hashes and business/security integrity baseline. Stop on drift. No migration or corpus change.
3. Deploy only the reviewed candidate to the existing normal and isolated View-As application destinations according to the established release process.
4. Normal LMS FIRST: Commissioner smoke and legitimate normal Captain/Player checks of dashboards, team/roster, matches/schedules, Match Setup, standings and Ask LWR. No live business writes for testing. Stop on normal regression.
5. Business-integrity checkpoint, then targeted Ask LWR acceptance: original registration and release questions; explicit context and no unrelated clarification; document citations; zero-model Live contrasts. Use only separately approved targeted generations, not a full benchmark.
6. Check the same read-only shared experience under a valid effective-user View-As context, including retained schedule Captain-name/email isolation. Verify original administrator context remains intact; exit test context.
7. Review errors, usage and final integrity; report acceptance or stop with the exact failure. No automatic production corrections or unrelated work.

## Final validation

Final `npm test`: **1117/1117 PASS**, zero failures/skips (includes the new fixture module and 26 focused test cases). `npm run lint`: PASS, zero errors/11 existing warnings. `npx tsc --noEmit --incremental false`: PASS. `npm run verify:ai-pdf-server-bundle`: PASS. `npm run build`: PASS. `git diff --check`: PASS; line-ending advisory messages only. Four affected generated scenarios PASS, no full model benchmark. Final local log files are under `.local-validation/lms0732-*`.

Initial build cache EPERM was resolved by an authorized local build retry. The final build and standalone type check both pass. Exact candidate hashes were compared with the accepted frozen production upload; all changes are listed above. **Ready for owner production review, not production accepted.**
