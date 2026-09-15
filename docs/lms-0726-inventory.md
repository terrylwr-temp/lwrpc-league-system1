# LMS-0726 source inventory

Static source census; approximate physical LOC, including blanks. Role guards are observed entry checks, not grants. Empty means no direct literal requireRole found; inspect the route/imported controller before enabling it. Browser-session pages require C/D adaptation. No code removed.

## Existing page routes and loader evidence

| Route | LOC | Literal guard / checks | Browser auth | Tables / RPCs | Inline mutations |
|---|---:|---|---|---|---|
| [/ai-assistant/console](../lwrpc-admin/app/ai-assistant/console/page.js) | 65 | league_manager | True |  |  |
| [/ai-assistant](../lwrpc-admin/app/ai-assistant/page.js) | 313 | league_manager | True |  |  |
| [/ai-assistant/review](../lwrpc-admin/app/ai-assistant/review/page.js) | 105 | league_manager | True |  |  |
| [/ai-insights](../lwrpc-admin/app/ai-insights/page.js) | 546 | league_manager | True |  |  |
| [/approved-answer/[citation]](../lwrpc-admin/app/approved-answer/[citation]/page.js) | 16 |  | True |  |  |
| [/ask-lwr](../lwrpc-admin/app/ask-lwr/page.js) | 16 | player | True |  |  |
| [/captain-dashboard](../lwrpc-admin/app/captain-dashboard/page.js) | 6159 | captain | True | divisions, leagues, locations, match_lineups, matches, member_season_ratings, members, score_sheet_templates, team_byes, team_members, team_standings, teams | remove, update |
| [/design-preview/admin](../lwrpc-admin/app/design-preview/admin/page.js) | 5 |  | False |  |  |
| [/design-preview/captain](../lwrpc-admin/app/design-preview/captain/page.js) | 5 |  | False |  |  |
| [/design-preview](../lwrpc-admin/app/design-preview/page.js) | 5 |  | False |  |  |
| [/divisions/[id]](../lwrpc-admin/app/divisions/[id]/page.js) | 1134 |  | True | division_lines, divisions, match_lines | delete, insert, update |
| [/divisions](../lwrpc-admin/app/divisions/page.js) | 1624 | league_manager | True | division_lines, divisions, leagues, score_sheet_templates, team_byes | delete, insert, update |
| [/email-options](../lwrpc-admin/app/email-options/page.js) | 788 | commissioner | True |  |  |
| [/help/[role]](../lwrpc-admin/app/help/[role]/page.js) | 22 |  | False |  |  |
| [/league-communications](../lwrpc-admin/app/league-communications/page.js) | 109 | league_manager | True |  |  |
| [/leagues](../lwrpc-admin/app/leagues/page.js) | 722 | league_manager | True | leagues, seasons | delete, insert, update |
| [/live-match/[id]](../lwrpc-admin/app/live-match/[id]/page.js) | 490 |  | True | line_games, match_lines, matches |  |
| [/locations](../lwrpc-admin/app/locations/page.js) | 756 | commissioner | True | location_court_availability, locations, matches, members, teams | delete, insert, update |
| [/login](../lwrpc-admin/app/login/page.js) | 492 |  | True |  |  |
| [/matches/[id]](../lwrpc-admin/app/matches/[id]/page.js) | 2870 | captain, league_manager | True | division_lines, line_games, match_lines, match_lineups, matches, member_season_ratings, members, team_members, teams | delete, insert, update |
| [/matches](../lwrpc-admin/app/matches/page.js) | 5 |  | False |  |  |
| [/member-import](../lwrpc-admin/app/member-import/page.js) | 1126 | league_manager | True | locations, member_import_batches, member_import_rows, members | insert, update |
| [/members/[id]](../lwrpc-admin/app/members/[id]/page.js) | 1361 | league_manager, league_manager | True | locations, match_lines, member_season_ratings, members, team_members, user_roles | insert, update |
| [/members](../lwrpc-admin/app/members/page.js) | 2255 | league_manager | True | locations, match_lines, member_season_ratings, members, seasons, team_members, teams, user_roles | insert, remove, update |
| [/official-document/[citation]](../lwrpc-admin/app/official-document/[citation]/page.js) | 9 |  | False |  |  |
| [/](../lwrpc-admin/app/page.js) | 5 |  | False |  |  |
| [/player-dashboard](../lwrpc-admin/app/player-dashboard/page.js) | 4164 | player | True | divisions, leagues, match_lines, match_lineups, matches, member_season_ratings, members, team_byes, team_members, team_standings, teams |  |
| [/print](../lwrpc-admin/app/print/page.js) | 115 |  | False |  |  |
| [/ratings](../lwrpc-admin/app/ratings/page.js) | 2611 | league_manager | True | member_season_ratings, members, seasons, team_members | delete, insert, update, upsert |
| [/reset-password](../lwrpc-admin/app/reset-password/page.js) | 231 |  | True |  |  |
| [/round-robin/[id]/admin](../lwrpc-admin/app/round-robin/[id]/admin/page.js) | 6678 |  | True |  | delete |
| [/round-robin/[id]](../lwrpc-admin/app/round-robin/[id]/page.js) | 235 |  | False |  |  |
| [/round-robin/[id]/player](../lwrpc-admin/app/round-robin/[id]/player/page.js) | 2859 |  | False |  |  |
| [/round-robin](../lwrpc-admin/app/round-robin/page.js) | 88 |  | False |  |  |
| [/schedule-editor](../lwrpc-admin/app/schedule-editor/page.js) | 1862 | league_manager | True | divisions, league_blackout_dates, league_schedule_settings, leagues, line_games, location_court_availability, locations, match_lines, matches, members, teams | delete, update |
| [/scheduling](../lwrpc-admin/app/scheduling/page.js) | 1683 | league_manager | True | division_lines, divisions, league_blackout_dates, league_schedule_settings, leagues, line_games, location_court_availability, locations, match_lines, matches, team_byes, teams | delete, insert, update |
| [/score-entry/[id]](../lwrpc-admin/app/score-entry/[id]/page.js) | 803 | captain | True | line_games, match_lines, matches, member_season_ratings, members, teams | delete, update |
| [/score-sheets](../lwrpc-admin/app/score-sheets/page.js) | 689 | commissioner | True | score_sheet_templates | delete, insert, update |
| [/scoring](../lwrpc-admin/app/scoring/page.js) | 1577 | league_manager | True | division_lines, divisions, leagues, line_games, locations, match_lines, match_lineups, matches, members, teams | delete, insert, remove, update |
| [/seasons](../lwrpc-admin/app/seasons/page.js) | 582 | league_manager | True | divisions, leagues, seasons, teams | delete, insert, update |
| [/standings](../lwrpc-admin/app/standings/page.js) | 883 | player | True | divisions, leagues, matches, member_season_ratings, team_byes, team_standings, teams |  |
| [/system-setup](../lwrpc-admin/app/system-setup/page.js) | 212 | commissioner | True |  |  |
| [/teams/[id]](../lwrpc-admin/app/teams/[id]/page.js) | 1814 | captain, captain, league_manager | True | locations, match_lines, member_season_ratings, members, team_members, teams | delete, insert |
| [/teams](../lwrpc-admin/app/teams/page.js) | 1936 | captain, league_manager | True | divisions, leagues, locations, matches, member_season_ratings, members, team_byes, team_members, team_standings, teams | insert, update |
| [/tournaments/[id]/admin](../lwrpc-admin/app/tournaments/[id]/admin/page.js) | 4336 |  | False |  | remove |
| [/tournaments/[id]/display](../lwrpc-admin/app/tournaments/[id]/display/page.js) | 977 |  | False |  |  |
| [/tournaments/[id]](../lwrpc-admin/app/tournaments/[id]/page.js) | 120 |  | False |  |  |
| [/tournaments/[id]/player](../lwrpc-admin/app/tournaments/[id]/player/page.js) | 322 |  | False |  |  |
| [/tournaments/[id]/standings](../lwrpc-admin/app/tournaments/[id]/standings/page.js) | 278 |  | False |  |  |
| [/tournaments](../lwrpc-admin/app/tournaments/page.js) | 70 |  | False |  |  |
| [/view-as](../lwrpc-admin/app/view-as/page.js) | 69 |  | False |  |  |

