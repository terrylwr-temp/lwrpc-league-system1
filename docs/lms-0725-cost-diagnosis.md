# LMS-0725 API cost/usage diagnosis — September 8, 2026

**Large OpenAI benchmark runs remain paused.** Read-only diagnosis: local records/code, official pricing documentation, and one narrow REST GET of existing usage metadata. No SQL, model/embedding requests, deployment, corpus change or application/model change. The validated LMS-0725 correction remains intact. Monetary values are estimated USD at standard uncached rates, not an OpenAI invoice; cached-token detail and organization billing exports are unavailable.

1. **Production model:** configuration requests `gpt-5.5`; all 62 saved generated outcomes from today's read return **`gpt-5.5-2026-04-23`**. The deployment environment metadata has no chat-model override. Document generation uses Responses API, reasoning effort `low`, verbosity `low`, output cap 700, `store:false`. Retrieval uses `text-embedding-3-small`.

2. **Local benchmark model:** the runners import the same generation function/configuration and request `gpt-5.5`; completed records return **`gpt-5.5-2026-04-23`**. There is currently no separate benchmark-model setting. Fixture/preflight tests do not call OpenAI.

3. **Same model:** yes. The benchmark uses production's answer model and generation contract. It supplies saved official evidence and fixture metadata/signing instead of production retrieval. Its embeddings count is zero. Codex's own conversation/agent usage is separate from these application-key calls and is not included here.

4. **Average production input:** **2,268.58 tokens** over 62 recorded generated answers: 140,652 input tokens total. These are production endpoint observations, predominantly acceptance traffic; they are not a statistically independent player-only sample.

5. **Average production output:** **116.23 tokens**, 7,206 total. These are the API's reported output usage, not a count of displayed words. Cached-input and reasoning-token subdivisions are discarded by the current usage extractor.

