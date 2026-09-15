# LMS-0725 / 0.1.547 HTTP 500 diagnosis

**DIAGNOSIS COMPLETE — STOP FOR REVIEW. No correction.** LMS-0725 remains deployed and not production accepted; LMS-0724 is the last accepted baseline. Production benchmark remains 1 failed / 62 not run. No application code, SQL, migration, deployment, corpus, Approved Answer or production record was changed in this diagnosis. No production `/api/ask-lwr` replay was performed.

## Proven primary cause

**Selected-passage/source-binding contract defect in the new policy evidence selector.** `aiPolicyEvidence.js:59` concatenates the stored league heading and a nonadjacent date bullet into a single selected passage. `chosen()` at line 43 places that composite in both `content` and `selectedPassages:[content]`. The existing citation validator correctly requires each passage to occur in the revalidated source chunk. It rejects the composite before model generation.

Exact deterministically reproduced exception:

```text
Error: Selected passage is not present in the revalidated official chunk.
    at trustedSelectedRuleIdentity (app/lib/aiSelectedRuleIdentity.js:15:123)
    at app/lib/aiAnswerGeneration.js:432:182
    at async Promise.all (index 0)
```

The caller is `resolveOfficialSources`, invoked by `generateOfficialAnswer` at line 283. The failing operation is passage-containment validation while constructing trusted citation metadata, specifically rule identity. This is an application/source-normalization defect, not missing source knowledge, a lookup migration error, a model failure or JSON serialization.

**Evidence limit:** The original production log captured only `Ask LWR player answer failed { category: 'Error' }`, HTTP 500 and the correlated quality outcome. The route intentionally discards the exception message/stack at `app/api/ask-lwr/route.js:33`. A fresh historical log query also returned `ExceedsBillingLimitError`; that is a logs API error, not evidence of missing logs. The exact message and stack above come from unchanged deployed-source functions executed locally against the same current source identities/content, not a recovered historical production stack. The reproduction proves the defect for the exact request and evidence, but the original request's individual intermediate steps/rankings were not retained and cannot be represented as directly observed production traces.

## Why the passage fails

Current official chunk `c4ab8544-decb-4ea1-b856-2df4a2d196f1`, page 1, contains:

```text
Weekday DUPR League Key Dates
• Sept. 7, Monday – Open Registration
• Sept. 27, Sunday – Season DUPR ratings recorded
• Sept. 28, Monday - Can start updating rosters
...
```

The selector sends this as ONE passage:

```text
Weekday DUPR League Key Dates
• Sept. 28, Monday - Can start updating rosters
```

Each line is grounded, but their concatenation is not a contiguous source passage: two intervening bullets were removed. Whitespace normalization cannot make the composite match. The validator throws at line 15. The selected Captain Guide unlock passage passes the same check. The security guard is functioning correctly and must be preserved.

## Trace and classification

| Stage | Finding |
|---|---|
| Raw input | `What date can I start entering my roster for weekday league` |
| Interpretation | Standalone question; unchanged effective wording; no prior receipt |
| Semantic intent | `kind: policy_date`, `object: roster`, `event: opening`, `leagues: [weekday]`, no division, `currentDate:false` |
| Operational guards | Raw/effective guards false |
| Live routing | `liveIntent` returns null. No TEAM_ROSTER or other Live capability selected |
| Official path | Normal `/api/ask-lwr`; `playerRetrievalBody` uses `askAbout:all` with authenticated role; explicit Weekday remains in the semantic descriptor/question |
| Retrieval | Original telemetry confirms Stage 3 entered. Local read-only execution of real retrieval succeeded, 32 ranked candidates; policy completion succeeded |
| Date/applicability selection | Local execution selected Weekday opening date and Captain Guide unlock qualification; no team/league clarification |
| Last successful stage in full reproduction | Current version/document/chunk identity/status revalidation; trusted chunks fetched successfully |
| First failing stage | Citation source normalization: `trustedSelectedRuleIdentity` rejects the synthesized date passage |
| Answer generation | `generateOfficialAnswer` was entered, but its answer-model HTTP call is after source validation and was not reached in the reproduction |
| Citation construction | Began; failed during provision identity. No completed validated sources returned |
| Internal answer / serialization | No answer-model result produced. `toPlayerAnswerResult` and success `NextResponse.json` not reached in the reproduced chain |
| Error response | Existing catch sends generic HTTP 500; original player UI displayed only the generic apology |

Normal authentication/authorization had succeeded before the original Stage 3 flag was set. The Commissioner UI is backed by the normal authenticated role path; broad team access never participates in this document-only selector. The failing source check has no requester-role branch. No View-As context was involved (`origin:player_interface`, main LMS origin). The two LMS-0725 lookup functions are not called on this path. Do not revert them to address this defect.

