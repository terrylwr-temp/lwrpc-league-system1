# LMS-0733 — Upload / Clean Ratings reconciliation

2026-09-10. Owner workflow corrections supersede the separate initializer and its blank-only assumptions. REVIEW ONLY. No Clean, Delete, Upload, Season DUPR or PrimeTime write was performed. No production code/SQL was changed during this reconciliation, and no model endpoint was called.

## Governing workflow and overwrite rules

**Upload → working inputs → explicit Clean Ratings → calculated season ratings.** Routine Upload matches unique active members by DUPR ID and fills each blank input independently; it must not refresh populated inputs or establish final season ratings. Explicit Delete → Upload is the owner's refresh workflow, but the existing Delete implementation requires scope correction/review before that sequence is safe. Clean Ratings is an explicit, repeatable administrator recalculation. It may CREATE a blank or UPDATE an existing Season DUPR. Populated Season DUPR is protected from routine Upload, not permanently protected from Clean Ratings. No automatic Clean on upload, source change, roster change or division movement.

The deployed source examined is commit `2916f887b1018205523e98c806e3867abed2db17`, LMS-0733 / 0.1.555. Historical comparison uses pre-import-change commit `022eb46099ce7d1c6c32af5a0e27a1de5283b627`. Current authoritative Rules version remains `6ae10e5f-fdde-41be-a941-d1b7ed360d1a`.

## Current and historical Upload

Current `seasonRatingsImport.js` and the import RPC match normalized CSV `duprId` to normalized LMS `members.dupr_id`, reject duplicate/ambiguous IDs, exclude explicitly inactive members and never use name/email matching. Current source matching accepts null activity as active-compatible; any future stricter activity rule should be explicit.

Current Upload merges `{...before, ...patch}` in `ratings_source_private.sources.data`. Supplied values overwrite old source values; omitted rating values are preserved with missing flags. It is a SOURCE REFRESH operation, not fill-blank-only. It does not populate any `member_season_ratings` working input. Regular/PrimeTime season values, legacy RF and notes stay unchanged. This was the accepted earlier import design but conflicts with the latest owner workflow. The same CSV can produce NO CHANGE even while all working inputs remain empty.

Historical Upload matched email then normalized name, not DUPR ID, and could fill a blank member DUPR ID. It filled only blank `dupr_doubles_rating`; RF was overwritten whenever supplied; age was overwritten whenever the age source was present and could be cleared if no usable metric was found. It wrote age directly to `season_primetime_rating`, and appended a 50+ fallback note. Regular `season_dupr_rating` was not written. Thus historical code also did not implement all of the owner's now-confirmed requirements.

Historical Doubles used `toFixed(3)` after permissive parsing; historical age used `Math.trunc(value*10)/10`; RF accepted numeric fractions. Its RF aliases did not include the actual export's `doublesRe` alias now supported by the reviewed parser. Do not restore the old parser or matching behavior wholesale.

## Exact field mapping

| CSV | Current source store | Existing working/input field | Current Clean read | Final output |
|---|---|---|---|---|
| `doubles` | `data.doubles` (3-decimal string or `NR`) | `member_season_ratings.dupr_doubles_rating` | Numeric: truncate to tenth; literal NR: division calculation | `season_dupr_rating` |
| `doublesRe` / reviewed `doublesReliability` | `data.rf` (numeric) | `member_season_ratings.dupr_reliability_rating` | Inclusive comparison to prompted threshold | Governs NR branch; RF itself unchanged |
| `Metrics.subscores.doubles.over_65`; permitted `over_50` fallback | `data.age`, `data.ageSource`, `data.ageMissing` | **No independent age-input column in current UI/schema** | Reads `season_primetime_rating` itself and only truncates it | `season_primetime_rating` |
| Import identity | source `import_id`, revision, batch payload/time | No equivalent frozen working-input identity on legacy row | Not read | Not recorded as a Clean run |

