# RF=29 — OWNER HOLD RESOLVED (historical record)

> **RESOLVED 2026-09-10.** Active Rule 4.1.1 now says RF of 29 or below is NR. The owner authorized local synchronization and source-only import implementation. The subsequent clarification retains the Clean Ratings prompt and prohibits a hardcoded cutoff: eligibility extracts the threshold from verified Rules; import preview shows raw RF. All former hold instructions below are preserved only as history and are no longer operative. [Current implementation/review](season-ratings-implementation-review.md).

The owner hold supersedes every prior CSV-import instruction to change Clean Ratings from `<=29` to `<29`, including any earlier approval outside this document. That change is removed from the CSV-import scope.

Preserve the existing discrepancy without choosing a winner:

- Clean Ratings with threshold 29: RF <=29 is treated as NR.
- Current League Rules / Ask LWR interpretation: RF <29 triggers NR.
- Existing eligibility and rule interpretation remain unchanged.

Do not change the Clean Ratings prompt, comparator, configurable threshold behavior, Ask LWR threshold, eligibility threshold, or governing interpretation. Do not invoke Clean Ratings automatically after import. Clean/Delete/Copy remain untouched. RF is imported as source data, not a command to recalculate NR or established season ratings. RF=29 must not be silently reclassified by the CSV release.

## Neutral continuation gate

The previously recommended separate source store can remain neutral: it records RF exactly, without choosing a universal NR threshold or changing current season RF/raw-NR inputs consumed by eligibility. Remove automatic source-NR classification from the proposed importer/preview; show raw RF and a neutral source label instead. Existing consumer classifications remain as they are. Future establishment/reset and resolution of the <= versus < disagreement are separate owner decisions.

Direct refresh into the existing season RF field is not presumed neutral: changing that input can change current eligibility even with unchanged comparator code. A candidate must prove frozen inputs and outcomes are preserved, or STOP FOR REVIEW. No production import, mutation, or deployment is authorized.

This workspace contains the prior design-only gate and no CSV implementation package. Do not treat the reference to a prior implementation approval as approval of a newly selected architecture. Continue only work within a verifiable approved scope; the hold and local regression protection are explicitly authorized here.

## Regression protection

`lwrpc-admin/test/seasonRatingsRfOwnerHold.test.mjs` executes the existing pure cleanup helpers and existing Ask LWR policy code locally, with no database or model calls. Four tests pass:

1. 28, 28.999, 29, 29.001 and 30 preserve each consumer's own boundary; RF=29 remains cleanup NR and Ask RATED when independent raw-NR evidence is false.
2. Actual cleanup output at RF=29 remains the division-max-minus-0.5 value; eligibility retains both rated and independent raw-NR outcomes.
3. Existing blank/zero cleanup opt-out and missing-RF behavior are unchanged.
4. The current import function range contains no cleanup or classification calls.

These are baseline regression guards, not end-to-end proof of a future implementation. Once an approved importer exists, add isolated transactional integration tests demonstrating a source refresh through RF 28/29/30 does not modify existing season RF/raw-NR/Season DUPR/PrimeTime values, alter existing eligibility outcomes, invoke cleanup indirectly, change protected database definitions, or mutate members. Verify normal and View-As consumers. Keep the current static guard aligned with any moved import code; retain behavior tests against actual functions. No production test rows.

Validation: `node --test test/seasonRatingsRfOwnerHold.test.mjs` — 4/4 pass. Application/runtime source unchanged. No policy boundary has been resolved or changed.
