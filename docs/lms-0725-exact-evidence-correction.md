# LMS-0725 / 0.1.547 — exact-evidence correction

**Subsequent authorized validation:** [42-call model run and remaining failures](lms-0725-authorized-model-validation.md). The prior OpenAI permission block is superseded. Q57 exposes a legacy source-fidelity failure; full quality acceptance remains incomplete. This report below preserves the earlier local implementation record.

September 8, 2026. **Implemented locally; STOP BEFORE PRODUCTION.** No deployment, SQL, corpus changes, Approved Answer, rollback, HMAC change or View-As UI parity work. LMS-0725 remains deployed but not production accepted. LMS-0724 / 0.1.546 remains the last accepted baseline.

## Result and limits

The reproduced synthetic-passage failure is corrected: exact roster-date and scoring selections independently pass the unchanged source validator. The full local suite passes **820/820**, including authorization, View-As, citation, history and feedback regressions. The focused evidence-fidelity suite passes **70/70**.

The exact blocker passes through the real local selection, source resolution, generation dispatch, result/citation serialization, Stage 7 and feedback functions with a deterministic model fixture. Its fixture answer is: “You can start updating your Weekday roster on September 28, 2026. League Management will notify you when rosters are unlocked.” This is an integration result, **not a newly observed live model answer**.

The 63-case routing/source-gate audit passes its assertions, with actual source validation in all 44 cases that select document evidence. It does not establish 63 correct generated answers. Q29 (match score entry) and Q46 (Picklebreaker mechanics) select no evidence in the constant-score snapshot and need actual retrieval/generation verification; Q48 correctly requires scoring-method clarification. No unrelated retrieval behavior was changed to force those fixtures to pass. [Per-case coverage](lms-0725-correction-benchmark.md).

A bounded four-question local OpenAI check was prepared, using only saved official excerpts, the actual generation function, fixture metadata/signing and `store:false`, with no production application/SQL/telemetry access. The sandbox request failed before a response. Automatic approval review rejected escalation because sending saved non-public official excerpts to OpenAI lacked explicit authorization for that payload and destination. No successful live model result was obtained, and no bypass was attempted. Live generated-answer quality remains pending explicit authorization.

## Exact files changed for this correction

All application paths below are relative to `lwrpc-admin/`. Earlier LMS-0724/LMS-0725 changes already present in the working tree remain separate; this is not a list of the entire dirty tree.

| File | Correction |
|---|---|
| `app/lib/aiEvidenceExcerpts.js` (new) | Exact ranges, independent revalidation, bound scope metadata, deduplication and safe trace references |
| `app/lib/aiPolicyEvidence.js` | Roster date lines and scoring clause parts retained separately; exact heading bindings outside source text; deterministic ordering |
| `app/lib/aiAnswerGeneration.js` | Batched scope-anchor revalidation; per-version signing reuse; structured model evidence and contract |
| `app/lib/aiPassageContinuations.js` | Preserve structured cross-chunk parts; feed item-specific scope into existing conflict detection |
| `app/lib/aiConversation.js` | Excerpt references in existing encrypted source/evidence receipts |
| `app/lib/aiQualitySnapshots.js` | Excerpt references in existing Stage 7 JSON snapshots |
| `app/lib/askLwrPlayerAnswer.js` | Safe excerpt references in source response; existing opaque viewer links retained |
| `test/lms0725EvidenceFidelity.test.mjs` (new) | Blocker pipeline, A–G fidelity cases, 63-case gate coverage, scope/conflict/order/continuation/serialization checks |
| `scripts/lms0725-evidence-audit.mjs` (new) | Reproducible offline trace/timing audit; explicit opt-in provider mode, not successfully executed |

Documentation added: this report, `lms-0725-correction-benchmark.md`, `lms-0725-correction-audit.json`, `lms-0725-fidelity-test-output.txt`, and correction-prefixed test/lint/typecheck/PDF/build/provider-output logs. `docs/project-roadmap.md` records current status and preserves the mandatory deferred View-As parity item.

No change to `app/lib/aiSelectedRuleIdentity.js`, version number, SQL, schema, authorization or UI markup.

## Representation and source fidelity

**Before:** the date selector represented a heading plus a nonadjacent bullet as one selected passage. Scoring selections similarly inserted scope labels and combined disjoint text. The validator correctly rejected these as nonexistent passages.

**After:** at most four source containers hold separately ordered `excerptItems`. Each item has exact `text`, chunk/version identity, UTF-16 `start` and exclusive `end`, independently validated page/rule identity, separate `applicability`, and exact source-range `scopeBindings`. Same-chunk nonadjacent ranges stay separate. Identical range/metadata items deduplicate; conflicting metadata for one range fails. Scoring has a total 16-item cap. Each container has a 16-item defensive bound.

