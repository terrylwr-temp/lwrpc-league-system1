# LMS-0726 exact write classification and privilege cutover manifest

Design only. [Exact fields/payloads and filters](lms-0726-foundation-dependencies.md), [annotated JSON](lms-0726-final-write-classification.json). All 112 baseline browser expressions counted once. B takes precedence over C: a manager write broken by cutover still belongs to B. Shared helpers and existing server endpoints are additional dependencies and not silently counted in the 112.

| Class | Count | Meaning |
|---|---:|---|
| A | 0 | No already bounded browser RPC in this direct table-write subset |
| B | 82 | Must migrate before P privileges are removed |
| C | 30 | Retain manager-only administration under sound existing RLS |
| D | 0 | No public/non-sensitive write entitlement inferred |
| E | 0 | No dead/obsolete write proven |
| F | 0 | No uncategorized expression in this subset |

## All browser writes

| ID | File:line | Table.operation | Class |
|---|---|---|---|
| W017 | `lwrpc-admin/app/captain-dashboard/page.js:1617` | matches.update | B |
| W018 | `lwrpc-admin/app/divisions/page.js:261` | divisions.update | C |
| W019 | `lwrpc-admin/app/divisions/page.js:262` | divisions.insert | C |
| W020 | `lwrpc-admin/app/divisions/page.js:284` | team_byes.delete | B |
| W021 | `lwrpc-admin/app/divisions/page.js:294` | divisions.delete | C |
| W022 | `lwrpc-admin/app/divisions/page.js:315` | divisions.update | C |
| W023 | `lwrpc-admin/app/divisions/page.js:390` | divisions.insert | C |
| W024 | `lwrpc-admin/app/divisions/page.js:434` | division_lines.insert | C |
| W025 | `lwrpc-admin/app/divisions/page.js:472` | divisions.insert | C |
| W026 | `lwrpc-admin/app/divisions/page.js:498` | division_lines.insert | C |
| W027 | `lwrpc-admin/app/divisions/[id]/page.js:297` | divisions.update | C |
| W028 | `lwrpc-admin/app/divisions/[id]/page.js:323` | divisions.update | C |
| W029 | `lwrpc-admin/app/divisions/[id]/page.js:439` | division_lines.update | C |
| W030 | `lwrpc-admin/app/divisions/[id]/page.js:453` | division_lines.insert | C |
| W031 | `lwrpc-admin/app/divisions/[id]/page.js:496` | division_lines.delete | C |
| W032 | `lwrpc-admin/app/divisions/[id]/page.js:634` | division_lines.delete | C |
| W033 | `lwrpc-admin/app/divisions/[id]/page.js:645` | division_lines.insert | C |
| W034 | `lwrpc-admin/app/leagues/page.js:100` | leagues.update | C |
| W035 | `lwrpc-admin/app/leagues/page.js:107` | leagues.insert | C |
| W036 | `lwrpc-admin/app/leagues/page.js:129` | leagues.delete | C |
| W037 | `lwrpc-admin/app/leagues/page.js:153` | leagues.update | C |
| W072 | `lwrpc-admin/app/locations/page.js:113` | locations.update | B |
| W073 | `lwrpc-admin/app/locations/page.js:114` | locations.insert | B |
| W074 | `lwrpc-admin/app/locations/page.js:141` | locations.delete | B |
| W075 | `lwrpc-admin/app/locations/page.js:188` | members.update | B |
| W076 | `lwrpc-admin/app/locations/page.js:201` | teams.update | B |
| W077 | `lwrpc-admin/app/locations/page.js:211` | matches.update | B |
| W078 | `lwrpc-admin/app/locations/page.js:232` | locations.delete | B |
| W079 | `lwrpc-admin/app/matches/[id]/page.js:282` | line_games.insert | B |
| W080 | `lwrpc-admin/app/matches/[id]/page.js:426` | match_lines.update | B |
| W081 | `lwrpc-admin/app/matches/[id]/page.js:860` | match_lines.update | B |
| W082 | `lwrpc-admin/app/matches/[id]/page.js:920` | match_lines.update | B |
| W083 | `lwrpc-admin/app/matches/[id]/page.js:956` | line_games.update | B |
| W084 | `lwrpc-admin/app/matches/[id]/page.js:1373` | match_lines.update | B |
| W085 | `lwrpc-admin/app/matches/[id]/page.js:1392` | matches.update | B |
| W086 | `lwrpc-admin/app/matches/[id]/page.js:1513` | matches.update | B |
| W087 | `lwrpc-admin/app/matches/[id]/page.js:1662` | matches.update | B |
| W088 | `lwrpc-admin/app/matches/[id]/page.js:1730` | matches.update | B |
| W089 | `lwrpc-admin/app/matches/[id]/page.js:1788` | matches.update | B |
| W090 | `lwrpc-admin/app/member-import/page.js:496` | members.insert | B |
| W091 | `lwrpc-admin/app/member-import/page.js:544` | members.update | B |
| W092 | `lwrpc-admin/app/member-import/page.js:587` | members.update | B |
| W093 | `lwrpc-admin/app/member-import/page.js:636` | members.update | B |
| W094 | `lwrpc-admin/app/members/page.js:221` | members.update | B |
| W095 | `lwrpc-admin/app/members/page.js:308` | user_roles.update | B |
| W096 | `lwrpc-admin/app/members/page.js:360` | members.insert | B |
| W097 | `lwrpc-admin/app/members/page.js:384` | user_roles.insert | B |
| W098 | `lwrpc-admin/app/members/[id]/page.js:357` | members.update | B |
| W099 | `lwrpc-admin/app/members/[id]/page.js:481` | user_roles.update | B |
| W100 | `lwrpc-admin/app/members/[id]/page.js:498` | user_roles.insert | B |
| W101 | `lwrpc-admin/app/members/[id]/page.js:531` | members.update | B |
| W102 | `lwrpc-admin/app/ratings/page.js:187` | member_season_ratings.update | B |
| W103 | `lwrpc-admin/app/ratings/page.js:222` | member_season_ratings.insert | B |
| W104 | `lwrpc-admin/app/ratings/page.js:249` | members.update | B |
| W105 | `lwrpc-admin/app/ratings/page.js:384` | member_season_ratings.delete | B |
| W106 | `lwrpc-admin/app/ratings/page.js:732` | members.update | B |
| W107 | `lwrpc-admin/app/ratings/page.js:764` | member_season_ratings.upsert | B |
| W108 | `lwrpc-admin/app/ratings/page.js:834` | member_season_ratings.update | B |
| W109 | `lwrpc-admin/app/ratings/page.js:856` | member_season_ratings.insert | B |
| W110 | `lwrpc-admin/app/ratings/page.js:1011` | member_season_ratings.update | B |
| W111 | `lwrpc-admin/app/ratings/page.js:1038` | member_season_ratings.insert | B |
| W112 | `lwrpc-admin/app/schedule-editor/page.js:405` | matches.update | B |
| W113 | `lwrpc-admin/app/schedule-editor/page.js:542` | matches.update | B |
| W114 | `lwrpc-admin/app/schedule-editor/page.js:628` | matches.update | B |
| W115 | `lwrpc-admin/app/schedule-editor/page.js:661` | matches.update | B |
| W116 | `lwrpc-admin/app/schedule-editor/page.js:736` | line_games.delete | B |
| W117 | `lwrpc-admin/app/schedule-editor/page.js:746` | match_lines.delete | B |
| W118 | `lwrpc-admin/app/schedule-editor/page.js:757` | matches.delete | B |
| W119 | `lwrpc-admin/app/schedule-editor/page.js:799` | line_games.update | B |
| W120 | `lwrpc-admin/app/schedule-editor/page.js:814` | match_lines.update | B |
| W121 | `lwrpc-admin/app/schedule-editor/page.js:837` | matches.update | B |
| W122 | `lwrpc-admin/app/scheduling/page.js:691` | match_lines.insert | B |
| W123 | `lwrpc-admin/app/scheduling/page.js:717` | line_games.insert | B |
| W124 | `lwrpc-admin/app/scheduling/page.js:902` | matches.insert | B |
| W125 | `lwrpc-admin/app/scheduling/page.js:910` | team_byes.insert | B |
| W126 | `lwrpc-admin/app/scheduling/page.js:988` | line_games.delete | B |
| W127 | `lwrpc-admin/app/scheduling/page.js:992` | match_lines.delete | B |
| W128 | `lwrpc-admin/app/scheduling/page.js:995` | matches.delete | B |
| W129 | `lwrpc-admin/app/scheduling/page.js:998` | team_byes.delete | B |
| W130 | `lwrpc-admin/app/score-entry/[id]/page.js:229` | line_games.update | B |
| W131 | `lwrpc-admin/app/score-entry/[id]/page.js:431` | match_lines.update | B |
| W132 | `lwrpc-admin/app/score-entry/[id]/page.js:458` | matches.update | B |
| W133 | `lwrpc-admin/app/score-sheets/page.js:132` | score_sheet_templates.update | C |
| W134 | `lwrpc-admin/app/score-sheets/page.js:156` | score_sheet_templates.update | C |
| W135 | `lwrpc-admin/app/score-sheets/page.js:157` | score_sheet_templates.insert | C |
| W136 | `lwrpc-admin/app/score-sheets/page.js:179` | score_sheet_templates.insert | C |
| W137 | `lwrpc-admin/app/score-sheets/page.js:202` | score_sheet_templates.delete | C |
| W138 | `lwrpc-admin/app/scoring/page.js:456` | matches.delete | B |
| W139 | `lwrpc-admin/app/scoring/page.js:651` | matches.update | B |
| W140 | `lwrpc-admin/app/scoring/page.js:680` | matches.update | B |
| W141 | `lwrpc-admin/app/scoring/page.js:949` | matches.update | B |
| W142 | `lwrpc-admin/app/scoring/page.js:971` | matches.insert | B |
| W143 | `lwrpc-admin/app/scoring/page.js:1131` | match_lines.insert | B |
| W144 | `lwrpc-admin/app/scoring/page.js:1155` | line_games.insert | B |
| W145 | `lwrpc-admin/app/scoring/page.js:1160` | match_lineups.delete | B |
| W146 | `lwrpc-admin/app/scoring/page.js:1167` | match_lines.delete | B |
| W147 | `lwrpc-admin/app/seasons/page.js:73` | seasons.update | C |
| W148 | `lwrpc-admin/app/seasons/page.js:80` | seasons.insert | C |
| W149 | `lwrpc-admin/app/seasons/page.js:102` | seasons.delete | C |
| W150 | `lwrpc-admin/app/seasons/page.js:122` | seasons.update | C |
| W151 | `lwrpc-admin/app/seasons/page.js:184` | seasons.update | C |
| W152 | `lwrpc-admin/app/seasons/page.js:192` | teams.update | B |
| W153 | `lwrpc-admin/app/teams/page.js:361` | teams.update | B |
| W154 | `lwrpc-admin/app/teams/page.js:368` | teams.insert | B |
| W155 | `lwrpc-admin/app/teams/page.js:497` | teams.update | B |
| W156 | `lwrpc-admin/app/teams/page.js:522` | team_standings.update | C |
| W157 | `lwrpc-admin/app/teams/page.js:621` | teams.insert | B |
| W158 | `lwrpc-admin/app/teams/page.js:662` | team_members.insert | B |
| W159 | `lwrpc-admin/app/teams/page.js:697` | teams.insert | B |
| W160 | `lwrpc-admin/app/teams/page.js:726` | team_members.insert | B |
| W161 | `lwrpc-admin/app/teams/[id]/page.js:830` | team_members.insert | B |
| W162 | `lwrpc-admin/app/teams/[id]/page.js:893` | team_members.delete | B |

