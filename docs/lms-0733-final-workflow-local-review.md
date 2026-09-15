# LMS-0733 final Season Ratings workflow — local review

Status: implemented and locally validated; STOP BEFORE PRODUCTION. Candidate base: `2916f887b1018205523e98c806e3867abed2db17`, branch `codex/lms0733-source-review`. Changes remain uncommitted in `C:\lwrpc-league-system\.local-validation\lms0733-candidate`. Version remains 0.1.555; no new release identity or deployment is claimed.

Both final owner decisions are implemented: first successful admission does not write Season DUPR; the next explicit Clean does. An NR player with no current roster retains an established number as **NO CHANGE — RETAIN ESTABLISHED NR RATING**. A blank number remains **DEFER — WAITING FOR DIVISION**. The detailed owner labels supersede the asynchronous “mark deferred” wording for populated values.

1. **Exact files changed.** The complete candidate manifest is below. The primary workspace's `docs/lms-0733-final-workflow-design.md` and `docs/project-roadmap.md` also received this policy/implementation update. This report is mirrored there. Unrelated primary-workspace changes were not included.

2. **Working schema.** Existing `dupr_doubles_rating` (text) and `dupr_reliability_rating` (numeric) remain. The additive migration introduces nullable numeric `dupr_age_based_rating`. Private `input_state` records field-level selected import/raw/value provenance and intentional-clear time; private `runs` records operation, actor, payload, before-images, result and calculation basis.

3. **Source mapping.** DUPR-ID-only matching, normalized with trim/uppercase. Doubles → working Doubles, decimal truncation to one place, literal NR preserved. RF → whole-number input; fractional RF is reviewed/rejected. Age → separate working age, truncated to one place. Explicit missing source fields do not fill inputs. Raw source precision remains in audit storage.

4. **659-row preview.** The saved September 10 approved source snapshot, with synthetic identities in the permanent test fixture, produces 659 Doubles fills, 659 RF fills, 551 age fills, 108 missing ages and zero protected fields/review rows. The full local population is 1,974. This is saved-snapshot validation, not a fresh production query. Fresh production counts must be regenerated before any authorized transfer.

5. **Fill protection.** Each field is independently NULL-only. Existing values, including zero or manually entered values, are not overwritten. Inactive/unknown-activity, ambiguous identity and not-found records cannot be filled. Existing source identity must still match its audit batch. Intentional Clear prevents refilling from the old selected snapshot.

6. **Integrated Upload.** One transaction writes source snapshot/import history and fills eligible blank working inputs. It never invokes another operation. Existing inputs can remain while a new source audit is recorded. Confirmation retry uses the same run identity; it cannot duplicate a committed run. The old source-only import endpoint now permits review only.

7. **Age separation.** Working Age-Based is displayed separately in the workflow preview. Missing age is “—”; no numeric substitute. The existing final-value column is now explicitly labeled PrimeTime Season DUPR. Neither storage nor display aliases the new input to the final output.

8. **Clean inputs.** Regular Clean reads working Doubles/RF, the single current ready active Rules version and current active applicable regular roster/divisions. Working age is visible for review but not used for regular calculation. The RF boundary and NR adjustment come from Rules text, not hardcoded 29/0.5 constants. Missing or unsupported Rules block the operation for review.

9. **Rated Clean.** Numeric working Doubles is truncated to one decimal. Saved-snapshot validation after local transfer produces 538 Rated CREATE proposals. Missing required working inputs defer; invalid or contradictory inputs require review.

10. **NR Clean.** Current regular placement supplies the division maximum and Rules adjustment. Never-rostered NR with blank numerical rating is valid and defers. The saved snapshot has 121 such deferrals, not errors. Candidate evaluation is read-only and uses current Rules metadata and proposed division context; blank NR does not itself cause a missing-rating failure. Existing community, duplicate, roster access and other admission paths remain in place; PrimeTime and generic Match Setup eligibility are unchanged.

11. **Higher/lower lifecycle.** Tests cover lower placement, lower plus higher, removing higher, and removing all. Explicit Clean increases/decreases according to the highest CURRENT regular placement. After all placements disappear, an established value is retained. PrimeTime placements do not supply a regular NR basis.

12. **Clean overwrite.** CREATE, UPDATE, NO CHANGE, DEFER and REVIEW are calculated before confirmation and revalidated at commit. Existing Season DUPR is not protected against explicit regular Clean. Obsolete exact system-generated NR note lines are removed only during a valid recalculation; unrelated note content is preserved. No roster-change or RF-change trigger was added.

13. **PrimeTime isolation.** Upload, transfer and Clear never write either final output. Regular Clean writes only regular Season DUPR and the narrowly identified obsolete note explanation. PrimeTime calculation/age eligibility remains a separate policy implementation gate.

14. **Clear.** Clears only the three working inputs and their current selection references for the selected season; preserves rows, final regular/PrimeTime ratings, notes, source/import history and all operational tables. Clear is an independent transaction. No subsequent action runs automatically.

