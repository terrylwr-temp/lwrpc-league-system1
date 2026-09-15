# Season Ratings import — final design gate

Candidate release: **LMS-0733 / 0.1.555**. Exact source and baseline identities are recorded in `docs/lms-0733-release-identity.md`; production review remains paused until that candidate is reviewed.
> **OWNER RESOLVED — RF <=29 is NR under the active Rules. LOCAL IMPLEMENTATION AUTHORIZED; STOP BEFORE PRODUCTION.** The later owner clarification prohibits a hardcoded cutoff: Clean Ratings retains its prompted threshold; Ask LWR/eligibility extract the boundary from verified active Rules evidence; importer preview shows raw source RF without classification. See [local implementation and review report](season-ratings-implementation-review.md).

2026-09-10. Original design findings below are retained with the resolved policy and approved implementation amendments. Local implementation is now authorized; no deployment, production mutation, Clean/Delete/Copy invocation, or OpenAI calls are authorized. This supplements the accepted [baseline diagnosis](season-ratings-csv-import-diagnosis.md). Local CSV inspection and live catalog/aggregate SELECT queries were performed. No application functions were invoked against production.

**Recommendation:** routine imports refresh a separate, narrowly scoped source-rating store shown in Season Ratings management. They do not write existing `member_season_ratings` values. The current schema combines source RF/raw-NR inputs with season eligibility, and combines imported age-based data with PrimeTime Season DUPR. A matcher-only fix cannot safely provide ongoing refresh while honoring season locks. Establishment/reset remains a separate, explicitly authorized workflow. This design does not silently connect new source storage to Clean Ratings.

## 1. Verified current export field map

Actual file: `C:\Users\t_ade\Downloads\members-list-lakewoodranchpickleballclub-091026124814.csv`. SHA-256: `345f2a01399fa28933893c3423187e001e6295cae9332785abcfd8adf4eb2a6b`. Parsed records: **879**. [Local evidence](season-ratings-current-export-evidence.json).

Headers are `duprId,name,email,phone,singles,singlesReliability,doubles,doublesReliability,status,metrics` plus an empty trailing column. **The actual header is `doublesReliability`, not `doublesRe`.** This corrects the earlier inference that an unrecognized RF header contributed to failure of this file. The full header is already recognized. The owner's `doublesRe` mapping remains a required supported alias, but its literal spelling is not present in this file; possible UI truncation is unproven.

| Source | Meaning / action |
| --- | --- |
| duprId | Sole member identity key; trim and uppercase consistently; never modify member ID |
| doubles | Current raw Doubles source; numeric or explicit NR |
| doublesRe, doublesReliability | Doubles RF; current file uses the latter |
| metrics | JSON containing age-based Doubles sources, separately selected below |
| name/email/phone | Reference only; no identity matching or writes |
| singles/singlesReliability/status/other Metrics keys | Not rating substitutes; ignored by this import |

## 2. Reliability validation and precedence

All 879 current RF cells parse as numeric values in **0–100**. No blank, malformed, or out-of-range RF cells were found. 192 are below 29, zero equal 29, and 687 are above 29. This validates the file's scale; it is not a claim about every future DUPR format.

Proposed accepted RF: finite unsigned decimal 0 through 100 inclusive, at most three decimal places to avoid implicit database rounding; no percent-sign stripping, exponent coercion, negative values, Infinity, NaN, or text cleanup. Blank means absent, not zero. Use `doublesReliability` as primary; use `doublesRe` only when the full header is absent. A present blank primary column remains missing; a malformed primary column is invalid, not rescued by the alias. If both populated aliases disagree, mark INVALID instead of choosing silently. Duplicate normalized headers invalidate the file. Never use Singles RF.

## 3. Exact verified 65+/50+ paths

Parse the `metrics` cell as JSON, then use `$.subscores.doubles.over_65`; fall back to `$.subscores.doubles.over_50` when the 65+ metric is absent/null. A malformed populated metric is invalid, not a missing value. Existing code is more permissive; the proposed strict distinction prevents silent corruption.

Real examples, CSV line numbers including header:

