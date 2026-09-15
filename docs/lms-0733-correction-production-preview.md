# LMS-0733 / 0.1.555 — corrected production preview checkpoint

**Correction deployed; actual production preview succeeded. STOP before live import.** Final confirmation was opened for inspection and cancelled. Source-rating rows and import batches are both **zero**. Production acceptance remains in progress pending owner review.

## 1. Deployment/source identity

Approved commit `a9a515da7287f50408fcd98b6779f3d7ad6806bb`, tree `8627c4a9a36598c0801872c935a645251d50732b`, is deployed READY as `dpl_2HH3eaFjrPesqRASyy6SacX4TQUT`, production `https://league.lwrpickleballclub.com`. Vercel project `prj_IBm5EKA3B2hciTmhvz0kIrPhZAX3`, team `team_l5rlGNrtKbyjq5Q0V4Pg9ouR`. Deployment reviewedCommit/gitCommitSha/tree metadata matches. The 323-file source allowlist was extracted and hash-verified directly from the commit; only the parser differs from the earlier deployed LMS-0733 application.

An initial CLI invocation failed before deployment creation because the local upload directory omitted the project's required `lwrpc-admin` subdirectory. The final upload retained that directory, matching the prior successful layout; no Vercel project setting changed. The first attempt did not deploy. Incidental CLI parent-workspace ref/message/gitDirty metadata is not source proof; exact Git-blob hashes and explicit correction metadata are retained.

No SQL mutation, schema, migration, RLS or grant change. Existing migration `20260910134349_season_ratings_source_import.sql` remains SHA-256 `8f532af5b44644e749696d3903785236c6fe173b3119408ca896a220f4543df4`, recorded exactly once under production version `20260910144835`. It was not reapplied.

## 2. Normal LMS smoke

Commissioner Dashboard and normal Captain Dashboard loaded; Captain context was signed-in Commissioner Terry with no assigned team, showing accepted empty states. Fall Season Ratings loaded normally with existing blanks. Ask LWR opened correctly without submitting a question. Member Detail's View As User entry passed its target check and opened the read-only-session confirmation; it was cancelled. Prior complete representative View-As/RF production evidence is retained. No new model traffic. Browser error log was empty at the final checkpoint.

## 3. Parser and actual production counts

The same original Downloads CSV SHA-256 `345f2a01399fa28933893c3423187e001e6295cae9332785abcfd8adf4eb2a6b` was uploaded once after correction. UI now reports **“Previewed 879 rows. No data has changed.”** The row-2 width error is gone.

The immutable parser removes the empty header suffix only. Production representative IDs, displayed member names, Doubles, RF and Metrics-derived age values match the original file and read-only member lookups. The reviewed preview has no email/phone/singles/status display columns; no masked or unmasked emails were exposed for verification. Those positional fields were verified in the accepted independent 8,790-field local check. No claim is made that an email display exists.

All 879 rendered preview rows were inspected across 18 pages. These are actual UI counts, not synthetic fixture counts:

| Disposition | Actual production preview |
|---|---:|
| Total CSV rows | 879 |
| Unique matches (active + inactive) | 696 |
| Active unique matches | 660 |
| Inactive skipped | 36 |
| DUPR IDs not found | 177 |
| Duplicate / ambiguous | 6 |
| Missing DUPR ID | 0 |
| Invalid ratings | 0 |
| No change | 0 |
| Ready to update | 660 |
| Total skipped | 219 |

The UI reports “Matched by DUPR ID” as 696; active/inactive were independently counted from the rendered row actions/reasons. The action totals reconcile: 660 + 219 + 0 + 0 = 879. All inactive rows are SKIP. No obsolete email/name matching failure reason was observed.

## 4. Age-source counts

| Scope | 65+ preferred | 50+ fallback | Missing age metric |
|---|---:|---:|---:|
| Whole unchanged CSV, independently recounted | 295 | 394 | 190 |
| Actual 660 UPDATE rows in production preview | 238 | 315 | 107 |

These scopes must not be conflated. Excluded rows do not propose source fields; the whole-file counts include those rows. Missing age UPDATE rows omit an invented age value and state that previous source age is preserved.

## 5. Representative identity/field checks

Direct read-only lookups use `upper(trim(dupr_id))` only. Display names are reference labels, not matching inputs.

| CSV line / DUPR ID | Verified member initials | Production source proposal |
|---|---|---|
| 2 / 8GGLQ8 | K. M.; one active member | Doubles 3.237; RF 30; age 3.478 from 50+ |
| 5 / 8E9WJ8 | A. C.; one active member | Doubles 4.620; RF 100; no age value, missing flag true |
| 8 / 3L4VK3 | B. W.; one active member | Doubles 4.196; RF 100; age 4.744 from 65+ |

Each proposal matches the original CSV. The preview labels RF **“Source only; no season reclassification.”** It does not turn RF values into new locked season classifications.

NOT FOUND samples `125941` and `8GYXG8` both have zero current normalized-ID matches. A third sample, `G7QJ5M`, was NOT FOUND in the displayed preview but gained one active match during owner editing; see concurrency below.

Inactive samples `8D9V2L`, `3PPODX` and `16X4Z0` each have exactly one inactive member and are SKIP.

