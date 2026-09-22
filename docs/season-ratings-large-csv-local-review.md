# Season Ratings Large CSV Upload — Local Review

## Release

- LMS: `LMS-0754`
- Package version: `0.1.577`
- Baseline: `LMS-0753` / `0.1.576` at `507338323a198ca69bedea1bd1d4464fcd3e9750`
- FAST FIX scope: Season Ratings CSV uploads containing more than 1,000 and up to 5,000 rows

## Root cause

The browser parser and the production preview function both enforced a 1,000-row maximum. The application RPC calls also used a 10-second client timeout, which left too little margin for the larger approved workload.

## Correction

- Raised the CSV row limit from 1,000 to 5,000 and updated the validation message to `Choose a CSV with 1–5,000 rows.`
- Raised the preview and commit RPC AbortSignal timeout from 10 seconds to 30 seconds.
- Added an idempotent migration for `ratings_workflow_private.plan(uuid,uuid,text,jsonb)` that changes only the exact 1,000-row guard and sets the function `statement_timeout` to 20 seconds.
- The migration verifies the old or desired function body before changing it, verifies the final guard and timeout, and preserves the function owner, security mode, volatility, access grants, and the separate `commit_run` function.
- Production already records migration `20260922003928_season_ratings_large_csv_import` and has the desired 5,000-row guard and 20-second timeout. The repository migration was aligned to that recorded version; no production migration replay is required.

All existing CSV schema, required-field, duplicate-header, width, file-size, receipt, authorization, preview, confirmation, rollback, and audit protections remain in place.

## Capacity review

Realistic rows derived from the scrubbed 879-row test fixture produced:

| Rows | CSV bytes | Preview request bytes | Receipt chars | Commit request bytes |
| ---: | ---: | ---: | ---: | ---: |
| 1,800 | 349,911 | 459,022 | 374,260 | 374,359 |
| 5,000 | 973,775 | 1,277,310 | 1,042,594 | 1,042,693 |

These remain within the existing limits: 2 MiB CSV, 2.8 million receipt characters, and 4 MiB request body. No capacity limit was weakened.

## Verification

- Boundary coverage: 1, 1,000, 1,001, 1,800, and 5,000 rows accepted; 5,001 rejected with the exact message.
- Focused Season Ratings upload, migration, CSV format, and restore tests: `51/51 PASS`.
- Full automated suite: `1,437/1,437 PASS`.
- Lint: `PASS`, 0 errors and 11 existing warnings.
- Production build: `PASS` on Next.js 16.2.4 with 84 pages generated.
- Migration replay test: exact idempotence confirmed with PGlite.
- Production function inspection: 5,000-row guard present, 1,000-row guard absent, `statement_timeout=20s`, expected owner/security/volatility/grants retained, and `commit_run` unchanged.

## Production protection

The retained rollback target is LMS-0753 deployment `dpl_AjDzPziNLEqW3ycdz89wHPx1KDPK` at commit `507338323a198ca69bedea1bd1d4464fcd3e9750`.

Predeployment read-only smoke checks passed for Dashboard, Season Ratings, Teams & Rosters, and Members. Ratings workflow table fingerprints were recorded before deployment. Production acceptance will use an authorized preview-only 1,800-row synthetic CSV and will not confirm the final import action.
