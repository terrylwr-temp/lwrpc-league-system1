# LMS-0733 — first combined production Clean result

Completed September 10, 2026 at **9:32:26 PM EDT** (`2026-09-11 01:32:26.260746+00`). One successful logical Clean; no second execution. Owner authorization: attachment `f079f887-5f5c-4143-b362-935fa482cd77/pasted-text.txt`.

## Exact release / settings

- Commit `6d86e113ba1d40cc623f435bfd68753ea7535d5b`, LMS-0733 / 0.1.555. All 1,150 export file identities reverified unchanged before gate enablement.
- Existing migration `20260911010000_combined_clean_selected_cutoff.sql`, production version `20260911011803`, remained applied once. No migration or new SQL definition was applied in this operation.
- Season: **2026 Fall Season**, `3780e56b-adeb-46be-ab1c-b754bc8aa737`.
- Selected cutoff **29**, RF ≤29 = NR, RF >29 = Rated, for both regular and PrimeTime.
- Active Rules default29, version `6ae10e5f-fdde-41be-a941-d1b7ed360d1a`, hash `07fc603d1774fde0c7be41093f69f67c`, adjustment0.5, one-decimal truncation. Rules unchanged.

## Fresh preview, confirmed transaction and actual counts

A new production signed preview was generated after the temporary gate-enabled deployment. Browser preview and final confirmation matched the authorized season/cutoff and all expected counts. Zero UPDATE or REVIEW rows. The transaction recalculated under the reviewed locks and accepted fingerprint `4462b61826d8d744d2dcc8f8752bd848`; audit cutoff29 matches confirmation and preview. No stale receipt was reused.

| Result | Fresh regular / executed regular | Fresh PrimeTime / executed PrimeTime |
|---|---:|---:|
| CREATE | 538 / 538 | 489 / 489 |
| UPDATE | 0 / 0 | 0 / 0 |
| NO CHANGE | 0 / 0 | 0 / 0 |
| NR DEFER | 121 / 121 | 121 / 121 |
| REVIEW | 0 / 0 | 0 / 0 |
| Missing required inputs/RF | 1,162 / 1,162 | 1,162 / 1,162 |
| Rated missing Age-Based | — | 49 / 49 |
| Inactive SKIP | 159 / 159 | 159 / 159 |

**Transaction status: success. 538 distinct players; 1,027 final-field creations.** Source/working-field changes0. Final populated counts: regular538; PrimeTime489. No partial or unknown result accepted, and no retry issued.

The subsequent READ-ONLY preview at29 returned regular CREATE0 / UPDATE0 / NO CHANGE538 and PrimeTime CREATE0 / UPDATE0 / NO CHANGE489. Deferrals and missing-input counts stayed unchanged. This preview was not executed.

## Representative final values

| Player | Working Doubles | RF | Working Age-Based | Final regular | Final PrimeTime |
|---|---:|---:|---:|---:|---:|
| Alan Fox | 3.6 | 100 | 4.2 (65+ source) | 3.6 | 4.2 |
| Adil Jaffer | 4.0 | 90 | 4.3 (permitted 50+ source) | 4.0 | 4.3 |
| BJ Arnold | 2.4 | 30 | 2.6 | 2.4 | 2.6 |
| Aaron Muia | 3.6 | 70 | blank | 3.6 | blank |
| Ann Shaddix | 2.9 | 20 | 3.4 | blank | blank |

All121 NR players with no applicable division retain both numerical finals blank. All49 Rated players missing Age-Based have a regular final and blank PrimeTime final. No final fields were written for the1,162 members missing required working inputs. No numerical NR rating or missing age input was invented. All538 regular and489 PrimeTime created values match their audited proposals, with zero mismatches.

## Audit / provenance / integrity