- Line 8, DUPR ID `3L4VK3`: `over_65="4.744"`, `over_50="4.451"`; select 65+, legacy season value would truncate to 4.7.
- Line 2, `8GGLQ8`: `over_50="3.478"`, no over_65; select 50+, legacy season value would truncate to 3.4.
- Line 5, `8E9WJ8`: Doubles subscores contains only `mixed="4.662"`; neither age metric exists. `mixed` is not an age substitute.

295 records select 65+, 394 select 50+, and 190 have neither. All Metrics cells parsed successfully; nested nulls are treated as missing. There are 689 over_50 keys and 295 over_65 keys, confirming preference matters. Selection does not infer a player's age or verify PrimeTime age eligibility.

## 4. Missing age behavior

Current `findAgeBasedRating` / `hasAgeBasedRatingSource` and apply logic (`app/ratings/page.js:451,493,648,753`) treat a present Metrics column with no usable age metric as a request to write null to `season_primetime_rating`. Consequently, the 190 no-age records could clear an existing PrimeTime value if they otherwise match and become ready. Malformed Metrics may also be interpreted using the current regex fallback, or end up clearing age. This is existing code behavior, not accepted evidence that routine clearing is intended business policy.

Recommended: no metric means no age-field update, preserve existing source/season values, show “No applicable age metric; preserved.” No Doubles, Singles, mixed, careerHigh, zero or NR substitution. For a new source record, age remains absent/null. Record missing-current-metric provenance so a retained earlier source value is visibly stale and cannot be silently promoted at establishment. No implicit clearing in routine refresh. Explicit removal belongs to a separately reviewed action.

## 5. Complete LMS field map

Live catalog confirms these columns on `public.member_season_ratings`:

| Concept | Existing storage / consumers |
| --- | --- |
| Raw/current Doubles | `dupr_doubles_rating` (text, numeric string or NR); also supplies independent NR evidence to Ask LWR |
| RF | `dupr_reliability_rating` (numeric); Ask LWR reads it on each eligibility request |
| Raw age-based source | **No separate column**; import truncates directly into `season_primetime_rating` |
| Season DUPR | `season_dupr_rating` (numeric), read by ordinary DUPR division workflows |
| PrimeTime Season DUPR | `season_primetime_rating` (numeric), also labeled Age-Based in Ratings management |
| NR classification | **No dedicated stored status column** in this table; raw NR and RF are interpreted by consumers; numeric adjusted Season DUPR is compatible with NR |
| Self Rating | `members.self_rating`, unrelated and untouched |
| Historical ratings at play | Match-line snapshot fields, unrelated and untouched |
| DUPR Notes | `notes`, shared existing notes; routine source refresh will not rewrite them |

`app/lib/ratingEligibility.js:7` selects `season_primetime_rating` for PrimeTime, `season_dupr_rating` for ordinary DUPR, and member self-rating only for self-rated divisions. These are not interchangeable. [Catalog evidence](season-ratings-catalog-evidence.json).

## 6. Field-preservation matrix

This is the recommended design, not authorization to implement. New source store names below are proposed. “Reset” means separate owner-approved establishment/reset, never a checkbox that silently expands routine import.

| Field | CSV source | Current LMS field | When blank | When already populated | Locked-season routine behavior | Authorized mid-season reset |
| --- | --- | --- | --- | --- | --- | --- |
| Current raw Doubles | doubles | dupr_doubles_rating | Valid value can fill new source store; existing season field unchanged | Refresh new source value; preserve legacy blank-only protection | Refresh isolated source only; season raw-NR evidence unchanged | Explicitly review raw snapshot and derived Season DUPR together |
| RF | doublesRe/full alias | dupr_reliability_rating | Valid RF can fill source store; missing stays unknown | Refresh source RF, not existing season RF | Preserve season RF/classification; show current-source RF separately | Capture reviewed RF/classification alongside reset ratings |
| Current age-based DUPR | metrics 65+, then 50+ | No separate raw column; legacy writes season_primetime_rating | Fill valid source age; missing stays absent | Refresh source age when valid; missing preserves with stale flag | No PrimeTime overwrite or clear | Validate age source and applicable PrimeTime rules before explicit promotion |
| Season DUPR | No direct import source | season_dupr_rating | Routine import leaves blank | Preserve | Preserve | Explicit authorized derivation/assignment; no automatic import calculation |
| PrimeTime Season DUPR | No direct routine import mapping | season_primetime_rating | Routine import leaves blank | Preserve | Preserve | Explicit age-based establishment/reset, tenths and accepted fallback |
| NR classification | RF plus raw NR evidence | Derived; no dedicated field | Source classification unknown if insufficient data | Show raw source RF only; no import-time classification | Accepted classification inputs unchanged | Review and bind classification to the governing Rules and reset snapshot; no automatic reset |
| Notes | Age fallback provenance | notes | Existing notes unchanged | Existing notes unchanged | Preserve | Only reviewed reset-related note changes; preserve unrelated text |

