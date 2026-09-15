# LMS-0733 simplified administrator workflow — local review

Owner correction received September 10, 2026. STOP FOR REVIEW. No new release deployed and no production ratings operation executed.

## Production cancellation and integrity

The owner correction arrived while the transfer confirmation modal was open, BEFORE its final confirmation. The pending operation was cancelled. Production was immediately restored to `dpl_9gnFJX1C8rK8VHKrnz5dmE6LWKJ7` (`12df254965c552c8d21f2b96b81d6843ace7bc84`). Vercel reported READY with the production aliases; a fresh browser preview explicitly reported **Writes are disabled. This is a read-only preview**, with its confirmation disabled.

Read-only checks at approximately 22:00–22:04 UTC confirmed zero workflow runs, two unchanged Fall rating rows, zero Working Age-Based values, unchanged source/batch hashes, and unchanged final Season/PrimeTime hashes (both have zero populated values). All 18 non-rating business-table fingerprints matched the preceding baseline. The ratings fingerprint also matched when calculated with the same baseline projection excluding the newly added, entirely NULL age input: `45213079f14e8e6374c4cb7876d0e6e7`. No transfer, Clean, Clear, Delete, Upload, initializer or rating write ran. Migration `20260910211313` was not reapplied.

## 1. Simplified UI

Data Tools / Ratings Import now groups **Upload Ratings CSV**, **Clean Ratings**, and **Delete Season Ratings** as standard LMS buttons. Upload is selected initially. There is no Action dropdown and no Transfer or Clear choice. Copy remains a separate season-to-season control below. Source Review remains separately accessible.

Upload and Clean retain their preview and explicit confirmation safety steps. This is one logical Upload workflow, not an Upload followed by a manual Transfer. Switching actions discards the prior preview. Opening the page or selecting an action does not perform a ratings write.

## 2–4. Upload, source history, working fills

The reviewed backend ALREADY performs the combined operation; no backend change is needed. One confirmed Upload uses DUPR-ID matching, records the source/audit snapshot, and fills eligible NULL working Doubles, RF and Age-Based fields in the existing bounded transaction. Each existing working field is independently preserved. Numeric Doubles/Age-Based values are truncated to one decimal, RF must be whole, and absent Age-Based data remains NULL when the input is blank. Current source history can update even when a working input is protected. Existing matching, activity, ambiguity, stale-preview, identity, Rules, transaction and receipt guards remain intact.

Neither final Season DUPR nor final PrimeTime Season DUPR is changed by Upload. No automatic Clean, Transfer request or initializer follows Upload. Source review/history is informational and does not impose a second operational step.

## 5. Clean

Clean is a separate explicit preview/confirmation using the active Rules. Its existing CREATE, UPDATE, NO CHANGE and NR DEFER/retention behavior is unchanged. Blank NR without a roster waits; current applicable rosters supply the division context; removing the highest roster can lower the calculated value; removing all rosters retains an established rating. This deployed backend currently calculates regular Season DUPR only. Final PrimeTime calculation remains separately governed work; this UI correction does not add it.

## 6. Existing Delete behavior — preserved for owner decision

The handler deletes **entire `member_season_ratings` rows for the selected season** after its existing explicit confirmation. This removes working Doubles, working RF, working Age-Based, final Season DUPR, final PrimeTime Season DUPR, notes and row metadata. It does not delete member records or other seasons.

It does **not** delete source snapshots, source import batches, workflow audit runs or the private working-input selection/provenance records. Read-only production catalog inspection found zero inbound foreign keys to the ratings table and zero user triggers, so there is no indirect cascade/trigger cleanup from this delete. Consequently Delete is not a complete source/provenance reset. Do not rely on it as a refresh/reset contract until the owner accepts or revises that policy. The handler and its confirmation are unchanged; no live Delete test was performed.

## 7. Copy status

Copy remains unchanged as a separate explicit cross-season operation. It copies Doubles, RF, final Season DUPR and final PrimeTime Season DUPR, updating matching target players and creating missing target rows. It does not copy the newly separate Working Age-Based field, notes, source history or source provenance. It is not a replacement for Upload or the one-time backfill. No Copy operation was executed.

## 8–9. Internal Transfer and Clear

Both choices are removed from normal UI. Their existing guarded backend capabilities remain intact for separately authorized maintenance. Hiding them is not a new authorization boundary: the existing authenticated route/service-only database controls and write gate are unchanged. No infrastructure, grants or migration was removed.

