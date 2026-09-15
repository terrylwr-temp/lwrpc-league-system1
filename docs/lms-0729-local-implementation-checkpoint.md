> Superseded by the owner-approved restricted-reader adjustment and [complete local review](lms-0729-local-implementation-review.md). The stopped state below is historical, not current.

# LMS-0729 / 0.1.551 — local implementation SQL-boundary stop

**INCOMPLETE — STOP FOR SQL DESIGN REVIEW.** No production mutation or deployment. Package/version files remain accepted LMS-0728 pending completed candidate. Partial local work is retained.

The owner's scope decision section 21 says: “If SQL scope grows beyond the reviewed bounded design: STOP.” The reviewed design specified an invoker competition helper and no business-table ACL expansion. Synthetic View-As fails because its caller lacks four required standings columns; read-only production privilege inspection confirms this is real, not a fixture gap.

| Required team_standings fields | service_role | lms_view_as_executor | lms_view_as_reader |
|---|---|---|---|
| team_id, match_wins, match_losses, standings_points | SELECT | SELECT | SELECT |
| division_id, league_id, matches_played, match_ties | SELECT | **DENIED** | SELECT |

The failure is inside the new private team_record helper called by protected View-As lookup. Normal identity and record assertions run before that point; the combined SQL test is still FAIL, not accepted.

## Concrete smallest proposed adjustment — not implemented

Keep the exact minimum team-record projection, but execute its fixed read body as the existing **lms_view_as_reader** role rather than the View-As executor: private SECURITY DEFINER function with empty search_path, owner lms_view_as_reader, EXECUTE restricted to the existing trusted service/executor callers. Grant that reader only the schema USAGE needed to execute this helper in ai_live_private; use reviewed temporary ownership-transfer mechanics without retaining CREATE. Reuse its existing column SELECT/RLS permissions. No new business-table grants, no UPDATE/DELETE, no normal standings changes, no new public/browser RPC.

The helper trusts only internal callers after normal identity or protected View-As validation and returns only record/count/points/context. The role is the accepted restricted page-read role, not postgres/service-role privilege escalation. This changes the reviewed invoker-only function ownership/security contract, so explicit review is required before altering it. Alternative four-column executor grants would change business-table ACLs and are not recommended or implemented.

## Requested implementation report — current state

1. **Exact work files:** app/lib/liveTeamRecord.js (new); app/lib/liveLmsIntent.js; app/lib/liveLmsService.js; test/liveLms.test.mjs; test/lms0729LiveRecord.test.mjs (new); test/helpers/liveRecordFixture.mjs (new); scripts/lms0729-identity.sql, scripts/lms0729-record.sql, scripts/lms0729-build-migration.mjs (new); migration below. New docs: lms-0729-rollback.sql, lms-0729-function-manifest.json, lms-0729-targeted-tests.txt, this checkpoint, post-lms-0729-rank-consistency.md; roadmap updated. Git diff also contains previous releases' uncommitted work; this list describes this turn, not all workspace differences.
2. **Identity:** local restricted resolver uses verified Auth actor, unique valid member/linkage and existing identity coordination; strict zero-role match returns Player; no role/account write. Explicit recognized precedence retained. Not fully validated.
3. **Feedback:** local normal feedback identity uses same resolver; existing server receipt path retained. View-As feedback stripping unchanged. Version CHECK is additively updated for LMS-0729; full compatibility tests pending.
4. **Team record:** local deterministic intent/formatter and SQL read candidate; normal synthetic read works before View-As failure. Not release-ready.
5. **Source:** stored team_standings wins/losses/ties/played/points, joined to exact team/division/league/season; rank absent. No recalculation/rebuild.
6. **My team:** current roster or actual team leadership; no community inference, no management-wide SELF fallback.
7. **Multiple teams:** SQL returns bounded choices; complete service receipt/choice round-trip coverage still pending.
8. **Season/league:** candidate maintains context joins, has explicit season-name filtering. Historical/named-team receipt retention and comprehensive scoping remain unfinished; no completion claim.
9. **Counts/points:** deterministic formats, absent data limitation, stored numeric results; future raw matches never queried for new calculation.
10. **Rank:** routing suite passes all requested deferred-place/advanced-why variants with Live limitation; no rank read/answer and no sorter edit.
11. **Rules contrast:** three policy contrast questions pass existing document routing in the deterministic suite. No document/model request made.
12. **Implicit Player:** normal zero-role synthetic lookup/feedback assertions reached successfully; invalid/pending-email denial checked before combined test failure. Full race/duplicate/multi-role matrix still pending.
13. **View-As:** existing proof/identity guard retained; record read fails on confirmed missing column permission. This is the blocking design adjustment. Production View-As untouched.
14. **Privacy/security:** projection excludes rank/member/email/RF/roster. Browser helper access denial assertions precede the failure. Broader planned security/race tests not yet complete. No business-table permission added.
15. **Migration:** CLI-created 20260909212951_lms0729_live_identity_team_record.sql; current incomplete-candidate SHA-256 **dbfd60b12cc9511c121a3d9e891d35d5db011ede2d2f1c621b500ef788cdfbd2**. NOT a production-approved hash. Generator has source/ACL guards; exact final constraint/helper checks remain review work. Rollback candidate deliberately retains additive feedback CHECK compatibility to preserve any future feedback; not yet rehearsed.
16. **PostgreSQL:** PGlite fixture apply and replay reached runtime queries; combined matrix fails at View-As permission. Production-matched PostgreSQL 17 replay has **not run** because SQL contract is stopped. No production SQL application.
17. **Tests:** targeted 2 tests: **1 PASS / 1 FAIL**. Routing test passes; combined SQL test fails. Required full npm test/lint/types/PDF/build checks have not run for this incomplete candidate. Scoped git diff --check passes, with line-ending warnings only.
18. **Model calls/cost:** zero OpenAI/embedding calls; $0 model cost. Provider calls forbidden in deterministic routing test. Supabase documentation/CLI access is unrelated to model validation.
19. **Normal-LMS regression:** normal standings/sorter/matches/scores/schedules/teams/rosters/Match Setup source not edited. Full candidate regression is pending, not PASS.
20. **Rank follow-up:** mandatory post-LMS-0729 item recorded with all four causes; no claim of current live ranking error.
21. **Production sequence:** after approving the private-reader helper contract, finish local implementation and required full/PG/browser validations; present exact final migration/app hashes and rollback evidence. Stop for deployment approval. Then approved migration once and security/business verification → exact deploy → NORMAL LMS FIRST and owner Captain/Player checks → integrity → targeted normal Live/feedback and effective View-As → final zero-model/privacy/integrity/Exit. No production activity authorized by this checkpoint.

No implementation beyond the identified SQL boundary is being undertaken. This stop comes from the owner's scope instruction, not an automatic approval-review rejection.
