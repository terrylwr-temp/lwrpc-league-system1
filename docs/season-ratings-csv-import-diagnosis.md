# Season Ratings CSV import — owner matching decision and diagnosis

> **OWNER HOLD — RF=29: OWNER POLICY DECISION REQUIRED.** [Controlling hold and regression gate](season-ratings-rf-owner-hold.md) supersedes earlier threshold conclusions or approvals. Preserve Clean Ratings <=29 and current Ask LWR/eligibility <29 behavior independently. No threshold or rule-interpretation changes; no auto-cleanup. Proposed source refresh must remain neutral and must not derive a new universal NR classification. Earlier policy descriptions below are historical findings, not authorization to reconcile the boundary.

Date: 2026-09-10. Status: read-only source diagnosis; implementation not authorized. No production queries or writes, import/cleanup/copy/delete actions, or OpenAI API calls were performed. Only diagnosis documentation was updated. Findings describe the current local source; deployed source and live database behavior were not independently verified in this review.

## Controlling identity contract

Match CSV `duprId` to `members.dupr_id` ONLY. Masked email and abbreviated name are reference/display fields, never matching or confirmation evidence. Missing ID: SKIP/INVALID. Zero members: SKIP — DUPR ID not found in LMS. More than one: AMBIGUOUS/ERROR; never choose one. No member auto-creation and no member name/email/DUPR ID/Auth writes.

Trim surrounding whitespace. Existing round-robin code normalizes IDs using trim plus uppercase (`app/round-robin/[id]/admin/page.js:6228`), supporting case-insensitive application matching. This is not proof of a database uniqueness constraint. Do not strip internal characters or fuzzy-match. Flag all duplicate normalized source IDs for review, including identical rows; do not inherit silent last-row-wins behavior.

Uniqueness must be checked across LMS members, not just active members. Current ratings loader filters to active/null-active members (`app/ratings/page.js:2374`), which could hide duplicates or inactive matches. Eligibility to update and identity uniqueness must be evaluated separately; any inactive-member restriction needs an explicit documented disposition.

## Why the import action is absent

`app/ratings/page.js:577–714` contains the complete flow. File selection parses and stores preview rows, then returns immediately if there are zero ready rows. Otherwise it immediately opens Apply Ratings Import; confirming invokes the write function. There is no persistent preview-level Import button. Cancelling the modal also leaves no persistent way to resume applying that preview. Roadmap LMS-0655 explicitly records removal of the screen-level Apply button.

The current matcher uses email, then name, never DUPR ID. With the owner-described masked export, this explains unmatched rows and suppressed confirmation. The actual CSV was not supplied here, so no actual row counts or claim that all 879 rows fail has been made. Another zero-ready cause is that existing raw Doubles is already filled and no other recognized field is importable. `doublesRe` is NOT among recognized reliability headers, compounding this case. Name/email lookup maps also silently choose the last member with a colliding key.

## Exact mappings and existing update intent

| CSV source | Current target/behavior | Required disposition |
| --- | --- | --- |
| `duprId` | Parsed, but used to fill missing member DUPR ID | Identity only; remove member writes |
| `doubles` | `member_season_ratings.dupr_doubles_rating`; numeric formatted to 3 decimals, explicit NR retained | Preserve blank-only policy unless owner changes it |
| `doublesRe` | Unrecognized today | Owner-confirmed RF maps to `dupr_reliability_rating`; validate actual values/scale before implementation |
| Legacy `doublesReliability` aliases | Numeric `dupr_reliability_rating` | Existing valid supplied RF overwrites RF; absent/non-numeric leaves it out |
| `Metrics.subscores.doubles.over_65` | `season_primetime_rating`, truncated to tenths | Existing primary age source |
| `Metrics.subscores.doubles.over_50` | Same target, if 65+ is unusable; appends fallback note | Existing fallback, independent of member age |

The importer does NOT write cleaned `season_dupr_rating`. It writes its raw Doubles source. Separate Clean Ratings derives numeric Season DUPR by truncation, or NR division maximum minus 0.5; it was not run.

Age source code is at lines 451–568. Metrics column presence takes precedence over legacy named age columns. If an age source column exists but yields no usable value, existing code can clear Age-Based to null. No source column means omission/preservation intent. Legacy code also accepts loosely named age headers and non-JSON Metrics text via regex. These must not justify guessing an age field in the new export. The owner-described headers do not establish whether usable Metrics data exists. Until actual export headers/sample Metrics are verified, current-format age import remains unresolved; preserving existing age/notes by omitting unsupported fields is the safe proposed behavior, subject to review of the existing clear-on-present-empty policy.

Roadmap LMS-0655 explicitly establishes blank-only raw Doubles. RF and supplied age are updated; existing notes are appended only for 50+ fallback. Other rating fields are intended to be preserved. A new raw-value overwrite policy is NOT authorized. Numeric parsing currently strips nonnumeric characters rather than strictly validating them; current-format values need explicit validation rather than assuming every cleaned string is valid.