All six actual ambiguous IDs were individually verified:

| DUPR ID | Current member records | Activity |
|---|---:|---|
| 1R9LNE | 2 | both active |
| 3ZXM6L | 2 | one active, one inactive |
| EGL7GM | 2 | both active |
| GGRG5Q | 2 | one active, one inactive |
| XJNDN5 | 2 | one active, one inactive |
| QP7W65 | 2 | both active |

All six remain SKIP with “Duplicate source DUPR ID or ambiguous LMS identity.” No member was selected or corrected.

## 6. Protected values and source fields

Preview proposals contain only `doubles`, `rf`, `age`, `ageSource`, `ageMissing`, `rfMissing`, `doublesMissing`: current/source Doubles, RF, age and their reviewed provenance flags.

Protected/locked status rows: **0 shown**. Populated locked Season DUPR/PrimeTime rows: **0 currently present**, not 660 blocked updates. There is no separate numeric protected-row tile in the reviewed UI or confirmation. Its global text explicitly excludes Season DUPR, PrimeTime Season DUPR, season RF and member details from updates.

Production still has 2 Fall Season Ratings rows and 1,010 Saturday rows, with zero populated Season DUPR and zero populated PrimeTime Season DUPR across both seasons. None of the rendered matched rows had an existing Fall season row to show as a per-row preserved-value example. Thus a representative *populated* live locked-value example is unavailable; none was manufactured. The full `member_season_ratings` fingerprint remains unchanged, protecting all existing values/classification inputs. Accepted synthetic populated-value regression evidence remains available.

Clean Ratings, Delete and Copy were not invoked. RF29 NR / RF30 RATED production evidence from the earlier checkpoint is retained; no policy logic changed in this correction.

## 7. Import action and confirmation

“Import Matched Ratings” is visible and enabled. Its first action opens a zero-write confirmation. The actual summary was:

- Target Season: **2026 Fall Season**
- Rows to update: **660**
- No change: **0**
- Skipped/invalid: **219**
- Season ID: `3780e56b-adeb-46be-ab1c-b754bc8aa737`
- Source fields: **DUPR Doubles, Reliability Factor, Age-based DUPR, age metric, age presence, RF presence, Doubles presence**
- Preservation text: **Season DUPR, PrimeTime Season DUPR, season RF, notes and member details are preserved. Clean Ratings will not run.**

No separate protected count appears; preservation is explicit text. The final confirmation button was **not clicked**. Cancel was clicked. The preview remains open with no successful-import state.

## 8. Concurrency and integrity

Owner explicitly confirmed: **“Yes, I’m editing members/DUPR IDs.”** The initial preflight already showed three member updates after the earlier checkpoint and before this correction deployed. Further member edits occurred during review. This accounts for legitimate member-fingerprint drift; we did not rewrite or restore those records.

The live preview contains one more active match and one fewer NOT FOUND than the old 659/178 reference. The pre-preview live ID aggregate independently found the same 696 unique / 660 active / 36 inactive / 177 missing / 6 ambiguous counts. This is live-state evidence, not forced fixture parity.

Later, `G7QJ5M` gained a unique active match, with member updated_at **2026-09-10 15:32:40.283 UTC**. It remains SKIP in the frozen preview. The owner-confirmed concurrent edits mean these 660-ready results are a point-in-time snapshot and **must be refreshed before any future authorized import**. We did not repeat the upload or execute a commit after observing this drift.

All **19** operational fingerprints were rechecked. **18 unchanged exactly**, including all Season Ratings, teams/rosters, schedules/matches/scores, seasons, leagues/divisions, locations and roles. **Members changed during owner-confirmed editing**; count remains 1,974. Final fingerprint capture: **2026-09-10 15:33:49.760023 UTC**. No candidate-caused business write was observed; exact member-field attribution is limited because the earlier checkpoint retained aggregate fingerprints, not before-images.

Final independent checks:

- Source-rating rows: **0**
- Import batches: **0**
- Season Ratings rows/values: unchanged
- Existing security snapshot: unchanged
- Source migration history: exactly once
- View-As maintenance job: active
- New Ask LWR/OpenAI calls this continuation: **0**, cost **$0**. Telemetry still contains only the two earlier RF checks.

## 9. Rollback and owner gate

Accepted LMS-0732 / 0.1.554 rollback deployment `dpl_414rqyGtFAFrcQ6JNRTVH9Qs2cGU` remains READY. No rollback was executed. Additive source infrastructure stays in place; zero imports means no rating-data reversal is needed.

**STOP AND WAIT for explicit owner authorization. No live import is authorized or completed.** Because member edits continued, any later authorized import must start with a refreshed preview and reviewed current dispositions; this cancelled preview is not a standing commit instruction. Do not reapply the migration.

Evidence: [checkpoint JSON](lms-0733-correction-production-preview.json), [production preflight](lms-0733-correction-production-preflight.json), [correction identity](lms-0733-correction-identity.json), [deployment manifest](lms-0733-correction-deployment-manifest.json), [successful deployment log](lms-0733-correction-production-deploy-root.txt), [initial local-layout error](lms-0733-correction-production-deploy.txt), [local correction review](lms-0733-correction-review.md).
