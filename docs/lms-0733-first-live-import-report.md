# LMS-0733 / 0.1.555 — first live Season Ratings import

**SUCCESS: one authorized source-only import batch committed, 659 source rows verified.** All 19 operational fingerprints match the immediate pre-commit baseline. No Clean Ratings, Copy, Delete, member edits, SQL migration or additional deployment was performed. Work stops after this report.

Application: LMS-0733 / 0.1.555, commit `a9a515da7287f50408fcd98b6779f3d7ad6806bb`, READY deployment `dpl_2HH3eaFjrPesqRASyy6SacX4TQUT`. The corrected application remains deployed; the controlled first live import is complete. This report records technical completion without inventing a separate owner acceptance decision.

## 1. File identity and fresh preview

The exact reviewed Downloads file was reselected after discarding stale preview state:

`members-list-lakewoodranchpickleballclub-091026124814.csv`

SHA-256: `345f2a01399fa28933893c3423187e001e6295cae9332785abcfd8adf4eb2a6b`.

The hash remained identical at the final pre-commit gate. The final preview parsed all 879 data rows, freshly matched by DUPR ID only, with no name/email fallback. All 879 displayed actions/reasons matched an independent current-member identity query.

| Final fresh preview | Count |
|---|---:|
| Total CSV rows | 879 |
| Unique matches, including inactive | 695 |
| Active / ready | 659 |
| Inactive skipped | 36 |
| Not found | 176 |
| Ambiguous | 8 |
| Missing DUPR ID | 0 |
| Invalid | 0 |
| No change | 0 |
| Total skipped | 220 |
| Populated locked Season DUPR/PrimeTime rows available | 0 |

There is no separate PROTECTED row counter in the reviewed UI. Protection is field-level: established/legacy season fields are excluded from every source update. No protected-value overwrite was proposed or performed.

## 2. Differences and stale-preview prevention

The accepted earlier production preview had 660 ready, 177 not found and six ambiguous IDs. Current member editing explains all differences:

- `G7QJ5M` gained one active match (member updated_at 15:32:40.283 UTC): not found decreases by one, ready increases by one.
- `ZN5DGM` gained a second active match (15:41:07.805 UTC): ready decreases by one, ambiguity increases by one.
- `67POVE` gained a second active match (15:43:54.427 UTC): ready decreases by one, ambiguity increases by one.

Net: **659 ready, 176 not found, eight ambiguous**. Inactive remains 36. These are production mappings, not fixture assumptions. No duplicate was resolved or member selected on the owner's behalf.

The first new 661-ready preview was cancelled when the final gate detected `ZN5DGM` becoming ambiguous. A replacement showed the second new ambiguity. The owner then confirmed **“Edits are paused—finish the import.”** Both pre-pause previews were discarded without a transaction. A completely fresh preview was generated after the pause.

Final independent identity check at **2026-09-10 15:46:54.687026 UTC** confirmed all member-ID/activity mappings were unchanged from the paused baseline. Source rows and batches were still zero; Fall Season was active. The reviewed server transaction also revalidated every proposed DUPR ID as the same unique active member immediately at commit. There was **one final-confirmation click**, not a retry of a failed transaction.

All eight skipped ambiguous IDs: `1R9LNE`, `3ZXM6L`, `EGL7GM`, `GGRG5Q`, `XJNDN5`, `QP7W65`, `ZN5DGM`, `67POVE`.

## 3. Fresh confirmation and transaction

The final confirmation showed:

- Target Season: **2026 Fall Season**
- Season ID: `3780e56b-adeb-46be-ab1c-b754bc8aa737`
- Rows to update: **659**
- No change: **0**
- Skipped/invalid: **220**
- Source fields: **DUPR Doubles, Reliability Factor, Age-based DUPR, age metric, age presence, RF presence, Doubles presence**
- Explicit preservation of **Season DUPR, PrimeTime Season DUPR, season RF, notes and member details**; Clean Ratings will not run.

Only after all fresh gates passed was the final Import Matched Ratings button clicked.

Actual UI result: **“Imported 659 source rating rows. Season ratings preserved.”**

Database result:

| Result | Verified value |
|---|---|
| Batch ID | `2c0fcb21-e3b3-4dc0-ab52-9b49114995af` |
| Committed at | 2026-09-10 15:47:26.791625 UTC |
| Successful logical batches | **1** |
| Updated | **659** |
| Reported season values changed | **0** |
| Source rows | **659** |
| Source revision | **1 on every row** |
| Source/payload mismatches | **0 of 659** |
| Current unique-active identity mismatches | **0 of 659** |
| Captured before-images | **659, all previously absent** |

All rows belong to the intended Fall season and the same batch. Since the source store started empty, 659 updates mean 659 new source records, not 659 writes to legacy Season Ratings. The durable batch and all source rows agree with the reviewed signed payload. No partial or unknown outcome remains. No import transaction failed or was retried.

