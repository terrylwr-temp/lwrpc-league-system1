# LMS-0725 / 0.1.547 — eligibility result/source classification correction

September 8, 2026. **Implemented and validated locally. STOP BEFORE DEPLOYMENT.** Production remains on `dpl_4ciHHSLqWSaqh3Dop3aowMKH9F7J`, deployed but NOT production accepted. Q87–Q89 remain paused. No SQL or production mutation in this correction.

## 1. Exact root cause and request trace

`What are the requirements for DUPR5?` → `division_policy` intent, `personal=false` → current official policy retrieval → personal lookup skipped → POLICY_ONLY evaluation → `finish()` previously attached `result.live` unconditionally → both player and View-As UIs rendered hardcoded LIVE LMS DATA whenever that object existed. Normal telemetry independently used `intent.personal` to select its coarse source family. Thus the UI incorrectly implied Live access while telemetry correctly said `lwr` for this particular request; unperformed personal paths could also receive misleading telemetry.

The defect was more than the text of a badge: intent, provenance and private-history signaling had been conflated.

## 2. Architecture and exact files

New `app/lib/aiResultSource.js` defines trusted processing provenance and common presentation/source-family adapters. Eligibility provenance separates intent from `DOCUMENT_ONLY`, `LIVE_ONLY`, `HYBRID_DOCUMENT_LIVE`, or `NONE`. It records document evidence actually included, lookup attempted, authorized eligibility inputs consulted, Live information materially used (including confirmed absence), hybrid status and the personal evaluation result class where applicable. No personal values enter this object.

Modified files (under `lwrpc-admin`):
- `app/lib/aiEligibilityService.js`: derive provenance after processing, rather than from intended access.
- `app/lib/aiEligibilityIntent.js`: route explicit division NR-policy questions through the existing deterministic policy composer; no personal lookup added.
- `app/lib/askLwrConversationState.js`: independent `privateContext` exclusion on history write and restore.
- `app/components/AskLwrAssistant.js`: use the shared presentation adapter.
- `app/view-as/page.js`: use the same adapter.
- `app/api/ai-assistant/answer/route.js`: preserve provenance/private-context fields in the existing manager response adapter.
- `app/api/view-as/read/route.js`: derive diagnostic source family from actual provenance; log sanitized detailed provenance with the existing request correlation ID.

Added `test/lms0725SourceClassification.test.mjs`. Updated this report, validation artifacts and `docs/project-roadmap.md`. No unrelated UI parity or architecture cleanup.

Legacy genuine Live answers retain their existing trusted `result.live` contract and LIVE LMS DATA presentation. Ordinary document answers retain their existing Official Source section. No global answer-model or routing redesign.

## 3. Policy-only behavior

Requirements/range/NR-for-DUPR5 questions produce DOCUMENT_ONLY, OFFICIAL RULES, no Live timestamp, and no SELF lookup. Existing general NR/RF-policy questions continue through document policy routing. A personal question blocked by a policy/config conflict may also be DOCUMENT_ONLY when only official policy evidence is used. Clarifications/protected/errors with no presented evidence use NONE, not a false source claim.

## 4. Personal/hybrid behavior

An authorized `success` or `missing` eligibility input response that contributes to the personal answer produces HYBRID_DOCUMENT_LIVE and **LIVE LMS + OFFICIAL RULES / ELIGIBILITY**. Individual PASS with unknown pair/participation remains a legitimate partial hybrid answer. This classification never grants access or changes the lookup query.

## 5. Missing, denied and incomplete access

Authorized missing RF: Live was consulted, classification remains UNKNOWN, hybrid badge is appropriate and missing-value wording is retained. Unperformed access, denied/not_found/rate_limited/unsupported response, or ambiguous selection does not claim successful Live consultation. A no-season response provides policy guidance only and explicitly says personal eligibility inputs were unavailable. If source verification fails after an authorized lookup, telemetry records consultation but no successful personal use; the technical-error result has no Live badge.

## 6. UI badge behavior

Shared `resultSourcePresentation()` drives normal and View-As labels. Document-only eligibility: OFFICIAL RULES. Hybrid: LIVE LMS + OFFICIAL RULES. Existing live-only rating: LIVE LMS DATA. Only actual personal Live use receives the current-as-of timestamp. No source badge is shown for NONE.

The actual player `Exchange` component was transpiled and rendered with React server rendering in deterministic tests for official/hybrid/live results. Tests assert labels and timestamp presence/absence. View-As uses the same tested adapter and has regression coverage for its integration. This is local component verification, not a new production/browser acceptance claim. Existing compact welcome/help layout is unchanged.

## 7. Telemetry classification

Normal quality telemetry now derives its coarse `source_family` from the same result provenance used by UI. Existing JSON diagnostic metadata records intent, mode, documentEvidenceUsed, lookupAttempted, liveConsulted, liveDataUsed, hybrid, and personalEvaluationResult. No raw RF, Season DUPR, independent imported-NR boolean, actor/member ID, prompt or answer is added.