## Privilege-by-privilege prerequisites

For each object below, SELECT/INSERT/UPDATE/DELETE and any other existing browser privileges may be revoked only after every listed consumer has been cut over and tested. Current full-table/column ACLs and RLS are in the accepted catalog. Keep one reviewed B transaction after all object gates pass, not partial ad hoc revokes.

### public.members

Replacement: shared people/self/admin reads; typed profile/member/admin server writes.

Browser writes requiring migration: W075, W090, W091, W092, W093, W094, W096, W098, W101, W104, W106.

- Read consumer `lwrpc-admin/app/AdminDashboardClient.js`: 388.
- Read consumer `lwrpc-admin/app/api/admin/delete-member/route.js`: 34.
- Read consumer `lwrpc-admin/app/api/admin/member-last-login/route.js`: 33.
- Read consumer `lwrpc-admin/app/api/ai-insights/route.js`: 61, 153.
- Read consumer `lwrpc-admin/app/api/brevo-diagnostics/route.js`: 28.
- Read consumer `lwrpc-admin/app/api/league-communications/route.js`: 9, 12, 12.
- Read consumer `lwrpc-admin/app/api/match-lineups/route.js`: 90.
- Read consumer `lwrpc-admin/app/api/match-setup-reminders/route.js`: 63.
- Read consumer `lwrpc-admin/app/api/member-password-reset-check/route.js`: 88, 215.
- Read consumer `lwrpc-admin/app/api/notification-template-history/route.js`: 60.
- Read consumer `lwrpc-admin/app/api/notification-templates/route.js`: 143.
- Read consumer `lwrpc-admin/app/api/notifications/route.js`: 59.
- Read consumer `lwrpc-admin/app/api/round-robin/action/route.js`: 371.
- Read consumer `lwrpc-admin/app/api/round-robin/admin/route.js`: 224, 257.
- Read consumer `lwrpc-admin/app/api/score-notification/route.js`: 62.
- Read consumer `lwrpc-admin/app/api/system-settings/route.js`: 60.
- Read consumer `lwrpc-admin/app/api/tournaments/action/route.js`: 1226, 1266.
- Read consumer `lwrpc-admin/app/api/user-last-logins/route.js`: 70.
- Read consumer `lwrpc-admin/app/captain-dashboard/page.js`: 614.
- Read consumer `lwrpc-admin/app/lib/aiApprovedAnswersService.js`: 69.
- Read consumer `lwrpc-admin/app/lib/aiDocumentActivation.js`: 12.
- Read consumer `lwrpc-admin/app/lib/memberLookup.js`: 4.
- Read consumer `lwrpc-admin/app/lib/profilePhotos.js`: 64.
- Read consumer `lwrpc-admin/app/lib/serverSupabase.js`: 59.
- Read consumer `lwrpc-admin/app/locations/page.js`: 77.
- Read consumer `lwrpc-admin/app/matches/[id]/page.js`: 98.
- Read consumer `lwrpc-admin/app/member-import/page.js`: 94, 376.
- Read consumer `lwrpc-admin/app/members/page.js`: 360, 1484.
- Read consumer `lwrpc-admin/app/members/[id]/page.js`: 62, 357, 531.
- Read consumer `lwrpc-admin/app/player-dashboard/page.js`: 496.
- Read consumer `lwrpc-admin/app/ratings/page.js`: 2379.
- Read consumer `lwrpc-admin/app/schedule-editor/page.js`: 125.
- Read consumer `lwrpc-admin/app/score-entry/[id]/page.js`: 55.
- Read consumer `lwrpc-admin/app/scoring/page.js`: 272.
- Read consumer `lwrpc-admin/app/teams/page.js`: 1774.
- Read consumer `lwrpc-admin/app/teams/[id]/page.js`: 144.
- Additional helper/server write `lwrpc-admin/app/api/tournaments/action/route.js`: W014@659, W015@1238.
- Additional helper/server write `lwrpc-admin/app/lib/profilePhotos.js`: W063@64.

