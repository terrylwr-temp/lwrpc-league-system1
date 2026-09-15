# LMS-0725 / 0.1.547 — production continuation stopped on policy presentation gate

September 8, 2026, approximately 5:22 p.m. Eastern. **DEPLOYED; NOT PRODUCTION ACCEPTED. STOP BEFORE CORRECTION.** Production Q87–Q89 remain paused. No View-As parity work started.

The exact approved SQL was applied once and the approved application reached READY. The first personal-eligibility gate passed. The policy-only contrast then exposed a visible state-versus-policy error: the official-policy answer is displayed under **LIVE LMS DATA / ELIGIBILITY / Current as of …**, although no SELF data was read. Acceptance stopped at that point under approval sections 27–28. No correction, rollback, further acceptance question, or full model benchmark followed.

## 1. Exact migration

Reviewed file: `lwrpc-admin/supabase/migrations/20260908203904_lms0725_eligibility_self.sql`.

SHA-256 recalculated immediately before application and matched:
`fb7fb27fbb6b460739eaacecc9e3916e9f4e272280611d368293cbad1b83712f`.

Supabase production project: `glikrmmgirilnmamxxyl` — LWR PC League Management, ACTIVE_HEALTHY. The migration was absent before application. Supabase recorded the single application as version **20260908211419**, name `lms0725_eligibility_self`; this is the provider-assigned production history timestamp for the exact reviewed SQL file, not a substituted SQL file.

## 2. Migration/security result

PASS. Predecessor function hashes, postgres ownership, invoker mode, fixed empty search_path, ACLs, audit constraint, current Rules version and production Q78 deployment matched the reviewed baseline. Post-application bodies match expected new hashes. All 37 inspected function metadata/body comparisons matched either the three approved changes or their unchanged predecessor. Other functions, including View-As dispatcher/locks/maintenance, identity linking and Q78 persistence, were unchanged.

## 3. Grant/RLS footprint

Normal public/private lookup: postgres + service_role EXECUTE. View-As private lookup: postgres + lms_view_as_executor EXECUTE. PUBLIC has no EXECUTE grant; anon and authenticated effective EXECUTE checks are false for all three reviewed signatures.

Only the reviewed executor SELECT privileges on `dupr_reliability_rating` and `dupr_doubles_rating` were added. Existing RLS definitions and enabled/forced flags have identical before/after hashes. No broader table/browser grant or RLS policy was added. Audit constraint now accepts ELIGIBILITY_SELF. Direct production attack replays were not reached before the acceptance stop; exact deployed guards and prior isolated security controls remain verified.

## 4. Deployment

**READY**: `dpl_4ciHHSLqWSaqh3Dop3aowMKH9F7J`.

URL: https://lwrpc-admin-rlc7z354f-terry-lwrpc.vercel.app

Both `league.lwrpickleballclub.com` and `view-as.lwrpickleballclub.com` alias this deployment. Version remains LMS-0725 / 0.1.547. One initial CLI invocation from the nested app directory stopped before upload because the configured project rootDirectory already includes `lwrpc-admin`; the corrected repository-root invocation completed the deployment. No project setting was changed.

## 5. First required question

**“Can I play on a DUPR5 team?” — PASS for the legitimate signed-in SELF state.**

The response resolved MDUPR5/WDUPR5 without unnecessary gender clarification, stated individual 2.0–2.899 and pair 5.1, explained RF/NR precedence and Rules 4.5/4.5.1/4.5.2, preserved participation qualifications, and cited current League Rules pages 2, 3, 4, 5, 7. It truthfully returned CANNOT_DETERMINE because classification inputs were unavailable. No unconditional Yes/No was required or returned.

Read-only audit verification confirmed one ELIGIBILITY_SELF access audit, a correct actor-to-SELF binding and missing applicable classification inputs. No raw RF, rating, member identity or personal response transcript was saved in acceptance artifacts.

## 6. RF/NR classification

The exact deployed deterministic code preserves <29, not <=29; independent NR status is considered when RF does not itself trigger NR. No naturally available below-29 SELF case was established before the stop. The accepted isolated below-29, 28.999 and exactly-29 evidence remains the boundary proof. No production rating was modified or searched broadly to manufacture a fixture.

## 7. Partial eligibility

The first response correctly left complete eligibility unresolved and explained known policy and missing conditions. A naturally established individual PASS case was not reached. The accepted local partial-PASS controls remain intact; do not represent them as a fresh production PASS case.

## 8. Necessary-condition failure

No legitimate established-Rated out-of-range production case was run before stopping. Prior isolated below/in/above range and NR no-false-failure controls remain accepted. No false necessary failure was invented in the production response.

## 9. Missing RF

Production missing-input behavior PASS: unknown classification; numeric Season DUPR alone was not used to imply Rated or eligible. Database audit verification confirmed missing applicable inputs without disclosing their raw values.

## 10. Pair/participation

PASS in the first answer: pair cap 5.1 stated; proposed partner/applicable ratings and membership, waiver, DUPR ID/club, community and roster requirements explicitly remained unverified. No partner value or overall eligibility was fabricated.

