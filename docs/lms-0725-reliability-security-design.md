# LMS-0725 / 0.1.547 — Reliability Factor security design
September 8, 2026. **PROPOSAL FOR REVIEW ONLY. Implementation paused.**

This supersedes the Season-DUPR-only personal comparison proposed in lms-0725-eligibility-diagnosis.md. The owner now requires rated-versus-NR classification before ordinary individual-range evaluation. No eligibility application code, RPC, RLS, migration, personal-data read or model call was added during this review.

## 1. Verified current authority and derivation
Read-only verification of the active League Rules found document 9c200d0f-be41-4c73-9f47-41c18dcd0132, active version f0aad5ad-cf08-46c2-94fd-686ceb1271c0 unchanged.

- Rule 4.1.1, chunk d51e615b-a4f2-460f-8a81-da9abfbd46af: Reliability Factor **below 29** makes a player NR for League purposes. The comparator is strictly less than, not less than or equal. RF 29 does not trigger this rule.
- Rule 4.1: Season DUPR is established before the first match on the communicated date and remains for the season. Rule 4.2 truncates to a tenth.
- Rule 4.5 spans that chunk and continuation 42713201-279a-49f0-bb21-a24aa9418043. NR players may participate in any division; professional input is strongly recommended and the captain remains responsible for proper placement. This is not proof that all other eligibility requirements pass.
- Rule 4.5.1, ebacb205-f960-489e-97ea-0a059fdb7984: initial NR rating for pair aggregate calculations is the division maximum individual rating minus 0.5.
- Rule 4.5.2, d2b349cf-49b5-45cb-9c2e-0f4052e7d22b: use the highest adjusted Season DUPR consistently across multiple divisions. Rule 4.6 in the same chunk defines a pair's combined Season DUPR.
- The verified DUPR5 table remains individual 2.0–2.899 and pair maximum 5.1. PrimeTime 9's diagnosed Rules/configuration mismatch remains a blocking conflict for that scope.

Current storage has season-specific numeric dupr_reliability_rating and numeric season_dupr_rating / season_primetime_rating. The ratings cleanup code can deliberately store a numeric adjusted Season DUPR when RF is low or the imported DUPR is NR. Thus RF-implied NR plus a numeric Season DUPR is **not by itself inconsistent**. That numeric field must not override NR classification or be treated as proof of ordinary rated status.

The cleanup UI accepts an operator-entered threshold and uses <=; the Rules use <29. These can agree for integer RF values when the entered threshold is 28, but equivalence must not be assumed for other thresholds or fractional RF. This review did not inspect actual player data or historic cleanup settings and does not claim production data is wrong. No cleanup changes or recalculation are proposed here.

## 2. Bounded authorization matrix

| Context | Proposed eligibility input access |
|---|---|
| Active authenticated Player | SELF only, selected authorized season; no name/target substitution |
| Captain | Own SELF only; no teammate RF access added |
| Club Pro | Own SELF only; no other-member RF access added |
| Commissioner / League Manager | Own SELF through this new Ask LWR operation; existing administrative rating workflows remain unchanged |
| Non-self administrative eligibility | Not added in this first implementation; any later named-target workflow must explicitly reuse and review current administrative authorization |
| View-As, any real actor | Effective target SELF only, under the existing validated context and effective-role checks |
| Anonymous, inactive/revoked membership, invalid session | Denied |
| Generic policy question | No personal projection at all |

No standalone "show RF", bulk RF, teammate RF, contact, roster, or member-search capability is introduced. Initial purpose is personal division eligibility and the NR explanation within that response. A separate Season DUPR/NR explanation intent would need explicit routing approval; ordinary SELF_RATING output remains unchanged.

## 3. Minimum database projection
Add a narrowly named internal operation, proposed ELIGIBILITY_SELF, to the existing trusted lookup path. It is not a browser-callable RPC.

Read one matching member_season_ratings row, selected by the database-derived SELF member and an authorized active season. Return to trusted server code only:
- selected Season DUPR field, using the resolved division's rating type;
- that row's dupr_reliability_rating;
- season identity and presence/missing status;
- minimally necessary consistency/provenance indicators, never notes or a whole row.

A proposed additional derived boolean source_is_nr, computed from the existing imported DUPR text, would distinguish independently recorded NR from "RF not below threshold." This is part of the design requiring review, not a silent additional field grant. Do not return imported numeric DUPR or arbitrary text. If this boolean is not approved or applicable to the chosen rating type, RF above threshold establishes only that this particular RF rule does not trigger NR; other NR provenance remains unknown. Do not falsely label all such records ordinarily rated.