- Exactly one Clean audit record, successful: `08d3c0c5-d5fe-4e8e-8824-4a1577ffd340`.
- Timestamp `2026-09-11 01:32:26.260746+00`; selected cutoff29; calculation version `combined-clean-v2`; accepted fingerprint above.
- Audit records the active default29, Rules version/hash, selected threshold29, full calculation basis for1,980 members, and538 before-images.
- Workflow runs total2: the previously authorized transfer plus this one Clean. No new Upload, Transfer, Clear, Delete, Copy or initializer execution.
- All18 operational table counts/fingerprints match the fresh pre-Clean baseline exactly, including members, roles, teams, rosters, matches, lineups, scores, standings, schedules and configuration.
- A new team NETCHIX (CW) and role-count change were already present before this Clean baseline (teams106, roles188 versus the prior checkpoint105/186). They are not Clean effects. Roster rows remained0 and the Clean preview/fingerprint did not change.
- Hash of EVERY rating-row field excluding only `season_dupr_rating` and `season_primetime_rating` is identical before/after: `cbe4c961188377e838052aaf6cbd27c1`. Per-before-image comparison also found zero other-field differences. This includes notes and timestamps.
- Working inputs remain659 Doubles /659 RF /551 Age-Based. Input-selection provenance hash unchanged: `bda08ac6af5792d1e75eb04008c20081`.
- Source hash unchanged: `4f873f55bc9ab6c08c612363a3ce74cc`. Source import-history hash unchanged: `95ffd370b162ee7b9df086201e014dd3`.
- No rollback of ratings was necessary. Reviewed atomic failure rollback protections remain in place; successful audit before-images retained for controlled recovery. No data-export backup was attempted.

## Write gate and application state

- Temporarily enabled only the workflow gate on the exact same source commit using deployment `dpl_HQWt8vGumseasdtwzqcVahz6GVHv`; initializer gate stayedfalse.
- Immediately upon observing the success result, restored the previously verified disabled deployment `dpl_E89PiGwFsrfqGPKdofS5CutKFMws` using Vercel rollback. This was a configuration restoration, not a source-version or database rollback.
- Production aliases verified on that disabled deployment, same commit `6d86e113ba1d40cc623f435bfd68753ea7535d5b`.
- Removed only the temporary enabled deployment after restoration, using safe removal, so its direct URL cannot remain enabled.
- Reloaded production and verified “Writes are disabled. This is a read-only preview.” Confirm Clean Ratings disabled. Both workflow and initializer remain disabled.

## Normal LMS smoke and observed display limitation

Season Ratings, Commissioner Dashboard, Captain Dashboard, Player Dashboard and Ask LWR opening passed. Actual final values were also visible in Alan Fox's Member Detail (Fall3.6 /4.2). View-As successfully opened Alan Fox's isolated Player dashboard with the explicit READ-ONLY banner, then Exit View As User ended the session. No member fields were edited or saved. No messages were sent.

View-As surfaced an existing no-season-context display limitation: Alan's Player dashboard shows Selected season “Not selected”, No active team, and the summary card “NR”, although his Fall numerical ratings are correctly stored and shown in Member Detail. The unchanged `ratingForMember` code finds a season-specific rating and falls back to “NR” when no matching season value is available. Record for separate UX review; do not reinterpret this display as a failed Clean or run Clean again to fix it. No dashboard code was changed in this operation.

No application runtime error/fatal logs were found. The new View-As tab emitted two Electron sandbox-renderer bootstrap diagnostics from `node:electron/js2c/sandbox_bundle`; the actual LMS view subsequently rendered and exited successfully.

## Final status

**LMS-0733 first combined Clean completed successfully within authorization. STOPPED after one Clean.** Rating-write gates restored disabled; all approved final values verified; working/source/operational data preserved. No second Clean or other rating action is scheduled or performed. The no-selected-season dashboard “NR” presentation is a separate documented UX finding.

Evidence: `.local-validation/lms0733-first-combined-clean-evidence.json`; earlier implementation/recovery evidence remains in `lms-0733-combined-clean-production-checkpoint.md`.
