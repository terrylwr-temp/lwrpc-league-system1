# LMS-0736 / 0.1.558 proposed-value verification — local validation

Local application change only. LMS-0735 / 0.1.557 remains deployed and NOT production accepted. No deployment, rollback, database migration, business-data write, RLS/security change, document activation/version change or production configuration change was performed.

## Diagnosis: exact original failure

Question: **Are we going to use the Lifetime ball**. Reproduced against baseline application code and current active official documents, with real OpenAI calls and read-only database access. The prior 16-case ball control was “What type of balls will we be using?”; it did not exercise this proposed-value wording.

Baseline intent: Determine whether the Lifetime ball will be used. Fact type: equipment policy or league ball specification. Entity: Lifetime; subject ball was not separated from the proposed brand. All original-style expansions had to retain the named entity.

The Captains Guide Match Balls assignment **did appear** in the original and normalized-query result sets: chunk `c9809c3e-e99c-4b2f-b9d2-c9c5ad804747`, active version `c0b30100-1d00-42a2-9b0f-9aa97fe23d83`, page 10, LEAGUE FEES AND WAIVER. Its baseline score was **0.3776** (semantic 0.3535, keyword 0, exact 0.85, authority 0.8328), above the unchanged 0.35 threshold. It was not recalled by the product-constrained expanded/rescue searches. Higher-scoring generic USAP passages and rulebook affinity dominated the bounded merged ranking and twelve-candidate applicability input.

The assessor received only generic USAP passages, not this club assignment. It therefore did not actually reject the authoritative assignment: the assignment was displaced before assessment. No invalid evidence IDs were returned. The original planner/assessor treated Lifetime as a required evidence entity instead of a proposition which the documented assignment might contradict.

Authoritative wording: “Match Balls: Franklin Outdoor X-40 optic yellow balls for all regular season and playoff matches.” Original OCR spelling and full source text are preserved in the JSON evidence.

Baseline searches:

- original: `Are we going to use the Lifetime ball` (32 candidates)
- expanded: `Are we going to use the Lifetime ball?` (32 candidates)
- expanded: `Lifetime ball use official ball equipment` (32 candidates)
- rescue: `Lifetime ball pickleball ball approved ball official ball` (32 candidates)

Baseline applicability: The excerpts state only that tournament directors choose a ball from the approved list and that approved balls are acceptable; they do not identify whether a specific event or group will use a Lifetime ball, nor whether that ball is approved.

Baseline result: I couldn't find an applicable rule or guide in the official LWR Pickleball Club or USA Pickleball materials. Please contact League Management for clarification.

## Generalized correction

- Planner separates requested subject/fact, proposed value and verification scope. The original question is unchanged. Subject-only searches omit the proposed value while retaining explicit league/division and other named scope. Nested product entities may be omitted only within the proposal.
- Club-operation candidate diversity reserves room for club sources without deleting USAP candidates or lowering evidence thresholds. Governing-rule questions retain their ordinary source eligibility.
- Verification is also checked when a legacy selector already returned a topical passage. Existing recognized policy completeness/rejection safeguards remain.
- Applicability requires an affirmative same-subject assignment or prohibition, with matches/contradicts, an allowed evidence ID, an exact source quote and a value present in that quote. Unknown IDs, fabricated quotes and unsupported comparisons fail closed. Absence cannot become No.
- Same-version structural context survives reranking and deduplication. Verified league/division context accompanies assessment and generation, preventing a continuation or flattened table from losing its scope.
- Existing year chronology, valid-ID/retry checks, source revalidation, material qualifications, conflicts and rescue execution counters remain in place. No product names, score/date values or exact user-question constants were added to application logic.

## Exact after result

Interpreted subject: the ball we are going to use. Proposed value: Lifetime ball. Scope: club_operation.

Subject-centered queries:

- expanded: `designated ball equipment official match ball` (32 candidates)
- expanded: `league ball approved ball equipment` (32 candidates)

Applicable assignment: `c9809c3e-e99c-4b2f-b9d2-c9c5ad804747`, page 10, score 0.3916.

Applicability: The club captain guide directly assigns the league-provided match balls as Franklin Outdoor X-40 optic yellow for regular season and playoff matches, contradicting the proposed Lifetime ball; the related guide states home captains bring league-provided balls.

Comparison: `{"relation": "contradicts", "chunkId": "c9809c3e-e99c-4b2f-b9d2-c9c5ad804747", "quote": "Match Balls: Franklin Outdoor X-40 optic yellow balls for all regular season and playoƯ\nmatches.", "documentedValue": "Franklin Outdoor X-40 optic yellow balls"}`.

