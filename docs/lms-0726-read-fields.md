# LMS-0726 proposed field groups

Design only. These are explicit maximum column sets per named group, not permission to return every group on every request. Contract membership and row predicates are in the read-boundary design. Internal authorization columns are not automatically browser output. Unknown columns/keys fail closed.

## identity: public.members

Required/proposed maximum (5/35 available): `id, first_name, last_name, full_name, is_active_member`.

Excluded: `membershipworks_account_id`, `email`, `phone`, `club_location`, `self_rating`, `dupr_id`, `member_comment`, `waiver_status`, `stripe_customer_id`, `profile_image_urls`, `membership_levels`, `membership_addons`, `labels`, `join_date`, `renewal_date`, `billing_method`, `auto_recurring_billing_id`, `ip_address`, `is_active`, `last_imported_at`, `created_at`, `updated_at`, `location_id`, `membershipworks_id`, `membership_status`, `membership_level`, `imported_at`, `last_membership_sync_at`, `notification_preference`, `notes`.

## selfProfile: public.members

Required/proposed maximum (12/35 available): `id, first_name, last_name, email, phone, club_location, dupr_id, renewal_date, is_active_member, self_rating, profile_image_urls, notification_preference`.

Excluded: `membershipworks_account_id`, `full_name`, `member_comment`, `waiver_status`, `stripe_customer_id`, `membership_levels`, `membership_addons`, `labels`, `join_date`, `billing_method`, `auto_recurring_billing_id`, `ip_address`, `is_active`, `last_imported_at`, `created_at`, `updated_at`, `location_id`, `membershipworks_id`, `membership_status`, `membership_level`, `imported_at`, `last_membership_sync_at`, `notes`.

## rosterPerson: public.members

Required/proposed maximum (12/35 available): `id, first_name, last_name, email, phone, dupr_id, self_rating, club_location, is_active_member, membership_status, renewal_date, location_id`.

Excluded: `membershipworks_account_id`, `full_name`, `member_comment`, `waiver_status`, `stripe_customer_id`, `profile_image_urls`, `membership_levels`, `membership_addons`, `labels`, `join_date`, `billing_method`, `auto_recurring_billing_id`, `ip_address`, `is_active`, `last_imported_at`, `created_at`, `updated_at`, `membershipworks_id`, `membership_level`, `imported_at`, `last_membership_sync_at`, `notification_preference`, `notes`.

## candidate: public.members

Required/proposed maximum (3/35 available): `id, first_name, last_name`.

Excluded: `membershipworks_account_id`, `full_name`, `email`, `phone`, `club_location`, `self_rating`, `dupr_id`, `member_comment`, `waiver_status`, `stripe_customer_id`, `profile_image_urls`, `membership_levels`, `membership_addons`, `labels`, `join_date`, `renewal_date`, `billing_method`, `auto_recurring_billing_id`, `ip_address`, `is_active`, `last_imported_at`, `created_at`, `updated_at`, `location_id`, `membershipworks_id`, `membership_status`, `membership_level`, `imported_at`, `last_membership_sync_at`, `is_active_member`, `notification_preference`, `notes`.

## candidateInternal: public.members

Required/proposed maximum (8/35 available): `id, first_name, last_name, location_id, club_location, is_active_member, dupr_id, self_rating`.

Excluded: `membershipworks_account_id`, `full_name`, `email`, `phone`, `member_comment`, `waiver_status`, `stripe_customer_id`, `profile_image_urls`, `membership_levels`, `membership_addons`, `labels`, `join_date`, `renewal_date`, `billing_method`, `auto_recurring_billing_id`, `ip_address`, `is_active`, `last_imported_at`, `created_at`, `updated_at`, `membershipworks_id`, `membership_status`, `membership_level`, `imported_at`, `last_membership_sync_at`, `notification_preference`, `notes`.

## teamPublic: public.teams

Required/proposed maximum (4/14 available): `id, name, abbreviation, division_id`.

Excluded: `captain_member_id`, `co_captain_member_id`, `is_active`, `created_at`, `updated_at`, `home_location_id`, `team_number`, `notes`, `co_captain_2_member_id`, `club_pro_member_id`.

## matchPublic: public.matches

Required/proposed maximum (14/30 available): `id, division_id, home_team_id, away_team_id, location_id, scheduled_date, scheduled_time, week_number, status, home_score, away_score, winning_team_id, score_status, result_type`.

Excluded: `league_id`, `notes`, `created_at`, `updated_at`, `published_at`, `is_published`, `schedule_setting_id`, `score_entered_by_member_id`, `score_entered_at`, `score_verified_by_member_id`, `score_verified_at`, `score_disputed`, `score_dispute_notes`, `finalized_at`, `score_exported_at`, `result_notes`.

## personName: public.members

Required/proposed maximum (4/35 available): `id, first_name, last_name, full_name`.