The compatibility `content` field is only a selection envelope over `selectedPassages`. It is never sent as one verbatim structured excerpt. Every new item must satisfy **stored chunk slice(start,end) === text**, in addition to the existing passage validator. The latter is unchanged, including its legacy whitespace normalization and provision fallback behavior. Derived labels never enter this exact-text comparison.

League/division scope bindings must resolve to searchable chunks in the same revalidated active version, with valid exact bounds and matching structural labels. Full hierarchy selection is performed deterministically from the authoritative numbered structure. Source identities come from revalidated records, not model output. Existing Approved Answer provenance remains separate.

Structured policy parts already include cross-chunk continuations, so legacy text completion cannot trim/recombine them. Competing target claims still use the conflict guard, with item-specific league/division scope. Reversed input order yields identical selections. Weekday 8.1 never inherits the 9.1 Picklebreaker.

## Before/after blocker

Question: `What date can I start entering my roster for weekday league`

Before edits, the unchanged selector and real validator reproduced `Selected passage is not present in the revalidated official chunk.` at `aiSelectedRuleIdentity.js:15:123`, with model calls **0**. This matches the accepted diagnosis; it is not a recovered production stack trace.

After edits: document policy/date route; Weekday metadata; two source containers/two exact items; both validate; model fixture invoked **once only after validation**; result `answer`; valid date/guide citations and opaque viewer paths; Stage 7 `answer`, selected source count 2; encrypted receipt decodes to the actual excerpt references. Invalid injected text/range/scope still throws before model dispatch, with calls **0**.

The production HTTP 500 record remains untouched: first acceptance attempt failed, and the other 62 production cases have not been replayed.

## Roster evidence

| Item | Exact identity and range | Evidence and scope |
|---|---|---|
| Opening | Document `c6bdcc3b-c009-47c6-9dec-642b8a988a4f`; version `f811e60f-9af8-444f-b009-9594a530acd6`; chunk `c4ab8544-decb-4ea1-b856-2df4a2d196f1`; page 1; [118,165) | Exact bullet `• Sept. 28, Monday - Can start updating rosters`; `league=weekday`, role `opening_date`; Weekday heading has a separately verified range binding |
| Unlock qualification | Version `5d1dd639-d77f-4ecc-8d56-14d7f70f491d`; chunk `1b88b1d6-cabd-4aab-ba26-cb0b34aeb1fa`; page 5; [0,1084) | Exact Captain Guide passage, including League Management notification when rosters are unlocked; no claim that this user's team is currently unlocked |

The active document title supplies year 2026. Generic roster-opening variants retain all three league dates when the published facts agree, plus the guide qualification, within four containers. Explicit Weekday/Saturday/PrimeTime questions retain only their league. `Who is on my roster?` remains Live `TEAM_ROSTER`.

## Scoring evidence and citations

All examples use rules version `5e8efa91-4f6c-47eb-9747-b122f0ebf656`. The audit JSON contains every chunk ID, exact text, range, page/provision, applicability and scope binding.

| Scope | Separate exact items | Containers/items |
|---|---|---|
| Common default | Page 4 [896,1067), Rule 5.3 start; page 5 [0,124), its continuation: Standard default and express-Rally-only condition | 2/2 |
| Weekday | Default plus page 8 [0,484), Rule 6.1.9.7: 9.1 Picklebreaker, only at 2–2, Rally exception | 3/3 |
| Saturday | Default plus page 9 [43,337), Rule 6.2.3.1; page 9 [761,925), Rule 6.2.3.5; page 10 [0,714) continuation, including 12–12/tie and format qualifications | 4/5 |
| PrimeTime | Default plus page 12 [0,162) and page 13 [0,319), Rule 6.3.6 parts, including 2–2 and scoped Picklebreaker conditions | 4/4 |

Saturday page 9 is the critical same-chunk/nonadjacent case: **two independent items, never one fake passage**. Citation generation retains the exact page and selected numbered provisions, including both page-9 rules. For unnumbered cross-page continuation text, the unchanged validator retains the stored parent-rule fallback; exact version/chunk/range identities distinguish its provenance. No model-authored rule identity is accepted.

The existing Official Sources panel attaches server-validated citations to the answer. The model is still prohibited from fabricating inline source labels or links. Each item in the model input has `sourceText`, `sourceIdentity` (document/version/chunk/range/page/rule), `derivedApplicability`, and `scopeBindings`. Instructions explicitly distinguish quotations from metadata and require default/exception scope and material conditions across multiple items.

## Fidelity, privacy and model-call matrix