Final answer: **No. The provided club guide says the league provides Franklin Outdoor X-40 optic yellow balls for regular-season and playoff matches, and the home captain must bring league-provided balls to the match.**

Fallback: False. Rescue diagnostics: `{"considered": true, "triggered": false, "queriesExecuted": 0, "candidatesReturned": 0, "evidenceSelected": false, "selectedCandidateIds": []}`.

## Validation

Automated suite: **1,257/1,257 passed**, including 21 new proposed-value controls. Lint: **0 errors, 11 existing warnings**. Production build: **passed** (local Next.js cache required an unsandboxed retry after an EPERM; no deployment). `git diff --check` passed. Existing selector fixtures explicitly stub the additional planner boundary; their business, authority, conflict and answer assertions were retained.

The final real-model run contains the previous 16 cases plus 11 new verification cases. Exact questions, interpretations, query paths, candidate scores, applicability decisions, final sources/answers, fallback flags and rescue counters are retained in `lms-0736-validation.json`. Inputs were limited to official-document metadata/excerpts and questions. Contacts were masked before OpenAI calls. The harness permits only official-document reads/search RPCs and signed document-view links; it blocks unrelated or mutating database requests.

| Case | Original question | Final answer | Fallback |
|---|---|---|---|
| ball_match | Are we using Franklin balls? | Yes. The league provides Franklin Outdoor X-40 optic yellow balls for all regular season and playoff matches. The home team captain must bring the league-provided balls to the match. | False |
| ball_model | Is the match ball an X-40? | Yes. The league provides Franklin Outdoor X-40 optic yellow balls for all regular season and playoff matches, and the home team captain must bring the league-provided balls to the match. | False |
| score_match | Do we play the Saturday Picklebreaker to 25? | Yes. In the Saturday DUPR League, the Picklebreaker is one game to 25, win by 2, using rally scoring. It is only played if the match is tied 12-12 after the prior rounds. | False |
| score_wrong | Do we play the Saturday Picklebreaker to 15? | No. For Saturday DUPR League, the Picklebreaker is one game to 25, win by 2, using rally scoring. The regular games are to 15, win by 1, but the Picklebreaker has its own rule. | False |
| date_wrong | Is Saturday league registration due on October 3? | No. For the 2026 Fall Saturday DUPR League, the last day to register is Sunday, October 4, 2026—not October 3. | False |
| date_match | Is Saturday league registration due on October 4? | Yes. For the 2026 Fall Saturday DUPR League, Oct. 4, 2026 is listed as the “Last day to register.” | False |
| players_wrong | Are there 8 players per team in a Saturday league match? | No. For a Saturday league match, the rule says 12 players are required/fielded: 6 men and 6 women, divided into six doubles teams, with 4 courts required. | False |
| players_match | Are there 12 players per team in a Saturday league match? | Yes. For a Saturday league match, the rules require/field 12 players: 6 men and 6 women, divided into six teams—3 men’s doubles teams and 3 women’s doubles teams. This requires 4 courts. Mixed teams may come from those gender doubles players or from additional players who participate only in the mixed round. | False |
| no_assignment | Are we required to use Acme smart watches during matches? | I couldn't find an applicable rule or guide in the official LWR Pickleball Club or USA Pickleball materials. Please contact League Management for clarification. | True |
| captain_duty | Do captains have to complete Match Setup three days before the match? | Yes. Both home and visiting captains must submit their upcoming match rosters/starting lineups in Match Setup no later than three (3) days before the scheduled match. The home team is strongly recommended to submit first, and later lineup changes must also be entered through Match Setup. | False |
| proposed_ball | Are we going to use the Lifetime ball | No. The provided club guide says the league provides Franklin Outdoor X-40 optic yellow balls for regular-season and playoff matches, and the home captain must bring league-provided balls to the match. | False |
| exact | when does the primetime league get their schedules | For the 2026 Fall PrimeTime DUPR League, schedules are completed and sent on Wednesday, Oct. 7, 2026. | False |
| variant_sent | when will PrimeTime schedules be sent out | PrimeTime schedules are scheduled to be completed and sent on Wednesday, Oct. 7, 2026, for the 2026 Fall League. | False |
| variant_available | what date are the PrimeTime schedules available | PrimeTime schedules are completed and sent on Oct. 7, 2026, for the 2026 Fall League. | False |
| variant_captains | when do captains get the PrimeTime schedule | For the 2026 Fall PrimeTime DUPR League, schedules are completed and sent on Wednesday, Oct. 7, 2026. | False |
| weekday_open | What is the Weekday sign-up opening date? | The Weekday DUPR League sign-up opens on Monday, Sept. 7, 2026. | False |
| saturday_close | What is the last chance to sign up for the Saturday league? | The last day to sign up for the Saturday DUPR League is Sunday, October 4, 2026. | False |
| weekday_start | When does the Weekday competition kick off? | The Weekday DUPR Season starts Oct. 14, 2026 for Women and Oct. 15, 2026 for Men. | False |
| saturday_end | When does the Saturday regular competition wrap up? | The Saturday DUPR regular season wraps up on Feb. 20 / 27, 2027, for the 2026 Fall League season. | False |
| weekday_championship | When is the Weekday title decider? | The Weekday DUPR title decider is on the Championship Days: Dec. 9/10, 2026, at the Premier Sports Center. | False |
| unknown_paraphrase | When does PrimeTime receive its fixture list? | PrimeTime’s fixture list is scheduled to be completed and sent on Wednesday, Oct. 7, 2026, for the 2026 Fall League. | False |
| rules_control | Do all games in the Saturday league post to DUPR | No. In the Saturday league, all gender-based games are submitted and posted to DUPR, but mixed doubles games and Picklebreaker games are not. More generally, forfeited, incomplete, or ineligible games are not recorded, and players may not independently submit Club League scheduled games to DUPR. | False |
| rules_rating | For the Season DUPR rating, do you round up down to the first decimal? | No. Season DUPR Ratings are truncated to the nearest tenth, not rounded up or down. For example, 3.496 becomes 3.4, and 3.401 also becomes 3.4. | False |
| captains_control | Where can I find the seasons scoring sheet | You can find it in the League Management System: https://league.lwrpickleballclub.com.  For a match score sheet, go to your Captain Dashboard and use the “Next Match” section. The Match Score Sheet button becomes available after Match Setup; it turns green once both teams have entered their lineups. Print it after it turns green so the lineups are complete. | False |
| captains_ball | What type of balls will we be using? | The league will provide Franklin Outdoor X-40 optic yellow balls for all regular season and playoff matches. | False |
| lms_control | How do I complete Match Setup in the LMS? | To complete Match Setup in the LMS:  1. Home and visiting captains must use the LMS Match Setup button for the upcoming match. 2. Enter/assign the starting lineup player pairings and save the lineup before the match date. 3. Complete it no later than 3 days before the scheduled match; the Home Team is strongly recommended to enter its lineup first. 4. The LMS validates the lineup against roster membership, rating/range rules, duplicates, and team-rating maximums, and may show warnings for ineligible combinations. 5. If you make lineup or roster changes after the initial submission, enter them through Match Setup; saving automatically notifies the opposing captain. 6. The Match Setup button is red when incomplete and blue once completed. When both teams complete setup, the Match Score Sheet button turns green and a complete match score sheet can be printed.  For detailed click-by-click LMS instructions, log in and open the Captains User Guide using the question-mark icon in the top header. | False |
| unsupported_control | What is the official league policy on teleporting to matches? | I couldn't find an applicable rule or guide in the official LWR Pickleball Club or USA Pickleball materials. Please contact League Management for clarification. | True |