## 10. Proposed one-time reconciliation — NOT AUTHORIZED TO EXECUTE

Use a separately reviewed, server-side, one-shot maintenance runner calling the already reviewed bounded transfer capability. Keep the normal application write gate disabled; do not restore a permanent Transfer button or temporarily enable all normal workflow operations merely to backfill. This runner would require explicit owner authorization for this exact maintenance path and execution; it has not been implemented or run in this correction.

Before execution, pin the reviewed source snapshot and production identity; verify the season, matching/activity state, source revision, preimage recovery/audit support and operational fingerprints. Generate a fresh plan and require exactly 659 Doubles fills, 659 RF fills, 551 Age-Based fills, 108 missing ages, no protected-field overwrite, and zero final Season/PrimeTime changes. Any unexplained difference stops the run.

The runner must hard-limit the operation to transfer, the Fall season and the approved fingerprint; use one unique run ID; execute the existing transaction exactly once; and never retry an uncertain result before reading its recorded outcome. It must reject Clean, Clear, Delete and Upload. The database revalidates the fingerprint under its existing locks. Failure must roll back the work. Existing before-images and the single audit run support a separately reviewed compensating recovery; application rollback alone is not data recovery.

Afterward verify each working field against stored source/truncation, 108 missing ages, final-field zero changes, source/audit preservation and operational fingerprints. Produce a read-only Clean preview and STOP for separate Clean authorization. No full ratings-table export is required or planned.

## 11. Exact changes

Local implementation is isolated under `C:\lwrpc-league-system\.local-validation\lms0733-candidate`, based on commit `12df254965c552c8d21f2b96b81d6843ace7bc84`:

- `lwrpc-admin/app/components/SeasonRatingsWorkflow.js`: normal action buttons, Upload default, concise explanatory copy and slot for the existing Delete control.
- `lwrpc-admin/app/ratings/page.js`: group workflow controls inside Data Tools and update Source Review directions. Delete and Copy handlers unchanged.
- `lwrpc-admin/test/seasonRatingsSimpleWorkflow.test.mjs`: permanent normal-UI and combined Upload/preservation/no-auto-Clean controls.

Documentation: this report, `docs/lms-0733-final-workflow-design.md`, and `docs/project-roadmap.md` in the main workspace. No new immutable commit has been established; these are local review changes, not a deployable identity approval.

## 12. SQL requirement

**None for this correction.** No SQL, migration, API handler, business rule, authorization or workflow gate content changed. Future reconciliation reuses the existing transaction but needs separately reviewed execution tooling and authorization.

## 13. Validation

Nine focused controls passed, including combined Upload, source audit, per-field preservation, missing age/truncation, no automatic Clean, all nine NR lifecycle states, transaction rollback, stale receipts, permissions and the 659/659/551/108 fixture. Desktop synthetic browser verification shows the three buttons, separate Copy and separate explicit Clean preview. RF29 retained its established NR value; RF30 previewed a regular update; no browser commit was invoked. Admin mobile acceptance is not applicable.

Lint passed with zero errors and six existing warnings. Build and TypeScript passed using synthetic loopback configuration with write gates disabled. The first build lacked required Supabase configuration; it passed after supplying synthetic values, without loading production secrets. Full regression: **1,184 passed, zero failed/skipped**. PDF server-bundle guard and `git diff --check` passed. Browser fixture evidence: zero commits, source unchanged, season unchanged. Delete and Copy handlers compare equal to the reviewed commit after line-ending normalization. Approved migration SHA-256 remains `4af6b18c0c2712d0255c2ecc3a02af8130c4cd568e7adcbd30ddd6f5e77bcbed`. Full test log: `.local-validation/lms0733-candidate/.local-validation/simple-workflow-tests.txt`.

## 14. Controlled production sequence

1. Owner reviews this local UI, current Delete/Copy semantics and the separate reconciliation plan.
2. Establish a new immutable candidate containing only accepted corrections; rerun identity/release guards. Do not deploy these edits as the old commit.
3. Obtain deployment authorization; deploy exact candidate with workflow writes and abandoned initializer disabled. Apply no migration.
4. Verify normal LMS first, then desktop Upload/Clean/Delete controls and read-only previews; verify unchanged business/source/final fields.
5. Separately review and authorize the narrowly bounded one-time reconciliation runner and its fresh counts. Execute only that authorized operation; keep normal application writes disabled.
6. Verify the result and present the new read-only Clean preview. STOP before Clean, any PrimeTime calculation or other ratings operation.
