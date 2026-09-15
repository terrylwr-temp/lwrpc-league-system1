> SUPERSEDED WORKFLOW — 2026-09-10: The separate initializer is abandoned. Routine Upload protects populated working inputs and final ratings; explicit Clean Ratings may CREATE or UPDATE Season DUPR using current inputs and applicable Rules/divisions. Earlier blank-only or immutable-initialization statements below are historical, not current Clean policy. See [current reconciliation](lms-0733-clean-ratings-reconciliation.md).

# LMS-0733 — Phase 1 local initialization review

2026-09-10. LOCAL ONLY; STOP FOR OWNER REVIEW. No production SQL, deployment, initialization, Clean Ratings, PrimeTime operation, source import, or application model calls occurred. Candidate: `C:\lwrpc-league-system\.local-validation\lms0733-candidate`, based on accepted `de36572acdbcd5b5e6f669ed451dc6db93c7778a`. Changes remain local and uncommitted; this is not a new production release identity.

## 1. Eligibility contract

Phase 1 fills only NULL regular `season_dupr_rating` for an explicitly active member in the reviewed active 2026 Fall season. Required: unique current DUPR ID; source linked to the accepted successful import and exact original member/ID/source payload; canonical valid Doubles (2.000–8.000); numeric RF (0–100); neither required source field flagged missing; no contradictory input; no previous initialization provenance; regular Season DUPR still NULL.

RF must be above the boundary extracted from current authoritative active Rules 4.1.1. The reviewed Rules currently yield 29; 29 and 28 are NR, and 30 qualifies if all other requirements hold. The runtime does not hardcode 29. Rule 4.2 must still specify truncation to the nearest tenth; otherwise fail for policy review. The verified rule version and season are explicitly scoped; new versions require review. Missing RF is not Rated. An explicit NR source with RF above the boundary is contradictory and requires review.

Execution additionally requires a communicated establishment date, its reference, source-snapshot suitability confirmation, enabled server write gate, and explicit counted confirmation. No actual establishment date/reference has been supplied for production. Dates after today or season start cannot execute. The code does not assume today's import date is the establishment date.

## 2. Current production-derived counts

Fresh read-only production source/member/rule data were evaluated locally using the same preview classifier. These are source-qualified candidates, not authorization to initialize. A fresh deployed preview must be obtained before any future batch.

| Category | Count |
|---|---:|
| All members reviewed | 1,974 |
| Eligible rated candidates | 538 |
| Protected regular ratings | 0 |
| NR — waiting for division / excluded from Phase 1 | 121 |
| Missing source (active members) | 1,159 |
| Missing RF | 0 |
| Contradictory / invalid | 0 |
| Other review-required | 0 |
| Inactive / not applicable | 156 |

The 659 current source records were checked against the successful import payload and current unique DUPR IDs. No assumption that RF alone qualifies all 538 rows was used. Categories are mutually exclusive: inactive rows are excluded before missing-source counting; established regular values are protected before evaluating sources.

## 3–6. Exact proposed, protected, NR and review rows

The complete 1,974-row desktop report is [production-derived preview](lms-0733-phase1-production-derived-preview.html). Each row includes player, DUPR ID, source Doubles/RF, current/proposed regular Season DUPR, basis, action and reason. The matching [JSON](lms-0733-phase1-production-derived-preview.json) retains machine-readable evidence. Filter its `rows` by `action`: `INITIALIZE` = 538, `PROTECTED` = 0, `NR — WAITING FOR DIVISION` = 121. Missing source = 1,159; other review categories = 0. These local artifacts contain member information and are not application public assets.

## 7. Calculation samples

| Player | DUPR ID | Source Doubles | RF | Proposed regular Season DUPR |
|---|---|---:|---:|---:|
| Jonathan Boehning | 4LOZ6G | 3.292 | 80 | 3.2 |
| Kelly Bivins | ODNXMP | 3.778 | 100 | 3.7 |
| Thomas E Allwine | X2ZN64 | 2.648 | 40 | 2.6 |
| Susan Hardy | N7j6d6 | 3.461 | 70 | 3.4 |
| Doug Hehner | 99ZQG7 | 3.508 | 30 | 3.5 |

Truncation, not rounding. Browser preview uses decimal-string extraction; commit independently uses PostgreSQL numeric truncation. There was no actual RF=29 source row; fixtures explicitly cover that boundary.

