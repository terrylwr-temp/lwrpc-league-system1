# LMS-0736 / 0.1.558 controlled production acceptance

Status: **PRODUCTION ACCEPTED** — 2026-09-16. Eighteen of eighteen production question checks passed, including all twelve required LMS-0735 regression controls. Real Commissioner preflight, post-deployment normal-LMS smoke, diagnostics and integrity gates passed.

Approved commit: `c52f74f863f5beb27b51307e915549de65a78def` (parent `acf4341949546eb5070f1012e47efb6f44678e34`). Fifteen scoped application/version/regression files, 254 insertions and 32 deletions. No additional code edits during deployment review. The lwrpc-admin working tree matched this commit exactly. Unrelated pending documentation and raw validation evidence were not pushed.

GitHub main push succeeded. Vercel production build: `dpl_3HPPGWmv4v9ixRHa3KJguQRSexD3`, immutable `lwrpc-admin-qrh05cz29-terry-lwrpc.vercel.app`.

Rollback target preserved: LMS-0735 commit `acf4341949546eb5070f1012e47efb6f44678e34`, READY deployment `dpl_EjCSVvvYtLrxvoASkRPwZsVxN8yy`, immutable `lwrpc-admin-fcmh9cohs-terry-lwrpc.vercel.app`. Vercel lists this as an eligible rollback candidate. Existing application-only recovery process applies; no SQL/database rollback is required. No rollback executed. Older accepted recovery deployment `dpl_Ej7wcMdKbMMTNSrHrs6PjHu8S5aF` is also retained.

## Preflight

Normal real Commissioner account, no View-As. Dashboard loaded with ordinary administration/navigation controls and 1,826 active members. Teams loaded with 93 active of 115 total, Add Team and Copy Division Teams controls. Season Ratings loaded 1,826 players for 2026 Fall Season, populated rating columns and normal data tools. No business forms were submitted. All three maintenance jobs' latest runs succeeded.

Fresh 28-part production baseline captured before the push: protected business-table counts/full-row hashes; official document/version/chunk state; settings, scheduling and template state; policies, RLS/ACLs, functions, migration history and cron configuration. `.local-validation/lms0736-production-before.json` retains it. User roles remain 208; prior concurrent Wild Blue Crush role-assignment finding is preserved in `lms-0736-data-delta-attribution.md`.

Local accepted evidence remains 1,257/1,257 automated tests, 27/27 real OpenAI cases, lint zero errors/11 existing warnings, build passed. No application edits were made during deployment/acceptance.

## Deployed identity and normal LMS

Vercel confirmed READY and the exact approved SHA above, with league.lwrpickleballclub.com assigned to this deployment. The production UI displayed LMS-0736. The application working tree still matches the deployed commit. Post-deployment Dashboard, Teams and Season Ratings remained available with the same counts, selected season and ordinary controls observed before deployment. No View-As was used.

## Production questions: 18/18 PASS

Executed through the real Commissioner Test AI Assistant console, All scope, blank optional context, New Question before each case. Captures span 19:02:41–19:13:04 UTC. All supported answers had sufficient evidence, generation and no generic fallback; the deliberately unsupported requirement correctly skipped generation. No material source conflict or invalid-ID rejection occurred.

| # | Exact question | Observed result | Selected source / combined score |
|---|---|---|---|
| 1 | Are we going to use the Lifetime ball | No; Franklin Outdoor X-40 optic yellow for regular season/playoffs | Captains Guide p10, 0.3776 |
| 2 | Are we using Franklin balls? | Yes; Franklin Outdoor X-40 optic yellow, home captain brings provided balls | Captains Guide p9/p10, 0.4482/0.4274 |
| 3 | Do we play the Saturday Picklebreaker to 25? | Yes; 25, win by 2, rally scoring, after 12-12 tie | Rules p9/p10, 0.5311/0.5089 |
| 4 | Do we play the Saturday Picklebreaker to 15? | No; regular games 15, Picklebreaker 25, win by 2, rally scoring | Rules p9/p10, 0.5226/0.5057 |
| 5 | Is Saturday league registration due on October 3? | No; October 4, 2026 | Important Dates, 0.6865 |
| 6 | Are we required to use Acme smart watches during matches? | Safe insufficient-evidence fallback; no unsupported No | None; comparison unknown |
| 7 | when does the primetime league get their schedules | October 7, 2026 | Important Dates PrimeTime, 0.7680 |
| 8 | when will PrimeTime schedules be sent out | October 7, 2026 | Important Dates PrimeTime, 0.5112 |
| 9 | what date are the PrimeTime schedules available | October 7, 2026 | Important Dates PrimeTime, 0.5078 |
| 10 | when do captains get the PrimeTime schedule | October 7, 2026 | Important Dates PrimeTime, 0.4934 |
| 11 | When does the Saturday regular competition wrap up? | February 20/27, 2027 | Important Dates Saturday, 0.4687 |
| 12 | Where can I find the seasons scoring sheet | Captain Dashboard → Next Match → Match Score Sheet; green after both complete setup | Captains Guide/LMS evidence, 0.5353/0.5287/0.4926 |
| 13 | Do all games in the Saturday league post to DUPR | No; gender games yes, mixed and Picklebreaker no | Rules p10, 0.4892 |
| 14 | What type of balls will we be using? | Franklin Outdoor X-40 optic yellow | Captains Guide p10; bounded equipment probe 0.646 (UI rounded) |
| 15 | For the Season DUPR rating, do you round up down to the first decimal? | Truncate to tenths; both 3.496 and 3.401 become 3.4 | Rule 4.2, 0.5624 |
| 16 | How do I complete Match Setup in the LMS? | Starting lineups at least 3 days before match; pairings/save, validation, red/blue status, green score sheet | Rules/Captains guides, 0.6838/0.6862/0.6710/0.6456 |
| 17 | What is the Weekday sign-up opening date? | September 7, 2026 | Important Dates Weekday, 0.4942 |
| 18 | When is the Weekday title decider? | December 9/10, 2026, Championship Days at Premier Sports Center | Important Dates Weekday, 0.4554 |

