> SUPERSEDED WORKFLOW — 2026-09-10: The separate initializer is abandoned. Routine Upload protects populated working inputs and final ratings; explicit Clean Ratings may CREATE or UPDATE Season DUPR using current inputs and applicable Rules/divisions. Earlier blank-only or immutable-initialization statements below are historical, not current Clean policy. See [current reconciliation](lms-0733-clean-ratings-reconciliation.md).

# LMS-0733 — initial Season Ratings workflow diagnosis

READ-ONLY DIAGNOSIS. No Clean Ratings, initialization, production write, or initialization button implemented. This supplements the independently approved source-review UX correction.

## Finding

There is a missing source-to-season initialization operation in the currently shipped source-store workflow. Clean Ratings can fill a blank Season DUPR when legacy inputs exist, but it does not read the newly imported source store. The old importer supplied those legacy inputs; LMS-0733 intentionally stopped those writes. Therefore the successful source import alone does not make Clean Ratings a working next step for Fall's blank legacy rows.

Evidence: current candidate based on a9a515d; historical accepted pre-LMS-0733 page at commit 022eb46099ce7d1c6c32af5a0e27a1de5283b627; fresh read-only active Rules query on 2026-09-10. Authoritative active ready version: 6ae10e5f-fdde-41be-a941-d1b7ed360d1a, “LWR Pickleball Club DUPR League Rules.” Older docs/lms-0722-current-rules-fixture.json says below 29 and is NOT the governing version. Current active Rule 4.1.1 says 29 or below; no separate threshold is hardcoded in this correction.

## 1–3. Exactly what Clean Ratings does

Current code: lwrpc-admin/app/ratings/page.js, cleanRatingsForSelectedSeason, buildRatingCleanupChanges, applyRatingCleanupChanges, cleanedSeasonDuprRating, cleanedAgeBasedRating, isReliabilityNrAdjustment.

Reads:

- Page's already-loaded active members and selected-season member_season_ratings rows: id, member_id, season_id, dupr_doubles_rating, dupr_reliability_rating, season_dupr_rating, season_primetime_rating, notes.
- team_members.member_id joined to teams.id/is_active, divisions.id/max_dupr, leagues.id/season_id. It filters to the selected season and teams not explicitly inactive. It does not separately test league/division active flags in this cleanup query.
- No read of ratings_source_private.sources or batches. No active-Rules lookup inside Clean Ratings itself.

Calculation:

- Numeric legacy dupr_doubles_rating becomes season_dupr_rating truncated to one decimal, irrespective of whether season_dupr_rating was blank or already established.
- Literal legacy Doubles NR, or a nonblank numeric legacy RF at or below the user-entered positive threshold, uses the highest joined active-team division max_dupr for that member/season minus 0.5, truncated to one decimal. No usable positive division maximum means no proposed regular Season DUPR.
- A blank Doubles input normally produces no regular rating, but low RF is checked before the blank test: blank Doubles plus a triggering RF and usable division maximum can still produce an NR-adjusted regular rating.
- Existing numeric season_primetime_rating is independently truncated to one decimal. Clean Ratings does not obtain a new source age rating, apply its RF adjustment to PrimeTime, or populate a blank PrimeTime field from the new source store.
- If both calculated values are null, the member is skipped. An entirely missing legacy row has no source input and is skipped. Thus blank Season DUPR is not itself the skip condition; lack of usable legacy inputs is.

Writes: only member_season_ratings via client update/insert: season_dupr_rating and/or season_primetime_rating, updated_at, and an explanatory notes line when RF triggers. The insert branch additionally initializes legacy Doubles/RF/PrimeTime null before payload, but with no existing row there are no usable inputs and normal logic skips it. Existing source DUPR Doubles/RF columns are not changed by cleanup. No source-store/member/team/roster write. Updates are issued in groups of 25 and inserts separately; this is NOT one atomic transaction and partial failure can leave prior updates committed.

Confirmation: selected-season threshold prompt explicitly describes overwriting season ratings and inclusive “at or below.” Blank/0 disables RF adjustment; invalid/negative input is rejected; cancel stops. A second modal defaults “Start of season clean” on; confirmation applies all eligible calculated changes. Unchecking it opens a selectable per-player review; selected changes are applied by a separate Apply action. There is no blank-only protection and no distinct production-scale initialization receipt. Nothing here was run or changed.

## 4. Exact historical CSV import

Historical app/ratings/page.js at 022eb46:

- Matched by email, then normalized name, not the new DUPR-ID-only policy. Missing member DUPR IDs could be filled by the CSV; existing IDs preserved.
- Upserted member_season_ratings on member_id,season_id. dupr_doubles_rating was filled only when the legacy field was blank/new, numeric values formatted to three decimals or literal NR. Existing Doubles preserved.
- Nonnull parsed CSV RF wrote dupr_reliability_rating, potentially replacing an existing RF. This was raw input, not a newly calculated classification. Historical RF aliases included doublesReliability but did not include current doublesRe shorthand.
- Source Metrics over_65 was preferred, then over_50; legacy direct age columns were also supported. Parsed age was truncated to a tenth BEFORE writing season_primetime_rating. Unlike Doubles, existing PrimeTime could be overwritten. If an age/metrics column existed but no usable age parsed, a ready import row could clear PrimeTime to null. No age column meant no PrimeTime write. A 50+ fallback added a notes line.
- It did NOT write season_dupr_rating. That blank could subsequently be filled through Clean Ratings from the legacy Doubles/RF, or other existing manual/copy operations.
- The page prompted before choosing the file and before applying matched rows; the old operation was a series of client writes, not the new atomic source commit.

