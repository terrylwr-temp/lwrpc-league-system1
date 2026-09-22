# Season Ratings Import Preview Review Filter — Local Review

## Scope

- Release candidate: `LMS-0755 / 0.1.578`
- Accepted production baseline: `LMS-0754 / 0.1.577`
- Change type: display-only FAST FIX in the Season Ratings CSV preview
- Database/schema changes: none
- Import planning, signed receipt, and commit behavior: unchanged

## Defect and correction

Large CSV previews can contain many ordinary `FILL`, `RECORD`, and `SKIP` rows, making the few rows that require attention difficult to review. The preview now opens in its existing all-rows view and provides a `Show Review / Invalid Only` toggle. The filtered view includes only rows whose action is `REVIEW` or `INVALID`; ordinary `FILL`, `RECORD`, `SKIP`, and deferred unmatched rows remain excluded.

Pagination is derived from the visible row set. Switching either direction resets the preview to page 1. The preview states the filtered and total counts, for example `Showing 8 review / invalid rows out of 1800 preview rows`. Row reasons remain visible. The existing `Import Matched Ratings` receipt gate, busy state, and callback are unchanged.

## Changed files

- `lwrpc-admin/app/components/RatingsImportPreview.js`
- `lwrpc-admin/app/lib/ratingsImportPreviewView.js`
- `lwrpc-admin/test/ratingsImportPreviewFilter.test.mjs`
- `lwrpc-admin/app/lib/version.js`
- `lwrpc-admin/package.json`
- `lwrpc-admin/package-lock.json`
- this review document

Existing unrelated working-tree documents were excluded from the release scope.

## Verification

- Focused Season Ratings tests: `56/56 PASS`
- Full automated suite: `1,443/1,443 PASS`
- Lint: `PASS`, 0 errors and 11 existing warnings
- Production build: `PASS`, 84 routes/pages generated
- Regression coverage confirms:
  - default all-rows display;
  - `REVIEW` and `INVALID` inclusion;
  - `FILL`, `RECORD`, `SKIP`, and `DEFER` exclusion;
  - the expected 8-of-1,800 filtered count;
  - pagination over the filtered result;
  - page reset when toggling;
  - unchanged import receipt gate, busy state, callback, and reason display.

## Production protection

The predeployment Commissioner smoke check passed on production LMS-0754 for Season Ratings (`1,841 of 1,841`), Teams & Rosters (`112 of 123`), and Members (`1,841 of 2,027`). A fresh predeployment fingerprint was captured for the five ratings workflow relations after the owner's recent actual import. The retained rollback target is LMS-0754 deployment `dpl_36FKQJ5hyceQmwFdEztoVxNVMVXg` at commit `2d8de88927636f34477d5fe61396bca9a4de3eb3`.

Production acceptance will remain preview-only. It will not invoke `Import Matched Ratings` or make any ratings business-data change.
