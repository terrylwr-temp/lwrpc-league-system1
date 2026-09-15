# LMS-0726 direct Data API privilege and dependency inventory

Read-only production metadata; no production member records. [Exact catalog](lms-0726-data-api-catalog.json), [write triggers/constraints](lms-0726-write-boundary-metadata.json), [isolated read proof](lms-0726-direct-read-proof.json). Effective SELECT reproduced in PostgreSQL 17.11; writes below are policy analysis, not mutation-test passes.

For all 17 tables: owner postgres; RLS enabled, FORCE RLS false. Browser roles are not owner/superuser/BYPASSRLS. Anon/authenticated both have table SELECT/INSERT/UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER (raw ACL also contains MAINTAIN). There are no explicit browser column ACL restrictions: table grants cover every listed column. TRUNCATE is not a standard PostgREST table CRUD verb; do not describe that grant as an HTTP truncate exploit. Every authenticated SELECT policy here is USING(true); anon has no applicable SELECT policy.

## public.division_lines

Columns covered by browser table privileges (25): `id, division_id, line_number, line_name, posted_to_dupr, game_format, games_per_line, points_to_win, win_by, picklebreaker_enabled, picklebreaker_points, line_type, sort_order, created_at, updated_at, picklebreaker_win_points, picklebreaker_loss_points, team_win_points, uses_saved_match_lineups, standings_points_mode, score_type, score_required, picklebreaker_not_played_points, picklebreaker_not_played_award_rule, picklebreaker_play_rule`.

| Role | SELECT | INSERT | UPDATE | DELETE | TRUNCATE | REFERENCES | TRIGGER |
|---|---|---|---|---|---|---|---|
| anon | Granted | Granted | Granted | Granted | Granted | Granted | Granted |
| authenticated | Granted | Granted | Granted | Granted | Granted | Granted | Granted |

Effective direct SELECT: anon zero rows; authenticated Player/Captain/Club Pro all fixture rows/all granted columns, including unrelated rows. These policies do not use application role for SELECT.

- **Authenticated users can read division lines** — PERMISSIVE SELECT TO authenticated. USING `true`; WITH CHECK `—`.
- **League managers can delete division lines** — PERMISSIVE DELETE TO authenticated. USING `( SELECT private.current_user_is_lwrpc_admin() AS current_user_is_lwrpc_admin)`; WITH CHECK `—`.
- **League managers can insert division lines** — PERMISSIVE INSERT TO authenticated. USING `—`; WITH CHECK `( SELECT private.current_user_is_lwrpc_admin() AS current_user_is_lwrpc_admin)`.
- **League managers can update division lines** — PERMISSIVE UPDATE TO authenticated. USING `( SELECT private.current_user_is_lwrpc_admin() AS current_user_is_lwrpc_admin)`; WITH CHECK `( SELECT private.current_user_is_lwrpc_admin() AS current_user_is_lwrpc_admin)`.

Direct expression dependencies (including optional/helper/mutation-return queries; API entries are server dependencies, not browser):

- `lwrpc-admin/app/divisions/page.js`: lines 169, 413, 484.
- `lwrpc-admin/app/divisions/[id]/page.js`: lines 375, 439, 453, 645.
- `lwrpc-admin/app/matches/[id]/page.js`: lines 182.
- `lwrpc-admin/app/scheduling/page.js`: lines 661.
- `lwrpc-admin/app/scoring/page.js`: lines 1123.
## public.divisions

Columns covered by browser table privileges (36): `id, league_id, name, skill_level, sort_order, is_active, created_at, updated_at, min_dupr, max_dupr, number_of_lines, default_game_format, games_per_line, points_to_win, win_by, third_game_format, picklebreaker_enabled, picklebreaker_points, line_notes, rating_type, standings_win_points, standings_tie_points, standings_loss_points, standings_tiebreak_1, standings_tiebreak_2, standings_tiebreak_3, picklebreaker_win_points, picklebreaker_loss_points, default_lines_config, team_dupr_max, playoff_team_count, score_sheet_template_id, primary_team_type, secondary_number_of_lines, secondary_team_type, flex_league`.

| Role | SELECT | INSERT | UPDATE | DELETE | TRUNCATE | REFERENCES | TRIGGER |
|---|---|---|---|---|---|---|---|
| anon | Granted | Granted | Granted | Granted | Granted | Granted | Granted |
| authenticated | Granted | Granted | Granted | Granted | Granted | Granted | Granted |

Effective direct SELECT: anon zero rows; authenticated Player/Captain/Club Pro all fixture rows/all granted columns, including unrelated rows. These policies do not use application role for SELECT.

- **Authenticated users can delete divisions** — PERMISSIVE DELETE TO authenticated. USING `( SELECT private.current_user_is_lwrpc_admin() AS current_user_is_lwrpc_admin)`; WITH CHECK `—`.
- **Authenticated users can insert divisions** — PERMISSIVE INSERT TO authenticated. USING `—`; WITH CHECK `( SELECT private.current_user_is_lwrpc_admin() AS current_user_is_lwrpc_admin)`.
- **Authenticated users can read divisions** — PERMISSIVE SELECT TO authenticated. USING `true`; WITH CHECK `—`.
- **Authenticated users can update divisions** — PERMISSIVE UPDATE TO authenticated. USING `( SELECT private.current_user_is_lwrpc_admin() AS current_user_is_lwrpc_admin)`; WITH CHECK `( SELECT private.current_user_is_lwrpc_admin() AS current_user_is_lwrpc_admin)`.
- **view_as_executor_read** — PERMISSIVE SELECT TO lms_view_as_executor. USING `true`; WITH CHECK `—`.

Direct expression dependencies (including optional/helper/mutation-return queries; API entries are server dependencies, not browser):

