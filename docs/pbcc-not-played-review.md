# PBCC Not played — local implementation for release review

2026-09-14. Owner requested a way to mark a PBCC game not played with no score. Implemented on isolated branch codex/pbcc-not-played, based on accepted application e35fbc4. Not deployed. No production business data modified or notifications sent.

## Behavior

The live court card has a Not played button. A branded confirmation explains that scores will be cleared and the game excluded from results and DUPR export. Successful save persists status not_played with both scores null, clears pending score drafts, disables score inputs, and shows Not played — no score. Reopen for scoring restores scheduled status with blank scores. Cancellation or failed save preserves drafts.

Next Game / Finish accepts explicitly not-played games; an ordinary unmarked blank game still blocks completion. Past pre-export corrections also offer a Not played checkbox. Admin history, player history and public court cards label the game Not played. Existing score-null statistics behavior awards no game/win/loss/points, and existing DUPR export includes only complete scored games. Existing byes are unchanged; participants are not automatically converted to byes.

The existing updateMatchScore action and its host/manager authorization remain in place. Existing post-DUPR-export edit lock applies to marking and reopening. No new action or permission is introduced. A request marked notPlayed true forces null scores even if stale score values are also supplied.

## Storage and scope

Read-only production schema inspection confirmed round_robin_matches_status_check already allows scheduled, complete, not_played; team1_score/team2_score are nullable integers. No SQL or schema change is needed. Four application files change: the score action handler, admin page, player history page, public page. No ratings algorithms, scheduling algorithm, notifications or ordinary LMS scoring code changed.

## Validation

Nine focused executable tests pass: not-played null storage, reopen and normal score completion, export lock, failed-write behavior, round-completion handling including stale pending inputs, cancelled/failed/successful UI handlers, statistics exclusion, DUPR export exclusion, and rendered disabled blank inputs with reopening control. Tests execute production functions with mocked I/O, never production writes. Existing round-robin balance verification passes for8/9 players on2 courts. npm run lint passes with0 errors and6 pre-existing warnings. npm run build/TypeScript passes.

Browser-reviewed static preview uses the actual rendered ScoreCourt component, synthetic players and built application CSS. It shows unscored, not played and ordinary scored states; it is not a live-write acceptance test. Preview: primary workspace docs/pbcc-not-played-preview.html. Logs: pbcc-not-played-tests.log, pbcc-not-played-lint.log, pbcc-not-played-build.log.

## Release review

This changes score-entry behavior and must not use automatic FAST FIX deployment: docs/lms-fast-fix-workflow.md lists schedule/scoring changes as an immediate review condition. Production deployment requires owner release approval. Do not mark a real production game not played, finish a session, export data or send texts merely for acceptance. Use local evidence and read-only production checks unless a specific business action is explicitly authorized.

Recovery baseline: e35fbc480fb60301438297be36b4ee5646646cc9, READY dpl_8a29p1t37aMyw1f4M2JPdJeXj5Jo, immutable lwrpc-admin-6q7aau4lz-terry-lwrpc.vercel.app. No database migration/recovery required. Application rollback removes this UI; existing schema already understands the status, but the previous UI does not expose it or allow blank-score progression, so avoid rollback after real use without reviewing affected sessions.

## GitHub Desktop deployment check
Owner deployed main commit d4a47c816ef2975d620a90a41c2f5c5f0a7a2dbb (pbcc3), READY dpl_SimiHDLtsevTYezL9MfzuxbrNy4C. That commit does not contain the Not played implementation. Transferred only the four PBCC application-file changes and focused regression test from isolated c93cf43 into the primary working tree; patch applied cleanly and all9 tests pass there. These are uncommitted changes for the owner's next GitHub Desktop commit/push. No new deployment or business-data write was performed by the agent.

Primary-folder verification complete:9 focused tests pass; lint0 errors/11 existing warnings; build/TypeScript pass after retry with cache access (initial sandbox EPERM on .tsbuildinfo). Changes remain uncommitted for GitHub Desktop.
