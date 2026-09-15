> Latest owner correction — combined Clean uses an administrator-selected RF cutoff for each run, defaulted from active Rules (currently 29), with inclusive RF ≤ cutoff NR behavior. No hardcoded 29. Both regular and PrimeTime preview, signed confirmation, atomic commit and audit use the same selected cutoff; changes invalidate/regenerate preview. Active Rules remain unchanged. Rated PrimeTime requires valid age-based input and RF but no roster/DOB proof. This supersedes earlier regular-only or fixed-cutoff design text below. See [combined Clean cutoff local review](lms-0733-combined-clean-cutoff-local-review.md). Local only; no production Clean authorized.

# LMS-0733 — final owner workflow and reconciliation design

2026-09-10. Design and read-only counts only; STOP FOR REVIEW. No production transfer, Clean, Delete, clear, Upload, rating write, schema change or model call. This document supersedes the unresolved NR-decrease question in earlier reports.

## 1. Exact source → working mapping

| Accepted source | Working destination | Conversion | Final fields |
|---|---|---|---|
| `ratings_source_private.sources.data.doubles` | existing `member_season_ratings.dupr_doubles_rating` | Preserve literal `NR`; numeric truncate to tenth and display one decimal | Neither final rating touched |
| `data.rf` | existing `dupr_reliability_rating` | Integer RF unchanged, including 0 | Neither final rating touched |
| `data.age` + `data.ageSource` | **proposed new** `dupr_age_based_rating` + per-field source reference | Truncate to tenth; absent stays NULL | Never populate `season_primetime_rating` during Upload/transfer |

The age destination is a proposed column, not an existing field. No age writes are executable until the schema and UI read/write mapping are reviewed. A distinct working-age field is the smallest clear way to remove the current input/final ambiguity while retaining existing Doubles/RF consumers. The final fields remain `season_dupr_rating` and `season_primetime_rating`.

Store an input-source reference per field (e.g. one small JSONB provenance map keyed by Doubles/RF/age), containing immutable import batch, raw value, applied value, age source when applicable and selection time. Field-level lineage is necessary: filling one blank field must not relabel already-populated fields as if they came from the new upload. Existing manual values remain unchanged and are identified as manual/unknown provenance rather than falsely attributed. Exact schema names and constraints await local implementation review.

## 2–4. Fresh 659-row transfer preview

Read-only production query at **2026-09-10 20:02:34 UTC**, scoped to the existing Fall source batch. All 659 source members remain explicitly active and uniquely matched to the recorded import member/DUPR ID/source values.

| Transfer outcome | Count |
|---|---:|
| Existing source rows evaluated / eligible identities | 659 / 659 |
| Blank Doubles fields to fill | 659 |
| Blank RF fields to fill | 659 |
| Working age fields that could be filled after new-column approval | 551 |
| Existing Doubles inputs protected | 0 |
| Existing RF inputs protected | 0 |
| Existing new working-age values protected | Not applicable: field not created; planned initial NULL population |
| Missing source Doubles | 0 |
| Missing source RF | 0 |
| Missing source age | 108 |
| Inactive/unknown activity within these 659 | 0 |
| Identity review / fractional RF | 0 / 0 |
| Other invalid required source inputs | 0 in accepted verified source evidence |
| Regular / PrimeTime outputs changed by transfer | **0 / 0** |

This is **1,869 possible field fills across 659 players**, not 1,869 players. Age fills remain a design-only count. The 108 missing age values do not block valid Doubles/RF fills and are not invented. The full prior [per-player conditional mapping](lms-0733-clean-ratings-readonly-preview.html) lists raw and proposed working values; the fresh aggregate confirms the relevant field/identity counts. Outside this source cohort, the previously reviewed population contains 1,159 active members without source and 156 inactive members; they are not transfer targets.

## 5. Precision and blank protection

Numeric Doubles/age use decimal-safe truncation to one decimal, e.g. 3.237 → 3.2, 3.299 → 3.2, 3.300 → 3.3, 3.999 → 3.9. Retain raw source precision in the immutable audit payload. Do not apply rating truncation to RF. All current RFs are integers; reject/review future fractional RF rather than silently inventing a rounding policy. Blank means a missing row or SQL NULL after valid blank-input normalization; 0, `NR`, and every existing nonblank input are protected from routine Upload/transfer. Validate/fill each destination independently.

## 6. Future Upload: one integrated transaction

