# Season Ratings Review-Only Filter — Production Acceptance

## Release identity

- LMS/version: `LMS-0755 / 0.1.578`
- Commit: `cab2a8127779fcddc3455dafb762f4479aa5f457`
- Commit message: `LMS-0755 filter Season Ratings review rows`
- Vercel deployment: `dpl_GSqHMdNV4qfudbin18nTY77K2sGK`
- Immutable URL: `https://lwrpc-admin-70ye6qlos-terry-lwrpc.vercel.app`
- Production alias: `https://league.lwrpickleballclub.com`
- Status: `READY`, production aliases attached
- Rollback: LMS-0754 deployment `dpl_36FKQJ5hyceQmwFdEztoVxNVMVXg`, commit `2d8de88927636f34477d5fe61396bca9a4de3eb3`

Vercel reports the production deployment at the exact LMS-0755 commit. The release diff contains the preview component, its display-only helper, focused tests, version files, and review/roadmap documentation. It contains no database, API, receipt, or import-commit change.

## Release gates

- Focused Season Ratings tests: `56/56 PASS`
- Full automated suite: `1,443/1,443 PASS`
- Lint: `PASS`, 0 errors and 11 existing warnings
- Production build: `PASS`, 84 routes/pages generated
- Release diff check: `PASS`, 8 intended files, 170 insertions and 7 deletions

Coverage confirms the default all-row display, `REVIEW` and `INVALID` inclusion, exclusion of ordinary `FILL`, `RECORD`, `SKIP`, and deferred rows, filtered pagination, page reset in both toggle directions, and the unchanged signed receipt, callback, and busy-state import gates.

## Normal LMS production smoke checks

The signed-in Commissioner session had no View-As session. The production footer showed `Version LMS-0755`.

- Members loaded `1,841 of 2,027`.
- Teams & Rosters loaded `112 of 123`.
- Season Ratings loaded `1,841 of 1,841` for the selected 2026 Fall Season.

These counts matched the predeployment LMS-0754 smoke check.

## Production preview acceptance

The owner's actual current DUPR CSV was not available in the workspace. Acceptance therefore used the strongest safe substitute: a deterministic 1,800-row preview-only CSV. It contained four existing production DUPR IDs duplicated twice each, producing exactly eight ambiguous rows, plus 1,792 controlled unmatched IDs that were confirmed not to collide with production members. No names or other member fields were included.

- Production returned `Previewed 1800 rows. No data has changed.`
- CSV preview rows: `1,800`.
- Rows ready to import: `0`.
- Review rows: `8`.
- Default view: `Showing all 1800 preview rows`, `Page 1 of 36`, 50 visible rows.
- Pagination check: Next advanced the all-row view to `Page 2 of 36`.
- Filtered view: `Showing 8 review / invalid rows out of 1800 preview rows`, `Page 1 of 1`.
- All eight filtered rows had action `REVIEW` and reason `Ambiguous DUPR identity`.
- No ordinary `DEFER`, `FILL`, `RECORD`, or `SKIP` row remained in the filtered view.
- Enabling the filter from all-row page 2 reset to filtered page 1.
- Switching back to all rows reset to all-row page 1; switching to the filter again retained filtered page 1.
- The control label changed from `Show Review / Invalid Only` to `Show All Preview Rows` while filtered.
- Browser console: zero warnings or errors during final acceptance.
- `Import Matched Ratings` was not available because the preview had zero ready rows. It was never clicked, and no commit request was made.

This verifies the deployed production parser, preview planner, signed preview response, default display, review-only filter, counts, reasons, and pagination without importing ratings.

## Ratings data protection

Fresh order-independent row fingerprints were captured immediately before the production acceptance preview and again afterward. Counts and hashes matched exactly:

| Relation | Count | Before | After |
| --- | ---: | --- | --- |
| `public.member_season_ratings` | 764 | `fbb2713d19e4f41f33d0679f7363e3ca` | `fbb2713d19e4f41f33d0679f7363e3ca` |
| `ratings_source_private.batches` | 8 | `20b88de8deb6f5d682f3756cfd21c152` | `20b88de8deb6f5d682f3756cfd21c152` |
| `ratings_source_private.sources` | 771 | `566736516076d9da97ed85140f1d3397` | `566736516076d9da97ed85140f1d3397` |
| `ratings_workflow_private.input_state` | 771 | `c5ae02ebbad1251bd143c36f2d441567` | `c5ae02ebbad1251bd143c36f2d441567` |
| `ratings_workflow_private.runs` | 13 | `b370ff8a2c8cc4b8e0cca6db1a754ec2` | `b370ff8a2c8cc4b8e0cca6db1a754ec2` |

The before snapshot was captured at `2026-09-22T02:01:16.565181+00:00`; the after snapshot was captured at `2026-09-22T02:18:20.34682+00:00`. No ratings workflow business data changed. Vercel reported no runtime error clusters during the release and acceptance window.

## Acceptance

**Season Ratings Review-Only Filter — FAST FIX PRODUCTION ACCEPTED**

LMS-0755 is READY on the production alias. The review-only control isolates the eight expected review rows, preserves their reasons, resets pagination correctly, retains the existing import safety gates, and introduced no production business-data change.
