# LMS-0725 / 0.1.547 — SELF-only Reliability Factor implementation review

September 8, 2026. **Local implementation complete; STOP before production SQL or deployment. LMS-0725 remains deployed but NOT production accepted. Q87–Q89 production acceptance remains paused.** The approved design governs this change. No View-As UI parity work was performed.

## 1. Exact implementation files

Added:
- `lwrpc-admin/app/lib/aiEligibilityIntent.js`
- `lwrpc-admin/app/lib/aiEligibilityPolicy.js`
- `lwrpc-admin/app/lib/aiEligibilityService.js`
- `lwrpc-admin/supabase/migrations/20260908203904_lms0725_eligibility_self.sql`
- `lwrpc-admin/scripts/lms0725-build-eligibility-migration.mjs`
- `lwrpc-admin/scripts/lms0725-eligibility-postgres.mjs`
- `lwrpc-admin/scripts/lms0725-eligibility-validation.mjs`
- `lwrpc-admin/scripts/lms0725-reliability-controls.mjs`
- `lwrpc-admin/test/lms0725Eligibility.test.mjs`
- `lwrpc-admin/test/lms0725EligibilityDatabase.test.mjs`
- `lwrpc-admin/test/helpers/eligibilityDatabase.mjs`
- `lwrpc-admin/test/helpers/eligibilityFixture.mjs`
- `docs/lms-0725-eligibility-rollback.sql`

Modified for this correction:
- `lwrpc-admin/app/api/ask-lwr/route.js`
- `lwrpc-admin/app/api/ai-assistant/answer/route.js`
- `lwrpc-admin/app/api/view-as/read/route.js`
- `lwrpc-admin/app/components/AskLwrAssistant.js`
- `docs/project-roadmap.md`

Review artifacts: this report; `lms-0725-eligibility-{benchmark,build,database,diff,focused,lint,pdf,postgres,tests,types}.txt`; `lms-0725-eligibility-full-preflight.json`; `lms-0725-eligibility-postgres-results.json`; `lms-0725-reliability-control-results.json`. Earlier LMS-0725 files already present in the working tree are preserved and are not represented as newly changed by this correction.

## 2–3. Migration and SHA-256

`20260908203904_lms0725_eligibility_self.sql`

`fb7fb27fbb6b460739eaacecc9e3916e9f4e272280611d368293cbad1b83712f`

The builder emits the guarded migration and guarded rollback. Apply is transactional. Body hashes admit the reviewed predecessor (LF/CRLF) or the exact new function. Owner, security mode, search path, unexpected function ACLs and the exact audit constraint definition are checked before replacement. No production migration was applied.

## 4. Exact RPC/function changes

Existing signatures retained:
- `public.ai_live_lookup(uuid,uuid,jsonb)` — trusted normal-server entry and denied-request audit.
- `ai_live_private.lookup(uuid,uuid,jsonb)` — new `ELIGIBILITY_SELF` operation.
- `view_as_private.lookup(uuid,uuid,uuid,uuid,jsonb)` — same operation under the accepted effective-target proof.

No new browser RPC. The existing `public.lms_view_as(text,jsonb)` dispatcher is unchanged. Existing lookup operations and output contracts remain intact.

## 5. Owner / security / search_path

All three modified functions remain owned by `postgres`, SECURITY INVOKER, with fixed empty `search_path`. References to tables/private functions are schema-qualified. Normal execution remains through `service_role`; View-As remains through the accepted SECURITY DEFINER dispatcher owned by `lms_view_as_executor`, which invokes the private lookup. No new definer or role was created. Real PostgreSQL metadata comparisons passed on all three applies and rollback.

## 6. Final grants

Function ACLs remain unchanged: owner plus `service_role` for normal public/private lookup; owner plus `lms_view_as_executor` for private View-As lookup. PUBLIC, anon and authenticated have no direct EXECUTE permission.