The source store retains raw age precision, selected metric name, observation/file provenance and absent-field flags. Truncation to a season value belongs to establishment, not identity matching. The source store is for managers and is not consumed by current eligibility, scores or standings.

## 7. Why fill-blank-only exists

Git commit **b833928 (LMS-0654, August 24)** deliberately introduced `isBlankRating`, `shouldUpdateDuprDoublesRating`, conditional writes and explicit text that existing Doubles is never overwritten. It also directed replacement through Delete Season Ratings. Commit dba63d8 (LMS-0655) subsequently changed confirmation/button flow; it did not originate blank-only behavior. The roadmap grouped the policy under LMS-0655.

This proves intentional preservation, not accidental parsing behavior. Neither commit message (version number only), code nor reviewed roadmap proves that it implemented a formal season-lock mechanism. It has no phase test, and RF/Age-Based remained overwritable. Therefore its deeper rationale cannot honestly be declared proven. Retain it in existing storage; separate current-source refresh avoids removing the protection. Delete Season Ratings is not proposed or invoked as a reset solution.

## 8. Pre-lock RF/source refresh

Current importer overwrites valid supplied RF and age on every ready import, regardless of establishment state; raw Doubles only fills blanks. It does not distinguish pre-lock from post-lock. No separate statement of RF-refresh intent before establishment was found beyond that implementation.

Proposed: refresh source-only values before establishment, with explicit preview. An eventual establishment workflow may select the latest reviewed source snapshot; this release does not populate or establish season values. A blank numeric Season DUPR is not proof the season is unlocked.

## 9. Post-lock behavior and lock evidence

Owner's season-lock policy is controlling. Catalog shows no rating-established/locked/reset authorization columns in seasons or member_season_ratings, and no rating-table triggers. `leagues.rosters_locked` is a roster control, not a rating lock. Date, active flag, current row existence, and null ratings must not serve as inferred lock authority.

Routine refresh must leave existing season numeric values, RF and raw-NR evidence unchanged. This is necessary because `ai_live_private.lookup` and `view_as_private.lookup` currently project RF/raw NR directly from the season row. Changing RF from 30 to 28 could change Ask LWR classification despite an unchanged numeric Season DUPR. Separate source storage safely supports refresh without needing to invent an authoritative lock state. Promotion/reset requires its own explicit persisted authorization/snapshot design before implementation; no assumed reset date.

## 10. PrimeTime behavior

Preserve accepted age-based eligibility and 65+/50+ source preference. Never infer DOB or age eligibility from available metrics. Existing Age-Based and PrimeTime Season DUPR are the same stored value, so direct age refresh is a season-rating update. Recommended source-only refresh leaves that field frozen. Any later establishment/reset must use the accepted season-start-year December 31 age reference and applicable rules where required, without guessing age from names or metrics.

## 11. Historical NR discrepancy register — resolved, not current instructions

Before the owner replaced the Rules, the comparison was **28 and 28.999 → NR; 29 and 30 → no RF-triggered NR**. This historical finding is superseded: active Rule 4.1.1 now includes 29. Current logic extracts the inclusive threshold from that evidence; Clean Ratings remains prompted. The inventory below records the pre-correction behavior and line numbers. Explicit raw NR remains separate evidence; RF 29 alone cannot make an explicitly NR source rated.