## NR policy

Owner contract remains RF strictly below 29 implies NR treatment under accepted Season DUPR architecture. Import currently stores raw RF without calculating cleaned Season DUPR. Clean Ratings separately implements a configurable inclusive `<= threshold` comparison (`page.js:2522`) and division-based adjustment. Do not call cleanup, silently equate `<=29` with `<29`, replace raw numeric values with NR, or redesign eligibility in this import fix. The boundary discrepancy must be resolved in the reviewed design while preserving accepted NR behavior.

## Transaction and concurrency findings

Current apply function (`page.js:716–789`) first performs independent member updates in batches of 25, then one bulk ratings upsert on `member_id,season_id`. There is no transaction covering the overall import: earlier member writes can survive later failure. Ratings use one request, but live triggers/schema and transaction behavior were not exercised. The conflict target prevents duplicate season/member insertion; it does not revalidate identity or prevent stale overwrites.

Preview relies on cached members/allRatings and apply does not reload or revalidate unique DUPR identity. Ready rows are silently coalesced by member ID, with the last ready row winning. Existing notes and blank-only decisions can become stale before commit.

Additional preservation risk: payloads have different optional fields. Installed `@supabase/postgrest-js/src/PostgrestQueryBuilder.ts:1329–1362` defaults missing fields to null and sends the union of bulk object keys. Omitted fields in a mixed payload therefore must NOT be assumed preserved. An isolated database fixture is required to establish exact behavior, including notes, age and raw Doubles omissions. Changing only identity matching is insufficient.

## Proposed safe preview → confirm → commit architecture

1. Parse locally without writes; classify every row using DUPR ID only. Distinguish identity MATCH from actionable valid field changes/no-op. Reject duplicates and malformed ratings. Show resolved LMS member and explicit field before/after values; names/email from CSV remain reference only.
2. Calculate total rows, matched IDs, IDs not found, missing IDs, duplicate/ambiguous row counts, invalid-field rows and no-op rows. Define mutually exclusive disposition counts so totals reconcile; report unique IDs separately if useful. Never hardcode 879. Provide pagination or complete review, beyond the existing first 50 rows.
3. Keep an obvious Import Matched Ratings action for at least one valid actionable row. Bind preview to the exact season ID and file/row set. Invalidate it on season/file change.
4. Confirmation explicitly states selected season name (2026 Fall Season only when that actual season is selected), rows to update, rows skipped, and exact fields/clear operations. Preserve preview on cancellation. File selection never invokes commit.
5. Use a narrowly scoped authorized server/database transaction for rating writes only. Within commit, validate every ID still resolves to exactly the same unique member, reject duplicate source IDs again, and compare/recheck current rating values. Coordinate database locking/isolation with member identity changes so uniqueness cannot change between check and write. Any stale preview requires a new preview and confirmation; no silent changed target or expanded field set.
6. Explicit field-preserving updates plus safe inserts must preserve unrelated columns, concurrent notes and blank-only semantics. All approved rating changes succeed together or roll back. Return reconciled results and support retry without duplicate effects. Retain existing role restrictions; review the narrow write boundary without bundling unrelated security hardening.

## Remaining gates before implementation

- Inspect actual CSV headers and representative RF/Metrics values (read-only) to verify scale, numeric representation, and age-source availability. Actual counts require the file.
- Verify deployed importer/source and live schema constraints/triggers with authorized read-only evidence; establish database-wide DUPR uniqueness semantics and inactive-member treatment.
- Resolve age-present-empty clearing and the strict NR boundary in the design; retain blank-only Doubles unless explicitly superseded.
- Demonstrate the proposed transaction, missing-field preservation, stale preview and concurrent identity handling in isolated fixtures, never production test rows.
- Review bounded implementation plan and exact affected fields. No implementation, deployment, or import is approved by this diagnosis.

Sources: local `lwrpc-admin/app/ratings/page.js`, installed PostgREST query builder, `lwrpc-admin/supabase-dupr-reliability-rating.sql`, and `docs/project-roadmap.md` LMS-0651–0656 entries. No application files were changed and lint/build were not run for this documentation-only diagnosis.

## Owner clarification and verified export correction — 2026-09-10

See [Final design gate](season-ratings-final-design-gate.md), which supersedes unresolved assumptions above. The real 879-row Downloads export uses doublesReliability, already recognized by current code; doublesRe remains a required alias but is absent from this file. Exact Metrics paths and counts are now verified. Live catalog and aggregate identity checks were read-only. Routine RF/age refresh risks season eligibility/PrimeTime changes; separate source storage is recommended. No implementation or production mutation. STOP FOR REVIEW.