Validation: authorized normal read/write and RETURNING workflow; denied lower-role/resource/field requests; zero direct browser calls to this protected table; stale-client fail-closed behavior; post-revoke negatives plus intended public/shared DTO positives.

### public.user_roles

Replacement: trusted identity/role reads; Commissioner-only typed role write.

Browser writes requiring migration: W095, W097, W099, W100.

- Read consumer `lwrpc-admin/app/api/admin/delete-member/route.js`: 56, 64, 87.
- Read consumer `lwrpc-admin/app/api/admin/member-directory/route.js`: 95.
- Read consumer `lwrpc-admin/app/lib/auth.js`: 68.
- Read consumer `lwrpc-admin/app/lib/identityRoleWriter.js`: 8, 12, 14.
- Read consumer `lwrpc-admin/app/lib/roleGuards.js`: 18.
- Read consumer `lwrpc-admin/app/members/page.js`: 268.
- Read consumer `lwrpc-admin/app/members/[id]/page.js`: 226, 481, 498.
- Additional helper/server write `lwrpc-admin/app/lib/identityRoleWriter.js`: W058@12, W059@14.

Validation: authorized normal read/write and RETURNING workflow; denied lower-role/resource/field requests; zero direct browser calls to this protected table; stale-client fail-closed behavior; post-revoke negatives plus intended public/shared DTO positives.

