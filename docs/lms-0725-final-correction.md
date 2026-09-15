# LMS-0725 / 0.1.547 — final evidence-fidelity and completeness correction

September 8, 2026. **LOCAL CORRECTION AND MODEL VALIDATION PASS — STOP FOR REVIEW.** No deployment, production mutation/SQL, document reprocessing, Approved Answer, model/configuration change or View-As parity work was performed. The deployed LMS-0725 is still **NOT production accepted**; LMS-0724 / 0.1.546 remains the last accepted release.

The [prior authorized validation report](lms-0725-authorized-model-validation.md) remains the historical failure matrix. This report records the correction, including intermediate failures rather than treating every attempted run as a pass. [All final questions, generated answers and citations](lms-0725-final-model-matrix.md), [exact raw results](lms-0725-final-full-model-results.json), and [counts/quality audit](lms-0725-final-results-audit.json) accompany it.

## 1. Q57 exact root cause and corrected trace

Question: `When are Season DUPR ratings recorded for Saturday?` Intent is a Season DUPR recording **policy date**, scoped to Saturday, not a Live player rating.

The prior 67-chunk snapshot already contained the correct candidate: document `c6bdcc3b-c009-47c6-9dec-642b8a988a4f`, active version `f811e60f-9af8-444f-b009-9594a530acd6`, chunk `f9f05921-2ee9-46fc-9b44-e5a861d7dd6f`, page 1, **2026 Fall League Important Dates**. It contains the league heading, then the September 7 registration bullet, then the September 27 rating bullet.

The old path was `selectAnswerEvidence` → `seasonRatingDatePassages` → `evidencePassages` in `app/lib/aiQuestionApplicability.js`. `evidencePassages` constructed `Saturday DUPR League Key Dates` + newline + the nonadjacent rating bullet, omitting the intervening registration bullet. `trustedSelectedRuleIdentity` accepted that nonexistent contiguous passage through its fallback to reconstructed `evidencePassages(stored)`. The model received the synthetic unit and answered the correct day/month without the year; the citation pointed to the correct document/page. Correct component words and a correct citation did not make the excerpt real.

This differed from the already corrected roster/scoring path through `aiPolicyEvidence` / `excerptSelection`: rating dates still entered the older generic selector and compatibility validator.

The final path uses bounded active policy evidence → exact rating-date selection → `resolveOfficialSources` → shared excerpt revalidation → structured model source items. Exact UTF-16 half-open ranges are:

| Role | Range in the same chunk | Exact source content |
|---|---|---|
| League scope binding, outside source text | `[0,30)` | `Saturday DUPR League Key Dates` |
| Recording-date excerpt | `[69,118)` | `• Sept. 27, Sunday – Season DUPR ratings recorded` |

The model receives that bullet as `sourceText`, its chunk/version/range/page identity, verified Saturday scope with the separate heading binding, and a calendar year derived from the revalidated document title. It never receives the heading and bullet as a fabricated continuous quote. Final Q57: **“For the 2026 Fall Saturday DUPR League, Season DUPR ratings are recorded on Sept. 27, 2026, Sunday.”** Official Sources displays the dates document, Saturday heading, page 1; the stored citation item retains both the exact bullet range and scope provenance.

## 2. Bounded synthetic-construction review

| Construction path inspected | Finding and final boundary |
|---|---|
| `aiQuestionApplicability.evidencePassages` | Removed synthetic heading/date construction and nonadjacent parent/list-child concatenation. Numbered colon families retain original contiguous slices and separators. Governing parents for later children are separate exact items. |
| `aiPolicyEvidence` dates and default/exception parser | Source parts stay separate by chunk/range. League/division headings are verified metadata bindings. Default and exception prose is never invented as one quotation. Parsing/joins are temporary selection envelopes; every final item must match the original stored range. |
| `aiAnswerGeneration` generic, compound, medical/roster/rating selectors | Their joined compatibility `content` is an envelope, not the model's source quote. The shared source resolver binds each selected passage independently before dispatch. |
| `aiMaterialQualifications` and generic deduplication | Related qualifications can share an envelope, but retain separate passages/ranges. Deduplication now requires matching chunk/version and exact selected content; similar subject matter or punctuation-stripped wording cannot discard a distinct source requirement. |
| `aiOfficialApplicability`, table/format selection | No separate table-cell-to-sentence source synthesizer found. Original table/format blocks retain labels, rows, columns and text order. Numbered format relationships are separately bound league/division metadata. |
| `aiPassageContinuations` | Adjacent chunks remain separate items. Incomplete tails may only be literal slices; no inferred connective text. Rally mechanics now includes the verified same-version adjacent continuation and preserves its identity. |
| `aiApprovedRelatedEvidence` / `aiApprovedSourceBinding` | Formal related passages are exact source substrings and now traverse the shared formal-excerpt gate. Existing managed Approved Answer revision/hash provenance remains separate; none was created or modified. |
| PDF extraction and question matching | See normalization boundary below. Matching normalization does not become source text. Derived year/date labels stay outside the exact excerpt. |

