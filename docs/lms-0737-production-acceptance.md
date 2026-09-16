# LMS-0737 / 0.1.559 — explicit-topic rating-date FAST FIX

Status: deployment acceptance in progress, 2026-09-16.

Commit: 4d3c4a9c18ee1dda8d8c77d119defcf3b9044e4c. Parent/accepted recovery target: c52f74f863f5beb27b51307e915549de65a78def (LMS-0736).

Production deployment: dpl_8wmMhtTFbgncLNBmYDiHqjMzMTad; immutable lwrpc-admin-gvl5v03bg-terry-lwrpc.vercel.app. Existing GitHub main/Vercel pipeline, eight scoped files only. No SQL, security, corpus or business-data changes.

## Reproduction and correction

Exact question: Regarding Season DUPR rating date, When is that actual date

Before: fresh conversation classified unresolved_follow_up and returned Please ask the full question again so I can check the official rules. A canonical recording-date question successfully retrieved September 27, 2026. The owner confirmed refresh replaced the earlier blank-panel symptom with the clarification; the historical blank-panel root cause remains unconfirmed.

The current named topic now supplies its own antecedent. Existing signed conversation remains required for genuinely dependent pronoun questions. Recording-date intent recognizes the explicit Season DUPR rating-date wording and selects existing Important Dates recording-date excerpts. No answer/date hard-coding, new policy or authorization.

## Local gates

122/122 focused tests, including 14 new tests: exact wording and three variants, unrelated prior context, invalid receipt, genuine dependent follow-ups, private-data guard, integrated player answer path, literal calendar selection and nearby method/other-topic contrasts. Lint zero errors with 11 existing warnings; production build passed. Application working tree exactly matched the committed SHA before push.

Final real OpenAI read-only check: 3/3 pass. Exact and variant returned Sunday September 27, 2026 with Weekday/Saturday/PrimeTime Important Dates. Ball contrast returned Franklin Outdoor X-40 optic yellow. Generation estimate $0.05617 plus embeddings. Initial diagnostic run cost $0.037625 generation and identified generic-rule selection before the second correction. Local raw evidence remains in .local-validation; it was not published.

## Recovery and integrity

Application recovery target dpl_3HPPGWmv4v9ixRHa3KJguQRSexD3 remains READY and an eligible rollback candidate. No database recovery is needed for this application-only release. Fresh 28-part production fingerprint baseline retained in .local-validation/lms0737-production-before.json. Real Commissioner preflight: normal dashboard and Teams loaded, no View-As, no business forms submitted. Concurrent team/captain registration activity already exists and must be attributed rather than overwritten.

Integrity clarification during acceptance: member_season_ratings changed from 1,759 rows to 0, independently confirmed by SELECT COUNT. The owner immediately confirmed they had cleared ratings (reply: yes). Acceptance was paused for that attribution and then resumed. All other 27 business/config/document/security fingerprints match the baseline exactly. No agent business-data write or restoration was issued.

## Production acceptance — PASS

FAST FIX — PRODUCTION ACCEPTED on 2026-09-16. Vercel READY; exact commit verified and league.lwrpickleballclub.com assigned to dpl_8wmMhtTFbgncLNBmYDiHqjMzMTad. Normal real Commissioner Teams page loaded first (95 active / 117 total, normal controls); normal dashboard/navigation also loaded with 1,826 active members. No View-As or business forms used.

Three user-facing drawer replays, each using New Question to remove prior conversation context, passed:

1. Regarding Season DUPR rating date, When is that actual date
   Answer: The Season DUPR ratings are recorded on Sunday, September 27, 2026, for the Weekday, Saturday, and PrimeTime DUPR leagues in the 2026 Fall League schedule.
2. Regarding the Season DUPR rating date, when is it?
   Answer: The Season DUPR ratings are recorded on Sunday, September 27, 2026, for the 2026 Fall League weekday, Saturday, and PrimeTime DUPR leagues.
3. Regarding the match ball, what is it?
   Answer: The match ball is the Franklin Outdoor X-40 optic yellow ball, provided for all regular season and playoff matches.

Date answers displayed Important Dates Weekday/Saturday page 1 and PrimeTime page 2 citations. Ball answer displayed Captains Guide page 10. All three retained the question and answer, displayed Answer ready and had no clarification/fallback. Browser warning/error log empty; deployed Vercel error/warning query returned no logs. Acceptance captures completed by 19:54 UTC.

No additional application changes made during acceptance; local application tree still matches deployed commit. The only business fingerprint change was the owner's explicitly confirmed concurrent ratings deletion; other 27 checks unchanged, including document activation/version/chunks, RLS/ACLs, policies, functions, migrations, configuration and cron. No automatic restoration or production write was performed.

Remaining limitation: this fixes the reproduced unnecessary clarification and calendar-evidence selection. The earlier historical blank-panel disappearance was not independently reproduced and its original cause is unconfirmed.
