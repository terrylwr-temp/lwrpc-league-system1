# Ask LWR player-pair eligibility — diagnosis and review boundary

September 12, 2026. **STOP FOR REVIEW — not a FAST FIX.** Owner requested diagnosis/design only. No application edits, deployment, migrations, business-data writes, member searches or model generation were performed. Investigation used the accepted d5db069 application in the isolated checkout, local classifier execution, and read-only production function/catalog inspection. Documentation is the only change.

## 1. Current routing failure

The /api/ask-lwr route checks needsEligibility, then needsLive, then official-document answering. Local execution of the deployed classifiers returned null from both classifiers for: “Can Terry play with Tim?”, “Can Terry and Tim play together?”, “Can I play with Tim?”, “Can Terry play with Tim in DUPR7?”, “Can Terry and Tim be partners?”, “Can John partner with Mary?”, “Are Sue and Bob eligible to play together?”, and “Can these two players play on the same team?”. This reproduces the first failing routing stage, without rerunning a production model.

“Are Terry and Tim eligible for DUPR8?” instead becomes nonpersonal division_policy: both names are lost. The eligibility classifier recognizes personal wording around “can I”, requires division-like context, and has no pair representation. The Live classifier recognizes supported field lookups, not proposed partners.

## 2. Required Live facts

Two independently resolved, authorized member identities; the applicable active season, league and exact division; each applicable Season DUPR or PrimeTime Season DUPR; verified NR classification; and placement inputs needed for NR adjustment across relevant divisions. For a complete eligibility claim, additional participation/roster and, where applicable, age conditions must be verified. Numerical pair compliance alone is not complete roster eligibility.

## 3. Existing capability reuse

Reuse authenticated SELF resolution, authorized name matching, signed/encrypted session-bound clarification receipts, active league/division catalog, official evidence citations, exact decimal comparison, policy/configuration conflict checks, minimal projections and deterministic formatting. PLAYER_RATING returns one applicable numerical season rating, not the other player's NR/RF eligibility inputs. ELIGIBILITY_SELF returns RF, sourceIsNr and the applicable numerical value, but explicitly forbids an explicit member target. Existing evaluateEligibility always leaves PAIR_AGGREGATE_UNKNOWN and PARTICIPATION_UNKNOWN unresolved. These capabilities cannot simply be composed into the requested complete answer.

## 4. Identity resolution

Represent two subject slots without hardcoded names. Resolve “I” only through authenticated/effective SELF architecture; resolve the named partner separately. Reuse role-scoped matching with at most five actual name candidates per clarification. Keep the resolved first slot while clarifying the second. Do not default either ambiguous name to SELF. Duplicate display names need narrower input without private disambiguators. “These two players” requires two previously verified subjects; a generic page path is insufficient. Revalidate authorization after each selection; reject forged, expired or cross-session receipts. Handle the same member selected twice explicitly.

## 5. League/division clarification

Use current applicable catalog choices, narrowed by supplied league, division and season. DUPR7 alone need not uniquely identify league or men's/women's division. Existing divisionOptions groups equivalent men's/women's policy rows, which is useful for policy guidance but not proof of exact team eligibility. Pair evaluation needs an exact validated context where restrictions differ. Ask bounded progressive choices when necessary rather than returning an entire catalog or exceeding the current ten-choice bound.

The client currently sends currentPath and featureModule; runEligibility does not consume them, and runLive deliberately ignores browser-supplied member/team/context IDs. Preserve valid signed context and resolve any page team through an authorized server lookup. Do not trust a URL or browser-selected ID as authorization. Conflicting contexts need clarification.

## 6. Pair calculation

Proposed reviewed flow: resolve both identities and context, load a consistent authorized snapshot, validate current official policy against division configuration, check each rated player's individual range, then add the two applicable Season DUPR values and compare against the official pair maximum using existing exact-decimal conventions. PrimeTime uses the applicable PrimeTime value. Never substitute raw current DUPR. Separate individual failure, combined-limit failure, rating compliance and incomplete overall eligibility. Rule 4.6 concerns each two-player lineup; sharing a team roster is not identical to permission for every possible pairing. Clarify that distinction when wording requires it.

## 7. NR behavior and current Rules

