# Saturday DUPR posting restoration FAST FIX

Status: **FAST FIX — PRODUCTION ACCEPTED**, September 16, 2026.

All three current reports reproduced on application f58de6f: “For the Saturday league, will that be entered in DUPR?” incorrectly requested the full question; “Will the Saturday league games be entered into DUPR” and “Do all games in the Saturday league post to DUPR” returned document fallback.

Root cause: previously accepted posting changes (6bd7b5e, 13ef008, e35fbc4) existed on the isolated deployment branch but were absent from the current main application. Restore only their posting intent, league-scoped passage selection and bounded authority-review integration, plus one narrow self-contained posting exception to the pronoun follow-up detector. No other historical feature patches are imported. The fix and permanent tests will now be committed on the same main branch used by GitHub Desktop and production, preventing this specific branch handoff loss.

Active authoritative source: LWR DUPR League Rules version f4c0e95b-e6c9-4c2a-bf26-a24d10c329d9, Rule 6.2.3.6, page 10. Gender-based games post to DUPR; mixed doubles and Picklebreaker games do not. Existing source content and source classification retained. No policy, calculations, database objects, authorization, Approved Answers, corpus, or business data changes.

69 focused tests pass, covering all reported questions, entry/posting variants, complete-source qualifications, wrong/missing league scope, low-ranked controlling evidence, existing conversations, personal status, procedure and rating contrasts, and the accepted Picklebreaker-partner fix. The new “that” test covers both no prior context and unrelated signed prior context; an unqualified “Will that be entered in DUPR?” still requests clarification. A single read-only live-corpus probe recovered the exact current clause for the first question without answer generation.

Production baseline: real Terry Adelman Commissioner Teams renders 92 active of 115, with Add Team available. Fourteen protected-table counts and full-row hashes captured read-only. Recovery: READY dpl_USE6qPsje5xz5mzp1XyWXG6EBjz8, application f58de6f619e80813f4bf121bb28af933673213cf. Application-only rollback; no database action. No View-As or business write probes.

Lint: zero errors, 11 existing warnings. Production build and diff checks passed. Application diff: 12 insertions and two replacements across four existing modules; focused tests and fixture restored. No FAST FIX escalation condition triggered.

## Production acceptance

Application e88946c00bb2e50aa6d165fe16c657208479c406 on main; READY deployment dpl_Ej7wcMdKbMMTNSrHrs6PjHu8S5aF; immutable lwrpc-admin-c4uoxua2u-terry-lwrpc.vercel.app. Production alias league.lwrpickleballclub.com verified. Normal Commissioner Teams reload passed before feature acceptance (92 active of 115; Add Team present). All 14 protected-table counts and full-row hashes equal the pre-deploy baseline; see saturday-dupr-posting-restoration-integrity.json.

Each UI replay began with New Question in the real Commissioner session:

- 11:28:56 UTC: “For the Saturday league, will that be entered in DUPR?” now answers qualified Yes without clarification: gender-based games post; mixed/Picklebreaker do not. Rule 6.2.3.6 page 10.
- 11:29:22 UTC: “Will the Saturday league games be entered into DUPR” gives the same qualified answer and source.
- 11:30:00 UTC: “Do all games in the Saturday league post to DUPR” correctly answers No with both exclusions and the same source.
- 11:30:35 UTC: neighboring “Can we change mixed doubles partners for the Picklebreaker?” remains No, same Mixed Round partners, Rule 6.2.3.5 page 9.

All four acceptance outcomes: answer / validated_structured_output, model gpt-5.5-2026-04-23. Combined 6,366 input and 211 output tokens; estimated generation cost $0.03816 at existing configured rates, excluding embeddings/cache adjustments; not an invoice. No broad generated benchmark.

Focused logs/probe retained under ignored .local-validation/posting-restore-*. No application-only patch changes any normal business write path, security boundary or authorization. SQL reads were diagnostic only; no migrations or database writes. The prior accepted f58de6f deployment is the application-only recovery target. Unrelated earlier acceptance documentation in the working tree was excluded from the deployed commit.
