# LMS-0725 / 0.1.547 targeted production continuation

**NOT PRODUCTION ACCEPTED — STOP FOR TELEMETRY REVIEW. September 8, 2026.**

The five targeted correction gates passed. Acceptance then stopped at Q78: its answer was correct, but telemetry capture failed with the newly retained bounded diagnostic `DEADLINE`. No question retry, backfill, correction, SQL, rollback or further deployment followed this failure. Eleven benchmark cases remain unrun.

1. **Deployment.** Application-only production deployment `dpl_9S7a2B1hMEMZ1VzF1uzAPWfVo9hm`, [deployed application](https://lwrpc-admin-6ehxay69w-terry-lwrpc.vercel.app), READY September 8 at 19:02:51.519 UTC. Normal `league.lwrpickleballclub.com` and dedicated `view-as.lwrpickleballclub.com` aliases verified on this deployment. Version stays 0.1.547 / LMS-0725. This uploaded the approved working tree; Vercel's old Git commit metadata does not identify the pending correction by itself.

2. **Q55 PASS.** Exact question: “When is my Season DUPR established?” Answer includes the date communicated to all captains before the first scheduled match and full-season duration. It adds September 27, 2026 from the three league-specific Important Dates sources. Document policy; active Rule 4.1 chunk `d51e615b-a4f2-460f-8a81-da9abfbd46af`, Rules version `f0aad5ad-cf08-46c2-94fd-686ceb1271c0`. Four sources validated. Outcome `59e99390-e495-41f4-9537-be7f01904dbc` persisted; completion diagnostics complete in 174 ms.

3. **Locked PASS.** “When is my Season DUPR locked?” returned document policy with Rule 4.1 timing/duration and the current September 27 date. Not unsupported or Live SELF_RATING. Outcome `320b180a-07ee-4e50-85f9-0022e1dffda7` persisted.

4. **Change-during-season PASS.** “Can my Season DUPR change during the season?” answered no under current Rule 4.1, preserving establishment timing and full-season duration. No current reset qualification was found in the accepted active official evidence. Outcome `a3837931-a450-4d9d-be64-67fd5158a447` persisted.

5. **Live rating contrast PASS.** “What is my Season DUPR?” entered Live SELF_RATING and asked which authorized season, with 2026 Fall and 26/27 Saturday choices. Outcome `43655c0d-e383-4a3d-9de6-2bd1df85cbb8`: model null, Stage 3 false, model skipped, input/output zero. The deterministic Live path does not call embeddings. No extra selection question was issued.

6. **Generic DUPR limitation PASS.** “What's my DUPR?” displayed “Current official DUPR isn't available through this Live LMS lookup. Which rating and season do you mean?” Four supported combined rating/season choices remained available. Outcome `32d17b55-8015-456e-be8f-2289d18dd99d` persisted; model/embedding path zero.

7. **Telemetry gate FAIL at Q78.** Five targeted records and the next sixteen case records persisted. Total 22 submissions / 21 persisted outcomes / one capture failure. Q78 at 19:19:00 returned HTTP 200 and a correct visible answer, then logged:

   - operation `capture_ai_quality`, stage `persistence`, event `capture_failed`;
   - correlation `77848361-efa8-400c-be6b-dbb8648039b2`, origin `player_interface`;
   - result `answer`, evidence count 1;
   - reason `DEADLINE`, duration 502 ms, attempt 1, SQLSTATE null;
   - failure time 19:19:05.202 UTC.

   Two post-completion read-only telemetry checks did not find a Q78 row. The new diagnostics successfully identify the application capture deadline, but do not establish why persistence exceeded it or whether an underlying RPC committed later. No unsupported database-cause claim, timeout change or silent retry was made. Historical Q23/Q36 failures remain unmodified and unbackfilled.

8. **Remaining 28 results.** Seventeen answers observed correct; sixteen meet both answer and persistence gates. Q78 fails acceptance because telemetry failed. Eleven are NOT RUN: Q79–Q89.

   | Cases | Observed result |
   |---|---|
   | Q56 | Complete Season DUPR calculation rules and material qualifications; exact Rules 4.1/4.2/4.3/4.5.1/4.5.2 sources |
   | Q57 | September 27, 2026; Saturday Important Dates source only |
   | Q58–Q63 | Protected responses; no generated answer or unauthorized personal disclosure |
   | Q66–Q68 | Women's Weekday starts October 14, 2026; Weekday source |
   | Q69 | League clarification choices; no answer-model call |
   | Q71 | Women October 14, men October 15, 2026 |
   | Q75 | Saturday DUPR7 October 17, 2026 |
   | Q76–Q77 | Saturday DUPR6/DUPR8 October 24, 2026 |
   | Q78 | Correct September 7, 2026 Weekday registration date; **persistence FAIL** |
   | Q79–Q89 | NOT RUN after stop |

9. **Production OpenAI calls.** Thirteen generated answers observed: Q55, LOCKED, CHANGE, Q56, Q57, Q66, Q67, Q68, Q71, Q75, Q76, Q77, Q78. Twelve have persisted model outcomes; Q78 is observed in the UI and failed capture log. No duplicate acceptance submission, full generated benchmark or additional paraphrase sweep. A browser wait for Q56 timed out; the response was subsequently read without resubmitting. Nine submissions used zero answer-model calls. Q69 still invoked document retrieval/embedding; it is not counted as a zero-embedding Live case. No exact organization-billing request count is claimed.

10. **Tokens and cost.** The twelve captured generated answers report 23,019 input + 984 output = 24,003 derived total tokens, model `gpt-5.5-2026-04-23`. Estimated generation cost at the accepted uncached rates is **$0.144615**, excluding Q78 and embedding costs. Q78 input/output and all cached-token counts are unavailable, not zero. This is not the complete billed continuation cost. Each case is labeled `PRODUCTION_ACCEPTANCE` in the local ledger; database `player_interface` remains shared with ordinary users. No member PII is used for cost attribution. [Accepted cost diagnosis](lms-0725-cost-diagnosis.md).

11. **Quality totals.** Accepted local 103/103 routes, 82/82 final generated answers, 12/12 policy controls and 906/906 tests remain intact; build/type/PDF/lint passed with ten existing lint warnings. No tests or full model benchmark repeated for this deployment. This continuation observed zero wrong dates/years, cross-league leakage, mechanics-as-applicability errors, state-versus-policy errors, material-qualification omissions or unsupported grounded answers. Exact-source validation remained successful for captured generated outcomes. These observations do not mark unrun cases passed. Cumulative original 99-case answer observations are now 88 PASS / 11 NOT RUN, with the old Q55 failure retained as history and its current retest passed. Current acceptance still fails due to Q78 persistence; Q23/Q36 remain historical capture gaps.

12. **Integrity.** Read-only REST HEAD/GET checkpoint at 19:22:01 UTC: 7 documents, 25 versions, 1,893 chunks; 1 Approved Answer, 2 revisions, 7 events — matching the prior checkpoint. Active Rules and Important Dates versions match the accepted baseline. The original Q55 outcome still reports `insufficient_evidence` / `stage4_no_applicable_evidence`. No SQL, corpus processing, Approved Answer creation, business mutation, feedback vote, environment/model/HMAC change or historical backfill was performed in this continuation. Counts and active IDs are a bounded integrity check, not a new full-row fingerprint/security-function audit. No production database-wide integrity or cron claim is inferred from historical checks.

13. **Limitations and cost-policy follow-up.** Q78 has no usage row; cached tokens are still discarded by deployed code. The new governing [API cost policy](api-cost-policy.md) records requested/returned models, cached and total tokens, trusted request categories, centralized cache-aware pricing and cache-friendly prompt review for operational maintenance. Test this only with fixtures/retained shapes, without OpenAI traffic. Stop and propose any minimum required SQL/schema change before production mutation. This permitted deferral avoids another deployment during the current acceptance sequence and does not displace mandatory View-As UI parity after acceptance. Production 390px/320px and full View-As/effective-user/Exit acceptance remain unfinished because execution stopped; existing local checks are not substituted for those production gates.

14. **Final status.** **LMS-0725 / 0.1.547 — NOT PRODUCTION ACCEPTED; STOP FOR TELEMETRY REVIEW.** Q55 correction is deployed and its targeted tests pass. Review the new Q78 capture deadline failure before further correction or acceptance. No new version or View-As parity work started. Large OpenAI benchmarks remain prohibited without explicit authorization.

Evidence: [case/outcome/cost ledger](lms-0725-targeted-production-audit.json), [persisted telemetry](lms-0725-targeted-telemetry.json), [bounded failure log](lms-0725-targeted-failure-log.json), [integrity metadata](lms-0725-targeted-integrity.json), [deployment output](lms-0725-targeted-deploy.txt).