Keep the reviewed CSV parser, DUPR-ID-only unique matching, inactive exclusion, preview/confirmation and server authorization. Replace source-refresh-only commit behavior with one atomic import transaction that:

1. Revalidates actor, season, source file/preview identity, current unique member ID and destination values.
2. Stores immutable accepted CSV/source audit evidence using the existing import architecture.
3. Fills each eligible NULL working field, recording that field's actual source basis. Existing values stay unchanged even if the newer CSV differs.
4. Records exact filled/protected/missing/review counts and commits all accepted writes together; unexpected failure rolls back the batch.

No call to Clean Ratings, no final rating writes, no roster/operational mutations. A current raw-source pointer may describe the newest upload, but it must not be confused with the selected source for preserved working inputs. The UI should distinguish these states and show the input values Clean will actually use.

NO CHANGE must evaluate the integrated operation: if source evidence already exists but an input is blank, a valid blank input fill is still proposed. Future uploads require no second technical transfer. The initial 659-row repair is a one-time, separately approved input-only reconciliation using the same write contract, not a new permanent owner workflow. It reuses the accepted batch without another CSV upload.

## 7–9. Regular Clean after proposed input fill

Today the actual legacy working fields remain empty, so current Clean still produces zero changes. After the proposed transfer, using the current Rules RF boundary and current zero-roster state:

- **538 regular CREATE**, zero UPDATE, zero computed NO CHANGE, from valid rated Doubles/RF.
- **121 NR DEFER** for absent current applicable division basis; no numeric assignment.
- 1,159 active members outside the source set still have missing inputs.
- No blanket PROTECTED category for existing final Season DUPR: explicit Clean can overwrite it. Current source cohort has zero populated final regular/PrimeTime values.
- PrimeTime CREATE/UPDATE **zero in this correction**. Source-bearing PrimeTime rows remain deferred/review (551 age metrics, 108 missing), rather than treating metric existence as eligibility.

Regular Clean must read working Doubles/RF, current active Rules and current applicable roster/division context. It does not select a newer raw source behind the working-input snapshot. The present Clean implementation's overwrite semantics are retained; its missing-input validation, mixed regular/PrimeTime division maximum, direct client write batching and lack of atomic revalidation require reconciliation. When separating regular Clean, stop its current truncation of `season_primetime_rating`; otherwise even a regular operation could mutate PrimeTime. This is a required scoped correction, not a new PrimeTime algorithm.

## 10–12. Current NR basis, no-roster behavior and transitions

**Resolved owner policy:** each explicit Clean uses only CURRENT applicable rostered divisions. Use the highest current assignment required by active Rules; removal from a higher division removes that division from the calculation. An explicit Clean may decrease the rating. No historical high-water mark is retained.

Example: current applicable maximum 4.8 gives 4.3 under the reviewed `max − 0.5`, tenth-truncation rule. After removal from that division, with only a 3.8 maximum remaining, the next explicit Clean gives 3.3. If a higher division is added later, the next explicit Clean can increase the result. Nothing runs automatically on roster movement. Regular and PrimeTime rating bases remain separate as previously resolved.

Final owner decision: no current applicable roster and an existing numeric Season DUPR → NO CHANGE — RETAIN ESTABLISHED NR RATING. No current applicable roster and a blank Season DUPR → DEFER — WAITING FOR DIVISION. Never clear an established rating merely because all rosters were removed. When a current roster exists, explicit Clean recalculates from the highest CURRENT applicable regular division, including decreases after removal from a higher division. The detailed owner action labels supersede the earlier asynchronous reply’s “mark deferred” wording for populated values.

After Clear Inputs + Upload refresh: numeric Doubles and RF above the active boundary → Rated calculation, even if formerly NR; literal/current-rule NR or RF at/below boundary → current applicable NR assignment, even if formerly rated. Missing or conflicting required inputs → REVIEW. High RF with literal `NR` must be shown as contradictory rather than silently resolving it. Remove/replace obsolete system-generated NR explanation only as part of a successful recalculation; preserve unrelated user notes. A transition never happens automatically merely because raw source data changed.

The offline exact-helper checks passed eight assertions, including 4.8 → 4.3, 3.8 → 3.3, RF29/no division → NULL and four truncation examples. These verify existing helper behavior. Integrated current-roster removal, transition, clear and transaction controls are **test-plan items**, not implemented/tested features yet.

## 13. Existing Delete dependencies and disposition

