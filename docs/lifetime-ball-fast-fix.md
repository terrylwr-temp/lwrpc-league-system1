# Lifetime ball FAST FIX

2026-09-13. Application-only, owner-authorized FAST FIX.

Exact question reproduced in actual Terry Adelman Commissioner UI: "Are we going to use the Lifetime ball" returned document fallback. Baseline application c88447fde5c31e87b02137bcef4fd94618d43495, current redeployment dpl_6QUCvWihjTMg7RQZVR74G32Y5epD (original dpl_8qBAzd6FrjawH9graP7Hjqe47Zrs).

Active DUPR Captains Guide version 816a2cd7-d0c9-4c27-b41a-90eccc39cc9b, chunk 2ab86486-e9d5-4ae9-970d-097472b0e32b, LEAGUE FEES AND WAIVER page 10 explicitly specifies Franklin Outdoor X-40 optic yellow match balls for regular season and playoffs. No Lifetime text was found in the active searchable corpus.

First failure: the existing club-selected equipment matcher accepted what/which and "are we using" but missed future confirmation "are we going to use". The one-file matcher correction recognizes future/confirmation language for we/league/club/LWR, still requiring ball and use signals. No brand, model, answer, source ID, or business rule is embedded in application logic. Existing bounded match-balls retrieval probe, source authority, evidence threshold and selector remain unchanged.

Regression tests exercise exact wording and five variants through retrieval and evidence selection, competing USAP source, legal specifications, damaged-ball handling, personal equipment permission, paddle contrast, and no-source fallback. 127 focused affected tests pass. Lint: 0 errors, 6 pre-existing warnings. Production build and static type checks pass. No SQL, access/security, corpus, Approved Answer or business-data changes.

Recovery: restore the prior READY deployment dpl_6QUCvWihjTMg7RQZVR74G32Y5epD / application c88447fde5c31e87b02137bcef4fd94618d43495. No database recovery is needed for this application-only patch.

Production acceptance and final identity: recorded separately after replay.