## Active evidence and local read-only retrieval

Current catalog comparison matched all seven diagnosis document IDs, active versions and authority ranks. Exact date and unlock chunk content still matches the original evidence snapshot; both remain searchable.

- **2026 Fall League Important Dates**, active, authority rank 2, document `c6bdcc3b-c009-47c6-9dec-642b8a988a4f`, active ready version `f811e60f-9af8-444f-b009-9594a530acd6`.
- Weekday date chunk `c4ab8544-decb-4ea1-b856-2df4a2d196f1`, page 1, heading Weekday DUPR League Key Dates. Year comes from the 2026 document title; date bullet is September 28.
- **LWR Pickleball Club DUPR Captains Guide**, version `5d1dd639-d77f-4ecc-8d56-14d7f70f491d`, unlock/notification chunk `1b88b1d6-cabd-4aab-ba26-cb0b34aeb1fa`, page 5.

Representative actual local read-only retrieval ranks/scores using the public exact question, current production index and normal retrieval configuration:

| Rank | Candidate | Combined score |
|---|---|---:|
| 1 | Weekday Important Dates, `c4ab8544-decb-4ea1-b856-2df4a2d196f1` | .7076 |
| 2 | PrimeTime Important Dates, `950a54ab-aa3b-4f43-9c51-88ce0ca803ae` | .7029 |
| 3 | Saturday Important Dates, `f9f05921-2ee9-46fc-9b44-e5a861d7dd6f` | .6741 |
| 4 | Captains Guide roster policy, `c524d6d2-34d8-41ed-8fd6-40cf4c5e0e09` | .6708 |
| 5 | Captains Guide, `fb919a5a-ae9f-4fcf-afa4-409e656a8ee1` | .6508 |
| 6 | League Rules, `80d9c2f5-8b5d-4009-b00c-04e116f84b5f` | .6357 |

These are **new local diagnostic ranks, not the original production request's retained rankings**. Cross-league candidates in retrieval are not selected-answer leakage: the date selector kept Weekday plus the general unlock qualification. Structural completion supplied that qualification independently of the first eight ranked chunks. Result classification: **SOURCE FOUND, downstream source-validation failure**.

The local retrieval used the actual `retrieveOfficialEvidence`, one `text-embedding-3-small` embedding (1536 dimensions), and the existing read-only `search_ai_official_chunks` function. A request allowlist blocked unrelated methods/endpoints, Live RPCs and telemetry writes. It did not invoke an answer model or change the index. The local env omitted LWR_AI_ENABLED, so the diagnostic process set it to true to match the enabled production feature; no environment file or production configuration was edited.

A second, full caller-chain reproduction used existing snapshot passages with unchanged identities and current source/version metadata from REST GETs. It called the real `runPlayerOfficialAnswer` → `generateOfficialAnswer` → `resolveOfficialSources` → `trustedSelectedRuleIdentity`. Only Storage signing was replaced by a local placeholder and model HTTP by a sentinel; the sentinel recorded **zero calls**. No signed URL or protected value was exported. This isolates the failing guard without another embedding or production answer request.

## Local versus production and affected scope

There is no demonstrated corpus drift or special production-only nullable metadata difference. The minimum meaningful difference is **validation coverage**: LMS-0725's new selector tests assert dates, qualifications, bounded scope and selected text, but do not send those selections through the real trusted-source resolver. Existing citation tests and new selector tests passed separately. Combining the two existing contracts exposes the bug. Local 63/63 routing was true but did not establish end-to-end production answer correctness.

Offline selected-passage validation against the unchanged official snapshot:

| Control | Routing / source binding |
|---|---|
| Exact blocker | Document; date passage rejected |
| when can I start entering my players for my team | Document; all three composite date passages rejected |
| When can I start entering my roster? | Document; all three composite date passages rejected |
| When does roster entry open? | Document; all three composite date passages rejected |
| When can I start entering my PrimeTime roster? | Document; PrimeTime composite rejected |
| When can I start entering my Saturday roster? | Document; Saturday composite rejected |
| Who is on my roster? | TEAM_ROSTER; policy selector not applicable |
| How do I enter players on my roster? | Document; both selected procedure chunks pass this guard |
| Does the Weekday DUPR League use Rally Scoring? | Document; scoped exception composite rejected |
| Does Saturday use Rally Scoring? | Document; two scoped format composites rejected |
| Does PrimeTime use Rally Scoring? | Document; two scoped exception composites rejected |
| How does Rally Scoring work? | Legacy mechanics path; new policy selector not applicable |