The current Ratings-page button calls only `deleteRatingsForSelectedSeason`, which deletes entire `member_season_ratings` rows for the selected season. It is not invoked by the current Upload/Clean functions. Existing source-store history is unaffected by that delete. Catalog review found no inbound foreign-key or user-trigger cascade from this table. Other selected-season ratings, notes/timestamps and all outputs in those rows are lost; other seasons are outside the filter.

Ratings are consumed by member detail/listing, commissioner/captain/player dashboards, teams/rosters, match/score-entry/lineup flows, standings and eligibility. Deletion can therefore change displayed/admission/calculated information even without deleting a team, roster or match row. This dependency analysis does not authorize modifying independent master-reset/member-deletion workflows.

**Recommended disposition A:** retain the existing whole-row destructive action as a separately reviewed administrative capability, clearly distinguish it from input refresh, and do not silently change its handler. Its eventual label/location/removal needs review of owner uses. No destructive-button change is included in this design-only turn.

## 14–16. Proposed input-clear action

Add a distinct action using existing Data Tools placement and `appConfirm`/confirmation styling. Working label **Clear Imported Ratings** is provisional pending UI review. Count the selected season's rows with at least one working input to clear, then show:

- Selected season and affected player count.
- Exact fields: working Doubles, RF, working age and their current input-source selection references.
- Regular Season DUPR preserved; PrimeTime Season DUPR preserved.
- Notes, row identity/history, other seasons, immutable import history and all operational data preserved.

Commit through a scoped server transaction after revalidation. Set only those input values/current selection references to NULL, recording the minimal clear audit where the reviewed transaction architecture supports it. Do not delete rating rows, clear final outputs or overwrite unrelated notes/timestamps; any new input-modified metadata is separate and explicit. A second clear is a no-op. The next successful CSV Upload selects new input provenance and fills blanks; do not automatically repopulate cleared inputs from the old source store. Clear never triggers Upload or Clean.

## 17–18. PrimeTime and abandoned initializer

New working age must be separate from `season_primetime_rating`. Transfer/Upload/Clear manipulate only the former; regular Clean manipulates neither PrimeTime final values nor age eligibility. Verified eligibility, 65+/permitted 50+ selection, under-65-at-start NR and the applicable PrimeTime division basis remain a later reviewed business-rule implementation. Missing metric remains missing, and raw age source is not proof of age.

The separate initializer stays abandoned and write-disabled. Applied additive schema/tables/functions have no business-table hooks, their audit/provenance tables remain empty, and they can remain dormant. The failed preview was not retried; no initializer commit occurred. Proposed app correction removes its entry point and makes the retired API non-operational; do not drop or alter production objects automatically. Do not use its blank-only commit function to implement repeatable Clean.

## 19–20. SQL requirement and exact proposed implementation scope

**SQL is required for the recommended design**, but no SQL is authored/applied in this design review. Minimum scope: independent working-age storage; precise input lineage; integrated transactional Upload/input-only reconciliation and clear; transactional repeatable regular Clean with current-state revalidation. Prefer extending the existing private import infrastructure and narrow RPC pattern. Do not create another standalone initializer or unrelated generic audit system.

Proposed app scope: `app/ratings/page.js` controls/columns; `seasonRatingsImport.js` preview semantics; `seasonRatingsImportServer.js` and `api/ratings/import` integrated transaction contract; focused reusable regular Clean preview/server/RPC boundary; separate clear preview/confirmation. Retire `SeasonRatingsInitialization` UI and `api/ratings/initialize` entry without running or deleting production infrastructure. Preserve Source Review raw-source visibility but distinguish selected working inputs. Tests and documentation are included. No teams/schedules/matches/scores/standings refactor; no PrimeTime final-calculation release. Exact changed filenames and migration/hash are deliverables of a subsequent authorized local implementation.

Each Clean run should be explainable from its selected working values, RF, current Rules, applicable current divisions and result. Reuse minimal reviewed audit facilities where feasible, but one-per-member immutable initializer provenance is not suitable. Record per-execution before/result and source references; retain historical runs without freezing future classification or preventing authorized updates. Audit additions require review.

## 21. Test plan

Validate field-level blank-only fills with 0/NR protected; exact three-decimal raw evidence and one-decimal working display; integer RF and rejected fractional input; missing age; duplicate/inactive/changed IDs; existing source NO CHANGE plus blank destination; all-or-nothing failure and stale preview. Confirm Upload never calls Clean or writes final ratings.