### public.member_season_ratings

Replacement: shared scoped ratings; manager rating server writes.

Browser writes requiring migration: W102, W103, W105, W107, W108, W109, W110, W111.

- Read consumer `lwrpc-admin/app/AdminDashboardClient.js`: 1041, 2573.
- Read consumer `lwrpc-admin/app/api/ai-insights/route.js`: 183.
- Read consumer `lwrpc-admin/app/api/match-lineups/route.js`: 195.
- Read consumer `lwrpc-admin/app/api/tournaments/admin/route.js`: 168.
- Read consumer `lwrpc-admin/app/captain-dashboard/page.js`: 719, 1816, 2143, 2634.
- Read consumer `lwrpc-admin/app/matches/[id]/page.js`: 330, 380.
- Read consumer `lwrpc-admin/app/members/page.js`: 544, 1522.
- Read consumer `lwrpc-admin/app/members/[id]/page.js`: 84.
- Read consumer `lwrpc-admin/app/player-dashboard/page.js`: 682, 1231.
- Read consumer `lwrpc-admin/app/ratings/page.js`: 222, 2401.
- Read consumer `lwrpc-admin/app/score-entry/[id]/page.js`: 151, 174.
- Read consumer `lwrpc-admin/app/standings/page.js`: 349.
- Read consumer `lwrpc-admin/app/teams/page.js`: 848.
- Read consumer `lwrpc-admin/app/teams/[id]/page.js`: 183.

