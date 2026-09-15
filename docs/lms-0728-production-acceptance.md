# LMS-0728 / 0.1.550 — controlled production acceptance

**PRODUCTION ACCEPTED — September 9, 2026.** Owner normal Captain and Player checks: PASS. Evidence distinguishes live observations from accepted local controls; no new release started.

1. **Migration:** `20260909202216_lms0728_implicit_player.sql`.
2. **SHA-256:** `fa1c8db02e06c505997d97a7d256f5e85518fd8c11404447fba61a50626e4102`, recalculated immediately before applying exact source.
3. **Preflight:** correct production project, accepted LMS-0727 deployment, authenticated normal Commissioner, expected function/security baseline, ten maintenance successes, no prior LMS-0728 migration. Business changes since LMS-0727 (101 teams/175 roles versus 98/170) were already present before this migration.
4. **Migration result:** applied once successfully; provider-assigned history version `20260909205100`, name `lms0728_implicit_player`, one exact matching source entry. Do not reapply.
5. **Functions/security:** only reviewed member_role and lookup bodies changed. New body MD5s: `8ffcd39ccac0b130699a103caefedcd0` and `3d8ce5f61c83215561784840ff7ee551`. Owners postgres, invoker, empty search_path, ACL postgres/executor only unchanged. Dispatcher, read infrastructure, role memberships, RLS, table/column grants and normal write authorization unchanged.
6. **Deployment:** `dpl_H3YruetnXPVYjEGdyvEpiBG92i1E` READY; both normal and View-As aliases attached. Exact 313-file package: 309 unchanged, four reviewed replacements. Per-file manifest identifies candidate; old Git metadata is not release identity.
7. **Normal LMS first:** agent Commissioner dashboard, teams, standings, schedules, Members/detail controls and compact Ask LWR opening PASS. Owner reported normal Captain and Player checklist PASS after READY, before View-As testing. No real roster/lineup/score changes.
8. **Explicit Player:** Mark Abbott opened shared Player Dashboard with correct identity/Player, no active team and expected empty schedule. Exit PASS.
9. **Implicit Player:** Marilyn Niedzwiecki active with zero stored roles opened shared Player Dashboard as Player; existing Auth account untouched. No role provisioning/backfill.
10. **Banner:** correct effective target/role, real Commissioner identity, persistent READ-ONLY and Exit for Marilyn, Mark and Nick.
11. **Captain/multi-role:** Nick Williams retained Captain, shared dashboard and Net Rushmore (AL)/MPT 7 context. Manage Roster correctly reported current league roster lock; no manager privilege inherited. Multi-role precedence covered by accepted deterministic/local matrix, not synthetic production changes.
12. **Invalid targets:** production aggregate found zero inactive/null-active no-role members accepted. Unknown-only roles/conflicting identity/actor denial/revalidation covered by accepted local controls. No invalid accounts manufactured.
13. **SELF:** Marilyn's “What team am I on?” returned LIVE LMS DATA / SELF TEAM and “No current authorized team is available for this lookup.” Correct target-effective empty result; no Commissioner team substitution.
14. **Privacy/read-only:** isolated origin and unchanged bounded lookup/dispatcher security preserved. Production UI restrictions observed; mutation denial and personal-data/model boundaries validated locally and by unchanged source/catalog, without probing real business writes.
15. **Button:** normal Member Detail action row and confirmation identify selected valid target; real Commissioner initiation checked. Desktop/390/320 and unauthorized visibility controls passed locally; not all viewport/role combinations repeated in production.
16. **Normal login:** normal authentication code unchanged; owner normal Player/Captain PASS. No new normal Marilyn login or Auth creation performed.
17. **LMS-0726:** real shared UI, isolated context, effective authorization, locks and Exit retained. All three agent-created contexts explicitly exited with credential/code/context cleared; ten latest maintenance runs succeeded through 21:04 UTC. Concurrent owner contexts were not altered.
18. **LMS-0727:** relevant retrieval/routing source unchanged; deterministic cross-community controls 24/24 PASS. No document-generation rerun.
19. **Integrity:** all 19 business-table fingerprints identical at preflight, post-migration, normal checkpoint and final View-As checkpoint. Final security catalog identical to verified post-SQL catalog. No migration-caused business mutation.
20. **Cost:** zero agent OpenAI requests/benchmarks for acceptance or screenshot diagnosis; one deterministic Live SELF request. Concurrent owner document outcomes are separate traffic, not attributed to automated acceptance or asserted zero-cost.
21. **Normal Ask identity follow-up:** normal implicit-Player Live identity remains a separately recorded MUST-FIX; not corrected by this bounded release.
22. **Focus limitation:** existing confirmation Escape/focus-return limitation explicitly accepted unchanged; no claim it was fixed.
23. **Rollback:** accepted application deployment `dpl_8AoUUZpZy4iNyCkYiAAZwqWAwCN8` and reviewed SQL rollback retained/rehearsed locally. No production rollback required or performed.
24. **Limits/observations:** production roster/match/lineup/score tables are empty, so populated workflow verification relies on accepted local fixtures, not fabricated live data. Error/fatal log query for this deployment from 20:52 through 21:02:58 UTC returned no matching logs. Owner's team-record screenshot is an existing unsupported Live intent/capability gap, separately recorded; no correction included.
25. **Final status:** LMS-0728 / 0.1.550 — PRODUCTION ACCEPTED within reviewed scope and stated evidence limits.

Evidence: [final production snapshots](lms-0728-final-production-evidence.json), [package manifest](lms-0728-production-package-manifest.json), [local review](lms-0728-local-review.md), [community controls](lms-0728-production-community-regression.txt). Local suite: 1,042/1,042; lint zero errors/11 existing warnings; types/PDF/build PASS. Documentation updates do not redeploy the application.