## Issues caught during development

Initial local iterations exposed a pre-existing successful-but-wrong legacy selection for the score proposal: it answered from rotation points instead of the game target. Other iterations lost league scope on a page continuation or over-constrained a nested product name. Those runs were not counted as passes; their logs remain in `.local-validation/lms0736-pilot*.log`. The final run uses the corrected generalized pipeline.

## Production-data attribution

See `lms-0736-data-delta-attribution.md`. Wild Blue Crush changed at 18:01:10.409 UTC, followed by Captain roles for its captain and first co-captain at 18:01:12.853566 and 18:01:13.037650. This matches the ordinary team-save/role-assignment sequence within the prior acceptance window. No team-save actor audit was found; ordinary concurrent activity is strongly supported but the actor is not proven. There is no evidence the Ask LWR deployment/validation caused the writes. Nothing was changed or reversed.

Production acceptance remains outstanding. This local report does not mark LMS-0735 or LMS-0736 production accepted.

## Final decision

**LOCAL PASS: 1,257/1,257 automated tests; 27/27 OpenAI-backed cases (16 prior controls + 11 new cases).** Twenty-five cases generated supported answers and two intentionally fell back. Final evidence/answer review found no remaining false-positive selection. Rescue counters were checked against actual executed query paths and returned/selected IDs for all 27 cases.

No remaining local validation blocker. Proposed-value questions now add a bounded planner/assessment step, so latency and model use can exceed the older direct-selector path; unsupported or unavailable verification fails closed. Earlier failed pilot runs are retained and excluded from the final pass count.

Recommendation: ready for owner review and a separately authorized controlled deployment of LMS-0736, followed by real Commissioner preflight/acceptance and integrity checks. Do not deploy automatically. LMS-0735 remains deployed, not production accepted, with no rollback performed.