Validation: authorized normal read/write and RETURNING workflow; denied lower-role/resource/field requests; zero direct browser calls to this protected table; stale-client fail-closed behavior; post-revoke negatives plus intended public/shared DTO positives.

### public.teams

Replacement: shared public/private team reads; manager team handlers.

Browser writes requiring migration: W076, W152, W153, W154, W155, W157, W159.

- Read consumer `lwrpc-admin/app/AdminDashboardClient.js`: 1037, 2310.
- Read consumer `lwrpc-admin/app/api/ai-insights/route.js`: 163.
- Read consumer `lwrpc-admin/app/api/league-communications/route.js`: 12.
- Read consumer `lwrpc-admin/app/api/match-lineups/route.js`: 137.
- Read consumer `lwrpc-admin/app/api/teams/delete/route.js`: 30.
- Read consumer `lwrpc-admin/app/api/tournaments/action/route.js`: 976, 1313.
- Read consumer `lwrpc-admin/app/api/tournaments/admin/route.js`: 116.
- Read consumer `lwrpc-admin/app/captain-dashboard/page.js`: 292, 2451, 2526.
- Read consumer `lwrpc-admin/app/lib/standingsRebuild.js`: 202.
- Read consumer `lwrpc-admin/app/matches/[id]/page.js`: 1820.
- Read consumer `lwrpc-admin/app/members/page.js`: 1409.
- Read consumer `lwrpc-admin/app/player-dashboard/page.js`: 1146.
- Read consumer `lwrpc-admin/app/schedule-editor/page.js`: 107.
- Read consumer `lwrpc-admin/app/scheduling/page.js`: 740.
- Read consumer `lwrpc-admin/app/score-entry/[id]/page.js`: 494.
- Read consumer `lwrpc-admin/app/scoring/page.js`: 126.
- Read consumer `lwrpc-admin/app/seasons/page.js`: 176.
- Read consumer `lwrpc-admin/app/standings/page.js`: 243.
- Read consumer `lwrpc-admin/app/teams/page.js`: 248, 621, 697, 768.
- Read consumer `lwrpc-admin/app/teams/[id]/page.js`: 54.
- Additional helper/server write `lwrpc-admin/app/api/teams/delete/route.js`: W013@30.

