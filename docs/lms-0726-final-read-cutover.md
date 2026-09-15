# LMS-0726 exact read-consumer cutover

Every baseline D ID is retained. Normal protected reads use public.lms_page_read; isolated reads use view_as_private.page_read via accepted dispatcher. Both compose the same competition/people field contracts. These are proposed contracts, not deployed endpoints. Retained direct reads remain only when the selector has no protected embedded relation/private field. No wildcard is a replacement output allowlist.

| ID | File:line / owner | Table | Replacement / guard |
|---|---|---|---|
| D001 | lwrpc-admin/app/AdminDashboardClient.js:240 / [{ data: seasonData }, { data: leagueData }, { data: divisionData }] | seasons | Retain intended shared RLS read for this exact selector; no added private embedded relation |
| D002 | lwrpc-admin/app/AdminDashboardClient.js:241 / [{ data: seasonData }, { data: leagueData }, { data: divisionData }] | leagues | Retain intended shared RLS read for this exact selector; no added private embedded relation |
| D003 | lwrpc-admin/app/AdminDashboardClient.js:242 / [{ data: seasonData }, { data: leagueData }, { data: divisionData }] | divisions | Retain intended shared RLS read for this exact selector; no added private embedded relation |
| D004 | lwrpc-admin/app/AdminDashboardClient.js:253 / { data, error } | leagues | Retain intended shared RLS read for this exact selector; no added private embedded relation |
| D005 | lwrpc-admin/app/AdminDashboardClient.js:365 / { data, error } | seasons | Retain intended shared RLS read for this exact selector; no added private embedded relation |
| D006 | lwrpc-admin/app/AdminDashboardClient.js:388 / { data } | members | people contract; effective self / exact managed roster / manager field scope; candidate contact and RF excluded |
| D007 | lwrpc-admin/app/AdminDashboardClient.js:1016 / { data, error } | team_standings | competition contract; published/shared versus private managed scope; global private Teams manager-only |
| D008 | lwrpc-admin/app/AdminDashboardClient.js:1037 / [{ data: teams, error: teamsError }, { data: matches, error: matchesError }, { data: byes, error: byesError }, { data: standings, error: standingsError }, { data: ratings, error: ratingsError }] | teams | competition contract; published/shared versus private managed scope; global private Teams manager-only |
| D009 | lwrpc-admin/app/AdminDashboardClient.js:1038 / [{ data: teams, error: teamsError }, { data: matches, error: matchesError }, { data: byes, error: byesError }, { data: standings, error: standingsError }, { data: ratings, error: ratingsError }] | matches | competition contract; published/shared versus private managed scope; global private Teams manager-only |
| D010 | lwrpc-admin/app/AdminDashboardClient.js:1039 / [{ data: teams, error: teamsError }, { data: matches, error: matchesError }, { data: byes, error: byesError }, { data: standings, error: standingsError }, { data: ratings, error: ratingsError }] | team_byes | competition contract; published/shared versus private managed scope; global private Teams manager-only |
| D011 | lwrpc-admin/app/AdminDashboardClient.js:1040 / [{ data: teams, error: teamsError }, { data: matches, error: matchesError }, { data: byes, error: byesError }, { data: standings, error: standingsError }, { data: ratings, error: ratingsError }] | team_standings | Retain intended shared RLS read for this exact selector; no added private embedded relation |
| D012 | lwrpc-admin/app/AdminDashboardClient.js:1041 / [{ data: teams, error: teamsError }, { data: matches, error: matchesError }, { data: byes, error: byesError }, { data: standings, error: standingsError }, { data: ratings, error: ratingsError }] | member_season_ratings | people contract; effective self / exact managed roster / manager field scope; candidate contact and RF excluded |
| D013 | lwrpc-admin/app/AdminDashboardClient.js:2228 / [{ data, error }, { data: divisionData, error: divisionError }] | leagues | Retain intended shared RLS read for this exact selector; no added private embedded relation |
| D014 | lwrpc-admin/app/AdminDashboardClient.js:2239 / [{ data, error }, { data: divisionData, error: divisionError }] | divisions | Retain intended shared RLS read for this exact selector; no added private embedded relation |
| D015 | lwrpc-admin/app/AdminDashboardClient.js:2310 / query | teams | competition contract; published/shared versus private managed scope; global private Teams manager-only |
| D016 | lwrpc-admin/app/AdminDashboardClient.js:2353 / query | matches | competition contract; published/shared versus private managed scope; global private Teams manager-only |
| D017 | lwrpc-admin/app/AdminDashboardClient.js:2389 / query | matches | competition contract; published/shared versus private managed scope; global private Teams manager-only |
| D018 | lwrpc-admin/app/AdminDashboardClient.js:2459 / query | team_standings | competition contract; published/shared versus private managed scope; global private Teams manager-only |
| D019 | lwrpc-admin/app/AdminDashboardClient.js:2524 / query | line_games | competition contract; published/shared versus private managed scope; global private Teams manager-only |
| D020 | lwrpc-admin/app/AdminDashboardClient.js:2557 / { data, error } | team_members | people contract; effective self / exact managed roster / manager field scope; candidate contact and RF excluded |
| D021 | lwrpc-admin/app/AdminDashboardClient.js:2573 / { data, error } | member_season_ratings | people contract; effective self / exact managed roster / manager field scope; candidate contact and RF excluded |
| D022 | lwrpc-admin/app/api/admin/delete-member/route.js:34 / { data: member, error: memberError } | members | people contract; effective self / exact managed roster / manager field scope; candidate contact and RF excluded |
| D023 | lwrpc-admin/app/api/admin/delete-member/route.js:56 / { data: roleRows, error: roleError } | user_roles | people contract; effective self / exact managed roster / manager field scope; candidate contact and RF excluded |
| D024 | lwrpc-admin/app/api/admin/delete-member/route.js:64 / { data: otherCommissioners, error: commissionerError } | user_roles | people contract; effective self / exact managed roster / manager field scope; candidate contact and RF excluded |
| D025 | lwrpc-admin/app/api/admin/delete-member/route.js:87 / { data: otherRoleRows, error: otherRoleError } | user_roles | people contract; effective self / exact managed roster / manager field scope; candidate contact and RF excluded |
| D026 | lwrpc-admin/app/api/admin/member-directory/route.js:95 / { data: roleRows, error: roleError } | user_roles | people contract; effective self / exact managed roster / manager field scope; candidate contact and RF excluded |
| D027 | lwrpc-admin/app/api/admin/member-last-login/route.js:33 / { data: member, error: memberError } | members | people contract; effective self / exact managed roster / manager field scope; candidate contact and RF excluded |
| D028 | lwrpc-admin/app/api/ai-assistant/documents/route.js:116 / [documentsResult, seasonsResult, leaguesResult, divisionsResult] | seasons | Retain intended shared RLS read for this exact selector; no added private embedded relation |
| D029 | lwrpc-admin/app/api/ai-assistant/documents/route.js:117 / [documentsResult, seasonsResult, leaguesResult, divisionsResult] | leagues | Retain intended shared RLS read for this exact selector; no added private embedded relation |
| D030 | lwrpc-admin/app/api/ai-assistant/documents/route.js:118 / [documentsResult, seasonsResult, leaguesResult, divisionsResult] | divisions | Retain intended shared RLS read for this exact selector; no added private embedded relation |
| D031 | lwrpc-admin/app/api/ai-assistant/documents/route.js:161 / [seasonResult, leagueResult, divisionResult] | seasons | Retain intended shared RLS read for this exact selector; no added private embedded relation |
| D032 | lwrpc-admin/app/api/ai-assistant/documents/route.js:162 / [seasonResult, leagueResult, divisionResult] | leagues | Retain intended shared RLS read for this exact selector; no added private embedded relation |
| D033 | lwrpc-admin/app/api/ai-assistant/documents/route.js:163 / [seasonResult, leagueResult, divisionResult] | divisions | Retain intended shared RLS read for this exact selector; no added private embedded relation |
| D034 | lwrpc-admin/app/api/ai-assistant/documents/route.js:170 / { data, error } | leagues | Retain intended shared RLS read for this exact selector; no added private embedded relation |
| D035 | lwrpc-admin/app/api/ai-insights/route.js:61 / { data: memberRows, error: memberError } | members | people contract; effective self / exact managed roster / manager field scope; candidate contact and RF excluded |
| D036 | lwrpc-admin/app/api/ai-insights/route.js:153 / [
    membersResult,
    seasonsResult,
    leaguesResult,
    divisionsResult,
    teamsResult,
    rosterResult,
    ratingsResult,
    matchesResult,
    lineupsResult,
    standingsResult,
  ] | members | people contract; effective self / exact managed roster / manager field scope; candidate contact and RF excluded |
