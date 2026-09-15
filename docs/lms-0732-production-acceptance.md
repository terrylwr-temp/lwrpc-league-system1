# LMS-0732 / 0.1.554 — production acceptance

2026-09-10. **PRODUCTION ACCEPTED.** Owner-authorized exact application candidate deployed; normal LMS gates preceded targeted Ask LWR acceptance. No next release started.

## 1. Deployment

READY: `dpl_414rqyGtFAFrcQ6JNRTVH9Qs2cGU`, aliased to league.lwrpickleballclub.com and view-as.lwrpickleballclub.com. [Exact upload manifest](lms-0732-production-manifest.json), [reviewed candidate](lms-0732-local-candidate.json). Ten existing application files and two new runtime helpers changed relative to the accepted staged baseline. No migration, schema, RLS/grant, corpus, Approved Answer or Live authorization change. Rollback reference remains accepted LMS-0731 `dpl_DKqa65yCcNr7E12VBw6Tb6uaFJca`.

## 2. Normal LMS smoke

PASS: Commissioner dashboard, Teams, roster display/Add Player control, schedules, standings, compact Ask LWR and valid Member Detail View As User entry. Owner reported PASS after READY/reload for normal Captain Dashboard, team/roster, Match Setup where available, schedules/matches, standings and opening Ask LWR. Checks made no operational writes. Current empty rosters/matches limit populated production workflow coverage. Normal checkpoint business fingerprints matched before Ask LWR testing.

## 3–6. Registration acceptance

All four required contextual questions PASS, with official ordered registration instructions and no unrelated clarification:

| Exact question | Result |
| --- | --- |
| I'm trying to sign up our team for the 2026 Fall PrimeTime DUPR league. Will you send me step-by-step instructions? | Normal Ask LWR panel: procedure, PrimeTime and 2026 Fall preserved; no SELF_RATING, season prompt or Saturday choice. |
| How do I register my PrimeTime team for 2026 Fall? | PrimeTime/Fall retained; complete procedure. |
| What do I need to do to register a Weekday team for 2026 Fall? | Weekday/Fall retained; no PrimeTime/Saturday leakage. |
| How do I register a Saturday team for the 26/27 Saturday Season? | Saturday/26–27 retained; no unrelated Fall context. |

Answers covered notification, Club Leagues page, Register My Team, Club membership sign-in, quantity one/separate team registrations, required team form, payment, confirmation, League Management activation/Captain assignment and roster unlocking. Generic “How do I register my team?” also returned this procedure.

## 7. SELF-rating contrast

“What is my PrimeTime Season DUPR for the 2026 Fall Season?” remained **LIVE LMS DATA / SELF RATING**, zero answer-model/embedding calls. It returned the existing “Which season do you mean?” prompt. This unchanged baseline behavior is a limitation, not new registration capture.

## 8–11. Schedule-release acceptance

All required questions returned Wednesday, October 7, 2026, supported by the current “Schedules completed and sent” event:

| Exact question | Result |
| --- | --- |
| When will you send out the schedules? | PASS; all three applicable league events, no clarification. |
| When will the schedules be done? | PASS; same date/evidence. |
| When are schedules coming out? | PASS; common date, no league prompt. |
| When will the 2026 Fall PrimeTime schedules be released? | PASS; PrimeTime-only selected evidence; Fall retained; no Saturday choice. |
| When will schedules be released? | PASS; official document route, common date. |

No release time, actual current team-schedule status or unsupported BY qualifier was added.

## 12–13. Evidence and citations

Registration: Captains Guide `v20260908144326-816a2cd7`, pages 4–5, chunks `ba65d436-5d3d-431a-b320-1dd78e472c2d` and `a951f671-8566-4b6a-b630-8474e5b302e9`. Production also selected the same active guide’s searchable page 6 login continuation (`dd257e75-fc96-4f11-856e-ac5b5f55a061`). Its exact text was read-only verified and supports the supplemental login/Forgot Password instructions; required pages 4–5 remained included.

Schedule: Important Dates `v20260904112405-f811e60f`; Weekday page 1 `c4ab8544-decb-4ea1-b856-2df4a2d196f1`, Saturday page 1 `f9f05921-2ee9-46fc-9b44-e5a861d7dd6f`, PrimeTime page 2 `950a54ab-aa3b-4f43-9c51-88ce0ca803ae`. Exact retained event: “Oct. 7, Wednesday – Schedules completed and sent.” Explicit PrimeTime selected only its applicable event. All seven active document versions remain unchanged and ready. Signed citation URLs are not retained in this report.

