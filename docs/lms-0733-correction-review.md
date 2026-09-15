# LMS-0733 / 0.1.555 — empty trailing CSV header correction

Local correction complete. **STOP FOR OWNER REVIEW. Not deployed; production CSV not retried; no ratings imported.** Remains LMS-0733 / 0.1.555. The deployed parent is `e24d27f64953a6128383bb6393bcb383ba67f5dc`. The exact correction commit/tree is recorded after commit in the external companion `docs/lms-0733-correction-identity.json`, avoiding a self-referential commit hash.

## 1. Root cause and normalization

The unchanged original export SHA-256 is `345f2a01399fa28933893c3423187e001e6295cae9332785abcfd8adf4eb2a6b`. Its header parses as 11 cells: ten named columns and one empty trailing cell. All 879 data records have ten cells. The deployed parser compared against all 11 header cells and rejected CSV row 2.

The correction removes only the contiguous suffix of whitespace-empty parsed header cells, then applies existing header-name normalization and strict row-width equality. One or multiple blank suffix headers are supported. Named headers are never removed; punctuation-only names are rejected, not silently treated as padding. Any remaining unnamed header is rejected, including an unnamed interior column. The original state-machine CSV parser remains intact.

Data rows are never shortened or shifted. A final comma is a real empty positional field: `duprId,doubles,metrics\nABC123,3.2,` preserves empty Metrics. An extra trailing data cell beyond the normalized header width remains invalid even if empty. This is deliberately strict; the correction does not add unnamed data columns.

## 2. Permanent malformed/quoted test matrix

Tests cover the original 11-header/10-data structure and ordinary 10/10 structure; multiple trailing blanks; named extra header; short row; populated extra data cell; interior unnamed header; punctuation-only header; duplicate normalized header; extra populated data under blank header; quoted comma; escaped quotes; quoted empty values; meaningful empty interior and final cells; multiline quoted cells; LF/CRLF; BOM. Eleven new test entries pass. Existing row/byte bounds and malformed quoting checks remain unchanged.

## 3. Original file and complete local preview

The **unmodified original 879-row file** runs through `ratingsImportRequest(action: preview)`, including parsing, DUPR-ID-only matching, source validation, preview construction and local signed receipt generation. Its ten fields on every row (8,790 cells) match independent Python standard CSV-reader field hashes. All existing source-value fixture rows align; no column shifts. The exact original file is not copied into Git. No receipt is retained.

**Identity limitation:** the local service uses the accepted synthetic membership-category fixture, adapted to the original file's IDs. There is no saved per-member production snapshot in the accepted artifacts, only aggregate diagnosis counts. No production query was made during this correction. These results exercise the full local preview pipeline and preserve the expected category baseline; they are **not fresh production match counts** and cannot establish which real members are ready. The fixture constructs the categories deliberately, so this is a regression check, not an independent confirmation of live membership.

| Local fixture disposition | Count |
|---|---:|
| Total original CSV records | 879 |
| Unique fixture matches | 695 |
| Active unique matches | 659 |
| Inactive skipped | 36 |
| Not found | 178 |
| Ambiguous | 6 |
| Missing DUPR ID | 0 |
| Invalid | 0 |
| No change | 0 |
| Ready to update | 659 |
| Total skipped | 220 |
| Existing preview `locked` counter | 0 |

The `locked` counter is not a count of preserved fields and was not changed by this correction. Synthetic locked season fields are attached to all 695 unique fixture matches and remain unchanged, including all 659 UPDATE rows. Those protected values do not block refreshing the separate source store. There is no new PROTECTED row action or fabricated live protected example.

| Age source | All original rows | Synthetic ready subset only |
|---|---:|---:|
| 65+ preferred | 295 | 234 |
| 50+ fallback | 394 | 310 |
| Missing | 190 | 115 |

Missing age remains absent/preserved, not invented. Ready-subset counts depend on the synthetic fixture assignment and are not production counts.

## 4. Field map and unchanged semantics

All ten reviewed columns retain position: `duprId,name,email,phone,singles,singlesReliability,doubles,doublesReliability,status,metrics`.