| D037 | lwrpc-admin/app/api/ai-insights/route.js:157 / [
    membersResult,
    seasonsResult,
    leaguesResult,
    divisionsResult,
    teamsResult,
    rosterResult,
    ratingsResult,
    matchesResult,
    lineupsResult,
    standingsResult,
  ] | seasons | Retain intended shared RLS read for this exact selector; no added private embedded relation |
| D038 | lwrpc-admin/app/api/ai-insights/route.js:158 / [
    membersResult,
    seasonsResult,
    leaguesResult,
    divisionsResult,
    teamsResult,
    rosterResult,
    ratingsResult,
    matchesResult,
    lineupsResult,
    standingsResult,
  ] | leagues | Retain intended shared RLS read for this exact selector; no added private embedded relation |
| D039 | lwrpc-admin/app/api/ai-insights/route.js:159 / [
    membersResult,
    seasonsResult,
    leaguesResult,
    divisionsResult,
    teamsResult,
    rosterResult,
    ratingsResult,
    matchesResult,
    lineupsResult,
    standingsResult,
  ] | divisions | Retain intended shared RLS read for this exact selector; no added private embedded relation |
| D040 | lwrpc-admin/app/api/ai-insights/route.js:163 / [
    membersResult,
    seasonsResult,
    leaguesResult,
    divisionsResult,
    teamsResult,
    rosterResult,
    ratingsResult,
    matchesResult,
    lineupsResult,
    standingsResult,
  ] | teams | competition contract; published/shared versus private managed scope; global private Teams manager-only |
| D041 | lwrpc-admin/app/api/ai-insights/route.js:179 / [
    membersResult,
    seasonsResult,
    leaguesResult,
    divisionsResult,
    teamsResult,
    rosterResult,
    ratingsResult,
    matchesResult,
    lineupsResult,
    standingsResult,
  ] | team_members | people contract; effective self / exact managed roster / manager field scope; candidate contact and RF excluded |
| D042 | lwrpc-admin/app/api/ai-insights/route.js:183 / [
    membersResult,
    seasonsResult,
    leaguesResult,
    divisionsResult,
    teamsResult,
    rosterResult,
    ratingsResult,
    matchesResult,
    lineupsResult,
    standingsResult,
  ] | member_season_ratings | people contract; effective self / exact managed roster / manager field scope; candidate contact and RF excluded |
| D043 | lwrpc-admin/app/api/ai-insights/route.js:187 / [
    membersResult,
    seasonsResult,
    leaguesResult,
    divisionsResult,
    teamsResult,
    rosterResult,
    ratingsResult,
    matchesResult,
    lineupsResult,
    standingsResult,
  ] | matches | competition contract; published/shared versus private managed scope; global private Teams manager-only |
| D044 | lwrpc-admin/app/api/ai-insights/route.js:211 / [
    membersResult,
    seasonsResult,
    leaguesResult,
    divisionsResult,
    teamsResult,
    rosterResult,
    ratingsResult,
    matchesResult,
    lineupsResult,
    standingsResult,
  ] | match_lineups | competition contract; published/shared versus private managed scope; global private Teams manager-only |
| D045 | lwrpc-admin/app/api/ai-insights/route.js:215 / [
    membersResult,
    seasonsResult,
    leaguesResult,
    divisionsResult,
    teamsResult,
    rosterResult,
    ratingsResult,
    matchesResult,
    lineupsResult,
    standingsResult,
  ] | team_standings | competition contract; published/shared versus private managed scope; global private Teams manager-only |
