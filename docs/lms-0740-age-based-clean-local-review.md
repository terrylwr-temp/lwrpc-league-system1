# LMS-0740 / 0.1.562 — Age-Based Clean input correction

Status: LOCAL REVIEW CANDIDATE, NOT DEPLOYED. Owner approved correcting/testing Clean locally after the read-only 8EPKQE diagnosis. No production business data changes, migrations, RLS/grants, deployment or configuration changes are authorized or performed by this candidate.

## Before and after

For the reported 2026 Fall Season example, CSV and stored Age-Based input are 4.659, RF is 100, regular source is 4.114, regular final is 4.1, and Age-Based final is blank. Upload correctly stores the full-precision input. Clean previously omitted that column from reads and truncated the already-blank final column, leaving it blank.

The ratings query now includes dupr_age_based_rating. Clean uses it as the source for season_primetime_rating and proposes 4.6. Full-precision input, Doubles, RF and existing notes are not overwritten. The explicit Clean confirmation describes this source selection. Existing Clean behavior intentionally recalculates final ratings after administrator confirmation; Upload still does not establish finals.

For older rows with no separate input (null/undefined/blank), Clean retains the existing final-value truncation behavior. A present invalid input does not fall back to a seemingly valid final or manufacture a proposed output. Both values absent leave the final unchanged. Regular RF cutoff, NR/division calculations and Age-Based RF behavior are unchanged; this is not a redesign of NR policy.

After the existing successful Clean write/read sequence, the grid refresh key advances so uncontrolled inputs display newly fetched committed values. The selected season is preserved. Existing confirmation, cancellation, write-error and explicit administrator execution paths remain in place. No automatic Clean or live acceptance write was run. Delete/Copy, Upload parsing/matching/precision and receipt/security protections are unchanged.

## Verification scope

Eight focused regression tests execute the actual page helper/planner/application functions in a synthetic VM harness. They cover 4.659 -> 4.6, separate-column selection, old-final precedence, repeated no-change, missing/invalid input, legacy fallback, truncation, selected-season isolation, regular RF/NR controls, proposed write fields, refetch/remount ordering and write failure without success. Four existing RF/Upload isolation controls also passed (12/12 focused).

This turn used no live database writes or browser acceptance actions. Synthetic function tests do not establish production acceptance. Build/lint/full-suite results are recorded below when complete.

## Release and recovery boundary

Base application commit: 64185ed (LMS-0739 / 0.1.561). Keep this candidate local for owner review. Do not deploy or run production Clean as acceptance without separate authorization. This changes Clean's final-rating proposals and is outside the automatic FAST FIX deployment lane.

Existing Clean performs client-issued batched writes rather than the separate server workflow transaction. That pre-existing atomicity/concurrency limitation is unchanged; this bounded source-field correction does not claim to resolve it. Application rollback cannot undo any later administrator-confirmed Clean. A separately approved live data operation must include its own data recovery plan.

## Final local results

- Full automated suite: 1,295/1,295 passed (eight new tests).
- Focused source-field/RF controls: 12/12 passed.
- Lint: 0 errors, 11 existing warnings.
- Production build: passed on retry with local filesystem permission. Initial run compiled successfully but failed writing the existing .next/cache/.tsbuildinfo file with EPERM; no source correction was needed for the retry.
- Diff whitespace check: passed.

Evidence: .local-validation/lms0740-tests.log, lms0740-lint.log, lms0740-build.log and lms0740-build-retry.log. No production acceptance claimed. Ready for review; deployment remains unapproved.