| Location | Exact behavior | Impact / classification |
| --- | --- | --- |
| ratings/page.js:2522–2531, isReliabilityNrAdjustment | `reliabilityNumber <= Number(reliabilityThreshold)`, enabled only if threshold >0 | Conflicting comparator when threshold=29; also arbitrary threshold/off switch can conflict with Fall rule |
| ratings/page.js:2512,884–891 | Blank/0 ignores RF; arbitrary nonnegative threshold accepted; prompt says “at or below” | Season establishment configuration/UI; may ignore low RF or misclassify decimal boundary |
| ratings/page.js:960–968,2564–2572 | Cleanup preview and cleanedSeasonDuprRating use above comparator; NR uses highest division max minus 0.5 | Cleanup preview and Season DUPR establishment, not import-time classification |
| ratings/page.js:1006–1051 | Applies cleanup proposals to season rows; status says threshold “or below” | Persistent establishment and reporting; affects consumers of resulting numbers |
| ratings/page.js:2229,2535–2540 | Confirmation “or below”; stored note identifies configurable threshold | UI/provenance for same discrepancy |
| ratings/page.js:1230–1235 | NR filters mean not numeric raw/age, without RF test; missing values included | Display/filter semantics differ from league NR classification; not a conflicting numeric comparator |

There is no RF comparator in CSV import itself; it stores RF. `app/lib/aiEligibilityPolicy.js:6,19–20,36–38` uses strictly `<` against the official “below” threshold and preserves independent raw-NR evidence: **no conflicting boundary found there**. Other RF-related application files found by search perform evidence selection/intent routing, not threshold evaluation. Ordinary `ratingEligibility.js` checks applicable numeric rating ranges, not RF; do not retrofit it in this scope.

Live function/view/constraint searches found no competing RF threshold calculation: the two lookup functions project inputs; no RF comparison view/check was returned. Matching local migration locations: 20260908203904 lines 26/206, 20260909202216 line 45, 20260909212951 lines 110/283. These are input projections, not additional threshold defects. No trigger on member_season_ratings was returned. This inventory covers current local application source, local SQL and searched live database definitions, not arbitrary external systems/dynamic SQL. No unrelated fixes authorized. No Ask LWR generation was run.

## 12. Truthful preview categories and observed counts

Use two dimensions, not overlapping totals added together:

- Identity partition: unique match / not found / missing ID / duplicate source or ambiguous LMS identity. Duplicate-source status takes precedence; retain all reasons.
- Final action partition: UPDATE / NO CHANGE / SKIP / LOCKED / INVALID. Sum equals total records. UPDATE requires at least one allowed changed field; per-field protected actions can coexist with source UPDATE, but protected-row counts must be labeled supplementary rather than double counted.

Show total, matched IDs, not found, missing IDs, duplicate/ambiguous, ready, no-change, protected/locked and invalid counts. LOCKED applies to requested protected field changes; in source-only mode season fields are visibly preserved for every row and never make a source UPDATE misleading. Unknown state in any future direct-write mode is protected, not implicitly unlocked.

Actual read-only identity counts against all LMS members: **879 = 695 unique + 178 not found + 6 ambiguous**. Zero missing/duplicate source IDs. Of 695 unique matches, 36 are inactive; retain current exclusion as SKIP — inactive LMS member, not “not found,” pending explicit policy change. Thus 659 active/null-active unique identities remain candidates, not an approved ready count. No existing Fall rating row joined to these unique matches at query time. A separate season check found two Fall rating rows overall; do not conclude the whole season is empty or unlocked. No lock-state or future source-store comparison was fabricated. [Aggregate evidence](season-ratings-identity-counts.json).

## 13. Import action

Persistent “Import Matched Ratings” enabled only for one or more valid UPDATE rows. State explicitly that it refreshes source information only. Zero-ready preview explains reasons and has no misleading enabled commit. File selection parses/previews only; cancellation retains review. All rows must be reviewable, not only the existing first 50.

## 14. Confirmation

