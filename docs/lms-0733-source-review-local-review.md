# LMS-0733 / 0.1.555 — source review local acceptance

Status: LOCAL ONLY — STOP FOR OWNER REVIEW. No deployment, production migration, import, Clean Ratings, initialization, or production business-data mutation was performed. One read-only active-Rules query supported the separate workflow diagnosis.

Candidate: C:/lwrpc-league-system/.local-validation/lms0733-candidate, branch codex/lms0733-source-review, based on accepted a9a515da7287f50408fcd98b6779f3d7ad6806bb. The mixed main checkout was not used for implementation. Version remains LMS-0733 / 0.1.555.

## Exact implementation files

Paths below are relative to the candidate's lwrpc-admin directory:

- app/components/SourceRatingsReview.js — independent read-only review, pagination, responsive cards, history and protected comparison.
- app/components/RatingsImportPreview.js — explicit CURRENT CSV PREVIEW; complete source values as of preview; honest no-change status; keyboard-focusable horizontal comparison region.
- app/lib/seasonRatingsReview.js — raw display projection and preview wording; no numeric calculation or RF classification.
- app/lib/seasonRatingsImport.js — forwards already-read stored source values and distinguishes matching values from unusable CSV data; parser, import updates and matching policy unchanged.
- app/lib/seasonRatingsImportServer.js — bounded review action using the existing RPC; no receipt, commit, or mutation in that action.
- app/ratings/page.js — Source Review toggle available on mobile, automatic opening after CSV preview, refresh after an existing successful commit, stable read callback. Clean Ratings code unchanged.
- supabase/migrations/20260910171732_season_ratings_source_review_metadata.sql — replace existing read function only.
- supabase/rollback/season_ratings_source_review_metadata.sql — optional prior function restoration only.
- test/helpers/sourceReviewFixture.mjs — synthetic 659-row fixture and verified live-value samples/timestamp.
- test/sourceRatingsReview.test.mjs — migration, security, projection, preservation and regression tests.
- scripts/source-review-browser-fixture.mjs — actual local page/route, synthetic database, mutation-denying adapter.

Documentation: docs/lms-0733-source-review-local-review.md (this report), docs/lms-0733-season-initialization-diagnosis.md, and docs/project-roadmap.md. Main docs also retain test logs and screenshots; those are evidence, not deployment assets.

## Read contract and SQL security

Changed function: ratings_source_private.snapshot(p_actor uuid, p_season uuid, p_ids jsonb) RETURNS jsonb. Same signature and postgres owner, SECURITY DEFINER, search_path='', statement_timeout='5s'. CREATE OR REPLACE preserves the existing ACL. No ALTER ROLE, GRANT, REVOKE, policy change, table creation, data statement, or historical migration edit.

Unchanged public wrapper: public.season_ratings_source_snapshot(uuid,uuid,jsonb), SECURITY INVOKER, postgres owner, search_path=''. Existing service_role execution on wrapper/private snapshot and private-schema USAGE remain. PUBLIC, anon and authenticated lack execution; all three API roles including service_role still lack direct source/batch table access. Private tables retain RLS and no browser policies. The private definer reads as postgres through the existing explicit manager/commissioner identity check; the browser never gets a privileged key. Existing server route validates the bearer token, trusted actor, origin and View As restrictions; its authentication code is unchanged.

New read: ratings_source_private.batches columns season_id (scope), created_at (timestamp/order), id (internal result validation/tie-break only), result (updated count/success contract). No actor, file hash, payload, before-images, source revisions or batch ID are returned by the new browser review response.

Existing reads retained: seasons(id,name,is_active); members(id,first_name,last_name,dupr_id,is_active_member); sources(member_id,season_id,data,revision); member_season_ratings(member_id,season_id,season_dupr_rating,season_primetime_rating,dupr_reliability_rating), plus unchanged authorization resolver dependencies. No new business-table privilege.

Metadata shape: lastSuccessfulImport = null, or { importedAt: database created_at timestamp with offset, rowCount: result.updated }. Season ID/name remain in the existing season envelope. UI uses an explicit local timezone label. created_at is the existing transaction timestamp, not a newly invented exact commit-completion time.

Success selection: same selected active season; most recent created_at, then UUID tie-break. The current atomic commit writes its batch only after every source update succeeds. The selector accepts its exact three-key success result (updated positive integer, importId matches batch ID, seasonValuesChanged=0); previews/cancelled confirmations create no batch. Failed/rolled-back transactions leave no batch. Synthetic failed/cancelled/rolled_back status-bearing records are not accepted as success. There is no persistent status column in the existing schema; this change does not invent one or claim to recognize an out-of-band manual data reversal that leaves a success audit record unchanged.

Browser review requests contain at most 100 DUPR IDs (UI pages contain 50). SQL retains its existing 1,000-ID limit and five-second timeout; server RPC timeout remains eight seconds. Source review follows current filters and has separate pagination. It uses current DUPR IDs with the existing matched-member read path; no broad browser member/source query is added. Protected values already loaded by the Ratings page are available as fallback for members without a lookup match.

## UI results

LAST SUCCESSFUL IMPORT is independent of CURRENT CSV PREVIEW. Reloading/opening Source Review loads durable metadata without uploading a CSV. A no-change preview does not clear that history or imply a failed import. With matching source rows the message says that source ratings already match stored values, and identifies skipped/invalid rows separately; it does not claim an arbitrary subset/different file is the same historical batch.