- `lwrpc-admin/app/AdminDashboardClient.js`: lines 242, 2239.
- `lwrpc-admin/app/api/ai-assistant/documents/route.js`: lines 118, 163.
- `lwrpc-admin/app/api/ai-insights/route.js`: lines 159.
- `lwrpc-admin/app/api/league-communications/route.js`: lines 10.
- `lwrpc-admin/app/api/tournaments/action/route.js`: lines 702, 1203.
- `lwrpc-admin/app/api/tournaments/admin/route.js`: lines 76.
- `lwrpc-admin/app/captain-dashboard/page.js`: lines 240.
- `lwrpc-admin/app/divisions/page.js`: lines 137, 390, 472.
- `lwrpc-admin/app/divisions/[id]/page.js`: lines 120, 297, 323, 356.
- `lwrpc-admin/app/lib/aiEligibilityService.js`: lines 18.
- `lwrpc-admin/app/lib/standingsRebuild.js`: lines 194.
- `lwrpc-admin/app/player-dashboard/page.js`: lines 201.
- `lwrpc-admin/app/schedule-editor/page.js`: lines 93.
- `lwrpc-admin/app/scheduling/page.js`: lines 114.
- `lwrpc-admin/app/scoring/page.js`: lines 125.
- `lwrpc-admin/app/seasons/page.js`: lines 169.
- `lwrpc-admin/app/standings/page.js`: lines 46.
- `lwrpc-admin/app/teams/page.js`: lines 230.
## public.leagues

Columns covered by browser table privileges (18): `id, season_id, name, description, is_active, created_at, updated_at, rosters_locked, league_document_bucket, code_of_conduct_pdf_path, captains_guide_pdf_path, league_rules_pdf_path, score_sheet_pdf_path, league_waiver_pdf_path, match_setup_reminder_days_before, abbreviation, flex_league, only_home_community_players`.

| Role | SELECT | INSERT | UPDATE | DELETE | TRUNCATE | REFERENCES | TRIGGER |
|---|---|---|---|---|---|---|---|
| anon | Granted | Granted | Granted | Granted | Granted | Granted | Granted |
| authenticated | Granted | Granted | Granted | Granted | Granted | Granted | Granted |

Effective direct SELECT: anon zero rows; authenticated Player/Captain/Club Pro all fixture rows/all granted columns, including unrelated rows. These policies do not use application role for SELECT.

- **Authenticated users can delete leagues** — PERMISSIVE DELETE TO authenticated. USING `( SELECT private.current_user_is_lwrpc_admin() AS current_user_is_lwrpc_admin)`; WITH CHECK `—`.
- **Authenticated users can insert leagues** — PERMISSIVE INSERT TO authenticated. USING `—`; WITH CHECK `( SELECT private.current_user_is_lwrpc_admin() AS current_user_is_lwrpc_admin)`.
- **Authenticated users can read leagues** — PERMISSIVE SELECT TO authenticated. USING `true`; WITH CHECK `—`.
- **Authenticated users can update leagues** — PERMISSIVE UPDATE TO authenticated. USING `( SELECT private.current_user_is_lwrpc_admin() AS current_user_is_lwrpc_admin)`; WITH CHECK `( SELECT private.current_user_is_lwrpc_admin() AS current_user_is_lwrpc_admin)`.
- **view_as_executor_read** — PERMISSIVE SELECT TO lms_view_as_executor. USING `true`; WITH CHECK `—`.

Direct expression dependencies (including optional/helper/mutation-return queries; API entries are server dependencies, not browser):

- `lwrpc-admin/app/AdminDashboardClient.js`: lines 241, 253, 2228.
- `lwrpc-admin/app/api/ai-assistant/documents/route.js`: lines 117, 162, 170.
- `lwrpc-admin/app/api/ai-insights/route.js`: lines 158.
- `lwrpc-admin/app/api/league-communications/route.js`: lines 10.
- `lwrpc-admin/app/api/season-rollover/route.js`: lines 81.
- `lwrpc-admin/app/captain-dashboard/page.js`: lines 113.
- `lwrpc-admin/app/divisions/page.js`: lines 119.
- `lwrpc-admin/app/leagues/page.js`: lines 62.
- `lwrpc-admin/app/lib/matchSetupReminders.js`: lines 50.
- `lwrpc-admin/app/player-dashboard/page.js`: lines 129.
- `lwrpc-admin/app/schedule-editor/page.js`: lines 88.
- `lwrpc-admin/app/scheduling/page.js`: lines 108.
- `lwrpc-admin/app/scoring/page.js`: lines 124.
- `lwrpc-admin/app/seasons/page.js`: lines 160.
- `lwrpc-admin/app/standings/page.js`: lines 41.
- `lwrpc-admin/app/teams/page.js`: lines 216.
## public.line_games

Columns covered by browser table privileges (9): `id, match_line_id, game_number, home_score, away_score, is_picklebreaker, game_status, created_at, updated_at`.

| Role | SELECT | INSERT | UPDATE | DELETE | TRUNCATE | REFERENCES | TRIGGER |
|---|---|---|---|---|---|---|---|
| anon | Granted | Granted | Granted | Granted | Granted | Granted | Granted |
| authenticated | Granted | Granted | Granted | Granted | Granted | Granted | Granted |

Effective direct SELECT: anon zero rows; authenticated Player/Captain/Club Pro all fixture rows/all granted columns, including unrelated rows. These policies do not use application role for SELECT.

- **Authenticated users can read line games** — PERMISSIVE SELECT TO authenticated. USING `true`; WITH CHECK `—`.
- **Captains and managers can insert own-team line games** — PERMISSIVE INSERT TO authenticated. USING `—`; WITH CHECK `private.current_user_can_manage_match_line(match_line_id)`.
- **Captains and managers can update own-team line games** — PERMISSIVE UPDATE TO authenticated. USING `private.current_user_can_manage_match_line(match_line_id)`; WITH CHECK `private.current_user_can_manage_match_line(match_line_id)`.
- **League managers can delete line games** — PERMISSIVE DELETE TO authenticated. USING `( SELECT private.current_user_is_lwrpc_admin() AS current_user_is_lwrpc_admin)`; WITH CHECK `—`.

Direct expression dependencies (including optional/helper/mutation-return queries; API entries are server dependencies, not browser):

- `lwrpc-admin/app/AdminDashboardClient.js`: lines 2524.
- `lwrpc-admin/app/live-match/[id]/page.js`: lines 67.
- `lwrpc-admin/app/matches/[id]/page.js`: lines 247, 295.
- `lwrpc-admin/app/score-entry/[id]/page.js`: lines 133.
## public.locations

Columns covered by browser table privileges (14): `id, name, address, city, state, zip_code, number_of_courts, court_notes, club_pros, is_active, created_at, updated_at, club_pro_member_id, club_pro_2_member_id`.

