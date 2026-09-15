# LMS-0733 combined Clean — production preview checkpoint

September 10, 2026, 9:24 PM EDT. STOPPED BEFORE CLEAN. No production Clean, Upload, Delete, Clear, Transfer, Copy or initializer execution occurred. No final rating writes occurred.

## Immutable release and migration

- Application commit: `6d86e113ba1d40cc623f435bfd68753ea7535d5b`, branch `codex/lms0733-combined-clean`, version 0.1.555 / LMS-0733.
- Accepted parent: `515c5d5525aa7d927a30c1011c4cf309764765d4` (Upload UX).
- Deployment: `dpl_E89PiGwFsrfqGPKdofS5CutKFMws`; READY; production domain `https://league.lwrpickleballclub.com`; immutable URL `https://lwrpc-admin-d1p6kaioj-terry-lwrpc.vercel.app`.
- Exact migration filename: `20260911010000_combined_clean_selected_cutoff.sql`.
- Reviewed/applied CRLF SHA-256: `622d319d7871cbd928f997da4b859634fe989b7e19a3fdfffb7670be1b2d72ed`.
- Git LF blob SHA-256: `5afead306d308f021ca6187de04b773a84495ed899a6c34d96177744d01a0651`. CRLF-to-LF normalization is the only difference. No identity guard was bypassed.
- Applied ONCE, production migration record `20260911011803`, name `combined_clean_selected_cutoff`. The production migration-history statement SHA-256 equals the exact reviewed CRLF SHA-256 above.
- Previous migration `20260910211313` remains present once and was NOT reapplied.
- 1,150 exported Git blobs verified byte-for-byte. Reviewed application/migration files also compared to the reviewed local candidate. No unrelated application changes.
- Both `SEASON_RATINGS_WORKFLOW_WRITES_ENABLED=false` and `SEASON_RATINGS_PHASE1_COMMIT_ENABLED=false` supplied at build and runtime. Production Clean confirmation is disabled and the UI says “Writes are disabled. This is a read-only preview.”

## Fresh production acceptance preview — default cutoff 29

Season: **2026 Fall Season**. Active Rules default and selected cutoff: **29**. RF ≤29 is NR for BOTH calculations.

Rules version: `6ae10e5f-fdde-41be-a941-d1b7ed360d1a`; Rules hash: `07fc603d1774fde0c7be41093f69f67c`. Adjustment 0.5; truncation to one decimal. Active Rules remained unchanged after cutoff variation.

Preview fingerprint at 29: `4462b61826d8d744d2dcc8f8752bd848`. Fresh SQL preview at 01:21:31 UTC; browser preview independently reproduced the same counts, then recalculated at 30 and restored 29.

| Result | Regular Season DUPR | PrimeTime Season DUPR |
|---|---:|---:|
| CREATE | 538 | 489 |
| UPDATE | 0 | 0 |
| NO CHANGE | 0 | 0 |
| NR DEFER — no applicable division | 121 | 121 |
| REVIEW — invalid/conflicting input | 0 | 0 |
| Missing required Doubles/RF | 1,162 | — |
| MISSING AGE-BASED — Rated | — | 49 |
| Missing RF | — | 1,162 |
| Inactive SKIP | 159 | 159 |

The preview evaluates 1,980 members: 1,821 active and 159 inactive. The 1,162 missing-input members are outside the 659 imported population. Missing inputs are deferred, not classified as NR. Within the imported population, 538 are Rated and 121 are NR. Of the Rated players, 489 have an eligible working Age-Based input and 49 do not.

**Confirmation summary for owner review, NOT EXECUTED:** 2026 Fall Season; selected RF cutoff 29, Rules default 29; 538 regular CREATE / 0 UPDATE and 489 PrimeTime CREATE / 0 UPDATE; **538 distinct players**, **1,027 proposed final-field creations**. No imported Doubles/RF/Age-Based changes; source/import history preserved. All deferred/unknown/inactive fields remain unchanged. The production confirmation dialog was not opened because the write gate correctly prevents confirmation. Its selected-cutoff/count binding and cancellation were verified in the actual-page local fixture; signed receipt and atomic commit binding passed isolated database tests.

## Representative calculations — preview only

