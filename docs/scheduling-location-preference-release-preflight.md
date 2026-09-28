# Scheduling Location-ID preference — release preflight

September 28, 2026. The owner explicitly authorized staged authenticated acceptance and conditional Production promotion.

The Production baseline is e8633564036c0a3a0c0a01469d7474ae36b83f26, deployment dpl_Hqhi2bX7EKiz3mcZ7dfDfJmRQnqH. Its accepted generated-schedule deletion fix is preserved. The original development checkout contains unrelated Season DUPR work, so this release was reconstructed in an isolated managed worktree from the exact Production baseline.

Complete cumulative review covers only two pure scheduler modules, the Scheduling integration, fifteen generation regressions, and scheduling documentation/evidence. No package/version changes, migrations, SQL, authorization changes, deployment configuration changes or business-data modifications are included. Existing persistence, deletion, administrative Special Requests, date/court/bye projection and role checks are preserved.

Release verification:
- Focused scheduling tests including accepted deletion regression: 32/32 passed.
- Full automated suite: 1,551/1,551 passed, no failures or skips.
- Lint: zero errors; the same 11 existing warnings.
- Clean Next.js 16.2.4 Production build: passed, 84 pages.
- Whitespace check: passed.

The earlier local-review document records the original development-base results. The release-base command logs beside this document supersede those counts for deployment acceptance.

Production business integrity was captured using read-only whole-row counts and fingerprints for 45 business tables. Migration inventory is 50, latest 20260927012150. Acceptance generation will use authenticated deployed code with intercepted fixture data and writes, because Preview shares the Production Supabase source. No live schedule may be created, deleted or overwritten.

Preview and Production server environment inventories differ. Preview acceptance comes first. A Production-configured candidate may then be staged at its unique deployment URL with domain assignment skipped, reverified there, and promoted without rebuilding. This avoids promoting a Preview artifact that lacks existing Production server credentials. Application rollback is the captured READY baseline deployment; there is no database release to roll back.