| D046 | lwrpc-admin/app/api/brevo-diagnostics/route.js:28 / { data: member, error: roleError } | members | people contract; effective self / exact managed roster / manager field scope; candidate contact and RF excluded |
| D047 | lwrpc-admin/app/api/league-communications/route.js:9 / {data:member,error} | members | people contract; effective self / exact managed roster / manager field scope; candidate contact and RF excluded |
| D048 | lwrpc-admin/app/api/league-communications/route.js:10 / [a,b,c] | seasons | Retain intended shared RLS read for this exact selector; no added private embedded relation |
| D049 | lwrpc-admin/app/api/league-communications/route.js:10 / [a,b,c] | leagues | Retain intended shared RLS read for this exact selector; no added private embedded relation |
| D050 | lwrpc-admin/app/api/league-communications/route.js:10 / [a,b,c] | divisions | Retain intended shared RLS read for this exact selector; no added private embedded relation |
| D051 | lwrpc-admin/app/api/league-communications/route.js:12 / {data,error} | members | people contract; effective self / exact managed roster / manager field scope; candidate contact and RF excluded |
| D052 | lwrpc-admin/app/api/league-communications/route.js:12 / {data:teams,error} | teams | competition contract; published/shared versus private managed scope; global private Teams manager-only |
| D053 | lwrpc-admin/app/api/league-communications/route.js:12 / r | team_members | people contract; effective self / exact managed roster / manager field scope; candidate contact and RF excluded |
| D054 | lwrpc-admin/app/api/league-communications/route.js:12 / r | members | people contract; effective self / exact managed roster / manager field scope; candidate contact and RF excluded |
| D055 | lwrpc-admin/app/api/match-lineups/route.js:90 / { data: memberRows, error: memberError } | members | people contract; effective self / exact managed roster / manager field scope; candidate contact and RF excluded |
| D056 | lwrpc-admin/app/api/match-lineups/route.js:101 / { data: match, error: matchError } | matches | competition contract; published/shared versus private managed scope; global private Teams manager-only |
| D057 | lwrpc-admin/app/api/match-lineups/route.js:137 / { data: team, error: teamError } | teams | competition contract; published/shared versus private managed scope; global private Teams manager-only |
| D058 | lwrpc-admin/app/api/match-lineups/route.js:172 / { data: rosterRows, error: rosterError } | team_members | people contract; effective self / exact managed roster / manager field scope; candidate contact and RF excluded |
| D059 | lwrpc-admin/app/api/match-lineups/route.js:195 / { data, error } | member_season_ratings | people contract; effective self / exact managed roster / manager field scope; candidate contact and RF excluded |
| D060 | lwrpc-admin/app/api/match-lineups/route.js:313 / { data: savedRows, error: saveError } | match_lineups | competition contract; published/shared versus private managed scope; global private Teams manager-only |
| D061 | lwrpc-admin/app/api/match-setup-reminders/route.js:63 / { data: member, error: memberError } | members | people contract; effective self / exact managed roster / manager field scope; candidate contact and RF excluded |
| D062 | lwrpc-admin/app/api/member-password-reset-check/route.js:88 / { data: memberRows, error: memberError } | members | people contract; effective self / exact managed roster / manager field scope; candidate contact and RF excluded |
| D063 | lwrpc-admin/app/api/member-password-reset-check/route.js:215 / { data: memberRows, error: memberError } | members | people contract; effective self / exact managed roster / manager field scope; candidate contact and RF excluded |
| D064 | lwrpc-admin/app/api/notification-template-history/route.js:60 / { data: member, error: roleError } | members | people contract; effective self / exact managed roster / manager field scope; candidate contact and RF excluded |
| D065 | lwrpc-admin/app/api/notification-templates/route.js:143 / { data: roleRows, error: roleError } | members | people contract; effective self / exact managed roster / manager field scope; candidate contact and RF excluded |
| D066 | lwrpc-admin/app/api/notifications/route.js:59 / { data: memberRows, error: memberError } | members | people contract; effective self / exact managed roster / manager field scope; candidate contact and RF excluded |
| D067 | lwrpc-admin/app/api/round-robin/action/route.js:371 / { data: memberRows, error: memberError } | members | people contract; effective self / exact managed roster / manager field scope; candidate contact and RF excluded |
| D068 | lwrpc-admin/app/api/round-robin/admin/route.js:224 / { data: memberRows, error: memberError } | members | people contract; effective self / exact managed roster / manager field scope; candidate contact and RF excluded |
| D069 | lwrpc-admin/app/api/round-robin/admin/route.js:257 / { data, error } | members | people contract; effective self / exact managed roster / manager field scope; candidate contact and RF excluded |
| D070 | lwrpc-admin/app/api/score-notification/route.js:62 / { data: memberRows, error: memberError } | members | people contract; effective self / exact managed roster / manager field scope; candidate contact and RF excluded |
| D071 | lwrpc-admin/app/api/season-rollover/route.js:51 / { data: sourceSeason, error: sourceError } | seasons | Retain intended shared RLS read for this exact selector; no added private embedded relation |
| D072 | lwrpc-admin/app/api/season-rollover/route.js:59 / { data: existingSeason, error: existingError } | seasons | Retain intended shared RLS read for this exact selector; no added private embedded relation |
| D073 | lwrpc-admin/app/api/season-rollover/route.js:67 / { data: newSeason, error: seasonError } | seasons | Retain intended shared RLS read for this exact selector; no added private embedded relation |
| D074 | lwrpc-admin/app/api/season-rollover/route.js:81 / { data: sourceLeagues, error: leaguesError } | leagues | Retain intended shared RLS read for this exact selector; no added private embedded relation |
| D075 | lwrpc-admin/app/api/system-settings/route.js:60 / { data: member, error: memberError } | members | people contract; effective self / exact managed roster / manager field scope; candidate contact and RF excluded |
| D076 | lwrpc-admin/app/api/teams/delete/route.js:30 / { data, error } | teams | competition contract; published/shared versus private managed scope; global private Teams manager-only |
| D077 | lwrpc-admin/app/api/tournaments/action/route.js:702 / [leagueResult, tournamentResult] | divisions | Retain intended shared RLS read for this exact selector; no added private embedded relation |
| D078 | lwrpc-admin/app/api/tournaments/action/route.js:976 / { data: sourceTeam, error: sourceTeamError } | teams | competition contract; published/shared versus private managed scope; global private Teams manager-only |
| D079 | lwrpc-admin/app/api/tournaments/action/route.js:1203 / { data: leagueDivisions, error: leagueDivisionError } | divisions | Retain intended shared RLS read for this exact selector; no added private embedded relation |
| D080 | lwrpc-admin/app/api/tournaments/action/route.js:1226 / { data: member, error: memberError } | members | people contract; effective self / exact managed roster / manager field scope; candidate contact and RF excluded |
| D081 | lwrpc-admin/app/api/tournaments/action/route.js:1266 / { data, error } | members | people contract; effective self / exact managed roster / manager field scope; candidate contact and RF excluded |
| D082 | lwrpc-admin/app/api/tournaments/action/route.js:1281 / { data: rosterRows, error: rosterError } | team_members | people contract; effective self / exact managed roster / manager field scope; candidate contact and RF excluded |
| D083 | lwrpc-admin/app/api/tournaments/action/route.js:1313 / { data: teams, error } | teams | competition contract; published/shared versus private managed scope; global private Teams manager-only |
| D084 | lwrpc-admin/app/api/tournaments/admin/route.js:76 / [divisions, leagueDivisions, teams, contacts, courts, matches, log, phoneChangeLog, sourceTeams] | divisions | Retain intended shared RLS read for this exact selector; no added private embedded relation |
| D085 | lwrpc-admin/app/api/tournaments/admin/route.js:116 / [divisions, leagueDivisions, teams, contacts, courts, matches, log, phoneChangeLog, sourceTeams] | teams | competition contract; published/shared versus private managed scope; global private Teams manager-only |
| D086 | lwrpc-admin/app/api/tournaments/admin/route.js:143 / sourceRosters | team_members | people contract; effective self / exact managed roster / manager field scope; candidate contact and RF excluded |
| D087 | lwrpc-admin/app/api/tournaments/admin/route.js:168 / sourceRatings | member_season_ratings | people contract; effective self / exact managed roster / manager field scope; candidate contact and RF excluded |
| D088 | lwrpc-admin/app/api/user-last-logins/route.js:70 / { data: memberRow, error: roleError } | members | people contract; effective self / exact managed roster / manager field scope; candidate contact and RF excluded |
| D089 | lwrpc-admin/app/captain-dashboard/page.js:113 / { data, error } | leagues | Retain intended shared RLS read for this exact selector; no added private embedded relation |
| D090 | lwrpc-admin/app/captain-dashboard/page.js:190 / { data, error } | match_lineups | competition contract; published/shared versus private managed scope; global private Teams manager-only |
| D091 | lwrpc-admin/app/captain-dashboard/page.js:240 / { data: activeDivisionRows, error: activeDivisionError } | divisions | Retain intended shared RLS read for this exact selector; no added private embedded relation |
| D092 | lwrpc-admin/app/captain-dashboard/page.js:269 / { data: clubProLocations, error: clubProLocationsError } | locations | competition contract; published/shared versus private managed scope; global private Teams manager-only |
| D093 | lwrpc-admin/app/captain-dashboard/page.js:292 / { data: teamData, error: teamError } | teams | competition contract; published/shared versus private managed scope; global private Teams manager-only |
| D094 | lwrpc-admin/app/captain-dashboard/page.js:412 / { data: matchData, error: matchError } | matches | competition contract; published/shared versus private managed scope; global private Teams manager-only |
| D095 | lwrpc-admin/app/captain-dashboard/page.js:614 / { data: scoreSubmitterRows, error: scoreSubmitterError } | members | people contract; effective self / exact managed roster / manager field scope; candidate contact and RF excluded |
| D096 | lwrpc-admin/app/captain-dashboard/page.js:632 / { data: publishedDivisionMatches, error: publishedDivisionMatchesError } | matches | competition contract; published/shared versus private managed scope; global private Teams manager-only |
| D097 | lwrpc-admin/app/captain-dashboard/page.js:655 / [{ data: rosterRows, error: rosterError }, { data: standingsRows, error: standingsError }] | team_members | people contract; effective self / exact managed roster / manager field scope; candidate contact and RF excluded |
| D098 | lwrpc-admin/app/captain-dashboard/page.js:669 / [{ data: rosterRows, error: rosterError }, { data: standingsRows, error: standingsError }] | team_standings | competition contract; published/shared versus private managed scope; global private Teams manager-only |
| D099 | lwrpc-admin/app/captain-dashboard/page.js:719 / { data: ratingRows, error: ratingError } | member_season_ratings | people contract; effective self / exact managed roster / manager field scope; candidate contact and RF excluded |
| D100 | lwrpc-admin/app/captain-dashboard/page.js:779 / { data: byeData, error: byeError } | team_byes | competition contract; published/shared versus private managed scope; global private Teams manager-only |
| D101 | lwrpc-admin/app/captain-dashboard/page.js:1617 / { data, error } | matches | competition contract; published/shared versus private managed scope; global private Teams manager-only |
| D102 | lwrpc-admin/app/captain-dashboard/page.js:1789 / [{ data: rosterData, error: rosterError }, { data: lineupData, error: lineupError }] | team_members | people contract; effective self / exact managed roster / manager field scope; candidate contact and RF excluded |
| D103 | lwrpc-admin/app/captain-dashboard/page.js:1794 / [{ data: rosterData, error: rosterError }, { data: lineupData, error: lineupError }] | match_lineups | competition contract; published/shared versus private managed scope; global private Teams manager-only |
| D104 | lwrpc-admin/app/captain-dashboard/page.js:1816 / { data, error } | member_season_ratings | people contract; effective self / exact managed roster / manager field scope; candidate contact and RF excluded |
| D105 | lwrpc-admin/app/captain-dashboard/page.js:1856 / [{ data, error }, { data: defaultTemplateData, error: defaultTemplateError }] | match_lineups | competition contract; published/shared versus private managed scope; global private Teams manager-only |
| D106 | lwrpc-admin/app/captain-dashboard/page.js:1871 / [{ data, error }, { data: defaultTemplateData, error: defaultTemplateError }] | score_sheet_templates | Retain intended shared RLS read for this exact selector; no added private embedded relation |
| D107 | lwrpc-admin/app/captain-dashboard/page.js:2143 / { data, error } | member_season_ratings | people contract; effective self / exact managed roster / manager field scope; candidate contact and RF excluded |
| D108 | lwrpc-admin/app/captain-dashboard/page.js:2235 / { data, error } | matches | competition contract; published/shared versus private managed scope; global private Teams manager-only |
| D109 | lwrpc-admin/app/captain-dashboard/page.js:2451 / { data, error } | teams | competition contract; published/shared versus private managed scope; global private Teams manager-only |
| D110 | lwrpc-admin/app/captain-dashboard/page.js:2526 / [
      { data: divisionTeams, error: teamsError },
      { data: divisionMatches, error: matchesError },
      { data: divisionByes, error: byesError },
      { data: divisionStandings, error: standingsError },
      { data: divisionRatings, error: ratingsError },
    ] | teams | competition contract; published/shared versus private managed scope; global private Teams manager-only |