Therefore the historical path was approximately import legacy Doubles/RF and age-derived PrimeTime → optionally Clean Ratings establishes regular Season DUPR/truncates existing age. It was not the controlled blank-only initializer now needed.

## 5–9. Current Rules and initialization

| Topic | Governing rule and consequence |
|---|---|
| Initial establishment / locking | 4.1: rating is established on the communicated pre-first-match date and remains in effect for the season. A reviewed initial blank fill is distinct from a later refresh/reset. Current UI code does not enforce a database-wide immutable lock. |
| Regular rated player | 4.2 truncates current applicable DUPR to one decimal; legacy architecture uses Doubles for regular Season DUPR. A future initializer should use reviewed stored source Doubles, not a copied old season value or an invented formula. Numeric Doubles with unknown RF must be flagged for review rather than assumed rated. |
| NR boundary | Active 4.1.1 makes RF at/below the active rule's threshold NR; literal source NR also falls under 4.5. Threshold must be obtained from the authorized active Rules context, with provenance; the existing Clean Ratings prompt remains separate. |
| NR numeric assignment | 4.5.1 assigns division maximum minus 0.5 for team aggregate calculations; 4.5.2 uses the highest adjusted assignment when rostered in multiple divisions. 4.2 supplies tenth truncation. Without a confirmed applicable division/roster context there is no unique numeric result. Flag/defer that player; do not invent a division or assign zero. Record NR provenance separately from its numeric aggregate input. |
| PrimeTime rated input | 6.3 uses 65+ age-based ratings; 4.3 specifies 50+ fallback if 65+ is not established; 4.2 truncates the applicable rating to a tenth. The source store already preserves the selected 65+/50+ value and ageSource. Raw source age must not be copied unchanged as a season rating. |
| PrimeTime unresolved precedence | 6.3.2 also says a player not 65 at season start is NR even if age-eligible by Dec 31. This must be reconciled with 4.3's 50+ fallback for that subgroup before automatic initialization. Current Clean Ratings does not implement PrimeTime-specific RF/age-NR assignment. Rules say age-based leagues follow rating/division rules, but a single global regular/PrimeTime field and cross-division NR assignment require an explicit reviewed mapping. |
| Missing age (108 imported ready rows) | Neither 65+ nor 50+ source was available. The import correctly stored no age and review shows an em dash. Rules provide no blanket “use ordinary Doubles instead” fallback. Do not fabricate PrimeTime or automatically classify every missing-age player NR. Some may not be PrimeTime eligible; age/NR/roster facts must be reviewed. Preserve blank/flag unresolved unless a separately reviewed NR assignment applies. |

Eligibility remains separate. Existing public ai_live_lookup eligibility projection reads legacy member_season_ratings.dupr_doubles_rating (sourceIsNr), dupr_reliability_rating and the chosen season field; it does not read the new source store. Filling only numeric season fields would leave those eligibility inputs unresolved. A future initialization design must explicitly address the approved season-scoped RF/raw-NR provenance or a separately reviewed eligibility read integration. Do not silently refresh established inputs or change eligibility during this UX correction.

## 10–14. Recommended workflow and future design — proposal only

Import current source data → review raw source values → explicit “Initialize Season Ratings” preview on the intended effective date → owner confirmation → atomic fill of eligible blank season fields → protect established season values. Later source refresh remains independent. Mid-season correction/reset is a separate authorization.

A separate action is warranted; overloading Clean Ratings would hide its different overwrite semantics. It must not be implemented until the PrimeTime questions and eligibility input contract above are resolved and the mutation scope is approved.

Proposed preview contract:

- Exact selected season, effective date, active Rules version/threshold, source revision/batch provenance and expiration; do not display internal IDs unnecessarily.
- Every candidate: identity, active status, existing Season/PrimeTime values, raw Doubles/RF/age and ageSource, proposed initial regular/PrimeTime values, calculation/rule evidence, NR status and division basis, missing/invalid source reason, and protected/skipped outcome.
- Separate blank regular and blank PrimeTime decisions; a populated field always remains protected even if the other field is blank. If product policy requires both blank as a unit, settle that explicitly before code. Existing zero/nonblank/NR values must not be reinterpreted as blank without a rule.
- NR without confirmed appropriate division context; missing age; missing RF; inconsistent policy/configuration; inactive members; stale source data → defer/skip with a clear reason. Do not use initialization to place players on teams or qualify rosters.
- Confirmation must name the season and exact selected player/field counts and state “fill blank values only; existing ratings preserved.” Any proposed auxiliary RF/NR provenance writes require equally explicit approval and preview; they are not implied by authorization to populate Season DUPR.
- Server-bound signed preview, reauthenticated manager, source/rules/season/membership/roster revalidation at commit. A bounded transactional RPC with idempotency, old-row snapshots, and blank-only predicates/locks must abort entirely on unexpected conflict or error. No existing client cleanup loop for hundreds of players.
- Undo must target only the approved initialization's still-matching writes, preserve later legitimate changes, and restore prior absence/null values safely. Test locally before a separate production authorization.

SQL: none executed in production. The current UX uses only its approved read-function metadata migration. A future atomic initializer would require separate reviewed SQL/server work for transactional blank-only writes and audit/recovery, with exact tables/columns/roles approved first. No implementation, new button, threshold change, eligibility change, source update, or season population belongs in the current correction.

Owner decisions before future initialization: PrimeTime 4.3 versus 6.3.2 precedence; applicable regular/PrimeTime NR division mapping; missing-age/unknown-RF treatment; independent blank-field eligibility; and season-scoped eligibility RF/raw-NR provenance. These findings do not block the independent read-only source-review UI.