The necessary **narrow column grant** adds SELECT on only `member_season_ratings.dupr_reliability_rating` and `dupr_doubles_rating` for the existing non-browser `lms_view_as_executor`. The latter is evaluated only into `sourceIsNr: true/false/null`; imported text is never returned. No table-wide SELECT, browser grant, new schema usage, mutation privilege or role membership is added. Rollback revokes these two added column privileges and restores the predecessor functions. It intentionally retains the audit intent allowlist so historical eligibility audits remain valid.

## 7. RLS interaction

Existing broad rating-table authenticated and executor SELECT policies are preserved exactly. These policies do **not** enforce SELF isolation. SELF is enforced by the protected lookup and accepted dispatcher; tests compare all policy definitions before/after/replay/rollback. No RLS policy change is included.

## 8. SELF binding

The normal route runs existing authorization and online identity authentication before invoking the service-only RPC. Database lookup derives the member from the trusted actor and current active role/member relationship, reuses existing season authorization, locks and rate limits, and rejects arbitrary subject/name/member/target fields. Actor identity is not accepted from the browser body. The database validates active membership/role; online session validation remains the existing server authentication responsibility, not a new direct read of `auth.sessions`.

## 9. View-As binding

The existing signed/context-bound dispatcher supplies the effective member and proof. The new branch reuses the locked SELF_RATING authorization path, verifies the resulting subject equals the effective member, then projects that member's selected season. Real actor is used for audit, never to broaden authorization. Final HTTP context revalidation remains intact. Real PostgreSQL tested an NR effective target against a contrasting Rated Commissioner, forged target rejection, extra subject denial and ended-context denial. Existing broader View-As lock/race tests remain in the full suite.

## 10. RF classification

Actual production RF metadata was verified read-only as `numeric(6,3)`; Season DUPR is `numeric(4,2)`. Exact decimal comparisons use integer scaling rather than binary-float threshold guesses. The threshold is extracted from the pinned active Rule 4.1.1: **below 29**, not <=29. 28 and 28.999 trigger NR; 29 and above do not trigger that RF rule.

The approved independent imported-NR indicator is also included: RF not below threshold plus imported NR remains NR; ordinary Rated requires a known non-NR indicator. Missing/unrecognized provenance stays unknown. Only the boolean is projected; imported numeric/text DUPR is not disclosed.

## 11. NR precedence

Policy/configuration consistency is established, then RF/NR classification occurs **before** ordinary individual-range comparison. NR plus a numeric adjusted Season DUPR is legitimate. Even an adjusted value above the ordinary individual maximum does not itself fail NR placement.

## 12. Missing RF / provenance

Missing or invalid RF produces RF_UNKNOWN and CANNOT_DETERMINE even when a numeric Season DUPR exists. A missing independent NR indicator also prevents a false ordinary-Rated conclusion when RF alone does not trigger NR. Known official policy is still explained. No default to Rated or unconditional eligibility.

## 13. DUPR5

Current official range **2.0–2.899**, maximum pair aggregate **5.1**, validated against current active configuration. Established Rated: below/above range → necessary individual condition FAIL / NOT_ELIGIBLE for that division; within range → PASS / PARTIALLY_CONFIRMED. No full ELIGIBLE result is implemented from this minimum projection.

MDUPR5/WDUPR5 share policy when their relevant configured conditions match, without inferring the requester's gender. An explicitly named division stays scoped to it. No active SDUPR5 means unavailable context, not substitution. Ambiguous DUPR7/DUPR9, decimal labels and “this division” use encrypted, session-bound actionable choices; current source version and active context are revalidated on selection.

## 14. NR eligibility

Rule 4.5 allows NR participation in any division, recommends professional guidance and leaves proper placement with the captain. The answer explains the initial aggregate assignment (division individual maximum minus 0.5) and highest adjusted rating across divisions under 4.5.1–4.5.2. It does not calculate a new assignment without the necessary cross-division context or apply ordinary Rated bounds to NR.