- `duprId` remains the sole identity key; no name/email matching.
- `doubles` remains raw source Doubles; `doublesReliability` remains primary RF; existing `doublesRe` alias rules are unchanged.
- Metrics still selects `subscores.doubles.over_65`, then `over_50`; source values and missing flags are unchanged.
- Preview proposes only existing source keys: `doubles,rf,age,ageSource,ageMissing,rfMissing,doublesMissing`.
- RF remains raw during preview. Clean Ratings retains its separate prompt. No cutoff, policy, inactive-member, duplicate, season-value, confirmation, receipt, transaction or rollback changes.

The only application-code delta is six changed lines (five additions, one deletion) in `app/lib/seasonRatingsImport.js`. Other changes are the new test file, a local verification script, and this report. No dependencies, version metadata, migration, SQL or other application files changed.

## 5. Validation

| Check | Result |
|---|---|
| `npm test` | 1,165 pass, zero failures/skips; all previous named entries remain present, plus 11 new parser cases |
| Focused eligibility/import/RF/database controls | 69 pass, zero failures/skips |
| `npm run lint` | Zero errors; same six pre-existing warnings |
| `npx tsc --noEmit --incremental false` | PASS |
| `npm run verify:ai-pdf-server-bundle` | PASS before build and again against rebuilt output |
| `npm run build` | PASS using synthetic loopback-only build environment |
| `git diff --check` | PASS |
| Original-file local preview / independent map | PASS, 879 rows / all 8,790 fields |
| Production access / import / model calls | None |

The first build compiled but failed page-data collection because the clean isolated checkout had no Supabase URL. The completed build supplied `http://127.0.0.1:54321` and synthetic build-only keys in the child shell. No production credentials, tracked configuration or deployed settings changed. These local build artifacts are not deployment artifacts; future authorized deployment must build immutable source in the established production environment.

The full suite includes normal LMS role boundaries, View-As, schedules, roster/match/score controls, UI control contracts, locked ratings, explicit confirmation, commit-time identity revalidation, stale/duplicate handling and transaction rollback. Database regression tests operate on isolated synthetic local fixtures. No live workflow was re-exercised in this local-only correction; the accepted prior representative production checks remain historical evidence.

## 6. SQL and migration

No production SQL (read or write), migration application or new SQL file. Existing local embedded-database tests remain isolated. The already-applied migration `20260910134349_season_ratings_source_import.sql` is unchanged with SHA-256 `8f532af5b44644e749696d3903785236c6fe173b3119408ca896a220f4543df4`. **Do not apply it again.** Production history already records `20260910144835 / season_ratings_source_import` once.

## 7. Immutable review and exact future continuation

Candidate branch: `codex/lms0733-trailing-header-correction`, based directly on the deployed LMS-0733 commit. No unrelated mixed-working-tree files are included. The companion identity receipt records correction commit/tree, migration identity, exact file delta and hashes of validation evidence. The correction deployment allowlist remains the same 323 files; only the parser blob changes.

After explicit owner review/authorization:

1. Verify the correction commit, clean source, deployment allowlist and one-file application delta. Retain LMS-0732 accepted rollback deployment `dpl_414rqyGtFAFrcQ6JNRTVH9Qs2cGU`.
2. Recheck live version, existing migration/source-store status, active Rules and business integrity read-only. Do not reapply SQL or assume current counts from this local fixture.
3. Deploy only the approved immutable correction source as LMS-0733 / 0.1.555 and verify READY/source identity.
4. Verify normal LMS first, then existing Fall Season Ratings and integrity.
5. Upload the same hash-verified 879-row export **for preview only**. Obtain actual live disposition/age counts, raw RF, preserved-value examples and visible import action.
6. Open confirmation only if it causes zero writes; verify its summary, then **STOP without final confirmation**. Return actual preview and unchanged fingerprints.
7. First live import requires a separate explicit owner authorization after that successful production preview.

No step of this future continuation was performed during the correction.

External evidence logs: `docs/lms-0733-correction-{tests,critical,lint,types,build,build-local-env,pdf,pdf-final,diff-check}.txt`; original-file aggregate result `docs/lms-0733-correction-local-preview.json`. The first-build failure is retained transparently alongside the completed build.
