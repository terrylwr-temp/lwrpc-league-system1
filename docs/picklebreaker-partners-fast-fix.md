# Picklebreaker same-partner FAST FIX

Status: **FAST FIX — PRODUCTION ACCEPTED**, September 16, 2026.

Exact production failure reproduced in the real Commissioner Ask LWR session: “can i switch my mix team partners to play the picklebreakers?” returned the document fallback.

Active DUPR League Rules version f4c0e95b-e6c9-4c2a-bf26-a24d10c329d9, page 9, Rule 6.2.3.5 explicitly requires the same partners as the Mixed Round. This is document retrieval only, not a lineup, scoring, or eligibility-policy change.

Initial retrieval omitted the controlling passage and no specific partner-continuity concept applied. Three application files add a narrow partner-change/continuity intent (including plural picklebreakers), reuse one bounded concept embedding/search, and require the explicit same-partner proposition in league-rule evidence. No thresholds, search limits, authorization, business rules, database objects, corpus, or Approved Answers change.

Validation: 69 focused tests pass, including exact wording, four variants, league mismatch, absent proposition, below-threshold evidence, eligibility/injury contrasts, and a missed-first-search fixture. Lint passes with 11 existing warnings; production build passes; diff whitespace checks pass. One pre-deploy generation correctly answered No and cited Rule 6.2.3.5 page 9 (1508 input / 66 output tokens; configured estimate $0.00952 excluding embeddings).

Normal production baseline: real Terry Adelman Commissioner dashboard and Teams load; 92 active of 115 teams, team management controls available. Read-only counts and full-row hashes captured for 14 protected tables. No business writes or View-As used.

Previous accepted application: ae904a1fe4865ccf5f65fa597bc37783d1cd875a, READY dpl_HCmE83fJKjbY8CNRnmk5hjfKm2Rg. Recovery is application-only rollback to that retained deployment or reverting the scoped patch; no database rollback required. Normal business write paths are unchanged by the diff. Production business writes are not acceptance probes.

## Production acceptance

Application f58de6f619e80813f4bf121bb28af933673213cf; READY deployment dpl_USE6qPsje5xz5mzp1XyWXG6EBjz8; immutable host lwrpc-admin-5xtjafez7-terry-lwrpc.vercel.app. Production alias league.lwrpickleballclub.com verified on this exact SHA.

Normal LMS first: refreshed real Commissioner Teams page loads with 92 active of 115 teams and Add Team available. Protected business-table counts and full-row hashes match across all 14 captured tables (picklebreaker-partners-integrity.json). No SQL/schema/corpus/Approved Answer/security/authorization/business-data changes. Tests cover nearby eligibility/injury and other-league boundaries; no View-As used. No FAST FIX escalation condition triggered.

Production UI replays, each as a new question:

- 11:19:08 UTC: exact report correctly answers No; same partners as Mixed Round; official Rule 6.2.3.5 page 9.
- 11:19:32 UTC: “Can we change mixed doubles partners for the Picklebreaker?” correctly answers No with the same source and qualification.
- 11:20:00 UTC: “How does the Saturday Picklebreaker work?” retains 12-12 tie, same mixed partners, rally game to 25 win by 2, three bonus points, no-tie bonus and no DUPR/individual win-loss posting. Sources Rule 6.2.3.5 page 9 and continuation page 10.

All three acceptance requests recorded answer / validated_structured_output using gpt-5.5-2026-04-23. Production generated usage: 4,885 input / 264 output tokens, estimated $0.032345 at configured rates. Including the single pre-deploy generation: $0.041865 excluding embeddings/cache adjustments; not an invoice. No broad generation benchmark.

Local diagnostic artifacts (ignored): .local-validation/picklebreaker-before.json, picklebreaker-after.json, picklebreaker-generation.json, picklebreaker-tests.log, picklebreaker-lint.log and picklebreaker-build.log. Scoped application patch is seven added lines and one replaced line across three existing modules, plus permanent tests. Rollback remains the prior READY application identified above, with no database action.