6. **Average production generation cost:** **$0.0148297 (1.48 cents)**. The 62 measured generated outcomes total **$0.91944** before caching. Calculation: `(input × $5 + output × $30) / 1,000,000`. Current GPT-5.5 cached-input price is $0.50/million. The application's existing estimator uses the uncached formula and therefore cannot reflect cache savings. [Official GPT-5.5 pricing](https://developers.openai.com/api/docs/models/gpt-5.5).

   Embeddings are additional, at $0.02/million input tokens. Their token counts are not retained in the request-outcome table. For illustration, a 100-token query embedding costs $0.000002; this is not a measured average. Corpus ingestion/reprocessing embeddings are separate and excluded. [Embedding pricing](https://developers.openai.com/api/docs/models/text-embedding-3-small).

7. **Benchmark average:** across 595 completed local calls today, **2,215.67 input + 112.31 output tokens**, **$0.0144478 per generated question**. Total: 1,318,325 input and 66,827 output, estimated **$8.596435**. The latest complete 103-case run made 82 model calls: 2,181.10 input + 110.80 output per generated case, **$1.16683 per full run**. Spread over all 103 routing cases, that is $0.01133 per case; 21 cases make no model call. Do not count composite audit copies as additional provider calls.

8. **Today's calls, with limits:** the deduplicated local run ledger contains **597 generation request attempts / 595 completed responses / two network request failures without responses**. The five non-overlapping phases reconcile as follows:

   | Local phase | Attempts |
   |---|---:|
   | Initial authorized model validation | 42 |
   | Evidence/completeness correction | 121 |
   | League dates/help correction | 223 |
   | PrimeTime age-reference correction | 79 |
   | Q55/observability correction | 132 |
   | **Total** | **597** |

   Production telemetry contains **62 generated outcomes**, plus the two known delivered Q23/Q36 answers whose persistence failed: **64 observed generated answers**. Thus local-plus-production records account for **661 generation attempts/observations**, including the two failed local attempts; 659 have completed-answer evidence. This is not an exact organization-wide OpenAI request count. Production also records 69 Stage 3 invocations, plus two missing generated requests; these normally require query embeddings, but invocation is not proof that every embedding request completed. A separate local diagnosis also documented an embedding call. Equipment probes, unsuccessful requests, retention gaps and any other consumers of the API key prevent an exact all-endpoint total without an OpenAI usage export. Do not label an inferred embedding count as measured.

9. **Validation versus player cost:** local automated generation is directly attributable: **$8.60** uncached. Production reports identify **61 acceptance-generated answers** (3 earlier targeted checks + 22 later checks + 36 continuation answers), versus 64 observed generated answers in total. The remaining three cannot be reliably attributed to ordinary players versus owner/development checks from retained origin metadata alone. `player_interface` identifies an endpoint, not a human-versus-automation billing category.

   Applying the measured production average gives an illustrative **$0.90 for those 61 production acceptance answers**, or **about $9.50 total validation generation** today, and **about $0.04 for the three unclassified production answers**. These latter amounts are estimates, not exact attribution. Directly measured local+production token cost is $9.515875; estimating the two missing outcomes adds about $0.03, giving **about $9.55 overall generation**. Embeddings, cache discounts, tax and other account usage are not included. Normal recurring player traffic cannot be isolated precisely from this test-heavy day.

10. **Prompt caching:** eligible OpenAI caching is implicit; lack of a cache parameter does not prove it is off. The app does not save `usage.input_tokens_details.cached_tokens`, so **actual cache use/hit rate is unknown**. `store:false` is not a cache-disable switch. Current documentation describes GPT-5.5's minimum reusable prefix as 2,048 visible tokens and implicit breakpoints at 2,048-token intervals; its supported retention is 24h. [Official caching guide](https://developers.openai.com/api/docs/guides/prompt-caching).

    Safe potential improvement: keep invariant instructions first, move question-specific instructions after them, and measure cached tokens. Current conditional instructions occur early, and the question precedes evidence in the user input, reducing cross-question prefix reuse. Repeated identical cases may still benefit. Cache computation must never bypass current-source revalidation or effective-user authorization. Do not add personal Live data or pad prompts to chase discounts. Any retention/config change needs its own review; none was made.

11. **Payload size:** the latest full run averages **3,284 characters of question/evidence/metadata**, of which **743 characters are exact source excerpts**. The current instruction block has approximately **7,438 characters in its double-quoted literal instructions**, plus conditional instructions; this is a static character measure, not tokenizer output. Metadata and repeated general instructions outweigh the actual excerpts. Still, total observed input averages only about 2.2k tokens, not whole PDFs or the full corpus. The clearest waste is repeated generation of many equivalent cases and repeated full runs. Instruction consolidation and compact reference metadata are candidates, but must preserve every evidence, scope, qualification and privacy requirement. Cached-token measurement should precede optimization claims.

12. **Cheaper benchmark model:** technically yes, through a future benchmark-only override that leaves production untouched. For example, `gpt-5.4-mini` is $0.75/million input and $4.50/million output, **85% below GPT-5.5's uncached token rates**. At the latest run's token volumes, 82 cases would estimate **$0.175 rather than $1.167**. Actual token usage/quality may differ. [Official mini-model pricing](https://developers.openai.com/api/docs/models/gpt-5.4-mini).

    A cheaper model can screen prompts or test tooling, but cannot certify the behavior of production GPT-5.5. Prefer deterministic checks for routing and source selection, and retain a small production-model acceptance set. No alternative model was called or configured during this diagnosis.

13. **Deterministic replacements:** yes. Run all 103 cases without OpenAI for intent, Live/document dispatch, source identity/range fidelity, active-version checks, scope, date derivation, empty-evidence guards, telemetry shape/privacy/idempotency, receipts and View-As authorization. The existing preflight already does this. UI/accessibility checks also need no model. Keep real generation for wording/faithfulness/material-completeness risks; Q29/Q103 omissions demonstrate why those cannot all be replaced by mocks. Consolidate wording variants into deterministic controls plus a few representative generated cases per policy family.

14. **Failed/affected cases first:** recommended. Deterministic suite first; then the previously failed case and a small set of affected contrasts; stop on failure. Only after those pass should a broader model suite be considered. Existing runs sometimes used failed-first testing, but repeated full runs still accounted for much of the 597 calls. Telemetry-only changes should generally require zero new model calls when recorded/synthetic response shapes prove the behavior.

15. **Full benchmark cadence:** normally **once for the final release candidate**, rather than after every correction. Run only impacted generated cases during iteration; retain their evidence and run IDs. A later global prompt/model/generation-contract change can invalidate prior results and justify another full run. For a narrow policy-family change, rerun that family and merge explicitly labeled unaffected evidence. A full 82-call run is about $1.17 at today's measured token volume; ten unnecessary repeats cost about $11.67 before discounts. Recommend a declared call/cost ceiling before any future large run, plus a dry-run case count. These are proposals, not changes to the application or current benchmark scripts.

16. **Monthly projections:** generation-only estimates using the measured production mean and current uncached standard pricing:

   | Player questions/month | Observed test-day mix* | If all require generated document answers |
   |---:|---:|---:|
   | 100 | $1.16 | $1.48 |
   | 500 | $5.79 | $7.41 |
   | 1,000 | $11.57 | $14.83 |
   | 5,000 | $57.87 | $74.15 |

   *LMS-0725 normal endpoint: 80 persisted requests plus two known missing = 82 observed requests; 64 generated (78.05%), 12 zero-model Live (14.63%), six other non-generated outcomes (7.32%). Manager-test rows and LMS-0724 rows are excluded from this mix. Acceptance tests dominate, so **this is not a measured organic player mix**. Use the all-document column for conservative planning until representative normal-traffic usage is available. Add a negligible-but-unmeasured query-embedding allowance; exclude development validation, ingestion, hosting and database charges. Longer answers or different question mix can change the average; these are projections, not spending caps.

**Duplicate-call audit:** no automatic duplicate answer-model call is visible in the reviewed question path. The UI starts a shared busy operation before fetching; one submission makes one `/api/ask-lwr` request. The route invokes generation once, and `generateOfficialAnswer` contains one Responses POST with no automatic retry loop. Local runner records likewise show at most one model call per case per run. A normal document request also uses a query-embedding call; an intentional equipment probe can add another embedding, which is not a duplicate answer generation. Repeated case runs and manual retries are separate requests. No provider request IDs or client submission idempotency ledger are retained, so network-level duplication cannot be ruled out conclusively. Identical token counts on separate outcomes do not prove duplication.

Evidence: [sanitized production usage metadata](lms-0725-cost-telemetry.json), [computed totals and run manifest](lms-0725-cost-analysis.json). No OpenAI billing/admin usage endpoint was called; account-wide billed spend remains unreconciled. **Large model runs remain paused pending review of these findings.**