| Role | SELECT | INSERT | UPDATE | DELETE | TRUNCATE | REFERENCES | TRIGGER |
|---|---|---|---|---|---|---|---|
| anon | Granted | Granted | Granted | Granted | Granted | Granted | Granted |
| authenticated | Granted | Granted | Granted | Granted | Granted | Granted | Granted |

Effective direct SELECT: anon zero rows; authenticated Player/Captain/Club Pro all fixture rows/all granted columns, including unrelated rows. These policies do not use application role for SELECT.

- **Authenticated users can delete locations** — PERMISSIVE DELETE TO authenticated. USING `( SELECT private.current_user_is_lwrpc_admin() AS current_user_is_lwrpc_admin)`; WITH CHECK `—`.
- **Authenticated users can insert locations** — PERMISSIVE INSERT TO authenticated. USING `—`; WITH CHECK `( SELECT private.current_user_is_lwrpc_admin() AS current_user_is_lwrpc_admin)`.
- **Authenticated users can read locations** — PERMISSIVE SELECT TO authenticated. USING `true`; WITH CHECK `—`.
- **Authenticated users can update locations** — PERMISSIVE UPDATE TO authenticated. USING `( SELECT private.current_user_is_lwrpc_admin() AS current_user_is_lwrpc_admin)`; WITH CHECK `( SELECT private.current_user_is_lwrpc_admin() AS current_user_is_lwrpc_admin)`.
- **view_as_executor_read** — PERMISSIVE SELECT TO lms_view_as_executor. USING `true`; WITH CHECK `—`.

Direct expression dependencies (including optional/helper/mutation-return queries; API entries are server dependencies, not browser):

- `lwrpc-admin/app/captain-dashboard/page.js`: lines 269.
- `lwrpc-admin/app/locations/page.js`: lines 49.
- `lwrpc-admin/app/member-import/page.js`: lines 466.
- `lwrpc-admin/app/members/page.js`: lines 123.
- `lwrpc-admin/app/members/[id]/page.js`: lines 237.
- `lwrpc-admin/app/schedule-editor/page.js`: lines 98.
- `lwrpc-admin/app/scheduling/page.js`: lines 120.
- `lwrpc-admin/app/scoring/page.js`: lines 127.
- `lwrpc-admin/app/teams/page.js`: lines 235.
- `lwrpc-admin/app/teams/[id]/page.js`: lines 168.
## public.match_lines

Columns covered by browser table privileges (30): `id, match_id, division_line_id, line_number, home_player_1_id, home_player_2_id, away_player_1_id, away_player_2_id, line_status, home_wins, away_wins, posted_to_dupr, created_at, updated_at, winning_team_id, verification_status, verified_by_member_id, verified_at, home_team_games_won, away_team_games_won, home_team_points, away_team_points, rating_type_at_play, home_player_1_rating_at_play, home_player_2_rating_at_play, away_player_1_rating_at_play, away_player_2_rating_at_play, home_team_rating_at_play, away_team_rating_at_play, ratings_snapshotted_at`.

| Role | SELECT | INSERT | UPDATE | DELETE | TRUNCATE | REFERENCES | TRIGGER |
|---|---|---|---|---|---|---|---|
| anon | Granted | Granted | Granted | Granted | Granted | Granted | Granted |
| authenticated | Granted | Granted | Granted | Granted | Granted | Granted | Granted |

Effective direct SELECT: anon zero rows; authenticated Player/Captain/Club Pro all fixture rows/all granted columns, including unrelated rows. These policies do not use application role for SELECT.

- **Authenticated users can read match lines** — PERMISSIVE SELECT TO authenticated. USING `true`; WITH CHECK `—`.
- **Captains and managers can update own-team match lines** — PERMISSIVE UPDATE TO authenticated. USING `private.current_user_can_manage_match(match_id)`; WITH CHECK `private.current_user_can_manage_match(match_id)`.
- **League managers can delete match lines** — PERMISSIVE DELETE TO authenticated. USING `( SELECT private.current_user_is_lwrpc_admin() AS current_user_is_lwrpc_admin)`; WITH CHECK `—`.
- **League managers can insert match lines** — PERMISSIVE INSERT TO authenticated. USING `—`; WITH CHECK `( SELECT private.current_user_is_lwrpc_admin() AS current_user_is_lwrpc_admin)`.

Direct expression dependencies (including optional/helper/mutation-return queries; API entries are server dependencies, not browser):

- `lwrpc-admin/app/divisions/[id]/page.js`: lines 616.
- `lwrpc-admin/app/live-match/[id]/page.js`: lines 37.
- `lwrpc-admin/app/matches/[id]/page.js`: lines 141.
- `lwrpc-admin/app/members/page.js`: lines 452.
- `lwrpc-admin/app/members/[id]/page.js`: lines 149.
- `lwrpc-admin/app/player-dashboard/page.js`: lines 541.
- `lwrpc-admin/app/schedule-editor/page.js`: lines 723, 786.
- `lwrpc-admin/app/scheduling/page.js`: lines 691, 978.
- `lwrpc-admin/app/score-entry/[id]/page.js`: lines 96.
- `lwrpc-admin/app/scoring/page.js`: lines 1131.
- `lwrpc-admin/app/teams/[id]/page.js`: lines 244.
## public.match_lineups

Columns covered by browser table privileges (8): `id, match_id, team_id, line_number, player_1_member_id, player_2_member_id, created_at, updated_at`.

| Role | SELECT | INSERT | UPDATE | DELETE | TRUNCATE | REFERENCES | TRIGGER |
|---|---|---|---|---|---|---|---|
| anon | Granted | Granted | Granted | Granted | Granted | Granted | Granted |
| authenticated | Granted | Granted | Granted | Granted | Granted | Granted | Granted |

Effective direct SELECT: anon zero rows; authenticated Player/Captain/Club Pro all fixture rows/all granted columns, including unrelated rows. These policies do not use application role for SELECT.