## View-As additions and shared references

KEEP files can contain small presentation-only assertions to replace; do not delete whole security suites. The mixed page is split, not discarded wholesale.

| File | LOC | Classification | Treatment |
|---|---:|---|---|
| [lwrpc-admin/app/api/account-identity/route.js](../lwrpc-admin/app/api/account-identity/route.js) | 14 | ADAPT | Shared consumer or transport/boundary integration; retain unrelated behavior. |
| [lwrpc-admin/app/api/admin/delete-member/route.js](../lwrpc-admin/app/api/admin/delete-member/route.js) | 152 | ADAPT | Shared consumer or transport/boundary integration; retain unrelated behavior. |
| [lwrpc-admin/app/api/admin/member-directory/route.js](../lwrpc-admin/app/api/admin/member-directory/route.js) | 185 | ADAPT | Shared consumer or transport/boundary integration; retain unrelated behavior. |
| [lwrpc-admin/app/api/admin/member-last-login/route.js](../lwrpc-admin/app/api/admin/member-last-login/route.js) | 88 | ADAPT | Shared consumer or transport/boundary integration; retain unrelated behavior. |
| [lwrpc-admin/app/api/ai-assistant/answer/route.js](../lwrpc-admin/app/api/ai-assistant/answer/route.js) | 108 | ADAPT | Shared consumer or transport/boundary integration; retain unrelated behavior. |
| [lwrpc-admin/app/api/ai-assistant/approved-answers/route.js](../lwrpc-admin/app/api/ai-assistant/approved-answers/route.js) | 31 | ADAPT | Shared consumer or transport/boundary integration; retain unrelated behavior. |
| [lwrpc-admin/app/api/ai-assistant/capture-health/route.js](../lwrpc-admin/app/api/ai-assistant/capture-health/route.js) | 19 | ADAPT | Shared consumer or transport/boundary integration; retain unrelated behavior. |
| [lwrpc-admin/app/api/ai-assistant/documents/route.js](../lwrpc-admin/app/api/ai-assistant/documents/route.js) | 269 | ADAPT | Shared consumer or transport/boundary integration; retain unrelated behavior. |
| [lwrpc-admin/app/api/ai-assistant/live-review/route.js](../lwrpc-admin/app/api/ai-assistant/live-review/route.js) | 17 | ADAPT | Shared consumer or transport/boundary integration; retain unrelated behavior. |
| [lwrpc-admin/app/api/ai-assistant/retrieval/route.js](../lwrpc-admin/app/api/ai-assistant/retrieval/route.js) | 33 | ADAPT | Shared consumer or transport/boundary integration; retain unrelated behavior. |
| [lwrpc-admin/app/api/ai-assistant/review/route.js](../lwrpc-admin/app/api/ai-assistant/review/route.js) | 7 | ADAPT | Shared consumer or transport/boundary integration; retain unrelated behavior. |
| [lwrpc-admin/app/api/ai-insights/route.js](../lwrpc-admin/app/api/ai-insights/route.js) | 594 | ADAPT | Shared consumer or transport/boundary integration; retain unrelated behavior. |
| [lwrpc-admin/app/api/app-notifications/public-key/route.js](../lwrpc-admin/app/api/app-notifications/public-key/route.js) | 14 | ADAPT | Shared consumer or transport/boundary integration; retain unrelated behavior. |
| [lwrpc-admin/app/api/app-notifications/subscribe/route.js](../lwrpc-admin/app/api/app-notifications/subscribe/route.js) | 113 | ADAPT | Shared consumer or transport/boundary integration; retain unrelated behavior. |
| [lwrpc-admin/app/api/approved-answer-viewer/route.js](../lwrpc-admin/app/api/approved-answer-viewer/route.js) | 18 | ADAPT | Shared consumer or transport/boundary integration; retain unrelated behavior. |
| [lwrpc-admin/app/api/ask-lwr/feedback/route.js](../lwrpc-admin/app/api/ask-lwr/feedback/route.js) | 55 | ADAPT | Shared consumer or transport/boundary integration; retain unrelated behavior. |
| [lwrpc-admin/app/api/ask-lwr/route.js](../lwrpc-admin/app/api/ask-lwr/route.js) | 50 | ADAPT | Shared consumer or transport/boundary integration; retain unrelated behavior. |
| [lwrpc-admin/app/api/brevo-diagnostics/route.js](../lwrpc-admin/app/api/brevo-diagnostics/route.js) | 126 | ADAPT | Shared consumer or transport/boundary integration; retain unrelated behavior. |
| [lwrpc-admin/app/api/league-communications/route.js](../lwrpc-admin/app/api/league-communications/route.js) | 19 | ADAPT | Shared consumer or transport/boundary integration; retain unrelated behavior. |
| [lwrpc-admin/app/api/master-reset/route.js](../lwrpc-admin/app/api/master-reset/route.js) | 45 | ADAPT | Shared consumer or transport/boundary integration; retain unrelated behavior. |
| [lwrpc-admin/app/api/match-lineups/route.js](../lwrpc-admin/app/api/match-lineups/route.js) | 387 | ADAPT | Shared consumer or transport/boundary integration; retain unrelated behavior. |
| [lwrpc-admin/app/api/match-setup-reminders/route.js](../lwrpc-admin/app/api/match-setup-reminders/route.js) | 110 | ADAPT | Shared consumer or transport/boundary integration; retain unrelated behavior. |
| [lwrpc-admin/app/api/member-password-reset-check/route.js](../lwrpc-admin/app/api/member-password-reset-check/route.js) | 347 | ADAPT | Shared consumer or transport/boundary integration; retain unrelated behavior. |
| [lwrpc-admin/app/api/notification-template-history/route.js](../lwrpc-admin/app/api/notification-template-history/route.js) | 164 | ADAPT | Shared consumer or transport/boundary integration; retain unrelated behavior. |
| [lwrpc-admin/app/api/notification-templates/route.js](../lwrpc-admin/app/api/notification-templates/route.js) | 223 | ADAPT | Shared consumer or transport/boundary integration; retain unrelated behavior. |
| [lwrpc-admin/app/api/notifications/route.js](../lwrpc-admin/app/api/notifications/route.js) | 131 | ADAPT | Shared consumer or transport/boundary integration; retain unrelated behavior. |
| [lwrpc-admin/app/api/official-document-viewer/pdf/route.js](../lwrpc-admin/app/api/official-document-viewer/pdf/route.js) | 28 | ADAPT | Shared consumer or transport/boundary integration; retain unrelated behavior. |
| [lwrpc-admin/app/api/official-document-viewer/route.js](../lwrpc-admin/app/api/official-document-viewer/route.js) | 29 | ADAPT | Shared consumer or transport/boundary integration; retain unrelated behavior. |
| [lwrpc-admin/app/api/pbcc/reminders/route.js](../lwrpc-admin/app/api/pbcc/reminders/route.js) | 60 | ADAPT | Shared consumer or transport/boundary integration; retain unrelated behavior. |
| [lwrpc-admin/app/api/round-robin/action/route.js](../lwrpc-admin/app/api/round-robin/action/route.js) | 3563 | ADAPT | Shared consumer or transport/boundary integration; retain unrelated behavior. |
| [lwrpc-admin/app/api/round-robin/admin/route.js](../lwrpc-admin/app/api/round-robin/admin/route.js) | 433 | ADAPT | Shared consumer or transport/boundary integration; retain unrelated behavior. |
| [lwrpc-admin/app/api/round-robin/player/route.js](../lwrpc-admin/app/api/round-robin/player/route.js) | 1194 | ADAPT | Shared consumer or transport/boundary integration; retain unrelated behavior. |
| [lwrpc-admin/app/api/score-notification/route.js](../lwrpc-admin/app/api/score-notification/route.js) | 167 | ADAPT | Shared consumer or transport/boundary integration; retain unrelated behavior. |
| [lwrpc-admin/app/api/season-reset/route.js](../lwrpc-admin/app/api/season-reset/route.js) | 54 | ADAPT | Shared consumer or transport/boundary integration; retain unrelated behavior. |
| [lwrpc-admin/app/api/season-rollover/route.js](../lwrpc-admin/app/api/season-rollover/route.js) | 133 | ADAPT | Shared consumer or transport/boundary integration; retain unrelated behavior. |
| [lwrpc-admin/app/api/system-settings/route.js](../lwrpc-admin/app/api/system-settings/route.js) | 156 | ADAPT | Shared consumer or transport/boundary integration; retain unrelated behavior. |
| [lwrpc-admin/app/api/teams/delete/route.js](../lwrpc-admin/app/api/teams/delete/route.js) | 58 | ADAPT | Shared consumer or transport/boundary integration; retain unrelated behavior. |
| [lwrpc-admin/app/api/tournaments/action/route.js](../lwrpc-admin/app/api/tournaments/action/route.js) | 3113 | ADAPT | Shared consumer or transport/boundary integration; retain unrelated behavior. |
| [lwrpc-admin/app/api/tournaments/admin/route.js](../lwrpc-admin/app/api/tournaments/admin/route.js) | 231 | ADAPT | Shared consumer or transport/boundary integration; retain unrelated behavior. |
| [lwrpc-admin/app/api/tournaments/sms/route.js](../lwrpc-admin/app/api/tournaments/sms/route.js) | 108 | ADAPT | Shared consumer or transport/boundary integration; retain unrelated behavior. |
| [lwrpc-admin/app/api/user-last-logins/route.js](../lwrpc-admin/app/api/user-last-logins/route.js) | 123 | ADAPT | Shared consumer or transport/boundary integration; retain unrelated behavior. |
| [lwrpc-admin/app/api/view-as/bootstrap/route.js](../lwrpc-admin/app/api/view-as/bootstrap/route.js) | 4 | ADAPT | Shared consumer or transport/boundary integration; retain unrelated behavior. |
| [lwrpc-admin/app/api/view-as/exchange/route.js](../lwrpc-admin/app/api/view-as/exchange/route.js) | 2 | ADAPT | Shared consumer or transport/boundary integration; retain unrelated behavior. |
| [lwrpc-admin/app/api/view-as/read/route.js](../lwrpc-admin/app/api/view-as/read/route.js) | 65 | ADAPT | Shared consumer or transport/boundary integration; retain unrelated behavior. |
| [lwrpc-admin/app/api/view-as/start/route.js](../lwrpc-admin/app/api/view-as/start/route.js) | 13 | ADAPT | Shared consumer or transport/boundary integration; retain unrelated behavior. |
| [lwrpc-admin/app/components/ViewAsStartButton.js](../lwrpc-admin/app/components/ViewAsStartButton.js) | 34 | ADAPT | Shared consumer or transport/boundary integration; retain unrelated behavior. |
| [lwrpc-admin/app/layout.tsx](../lwrpc-admin/app/layout.tsx) | 39 | ADAPT | Shared consumer or transport/boundary integration; retain unrelated behavior. |
| [lwrpc-admin/app/lib/aiResultSource.js](../lwrpc-admin/app/lib/aiResultSource.js) | 33 | ADAPT | Shared consumer or transport/boundary integration; retain unrelated behavior. |
| [lwrpc-admin/app/lib/viewAsBoundary.js](../lwrpc-admin/app/lib/viewAsBoundary.js) | 36 | KEEP | Accepted origin/auth/context/crypto/mutation security; only bounded integration after review. |
| [lwrpc-admin/app/lib/viewAsCrypto.js](../lwrpc-admin/app/lib/viewAsCrypto.js) | 21 | KEEP | Accepted origin/auth/context/crypto/mutation security; only bounded integration after review. |
| [lwrpc-admin/app/lib/viewAsServer.js](../lwrpc-admin/app/lib/viewAsServer.js) | 47 | KEEP | Accepted origin/auth/context/crypto/mutation security; only bounded integration after review. |
| [lwrpc-admin/app/members/[id]/page.js](../lwrpc-admin/app/members/[id]/page.js) | 1361 | ADAPT | Shared consumer or transport/boundary integration; retain unrelated behavior. |
| [lwrpc-admin/app/view-as/page.js](../lwrpc-admin/app/view-as/page.js) | 69 | ADAPT | Mixed: extract KEEP lifecycle/banner/credential purge; REMOVE mini navigation, cards, Ask wrapper and snapshot rendering after parity. |
| [lwrpc-admin/test/helpers/eligibilityDatabase.mjs](../lwrpc-admin/test/helpers/eligibilityDatabase.mjs) | 50 | KEEP | Security/regression/history; split any presentation-only assertion after replacement coverage. |
| [lwrpc-admin/test/lms0725Database.test.mjs](../lwrpc-admin/test/lms0725Database.test.mjs) | 36 | KEEP | Security/regression/history; split any presentation-only assertion after replacement coverage. |
| [lwrpc-admin/test/lms0725Eligibility.test.mjs](../lwrpc-admin/test/lms0725Eligibility.test.mjs) | 35 | KEEP | Security/regression/history; split any presentation-only assertion after replacement coverage. |
| [lwrpc-admin/test/lms0725SourceClassification.test.mjs](../lwrpc-admin/test/lms0725SourceClassification.test.mjs) | 70 | KEEP | Security/regression/history; split any presentation-only assertion after replacement coverage. |
| [lwrpc-admin/test/lms0725TelemetryRecovery.test.mjs](../lwrpc-admin/test/lms0725TelemetryRecovery.test.mjs) | 81 | KEEP | Security/regression/history; split any presentation-only assertion after replacement coverage. |
| [lwrpc-admin/test/viewAsBoundary.test.mjs](../lwrpc-admin/test/viewAsBoundary.test.mjs) | 51 | KEEP | Security/regression/history; split any presentation-only assertion after replacement coverage. |
| [lwrpc-admin/test/viewAsDatabase.test.mjs](../lwrpc-admin/test/viewAsDatabase.test.mjs) | 95 | KEEP | Security/regression/history; split any presentation-only assertion after replacement coverage. |
| [lwrpc-admin/test/viewAsLockCorrection.test.mjs](../lwrpc-admin/test/viewAsLockCorrection.test.mjs) | 72 | KEEP | Security/regression/history; split any presentation-only assertion after replacement coverage. |
| [lwrpc-admin/test/viewAsMaintenance.test.mjs](../lwrpc-admin/test/viewAsMaintenance.test.mjs) | 41 | KEEP | Security/regression/history; split any presentation-only assertion after replacement coverage. |
| [lwrpc-admin/test/viewAsSchemaContract.test.mjs](../lwrpc-admin/test/viewAsSchemaContract.test.mjs) | 20 | KEEP | Security/regression/history; split any presentation-only assertion after replacement coverage. |
| [lwrpc-admin/scripts/lms0724-build-lock-migration.mjs](../lwrpc-admin/scripts/lms0724-build-lock-migration.mjs) | 88 | KEEP | Security/regression/history; split any presentation-only assertion after replacement coverage. |
| [lwrpc-admin/scripts/lms0724-concurrency-tests.mjs](../lwrpc-admin/scripts/lms0724-concurrency-tests.mjs) | 93 | KEEP | Security/regression/history; split any presentation-only assertion after replacement coverage. |
| [lwrpc-admin/scripts/lms0724-local-verification.mjs](../lwrpc-admin/scripts/lms0724-local-verification.mjs) | 32 | KEEP | Security/regression/history; split any presentation-only assertion after replacement coverage. |
| [lwrpc-admin/scripts/lms0724-lock-correction-source.sql](../lwrpc-admin/scripts/lms0724-lock-correction-source.sql) | 88 | KEEP | Security/regression/history; split any presentation-only assertion after replacement coverage. |
| [lwrpc-admin/scripts/lms0724-lock-postgres-tests.mjs](../lwrpc-admin/scripts/lms0724-lock-postgres-tests.mjs) | 91 | KEEP | Security/regression/history; split any presentation-only assertion after replacement coverage. |
| [lwrpc-admin/scripts/lms0725-build-eligibility-migration.mjs](../lwrpc-admin/scripts/lms0725-build-eligibility-migration.mjs) | 50 | KEEP | Security/regression/history; split any presentation-only assertion after replacement coverage. |
| [lwrpc-admin/scripts/lms0725-build-migration.mjs](../lwrpc-admin/scripts/lms0725-build-migration.mjs) | 40 | KEEP | Security/regression/history; split any presentation-only assertion after replacement coverage. |
| [lwrpc-admin/scripts/lms0725-postgres-replay.mjs](../lwrpc-admin/scripts/lms0725-postgres-replay.mjs) | 58 | KEEP | Security/regression/history; split any presentation-only assertion after replacement coverage. |
| [lwrpc-admin/scripts/lms0725-q78-postgres.mjs](../lwrpc-admin/scripts/lms0725-q78-postgres.mjs) | 91 | KEEP | Security/regression/history; split any presentation-only assertion after replacement coverage. |
| [lwrpc-admin/supabase/migrations/20260907201448_lms0724_view_as.sql](../lwrpc-admin/supabase/migrations/20260907201448_lms0724_view_as.sql) | 417 | KEEP | Security/regression/history; split any presentation-only assertion after replacement coverage. |
| [lwrpc-admin/supabase/migrations/20260908011413_lms0724_view_as_authorization_locks.sql](../lwrpc-admin/supabase/migrations/20260908011413_lms0724_view_as_authorization_locks.sql) | 340 | KEEP | Security/regression/history; split any presentation-only assertion after replacement coverage. |
| [lwrpc-admin/supabase/migrations/20260908114532_lms0725_clarification_choices.sql](../lwrpc-admin/supabase/migrations/20260908114532_lms0725_clarification_choices.sql) | 328 | KEEP | Security/regression/history; split any presentation-only assertion after replacement coverage. |
| [lwrpc-admin/supabase/migrations/20260908203904_lms0725_eligibility_self.sql](../lwrpc-admin/supabase/migrations/20260908203904_lms0725_eligibility_self.sql) | 378 | KEEP | Security/regression/history; split any presentation-only assertion after replacement coverage. |
| [lwrpc-admin/proxy.js](../lwrpc-admin/proxy.js) | 38 | ADAPT | Preserve all security headers/guards; replace catch-all mini page rewrite with explicit shared route dispatch. |