CURRENT SOURCE RATINGS displays raw persisted Doubles, RF and age without truncation or derived NR. RF 10 with stored Doubles 3.485 remains 3.485/10. Stored NR is shown literally; this is not a new RF calculation. Missing age is an em dash. If a prior age remains stored after a later file omits age, the actual retained stored age is shown.

SEASON RATINGS / LOCKED VALUES displays existing Season DUPR and PrimeTime Season DUPR separately. Blanks remain em dashes; explanatory text says blank season values do not mean import failure. This is a display label and does not introduce a new database lock or alter the existing manual/Clean Ratings write paths.

The review is available from the independent Source Review control on desktop and mobile. Existing mobile suppression of Data Tools and Clean Ratings remains. Current previews can be read on mobile; their import confirmation button remains desktop-only. No initialization button or instruction to run Clean Ratings was added.

## Verification

- Local PostgreSQL/PGlite: clean apply before any batch; production-compatible apply over existing original migration plus 659 stored rows; replay; postgres ownership, definer/invoker, search_path and ACL equality; manager allowed; player denied; browser wrapper and direct batch-table denied; service_role direct table denied; read succeeds inside READ ONLY transaction; other/no-history season safe; failed/cancelled/status-bearing records excluded; transaction rollback excluded; newest valid same-season import selected; optional rollback restores original response/ACL without data loss.
- Exact source samples (synthetic identities): 3.237 / 30 / 3.478; 3.485 / 10 / 3.729; 4.196 / 100 / 4.744; 4.620 / 100 / missing; NR / 0 / missing. These values correspond to the previously verified live Fall samples. The remaining fixture rows repeat sample data; this is not a replica of production identities or age-category distribution.
- Stored history: count 659 and instant 2026-09-10T15:47:26.791625+00:00; test permits equivalent database timezone offsets while retaining microseconds. Browser displays Sep 10, 2026, 11:47:26 AM EDT.
- Synthetic protected numeric comparison tested separately; current Fall fixture season values blank. Source/business fingerprints unchanged after read tests and browser exercise. Browser adapter: commits=0, sourceRows=659, seasonUnchanged=true, sourceUnchanged=true.
- Actual page/route browser: source review loads, no error overlay/browser errors, correct five samples and missing values, 659-row NO CHANGE preview retains history, changing season removes Fall metadata and source values.
- Desktop 1440px: source/protected groups side by side. 390px and 320px: stacked cards; all source-review descendants within viewport. Preview horizontal overflow is contained in a named, tabindex=0 region. Headings, definition lists, native buttons, expanded state, status/error announcements and visible timezone are present. Automated keyboard-arrow verification was interrupted by a test-browser daemon reset; focusability is present but a complete keyboard/screen-reader audit is not claimed.
- Existing overall-page issue: at 320px, the unrelated whitespace-nowrap “BASED ON THE 2026 FALL SEASON” badge makes page scrollWidth 331px both with and without the review. New review contributes no overflow. Left unchanged to preserve scope; captured as a separate finding.
- Final project checks: npm test 1,170 passed / 0 failed; npm run lint passed with 0 errors and 6 existing warnings; npx tsc --noEmit --incremental false passed; npm run build passed using synthetic loopback-only build credentials; npm run verify:ai-pdf-server-bundle passed; git diff --check passed. No package/dependency/version changes.

Evidence in main docs: lms-0733-source-review-{tests,lint,types,build,pdf,focused}.txt and lms-0733-source-review-{desktop,390,320,nochange-320}.png.

## Migration identity and recovery

Migration: 20260910171732_season_ratings_source_review_metadata.sql
SHA-256: 0e3bf3665b83032bb8b538b11e916b55548dada642f5cdef1097f165ee023098

Original 20260910134349_season_ratings_source_import.sql remains untouched. Application rollback to a9a515d is compatible with the additional metadata key. Database rollback is optional: restore only snapshot's prior definition using the supplied rollback file, retaining all source rows, audits and business data. If the new application runs against the old function, it shows metadata unavailable instead of pretending no import exists.

## Proposed production sequence — NOT AUTHORIZED OR EXECUTED

1. Owner reviews this correction and separate initialization diagnosis. Obtain explicit authorization for this exact application artifact and metadata migration only; no import/clean/initialization is implied.
2. Capture current accepted deployment/migration history, function definition/owner/ACL, operational activity, and required business/source/batch fingerprints. Confirm rollback artifact a9a515da7287f50408fcd98b6779f3d7ad6806bb (accepted deployment dpl_2HH3eaFjrPesqRASyy6SacX4TQUT) and optional function-only recovery.
3. Apply only the reviewed metadata migration once. Verify owner/search_path/ACL unchanged and selected-season metadata/read denials read-only. Do not reapply original source-import migration.
4. Deploy the exact reviewed candidate without fixture scripts, evidence, secrets or local test configuration.
5. Validate normal LMS first, including representative role navigation and existing Tier 1 pages; any regression stops feature acceptance and triggers application rollback. Do not use production mutation probes.
6. Read-only verify Fall count/timestamp/source samples, blank protected season fields, no-change preview wording if separately permitted, other-season history isolation, and desktop/mobile behavior. Compare fingerprints and distinguish legitimate owner edits from release effects.
7. Stop for owner acceptance. Initialization remains a separately designed/approved bounded transaction; Clean Ratings remains untouched and unrun.