Read-only active Rules inspection confirmed Rule 4.5 permits NR participation subject to placement responsibilities. Rule 4.5.1 supplies the initial aggregate value of division maximum individual rating minus 0.5; Rule 4.5.2 uses the highest adjusted rating across divisions. Blank numerical Season DUPR must not itself reject an NR player. Missing NR evidence is unknown, not rated and not automatically NR. A proposed division adjustment is a read-only calculation, never an instruction to write a rating or roster placement. Multi-division placement facts must be verified before claiming the final aggregate.

Additional blocker: deployed ELIGIBILITY_POLICY_BINDING uses version 6ae10e5f-fdde-41be-a941-d1b7ed360d1a, while the active League Rules version is 478a87bb-1b05-4da9-ac09-7ddecec64f69. The evaluator intentionally fails closed on an unreviewed version. Review current evidence/configuration and any NR bound representation before updating this binding; do not silently inherit policy or bypass the gate.

## 8. Privacy controls

Authorize both targets independently, then expose only names and necessary rating/eligibility conclusions. No directory dump, unrelated contacts, DOB, notes or standalone other-player RF. Prefer a narrow classification/derived-value projection for any new reviewed capability. Retain private no-store responses, purpose/session-bound receipts, effective-identity behavior, rate limits and sanitized audit/quality metadata. No service-role table-read shortcut around existing authorization. Do not send unresolved identities or private facts to a model for guessing.

## 9. SQL requirement

Yes: the full requested behavior requires a new or extended reviewed private lookup/projection under the existing architecture. Production pg_proc inspection confirms ELIGIBILITY_SELF rejects any subjectKind except SELF and extra name/subject parameters; PLAYER_RATING does not return RF. The required other-player NR and placement facts are not available through the accepted eligibility read contract. This is not authorization to write SQL. A separate limited classification-only fallback could avoid SQL, but would not deliver the requested pair eligibility feature.

## 10. Authorization requirement

Yes. Production lookup explicitly denies ordinary player-role other-member lookups. Managers/Commissioners have wider active-member resolution; captain/club-pro access is bounded to authorized team relationships. Even where a rating lookup is already authorized, extending it to other-player NR/placement inputs is a new projection to review. Supporting “Can I play with Tim?” for ordinary players requires an explicit policy decision about partner lookup and result visibility. Preserve current restrictions until reviewed. View-As must preserve effective-member scope and must not inherit Commissioner access.

## 11. Targeted tests for the reviewed implementation

Preserve all six requested exact pair variants and generic-name equivalents; ambiguous first/second name; two ambiguous subjects across multiple turns; SELF plus named partner; no match; duplicate name; same member twice; missing/ambiguous league, division and season; validated page context retained; forged/stale/cross-session context denied; unresolved “these two”; unauthorized partner and manager/captain/player/View-As boundaries. Test rated individual bounds, exact combined maximum and just over, NR with blank value, unknown NR evidence, one/two NR players, multi-division highest adjustment, PrimeTime, stale Rules binding and policy/configuration conflict. Distinguish same roster from two-player lineup and prevent unverified complete-eligibility claims. Preserve SELF rating, Important Dates, single-player eligibility and community Rule 3.5 routes. Verify no business writes, unrelated fields, directory export or model guessing.

Diagnostic execution already confirms SELF rating remains SELF_RATING; the Important Dates question bypasses these two Live classifiers; single-player DUPR7 remains personal_eligibility. The proposed new behavior has not been implemented or tested. No lint/build run is needed for this documentation-only diagnosis.

## 12. Release classification and next review

Normal review required: new private eligibility projection, other-member authorization scope, two-subject continuation/context handling, complete NR aggregate facts, and current policy binding. These trigger the documented FAST FIX exclusions for new Live/SQL/security scope and roster eligibility. Stop before implementation. The next review should decide permitted roles/relationships and whether the initial scope promises rating-pair compliance or full eligibility, then approve the narrow read contract and acceptance matrix above. No production changes are authorized by this report.

Code anchors in the accepted checkout: aiEligibilityIntent.js:10/17; aiEligibilityService.js:55/60; aiEligibilityPolicy.js:5/34; liveLmsService.js:40; AskLwrAssistant.js:164; migration 20260909212951_lms0729_live_identity_team_record.sql:104 onward. Production function metadata confirmed the SELF-only and player-denial constraints rather than relying only on migration history.
