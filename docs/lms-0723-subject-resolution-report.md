# LMS-0723 / 0.1.545 — subject-resolution correction

Status: implemented and validated locally; final validation recorded below. STOP FOR OWNER REVIEW. No production migration, deployment or production data access in this correction pass. Accepted production remains LMS-0722 / 0.1.544.

## Router and subject model

The old router treated any `me` as self, even when it meant the recipient in `Tell me John Smith's Season DUPR`. The new deterministic parser removes the request wrapper, identifies the requested field's possessor/person, and then chooses the capability. It recognizes possessive rating/contact/team/roster/match subjects, rating/contact `for/of` forms and named-person team questions. `my` must modify the requested field, or `I` must occupy the team-membership subject. Generic rating questions still clarify Season versus PrimeTime Season DUPR.

| Subject state | Behavior |
|---|---|
| SELF | Genuine self field/team relationship; never inferred merely from discourse `me` |
| EXPLICIT_PERSON | Named subject; select cross-person policy before population/name resolution |
| FOLLOWUP_REFERENT | Requires validated encrypted user/session-bound context; reauthorize for the new operation |
| NONE | No person specified; existing authorized team selection/document routing remains bounded |
| AMBIGUOUS | Competing subjects/comparisons return unsupported; no live lookup |

Explicit subject wins over recipient wording. Genuine competing self/other references, including `my rating and John's` and `John's rating and mine`, do not pick one subject. `Tell John my rating` is parsed as self only; no sending or messaging capability was added.

Continuation context is copied only for actual bounded continuation actions (choice, pagination, rating-kind clarification). A fresh self question or newly named person does not inherit the previous subject/team/season. Subject classification is carried in the encrypted context, not trusted from browser body fields.

## Protected database boundary and exact migration

The second defect was in `ai_live_private.lookup`, behind the unchanged public `ai_live_lookup` wrapper: person resolution covered rating/contact and protected subject IDs, but not names on team operations. The target defaulted to requester and team filtering tested only the original `subject` key.

The correction adds `v_subject_kind` and `v_person_lookup` within that function. It rejects invalid/missing required references, mixed name/reference inputs, and self operations supplied with a different subject/name. A name or explicit/referential state enters authorized person resolution, with no fallback. Team operations narrow to the resolved target's active team membership and recheck it at final projection. Team results/choices preserve that resolved ID only in the server-to-server result and encrypted continuation context.

Resolution continues within the existing active Captain/Club Pro managed-roster population or Manager/Commissioner directory population. Player cross-person access remains denied. No global name search followed by authorization filtering was added. A raw name is only a search term; the protected result uses the identity resolved inside the authorized population in the same operation.

Final exact migration: [20260907110701_lms0723_live_intelligence.sql](../lwrpc-admin/supabase/migrations/20260907110701_lms0723_live_intelligence.sql).

Bounded before/after function diff: [lms-0723-subject-migration.patch](lms-0723-subject-migration.patch).

SHA-256: `A069AB845DEEBBEB5477B824D4825B0338872AAA3CFB2591305A567F168AE44D`.

Only the private lookup function body changed in this correction. No new tables/columns, unrelated RLS changes, signature changes, default-privilege changes or grant changes. The surrounding pending migration is unchanged. Functions remain SECURITY INVOKER with fixed empty search_path and qualified relations. PUBLIC/anon/authenticated EXECUTE is revoked; service_role has EXECUTE. Browser roles cannot call the protected RPC. The existing protected session helper, its constrained role, and retention permissions remain unchanged.

## Six-capability matrix and projections