| D111 | lwrpc-admin/app/captain-dashboard/page.js:2539 / [
      { data: divisionTeams, error: teamsError },
      { data: divisionMatches, error: matchesError },
      { data: divisionByes, error: byesError },
      { data: divisionStandings, error: standingsError },
      { data: divisionRatings, error: ratingsError },
    ] | matches | competition contract; published/shared versus private managed scope; global private Teams manager-only |
| D112 | lwrpc-admin/app/captain-dashboard/page.js:2614 / [
      { data: divisionTeams, error: teamsError },
      { data: divisionMatches, error: matchesError },
      { data: divisionByes, error: byesError },
      { data: divisionStandings, error: standingsError },
      { data: divisionRatings, error: ratingsError },
    ] | team_byes | competition contract; published/shared versus private managed scope; global private Teams manager-only |
| D113 | lwrpc-admin/app/captain-dashboard/page.js:2629 / [
      { data: divisionTeams, error: teamsError },
      { data: divisionMatches, error: matchesError },
      { data: divisionByes, error: byesError },
      { data: divisionStandings, error: standingsError },
      { data: divisionRatings, error: ratingsError },
    ] | team_standings | Retain intended shared RLS read for this exact selector; no added private embedded relation |
| D114 | lwrpc-admin/app/captain-dashboard/page.js:2634 / [
      { data: divisionTeams, error: teamsError },
      { data: divisionMatches, error: matchesError },
      { data: divisionByes, error: byesError },
      { data: divisionStandings, error: standingsError },
      { data: divisionRatings, error: ratingsError },
    ] | member_season_ratings | people contract; effective self / exact managed roster / manager field scope; candidate contact and RF excluded |
