# LMS-0726 current configuration / authoritative admission mapping

**PT9 correction verified and accepted:** [Owner resolution](lms-0726-pt9-owner-resolution.md). MPT 9/WPT 9 now store 3.4–4.8, approved by owner as normalized Season DUPR bounds. Original configuration evidence is historical for those two fields; no active PT9 conflict remains.

Read-only production configuration observed September 8, 2026. No member records read. Exact UUIDs and policies: [evidence](lms-0726-four-blockers-evidence.json); active Rules and ACLs: [Rules evidence](lms-0726-four-blockers-rules-acl.json).

## Every configured division

All 18 returned divisions, all three leagues and both seasons are active. All three leagues have rosters_locked=true. This is operational lock state, not a policy/config conflict. Non-manager roster mutation currently cannot proceed while locked.

| Season | League | Division | Rating column/type | DB individual min–max | Pair max (lineup only) | Home-only | Rules correspondence |
|---|---|---|---|---|---:|---|---|
| 2026 Fall Season | PrimeTime DUPR League | MPT 7 | season_primetime_rating | 2.7–3.8 | 7.1 | false | Bounds correspond only for correctly truncated one-decimal Season ratings |
| 2026 Fall Season | PrimeTime DUPR League | MPT 9 | season_primetime_rating | 3.4–4.8 | 9.1 | false | VERIFIED: owner-approved one-decimal Season DUPR mapping of Rules 3.4–4.899 |
| 2026 Fall Season | PrimeTime DUPR League | WPT 7 | season_primetime_rating | 2.7–3.8 | 7.1 | false | Bounds correspond only for correctly truncated one-decimal Season ratings |
| 2026 Fall Season | PrimeTime DUPR League | WPT 9 | season_primetime_rating | 3.4–4.8 | 9.1 | false | VERIFIED: owner-approved one-decimal Season DUPR mapping of Rules 3.4–4.899 |
| 2026 Fall Season | Weekday DUPR League | MDUPR5 | season_dupr_rating | 2–2.8 | 5.1 | true | Bounds correspond only for correctly truncated one-decimal Season ratings |
| 2026 Fall Season | Weekday DUPR League | MDUPR6 | season_dupr_rating | 2.3–3.3 | 6.1 | true | Bounds correspond only for correctly truncated one-decimal Season ratings |
| 2026 Fall Season | Weekday DUPR League | MDUPR7 | season_dupr_rating | 2.8–3.8 | 7.1 | true | Bounds correspond only for correctly truncated one-decimal Season ratings |
| 2026 Fall Season | Weekday DUPR League | MDUPR8 | season_dupr_rating | 3.3–4.3 | 8.1 | true | Bounds correspond only for correctly truncated one-decimal Season ratings |
| 2026 Fall Season | Weekday DUPR League | MDUPR9 | season_dupr_rating | 3.8–4.8 | 9.1 | true | Bounds correspond only for correctly truncated one-decimal Season ratings |
| 2026 Fall Season | Weekday DUPR League | WDUPR5 | season_dupr_rating | 2–2.8 | 5.1 | true | Bounds correspond only for correctly truncated one-decimal Season ratings |
| 2026 Fall Season | Weekday DUPR League | WDUPR6 | season_dupr_rating | 2.3–3.3 | 6.1 | true | Bounds correspond only for correctly truncated one-decimal Season ratings |
| 2026 Fall Season | Weekday DUPR League | WDUPR7 | season_dupr_rating | 2.8–3.8 | 7.1 | true | Bounds correspond only for correctly truncated one-decimal Season ratings |
| 2026 Fall Season | Weekday DUPR League | WDUPR8 | season_dupr_rating | 3.3–4.3 | 8.1 | true | Bounds correspond only for correctly truncated one-decimal Season ratings |
| 2026 Fall Season | Weekday DUPR League | WDUPR9 | season_dupr_rating | 3.8–4.8 | 9.1 | true | Bounds correspond only for correctly truncated one-decimal Season ratings |
| 26/27 Saturday Season | Saturday DUPR League | SDUPR6 | season_dupr_rating | 2.3–3.3 | 6.1 | true | Bounds correspond only for correctly truncated one-decimal Season ratings |
| 26/27 Saturday Season | Saturday DUPR League | SDUPR7 | season_dupr_rating | 2.8–3.8 | 7.1 | true | Bounds correspond only for correctly truncated one-decimal Season ratings |
| 26/27 Saturday Season | Saturday DUPR League | SDUPR8 | season_dupr_rating | 3.3–4.3 | 8.1 | true | Bounds correspond only for correctly truncated one-decimal Season ratings |
| 26/27 Saturday Season | Saturday DUPR League | SDUPR9 | season_dupr_rating | 3.8–4.8 | 9.1 | true | Bounds correspond only for correctly truncated one-decimal Season ratings |

