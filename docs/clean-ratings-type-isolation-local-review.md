# Clean Ratings rating-type isolation — local review, 2026-09-28

**Implementation review. Deployment and acceptance results are recorded separately; live Clean Ratings writes are not authorized.**

## Diagnosis before code changes

The accepted Ratings page's buildRatingCleanupChanges query fetched teams -> divisions -> leagues/season_id and max_dupr, but omitted divisions.rating_type. It then accumulated one maxRatingByMemberId across every active team in the selected season. Thus a PrimeTime or self-rating division could incorrectly supply the regular DUPR NR maximum. A synthetic dual-type example reproduced regular output 4.5 instead of 4.0 because the PrimeTime maximum was higher.

The existing PrimeTime/Age-Based cleanup path only truncated its separate input (or legacy final); it did not receive a type-scoped division maximum. The requested PrimeTime NR/low-reliability calculation now uses the same existing NR derivation against its own eligible assignments.

Authoritative type identifiers are divisions.rating_type = dupr / primetime, reached through the existing team/division relationship. Read-only catalog inspection confirmed a nullable text field with default dupr. Existing application conventions treat a missing/null type as dupr; that compatibility behavior is retained. Display names are never used to select a rating type.

## Implementation

The roster query now selects rating_type. Cleanup keeps separate per-member highest maxima for dupr and primetime, while retaining the existing selected-season, active-team and usable-maximum filters. Unknown and self_rating values cannot contribute to either context.

The regular calculation receives only the dupr maximum. The PrimeTime calculation receives only the primetime maximum. Both use the unchanged highest applicable maximum minus 0.5, truncated down to a tenth. Multiple assignments within one type still select their highest maximum.

PrimeTime NR/low-reliability cleanup uses the account's existing Doubles NR indication, its own NR input/final indication, or the selected inclusive RF cutoff, and requires its own eligible PrimeTime division maximum. It reuses cleanedSeasonDuprRating for the derivation. Reliable numeric Age-Based input and legacy final truncation remain unchanged. Without an eligible PrimeTime maximum the existing independent Age-Based input/final cleanup behavior remains; no regular division is borrowed. Missing/invalid values retain the prior no-proposal behavior when no applicable derivation exists.

The confirmation copy explains the matching rating-type division basis. Import, source/input precision, threshold selection/opt-out, regular NR formula, notes mechanism, selected-season scope, confirmation/review/application flow and existing batching remain intact. Each result writes its own existing final field: season_dupr_rating or season_primetime_rating. No new type selector, policy, schema, SQL migration, authorization, dependency or version change is introduced.

## Regression coverage

Ten new tests execute the actual page helpers, cleanup planner and synthetic write flow. Literal NR cases use RF 100 to avoid accidentally passing through low-reliability logic. Separate cases cover below-cutoff RF 28 and inclusive RF 29.

Covered:
- DUPR-only NR/low-reliability division derivation and absence of a cross-type final proposal.
- PrimeTime-only NR/low-reliability derivation and preservation of the regular final.
- Dual-type participation with different division maxima, plus changing either type's maxima without changing the other result.
- Multiple same-type assignments, order independence and unchanged max-minus-0.5 truncation.
- Reliable RF 30 numeric cleanup and threshold-zero opt-out.
- Misleading display names, unknown/self-rating exclusions, inactive teams and other seasons.
- Legacy null type default and actual rating_type query projection.
- PrimeTime NR with absent age input; independent numeric age behavior without a PrimeTime division.
- Proposed write fields, input/roster immutability and synthetic application of independent finals.

Before the fix, eight new test groups failed against the unchanged implementation. After the fix, all focused tests pass. Existing Age-Based regression tests were preserved without edits.

## Validation

- Focused cleanup/import/roster-policy suite: **63/63 passed**.
- Full automated suite: **1,565/1,565 passed**, zero failures/cancellations/skips (474.5 seconds).
- Lint: **0 errors; 11 existing warnings**.
- Clean optimized Production build: **passed**, Next.js 16.2.4, compilation/types and 84/84 route generation.
- Clean build used the existing scripts/lms0723-isolated-build.mjs procedure, creating a fresh source/output directory; no old build output was reused. Ratings source bytes matched the reviewed file: SHA-256 696a76df58eae91ae76e40fa5bdb5d825b3b0cfdff07af56bfcb415ea1c7f1ed.
- Diff whitespace check: passed.

Command logs are retained in the active managed checkout's ignored .local-validation/clean-ratings-type-isolation folder: focused.log, full-final.log, lint.log and build.log. An initial full run was cancelled after the NR fixtures were strengthened; only the completed final run counts as the full-suite result.

## Scope and review boundary

Baseline: ac8e626 (accepted scheduling application source plus the separately approved Captain identity maintenance documentation/tests). Work is isolated on codex/clean-ratings-type-isolation in the reusable managed checkout; the original workspace's unrelated edits are preserved.

Changed application source: lwrpc-admin/app/ratings/page.js.
New regression: lwrpc-admin/test/cleanRatingsTypeIsolation.test.mjs.
Documentation: this report and project-roadmap.md.

No deployment, production Clean execution, rating mutation, roster mutation or migration was performed. Validation uses synthetic functions/fixtures and a local production-mode build; it is not browser-observed Production acceptance. The only live query was read-only rating_type schema inspection.

Keep this candidate local for owner review, as requested. Future deployment authorization does not itself authorize bulk Production Clean. Existing client-side batched rating writes and their pre-existing atomicity/concurrency limitations are unchanged; any future live data operation needs its own approved recovery scope.
## Release scope reconstruction

The requested source commit is `6d27becf14612e7768cf673e37c789b6afda0787`. Its cumulative ancestry includes unrelated Captain identity-maintenance files and earlier scheduling acceptance documentation. The deployment release therefore applies only the approved Ratings page, regression test and review documentation onto live baseline `180d3775475ff90dc99d5948d5b773a7ae603103`, with a scoped roadmap entry. The application tree matches the requested source commit exactly. Prior validation counts above describe the original implementation checkout; the reconstructed release is independently revalidated before deployment. No SQL or migration files are included.