| D115 | lwrpc-admin/app/components/AskLwrAssistant.js:231 / { data } | team_members | people contract; effective self / exact managed roster / manager field scope; candidate contact and RF excluded |
| D116 | lwrpc-admin/app/divisions/page.js:119 / { data: leagueData, error: leagueError } | leagues | Retain intended shared RLS read for this exact selector; no added private embedded relation |
| D117 | lwrpc-admin/app/divisions/page.js:137 / { data: divisionData, error: divisionError } | divisions | Retain intended shared RLS read for this exact selector; no added private embedded relation |
| D118 | lwrpc-admin/app/divisions/page.js:158 / { data: templateData, error: templateError } | score_sheet_templates | Retain intended shared RLS read for this exact selector; no added private embedded relation |
| D119 | lwrpc-admin/app/divisions/page.js:169 / { data: lineCountData, error: lineCountError } | division_lines | Retain intended shared RLS read for this exact selector; no added private embedded relation |
| D120 | lwrpc-admin/app/divisions/page.js:390 / { data: createdDivisions, error: divisionError } | divisions | Retain intended shared RLS read for this exact selector; no added private embedded relation |
| D121 | lwrpc-admin/app/divisions/page.js:413 / { data: lineRows, error: lineError } | division_lines | Retain intended shared RLS read for this exact selector; no added private embedded relation |
| D122 | lwrpc-admin/app/divisions/page.js:472 / { data: createdDivision, error: divisionError } | divisions | Retain intended shared RLS read for this exact selector; no added private embedded relation |
| D123 | lwrpc-admin/app/divisions/page.js:484 / { data: lineRows, error: lineError } | division_lines | Retain intended shared RLS read for this exact selector; no added private embedded relation |
| D124 | lwrpc-admin/app/divisions/[id]/page.js:120 / { data, error } | divisions | Retain intended shared RLS read for this exact selector; no added private embedded relation |
| D125 | lwrpc-admin/app/divisions/[id]/page.js:297 / { data, error } | divisions | Retain intended shared RLS read for this exact selector; no added private embedded relation |
| D126 | lwrpc-admin/app/divisions/[id]/page.js:323 / { data, error } | divisions | Retain intended shared RLS read for this exact selector; no added private embedded relation |
| D127 | lwrpc-admin/app/divisions/[id]/page.js:356 / { data: divisionData, error: divisionError } | divisions | Retain intended shared RLS read for this exact selector; no added private embedded relation |
| D128 | lwrpc-admin/app/divisions/[id]/page.js:375 / { data: lineData, error: lineError } | division_lines | Retain intended shared RLS read for this exact selector; no added private embedded relation |
| D129 | lwrpc-admin/app/divisions/[id]/page.js:439 / result | division_lines | Retain intended shared RLS read for this exact selector; no added private embedded relation |
| D130 | lwrpc-admin/app/divisions/[id]/page.js:453 / result | division_lines | Retain intended shared RLS read for this exact selector; no added private embedded relation |
| D131 | lwrpc-admin/app/divisions/[id]/page.js:616 / { data: usedLines, error: usedLinesError } | match_lines | competition contract; published/shared versus private managed scope; global private Teams manager-only |
| D132 | lwrpc-admin/app/divisions/[id]/page.js:645 / { data: insertedRows, error } | division_lines | Retain intended shared RLS read for this exact selector; no added private embedded relation |
| D133 | lwrpc-admin/app/leagues/page.js:58 / [{ data: seasonsData }, { data: leaguesData }] | seasons | Retain intended shared RLS read for this exact selector; no added private embedded relation |
| D134 | lwrpc-admin/app/leagues/page.js:62 / [{ data: seasonsData }, { data: leaguesData }] | leagues | Retain intended shared RLS read for this exact selector; no added private embedded relation |
| D135 | lwrpc-admin/app/lib/aiApprovedAnswersService.js:52 / [rs,ss,os,ms] | seasons | Retain intended shared RLS read for this exact selector; no added private embedded relation |
| D136 | lwrpc-admin/app/lib/aiApprovedAnswersService.js:69 / names | members | people contract; effective self / exact managed roster / manager field scope; candidate contact and RF excluded |
| D137 | lwrpc-admin/app/lib/aiDocumentActivation.js:12 / {data,error} | members | people contract; effective self / exact managed roster / manager field scope; candidate contact and RF excluded |
| D138 | lwrpc-admin/app/lib/aiEligibilityService.js:18 / divisions | divisions | Retain intended shared RLS read for this exact selector; no added private embedded relation |
| D139 | lwrpc-admin/app/lib/auth.js:68 / { data: roleRows } | user_roles | people contract; effective self / exact managed roster / manager field scope; candidate contact and RF excluded |
| D140 | lwrpc-admin/app/lib/identityRoleWriter.js:8 / { data: row, error: readError } | user_roles | people contract; effective self / exact managed roster / manager field scope; candidate contact and RF excluded |
| D141 | lwrpc-admin/app/lib/identityRoleWriter.js:12 / result | user_roles | people contract; effective self / exact managed roster / manager field scope; candidate contact and RF excluded |
| D142 | lwrpc-admin/app/lib/identityRoleWriter.js:14 / result | user_roles | people contract; effective self / exact managed roster / manager field scope; candidate contact and RF excluded |
| D143 | lwrpc-admin/app/lib/matchSetupReminders.js:50 / { data: leagues, error: leagueError } | leagues | Retain intended shared RLS read for this exact selector; no added private embedded relation |
| D144 | lwrpc-admin/app/lib/matchSetupReminders.js:65 / { data: matches, error: matchError } | matches | competition contract; published/shared versus private managed scope; global private Teams manager-only |
| D145 | lwrpc-admin/app/lib/matchSetupReminders.js:109 / { data, error } | match_lineups | competition contract; published/shared versus private managed scope; global private Teams manager-only |
| D146 | lwrpc-admin/app/lib/memberLookup.js:4 / findMembersByEmail | members | people contract; effective self / exact managed roster / manager field scope; candidate contact and RF excluded |
| D147 | lwrpc-admin/app/lib/profilePhotos.js:64 / { data: updatedMember, error: memberUpdateError } | members | people contract; effective self / exact managed roster / manager field scope; candidate contact and RF excluded |
| D148 | lwrpc-admin/app/lib/roleGuards.js:18 / { data, error } | user_roles | people contract; effective self / exact managed roster / manager field scope; candidate contact and RF excluded |
| D149 | lwrpc-admin/app/lib/serverSupabase.js:59 / { data: memberRows, error: roleError } | members | people contract; effective self / exact managed roster / manager field scope; candidate contact and RF excluded |
| D150 | lwrpc-admin/app/lib/standingsRebuild.js:194 / { data: division, error: divisionError } | divisions | Retain intended shared RLS read for this exact selector; no added private embedded relation |
| D151 | lwrpc-admin/app/lib/standingsRebuild.js:202 / { data: divisionTeams, error: teamsError } | teams | competition contract; published/shared versus private managed scope; global private Teams manager-only |
| D152 | lwrpc-admin/app/lib/standingsRebuild.js:210 / { data: verifiedMatches, error: matchesError } | matches | competition contract; published/shared versus private managed scope; global private Teams manager-only |
| D153 | lwrpc-admin/app/lib/standingsRebuild.js:261 / { data: publishedMatches, error: publishedMatchesError } | matches | competition contract; published/shared versus private managed scope; global private Teams manager-only |
| D154 | lwrpc-admin/app/lib/standingsRebuild.js:269 / { data: divisionByes, error: byesError } | team_byes | competition contract; published/shared versus private managed scope; global private Teams manager-only |
| D155 | lwrpc-admin/app/live-match/[id]/page.js:19 / { data: matchData, error: matchError } | matches | competition contract; published/shared versus private managed scope; global private Teams manager-only |
| D156 | lwrpc-admin/app/live-match/[id]/page.js:37 / { data: lineData, error: lineError } | match_lines | competition contract; published/shared versus private managed scope; global private Teams manager-only |
| D157 | lwrpc-admin/app/live-match/[id]/page.js:67 / { data, error } | line_games | competition contract; published/shared versus private managed scope; global private Teams manager-only |
| D158 | lwrpc-admin/app/locations/page.js:49 / { data, error } | locations | competition contract; published/shared versus private managed scope; global private Teams manager-only |
| D159 | lwrpc-admin/app/locations/page.js:77 / { data, error } | members | people contract; effective self / exact managed roster / manager field scope; candidate contact and RF excluded |
| D160 | lwrpc-admin/app/matches/[id]/page.js:98 / { data: memberData } | members | people contract; effective self / exact managed roster / manager field scope; candidate contact and RF excluded |
| D161 | lwrpc-admin/app/matches/[id]/page.js:107 / { data: matchData, error: matchError } | matches | competition contract; published/shared versus private managed scope; global private Teams manager-only |
| D162 | lwrpc-admin/app/matches/[id]/page.js:141 / { data: lineData, error: lineError } | match_lines | competition contract; published/shared versus private managed scope; global private Teams manager-only |
| D163 | lwrpc-admin/app/matches/[id]/page.js:182 / { data: divisionLineData, error: divisionLineError } | division_lines | Retain intended shared RLS read for this exact selector; no added private embedded relation |
| D164 | lwrpc-admin/app/matches/[id]/page.js:219 / { data: homeRosterData, error: homeRosterError } | team_members | people contract; effective self / exact managed roster / manager field scope; candidate contact and RF excluded |
| D165 | lwrpc-admin/app/matches/[id]/page.js:231 / { data: awayRosterData, error: awayRosterError } | team_members | people contract; effective self / exact managed roster / manager field scope; candidate contact and RF excluded |
| D166 | lwrpc-admin/app/matches/[id]/page.js:247 / { data, error } | line_games | competition contract; published/shared versus private managed scope; global private Teams manager-only |
| D167 | lwrpc-admin/app/matches/[id]/page.js:295 / { data, error } | line_games | competition contract; published/shared versus private managed scope; global private Teams manager-only |
| D168 | lwrpc-admin/app/matches/[id]/page.js:310 / { data: lineupData, error: lineupError } | match_lineups | competition contract; published/shared versus private managed scope; global private Teams manager-only |
| D169 | lwrpc-admin/app/matches/[id]/page.js:330 / { data, error } | member_season_ratings | people contract; effective self / exact managed roster / manager field scope; candidate contact and RF excluded |
| D170 | lwrpc-admin/app/matches/[id]/page.js:380 / { data, error } | member_season_ratings | people contract; effective self / exact managed roster / manager field scope; candidate contact and RF excluded |
| D171 | lwrpc-admin/app/matches/[id]/page.js:1820 / { data: teams, error } | teams | competition contract; published/shared versus private managed scope; global private Teams manager-only |
| D172 | lwrpc-admin/app/member-import/page.js:94 / { data: memberData, error } | members | people contract; effective self / exact managed roster / manager field scope; candidate contact and RF excluded |
| D173 | lwrpc-admin/app/member-import/page.js:376 / { data: memberData } | members | people contract; effective self / exact managed roster / manager field scope; candidate contact and RF excluded |
| D174 | lwrpc-admin/app/member-import/page.js:466 / { data: locations, error: locationError } | locations | competition contract; published/shared versus private managed scope; global private Teams manager-only |
| D175 | lwrpc-admin/app/members/page.js:119 / [response, seasonResult, locationResult] | seasons | Retain intended shared RLS read for this exact selector; no added private embedded relation |
| D176 | lwrpc-admin/app/members/page.js:123 / [response, seasonResult, locationResult] | locations | competition contract; published/shared versus private managed scope; global private Teams manager-only |
| D177 | lwrpc-admin/app/members/page.js:268 / [
      { data: captainRoleRows, error: roleError },
      { rows: teamMemberRows, error: teamMemberError },
    ] | user_roles | people contract; effective self / exact managed roster / manager field scope; candidate contact and RF excluded |
