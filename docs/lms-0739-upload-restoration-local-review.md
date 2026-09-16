# LMS-0739 / 0.1.561 — local Upload restoration review

Status: LOCAL ONLY, NOT DEPLOYED. Owner approved implementation and testing for review before deployment. No production import, Clean, restoration, security change or configuration change was performed.

## Diagnosis and correction

Delete removes selected-season working rows but retains private source records. The application called the old source-only importer, so unchanged CSV values produced NO CHANGE even when working rows were missing.

Read-only inspection found the previously reviewed `season_ratings_workflow_preview` and `season_ratings_workflow_commit` transactions already deployed. The earlier proposal's expectation that database-function changes were needed is superseded: this candidate reconnects Upload to those existing transactions. No SQL migration, grants or RLS change is included. Local SQL files under test/fixtures are test fixtures, not deployment scripts.

The application locks the operation to upload, verifies actor/session-bound signed receipts, and preserves server authorization, snapshot revalidation, transactional rollback, before-images and idempotency. Old source-only receipts must be replaced by a fresh preview. Unique active-member matching uses normalized DUPR ID. Unmatched, ambiguous, inactive and invalid rows cannot populate working inputs.

An unchanged source record can now fill missing selected-season working inputs. Doubles, RF and internal Age-Based inputs fill independently only where blank, at source precision. Existing values, zero RF, final Season DUPR/PrimeTime ratings and notes remain protected. Whole-number RF validation follows the existing reviewed transaction. Upload does not calculate final ratings or run Clean.

The preview separates CSV values, existing inputs and proposed fills. It labels FILL as CREATE / FILL INPUTS because the existing response does not distinguish creation from filling; it does not invent a created-row count. Populated inputs are identified as protected rather than incorrectly described as unusable source values.

After commit, the actual transaction result supplies the summary. The file, preview and receipt clear; selected season stays selected; selected-season and all-season data are re-fetched and visible input values remount from server data. Cancellation and transaction failure retain file/preview. A post-commit refresh error retains the success result and reports the read failure separately without retrying the transaction.

## Verification

- Full automated suite: 1,287/1,287 passed. An earlier run overlapped a package-version write and was discarded; the stable rerun passed.
- Final focused controls after the summary adjustment: 46/46 passed, including eight new restoration tests and existing CSV/import controls.
- Local PostgreSQL/PGlite tests use the deployed transaction definitions with synthetic data: deleted-row restoration, two seasons, precision, blank-only protection, repeats, stale preview rejection, injected atomic failure, authorization and receipt boundaries.
- Lint: 0 errors, 11 pre-existing warnings. Production build passed. Diff whitespace check passed.
- Local browser fixture using the actual page: nondefault selected season preserved; cancellation retains file/preview; successful synthetic import clears them and shows actual result; refreshed visible Doubles 4.077 and RF 100 match committed fixture data; final Season/PrimeTime fields remain empty. Browser console warnings/errors: none. Failure/rollback branches were tested automatically, not through production writes.

Local logs: `.local-validation/upload-restore-all-tests-final.log`, `upload-restore-focused-final.log`, `upload-restore-lint-final.log`, and `upload-restore-build-final.log`. Browser fixture and synthetic data are under `.local-validation` and contain no production credentials.

## Scope and release boundary

Clean, Delete and Copy handlers remain unchanged. In particular, the currently shipped legacy Clean path is not corrected here to consume the internal Age-Based input; this is an Upload restoration candidate, not certification of the entire Clean workflow.

Production access this turn was read-only function-definition inspection. No member, source, rating, roster, team, document or authorization data was modified. Only synthetic local transactions were committed.

Recommendation: review this bounded Upload candidate before controlled deployment. Deployment and production acceptance have not occurred. Any acceptance should first check normal Commissioner workflows, then preview the original CSV without committing; actual imports remain an administrator-confirmed business operation. Retain accepted LMS-0738 commit `7c72f89973aba08e3de2856cfe5de8c6bcf77836` / deployment `dpl_Hxpxk6erDFT8szveYas98Fk9kST1` as the application recovery point. Application rollback does not undo an administrator's later committed import.

## 2026-09-16 — follow-up: missing final Age-Based rating

Read-only production check for owner-specified DUPR ID 8EPKQE confirms the original CSV (line 51, over_65) and 2026 Fall Season source/working Age-Based input both contain 4.659; RF is 100. Final season_primetime_rating is null. The 26/27 Saturday Season row has neither an Age-Based input nor a matching source record for that season. No writes performed.

Root cause of the Fall final-value gap: app/ratings/page.js RATING_SELECT omits dupr_age_based_rating, and Clean passes existing season_primetime_rating back into cleanedAgeBasedRating. A blank final remains blank despite a populated input. Existing truncation produces 4.6 from 4.659. Upload correctly preserved the final field and did not automatically run Clean.

Minimum next correction for review: fetch the internal Age-Based input and have Clean use that input to propose the final Age-Based Season value, with explicit legacy fallback/protection controls, RF/NR policy preserved and synthetic regression coverage. Do not copy raw 4.659 into the final column during Upload. This extends beyond the approved Upload-only candidate into ratings calculation/write behavior, excluded from FAST FIX; do not deploy or perform a live Clean as diagnostic acceptance. No code change made in this follow-up.
