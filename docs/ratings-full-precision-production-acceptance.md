# Full-precision ratings — production accepted

Completed September 11, 2026, 8:35 p.m. Eastern. The single authorized guarded repair succeeded. No Import, Clean, Delete, Clear, Transfer or Copy was executed.

## Migration and deployment

- Approved file: `20260911232820_ratings_full_precision_and_guarded_repair.sql`.
- SHA-256 recalculated immediately before apply: `c3b4cfb6b433087c6b419898ffacfca282c4f0da2f7ed41b77f81394b7c4e811` — exact match.
- Applied once to `glikrmmgirilnmamxxyl`, LWR PC League Management. Recorded once as version `20260912001226`, name `ratings_full_precision_and_guarded_repair`.
- Exact deployed commit: `6397e53ac0632e717913c2dc7736f9aed79ee15b`.
- READY deployment: `dpl_5GBYhis9FKxzmjMu5gBrqDxVdwLf`.
- Immutable URL: https://lwrpc-admin-ilbquelk5-terry-lwrpc.vercel.app
- Production and View-As domains assigned. Both commit metadata fields match; all 1,170 source archive files matched the approved commit byte-for-byte.
- No rollback performed. Previous accepted application rollback: `dpl_8YTFfmCy1VF4thuJoRMd2X9R49T1`. Reviewed guarded data rollback remains available subject to unchanged after-state/source and separate authorization.

## Fresh scope and repair

| Check | Verified result |
|---|---:|
| Fresh affected members | 625 |
| Fresh repairable members | 623 |
| Excluded source conflicts | 2 |
| Detected later manual-edit conflicts | 0 |
| Successful repair batches | 1 |
| Members repaired | 623 |
| Doubles fields repaired | 618 |
| Internal Age-Based fields repaired | 554 |
| Total working fields repaired | 1,172 |
| RF fields changed | 0 |
| Failed rows / failed repair runs | 0 / 0 |
| Remaining repairable members | 0 |

Run `251adf4f-3be7-4918-83e7-0789c756d3af` completed at `2026-09-12T00:35:01.499603Z`. Native-production manifest fingerprint: `2db96f86fead27a31aaebb30ea4efd58`. The exact 623-member identity hash matched the reviewed list. Execution regenerated the native preview, required the same manifest hash/counts/member list/exclusions, then called the reviewed function once under service_role and the authorized Commissioner identity with explicit transaction timeouts. No direct UPDATE or changed repair function was used.

Audit: 623 before records, 623 after records, source/batch fingerprints, provenance, timestamp, exact fields/counts, both exclusions, zero detected manual-edit conflicts, and success. Current ratings and provenance match every audited after record (zero mismatches). Existing workflow audit rows remain unchanged; exactly one repair run was added.

Barry Wolf and Chris Oleson remain excluded and unchanged. Barry retains Doubles 4.1 / RF 100 / Age 4.7; Chris retains Doubles 3.7 / RF 90 / Age 4.0. Both still return REVIEW for the original source conflicts. The eight duplicate-ID groups and Terry Captain were not modified.

## Terry and final ratings

Terry Adelman, `1R9LNE`, member `43e1e363-82f1-47d7-a869-befed4c967b8`:

| Field | After repair |
|---|---:|
| Visible/stored DUPR Doubles | 4.077 |
| Reliability Rating | 100 |
| Internal Working Age-Based | 4.311 |
| Final Season DUPR | 4.0, unchanged |
| Final PrimeTime Season DUPR | 4.3, unchanged |

The production grid visibly shows 4.077 and 100. No Age-Based grid column was added.

The post-repair read-only Clean comparison at cutoff 29 matches all 1,986 before-repair context rows: current ratings, proposed finals and actions are identical. Regular final-result changes caused by repair: **0**. PrimeTime final-result changes: **0**. Across the original 625 affected members, 625 regular and 625 PrimeTime results remain unchanged. No Clean execution/commit ran.

All 1,681 season-rating records retain the same protected-fields hash, excluding only the two authorized working fields: `1b2898c6468a0e1a105f35a53a9fb792`. RF, finals, notes, timestamps and every other rating field are unchanged.

## Source, operational and security integrity

Source snapshots/batches and existing import/workflow audit evidence retain their hashes. Only working ratings, authorized input provenance and the new repair audit changed. Members, user_roles, teams, team_members, matches, match_lineups, match_lines, line_games, team_standings and league_schedule_settings hashes are unchanged. No schedules, Match Setup, scores, rosters or standings were altered.

Migration alone changed zero scoped business rows. Table ACL/RLS flags are unchanged. Only the existing planner definition changed; Clean and commit functions did not. The three new private functions are owned by postgres, SECURITY DEFINER with fixed empty search_path. Anon/authenticated cannot execute them; service_role can execute preview/repair but not the helper. Commissioner authorization remains required. No new public wrapper or table grant. Security advisors returned no notice naming these precision functions.

Automatic review rejected an initial broader integrity query covering unrelated tables/Auth data; it did not run. Checks were narrowed to the authorized league tables. No full-database/Auth snapshot is claimed. Zero detected manual edits refers to normal workflow timestamp/value/provenance evidence; it cannot prove that an arbitrary privileged historical edit-and-restore bypassing timestamps never occurred.

## Signed-in production smoke

- Commissioner Dashboard loaded normally.
- Season Ratings loaded, filtered Terry and displayed repaired precision afterward.
- Captain Dashboard rendered the normal no-active-captain-team state for the Commissioner.
- Player Dashboard rendered Terry's team, roster summary and final Season DUPR 4.0.
- Ask LWR panel, question controls and guides rendered; no question was submitted.
- View-As rendered Terry Captain's player dashboard with the READ-ONLY identity banner. The owner explicitly approved access after automatic review requested specific account authorization. The session was exited and its tab closed.
- The actual downloaded CSV completed Preview Ratings. Terry showed `4.077 → 4.077`, RF `100 → 100`, and over_50 `4.311 → 4.311`, with populated inputs explicitly preserved. Import was never clicked. Existing ambiguous IDs remained excluded.

Representative smoke passed. Runtime inspection found an existing `url.parse()` deprecation warning on `/api/round-robin/player`, first seen June 23; no ratings workflow failure was reported. No unrelated cleanup was included.

## Validation and operating status

Approved candidate unchanged: 14/14 focused tests pass. Full suite: 1,259 pass / 10 established failures, zero candidate-only failures. Baseline: 1,244 pass / 11 failures; its extra intermittent telemetry assertion passed isolated rerun. The established ten remain separate test debt. Lint: zero errors/six existing warnings; TypeScript, build, PDF bundle and diff checks pass.

**Normal Upload is safe to use under the existing fill-blank-only contract:** full source Doubles/Age precision is preserved, populated working inputs remain protected, and Upload does not write final Season/PrimeTime ratings. Planner versioning invalidates old Upload/Transfer receipts. The repair is complete and must not be rerun. Barry Wolf and Chris Oleson require separate source review.

Machine-readable evidence: `ratings-full-precision-production-progress.json`. Restricted per-member evidence and execution SQL remain under ignored `.local-validation`.

**Stopped after repair and required verification. No Import or Clean performed.**