Validation: authorized normal read/write and RETURNING workflow; denied lower-role/resource/field requests; zero direct browser calls to this protected table; stale-client fail-closed behavior; post-revoke negatives plus intended public/shared DTO positives.

### public.team_members

Replacement: shared roster/candidate reads; atomic roster_add_player / roster_remove_player; copy paths call admission.

Browser writes requiring migration: W158, W160, W161, W162.

- Read consumer `lwrpc-admin/app/AdminDashboardClient.js`: 2557.
- Read consumer `lwrpc-admin/app/api/ai-insights/route.js`: 179.
- Read consumer `lwrpc-admin/app/api/league-communications/route.js`: 12.
- Read consumer `lwrpc-admin/app/api/match-lineups/route.js`: 172.
- Read consumer `lwrpc-admin/app/api/tournaments/action/route.js`: 1281.
- Read consumer `lwrpc-admin/app/api/tournaments/admin/route.js`: 143.
- Read consumer `lwrpc-admin/app/captain-dashboard/page.js`: 655, 1789.
- Read consumer `lwrpc-admin/app/components/AskLwrAssistant.js`: 231.
- Read consumer `lwrpc-admin/app/matches/[id]/page.js`: 219, 231.
- Read consumer `lwrpc-admin/app/members/page.js`: 424, 1356.
- Read consumer `lwrpc-admin/app/members/[id]/page.js`: 103.
- Read consumer `lwrpc-admin/app/player-dashboard/page.js`: 229, 512.
- Read consumer `lwrpc-admin/app/ratings/page.js`: 910, 2425.
- Read consumer `lwrpc-admin/app/teams/page.js`: 643, 710, 1807.
- Read consumer `lwrpc-admin/app/teams/[id]/page.js`: 119, 203.

Validation: authorized normal read/write and RETURNING workflow; denied lower-role/resource/field requests; zero direct browser calls to this protected table; stale-client fail-closed behavior; post-revoke negatives plus intended public/shared DTO positives.

### public.locations

Replacement: shared venue/private mapping reads; Commissioner location and merge handlers.

Browser writes requiring migration: W072, W073, W074, W078.

- Read consumer `lwrpc-admin/app/captain-dashboard/page.js`: 269.
- Read consumer `lwrpc-admin/app/locations/page.js`: 49.
- Read consumer `lwrpc-admin/app/member-import/page.js`: 466.
- Read consumer `lwrpc-admin/app/members/page.js`: 123.
- Read consumer `lwrpc-admin/app/members/[id]/page.js`: 237.
- Read consumer `lwrpc-admin/app/schedule-editor/page.js`: 98.
- Read consumer `lwrpc-admin/app/scheduling/page.js`: 120.
- Read consumer `lwrpc-admin/app/scoring/page.js`: 127.
- Read consumer `lwrpc-admin/app/teams/page.js`: 235.
- Read consumer `lwrpc-admin/app/teams/[id]/page.js`: 168.

Validation: authorized normal read/write and RETURNING workflow; denied lower-role/resource/field requests; zero direct browser calls to this protected table; stale-client fail-closed behavior; post-revoke negatives plus intended public/shared DTO positives.