| Capability | Self / applicable default | Authorized explicit person | Unauthorized/nonexistent person | Projected facts |
|---|---|---|---|---|
| SELF_RATING | Auth-bound self rating | Cross subject rejected here; router uses PLAYER_RATING | Denied, never self fallback | Name, requested Season or PrimeTime rating and season |
| PLAYER_RATING | Genuine self wording routes SELF_RATING | Named person's requested rating | Same safe not-found within authorized population | One requested rating field, not full rating row |
| PLAYER_CONTACT | No new self-contact capability | Named authorized email | Safe not-found; no email query or outside-population existence signal | Display name and email only |
| SELF_TEAM / TEAM_IDENTITY | Existing own/managed authorized team context | Only that person's team within caller's allowed teams | Safe not-found | Team/division/league/season labels |
| TEAM_ROSTER | Existing authorized team context | Only that person's authorized team roster | Safe not-found | Roster display names, 25/page; no ratings/contact |
| NEXT_MATCH | Existing authorized team context | Only that person's authorized team's next match | Safe not-found | Published next match/date/time/venue/opponent; no lineup assertion |

All six reject invalid explicit/follow-up subject paths without returning self data. Supported cross-person operations preserve bounded authorized ambiguity; SELF_RATING rejects cross-person requests. Regular Players remain denied cross-person operations. Existing Captain, both Co-Captain slots, assigned Club Pro, location-only Pro denial, Manager and Commissioner controls remain in the suite.

## Permanent blocker reproductions and security evidence

1. Actual router/service plus actual SQL: `Tell me Synthetic Person1's Season DUPR.` as its managing Captain routes PLAYER_RATING / EXPLICIT_PERSON and returns Person1's synthetic 3.72. Captain's distinct synthetic rating is 1.25. A test-only security-invoker view raises if the requester rating is projected. The named-player request succeeds, and a deliberate self control trips that guard, proving the guard is effective.
2. The original direct RPC shape `SELF_TEAM, name: Synthetic Person9` for an unrelated player now returns not_found, matching the protected-reference denial. It never returns the Captain's team.
3. After explicitly assigning that other team to the synthetic Captain, authorized named team/roster/next-match requests return Other Team, even though the Captain also manages Synthetic Team. This catches wrong-team substitution hidden by a shared-team fixture.
4. Unauthorized named email and nonexistent-name requests use authorized-population-only resolution. Removing email SELECT still allows the unauthorized request to safely deny; an authorized contact query fails without that grant. No existence confirmation outside the allowed population.
5. SQL column grants independently prove team operations need no email/rating access; ratings work with only their required rating columns; contact works with rating access revoked. Existing field-projection tests remain.
6. Malformed/missing/outside-population references and contradictory self/name inputs deny across all six operations. Forged browser member/team/subject/role fields are ignored by the parameter allowlist. Tampered, expired, cross-user and cross-session encrypted receipts fail without self fallback.
7. `What team is he on?` after an authorized rating resolves the encrypted subject and reauthorizes. Removing the synthetic roster relationship makes the next follow-up deny. New Question/cleared context produces unsupported without database access; a fresh self question does not retain the previous person.

## Models, telemetry and legacy behavior

Answer-model calls = 0; embedding calls = 0 for deterministic live controls. Tests replace fetch with a rejecting counter around all six live executions and the real SQL named-rating blocker; the count remains zero. Lookup and quality storage are locally injected; no synthetic names/live values are sent externally. Production zero-call checks remain pending deployment.

The existing explicit telemetry allowlist is unchanged: outcome intent/status/relationship/version/timing, Stage 3 false, model skipped, zero tokens, no review occurrence/group. Tests exercise actual Stage 7 capture and assert no raw question, name, rating, contact, team/roster/match details or protected subject reference. Feedback uses the existing typed encrypted receipt and sanitized metadata. Existing security audit target references remain confined to the approved private audit architecture; denial audit does not store the queried raw name/email.

No document/RAG selection, corpus, Approved Answer, HMAC or Stage 7 semantics were changed. Existing regression controls remain in the full suite.

## Validation