A table regression preserves the entire original header/rows/cells with CRLF, and rejects an invented “row requires value” sentence. If elements occupy disjoint ranges, they must be separate items with separately verified structural context; being in one chunk does not establish adjacency. This correction does not introduce a new table reconstruction format.

## 3. Shared representation and validator

`aiEvidenceExcerpts.js` provides `excerptSelection`, `bindOfficialExcerpts`, `revalidateExcerptItems`, and `excerptReferences`. Every formal generation source uses independent text + version/chunk + start/end + page/provision + applicability/scope bindings. Document identity/type/authority remains attached to the source container. Four source containers remain the external bound; at most 16 excerpts per container, with the existing stricter aggregate budget for scoped-format selection. The final benchmark uses at most four containers / 12 items per answer.

The gate validates active/ready document ownership and searchable version/chunk identity, literal text at its exact range, allowed metadata and independently fetched scope bindings. Citation document/page/heading/rule comes from revalidated source data. The old reconstructed-unit fallback is removed. Synthetic text fails even when all its words appear elsewhere in the chunk; normalized or rearranged prose fails. Metadata-only historical source viewing remains compatible without treating absent text as a generation excerpt.

The already approved PDF extraction boundary is unchanged: PDF-layout assembly, unusual spaces/zero-width artifacts, supported bullets, soft-hyphen handling and established ligature repair occur **before chunk storage**. Stored `ai_document_chunks.content` is the exact-text truth thereafter. No semantic rewrite or whitespace-compaction substitute is accepted as an excerpt. Compact comparison of the compatibility envelope only checks that it corresponds to its selected passages; each passage must still pass literal validation independently.

The global snapshot regression checks every extracted unit from all 108 current bounded official chunks. Tampered range, version, heading scope, nonadjacent text and nonexistent excerpts are covered by the fidelity tests. Exact references continue into existing Stage 7/history/feedback JSON; no schema extension is required.

## 4. Years, policy dates and current date

The previous year omissions were generation-contract gaps: day/month was present in exact dates text and `2026` in the source title, but the answer omitted the year. Q57 additionally had the synthetic-excerpt failure. No missing official date was discovered for these cases.

`officialDocumentPeriod` keeps the original title/season label and exposes a calendar year only when one unambiguous full year occurs with no season-range syntax. Its derivation is explicitly `revalidated_active_document_title`. `2026 Fall Season` retains 2026; `26/27 Saturday Season`, `2026–27`, and `2026-2027` retain their labels and do not silently become a single calendar year. Missing/ambiguous years remain unknown.

The contract requires an evidence/verified-metadata year for date answers, never a year guessed from conversation or today. Deterministic roster calendar comparison remains separate, uses America/New_York, and reports `undetermined` when the calendar year is unavailable. Q19 explains the calendar opening without claiming to inspect team unlock or eligibility. All 17 final roster-date variants and Q54/Q55/Q57 include the relevant 2026 wording.

## 5. Proven evidence-gap classifications

A bounded **read-only** production lookup verified the current active official sources and saved [108 source chunks](lms-0725-current-official-evidence.json): 69 league-rule chunks, 3 dates chunks, and 18 chunks from each of two captain guides. The older 67-row snapshot remains unchanged for historical evidence. No member, roster or other Live rows were fetched. Current active versions were checked again during final validation.