Do not return DOB, email, membership details, notes, participation history, partner ratings, other members' RF, or full rating rows. Internal member IDs remain within authorization/audit machinery. Default UI explains the derived classification without displaying the raw RF number. One snapshot read prevents RF and Season DUPR being taken from different rows/seasons.

## 4. RPC/function impact and SQL requirement
**A reviewed SQL change is needed** to enforce the new field projection consistently in both normal and View-As lookup functions; do not bypass these with an ad hoc privileged application query.

Minimum proposed scope:
- ai_live_private.lookup(uuid,uuid,jsonb): add only the bounded SELF eligibility branch; preserve existing six capabilities and their responses.
- view_as_private.lookup(uuid,uuid,uuid,uuid,jsonb): equivalent branch resolving SELF from p_member and validated _view_proof; preserve authorization locks.
- public.ai_live_lookup(uuid,uuid,jsonb): retain signature/security/ACL and explicitly audit the new operation as appropriate.
- Existing private audit intent constraint must accept the new operation; do not mislabel it PLAYER_RATING to avoid a constraint change.
- Inspect the existing View-As dispatch/diagnostic allowlists during implementation; change only a necessary operation/category allowlist, if any. No new credentials, origin, definer role, broad grants, or mutation pathway.
- Keep existing rate limits and bounded payload/deadline behavior. Preserve Q78 recovery for the single normal logical outcome.

Before any production SQL: produce an exact guarded migration, function/ACL diff, rollback, local PostgreSQL race/authorization tests, and explicit deployment approval. No SQL file or migration has been authored/applied in this design turn. The earlier "no SQL expected" assumption no longer holds for this new personal projection.

## 5. Authentication and RLS
Normal: online session verification precedes the trusted server call. The database derives SELF from the verified actor and active member/role; it must reject supplied names, another member UUID, or subject substitutions. Validate season and division against trusted state, never accept browser RF/threshold/role fields.

Live production catalogs confirm public.ai_live_lookup and ai_live_private.lookup remain SECURITY INVOKER with empty search_path and execute restricted to postgres/service_role. View-As private lookup remains invoker, with the existing restricted dispatcher/executor boundary. Preserve those properties.

The live member_season_ratings SELECT policy currently permits all authenticated rows (qual=true); view_as_executor_read also has qual=true for its executor role. **These policies do not enforce the proposed SELF restriction.** The new operation must enforce it in database authorization/projection, just as current narrow Live operations do. Do not widen grants/RLS or describe this as RLS-guaranteed SELF isolation. Tightening legacy table access would be a separate, potentially workflow-breaking project and is not included.

## 6. View-As
Use the existing dedicated-origin context and validated proof. Keep real actor for audit and effective member/role for authorization. Derive the rating row solely from the effective member and selected effective-user-authorized season. No fallback to the real actor's ratings or manager permissions.

Preserve identity/season authorization locks inside the database operation and revalidate the effective context before disclosure. Expired/revoked context, changed role/membership/season, or tampered continuation fails closed. No mutation, normal-player feedback attribution, or normal Stage 7 personalized-content record for a View-As interaction.

## 7. Deterministic policy representation and season scope
Create a validated server-side policy object from exact current official evidence: immutable version/chunk/range identities, applicable season/league/division, RF comparator and threshold, NR treatment/assignment, individual bounds, pair cap and remaining conditions. It contains public policy only, not personal values.

Extract the threshold/comparator from the controlling clause and verify the complete NR continuation and qualifications. An unfamiliar form, multiple incompatible rules, missing continuation, changed version, or Rules/configuration conflict produces unresolved/conflict, not a guessed threshold. No magic 29 in UI/routing.

Bind the policy to an explicitly verified applicable season. Active-document status alone does not prove a future season uses this policy. Until the existing season-policy architecture supplies that binding, propose a small reviewed season/version binding manifest; unknown/new seasons fail POLICY_SCOPE_UNKNOWN. Revalidate both current version and binding on each continuation. Do not infer a historical frozen RF from today's row. A row with uncertain establishment/provenance cannot support a claim about historical season status.