| D178 | lwrpc-admin/app/members/page.js:360 / { data, error } | members | people contract; effective self / exact managed roster / manager field scope; candidate contact and RF excluded |
| D179 | lwrpc-admin/app/members/page.js:424 / [{ data: teamRows, error: teamError }, { data: rows, error: historyError }] | team_members | people contract; effective self / exact managed roster / manager field scope; candidate contact and RF excluded |
| D180 | lwrpc-admin/app/members/page.js:452 / [{ data: teamRows, error: teamError }, { data: rows, error: historyError }] | match_lines | competition contract; published/shared versus private managed scope; global private Teams manager-only |
| D181 | lwrpc-admin/app/members/page.js:544 / { data, error } | member_season_ratings | people contract; effective self / exact managed roster / manager field scope; candidate contact and RF excluded |
| D182 | lwrpc-admin/app/members/page.js:1356 / { data, error } | team_members | people contract; effective self / exact managed roster / manager field scope; candidate contact and RF excluded |
| D183 | lwrpc-admin/app/members/page.js:1409 / { data, error } | teams | competition contract; published/shared versus private managed scope; global private Teams manager-only |
| D184 | lwrpc-admin/app/members/page.js:1484 / { data, error } | members | people contract; effective self / exact managed roster / manager field scope; candidate contact and RF excluded |
| D185 | lwrpc-admin/app/members/page.js:1522 / query | member_season_ratings | people contract; effective self / exact managed roster / manager field scope; candidate contact and RF excluded |
| D186 | lwrpc-admin/app/members/[id]/page.js:62 / { data: memberData, error: memberError } | members | people contract; effective self / exact managed roster / manager field scope; candidate contact and RF excluded |
| D187 | lwrpc-admin/app/members/[id]/page.js:84 / { data: ratingData, error: ratingError } | member_season_ratings | people contract; effective self / exact managed roster / manager field scope; candidate contact and RF excluded |
| D188 | lwrpc-admin/app/members/[id]/page.js:103 / { data: teamData, error: teamError } | team_members | people contract; effective self / exact managed roster / manager field scope; candidate contact and RF excluded |
| D189 | lwrpc-admin/app/members/[id]/page.js:149 / { data: historyData, error: historyError } | match_lines | competition contract; published/shared versus private managed scope; global private Teams manager-only |
| D190 | lwrpc-admin/app/members/[id]/page.js:226 / { data: roleData, error: roleError } | user_roles | people contract; effective self / exact managed roster / manager field scope; candidate contact and RF excluded |
| D191 | lwrpc-admin/app/members/[id]/page.js:237 / { data: locationData, error: locationError } | locations | competition contract; published/shared versus private managed scope; global private Teams manager-only |
| D192 | lwrpc-admin/app/members/[id]/page.js:357 / { data, error } | members | people contract; effective self / exact managed roster / manager field scope; candidate contact and RF excluded |
| D193 | lwrpc-admin/app/members/[id]/page.js:481 / { data, error } | user_roles | people contract; effective self / exact managed roster / manager field scope; candidate contact and RF excluded |
| D194 | lwrpc-admin/app/members/[id]/page.js:498 / { data, error } | user_roles | people contract; effective self / exact managed roster / manager field scope; candidate contact and RF excluded |
| D195 | lwrpc-admin/app/members/[id]/page.js:531 / { data, error } | members | people contract; effective self / exact managed roster / manager field scope; candidate contact and RF excluded |
| D196 | lwrpc-admin/app/player-dashboard/page.js:129 / { data, error } | leagues | Retain intended shared RLS read for this exact selector; no added private embedded relation |
| D197 | lwrpc-admin/app/player-dashboard/page.js:201 / { data: activeDivisionRows, error: activeDivisionError } | divisions | Retain intended shared RLS read for this exact selector; no added private embedded relation |
| D198 | lwrpc-admin/app/player-dashboard/page.js:229 / { data: rosterData, error: rosterError } | team_members | people contract; effective self / exact managed roster / manager field scope; candidate contact and RF excluded |
| D199 | lwrpc-admin/app/player-dashboard/page.js:323 / [
        { data, error },
        { data: teamByeRows, error: teamByeError },
        { data: publishedDivisionMatches, error: publishedDivisionMatchesError },
        { data: standingsRows, error: standingsError },
      ] | matches | competition contract; published/shared versus private managed scope; global private Teams manager-only |
| D200 | lwrpc-admin/app/player-dashboard/page.js:428 / [
        { data, error },
        { data: teamByeRows, error: teamByeError },
        { data: publishedDivisionMatches, error: publishedDivisionMatchesError },
        { data: standingsRows, error: standingsError },
      ] | team_byes | competition contract; published/shared versus private managed scope; global private Teams manager-only |
| D201 | lwrpc-admin/app/player-dashboard/page.js:443 / [
        { data, error },
        { data: teamByeRows, error: teamByeError },
        { data: publishedDivisionMatches, error: publishedDivisionMatchesError },
        { data: standingsRows, error: standingsError },
      ] | matches | competition contract; published/shared versus private managed scope; global private Teams manager-only |
| D202 | lwrpc-admin/app/player-dashboard/page.js:448 / [
        { data, error },
        { data: teamByeRows, error: teamByeError },
        { data: publishedDivisionMatches, error: publishedDivisionMatchesError },
        { data: standingsRows, error: standingsError },
      ] | team_standings | competition contract; published/shared versus private managed scope; global private Teams manager-only |
| D203 | lwrpc-admin/app/player-dashboard/page.js:496 / { data: scoreMemberRows } | members | people contract; effective self / exact managed roster / manager field scope; candidate contact and RF excluded |
| D204 | lwrpc-admin/app/player-dashboard/page.js:512 / { data: matchRosterRows, error: matchRosterError } | team_members | people contract; effective self / exact managed roster / manager field scope; candidate contact and RF excluded |
| D205 | lwrpc-admin/app/player-dashboard/page.js:541 / { data: playerHistoryData, error: playerHistoryError } | match_lines | competition contract; published/shared versus private managed scope; global private Teams manager-only |
| D206 | lwrpc-admin/app/player-dashboard/page.js:682 / { data, error } | member_season_ratings | people contract; effective self / exact managed roster / manager field scope; candidate contact and RF excluded |
| D207 | lwrpc-admin/app/player-dashboard/page.js:980 / { data, error } | match_lineups | competition contract; published/shared versus private managed scope; global private Teams manager-only |
| D208 | lwrpc-admin/app/player-dashboard/page.js:1146 / [
      { data: divisionTeams, error: teamsError },
      { data: divisionMatches, error: matchesError },
      { data: divisionByes, error: byesError },
      { data: divisionStandings, error: standingsError },
      { data: divisionRatings, error: ratingsError },
    ] | teams | competition contract; published/shared versus private managed scope; global private Teams manager-only |
| D209 | lwrpc-admin/app/player-dashboard/page.js:1159 / [
      { data: divisionTeams, error: teamsError },
      { data: divisionMatches, error: matchesError },
      { data: divisionByes, error: byesError },
      { data: divisionStandings, error: standingsError },
      { data: divisionRatings, error: ratingsError },
    ] | matches | competition contract; published/shared versus private managed scope; global private Teams manager-only |
| D210 | lwrpc-admin/app/player-dashboard/page.js:1211 / [
      { data: divisionTeams, error: teamsError },
      { data: divisionMatches, error: matchesError },
      { data: divisionByes, error: byesError },
      { data: divisionStandings, error: standingsError },
      { data: divisionRatings, error: ratingsError },
    ] | team_byes | competition contract; published/shared versus private managed scope; global private Teams manager-only |
| D211 | lwrpc-admin/app/player-dashboard/page.js:1226 / [
      { data: divisionTeams, error: teamsError },
      { data: divisionMatches, error: matchesError },
      { data: divisionByes, error: byesError },
      { data: divisionStandings, error: standingsError },
      { data: divisionRatings, error: ratingsError },
    ] | team_standings | Retain intended shared RLS read for this exact selector; no added private embedded relation |
| D212 | lwrpc-admin/app/player-dashboard/page.js:1231 / [
      { data: divisionTeams, error: teamsError },
      { data: divisionMatches, error: matchesError },
      { data: divisionByes, error: byesError },
      { data: divisionStandings, error: standingsError },
      { data: divisionRatings, error: ratingsError },
    ] | member_season_ratings | people contract; effective self / exact managed roster / manager field scope; candidate contact and RF excluded |