The Age-Based UI column is the final PrimeTime column under another label. Copying 551 source age metrics there would be a production PrimeTime write, not a neutral input transfer. It is not authorized and must not be used as the reconciliation shortcut.

Owner representation: working Doubles and age truncate to one decimal, never round; RF remains a whole number. Preserve original raw source precision in evidence rather than replacing the accepted import payload. All 659 stored RF values are currently integers. The current parser allows fractional RF; future ingestion should flag fractions for review instead of silently rounding/truncating without an owner rule. Zero RF and literal NR are real values, not blanks.

## Exact current Clean Ratings implementation

In `app/ratings/page.js`, `cleanRatingsForSelectedSeason` (~584) prompts for RF threshold. Blank/0 disables RF handling; there is no active-Rules fetch. A positive entered threshold uses `RF <= threshold`. Entering 29 matches today's Rules; the existing prompt permits other choices. No hardcoded 29 should be introduced. A future Rules-bound workflow must preserve an explicit action while ensuring the calculation uses the active authoritative policy.

`buildRatingCleanupChanges` (~616) reads the page's loaded selected-season ratings and active-or-null-status members. It fetches current `team_members → teams → divisions → leagues` and builds a maximum `divisions.max_dupr` per member for the selected season, excluding teams with `is_active=false`. It does not partition regular versus PrimeTime leagues, and it does not independently filter inactive league/division flags. Leadership alone is not roster membership. Page search/current-roster filters do not narrow the full `members` calculation.

Pure helpers (~2135–2205):

- Numeric input Doubles with no triggered RF NR branch → `Math.trunc(Number(value)*10)/10`.
- Literal `NR`, or known RF at/below positive prompted threshold → `truncate(highestCurrentMax - 0.5)` if a positive usable division maximum exists.
- NR with no usable maximum → no regular payload. **An existing numeric Season DUPR is left in place**, not cleared, but this is a deferred computation, not a claim the value is current or protected.
- Missing RF does not trigger NR; numeric Doubles is treated as rated. This conflicts with the requirement to review missing required inputs.
- Age behavior → truncate the existing `season_primetime_rating`; no source selection, age verification, RF/NR adjustment, or separate applicable PrimeTime division basis.
- Low-RF changes can append/replace a generic NR note. If both regular and age calculations are null, the member is skipped before notes are added.

`applyRatingCleanupChanges` (~713) updates existing rows regardless of populated Season DUPR and inserts missing rows where a calculation exists. It updates `updated_at`, regular and/or PrimeTime outputs and sometimes notes; it does not change input Doubles/RF. Updates run as batches of 25 individual requests, then one insert call: this is **not one atomic run**. Earlier writes can remain if a later request fails. No commit-time whole-run source/roster fingerprint revalidation exists.

Start of Season Clean defaults checked and applies all eligible rows, including those whose computed values are unchanged; it can update timestamps and report payload counts rather than distinct changed values. Unchecking it creates a review list of changed rows with selection. Neither mode makes existing regular ratings blank-only. Existing overwrite behavior is intentional under the latest owner correction and must be retained.

## NR, multiple divisions and transitions

Rules 4.1.1: RF 29 or below is NR. Rules 4.5.1/4.5.2: use maximum individual division rating minus 0.5 for NR aggregate assignment and the highest applicable assignment for multiple rostered divisions. Do not use a team aggregate cap, arbitrary default or provisional division. The owner previously resolved regular and PrimeTime bases separately; the new Clean correction does not revoke that separation.

The current code recomputes its maximum from current roster rows every run. It can raise an existing NR Season DUPR after a higher division is added. It can also **lower** it after the higher division is removed (e.g. 4.8−0.5 → 4.3 becomes 3.8−0.5 → 3.3). This describes code, not approved policy.