**Bounded limitation:** current authorized inputs do not establish an independent failed pair/participation condition for an NR player. The implementation therefore cannot certify such an NR failure. RF09 is explicitly tested as a no-false-failure guard, not a fabricated positive participation-failure scenario. This follows the requirement to use actual Rules and avoid inventing missing facts.

## 15. Unresolved conditions

Pair aggregate, partner inputs, highest applicable NR adjustment, captain placement and participation/roster requirements remain unverified. PrimeTime age eligibility and applicable age-based rating conditions are stated with Rule 6.3.2 evidence; no DOB is read. Responses remain partial/unknown as appropriate. A general age-policy question and the prior conditional 65th-birthday questions retain document-only behavior.

## 16. PrimeTime 9 and policy scope

Current PT9 Rules/configuration mismatch remains POLICY_CONFIGURATION_CONFLICT; no personal projection is performed to pretend to settle that conflict. Policy binding is explicitly limited to active Rules version `f0aad5ad-cf08-46c2-94fd-686ceb1271c0` and the two reviewed current season IDs in `ELIGIBILITY_POLICY_BINDING`. New versions/future seasons fail closed pending review; active status alone does not silently extend the policy.

Exact source ranges are independently verified by the existing official-source gate. All controlling excerpts remain separate references; the UI groups their verified pages into one full-document citation card, within the four-card limit. No synthetic quoted evidence is generated.

## 17. Telemetry / audit / retention

Normal requests emit one existing-format metadata-only outcome: deterministic operation, result class, model skipped, zero generation tokens. No raw RF, Season DUPR, independent NR boolean, personal question/answer, member ID or source prompt is added to quality telemetry. Three real PostgreSQL outcomes (answer/protected/conflict) passed existing constraints.

Sensitive-access audit identifies actor/target/request and purpose; View-As audit identifies real actor and effective subject. No RF value is stored in audit. Existing audit retention applies. No new RF cache. Browser pending/history/receipt handling marks eligibility interactions private and excludes them from durable conversation history; only short-lived encrypted choice receipts contain public context. View-As keeps its separate sanitized diagnostic mechanism and no ordinary feedback attribution.

## 18. Cross-subject/security controls

Normal SELF passed for seven fixture roles/positions (player, captain/co-captain positions, club pro, league manager, Commissioner). Other-subject attacks were denied for player, captain, club pro and Commissioner; anon/authenticated direct RPC denied; inactive member and revoked role denied. View-As effective NR, forged target, extra subject and ended context checks passed. Standalone/other-player RF prompts are protected before catalog lookup. No other-member RF capability was added.

Observed cross-subject RF leakage: **0** in these tests. Cross-league/division substitution: **0** in the deterministic context/source controls. These are bounded test findings, not a claim that legacy broad table RLS was redesigned.

## 19. Real PostgreSQL migration results

PostgreSQL **17.11**, isolated loopback server, synthetic data only:
- Clean apply PASS; replay PASS; second replay PASS.
- Owner/security/search_path/function ACL preservation PASS.
- RLS preservation PASS; SELF/security matrix PASS.
- Real telemetry persistence PASS (three outcomes).
- Guarded rollback and removal of added RF column access PASS.

See `lms-0725-eligibility-postgres-results.json`. Initial test failures (missing narrow executor column access and local process/cache sandbox restrictions) were resolved locally before final validation. No production changes were made.

## 20. RF scenarios

`lms-0725-reliability-control-results.json` records the 12 design scenario controls, including the explicit RF09 bounded negative guard described above. Separate unit controls cover 28, 28.999, 29, above, missing RF, numeric NR, all three ordinary range outcomes, independent NR/unknown and unresolved pair. Real PostgreSQL supplies the effective-user scenario. No model calls are involved.

## 21. 120-question benchmark