| D213 | lwrpc-admin/app/ratings/page.js:107 / { data: seasonData, error: seasonError } | seasons | Retain intended shared RLS read for this exact selector; no added private embedded relation |
| D214 | lwrpc-admin/app/ratings/page.js:222 / { data, error } | member_season_ratings | people contract; effective self / exact managed roster / manager field scope; candidate contact and RF excluded |
| D215 | lwrpc-admin/app/ratings/page.js:910 / { data: rosterRows, error: rosterError } | team_members | people contract; effective self / exact managed roster / manager field scope; candidate contact and RF excluded |
| D216 | lwrpc-admin/app/ratings/page.js:2379 / { data, error } | members | people contract; effective self / exact managed roster / manager field scope; candidate contact and RF excluded |
| D217 | lwrpc-admin/app/ratings/page.js:2401 / query | member_season_ratings | people contract; effective self / exact managed roster / manager field scope; candidate contact and RF excluded |
| D218 | lwrpc-admin/app/ratings/page.js:2425 / { data, error } | team_members | people contract; effective self / exact managed roster / manager field scope; candidate contact and RF excluded |
| D219 | lwrpc-admin/app/schedule-editor/page.js:52 / { data: matchData, error: matchError } | matches | competition contract; published/shared versus private managed scope; global private Teams manager-only |
| D220 | lwrpc-admin/app/schedule-editor/page.js:88 / { data: leagueData } | leagues | Retain intended shared RLS read for this exact selector; no added private embedded relation |
| D221 | lwrpc-admin/app/schedule-editor/page.js:93 / { data: divisionData } | divisions | Retain intended shared RLS read for this exact selector; no added private embedded relation |
| D222 | lwrpc-admin/app/schedule-editor/page.js:98 / { data: locationData } | locations | competition contract; published/shared versus private managed scope; global private Teams manager-only |
| D223 | lwrpc-admin/app/schedule-editor/page.js:107 / { data: teamData } | teams | competition contract; published/shared versus private managed scope; global private Teams manager-only |
| D224 | lwrpc-admin/app/schedule-editor/page.js:125 / { data: scoreMembers } | members | people contract; effective self / exact managed roster / manager field scope; candidate contact and RF excluded |
| D225 | lwrpc-admin/app/schedule-editor/page.js:723 / { data: linesToDelete, error: findLineError } | match_lines | competition contract; published/shared versus private managed scope; global private Teams manager-only |
| D226 | lwrpc-admin/app/schedule-editor/page.js:786 / { data: linesToReset, error: findLineError } | match_lines | competition contract; published/shared versus private managed scope; global private Teams manager-only |
| D227 | lwrpc-admin/app/scheduling/page.js:108 / { data: leagueData, error: leagueError } | leagues | Retain intended shared RLS read for this exact selector; no added private embedded relation |
| D228 | lwrpc-admin/app/scheduling/page.js:114 / { data: divisionData, error: divisionError } | divisions | Retain intended shared RLS read for this exact selector; no added private embedded relation |
| D229 | lwrpc-admin/app/scheduling/page.js:120 / { data: locationData, error: locationError } | locations | competition contract; published/shared versus private managed scope; global private Teams manager-only |
| D230 | lwrpc-admin/app/scheduling/page.js:144 / { data: matchData, error: matchError } | matches | competition contract; published/shared versus private managed scope; global private Teams manager-only |
| D231 | lwrpc-admin/app/scheduling/page.js:661 / { data: lineTemplates, error } | division_lines | Retain intended shared RLS read for this exact selector; no added private embedded relation |
| D232 | lwrpc-admin/app/scheduling/page.js:691 / { data: createdLines, error: insertError } | match_lines | competition contract; published/shared versus private managed scope; global private Teams manager-only |
| D233 | lwrpc-admin/app/scheduling/page.js:740 / { data: divisionTeams, error: teamError } | teams | competition contract; published/shared versus private managed scope; global private Teams manager-only |
| D234 | lwrpc-admin/app/scheduling/page.js:902 / { data: createdMatches, error } | matches | competition contract; published/shared versus private managed scope; global private Teams manager-only |
| D235 | lwrpc-admin/app/scheduling/page.js:958 / query | matches | competition contract; published/shared versus private managed scope; global private Teams manager-only |
| D236 | lwrpc-admin/app/scheduling/page.js:978 / { data: linesToDelete, error: findLineError } | match_lines | competition contract; published/shared versus private managed scope; global private Teams manager-only |
| D237 | lwrpc-admin/app/score-entry/[id]/page.js:55 / { data: memberData } | members | people contract; effective self / exact managed roster / manager field scope; candidate contact and RF excluded |
| D238 | lwrpc-admin/app/score-entry/[id]/page.js:64 / { data: matchData, error: matchError } | matches | competition contract; published/shared versus private managed scope; global private Teams manager-only |
| D239 | lwrpc-admin/app/score-entry/[id]/page.js:96 / { data: lineData, error: lineError } | match_lines | competition contract; published/shared versus private managed scope; global private Teams manager-only |
| D240 | lwrpc-admin/app/score-entry/[id]/page.js:133 / { data, error } | line_games | competition contract; published/shared versus private managed scope; global private Teams manager-only |
| D241 | lwrpc-admin/app/score-entry/[id]/page.js:151 / { data, error } | member_season_ratings | people contract; effective self / exact managed roster / manager field scope; candidate contact and RF excluded |
| D242 | lwrpc-admin/app/score-entry/[id]/page.js:174 / { data, error } | member_season_ratings | people contract; effective self / exact managed roster / manager field scope; candidate contact and RF excluded |
| D243 | lwrpc-admin/app/score-entry/[id]/page.js:494 / { data: opposingTeam, error } | teams | competition contract; published/shared versus private managed scope; global private Teams manager-only |
| D244 | lwrpc-admin/app/score-sheets/page.js:39 / { data, error } | score_sheet_templates | Retain intended shared RLS read for this exact selector; no added private embedded relation |
| D245 | lwrpc-admin/app/scoring/page.js:124 / [leagueResult, divisionResult, teamResult, locationResult] | leagues | Retain intended shared RLS read for this exact selector; no added private embedded relation |
| D246 | lwrpc-admin/app/scoring/page.js:125 / [leagueResult, divisionResult, teamResult, locationResult] | divisions | Retain intended shared RLS read for this exact selector; no added private embedded relation |
| D247 | lwrpc-admin/app/scoring/page.js:126 / [leagueResult, divisionResult, teamResult, locationResult] | teams | competition contract; published/shared versus private managed scope; global private Teams manager-only |
| D248 | lwrpc-admin/app/scoring/page.js:127 / [leagueResult, divisionResult, teamResult, locationResult] | locations | competition contract; published/shared versus private managed scope; global private Teams manager-only |
| D249 | lwrpc-admin/app/scoring/page.js:145 / { data, error } | matches | competition contract; published/shared versus private managed scope; global private Teams manager-only |
| D250 | lwrpc-admin/app/scoring/page.js:272 / { data: scoreMembers } | members | people contract; effective self / exact managed roster / manager field scope; candidate contact and RF excluded |
| D251 | lwrpc-admin/app/scoring/page.js:456 / { data, error } | matches | competition contract; published/shared versus private managed scope; global private Teams manager-only |
| D252 | lwrpc-admin/app/scoring/page.js:563 / { data, error } | matches | competition contract; published/shared versus private managed scope; global private Teams manager-only |
| D253 | lwrpc-admin/app/scoring/page.js:949 / { error } | matches | competition contract; published/shared versus private managed scope; global private Teams manager-only |
| D254 | lwrpc-admin/app/scoring/page.js:971 / { data: createdMatch, error } | matches | competition contract; published/shared versus private managed scope; global private Teams manager-only |
| D255 | lwrpc-admin/app/scoring/page.js:1123 / { data: lineTemplates, error } | division_lines | Retain intended shared RLS read for this exact selector; no added private embedded relation |
| D256 | lwrpc-admin/app/scoring/page.js:1131 / { data: createdLines, error: lineError } | match_lines | competition contract; published/shared versus private managed scope; global private Teams manager-only |
| D257 | lwrpc-admin/app/seasons/page.js:44 / { data, error } | seasons | Retain intended shared RLS read for this exact selector; no added private embedded relation |
| D258 | lwrpc-admin/app/seasons/page.js:160 / { data: seasonLeagues, error: leaguesError } | leagues | Retain intended shared RLS read for this exact selector; no added private embedded relation |
| D259 | lwrpc-admin/app/seasons/page.js:169 / { data: seasonDivisions, error: divisionsError } | divisions | Retain intended shared RLS read for this exact selector; no added private embedded relation |
| D260 | lwrpc-admin/app/seasons/page.js:176 / { data: seasonTeams, error: teamsError } | teams | competition contract; published/shared versus private managed scope; global private Teams manager-only |
| D261 | lwrpc-admin/app/standings/page.js:41 / { data: leagueData } | leagues | Retain intended shared RLS read for this exact selector; no added private embedded relation |
| D262 | lwrpc-admin/app/standings/page.js:46 / { data: divisionData } | divisions | Retain intended shared RLS read for this exact selector; no added private embedded relation |
| D263 | lwrpc-admin/app/standings/page.js:51 / { data: standingsData } | team_standings | competition contract; published/shared versus private managed scope; global private Teams manager-only |
| D264 | lwrpc-admin/app/standings/page.js:64 / { data: publishedMatchData, error: publishedMatchError } | matches | competition contract; published/shared versus private managed scope; global private Teams manager-only |
| D265 | lwrpc-admin/app/standings/page.js:69 / { data: byeData, error: byeError } | team_byes | competition contract; published/shared versus private managed scope; global private Teams manager-only |
| D266 | lwrpc-admin/app/standings/page.js:243 / [
      { data: divisionTeams, error: teamsError },
      { data: divisionMatches, error: matchesError },
      { data: divisionByes, error: byesError },
      { data: divisionStandings, error: standingsError },
      { data: divisionRatings, error: ratingsError },
    ] | teams | competition contract; published/shared versus private managed scope; global private Teams manager-only |
