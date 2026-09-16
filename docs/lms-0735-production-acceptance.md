# LMS-0735 / 0.1.557 controlled production acceptance

Status: **DEPLOYED; PRODUCTION ACCEPTANCE FAILED / STOPPED — NOT ACCEPTED.**

## Controlled deployment and stop, September 16, 2026

The owner connected the real Commissioner session and authorized continuation. Read-only preflight passed: Commissioner dashboard loaded, Teams showed 92 active of 115 with Add Team/Copy Division Teams controls, and Season Ratings showed 1,825 active players for 2026 Fall Season with existing rating fields. All twenty-eight refreshed integrity fingerprints matched the prior baseline before deployment. No View-As or business write probes were used.

Pushed only approved application commit `acf4341949546eb5070f1012e47efb6f44678e34` to main through the established GitHub/Vercel integration. Production deployment `dpl_EjCSVvvYtLrxvoASkRPwZsVxN8yy` reached READY and bound `league.lwrpickleballclub.com`; immutable URL: `https://lwrpc-admin-fcmh9cohs-terry-lwrpc.vercel.app`. Post-deployment Teams reload showed LMS-0735, the same 92/115 counts, Commissioner identity and normal Add Team controls. No additional application changes or fixes were made.

Eight fresh-question production console replays completed: **7 PASS, 1 FAIL**. Remaining acceptance stopped immediately on the failed eighth case. LMS Match Setup and two unrelated Important Dates questions were not run after that stop. This is not full production acceptance.

| Exact production question | Result |
|---|---|
| when does the primetime league get their schedules | PASS: schedules completed and sent Wednesday, Oct. 7, 2026 |
| when will PrimeTime schedules be sent out | PASS: Oct. 7, Wednesday, for the 2026 Fall season |
| what date are the PrimeTime schedules available | PASS: Oct. 7, 2026 |
| when do captains get the PrimeTime schedule | PASS: Wednesday, Oct. 7, 2026 |
| When does the Saturday regular competition wrap up? | PASS: Feb. 20 / 27, 2027 |
| Where can I find the seasons scoring sheet | PASS: Captain Dashboard → Next Match → Match Score Sheet; both teams complete Match Setup; button turns green |
| Do all games in the Saturday league post to DUPR | PASS: gender-based games post; mixed doubles and Picklebreaker do not |
| Are we going to use the Lifetime ball | FAIL: insufficient-evidence fallback |

PrimeTime selected Important Dates page 2, chunk `950a54ab-aa3b-4f43-9c51-88ce0ca803ae`, active version `f811e60f-9af8-444f-b009-9594a530acd6`. The exact question's original score was 0.7566 and final selected score approximately 0.768. Saturday selected chunk `f9f05921-2ee9-46fc-9b44-e5a861d7dd6f`, source wording “• Feb. 20 / 27 - End of Regular Season”, with the correct 2027 answer. Scoring sheet selected Captains Normal Weekly Process chunk `8f7a8cf0-4e2c-4a6f-bd58-7e51f0b02bc2` plus supporting LMS-guide/navigation passages; no invalid-ID rejection/fallback. Rules selected `04bc0faf-3d7f-4123-9e63-61cd081d4d83`, Rule 6.2.3.6.

### Exact stopped failure and diagnostics

Question: **Are we going to use the Lifetime ball**. Ask About All; no optional league/team/season/page context; Commissioner; standalone question; no prior conversation receipt.

Final answer: **“I couldn't find an applicable rule or guide in the official LWR Pickleball Club or USA Pickleball materials. Please contact League Management for clarification.”**

Planner intent: “Find whether the league or club will use a Lifetime ball.” Fact type: equipment policy or match ball specification. Entity Lifetime; noun ball. Concepts: approved ball, official ball, match ball, game ball, equipment, pickleball ball, ball brand. Normalized question unchanged except punctuation. Soft affinities league_rules and league_supplement. Initial failure `APPLICABILITY_REJECTED`; terminal reason `NO_APPLICABLE_EVIDENCE_AFTER_RESCUE`.

Original query, expanded normalized question, expanded `Lifetime ball official ball match ball equipment`, and rescue `Lifetime ball approved ball official ball match ball` each returned 32 candidates. Expanded/rescue searches completed for this failed case. Final ranking was dominated by general USAP ball rules:

| Evidence | Final score | Source text / relevance |
|---|---:|---|
| `3135724a-c059-4e76-a0ee-b40240a596eb`, USAP Rule 3.C.1, page 13 | 0.4726 | “All approved balls are acceptable for indoor or outdoor play.” General permission, no club match-ball assignment. |
| `d8ceb05b-3e08-453a-88aa-26cb0b10a725`, USAP Rule 16.G, page 42 | 0.4652 | Tournament Director chooses from the approved ball list; no club brand assignment. |
| `4da256ff-d390-47d4-8183-dfa45286f107`, USAP Rule 3.C.5, page 13 | 0.4523 | Ball construction requirements, not club equipment selection. |

The ranked diagnostics' Captain Guide candidate was `82e6fc33-a040-4153-b920-cfcd8bab55b5`, active version `c0b30100-1d00-42a2-9b0f-9aa97fe23d83`, heading VIEW SCHEDULE/GAME INFORMATION, page 9, score 0.4175. The required controlling match-ball assignment was not selected. Stage-3 threshold 0.35 passed, but applicability did not: numeric similarity alone did not establish the requested club policy.

