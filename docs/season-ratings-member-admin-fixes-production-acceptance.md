# LMS-0757 / 0.1.580 — Production acceptance

Date: September 22, 2026 (America/New_York).

## Release and migration

- Previous accepted Production: LMS-0756 / 0.1.579, commit `755177c56acaa6244eb650c22db9dd1894da1798`, deployment `dpl_AVnoqaaCjucKNTgKmUsKFqKUG3Bd` (READY, retained as the application rollback candidate).
- LMS-0757 release commit: `42a3dedf87d597da09d336ad0e872e01124744a6`, pushed to GitHub `main`. Vercel Git deployment `dpl_yTMcqhqv8tvJPJBgvZeBYViuitJZ` became READY and serves `league.lwrpickleballclub.com` and `view-as.lwrpickleballclub.com`.
- Applied function-only migration `20260922204254_lms0757_ratings_identity_member_directory.sql`, recorded by Supabase as `20260922204254 lms0757_ratings_identity_member_directory`. The ratings Upload resolver is present, Transfer retains its original all-member uniqueness check, and the directory has one eight-argument signature with a defaulted duplicate filter. The old seven-argument named call succeeds. Function execution remains limited to `postgres` and `service_role`; no business rows are written by the migration.
- Immediately before and after migration, all 34 protected table counts and whole-row fingerprints matched (aggregate `c9b32ced0b9458bbc0a32451f230315e`). Security and performance advisor categories/counts were unchanged. Preexisting advisor notices are [RLS enabled without policy](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy) (28), [authenticated SECURITY DEFINER executable](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable) (1), [unindexed foreign keys](https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys) (29), no primary key (3), unused index (55), and Auth DB connections (1); none arose from LMS-0757.

## Verification gates

- Before migration, the signed-in Commissioner loaded the accepted LMS-0756 dashboard, Members, Teams & Rosters, Season Ratings, division schedules/standings, scoring, Schedule Editor, and League Standings without write actions. LMS-0756 Members continued to load after the migration, confirming the defaulted signature's application compatibility.
- After deployment and before feature checks, the same read-only normal LMS pages loaded on LMS-0757 without application errors. Authorized write buttons remained available; none was used. Separate real Player/Captain/Co-Captain/Club-Pro/League-Manager sessions were not available for live role-by-role replay; automated authorization regressions passed in the full test suite.
- Local focused/protected tests: 14/14 passed. Final migration-path and UI tests after migration-version alignment: 5/5 passed. Full automated suite: 1,461/1,461 passed, zero failures/skips. Lint: pass with zero errors and 11 preexisting warnings. Next.js 16.2.4 Production build: pass, 84/84 pages.

## Season Ratings — preview only

A four-row CSV containing only existing DUPR identifiers and a proposed Doubles input was previewed in the 2026 Fall Season. The original recent CSV was not available; no real import or Clean Ratings action was performed.

| Existing Production identity case | Preview result |
|---|---|
| Exactly one active member plus inactive historical duplicate | One row matched the active member; proposed fill shown; not REVIEW |
| Two active members sharing a DUPR ID | One REVIEW row, Ambiguous DUPR identity |
| A different DUPR ID repeated twice in the CSV | Both rows REVIEW, Ambiguous DUPR identity |

The preview reported exactly 4 CSV rows, 1 ready row and 3 review rows. Show Review / Invalid Only displayed 3 of 4. The final-rating protection text remained visible. The **Import Matched Ratings** button was never clicked. The browser was navigated away from the preview, and the temporary CSV was removed. The existing 1,800-row equality and 5,000-row boundary remain covered by local automated tests, not a Production bulk preview.

## Member Administration

- Current Rosters Only showed 14 members. A read-only database set comparison against active `team_members` joined to active `teams` returned 14 expected members, zero missing and zero extra. Leadership-only assignments are not included by the filter; rostered captains remain eligible.
- Duplicate DUPR IDs showed 28 records in 14 nonblank normalized groups, including active and inactive partners. A searched historical group displayed both its active and inactive records. The database expected-set comparison found zero missing/extra records; no duplicate was merged or edited.
- Search, Member sorting, Last Login ascending/descending sort, pagination (page 2 showed rows 101–200), and Include Inactive (2,032/2,032) worked. Member Detail, Teams, History, and Ratings opened read-only; Edit was canceled without saving. Reset availability was observed, but no reset was sent.
- Copy Email on the signed-in owner's already-visible record copied the exact displayed address, showed transient “Copied” feedback, and did not open the row. No member email is included in this document. The Last Login display showed the correct Eastern local time in short form without EDT/EST; other timestamp displays were not changed.

## Runtime, data integrity, and rollback

- The natural PBCC reminder POST on the LMS-0757 deployment returned HTTP 200 at 21:00 UTC. Match Setup reminder requests in the 24-hour Production sample were 41/41 HTTP 200. Two separate Preview HTTP 500s were attributable to Preview's intentionally absent privileged configuration; they are not Production failures. Vercel reported no Production runtime-error clusters in the checked one-hour window. No cron endpoint was manually invoked and no notification was sent for acceptance.
- Ratings rows remained 765, with zero `member_season_ratings.updated_at` values after the preflight baseline. Teams remained 123, roster rows 16, and notification subscriptions 17 total / 6 enabled / 17 null VAPID key IDs. The LMS-0756 VAPID behavior was not modified.
- A later aggregate protected-table fingerprint differed because 78 member rows received the same `updated_at` timestamp at 21:00:18 UTC. The owner confirmed this was an expected concurrent member update. It was not attributed to the function-only migration or the read-only ratings snapshot. A new per-table fingerprint snapshot after that activity and the final 34-table comparison matched exactly, with no further changes.
- Application rollback is the retained READY LMS-0756 deployment `dpl_AVnoqaaCjucKNTgKmUsKFqKUG3Bd`. The new directory parameter defaults for old callers, and the planner preserves the old application's Transfer and receipt behavior; an application rollback does not require reverting the function-only database migration. Restoring prior function definitions, if ever needed, requires a separately reviewed corrective migration, not a whole-database restore over live activity.

No ratings commit, member/roster/leadership edit, password reset, notification send, VAPID change, or test business row was performed for LMS-0757 acceptance.