## 8. Evaluation and conflicting-data behavior
1. Resolve authorized season/division and applicable policy. A material conflict (including PT9) blocks conclusive eligibility, even when a numeric condition appears to fail.
2. Read the bounded SELF snapshot.
3. Missing/invalid RF -> rated-versus-NR UNKNOWN. Explain known policy; do not issue overall ELIGIBLE or ordinary-range NOT ELIGIBLE based on Season DUPR alone.
4. RF below the verified threshold -> NR takes precedence, even with numeric Season DUPR present. Apply Rule 4.5; do not compare NR against the ordinary individual range.
5. RF not below threshold -> verify any approved independent NR/provenance indicator. Only when ordinary rated status is established, compare the recorded applicable Season DUPR deterministically.
6. Missing rated-player Season DUPR -> unknown individual qualification, with a natural missing-data explanation.
7. For established rated status, outside the ordinary range can fail that necessary condition; inside range is only an individual partial pass.
8. For NR, the Rules' division-placement permission is an established policy condition, not complete eligibility. Pair aggregate/captain placement/other participation conditions still remain.
9. Do not manufacture an NR aggregate assignment from one proposed division if highest-across-divisions context is unavailable. Existing numeric adjusted rating may be reported as a recorded aggregate input only when its use is established; otherwise leave aggregate unresolved.
10. Genuine contradictions with authoritative season status/provenance -> CANNOT DETERMINE/DATA_CONFLICT, sanitized review signal. Do not repair data, parse free-text notes as authority, or choose whichever value yields an answer.

No current bounded inputs establish every material participation and pair condition, so overall ELIGIBLE is generally unavailable. A tested outcome type can exist without claiming a live path proves it. NR-specific failure tests must use an independently proven necessary condition; never make "NR" itself a failure or invent another player's input.

## 9. Model, privacy and telemetry
No embeddings or answer-model calls are required for this workflow. RF, derived personal NR status, Season DUPR, private relations and personalized final prose never enter OpenAI. If separate policy prose generation is later needed, use only a reconstructed public-policy question plus exact official evidence, then compose private propositions afterward.

Keep one logical request/correlation ID. Normal operational metadata may include workflow, outcome class, public policy identity, timing, missing/conflict reason codes and model_call_skipped=true. Do not retain raw RF/rating, raw hybrid question, personalized answer, credentials or receipts. Derived personal NR classification is sensitive too: avoid persisting it in general answer-model telemetry; prefer a non-specific unresolved/partial/conflict result there.

## 10. Audit
Use existing restricted Live access audit for authorization decisions, with a reviewed ELIGIBILITY_SELF allowlist addition. Minimum: actor, request ID, operation, authorization decision and timestamp; target can remain null for normal SELF. View-As uses existing context/real actor/effective-user diagnostic correlation, not target-as-player attribution. Record success and denial consistently without duplicating logical events.

Keep a generic discrepancy reason such as RATING_STATE_REVIEW_REQUIRED in restricted diagnostic metadata; no raw RF or inferred personal status in broad logs. Retain existing manager-only review authorization. Do not create an Approved Answer or repurpose official-document exception storage for private eligibility facts. A new review table/workflow, if later needed, requires separate review.

## 11. Retention
Raw RF/Season DUPR projection: request memory only; no new persistent copies. Do not put values/NR status in browser storage, continuation receipts, caches or URLs. The authorized rendered answer necessarily conveys a personal result; avoid durable client conversation storage for the new workflow. Receipts should contain only opaque authenticated context, approved selection IDs and public policy identity, with existing short expiry and fresh data reads.

Existing private Live design uses one-day attempt and 90-day audit/feedback retention; reuse those limits for the new restricted audit operation and verify the retention job covers it. These retention figures are from existing migration definitions, not a claim that a cleanup ran in this turn. Do not silently extend general Stage 7 retention or add a second eligibility history.

## 12. Review and permanent control plan
Preserve the 120-question benchmark. Add the 12 requested RF scenario controls in lms-0725-reliability-security-controls.json, separately counted (120 question cases + 12 scenario controls), plus the security boundary assertions listed there. These are proposed tests, not implementation passes.

Required security validation after approval: Player/captain/pro SELF allow; other-member denial and forged subject/role rejection; admin behavior unchanged; View-As actor/target mismatch, revocation/expiry and concurrent authorization change; no browser RPC grants; minimum field projection; shared snapshot/season choices; exact threshold boundary including 29; raw NR/provenance ambiguity; missing RF; numeric adjusted rating with NR; no private data to provider or telemetry; no personalized client persistence; idempotent audit/outcome; current/future policy binding and PT9 conflict.

**Stop:** owner section 20 requires design review before implementation. Q87–Q89 remain unrun. Q78 deployment/recovery, accepted prior tests, LMS-0725 version and next-mandatory View-As parity roadmap are unchanged.