**120/120 deterministic route/source/context checks**, preserving all prior 103 cases and adding Q104–Q120. 82 document-generation payloads were intercepted with local fixture responses; they are **not** 82 newly generated OpenAI answers. Remaining cases exercise live/protected, clarification, insufficient evidence and deterministic eligibility paths. Saved official evidence and active-division metadata were used, not production HTTP replay. Q87–Q89 ran only offline as part of this benchmark; their production acceptance remains paused.

## 22. Models / cost / privacy

**OpenAI calls 0; embedding calls 0; incremental generation API cost $0.** Production `gpt-5.5` unchanged. The new eligibility benchmark rejects `--execute` and blocks global network fetch. Private evaluation is deterministic; raw personal inputs never enter generation. Existing cost-policy work and prior 82/82 generated-answer evidence remain intact; no full model benchmark was rerun.

## 23. Q78 regression

All **15 Q78 telemetry recovery controls** passed within the focused 38-test run and full suite: stable correlation, frozen payload, reconciliation, maximum one retry, reentry protection and exactly-once logical outcome. The new service passes framework-owned `after` recovery on normal routes and catches persistence failures without starting a second logical outcome. Q78 production behavior is unchanged.

## 24. Full validation

- `npm test`: **946/946 PASS**.
- Focused eligibility/database/Q78: **38/38 PASS**, plus final expanded real PostgreSQL matrix above.
- `npm run lint`: PASS, zero errors; 10 pre-existing warnings, none in new implementation files.
- `npx tsc --noEmit --incremental false`: PASS.
- `npm run verify:ai-pdf-server-bundle`: PASS.
- `npm run build`: PASS. Initial compile passed but sandbox blocked `.next/cache/.tsbuildinfo`; approved local retry completed.
- `git diff --check`: PASS (existing CRLF notices only).
- Deterministic benchmark 120/120; RF controls as qualified above.

No new help layout or navigation was introduced. Existing compact welcome, accessible choice buttons and 320px/390px help behavior are preserved; this correction does not claim a new production browser acceptance run.

## 25. Controlled production continuation — requires subsequent approval

1. Review this exact migration hash, two narrow executor column grants, boolean NR projection, policy binding, tests and bounded RF09 limitation. Keep current production and Q87–Q89 paused until explicitly authorized.
2. Read-only preflight: verify deployment baseline, source version, applicable season/division metadata, types, predecessor function hashes, owner/security/ACLs, audit constraint and absence of the new migration. Stop on drift.
3. Once approved, apply the exact guarded migration **once**. Verify installed bodies, grants, unchanged RLS, audit constraint and migration identity. No corpus, model, business-data or unrelated SQL changes.
4. Deploy the reviewed application build once to the normal and isolated View-As origins using existing procedure. Verify READY status/version and unchanged origin/mutation protections.
5. Run only targeted authorized acceptance: ordinary SELF, NR-with-numeric, missing RF, boundary where authorized real data allows it, Rated range behavior, MDUPR5/WDUPR5, unavailable SDUPR5, PrimeTime conflict, necessary choices, and effective-target View-As isolation. Do not alter real RF to manufacture test fixtures. Test unsupported or unavailable production cases locally instead and document limits.
6. Reconcile one expected logical outcome per ordinary request and the separate View-As audit/diagnostic records. Check no raw RF in telemetry, no private browser persistence, zero personal model calls, and preserved Q78 behavior. Stop on the first material defect.
7. After targeted correction acceptance, resume the specifically paused **production Q87–Q89** using existing approved cases and cost policy; do not launch a full generated-answer benchmark. Report production outcome/telemetry/cost evidence separately.
8. Only after every remaining acceptance gate is satisfied mark LMS-0725 production accepted. Then return to the mandatory LMS-0724 View-As UI parity/deletion item: one existing LMS UI under normal or secure effective-user context, preserving security infrastructure and removing the obsolete parallel mini-LMS after parity validation.

**Stopped here. No production SQL, deployment, corpus mutation, model change or View-As parity implementation.**
