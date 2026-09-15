# LMS-0733 source review UX — data-access gate

**STOP FOR REVIEW under owner requirement 10.** No application code, SQL, production data, deployment or Clean Ratings changes were made.

## Verified blocker

The deployed candidate is `a9a515da7287f50408fcd98b6779f3d7ad6806bb`. Local source inspection confirms:

- `ratings_source_private.batches` holds the durable successful-import row count (`result.updated`), season and `created_at`.
- Table access is revoked from browser roles and service_role. The application accesses source data only through the reviewed restricted RPC wrappers.
- Existing `season_ratings_source_snapshot` returns season plus matched members, their stored source data/revision and protected season values. It returns **no last-successful-import metadata**.
- The existing endpoint only accepts CSV preview and explicit commit actions. There is no selected-season review/history action.
- The commit response returns updated count/import identity/seasonValuesChanged, but no authoritative import timestamp.
- `buildRatingsPreview` forwards raw incoming RF and source differences, not the complete stored-source values. NO CHANGE rows therefore lose Doubles/age visibility even though source data was present in the server snapshot.
- `RatingsImportPreview` conflates receipt availability with successful-import history. After a new NO CHANGE preview, `preview.committed` is absent and the fallback says “No confirmed import is available.”

The source/protected columns and preview wording could use already-read snapshot data. However, the complete requested persistent **LAST SUCCESSFUL IMPORT** status requires new authorized data access. A client timestamp, cached prior success flag, or hardcoded Fall batch would not accurately report the latest successful import after reload or season changes.

## Smallest proposed scope for approval — not implemented

1. Extend the existing manager-authorized read contract to include only last successful import season/name, database timestamp and imported row count. Keep batch IDs, actor, receipt, payload and before-images out of the normal UI response.
2. Provide a bounded selected-season review read through the existing trusted server boundary, so history/source review is available without re-uploading a CSV. Preserve current role/season checks and existing View-As boundary; no browser grants or public batch-table access.
3. Return complete stored source Doubles/RF/age separately from current CSV proposals and protected Season DUPR/PrimeTime values. Do not derive NR from RF. Missing age displays an em dash.
4. Render independent LAST SUCCESSFUL IMPORT and CURRENT CSV PREVIEW sections, with source/locked comparison groups and an accurate no-change explanation. Do not claim a different file matches the last import merely because its subset has no changes.
5. Test locally against the captured successful Fall import samples and synthetic protected values; validate desktop/390px/320px, authorization boundaries, no-write behavior and project checks. Keep production deployment as a separate owner gate.

**SQL expectation:** the narrow implementation would require an explicitly reviewed read-function change to obtain batch metadata, plus an application read contract. No new table, business-data write or grant expansion is proposed. The existing historical migration must not be edited/reapplied. No SQL has been written or executed for this request.

## Requested deliverables at this gate

| Item | Status |
|---|---|
| Exact application files changed | None |
| Local documentation | This gate report and project-roadmap entry |
| Last-import status | Blocked: durable metadata missing from current response |
| Source values | Already available to the server snapshot; complete values are not forwarded to the UI |
| Protected fields | Existing snapshot supplies Season DUPR/PrimeTime where present |
| Missing-value behavior | Proposed em dash; no implementation yet |
| Desktop / 390px / 320px | Not tested: implementation stopped at the prerequisite gate |
| Tests/build | Not rerun: no code changes |
| SQL/new data access | Required for complete requested behavior; approval needed before implementation |
| Production sequence | After explicit scope approval: local implementation and validation, owner review, separately authorized deployment and read-only production verification |

Reference files inspected: `app/components/RatingsImportPreview.js`, `app/lib/seasonRatingsImport.js`, `app/lib/seasonRatingsImportServer.js`, `app/api/ratings/import/route.js`, `app/ratings/page.js`, and the existing `20260910134349_season_ratings_source_import.sql`, all inside the isolated candidate.

The successful first import remains untouched: its prior verified result was 659 source rows and one batch. No live data query or mutation was performed during this UX gate investigation.
