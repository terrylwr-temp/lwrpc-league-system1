PERMANENT PROJECT RULE — LIVE LMS PRODUCTION PROTECTION

The Lakewood Ranch Pickleball Club LMS is now an ACTIVE PRODUCTION LEAGUE SYSTEM.

The owner previously completed a full simulated season using the system, including:

- team creation;
- Captain/player workflows;
- scheduling;
- rosters;
- matches;
- score entry;
- standings;
- Player use;
- Captain use;
- Commissioner use.

That test data was subsequently cleared.

REAL production teams/data are now being entered and the live league season will begin soon.

Therefore, effective immediately:

PROTECTING EXISTING PRODUCTION LMS FUNCTIONALITY AND DATA IS THE HIGHEST PROJECT PRIORITY.

This requirement applies to LMS-0726 and ALL future LMS releases.

1. ACCEPTED PRODUCTION VERSION = KNOWN-GOOD BASELINE

Once a version is production accepted, treat its normal LMS behavior as the known-good baseline.

A later feature must not unintentionally change that behavior.

2. NO FEATURE IS WORTH BREAKING THE LEAGUE

If there is a choice between:

A. completing a new feature;

and

B. preserving stable teams, rosters, schedules, matches, scores, standings and normal user workflows;

choose B.

Stop the release rather than risk league operations.

3. BUSINESS DATA IS SACROSANCT

No application feature migration may modify existing production business data unless the owner has explicitly approved that exact business-data mutation.

Protected operational data includes at minimum:

- members;
- roles;
- teams;
- Captain/co-Captain assignments;
- rosters;
- schedules;
- matches;
- Match Setup/lineups;
- scores;
- standings-related records;
- ratings;
- Season DUPR;
- Reliability Factor;
- locations;
- leagues;
- divisions;
- season configuration.

4. SCHEMA MIGRATION != BUSINESS-DATA MIGRATION

Normal infrastructure/schema migrations should be:

additive
and
non-destructive

wherever possible.

Do not casually:

- rewrite business rows;
- normalize live data;
- delete rows;
- rename/drop active fields;
- alter live relationships

as part of an unrelated feature.

5. EXPLICIT APPROVAL FOR BUSINESS-DATA CHANGES

If a future correction requires UPDATE/DELETE/INSERT against existing production business rows:

STOP.

Return:

- exact rows/categories affected;
- reason;
- expected before/after;
- backup;
- rollback;
- dry-run result.

Require explicit owner authorization before mutation.

6. LIVE REGISTRATION ACTIVITY

The owner is actively entering production teams and related data.

Concurrent legitimate activity must be distinguished from deployment-caused changes.

Do not treat normal new teams/rosters/Captain assignments as corruption merely because fingerprints changed.

7. CRITICAL WORKFLOW TIER

The following are TIER 1 production-critical workflows:

- authentication;
- Commissioner Dashboard;
- Player Dashboard;
- Captain Dashboard;
- Members;
- Teams;
- team creation/editing;
- Captain/co-Captain assignments;
- rosters;
- Manage Roster;
- scheduling;
- schedule generation/editor;
- Match Setup;
- matches;
- score entry;
- standings;
- ratings;
- normal role authorization.

Any Tier 1 regression blocks release acceptance.

8. TIER 2

Important but secondary features include:

- Ask LWR;
- View As User;
- reporting enhancements;
- convenience UI;
- other support/admin tools.

A Tier 2 feature must never destabilize Tier 1.

9. NORMAL LMS FIRST

For every production deployment:

test NORMAL LMS before testing the new feature.

If normal LMS fails:

STOP.

Do not continue feature acceptance.

10. ROLE REGRESSION

Every material release should preserve representative normal workflows for:

- Player;
- Captain;
- Co-Captain;
- Club Pro;
- League Manager;
- Commissioner.

11. SEASON PHASE AWARENESS

As the live season approaches and begins, increase deployment conservatism.

Avoid broad architectural refactors during active league operations unless they address:

- production outage;
- data integrity;
- security vulnerability;
- critical league defect.

Nice-to-have refactors should wait.

12. DEPLOYMENT WINDOWS

For substantial production changes during active season, prefer a controlled period when immediate validation and rollback can occur before league activity depends on the change.

Do not deploy a major change and leave it unverified.

13. PREFLIGHT

Before every material production release capture:

- current accepted version;
- migration history;
- deployment identity;
- critical schema state;
- business-data fingerprints/counts;
- maintenance/cron health;
- current operational activity.

14. BACKUP / RECOVERY

Before any migration capable of affecting persistent production state, verify the applicable backup/recovery path.

Do not assume rollback of application code restores database state.

15. APPLICATION ROLLBACK

Every release must have a tested application rollback path to the last accepted version.

16. DATABASE ROLLBACK

If database objects change, document whether rollback is:

- required;
- optional;
- unsafe;
- application-compatible.

Never blindly roll back SQL if the accepted application can safely operate with additive new objects.

17. ROLLBACK MUST NOT DELETE LIVE DATA

A rollback should restore application compatibility without deleting legitimate teams/rosters/matches/scores entered after deployment.

If rollback would endanger newly entered production data:

STOP and redesign the release/rollback strategy.

18. FORWARD COMPATIBILITY

Prefer additive database changes that allow:

previous accepted application
and
candidate application

to coexist safely during a controlled deployment/rollback window.

19. DESTRUCTIVE MIGRATIONS

Avoid DROP/rename/destructive type changes during active season unless absolutely necessary and separately approved.

20. PRODUCTION TEST DATA

Do not create fake production teams, players, rosters, matches or scores merely for acceptance testing unless explicitly authorized.

Use:

- existing legitimate data;
- read-only verification;
- isolated fixtures;
- production-matched PostgreSQL.

21. SCORE INTEGRITY

Never modify existing production scores as a test probe.

22. SCHEDULE INTEGRITY

Never modify live schedules merely to test a feature unless explicitly authorized.

23. ROSTER INTEGRITY

Never add/remove a real production player merely as an acceptance probe unless explicitly authorized.

24. AUTHORIZATION TESTING

Prefer non-destructive denial/read checks and isolated security fixtures.

Do not bypass safety controls just to prove a mutation would be denied.

25. BUSINESS-DATA FINGERPRINTS

For material deployments compare pre/post business state.

Candidate-caused unexplained changes:

ZERO.

26. HISTORICAL INTEGRITY

Completed matches, scores, standings history and audit records must not be rewritten by unrelated future releases.

27. NORMAL WRITE PATHS

When a release is intended to be read-only/infrastructure/UI work, prove existing normal authorized write paths remain available.

A read-only new feature must not accidentally make the normal LMS read-only.

28. FAIL SAFE

If a new feature cannot safely reproduce some functionality:

limit/disable the NEW feature.

Do not weaken or redesign the stable normal LMS simply to achieve feature completeness.

29. SECURITY WORK

Confirmed security issues remain high priority.

But security hardening must be staged carefully so fixes do not unexpectedly break production league workflows.

Use:

additive replacement
→ cutover
→ validation
→ privilege tightening

rather than abrupt revocation.

30. ACTIVE-SEASON CHANGE CONTROL

During active season, every substantial release should explicitly state:

WHY THIS CHANGE IS NEEDED NOW

and:

WHAT EXISTING LEAGUE WORKFLOW COULD IT AFFECT?

If benefit does not justify operational risk, defer it.

31. VERSION DISCIPLINE

Do not start a new LMS version automatically after acceptance.

Stop and establish the next scope.

32. NO SCOPE CREEP

If implementation uncovers unrelated improvements:

record them in roadmap.

Do not automatically include them in the active release.

33. PRODUCTION ACCEPTANCE

A release is not production accepted merely because:

- tests pass;
- build succeeds;
- deployment is READY.

It is accepted only after:

- normal LMS regression passes;
- data integrity passes;
- intended feature passes;
- security boundaries pass;
- rollback state is understood.

34. RELEASE REPORT

Every production release report should include:

- previous accepted version;
- new version;
- migrations;
- normal LMS regression;
- business-data integrity;
- feature acceptance;
- security;
- rollback;
- known limitations;
- deferred findings.

35. CURRENT LMS-0726

Continue the already authorized controlled production review.

Do not change its scope.

Normal LMS remains the first production gate.

36. FUTURE SECURITY HARDENING

The recorded direct Data API/security-hardening project remains HIGH PRIORITY.

However, because the LMS is now actively used for league operations, implement that work as a separately staged release with explicit compatibility/rollback testing.

Do not casually fold it into another feature.

This is a permanent project requirement.