# LMS-0726 final notification census — all 82 writes

Design only; current source trace. No provider calls. Every statement is counted; shared parent notifications emit once. Score autosave/derived winner writes do not independently notify. Scoring sendReminders is a separate notification action, not a mutation in the 82. Existing server Match Setup save is outside the 82 and retains opponent Captain notifications after successful commit; opening/reusing a saved lineup emits none.

| ID | Operation | Current notification | Recipient | Trigger | Timing | Channel/provider | Current dedup | Migration |
|---|---|---|---|---|---|---|---|---|
| W017 | captain-dashboard:saveFlexSchedule | True | Away-team captain/co-captain contacts from teamCaptainContactsOnly | Successful flex date/time save | After current matches update | Email/SMS by preference via /api/notifications -> Brevo | Per-request recipient uniqueness only; no durable business-event dedup | Committed FLEX_CHANGED event; preserve audience, durable event key |
| W020 | divisions:deleteDivision | False | None | No notification in this mutation | Not applicable | None | Not applicable | No new event |
| W072 | locations:saveLocation | False | None | No notification in this mutation | Not applicable | None | Not applicable | No new event |
| W073 | locations:saveLocation | False | None | No notification in this mutation | Not applicable | None | Not applicable | No new event |
| W074 | locations:deleteLocation | False | None | No notification in this mutation | Not applicable | None | Not applicable | No new event |
| W075 | locations:mergeLocations | False | None | No notification in this mutation | Not applicable | None | Not applicable | No new event |
| W076 | locations:mergeLocations | False | None | No notification in this mutation | Not applicable | None | Not applicable | No new event |
| W077 | locations:mergeLocations | False | None | No notification in this mutation | Not applicable | None | Not applicable | No new event |
| W078 | locations:mergeLocations | False | None | No notification in this mutation | Not applicable | None | Not applicable | No new event |
| W079 | matches/[id]:MatchDetailPage | False | None | No notification in this mutation | Not applicable | None | Not applicable | No new event |
| W080 | matches/[id]:saveMatchRatingSnapshots | False | None | No notification in this mutation | Not applicable | None | Not applicable | No new event |
| W081 | matches/[id]:updateLinePlayer | False | None | No notification in this mutation | Not applicable | None | Not applicable | No new event |
| W082 | matches/[id]:applySavedLineup | False | None | No notification in this mutation | Not applicable | None | Not applicable | No new event |
| W083 | matches/[id]:queueGameUpdate | False | None | No notification in this mutation | Not applicable | None | Not applicable | No new event |
| W084 | matches/[id]:saveCalculatedWinners | False | None | No notification in this mutation | Not applicable | None | Not applicable | No new event |
| W085 | matches/[id]:saveCalculatedWinners | False | None | No notification in this mutation | Not applicable | None | Not applicable | No new event |
| W086 | matches/[id]:completeMatch | True | Opposing team captain/co-captains/direct Club Pro; changed-score event uses both teams; manager fallback follows notificationTeamIdsForCurrentUser | Submitted/changed/verified transition; W131 shares parent submit with W132, not a second event | After current successful parent sequence | Email/SMS by preference via /api/score-notification -> Brevo | Recipient uniqueness only; no durable operation dedup | One committed score-transition event for enclosing operation, not one per W expression |
| W087 | matches/[id]:completeSpecialMatch | True | Opposing team captain/co-captains/direct Club Pro; changed-score event uses both teams; manager fallback follows notificationTeamIdsForCurrentUser | Submitted/changed/verified transition; W131 shares parent submit with W132, not a second event | After current successful parent sequence | Email/SMS by preference via /api/score-notification -> Brevo | Recipient uniqueness only; no durable operation dedup | One committed score-transition event for enclosing operation, not one per W expression |
| W088 | matches/[id]:verifyScores | True | Opposing team captain/co-captains/direct Club Pro; changed-score event uses both teams; manager fallback follows notificationTeamIdsForCurrentUser | Submitted/changed/verified transition; W131 shares parent submit with W132, not a second event | After current successful parent sequence | Email/SMS by preference via /api/score-notification -> Brevo | Recipient uniqueness only; no durable operation dedup | One committed score-transition event for enclosing operation, not one per W expression |
| W089 | matches/[id]:disputeScores | False | None | No notification in this mutation | Not applicable | None | Not applicable | No new event |
| W090 | member-import:processMemberImportRows | False | None | No notification in this mutation | Not applicable | None | Not applicable | No new event |
| W091 | member-import:processMemberImportRows | False | None | No notification in this mutation | Not applicable | None | Not applicable | No new event |
| W092 | member-import:markMemberInactive | False | None | No notification in this mutation | Not applicable | None | Not applicable | No new event |
| W093 | member-import:markAllMissingInactive | False | None | No notification in this mutation | Not applicable | None | Not applicable | No new event |
| W094 | members:cleanMembers | False | None | No notification in this mutation | Not applicable | None | Not applicable | No new event |
| W095 | members:correctRoles | False | None | No notification in this mutation | Not applicable | None | Not applicable | No new event |
| W096 | members:addMember | False | None | No notification in this mutation | Not applicable | None | Not applicable | No new event |
| W097 | members:addMember | False | None | No notification in this mutation | Not applicable | None | Not applicable | No new event |
| W098 | members/[id]:saveMember | False | None | No notification in this mutation | Not applicable | None | Not applicable | No new event |
| W099 | members/[id]:updateUserRole | False | None | No notification in this mutation | Not applicable | None | Not applicable | No new event |
| W100 | members/[id]:updateUserRole | False | None | No notification in this mutation | Not applicable | None | Not applicable | No new event |
| W101 | members/[id]:updateMemberActiveStatus | False | None | No notification in this mutation | Not applicable | None | Not applicable | No new event |
| W102 | ratings:updateRating | False | None | No notification in this mutation | Not applicable | None | Not applicable | No new event |
| W103 | ratings:updateRating | False | None | No notification in this mutation | Not applicable | None | Not applicable | No new event |
| W104 | ratings:updateMemberDuprId | False | None | No notification in this mutation | Not applicable | None | Not applicable | No new event |
| W105 | ratings:deleteRatingsForSelectedSeason | False | None | No notification in this mutation | Not applicable | None | Not applicable | No new event |
| W106 | ratings:applyRatingsImport | False | None | No notification in this mutation | Not applicable | None | Not applicable | No new event |
| W107 | ratings:applyRatingsImport | False | None | No notification in this mutation | Not applicable | None | Not applicable | No new event |
| W108 | ratings:copyRatingsBetweenSeasons | False | None | No notification in this mutation | Not applicable | None | Not applicable | No new event |
| W109 | ratings:copyRatingsBetweenSeasons | False | None | No notification in this mutation | Not applicable | None | Not applicable | No new event |
| W110 | ratings:applyRatingCleanupChanges | False | None | No notification in this mutation | Not applicable | None | Not applicable | No new event |
| W111 | ratings:applyRatingCleanupChanges | False | None | No notification in this mutation | Not applicable | None | Not applicable | No new event |
| W112 | schedule-editor:publishSelectedMatches | False | None | No notification in this mutation | Not applicable | None | Not applicable | No new event |
| W113 | schedule-editor:balanceSelectedMatches | False | None | No notification in this mutation | Not applicable | None | Not applicable | No new event |
| W114 | schedule-editor:confirmSwapHomeAway | False | None | No notification in this mutation | Not applicable | None | Not applicable | No new event |
| W115 | schedule-editor:updateMatch | False | None | No notification in this mutation | Not applicable | None | Not applicable | No new event |
| W116 | schedule-editor:deleteMatch | False | None | No notification in this mutation | Not applicable | None | Not applicable | No new event |
| W117 | schedule-editor:deleteMatch | False | None | No notification in this mutation | Not applicable | None | Not applicable | No new event |
| W118 | schedule-editor:deleteMatch | False | None | No notification in this mutation | Not applicable | None | Not applicable | No new event |
| W119 | schedule-editor:resetMatch | False | None | No notification in this mutation | Not applicable | None | Not applicable | No new event |
| W120 | schedule-editor:resetMatch | False | None | No notification in this mutation | Not applicable | None | Not applicable | No new event |
| W121 | schedule-editor:resetMatch | False | None | No notification in this mutation | Not applicable | None | Not applicable | No new event |
| W122 | scheduling:createMatchLinesForGeneratedMatches | False | None | No notification in this mutation | Not applicable | None | Not applicable | No new event |
| W123 | scheduling:createMatchLinesForGeneratedMatches | False | None | No notification in this mutation | Not applicable | None | Not applicable | No new event |
| W124 | scheduling:generateSchedule | False | None | No notification in this mutation | Not applicable | None | Not applicable | No new event |
| W125 | scheduling:generateSchedule | False | None | No notification in this mutation | Not applicable | None | Not applicable | No new event |
| W126 | scheduling:deleteGeneratedSchedule | False | None | No notification in this mutation | Not applicable | None | Not applicable | No new event |
| W127 | scheduling:deleteGeneratedSchedule | False | None | No notification in this mutation | Not applicable | None | Not applicable | No new event |
| W128 | scheduling:deleteGeneratedSchedule | False | None | No notification in this mutation | Not applicable | None | Not applicable | No new event |
| W129 | scheduling:deleteGeneratedSchedule | False | None | No notification in this mutation | Not applicable | None | Not applicable | No new event |
| W130 | score-entry/[id]:queueGameUpdate | False | None | No notification in this mutation | Not applicable | None | Not applicable | No new event |
| W131 | score-entry/[id]:submitScores | True | Opposing team captain/co-captains/direct Club Pro; changed-score event uses both teams; manager fallback follows notificationTeamIdsForCurrentUser | Submitted/changed/verified transition; W131 shares parent submit with W132, not a second event | After current successful parent sequence | Email/SMS by preference via /api/score-notification -> Brevo | Recipient uniqueness only; no durable operation dedup | One committed score-transition event for enclosing operation, not one per W expression |
| W132 | score-entry/[id]:submitScores | True | Opposing team captain/co-captains/direct Club Pro; changed-score event uses both teams; manager fallback follows notificationTeamIdsForCurrentUser | Submitted/changed/verified transition; W131 shares parent submit with W132, not a second event | After current successful parent sequence | Email/SMS by preference via /api/score-notification -> Brevo | Recipient uniqueness only; no durable operation dedup | One committed score-transition event for enclosing operation, not one per W expression |
| W138 | scoring:deleteMatch | False | None | No notification in this mutation | Not applicable | None | Not applicable | No new event |
| W139 | scoring:exportForDupr | False | None | No notification in this mutation | Not applicable | None | Not applicable | No new event |
| W140 | scoring:markSelectedNotExported | False | None | No notification in this mutation | Not applicable | None | Not applicable | No new event |
| W141 | scoring:saveMatch | False | None | No notification in this mutation | Not applicable | None | Not applicable | No new event |
| W142 | scoring:saveMatch | False | None | No notification in this mutation | Not applicable | None | Not applicable | No new event |
| W143 | scoring:generateMatchScheduleRows | False | None | No notification in this mutation | Not applicable | None | Not applicable | No new event |
| W144 | scoring:generateMatchScheduleRows | False | None | No notification in this mutation | Not applicable | None | Not applicable | No new event |
| W145 | public.lms_match_setup_reset | False | None | No notification in this mutation | Not applicable | None | Not applicable | No new event |
| W146 | public.lms_match_setup_reset | False | None | No notification in this mutation | Not applicable | None | Not applicable | No new event |
| W152 | seasons:inactivateSeasonCascade | False | None | No notification in this mutation | Not applicable | None | Not applicable | No new event |
| W153 | teams:saveTeam | False | None | No notification in this mutation | Not applicable | None | Not applicable | No new event |
| W154 | teams:saveTeam | False | None | No notification in this mutation | Not applicable | None | Not applicable | No new event |
| W155 | teams:toggleTeamActive | False | None | No notification in this mutation | Not applicable | None | Not applicable | No new event |
| W157 | teams:copyTeamsForDivision | False | None | No notification in this mutation | Not applicable | None | Not applicable | No new event |
| W158 | teams:copyTeamsForDivision | False | None | No notification in this mutation | Not applicable | None | Not applicable | No new event |
| W159 | teams:copyTeamToDivision | False | None | No notification in this mutation | Not applicable | None | Not applicable | No new event |
| W160 | teams:copyTeamToDivision | False | None | No notification in this mutation | Not applicable | None | Not applicable | No new event |
| W161 | public.lms_roster_add_player | True | info@lwrpickleballclub.com | Successful Add with current missing-ID/rating/raw-NR alert condition; required missing facts now hold instead of adding | After membership insert | Email only; ratingCheckAlert template -> /api/notifications -> Brevo | No durable event key | One committed applicable rating-check event; hold/fail/already-on-roster emits none; do not broaden to all RF-derived NR |
| W162 | public.lms_roster_remove_player | False | None | No notification in this mutation | Not applicable | None | Not applicable | No Remove event. Future lineup dependency blocks removal; separate committed Match Setup correction retains its existing notice. |