Exact original generated answer:

> No. The supplied guide says the league provides Franklin Outdoor X-40 optic yellow balls for all regular season and playoff matches, not Lifetime balls.

The planner separated subject `ball to be used`, proposed value `Lifetime ball`, scope `club_operation`. Value-independent searches were `official match ball equipment` and `pickleball ball to be used approved ball`. Applicability accepted the authoritative contradictory assignment; generic USAP ball passages were not used for this club assignment. Selected chunk `c9809c3e-e99c-4b2f-b9d2-c9c5ad804747`, document version `c0b30100-1d00-42a2-9b0f-9aa97fe23d83`, Captains Guide p10, LEAGUE FEES AND WAIVER. Exact supporting text: `Match Balls: Franklin Outdoor X-40 optic yellow balls for all regular season and playoƯ` followed by `matches.` Model gpt-5.5-2026-04-23 generated validated structured output, no fallback.

Matching controls returned supported confirmations; conflicting controls corrected the proposed value from affirmative evidence. The invented Acme requirement retained relation unknown, selected no evidence and returned NO_APPLICABLE_EVIDENCE_AFTER_RESCUE; absence did not become No.

## Diagnostics

Console visibly exposes interpreted intent/fact, separate proposed value, searches, candidates/scores, applicability and final evidence. Existing direct-policy cases appropriately skip the generalized planner. Each of the 18 rescue counters was checked against actual diagnostic paths marked `queryExecuted`; executed counts and summed returned candidates agreed in every case. Equipment-probe retrieval is separately labeled and is not misreported as generalized rescue.

| Cases | Considered | Triggered | Queries executed | Candidates returned | Rescue evidence selected |
|---|---|---|---:|---:|---|
| 1–5 | true | false | 0 | 0 | false |
| 6–7 | true | true | 1 | 0 | false |
| 8–10, 13–14, 16 | false | false | 0 | 0 | false |
| 11, 15, 18 | true | true | 1 | 32 | true |
| 12, 17 | true | true | 2 | 64 | true |

Case 7 selected valid initial/expanded evidence even though rescue returned no candidates. Case 12 selected valid IDs `8f7a8cf0-4e2c-4a6f-bd58-7e51f0b02bc2`, `5b432210-b886-44b6-a6e4-5b2312b07dee`, `c83dd035-c4f8-440d-b504-7e1f5be14ace`, with first-attempt evidence selection accepted and generation completed. No weakening of the invalid-ID safety gate occurred. No questionable final evidence selection was identified in these cases.

## Integrity and final disposition

All **28/28** protected counts/full-row fingerprints match the fresh baseline exactly. Fourteen business tables unchanged, including members, ratings, teams, rosters, user roles, schedules/matches/scores. Official documents, versions and chunks unchanged; activation/version state unchanged. Settings, locations, division lines, scheduling configuration, blackout dates and templates unchanged. Policies, RLS/ACL, function definitions, migration history and cron configuration unchanged. No acceptance-generated business-data writes. Routine AI request/diagnostic logging is outside these protected business fingerprints.

No concurrent protected business-data activity observed during this release window. Prior LMS-0735 team-save/role-assignment finding remains preserved without reversal; actor still not conclusively proven. Vercel exposed project identity, framework and Node configuration unchanged; deployment READY state, update timestamp and attached production aliases changed as expected on promotion. No environment/security/configuration changes were issued. Before/after fingerprints and exposed Vercel project observations are retained in `.local-validation/lms0736-production-integrity.json`.

**LMS-0736 / 0.1.558 is PRODUCTION ACCEPTED.** No remaining acceptance blocker. Rollback target retained; no rollback performed. This documentation is local and was not pushed as an additional release.
