# Season Ratings execute actions — FAST FIX stopped for review

September 11, 2026. Diagnosis only; no runtime changes, deployment, SQL, gate changes or production business-data actions.

## Evidence and exact cause

The recorded production source is commit `6d86e113ba1d40cc623f435bfd68753ea7535d5b`, inspected in `.local-validation/lms0733-combined-release`. The combined Clean checkpoint and first combined Clean result record production restored to deployment `dpl_E89PiGwFsrfqGPKdofS5CutKFMws`, with the workflow gate false after the one expressly authorized Clean. This is recorded identity, not a fresh deployment API verification.

- `app/api/ratings/workflow/route.js` passes only `SEASON_RATINGS_WORKFLOW_WRITES_ENABLED === 'true'` as `commitEnabled`.
- `app/lib/seasonRatingsWorkflowServer.js` computes `canCommit = commitEnabled && data.counts.affected > 0`. With the flag false, a valid preview returns `canCommit:false`, `receipt:null` and the read-only gate message. Commit requests are independently rejected while disabled.
- `app/components/SeasonRatingsWorkflow.js` renders Import Ratings / Confirm Clean Ratings after the full 50-row preview table and pagination. They are rendered, rather than conditionally hidden, but disabled and visually faded when `canCommit` is false. `apply()` also refuses to open confirmation in that state. Moving or enabling the buttons alone cannot restore execution.
- The Upload section handler unconditionally clears selectedFile and preview even when Upload is already selected. Preview completion itself does not clear selectedFile. This explains the owner's apparent reset on trying the section button again.
- Upload confirmation already includes season, affected rows, skipped/no-change counts, three fill counts and preservation statements. Clean confirmation includes season/cutoff and CREATE/UPDATE but omits NO CHANGE/DEFER/missing Age-Based totals requested for the dialog.
- RF cutoff already remains selected after preview; changing it clears/recalculates the preview, and generation checks invalidate outdated work. These protections should be retained.

## Write permission finding and stop condition

There is no existing automatic per-action gate-opening path. Previously, production Clean used a temporary enabled deployment followed by restoration to the disabled deployment. The shared flag applies to upload, clean, transfer and clear. Leaving it enabled is expressly excluded by the current request.

The existing signed receipt is the bounded transaction mechanism: actor/session binding, season, operation, parsed upload/file hash or selected Clean cutoff/version, data fingerprint, random run ID and ten-minute expiration. Commit verifies signature, session, expiry, season, operation and cutoff before calling the reviewed transaction, which revalidates state. The page requires league_manager; database preview uses the existing actor authorization helper; the API preserves authenticated user lookup, origin and View-As mutation checks.

Making normal Upload/Clean usable with the shared flag false requires a new application permission decision. This invokes the user's explicit stop for security/authorization changes and the FAST FIX exclusion for new authorization decisions. No SQL need has been established, and the commit backend exists, but this is not solely a button/state correction.

## Concrete proposed correction for review — not implemented

Keep the shared flag false. Introduce a narrowly reviewed server policy for only normal Upload/Clean that uses the existing authorized preview and signed receipt as the bounded permission to commit, consistently at preview issuance and commit verification. Transfer/Clear remain unavailable through that policy. Do not toggle a global environment flag per request. Preserve all database authorization, transaction, stale-state, identity, confirmation and cutoff checks. This application permission change requires review before implementation under the current stop instruction.

Alongside that correction, place Import Ratings / Apply Clean Ratings adjacent to the summary above the long table; show “0 ratings ready to import.” for zero rows; make reselecting the active section a no-op; preserve selected file on preview/cancel; reset on success or explicit abandonment; expand Clean dialog totals without changing calculations. Retain distinct Delete and hidden Transfer/Clear.

Required focused verification after review: file selection/preview eligibility; nonzero and zero-row action states; filename retention and active-section reselect; confirmation opening/cancel with zero commits; fixture import success/reset; Clean cutoff preview, visible action, full confirmation and stale-cutoff invalidation; unauthorized role denial; shared gate false with normal operations bounded and Transfer/Clear denied; receipt/session/season/stale/replay protections. Then lint/build and isolated deployment identity/recovery checks, normal LMS first, followed by authorized production preview/open/cancel checks only.

## Current verification limits

Fresh browser navigation to production Ratings redirected to login with an expired four-hour session. No CSV was selected/submitted, no preview/confirmation was opened, and no production commit or database operation was issued. Production zero-write acceptance was not completed; there were zero production business-data actions by this diagnosis. No tests/build/lint were run because runtime implementation stopped. No deployed commit was created. Existing production and unrelated working changes remain untouched.
