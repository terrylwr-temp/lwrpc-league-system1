# Ask LWR Season DUPR recording date — FAST FIX

September 10, 2026. Application-only correction under the owner's permanent FAST FIX authorization. Production acceptance is recorded separately after deployment/replay.

## Diagnosis and authoritative evidence

The first failure for the four reported questions is `questionIntent`: record, done, and bare rating-date forms remain unresolved, so `needsPolicyEvidence` does not perform the bounded active-document completion read. The fallback may retrieve a general rule without the actual event. Deterministic calls reproduced all four misses against accepted commit `6d86e113ba1d40cc623f435bfd68753ea7535d5b`. Established/locked forms already select both policy and dates; those were not the same retrieval failure.

Fresh read-only production verification found active **2026 Fall League Important Dates**, document `c6bdcc3b-c009-47c6-9dec-642b8a988a4f`, version `f811e60f-9af8-444f-b009-9594a530acd6`, label `v20260904112405-f811e60f`, file `All-Leagues-Important-Dates.pdf`. Active and ready; all three event chunks are searchable. The schema uses `is_searchable`, not a separate include-in-AI field.

| Applicable section | Page | Exact event |
|---|---:|---|
| Weekday DUPR League Key Dates | 1 | Sept. 27, Sunday – Season DUPR ratings recorded |
| PrimeTime DUPR League Key Dates | 2 | Sept. 27, Sunday – Season DUPR ratings recorded |
| Saturday DUPR League Key Dates | 1 | Sept. 27, Sunday – Season DUPR ratings recorded |

The active title and chronological event list establish September 27, **2026**. Saturday's season continues into 2027; this does not make Saturday an applicable choice for an explicit Fall PrimeTime request. All three current recording events share a date, so an unqualified question can receive a direct answer. The exact general establishment rule is in active League Rules version `6ae10e5f-fdde-41be-a941-d1b7ed360d1a`, page 3, Rule 4.1. General policy remains distinct from an actual-date request.

## Localized correction

Extend the existing bounded registration/schedule intent and date-event selector with `season_rating_date`. No shared-router redesign. Recognize clear Season DUPR/Season ratings timing with record/recorded, set, established/establishment, rating date, done, locked/lock in, official, and actual date. Exclude general determination, calculations/reset, completed personal status, and mixed operational requests from this new path.

Reuse existing league/season extraction, current active source read, exact excerpt ranges, year verification, complete league coverage, and bounded differing-date clarification. The source text supplies the date; there is no September 27 application constant. Explicit Fall PrimeTime retains its year/league and never offers Saturday. General establishment explanations retain their existing Rules path.

Classification stays **OFFICIAL RULES** through existing document provenance. “What is my Season DUPR?” and “Has my Season DUPR been recorded?” retain the existing SELF_RATING route; the latter does not gain a new recording-timestamp capability. “When will my Season DUPR be recorded?” uses official date evidence.

## Files and validation

Application files under `lwrpc-admin/app/lib`: `aiRegistrationReleaseIntent.js`, `aiPolicyEvidence.js`, `aiLeagueDateFacts.js`, `aiLeagueDateEvidence.js`, `aiQuestionApplicability.js`, `aiConversation.js`. Permanent controls: `test/seasonDuprRecordingDate.test.mjs`, `test/fixtures/season-dupr-date-source.json`. Workflow documentation: `AGENTS.md`, `docs/lms-fast-fix-workflow.md`, project roadmap, this report.

43 exact/variant, scope, future-date, missing-evidence, Live contrast, and LMS-0732 tests pass. An additional 108 affected conversation/date/evidence-fidelity tests pass. Schedule-release still selects October 7. Lint: zero errors, six existing warnings. Production build passed after supplying existing public build variables and replacing a temporary out-of-root dependency junction with a local dependency copy; no source configuration workaround.

No SQL, schema, migrations, security/authorization, corpus processing, Approved Answers, business-policy, ratings, or operational-data changes. The unrelated local Delete/DUPR Notes correction is excluded.

## Controlled production sequence and cost

Commit the scoped candidate, verify every exported Git blob, retain the accepted deployment as rollback target, and deploy exact application source with both ratings write gates false. Verify normal LMS health. Replay the exact reported record wording, the done variant, explicit Fall PrimeTime date, and the neighboring October 7 schedule control. These four generated checks are sufficient; no broad generated benchmark. Record actual available usage/cost after replay. Stop on any FAST FIX escalation condition or regression. Mark production accepted only after successful replay.
