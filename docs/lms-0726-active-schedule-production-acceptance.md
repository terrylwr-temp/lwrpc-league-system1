# LMS-0726 / 0.1.548 — active-team correction production acceptance

IN PROGRESS; not yet production accepted.

Owner attachment 67f9be82-7dc0-4e57-8b2a-fec6939f49b0 explicitly authorizes the application-only correction and final targeted acceptance.

Root cause: Captain and Player Division Team Schedules team queries omitted is_active=true. Commissioner already filtered active teams. Exactly one predicate added to app/captain-dashboard/page.js and app/player-dashboard/page.js, affecting normal and shared View-As presentation only. No schedule-generation, editor, Match Setup, match/score/standings logic or historical match facts changed. No SQL required/applied.

312-file staged inventory matches the previous deployed candidate except these two reviewed lines. Hashes in lms-0726-active-schedule-package-manifest.json and lms-0726-active-schedule-package-delta.json. Nine focused tests PASS, lint zero errors/11 warnings, local build PASS. Remote build PASS.

Corrected deployment: dpl_39U8T1potC5w7bhUiHFwTG1cXYBb; https://lwrpc-admin-4s948qdgc-terry-lwrpc.vercel.app; READY; both league.lwrpickleballclub.com and view-as.lwrpickleballclub.com aliases verified. Preceding candidate dpl_8izJw6e8exu15BH4DTMMysVBTyRj retained; known-good accepted application rollback remains dpl_7V7DQdKkpz8w9T39eGt6KbqeeMN8. No rollback needed so far.

Fresh baseline 2026-09-09 18:51:39 UTC captured all 19 business tables and security catalog before deployment. Accepted migration 20260909154337 with SHA e46a527351d8dd1cef6c4f23e4cda2a9e3a2389308846c115b89e0cbc28fa207 remains present once; reader restrictions and reviewed helpers intact. Normal-first integrity after deployment: all 19 fingerprints unchanged.

Normal Commissioner checks PASS: Dashboard identity/counts; Teams 62 active of 98 with management controls; Schedule Editor and Scoring Operations reflect zero current matches; standings opens; normal MDUPR6 schedule popup contains exactly Bustin’ Balls (ArtLk), Canoe Creek 6, Cresswind PSJ, Six Pack (DWLWR), matching four active database rows and excluding six inactive rows. Normal Captain post-deployment owner verification requested and pending. No View-As acceptance for corrected deployment begun before that result.

Production has no match/lineup/roster membership rows. Do not fabricate data to exercise positive setup/scoring. Retain accepted isolated populated-workflow evidence with explicit production limitation.

## Final acceptance — 2026-09-09

**LMS-0726 / 0.1.548 — PRODUCTION ACCEPTED.** This final section supersedes the in-progress status above and the earlier incomplete production checkpoints. Acceptance combines the previously acknowledged LMS-0726 gates with this final application-only correction and targeted production checks.