### public.matches

Replacement: shared published/private match reads; typed score/schedule/flex handlers.

Browser writes requiring migration: W017, W077, W085, W086, W087, W088, W089, W112, W113, W114, W115, W118, W121, W124, W128, W132, W138, W139, W140, W141, W142.

- Read consumer `lwrpc-admin/app/AdminDashboardClient.js`: 1038, 2353, 2389.
- Read consumer `lwrpc-admin/app/api/ai-insights/route.js`: 187.
- Read consumer `lwrpc-admin/app/api/match-lineups/route.js`: 101.
- Read consumer `lwrpc-admin/app/captain-dashboard/page.js`: 412, 632, 1617, 2235, 2539.
- Read consumer `lwrpc-admin/app/lib/matchSetupReminders.js`: 65.
- Read consumer `lwrpc-admin/app/lib/standingsRebuild.js`: 210, 261.
- Read consumer `lwrpc-admin/app/live-match/[id]/page.js`: 19.
- Read consumer `lwrpc-admin/app/matches/[id]/page.js`: 107.
- Read consumer `lwrpc-admin/app/player-dashboard/page.js`: 323, 443, 1159.
- Read consumer `lwrpc-admin/app/schedule-editor/page.js`: 52.
- Read consumer `lwrpc-admin/app/scheduling/page.js`: 144, 902, 958.
- Read consumer `lwrpc-admin/app/score-entry/[id]/page.js`: 64.
- Read consumer `lwrpc-admin/app/scoring/page.js`: 145, 456, 563, 949, 971.
- Read consumer `lwrpc-admin/app/standings/page.js`: 64, 256.
- Read consumer `lwrpc-admin/app/teams/page.js`: 783.
- Additional helper/server write `lwrpc-admin/app/lib/standingsRebuild.js`: W066@345, W068@491.

Validation: authorized normal read/write and RETURNING workflow; denied lower-role/resource/field requests; zero direct browser calls to this protected table; stale-client fail-closed behavior; post-revoke negatives plus intended public/shared DTO positives.

### public.match_lines

Replacement: shared authorized line reads; score/schedule handlers.

Browser writes requiring migration: W080, W081, W082, W084, W117, W120, W122, W127, W131, W143, W146.

- Read consumer `lwrpc-admin/app/divisions/[id]/page.js`: 616.
- Read consumer `lwrpc-admin/app/live-match/[id]/page.js`: 37.
- Read consumer `lwrpc-admin/app/matches/[id]/page.js`: 141.
- Read consumer `lwrpc-admin/app/members/page.js`: 452.
- Read consumer `lwrpc-admin/app/members/[id]/page.js`: 149.
- Read consumer `lwrpc-admin/app/player-dashboard/page.js`: 541.
- Read consumer `lwrpc-admin/app/schedule-editor/page.js`: 723, 786.
- Read consumer `lwrpc-admin/app/scheduling/page.js`: 691, 978.
- Read consumer `lwrpc-admin/app/score-entry/[id]/page.js`: 96.
- Read consumer `lwrpc-admin/app/scoring/page.js`: 1131.
- Read consumer `lwrpc-admin/app/teams/[id]/page.js`: 244.
- Additional helper/server write `lwrpc-admin/app/lib/standingsRebuild.js`: W067@475.

Validation: authorized normal read/write and RETURNING workflow; denied lower-role/resource/field requests; zero direct browser calls to this protected table; stale-client fail-closed behavior; post-revoke negatives plus intended public/shared DTO positives.

### public.line_games

Replacement: shared authorized game reads; score handlers.

Browser writes requiring migration: W079, W083, W116, W119, W123, W126, W130, W144.

- Read consumer `lwrpc-admin/app/AdminDashboardClient.js`: 2524.
- Read consumer `lwrpc-admin/app/live-match/[id]/page.js`: 67.
- Read consumer `lwrpc-admin/app/matches/[id]/page.js`: 247, 295.
- Read consumer `lwrpc-admin/app/score-entry/[id]/page.js`: 133.