**RESOLVED by final owner decision, 2026-09-10:** an explicit Clean recalculates against CURRENT applicable rostered divisions and may decrease after removal from a higher division. Removed historical placement is excluded; no historical high-water mark is retained. With no current applicable division, defer. See [final workflow design](lms-0733-final-workflow-design.md).

Rated → NR after an explicitly refreshed RF: existing code takes the NR branch and overwrites using current maximum if available; with no division it leaves the old numeric value unchanged. That retained value must be flagged DEFER/stale in a corrected preview rather than treated as rated. NR → Rated with a numeric refreshed Doubles and RF above boundary: it overwrites using truncated Doubles. An old NR note is not automatically removed when the new branch is rated, so explanatory notes can become stale. Literal `NR` with high RF still follows the NR branch in current code, rather than flagging the contradiction. Unknown RF can incorrectly look rated. These need reviewed reconciliation, not immutable initialization classification.

## PrimeTime policy

Current Clean does not implement Rules 6.3/6.3.2 age eligibility or age-triggered NR, nor low-RF PrimeTime division assignments. Previously resolved owner policies remain: age 65 by December 31 establishes eligibility; under 65 at season start uses the specific NR provision, not a general 50+ override; metric existence is not age proof; no supported age metric remains missing. Applicable PrimeTime NR assignment needs its own current roster/division basis. Verified age data was not available in the reviewed inputs. Do not infer it from 65+/50+ metrics.

Clean may recalculate PrimeTime when the reviewed business basis supports that operation, but the current truncate-in-place implementation cannot safely be presented as that rules engine. No PrimeTime proposal is authorized from this review.

## Delete and refresh

`deleteRatingsForSelectedSeason` (~373) confirms then executes `.from('member_season_ratings').delete().eq('season_id', selectedSeason)`. It deletes entire selected-season rows for all members, including input Doubles/RF, final regular/PrimeTime ratings, notes and row history timestamps. It is not an input-only reset. It does not delete source-store rows/import history, other season rows, or directly touch teams/schedules/scores.

Production catalog review found no user trigger or inbound FK dependency on `member_season_ratings`, so no discovered database cascade to operational tables. Nevertheless removing ratings changes eligibility/roster/Match Setup information and destroys the selected season's rating records. “No operational row deletion” does not make it a harmless input refresh.

Under current source-only Upload, Delete followed by the same CSV can leave sources NO CHANGE and working inputs empty. A corrected refresh design must explicitly distinguish clearing working inputs from clearing final season results/history. Safest proposed scope: clear only approved input fields, preserve final values until explicit Clean, retain import history; any intentional final-rating deletion requires explicit separate approval. Do not run or modify the existing Delete operation yet.

## Read-only preview: actual current state and conditional reconciliation

Fresh read-only aggregate at **2026-09-10 19:53:40 UTC**: two Fall rating rows exist, but all input Doubles/RF, regular, PrimeTime and notes are NULL. There are zero roster rows. Accepted source store contains 659 rows, 538 above the governing RF boundary, 121 NR, 551 age metrics, 108 missing age metrics, zero fractional RF. Prior exact source fingerprints remained unchanged after deployment.

The [full per-player preview](lms-0733-clean-ratings-readonly-preview.html) and [JSON](lms-0733-clean-ratings-readonly-preview.json) use existing reviewed production-derived source rows and execute the **actual deployed pure Clean helper functions locally**, with the active Rules threshold. No browser Clean action or write API was called. Current working/final values are all NULL based on the fresh aggregate. The conditional view is not an assertion that values have been loaded into legacy inputs.

| Outcome | Actual Clean on today's working fields | After separately approved blank-input reconciliation |
|---|---:|---:|
| Regular CREATE | 0 | 538 |
| Regular UPDATE | 0 | 0 |
| NO CHANGE computed rows | 0 | 0 |
| NR waiting for division | Not observable from empty legacy inputs | 121 |
| Missing working/input data | 1,818 active members | 1,159 active members |
| Invalid/contradictory source rows | Not evaluated by current Clean | 0 in verified snapshot |
| Supported PrimeTime CREATE/UPDATE | 0 | 0 |
| PrimeTime source-bearing rows deferred/review | Source store not read | 659 |
| Additional PrimeTime missing-source rows | 1,818 missing inputs total | 1,159 |
| Protected from explicit Clean solely because populated | 0; not a policy category | 0; not a policy category |