| Player / case | Stored source → imported working input | RF | Regular proposed | PrimeTime proposed |
|---|---|---:|---|---|
| Alan Fox — Rated, 65+ metric | Doubles 3.675 → 3.6; 65+ Age-Based 4.206 → 4.2 | 100 | CREATE 3.6 | CREATE 4.2 |
| Adil Jaffer — Rated, permitted 50+ fallback | Doubles 4.057 → 4.0; 50+ Age-Based 4.31 → 4.3 | 90 | CREATE 4.0 | CREATE 4.3 |
| BJ Arnold — RF30 | Doubles 2.432 → 2.4; 50+ Age-Based 2.661 → 2.6 | 30 | CREATE 2.4 | CREATE 2.6 |
| Aaron Muia — Rated, missing Age-Based | Doubles 3.673 → 3.6; Age-Based absent | 70 | CREATE 3.6 | DEFER; remains blank |
| Ann Shaddix — NR without division | Doubles 2.918 → 2.9; 65+ Age-Based 3.423 → 3.4; no current division | 20 | NR DEFER; remains blank | NR DEFER; remains blank |

All listed current final ratings are blank. Rated PrimeTime proposals do not require roster placement. The imported metric category is provenance for the chosen input, not verified age/DOB evidence. Clean truncates the already-imported working input; it does not reimport source values.

There are **no actual RF29 rows** in this production population. The permanent isolated RF29 fixture verifies NR at cutoff29 and Rated at cutoff28 for both calculations, with blank/no-roster NR results deferred. No production player was altered to manufacture that boundary case. There are **71 RF30 rows**. A first text comparison of numeric JSON undercounted RF30; corrected numeric comparison established 71 (see `combinedBoundaryAnd65` in evidence).

## Production cutoff-change and desktop UI verification

- Prompt defaults to 29 from active Rules, with whole-number input constraints 0–100.
- Exact text: “RF at or below your selected cutoff is NR for both regular and PrimeTime calculations. This selection applies only to this Clean run and does not change the Rules.”
- Preview repeats the selected cutoff and active Rules default.
- Changing 29 →30 immediately removed the old preview and its confirmation control, displayed Working…, then recalculated both fields.
- At 30: regular CREATE467 / NR DEFER192; PrimeTime CREATE423 / NR DEFER192 / missing Age-Based44. Fingerprint `0fd6f1a94fe230d9c84defab03f569ee` differs from 29. BJ Arnold becomes NR and defers both finals without division context.
- Restored29: regular CREATE538 / PrimeTime CREATE489 / NR DEFER121 each / missing Age-Based49. Browser left at this owner checkpoint.
- Confirmation remained disabled. No commit request was made. No gate was enabled to test a confirmation.
- Local permanent tests verify mismatched cutoff receipt rejection, stale Rules/input/roster/final rejection, old-response rejection, fractional/empty/range validation, and unchanged active Rules. Exact same cutoff is required by preview, receipt, confirmation and transaction; audit retains selected cutoff, Rules default/version/hash and per-player basis.
- Desktop presentation visually checked; source/current/proposed columns retain horizontal scrolling. Mobile acceptance is not applicable to this administrative workflow.

## Validation and integrity

- Reviewed full suite: 1,190 tests passed; zero failures. Consolidated immutable release: all 12 targeted combined/workflow/security groups passed again.
- Release lint: zero errors, six pre-existing unrelated warnings. Production build/TypeScript and PDF server bundle guard passed. Vercel build passed.
- Normal production Admin, Captain, Player and Member Administration pages loaded using the existing Commissioner session. Existing empty-roster/match states were preserved. No separate role impersonation or production write-path probes were performed.
- Browser errors: none. Deployment runtime error/fatal log query: none.
- All 19 protected business-table counts/fingerprints exactly match pre-migration baseline through final check at 01:23:56 UTC.
- Final regular populated count0; final PrimeTime populated count0; **Clean audit count0**; workflow runs remain1 (the previously authorized transfer only).
- Working inputs remain659 Doubles /659 RF /551 Age-Based; 108 imported players have missing Age-Based. Source and import-history hashes unchanged.
- Active maintenance cron count3 unchanged. New RPCs deny anon/authenticated execution, grant only service_role; private helpers retain restricted ACLs, empty search paths and existing timeout/lock controls.

## Recovery

- Application rollback target remains READY: deployment `dpl_46G3yMrKFp8vx5JsfKJkxvTwxThp`, commit `515c5d5525aa7d927a30c1011c4cf309764765d4`.
- With Clean writes disabled, the accepted application can coexist with the new additive preview functions. Legacy Clean receipts fail closed.
- Captured prior `ratings_workflow_private.commit_run` definition in `.local-validation/combined-commit-recovery.sql`. Tested restoring that exact production definition in isolated PGlite: matched the previous definition, preserved fixture rows, and retained accepted workflow compatibility. New additive read functions may remain. No production rollback or data export occurred.
- Identity manifest: `.local-validation/lms0733-combined-release-identity.json`; production evidence: `.local-validation/lms0733-combined-production-evidence.json`.

## Stop condition

Controlled deployment and preview verification complete. **No Clean execution is authorized by this checkpoint.** Owner review and explicit authorization of a freshly revalidated combined preview are required before enabling or executing any rating writes.
