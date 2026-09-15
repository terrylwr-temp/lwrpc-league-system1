# LMS-0733 Delete Season Ratings — preserve DUPR Notes

Owner requirement: Delete Season Ratings must not delete anything in DUPR Notes.

Local correction on accepted commit `6d86e113ba1d40cc623f435bfd68753ea7535d5b`, in `.local-validation/lms0733-combined-release`. Not deployed; no production Delete or data mutation.

The existing handler physically deleted selected-season rows, including notes. It now updates only five rating fields to null: imported Doubles, RF, Age-Based, final Season DUPR and final PrimeTime Season DUPR. Rows, identifiers, notes and other metadata remain intact. Local rating state retains the same rows/notes. Other seasons remain unchanged. Existing explicit confirmation and error handling remain.

Confirmation: “Delete ratings for [count] player(s) in [season]?” Details explicitly state “DUPR Notes are preserved.” Success: “Deleted ratings for [season]. DUPR Notes were preserved.”

Application files changed:
- `lwrpc-admin/app/ratings/page.js`
- `lwrpc-admin/test/deleteSeasonRatingsNotes.test.mjs`

Two regression tests execute the actual handler against an isolated client/state: preserve exact multiline/whitespace/empty/null notes; clear only five fields; retain rows and other seasons; cancel/missing-season/database-error paths preserve state. No SQL migration required. No Clean behavior changed. Production remains unchanged pending separate deployment authorization.

Validation completed: both regression tests passed; lint zero errors with six existing unrelated warnings; production build/TypeScript passed; git whitespace check passed.