Excluded: `membershipworks_account_id`, `email`, `phone`, `club_location`, `self_rating`, `dupr_id`, `member_comment`, `waiver_status`, `stripe_customer_id`, `profile_image_urls`, `membership_levels`, `membership_addons`, `labels`, `join_date`, `renewal_date`, `billing_method`, `auto_recurring_billing_id`, `ip_address`, `is_active`, `last_imported_at`, `created_at`, `updated_at`, `location_id`, `membershipworks_id`, `membership_status`, `membership_level`, `imported_at`, `last_membership_sync_at`, `is_active_member`, `notification_preference`, `notes`.

## adminMember: public.members

Required/proposed maximum (31/35 available): `id, membershipworks_account_id, full_name, first_name, last_name, email, phone, club_location, self_rating, dupr_id, member_comment, waiver_status, profile_image_urls, membership_levels, membership_addons, labels, join_date, renewal_date, is_active, location_id, membershipworks_id, membership_status, membership_level, imported_at, last_membership_sync_at, is_active_member, notification_preference, notes, last_imported_at, created_at, updated_at`.

Excluded: `stripe_customer_id`, `billing_method`, `auto_recurring_billing_id`, `ip_address`.

## roles: public.user_roles

Required/proposed maximum (2/6 available): `member_id, role`.

Excluded: `id`, `user_id`, `created_at`, `updated_at`.

## team: public.teams

Required/proposed maximum (12/14 available): `id, division_id, name, captain_member_id, co_captain_member_id, co_captain_2_member_id, club_pro_member_id, is_active, home_location_id, team_number, notes, abbreviation`.

Excluded: `created_at`, `updated_at`.

## membership: public.team_members

Required/proposed maximum (5/6 available): `id, team_id, member_id, role, is_active`.

Excluded: `created_at`.

## rating: public.member_season_ratings

Required/proposed maximum (5/10 available): `member_id, season_id, season_dupr_rating, season_primetime_rating, dupr_doubles_rating`.

Excluded: `id`, `notes`, `created_at`, `updated_at`, `dupr_reliability_rating`.

## adminRating: public.member_season_ratings

Required/proposed maximum (10/10 available): `id, member_id, season_id, season_dupr_rating, season_primetime_rating, dupr_doubles_rating, dupr_reliability_rating, notes, created_at, updated_at`.

Excluded: None; this group is role/row gated..

## season: public.seasons

Required/proposed maximum (6/8 available): `id, name, start_date, end_date, is_active, abbreviation`.

Excluded: `created_at`, `updated_at`.

## league: public.leagues

Required/proposed maximum (16/18 available): `id, season_id, name, description, is_active, rosters_locked, league_document_bucket, code_of_conduct_pdf_path, captains_guide_pdf_path, league_rules_pdf_path, score_sheet_pdf_path, league_waiver_pdf_path, match_setup_reminder_days_before, abbreviation, flex_league, only_home_community_players`.

Excluded: `created_at`, `updated_at`.

## division: public.divisions

Required/proposed maximum (34/36 available): `id, league_id, name, skill_level, sort_order, is_active, min_dupr, max_dupr, number_of_lines, default_game_format, games_per_line, points_to_win, win_by, third_game_format, picklebreaker_enabled, picklebreaker_points, line_notes, rating_type, standings_win_points, standings_tie_points, standings_loss_points, standings_tiebreak_1, standings_tiebreak_2, standings_tiebreak_3, picklebreaker_win_points, picklebreaker_loss_points, default_lines_config, team_dupr_max, playoff_team_count, score_sheet_template_id, primary_team_type, secondary_number_of_lines, secondary_team_type, flex_league`.

Excluded: `created_at`, `updated_at`.

## divisionLine: public.division_lines

Required/proposed maximum (23/25 available): `id, division_id, line_number, line_name, posted_to_dupr, game_format, games_per_line, points_to_win, win_by, picklebreaker_enabled, picklebreaker_points, line_type, sort_order, picklebreaker_win_points, picklebreaker_loss_points, team_win_points, uses_saved_match_lineups, standings_points_mode, score_type, score_required, picklebreaker_not_played_points, picklebreaker_not_played_award_rule, picklebreaker_play_rule`.

Excluded: `created_at`, `updated_at`.

## location: public.locations

Required/proposed maximum (12/14 available): `id, name, address, city, state, zip_code, number_of_courts, court_notes, club_pros, is_active, club_pro_member_id, club_pro_2_member_id`.

Excluded: `created_at`, `updated_at`.

## match: public.matches

Required/proposed maximum (28/30 available): `id, league_id, division_id, home_team_id, away_team_id, location_id, scheduled_date, scheduled_time, week_number, status, home_score, away_score, notes, published_at, is_published, schedule_setting_id, winning_team_id, score_status, score_entered_by_member_id, score_entered_at, score_verified_by_member_id, score_verified_at, score_disputed, score_dispute_notes, finalized_at, score_exported_at, result_type, result_notes`.

Excluded: `created_at`, `updated_at`.

## matchLine: public.match_lines

