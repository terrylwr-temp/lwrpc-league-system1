# DUPR current CSV mapping correction — September 11, 2026

Scope authorized by owner: application-only header/path mapping correction, focused/static/build validation, deployment, production CSV preview only. No production Import, Clean, Delete, Copy, repair, SQL/schema/RLS/grant changes. Original normal-action commit is 1cf9fb25fc94288c92b035678d6fe8b4fabae000.

## Header and exact mapping diagnosis

Actual file: members-list-lakewoodranchpickleballclub-091026223019.csv, SHA-256 a4857c7a1d9ee43261ec29a7e226d478bec4f4b2b47253cc4e3a77a2c247a704. 886 data rows, ten fields per row. Header is:

```csv
"duprId","name","email","phone","singles","singlesReliability","doubles","doublesReliability","status","metrics",""
```

The final unnamed header is export padding; the established CSV parser removes only empty suffix headers and never shifts row values. Identity is duprId only. Name/email/phone and status are not matching substitutes. Singles and singlesReliability are unrelated to these working ratings. Metrics contains statistics and subscores; only the specified age subscores are used. All fields are indexed by normalized header name, not inferred by position or value.

**The reported wrong mapping was not reproduced in the deployed parser.** It already reads `row.doubles` and prefers the presence of `row.doublesreliability`. Mapping 3.604 to Doubles and 30 to Doubles RF would mean selecting `singles` and `singlesReliability`, respectively. Those are the wrong interpretations, not the actual deployed code paths. The old parser returns Terry source Doubles 4.077, RF 100, age 4.311. It never uses careerHigh.

Two actual edge-case discrepancies are corrected: (1) the old parser rejected disagreeing current and legacy RF columns; now the current header wins unconditionally, including when its row value is missing/invalid (no alias fallback). (2) the old parser rejected a row with invalid over_65 instead of trying valid over_50; now valid over_65 wins, otherwise valid over_50, otherwise age is absent. Invalid metrics JSON/object structure still fails; current fractional/invalid RF is rejected by the working workflow. Legacy doublesRe is used only if the current header is absent.

Source values retain their original precision in import history. The existing working workflow truncates Doubles and age to one decimal and keeps RF an integer. No SQL calculation changes. Clean continues to consume the existing working fields; no production Clean was run.

## Terry exact trace

| CSV header/path | Raw | Expected working value |
|---|---|---|
| duprId | 1R9LNE | Matching identity only |
| doubles | 4.077 | 4.0 |
| doublesReliability | 100 | 100 |
| metrics.subscores.doubles.over_65 | Absent | Valid over_50 fallback |
| metrics.subscores.doubles.over_50 | 4.311 | 4.3 |
| singles | 3.604 | Not used |
| singlesReliability | 30 | Not used |
| metrics.statistics.doubles.careerHigh | 4.152 | Not used |

Read-only LMS identity check finds TWO member records with DUPR ID 1R9LNE. Both are active and neither has a Fall rating row. The existing ambiguity guard must continue to exclude Terry from import. Preview shows the parsed source values even for excluded rows; these are not a claim that an ambiguous member will be written. No identity repair is included.

## Full-file and production impact

All 886 CSV rows parse successfully under both old and corrected code; zero parsed-result differences for this actual file. Age source: 297 over_65, 398 over_50, 191 missing. Singles differs from Doubles in 813 rows; Singles RF differs from Doubles RF in 804 rows, making confusion detectable.

Read-only production snapshot at 15:32:39 UTC: Fall has 667 working Doubles, 667 RF, 557 age, 541 final Season, 492 final PrimeTime values. Saturday has 1,010 rating rows with all five fields blank. The earlier owner Delete is historical; populated Fall rows are now present. All 667 Fall working rows match the current CSV's authoritative values exactly after truncation; zero mismatches, zero missing/ambiguous CSV matches among imported rows. No incorrect-mapping repair is indicated. Existing final ratings were not recalculated in this task; counts are reported without claiming a new Clean verification.

## Correction and validation

Three runtime files: parser edge-case precedence, preview-only source metadata, preview labels/raw-to-working values. Matching/authorization/receipt/commit logic, maintenance flags, SQL, Clean, Delete and Copy unchanged. Two earlier invalid-input test cases are replaced because the owner's explicit policy now requires accepting current RF over conflicting alias and using a valid fallback after invalid over_65. All other invalid-input controls remain.

Permanent reordered distinct-value CSV uses Singles 3.604, Singles RF 12, Doubles 4.077, Doubles RF 87, legacy RF 30, careerHigh 4.152, over_50 4.311, over_65 4.487. Tests verify named fields, both age precedence cases, missing/invalid age, RF precedence/missing/invalid/fractional values, real read-only database preview truncation 4.0/87/4.4 and fallback 4.3, no source-age fallback when absent, and rendered source labels for excluded identities.

Validation: all 96 affected tests PASS; lint PASS (six existing warnings), build PASS, TypeScript PASS, PDF server bundle PASS, diff checks PASS. Deployment and production preview evidence will be appended after release. Separate existing ten-test baseline debt remains OPEN; this correction follows the latest owner's focused/static/build deployment authorization and does not resolve or globally waive that debt.