- **match_lineups_delete_captains_and_managers** — PERMISSIVE DELETE TO authenticated. USING `private.current_user_can_manage_match_lineup(team_id)`; WITH CHECK `—`.
- **match_lineups_insert_captains_and_managers** — PERMISSIVE INSERT TO authenticated. USING `—`; WITH CHECK `private.current_user_can_manage_match_lineup(team_id)`.
- **match_lineups_select_authenticated** — PERMISSIVE SELECT TO authenticated. USING `true`; WITH CHECK `—`.
- **match_lineups_update_captains_and_managers** — PERMISSIVE UPDATE TO authenticated. USING `private.current_user_can_manage_match_lineup(team_id)`; WITH CHECK `private.current_user_can_manage_match_lineup(team_id)`.

Direct expression dependencies (including optional/helper/mutation-return queries; API entries are server dependencies, not browser):

- `lwrpc-admin/app/api/ai-insights/route.js`: lines 211.
- `lwrpc-admin/app/api/match-lineups/route.js`: lines 313.
- `lwrpc-admin/app/captain-dashboard/page.js`: lines 190, 1794, 1856.
- `lwrpc-admin/app/lib/matchSetupReminders.js`: lines 109.
- `lwrpc-admin/app/matches/[id]/page.js`: lines 310.
- `lwrpc-admin/app/player-dashboard/page.js`: lines 980.
## public.matches

Columns covered by browser table privileges (30): `id, league_id, division_id, home_team_id, away_team_id, location_id, scheduled_date, scheduled_time, week_number, status, home_score, away_score, notes, created_at, updated_at, published_at, is_published, schedule_setting_id, winning_team_id, score_status, score_entered_by_member_id, score_entered_at, score_verified_by_member_id, score_verified_at, score_disputed, score_dispute_notes, finalized_at, score_exported_at, result_type, result_notes`.

| Role | SELECT | INSERT | UPDATE | DELETE | TRUNCATE | REFERENCES | TRIGGER |
|---|---|---|---|---|---|---|---|
| anon | Granted | Granted | Granted | Granted | Granted | Granted | Granted |
| authenticated | Granted | Granted | Granted | Granted | Granted | Granted | Granted |

Effective direct SELECT: anon zero rows; authenticated Player/Captain/Club Pro all fixture rows/all granted columns, including unrelated rows. These policies do not use application role for SELECT.

- **Authenticated users can read matches** — PERMISSIVE SELECT TO authenticated. USING `true`; WITH CHECK `—`.
- **Captains and managers can update own-team matches** — PERMISSIVE UPDATE TO authenticated. USING `private.current_user_can_manage_match(id)`; WITH CHECK `private.current_user_can_manage_match(id)`.
- **League managers can delete matches** — PERMISSIVE DELETE TO authenticated. USING `( SELECT private.current_user_is_lwrpc_admin() AS current_user_is_lwrpc_admin)`; WITH CHECK `—`.
- **League managers can insert matches** — PERMISSIVE INSERT TO authenticated. USING `—`; WITH CHECK `( SELECT private.current_user_is_lwrpc_admin() AS current_user_is_lwrpc_admin)`.
- **view_as_executor_read** — PERMISSIVE SELECT TO lms_view_as_executor. USING `true`; WITH CHECK `—`.

Direct expression dependencies (including optional/helper/mutation-return queries; API entries are server dependencies, not browser):

- `lwrpc-admin/app/AdminDashboardClient.js`: lines 1038, 2353, 2389.
- `lwrpc-admin/app/api/ai-insights/route.js`: lines 187.
- `lwrpc-admin/app/api/match-lineups/route.js`: lines 101.
- `lwrpc-admin/app/captain-dashboard/page.js`: lines 412, 632, 1617, 2235, 2539.
- `lwrpc-admin/app/lib/matchSetupReminders.js`: lines 65.
- `lwrpc-admin/app/lib/standingsRebuild.js`: lines 210, 261.
- `lwrpc-admin/app/live-match/[id]/page.js`: lines 19.
- `lwrpc-admin/app/matches/[id]/page.js`: lines 107.
- `lwrpc-admin/app/player-dashboard/page.js`: lines 323, 443, 1159.
- `lwrpc-admin/app/schedule-editor/page.js`: lines 52.
- `lwrpc-admin/app/scheduling/page.js`: lines 144, 902, 958.
- `lwrpc-admin/app/score-entry/[id]/page.js`: lines 64.
- `lwrpc-admin/app/scoring/page.js`: lines 145, 456, 563, 949, 971.
- `lwrpc-admin/app/standings/page.js`: lines 64, 256.
- `lwrpc-admin/app/teams/page.js`: lines 783.
## public.member_season_ratings

Columns covered by browser table privileges (10): `id, member_id, season_id, season_dupr_rating, season_primetime_rating, notes, created_at, updated_at, dupr_doubles_rating, dupr_reliability_rating`.

| Role | SELECT | INSERT | UPDATE | DELETE | TRUNCATE | REFERENCES | TRIGGER |
|---|---|---|---|---|---|---|---|
| anon | Granted | Granted | Granted | Granted | Granted | Granted | Granted |
| authenticated | Granted | Granted | Granted | Granted | Granted | Granted | Granted |

Effective direct SELECT: anon zero rows; authenticated Player/Captain/Club Pro all fixture rows/all granted columns, including unrelated rows. These policies do not use application role for SELECT.

- **Authenticated users can read member season ratings** — PERMISSIVE SELECT TO authenticated. USING `true`; WITH CHECK `—`.
- **League managers can delete member season ratings** — PERMISSIVE DELETE TO authenticated. USING `( SELECT private.current_user_is_lwrpc_admin() AS current_user_is_lwrpc_admin)`; WITH CHECK `—`.
- **League managers can insert member season ratings** — PERMISSIVE INSERT TO authenticated. USING `—`; WITH CHECK `( SELECT private.current_user_is_lwrpc_admin() AS current_user_is_lwrpc_admin)`.
- **League managers can update member season ratings** — PERMISSIVE UPDATE TO authenticated. USING `( SELECT private.current_user_is_lwrpc_admin() AS current_user_is_lwrpc_admin)`; WITH CHECK `( SELECT private.current_user_is_lwrpc_admin() AS current_user_is_lwrpc_admin)`.
- **view_as_executor_read** — PERMISSIVE SELECT TO lms_view_as_executor. USING `true`; WITH CHECK `—`.

Direct expression dependencies (including optional/helper/mutation-return queries; API entries are server dependencies, not browser):

