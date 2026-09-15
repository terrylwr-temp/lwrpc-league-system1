**SUPERSEDED SCOPE:** Broad foundation work is suspended and deferred to the separate high-priority security-hardening project. See [narrowed View-As plan](lms-0726-rescoped-parity-plan.md). Preserve this checkpoint as historical evidence; its remaining-work list is no longer the LMS-0726 implementation mandate.

# LMS-0726 / 0.1.548 — local implementation checkpoint

Status: IN PROGRESS — incomplete; not ready for production or final review.
Owner approval: local implementation only, attachment 50d9965b-ddd8-4e00-a73f-33ea012be965. The final readiness gate remains the governing design; its earlier statement that implementation approval was awaited is superseded by that approval.

## Implemented so far

- Pure effective-viewer/roster-authority and exact decimal rating-domain helpers. These are not yet wired into the application.
- CLI-created additive and tightening migration identities. Additive currently contains 8 of 14 reviewed functions: three protected write-lock helpers; Add; Remove; shared eligibility evaluation; Match Setup save; manager reset.
- Three private RLS tables, column-limited internal roles, receipt/outbox persistence, 360 reviewed policy bindings across 18 divisions. Required unavailable facts hold rather than fabricate admission approval. PrimeTime 9 uses the owner-approved normalized configuration.
- Remove authorization, roster locks, duplicate replay, future-lineup blocking, historical preservation, no new Remove notification.
- Held Add/Match Setup leaves business rows and outbox unchanged. Actual successful admission/lineup generation is not yet certified.
- Migration function owner/body/search-path checks, unexpected function execution grant rejection, private-table owner/column shape checks and binding drift rejection. Full constraint/default/policy/ACL drift and compatible partial recovery checks remain incomplete.
- Local PostgreSQL 17.11 runner using temporary synthetic loopback data. No production database connection. It demonstrates replay plus concurrent removal replay, authority revocation while waiting, and future lineup insertion while waiting.
- One existing LMS-0725 test corrected: privacy checking now inspects actual scalar values rather than accidentally treating timestamp substring `2.5` as leaked rating data. No Ask LWR application behavior change.

## Not implemented or accepted yet

- Six shared read functions/projections; proof-bound View-As dispatcher page_read branch.
- Shared application viewer transport, exact read loaders and server route guards.
- 292 read-consumer mappings and 82 write cutovers; verification of 30 retained paths.
- Complete eligibility/lineup requirements, all success paths and all required races.
- Notification sender/claim/provider dedup and ambiguous-delivery handling.
- Phase 2 privilege tightening and direct Data API bypass tests.
- Normal workflow/browser regressions, actual real-LMS View-As parity and Member Detail button placement.
- Desktop/390px/320px/accessibility evidence.
- Mini-LMS cleanup: zero files removed; deletion gate has NOT passed.
- Final application version bump and final release hashes/manifests/report.

The accepted LMS-0725 changes in the working tree are retained. Existing application consumers still use their prior paths. No production SQL, deployment, production mutation, production deletion, or OpenAI model call was performed for this implementation.

## Files for continuation

Application helpers: `lwrpc-admin/app/lib/lmsViewer.js`, `lwrpc-admin/app/lib/lmsRatingDomain.js`.
Migration builder: `lwrpc-admin/scripts/lms0726-build-foundation.mjs`; SQL/source modules under `lwrpc-admin/scripts/lms0726/`.
Tests: `lwrpc-admin/test/lms0726Domain.test.mjs`, `lwrpc-admin/test/lms0726Database.test.mjs`, `lwrpc-admin/test/helpers/lms0726Database.mjs`.
Real PostgreSQL runner: `lwrpc-admin/scripts/lms0726-foundation-postgres.mjs`.

Migration filenames (NOT FINAL / NOT production-ready):
- `20260909002847_lms0726_security_foundation_additive.sql`
- `20260909002931_lms0726_security_foundation_tightening.sql` (unimplemented)

Before further implementation, retain current working changes and read this checkpoint plus the final readiness/migration specifications. Continue normal security/read/write foundation first; do not skip ahead to UI parity or deletion.

## Verification at this checkpoint

- Full deterministic suite: 998/998 passed after the timestamp false-positive test correction. Subsequently added private-table RLS-drift test passed in the focused database suite; the last full-suite count is not represented as 999.
- Latest focused database suite: 5/5 passed. Rating/viewer domain controls: 3/3 passed.
- PostgreSQL 17.11: clean apply, replay, second replay, concurrent Remove same request, authority-revocation race and future-lineup-insertion race passed. Scope is the current subset, not the missing read/Phase 2 contracts.
- Lint: exit 0, 10 warnings, no errors.
- TypeScript: passed with --noEmit --incremental false.
- PDF server bundle verification: passed.
- Build: passed after retrying outside the sandbox for the local Next TypeScript cache write. Initial permission failure retained in its separate log.
- git diff --check: passed after the roadmap update removed its trailing blank lines.
- No visual/parity/accessibility or Phase 2 bypass tests have been run.

Current additive SHA-256 (checkpoint only; not a final release artifact): 78d18c867767907674698b41094a22917c071cb6d20c929de4eb34cdaae4fc6c.

Function owners/execution grants are recorded in lwrpc-admin/scripts/lms0726/function-manifest.json. There are eight functions, not the required final fourteen. Phase 2 remains unimplemented. Do not apply either migration to production from this checkpoint.
