# Full DUPR input precision — SQL review required

September 11, 2026. Scope includes the owner's final field-presentation clarification. No application change, deployment, production Import/Clean, SQL mutation, or data repair was performed.

## Diagnosis

This cannot be corrected by an application-only deployment. The live `ratings_workflow_private.plan(uuid,uuid,text,jsonb)` function explicitly truncates Doubles and Age-Based to one decimal while constructing Upload/Transfer `fills`. The commit function recomputes that plan and writes its fills. Both preview and actual storage therefore lose precision before Clean.

The exact offending expression in the source-to-working branch is:

```sql
case when field='doubles'
then to_jsonb(case when s->>'doubles'='NR' then 'NR'
                  else trunc((s->>'doubles')::numeric,1)::text end)
when field='age' then to_jsonb(trunc((s->>'age')::numeric,1))
else s->field end
```

The browser's `SeasonRatingsWorkflow.js` also uses `Math.trunc(Number(v)*10)/10` and `toFixed(1)` for its source-to-working preview label and says ratings truncate during Upload. Both must change alongside the planner. The CSV parser already retains valid three-decimal DUPR precision; source/audit JSON retains the full values. The main Season Ratings grid displays `dupr_doubles_rating` directly, so Terry's current 4.0 is stored data, not a one-decimal display mask. Its manual Doubles formatter retains three decimal places.

## Database capacity

| Field | Current production type | Capability |
|---|---|---|
| DUPR Doubles | text | Supports 4.077 and NR |
| Internal Working Age-Based | numeric without a precision/scale limit | Supports 4.311 / 4.487 |
| Reliability Rating | numeric(6,3) | Supports whole-number source RF; grid displays 100 rather than 100.000 |
| Source data | jsonb | Retains full imported source values |
| Season / PrimeTime finals | numeric(4,2) | Leave unchanged; Clean produces one-decimal calculated values |

**No column type change is needed. A database function change is nevertheless required.** The owner's application-only deployment condition is therefore not satisfied; stop for SQL review.

## Concrete proposed correction — not applied

1. In `ratings_workflow_private.plan`, replace the offending per-field CASE with `s->field`, yielding `fills := fills || jsonb_build_object(field, s->field)`. Source validation already enforces valid Doubles/NR, age, and whole-number RF. This retains complete values and existing fill-blank-only behavior. The shared Transfer branch would also preserve source precision; its maintenance gate remains unchanged.
2. Version the Upload/Transfer plan fingerprint so an outstanding pre-correction signed receipt cannot commit a different full-precision plan than it previewed. Append a fixed precision-version marker only for Upload/Transfer when computing the fingerprint; retain receipt signing, actor/session binding, expiry, revalidation, locks, and transaction behavior. Leave combined Clean version and calculations unchanged.
3. Remove Upload preview's one-decimal input formatter and change its explanatory text to distinguish full-precision inputs from Clean's one-decimal finals. Show source 4.077 / 100 / 4.311 and the actual proposed fills, while truthfully showing existing fields as preserved. Do not add a Working Age-Based grid column.
4. Add permanent positive regression tests for the corrected Upload preview/commit, full-precision source/working values, old-receipt rejection, fill-blank preservation, matching/ambiguity, and Clean input immutability; run affected tests, lint, and build before coordinated SQL/application deployment.
5. Retain the old function definition and accepted application deployment for rollback. No existing business data should be changed by the function migration. Keep any data correction separately authorized and audited.

No changes to auth, grants, RLS, constraints, member IDs, duplicate assignments, RF semantics, over_65/valid-over_50 selection, NR/current-division rules, or final rating precision are proposed.

## Current production impact

Read-only inspection found **671 Fall rows with working Doubles/RF**, **560 with working Age-Based**, **544 regular finals**, and **495 PrimeTime finals**. Comparing working numeric values to stored full-precision source evidence:

- **620 Doubles fields** have lost nonzero precision and equal source truncated to one decimal.
- **556 Age-Based fields** have lost nonzero precision and equal source truncated to one decimal.
- **625 distinct member/season records** have at least one affected field.
- Input provenance confirms the 620 Doubles and 556 age losses; these are not merely differences in trailing-zero formatting.
- No populated working row lacks a source record.
- Saturday has 1,010 rating rows, all working/final fields blank: no working-data repair is needed there.

Terry Adelman / `1R9LNE` currently has Fall working `4.0 / 100 / 4.3`, finals `4.00 / 4.30`, and source evidence `4.077 / 100 / 4.311`. The previous blank-state preview is historical; current values are now populated. Routine re-import must preserve them under fill-blank-only semantics. Likewise, Upload does not clear existing finals: the owner's expected blank finals after Upload apply when starting from blank finals.

Safest repair path, only after separate approval: prepare an exact per-row before/after comparison against verified source and input provenance, exclude ambiguous/unverified identities and intervening edits, then perform a narrowly guarded audited correction of affected working inputs while preserving final ratings and all unrelated data/history. Do not use Delete/Clean or broad overwrite to recover precision. No repair has been executed or authorized by this review.

## Diagnostic verification

Eight local checks passed in the existing isolated PostgreSQL fixture, with no production connection: parser retains 4.077/100/4.311; the current SQL Upload preview AND commit reproduce 4.0/100/4.3; and six existing Clean preview/commit cases verify truncation and preservation of Doubles, RF, and internal age inputs:

| Doubles input | Internal age input | Season final | PrimeTime final |
|---|---|---|---|
| 4.077 | 4.311 | 4.0 | 4.3 |
| 4.099 | 4.487 | 4.0 | 4.4 |
| 4.100 | 4.100 | 4.1 | 4.1 |
| 4.199 | 4.199 | 4.1 | 4.1 |
| 4.999 | 4.999 | 4.9 | 4.9 |
| 3.604 | 4.311 | 3.6 | 4.3 |

RF was 100 with selected cutoff 29. Clean committed the expected finals and retained every original input. These tests confirm current Clean behavior; they are not a claim that corrected Upload is implemented. Diagnostic script/results are in `.local-validation/diagnose-ratings-precision.mjs` and `.local-validation/ratings-precision-diagnostic-results.json`.

No new build or corrected production preview exists because the SQL review boundary was reached before implementation. Last deployed application remains `7c0e5c7c1fff3803f6b3c2593175dd5ef11c9037`. Do not proceed with Import expecting full-precision working values until the coordinated correction is approved, implemented, and verified. Existing truncated values additionally require separate repair approval.