Fall scope: 2026-10-14 through 2026-12-03. Saturday scope: 2026-10-17 through 2027-03-13. A season start_date is not proof of the separately communicated rating freeze date. Saturday SDUPR5 exists in the Rules table but has no configured division in this result; do not fabricate or create it. Future PrimeTime8/9 rows are not controlling values for current PT9.

Weekday/Saturday maximum 2.8/3.3/3.8/4.3/4.8 matches documented 2.899/3.399/3.899/4.399/4.899 only under Rule 4.2 truncation. Numeric comparison alone cannot establish that stored values carry the correct frozen/adjusted semantics. PrimeTime9 was re-read after the owner correction: both divisions now store 3.4–4.8. The owner explicitly approved this normalized Season DUPR representation of Rules 3.4–4.899. The previous discrepancy is CLOSED; see the owner-correction evidence. Pair maxima currently correspond to Rules, but NR treatment remains separately unresolved.

Home-only=true in Weekday/Saturday is stricter than Rule 3.5 when a legitimate cross-community exception applies. It is not unconditional proof that every same-community addition conflicts; an affected cross-community decision must hold POLICY_CONFIGURATION_CONFLICT until League review settles the controlling setting. PrimeTime false does not prove every cross-community case passes Rule 3.5.

## Condition matrix (applies to every division above unless narrowed)

S=selected team's division.league.season; L=selected league; D=selected division. Y=machine-enforceable fact now; PARTIAL=structured operand exists but full policy decision lacks an authoritative mapping; U=required decision not safely represented. No SQL PDF parsing or copied numeric policy constants.

