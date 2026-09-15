# LMS-0733 combined Clean — selected RF cutoff local reconciliation

LOCAL ONLY. Production remains Upload UX commit `515c5d5525aa7d927a30c1011c4cf309764765d4`. No deployment, production SQL, Clean, import, Clear, Delete, transfer or rating writes were performed for this work.

## Owner policy implemented

- One explicit Clean handles regular and PrimeTime Season DUPR.
- Before calculation the authorized administrator sees “Reliability Factor NR cutoff”. A read-only options call retrieves the active Rules default, currently 29. There is no hardcoded 29 in the application calculation or new SQL. A test changes the active Rules default to 41 and verifies the prompt default follows it.
- Enter a whole number from 0 to 100. Empty, fractional, negative, nonnumeric and above-100 values are rejected. RF at or below the selected cutoff is NR for both fields.
- Selecting a cutoff changes this run only. Active Rules documents, version and configured defaults are never updated by this operation.
- The administrator explicitly requests the first preview. Every subsequent cutoff change immediately removes the old preview/confirmation and starts a new preview when valid. Invalid input leaves no confirmable preview. Request generations discard late responses from an older cutoff.
- Confirmation states the selected cutoff, active Rules default, and regular/PrimeTime create/update counts. Confirmation locks the cutoff control. A season/operation change invalidates the outstanding confirmation.
- Rated PrimeTime with valid age-based input and RF needs no actual roster and no DOB/age-proof schema. Truncate age-based input to one decimal. Missing age defers PrimeTime without preventing a valid regular proposal.
- NR calculations use separate highest current regular/PrimeTime division maxima and the active Rules adjustment. Existing established values survive removal from all applicable rosters; blank values defer. Candidate eligibility does not create a final rating.

## Preview / commit / provenance binding

The server validates and normalizes `rfCutoff`, calls the canonical combined database plan, and requires matching `rfCutoff` plus `combined-clean-v2` in the returned preview. The selected cutoff and calculation version are included in the session/actor-bound HMAC receipt. The commit request must carry the same selected cutoff; mismatch is rejected before calling the commit RPC.

The database transaction requires the cutoff and combined version, recalculates both fields with that cutoff under the existing locks, and compares the full-context fingerprint. Rules, roster, source, working inputs and final-value changes invalidate the preview. A legacy regular-only receipt fails closed. Both final fields update atomically and independently; missing/deferred values preserve the existing field. A partial failure rolls back all rating changes.

Audit/provenance records the selected cutoff in `runs.payload.rfCutoff`, the result's `rfCutoff`, and `runs.result.basis.rules.threshold`; the active default is retained separately in `basis.rules.defaultThreshold`. Existing Rules version/hash, per-player calculation basis, inputs, roster context and before-images remain recorded. Source/working inputs are not rewritten by Clean.

## Local evidence

- Six new test groups cover validation, default changes, signed cutoff binding, successful synthetic dual execution and audit, RF boundary, regular/PrimeTime NR lifecycles, stale/legacy receipts, Rules/input/roster/final changes, rollback, missing age and service-only access.
- Six existing workflow/safety groups also passed (12 targeted groups total).
- Stored anonymized 659-player snapshot, not a fresh production preview: cutoff 29 gives 538 regular creates, 489 PrimeTime creates, 121 NR deferrals in each field, 49 Rated missing-age PrimeTime deferrals, 538 unique affected players. Preview leaves final fields untouched. Cutoff 30 changes both counts and the fingerprint.
- Actual-page synthetic browser fixture: initial default 29; previews requested at 29, 28, 30, 28; delayed 28 response could not replace the newer 30 result. Fractional 29.5 cleared the preview and showed validation. Confirmation at 28 displayed both result counts and selected cutoff; cancelled without execution. Fixture commit count 0, no Clean audit rows, source and season rows unchanged. No browser console errors.
- Full regression: 1,190 tests passed, zero failures. Lint: zero errors, six existing unrelated warnings. Build/TypeScript: passed. Whitespace check passed; no literal 29 exists in the new application calculation/server/component or new migration.

## Exact local files

- lwrpc-admin/app/components/SeasonRatingsWorkflow.js (accepted Upload UX carried forward, combined preview and RF prompt)
- lwrpc-admin/app/lib/seasonRatingsWorkflowServer.js
- lwrpc-admin/app/lib/seasonRatingsClean.js
- lwrpc-admin/supabase/migrations/20260911010000_combined_clean_selected_cutoff.sql
- lwrpc-admin/test/combinedCleanCutoff.test.mjs
- lwrpc-admin/scripts/combined-clean-browser-fixture.mjs
- docs/lms-0733-combined-clean-cutoff-local-review.md
- docs/lms-0733-final-workflow-design.md
- docs/project-roadmap.md

The superseded, uncommitted JS-only PrimeTime adapter was removed; preview and commit now share the canonical SQL plan rather than maintaining two calculation implementations.

## SQL / remaining release gate

A NEW local migration is required for the combined atomic transaction and selected-cutoff RPCs; it has only been applied to isolated PGlite test databases. It creates no age/DOB fields and does not modify Rules or business rows on application. It must receive separate production review/authorization before application. Existing migration 20260910211313 must NOT be reapplied. Original file SHA-256 remains `4af6b18c0c2712d0255c2ecc3a02af8130c4cd568e7adcbd30ddd6f5e77bcbed`.

New local migration SHA-256: `622d319d7871cbd928f997da4b859634fe989b7e19a3fdfffb7670be1b2d72ed`.

This is not a production release candidate or production Clean authorization. Complete the combined-Clean review, consolidate on the current accepted application baseline, establish immutable application/SQL identities and recovery checks, obtain separate deployment/migration approval, then generate a fresh production preview using the administrator-selected cutoff with writes disabled. Production Clean still requires owner review and explicit authorization of that exact combined preview.