156 inactive members are outside the 1,818 active-member preview; total membership is 1,974. NO CHANGE means a usable computation equals its existing value; the 1,818 current missing-input skips are DEFER, not successful computations. PrimeTime categories overlap regular categories and must not be added to them.

Conditional age data: 551 metrics can supply a working age candidate, but none proves eligibility. 108 lack age metrics. Of the 551, **62 belong to NR players**. The old age path would simply preserve/truncate those numeric values if someone first copied them into the final field, without NR policy. That is why this report does not recommend copying ages directly into PrimeTime.

| Player | Raw Doubles / RF / Age | Proposed working Doubles / RF / Age | Conditional regular output | PrimeTime |
|---|---|---|---|---|
| Jonathan Boehning | 3.292 / 80 / 3.548 | 3.2 / 80 / 3.5 | CREATE 3.2, Rule 4.2 | REVIEW age/policy basis |
| Kelly Bivins | 3.778 / 100 / 3.999 | 3.7 / 100 / 3.9 | CREATE 3.7, Rule 4.2 | REVIEW age/policy basis |
| Thomas E Allwine | 2.648 / 40 / 3.194 | 2.6 / 40 / 3.1 | CREATE 2.6, Rule 4.2 | REVIEW age/policy basis |
| Maureen Keifer | 2.720 / 20 / 2.953 (50+) | 2.7 / 20 / 2.9 | DEFER: NR, no division | DEFER/REVIEW; age metric does not bypass NR |

For all these examples, actual current Clean proposes no numeric output because its working fields are still empty. Current source classification is shown separately from that fact. Per-player files include current/proposed regular and PrimeTime, input mapping, source batch, classification, absent division basis and CREATE/DEFER/REVIEW reasons.

## What to do with the 659 verified sources

Keep the existing raw source rows and successful import batch as evidence. Do not initialize from them and do not reimport merely to repair mapping. Propose a separately reviewed, counted **input-only compatibility transfer**: independently fill NULL legacy Doubles/RF with validated one-decimal Doubles and integer RF; put truncated age in a genuinely separate working-age destination after its design is approved. Preserve populated inputs, zero/NR markers, final ratings, other seasons, notes and operational data. Revalidate current unique DUPR ID, activity, source identity and blank destination immediately before any future approved transfer.

Routine Upload should then apply that same field-level blank-only policy, including when source data already exists but a working field is blank. Do not let source-store NO CHANGE prevent an authorized blank input fill. Its merge/upsert must stop overwriting populated current working inputs. Raw import history and the working-input lifecycle need explicit separation for Delete → Upload refresh.

## Provenance and required changes

Current Clean records `updated_at` and sometimes a generic threshold note. It has no durable per-run ID, exact source snapshot, RF/classification snapshot, governing division or prior/result pair. A later run overwrites timestamps/notes; it cannot reconstruct every earlier calculation. The initializer's new provenance tables are empty and not wired into Clean. Do not treat their one-initialization-per-member design as repeatable Clean audit or immutable current classification.

Application corrections are required: retire the initializer UI/route; reconcile Upload's fill-blank contract and field projection; use current Rules/current appropriate roster context for Clean; implement validated preview with CREATE/UPDATE/NO CHANGE/DEFER/REVIEW, required-input checks and safe explicit confirmation; separate PrimeTime inputs from outputs; correct Delete's reviewed scope and transitions/notes. Retain authorized Clean overwrite semantics.