Validate explicit Clear confirmation and NULL-only input changes, unchanged final ratings/notes/row IDs/history/other seasons, preserved immutable imports, repeat no-op, stale confirmation and subsequent new-source selection. Keep existing destructive Delete behavior unchanged until separately approved.

Validate regular Clean CREATE/UPDATE/NO CHANGE, higher-division addition and removal, highest remaining applicable division, mixed regular/PrimeTime exclusion, no-roster NO CHANGE with established value retained; blank value DEFER, RF28/29/30, missing RF, Rated↔NR and stale note correction, no automatic trigger, source/roster/rule concurrency rejection, repeatability, complete rollback and per-run explanation. Assert zero PrimeTime writes in every regular path. Run lint/build, focused database and integration tests, normal LMS regression and desktop UI verification. Mobile is not an acceptance requirement for this administrative workflow; global mobile requirements remain unchanged.

## 22. Controlled production sequence / stop gate

1. Owner reviews this design, new working-age/lineage choice, existing Delete disposition and input-clear scope. Then authorize **local implementation only**.
2. Implement/test locally and return exact candidate identity, migration/hash, grants/locks, fresh transfer and Clean previews, recovery rehearsal and normal-regression evidence. STOP before production.
3. Obtain explicit exact migration/deployment authorization. Deploy corrected app with write paths disabled; verify normal LMS and read-only previews first. No automatic object cleanup.
4. Separately authorize one counted input-only repair of the existing 659 source records. Revalidate all counts at commit; verify regular/PrimeTime results and operational/source history unchanged.
5. Generate the corrected regular Clean preview from actual populated inputs and current Rules/current applicable rosters. STOP for explicit Clean authorization; never infer it from input-transfer or deployment approval. PrimeTime remains separately deferred.
6. Future refresh is separately confirmed Clear Imported Ratings → one integrated Upload → separately explicit Clean. Each action has its own scope, audit and safe failure handling.

No production action is authorized by this document. Current delivered artifacts are design, read-only counts and documentation updates only.


## Final NR lifecycle and local implementation update — September 10, 2026

The owner resolved both remaining decisions. First successful roster admission inserts membership only; the next explicit Clean establishes the numerical Season DUPR. Candidate viewing and eligibility checks never assign a provisional value, and failed admission never establishes a rating. NR with blank Season DUPR is legitimate before roster placement. The target division supplies admission context, while all existing non-rating admission checks remain in force. Rated-player missing-rating behavior and Match Setup requirements remain unchanged.

The nine lifecycle controls are now covered by local regression tests: never-rostered blank; read-only proposed candidate; successful placement without numeric write; subsequent explicit Clean; higher placement increase; higher placement removal/decrease; removal from all rosters retains established value; populated no-roster NO CHANGE; blank no-roster DEFER. The eligibility display reads bounded current Rules metadata through an authenticated captain/manager/commissioner RPC; the administrative write RPCs remain service-only with manager/commissioner actor checks.

The implementation candidate is isolated at `.local-validation/lms0733-candidate`, based on `2916f887b1018205523e98c806e3867abed2db17`. The legacy immediate Clean path and separate initializer UI have been removed. The initializer endpoint returns 410 after its View-As guard. New regular Clean reads working inputs and active Rules; its threshold is extracted, not hardcoded. PrimeTime calculation remains separately gated.

See `lms-0733-final-workflow-local-review.md` for the exact local implementation, validation evidence and production review sequence. Earlier descriptions of unimplemented SQL/tests in this design document describe the design-stage status; this implementation update supersedes them. No production action is authorized or performed by this local work.


## Owner simplification supersedes manual Transfer — 2026-09-10

The owner withdrew the pending source-to-working execution before final confirmation. Normal Data Tools now locally presents Upload Ratings CSV, Clean Ratings and the unchanged explicit Delete Season Ratings, with Copy separate. Transfer and Clear are hidden maintenance capabilities. Upload already records source/audit history and independently fills blank Doubles/RF/Age-Based in one transaction, without automatic Clean. Source Review remains informational. No SQL change is required.

Delete currently removes full selected-season rating rows (including all working inputs, regular/PrimeTime finals and notes), but retains source/audit history and private input provenance; its reset contract awaits owner review. Copy remains unchanged and does not include Working Age-Based. The 659/659/551/108 reconciliation is a separately authorized one-time maintenance plan, not a normal UI action. Production was restored to writes-disabled, zero workflow runs were confirmed, and no ratings operation executed. See `lms-0733-simple-workflow-local-review.md` for exact files, validation and the controlled sequence.