## Evidence

See root documentation `season-ratings-header-file-audit.json`, `season-ratings-header-file-differential.json`, `season-ratings-header-production-before.json`, `season-ratings-header-impact.json`, `season-ratings-header-focused.txt`, and static/build logs under the same prefix. No credentials or full member records are persisted in these artifacts.


## Final 15-item owner report

| Requested item | Verified result |
|---|---|
| 1. Actual header | Exact current header above; 10 named fields plus blank suffix padding; 886 rows. |
| 2. Old Doubles mapping | Actual deployed code already uses `doubles`. The reported 3.604 is `singles`; interpreting it as Doubles is incorrect and was not reproduced in the parser. |
| 3. Corrected Doubles mapping | `doubles` only; existing working truncation, e.g. 4.077 → 4.0. Explicit preview source label added. |
| 4. Old RF mapping | Actual deployed code already preferred `doublesReliability`, but rejected conflicting legacy alias. The reported other value 30 is `singlesReliability`. |
| 5. Corrected RF mapping | Presence of `doublesReliability` header always wins; missing/invalid current value does not fall back. `doublesRe` only when primary header absent. Whole-number working RF enforced. |
| 6. Age precedence | Valid metrics.subscores.doubles.over_65, else valid over_50, else blank. No Doubles/careerHigh fallback. |
| 7. Terry raw trace | doubles 4.077; doublesReliability 100; over_65 absent; over_50 4.311; singles 3.604; singlesReliability 30; doubles careerHigh 4.152. |
| 8. Terry production preview | **PASS: source values 4.0 / 100 / 4.3**, explicit source paths. Both matching LMS rows marked REVIEW / Ambiguous DUPR identity. Not eligible for import under existing identity guard. |
| 9. Full-file impact | 886 valid rows; zero old/new parsed differences in this actual file. 297 primary age, 398 fallback age, 191 missing age. All 667 currently imported working rows match this file. |
| 10. Current data | Fall: 667 Doubles/RF, 557 age, 541 final Season, 492 final PrimeTime. Saturday: 1,010 all-blank rows. Source history records owner import of 667 at 15:23:18 UTC. No incorrect working mapping found; no repair. Final ratings were not rerun. |
| 11. Tests/build | **96/96 affected tests PASS**. Lint (six existing warnings), build, TypeScript, PDF bundle and diff PASS. Permanent distinct-value fixture and database-preview/UI assertions committed. |
| 12. Deployed commit | **d8b55475a5377b6c6c05ead4e72a63236f681dab**; deployment **dpl_7TPb3ZXyPMpPrgMy35CEpDH4cvSd**, READY, promoted to league.lwrpickleballclub.com. 1,161 archive files match committed Git blobs. Both maintenance flags explicitly false at build/runtime. |
| 13. Production verification | Current CSV preview only: Terry plus 89OW47, 3YZWZD, 8DOXEM, 3YZEPG match expected source/truncated values; includes over_65 precedence, over_50 fallback, missing age, and inactive/duplicate exclusion. Dashboard and Ratings load normally. All rating/source data and **18 of 19 protected table hashes/counts are identical** from 15:42:29 to 15:47:39 UTC. The only difference is Locations: Esplanade at Artisan Lakes updated 15:46:59 UTC; the owner explicitly confirmed this concurrent edit. It is not attributed to the CSV preview. No Import/confirmation/Clean/Delete/Copy actions. |
| 14. SQL requirement | **None for this correction.** No SQL/schema/RLS/grant/data repair performed. Duplicate-ID resolution would be separate reviewed identity work, not part of this parser release. |
| 15. Owner Import afterward | Mapping is verified for uniquely matched eligible rows. **No re-import is needed to correct these 667 rows**: their existing inputs already match, and current preview says unchanged inputs for all 667. Re-import would record import history under the existing workflow. Terry remains excluded until the duplicate identity is separately resolved; do not bypass the guard. Codex has not imported or run Clean. |

Final status: **HEADER/PATH CORRECTION — PRODUCTION PREVIEW ACCEPTED**, with existing duplicate-identity exclusions explicitly preserved. This is preview acceptance of the bounded mapping/clarity correction, not a claim to have executed a new production Import/Clean. The preceding normal-action release's owner workflow acceptance is not inferred merely from the data counts.

Recovery: prior deployment dpl_6tkBP82qYfhA6amAQB8zqq5ZHFfU (1cf9fb25) retained, plus earlier accepted dpl_4j1HcDHg8aj8GeZKkPoAGFogGLKp. No database rollback required because this release changed no database objects or business rows.

Additional evidence: `season-ratings-header-production-preview.json`, `season-ratings-header-integrity-before.json`, `season-ratings-header-integrity-after.json`, `season-ratings-header-integrity-result.json`; local `.local-validation/season-ratings-header-identity.json`, `ratings-header-deployment-metadata.json`, `ratings-header-promote.txt`, `ratings-header-domain-final.json`. The browser is left on current CSV preview page 2 displaying Terry and the distinct-value controls.