## API mutation surface

The dedicated origin currently denies every ordinary API path at proxy, regardless of these local markers. Method list is a static census; preserve denial for unknown routes and Server Actions as well. GET is not assumed side-effect free.

| Route | Methods | Direct boundary marker |
|---|---|---|
| [/api/account-identity](../lwrpc-admin/app/api/account-identity/route.js) | POST | True |
| [/api/admin/delete-member](../lwrpc-admin/app/api/admin/delete-member/route.js) | POST | True |
| [/api/admin/member-directory](../lwrpc-admin/app/api/admin/member-directory/route.js) | GET | True |
| [/api/admin/member-last-login](../lwrpc-admin/app/api/admin/member-last-login/route.js) | GET | True |
| [/api/ai-assistant/answer](../lwrpc-admin/app/api/ai-assistant/answer/route.js) | POST | True |
| [/api/ai-assistant/approved-answers](../lwrpc-admin/app/api/ai-assistant/approved-answers/route.js) |  | True |
| [/api/ai-assistant/capture-health](../lwrpc-admin/app/api/ai-assistant/capture-health/route.js) | GET | True |
| [/api/ai-assistant/documents](../lwrpc-admin/app/api/ai-assistant/documents/route.js) | GET, PATCH, POST | True |
| [/api/ai-assistant/live-review](../lwrpc-admin/app/api/ai-assistant/live-review/route.js) | GET | True |
| [/api/ai-assistant/retrieval](../lwrpc-admin/app/api/ai-assistant/retrieval/route.js) | POST | True |
| [/api/ai-assistant/review](../lwrpc-admin/app/api/ai-assistant/review/route.js) | GET, POST | True |
| [/api/ai-insights](../lwrpc-admin/app/api/ai-insights/route.js) | GET, POST | True |
| [/api/app-notifications/public-key](../lwrpc-admin/app/api/app-notifications/public-key/route.js) | GET | True |
| [/api/app-notifications/subscribe](../lwrpc-admin/app/api/app-notifications/subscribe/route.js) | POST | True |
| [/api/approved-answer-viewer](../lwrpc-admin/app/api/approved-answer-viewer/route.js) | GET | True |
| [/api/ask-lwr/feedback](../lwrpc-admin/app/api/ask-lwr/feedback/route.js) | POST | True |
| [/api/ask-lwr](../lwrpc-admin/app/api/ask-lwr/route.js) | POST | True |
| [/api/brevo-diagnostics](../lwrpc-admin/app/api/brevo-diagnostics/route.js) | GET | True |
| [/api/league-communications](../lwrpc-admin/app/api/league-communications/route.js) | GET, POST | True |
| [/api/master-reset](../lwrpc-admin/app/api/master-reset/route.js) | POST | True |
| [/api/match-lineups](../lwrpc-admin/app/api/match-lineups/route.js) | POST | True |
| [/api/match-setup-reminders](../lwrpc-admin/app/api/match-setup-reminders/route.js) | GET, POST | True |
| [/api/member-password-reset-check](../lwrpc-admin/app/api/member-password-reset-check/route.js) | POST | True |
| [/api/notification-template-history](../lwrpc-admin/app/api/notification-template-history/route.js) | DELETE, GET | True |
| [/api/notification-templates](../lwrpc-admin/app/api/notification-templates/route.js) | GET, POST | True |
| [/api/notifications](../lwrpc-admin/app/api/notifications/route.js) | POST | True |
| [/api/official-document-viewer/pdf](../lwrpc-admin/app/api/official-document-viewer/pdf/route.js) | GET | True |
| [/api/official-document-viewer](../lwrpc-admin/app/api/official-document-viewer/route.js) | POST | True |
| [/api/pbcc/reminders](../lwrpc-admin/app/api/pbcc/reminders/route.js) | GET, POST | True |
| [/api/round-robin/action](../lwrpc-admin/app/api/round-robin/action/route.js) | POST | True |
| [/api/round-robin/admin](../lwrpc-admin/app/api/round-robin/admin/route.js) | POST | True |
| [/api/round-robin/player](../lwrpc-admin/app/api/round-robin/player/route.js) | POST | True |
| [/api/score-notification](../lwrpc-admin/app/api/score-notification/route.js) | POST | True |
| [/api/season-reset](../lwrpc-admin/app/api/season-reset/route.js) | POST | True |
| [/api/season-rollover](../lwrpc-admin/app/api/season-rollover/route.js) | POST | True |
| [/api/system-settings](../lwrpc-admin/app/api/system-settings/route.js) | GET, POST | True |
| [/api/teams/delete](../lwrpc-admin/app/api/teams/delete/route.js) | POST | True |
| [/api/tournaments/action](../lwrpc-admin/app/api/tournaments/action/route.js) | POST | True |
| [/api/tournaments/admin](../lwrpc-admin/app/api/tournaments/admin/route.js) | POST | True |
| [/api/tournaments/sms](../lwrpc-admin/app/api/tournaments/sms/route.js) | POST | True |
| [/api/user-last-logins](../lwrpc-admin/app/api/user-last-logins/route.js) | GET | True |
| [/api/view-as/bootstrap](../lwrpc-admin/app/api/view-as/bootstrap/route.js) | POST | False |
| [/api/view-as/exchange](../lwrpc-admin/app/api/view-as/exchange/route.js) | POST | False |
| [/api/view-as/read](../lwrpc-admin/app/api/view-as/read/route.js) | POST | True |
| [/api/view-as/start](../lwrpc-admin/app/api/view-as/start/route.js) | GET, POST | True |