15. **Clear confirmation.** Desktop UI names the season, affected records, exact per-field counts, and explicitly states both final ratings are preserved. It requires a separate confirmation. Changing season unmounts the workflow and invalidates a pending confirmation before submission.

16. **Existing Delete.** The separate destructive whole-row Delete Season Ratings action remains with its existing confirmation/handler. It was not executed. Existing Copy and manual editing workflows remain separate.

17. **Audit preservation.** Source batches remain immutable history. Field-level provenance retains the import/raw/value that filled each working field, even if later raw source refreshes preserve that input. Runs store before rating rows, input basis/clear time, source before-images and the exact reviewed Rules/roster/result basis. No automatic production undo or historical data cleanup was added.

18. **Initializer.** Abandoned UI removed; endpoint returns 410 and retains its View-As guard. Existing additive private database objects remain dormant and are not dropped. The final candidate has no initializer execution path.

19. **Migration.** `lwrpc-admin/supabase/migrations/20260910203000_season_ratings_working_workflow.sql`. SHA-256: `4af6b18c0c2712d0255c2ecc3a02af8130c4cd568e7adcbd30ddd6f5e77bcbed`. Not applied to production. No business-data backfill is included in the migration.

20. **SQL security.** Private tables have RLS and no direct anon/authenticated/service-role table grants. Administrative preview/commit execute through service-only functions with existing manager/commissioner actor authorization. Functions use an empty search path and tested postgres ownership. A separate read-only `season_ratings_roster_policy()` uses `auth.uid()` and the existing resolver for captain/manager/commissioner access; it returns Rules metadata only, not member/source rows. API origin, verified user, bounded body, View-As and actor/session-bound HMAC receipt controls remain enforced. Writes default off through `SEASON_RATINGS_WORKFLOW_WRITES_ENABLED`.

21. **Transactions/recovery.** Each operation has its own transaction/run. Commit locks and rechecks identity, source, inputs, current ratings, roster and Rules; stale previews fail. Tests force failure after partial work for all four operations and verify rollback. PostgreSQL 17.11 additionally passed migration rollback, production-compatible apply with dormant initializer, replay, outer transaction rollback, grants/RLS/ownership/search-path and concurrent identity lock checks. Contending operations fail at approximately the one-second lock timeout. Before-images support a separately reviewed scoped recovery; no automatic undo of a successful production batch is authorized.

22. **Tests/build.** `npm test`: 1,182 passed, zero failed. Final SQL follow-up: seven focused tests passed, including the full saved-source fixture and before-image assertions. `npm run lint`: zero errors, six pre-existing warnings in unrelated files. `npx tsc --noEmit --incremental false`: passed. `npm run build`: passed with synthetic loopback-only build configuration (the first unconfigured build lacked Supabase URL). `npm run verify:ai-pdf-server-bundle`: passed. `git diff --check`: passed. No app model endpoint was invoked.

23. **Normal LMS / desktop.** The full suite covers Commissioner/Captain/Player, Season Ratings, Teams/rosters, Match Setup, schedules, standings, Ask LWR and View-As. Interactive verification used the actual Ratings page and API against loopback-only synthetic PostgreSQL: preview, counted confirmation, explicit Clean, Clear, CSV refresh, missing age, protected transfer and successful-import review passed. Desktop 1440×1000 uses a horizontally scrollable preview table; final labels and integer RF display verified; no console errors/warnings. Browser sizing was restored. Other normal screens were covered by automated regression rather than a claimed new interactive production sweep. Mobile is not applicable to this administrative workflow; global mobile requirements are unchanged.

24. **Controlled production sequence.**
    1. Owner reviews this candidate, exact migration/hash, private audit model, bounded roster Rules read, and recovery evidence. Establish a new exact candidate commit/release identity before deployment.
    2. Separately authorize the exact additive SQL migration and app deployment. Apply the reviewed migration once; deploy with workflow writes disabled and the initializer disabled. Verify normal LMS and read-only desktop previews first. Retain the accepted application rollback and additive database compatibility; do not automatically drop objects.
    3. Capture a fresh scoped backup and integrity baseline. Pause relevant edits for the single authorized batch. Regenerate the source-to-working preview and compare all counts/identity/provenance. STOP if changed unexpectedly.
    4. Obtain separate explicit authorization for the counted source-to-working transfer. Enable only for that controlled action, execute once, verify inputs/provenance and unchanged regular/PrimeTime/operational data, then disable writes.
    5. Generate an actual working-input Clean preview using current Rules/current rosters. Obtain separate Clean authorization. Execute only its reviewed result, verify regular changes and zero PrimeTime/operational changes; retain scoped recovery evidence.
    6. Future refresh remains three separately confirmed operations: Clear Imported Ratings → integrated Upload → explicit Clean. No automatic import, Clean, Delete, admission or PrimeTime initialization.

## Candidate file manifest

