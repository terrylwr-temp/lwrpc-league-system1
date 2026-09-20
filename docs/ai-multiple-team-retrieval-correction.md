# Ask LWR player membership on multiple teams — retrieval correction

Status at the time of this diagnosis: **local application correction with model replay passed; not deployed or production accepted** (September 20, 2026). Subsequent owner-authorized PDF reprocessing activated a newer Rules version; see the [Stage 2.2 corpus review](ai-pdf-ff-normalization-review.md) for current version IDs and release status. No SQL, schema, document, Approved Answer, or business-data change was made by this retrieval correction itself.

## Active authority and version change during diagnosis

The first read found the active `league_rules` document `9c200d0f-be41-4c73-9f47-41c18dcd0132`, version `d92d58f4-b5ee-408e-87f4-a0d35626d57a`, ready with 71 chunks. Its Rule 3.7 was in searchable, embedded chunk `48247b29-b0cf-4bed-94c2-6c8ac2298288`. Its Rule 1.1 was a club website reference, not Team Structure.

While the investigation was running, the active version changed externally to `2b548146-006e-4f66-853e-e1e61430a50e` (`v20260920112644-2b548146`), ready with 68 chunks. Its searchable, embedded Rule 3.7 is in chunk `a5aceb1d-c475-4a23-b815-184115ae7916` (page 3). The supplied general Team Structure provision is now **Rule 5.1.2** in searchable, embedded chunk `e639ea4d-4b81-4595-b255-e7586f8770a6` (page 4): a player may be listed on more than one team roster if independently eligible for each team, league, and division. Rule 3.7 permits joining or substituting for multiple community teams within the same community, subject to League and DUPR rating rules. The application never changed either version or its activation.

The general answer from the currently active document is: **Yes. A player may be listed on more than one team roster, provided they independently meet all eligibility requirements for each team, league, and division.** Rule 3.7 also addresses multiple teams within the same community. Citation identity is based on the selected passage and revalidated as Rule 5.1.2, even though the containing chunk's stored parent rule is `5`.

## Root cause and before trace

For the exact question, the first active version's Rule 3.7 had vector rank 1 and FTS rank 2, yet its exact score was 0. Its semantic, keyword, authority and combined scores were `0.5071 / 0.0278 / 0.3803 / 0.2678`. It was final rank 12, below the unchanged `0.35` evidence threshold. An unrelated player-guide chunk ranked first at `0.4187` after an `0.85` exact score. Evidence was globally sufficient because that top unrelated chunk cleared the gate, but Rule 3.7 was not eligible for final selection. The old answerability rescue selected a Captains Guide passage about **registering multiple teams**, which does not establish player membership permission. This is a ranking/qualification problem followed by an applicability false positive; the model did not receive the controlling rule.

On the newly active version's unchanged original search, Rule 5.1.2 was rank 14, `0.2455`, for the exact question. It was absent from the top 32 for “Can I play on two teams?” and “Can someone play for two different teams?” It was rank 23, `0.2247`, for the restrictive one-roster question. The unchanged search already returned it at rank 1, `0.4627`, for “Can a player be rostered on more than one team?” These original-path results and the subsequent corrected paths are in the [final score trace](ai-multiple-team-final.json). The earlier old-version baseline is in the [before trace](ai-multiple-team-before.json). Unrelated source text is omitted from both traces. Because activation changed concurrently, the old-version and final-version scores must not be treated as a same-corpus benchmark.

## Generalized correction

The new membership interpretation accepts person/team-or-roster questions with a count expression attached to the team or roster noun. It covers “two,” “multiple,” “more than one,” “another team,” and restrictive “only one” forms. A protected neighboring question about joining **a team in another community** does not match this concept. Team registration and payment questions do not match it either.

When the ordinary path has no established direct evidence, the application reruns the existing hybrid RPC with a neutral canonical roster-membership query and **reuses the original question embedding**. If an older active source uses different wording and its rule passage was among the original candidates, a second bounded query may use its own subject phrase. Both queries preserve the original role, scope, and context and stay within Supabase; no source-derived text is sent to the embedding provider. They do not assert permission or a policy outcome. The result still has to clear the unchanged `0.35` combined-score threshold and the existing active/searchable source gate.

Final evidence selection requires an operative player-membership passage in `league_rules` that itself expresses plurality, team/roster membership, and permission or restriction. It excludes guide instructions for a captain to register several teams. Only the applicable numbered passage is selected, retaining its eligibility conditions. The fallback model planner and existing rescue remain available if this bounded retry finds no qualified passage. No global score weight, evidence threshold, or source-authority rule changed.

## After trace on the current active version

| Question | Original Rule 5.1.2 rank / score | Corrected rank / score | Selected evidence |
|---|---:|---:|---|
| Can we have players on multiple teams? | 14 / .2455 | 1 / .4978 | Rule 5.1.2 |
| Can I play on two teams? | absent from top 32 | 1 / .4897 | Rule 5.1.2 |
| Are players limited to only one roster? | 23 / .2247 | 1 / .4788 | Rule 5.1.2 |
| Can a player be rostered on more than one team? | 1 / .4627 | original path | Rule 5.1.2 |
| Can someone play for two different teams? | absent from top 32 | 1 / .4605 | Rule 5.1.2 |
| Can I join another team too? | 3 / .2166 | 1 / .4714 | Rule 5.1.2 |

For the exact corrected search, score components are semantic `.4767`, FTS `.2550`, exact `.85`, authority `.85`, combined `.4978`; the original question vector is reused. The direct passage was the only selected evidence. The rescue was not triggered. Four live read-only source revalidations confirmed the selected stored excerpt, active ready version, exact Rule 5.1.2 citation, and available signed source link; see [source-validation trace](ai-multiple-team-source-validation.jsonl).

## Verification and release limit

- Final clean full protected suite: **1,407/1,407 pass**, no skips, after the protected cross-community regression caught and prompted a quantifier correction. Focused membership and existing assisted-retrieval controls also pass (24/24), including retry failure recovery. One earlier concurrent full run had an unrelated Live LMS database test fail; that test passed alone (12/12), and the subsequent unaccompanied full run passed.
- Lint: **0 errors, 11 existing warnings**. Production build: **pass**. `git diff --check`: pass.
- No database writes or corpus processing. Live trace calls were read-only Supabase searches and original-question embeddings.
- Automatic approval review initially rejected the model replay because it would send the selected Rule 5.1.2 passage to OpenAI without destination-specific approval. The user then explicitly authorized that exact four-question read-only replay. All four generated answers passed: affirmative questions answered yes, the one-roster limit answered no, and every answer retained independent eligibility for each team, league, and division. Each was bound to the active version and cited Rule 5.1.2. See the [model replay](ai-multiple-team-answer-replay.json). No feedback/quality write was made. The first replay harness did not retain provider token counts, so usage/cost is unavailable; the script now records generation metrics for future authorized runs.
- No production HTTP replay or deployment occurred. The concurrent official Rules activation discovered during diagnosis is a FAST FIX escalation condition for corpus mutation; normal LMS production health, rollback preflight, and release acceptance also remain pending. This change is local and requires release review before deployment.
