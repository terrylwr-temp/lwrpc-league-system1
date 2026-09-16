# Upload after Delete — restoration review, 2026-09-16

Owner confirmed both seasons were deliberately cleared and expects CSV Upload to repopulate matching members' rating inputs. This matches the previously documented Upload -> working inputs -> explicit Clean workflow, not the deployed source-only importer.

Verified: deployed import preview compares only ratings_source_private.sources; commit writes only that store. It skips unchanged source values even when member_season_ratings is absent. Delete clears member_season_ratings but leaves source records. Current Clean reads legacy working inputs, not the source store, so it is not a workaround for absent inputs.

Minimum correction for review:
- Keep exact normalized DUPR-ID matching, active-member rules, duplicate/invalid rejection, original CSV tolerance and full precision.
- Preview proposed CREATE of missing selected-season working rows and FILL of independently blank Doubles/RF inputs even when the source payload is unchanged. Preserve populated inputs, final Season DUPR/PrimeTime values and notes.
- Extend the existing authorized transaction and snapshot contracts for those working-input writes; include current working values in the signed preview, recheck them at commit, atomically update source/working state and retain before-images, idempotency and actual committed counts. No browser grants or authorization expansion.
- Keep full-precision Age-Based input separate from final PrimeTime output; first reconcile the existing reviewed candidate/schema before choosing storage. Do not write raw age into final PrimeTime as a shortcut.
- Do not calculate final Season DUPR/PrimeTime or automatically run Clean as part of Upload. No change to Clean policy/calculations within this correction.
- Refresh the selected season and show actual results after success; preserve file/preview on cancellation/failure.
- Validate locally with empty seasons, unchanged source plus missing working row, mixed blank/populated inputs, repeats, concurrent edits, failures, and nonmatching/ambiguous IDs. Production acceptance uses preview only; owner confirms each actual import.

Initial review expected database-function/transaction changes and therefore stopped for approval under the FAST FIX escalation rules. After owner approval for local implementation/testing, read-only inspection found the required reviewed transaction still deployed. That initial SQL expectation is superseded: LMS-0739 reconnects Upload to the existing transaction without a migration or authorization change. Implementation and synthetic local tests are complete; no production import, Clean, restoration or deployment has occurred. See [the local review](lms-0739-upload-restoration-local-review.md). Existing unrelated source-review work is not approved for deployment by this report.
