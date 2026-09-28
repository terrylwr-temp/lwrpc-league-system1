# Roster Add Player missing-DUPR email trigger — local review, September 28, 2026

**LOCAL IMPLEMENTATION ONLY — NOT DEPLOYED. No Production business data or emails changed/sent by this task.**

## Diagnosis before modification

`app/teams/[id]/page.js` loads the current team's selected-season `member_season_ratings` rows, including the existing raw `dupr_doubles_rating` field. `getPlayerRating()` returns the applicable final Season DUPR, Season PrimeTime or Self Rating. Before the fix, `addPlayer()` treated a null/NaN result as `missingRating`, without checking the underlying Doubles input. After a successful roster insert, that flag entered both the League Management `rating_check_alert` and player/captain `rating_check_alert_to_player` branches. Consequently a numeric Doubles rating with an unassigned/NR Season rating generated both emails. Reliability is not independently consulted by this notification path; a blank derived Season rating acted as the incorrect proxy.

The guarded selection notice also used the final-rating eligibility label and promised both emails. Suppressing the actual emails without adjusting this notice would give captains an inaccurate promise.

Before application changes, synthetic tests executing the actual page functions reproduced five failures: numeric Doubles plus missing final, NR final, RF at threshold, RF below threshold and the same missing-final proxy in PrimeTime/Self Rating contexts. Six nearby control groups already passed. No Production query or roster operation was used to reproduce the defect.

## Narrow correction

A small exported helper in `app/lib/rosterPlayerChecks.js` detects a nonblank finite numeric Doubles input. Add Player's existing notification-only `missingRating` flag now requires both a missing applicable final rating and absence of that numeric Doubles input. The same guard suppresses the selection notice that promises those emails. Both recipient branches already share this flag, so League Management and the player/Captain/Co-Captain notifications are suppressed together.

The helper reads the already loaded current-season Doubles input. There is no extra query, cutoff lookup or derived NR calculation. Numeric strings and trimmed numeric strings are accepted. Blank, nonnumeric and literal underlying `NR` remain absent numeric Doubles information.

Existing legitimate conditions are retained: a genuinely missing DUPR ID still produces its existing alerts, even if a numeric Doubles input exists; an underlying literal `NR` with an assigned Season rating retains the existing manager-only alert; a missing Doubles input with an already usable final does not introduce a new alert. This fixes the missing-final proxy without broadening the email rule.

Roster selection/eligibility labels, range checks, home-community rules, duplicate checks, lock/role/View-As behavior, insertion payload, rating calculations, inputs, templates, recipient lists and the Notifications API are unchanged. Missing Season rating players remain selectable under the existing rules. No migrations, schema, policy, authorization, version or dependency change is included.

## Regression coverage and verification boundary

Eleven new groups in `test/rosterAddPlayerNotifications.test.mjs` execute the actual page selection, eligibility, Add Player and both email-sender functions. Supabase inserts, template loading, authorization headers and notification fetches are isolated in memory. Recipient assertions include League Management and the player plus deduplicated Captain/Co-Captain addresses. Tests prove insertion success, modal/selection reset and refresh even when notifications are suppressed, and preserve source rating rows.

Coverage includes:
- absent/blank/invalid/literal-NR Doubles and an absent season row;
- numeric Doubles plus blank Season DUPR, numeric strings and whitespace;
- numeric Doubles plus NR Season classification;
- RF at 29 and an alternate threshold value 50, and RF below cutoff (28/0);
- both recipient groups suppressed, with no misleading selection email notice;
- PrimeTime/Self Rating missing-final notification proxy;
- genuinely missing DUPR ID;
- existing usable Season rating without a Doubles input;
- genuine raw NR with an assigned final and its manager-only alert;
- rating range, duplicate, home-community and View-As denial controls;
- failed insert sending no notifications.

Focused checks: **27/27 passed**, including existing roster checks, Teams & Rosters data/authorization controls and isolated roster-rating policy access tests. Lint passed with **0 errors and 11 existing warnings**. The clean Production build passed with Next.js 16.2.4, compilation/types and **84/84 generated routes**. Both changed application files in the fresh build matched reviewed-source SHA-256 hashes. The full automated `npm test` suite passed **1,572/1,572**, with zero failures/cancellations/skips (484.2 seconds). Diff whitespace checks passed. Logs and the byte-identity check are retained in the managed checkout under `.local-validation/roster-missing-dupr-email`. The clean build uses the established fresh-output `scripts/lms0723-isolated-build.mjs` procedure. These are local automated results, not browser-observed Production acceptance.

## Scope and owner review boundary

Baseline is accepted application commit `4388afc` plus its documentation-only acceptance commit `774bf52`. Work is isolated on `codex/roster-missing-dupr-email` in the reusable managed checkout. Unrelated original-workspace changes are preserved.

Runtime changes are limited to the helper and the team roster page's notification/notice conditions; one focused regression file and review/roadmap documentation are added. The Notifications server route and templates are unchanged. No live database query, business-data change, email send or deployment was performed. Keep this candidate local for owner review as explicitly requested; deployment is not authorized by this implementation request.

## Reviewed-source build identities

- `app/lib/rosterPlayerChecks.js`: SHA-256 `e1fab38efb8d2581ccaae92608c86775946117a3f2fd508a2ca18c1b9bece841`.
- `app/teams/[id]/page.js`: SHA-256 `8d1a883aacc345535a94d472181e8643200f0abbceacb4d21fa0bd9209209328`.

Both match the successful fresh Production build's input copies. Final review remains notification-only: two application files, one focused regression file, this review and a roadmap entry. No SMTP/Brevo call, Notifications HTTP request, live roster write, deployment or Production database query was made. The original workspace's unrelated files remain untouched.
## Deployment release reconstruction

Requested source commit: `29269b890f75017066773c4491361fc2d54bcddc`. Its ancestry also includes documentation-only Clean Ratings acceptance records. The deployment candidate applies only the approved roster notification helper/page, regression file and review documentation onto live baseline `4388afc304f2d575098f013b59e042f6f2bbc82b`, with a scoped roadmap entry. Runtime application and package/configuration source are identical to the requested commit. The cumulative five-file release diff contains no migration or unrelated roster/eligibility change. All validation gates are rerun before deployment; browser acceptance and exact promotion evidence will be recorded separately. Owner authorization permits application staging/promotion, not live roster or test email mutations.