- [docs/lms-0733-final-workflow-design.md](C:/lwrpc-league-system/.local-validation/lms0733-candidate/docs/lms-0733-final-workflow-design.md)
- [docs/lms-0733-final-workflow-local-review.md](C:/lwrpc-league-system/.local-validation/lms0733-candidate/docs/lms-0733-final-workflow-local-review.md)
- [docs/lms-0733-working-postgres-results.json](C:/lwrpc-league-system/.local-validation/lms0733-candidate/docs/lms-0733-working-postgres-results.json)
- [docs/project-roadmap.md](C:/lwrpc-league-system/.local-validation/lms0733-candidate/docs/project-roadmap.md)
- [lwrpc-admin/app/api/ratings/import/route.js](C:/lwrpc-league-system/.local-validation/lms0733-candidate/lwrpc-admin/app/api/ratings/import/route.js)
- [lwrpc-admin/app/api/ratings/initialize/route.js](C:/lwrpc-league-system/.local-validation/lms0733-candidate/lwrpc-admin/app/api/ratings/initialize/route.js)
- [lwrpc-admin/app/api/ratings/workflow/route.js](C:/lwrpc-league-system/.local-validation/lms0733-candidate/lwrpc-admin/app/api/ratings/workflow/route.js)
- [lwrpc-admin/app/components/SeasonRatingsWorkflow.js](C:/lwrpc-league-system/.local-validation/lms0733-candidate/lwrpc-admin/app/components/SeasonRatingsWorkflow.js)
- [lwrpc-admin/app/lib/nrRosterAdmission.js](C:/lwrpc-league-system/.local-validation/lms0733-candidate/lwrpc-admin/app/lib/nrRosterAdmission.js)
- [lwrpc-admin/app/lib/seasonRatingsWorkflowServer.js](C:/lwrpc-league-system/.local-validation/lms0733-candidate/lwrpc-admin/app/lib/seasonRatingsWorkflowServer.js)
- [lwrpc-admin/app/ratings/page.js](C:/lwrpc-league-system/.local-validation/lms0733-candidate/lwrpc-admin/app/ratings/page.js)
- [lwrpc-admin/app/teams/[id]/page.js](C:/lwrpc-league-system/.local-validation/lms0733-candidate/lwrpc-admin/app/teams/[id]/page.js)
- [lwrpc-admin/scripts/working-ratings-browser-fixture.mjs](C:/lwrpc-league-system/.local-validation/lms0733-candidate/lwrpc-admin/scripts/working-ratings-browser-fixture.mjs)
- [lwrpc-admin/scripts/working-ratings-postgres.mjs](C:/lwrpc-league-system/.local-validation/lms0733-candidate/lwrpc-admin/scripts/working-ratings-postgres.mjs)
- [lwrpc-admin/supabase/migrations/20260910203000_season_ratings_working_workflow.sql](C:/lwrpc-league-system/.local-validation/lms0733-candidate/lwrpc-admin/supabase/migrations/20260910203000_season_ratings_working_workflow.sql)
- [lwrpc-admin/test/helpers/ratingsWorkflowDatabase.mjs](C:/lwrpc-league-system/.local-validation/lms0733-candidate/lwrpc-admin/test/helpers/ratingsWorkflowDatabase.mjs)
- [lwrpc-admin/test/helpers/seasonRatingsSourceValues.json](C:/lwrpc-league-system/.local-validation/lms0733-candidate/lwrpc-admin/test/helpers/seasonRatingsSourceValues.json)
- [lwrpc-admin/test/nrRosterAdmission.test.mjs](C:/lwrpc-league-system/.local-validation/lms0733-candidate/lwrpc-admin/test/nrRosterAdmission.test.mjs)
- [lwrpc-admin/test/seasonRatingsRfOwnerHold.test.mjs](C:/lwrpc-league-system/.local-validation/lms0733-candidate/lwrpc-admin/test/seasonRatingsRfOwnerHold.test.mjs)
- [lwrpc-admin/test/seasonRatingsWorkflow.test.mjs](C:/lwrpc-league-system/.local-validation/lms0733-candidate/lwrpc-admin/test/seasonRatingsWorkflow.test.mjs)
- [lwrpc-admin/test/seasonRatingsWorkflowSafety.test.mjs](C:/lwrpc-league-system/.local-validation/lms0733-candidate/lwrpc-admin/test/seasonRatingsWorkflowSafety.test.mjs)
- [lwrpc-admin/test/seasonRatingsWorkflowSnapshot.test.mjs](C:/lwrpc-league-system/.local-validation/lms0733-candidate/lwrpc-admin/test/seasonRatingsWorkflowSnapshot.test.mjs)
- [lwrpc-admin/test/sourceRatingsReview.test.mjs](C:/lwrpc-league-system/.local-validation/lms0733-candidate/lwrpc-admin/test/sourceRatingsReview.test.mjs)

Execution logs are under `.local-validation/working-logs/`. PostgreSQL results are in `docs/lms-0733-working-postgres-results.json`. The source-value test fixture contains ratings only and synthetic identity generation, not production member identifiers or names.

No production SQL, deployment, transfer, Clean, Clear, Delete, Upload, roster admission or rating mutation occurred.
