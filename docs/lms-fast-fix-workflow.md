# LMS FAST FIX — permanent owner-authorized workflow

Effective September 10, 2026. FAST FIX is for small, localized application defects with clear expected behavior backed by existing authoritative evidence. It permits application deployment without separate design/implementation approvals when every gate below passes. The live-production protection rules remain in force.

## Qualifying scope

Existing Important Dates/rule retrieval; obvious language variants or synonyms; established document-versus-Live routing; unnecessary league/season clarification; selection among active sources; small display/source-label corrections. Root cause must be localized, with no new policy, data capability, authorization, or architecture decision.

## Required sequence

1. Reproduce the exact reported failure and identify the authoritative expected behavior.
2. Diagnose the first failing routing, retrieval, or display stage.
3. Make the smallest localized correction.
4. Add permanent tests for exact wording, 2–5 obvious variants, and a nearby routing contrast. Add relevant boundary cases where needed.
5. Run focused affected tests, then repository-required lint/static/build checks.
6. Avoid broad generated benchmarks. If output validation is necessary, use a few affected cases and record usage/cost.
7. Verify the immutable application identity, scoped diff, normal LMS health, and recovery path; deploy the application correction directly.
8. Replay the exact production failure, a natural variant, and a neighboring regression control. Preserve source classification and context.
9. If all pass, record **FAST FIX — PRODUCTION ACCEPTED**, commit/deployment identity, evidence, tests, and any generated usage/cost.

Full regression remains required for normal releases and periodically after accumulated FAST FIX changes. A tiny synonym correction does not require a 1,000+ case benchmark unless shared-code changes create a genuinely broad blast radius.

## Immediate stop conditions

Leave FAST FIX and STOP FOR REVIEW if any SQL/schema/migration, RLS/grant/security, production business-data mutation, new business-policy decision, unclear authoritative answer, corpus mutation/reprocessing, Approved Answer requirement, Live authorization expansion, cross-cutting shared-router redesign, more than a small localized application change, or normal LMS regression is discovered.

FAST FIX excludes ratings calculations/writes, roster eligibility policy, schedule/scoring changes, destructive operations, View-As authorization, new personal-data access, and new Live capabilities. It does not authorize operational league data mutation.

If the answer exists in active authoritative documents, fix retrieval. Do not duplicate it in Approved Answers.