- `lwrpc-admin/app/AdminDashboardClient.js`: lines 1041, 2573.
- `lwrpc-admin/app/api/ai-insights/route.js`: lines 183.
- `lwrpc-admin/app/api/match-lineups/route.js`: lines 195.
- `lwrpc-admin/app/api/tournaments/admin/route.js`: lines 168.
- `lwrpc-admin/app/captain-dashboard/page.js`: lines 719, 1816, 2143, 2634.
- `lwrpc-admin/app/matches/[id]/page.js`: lines 330, 380.
- `lwrpc-admin/app/members/page.js`: lines 544, 1522.
- `lwrpc-admin/app/members/[id]/page.js`: lines 84.
- `lwrpc-admin/app/player-dashboard/page.js`: lines 682, 1231.
- `lwrpc-admin/app/ratings/page.js`: lines 222, 2401.
- `lwrpc-admin/app/score-entry/[id]/page.js`: lines 151, 174.
- `lwrpc-admin/app/standings/page.js`: lines 349.
- `lwrpc-admin/app/teams/page.js`: lines 848.
- `lwrpc-admin/app/teams/[id]/page.js`: lines 183.
## public.members

Columns covered by browser table privileges (35): `id, membershipworks_account_id, full_name, first_name, last_name, email, phone, club_location, self_rating, dupr_id, member_comment, waiver_status, stripe_customer_id, profile_image_urls, membership_levels, membership_addons, labels, join_date, renewal_date, billing_method, auto_recurring_billing_id, ip_address, is_active, last_imported_at, created_at, updated_at, location_id, membershipworks_id, membership_status, membership_level, imported_at, last_membership_sync_at, is_active_member, notification_preference, notes`.

| Role | SELECT | INSERT | UPDATE | DELETE | TRUNCATE | REFERENCES | TRIGGER |
|---|---|---|---|---|---|---|---|
| anon | Granted | Granted | Granted | Granted | Granted | Granted | Granted |
| authenticated | Granted | Granted | Granted | Granted | Granted | Granted | Granted |

Effective direct SELECT: anon zero rows; authenticated Player/Captain/Club Pro all fixture rows/all granted columns, including unrelated rows. These policies do not use application role for SELECT.

- **Authenticated users can read members** — PERMISSIVE SELECT TO authenticated. USING `true`; WITH CHECK `—`.
- **League managers can delete members** — PERMISSIVE DELETE TO authenticated. USING `(( SELECT private.current_user_role() AS current_user_role) = ANY (ARRAY['league_manager'::text, 'commissioner'::text]))`; WITH CHECK `—`.
- **League managers can insert members** — PERMISSIVE INSERT TO authenticated. USING `—`; WITH CHECK `(( SELECT private.current_user_role() AS current_user_role) = ANY (ARRAY['league_manager'::text, 'commissioner'::text]))`.
- **Users and managers can update members** — PERMISSIVE UPDATE TO authenticated. USING `(private.current_user_can_update_member(id) OR (( SELECT private.current_user_role() AS current_user_role) = ANY (ARRAY['league_manager'::text, 'commissioner'::text])))`; WITH CHECK `(private.current_user_can_update_member(id) OR (( SELECT private.current_user_role() AS current_user_role) = ANY (ARRAY['league_manager'::text, 'commissioner'::text])))`.
- **view_as_executor_read** — PERMISSIVE SELECT TO lms_view_as_executor. USING `true`; WITH CHECK `—`.

Direct expression dependencies (including optional/helper/mutation-return queries; API entries are server dependencies, not browser):

- `lwrpc-admin/app/AdminDashboardClient.js`: lines 388.
- `lwrpc-admin/app/api/admin/delete-member/route.js`: lines 34.
- `lwrpc-admin/app/api/admin/member-last-login/route.js`: lines 33.
- `lwrpc-admin/app/api/ai-insights/route.js`: lines 61, 153.
- `lwrpc-admin/app/api/brevo-diagnostics/route.js`: lines 28.
- `lwrpc-admin/app/api/league-communications/route.js`: lines 9, 12, 12.
- `lwrpc-admin/app/api/match-lineups/route.js`: lines 90.
- `lwrpc-admin/app/api/match-setup-reminders/route.js`: lines 63.
- `lwrpc-admin/app/api/member-password-reset-check/route.js`: lines 88, 215.
- `lwrpc-admin/app/api/notification-template-history/route.js`: lines 60.
- `lwrpc-admin/app/api/notification-templates/route.js`: lines 143.
- `lwrpc-admin/app/api/notifications/route.js`: lines 59.
- `lwrpc-admin/app/api/round-robin/action/route.js`: lines 371.
- `lwrpc-admin/app/api/round-robin/admin/route.js`: lines 224, 257.
- `lwrpc-admin/app/api/score-notification/route.js`: lines 62.
- `lwrpc-admin/app/api/system-settings/route.js`: lines 60.
- `lwrpc-admin/app/api/tournaments/action/route.js`: lines 1226, 1266.
- `lwrpc-admin/app/api/user-last-logins/route.js`: lines 70.
- `lwrpc-admin/app/captain-dashboard/page.js`: lines 614.
- `lwrpc-admin/app/lib/aiApprovedAnswersService.js`: lines 69.
- `lwrpc-admin/app/lib/aiDocumentActivation.js`: lines 12.
- `lwrpc-admin/app/lib/memberLookup.js`: lines 4.
- `lwrpc-admin/app/lib/profilePhotos.js`: lines 64.
- `lwrpc-admin/app/lib/serverSupabase.js`: lines 59.
- `lwrpc-admin/app/locations/page.js`: lines 77.
- `lwrpc-admin/app/matches/[id]/page.js`: lines 98.
- `lwrpc-admin/app/member-import/page.js`: lines 94, 376.
- `lwrpc-admin/app/members/page.js`: lines 360, 1484.
- `lwrpc-admin/app/members/[id]/page.js`: lines 62, 357, 531.
- `lwrpc-admin/app/player-dashboard/page.js`: lines 496.
- `lwrpc-admin/app/ratings/page.js`: lines 2379.
- `lwrpc-admin/app/schedule-editor/page.js`: lines 125.
- `lwrpc-admin/app/score-entry/[id]/page.js`: lines 55.
- `lwrpc-admin/app/scoring/page.js`: lines 272.
- `lwrpc-admin/app/teams/page.js`: lines 1774.
- `lwrpc-admin/app/teams/[id]/page.js`: lines 144.
## public.score_sheet_templates