Show actual target season name and immutable ID (Fall ID verified as `3780e56b-adeb-46be-ab1c-b754bc8aa737`), rows to update, no change, skipped/invalid and protected counts. List exact source fields allowed to change and before/after values, plus preserved Season DUPR/PrimeTime values. Show raw source RF separately from frozen season classification; do not apply the prompted Clean Ratings threshold during import. Require an explicit confirm action. Never use a hardcoded season name with a different selected ID.

## 15. Preview consistency and identity revalidation

Server generates canonical validated preview and signs a payload bound to actor, season, file hash, source line numbers, normalized IDs, resolved member IDs, expected current values/versions, precise field mask, policy version, expiry and single-use import ID. Client cannot broaden it. File/season edits invalidate preview. Server verifies authorization and signature at commit, rechecks every reviewed ID against ALL members, and requires the same unique member plus same allowed state.

If any reviewed identity changes/disappears/becomes ambiguous or a relevant value changes, abort the whole batch with a stale-preview result and require re-preview/confirmation. No affected row updates; no silent partial success or remapping. This stricter whole-batch response satisfies the owner's “do not update that row” requirement while preserving reviewed counts.

## 16. Transaction design

One bounded server-side database transaction performs authorization recheck, identity/value revalidation, explicit field updates and durable result/audit recording. Any unexpected failure rolls back all writes, including audit. Same import ID returns the already committed result after network uncertainty; retries never apply twice. No client loop or independent member updates.

Live members has no unique DUPR index, and current member-writer trigger does not coordinate dupr_id updates. Row locks alone cannot prevent a new duplicate member. Initial bounded design therefore requires a short database SHARE lock on members before uniqueness checks, plus ordered locks on target source rows and a source-import serialization key. SHARE allows reads but briefly blocks member writes: acquire with a short lock timeout and abort on contention; cap batch/statement duration, release immediately. Example candidate limits (to measure in isolated fixtures): 1-second lock wait, 5-second statement, maximum 1,000 rows and 2 MiB CSV. No slow parsing/network inside transaction. Existing normal member operations take priority; do not deploy unless load rehearsal shows acceptable duration. An advisory lock alone is inadequate because existing writers do not participate. Broader member trigger/unique-index changes are outside this minimal design.

## 17. Duplicates

Reject every source row sharing a normalized DUPR ID. Match against all members including inactive; duplicate LMS ID is AMBIGUOUS even if only one matching member is active. Preserve internal characters; no fuzzy matching. Trim/uppercase agrees with existing round-robin semantics but never updates stored identity. No auto-create. Existing member-ID last-ready-row-wins behavior is removed from the future import path.

## 18. Invalid values

Strictly parse numeric tokens without stripping characters. Current file has 806 numeric Doubles values (2.000–5.105), 73 explicit NR, no blank/malformed Doubles, and no malformed Metrics JSON.

| Input | Proposed disposition |
| --- | --- |
| doubles=NR (case-insensitive, trimmed) | Valid explicit current-source NR; no automatic season overwrite |
| blank doubles | Missing; preserve existing; other valid fields may update |
| malformed doubles | Entire matched row INVALID; no numeric extraction |
| numeric doubles/age | Proposed 2–8 inclusive, max 3 decimals; current observed file fits, but final range is a validation assumption requiring owner review, not proved by sample or DB regex |
| blank RF | Missing/unknown, never zero; preserve existing source RF with missing-current provenance |
| malformed/out-of-range RF | INVALID, no alias substitution or clamping |
| malformed Metrics JSON or wrong non-null object shape | INVALID; remove permissive legacy regex/header guessing for current format |
| missing/null Metrics/age path | Missing age, preserve; no rating substitution |
| malformed populated 65+/50+ selected metric | INVALID; do not conceal via fallback |
| extra empty trailing CSV column | Ignore only if empty throughout; reject unexpected structural row-width errors |

For malformed supplied rating fields, reject the whole row rather than importing its other fields. Validate present source rating fields even when there is no allowed write; display the invalid reason. Identity failure still has primary SKIP/AMBIGUOUS disposition with validation reasons as secondary detail. Numeric Season DUPR alone never implies Rated; missing numeric values alone never imply NR.