## 14. Source classifications and contrasts

Registration and schedule release: **OFFICIAL RULES** (existing official-document badge). Neither family invoked Approved Answer retrieval. SELF rating, next match, schedule state and team record retained **LIVE LMS DATA**, with zero model/embedding calls.

“Is my team's schedule ready?” → UNSUPPORTED, “That live lookup is not supported yet. No personal data was retrieved.” “What is my next match?” → NEXT MATCH, existing “Which team do you mean?” clarification. These did not return Important Dates publication answers.

## 15–17. Leakage

**Cross-League = 0; Cross-Season = 0; Cross-Intent = 0 observed failures** in this bounded acceptance set and accepted deterministic controls. This does not assert universal coverage of all possible language.

## 18. LMS-0731 regression

“Can my sub be outside the DUPR range?” → correct **No**, applicable Season DUPR/division requirements preserved, substitute status does not waive eligibility, NR qualification preserved. Existing active Substitute Player Eligibility revision `bdccf8d7-340f-48bb-a50e-6531943f3282` selected and cited. No new revision or lifecycle mutation.

## 19. LMS-0730 regression

Accepted deterministic/minimal evidence retained: View-As schedule-name implementation and security objects unchanged from accepted production; normal MPT 7 team list displayed existing Captain names; valid View-As entry remains visible. No fresh isolated View-As context was started for this application-only routing acceptance. Prior populated/mobile/privacy/Exit acceptance remains applicable; no full parity suite rerun.

## 20. LMS-0729 regression

“What is our team's record?” → TEAM RECORD with no applicable linked team, zero model/embedding calls. Implicit Player identity and rank-deferred behavior remain covered by the accepted 1,117-test suite and unchanged identity/record/authorization implementation. No new personal facts or rank were invented.

## 21. Model calls, tokens and cost

Production acceptance: **11 answer-model calls**, requested GPT-5.5, returned `gpt-5.5-2026-04-23`; **31,617 input + 1,968 output = 33,585 tokens**; estimated generation cost **$0.217125**. Ten manager-console generations plus the original registration player-panel request at 12:53:01 UTC. Four additional Live controls used zero answer-model/embedding calls. No full benchmark.

Cached-token counts were unavailable in retained production numeric telemetry, not assumed zero. Estimate uses configured uncached input/output pricing and excludes embeddings. No extra model traffic was generated for accounting. No duplicate answer generations observed for agent-submitted questions.

Two earlier player-interface calls (12:51:16 and 12:51:43 UTC), outside agent acceptance, totaled 4,530 input/128 output, estimated $0.026490. Their purpose is unknown; they are separately reported and not labeled ordinary player operating cost or agent validation. Previously approved local validation remains four calls, $0.068950. [Numeric usage and integrity ledger](lms-0732-production-integrity.json).

## 22. Operational integrity

All **19 business-table counts/fingerprints match exactly**, pre-deployment 12:48:04 UTC to final 13:01:49 UTC. Post-deployment 12:50:50 checkpoint also matched. Security snapshot identical. Approved Answer revisions remain three with identical aggregate fingerprint `1eb1ea4466c6da986ba303c0993d07de`. Seven active source versions unchanged. No operational, account, role, roster, schedule, match, score, rating or configuration mutation. Normal request telemetry is expected. Deployment-scoped error/fatal runtime query returned no entries during the checked acceptance window.

## 23. Remaining limitations

Existing SELF-rating season and next-match team clarifications remain. No populated production match/lineup/roster was changed or simulated. Prior deterministic/populated fixture evidence remains the coverage for those unavailable states. Page 6 was a verified supported production supplement to registration pages 4–5. Cached generation usage and embedding cost are not available in this generation-cost total. Other player-interface traffic cannot be labeled player-only operating cost without knowing its purpose.

Automatic approval review rejected a full diagnostic-JSON telemetry query because it could expose retained content beyond cost scope. It was not retried; numeric fields only completed cost reporting.

## 24–26. Deferred work and final status

Standings rank consistency remains deferred. Broader security hardening remains deferred. Neither is included in the deployed candidate.

**LMS-0732 / 0.1.554 — PRODUCTION ACCEPTED.** Required targeted gates passed; no LMS-0733 started.

