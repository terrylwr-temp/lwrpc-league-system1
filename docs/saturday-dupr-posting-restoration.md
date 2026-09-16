# Saturday DUPR posting restoration FAST FIX

Status: local validation, production acceptance pending.

All three current reports reproduced on application f58de6f: “For the Saturday league, will that be entered in DUPR?” incorrectly requested the full question; “Will the Saturday league games be entered into DUPR” and “Do all games in the Saturday league post to DUPR” returned document fallback.

Root cause: previously accepted posting changes (6bd7b5e, 13ef008, e35fbc4) existed on the isolated deployment branch but were absent from the current main application. Restore only their posting intent, league-scoped passage selection and bounded authority-review integration, plus one narrow self-contained posting exception to the pronoun follow-up detector. No other historical feature patches are imported. The fix and permanent tests will now be committed on the same main branch used by GitHub Desktop and production, preventing this specific branch handoff loss.

Active authoritative source: LWR DUPR League Rules version f4c0e95b-e6c9-4c2a-bf26-a24d10c329d9, Rule 6.2.3.6, page 10. Gender-based games post to DUPR; mixed doubles and Picklebreaker games do not. Existing source content and source classification retained. No policy, calculations, database objects, authorization, Approved Answers, corpus, or business data changes.

69 focused tests pass, covering all reported questions, entry/posting variants, complete-source qualifications, wrong/missing league scope, low-ranked controlling evidence, existing conversations, personal status, procedure and rating contrasts, and the accepted Picklebreaker-partner fix. The new “that” test covers both no prior context and unrelated signed prior context; an unqualified “Will that be entered in DUPR?” still requests clarification. A single read-only live-corpus probe recovered the exact current clause for the first question without answer generation.

Production baseline: real Terry Adelman Commissioner Teams renders 92 active of 115, with Add Team available. Fourteen protected-table counts and full-row hashes captured read-only. Recovery: READY dpl_USE6qPsje5xz5mzp1XyWXG6EBjz8, application f58de6f619e80813f4bf121bb28af933673213cf. Application-only rollback; no database action. No View-As or business write probes.

Lint: zero errors, 11 existing warnings. Production build and diff checks passed. Application diff: 12 insertions and two replacements across four existing modules; focused tests and fixture restored. No FAST FIX escalation condition triggered.