## 8. Provenance

New private `ratings_initialization_private.provenance` records member/season/batch, initialization timestamp, exact source snapshot, Doubles/RF used, RATED determination, source import/revision/time, DUPR ID, active Rules version/content fingerprint/threshold/formula, effective date/reference, phase and resulting rating. Full prior rating-row image (or NULL for a newly inserted row) is retained. Later source refreshes do not update this provenance.

No legacy source Doubles/RF or PrimeTime value is populated. Existing eligibility consumers and Clean Ratings are unchanged; provenance retention is implemented, but a new provenance viewer or changes to eligibility consumers are outside this Phase 1 correction. This must not be mistaken for an eligibility-engine migration.

Future NR/PrimeTime provenance must additionally retain actual applicable league/division/max/calculation or verified age reference/age-rating source. Those phases are not implemented.

## 9–10. Transaction and revalidation

One approved batch, 1–1,000 rows, executes in one PostgreSQL transaction. A season advisory lock serializes initializer batches. Short lock timeout (1 second) and statement bound (8 seconds) limit contention. Short table locks prevent concurrent identity, source, Rules or NULL-rating-row changes during validation/write. These locks can briefly delay normal writers; a quiet controlled window and observed production timing are required before enabling writes. Local synthetic tests do not establish production lock performance.

Commit reauthorizes the actor; checks receipt expiry, same season and Rules content, date confirmation, unique selected members, exact preview fingerprints, current unique identity, source/import linkage, activity, NULL regular rating, no newer provenance, valid required fields and calculated proposed value. Any changed selected basis fails the whole batch. An unexpected late-row failure rolls back earlier ratings and provenance writes. Existing row updates name only `season_dupr_rating`; all other fields remain untouched. New rows receive schema defaults and NULL other ratings.

Receipts are HMAC-signed, domain-separated from source-import receipts, bound to actor and authenticated session, and expire after 10 minutes. Repeating an identical accepted batch returns its recorded result; a batch identity collision fails. The UI prevents overlapping confirmation and cancels pending confirmation after season component unmount.

## 11. Audit

Private `batches` stores actor, phase, season, original signed payload (counts, selected members and exact source fingerprints), result and timestamp. Successful per-member provenance links the actual source batch/snapshot. Controlled transaction failures roll back business writes while retaining a failed audit with zero initialized and reason. Invalid authorization/payload failures before accepted batch identity, connection loss or statement cancellation may not persist an audit; verify database audit/provenance after an uncertain response rather than assume failure and retry a new batch. No universal durable audit is claimed for infrastructure failure.

## 12. SQL for review only

File: `lwrpc-admin/supabase/migrations/20260910193000_season_ratings_initialization_phase1.sql` in the isolated candidate.

SHA-256 of reviewed on-disk bytes:

`DF19F89A59A3E98F75722BEC0D32E0FC847504895C4351BFED96F3B5482CF9A8`

Adds private schema, two tables, three private functions and two public RPC wrappers. No existing business schema, triggers or functions are changed. No production migration was applied. Recompute checksum if line endings or contents change before release.

## 13. Security

New tables have RLS enabled and no client policies or direct table grants, including no service-role table privilege. Public/anon/authenticated cannot execute either RPC. Service role has schema usage and only snapshot/commit execution. Internal policy helper is not client executable. Definer functions use empty search paths and qualified relations; public wrappers are invoker functions. Existing trusted authorization helper enforces real commissioner/league-manager access. API verifies the bearer user server-side, rejects View-As mutations and wrong origin, bounds body size, disables caching and keeps service credentials server-side. No unrelated security/grant changes.

## 14. Validation

Full local regression suite: 1,176 passed, zero failed. Focused Phase 1 suite: 6 passed after adding production-shaped ID/timestamp/FK defaults. Covers RF 30/29/28, protected values (including zero), missing/invalid/contradictory sources, inactive/unknown activity, no NR numeric assignment, PrimeTime preservation, frozen provenance, atomic late failure/rollback, stale identity/source/Rules/manual-rating rejection, signed receipt/session binding, default write-disabled gate and denied private access.

Desktop synthetic browser: 1280px, 661 members, 659 fixture source rows; 396 rated candidates, 263 NR, two missing source. Missing establishment evidence disabled confirmation. Native date entry, counted confirmation, Cancel and one confirmed synthetic commit verified. Success displayed 396; repeat preview showed zero candidates and 396 protected. Fixture evidence: exactly one commit, all 659 source records unchanged. The 1,100px preview table scrolls within its 959px container. Mobile acceptance is not applicable under the owner exception; global mobile behavior is unchanged.