| Cases | Classification | Proof and correction |
|---|---|---|
| Q11 | **F — clarification precedence** | Temporal “when can/may I add players” was mistaken for an unspecified roster-versus-lineup procedure. It now takes natural roster policy/date behavior. Genuine object ambiguity such as “When do I start adding players” and other combined authorization-aware choices remain tested. |
| Q29 | **B — outside the old saved candidate set** | Current LMS Guide page 13 (`1859086d…`) and DUPR Captains Guide page 9 (`59c3658b…`) contain score-entry steps, availability, blocks, cancellations and verification. Bounded guide completion now supplies them. |
| Q46 | **D — wrong applicability rejection**, plus **B** continuation coverage | Unscoped “Rally Scoring in a Picklebreaker” was rejected as a format question. It is mechanics, conditional on a Picklebreaker using Rally. The Rally bullets and verified next chunk supply freeze/unfreeze and serving qualifications without claiming every Picklebreaker uses Rally. |
| Q54–Q56 | **B — broader rule missing from old candidate set** | Rule 4 chunk `14555428…`, page 3, supplies 4.1 establishment, 4.1.1 reliability, 4.2 truncation and 4.3 age-based rules. Rules 4.5.1/4.5.2 alone were insufficient. General calculation now requires the base method before generating. |
| Q57 | **F — synthetic representation/validator compatibility** | Correct bullet was already available; source text was reconstructed incorrectly. Shared exact ranges fix it. |
| Year omission cases | **F — generation/metadata contract** | Correct period title existed; explicit grounded-year metadata and generation obligation fix prose omission. |

**No genuine official-source gap (E) remains for these failed benchmark cases.** This does not claim that every future question has official coverage. A missing base method/continuation, unavailable completion read or conflicting/budget-exceeding relevant evidence fails closed.

Rules and dates retained their previous active versions. The guides were already on newer active versions when read: DUPR guide `816a2cd7-d0c9-4c27-b41a-90eccc39cc9b`; LMS guide `7ec16cf5-7b9d-4b3b-a847-8dd5767396c7`. This correction did not upload, activate or reprocess them. Rules version: `5e8efa91-4f6c-47eb-9747-b122f0ebf656`; dates version: `f811e60f-9af8-444f-b009-9594a530acd6`.

## 6. Material completeness and generation contract

Absent evidence was fixed in selection/completion, not delegated to model inference. When evidence was present but omitted, the shared contract was strengthened generically:

- Preserve every distinct directly applicable requirement, including prerequisite, blocked action, responsible actor and required follow-up timing; compare requirement items to the answer before returning.
- State the named governing default for general applicability questions, together with material scoped exceptions and tie/game/division limits.
- Preserve grounded dates/periods, winning-point qualifications and full freeze/unfreeze mechanics.
- Do not transfer a neighboring condition to another provision without a verified scope relationship.
- Do not treat NR/multi-division special cases as a complete general rating method or establishment date.

No benchmark answer sentence is hardcoded in application behavior. Requirement/period roles are structural metadata, not invented source prose. Existing redundancy controls remain, but distinct material source ranges are not discarded as equivalent merely because they discuss the same subject.

Intermediate generated omissions were diagnosed explicitly. The first failed-case pass omitted Q29 eligibility blocking even though its guide contained it. A later Q56 answer added “as an NR/adjusted player” to the separate multi-division clause; condition isolation was strengthened. The first full run omitted Q29's visiting-captain prompt/weekend verification requirement and Q42's explicit Standard Scoring name. Both were in the selected evidence, so actor/timing completeness and named-default generation instructions were strengthened, then those cases were rechecked before the final full run.

## 7. Failed-first sequence, full run and privacy

| Run | Calls | Result/action |
|---|---:|---|
| Initial failed cases | 12 | Stopped at Q46 checker rejection. “Unfrozen” was a checker false negative; manual Q29 review found a real omitted eligibility condition. Diagnosed before proceeding. |
| Corrected failed-case set | 16 | Automated checks passed; manual Q56 review prompted the condition-isolation correction. |
| Q56 focused recheck | 1 | Passed after that correction. All original failed cases then passed. |
| First complete run | 45 | 63 routes matched; detailed review found Q29 follow-up timing and Q42 named-default omissions. Not certified as complete. |
| Q29 / Q42 focused rechecks | 2 | Both passed after the shared contract correction. |
| Final complete run | 45 | **45/45 generated answers pass**, **63/63 routes pass**. |
| **This correction total** | **121** | Prior 42-call validation is separate, not included. |

The final 63 cases comprise 45 generated, 16 deterministic Live/protected, and 2 local clarifications. The 18 no-model cases made zero answer-model calls; embeddings were zero throughout the harness. Final answers use **143 source containers / 203 exact items**, with identical item sets in displayed-source records. Final input/output usage: **109,247 / 5,809 tokens**. All correction runs combined: **283,768 / 15,113 tokens**; existing integration cost estimate **$1.87223**, not a provider billing statement.

All calls used existing configured `gpt-5.5` (provider returned `gpt-5.5-2026-04-23`), existing Responses endpoint and `store:false`. Only benchmark question, bounded exact official text, minimum identity/verified applicability/period metadata and the existing generation contract were sent. Final maximum source text: 2,204 characters; maximum question/evidence input: 7,605 characters, excluding the common instruction contract. No entire PDFs/corpus were sent. The public organizational contact in the official score guide is permitted; no member email or Live LMS data was included.

