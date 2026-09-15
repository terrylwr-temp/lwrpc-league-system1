# Season Ratings normal signed actions — local correction, deployment held

September 11, 2026. Owner approval: attachment `72967885-bc98-46e1-85ad-7fca95435749/pasted-text.txt`. This supersedes the earlier permission-policy stop for this bounded correction only.

## Candidate and scope

Isolated branch: `codex/season-ratings-normal-actions`, based on accepted `9109c716f232f10e9ca1fe612bc5203717accf78`. The accepted source already contains the combined Clean implementation and subsequent Ask LWR recording-date fix. Starting from the older combined-Clean branch would drop that accepted Ask LWR fix, so it was not used as the candidate base.

Runtime changes are limited to `SeasonRatingsWorkflow.js` and `seasonRatingsWorkflowServer.js`. Tests and the synthetic browser fixture accompany them. Ratings page Delete/Copy handlers, API authentication/origin/View-As checks, role resolution, initializer, calculations, SQL, RLS and grants are unchanged. Unrelated Delete/Notes work in another worktree is excluded.

## Requested results

| Requirement | Local result |
|---|---|
| Exact root cause | The shared false flag prevented receipt issuance and confirmation, and action controls were below the full table. Reselecting Upload unconditionally cleared file and preview. |
| Permission correction | One server-side `writeAllowed` decision is used at receipt issuance and commit: Upload/Clean are normal actions; only Transfer/Clear can additionally qualify through the existing maintenance flag. Unknown operations fail closed. |
| Upload | Authorized nonzero previews receive a signed receipt with the maintenance flag false. Import opens explicit confirmation and submits only on confirmation. Zero affected rows show “0 ratings ready to import.” without an enabled import action. |
| Clean | Authorized nonzero combined previews receive a signed receipt with the flag false. Active Rules default and whole-number 0–100 cutoff behavior remain unchanged. |
| Transfer/Clear | Still require the maintenance flag, including when presented with a previously valid signed maintenance receipt. No normal controls exposed. Initializer retains its separate disabled gate. |
| Role authorization | Commissioner and League Manager succeed in isolated actual-database tests. Player/Captain fail at preview and commit; revoked administrator fails at commit. Database authorization is unchanged. |
| Receipt enforcement | Missing, malformed, forged, expired, other-session, wrong-season and wrong-operation receipts fail. The reviewed HMAC/session binding and transaction remain unchanged. |
| Stale protection | Cutoff mismatch and changed working inputs fail; existing Rules/source/roster/final-state, rollback and idempotency tests pass. New file selection removes the old preview and advances its generation. |
| File state | Reselecting the active Upload section is a no-op. Preview and confirmation cancellation retain file/preview. Success clears state and file input. Selecting a new file or intentionally switching workflows abandons the previous preview. |
| Action location | One Import Ratings or Apply Clean Ratings control sits directly below the summary and above the player table, using the same preview and `apply` handler. No second commit state. |
| Upload dialog | Season, import count, skipped, unchanged inputs, three fill counts and no-overwrite/final-rating preservation statements. |
| Clean dialog | Season/cutoff, separate regular and PrimeTime CREATE/UPDATE/NO CHANGE/NR DEFER/REVIEW/missing counts, missing Age-Based, distinct affected players and explicit recalculation notice. Compact lines fit the tested desktop viewport. |
| Success | Upload displays success, count and season and resets file. Clean displays success, season and concise regular/PrimeTime create/update counts. |
| SQL | No SQL, migration, database-function, RLS or grant changes. Existing migrations run only in isolated PGlite fixtures. No production SQL issued. |
| Deployed commit | None: the required full-project green gate is not met. |
| Production Upload/Clean open/cancel | Not performed: candidate not deployed. Local actual-page/API/database flows both passed with cancellation and no commit. |
| Zero writes | Local browser fixture: commits 0, Clean audit empty, rating/source state unchanged. Production received no ratings preview/commit or other business-data mutation from this task. This is not a completed production acceptance fingerprint audit. |
| Maintenance status | Local fixture false. No production gate or environment changes made. The recorded production flags remain false; no new runtime gate verification was performed. |
| Acceptance | Local implementation and focused validation complete; production deployment/acceptance held for full-suite baseline failures. |

## Verification

- 30 focused workflow/security/transaction/initializer/UI tests passed. UI tests execute actual component event handlers and inspect rendered order/state through deterministic hook/network/dialog ports; browser layout was separately checked.
- Actual local Ratings page + actual API + PGlite: Choose CSV, retained filename, Preview, Import action above table, active-section reselect retains state, open confirmation, Cancel; Clean default29, Preview, action above table, full confirmation, Cancel. Zero commit RPC calls. No browser error logs.
- `npm run build`: passed on final runtime source, including TypeScript. Local build used loopback public placeholder credentials only. Initial out-of-root dependency junction was rejected by Turbopack; an in-root dependency copy resolved this without modifying application configuration.
- `npm run lint`: zero errors, six pre-existing warnings in Captain dashboard, Player dashboard and Ask LWR.
- `npx tsc --noEmit --incremental false`, PDF server-bundle verification and `git diff --check`: passed.
- Final full `npm test`: 1,217 tests, 1,207 passed, 10 failed. It is blocked by the same ten failures reproduced independently on unchanged accepted baseline `9109c716`. These failures are not waived and unrelated application/test code was not changed to hide them.

## Baseline failures blocking deployment

Seven failures concern pre-existing Ask LWR timing assertions: the old policy tests expect `rating`/Rules timing evidence for establishment/lock questions, while the accepted recording-date fix routes them to `season_rating_date`. One is in `lms0725FinalCorrection.test.mjs`; six are in `lms0725PolicyObservability.test.mjs`.

Three pre-existing rollback/function-identity failures are in `lms0728ImplicitPlayer.test.mjs`, `lms0729LiveRecord.test.mjs` and `viewAsLockCorrection.test.mjs`. They reproduce in the accepted baseline worktree; the correction does not touch their functions, migrations or tests. They require separate investigation/reconciliation; this report does not treat function-drift failures as harmless merely because they are pre-existing.

Baseline replay: 41 tests, 31 passed, 10 failed. Candidate full run and final focused counts are retained in the root workspace evidence files. No production deployment is authorized by a failing full-suite result under the owner's stated gate.

## Production and recovery boundary

The owner established a legitimate Commissioner session through normal sign-in. Before any deployment, the existing Commissioner dashboard loaded 1,821 active members and the existing zero selected-scope team/roster/match state; Captain and Player dashboards loaded the expected no-active-team states. Ask LWR opened normally and was dismissed without submitting a question. No post-deployment regression, complete View-As acceptance or production write-path probe is claimed.

Vercel read tools identify accepted deployment `dpl_4j1HcDHg8aj8GeZKkPoAGFogGLKp` / commit `9109c716` as READY and a rollback candidate. No deployment, promotion or rollback was performed. A new candidate deployment should only follow reconciliation of the full-suite failures and the original normal-LMS-first/preflight/recovery gates; production acceptance must still use preview/open/cancel only.

Evidence in `C:/lwrpc-league-system/docs`: `season-ratings-normal-actions-{focused,full-tests,baseline-tests,ui-tests,lint,build,types,pdf,diff-check}.txt`, `season-ratings-normal-actions-browser-evidence.json`, and browser observations in this task. No model-generation calls were made.

Local candidate commit: 1cf9fb25fc94288c92b035678d6fe8b4fabae000. Worktree clean after commit. No deployed candidate.