Lint: zero errors, six pre-existing warnings, none added. Final `npm run build` passed (exit 0), recorded in `lms-0733-phase1-build.txt`; build uses synthetic local Supabase configuration, no production credentials. An initial unconfigured build failed for missing Supabase URL in the existing View-As route, so it was rerun with local placeholder configuration.

## 15. Normal LMS protection

Only six integration lines were added to the existing Ratings page (import/state/button/panel). Existing source review, import, Clean Ratings, RF-policy, eligibility, team, roster, scheduling, Match Setup, match, score and standings implementations are unchanged. Full regression suite passed. No production test rows or business mutations were used. Local tests are not a claim of fresh production end-to-end acceptance; normal Tier 1 desktop checks must precede future feature acceptance.

## 16. Controlled production sequence — NOT AUTHORIZED NOW

1. Owner reviews this candidate, SQL/hash, all row outcomes, locks/audit limitations, scope and retained provenance. Resolve the communicated establishment date/reference and suitable source snapshot before any batch authorization.
2. Freeze a clean candidate commit/release identity; rerun required checks on that exact artifact. Preserve accepted deployment `dpl_3BXEyQk6kbxFA793Jg649oAZq77X` and accepted application commit for rollback. Confirm database backup/recovery access and save pre-change business/grant fingerprints. Rehearse recovery using before-images in a nonproduction database before authorizing business writes; no automatic undo tool is included here.
3. Obtain explicit authorization for this exact additive SQL migration and application deployment, separately from data initialization. Apply reviewed SQL only after authorization; verify objects, owners, ACL/RLS and read-only snapshot. Verify migration fingerprint and unchanged business data.
4. Deploy exact candidate with `SEASON_RATINGS_PHASE1_COMMIT_ENABLED` unset/false. Verify normal Tier 1 workflows first, then read-only desktop preview and denial paths. Confirm source/protected/other business fingerprints unchanged. Mobile testing of this administrative function is not required.
5. Obtain a fresh full counted preview and explicit approval of its exact Phase 1 population/date/source basis. Arrange a quiet member/source/rating editing window. Only then authorize enabling the write gate and one specific batch; regenerate fresh receipt if needed.
6. Explicitly confirm once. Immediately verify audit/provenance counts, every initialized value, NULL-only changes, no NR/PrimeTime/source/other business changes, and repeat preview protection. Disable the write gate again. If response is uncertain, inspect the existing batch before attempting anything further.
7. If application verification fails, restore accepted deployment; additive SQL can remain inaccessible. Any reversal of an already authorized successful initialization requires separate owner approval and comparison of current rows with frozen before-images to avoid erasing later edits. No automatic production restoration/data deletion is authorized.

## Exact implementation files

Under candidate `lwrpc-admin/`:

- `app/ratings/page.js` (modified)
- `app/components/SeasonRatingsInitialization.js` (new)
- `app/api/ratings/initialize/route.js` (new)
- `app/lib/seasonRatingsInitialization.js` (new)
- `app/lib/seasonRatingsInitializationServer.js` (new)
- `supabase/migrations/20260910193000_season_ratings_initialization_phase1.sql` (new)
- `test/seasonRatingsInitialization.test.mjs` (new)
- `scripts/phase1-browser-fixture.mjs` (new; local synthetic database only)
- `scripts/phase1-readonly-report.mjs` (new; offline captured-data report)

Documentation/evidence: this review, project-roadmap entry, captured read-only snapshot/current Rule JSON, production-derived HTML/JSON and four validation logs under the main workspace `docs/`. No deployable public member data is added.

## Owner decisions retained for later phases

Under 65 at season start but 65 by December 31 uses specific Rule 6.3.2 PrimeTime NR handling; 50+ fallback cannot override it. Missing both age metrics leaves PrimeTime blank and does not alone imply NR. Regular and PrimeTime NR use separate applicable league/division bases. NR waits for actual placement. Age eligibility requires an authorized verified age/DOB source and is never inferred from age-rating metrics. Missing or conflicting required information requires review. All initialization phases are blank-only. Phases 2 and 3 remain separately reviewed future work.