| Condition | Controlling source | Current database representation | Season | League | Division | Deterministic enforcement now |
|---|---|---|---|---|---|---|
| Actor/team scope | Accepted roles + current managed-team policy | user_roles.user_id/member_id/role; teams captain/co-captains/club_pro IDs | Through team | Through D | Exact team D | Y; assigned only or LM/Commissioner; no location-only mutation |
| Candidate identity | Existing members identity | members.id | Global identity | All | All | Y existence; authorization first |
| Active member | Membership system / existing product status | members.is_active_member; membership_status, renewal_date, last_membership_sync_at | Current status, not frozen | All | All | PARTIAL: false denies active-member workflow; true/null alone does not certify all Rule3.1 obligations |
| DUPR identity | Rule3.2 | members.dupr_id | Global; selected season applicability | All DUPR | All | PARTIAL: presence known, valid account verification not modeled; missing required fact holds |
| Individual Season DUPR | Rules4.1/4.2/4.7/4.8 | member_season_ratings.season_id + season_dupr_rating | Exact S | Weekday/Saturday | D.rating_type=dupr | PARTIAL: selected numeric operand available; freeze/exception/normalization provenance not fully represented |
| PrimeTime Season rating | Rules4.3/6.3.2 | member_season_ratings.season_primetime_rating | Exact S | PrimeTime | D.rating_type=primetime | PARTIAL: number present, age-based fallback/NR provenance not encoded |
| Individual bounds | Rules division tables / intended division settings | divisions.min_dupr,max_dupr,rating_type | Via L | Exact L | Exact D | Y for verified PT9 structured bounds 3.4–4.8 under approved one-decimal semantics; full candidate admission still requires verified Rated/NR/frozen context |
| Raw NR classification | Rule4.5 | member_season_ratings.dupr_doubles_rating | Exact S | All DUPR | All | PARTIAL: raw text/number can record NR; no structured authoritative policy mode/version |
| RF-derived NR | Rule4.1.1 | member_season_ratings.dupr_reliability_rating | Exact S | All DUPR | All | PARTIAL: protected operand exists; threshold/precedence not structured config. Do not copy 29 into Add SQL |
| NR any-division placement | Rule4.5 | No explicit NR admission mode/config | S | All DUPR | All | U; do not infer Rated from numeric Season DUPR or reject NR under Rated bounds |
| NR adjusted pair value / highest adjustment | Rules4.5.1/4.5.2 | Numeric Season ratings, no dedicated policy/provenance encoding | S across relevant divisions | Applicable leagues | Relevant Ds | U for full derived decision; LINEUP stage, not an Add prerequisite just because pair unknown |
| Season-start community | Rule3.4 | members.location_id/club_location; teams.home_location_id | No season-start snapshot | All | D | U for frozen community fact; current location alone insufficient |
| Own-community team and availability | Rule3.5 | teams.home_location_id/division_id; team_members | S | L | D | PARTIAL: team exists computable; availability not represented by authoritative cap/status |
| Home-only restriction | Intended league setting versus Rule3.5 | leagues.only_home_community_players | S | L | All child Ds | Boolean Y; policy compatibility PARTIAL, affected cross-community conflict holds |
| Multiple teams/community restriction | Rule3.7 | team_members/team/location graph | S | L | Across applicable Ds | PARTIAL; graph exists, season community authority missing; no blanket single-team rule |
| Duplicate | Current roster uniqueness | UNIQUE(team_id,member_id) | Exact team | Exact team | Exact team | Y; ALREADY_ON_ROSTER, not eligibility recertification |
| Roster lock | Existing workflow config | leagues.rosters_locked | S | L | All child Ds | Y; false permits ordinary authority, true only existing LM/Commissioner exception |
| Season/team state | Existing hierarchy/status workflow | seasons/leagues/divisions/teams.is_active; hierarchy FKs | S | L | D | Y for existence/status facts; no new removal ban inferred from season dates |
| Waiver | Rule3.1 | members.waiver_status text | No reviewed season acceptance provenance | All | All | PARTIAL; vocabulary/source freshness and roster-vs-participation stage not frozen |
| DUPR club membership | Rule3.3 | No dedicated verified membership field | S applicability | All DUPR | All | U; labels/membership_levels are not proof of DUPR-club membership |
| PrimeTime age | Rule6.3.2 | No DOB/verified season-age field or configurable age/reference rule in inventoried schema | Dec31 S starting year | PrimeTime | All PT | U; age-required admission holds, no email/profile disclosure |
| Gender/format eligibility | Men/women division and match format Rules | Names + primary/secondary_team_type, no verified member gender eligibility field | S | Relevant L | Relevant D | U where required; never infer eligibility from name |
| Ban/suspension | Rule4.4 | No structured season admission ban decision identified; notes not authority | Relevant interval | All | All | U if needed; do not certify absence from free text |
| Pair sum | Rule4.6 | divisions.team_dupr_max + actual selected pair | S | L | D | N/A ADD; numeric LINEUP partial until NR policy resolved |
| Prior championship participation | Championship clauses | matches/match_lines participants and match history | Same regular season | Applicable L | Same D | N/A ordinary ADD; lineup/match stage must resolve qualifying history |
| Capacity | Match-format player/line counts | divisions.number_of_lines etc. | S | L | D | N/A new roster cap; match staffing count does not establish maximum roster size |

## Single source of structured policy

No approved structured registry currently binds all of these rules to the configuration. Existing Ask LWR document interpretation is not a transactional admission-policy store and must not be called during Add. Proposed minimum design: a private, versioned policy-binding record per season/league/division, referencing the active Rules version and existing configuration revision/hash; it records reviewed applicability/requirement stages and validation status (VERIFIED, UNMAPPED, CONFLICT). It references existing min/max rather than duplicating them. Any required unrepresented decision remains REVIEW_REQUIRED. A binding change must be an authorized League configuration workflow, not browser assertion. This is an additional schema/design decision, not implemented or implicitly approved.

RF threshold, NR placement/adjustment and age rules need one reviewed structured configuration if automatic decisions are desired; until then unknown holds. Do not put a second copy in Add, Match Setup, a client helper or a new PDF parser. When a configured relevant value differs from its reviewed binding/version, return POLICY_CONFIGURATION_CONFLICT; when there is no verified binding, REVIEW_REQUIRED. Known conflicts cannot become an automatic manager bypass. No broad eligibility-complete claim is possible from the present schema.


