# Picklebreaker same-partner FAST FIX

Status: local gates passed; production replay pending.

Exact production failure reproduced in the real Commissioner Ask LWR session: “can i switch my mix team partners to play the picklebreakers?” returned the document fallback.

Active DUPR League Rules version f4c0e95b-e6c9-4c2a-bf26-a24d10c329d9, page 9, Rule 6.2.3.5 explicitly requires the same partners as the Mixed Round. This is document retrieval only, not a lineup, scoring, or eligibility-policy change.

Initial retrieval omitted the controlling passage and no specific partner-continuity concept applied. Three application files add a narrow partner-change/continuity intent (including plural picklebreakers), reuse one bounded concept embedding/search, and require the explicit same-partner proposition in league-rule evidence. No thresholds, search limits, authorization, business rules, database objects, corpus, or Approved Answers change.

Validation: 69 focused tests pass, including exact wording, four variants, league mismatch, absent proposition, below-threshold evidence, eligibility/injury contrasts, and a missed-first-search fixture. Lint passes with 11 existing warnings; production build passes; diff whitespace checks pass. One pre-deploy generation correctly answered No and cited Rule 6.2.3.5 page 9 (1508 input / 66 output tokens; configured estimate $0.00952 excluding embeddings).

Normal production baseline: real Terry Adelman Commissioner dashboard and Teams load; 92 active of 115 teams, team management controls available. Read-only counts and full-row hashes captured for 14 protected tables. No business writes or View-As used.

Previous accepted application: ae904a1fe4865ccf5f65fa597bc37783d1cd875a, READY dpl_HCmE83fJKjbY8CNRnmk5hjfKm2Rg. Recovery is application-only rollback to that retained deployment or reverting the scoped patch; no database rollback required. Normal business write paths are unchanged by the diff. Production business writes are not acceptance probes.
