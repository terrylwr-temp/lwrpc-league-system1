# Governing Ask LWR API cost policy

Effective September 8, 2026; owner-approved. The LMS-0725 cost diagnosis is accepted.

- Keep the LMS-0725 production answer model gpt-5.5 unchanged. No large OpenAI benchmark without explicit authorization.
- Correction validation order: deterministic tests; affected generated cases only; continue development when those pass; one complete production-model benchmark for the final candidate only when materially required and explicitly authorized. Production acceptance is targeted.
- Routing, scope, applicability, exact-evidence validation, authorization/RLS, telemetry payloads, UI, clarification choices and source identity remain deterministic wherever generation is immaterial.
- GPT-5.5 generation certification is for completeness, grounded synthesis, qualification and scope preservation, and material generated citation/evidence use.
- Current deployed Q55 correction retains accepted 103/103 routing, 82/82 generated answers and 906/906 tests. No repeat full benchmark for cost accounting.

## Operational-maintenance implementation item

Record for the next operational-maintenance release so the already-deployed targeted LMS-0725 acceptance is not delayed. This is pending implementation, not a claim that cached-token accounting is already deployed. No version is started automatically; it does not displace the mandatory next View-As UI parity work after LMS-0725 acceptance.

Retain numeric requested model, returned snapshot, input, cached input, output and provider total token fields. Classify PRODUCTION_PLAYER, PRODUCTION_ACCEPTANCE and LOCAL_BENCHMARK without member PII or stored prompts for accounting. Use a trusted acceptance marker; never grant authorization based on a cost category. Preserve missing versus zero usage. Centralize maintainable model pricing and cache-aware estimated cost. Review stable instruction prefixes and dynamic question/evidence placement; add a stable prompt_cache_key only if justified and behavior/security remain identical. Test solely with fixtures and retained provider response shapes; no OpenAI requests.

Current gap: aiAnswerGeneration.js usageFromResponse retains input/output/total but discards cached-input count. qualityOutcome persists returned model/input/output and origin; normal acceptance currently shares player_interface. Current acceptance is separately attributed in its local case/outcome ledger. Estimate currently assumes uncached input. Existing diagnostic JSON may accommodate bounded usage metadata, but schema/RPC acceptance must be checked deterministically first. If any SQL/schema change is needed, stop and propose the minimum change before production mutation.

Future reporting must separate genuine player traffic from acceptance/local spend, show player generation cost/cache hits, count zero-model Live questions, and estimate monthly player-only cost from a measured mix.