Scoring shares the same primary cause: `aiPolicyEvidence.js:89–90` prepends synthesized league/division labels to per-chunk rule parts and sometimes merges noncontiguous text into one passage. This also violates per-chunk containment. Scope is therefore broader than roster dates, covering new structural-completion selections that reconstruct source text. It is not proven to affect every policy/date question, every scoped document question or all document answers. Procedures that select full original chunks and untouched mechanics/Live paths do not exhibit this specific defect. These are offline scope checks, not additional production benchmark results.

## Telemetry, timing and privacy

The preserved original outcome is `technical_error`, `stage3_invoked:true`, `origin:player_interface`, version LMS-0725, feedback ineligible. Started 12:42:12.694 UTC, completed 12:42:15.461 UTC: **2,767 ms**. No successful-answer event was created for this request; the single failed outcome remains historical evidence.

Crucial limitation: `observeQualityRequest` catches a rejected run without an `execution` object and builds a default technical-error snapshot. Thus candidateCount 0, selected evidence 0, source family none and null model/embedding fields **do not prove retrieval returned zero candidates or identify the last successful stage**. That corrects any inference from those defaults in the initial acceptance discussion. The exact production timing subdivisions and intermediate candidate list were not persisted.

The reproduced failure occurs after embedding/retrieval/source metadata reads and before answer-model work. Local real-retrieval metrics: interpretation 3.052 ms, embedding 1,851 ms, retrieval 1,497 ms; policy completion's four REST reads took approximately 117 + 123 + 58 + 56 ms in the request trace. These are local observations, not a breakdown of the original 2,767 ms. The stored retrieval metrics are constructed before policy completion, so their total is not a full response-processing total. No production per-stage durations are invented. Local source-validation reproduction completed without model calls; original provider counters remain unavailable, while deterministic code ordering explains why this exception precedes the answer model.

Player-facing failure contains no stack, DB details, environment values, credentials, internal source IDs or member data. Production logging preserves only the error category; diagnosis outputs contain public-policy wording and official document identity, not credentials or member data. Normal account role/access and the lookup migration are not implicated.

## Smallest safe correction — recommendation only

Preserve source binding. Correct the new policy selector to retain **exact per-chunk source excerpts in `selectedPassages`** and derive `content` from those validated excerpts. Keep verified league/division/date context in separately bound metadata or independently valid source excerpts; do not prepend invented structural text to a chunk's claimed verbatim passage. For roster dates, keep the exact date bullet and trusted heading metadata rather than one synthetic heading-plus-bullet passage. Apply the same generic contract to scoring defaults, scoped exceptions and adjacent chunks.

Do not bypass `trustedSelectedRuleIdentity`, suppress its exception into an unsupported answer, hardcode a date/question, weaken authorization, edit documents or touch the lookup migration. A bounded safe error-stage code could improve future diagnostics, but is not required to fix the passage contract and must never log raw protected requests/provider credentials.

## Regression and production continuation recommendation

1. After correction authorization, add a failing end-to-end source-contract regression for the exact blocker before changing the selector. Run the real selector AND real source normalization with production-format metadata; a stubbed resolver cannot satisfy this gate.
2. Include all six roster variants above, equal-date direct answer, diverging-date clarification, explicit league scope, now/yet and procedure controls. Validate each selected passage against its actual source chunk and verify final citation construction/serialization.
3. Include Weekday/Saturday/PrimeTime default/exception controls, cross-page Rule 5.3, 9.1 Picklebreaker limits, no mechanics-as-applicability, no cross-league leakage and serving-to-win qualifications. Keep foreign scope labels out of selected source text.
4. Preserve legitimate TEAM_ROSTER routing, all 63 routing cases, existing document/Live/View-As regressions, encrypted choices/reset/refetch and zero deterministic Live model/embedding calls. Run the required full tests/lint/typecheck/PDF bundle/build/diff checks.
5. Review the bounded correction and evidence before redeploying the same LMS-0725 / 0.1.547. No SQL or corpus change is proposed. Do not reapply the already recorded migration.
6. Following explicit release continuation authorization, replay the exact blocker once and inspect date, scope, sources and citations. Only if it passes continue the second natural wording, third Rally question, DUPR and remaining prescribed acceptance sequence. Retain the original failed production row; record the subsequent run separately. Complete overhead/accessibility/security/integrity gates before acceptance.

**Rollback is not recommended on present evidence.** This is a fail-closed Ask LWR source-contract failure; no security/privacy/data-integrity risk or normal non-AI workflow breakage has been established. No rollback, correction, deployment or new version was performed. View-As UI parity remains deferred. Stop for review.