Required/proposed maximum (28/30 available): `id, match_id, division_line_id, line_number, home_player_1_id, home_player_2_id, away_player_1_id, away_player_2_id, line_status, home_wins, away_wins, posted_to_dupr, winning_team_id, verification_status, verified_by_member_id, verified_at, home_team_games_won, away_team_games_won, home_team_points, away_team_points, rating_type_at_play, home_player_1_rating_at_play, home_player_2_rating_at_play, away_player_1_rating_at_play, away_player_2_rating_at_play, home_team_rating_at_play, away_team_rating_at_play, ratings_snapshotted_at`.

Excluded: `created_at`, `updated_at`.

## game: public.line_games

Required/proposed maximum (7/9 available): `id, match_line_id, game_number, home_score, away_score, is_picklebreaker, game_status`.

Excluded: `created_at`, `updated_at`.

## lineup: public.match_lineups

Required/proposed maximum (6/8 available): `id, match_id, team_id, line_number, player_1_member_id, player_2_member_id`.

Excluded: `created_at`, `updated_at`.

## bye: public.team_byes

Required/proposed maximum (6/8 available): `id, league_id, division_id, team_id, week_number, bye_date`.

Excluded: `created_at`, `updated_at`.

## standing: public.team_standings

Required/proposed maximum (25/27 available): `id, league_id, division_id, team_id, matches_played, match_wins, match_losses, match_ties, line_wins, line_losses, line_ties, game_wins, game_losses, points_for, points_against, point_differential, standings_points, rank, home_wins, home_losses, away_wins, away_losses, current_streak, recent_form, finalized`.

Excluded: `created_at`, `updated_at`.

## scoreTemplate: public.score_sheet_templates

Required/proposed maximum (8/10 available): `id, name, description, sheet_title, template_html, rules_text, is_default, is_active`.

Excluded: `created_at`, `updated_at`.

## scheduleSetting: public.league_schedule_settings

Required/proposed maximum (17/19 available): `id, league_id, division_id, name, season_start_date, season_end_date, default_match_day, default_match_time, matches_per_team, allow_byes, schedule_status, notes, courts_needed_per_match, lines_playing, games_per_line, every_other_week, actual_schedule_weeks`.

Excluded: `created_at`, `updated_at`.

## courtAvailability: public.location_court_availability

Required/proposed maximum (10/12 available): `id, location_id, day_of_week, specific_date, start_time, end_time, courts_available, is_blackout, notes, courts_unavailable`.

Excluded: `created_at`, `updated_at`.

## blackout: public.league_blackout_dates

Required/proposed maximum (5/7 available): `id, league_id, division_id, blackout_date, reason`.

Excluded: `created_at`, `updated_at`.

## importBatch: public.member_import_batches

Required/proposed maximum (11/11 available): `id, file_name, total_rows, created_at, imported_by_member_id, inactive_members, source, new_members, updated_members, skipped_rows, notes`.

Excluded: None; this group is role/row gated..

## setting: public.system_settings

Required/proposed maximum (2/4 available): `setting_key, setting_value`.

Excluded: `created_at`, `updated_at`.

## Fixed system-setting keys

`club_name, club_short_name, system_name, browser_tab_title, logo_url, main_email, support_email, club_website, membership_url, league_site_url, timezone, email_activated`. No arbitrary setting-key input.

## Authorization-only columns

Normal identity binding additionally reads `user_roles.user_id`; View-As identity comes from the accepted private context, not that Auth mapping. These IDs are internal and not emitted. Relationship IDs in teams/locations/members are read to constrain the result before serialization. No grants on Auth credentials or private View-As credentials are proposed for the new read executor.

## Owner-directed candidate and public-scope override

See [review decisions](lms-0726-review-decisions.md) for exact role/workflow predicates. `candidate` is direct browser output only. `candidateInternal` is server-only derivation/filter input and must NEVER be serialized. Candidate response adds only `ratingType, seasonId, displayRating, hasDuprId, ratingCheckStatus, nrReviewRequired, communityEligibilityStatus`; no raw rating array, RF, email, phone, membership/renewal or location/address row. `displayRating` is one selected division/season value; NR review derives only from the already-used raw-DUPR NR indicator, never RF. Teams global contract requires effective manager. `teamPublic` and `matchPublic` replace private group reuse in shared/published displays.

## Final eligibility-state gate

[Final gate](lms-0726-final-design-gate.md) adds derived `eligibilityStatus` and `validationNeeds` to the candidate DTO. With currently authorized facts, full eligibility is UNKNOWN. Numeric rating, in-range comparison or false raw-DUPR NR flag never implies RATED/CONFIRMED. No RF query or new broad derived-eligibility entitlement. Direct underlying Data API access currently defeats response-only exclusions; DESIGN BLOCKED pending reviewed privilege/dependency/admission correction.

## Security foundation classification

[Foundation field matrix](lms-0726-security-foundation-plan.md) classifies PUBLIC-FIELD/SHARED-AUTH, SELF, TEAM-MANAGED, LOCATION-SCOPED, MANAGER and SERVER-INTERNAL uses. Proposed internal admission RF use is a separately reviewed normal mutation purpose, never candidate output or broadened Ask SELF. Owner policy: unknown required admission facts produce a League-review hold and no membership insert. Candidate discovery remains separate.