## 11. Other-player RF denial

Production ACL/non-disclosing deployed-code verification PASS. New explicit other-player prompt/RPC acceptance replay was not reached. Accepted local player/captain/club-pro/Commissioner other-subject denial tests remain evidence, not a substitute claim of a new production replay.

## 12. View-As eligibility

Both-origin deployment and unchanged dispatcher/lock/grant metadata verified. **Focused production effective-user question NOT RUN** because acceptance stopped first. The approved isolated end-to-end effective-target NR test remains intact. No View-As context was started during this continuation.

## 13. Policy-only contrast — FAILURE

**“What are the requirements for DUPR5?”** returned correct official policy content, correct source, POLICY_ONLY metadata and `source_family=lwr`. Its correlated access-audit count was **0**: SELF RF/rating was not queried. Model was skipped with zero tokens.

However, the browser displayed **LIVE LMS DATA**, operation **ELIGIBILITY**, and “Current as of …” above that policy-only answer. This is a visible policy/state categorization error, so the required State-vs-policy errors = 0 gate is not met.

Read-only source inspection locates the cause at `lwrpc-admin/app/components/AskLwrAssistant.js:214`: any `result.live` renders a hardcoded LIVE LMS DATA banner. `runEligibility` supplies a descriptive `live.label` (OFFICIAL POLICY for this case), but that presentation does not use it. This observation is a diagnosis only; no file was corrected.

## 14. PrimeTime 9

Read-only preflight confirmed the reviewed Rules/configuration mismatch still exists. New production personal-conflict answer replay NOT RUN. Prior deterministic conflict control remains accepted.

## 15. Telemetry/privacy

Exactly two new correlated outcomes observed; one per submitted question. First: CANNOT_DETERMINE / LIVE_LMS_DATA, one authorized access audit. Second: POLICY_ONLY / lwr, zero access audits. Both have model=null, model_call_skipped=true, input/output tokens=0. Both have zero review occurrences. Diagnostic metadata contains workflow/result only, no raw RF, personal rating, member ID or personal question/answer.

Outcome IDs and sanitized counts are in `lms-0725-eligibility-production-results.json`. No auth tokens, private citation URLs, raw ratings, member identifiers or screenshots of personal state were retained as acceptance artifacts.

## 16. Q78 behavior

Both writes succeeded on attempt 1: **33 ms** and **48 ms**, below the 500 ms initial deadline. Exactly one logical outcome each, no duplicate or retry. Existing Q78 capture function metadata/body is unchanged. This run did not exercise the recovery branch and does not claim a new injected-recovery production test. The accepted frozen-payload/reconciliation/maximum-one-retry local evidence and prior Q78–Q86 production results remain intact.

## 17. Q87–Q89 and remaining controls

**NOT RUN; still paused.** No full benchmark restart. Live SELF_RATING contrast, additional division cases, explicit other-player denial replay, View-As eligibility and PT9 answer replay were also deferred when the policy-only gate failed.

## 18. Calls/cost

**2 targeted production questions; 0 OpenAI generation calls; 0 embedding calls; 0 input/output model tokens; estimated additional model cost $0.** No official document-generation case was run. Production gpt-5.5 and existing cost policy are unchanged. The accepted 120/120 deterministic benchmark and 946/946 tests were preserved, not rerun unnecessarily.

## 19. Final integrity

Read-only checks at approximately 5:22 p.m. Eastern:
- Single eligibility migration history entry confirmed.
- Business hashes unchanged for members, member_season_ratings, teams, team_members and user_roles, both immediately after migration and at final check. No business mutation attributable to this work.
- Document/version/chunk and Approved Answer/revision counts/content hashes unchanged. No corpus reprocessing or Approved Answer creation.
- RLS policies/flags, final column grants and all post-migration function metadata unchanged.
- Identity-link function and user-role data unchanged.
- LMS-0724 maintenance active every minute: **60 successful / 0 failed** in the last hour.
- HMAC, View-As origins/encryption and OpenAI configuration remain present with encrypted metadata consistent with the previous check; no environment write occurred. Secret-value equality was not tested by decrypting secrets.
- No correction or rollback after the material gate failure.

## 20. Limitations / next review

This is not production acceptance. One visible policy/state presentation error is proven. Unrun gates cannot be counted as passed or zero-error. Generic policy retrieval/privacy itself passed, so the finding is not evidence of an RF authorization leak.

The next bounded correction to review is presentation of policy-only versus hybrid versus live-only context while preserving private history handling, SELF security, source citations and telemetry. Do not change SQL or authorization merely to repair the banner. No correction has been implemented in this continuation.

## 21. Final status

**LMS-0725 / 0.1.547 — DEPLOYED, NOT PRODUCTION ACCEPTED; STOPPED BEFORE CORRECTION.**

Current deployment and migration remain installed. Production Q87–Q89 are paused. No automatic new version or View-As parity work. View-As real-LMS UI parity and mini-LMS removal remain the next mandatory work only after LMS-0725 production acceptance.
