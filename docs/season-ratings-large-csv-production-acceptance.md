# Season Ratings Large CSV Upload — Production Acceptance

## Release identity

- LMS/version: `LMS-0754 / 0.1.577`
- Commit: `2d8de88927636f34477d5fe61396bca9a4de3eb3`
- Commit message: `LMS-0754 support large Season Ratings CSV uploads`
- Vercel deployment: `dpl_36FKQJ5hyceQmwFdEztoVxNVMVXg`
- Immutable URL: `https://lwrpc-admin-2jthkwhc7-terry-lwrpc.vercel.app`
- Status: `READY`, production aliases attached
- Rollback: LMS-0753 deployment `dpl_AjDzPziNLEqW3ycdz89wHPx1KDPK`, commit `507338323a198ca69bedea1bd1d4464fcd3e9750`

Vercel build logs identify branch `main`, commit `2d8de88`, package `0.1.577`, Next.js 16.2.4, a successful production build, and 84 generated pages.

## Local gates

- Focused Season Ratings upload, migration, CSV format, and restore tests: `51/51 PASS`
- Full automated suite: `1,437/1,437 PASS`
- Lint: `PASS`, 0 errors and 11 existing warnings
- Production build: `PASS`
- Diff check: `PASS`
- Release diff: 10 intended files, 216 insertions and 9 deletions; unrelated working-tree documents excluded from the commit

## Production smoke checks

All checks used the real signed-in Commissioner session, with no View-As session.

- Dashboard loaded under the production alias.
- Season Ratings loaded `1,841 of 1,841` players for the selected 2026 Fall Season, displayed rows 1–100, retained filters and Data Tools, and showed `Version LMS-0754`.
- Teams & Rosters loaded 112 active teams and showed `Version LMS-0754`.
- Members loaded `1,841 of 2,027` members and showed `Version LMS-0754`.
- Browser console: zero warnings or errors during final Season Ratings acceptance.

The Teams & Rosters total changed from 125 in the predeployment read to 124 in the postdeployment read while the active count remained 112. The LMS-0754 diff and acceptance actions contain no Teams mutation path, and no team action was taken. This is recorded as concurrent production activity outside the ratings upload workflow.

## Large-file production acceptance

The actual current DUPR CSV was not supplied. Acceptance used an explicitly authorized, synthetic non-business CSV with 1,800 unique six-character DUPR IDs and valid source fields.

- File selection did not produce the former `Choose a CSV with 1–1,000 rows.` error.
- The production preview completed and displayed `Import preview — 2026 Fall Season`.
- CSV preview rows: `1,800`.
- Pagination: `Page 1 of 36` at 50 rows per page.
- The synthetic IDs deliberately matched no production members: ready `0`, skipped/review `1,800`.
- The final `Import Matched Ratings` action was not available because there were no eligible matches; no commit request was made.

This exercises the deployed browser parser, API request path, 30-second client timeout, production planner function, response receipt path, and preview rendering for more than 1,000 rows without creating or changing ratings.

## Ratings data protection

The same order-independent `to_jsonb` row fingerprints were captured before deployment and after the production preview. Counts and hashes matched exactly:

| Relation | Count | Fingerprint |
| --- | ---: | --- |
| `public.member_season_ratings` | 0 | `d41d8cd98f00b204e9800998ecf8427e` |
| `ratings_source_private.batches` | 7 | `dcd20e44d528baecaa314ad8bebe4127` |
| `ratings_source_private.sources` | 711 | `a8e34b5fd272d3e0e9da7a78e5676ca4` |
| `ratings_workflow_private.input_state` | 711 | `883d2779dbd8df03c510169a633a433f` |
| `ratings_workflow_private.runs` | 12 | `c83c184116847639a838da87182818b7` |

The production `plan` function also remained at body MD5 `15dc3e7dab1eb91bb164a42c979680e5`, with the 5,000-row guard, no 1,000-row guard, and `statement_timeout=20s`. The separate `commit_run` body remained MD5 `06ea32cdd7952c1919a4bf52642b6c8e` with its existing configuration and grants.

## Acceptance

**Season Ratings Large CSV Upload — FAST FIX PRODUCTION ACCEPTED**

The deployed importer accepts and renders a protected preview for 1,800 rows, retains the bounded 5,000-row maximum, preserves the explicit commit workflow, and made no ratings workflow business-data change during acceptance.