Columns covered by browser table privileges (10): `id, name, description, sheet_title, template_html, rules_text, is_default, is_active, created_at, updated_at`.

| Role | SELECT | INSERT | UPDATE | DELETE | TRUNCATE | REFERENCES | TRIGGER |
|---|---|---|---|---|---|---|---|
| anon | Granted | Granted | Granted | Granted | Granted | Granted | Granted |
| authenticated | Granted | Granted | Granted | Granted | Granted | Granted | Granted |

Effective direct SELECT: anon zero rows; authenticated Player/Captain/Club Pro all fixture rows/all granted columns, including unrelated rows. These policies do not use application role for SELECT.

- **League managers can delete score sheet templates** — PERMISSIVE DELETE TO authenticated. USING `(EXISTS ( SELECT 1    FROM (members m      JOIN user_roles ur ON ((ur.member_id = m.id)))   WHERE ((lower(m.email) = lower((( SELECT auth.jwt() AS jwt) ->> 'email'::text))) AND (ur.role = ANY (ARRAY['league_manager'::text, 'commissioner'::text])))))`; WITH CHECK `—`.
- **League managers can insert score sheet templates** — PERMISSIVE INSERT TO authenticated. USING `—`; WITH CHECK `(EXISTS ( SELECT 1    FROM (members m      JOIN user_roles ur ON ((ur.member_id = m.id)))   WHERE ((lower(m.email) = lower((( SELECT auth.jwt() AS jwt) ->> 'email'::text))) AND (ur.role = ANY (ARRAY['league_manager'::text, 'commissioner'::text])))))`.
- **League managers can update score sheet templates** — PERMISSIVE UPDATE TO authenticated. USING `(EXISTS ( SELECT 1    FROM (members m      JOIN user_roles ur ON ((ur.member_id = m.id)))   WHERE ((lower(m.email) = lower((( SELECT auth.jwt() AS jwt) ->> 'email'::text))) AND (ur.role = ANY (ARRAY['league_manager'::text, 'commissioner'::text])))))`; WITH CHECK `(EXISTS ( SELECT 1    FROM (members m      JOIN user_roles ur ON ((ur.member_id = m.id)))   WHERE ((lower(m.email) = lower((( SELECT auth.jwt() AS jwt) ->> 'email'::text))) AND (ur.role = ANY (ARRAY['league_manager'::text, 'commissioner'::text])))))`.
- **Score sheet templates are readable by authenticated users** — PERMISSIVE SELECT TO authenticated. USING `true`; WITH CHECK `—`.

Direct expression dependencies (including optional/helper/mutation-return queries; API entries are server dependencies, not browser):

- `lwrpc-admin/app/captain-dashboard/page.js`: lines 1871.
- `lwrpc-admin/app/divisions/page.js`: lines 158.
- `lwrpc-admin/app/score-sheets/page.js`: lines 39.
## public.seasons

Columns covered by browser table privileges (8): `id, name, start_date, end_date, is_active, created_at, updated_at, abbreviation`.

| Role | SELECT | INSERT | UPDATE | DELETE | TRUNCATE | REFERENCES | TRIGGER |
|---|---|---|---|---|---|---|---|
| anon | Granted | Granted | Granted | Granted | Granted | Granted | Granted |
| authenticated | Granted | Granted | Granted | Granted | Granted | Granted | Granted |

Effective direct SELECT: anon zero rows; authenticated Player/Captain/Club Pro all fixture rows/all granted columns, including unrelated rows. These policies do not use application role for SELECT.

- **Admins can delete seasons** — PERMISSIVE DELETE TO authenticated. USING `( SELECT private.current_user_is_admin() AS current_user_is_admin)`; WITH CHECK `—`.
- **Admins can insert seasons** — PERMISSIVE INSERT TO authenticated. USING `—`; WITH CHECK `( SELECT private.current_user_is_admin() AS current_user_is_admin)`.
- **Admins can update seasons** — PERMISSIVE UPDATE TO authenticated. USING `( SELECT private.current_user_is_admin() AS current_user_is_admin)`; WITH CHECK `( SELECT private.current_user_is_admin() AS current_user_is_admin)`.
- **Authenticated users can read seasons** — PERMISSIVE SELECT TO authenticated. USING `true`; WITH CHECK `—`.
- **view_as_executor_read** — PERMISSIVE SELECT TO lms_view_as_executor. USING `true`; WITH CHECK `—`.

Direct expression dependencies (including optional/helper/mutation-return queries; API entries are server dependencies, not browser):

- `lwrpc-admin/app/AdminDashboardClient.js`: lines 240, 365.
- `lwrpc-admin/app/api/ai-assistant/documents/route.js`: lines 116, 161.
- `lwrpc-admin/app/api/ai-insights/route.js`: lines 157.
- `lwrpc-admin/app/api/league-communications/route.js`: lines 10.
- `lwrpc-admin/app/api/season-rollover/route.js`: lines 51, 59, 67.
- `lwrpc-admin/app/leagues/page.js`: lines 58.
- `lwrpc-admin/app/lib/aiApprovedAnswersService.js`: lines 52.
- `lwrpc-admin/app/members/page.js`: lines 119.
- `lwrpc-admin/app/ratings/page.js`: lines 107.
- `lwrpc-admin/app/seasons/page.js`: lines 44.
## public.team_byes

Columns covered by browser table privileges (8): `id, league_id, division_id, team_id, week_number, bye_date, created_at, updated_at`.

| Role | SELECT | INSERT | UPDATE | DELETE | TRUNCATE | REFERENCES | TRIGGER |
|---|---|---|---|---|---|---|---|
| anon | Granted | Granted | Granted | Granted | Granted | Granted | Granted |
| authenticated | Granted | Granted | Granted | Granted | Granted | Granted | Granted |

Effective direct SELECT: anon zero rows; authenticated Player/Captain/Club Pro all fixture rows/all granted columns, including unrelated rows. These policies do not use application role for SELECT.