## 4. Representative matches and stored values

Read-only pre-confirmation queries verified unique active member mappings for the samples below. Stored values were then compared with the original CSV after commit:

| DUPR ID / initials | CSV = stored Doubles | CSV = stored RF | CSV = stored age source |
|---|---:|---:|---|
| 8GGLQ8 / K. M. | 3.237 | 30 | 3.478, over_50 |
| 8DN0Y3 / B. P. | 3.485 | 10 | 3.729, over_50 |
| 3L4VK3 / B. W. | 4.196 | 100 | 4.744, over_65 |
| 8E9WJ8 / A. C. | 4.620 | 100 | absent; ageMissing=true |
| G7QJ5M / S. M. | NR | 0 | absent; ageMissing=true |

The RF10 example remains raw source Doubles 3.485; import does not run cleanup or rewrite locked classification. RF comes from `doublesReliability`, not Singles reliability. Names, email, DUPR IDs, membership status, Auth identity and roles were not written.

Stored source keys are limited to `doubles,rf,age,ageSource,ageMissing,rfMissing,doublesMissing`. The batch also retains reviewed audit metadata and before-images.

## 5. Age source and missing values

| Scope | over_65 | over_50 fallback | Missing |
|---|---:|---:|---:|
| Whole original CSV | 295 | 394 | 190 |
| Final ready population and stored source rows | **236** | **315** | **108** |

All 108 missing-age records have no fabricated `age` key. The two newly excluded ambiguous rows accounted for two over_65 proposals; the newly matched row has no age metric. This explains the change from the accepted earlier ready-row 238/315/107 counts.

## 6. Locked values and classification protection

The entire `public.member_season_ratings` table is unchanged: 1,012 records (two Fall and 1,010 Saturday). Both seasons had zero populated Season DUPR and zero populated PrimeTime Season DUPR values before this import. Therefore a live populated-value example is unavailable; none was created. Accepted local regression tests cover populated locked values.

Every existing legacy season row, raw season RF/NR input, note and rating value has the same fingerprint after import. No existing classification input was rewritten. Current-source age lives separately from PrimeTime Season DUPR.

The normal Ratings grid still displays the legacy inputs: the K. M. sample's existing Doubles/RF/Season/Age grid fields remain blank, as before. **This import populated the reviewed separate source store; it did not populate or establish the legacy season fields.** Imported source values were verified directly in that store. No automatic promotion or cleanup was performed.

The Rules-driven RF policy remains RF29 NR / RF30 Rated according to the earlier passing production evidence. Clean Ratings remains a separate prompted workflow and was not invoked.

## 7. Operational and identity integrity

All **19 operational fingerprints** match the immediate pre-commit baseline exactly at post-import capture **2026-09-10 15:48:24.052306 UTC**. This includes:

- members and roles;
- Season Ratings and classification inputs;
- teams and roster assignments;
- schedules, matches, lineups, scores and standings;
- seasons, leagues/divisions and location configuration.

Earlier member-fingerprint differences during preview preparation were the owner's confirmed concurrent editing. Once the owner paused, there were no member updates after the paused baseline in the additional read-only check. No unrelated business mutation was attributed to this import.

The only intentional database writes were the reviewed source rows and one import audit batch. No Auth mutation, migration reapplication, schema/RLS/grant change, Copy/Delete or other league operation ran.

## 8. Normal LMS after import

Lightweight post-import checks passed:

- Season Ratings page and import success state.
- Normal Ratings search and unchanged legacy input display.
- Commissioner Dashboard.
- Captain Dashboard in the signed-in Commissioner's normal unassigned context.
- Ask LWR entry opened without submitting a model question.
- Representative read-only View-As Captain session loaded Nick Williams / Net Rushmore (AL); the session was exited back to normal context.

Production still has the previously documented empty match/roster coverage limitations; no test rows or simulated league operations were created. No additional Ask LWR/OpenAI calls occurred (zero request outcomes since import preparation began).

## 9. Rollback and final status

**No rollback was needed or executed.** The single transaction completed atomically. Its retained batch payload and 659 before-images provide the reviewed recovery evidence; every imported source was previously absent. Any future data reversal would require separate scoped authorization and revision checks, not a blind application rollback.

Accepted LMS-0732 application rollback deployment `dpl_414rqyGtFAFrcQ6JNRTVH9Qs2cGU` remains the recorded recovery target. Application rollback alone would not remove the now-imported source rows. The current LMS-0733 correction stays deployed.

**Final status: LMS-0733 first live source import successfully completed and verified.** No further import, cleanup or release is started. Member editing may resume.

Evidence: [machine-readable result and fingerprints](lms-0733-first-live-import-result.json), [corrected production preview](lms-0733-correction-production-preview.md), [immutable correction identity](lms-0733-correction-identity.json).