| Required report item | Result |
| --- | --- |
| 1. Defect/root cause | Captain/Player schedule team queries omitted active status and listed inactive teams when switching divisions. |
| 2. Exact correction | Added .eq("is_active", true) in the two documented dashboard files. Same predicate as Commissioner. No SQL or business-operation changes. |
| 3. Deployment | dpl_39U8T1potC5w7bhUiHFwTG1cXYBb READY; both production domains verified. Version remains 0.1.548. |
| 4. Normal regression | Commissioner Dashboard, Teams, division schedules, Schedule Editor, matches/scoring and standings PASS before View-As. Owner reported normal Captain PASS after READY/reload request. Owner did not identify the particular normal Captain account; do not claim it was Nick. |
| 5. Schedule/match integrity | All 19 business-table counts/fingerprints identical before deployment, after normal checks and after View-As checks; zero candidate-caused business changes. |
| 6. Active-team control | Captain View-As MDUPR6 returned exactly 4 active teams and excluded 6 inactive teams. MDUPR7 returned exactly 9 active teams and excluded 2 inactive teams. |
| 7. Normal/View-As parity | MDUPR6 named team set and empty schedule facts match normal schedule control and authorized production data. Owner normal Captain control PASS separately. No claim of agent-run normal Nick authentication. |
| 8. Captain | Nick Williams / Net Rushmore (AL) / MPT 7 / PrimeTime / 2026 Fall. Correct active team, zero upcoming matches, disabled no-match actions. Scope switching replaces prior division teams. |
| 9. Player | Actual role-assigned Mark Abbott shared Player Dashboard remains correct: no assigned team, no upcoming match, disabled Match Lineup/details. Division Schedule does not expose a Commissioner schedule fallback. His no-team state does not permit a populated Player schedule test. Player query is covered by the focused mixed-status fixture. |
| 10. Inactive leakage | Zero in both tested mixed-status Captain divisions. No teams carried over from MDUPR6 into MDUPR7. |
| 11. Read-only security | Persistent effective identity/read-only banner; no schedule mutation controls used. Shared security/projection implementation unchanged byte-for-byte; retained denial tests apply. No live mutation probes manufactured. |
| 12. Exit/isolation | Both corrected-deployment contexts explicitly ended; credential/code/context cleared; start/end audit preserved. Tabs returned to normal member URL. Original Tab A still Terry / Commissioner with normal action buttons. Temporary acceptance tabs closed. |
| 13. Member button | Normal action row preserved for both valid targets. Existing desktop/mobile evidence retained; component unchanged by correction. |
| 14. Role semantics | Deferred post-LMS-0726 follow-up. Marilyn untouched; no provisioning/backfill/default-label grant. |
| 15. Cross-community Ask LWR | Mandatory post-LMS-0726 follow-up remains deferred and unimplemented. |
| 16. Security hardening | HIGH PRIORITY / OPEN, separate staged release; no 82-write, 360-policy or Phase 2 changes. |
| 17. OpenAI | Zero agent model calls/tokens and $0 incremental model cost for this correction/acceptance. No benchmark or generated question submitted. |
| 18. Final integrity | Security catalog snapshot exactly unchanged: roles/memberships, policy hash, table/column ACL hashes, function bodies/owners/config/ACLs, and migration source/hash. Corrected migration remains recorded once as 20260909154337. Maintenance 10/10 recent runs succeeded. No error/fatal deployment logs found in the checked 18:51–19:03 UTC window. |
| 19. Limitations | Current production has zero roster memberships, matches, lineups, scores and standings rows. Positive populated Match Setup/scoring remains supported by accepted isolated fixture evidence, not new production writes. Mark has no current team, limiting his live schedule test. Broad normal direct-Data-API hardening is deferred. |
| 20. Final status | PRODUCTION ACCEPTED. No next version/project started. No rollback required. Accepted rollback deployment remains retained; additive read SQL stays compatible. |

MDUPR6 active result: Bustin’ Balls (ArtLk), Canoe Creek 6, Cresswind PSJ, Six Pack (DWLWR). MDUPR7 active result: Back Courts (Artisan Lakes), Bayview Ballers (DW-BV), Canoe Creek 7, Cresswind JV, Del Webb LWR 7, Dink Floyd (DWLWR), Kitchen Brigade (LC), Shore Shots (SV), The Isles 7. Historical opponent/result information was not filtered out of active teams' match facts.

Evidence: lms-0726-active-schedule-business-before.json, lms-0726-active-schedule-normal-after.json, lms-0726-active-schedule-business-final.json, lms-0726-active-schedule-security-before.json, lms-0726-active-schedule-security-final.json, lms-0726-active-schedule-exit-final.json, lms-0726-active-schedule-runtime-errors.json. Full base-release evidence remains in lms-0726-corrected-production-review.md and lms-0726-member-final-readiness.md. No mini-LMS presentation reintroduced: 310 of 312 staged source files unchanged, including the shared renderer and null legacy landing route.