- **Allow authenticated users to delete team byes** — PERMISSIVE DELETE TO authenticated. USING `private.current_user_can_manage_team(team_id)`; WITH CHECK `—`.
- **Allow authenticated users to insert team byes** — PERMISSIVE INSERT TO authenticated. USING `—`; WITH CHECK `private.current_user_can_manage_team(team_id)`.
- **Allow authenticated users to update team byes** — PERMISSIVE UPDATE TO authenticated. USING `private.current_user_can_manage_team(team_id)`; WITH CHECK `private.current_user_can_manage_team(team_id)`.
- **Allow authenticated users to view team byes** — PERMISSIVE SELECT TO authenticated. USING `true`; WITH CHECK `—`.

Direct expression dependencies (including optional/helper/mutation-return queries; API entries are server dependencies, not browser):

- `lwrpc-admin/app/AdminDashboardClient.js`: lines 1039.
- `lwrpc-admin/app/captain-dashboard/page.js`: lines 779, 2614.
- `lwrpc-admin/app/lib/standingsRebuild.js`: lines 269.
- `lwrpc-admin/app/player-dashboard/page.js`: lines 428, 1211.
- `lwrpc-admin/app/standings/page.js`: lines 69, 329.
- `lwrpc-admin/app/teams/page.js`: lines 834.
## public.team_members

Columns covered by browser table privileges (6): `id, team_id, member_id, role, is_active, created_at`.

| Role | SELECT | INSERT | UPDATE | DELETE | TRUNCATE | REFERENCES | TRIGGER |
|---|---|---|---|---|---|---|---|
| anon | Granted | Granted | Granted | Granted | Granted | Granted | Granted |
| authenticated | Granted | Granted | Granted | Granted | Granted | Granted | Granted |

Effective direct SELECT: anon zero rows; authenticated Player/Captain/Club Pro all fixture rows/all granted columns, including unrelated rows. These policies do not use application role for SELECT.

- **Authenticated users can delete team members** — PERMISSIVE DELETE TO authenticated. USING `private.current_user_can_manage_team(team_id)`; WITH CHECK `—`.
- **Authenticated users can insert team members** — PERMISSIVE INSERT TO authenticated. USING `—`; WITH CHECK `private.current_user_can_manage_team(team_id)`.
- **Authenticated users can read team members** — PERMISSIVE SELECT TO authenticated. USING `true`; WITH CHECK `—`.
- **Authenticated users can update team members** — PERMISSIVE UPDATE TO authenticated. USING `private.current_user_can_manage_team(team_id)`; WITH CHECK `private.current_user_can_manage_team(team_id)`.
- **view_as_executor_read** — PERMISSIVE SELECT TO lms_view_as_executor. USING `true`; WITH CHECK `—`.

Direct expression dependencies (including optional/helper/mutation-return queries; API entries are server dependencies, not browser):

- `lwrpc-admin/app/AdminDashboardClient.js`: lines 2557.
- `lwrpc-admin/app/api/ai-insights/route.js`: lines 179.
- `lwrpc-admin/app/api/league-communications/route.js`: lines 12.
- `lwrpc-admin/app/api/match-lineups/route.js`: lines 172.
- `lwrpc-admin/app/api/tournaments/action/route.js`: lines 1281.
- `lwrpc-admin/app/api/tournaments/admin/route.js`: lines 143.
- `lwrpc-admin/app/captain-dashboard/page.js`: lines 655, 1789.
- `lwrpc-admin/app/components/AskLwrAssistant.js`: lines 231.
- `lwrpc-admin/app/matches/[id]/page.js`: lines 219, 231.
- `lwrpc-admin/app/members/page.js`: lines 424, 1356.
- `lwrpc-admin/app/members/[id]/page.js`: lines 103.
- `lwrpc-admin/app/player-dashboard/page.js`: lines 229, 512.
- `lwrpc-admin/app/ratings/page.js`: lines 910, 2425.
- `lwrpc-admin/app/teams/page.js`: lines 643, 710, 1807.
- `lwrpc-admin/app/teams/[id]/page.js`: lines 119, 203.
## public.team_standings

Columns covered by browser table privileges (27): `id, league_id, division_id, team_id, matches_played, match_wins, match_losses, match_ties, line_wins, line_losses, line_ties, game_wins, game_losses, points_for, points_against, point_differential, standings_points, rank, created_at, updated_at, home_wins, home_losses, away_wins, away_losses, current_streak, recent_form, finalized`.

| Role | SELECT | INSERT | UPDATE | DELETE | TRUNCATE | REFERENCES | TRIGGER |
|---|---|---|---|---|---|---|---|
| anon | Granted | Granted | Granted | Granted | Granted | Granted | Granted |
| authenticated | Granted | Granted | Granted | Granted | Granted | Granted | Granted |

Effective direct SELECT: anon zero rows; authenticated Player/Captain/Club Pro all fixture rows/all granted columns, including unrelated rows. These policies do not use application role for SELECT.

- **Authenticated users can read team standings** — PERMISSIVE SELECT TO authenticated. USING `true`; WITH CHECK `—`.
- **League managers can delete team standings** — PERMISSIVE DELETE TO authenticated. USING `( SELECT private.current_user_is_lwrpc_admin() AS current_user_is_lwrpc_admin)`; WITH CHECK `—`.
- **League managers can insert team standings** — PERMISSIVE INSERT TO authenticated. USING `—`; WITH CHECK `( SELECT private.current_user_is_lwrpc_admin() AS current_user_is_lwrpc_admin)`.
- **League managers can update team standings** — PERMISSIVE UPDATE TO authenticated. USING `( SELECT private.current_user_is_lwrpc_admin() AS current_user_is_lwrpc_admin)`; WITH CHECK `( SELECT private.current_user_is_lwrpc_admin() AS current_user_is_lwrpc_admin)`.
- **view_as_executor_read** — PERMISSIVE SELECT TO lms_view_as_executor. USING `true`; WITH CHECK `—`.

Direct expression dependencies (including optional/helper/mutation-return queries; API entries are server dependencies, not browser):

- `lwrpc-admin/app/AdminDashboardClient.js`: lines 1016, 1040, 2459.
- `lwrpc-admin/app/api/ai-insights/route.js`: lines 215.
- `lwrpc-admin/app/captain-dashboard/page.js`: lines 669, 2629.
- `lwrpc-admin/app/player-dashboard/page.js`: lines 448, 1226.
- `lwrpc-admin/app/standings/page.js`: lines 51, 344.
- `lwrpc-admin/app/teams/page.js`: lines 843.
## public.teams

