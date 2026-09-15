# Kitchen-fault claim retrieval FAST FIX

Status: **FAST FIX — PRODUCTION ACCEPTED** on September 15, 2026.

## Failure and authority

The exact reported question was: “how do you treat a kitchen fault when the other team claims you were in the kitchen”. A read-only replay against the active production corpus showed the first failure at Stage 4: Stage 3 retrieved the relevant 2026 USA Pickleball Official Rulebook provisions, but applicability selection returned no evidence. The opponent-call rule was rank 6 and the team-disagreement rule was rank 25.

The authoritative answer is bounded by Rule 11.A.1 (NVZ contact is a fault during a volley), Rule 9.B.3 (players may call NVZ faults on an opponent), and Rule 9.B.3.b (a disagreement between teams about the fault call requires replaying the rally).

## Correction

Application commit `b97f4ff` adds one narrow opponent kitchen-fault-claim intent. It selects only the three directly applicable USAP propositions and uses one bounded intent embedding if the disagreement provision ranks below the normal authority review. Existing kitchen definition, presence, volley, momentum, serving, league, and Live routes are unchanged.

No SQL, schema, RLS, grants, corpus processing, Approved Answer, authorization, credentials, or production business data changed.

## Verification

- 42 focused tests passed: exact wording, four natural variants, three nearby kitchen controls, a live-shaped low-rank retrieval case, and existing retrieval/governing-source regressions.
- `npm run lint`: zero errors and 11 existing warnings.
- `npm run build`: passed locally and on Vercel.
- Scoped application diff: five files, 84 additions and 6 deletions; `git diff --check` passed.
- Normal production sign-in rendered before and after deployment.
- Production deployment `dpl_Dj43Zji3G9BwXyx9ZfReNnrjAibu` is READY at `league.lwrpickleballclub.com`; runtime error scan returned no errors.

Post-deploy generated replays used the configured `gpt-5.5-2026-04-23` model and active production evidence:

1. Exact report: cited Rules 11.A.1, 9.B.3, and 9.B.3.b and correctly explained the volley condition, opponent-call authority, and replay on disagreement.
2. Natural disagreement variant: preserved the same three rules and outcome.
3. Neighbor control, “Can I stand in the kitchen when I am not volleying?”: remained on Rule 11.A and correctly answered yes with the volley qualification.

Generated validation usage was 6,078 input tokens and 266 output tokens, estimated at $0.03837 excluding embedding/cache adjustments. Retrieval probes were bounded and read-only; embedding cost was not reported by the provider response.

The prior READY deployment `dpl_6hiTdgsh4UBZqZd1jRqwwf7grHKb` remains the application rollback target. Rollback requires no database action and cannot affect league business data.