| D267 | lwrpc-admin/app/standings/page.js:256 / [
      { data: divisionTeams, error: teamsError },
      { data: divisionMatches, error: matchesError },
      { data: divisionByes, error: byesError },
      { data: divisionStandings, error: standingsError },
      { data: divisionRatings, error: ratingsError },
    ] | matches | competition contract; published/shared versus private managed scope; global private Teams manager-only |
| D268 | lwrpc-admin/app/standings/page.js:329 / [
      { data: divisionTeams, error: teamsError },
      { data: divisionMatches, error: matchesError },
      { data: divisionByes, error: byesError },
      { data: divisionStandings, error: standingsError },
      { data: divisionRatings, error: ratingsError },
    ] | team_byes | competition contract; published/shared versus private managed scope; global private Teams manager-only |
| D269 | lwrpc-admin/app/standings/page.js:344 / [
      { data: divisionTeams, error: teamsError },
      { data: divisionMatches, error: matchesError },
      { data: divisionByes, error: byesError },
      { data: divisionStandings, error: standingsError },
      { data: divisionRatings, error: ratingsError },
    ] | team_standings | Retain intended shared RLS read for this exact selector; no added private embedded relation |
| D270 | lwrpc-admin/app/standings/page.js:349 / [
      { data: divisionTeams, error: teamsError },
      { data: divisionMatches, error: matchesError },
      { data: divisionByes, error: byesError },
      { data: divisionStandings, error: standingsError },
      { data: divisionRatings, error: ratingsError },
    ] | member_season_ratings | people contract; effective self / exact managed roster / manager field scope; candidate contact and RF excluded |
| D271 | lwrpc-admin/app/teams/page.js:216 / { data: leagueData } | leagues | Retain intended shared RLS read for this exact selector; no added private embedded relation |
| D272 | lwrpc-admin/app/teams/page.js:230 / { data: divisionData } | divisions | Retain intended shared RLS read for this exact selector; no added private embedded relation |
| D273 | lwrpc-admin/app/teams/page.js:235 / { data: locationData } | locations | competition contract; published/shared versus private managed scope; global private Teams manager-only |
| D274 | lwrpc-admin/app/teams/page.js:248 / { data: teamData } | teams | competition contract; published/shared versus private managed scope; global private Teams manager-only |
| D275 | lwrpc-admin/app/teams/page.js:621 / { data: createdTeams, error: teamError } | teams | competition contract; published/shared versus private managed scope; global private Teams manager-only |
| D276 | lwrpc-admin/app/teams/page.js:643 / { data: rosterRows, error: rosterLoadError } | team_members | people contract; effective self / exact managed roster / manager field scope; candidate contact and RF excluded |
| D277 | lwrpc-admin/app/teams/page.js:697 / { data: createdTeam, error: teamError } | teams | competition contract; published/shared versus private managed scope; global private Teams manager-only |
| D278 | lwrpc-admin/app/teams/page.js:710 / { data: rosterRows, error: rosterLoadError } | team_members | people contract; effective self / exact managed roster / manager field scope; candidate contact and RF excluded |
| D279 | lwrpc-admin/app/teams/page.js:768 / [
      { data: divisionTeams, error: teamsError },
      { data: divisionMatches, error: matchesError },
      { data: divisionByes, error: byesError },
      { data: divisionStandings, error: standingsError },
      { data: divisionRatings, error: ratingsError },
    ] | teams | competition contract; published/shared versus private managed scope; global private Teams manager-only |
| D280 | lwrpc-admin/app/teams/page.js:783 / [
      { data: divisionTeams, error: teamsError },
      { data: divisionMatches, error: matchesError },
      { data: divisionByes, error: byesError },
      { data: divisionStandings, error: standingsError },
      { data: divisionRatings, error: ratingsError },
    ] | matches | competition contract; published/shared versus private managed scope; global private Teams manager-only |
| D281 | lwrpc-admin/app/teams/page.js:834 / [
      { data: divisionTeams, error: teamsError },
      { data: divisionMatches, error: matchesError },
      { data: divisionByes, error: byesError },
      { data: divisionStandings, error: standingsError },
      { data: divisionRatings, error: ratingsError },
    ] | team_byes | competition contract; published/shared versus private managed scope; global private Teams manager-only |
| D282 | lwrpc-admin/app/teams/page.js:843 / [
      { data: divisionTeams, error: teamsError },
      { data: divisionMatches, error: matchesError },
      { data: divisionByes, error: byesError },
      { data: divisionStandings, error: standingsError },
      { data: divisionRatings, error: ratingsError },
    ] | team_standings | Retain intended shared RLS read for this exact selector; no added private embedded relation |
| D283 | lwrpc-admin/app/teams/page.js:848 / [
      { data: divisionTeams, error: teamsError },
      { data: divisionMatches, error: matchesError },
      { data: divisionByes, error: byesError },
      { data: divisionStandings, error: standingsError },
      { data: divisionRatings, error: ratingsError },
    ] | member_season_ratings | people contract; effective self / exact managed roster / manager field scope; candidate contact and RF excluded |
| D284 | lwrpc-admin/app/teams/page.js:1774 / { data, error } | members | people contract; effective self / exact managed roster / manager field scope; candidate contact and RF excluded |
| D285 | lwrpc-admin/app/teams/page.js:1807 / { data, error } | team_members | people contract; effective self / exact managed roster / manager field scope; candidate contact and RF excluded |
| D286 | lwrpc-admin/app/teams/[id]/page.js:54 / { data: teamData, error: teamError } | teams | competition contract; published/shared versus private managed scope; global private Teams manager-only |
| D287 | lwrpc-admin/app/teams/[id]/page.js:119 / { data: rosterData, error: rosterError } | team_members | people contract; effective self / exact managed roster / manager field scope; candidate contact and RF excluded |
| D288 | lwrpc-admin/app/teams/[id]/page.js:144 / { data: memberData, error: memberError } | members | people contract; effective self / exact managed roster / manager field scope; candidate contact and RF excluded |
| D289 | lwrpc-admin/app/teams/[id]/page.js:168 / { data: locationData, error: locationError } | locations | competition contract; published/shared versus private managed scope; global private Teams manager-only |
| D290 | lwrpc-admin/app/teams/[id]/page.js:183 / { data, error } | member_season_ratings | people contract; effective self / exact managed roster / manager field scope; candidate contact and RF excluded |
| D291 | lwrpc-admin/app/teams/[id]/page.js:203 / { data: teamRows, error: teamRowsError } | team_members | people contract; effective self / exact managed roster / manager field scope; candidate contact and RF excluded |
| D292 | lwrpc-admin/app/teams/[id]/page.js:244 / { data, error } | match_lines | competition contract; published/shared versus private managed scope; global private Teams manager-only |