The API key was used only for normal HTTPS authentication, never as model input or in logs. No credential/model/env change, embeddings, production answer endpoint, feedback mutation, new destination or external evidence store was used. Results preserve responses, range references and lengths/hashes, not complete outbound request payloads. Intermediate run files are retained in the [call ledger](lms-0725-final-results-audit.json).

## 8. Exact required answers and quality gates

Q07 — `What date can I start entering my roster for weekday league`:

> For the 2026 Fall Weekday DUPR League, you can start updating/entering rosters on Monday, Sept. 28, 2026, once League Management has unlocked rosters and notified you they are available.

Dates page 1 plus the captain-guide unlock qualification validate as exact separate sources. The real local source-resolution/generation path completes without the prior source exception. The service/Stage 7/feedback regression also completes and serializes successfully. This is **not** a claim that a fresh production HTTP request has been replayed or that production's HTTP 500 is accepted as fixed.

Q08 — `when can I start entering my players for my team` — naturally answers September 28, 2026 for all three applicable leagues, with team activation/unlock notification, without asking an unnecessary clarification or assuming the user's team state.

Q30 — `Does the weekday dupr league use rally scoring`:

> No, not generally. The weekday DUPR league’s governing default scoring method is Standard Scoring under the current USA Pickleball rules unless a game or match format expressly requires Rally Scoring.
>
> The supplied exception is limited to the weekday 9.1 division Picklebreaker™ only: if the match is tied 2–2 after the preceding rounds, that Picklebreaker™ is one game to 15, win by 2, using Rally Scoring.

Citations cover Rule 5.3 on page 4, its page 5 continuation (existing parent Rule 5 label), and Rule 6.1.9.7 on page 8. No mechanics-only passage is used to establish applicability. Saturday and PrimeTime retain their own formats; Weekday 8.1 does not inherit the 9.1 exception. General Rally mechanics retains the always-serving game-winning-point requirement.

| Final observed gate | Result |
|---|---:|
| Routing | **63/63 PASS** |
| Generated answers / literal source fidelity / matching citation item sets | **45/45 PASS each** |
| Cross-League Leakage | **0** |
| Synthetic source excerpts accepted | **0** |
| Mechanics-as-applicability errors | **0** |
| Material qualifications omitted | **0** |
| Unsupported grounded answers | **0** |
| Incorrect grounded years | **0** |
| Known evidence-completeness failures | **0** |
| Production acceptance | **NOT RUN / NOT ACCEPTED** |

These are observed gates from the final bounded benchmark, supported by manual proposition review and deterministic source/route assertions. Fixture ranking is constant; metadata/signing uses an in-memory replica of the read-only snapshot. This is not production retrieval ranking/latency, browser PDF rendering, a production Stage 7 replay, or a guarantee that future stochastic answers cannot omit something.

## 9. Performance

[Reproducible offline measurements](lms-0725-final-performance.json): 20 warmups and 200 samples per question, current 108-chunk snapshot, actual selectors/source resolver/generation preparation, no network/model. Values below are median milliseconds; the JSON also records p95.

| Question family | Selection | Source validation | Model preparation residual | Total before dispatch |
|---|---:|---:|---:|---:|
| Exact roster date | 1.092 | 0.457 | 7.295 | 8.893 |
| Weekday Rally applicability | 0.824 | 0.704 | 2.377 | 4.107 |
| Q57 recording date | 0.564 | 0.113 | 2.541 | 3.239 |
| General Season DUPR | 0.511 | 0.798 | 2.037 | 3.432 |
| Match-score entry | 0.376 | 0.345 | 2.094 | 2.857 |
| Picklebreaker Rally mechanics | 0.307 | 0.318 | 1.228 | 1.880 |

The isolated shared binding/range-validation work measures **0.028–0.165 ms median** (included in source validation, not an additional amount to sum). Model preparation is measured start-to-intercepted-dispatch minus independently timed selection and source resolution; it includes applicability/prompt preparation and measurement variance. Total p95 ranges 2.863–12.314 ms. No equivalent pre-correction build was benchmarked under identical conditions, so an exact total *added* production latency is not established; the isolated new binding cost and full current overhead are the measurable values.

