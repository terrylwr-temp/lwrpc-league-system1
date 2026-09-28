# Scheduling same-location preference — local review

September 28, 2026. Implementation only; no Production deployment, database access, migration, or business-data mutation was performed.

## Result and scope

Scheduling now compares teams' `home_location_id` values and prefers the lowest total same-location opponent count after existing scheduling requirements. Location display names never determine this preference. Missing location IDs are not treated as a shared location, and retain the existing placement warnings.

The generator searches for zero same-location games first when mathematically possible. If distinct-opponent requirements prove a positive lower bound, it starts at that bound; otherwise it raises the allowed same-location total only after searching the lower total. Same-location games remain eligible. The original round-robin schedule remains an available fallback.

One team appearance per week, unique opponents and unique byes within each round-robin cycle, complete-cycle opponent coverage, existing date cadence, season-end limits, scoped league blackouts, court availability, existing court bookings, and bye-row ownership are retained. Full repeated baseline cycles reverse home/away as before; candidate hosts can change to obtain a feasible court assignment, as existing blackout handling already permits. Matches, byes, match lines and games still use the existing page's persistence flow and League Manager authorization.

## Implementation and review findings

- `lwrpc-admin/app/lib/leagueSchedulePairings.js`: deterministic whole-schedule pairing search, per-location mathematical deficit bounds, and refinement using alternate round orders, host reversals and two-game opponent swaps. Candidate comparisons prioritize omitted matches/byes, then court-overbooking warnings, then total same-location matchups. A location improvement cannot outrank a worse scheduling requirement result.
- `lwrpc-admin/app/lib/leagueScheduleGeneration.js`: extracts the accepted date/court/bye draft projection for candidate evaluation and the final persistable rows. Evaluation performs no database operations. Court warnings are counted explicitly, independently of display text.
- `lwrpc-admin/app/scheduling/page.js`: calls the tested generator before its existing insert flow. Team loading already supplies the authoritative location foreign key; no query expansion or role changes are needed.
- `lwrpc-admin/test/leagueScheduleGeneration.test.mjs`: 15 permanent regression tests, including full persistable-row assertions and the previous circle schedule's same-location defect.

Two accepted behaviors require explicit review context. Partial court unavailability can produce an overbooking warning and a match for later Schedule Editor review; this release preserves that behavior and prefers drafts without those warnings. Scheduling Special Requests are currently administrative tracking only, as their migration and existing regression test require; this release does not interpret free-text requests or introduce automatic request constraints. Any future enforced request constraint must be included in the hard candidate evaluation before the location objective.

The search uses a 100,000-node total budget, with per-cost-budget limits to leave room for fallback, followed by up to eight improving refinement passes. A zero-cost valid schedule or a valid schedule at the mathematical lower bound proves the minimum. If a difficult constrained case reaches the search limit above that bound, the result is the best schedule found and refined, rather than a proof of the global optimum. The original baseline is retained unless the candidate's ordered costs improve. This is a practical client-side search limit, not a location eligibility restriction.

## Regression evidence

| Fixture | Generated games | Same-location games | Minimum evidence |
| --- | ---: | ---: | --- |
| 12 teams, 8 weeks; locations 4/4/4 | 48 | 0 | Zero is the absolute lower bound |
| 12 teams, 8 weeks; locations 6/6 | 48 | 12 | Each team needs two local opponents: 12 × 2 ÷ 2 |
| 12 teams, 8 weeks; locations 8/4 | 48 | 16 | Eight majority teams each need four local opponents |
| 12 teams, 8 weeks; locations 7/5 | 48 | 14 | Per-location parity: ceil(7 × 3 ÷ 2) + ceil(5 × 1 ÷ 2) |

Additional controls cover reversed/interleaved input order, numeric/string ID equivalence, duplicate and renamed display names, unknown IDs, odd-team byes, full/repeated cycles, one-location seasons, aggregate capacity with existing bookings, location blackouts, league blackouts, every-other-week dates, hard pairing constraints that require local games, and post-generation swaps with the initial search disabled. A one-time comparison against the original `HEAD` draft projection passed 24 isolated fixtures across 2-, 5-, and 12-team divisions, excluding generated timestamps.

## Verification and release gate

- Focused scheduling checks: **22/22 pass**, zero failures/skips.
- `npm test -- --test-concurrency=2`: **1,545/1,545 pass**, zero failures/skips, including the isolated migration grant-readiness gate and existing PBCC manual-bye checks.
- `npm run lint`: **pass**, zero errors and the same 11 existing warnings.
- `npm run build`: **pass**, Next.js 16.2.4 production build, all 84 pages generated.
- `git diff --check`: **pass**.

Local command evidence: [focused tests](scheduling-location-preference-focused-test.txt), [full suite](scheduling-location-preference-full-test.txt), [lint](scheduling-location-preference-lint.txt), [build](scheduling-location-preference-build.txt).

This change is outside FAST FIX, which explicitly excludes schedule changes. The owner's explicit review hold applies. No version was advanced, commit pushed, release deployed, Production schedule generated, or Production test row created. A future deployment requires review and separate authorization, normal LMS regression first, and the existing production-protection recovery and integrity checks. Application rollback restores the previous generator; it does not rewrite any schedule subsequently generated through an authorized user action.
