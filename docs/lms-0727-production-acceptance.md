# LMS-0727 / 0.1.549 — Controlled production acceptance

Status: **LMS-0727 / 0.1.549 — PRODUCTION ACCEPTED**, September 9, 2026. Final results below supersede the intermediate checkpoint.

Application-only deployment dpl_8AoUUZpZy4iNyCkYiAAZwqWAwCN8 is READY on league.lwrpickleballclub.com and view-as.lwrpickleballclub.com. Exact 313-file upload manifest: lms-0727-production-package-manifest.json. Previous accepted rollback: dpl_39U8T1potC5w7bhUiHFwTG1cXYBb. No SQL/corpus/Approved Answer mutation. CLI Git metadata reflects the cumulative dirty workspace base; the per-file manifest is the release source identity.

Preflight: project prj_IBm5EKA3B2hciTmhvz0kIrPhZAX3 / team_l5rlGNrtKbyjq5Q0V4Pg9ouR verified. Accepted LMS-0726 displayed before deployment; LMS-0727 displayed after fresh load. Migration history latest remains 20260909154337, no LMS-0727 migration. Exact security catalog matches accepted baseline. View-As maintenance 10/10 recent successes. Active searchable Rules v20260908162017-f0aad5ad, Rule 3.5 page 2, unchanged.

Normal Commissioner checks PASS: Dashboard counts/identity, Teams 62 active of 98; Net Rushmore roster opens (0 members, normal Add Player available); MDUPR6 schedule popup exactly four active teams; standings opens; Schedule Editor and Scoring Operations show expected zero matches, normal management controls intact; Member Administration 1819 active of 1970, Nick search, Edit/Cancel without saving, normal Member Detail actions including View As User.

All 19 business-table fingerprints unchanged between 19:35:34 UTC preflight and 19:41:51 normal checkpoint. No current roster memberships/matches/lineups means populated setup/scoring cannot be exercised without prohibited live test data. Existing local coverage remains supporting evidence.

Owner normal Captain post-deployment check: **PASS**, explicitly reported after READY. Captain/team identity was not supplied; none is inferred.

## Final acceptance matrix

| Required item | Result and evidence |
|---|---|
| 1. Deployment | PASS. Exact application package deployed as `dpl_8AoUUZpZy4iNyCkYiAAZwqWAwCN8`; both production aliases READY. 313 manifest-verified files: 302 unchanged, 10 replacements, one new module. No rollback required. |
| 2. Normal LMS smoke | PASS. Agent normal Commissioner checks above completed first; owner normal Captain PASS. No live roster, lineup, schedule or score writes used for testing. |
| 3. View-As regression | PASS. Normal Member Detail confirmation for actual Captain Nick Williams opened the shared Captain Dashboard on the dedicated origin, showing the target team and persistent read-only banner. Original Commissioner tab retained its identity. Exit ended the context and cleared credentials. No View-As model question submitted. |
| 4. Original question 1 | PASS: “Can I play on a team in a different community?” immediately explained conditional permission and both own-community team/availability conditions. |
| 5. Original question 2 | PASS: “Can I play in a different community?” explained the same governing policy; no insufficient-evidence fallback. |
| 6. Generic cross-community policy | PASS: “Can players from different communities be on the same team?” returned permission with the full restriction. “Do I have to play for my own community?” correctly began “Not always” and preserved both conditions. |
| 7. No-team supplied facts | PASS. No own-community team in the requested division means this particular restriction does not block participation, explicitly based on supplied facts; other eligibility requirements were not certified. |
| 8. Team has room | PASS. Own-community team in the same division AND room resulted in “No,” explicitly based on the user's stated facts. |
| 9. Different division | PASS. An own-community team in another division alone does not establish the restriction in the requested division. |
| 10. Rule 3.5 source/citation | PASS. Current active/ready/searchable Rules `v20260908162017-f0aad5ad`, page 2, Rule 3.5. Citation opened the PDF at page 2 of 17 and displayed the provision. Chunk `aae95c91-940a-41b2-b26d-f1df8270c1da`; source content MD5 unchanged. |
| 11. Source classification | PASS. All seven results displayed OFFICIAL RULES, with one validated official source. No Live LMS source claimed. |
| 12. Cross-League Leakage | 0 observed. Explicit cross-league control passed local reviewed validation. No extra explicit cross-league production question was run beyond the seven authorized cases. |
| 13. Cross-Division Leakage | 0 observed. Explicit different-division production case passed; requested-division restriction preserved. |
| 14. Personal facts | PASS. No invented community, team, division or availability facts. Supplied facts were conditional premises, not claimed database verification. Personal wording did not trigger unnecessary personal-data retrieval. |
| 15. Telemetry | PASS. Seven submissions, seven unique persisted answer outcomes; all `validated_structured_output`, `VALIDATED`, `community_policy` / `community_participation`, same current evidence identity. No duplicate observed generation/outcome. Q78 recovery architecture unchanged; no forced failure test. |
| 16. OpenAI cost | Seven production acceptance answer-model calls, 11,894 input / 703 output tokens; cached input unavailable, not zero. Returned model `gpt-5.5-2026-04-23`; production model unchanged. Estimated generation cost **$0.08056**, separate from development/player traffic. |
| 17. Business integrity | PASS. All 19 table fingerprints exactly unchanged across preflight, normal-first checkpoint and final 19:51:23 UTC checkpoint. Security catalog, migration history, policies and grants unchanged. Candidate-caused business changes: ZERO. |
| 18. Role semantics | Deferred. Default Player display versus durable assignment remains a separate roadmap item; no role/account mutation. |
| 19. Security hardening | HIGH PRIORITY / OPEN, separately staged. No deferred SQL, normal-write redesign or privilege tightening included. Existing exposure is not claimed fixed. |
| 20. Limitations | Current production has no roster memberships/matches/lineups, so populated Match Setup/scoring relies on existing local fixture evidence. Captain identity was not reported. Cached and embedding tokens are unavailable; provider billing was not independently reconciled. Viewer header uses parent Rule 3 while the answer and actual PDF identify 3.5. Runtime error scan covers this deployment's acceptance window only. |
| 21. Final status | **LMS-0727 / 0.1.549 — PRODUCTION ACCEPTED.** No next project/version started automatically. |

