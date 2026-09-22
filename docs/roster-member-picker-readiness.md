# Team roster member picker — pre-launch readiness

Checked 2026-09-22, approximately 18:04 Eastern. Scope: read-only Production verification for Monday roster opening. No application, database, Vercel, league-lock, Auth-account, or roster changes were made.

## 1. Root Cause / Finding

The individual [Team Roster page](../lwrpc-admin/app/teams/[id]/page.js) requests active member choices in one Supabase Data API query with `.or("is_active_member.eq.true,is_active_member.is.null")`, `.order("last_name", { ascending: true })`, and `.range(0, 5000)`. The query selects `id`, names, email, DUPR/self-rating, club/location, and membership-status fields used by the existing picker, eligibility, or player-check flow. A requested range does not prove the server returned that many rows, so the possible 1,000-row cap was checked against the running Production page.

**Finding: no current truncation.** The current Production roster picker receives all 1,843 active member choices. The theoretical query ceiling remains 5,001 and the effective project-wide Data API maximum was not independently read; this is a current-population readiness finding, not a guarantee for indefinite growth or future configuration changes.

## 2. Production active-member count

Read-only SQL count using the exact active predicate (`is_active_member is true or is_active_member is null`): **1,843**. The selected representative team had **zero** roster rows, and the Production picker displayed **1,843 Available** with the Commissioner’s `All Locations` filter. There were 16 roster rows system-wide after the inspection, unchanged from the prior same-day audit.

## 3. Current Data API behavior

The current code assigns the single query's `memberData` directly to `members`. The picker filters that array by selected location and excludes existing roster members; with `All Locations` and an empty roster, neither filter removes a row. Thus the Production UI's 1,843 available count is direct evidence that the current one-shot Data API query supplied **1,843 rows**, not merely that it requested 5,001. The terminal's direct REST attempt was blocked by local network policy, so the raw HTTP response body/`Content-Range` was not separately captured. The evidence is the authenticated Production application's real Data API code path, not a mocked query or a SQL count alone.

In the Commissioner session, a read-only SQL lookup identified an active member at alphabetic offset 1,500. That same member could be selected in the live `All Locations` picker. The selection-only missing-information notice was dismissed, the selection cleared, and the modal closed; **Add Player To Team was not pressed**. The member's identity is intentionally omitted here.

## 4. Whether truncation was confirmed

**No.** One current roster-member query returns 1,843 of 1,843 active rows. The live picker contains an active member beyond the first 1,000. No 1,000-row cutoff is occurring in this Production configuration today. A reduced Data API maximum or growth beyond the single requested range would change that conclusion and should prompt bounded pagination rather than a global limit increase.

## 5. Code change, if any

**None.** The request explicitly says not to create a release if the current implementation proves complete. LMS-0757 / `0.1.580` remains the application version; LMS-0758 / `0.1.581` was not created. No existing roster authorization, community, rating/DUPR, lock, View-As, player-check, or insert/delete behavior was changed. Pagination remains a possible future hardening change if the effective API cap is reduced or member growth approaches the one-shot limit.

## 6. Test results

Focused existing Teams/Roster baseline: `node --test test/teamsRosterData.test.mjs test/rosterPlayerChecks.test.mjs` — **14 tests, 14 passed, 0 failed**. The test runner emitted existing module-type warnings. Live authenticated picker verification covered the actual Production member count, all-location filtering, and a member after the first 1,000. Pagination boundary tests (999/1,000/1,001/1,843/2,000+) were **not added**, because no pagination change was made. Full `npm test`, lint, and build were **not run**; those are release gates if application code changes.

## 7. Production acceptance

The current Production deployment is **READY**, ID `dpl_yTMcqhqv8tvJPJBgvZeBYViuitJZ`, commit `42a3dedf87d597da09d336ad0e872e01124744a6`, serving `league.lwrpickleballclub.com` and the Commissioner session observed as LMS-0757. A representative team roster page opened, showed **114** choices under the team's default home location and **1,843** after changing the filter to `All Locations`, and permitted selection of the post-1,000 active member. The page remained interactive during the check; no visible error appeared. Browser-console telemetry was not available through this session, so an absence of console errors is **not independently claimed**. There was no new deployment or post-deployment acceptance cycle because there was no fix to deploy.

## 8. Captain Auth onboarding status

Read-only counts from active teams: **104 distinct primary captains**; **18** have no matching Supabase Auth user by normalized email. The login page directs first-time users to enter their email and choose **Forgot Password**. The existing password-reset/account-setup route checks for an active member, and, when email delivery is active, sends a Supabase Auth invitation if no Auth user exists; existing Auth users get recovery mail. Production `email_activated` is `true`. No invitation/recovery endpoint was invoked, no account was created, and no email was sent in this check. The 18 are an operational setup group, **not an evidenced code defect**; they must complete normal authorized onboarding before sign-in.

## 9. Intentional roster-lock status

Read-only Production flags: **Weekday DUPR League — locked; Saturday DUPR League — locked; PrimeTime DUPR League — locked.** This is intentional until the owner's manual Monday opening. No league was unlocked, and the locks should remain untouched until that planned action.

## 10. Monday readiness conclusion

**A. READY — the current roster picker loads all members in today's Production population.** No row-limit fix or release is required for the verified 1,843-member set. Monday operations still require the intentional league unlock and a supported first-time Auth setup plan for the 18 primary captains without matching Auth accounts. Recheck picker count after any Data API limit change or substantial member growth. No business data, rosters, notifications, or emails were changed or sent by this verification.