Semantic assessor received twelve allowed evidence IDs, all general USAP passages. One assessment attempt returned an empty ID list with no invalid-ID rejection. Reason: “The excerpts describe general USA Pickleball ball approval and that the Tournament Director selects a tournament ball, but they do not identify whether a specific event will use the Lifetime ball or establish that Lifetime is the selected ball.” Final selected evidence empty; answer generation skipped; no citations attached. Retrieval 8,705ms; total 9,218ms. Approved Answers lookup was unavailable, but this acceptance requires official-document evidence and no Approved Answer change is proposed. Exact root cause of the local/production discrepancy is not yet established; no post-failure fix was attempted.

### Production rescue diagnostics

The UI and JSON distinguish considered, triggered, query execution, rows returned and selected evidence:

| Case | Considered | Triggered | Executed | Returned | Selected |
|---|---|---|---:|---:|---|
| Exact PrimeTime | true | true | 1 | 0 | false |
| PrimeTime three variants / Rules | false | false | 0 | 0 | false |
| Saturday end | true | false | 0 | 0 | false |
| Scoring sheet | true | true | 2 | 64 | true |
| Lifetime ball failure | true | true | 1 | 32 | false |

Exact PrimeTime recovered successfully despite one expanded query and one rescue query reporting `SEARCH_FAILED`; diagnostics correctly record initiated execution separately from completion/results. Scoring sheet exhibited the completed, returned and selected rescue path. No claim is made that failed queries returned evidence.

### Integrity and disposition

Post-run comparison: **26/28 fingerprints unchanged**. Teams retained 115 rows but the full-row hash changed (`a7ba2d45195232ff8e1564572c7ef0bc` → `092f62f3530f9217ef478fc384ae86d9`); user_roles increased from 206 to 208 with changed hash. No business mutation was performed by this deployment/acceptance sequence, but concurrent changes are not yet attributed; do not certify unchanged business state or assume candidate-caused corruption. See `lms-0735-production-integrity.json`.

Official documents, versions and chunks (including activation state), RLS/policies/ACLs/functions, migrations, system settings and cron configuration all match. Vercel project identity, Node version, framework and domain set unchanged; no environment or configuration changes were issued. Normal Ask LWR telemetry is expected from console requests. Maintenance runs succeeded; Vercel runtime-error scan after deployment found no runtime errors (before the final failed fallback, which was an ordinary application response).

**Do not mark PRODUCTION ACCEPTED.** Release remains deployed at the owner's approved commit. No rollback, further tests, code fix, security/configuration change or business-data mutation was performed after the stop. The previous READY deployment `dpl_Ej7wcMdKbMMTNSrHrs6PjHu8S5aF` remains the recorded application-only recovery target. Next work requires reviewing the failed match-ball retrieval and the unconfirmed concurrent Teams/user-role changes before resuming acceptance.

## Earlier preflight record (historical)

Owner authorized controlled application deployment and read-only production acceptance on September 16, 2026. No additional fixes are authorized during acceptance unless a production blocker is discovered; report any failed question/evidence/applicability/diagnostics/answer before another code change.

Validated application committed locally on main as `acf4341` (14 scoped application/package/test files). All fourteen files matched the local validation SHA-256 manifest before staging. Git normalizes line endings in the commit. Unrelated pending documentation was excluded. The commit has not been pushed.

Remote main and current accepted production both remain `e88946c00bb2e50aa6d165fe16c657208479c406`. Recovery target is READY deployment `dpl_Ej7wcMdKbMMTNSrHrs6PjHu8S5aF`, immutable `lwrpc-admin-c4uoxua2u-terry-lwrpc.vercel.app`. Application-only rollback; no database rollback or migration is needed. Vercel identifies the deployment as a rollback candidate; CLI rollback syntax was checked without executing rollback.

Read-only preflight captured fourteen protected business-table counts/full-row hashes, official document/version/chunk hashes, system settings, location/division/scheduling/template state, policies/RLS/ACL/function fingerprints, migration history and cron configuration. Latest maintenance job runs succeeded. Snapshot retained locally at `.local-validation/lms0735-production-before.json`. No mutations were issued. Refresh snapshots immediately before eventual deployment if the waiting interval permits legitimate production activity.

The connected in-app LMS tab is signed out after inactivity. Sign-in was requested using the asynchronous input tool. Normal authenticated LMS baseline and post-deployment feature acceptance cannot yet be performed. Per `docs/live-lms-production-protection.md` (Normal LMS First, Preflight, Production Acceptance), deployment is held until that required baseline can be verified. No session fabrication or View-As substitute is used.

Pending: authenticated normal-LMS smoke check, push scoped commit via existing GitHub/Vercel production integration, confirm immutable deployment identity, recheck normal LMS, replay the eleven minimum owner-requested questions (four PrimeTime, Saturday end, scoring sheet, Rules, ball, Match Setup, two unrelated dates), inspect rescue diagnostics, compare all integrity/configuration snapshots, and record final accepted or failed status. Any question failure must be documented before changes. Prior local validation remains 1,236/1,236 automated and 16/16 OpenAI cases, lint/build passed; these do not substitute for production acceptance.