## Cost and operational evidence

The estimate uses the previously approved pricing configuration ($5/million input, $30/million output) as an uncached estimate; excludes embedding charges, taxes and any cache discount. Seven routine query embeddings are expected from the unchanged retrieval path, but their usage is not retained. No full benchmark was rerun for production acceptance. Local validation remains separate: ten completed generations, 16,523 input / 1,419 output / zero cached tokens, estimated $0.125185. One earlier restricted-network attempt had no response and unknown billing; it is not counted as a completed generation.

Final maintenance sample: 10 successes, zero other results. Deployment runtime error/fatal scan during approximately 19:37–19:51:25 UTC returned no matching logs. View-As context ran 19:48:04–19:48:43 UTC and ended by explicit Exit with credentials cleared.

| Case | Outcome ID | Input / output tokens |
|---|---|---|
| Original long wording | `4f109b18-4458-438f-b1dd-09dff730b1ad` | 1696 / 92 |
| Original short wording | `0fa3cf1a-494b-4788-8aa5-339147e2e570` | 1693 / 107 |
| Generic mixed-community team | `533c8a76-d0ca-49d5-89c4-8926630b5e58` | 1696 / 62 |
| Own-community obligation | `4be59a91-0fad-4ed6-a6ca-aae4866aa7e1` | 1695 / 99 |
| No team in division | `2957b83b-2d34-4ebb-8ed0-7bb75b19988e` | 1702 / 120 |
| Same division and room | `57747df6-c2f4-41d8-95e5-448149b8ac0d` | 1708 / 97 |
| Team in another division | `e489af3e-b1f6-4e4c-96b7-c2b3c1cff2e3` | 1704 / 126 |

Evidence: [package manifest](lms-0727-production-package-manifest.json), [deployment log](lms-0727-production-deploy.txt), [final business fingerprints](lms-0727-production-business-final.json), [final security catalog](lms-0727-production-security-final.json), [telemetry](lms-0727-production-telemetry-final.json), [maintenance/source/Exit](lms-0727-production-health-final.json), [runtime scan](lms-0727-production-runtime-errors.json), [cost ledger](lms-0727-production-cost.json), and [local review](lms-0727-cross-community-review.md). Before/checkpoint evidence is retained alongside these files.
