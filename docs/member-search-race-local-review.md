# Member search race — local correction

Local-only branch: `codex/member-search-race`, checkout `.local-validation/member-search-race`, based on reviewed production commit `12df254965c552c8d21f2b96b81d6843ace7bc84`. Separate from the pending LMS-0733 UI correction.

## Confirmed cause and fix

Member Administration starts asynchronous directory requests as the deferred search changes. Previously every response could update the list/counts, regardless of newer requests. A slow response for a short prefix could replace the completed last-name result.

The local correction assigns a request generation at load start, invalidates it immediately on a new search keystroke and on effect cleanup, and ignores superseded responses before showing errors or updating rows/counts. It also checks after asynchronous authorization. Matching, permissions, data access, paging and database behavior are unchanged.

Changed files in the isolated checkout:
- `lwrpc-admin/app/members/page.js`
- `lwrpc-admin/test/memberSearchRace.test.mjs`

Tests execute the actual page loader with deliberately reordered responses, stale errors, unmount and the gap before deferred search catches up. Five tests passed including the existing read-only directory search/filter/paging database fixture. Lint passed with zero errors and six existing warnings. Production build and TypeScript passed with synthetic loopback configuration; diff check passed. Initial local build attempts encountered an out-of-root dependency junction and then an incomplete dependency copy; after the local dependency copy completed, the unchanged build configuration passed.

## Season Ratings remains under diagnosis

This screen filters the loaded member array synchronously using the current search state; it does not issue a per-keystroke directory request. A separate read-only production tab returned the same nine valid substring matches for instant `Smith` and rapidly successive `S`, `Sm`, `Smi`, `Smit`, `Smith`. `Messersmith` is expected under the existing substring search. No records were edited, and the owner's current tab was untouched. This does not rule out the reported issue; the owner's example name is requested. No speculative change was made to Ratings.

No deployment, SQL, migration, ratings operation or business-data mutation.
