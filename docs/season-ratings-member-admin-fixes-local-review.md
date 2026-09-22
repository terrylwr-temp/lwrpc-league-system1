# LMS-0757 / 0.1.580 — Season Ratings identity and Member Administration local review

Date: September 22, 2026

Starting Production: LMS-0756 / 0.1.579, commit `755177c56acaa6244eb650c22db9dd1894da1798`, READY deployment `dpl_AVnoqaaCjucKNTgKmUsKFqKUG3Bd`.

## Why this release is needed

The Production ratings planner uses `ratings_workflow_private.context` to count DUPR identity across all members, including inactive historical records. Its Upload candidate join expands one CSV line into multiple candidates when members share that DUPR ID. One active plus one inactive duplicate therefore falsely becomes ambiguous and inflates the preview row count. Production currently has 14 duplicate ID groups: 11 with one active plus inactive record(s), and 3 with multiple active records. No member record is changed by this release.

Member Administration's `admin_member_directory_page` considers leadership assignments as sufficient for Current Rosters Only. In the inspected Production state, the correct roster definition selects 14 distinct members from active roster rows on active teams. The filter correction removes only the leadership-only qualification. Team relationships remain in the returned rows for Teams and member detail behavior.

## Scoped implementation

Migration `20260922204254_lms0757_ratings_identity_member_directory.sql` changes two functions after verifying their reviewed current definitions. The planner's Upload branch aggregates matches by normalized `upper(trim(dupr_id))` and produces exactly one candidate per CSV row. It selects one active member when there is exactly one, regardless of inactive duplicates. Two or more active matches, multiple inactive-only matches, and duplicate IDs within the CSV produce one REVIEW row. A single inactive match remains SKIP; no match remains not found. `context` and its all-member `unique` property remain unchanged for Transfer, source identity, provenance, receipt fingerprinting, and historical checks. The 5,000-row limit and 20-second timeout remain intact.

The directory read function adds a defaulted `p_duplicate_dupr_only` parameter and removes the old seven-argument signature in the same migration transaction. The new signature accepts existing seven-argument callers through the default. Duplicate review includes every active and inactive member in each nonblank normalized duplicate group. The normal search, sort, count, page, and team relationship logic remains; the Current Rosters condition now requires an active `team_members` row joined to an active team. Only `service_role` retains function execution. The server route preserves the active filters while collecting all pages for Last Login sorting.

Member Administration adds a Duplicate DUPR IDs control with an explicit explanation that inactive partners are included, compact Copy Email controls next to email on desktop and mobile, and the existing Eastern short timestamp helper for Last Login. Copy Email stops row navigation, preserves the exact saved email, shows temporary confirmation, and uses a bounded textarea fallback when the Clipboard API fails. Members without email have no copy action. Other uses of the timestamp formatter remain unchanged.

Season Ratings' Current Rosters UI now applies the same `team_members.is_active is not false` and `teams.is_active is not false` test as the member directory. This is limited to its roster filter and does not alter Clean Ratings calculations.

## Local verification

- Focused identity/directory/UI and protected ratings/member tests: 14/14 pass.
- Full automated suite: 1,461/1,461 pass; zero failures, skips, cancellations, or todo tests.
- Lint: pass, zero errors and 11 preexisting warnings.
- Production build: pass, Next.js 16.2.4, 84/84 pages.
- Isolated PGlite migration rerun: passed for both changed functions; transfer plan unchanged; old seven-argument directory caller still works.
- Read-only Production function inspection: exactly one old directory signature, no dependent database objects, and the reviewed current planner definition with the 5,000-row/20-second bound.

The isolated tests cover one active, active plus one/several inactive, multiple active, inactive-only single/multiple, no match, duplicate CSV IDs, trim/case normalization, one-row and 1,800-row count preservation, protected fields, rostered and leadership-only members, inactive roster/team exclusion, duplicate review search/count/pagination, Copy Email, and Eastern short time. Existing tests retain receipt confirmation, View-As, full 5,000-row boundary, and normal LMS coverage.

## Production release and acceptance gates

Before migration, capture the accepted deployment, migration history, normal LMS baseline, Production business table fingerprints, scheduler health, and subscription aggregate. Apply the function-only migration, verify the single directory signature, old/new caller compatibility, unchanged data, and advisor baseline. Deploy the exact tested Git commit through the normal GitHub/Vercel flow and retain LMS-0756 as the application rollback artifact.

Normal signed-in LMS behavior must pass before new-feature acceptance. Use a Commissioner/League Manager session for read-only Member Administration checks and a Season Ratings CSV **preview only**. Verify the three identity cases, exact preview row count, Review/Invalid filter, roster expected set, duplicate review, Copy Email, Eastern Last Login and sorting, and existing member tools without sending a reset. The owner restored the authorized Commissioner browser session before the Production preflight.

Rollback to LMS-0756 requires an application alias change only after review. The new directory function's eighth parameter is defaulted for its existing seven-argument call, and the planner still supports the previous application and receipt flow. The function migration contains no business-row rewrite; the prior function definitions can be restored in a separately reviewed corrective migration if necessary. Do not restore a whole database over live activity. LMS-0756 VAPID behavior is outside this release; PBCC reminder HTTP 200, runtime health, and subscription aggregates remain acceptance checks.

No live ratings commit, Clean Ratings, member/roster/leadership edit, password reset, notification, or VAPID subscription change is part of verification.