SQL is likely needed for a dedicated working-age field and a transactional input-fill/recalculation boundary. One possible minimal field is a nullable `dupr_age_based_rating`; this is a proposal, not an approved schema or migration. A repeatable Clean audit should be designed minimally and reviewed before implementation. Do not repurpose the abandoned initializer commit function, add unnecessary generic infrastructure, or apply any SQL now.

## Abandoned initializer status

Production application deployment `dpl_8G1bMtnDwA8nqezetwpfuvi2Qecp` is READY with exact reviewed commit metadata and 329-file commit export manifest. `SEASON_RATINGS_PHASE1_COMMIT_ENABLED=false` was explicitly set. Separate initializer is abandoned and must remain disabled. Its first production preview failed with statement timeout; it was not retried and no commit was invoked. Stop optimizing that abandoned path.

Infrastructure migration `20260910193949` / `season_ratings_initialization_phase1` was applied once previously. Private tables are empty; no business-table triggers/FKs were added. It can remain dormant for now without removing production objects. A future reviewed application correction should remove the misleading entry point and permanently reject the retired route. Any later SQL cleanup/revocation is separately reviewed, never automatic. No reason to drop production objects during this diagnostic review.

Post-deployment zero-write checks: Fall regular 0, Fall PrimeTime 0, initialization batches 0, provenance 0. Source 659/one batch unchanged. All non-member operational fingerprints unchanged; one independently timestamped member edit preceded migration. Normal Commissioner/Captain/Player/Members/Teams/Season Ratings screens loaded; Ask LWR panel opened with no question; isolated View-As Captain screen showed READ-ONLY and was exited. These do not constitute acceptance of the failed/now-abandoned initializer.

## Safest reconciliation sequence and next gate

1. Apply the resolved current-state NR decrease policy. Follow the [final workflow design](lms-0733-final-workflow-design.md) for input-only Clear, separate working age and preservation of final outputs. Existing whole-row Delete remains separately reviewed; do not repurpose it silently.
2. Authorize a small **local-only reconciliation design/implementation** scoped to Upload/Clean/Delete, removal of the abandoned UI and the minimum required data changes. No production mutation is authorized by this report.
3. Locally test fill-blank per field (including 0/NR), no name/email matching, precision, integer RF, missing/contradictory inputs, both Rated↔NR transitions, current applicable division changes, absence of division, repeated Clean overwrites and PrimeTime deferrals. Preview current versus proposed values and exact rule/basis; no automatic Clean.
4. Review exact app commit and any SQL/hash. Separately authorize controlled deployment/infrastructure with all write controls disabled; verify normal LMS first. Retain the accepted source-review deployment `dpl_3BXEyQk6kbxFA793Jg649oAZq77X` for application rollback; no rollback or schema removal was executed here.
5. Obtain a fresh counted **input-only** transfer preview from the retained 659 rows and explicit production approval for that transfer. Verify final ratings/source history/other data unchanged afterward.
6. Generate the corrected Clean read-only preview from populated working inputs/current Rules/current divisions. Stop at a second explicit owner gate before Clean execution; deferred NR/PrimeTime rows remain visible. Delete → Upload refresh has its own exact confirmed scope and is not a prerequisite to repairing these currently blank inputs.

**Current next production gate: none authorized. STOP FOR REVIEW.** No Clean, Delete, new Upload, Season DUPR/PrimeTime write, initializer enablement or production cleanup.

## Validation and evidence limitations

Eight assertions against exact deployed pure helpers confirm truncation examples, RF29 no-division deferral, higher/lower NR calculations and the existing missing-RF-as-rated behavior. No app code changed, so no new build was necessary. Full earlier accepted local test/build evidence remains historical, not validation of a reconciliation implementation that does not yet exist.

An attempted full working/roster snapshot was rejected by automatic approval review as unnecessary sensitive-data export. It was not exported. This review uses prior approved rating-only artifacts plus fresh narrow aggregate/catalog/Rules reads. No additional broad data export or permission is needed to assess this report.
