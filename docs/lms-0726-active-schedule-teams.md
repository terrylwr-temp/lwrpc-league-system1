# LMS-0726 — active teams in Division Team Schedules

Owner-requested local correction during production acceptance, 2026-09-09. Not deployed; current production review remains open.

Captain and Player division schedule loaders filtered by division but not team activity. Commissioner already uses is_active=true. Added that same predicate to the two existing team queries. Their shared View-As projection evaluates the same predicate, preserving effective-user authorization. No SQL migration, role changes, business-row writes, historical match filtering or model calls.

Compared against the exact deployed upload: application delta is one is_active=true predicate in each of app/captain-dashboard/page.js and app/player-dashboard/page.js. Existing broader LMS-0726 edits are preserved. This corrects the team choices in both desktop list and mobile selector because they consume the same loader result. Historical opponents/results of an active team's matches are retained.

Validation: 9/9 targeted tests passed. New test executes actual Captain, Player and Commissioner team-query expressions over mixed active/inactive/null-status teams across two divisions and an empty division, using the shared read projection. Existing normal/effective identity and mutation-denial adapter tests passed. Lint: zero errors, 11 warnings. Build initially compiled but failed to write .next/cache/.tsbuildinfo with EPERM; local build retry is recorded separately. No browser-level verification or production deployment of this correction claimed.

Deployment must use an updated candidate manifest; prior exact-byte approval does not silently cover the two changed source files. Retain the accepted production baseline and normal-first safety checks.

Build retry PASS (exit 0): production compilation, TypeScript, page generation and route build completed. See lms-0726-active-schedule-build-retry.txt. Local correction ready for reviewed deployment; not live.

Final update: deployed and PRODUCTION ACCEPTED in dpl_39U8T1potC5w7bhUiHFwTG1cXYBb. See lms-0726-active-schedule-production-acceptance.md. This supersedes the earlier local-only status.