| Test | Result |
|---|---|
| A: one contiguous excerpt | PASS |
| B: two nonadjacent same-chunk excerpts, separately bound | PASS |
| C: separate chunks independently bound | PASS |
| D: synthetic heading + date treated as one passage | Correctly rejected |
| E: inserted scope label treated as source prose | Correctly rejected |
| F: separate scope metadata with verified heading binding | PASS; wrong scope rejected |
| G: multi-excerpt pipeline, model fixture, correct source citations | PASS; live-model answer review pending |
| Altered offsets/content or mismatched scope | Rejected before model; 0 model calls |
| Reversed source order, identical deduplication | PASS |
| Structured continuation preservation; same-scope conflict | PASS |
| Legacy source shapes and historical viewer identity | Preserved; regression suite PASS |
| Stage 7 + feedback source/evidence serialization | PASS; only bounded range/provenance references, no copied source prose or Storage URLs |
| LMS-0723/LMS-0724 authorization, mutation blocking and isolation | Full existing local regression suite PASS |

Source references are stored in existing JSON payloads; no database columns or RPC contracts change. Approved Answer identities are preserved separately. Feedback remains correlated to the actual answer/evidence set. Public response references are allowlisted official-document identities, never member identities or credentials. Historical records lacking `excerptItems` keep their prior shape.

**Cross-League Leakage = 0 in the local selector/scope assertions. Material qualifications omitted = 0 in selected evidence assertions.** These are not claims about unobserved production or live model answers. Live deterministic paths remain unchanged and local regressions pass; the production zero-model/zero-embedding gate still needs acceptance evidence.

## Performance and validation

Thirty warmups and 300 alternating in-memory runs compare the same valid selection with legacy passage representation versus separate excerpts. Includes source revalidation, citation/signing fixture and JSON packaging, excludes network and model latency:

- Legacy: median 0.775 ms, p95 1.144 ms.
- Separate excerpts: median 0.896 ms, p95 1.386 ms.
- Observed median increase: **0.122 ms**; p95 difference 0.242 ms. Microbenchmark, not a production latency estimate.
- Still two batched metadata reads. Scope-anchor IDs join the existing chunk read. Signing is reused once per version: roster 2 versions/2 sign calls; each scoring example 1 version/1 sign call. No PDF parsing or extra embedding calls added by this correction.

| Required check | Result |
|---|---|
| `npm test` | PASS: 820 tests, 0 failures |
| Source fidelity suite | PASS: 70 tests, 0 failures |
| 63-case audit | PASS routing/gate assertions; answer-quality coverage limits above |
| `npm run lint` | PASS: 0 errors, 7 existing warnings |
| `npx tsc --noEmit --incremental false` | PASS |
| `npm run verify:ai-pdf-server-bundle` | PASS |
| `npm run build` | PASS after deleting one generated `.next/cache/.tsbuildinfo` file with stale write permissions; no source/configuration workaround |
| `git diff --check` | PASS |
| Desktop/mobile | Not rerun: no response/source UI markup or layout change in this correction |
| Live grounded model check | BLOCKED by automatic approval review; no successful provider response |

## SQL and proposed production continuation — not executed

**No SQL is required. Do not reapply the existing migration.** Its production history remains `20260908123627`, applied once; the application correction does not change it.

1. Review this exact correction and its coverage limits. If explicitly authorized, run the prepared local OpenAI checks with the saved official excerpts and inspect actual date, default/exception, tie, winning-point and citation results. Resolve any failure before deployment. Complete actual retrieval/generation coverage for Q29/Q46 and the full answer-quality benchmark; do not substitute constant-score fixture results.
2. Obtain separate controlled production deployment/acceptance approval. Keep version 0.1.547. Record reviewed application diff and current deployment/aliases; confirm existing SQL migration remains applied exactly once and maintenance remains healthy, without altering either.
3. Deploy the reviewed application correction once to the existing Vercel project. Confirm READY and both `league.lwrpickleballclub.com` and `view-as.lwrpickleballclub.com` point to that deployment. No SQL, environment-key, corpus or Approved Answer changes.
4. Start production acceptance with the exact roster blocker once. Require successful answer, September 28, 2026, Weekday scope, unlock qualification, correct active date/guide citations and no HTTP 500. Correlate the new Stage 7 outcome and source references. Stop on failure; report before correction, retry or rollback.
5. Only after that passes, run the complete 63-question production matrix and the required roster natural variants/scoring default/exception/mechanics controls, DUPR clarification/typed choices/reset/refetch controls, deterministic Live zero-model/zero-embedding checks, and Stage 7/feedback/history correlation.
6. Verify LMS-0723 authorization and LMS-0724 View-As security/target-effective document behavior, read-only banner/Exit, feedback-disabled View-As behavior, normal-session independence, dedicated-origin isolation and maintenance. Finish the pending desktop/390px/320px/accessibility gates and compare measured request overhead against the accepted baseline. Preserve privacy and avoid manufactured operational data.
7. Check source/corpus/Approved Answer/HMAC metadata and migration-count integrity; record exact deployment and acceptance results. Mark LMS-0725 production accepted only after every required gate passes.
8. Only then begin the separately recorded mandatory **one LMS UI under normal or secure target-effective View-As context** parity/cleanup item. No parity implementation belongs in this correction.