Validation: authorized normal read/write and RETURNING workflow; denied lower-role/resource/field requests; zero direct browser calls to this protected table; stale-client fail-closed behavior; post-revoke negatives plus intended public/shared DTO positives.

### public.match_lineups

Replacement: selected-side/status reads; existing API using atomic match_setup_save and bounded clear operation.

Browser writes requiring migration: W145.

- Read consumer `lwrpc-admin/app/api/ai-insights/route.js`: 211.
- Read consumer `lwrpc-admin/app/api/match-lineups/route.js`: 313.
- Read consumer `lwrpc-admin/app/captain-dashboard/page.js`: 190, 1794, 1856.
- Read consumer `lwrpc-admin/app/lib/matchSetupReminders.js`: 109.
- Read consumer `lwrpc-admin/app/matches/[id]/page.js`: 310.
- Read consumer `lwrpc-admin/app/player-dashboard/page.js`: 980.
- Additional helper/server write `lwrpc-admin/app/api/match-lineups/route.js`: W008@313.

Validation: authorized normal read/write and RETURNING workflow; denied lower-role/resource/field requests; zero direct browser calls to this protected table; stale-client fail-closed behavior; post-revoke negatives plus intended public/shared DTO positives.

### public.team_byes

Replacement: shared schedule reads; manager/authorized schedule handlers.

Browser writes requiring migration: W020, W125, W129.

- Read consumer `lwrpc-admin/app/AdminDashboardClient.js`: 1039.
- Read consumer `lwrpc-admin/app/captain-dashboard/page.js`: 779, 2614.
- Read consumer `lwrpc-admin/app/lib/standingsRebuild.js`: 269.
- Read consumer `lwrpc-admin/app/player-dashboard/page.js`: 428, 1211.
- Read consumer `lwrpc-admin/app/standings/page.js`: 69, 329.
- Read consumer `lwrpc-admin/app/teams/page.js`: 834.

Validation: authorized normal read/write and RETURNING workflow; denied lower-role/resource/field requests; zero direct browser calls to this protected table; stale-client fail-closed behavior; post-revoke negatives plus intended public/shared DTO positives.

## Ordered application rollout

1. Shared auth/member/role/profile helpers and header; normal server transport and guard.
2. Player Dashboard, Captain Dashboard and inherited roster/history/schedule/modal reads.
3. Team Detail Add/Remove and Teams copy/member-add paths; route scope guard.
4. Match Setup API/lineup clear, Matches and score-entry; then scoring and schedule editor/generator.
5. Member/Member Detail/import/ratings admin; role assignment and photo helper.
6. Teams/location admin/merge, season/division compound consumers touching P, existing server reset/rollover/delete operations.
7. Full 112-expression classification reconciliation, shared-helper/static/dynamic/runtime trace, positive normal acceptance.
8. Privilege B only after all eleven gates; bypass negatives; then begin real-LMS View-As parity.

## Four-blocker continuation

[Per-expression operations for all 82 migrated writes](lms-0726-82-write-operations.md) now specify replacement, authority, transaction, effects, notification and View-As denial. [Resolution report](lms-0726-four-blockers-resolution.md) adds the required score_sheet_templates policy dependency correction for retained C writes and narrow TRUNCATE privilege review; classification remains 82 B / 30 C. Current live configuration and Rules are in the authoritative-admission matrix. No cutover has been implemented or accepted.

## Final readiness continuation

[Final gate](lms-0726-final-readiness-gate.md), [82 operation contracts](lms-0726-final-82-contracts.json), [82 notification census](lms-0726-final-notification-matrix.md), [292 read-consumer mapping](lms-0726-final-read-cutover.md), [migration specification](lms-0726-final-migration-spec.md). W162 retains Captain/authorized Co-Captain removal with enforced locks, same transaction/effects as management; no direct browser DELETE after Phase2. Current14-function proposal adds one shared internal eligibility evaluator to prevent duplicated Add/lineup/copy policy. No implementation or cutover PASS claimed.