Columns covered by browser table privileges (14): `id, division_id, name, captain_member_id, co_captain_member_id, is_active, created_at, updated_at, home_location_id, team_number, notes, abbreviation, co_captain_2_member_id, club_pro_member_id`.

| Role | SELECT | INSERT | UPDATE | DELETE | TRUNCATE | REFERENCES | TRIGGER |
|---|---|---|---|---|---|---|---|
| anon | Granted | Granted | Granted | Granted | Granted | Granted | Granted |
| authenticated | Granted | Granted | Granted | Granted | Granted | Granted | Granted |

Effective direct SELECT: anon zero rows; authenticated Player/Captain/Club Pro all fixture rows/all granted columns, including unrelated rows. These policies do not use application role for SELECT.

- **Authenticated users can insert teams** — PERMISSIVE INSERT TO authenticated. USING `—`; WITH CHECK `( SELECT private.current_user_is_lwrpc_admin() AS current_user_is_lwrpc_admin)`.
- **Authenticated users can read teams** — PERMISSIVE SELECT TO authenticated. USING `true`; WITH CHECK `—`.
- **Authenticated users can update teams** — PERMISSIVE UPDATE TO authenticated. USING `( SELECT private.current_user_is_lwrpc_admin() AS current_user_is_lwrpc_admin)`; WITH CHECK `( SELECT private.current_user_is_lwrpc_admin() AS current_user_is_lwrpc_admin)`.
- **view_as_executor_read** — PERMISSIVE SELECT TO lms_view_as_executor. USING `true`; WITH CHECK `—`.

Direct expression dependencies (including optional/helper/mutation-return queries; API entries are server dependencies, not browser):

- `lwrpc-admin/app/AdminDashboardClient.js`: lines 1037, 2310.
- `lwrpc-admin/app/api/ai-insights/route.js`: lines 163.
- `lwrpc-admin/app/api/league-communications/route.js`: lines 12.
- `lwrpc-admin/app/api/match-lineups/route.js`: lines 137.
- `lwrpc-admin/app/api/teams/delete/route.js`: lines 30.
- `lwrpc-admin/app/api/tournaments/action/route.js`: lines 976, 1313.
- `lwrpc-admin/app/api/tournaments/admin/route.js`: lines 116.
- `lwrpc-admin/app/captain-dashboard/page.js`: lines 292, 2451, 2526.
- `lwrpc-admin/app/lib/standingsRebuild.js`: lines 202.
- `lwrpc-admin/app/matches/[id]/page.js`: lines 1820.
- `lwrpc-admin/app/members/page.js`: lines 1409.
- `lwrpc-admin/app/player-dashboard/page.js`: lines 1146.
- `lwrpc-admin/app/schedule-editor/page.js`: lines 107.
- `lwrpc-admin/app/scheduling/page.js`: lines 740.
- `lwrpc-admin/app/score-entry/[id]/page.js`: lines 494.
- `lwrpc-admin/app/scoring/page.js`: lines 126.
- `lwrpc-admin/app/seasons/page.js`: lines 176.
- `lwrpc-admin/app/standings/page.js`: lines 243.
- `lwrpc-admin/app/teams/page.js`: lines 248, 621, 697, 768.
- `lwrpc-admin/app/teams/[id]/page.js`: lines 54.
## public.user_roles

Columns covered by browser table privileges (6): `id, user_id, member_id, role, created_at, updated_at`.

| Role | SELECT | INSERT | UPDATE | DELETE | TRUNCATE | REFERENCES | TRIGGER |
|---|---|---|---|---|---|---|---|
| anon | Granted | Granted | Granted | Granted | Granted | Granted | Granted |
| authenticated | Granted | Granted | Granted | Granted | Granted | Granted | Granted |

Effective direct SELECT: anon zero rows; authenticated Player/Captain/Club Pro all fixture rows/all granted columns, including unrelated rows. These policies do not use application role for SELECT.

- **Authenticated users can read user roles** — PERMISSIVE SELECT TO authenticated. USING `true`; WITH CHECK `—`.
- **Commissioners can delete roles** — PERMISSIVE DELETE TO authenticated. USING `( SELECT private.current_user_is_commissioner() AS current_user_is_commissioner)`; WITH CHECK `—`.
- **Commissioners can insert roles** — PERMISSIVE INSERT TO authenticated. USING `—`; WITH CHECK `( SELECT private.current_user_is_commissioner() AS current_user_is_commissioner)`.
- **Commissioners can update roles** — PERMISSIVE UPDATE TO authenticated. USING `( SELECT private.current_user_is_commissioner() AS current_user_is_commissioner)`; WITH CHECK `( SELECT private.current_user_is_commissioner() AS current_user_is_commissioner)`.
- **view_as_executor_read** — PERMISSIVE SELECT TO lms_view_as_executor. USING `true`; WITH CHECK `—`.

Direct expression dependencies (including optional/helper/mutation-return queries; API entries are server dependencies, not browser):

- `lwrpc-admin/app/api/admin/delete-member/route.js`: lines 56, 64, 87.
- `lwrpc-admin/app/api/admin/member-directory/route.js`: lines 95.
- `lwrpc-admin/app/lib/auth.js`: lines 68.
- `lwrpc-admin/app/lib/identityRoleWriter.js`: lines 8, 12, 14.
- `lwrpc-admin/app/lib/roleGuards.js`: lines 18.
- `lwrpc-admin/app/members/page.js`: lines 268.
- `lwrpc-admin/app/members/[id]/page.js`: lines 226, 481, 498.

## Completeness limits

Exact source census covers direct .from/select and RPC expressions in app sources at the accepted baseline. Dynamic tableName count calls and imported member/identity helpers must be included through caller migration, not treated as missing dependencies. Indirect memberLookup/auth/profile/history callers include shared shell, both dashboards and Team/Member/Match pages. The source appendix contains their full expressions. Runtime coverage and stale-client mutation SELECT requirements are not yet certified; no revoke is approved solely from this static inventory. No matching public view definitions were returned by the catalog text search; that is not a complete audit of indirect view/RPC dependencies or gateway configuration.