View-As retains its existing two-value SQL diagnostic family: document or LIVE_LMS_DATA. Policy-only correctly maps to document; actual hybrid maps to LIVE_LMS_DATA. A sanitized `view_as_source_classification` runtime event records the detailed provenance using only the request correlation ID. This permits detailed hybrid distinction without SQL changes or normal-player attribution. Existing database and runtime-log retention configurations are unchanged.

## 8. Unnecessary-read prevention and privacy

Policy-only requests still never enter the SELF RPC branch. The three explicit division-policy controls assert zero lookup calls. “My” temporal-policy questions still route to documents; live rating and personal eligibility remain distinct. Private history handling is now explicit through `privateContext`, independent of the displayed source. Both history serialization and restore exclude it; pending `liveSensitive` handling and encrypted choice-receipt behavior are preserved. Removing a policy-only `live` object cannot cause private-context persistence.

## 9. View-As

The server-authorized effective-user lookup callback and final context revalidation are unchanged. The real Commissioner's role cannot affect provenance. Shared classification tests compare normal and View-As processing, while the full suite exercises effective-target security and existing lock/maintenance controls. No new View-As UI routes, permissions or parallel implementation were introduced.

## 10. RF security regression

The full suite retains SELF-only role/subject rejection, minimum projection, View-As effective inputs, <29/28.999/exactly29 controls, independent NR, NR precedence, missing RF unknown, numeric adjusted NR and partial eligibility behavior. The approved migration file is unchanged, SHA-256:
`fb7fb27fbb6b460739eaacecc9e3916e9f4e272280611d368293cbad1b83712f`.

The existing isolated database fixture tests run unchanged SQL locally as regression tests. No migration was generated, edited or applied to production in this correction.

## 11. Q78

All 15 Q78 recovery tests pass, including frozen payload, stable correlation, reconciliation, at-most-one retry, reentry protection and exactly-once outcome. Normal routes still register framework-owned `after` recovery. Provenance is finalized before the existing persistence function builds/freezes its payload; retries do not redo lookup or classification. The View-As diagnostic path remains separate.

## 12. Validation

- Focused eligibility/classification/Q78 first: **62/62 PASS**; then actual-render coverage added and final classification matrix **26/26 PASS**.
- Full `npm test`: **972/972 PASS**, including eligibility database/security and View-As regressions.
- Existing benchmark: **120/120 deterministic PASS**; prior cases retained. The 82 generation-dispatch fixture cases are local intercepted responses, not new OpenAI generations.
- `npm run lint`: PASS, 0 errors and 10 existing warnings.
- `npx tsc --noEmit --incremental false`: PASS.
- `npm run verify:ai-pdf-server-bundle`: PASS.
- `npm run build`: PASS. Initial compilation succeeded but the sandbox blocked the existing `.next/cache/.tsbuildinfo`; the approved local build retry completed without application changes.
- `git diff --check`: PASS.

Evidence: `docs/lms-0725-classification-{focused,matrix,tests,benchmark,lint,types,pdf,build,diff}.txt`; saved benchmark results remain `docs/lms-0725-eligibility-full-preflight.json`.

## 13. Model calls/cost

**OpenAI calls 0; embedding calls 0; incremental model API cost $0.** No full generated-answer benchmark. Personal data remains outside OpenAI; current deterministic eligibility composition and production gpt-5.5 are unchanged. The model-call and telemetry privacy controls use fixtures.

## 14. No SQL / deployment

No SQL file, function, grant, RLS policy or production data change. No deployment, corpus processing, Approved Answer creation, environment change, rollback or new version. Production retains the previously deployed presentation defect until this correction is separately approved for deployment.

## 15. Controlled production continuation after review

1. Review these exact application changes, classification matrix and preservation of private-history exclusion. Obtain deployment approval; no SQL should be reapplied.
2. Read-only preflight: confirm production deployment, the single existing RF migration, unchanged function/grant/RLS footprint, active policy version, model/config and maintenance baseline. Stop on unexpected drift.
3. Deploy the reviewed application once; verify READY on normal and isolated View-As origins.
4. First replay the failed policy-only question: official Rules label, no Live timestamp, DOCUMENT_ONLY/lwr telemetry, zero SELF audits and zero model calls. Stop before correction on material failure.
5. Replay one personal eligibility question: hybrid only for successful authorized consultation, truthful missing/partial result and consistent metadata. Check exactly one outcome; preserve RF privacy. Verify the genuine Live SELF_RATING contrast and remaining targeted division/PT9/security gates without unnecessary reruns.
6. Perform focused View-As policy-only and personal eligibility controls using effective-user authorization; verify labels and sanitized source telemetry without real-actor substitution.
7. Only after these and all remaining targeted gates pass resume **production Q87–Q89**, not the full benchmark. Preserve cost policy and stop on the first material failure.
8. Complete read-only integrity/telemetry checks and mark LMS-0725 accepted only if all outstanding gates pass. Then the next mandatory item is View-As real LMS UI parity and obsolete mini-LMS removal; do not start it during this correction.

**STOP FOR REVIEW. Q87–Q89 remain paused.**