## 19. SQL requirement

**Yes**, for the recommended source separation, bounded transaction and durable idempotency. Proposed additive private source table keyed by season/member with raw doubles, RF, raw selected age, selected metric, presence/staleness metadata and observation provenance; a private batch/result table; narrow preview/read and transactional commit access. Existing members/ratings are read only for this importer. No backfill or migration of live business rows. Explicit server authorization and grants, no browser service key, no broad PUBLIC execute. Use existing authorization conventions; review privileges against normal/View-As contexts.

This design deliberately leaves season establishment/reset unimplemented. If the owner instead wants routine import to directly refresh existing season RF/Age-Based, a larger reviewed snapshot/lock architecture and consumer transition is required before implementation. It cannot be safely squeezed into a matching patch.

## 20. Expected files/functions

Proposed only: `app/ratings/page.js` import chooser/parser/preview/apply sections; new `app/lib/seasonRatingsImport.js` strict pure parser/validation; new `app/api/ratings/import/route.js` authorized preview/commit handler and source read integration; one additive Supabase migration with source tables and narrow functions; focused parser/transaction/browser tests; diagnosis/roadmap. Final naming follows repository conventions. No Clean/Delete/Copy function changes, member identity changes or reset implementation. The owner additionally authorized the bounded active-Rules synchronization of Ask LWR and deterministic eligibility. Read relevant installed Next.js guides and applicable skills before any code edit.

## 21. Test plan

Use actual export read-only for parser reconciliation and scrubbed fixtures for tests. Cover 879 rows; full/short RF aliases and conflicts; 65+ preference and 50+ fallback; 190 missing age sources; explicit NR; blank versus zero; malformed JSON/tokens; boundary 28/28.999/29/30; out-of-range/precision; duplicate headers/IDs; inactive and active duplicate identity; no fuzzy/email/name fallback; all action-count partitions; no writes on selection/cancel; no-ready button; preview expiry/tampering/file or season change; partial field omission and stale notes.

Production-matched isolated Postgres fixtures must prove uniqueness races (including newly inserted duplicate), role changes, simultaneous imports, timeout priority for normal member writes, rollback on late failure, audit atomicity, idempotent retry, exact changed-field masks and zero season/member/match mutations. Browser tests use isolated data and verify explicit confirmation. Lint/build required only after implementation. Tests above are planned, not claimed passed; no app tests/build ran during design.

## 22. Rollback and integrity

Before any later approved migration/deploy, capture accepted deployment identity, schema/functions/grants, affected source-store baseline and business fingerprints. Additive schema must remain compatible with the previous app. Disable the new importer and restore the accepted app on regression; retain imported source/audit data. Application rollback cannot undo committed data. Any later source-data correction needs exact per-field before/after evidence, concurrency checks, backup and explicit owner authorization; never delete season data or restore a whole live database over legitimate activity. Normal ratings/member/roster/schedule/score/standings flows must remain unchanged.

## 23. Controlled sequence / review decisions

1. Owner approved local source separation and bounded policy synchronization. The later clarification removes any hardcoded RF cutoff; the importer shows raw source RF.
2. After explicit bounded implementation authorization: implement isolated source-only flow; rehearse SQL/transactions, UI and normal workflows locally; return concrete diff and validation.
3. Separate approval/preflight for additive migration/deployment; verify production normal LMS first, then read-only source-preview behavior, permissions and integrity. No production test rows.
4. Production import remains a separate explicit approval of a fresh actual preview and exact source fields. No automatic import after deployment.
5. Establishment/authorized mid-season reset requires its own reviewed design and approval. It must consume a chosen source snapshot and retain locked classification/rating provenance; Clean/Delete/Copy remain untouched here.

**STOP FOR REVIEW.** Current export paths and RF scale are verified. Legacy lock rationale cannot be proven beyond deliberate preservation; no authoritative software lock/reset mechanism was found in the inspected schema/path. Source separation is the minimal safe recommendation that avoids relying on those unknowns. It does not claim to finish establishment/reset or authorize any production write.
