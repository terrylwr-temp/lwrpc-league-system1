# LMS-0725 / 0.1.547 — Q78 deployment and acceptance pause
September 8, 2026. **DEPLOYED; NOT PRODUCTION ACCEPTED.**

1. Deployment: dpl_J1ojp2e3tgqTgx2Fm3BVLuwtHrrM, lwrpc-admin-htr5ubst6-terry-lwrpc.vercel.app, verified READY/production on normal and dedicated View-As aliases. Approved application correction deployed at approximately 20:01 UTC. No migration, environment edit, corpus processing, Approved Answer creation or backfill.
2. Q78 retest: exact question submitted once at 20:02:50.550 UTC. Correct answer: Weekday open registration September 7, 2026, with the Weekday Important Dates page 1 citation. New event 73a67adf-5e7b-47b8-931e-c2538069f544.
3. Initial persistence: build 1 ms, RPC 54 ms, acknowledgement/total 55 ms. Completed answer timestamp 20:02:54.784; persistence acknowledged 20:02:54.840. These are application timings, not database execution subdivisions.
4. Recovery: not exercised. Attempt 1 RECORDED, commit FOUND; no deadline, reconciliation or retry. No artificial latency or production fault injection. Deployed routes schedule any recovery via Next.js after(); the observed request incurred only its initial persistence wait. No claim of measured post-response recovery latency is made because no recovery ran.
5. Exactly once: one Q78 outcome, zero occurrences, feedback and review events. All nine acceptance IDs have one outcome and zero related occurrence/feedback/review rows. No duplicate logical events observed. Successful answers intentionally persist metadata rather than source-observation rows; selected evidence count is one each. Multiple-attempt payload identity does not apply to this run; immutable-payload/late-commit proofs remain the accepted local tests.
6. Q55: not regenerated; answer routing/generation is unchanged. Retained successful production event 59e99390-e495-41f4-9537-be7f01904dbc plus current shared telemetry-path verification used.
7. Remaining-case results at the new instruction:
   
| Case | Observed answer | Source | Persistence |
|---|---|---|---|
| Q79 Saturday registration opens | September 7, 2026 | Saturday dates p1 | PASS, 57 ms |
| Q80 PrimeTime registration closes | October 4, 2026 | PrimeTime dates p2 | PASS, 55 ms |
| Q81 Weekday championship | December 9/10, 2026 | Weekday dates p1 | PASS, 75 ms |
| Q82 Saturday playoffs | March 6 and 13, 2027; top 4 teams | Saturday dates p1 | PASS, 31 ms |
| Q83 PrimeTime championship | December 11, 2026 | PrimeTime dates p2 | PASS, 46 ms |
| Q84 Weekday regular season ends | December 2/3, 2026 | Weekday dates p1 | PASS, 49 ms |
| Q85 Saturday regular season ends | February 20/27, 2027 | Saturday dates p1 | PASS, 81 ms |
| Q86 PrimeTime regular season ends | December 4, 2026 | PrimeTime dates p2 | PASS, 58 ms |
| Q87–Q89 | NOT RUN after new stop | — | — |

   Q86 was submitted before the new eligibility-defect message; its already-generated result was preserved afterward. The official end-date bullets do not explicitly assign each date to a gender/division, so no inferred mapping was required. Q85 retains awkward source-title wording ("2026 Fall League Important Dates season"), but its requested dates and year are correct; note as a wording limitation.

8. Telemetry health for the nine acceptance requests: first-attempt successes 9; deadlines 0; reconciliation-found 0; retries 0; retry successes 0; ultimate failures 0; duplicate logical events 0. The additional user-reported eligibility failure also persisted successfully (60 ms) and is excluded from acceptance call totals. Other concurrent user questions/feedback are not duplicates of this acceptance sequence.
9. Cost: nine acceptance question submissions / nine retained answer-model responses, gpt-5.5-2026-04-23; 14,188 input and 398 output tokens. Estimated uncached generation cost **USD 0.082880**, excluding embeddings. Nine retrieval invocations used the embedding path; embedding tokens/billing are not retained. Cached input counts remain unavailable, not zero. Five other outcome rows in this observation window are excluded by the local acceptance correlation ledger. No additional OpenAI traffic for telemetry accounting or eligibility diagnosis; no Q55 rerun or broad benchmark.
10. Privacy: telemetry recovery code remains the accepted frozen, sanitized payload implementation. Observed diagnostics expose IDs/counts/timings/status, not credentials, tokens, source excerpts or Live values. No Live personal data was retrieved for eligibility diagnosis. No View-As acceptance question was executed in this interval; dedicated View-As telemetry remains its separate actor/effective-user path, not the normal Stage 7 recovery path.
11. Integrity: preflight verified correct project/production, one existing LMS-0725 migration and no new local migration, production invoker RPC restricted to service_role/postgres with conflict guard and outcome/occurrence uniqueness. Corpus and Approved Answer counts/full-row hashes match the retained baseline (7 documents, 25 versions, 1,893 chunks, 1 answer, 2 revisions, 7 events). HMAC environment metadata unchanged; secret bytes were not read. LMS-0724 cron active every minute, 60 successes and zero failures in prior hour. Only read-only SELECT catalog/integrity checks were executed; "application-only/no SQL" deployment introduced no SQL changes. No historical backfill or rewrite was performed. Final comprehensive business/security/history integrity and remaining UI/View-As acceptance were interrupted by the new stop and are not certified as complete.
12. Limitations: natural timeout/recovery was not exercised in production; durable recovery through platform termination is not guaranteed by this bounded design. Cached/embedding accounting unavailable. Genuine user feedback occurred concurrently; its pre-existing histories must remain intact. Q23/Q36 and original Q78 historical telemetry failures remain unbackfilled, with their prior known/unknown causes unchanged.
13. Status: **LMS-0725 / 0.1.547 NOT PRODUCTION ACCEPTED.** Q78 correction passes targeted production telemetry. Acceptance is paused on the newly reported personal division-eligibility defect; Q87–Q89 remain unrun. See lms-0725-eligibility-diagnosis.md for the 12 requested findings and required Live capability boundary. No further implementation/deployment or acceptance questions after this stop. View-As real LMS UI parity/mini-LMS removal remains next mandatory work after production acceptance, with no automatic new version.

Artifacts: q78-final-deploy.txt; q78-final-preflight-corpus.json; q78-final-preflight-cron.json; q78-final-env-metadata.txt; q78-final-first-log.txt; q78-final-early-logs.txt; q78-final-later-logs.txt; q78-final-telemetry.json; q78-final-counts.json; q78-final-cost-ledger.json (all prefixed lms-0725-).

