# Season Ratings post-success refresh — FAST FIX local validation

Owner explicitly authorized this application-only post-success correction and fixture-based write acceptance. Production Import/Clean is prohibited for acceptance. Baseline application f0d6849a814798b79d7396a48a6b05f3d47425b8, accepted deployment dpl_4jw8S8P8gmHgDj9jjpTsyeqeW993. Checkout includes its documentation-only follow-up 1283768.

Root cause: the page already re-fetched ratings after success, but editable inputs use defaultValue and stable member/season keys. The existing DOM inputs therefore retain prior values after data changes. Success/error handling also combines transaction and refresh failures, clears preview on transaction failure, and reports incomplete committed counts.

Correction: three application files only. Separate committed-result formatting uses only returned transaction totals. Post-success callback fetches selected-season and all-season rating rows together, updates both datasets and source-review refresh, and advances a grid-input key revision only after successful reads. Workflow component is not remounted, selected season is not reset, and success summary survives refresh. Preview/receipt/page state is cleared after success; CSV selection resets only for committed Import. Cancel/failure retain preview/file. Refresh failure after commit preserves the result and explicitly warns that grid refresh failed, without retrying the transaction.

Import reports committed imported-row, Doubles/RF/Age fill, protected-field, missing-source-field, inactive, not-found and combined ambiguous/invalid REVIEW totals. Current server payload does not separate ambiguous from invalid. Not-found derives from the committed Upload partition total minus affected, inactive and review; no preview counts supply the result. Clean reports committed cutoff, regular/PrimeTime CREATE/UPDATE/NO CHANGE/NR DEFER/REVIEW, missing inputs/Age/RF. No invented missing totals: absent counts show not reported.

No changes to transaction/API/SQL/security/receipt validation, DUPR matching, full precision, RF/age mapping, fill-blank-only behavior, Clean/NR calculations, Delete or Copy handlers.

Verification: 56 focused tests pass including actual component handlers, actual page callback, cancellation, transaction failure, refresh failure, differing committed versus preview counts, full precision, mapping and transaction protections. Lint zero errors/six existing warnings; build, TypeScript, PDF bundle and diff checks pass.

Actual React page local browser fixture: nondefault B Selected Season preserved. Cancel retains CSV/preview and produces no commit. Synthetic Import changes visible inputs from blank to 4.077 and 100; preview/file disappear and success remains. Synthetic Clean changes Season/PrimeTime inputs to 4 and 4.3 and updates returned notes; preview disappears and complete summary remains. Two synthetic commits total, fresh loopback reads, zero browser errors. Fixture does not access production credentials or data. No AI generations/cost.

Production preflight pending signed-in browser: session expired after four hours. Read-only preflight counts/hashes captured for ratings, teams, rosters and workflow runs. No production write or deployment at this checkpoint. Recovery target is prior accepted deployment; no database rollback needed.