| Command | Final result | Evidence |
|---|---|---|
| npm test | PASS: 633 tests, 0 failures/skips | [test log](lms-0723-subject-tests.log) |
| npm run lint | PASS: 0 errors, six existing warnings | [lint log](lms-0723-subject-lint.log) |
| npx tsc --noEmit --incremental false | PASS | [type log](lms-0723-subject-types.log) |
| npm run verify:ai-pdf-server-bundle | PASS | [PDF log](lms-0723-subject-pdf.log) |
| npm run build | Compiled successfully; then EPERM writing .next/cache/.tsbuildinfo | [normal build log](lms-0723-subject-build.log) |
| node scripts/lms0723-isolated-build.mjs | PASS: clean production compile, types and route generation | [isolated build log](lms-0723-subject-isolated-build.log) |
| git diff --check | PASS | [diff log](lms-0723-subject-diff-check.log) |

The final migration security replay passed under inherited production-like ALL grants: effective browser/service function execution, private RLS and final table/column/ACL state are stable. ACL entries were compared in sorted order because revoke/regrant can reorder equivalent ACL entries; that ordering difference was a test assertion issue, not a changed effective privilege.

Earlier 627-test validation is historical; this correction's final suite is 633 tests. Normal build failure is the known filesystem cache write error after successful compilation, not an application type error; standalone types and the final isolated clean build both pass. No production or browser acceptance claim is made by these local results.

## Exact correction files

Application/SQL/tests:

- `lwrpc-admin/app/lib/liveLmsIntent.js`
- `lwrpc-admin/app/lib/liveLmsService.js`
- `lwrpc-admin/supabase/migrations/20260907110701_lms0723_live_intelligence.sql`
- `lwrpc-admin/test/liveLms.test.mjs`
- `lwrpc-admin/test/liveLmsDatabase.test.mjs`

Documentation: this report, the function diff, implementation report, production acceptance report, architecture addendum, historical stop report status note, project roadmap, and `lms-0723-subject-*.log` validation artifacts. Unrelated pre-existing workspace changes were preserved. No version file/package version change in this correction.

## Production continuation — requires owner review first

1. Read-only preflight the correct Supabase project and accepted LMS-0722 / 0.1.544 deployment; record schema/RLS/grants, object/signature collisions, active corpus/version/chunk baseline, Approved Answer/Stage 7 history, HMAC configuration and relationship schema/count/hash baseline without exposing secrets.
2. Review this exact final migration/hash and effective security state against production defaults. Stop on any discrepancy. Apply the pending LMS-0723 migration once only after authorization is resumed; do not reapply earlier migrations.
3. Verify new objects, function bodies, fixed search paths, effective grants/RLS, browser denial, and unchanged unrelated schema/data.
4. Deploy LMS-0723 / 0.1.545 through the normal pipeline; verify READY and live version. No environment/HMAC changes or document processing expected.
5. Run the previously approved Commissioner smoke test and role/capability acceptance matrix with legitimate authenticated Player/Captain/Co-Captain/Club Pro/Manager/Commissioner sessions. Include the two permanent subject blockers and negative/projection tests. Do not fabricate production members, roles or teams.
6. Verify zero model/embedding calls, live provenance, context/New Question/cross-user isolation, sanitized Stage 7 outcomes, one authorized feedback event/correlation, and contact audit. Preserve existing document feedback.
7. Run the approved nine-question LMS-0722 sanity subset (both league counts/formats, rally qualification, Saturday mixed-only, website, password help, document navigation), Cross-League Leakage = 0. Check Approved Answer history and .65, and read-only activation-history follow-up with no inferred backfill.
8. Measure production auth/resolution/query/format/total latency. Compare final integrity against the preflight baseline: no operational member/team/roster/match/corpus/HMAC mutation, historical records intact, only authorized acceptance writes.
9. Report the full production matrix and acceptance decision. Stop immediately on security/privacy/authorization/RAG or materially incorrect result; do not fix and continue without review.

No production continuation was performed in this correction pass. No subsequent version or capability phase was started.