Source validation remains two batched reads, with signing coalesced by version (one or two in these examples), rather than one read per item. The benchmark runner's extra pre-dispatch source check is test-only. Bounded policy completion is one catalog read plus one read per relevant document, at most four documents / 160 chunks each with a shared five-second timeout; it introduces no embeddings. Real completion/network latency remains a production acceptance measurement. Final actual provider generation median/max: **2,729 / 10,720 ms**; these are local call times, not production end-to-end latency.

## 10. Automated validation and changed files

Final checks after the last contract correction:

| Check | Result |
|---|---|
| `npm test` | **826/826 PASS**, 0 failed/skipped |
| `npm run lint` | **PASS**, 0 errors / 10 existing warnings |
| `npx tsc --noEmit --incremental false` | **PASS** |
| `npm run verify:ai-pdf-server-bundle` | **PASS** |
| `npm run build` | **PASS**, Next.js 16.2.4 / version 0.1.547 |
| `git diff --check` | **PASS** |
| Source fidelity / roster/scoring/year/citation controls | **PASS**, included in full tests |
| Stage 7/history/feedback and target-effective View-As / LMS-0723 security regressions | **PASS**, included in full tests |
| Desktop/mobile rendering | No answer/source markup changed in this correction; not rerun. Production visual acceptance remains required. |

The focused evidence tests include 70 existing fidelity/routing tests and six new final-correction tests. Existing clarification controls retain combined choices, authorization binding, reset and target-effective identity; only the intentional temporal “when can/may” expectation changes. Legacy archived-replay fixtures now support the bounded active-document read instead of accidentally simulating a missing catalog.

Application files changed in this correction: `app/lib/aiQuestionApplicability.js`, `aiSelectedRuleIdentity.js`, `aiEvidenceExcerpts.js`, `aiAnswerGeneration.js`, `aiOfficialApplicability.js`, `aiPolicyEvidence.js` (all under `lwrpc-admin`). Test/runner files: `test/lms0725FinalCorrection.test.mjs`, `test/lms0725EvidenceFidelity.test.mjs`, `test/aiFinal0717Correction.test.mjs`, `test/aiQualityHardening.test.mjs`, `test/aiQualityHardeningCorrection.test.mjs`, `scripts/lms0722-replay-fixture.mjs`, `scripts/lms0725-final-model-validation.mjs`, `scripts/lms0725-final-performance.mjs`. Supporting new snapshot/results/review/log files are under `docs`, with the roadmap updated. Existing earlier LMS-0724/0725 worktree changes are retained; no broad reset, commit, merge or unrelated refactor was performed.

## 11. SQL and exact production continuation sequence

**No SQL is required for this correction.** No migration was created or applied. The already applied LMS-0725 history entry `20260908123627` must not be reapplied (`20260908114532_lms0725_clarification_choices.sql`, SHA-256 `9EF22DEB9422E7D7D1F7FA915224CC1F527CC72D043510D53F73C85F0D4ABE85`).

After owner review and separate production continuation approval:

1. Confirm the reviewed local diff/build, unchanged version 0.1.547, current active source versions, current deployment/aliases and existing migration history. Do not reprocess documents or create an Approved Answer to force acceptance.
2. Deploy the reviewed application once to the existing Vercel project. Verify READY status and both normal and dedicated View-As origins point to that reviewed build. Preserve all LMS-0724 security configuration and maintenance infrastructure.
3. Replay the exact Q07 production roster question **once first** in the legitimate signed-in session. Verify successful HTTP response, September 28, 2026, unlock/notification qualification, exact evidence and valid page-aware sources. Stop on any HTTP/source failure; do not silently retry or roll back.
4. Verify Q08 and exact Q30, then the complete 63-case production acceptance matrix and official-source/year/default/exception/completeness gates. Verify deterministic Live and protected requests still make zero model/embedding calls.
5. Complete Stage 7/feedback/history, source links, clarification chips/combined choices/resolved display/reset, accessibility and desktop/mobile (including 390/320 widths). Verify LMS-0723 role/identity protections and LMS-0724 target-effective authorization, persistent read-only banner/Exit, mutation blocking, dedicated-origin isolation and natural maintenance lifecycle. Measure retrieval, completion, validation, generation and end-to-end latency, and verify production integrity without operational test-data mutations.
6. Mark LMS-0725 production accepted only after all required gates pass. Until then retain LMS-0724 as last accepted and record any failure honestly.
7. Only after AI cleanup production acceptance, begin the already mandatory View-As UI parity/cleanup: reuse the one real LMS UI under secure effective-user context, then delete obsolete mini-LMS presentation code after parity/security validation. It remains deferred now.

**STOP FOR REVIEW. No production action is authorized by this report itself.**
