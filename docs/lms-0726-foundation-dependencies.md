# LMS-0726 protected read/write dependency manifest

Design evidence, not migrated code. Exact selectors, payload expressions, filters and RPC calls are preserved. Server-route calls are separated from direct browser/shared-helper consumers. The role/scope and replacement operation families are specified in the foundation plan. RPCs may be reads or maintenance: listing is not permission to call them. Storage operations are marked separately. Import reachability is static; dynamic/runtime paths remain a verification gate.

## Reads

### D001 — lwrpc-admin/app/AdminDashboardClient.js:240

Object: `"seasons"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/AdminDashboardClient.js`, `lwrpc-admin/app/page.js`

```js
supabase.from("seasons").select("id, name").order("name", { ascending: true })
```

### D002 — lwrpc-admin/app/AdminDashboardClient.js:241

Object: `"leagues"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/AdminDashboardClient.js`, `lwrpc-admin/app/page.js`

```js
supabase.from("leagues").select("id, name, season_id, seasons(name)").order("name", { ascending: true })
```

### D003 — lwrpc-admin/app/AdminDashboardClient.js:242

Object: `"divisions"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/AdminDashboardClient.js`, `lwrpc-admin/app/page.js`

```js
supabase.from("divisions").select("id, name, league_id, is_active, rating_type, leagues(name, season_id, is_active, seasons(name, is_active))").order("name", { ascending: true })
```

### D004 — lwrpc-admin/app/AdminDashboardClient.js:253

Object: `"leagues"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/AdminDashboardClient.js`, `lwrpc-admin/app/page.js`

```js
supabase
      .from("leagues")
      .select("id, name, is_active, league_document_bucket, code_of_conduct_pdf_path, captains_guide_pdf_path, league_rules_pdf_path, score_sheet_pdf_path, league_waiver_pdf_path")
      .ilike("name", "%weekday%")
      .order("is_active", { ascending: false })
      .order("name", { ascending: true })
      .limit(1)
      .maybeSingle()
```

### D005 — lwrpc-admin/app/AdminDashboardClient.js:365

Object: `"seasons"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/AdminDashboardClient.js`, `lwrpc-admin/app/page.js`

```js
supabase
      .from("seasons")
      .select("id, name, is_active, start_date, end_date")
      .order("name", { ascending: true })
```

### D006 — lwrpc-admin/app/AdminDashboardClient.js:388

Object: `"members"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/AdminDashboardClient.js`, `lwrpc-admin/app/page.js`

```js
supabase
            .from("members")
            .select("id, first_name, last_name, email, phone, club_location, dupr_id, renewal_date, profile_image_urls")
            .eq("id", user.memberId)
            .maybeSingle()
```

### D007 — lwrpc-admin/app/AdminDashboardClient.js:1016

Object: `"team_standings"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/AdminDashboardClient.js`, `lwrpc-admin/app/page.js`

```js
supabase
      .from("team_standings")
      .select("*, teams(id, name, abbreviation, is_active)")
      .eq("division_id", divisionId)
      .order("rank", { ascending: true })
```

### D008 — lwrpc-admin/app/AdminDashboardClient.js:1037

Object: `"teams"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/AdminDashboardClient.js`, `lwrpc-admin/app/page.js`

```js
supabase.from("teams").select("id, name, division_id, locations(id, name)").eq("division_id", divisionId).eq("is_active", true).order("name")
```

### D009 — lwrpc-admin/app/AdminDashboardClient.js:1038

Object: `"matches"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/AdminDashboardClient.js`, `lwrpc-admin/app/page.js`

```js
supabase.from("matches").select("id, division_id, home_team_id, away_team_id, scheduled_date, scheduled_time, week_number, status, score_status, home_score, away_score, winning_team_id, result_type, result_notes, is_published, locations(id, name), home_team:teams!matches_home_team_id_fkey(id, name), away_team:teams!matches_away_team_id_fkey(id, name), match_lines(id, line_number, home_team_games_won, away_team_games_won, winning_team_id, home_player_1:members!match_lines_home_player_1_id_fkey(id, first_name, last_name, full_name, self_rating), home_player_2:members!match_lines_home_player_2_id_fkey(id, first_name, last_name, full_name, self_rating), away_player_1:members!match_lines_away_player_1_id_fkey(id, first_name, last_name, full_name, self_rating), away_player_2:members!match_lines_away_player_2_id_fkey(id, first_name, last_name, full_name, self_rating), line_games(id, game_number, home_score, away_score, game_status))").eq("division_id", divisionId).eq("is_published", true).order("scheduled_date").order("scheduled_time")
```

### D010 — lwrpc-admin/app/AdminDashboardClient.js:1039

Object: `"team_byes"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/AdminDashboardClient.js`, `lwrpc-admin/app/page.js`

```js
supabase.from("team_byes").select("id, team_id, division_id, week_number, bye_date").eq("division_id", divisionId).order("bye_date")
```

### D011 — lwrpc-admin/app/AdminDashboardClient.js:1040

Object: `"team_standings"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/AdminDashboardClient.js`, `lwrpc-admin/app/page.js`

```js
supabase.from("team_standings").select("team_id, rank, standings_points, match_wins, match_losses").eq("division_id", divisionId)
```

### D012 — lwrpc-admin/app/AdminDashboardClient.js:1041

Object: `"member_season_ratings"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/AdminDashboardClient.js`, `lwrpc-admin/app/page.js`

```js
supabase.from("member_season_ratings").select("member_id, season_dupr_rating, season_primetime_rating").eq("season_id", seasonId)
```

### D013 — lwrpc-admin/app/AdminDashboardClient.js:2228

Object: `"leagues"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/AdminDashboardClient.js`, `lwrpc-admin/app/page.js`

```js
supabase
      .from("leagues")
      .select(`
        id,
        season_id,
        seasons (
          id,
          start_date,
          end_date
        )
      `)
```

### D014 — lwrpc-admin/app/AdminDashboardClient.js:2239

Object: `"divisions"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/AdminDashboardClient.js`, `lwrpc-admin/app/page.js`

```js
supabase
      .from("divisions")
      .select("id, league_id")
```

### D015 — lwrpc-admin/app/AdminDashboardClient.js:2310

Object: `"teams"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/AdminDashboardClient.js`, `lwrpc-admin/app/page.js`

```js
supabase
    .from("teams")
    .select(`
      id,
      name,
      division_id,
      home_location_id,
      is_active,
      locations (
        id,
        name
      ),
      divisions!inner (
        id,
        name,
        league_id,
        leagues (
          id,
          name,
          season_id
        )
      )
    `)
    .in("divisions.league_id", scopeData.leagueIds)
    .or("is_active.eq.true,is_active.is.null")
```

### D016 — lwrpc-admin/app/AdminDashboardClient.js:2353

Object: `"matches"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/AdminDashboardClient.js`, `lwrpc-admin/app/page.js`

```js
supabase
    .from("matches")
    .select(`
      id,
      league_id,
      division_id,
      location_id,
      week_number,
      scheduled_date,
      status,
      score_status,
      locations (
        id,
        name
      )
    `)
    .in("league_id", scopeData.leagueIds)
    .order("scheduled_date", { ascending: true })
```

### D017 — lwrpc-admin/app/AdminDashboardClient.js:2389

Object: `"matches"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/AdminDashboardClient.js`, `lwrpc-admin/app/page.js`

```js
supabase
    .from("matches")
    .select(`
      id,
      league_id,
      division_id,
      week_number,
      scheduled_date,
      scheduled_time,
      status,
      score_status,
      score_entered_at,
      score_verified_at,
      home_team:teams!matches_home_team_id_fkey (
        id,
        name
      ),
      away_team:teams!matches_away_team_id_fkey (
        id,
        name
      ),
      leagues (
        id,
        name
      ),
      divisions (
        id,
        name
      ),
      locations (
        id,
        name
      )
    `)
    .in("league_id", scopeData.leagueIds)
    .order("scheduled_date", { ascending: true })
    .order("scheduled_time", { ascending: true })
```

### D018 — lwrpc-admin/app/AdminDashboardClient.js:2459

Object: `"team_standings"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/AdminDashboardClient.js`, `lwrpc-admin/app/page.js`

```js
supabase
    .from("team_standings")
    .select(`
      id,
      league_id,
      division_id,
      team_id,
      rank,
      match_wins,
      match_losses,
      match_ties,
      standings_points,
      point_differential,
      teams (
        id,
        name,
        is_active
      ),
      leagues (
        id,
        name
      ),
      divisions (
        id,
        name
      )
    `)
    .in("league_id", scopeData.leagueIds)
    .order("rank", { ascending: true })
```

### D019 — lwrpc-admin/app/AdminDashboardClient.js:2524

Object: `"line_games"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/AdminDashboardClient.js`, `lwrpc-admin/app/page.js`

```js
supabase
    .from("line_games")
    .select(`
      id,
      match_lines!inner(
        matches!inner(
          league_id,
          division_id,
          score_status
        )
      )
    `, { count: "exact", head: true })
    .in("match_lines.matches.league_id", scopeData.leagueIds)
    .eq("match_lines.matches.score_status", "verified")
    .or("home_score.not.is.null,away_score.not.is.null,game_status.not.is.null")
```

### D020 — lwrpc-admin/app/AdminDashboardClient.js:2557

Object: `"team_members"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/AdminDashboardClient.js`, `lwrpc-admin/app/page.js`

```js
supabase
    .from("team_members")
    .select("team_id, member_id")
    .in("team_id", teamIds)
```

### D021 — lwrpc-admin/app/AdminDashboardClient.js:2573

Object: `"member_season_ratings"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/AdminDashboardClient.js`, `lwrpc-admin/app/page.js`

```js
supabase
    .from("member_season_ratings")
    .select("member_id, season_id, dupr_doubles_rating, season_dupr_rating, season_primetime_rating")
    .in("season_id", seasonIds)
```

### D022 — lwrpc-admin/app/api/admin/delete-member/route.js:34

Object: `"members"`; operation: `select`; server-route.

Browser consumers: None found through static imports; retain as server/helper dependency.

```js
authorization.supabase
      .from("members")
      .select("id, email, is_active_member, profile_image_urls")
      .eq("id", memberId)
      .maybeSingle()
```

### D023 — lwrpc-admin/app/api/admin/delete-member/route.js:56

Object: `"user_roles"`; operation: `select`; server-route.

Browser consumers: None found through static imports; retain as server/helper dependency.

```js
authorization.supabase
      .from("user_roles")
      .select("user_id, role")
      .eq("member_id", memberId)
```

### D024 — lwrpc-admin/app/api/admin/delete-member/route.js:64

Object: `"user_roles"`; operation: `select`; server-route.

Browser consumers: None found through static imports; retain as server/helper dependency.

```js
authorization.supabase
        .from("user_roles")
        .select("id")
        .eq("role", "commissioner")
        .neq("member_id", memberId)
        .limit(1)
```

### D025 — lwrpc-admin/app/api/admin/delete-member/route.js:87

Object: `"user_roles"`; operation: `select`; server-route.

Browser consumers: None found through static imports; retain as server/helper dependency.

```js
authorization.supabase
        .from("user_roles")
        .select("id")
        .eq("user_id", authUserId)
        .neq("member_id", memberId)
        .limit(1)
```

### D026 — lwrpc-admin/app/api/admin/member-directory/route.js:95

Object: `"user_roles"`; operation: `select`; server-route.

Browser consumers: None found through static imports; retain as server/helper dependency.

```js
authorization.supabase
        .from("user_roles")
        .select("id, member_id, role")
        .in("member_id", memberIds)
```

### D027 — lwrpc-admin/app/api/admin/member-last-login/route.js:33

Object: `"members"`; operation: `select`; server-route.

Browser consumers: None found through static imports; retain as server/helper dependency.

```js
authorization.supabase
      .from("members")
      .select("email")
      .eq("id", memberId)
      .maybeSingle()
```

### D028 — lwrpc-admin/app/api/ai-assistant/documents/route.js:116

Object: `"seasons"`; operation: `select`; server-route.

Browser consumers: None found through static imports; retain as server/helper dependency.

```js
supabase.from("seasons").select("id, name, is_active").order("name")
```

### D029 — lwrpc-admin/app/api/ai-assistant/documents/route.js:117

Object: `"leagues"`; operation: `select`; server-route.

Browser consumers: None found through static imports; retain as server/helper dependency.

```js
supabase.from("leagues").select("id, name, season_id, is_active").order("name")
```

### D030 — lwrpc-admin/app/api/ai-assistant/documents/route.js:118

Object: `"divisions"`; operation: `select`; server-route.

Browser consumers: None found through static imports; retain as server/helper dependency.

```js
supabase.from("divisions").select("id, name, league_id, is_active").order("name")
```

### D031 — lwrpc-admin/app/api/ai-assistant/documents/route.js:161

Object: `"seasons"`; operation: `select`; server-route.

Browser consumers: None found through static imports; retain as server/helper dependency.

```js
supabase.from("seasons").select("id").eq("id", metadata.season_id).maybeSingle()
```

### D032 — lwrpc-admin/app/api/ai-assistant/documents/route.js:162

Object: `"leagues"`; operation: `select`; server-route.

Browser consumers: None found through static imports; retain as server/helper dependency.

```js
supabase.from("leagues").select("id, season_id").eq("id", metadata.league_id).maybeSingle()
```

### D033 — lwrpc-admin/app/api/ai-assistant/documents/route.js:163

Object: `"divisions"`; operation: `select`; server-route.

Browser consumers: None found through static imports; retain as server/helper dependency.

```js
supabase.from("divisions").select("id, league_id").eq("id", metadata.division_id).maybeSingle()
```

### D034 — lwrpc-admin/app/api/ai-assistant/documents/route.js:170

Object: `"leagues"`; operation: `select`; server-route.

Browser consumers: None found through static imports; retain as server/helper dependency.

```js
supabase.from("leagues").select("id, season_id").eq("id", divisionResult.data.league_id).maybeSingle()
```

### D035 — lwrpc-admin/app/api/ai-insights/route.js:61

Object: `"members"`; operation: `select`; server-route.

Browser consumers: None found through static imports; retain as server/helper dependency.

```js
supabase
    .from("members")
    .select("id, email, is_active_member, created_at, user_roles(role)")
    .eq("email", userData.user.email)
    .order("created_at", { ascending: true })
```

### D036 — lwrpc-admin/app/api/ai-insights/route.js:153

Object: `"members"`; operation: `select`; server-route.

Browser consumers: None found through static imports; retain as server/helper dependency.

```js
supabase
      .from("members")
      .select("id, first_name, last_name, email, phone, dupr_id, is_active_member, created_at, user_roles(role)")
      .order("last_name", { ascending: true })
```

### D037 — lwrpc-admin/app/api/ai-insights/route.js:157

Object: `"seasons"`; operation: `select`; server-route.

Browser consumers: None found through static imports; retain as server/helper dependency.

```js
supabase.from("seasons").select("id, name, is_active").order("name", { ascending: true })
```

### D038 — lwrpc-admin/app/api/ai-insights/route.js:158

Object: `"leagues"`; operation: `select`; server-route.

Browser consumers: None found through static imports; retain as server/helper dependency.

```js
supabase.from("leagues").select("id, name, season_id, is_active, seasons(id, name, is_active)").order("name", { ascending: true })
```

### D039 — lwrpc-admin/app/api/ai-insights/route.js:159

Object: `"divisions"`; operation: `select`; server-route.

Browser consumers: None found through static imports; retain as server/helper dependency.

```js
supabase
      .from("divisions")
      .select("id, name, league_id, number_of_lines, min_dupr, max_dupr, team_dupr_max, is_active, leagues(id, name, season_id, seasons(id, name, is_active))")
      .order("sort_order", { ascending: true })
```

### D040 — lwrpc-admin/app/api/ai-insights/route.js:163

Object: `"teams"`; operation: `select`; server-route.

Browser consumers: None found through static imports; retain as server/helper dependency.

```js
supabase
      .from("teams")
      .select(`
        id,
        name,
        division_id,
        is_active,
        captain_member_id,
        co_captain_member_id,
        co_captain_2_member_id,
        divisions(id, name, leagues(id, name, seasons(id, name, is_active))),
        captain:members!teams_captain_member_id_fkey(id, first_name, last_name, email, phone),
        co_captain_1:members!teams_co_captain_member_id_fkey(id, first_name, last_name, email, phone),
        co_captain_2:members!teams_co_captain_2_member_id_fkey(id, first_name, last_name, email, phone)
      `)
      .order("name", { ascending: true })
```

### D041 — lwrpc-admin/app/api/ai-insights/route.js:179

Object: `"team_members"`; operation: `select`; server-route.

Browser consumers: None found through static imports; retain as server/helper dependency.

```js
supabase
      .from("team_members")
      .select("id, team_id, member_id, teams(id, name, is_active, division_id), members(id, first_name, last_name, email, is_active_member)")
      .limit(5000)
```

### D042 — lwrpc-admin/app/api/ai-insights/route.js:183

Object: `"member_season_ratings"`; operation: `select`; server-route.

Browser consumers: None found through static imports; retain as server/helper dependency.

```js
supabase
      .from("member_season_ratings")
      .select("id, member_id, season_id, dupr_doubles_rating, season_dupr_rating, season_primetime_rating, notes")
      .limit(5000)
```

### D043 — lwrpc-admin/app/api/ai-insights/route.js:187

Object: `"matches"`; operation: `select`; server-route.

Browser consumers: None found through static imports; retain as server/helper dependency.

```js
supabase
      .from("matches")
      .select(`
        id,
        league_id,
        division_id,
        home_team_id,
        away_team_id,
        scheduled_date,
        scheduled_time,
        week_number,
        status,
        score_status,
        is_published,
        home_score,
        away_score,
        score_entered_at,
        score_verified_at,
        divisions(id, name, number_of_lines, leagues(id, name, seasons(id, name, is_active))),
        home_team:teams!matches_home_team_id_fkey(id, name),
        away_team:teams!matches_away_team_id_fkey(id, name)
      `)
      .order("scheduled_date", { ascending: false })
      .limit(400)
```

### D044 — lwrpc-admin/app/api/ai-insights/route.js:211

Object: `"match_lineups"`; operation: `select`; server-route.

Browser consumers: None found through static imports; retain as server/helper dependency.

```js
supabase
      .from("match_lineups")
      .select("id, match_id, team_id, line_number, player_1_member_id, player_2_member_id")
      .limit(8000)
```

### D045 — lwrpc-admin/app/api/ai-insights/route.js:215

Object: `"team_standings"`; operation: `select`; server-route.

Browser consumers: None found through static imports; retain as server/helper dependency.

```js
supabase
      .from("team_standings")
      .select("id, team_id, division_id, match_wins, match_losses, standings_points, rank, teams(id, name), divisions(id, name)")
      .limit(2000)
```

### D046 — lwrpc-admin/app/api/brevo-diagnostics/route.js:28

Object: `"members"`; operation: `select`; server-route.

Browser consumers: None found through static imports; retain as server/helper dependency.

```js
adminClient()
    .from("members")
    .select("id, email, user_roles(role)")
    .eq("email", userData.user.email)
    .maybeSingle()
```

### D047 — lwrpc-admin/app/api/league-communications/route.js:9

Object: `"members"`; operation: `select`; server-route.

Browser consumers: None found through static imports; retain as server/helper dependency.

```js
supabase.from("members").select("id,email,user_roles(role)").eq("email",data.user.email).maybeSingle()
```

### D048 — lwrpc-admin/app/api/league-communications/route.js:10

Object: `"seasons"`; operation: `select`; server-route.

Browser consumers: None found through static imports; retain as server/helper dependency.

```js
s.from("seasons").select("id,name").order("name")
```

### D049 — lwrpc-admin/app/api/league-communications/route.js:10

Object: `"leagues"`; operation: `select`; server-route.

Browser consumers: None found through static imports; retain as server/helper dependency.

```js
s.from("leagues").select("id,name,season_id,seasons(name)").order("name")
```

### D050 — lwrpc-admin/app/api/league-communications/route.js:10

Object: `"divisions"`; operation: `select`; server-route.

Browser consumers: None found through static imports; retain as server/helper dependency.

```js
s.from("divisions").select("id,name,league_id,leagues(season_id,seasons(is_active,start_date,end_date))").order("name")
```

### D051 — lwrpc-admin/app/api/league-communications/route.js:12

Object: `"members"`; operation: `select`; server-route.

Browser consumers: None found through static imports; retain as server/helper dependency.

```js
s.from("members").select("email").eq("is_active_member",true).not("email","is",null)
```

### D052 — lwrpc-admin/app/api/league-communications/route.js:12

Object: `"teams"`; operation: `select`; server-route.

Browser consumers: None found through static imports; retain as server/helper dependency.

```js
s.from("teams").select("id,captain_member_id,co_captain_member_id,co_captain_2_member_id,club_pro_member_id").in("division_id",ids).eq("is_active",true)
```

### D053 — lwrpc-admin/app/api/league-communications/route.js:12

Object: `"team_members"`; operation: `select`; server-route.

Browser consumers: None found through static imports; retain as server/helper dependency.

```js
s.from("team_members").select("member_id").in("team_id",teamIds)
```

### D054 — lwrpc-admin/app/api/league-communications/route.js:12

Object: `"members"`; operation: `select`; server-route.

Browser consumers: None found through static imports; retain as server/helper dependency.

```js
s.from("members").select("email").in("id",[...new Set(memberIds)]).eq("is_active_member",true).not("email","is",null)
```

### D055 — lwrpc-admin/app/api/match-lineups/route.js:90

Object: `"members"`; operation: `select`; server-route.

Browser consumers: None found through static imports; retain as server/helper dependency.

```js
supabase
      .from("members")
      .select("id, email, is_active_member, user_roles(role)")
      .eq("email", userData.user.email)
      .order("created_at", { ascending: true })
```

### D056 — lwrpc-admin/app/api/match-lineups/route.js:101

Object: `"matches"`; operation: `select`; server-route.

Browser consumers: None found through static imports; retain as server/helper dependency.

```js
supabase
      .from("matches")
      .select(`
        id,
        home_team_id,
        away_team_id,
        leagues (
          season_id
        ),
        divisions (
          id,
          number_of_lines,
          primary_team_type,
          secondary_number_of_lines,
          secondary_team_type,
          rating_type,
          min_dupr,
          max_dupr,
          team_dupr_max
        )
      `)
      .eq("id", matchId)
      .single()
```

### D057 — lwrpc-admin/app/api/match-lineups/route.js:137

Object: `"teams"`; operation: `select`; server-route.

Browser consumers: None found through static imports; retain as server/helper dependency.

```js
supabase
      .from("teams")
      .select("id, captain_member_id, co_captain_member_id, co_captain_2_member_id, club_pro_member_id")
      .eq("id", teamId)
      .single()
```

### D058 — lwrpc-admin/app/api/match-lineups/route.js:172

Object: `"team_members"`; operation: `select`; server-route.

Browser consumers: None found through static imports; retain as server/helper dependency.

```js
supabase
        .from("team_members")
        .select("member_id, members(id, first_name, last_name, self_rating)")
        .eq("team_id", teamId)
        .in("member_id", playerIds)
```

### D059 — lwrpc-admin/app/api/match-lineups/route.js:195

Object: `"member_season_ratings"`; operation: `select`; server-route.

Browser consumers: None found through static imports; retain as server/helper dependency.

```js
supabase
          .from("member_season_ratings")
          .select("member_id, season_dupr_rating, season_primetime_rating")
          .eq("season_id", seasonId)
          .in("member_id", playerIds)
```

### D060 — lwrpc-admin/app/api/match-lineups/route.js:313

Object: `"match_lineups"`; operation: `select`; server-route.

Browser consumers: None found through static imports; retain as server/helper dependency.

```js
supabase
      .from("match_lineups")
      .upsert(rows, {
        onConflict: "match_id,team_id,line_number",
      })
      .select("match_id, team_id, line_number, player_1_member_id, player_2_member_id")
```

### D061 — lwrpc-admin/app/api/match-setup-reminders/route.js:63

Object: `"members"`; operation: `select`; server-route.

Browser consumers: None found through static imports; retain as server/helper dependency.

```js
supabase
      .from("members")
      .select("id, email, user_roles(role)")
      .eq("email", userData.user.email)
      .maybeSingle()
```

### D062 — lwrpc-admin/app/api/member-password-reset-check/route.js:88

Object: `"members"`; operation: `select`; server-route.

Browser consumers: None found through static imports; retain as server/helper dependency.

```js
supabase
      .from("members")
      .select("id, is_active_member")
      .eq("email", normalizedEmail)
      .order("created_at", { ascending: true })
```

### D063 — lwrpc-admin/app/api/member-password-reset-check/route.js:215

Object: `"members"`; operation: `select`; server-route.

Browser consumers: None found through static imports; retain as server/helper dependency.

```js
supabase
    .from("members")
    .select("id, is_active_member, created_at, user_roles(role)")
    .eq("email", userData.user.email)
    .order("created_at", { ascending: true })
```

### D064 — lwrpc-admin/app/api/notification-template-history/route.js:60

Object: `"members"`; operation: `select`; server-route.

Browser consumers: None found through static imports; retain as server/helper dependency.

```js
supabase
    .from("members")
    .select("id, email, user_roles(role)")
    .eq("email", userData.user.email)
    .maybeSingle()
```

### D065 — lwrpc-admin/app/api/notification-templates/route.js:143

Object: `"members"`; operation: `select`; server-route.

Browser consumers: None found through static imports; retain as server/helper dependency.

```js
supabase
      .from("members")
      .select("id, email, user_roles(role)")
      .eq("email", userData.user.email)
      .maybeSingle()
```

### D066 — lwrpc-admin/app/api/notifications/route.js:59

Object: `"members"`; operation: `select`; server-route.

Browser consumers: None found through static imports; retain as server/helper dependency.

```js
supabase
    .from("members")
    .select("id, email, is_active_member, created_at, user_roles(role)")
    .eq("email", userData.user.email)
    .order("created_at", { ascending: true })
```

### D067 — lwrpc-admin/app/api/round-robin/action/route.js:371

Object: `"members"`; operation: `select`; server-route.

Browser consumers: None found through static imports; retain as server/helper dependency.

```js
supabase
    .from("members")
    .select("id, email, is_active_member, created_at, user_roles(role)")
    .eq("email", userData.user.email)
    .order("created_at", { ascending: true })
```

### D068 — lwrpc-admin/app/api/round-robin/admin/route.js:224

Object: `"members"`; operation: `select`; server-route.

Browser consumers: None found through static imports; retain as server/helper dependency.

```js
supabase
    .from("members")
    .select("id, email, is_active_member, created_at, user_roles(role)")
    .eq("email", userData.user.email)
    .order("created_at", { ascending: true })
```

### D069 — lwrpc-admin/app/api/round-robin/admin/route.js:257

Object: `"members"`; operation: `select`; server-route.

Browser consumers: None found through static imports; retain as server/helper dependency.

```js
supabase
      .from("members")
      .select("id, full_name, first_name, last_name, email, phone, dupr_id, is_active_member")
      .or("is_active_member.eq.true,is_active_member.is.null")
      .order("first_name", { ascending: true })
      .order("last_name", { ascending: true })
      .range(from, from + pageSize - 1)
```

### D070 — lwrpc-admin/app/api/score-notification/route.js:62

Object: `"members"`; operation: `select`; server-route.

Browser consumers: None found through static imports; retain as server/helper dependency.

```js
supabase
    .from("members")
    .select("id, email, is_active_member, created_at, user_roles(role)")
    .eq("email", userData.user.email)
    .order("created_at", { ascending: true })
```

### D071 — lwrpc-admin/app/api/season-rollover/route.js:51

Object: `"seasons"`; operation: `select`; server-route.

Browser consumers: None found through static imports; retain as server/helper dependency.

```js
supabase
      .from("seasons")
      .select("id")
      .eq("id", sourceSeasonId)
      .maybeSingle()
```

### D072 — lwrpc-admin/app/api/season-rollover/route.js:59

Object: `"seasons"`; operation: `select`; server-route.

Browser consumers: None found through static imports; retain as server/helper dependency.

```js
supabase
      .from("seasons")
      .select("id")
      .eq("name", name)
      .maybeSingle()
```

### D073 — lwrpc-admin/app/api/season-rollover/route.js:67

Object: `"seasons"`; operation: `select`; server-route.

Browser consumers: None found through static imports; retain as server/helper dependency.

```js
supabase
      .from("seasons")
      .insert({
        name,
        abbreviation: String(body.abbreviation || "").trim() || null,
        start_date: body.startDate || null,
        end_date: body.endDate || null,
        is_active: true,
        updated_at: new Date().toISOString(),
      })
      .select("id")
      .single()
```

### D074 — lwrpc-admin/app/api/season-rollover/route.js:81

Object: `"leagues"`; operation: `select`; server-route.

Browser consumers: None found through static imports; retain as server/helper dependency.

```js
supabase
      .from("leagues")
      .select("*")
      .eq("season_id", sourceSeasonId)
      .order("name")
```

### D075 — lwrpc-admin/app/api/system-settings/route.js:60

Object: `"members"`; operation: `select`; server-route.

Browser consumers: None found through static imports; retain as server/helper dependency.

```js
supabase
    .from("members")
    .select("id, email, user_roles(role)")
    .eq("email", userData.user.email)
    .maybeSingle()
```

### D076 — lwrpc-admin/app/api/teams/delete/route.js:30

Object: `"teams"`; operation: `select`; server-route.

Browser consumers: None found through static imports; retain as server/helper dependency.

```js
authorization.supabase
      .from("teams")
      .delete()
      .eq("id", teamId)
      .select("id")
      .maybeSingle()
```

### D077 — lwrpc-admin/app/api/tournaments/action/route.js:702

Object: `"divisions"`; operation: `select`; server-route.

Browser consumers: None found through static imports; retain as server/helper dependency.

```js
supabase
      .from("divisions")
      .select("id, name, sort_order, is_active")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true })
```

### D078 — lwrpc-admin/app/api/tournaments/action/route.js:976

Object: `"teams"`; operation: `select`; server-route.

Browser consumers: None found through static imports; retain as server/helper dependency.

```js
supabase
    .from("teams")
    .select(`
      id,
      name,
      divisions (
        id,
        name,
        team_dupr_max
      )
    `)
    .eq("id", sourceTeamId)
    .single()
```

### D079 — lwrpc-admin/app/api/tournaments/action/route.js:1203

Object: `"divisions"`; operation: `select`; server-route.

Browser consumers: None found through static imports; retain as server/helper dependency.

```js
supabase
    .from("divisions")
    .select("name, team_dupr_max")
```

### D080 — lwrpc-admin/app/api/tournaments/action/route.js:1226

Object: `"members"`; operation: `select`; server-route.

Browser consumers: None found through static imports; retain as server/helper dependency.

```js
supabase
    .from("members")
    .select("id, full_name, first_name, last_name, email, phone")
    .eq("id", memberId)
    .single()
```

### D081 — lwrpc-admin/app/api/tournaments/action/route.js:1266

Object: `"members"`; operation: `select`; server-route.

Browser consumers: None found through static imports; retain as server/helper dependency.

```js
supabase
      .from("members")
      .select("id, full_name, first_name, last_name, email, phone")
      .eq("id", memberId)
      .maybeSingle()
```

### D082 — lwrpc-admin/app/api/tournaments/action/route.js:1281

Object: `"team_members"`; operation: `select`; server-route.

Browser consumers: None found through static imports; retain as server/helper dependency.

```js
supabase
    .from("team_members")
    .select(`
      member_id,
      members (
        id,
        full_name,
        first_name,
        last_name,
        email,
        phone
      )
    `)
    .in("team_id", sourceTeamIds)
```

### D083 — lwrpc-admin/app/api/tournaments/action/route.js:1313

Object: `"teams"`; operation: `select`; server-route.

Browser consumers: None found through static imports; retain as server/helper dependency.

```js
supabase
    .from("teams")
    .select(`
      id,
      name,
      divisions (
        name
      )
    `)
    .ilike("name", teamName)
    .or("is_active.eq.true,is_active.is.null")
```

### D084 — lwrpc-admin/app/api/tournaments/admin/route.js:76

Object: `"divisions"`; operation: `select`; server-route.

Browser consumers: None found through static imports; retain as server/helper dependency.

```js
supabase
        .from("divisions")
        .select("id, name, sort_order, is_active, team_dupr_max, rating_type")
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true })
```

### D085 — lwrpc-admin/app/api/tournaments/admin/route.js:116

Object: `"teams"`; operation: `select`; server-route.

Browser consumers: None found through static imports; retain as server/helper dependency.

```js
supabase
        .from("teams")
        .select(`
          id,
          name,
          division_id,
          is_active,
          divisions (
            id,
            name,
            team_dupr_max,
            rating_type,
            leagues (
              id,
              season_id
            )
          )
        `)
        .or("is_active.eq.true,is_active.is.null")
        .order("name", { ascending: true })
```

### D086 — lwrpc-admin/app/api/tournaments/admin/route.js:143

Object: `"team_members"`; operation: `select`; server-route.

Browser consumers: None found through static imports; retain as server/helper dependency.

```js
supabase
        .from("team_members")
        .select(`
          id,
          team_id,
          member_id,
          role,
          members (
            id,
            full_name,
            first_name,
            last_name,
            email,
            phone,
            self_rating,
            dupr_id
          )
        `)
        .in("team_id", sourceTeamIds)
```

### D087 — lwrpc-admin/app/api/tournaments/admin/route.js:168

Object: `"member_season_ratings"`; operation: `select`; server-route.

Browser consumers: None found through static imports; retain as server/helper dependency.

```js
supabase
        .from("member_season_ratings")
        .select("member_id, season_id, season_dupr_rating, season_primetime_rating")
        .in("member_id", sourceMemberIds)
```

### D088 — lwrpc-admin/app/api/user-last-logins/route.js:70

Object: `"members"`; operation: `select`; server-route.

Browser consumers: None found through static imports; retain as server/helper dependency.

```js
supabase
      .from("members")
      .select("id, user_roles(role)")
      .eq("email", userData.user.email)
      .maybeSingle()
```

### D089 — lwrpc-admin/app/captain-dashboard/page.js:113

Object: `"leagues"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/captain-dashboard/page.js`

```js
supabase
      .from("leagues")
      .select("id, name, league_document_bucket, code_of_conduct_pdf_path, captains_guide_pdf_path, league_rules_pdf_path, score_sheet_pdf_path, league_waiver_pdf_path")
      .ilike("name", "%weekday%")
      .order("is_active", { ascending: false })
      .order("name", { ascending: true })
      .limit(1)
      .maybeSingle()
```

### D090 — lwrpc-admin/app/captain-dashboard/page.js:190

Object: `"match_lineups"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/captain-dashboard/page.js`

```js
supabase
      .from("match_lineups")
      .select("match_id, team_id, line_number, player_1_member_id, player_2_member_id")
      .in("match_id", matchIds)
```

### D091 — lwrpc-admin/app/captain-dashboard/page.js:240

Object: `"divisions"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/captain-dashboard/page.js`

```js
supabase
      .from("divisions")
      .select(`
        id,
        name,
        is_active,
        rating_type,
        playoff_team_count,
        leagues (
          id,
          name,
          season_id,
          is_active,
          seasons (
            id,
            name,
            is_active
          )
        )
      `)
```

### D092 — lwrpc-admin/app/captain-dashboard/page.js:269

Object: `"locations"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/captain-dashboard/page.js`

```js
supabase
      .from("locations")
      .select("id")
      .or(`club_pro_member_id.eq.${memberData.id},club_pro_2_member_id.eq.${memberData.id}`)
```

### D093 — lwrpc-admin/app/captain-dashboard/page.js:292

Object: `"teams"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/captain-dashboard/page.js`

```js
supabase
      .from("teams")
      .select(`
        *,
        divisions (
          id,
          name,
          flex_league,
          number_of_lines,
          primary_team_type,
          secondary_number_of_lines,
          secondary_team_type,
          games_per_line,
          points_to_win,
          win_by,
          default_game_format,
          rating_type,
          playoff_team_count,
          line_notes,
          min_dupr,
          max_dupr,
          team_dupr_max,
          standings_tiebreak_1,
          standings_tiebreak_2,
          standings_tiebreak_3,
          score_sheet_template_id,
          score_sheet_templates (
            id,
            name,
            sheet_title,
            template_html,
            rules_text,
            is_active,
            is_default
          ),
          division_lines (
            line_number,
            line_name,
            line_type,
            game_format,
            games_per_line,
            points_to_win,
            win_by,
            team_win_points,
            picklebreaker_not_played_points,
            picklebreaker_not_played_award_rule,
            picklebreaker_play_rule,
            standings_points_mode,
            sort_order
          ),
          leagues (
            id,
            name,
            season_id,
            seasons (
              id,
              name,
              abbreviation
            ),
            rosters_locked,
            league_document_bucket,
            code_of_conduct_pdf_path,
            captains_guide_pdf_path,
            league_rules_pdf_path,
            score_sheet_pdf_path,
            league_waiver_pdf_path
          )
        ),
        locations (
          id,
          name
        )
      `)
      .or(teamAccessFilters.join(","))
      .order("name", { ascending: true })
```

### D094 — lwrpc-admin/app/captain-dashboard/page.js:412

Object: `"matches"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/captain-dashboard/page.js`

```js
supabase
      .from("matches")
      .select(`
        *,
        leagues (
          id,
          name,
          season_id,
          rosters_locked
        ),
        divisions (
          id,
          name,
          flex_league,
          leagues (
            id,
            name
          ),
          number_of_lines,
          primary_team_type,
          secondary_number_of_lines,
          secondary_team_type,
          games_per_line,
          points_to_win,
          win_by,
          default_game_format,
          rating_type,
          playoff_team_count,
          line_notes,
          min_dupr,
          max_dupr,
          team_dupr_max,
          standings_tiebreak_1,
          standings_tiebreak_2,
          standings_tiebreak_3,
          score_sheet_template_id,
          score_sheet_templates (
            id,
            name,
            sheet_title,
            template_html,
            rules_text,
            is_active,
            is_default
          ),
          division_lines (
            line_number,
            line_name,
            line_type,
            game_format,
            games_per_line,
            points_to_win,
            win_by,
            team_win_points,
            picklebreaker_not_played_points,
            picklebreaker_not_played_award_rule,
            picklebreaker_play_rule,
            standings_points_mode,
            sort_order
          )
        ),
        locations (
          id,
          name,
          address,
          city,
          state,
          zip_code
        ),
        home_team:teams!matches_home_team_id_fkey (
          id,
          name,
          captain:members!teams_captain_member_id_fkey (
            id,
            first_name,
            last_name,
            email,
            phone,
            notification_preference
          ),
          co_captain_1:members!teams_co_captain_member_id_fkey (
            id,
            first_name,
            last_name,
            email,
            phone,
            notification_preference
          ),
          co_captain_2:members!teams_co_captain_2_member_id_fkey (
            id,
            first_name,
            last_name,
            email,
            phone,
            notification_preference
          ),
          club_pro:members!teams_club_pro_member_id_fkey (
            id,
            first_name,
            last_name,
            email,
            phone,
            notification_preference
          )
        ),
        away_team:teams!matches_away_team_id_fkey (
          id,
          name,
          captain:members!teams_captain_member_id_fkey (
            id,
            first_name,
            last_name,
            email,
            phone,
            notification_preference
          ),
          co_captain_1:members!teams_co_captain_member_id_fkey (
            id,
            first_name,
            last_name,
            email,
            phone,
            notification_preference
          ),
          co_captain_2:members!teams_co_captain_2_member_id_fkey (
            id,
            first_name,
            last_name,
            email,
            phone,
            notification_preference
          ),
          club_pro:members!teams_club_pro_member_id_fkey (
            id,
            first_name,
            last_name,
            email,
            phone,
            notification_preference
          )
        ),
        winning_team:teams!matches_winning_team_id_fkey (
          id,
          name
        ),
        match_lines (
          id,
          line_number,
          posted_to_dupr,
          home_team_games_won,
          away_team_games_won,
          winning_team_id,
          rating_type_at_play,
          home_player_1_rating_at_play,
          home_player_2_rating_at_play,
          away_player_1_rating_at_play,
          away_player_2_rating_at_play,
          home_team_rating_at_play,
          away_team_rating_at_play,
          ratings_snapshotted_at,
          division_lines (
            line_name,
            line_type,
            posted_to_dupr,
            team_win_points,
            picklebreaker_not_played_points,
            picklebreaker_not_played_award_rule,
            picklebreaker_play_rule
          ),
          home_player_1:members!match_lines_home_player_1_id_fkey(id, first_name, last_name, email, self_rating),
          home_player_2:members!match_lines_home_player_2_id_fkey(id, first_name, last_name, email, self_rating),
          away_player_1:members!match_lines_away_player_1_id_fkey(id, first_name, last_name, email, self_rating),
          away_player_2:members!match_lines_away_player_2_id_fkey(id, first_name, last_name, email, self_rating),
          line_games(id, game_number, home_score, away_score, game_status)
        )
      `)
      .or(
        `home_team_id.in.(${teamIds.join(",")}),away_team_id.in.(${teamIds.join(",")})`
      )
      .eq("is_published", true)
      .order("scheduled_date", { ascending: true })
      .order("scheduled_time", { ascending: true })
```

### D095 — lwrpc-admin/app/captain-dashboard/page.js:614

Object: `"members"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/captain-dashboard/page.js`

```js
supabase
        .from("members")
        .select("id, first_name, last_name, email")
        .in("id", scoreMemberIds)
```

### D096 — lwrpc-admin/app/captain-dashboard/page.js:632

Object: `"matches"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/captain-dashboard/page.js`

```js
supabase
      .from("matches")
      .select("id, division_id, week_number, scheduled_date")
      .in("division_id", divisionIds.length > 0 ? divisionIds : ["00000000-0000-0000-0000-000000000000"])
      .eq("is_published", true)
```

### D097 — lwrpc-admin/app/captain-dashboard/page.js:655

Object: `"team_members"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/captain-dashboard/page.js`

```js
supabase
          .from("team_members")
          .select(`
            team_id,
            members (
              id,
              first_name,
              last_name,
              email,
              phone,
              self_rating
            )
          `)
          .in("team_id", matchTeamIds)
```

### D098 — lwrpc-admin/app/captain-dashboard/page.js:669

Object: `"team_standings"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/captain-dashboard/page.js`

```js
supabase
          .from("team_standings")
          .select(`
            id,
            team_id,
            division_id,
            rank,
            standings_points,
            match_wins,
            match_losses,
            match_ties,
            matches_played,
            line_wins,
            line_losses,
            line_ties,
            game_wins,
            point_differential,
            points_for,
            teams (
              id,
              name,
              is_active
            )
          `)
          .in("division_id", divisionIds.length > 0 ? divisionIds : ["00000000-0000-0000-0000-000000000000"])
          .order("rank", { ascending: true })
```

### D099 — lwrpc-admin/app/captain-dashboard/page.js:719

Object: `"member_season_ratings"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/captain-dashboard/page.js`

```js
supabase
        .from("member_season_ratings")
        .select("member_id, season_id, season_dupr_rating, season_primetime_rating")
        .in("season_id", seasonIds)
        .in("member_id", ratingMemberIds)
```

### D100 — lwrpc-admin/app/captain-dashboard/page.js:779

Object: `"team_byes"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/captain-dashboard/page.js`

```js
supabase
      .from("team_byes")
      .select(`
        *,
        teams (
          id,
          name
        ),
        divisions (
          id,
          name
        )
      `)
      .in("team_id", teamIds)
      .order("bye_date", { ascending: true })
```

### D101 — lwrpc-admin/app/captain-dashboard/page.js:1617

Object: `"matches"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/captain-dashboard/page.js`

```js
supabase
      .from("matches")
      .update(payload)
      .eq("id", flexScheduleMatch.id)
      .select("id, scheduled_date, scheduled_time")
      .maybeSingle()
```

### D102 — lwrpc-admin/app/captain-dashboard/page.js:1789

Object: `"team_members"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/captain-dashboard/page.js`

```js
supabase
          .from("team_members")
          .select("*, members(id, first_name, last_name, email, phone, notification_preference, self_rating, dupr_id)")
          .eq("team_id", team.id)
          .order("members(last_name)", { ascending: true })
```

### D103 — lwrpc-admin/app/captain-dashboard/page.js:1794

Object: `"match_lineups"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/captain-dashboard/page.js`

```js
supabase
          .from("match_lineups")
          .select("*")
          .eq("match_id", match.id)
          .eq("team_id", team.id)
          .order("line_number", { ascending: true })
```

### D104 — lwrpc-admin/app/captain-dashboard/page.js:1816

Object: `"member_season_ratings"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/captain-dashboard/page.js`

```js
supabase
        .from("member_season_ratings")
        .select("*")
        .eq("season_id", seasonId)
```

### D105 — lwrpc-admin/app/captain-dashboard/page.js:1856

Object: `"match_lineups"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/captain-dashboard/page.js`

```js
supabase
      .from("match_lineups")
      .select(`
        match_id,
        team_id,
        line_number,
        player_1_member_id,
        player_2_member_id,
        player_1:members!match_lineups_player_1_member_id_fkey(id, first_name, last_name, email, self_rating),
        player_2:members!match_lineups_player_2_member_id_fkey(id, first_name, last_name, email, self_rating)
      `)
      .eq("match_id", match.id)
      .order("line_number", { ascending: true })
```

### D106 — lwrpc-admin/app/captain-dashboard/page.js:1871

Object: `"score_sheet_templates"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/captain-dashboard/page.js`

```js
supabase
          .from("score_sheet_templates")
          .select("id, name, sheet_title, template_html, rules_text, is_active, is_default")
          .eq("is_default", true)
          .eq("is_active", true)
          .limit(1)
```

### D107 — lwrpc-admin/app/captain-dashboard/page.js:2143

Object: `"member_season_ratings"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/captain-dashboard/page.js`

```js
supabase
        .from("member_season_ratings")
        .select("*")
        .eq("season_id", seasonId)
```

### D108 — lwrpc-admin/app/captain-dashboard/page.js:2235

Object: `"matches"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/captain-dashboard/page.js`

```js
supabase
      .from("matches")
      .select(`
        *,
        leagues(id, name, season_id),
        divisions(id, name, rating_type),
        locations(id, name, address, city, state, zip_code),
        home_team:teams!matches_home_team_id_fkey(id, name),
        away_team:teams!matches_away_team_id_fkey(id, name),
        match_lines(
          id,
          line_number,
          home_team_games_won,
          away_team_games_won,
          winning_team_id,
          home_player_1:members!match_lines_home_player_1_id_fkey(id, first_name, last_name, email, self_rating),
          home_player_2:members!match_lines_home_player_2_id_fkey(id, first_name, last_name, email, self_rating),
          away_player_1:members!match_lines_away_player_1_id_fkey(id, first_name, last_name, email, self_rating),
          away_player_2:members!match_lines_away_player_2_id_fkey(id, first_name, last_name, email, self_rating),
          line_games(id, game_number, home_score, away_score, game_status),
          division_lines(line_name, line_type, posted_to_dupr, team_win_points, picklebreaker_not_played_points, picklebreaker_not_played_award_rule, picklebreaker_play_rule, standings_points_mode)
        )
      `)
      .eq("id", match.id)
      .single()
```

### D109 — lwrpc-admin/app/captain-dashboard/page.js:2451

Object: `"teams"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/captain-dashboard/page.js`

```js
supabase
      .from("teams")
      .select(`
        id,
        name,
        captain:members!teams_captain_member_id_fkey (
          id,
          first_name,
          last_name,
          email,
          phone,
          notification_preference
        ),
        co_captain_1:members!teams_co_captain_member_id_fkey (
          id,
          first_name,
          last_name,
          email,
          phone,
          notification_preference
        ),
        co_captain_2:members!teams_co_captain_2_member_id_fkey (
          id,
          first_name,
          last_name,
          email,
          phone,
          notification_preference
        ),
        club_pro:members!teams_club_pro_member_id_fkey (
          id,
          first_name,
          last_name,
          email,
          phone,
          notification_preference
        )
      `)
      .eq("division_id", team.division_id)
      .order("name", { ascending: true })
```

### D110 — lwrpc-admin/app/captain-dashboard/page.js:2526

Object: `"teams"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/captain-dashboard/page.js`

```js
supabase
          .from("teams")
          .select(`
            id,
            name,
            division_id,
            locations(id, name),
            captain:members!teams_captain_member_id_fkey(id, first_name, last_name, full_name, email),
            co_captain_1:members!teams_co_captain_member_id_fkey(id, first_name, last_name, full_name, email),
            co_captain_2:members!teams_co_captain_2_member_id_fkey(id, first_name, last_name, full_name, email)
          `)
          .eq("division_id", team.division_id)
          .order("name", { ascending: true })
```

### D111 — lwrpc-admin/app/captain-dashboard/page.js:2539

Object: `"matches"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/captain-dashboard/page.js`

```js
supabase
          .from("matches")
          .select(`
            id,
            league_id,
            division_id,
            home_team_id,
            away_team_id,
            location_id,
            scheduled_date,
            scheduled_time,
            week_number,
            status,
            score_status,
            score_entered_at,
            score_verified_at,
            home_score,
            away_score,
            winning_team_id,
            result_type,
            result_notes,
            is_published,
            locations (
              id,
              name
            ),
            home_team:teams!matches_home_team_id_fkey (
              id,
              name
            ),
            away_team:teams!matches_away_team_id_fkey (
              id,
              name
            ),
              match_lines (
              id,
              line_number,
              posted_to_dupr,
              home_team_games_won,
              away_team_games_won,
              winning_team_id,
              rating_type_at_play,
              home_player_1_rating_at_play,
              home_player_2_rating_at_play,
              away_player_1_rating_at_play,
              away_player_2_rating_at_play,
              home_team_rating_at_play,
              away_team_rating_at_play,
              ratings_snapshotted_at,
              division_lines (
                line_name,
                line_type,
                posted_to_dupr,
                team_win_points,
                picklebreaker_not_played_points,
                picklebreaker_not_played_award_rule,
                picklebreaker_play_rule
              ),
              home_player_1:members!match_lines_home_player_1_id_fkey(id, first_name, last_name, self_rating),
              home_player_2:members!match_lines_home_player_2_id_fkey(id, first_name, last_name, self_rating),
              away_player_1:members!match_lines_away_player_1_id_fkey(id, first_name, last_name, self_rating),
              away_player_2:members!match_lines_away_player_2_id_fkey(id, first_name, last_name, self_rating),
              line_games (
                id,
                game_number,
                home_score,
                away_score,
                game_status
              )
            )
          `)
          .eq("division_id", team.division_id)
          .eq("is_published", true)
          .order("scheduled_date", { ascending: true })
          .order("scheduled_time", { ascending: true })
```

### D112 — lwrpc-admin/app/captain-dashboard/page.js:2614

Object: `"team_byes"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/captain-dashboard/page.js`

```js
supabase
          .from("team_byes")
          .select(`
            *,
            teams (
              id,
              name
            ),
            divisions (
              id,
              name
            )
          `)
          .eq("division_id", team.division_id)
          .order("bye_date", { ascending: true })
```

### D113 — lwrpc-admin/app/captain-dashboard/page.js:2629

Object: `"team_standings"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/captain-dashboard/page.js`

```js
supabase
          .from("team_standings")
          .select("team_id, rank, standings_points, match_wins, match_losses")
          .eq("division_id", team.division_id)
```

### D114 — lwrpc-admin/app/captain-dashboard/page.js:2634

Object: `"member_season_ratings"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/captain-dashboard/page.js`

```js
supabase
              .from("member_season_ratings")
              .select("member_id, season_dupr_rating, season_primetime_rating")
              .eq("season_id", seasonId)
```

### D115 — lwrpc-admin/app/components/AskLwrAssistant.js:231

Object: `"team_members"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/components/AskLwrAssistant.js`, `lwrpc-admin/app/ask-lwr/page.js`, `lwrpc-admin/app/components/AskLwrTrigger.js`, `lwrpc-admin/app/components/AppHeader.js`, `lwrpc-admin/app/score-entry/[id]/page.js`, `lwrpc-admin/app/AdminDashboardClient.js`, `lwrpc-admin/app/ai-assistant/console/page.js`, `lwrpc-admin/app/ai-assistant/page.js`, `lwrpc-admin/app/ai-assistant/review/page.js`, `lwrpc-admin/app/ai-insights/page.js`, `lwrpc-admin/app/captain-dashboard/page.js`, `lwrpc-admin/app/divisions/page.js`, `lwrpc-admin/app/divisions/[id]/page.js`, `lwrpc-admin/app/email-options/page.js`, `lwrpc-admin/app/league-communications/page.js`, `lwrpc-admin/app/leagues/page.js`, `lwrpc-admin/app/locations/page.js`, `lwrpc-admin/app/matches/[id]/page.js`, `lwrpc-admin/app/member-import/page.js`, `lwrpc-admin/app/members/page.js`, `lwrpc-admin/app/members/[id]/page.js`, `lwrpc-admin/app/player-dashboard/page.js`, `lwrpc-admin/app/ratings/page.js`, `lwrpc-admin/app/round-robin/page.js`, `lwrpc-admin/app/schedule-editor/page.js`, `lwrpc-admin/app/scheduling/page.js`, `lwrpc-admin/app/score-sheets/page.js`, `lwrpc-admin/app/scoring/page.js`, `lwrpc-admin/app/seasons/page.js`, `lwrpc-admin/app/standings/page.js`, `lwrpc-admin/app/system-setup/page.js`, `lwrpc-admin/app/teams/page.js`, `lwrpc-admin/app/teams/[id]/page.js`, `lwrpc-admin/app/tournaments/page.js`, `lwrpc-admin/app/page.js`

```js
supabase.from("team_members").select("teams(id, name, divisions(leagues(id, name, league_document_bucket, code_of_conduct_pdf_path, captains_guide_pdf_path, league_rules_pdf_path, score_sheet_pdf_path, league_waiver_pdf_path)))").eq("member_id", user.memberId)
```

### D116 — lwrpc-admin/app/divisions/page.js:119

Object: `"leagues"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/divisions/page.js`

```js
supabase
      .from("leagues")
      .select(`
        id,
        name,
        seasons (
          name,
          is_active
        ),
        is_active
      `)
      .order("name", { ascending: true })
```

### D117 — lwrpc-admin/app/divisions/page.js:137

Object: `"divisions"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/divisions/page.js`

```js
supabase
      .from("divisions")
      .select(`
        *,
        leagues (
          name,
          is_active,
          seasons (
            name,
            is_active
          )
        )
      `)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true })
```

### D118 — lwrpc-admin/app/divisions/page.js:158

Object: `"score_sheet_templates"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/divisions/page.js`

```js
supabase
      .from("score_sheet_templates")
      .select("id, name, is_active, is_default")
      .order("is_default", { ascending: false })
      .order("name", { ascending: true })
```

### D119 — lwrpc-admin/app/divisions/page.js:169

Object: `"division_lines"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/divisions/page.js`

```js
supabase
      .from("division_lines")
      .select("division_id, line_number")
```

### D120 — lwrpc-admin/app/divisions/page.js:390

Object: `"divisions"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/divisions/page.js`

```js
supabase
      .from("divisions")
      .insert(
        sourceDivisions.map((division) =>
          copyDivisionPayload(division, copyLeagueTargetLeague, division.name)
        )
      )
      .select("id, name")
```

### D121 — lwrpc-admin/app/divisions/page.js:413

Object: `"division_lines"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/divisions/page.js`

```js
supabase
      .from("division_lines")
      .select("*")
      .in("division_id", sourceDivisionIds)
      .order("sort_order", { ascending: true })
      .order("line_number", { ascending: true })
```

### D122 — lwrpc-admin/app/divisions/page.js:472

Object: `"divisions"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/divisions/page.js`

```js
supabase
      .from("divisions")
      .insert(divisionPayload)
      .select("id")
      .single()
```

### D123 — lwrpc-admin/app/divisions/page.js:484

Object: `"division_lines"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/divisions/page.js`

```js
supabase
      .from("division_lines")
      .select("*")
      .eq("division_id", copyDivision.id)
      .order("sort_order", { ascending: true })
      .order("line_number", { ascending: true })
```

### D124 — lwrpc-admin/app/divisions/[id]/page.js:120

Object: `"divisions"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/divisions/[id]/page.js`

```js
supabase
      .from("divisions")
      .select("id, name, default_lines_config, updated_at")
      .neq("id", id)
      .order("updated_at", { ascending: false })
      .limit(50)
```

### D125 — lwrpc-admin/app/divisions/[id]/page.js:297

Object: `"divisions"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/divisions/[id]/page.js`

```js
supabase
        .from("divisions")
        .update(payload)
        .eq("id", id)
        .select("*")
        .single()
```

### D126 — lwrpc-admin/app/divisions/[id]/page.js:323

Object: `"divisions"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/divisions/[id]/page.js`

```js
supabase
      .from("divisions")
      .update(payload)
      .eq("id", id)
      .select("*")
      .single()
```

### D127 — lwrpc-admin/app/divisions/[id]/page.js:356

Object: `"divisions"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/divisions/[id]/page.js`

```js
supabase
      .from("divisions")
      .select(`
        *,
        leagues (
          name,
          seasons (
            name
          )
        )
      `)
      .eq("id", id)
      .single()
```

### D128 — lwrpc-admin/app/divisions/[id]/page.js:375

Object: `"division_lines"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/divisions/[id]/page.js`

```js
supabase
      .from("division_lines")
      .select("*")
      .eq("division_id", id)
      .order("sort_order", { ascending: true })
      .order("line_number", { ascending: true })
```

### D129 — lwrpc-admin/app/divisions/[id]/page.js:439

Object: `"division_lines"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/divisions/[id]/page.js`

```js
supabase
        .from("division_lines")
        .update(payload)
        .eq("id", editingId)
        .select("*")
        .maybeSingle()
```

### D130 — lwrpc-admin/app/divisions/[id]/page.js:453

Object: `"division_lines"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/divisions/[id]/page.js`

```js
supabase
        .from("division_lines")
        .insert(payload)
        .select("*")
        .maybeSingle()
```

### D131 — lwrpc-admin/app/divisions/[id]/page.js:616

Object: `"match_lines"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/divisions/[id]/page.js`

```js
supabase
        .from("match_lines")
        .select("id")
        .in("division_line_id", existingLineIds)
        .limit(1)
```

### D132 — lwrpc-admin/app/divisions/[id]/page.js:645

Object: `"division_lines"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/divisions/[id]/page.js`

```js
supabase
      .from("division_lines")
      .insert(rows)
      .select("*")
```

### D133 — lwrpc-admin/app/leagues/page.js:58

Object: `"seasons"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/leagues/page.js`

```js
supabase
        .from("seasons")
        .select("*")
        .order("name", { ascending: true })
```

### D134 — lwrpc-admin/app/leagues/page.js:62

Object: `"leagues"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/leagues/page.js`

```js
supabase
        .from("leagues")
        .select(`
          *,
          seasons (
            name,
            abbreviation,
            is_active
          )
        `)
        .order("name", { ascending: true })
```

### D135 — lwrpc-admin/app/lib/aiApprovedAnswersService.js:52

Object: `'seasons'`; operation: `select`; page/shared-helper.

Browser consumers: None found through static imports; retain as server/helper dependency.

```js
db.from('seasons').select('id,name,start_date,end_date').order('start_date',{ascending:false})
```

### D136 — lwrpc-admin/app/lib/aiApprovedAnswersService.js:69

Object: `'members'`; operation: `select`; page/shared-helper.

Browser consumers: None found through static imports; retain as server/helper dependency.

```js
db.from('members').select('first_name,last_name').eq('email',actor.data.user.email.toLowerCase()).limit(1).maybeSingle()
```

### D137 — lwrpc-admin/app/lib/aiDocumentActivation.js:12

Object: `'members'`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/ai-assistant/page.js`

```js
db.from('members').select('id,first_name,last_name').in('id',ids)
```

### D138 — lwrpc-admin/app/lib/aiEligibilityService.js:18

Object: `'divisions'`; operation: `select`; page/shared-helper.

Browser consumers: None found through static imports; retain as server/helper dependency.

```js
read(db.from('divisions').select('id,name,is_active,min_dupr,max_dupr,team_dupr_max,rating_type,league:leagues!inner(id,name,is_active,season:seasons!inner(id,name,is_active))').eq('is_active',true).eq('league.is_active',true).eq('league.season.is_active',true).limit(101))
```

### D139 — lwrpc-admin/app/lib/auth.js:68

Object: `"user_roles"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/AdminDashboardClient.js`, `lwrpc-admin/app/ai-assistant/console/page.js`, `lwrpc-admin/app/ai-assistant/page.js`, `lwrpc-admin/app/ai-assistant/review/page.js`, `lwrpc-admin/app/ai-insights/page.js`, `lwrpc-admin/app/approved-answer/[citation]/page.js`, `lwrpc-admin/app/ask-lwr/page.js`, `lwrpc-admin/app/captain-dashboard/page.js`, `lwrpc-admin/app/components/AppHeader.js`, `lwrpc-admin/app/components/AskLwrAssistant.js`, `lwrpc-admin/app/components/InactivitySessionTimeout.js`, `lwrpc-admin/app/components/OfficialDocumentViewer.js`, `lwrpc-admin/app/components/ViewAsStartButton.js`, `lwrpc-admin/app/divisions/page.js`, `lwrpc-admin/app/divisions/[id]/page.js`, `lwrpc-admin/app/email-options/page.js`, `lwrpc-admin/app/league-communications/page.js`, `lwrpc-admin/app/leagues/page.js`, `lwrpc-admin/app/live-match/[id]/page.js`, `lwrpc-admin/app/locations/page.js`, `lwrpc-admin/app/login/page.js`, `lwrpc-admin/app/matches/[id]/page.js`, `lwrpc-admin/app/member-import/page.js`, `lwrpc-admin/app/members/page.js`, `lwrpc-admin/app/members/[id]/page.js`, `lwrpc-admin/app/player-dashboard/page.js`, `lwrpc-admin/app/ratings/page.js`, `lwrpc-admin/app/reset-password/page.js`, `lwrpc-admin/app/round-robin/[id]/admin/page.js`, `lwrpc-admin/app/schedule-editor/page.js`, `lwrpc-admin/app/scheduling/page.js`, `lwrpc-admin/app/score-entry/[id]/page.js`, `lwrpc-admin/app/score-sheets/page.js`, `lwrpc-admin/app/scoring/page.js`, `lwrpc-admin/app/seasons/page.js`, `lwrpc-admin/app/standings/page.js`, `lwrpc-admin/app/system-setup/page.js`, `lwrpc-admin/app/teams/page.js`, `lwrpc-admin/app/teams/[id]/page.js`, `lwrpc-admin/app/page.js`, `lwrpc-admin/app/round-robin/page.js`, `lwrpc-admin/app/tournaments/page.js`, `lwrpc-admin/app/components/AskLwrTrigger.js`, `lwrpc-admin/app/official-document/[citation]/page.js`, `lwrpc-admin/app/round-robin/[id]/page.js`, `lwrpc-admin/app/round-robin/[id]/player/page.js`, `lwrpc-admin/app/tournaments/[id]/admin/page.js`, `lwrpc-admin/app/tournaments/[id]/display/page.js`, `lwrpc-admin/app/tournaments/[id]/page.js`, `lwrpc-admin/app/tournaments/[id]/player/page.js`, `lwrpc-admin/app/tournaments/[id]/standings/page.js`

```js
supabase
    .from("user_roles")
    .select("role, member_id")
    .eq("user_id", userId)
    .limit(1)
```

### D140 — lwrpc-admin/app/lib/identityRoleWriter.js:8

Object: `'user_roles'`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/locations/page.js`, `lwrpc-admin/app/teams/page.js`

```js
client.from('user_roles').select('*').eq('member_id', memberId).maybeSingle()
```

### D141 — lwrpc-admin/app/lib/identityRoleWriter.js:12

Object: `'user_roles'`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/locations/page.js`, `lwrpc-admin/app/teams/page.js`

```js
client.from('user_roles').update({ role: desiredRole, updated_at: new Date().toISOString() })
        .eq('id', row.id).eq('role', row.role).select('id').single()
```

### D142 — lwrpc-admin/app/lib/identityRoleWriter.js:14

Object: `'user_roles'`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/locations/page.js`, `lwrpc-admin/app/teams/page.js`

```js
client.from('user_roles').insert({ user_id: null, member_id: memberId, role: desiredRole }).select('id').single()
```

### D143 — lwrpc-admin/app/lib/matchSetupReminders.js:50

Object: `"leagues"`; operation: `select`; page/shared-helper.

Browser consumers: None found through static imports; retain as server/helper dependency.

```js
supabase
    .from("leagues")
    .select("id, name, match_setup_reminder_days_before")
    .gt("match_setup_reminder_days_before", -1)
```

### D144 — lwrpc-admin/app/lib/matchSetupReminders.js:65

Object: `"matches"`; operation: `select`; page/shared-helper.

Browser consumers: None found through static imports; retain as server/helper dependency.

```js
supabase
      .from("matches")
      .select(`
        id,
        league_id,
        division_id,
        home_team_id,
        away_team_id,
        scheduled_date,
        scheduled_time,
        week_number,
        status,
        is_published,
        divisions(id, name, number_of_lines),
        locations(id, name),
        home_team:teams!matches_home_team_id_fkey(
          id,
          name,
          captain:members!teams_captain_member_id_fkey(id, first_name, last_name, email, phone, notification_preference),
          co_captain_1:members!teams_co_captain_member_id_fkey(id, first_name, last_name, email, phone, notification_preference),
          co_captain_2:members!teams_co_captain_2_member_id_fkey(id, first_name, last_name, email, phone, notification_preference),
          club_pro:members!teams_club_pro_member_id_fkey(id, first_name, last_name, email, phone, notification_preference)
        ),
        away_team:teams!matches_away_team_id_fkey(
          id,
          name,
          captain:members!teams_captain_member_id_fkey(id, first_name, last_name, email, phone, notification_preference),
          co_captain_1:members!teams_co_captain_member_id_fkey(id, first_name, last_name, email, phone, notification_preference),
          co_captain_2:members!teams_co_captain_2_member_id_fkey(id, first_name, last_name, email, phone, notification_preference),
          club_pro:members!teams_club_pro_member_id_fkey(id, first_name, last_name, email, phone, notification_preference)
        )
      `)
      .eq("league_id", league.id)
      .eq("scheduled_date", targetDate)
      .eq("is_published", true)
      .not("status", "eq", "completed")
      .not("status", "eq", "cancelled")
```

### D145 — lwrpc-admin/app/lib/matchSetupReminders.js:109

Object: `"match_lineups"`; operation: `select`; page/shared-helper.

Browser consumers: None found through static imports; retain as server/helper dependency.

```js
supabase
        .from("match_lineups")
        .select("match_id, team_id, player_1_member_id, player_2_member_id")
        .in("match_id", matchIds)
```

### D146 — lwrpc-admin/app/lib/memberLookup.js:4

Object: `"members"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/captain-dashboard/page.js`, `lwrpc-admin/app/components/AppHeader.js`, `lwrpc-admin/app/login/page.js`, `lwrpc-admin/app/player-dashboard/page.js`, `lwrpc-admin/app/AdminDashboardClient.js`, `lwrpc-admin/app/ai-assistant/console/page.js`, `lwrpc-admin/app/ai-assistant/page.js`, `lwrpc-admin/app/ai-assistant/review/page.js`, `lwrpc-admin/app/ai-insights/page.js`, `lwrpc-admin/app/ask-lwr/page.js`, `lwrpc-admin/app/divisions/page.js`, `lwrpc-admin/app/divisions/[id]/page.js`, `lwrpc-admin/app/email-options/page.js`, `lwrpc-admin/app/league-communications/page.js`, `lwrpc-admin/app/leagues/page.js`, `lwrpc-admin/app/locations/page.js`, `lwrpc-admin/app/matches/[id]/page.js`, `lwrpc-admin/app/member-import/page.js`, `lwrpc-admin/app/members/page.js`, `lwrpc-admin/app/members/[id]/page.js`, `lwrpc-admin/app/ratings/page.js`, `lwrpc-admin/app/round-robin/page.js`, `lwrpc-admin/app/schedule-editor/page.js`, `lwrpc-admin/app/scheduling/page.js`, `lwrpc-admin/app/score-sheets/page.js`, `lwrpc-admin/app/scoring/page.js`, `lwrpc-admin/app/seasons/page.js`, `lwrpc-admin/app/standings/page.js`, `lwrpc-admin/app/system-setup/page.js`, `lwrpc-admin/app/teams/page.js`, `lwrpc-admin/app/teams/[id]/page.js`, `lwrpc-admin/app/tournaments/page.js`, `lwrpc-admin/app/approved-answer/[citation]/page.js`, `lwrpc-admin/app/components/AskLwrAssistant.js`, `lwrpc-admin/app/components/InactivitySessionTimeout.js`, `lwrpc-admin/app/components/OfficialDocumentViewer.js`, `lwrpc-admin/app/components/ViewAsStartButton.js`, `lwrpc-admin/app/live-match/[id]/page.js`, `lwrpc-admin/app/reset-password/page.js`, `lwrpc-admin/app/round-robin/[id]/admin/page.js`, `lwrpc-admin/app/score-entry/[id]/page.js`, `lwrpc-admin/app/page.js`, `lwrpc-admin/app/components/AskLwrTrigger.js`, `lwrpc-admin/app/official-document/[citation]/page.js`, `lwrpc-admin/app/round-robin/[id]/page.js`, `lwrpc-admin/app/round-robin/[id]/player/page.js`, `lwrpc-admin/app/tournaments/[id]/admin/page.js`, `lwrpc-admin/app/tournaments/[id]/display/page.js`, `lwrpc-admin/app/tournaments/[id]/page.js`, `lwrpc-admin/app/tournaments/[id]/player/page.js`, `lwrpc-admin/app/tournaments/[id]/standings/page.js`

```js
supabaseClient
    .from("members")
    .select(selectColumns)
    .eq("email", email)
    .order("created_at", { ascending: true })
```

### D147 — lwrpc-admin/app/lib/profilePhotos.js:64

Object: `"members"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/AdminDashboardClient.js`, `lwrpc-admin/app/captain-dashboard/page.js`, `lwrpc-admin/app/components/AppHeader.js`, `lwrpc-admin/app/player-dashboard/page.js`, `lwrpc-admin/app/page.js`, `lwrpc-admin/app/ai-assistant/console/page.js`, `lwrpc-admin/app/ai-assistant/page.js`, `lwrpc-admin/app/ai-assistant/review/page.js`, `lwrpc-admin/app/ai-insights/page.js`, `lwrpc-admin/app/ask-lwr/page.js`, `lwrpc-admin/app/divisions/page.js`, `lwrpc-admin/app/divisions/[id]/page.js`, `lwrpc-admin/app/email-options/page.js`, `lwrpc-admin/app/league-communications/page.js`, `lwrpc-admin/app/leagues/page.js`, `lwrpc-admin/app/locations/page.js`, `lwrpc-admin/app/matches/[id]/page.js`, `lwrpc-admin/app/member-import/page.js`, `lwrpc-admin/app/members/page.js`, `lwrpc-admin/app/members/[id]/page.js`, `lwrpc-admin/app/ratings/page.js`, `lwrpc-admin/app/round-robin/page.js`, `lwrpc-admin/app/schedule-editor/page.js`, `lwrpc-admin/app/scheduling/page.js`, `lwrpc-admin/app/score-sheets/page.js`, `lwrpc-admin/app/scoring/page.js`, `lwrpc-admin/app/seasons/page.js`, `lwrpc-admin/app/standings/page.js`, `lwrpc-admin/app/system-setup/page.js`, `lwrpc-admin/app/teams/page.js`, `lwrpc-admin/app/teams/[id]/page.js`, `lwrpc-admin/app/tournaments/page.js`

```js
client
    .from("members")
    .update({ profile_image_urls: nextProfileImageUrls })
    .eq("id", member.id)
    .select("profile_image_urls")
    .single()
```

### D148 — lwrpc-admin/app/lib/roleGuards.js:18

Object: `"user_roles"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/members/[id]/page.js`

```js
supabase
    .from("user_roles")
    .select("id")
    .eq("role", "commissioner")
```

### D149 — lwrpc-admin/app/lib/serverSupabase.js:59

Object: `"members"`; operation: `select`; page/shared-helper.

Browser consumers: None found through static imports; retain as server/helper dependency.

```js
supabase
    .from("members")
    .select("id, is_active_member, user_roles(role)")
    .eq("email", email)
    .order("created_at", { ascending: true })
```

### D150 — lwrpc-admin/app/lib/standingsRebuild.js:194

Object: `"divisions"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/matches/[id]/page.js`, `lwrpc-admin/app/schedule-editor/page.js`, `lwrpc-admin/app/standings/page.js`

```js
supabase
    .from("divisions")
    .select("*")
    .eq("id", divisionId)
    .single()
```

### D151 — lwrpc-admin/app/lib/standingsRebuild.js:202

Object: `"teams"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/matches/[id]/page.js`, `lwrpc-admin/app/schedule-editor/page.js`, `lwrpc-admin/app/standings/page.js`

```js
supabase
    .from("teams")
    .select("id, name")
    .eq("division_id", divisionId)
    .order("name", { ascending: true })
```

### D152 — lwrpc-admin/app/lib/standingsRebuild.js:210

Object: `"matches"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/matches/[id]/page.js`, `lwrpc-admin/app/schedule-editor/page.js`, `lwrpc-admin/app/standings/page.js`

```js
supabase
    .from("matches")
    .select(`
      id,
      league_id,
      division_id,
      home_team_id,
      away_team_id,
      winning_team_id,
      result_type,
      result_notes,
      home_score,
      away_score,
      scheduled_date,
      scheduled_time,
      status,
      score_status,
      match_lines (
        id,
        line_number,
        division_line_id,
        winning_team_id,
        home_team_games_won,
        away_team_games_won,
        home_team_points,
        away_team_points,
        division_lines (
          team_win_points,
          line_type,
          picklebreaker_not_played_points,
          picklebreaker_not_played_award_rule,
          picklebreaker_play_rule,
          standings_points_mode
        ),
        line_games (
          id,
          game_number,
          home_score,
          away_score,
          game_status
        )
      )
    `)
    .eq("division_id", divisionId)
    .eq("status", "completed")
    .eq("score_status", "verified")
    .order("scheduled_date", { ascending: true })
    .order("scheduled_time", { ascending: true })
```

### D153 — lwrpc-admin/app/lib/standingsRebuild.js:261

Object: `"matches"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/matches/[id]/page.js`, `lwrpc-admin/app/schedule-editor/page.js`, `lwrpc-admin/app/standings/page.js`

```js
supabase
    .from("matches")
    .select("id, division_id, week_number, scheduled_date, status, score_status")
    .eq("division_id", divisionId)
    .eq("is_published", true)
```

### D154 — lwrpc-admin/app/lib/standingsRebuild.js:269

Object: `"team_byes"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/matches/[id]/page.js`, `lwrpc-admin/app/schedule-editor/page.js`, `lwrpc-admin/app/standings/page.js`

```js
supabase
    .from("team_byes")
    .select("id, team_id, division_id, week_number, bye_date")
    .eq("division_id", divisionId)
```

### D155 — lwrpc-admin/app/live-match/[id]/page.js:19

Object: `"matches"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/live-match/[id]/page.js`

```js
supabase
      .from("matches")
      .select(`
        *,
        divisions(name),
        locations(name),
        home_team:teams!matches_home_team_id_fkey(id, name),
        away_team:teams!matches_away_team_id_fkey(id, name),
        winning_team:teams!matches_winning_team_id_fkey(id, name)
      `)
      .eq("id", id)
      .single()
```

### D156 — lwrpc-admin/app/live-match/[id]/page.js:37

Object: `"match_lines"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/live-match/[id]/page.js`

```js
supabase
      .from("match_lines")
      .select(`
        *,
        winning_team:teams!match_lines_winning_team_id_fkey(id, name),
        division_lines (
          line_name,
          line_number,
          line_type,
          posted_to_dupr,
          games_per_line
        ),
        home_player_1:members!match_lines_home_player_1_id_fkey(first_name, last_name),
        home_player_2:members!match_lines_home_player_2_id_fkey(first_name, last_name),
        away_player_1:members!match_lines_away_player_1_id_fkey(first_name, last_name),
        away_player_2:members!match_lines_away_player_2_id_fkey(first_name, last_name)
      `)
      .eq("match_id", id)
      .order("line_number", { ascending: true })
```

### D157 — lwrpc-admin/app/live-match/[id]/page.js:67

Object: `"line_games"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/live-match/[id]/page.js`

```js
supabase
        .from("line_games")
        .select("*")
        .in("match_line_id", lineIds)
        .order("game_number", { ascending: true })
```

### D158 — lwrpc-admin/app/locations/page.js:49

Object: `"locations"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/locations/page.js`

```js
supabase
      .from("locations")
      .select(`
        *,
        club_pro:members!locations_club_pro_member_id_fkey (
          id,
          first_name,
          last_name,
          email
        ),
        club_pro_2:members!locations_club_pro_2_member_id_fkey (
          id,
          first_name,
          last_name,
          email
        )
      `)
      .order("name", { ascending: true })
```

### D159 — lwrpc-admin/app/locations/page.js:77

Object: `"members"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/locations/page.js`

```js
supabase
      .from("members")
      .select("id, first_name, last_name, email, is_active_member")
      .or("is_active_member.eq.true,is_active_member.is.null")
      .order("last_name", { ascending: true })
```

### D160 — lwrpc-admin/app/matches/[id]/page.js:98

Object: `"members"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/matches/[id]/page.js`

```js
supabase
        .from("members")
        .select("*")
        .eq("email", user.email)
        .maybeSingle()
```

### D161 — lwrpc-admin/app/matches/[id]/page.js:107

Object: `"matches"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/matches/[id]/page.js`

```js
supabase
      .from("matches")
      .select(`
        *,
        leagues(id, name, season_id),
        divisions(name, number_of_lines, games_per_line, rating_type, min_dupr, max_dupr, team_dupr_max),
        locations(name),
        home_team:teams!matches_home_team_id_fkey(
          id,
          name,
          captain_member_id,
          co_captain_member_id,
          co_captain_2_member_id,
          club_pro_member_id
        ),
        away_team:teams!matches_away_team_id_fkey(
          id,
          name,
          captain_member_id,
          co_captain_member_id,
          co_captain_2_member_id,
          club_pro_member_id
        ),
        winning_team:teams!matches_winning_team_id_fkey(id, name)
      `)
      .eq("id", id)
      .single()
```

### D162 — lwrpc-admin/app/matches/[id]/page.js:141

Object: `"match_lines"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/matches/[id]/page.js`

```js
supabase
      .from("match_lines")
      .select(`
        *,
        winning_team:teams!match_lines_winning_team_id_fkey(id, name),
        division_lines (
          id,
          line_name,
          line_number,
          line_type,
          game_format,
          games_per_line,
          points_to_win,
          win_by,
          team_win_points,
          picklebreaker_not_played_points,
          picklebreaker_not_played_award_rule,
          picklebreaker_play_rule,
          standings_points_mode,
          posted_to_dupr,
          uses_saved_match_lineups,
          score_required
        ),
        home_player_1:members!match_lines_home_player_1_id_fkey(id, first_name, last_name, self_rating),
        home_player_2:members!match_lines_home_player_2_id_fkey(id, first_name, last_name, self_rating),
        away_player_1:members!match_lines_away_player_1_id_fkey(id, first_name, last_name, self_rating),
        away_player_2:members!match_lines_away_player_2_id_fkey(id, first_name, last_name, self_rating)
      `)
      .eq("match_id", id)
      .order("line_number", { ascending: true })
```

### D163 — lwrpc-admin/app/matches/[id]/page.js:182

Object: `"division_lines"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/matches/[id]/page.js`

```js
supabase
        .from("division_lines")
        .select(`
          id,
          line_name,
          line_number,
          line_type,
          game_format,
          games_per_line,
          points_to_win,
          win_by,
          team_win_points,
          picklebreaker_not_played_points,
          picklebreaker_not_played_award_rule,
          picklebreaker_play_rule,
          standings_points_mode,
          posted_to_dupr,
          uses_saved_match_lineups,
          score_required
        `)
        .eq("division_id", matchData.division_id)
```

### D164 — lwrpc-admin/app/matches/[id]/page.js:219

Object: `"team_members"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/matches/[id]/page.js`

```js
supabase
      .from("team_members")
      .select("*, members(id, first_name, last_name, self_rating, dupr_id)")
      .eq("team_id", matchData.home_team_id)
      .order("members(last_name)", { ascending: true })
```

### D165 — lwrpc-admin/app/matches/[id]/page.js:231

Object: `"team_members"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/matches/[id]/page.js`

```js
supabase
      .from("team_members")
      .select("*, members(id, first_name, last_name, self_rating, dupr_id)")
      .eq("team_id", matchData.away_team_id)
      .order("members(last_name)", { ascending: true })
```

### D166 — lwrpc-admin/app/matches/[id]/page.js:247

Object: `"line_games"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/matches/[id]/page.js`

```js
supabase
        .from("line_games")
        .select("*")
        .in("match_line_id", lineIds)
        .order("game_number", { ascending: true })
```

### D167 — lwrpc-admin/app/matches/[id]/page.js:295

Object: `"line_games"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/matches/[id]/page.js`

```js
supabase
        .from("line_games")
        .select("*")
        .in("match_line_id", lineIds)
        .order("game_number", { ascending: true })
```

### D168 — lwrpc-admin/app/matches/[id]/page.js:310

Object: `"match_lineups"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/matches/[id]/page.js`

```js
supabase
      .from("match_lineups")
      .select(`
        *,
        player_1:members!match_lineups_player_1_member_id_fkey(id, first_name, last_name, self_rating),
        player_2:members!match_lineups_player_2_member_id_fkey(id, first_name, last_name, self_rating)
      `)
      .eq("match_id", id)
      .order("line_number", { ascending: true })
```

### D169 — lwrpc-admin/app/matches/[id]/page.js:330

Object: `"member_season_ratings"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/matches/[id]/page.js`

```js
supabase
        .from("member_season_ratings")
        .select("*")
        .eq("season_id", seasonId)
```

### D170 — lwrpc-admin/app/matches/[id]/page.js:380

Object: `"member_season_ratings"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/matches/[id]/page.js`

```js
supabase
      .from("member_season_ratings")
      .select("*")
      .eq("season_id", seasonId)
```

### D171 — lwrpc-admin/app/matches/[id]/page.js:1820

Object: `"teams"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/matches/[id]/page.js`

```js
supabase
        .from("teams")
        .select(`
          id,
          captain:members!teams_captain_member_id_fkey (
            id,
            first_name,
            last_name,
            email,
            phone,
            notification_preference
          ),
          co_captain_1:members!teams_co_captain_member_id_fkey (
            id,
            first_name,
            last_name,
            email,
            phone,
            notification_preference
          ),
          co_captain_2:members!teams_co_captain_2_member_id_fkey (
            id,
            first_name,
            last_name,
            email,
            phone,
            notification_preference
          ),
          club_pro:members!teams_club_pro_member_id_fkey (
            id,
            first_name,
            last_name,
            email,
            phone,
            notification_preference
          )
        `)
        .in("id", teamIds)
```

### D172 — lwrpc-admin/app/member-import/page.js:94

Object: `"members"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/member-import/page.js`

```js
supabase
      .from("members")
      .select(`
        id,
        email,
        first_name,
        last_name,
        phone,
        dupr_id,
        membershipworks_id,
        membershipworks_account_id,
        membership_status,
        membership_level,
        membership_levels,
        renewal_date,
        is_active_member,
        club_location,
        location_id,
        user_roles (
          role
        )
      `)
      .range(0, 5000)
```

### D173 — lwrpc-admin/app/member-import/page.js:376

Object: `"members"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/member-import/page.js`

```js
supabase
          .from("members")
          .select("id")
          .eq("email", user.email)
          .maybeSingle()
```

### D174 — lwrpc-admin/app/member-import/page.js:466

Object: `"locations"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/member-import/page.js`

```js
supabase.from("locations").select("id, name, is_active")
```

### D175 — lwrpc-admin/app/members/page.js:119

Object: `"seasons"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/members/page.js`

```js
supabase
        .from("seasons")
        .select("id, name, is_active, start_date")
        .order("start_date", { ascending: false })
```

### D176 — lwrpc-admin/app/members/page.js:123

Object: `"locations"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/members/page.js`

```js
supabase
        .from("locations")
        .select("id, name")
        .or("is_active.eq.true,is_active.is.null")
        .order("name", { ascending: true })
```

### D177 — lwrpc-admin/app/members/page.js:268

Object: `"user_roles"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/members/page.js`

```js
supabase
        .from("user_roles")
        .select("id, member_id, role")
        .eq("role", "captain")
```

### D178 — lwrpc-admin/app/members/page.js:360

Object: `"members"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/members/page.js`

```js
supabase
      .from("members")
      .insert({
        first_name: firstName || null,
        last_name: lastName || null,
        email: normalizedEmail || null,
        phone: formatPhoneNumberForStorage(newMemberForm.phone) || null,
        membershipworks_account_id: manualMembershipWorksAccountId(),
        notification_preference: newMemberForm.notification_preference || NOTIFICATION_EMAIL,
        club_location: newMemberForm.club_location.trim() || null,
        location_id: locationIdForName(clubLocations, newMemberForm.club_location),
        dupr_id: newMemberForm.dupr_id.trim() || null,
        renewal_date: newMemberForm.renewal_date || null,
      })
      .select("*")
      .single()
```

### D179 — lwrpc-admin/app/members/page.js:424

Object: `"team_members"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/members/page.js`

```js
supabase
        .from("team_members")
        .select(`
          teams (
            id,
            name,
            is_active,
            divisions (
              id,
              name,
              is_active,
              leagues (
                id,
                name,
                abbreviation,
                season_id,
                is_active,
                seasons (
                  id,
                  name,
                  abbreviation,
                  is_active
                )
              )
            )
          )
        `)
        .eq("member_id", memberId)
```

### D180 — lwrpc-admin/app/members/page.js:452

Object: `"match_lines"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/members/page.js`

```js
supabase
        .from("match_lines")
        .select(`
          id,
          line_number,
          home_player_1_id,
          home_player_2_id,
          away_player_1_id,
          away_player_2_id,
          home_team_games_won,
          away_team_games_won,
          winning_team_id,
          home_player_1_rating_at_play,
          home_player_2_rating_at_play,
          away_player_1_rating_at_play,
          away_player_2_rating_at_play,
          line_games (
            id,
            game_number,
            home_score,
            away_score,
            game_status
          ),
          division_lines (
            id,
            line_name,
            line_type
          ),
          matches (
            id,
            scheduled_date,
            scheduled_time,
            status,
            score_status,
            home_score,
            away_score,
            winning_team_id,
            result_type,
            result_notes,
            home_team_id,
            away_team_id,
            home_team:teams!matches_home_team_id_fkey (
              id,
              name,
              is_active
            ),
            away_team:teams!matches_away_team_id_fkey (
              id,
              name,
              is_active
            ),
            divisions (
              id,
              name,
              is_active
            ),
            leagues (
              id,
              name,
              abbreviation,
              season_id,
              is_active,
              seasons (
                id,
                name,
                abbreviation,
                is_active
              )
            )
          )
        `)
        .or(playerFilter)
```

### D181 — lwrpc-admin/app/members/page.js:544

Object: `"member_season_ratings"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/members/page.js`

```js
supabase
      .from("member_season_ratings")
      .select(`
        *,
        seasons (
          id,
          name,
          start_date,
          end_date
        )
      `)
      .eq("member_id", memberId)
      .order("created_at", { ascending: false })
```

### D182 — lwrpc-admin/app/members/page.js:1356

Object: `"team_members"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/members/page.js`

```js
supabase
      .from("team_members")
      .select(`
        member_id,
        teams (
          id,
          name,
          is_active,
          captain_member_id,
          co_captain_member_id,
          co_captain_2_member_id,
          club_pro_member_id,
          divisions (
            id,
            name,
            leagues (
              id,
              name,
              season_id,
              seasons (
                id,
                name
              )
            )
          )
        )
      `)
      .range(from, from + pageSize - 1)
```

### D183 — lwrpc-admin/app/members/page.js:1409

Object: `"teams"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/members/page.js`

```js
supabase
      .from("teams")
      .select(`
        id,
        name,
        is_active,
        captain_member_id,
        co_captain_member_id,
        co_captain_2_member_id,
        club_pro_member_id,
        divisions (
          id,
          name,
          leagues (
            id,
            name,
            season_id,
            seasons (
              id,
              name
            )
          )
        )
      `)
      .range(from, from + pageSize - 1)
```

### D184 — lwrpc-admin/app/members/page.js:1484

Object: `"members"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/members/page.js`

```js
supabase
      .from("members")
      .select(`
        id,
        first_name,
        last_name,
        full_name,
        email,
        phone,
        notification_preference,
        club_location,
        dupr_id,
        is_active_member,
        user_roles (
          role
        )
      `)
      .order("last_name", { ascending: true })
      .range(from, from + pageSize - 1)
```

### D185 — lwrpc-admin/app/members/page.js:1522

Object: `"member_season_ratings"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/members/page.js`

```js
supabase
      .from("member_season_ratings")
      .select("member_id, season_id, dupr_doubles_rating, season_dupr_rating, season_primetime_rating")
      .range(from, from + pageSize - 1)
```

### D186 — lwrpc-admin/app/members/[id]/page.js:62

Object: `"members"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/members/[id]/page.js`

```js
supabase
      .from("members")
      .select("*")
      .eq("id", id)
      .single()
```

### D187 — lwrpc-admin/app/members/[id]/page.js:84

Object: `"member_season_ratings"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/members/[id]/page.js`

```js
supabase
      .from("member_season_ratings")
      .select(`
        *,
        seasons (
          id,
          name,
          start_date,
          end_date
        )
      `)
      .eq("member_id", id)
      .order("created_at", { ascending: false })
```

### D188 — lwrpc-admin/app/members/[id]/page.js:103

Object: `"team_members"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/members/[id]/page.js`

```js
supabase
      .from("team_members")
      .select(`
        *,
        teams (
          id,
          name,
          is_active,
          captain_member_id,
          co_captain_member_id,
          co_captain_2_member_id,
          club_pro_member_id,
          divisions (
            id,
            name,
            is_active,
            leagues (
              id,
              name,
              abbreviation,
              season_id,
              is_active,
              seasons (
                id,
                name,
                abbreviation,
                is_active
              )
            )
          )
        )
      `)
      .eq("member_id", id)
```

### D189 — lwrpc-admin/app/members/[id]/page.js:149

Object: `"match_lines"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/members/[id]/page.js`

```js
supabase
      .from("match_lines")
      .select(`
        id,
        line_number,
        home_player_1_id,
        home_player_2_id,
        away_player_1_id,
        away_player_2_id,
        home_team_games_won,
        away_team_games_won,
        winning_team_id,
        home_player_1_rating_at_play,
        home_player_2_rating_at_play,
        away_player_1_rating_at_play,
        away_player_2_rating_at_play,
        line_games (
          id,
          game_number,
          home_score,
          away_score,
          game_status
        ),
        division_lines (
          id,
          line_name,
          line_type
        ),
        matches (
          id,
          scheduled_date,
          scheduled_time,
          status,
          score_status,
          home_score,
          away_score,
          winning_team_id,
          result_type,
          result_notes,
          home_team_id,
          away_team_id,
          home_team:teams!matches_home_team_id_fkey (
            id,
            name,
            is_active
          ),
          away_team:teams!matches_away_team_id_fkey (
            id,
            name,
            is_active
          ),
          divisions (
            id,
            name,
            is_active
          ),
          leagues (
            id,
            name,
            abbreviation,
            season_id,
            is_active,
            seasons (
              id,
              name,
              abbreviation,
              is_active
            )
          )
        )
      `)
      .or(playerFilter)
```

### D190 — lwrpc-admin/app/members/[id]/page.js:226

Object: `"user_roles"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/members/[id]/page.js`

```js
supabase
  .from("user_roles")
  .select("*")
  .eq("member_id", id)
  .maybeSingle()
```

### D191 — lwrpc-admin/app/members/[id]/page.js:237

Object: `"locations"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/members/[id]/page.js`

```js
supabase
  .from("locations")
  .select("id, name")
  .or("is_active.eq.true,is_active.is.null")
  .order("name", { ascending: true })
```

### D192 — lwrpc-admin/app/members/[id]/page.js:357

Object: `"members"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/members/[id]/page.js`

```js
supabase
      .from("members")
      .update({
        first_name: form.first_name || null,
        last_name: form.last_name || null,
        email: normalizedEmail || null,
        phone: formatPhoneNumberForStorage(form.phone) || null,
        notification_preference: form.notification_preference || NOTIFICATION_EMAIL,
        club_location: form.club_location || null,
        location_id: locationIdForName(locations, form.club_location),
        dupr_id: form.dupr_id || null,
        renewal_date: form.renewal_date || null,
        notes: form.notes.trim() || null,
      })
      .eq("id", id)
      .select("*")
      .single()
```

### D193 — lwrpc-admin/app/members/[id]/page.js:481

Object: `"user_roles"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/members/[id]/page.js`

```js
supabase
      .from("user_roles")
      .update({
        role: newRole,
        updated_at: new Date().toISOString(),
      })
      .eq("id", roleRow.id)
      .select("*")
      .single()
```

### D194 — lwrpc-admin/app/members/[id]/page.js:498

Object: `"user_roles"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/members/[id]/page.js`

```js
supabase
      .from("user_roles")
      .insert({
        user_id: null,
        member_id: id,
        role: newRole,
      })
      .select("*")
      .single()
```

### D195 — lwrpc-admin/app/members/[id]/page.js:531

Object: `"members"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/members/[id]/page.js`

```js
supabase
    .from("members")
    .update({
      is_active_member: nextIsActive,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single()
```

### D196 — lwrpc-admin/app/player-dashboard/page.js:129

Object: `"leagues"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/player-dashboard/page.js`

```js
supabase
      .from("leagues")
      .select("id, name, league_document_bucket, code_of_conduct_pdf_path, captains_guide_pdf_path, league_rules_pdf_path, score_sheet_pdf_path, league_waiver_pdf_path")
      .ilike("name", "%weekday%")
      .order("is_active", { ascending: false })
      .order("name", { ascending: true })
      .limit(1)
      .maybeSingle()
```

### D197 — lwrpc-admin/app/player-dashboard/page.js:201

Object: `"divisions"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/player-dashboard/page.js`

```js
supabase
      .from("divisions")
      .select(`
        id,
        name,
        is_active,
        rating_type,
        leagues (
          id,
          name,
          season_id,
          is_active,
          seasons (
            id,
            name,
            is_active
          )
        )
      `)
```

### D198 — lwrpc-admin/app/player-dashboard/page.js:229

Object: `"team_members"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/player-dashboard/page.js`

```js
supabase
      .from("team_members")
      .select(`
        team_id,
        teams (
          id,
          name,
          is_active,
          divisions (
            id,
            name,
            rating_type,
            playoff_team_count,
            standings_tiebreak_1,
            standings_tiebreak_2,
            standings_tiebreak_3,
            leagues (
              id,
              name,
              abbreviation,
              season_id,
              seasons (
                id,
                name,
                abbreviation
              ),
              league_document_bucket,
              code_of_conduct_pdf_path,
              league_rules_pdf_path,
              league_waiver_pdf_path
            )
          ),
          locations (
            id,
            name
          ),
          captain:members!teams_captain_member_id_fkey (
            id,
            first_name,
            last_name,
            email,
            phone
          ),
          co_captain_1:members!teams_co_captain_member_id_fkey (
            id,
            first_name,
            last_name,
            email,
            phone
          ),
          co_captain_2:members!teams_co_captain_2_member_id_fkey (
            id,
            first_name,
            last_name,
            email,
            phone
          ),
          club_pro:members!teams_club_pro_member_id_fkey (
            id,
            first_name,
            last_name,
            email,
            phone
          )
        )
      `)
      .eq("member_id", memberData.id)
```

### D199 — lwrpc-admin/app/player-dashboard/page.js:323

Object: `"matches"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/player-dashboard/page.js`

```js
supabase
          .from("matches")
          .select(`
            *,
            divisions (
              id,
              name,
              rating_type,
              playoff_team_count
            ),
            leagues (
              id,
              name,
              abbreviation,
              season_id,
              seasons (
                id,
                name,
                abbreviation
              )
            ),
            locations (
              id,
              name,
              address,
              city,
              state,
              zip_code
            ),
            home_team:teams!matches_home_team_id_fkey (
              id,
              name,
              is_active
            ),
            away_team:teams!matches_away_team_id_fkey (
              id,
              name,
              is_active
            ),
            match_lines (
              id,
              line_number,
              home_team_games_won,
              away_team_games_won,
              winning_team_id,
              rating_type_at_play,
              home_player_1_rating_at_play,
              home_player_2_rating_at_play,
              away_player_1_rating_at_play,
              away_player_2_rating_at_play,
              home_team_rating_at_play,
              away_team_rating_at_play,
              ratings_snapshotted_at,
              division_lines (
                id,
                line_name,
                line_type,
                team_win_points,
                picklebreaker_not_played_points,
                picklebreaker_not_played_award_rule,
                picklebreaker_play_rule
              ),
              home_player_1:members!match_lines_home_player_1_id_fkey (
                id,
                first_name,
                last_name,
                email,
                self_rating
              ),
              home_player_2:members!match_lines_home_player_2_id_fkey (
                id,
                first_name,
                last_name,
                email,
                self_rating
              ),
              away_player_1:members!match_lines_away_player_1_id_fkey (
                id,
                first_name,
                last_name,
                email,
                self_rating
              ),
              away_player_2:members!match_lines_away_player_2_id_fkey (
                id,
                first_name,
                last_name,
                email,
                self_rating
              ),
              line_games (
                id,
                game_number,
                home_score,
                away_score,
                game_status
              )
            )
          `)
          .or(
            `home_team_id.in.(${teamIds.join(",")}),away_team_id.in.(${teamIds.join(",")})`
          )
          .eq("is_published", true)
          .order("scheduled_date", { ascending: true })
          .order("scheduled_time", { ascending: true })
```

### D200 — lwrpc-admin/app/player-dashboard/page.js:428

Object: `"team_byes"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/player-dashboard/page.js`

```js
supabase
          .from("team_byes")
          .select(`
            *,
            teams (
              id,
              name
            ),
            divisions (
              id,
              name
            )
          `)
          .in("team_id", teamIds)
          .order("bye_date", { ascending: true })
```

### D201 — lwrpc-admin/app/player-dashboard/page.js:443

Object: `"matches"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/player-dashboard/page.js`

```js
supabase
          .from("matches")
          .select("id, division_id, week_number, scheduled_date")
          .in("division_id", divisionIds.length > 0 ? divisionIds : ["00000000-0000-0000-0000-000000000000"])
          .eq("is_published", true)
```

### D202 — lwrpc-admin/app/player-dashboard/page.js:448

Object: `"team_standings"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/player-dashboard/page.js`

```js
supabase
          .from("team_standings")
          .select(`
            *,
        teams (
          id,
          name,
          is_active
        )
          `)
          .in("division_id", divisionIds.length > 0 ? divisionIds : ["00000000-0000-0000-0000-000000000000"])
          .order("rank", { ascending: true })
```

### D203 — lwrpc-admin/app/player-dashboard/page.js:496

Object: `"members"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/player-dashboard/page.js`

```js
supabase
          .from("members")
          .select("id, first_name, last_name, email")
          .in("id", scoreMemberIds)
```

### D204 — lwrpc-admin/app/player-dashboard/page.js:512

Object: `"team_members"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/player-dashboard/page.js`

```js
supabase
        .from("team_members")
        .select(`
          team_id,
          members (
            id,
            first_name,
            last_name,
            email,
            phone,
            self_rating,
            profile_image_urls
          )
        `)
        .in("team_id", matchTeamIds)
```

### D205 — lwrpc-admin/app/player-dashboard/page.js:541

Object: `"match_lines"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/player-dashboard/page.js`

```js
supabase
      .from("match_lines")
      .select(`
        id,
        line_number,
        posted_to_dupr,
        home_player_1_id,
        home_player_2_id,
        away_player_1_id,
        away_player_2_id,
        home_team_games_won,
        away_team_games_won,
        winning_team_id,
        rating_type_at_play,
        home_player_1_rating_at_play,
        home_player_2_rating_at_play,
        away_player_1_rating_at_play,
        away_player_2_rating_at_play,
        home_team_rating_at_play,
        away_team_rating_at_play,
        ratings_snapshotted_at,
        line_games (
          id,
          game_number,
          home_score,
          away_score,
          game_status
        ),
        home_player_1:members!match_lines_home_player_1_id_fkey (
          id,
          first_name,
          last_name,
          email,
          self_rating
        ),
        home_player_2:members!match_lines_home_player_2_id_fkey (
          id,
          first_name,
          last_name,
          email,
          self_rating
        ),
        away_player_1:members!match_lines_away_player_1_id_fkey (
          id,
          first_name,
          last_name,
          email,
          self_rating
        ),
        away_player_2:members!match_lines_away_player_2_id_fkey (
          id,
          first_name,
          last_name,
          email,
          self_rating
        ),
        division_lines (
          id,
          line_name,
          line_type,
          posted_to_dupr,
          team_win_points,
          picklebreaker_not_played_points,
          picklebreaker_not_played_award_rule,
          picklebreaker_play_rule
        ),
        matches (
          id,
          scheduled_date,
          scheduled_time,
          status,
          score_status,
          home_team_id,
          away_team_id,
            home_team:teams!matches_home_team_id_fkey (
              id,
              name,
              is_active
            ),
            away_team:teams!matches_away_team_id_fkey (
              id,
              name,
              is_active
            ),
          divisions (
            id,
            name,
            rating_type
          ),
            leagues (
              id,
              name,
              abbreviation,
              season_id,
              seasons (
                id,
                name,
                abbreviation
              )
            )
        )
      `)
      .or(
        `home_player_1_id.eq.${memberData.id},home_player_2_id.eq.${memberData.id},away_player_1_id.eq.${memberData.id},away_player_2_id.eq.${memberData.id}`
      )
```

### D206 — lwrpc-admin/app/player-dashboard/page.js:682

Object: `"member_season_ratings"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/player-dashboard/page.js`

```js
supabase
        .from("member_season_ratings")
        .select("member_id, season_id, season_dupr_rating, season_primetime_rating")
        .in("season_id", seasonIds)
        .in("member_id", ratingMemberIds)
```

### D207 — lwrpc-admin/app/player-dashboard/page.js:980

Object: `"match_lineups"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/player-dashboard/page.js`

```js
supabase
      .from("match_lineups")
      .select("match_id, team_id, line_number, player_1_member_id, player_2_member_id, player_1:members!match_lineups_player_1_member_id_fkey(id, first_name, last_name, email, self_rating), player_2:members!match_lineups_player_2_member_id_fkey(id, first_name, last_name, email, self_rating)")
      .eq("match_id", match.id)
      .order("team_id", { ascending: true })
      .order("line_number", { ascending: true })
```

### D208 — lwrpc-admin/app/player-dashboard/page.js:1146

Object: `"teams"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/player-dashboard/page.js`

```js
supabase
        .from("teams")
        .select(`
          id,
          name,
          division_id,
          locations(id, name),
          captain:members!teams_captain_member_id_fkey(id, first_name, last_name, full_name, email),
          co_captain_1:members!teams_co_captain_member_id_fkey(id, first_name, last_name, full_name, email),
          co_captain_2:members!teams_co_captain_2_member_id_fkey(id, first_name, last_name, full_name, email)
        `)
        .eq("division_id", divisionId)
        .order("name", { ascending: true })
```

### D209 — lwrpc-admin/app/player-dashboard/page.js:1159

Object: `"matches"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/player-dashboard/page.js`

```js
supabase
        .from("matches")
        .select(`
          id,
          league_id,
          division_id,
          home_team_id,
          away_team_id,
          location_id,
          scheduled_date,
          scheduled_time,
          week_number,
          status,
          score_status,
          score_entered_at,
          score_verified_at,
          home_score,
          away_score,
          winning_team_id,
          result_type,
          result_notes,
          is_published,
          locations ( id, name ),
          home_team:teams!matches_home_team_id_fkey ( id, name ),
          away_team:teams!matches_away_team_id_fkey ( id, name ),
          match_lines (
            id,
            line_number,
            posted_to_dupr,
            home_team_games_won,
            away_team_games_won,
            winning_team_id,
            rating_type_at_play,
            home_player_1_rating_at_play,
            home_player_2_rating_at_play,
            away_player_1_rating_at_play,
            away_player_2_rating_at_play,
            home_team_rating_at_play,
            away_team_rating_at_play,
            ratings_snapshotted_at,
            division_lines ( line_name, line_type, posted_to_dupr, team_win_points, picklebreaker_not_played_points, picklebreaker_not_played_award_rule, picklebreaker_play_rule ),
            home_player_1:members!match_lines_home_player_1_id_fkey(id, first_name, last_name, self_rating),
            home_player_2:members!match_lines_home_player_2_id_fkey(id, first_name, last_name, self_rating),
            away_player_1:members!match_lines_away_player_1_id_fkey(id, first_name, last_name, self_rating),
            away_player_2:members!match_lines_away_player_2_id_fkey(id, first_name, last_name, self_rating),
            line_games ( id, game_number, home_score, away_score, game_status )
          )
        `)
        .eq("division_id", divisionId)
        .eq("is_published", true)
        .order("scheduled_date", { ascending: true })
        .order("scheduled_time", { ascending: true })
```

### D210 — lwrpc-admin/app/player-dashboard/page.js:1211

Object: `"team_byes"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/player-dashboard/page.js`

```js
supabase
        .from("team_byes")
        .select(`
          *,
          teams (
            id,
            name
          ),
          divisions (
            id,
            name
          )
        `)
        .eq("division_id", divisionId)
        .order("bye_date", { ascending: true })
```

### D211 — lwrpc-admin/app/player-dashboard/page.js:1226

Object: `"team_standings"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/player-dashboard/page.js`

```js
supabase
        .from("team_standings")
        .select("team_id, rank, standings_points, match_wins, match_losses")
        .eq("division_id", divisionId)
```

### D212 — lwrpc-admin/app/player-dashboard/page.js:1231

Object: `"member_season_ratings"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/player-dashboard/page.js`

```js
supabase
            .from("member_season_ratings")
            .select("member_id, season_dupr_rating, season_primetime_rating")
            .eq("season_id", seasonId)
```

### D213 — lwrpc-admin/app/ratings/page.js:107

Object: `"seasons"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/ratings/page.js`

```js
supabase
      .from("seasons")
      .select("*")
      .order("name", { ascending: true })
```

### D214 — lwrpc-admin/app/ratings/page.js:222

Object: `"member_season_ratings"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/ratings/page.js`

```js
supabase
        .from("member_season_ratings")
        .insert(newRow)
        .select(RATING_SELECT)
        .single()
```

### D215 — lwrpc-admin/app/ratings/page.js:910

Object: `"team_members"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/ratings/page.js`

```js
supabase
      .from("team_members")
      .select(`
        member_id,
        teams (
          id,
          is_active,
          divisions (
            id,
            max_dupr,
            leagues (
              id,
              season_id
            )
          )
        )
      `)
```

### D216 — lwrpc-admin/app/ratings/page.js:2379

Object: `"members"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/ratings/page.js`

```js
supabase
      .from("members")
      .select("id, first_name, last_name, email, club_location, dupr_id, self_rating, created_at, is_active_member")
      .or("is_active_member.eq.true,is_active_member.is.null")
      .order("last_name", { ascending: true })
      .order("first_name", { ascending: true })
      .order("id", { ascending: true })
      .range(from, from + pageSize - 1)
```

### D217 — lwrpc-admin/app/ratings/page.js:2401

Object: `"member_season_ratings"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/ratings/page.js`

```js
supabase
      .from("member_season_ratings")
      .select(RATING_SELECT)
```

### D218 — lwrpc-admin/app/ratings/page.js:2425

Object: `"team_members"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/ratings/page.js`

```js
supabase
      .from("team_members")
      .select(`
        member_id,
        teams (
          id,
          is_active,
          divisions (
            min_dupr,
            max_dupr,
            rating_type,
            leagues (
              season_id
            )
          )
        )
      `)
      .range(from, from + pageSize - 1)
```

### D219 — lwrpc-admin/app/schedule-editor/page.js:52

Object: `"matches"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/schedule-editor/page.js`

```js
supabase
      .from("matches")
      .select(`
        *,
        leagues (
          id,
          name
        ),
        divisions (
          id,
          name
        ),
        locations (
          id,
          name,
          number_of_courts
        ),
        home_team:teams!matches_home_team_id_fkey (
          id,
          name,
          home_location_id
        ),
        away_team:teams!matches_away_team_id_fkey (
          id,
          name,
          home_location_id
        )
      `)
      .order("scheduled_date", { ascending: true })
      .order("scheduled_time", { ascending: true })
```

### D220 — lwrpc-admin/app/schedule-editor/page.js:88

Object: `"leagues"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/schedule-editor/page.js`

```js
supabase
      .from("leagues")
      .select("id, name, is_active, seasons(is_active)")
      .order("name", { ascending: true })
```

### D221 — lwrpc-admin/app/schedule-editor/page.js:93

Object: `"divisions"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/schedule-editor/page.js`

```js
supabase
      .from("divisions")
      .select("id, name, league_id, is_active")
      .order("name", { ascending: true })
```

### D222 — lwrpc-admin/app/schedule-editor/page.js:98

Object: `"locations"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/schedule-editor/page.js`

```js
supabase
      .from("locations")
      .select("id, name, number_of_courts")
      .order("name", { ascending: true })
```

### D223 — lwrpc-admin/app/schedule-editor/page.js:107

Object: `"teams"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/schedule-editor/page.js`

```js
supabase
      .from("teams")
      .select("id, name, division_id, home_location_id, is_active")
```

### D224 — lwrpc-admin/app/schedule-editor/page.js:125

Object: `"members"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/schedule-editor/page.js`

```js
supabase
        .from("members")
        .select("id, first_name, last_name, email")
        .in("id", [...new Set(scoreMemberIds)])
```

### D225 — lwrpc-admin/app/schedule-editor/page.js:723

Object: `"match_lines"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/schedule-editor/page.js`

```js
supabase
      .from("match_lines")
      .select("id")
      .eq("match_id", match.id)
```

### D226 — lwrpc-admin/app/schedule-editor/page.js:786

Object: `"match_lines"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/schedule-editor/page.js`

```js
supabase
      .from("match_lines")
      .select("id")
      .eq("match_id", match.id)
```

### D227 — lwrpc-admin/app/scheduling/page.js:108

Object: `"leagues"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/scheduling/page.js`

```js
supabase
      .from("leagues")
      .select("id, name, is_active, seasons(is_active)")
      .order("name", { ascending: true })
```

### D228 — lwrpc-admin/app/scheduling/page.js:114

Object: `"divisions"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/scheduling/page.js`

```js
supabase
      .from("divisions")
      .select("id, name, league_id, is_active")
      .order("name", { ascending: true })
```

### D229 — lwrpc-admin/app/scheduling/page.js:120

Object: `"locations"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/scheduling/page.js`

```js
supabase
      .from("locations")
      .select("id, name, number_of_courts")
      .order("name", { ascending: true })
```

### D230 — lwrpc-admin/app/scheduling/page.js:144

Object: `"matches"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/scheduling/page.js`

```js
supabase
      .from("matches")
      .select("*")
```

### D231 — lwrpc-admin/app/scheduling/page.js:661

Object: `"division_lines"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/scheduling/page.js`

```js
supabase
      .from("division_lines")
      .select("*")
      .eq("division_id", divisionId)
      .order("line_number", { ascending: true })
```

### D232 — lwrpc-admin/app/scheduling/page.js:691

Object: `"match_lines"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/scheduling/page.js`

```js
supabase
      .from("match_lines")
      .insert(matchLineRows)
      .select("id, division_line_id")
```

### D233 — lwrpc-admin/app/scheduling/page.js:740

Object: `"teams"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/scheduling/page.js`

```js
supabase
      .from("teams")
      .select("id, name, home_location_id, is_active, locations(id, name)")
      .eq("division_id", setting.division_id)
      .neq("is_active", false)
      .order("name", { ascending: true })
```

### D234 — lwrpc-admin/app/scheduling/page.js:902

Object: `"matches"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/scheduling/page.js`

```js
supabase
        .from("matches")
        .insert(rowsToInsert)
        .select()
```

### D235 — lwrpc-admin/app/scheduling/page.js:958

Object: `"matches"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/scheduling/page.js`

```js
supabase
      .from("matches")
      .select("id")
      .eq("league_id", setting.league_id)
      .eq("division_id", setting.division_id)
```

### D236 — lwrpc-admin/app/scheduling/page.js:978

Object: `"match_lines"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/scheduling/page.js`

```js
supabase
      .from("match_lines")
      .select("id")
      .in("match_id", matchIds)
```

### D237 — lwrpc-admin/app/score-entry/[id]/page.js:55

Object: `"members"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/score-entry/[id]/page.js`

```js
supabase
        .from("members")
        .select("*")
        .eq("email", user.email)
        .maybeSingle()
```

### D238 — lwrpc-admin/app/score-entry/[id]/page.js:64

Object: `"matches"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/score-entry/[id]/page.js`

```js
supabase
      .from("matches")
      .select(`
        *,
        home_team:teams!matches_home_team_id_fkey(
          id,
          name,
          captain_member_id,
          co_captain_member_id,
          co_captain_2_member_id,
          club_pro_member_id
        ),
        away_team:teams!matches_away_team_id_fkey(
          id,
          name,
          captain_member_id,
          co_captain_member_id,
          co_captain_2_member_id,
          club_pro_member_id
        ),
        locations(name),
        leagues(id, season_id),
        divisions(name, rating_type, min_dupr, max_dupr, team_dupr_max)
      `)
      .eq("id", id)
      .single()
```

### D239 — lwrpc-admin/app/score-entry/[id]/page.js:96

Object: `"match_lines"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/score-entry/[id]/page.js`

```js
supabase
      .from("match_lines")
      .select(`
        *,
        home_player_1:members!match_lines_home_player_1_id_fkey(id, first_name, last_name, self_rating),
        home_player_2:members!match_lines_home_player_2_id_fkey(id, first_name, last_name, self_rating),
        away_player_1:members!match_lines_away_player_1_id_fkey(id, first_name, last_name, self_rating),
        away_player_2:members!match_lines_away_player_2_id_fkey(id, first_name, last_name, self_rating),
        division_lines (
          line_name,
          line_number,
          line_type,
          posted_to_dupr,
          games_per_line,
          points_to_win,
          win_by,
          team_win_points,
          picklebreaker_not_played_points,
          picklebreaker_not_played_award_rule,
          picklebreaker_play_rule,
          standings_points_mode,
          score_required
        )
      `)
      .eq("match_id", id)
      .order("line_number", { ascending: true })
```

### D240 — lwrpc-admin/app/score-entry/[id]/page.js:133

Object: `"line_games"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/score-entry/[id]/page.js`

```js
supabase
        .from("line_games")
        .select("*")
        .in("match_line_id", lineIds)
        .order("game_number", { ascending: true })
```

### D241 — lwrpc-admin/app/score-entry/[id]/page.js:151

Object: `"member_season_ratings"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/score-entry/[id]/page.js`

```js
supabase
        .from("member_season_ratings")
        .select("*")
        .eq("season_id", seasonId)
```

### D242 — lwrpc-admin/app/score-entry/[id]/page.js:174

Object: `"member_season_ratings"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/score-entry/[id]/page.js`

```js
supabase
      .from("member_season_ratings")
      .select("*")
      .eq("season_id", seasonId)
```

### D243 — lwrpc-admin/app/score-entry/[id]/page.js:494

Object: `"teams"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/score-entry/[id]/page.js`

```js
supabase
        .from("teams")
        .select(`
          id,
          captain:members!teams_captain_member_id_fkey (
            id,
            first_name,
            last_name,
            email,
            phone,
            notification_preference
          ),
          co_captain_1:members!teams_co_captain_member_id_fkey (
            id,
            first_name,
            last_name,
            email,
            phone,
            notification_preference
          ),
          co_captain_2:members!teams_co_captain_2_member_id_fkey (
            id,
            first_name,
            last_name,
            email,
            phone,
            notification_preference
          ),
          club_pro:members!teams_club_pro_member_id_fkey (
            id,
            first_name,
            last_name,
            email,
            phone,
            notification_preference
          )
        `)
        .eq("id", opposingTeamId)
        .single()
```

### D244 — lwrpc-admin/app/score-sheets/page.js:39

Object: `"score_sheet_templates"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/score-sheets/page.js`

```js
supabase
      .from("score_sheet_templates")
      .select("*")
      .order("is_default", { ascending: false })
      .order("name", { ascending: true })
```

### D245 — lwrpc-admin/app/scoring/page.js:124

Object: `"leagues"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/scoring/page.js`

```js
supabase.from("leagues").select("id, name, is_active, seasons(is_active)").order("name", { ascending: true })
```

### D246 — lwrpc-admin/app/scoring/page.js:125

Object: `"divisions"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/scoring/page.js`

```js
supabase.from("divisions").select("id, name, league_id, is_active, sort_order").order("sort_order", { ascending: true })
```

### D247 — lwrpc-admin/app/scoring/page.js:126

Object: `"teams"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/scoring/page.js`

```js
supabase.from("teams").select("id, name, division_id, is_active").order("name", { ascending: true })
```

### D248 — lwrpc-admin/app/scoring/page.js:127

Object: `"locations"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/scoring/page.js`

```js
supabase.from("locations").select("id, name").order("name", { ascending: true })
```

### D249 — lwrpc-admin/app/scoring/page.js:145

Object: `"matches"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/scoring/page.js`

```js
supabase
      .from("matches")
      .select(`
        id,
        league_id,
        division_id,
        home_team_id,
        away_team_id,
        location_id,
        notes,
        scheduled_date,
        result_type,
        scheduled_time,
        week_number,
        status,
        score_status,
        score_entered_by_member_id,
        score_entered_at,
        score_verified_by_member_id,
        score_verified_at,
        score_exported_at,
        home_score,
        away_score,
        divisions (
          id,
          name
        ),
        leagues (
          id,
          name
        ),
        locations (
          id,
          name
        ),
        home_team:teams!matches_home_team_id_fkey (
          id,
          name,
          captain:members!teams_captain_member_id_fkey (
            id,
            first_name,
            last_name,
            email,
            phone,
            notification_preference
          ),
          co_captain_1:members!teams_co_captain_member_id_fkey (
            id,
            first_name,
            last_name,
            email,
            phone,
            notification_preference
          ),
          co_captain_2:members!teams_co_captain_2_member_id_fkey (
            id,
            first_name,
            last_name,
            email,
            phone,
            notification_preference
          ),
          club_pro:members!teams_club_pro_member_id_fkey (
            id,
            first_name,
            last_name,
            email,
            phone,
            notification_preference
          )
        ),
        away_team:teams!matches_away_team_id_fkey (
          id,
          name,
          captain:members!teams_captain_member_id_fkey (
            id,
            first_name,
            last_name,
            email,
            phone,
            notification_preference
          ),
          co_captain_1:members!teams_co_captain_member_id_fkey (
            id,
            first_name,
            last_name,
            email,
            phone,
            notification_preference
          ),
          co_captain_2:members!teams_co_captain_2_member_id_fkey (
            id,
            first_name,
            last_name,
            email,
            phone,
            notification_preference
          ),
          club_pro:members!teams_club_pro_member_id_fkey (
            id,
            first_name,
            last_name,
            email,
            phone,
            notification_preference
          )
        )
      `)
      .order("scheduled_date", { ascending: true })
      .order("scheduled_time", { ascending: true })
```

### D250 — lwrpc-admin/app/scoring/page.js:272

Object: `"members"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/scoring/page.js`

```js
supabase
        .from("members")
        .select("id, first_name, last_name, email")
        .in("id", [...new Set(scoreMemberIds)])
```

### D251 — lwrpc-admin/app/scoring/page.js:456

Object: `"matches"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/scoring/page.js`

```js
supabase
      .from("matches")
      .delete()
      .eq("id", match.id)
      .neq("status", "completed")
      .select("id")
```

### D252 — lwrpc-admin/app/scoring/page.js:563

Object: `"matches"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/scoring/page.js`

```js
supabase
      .from("matches")
      .select(`
        id,
        league_id,
        division_id,
        home_team_id,
        away_team_id,
        location_id,
        notes,
        scheduled_date,
        score_status,
        score_exported_at,
        match_lines (
          id,
          line_number,
          posted_to_dupr,
          division_lines (
            posted_to_dupr,
            line_type,
            score_type
          ),
          home_player_1:members!match_lines_home_player_1_id_fkey(first_name, last_name, full_name, dupr_id),
          home_player_2:members!match_lines_home_player_2_id_fkey(first_name, last_name, full_name, dupr_id),
          away_player_1:members!match_lines_away_player_1_id_fkey(first_name, last_name, full_name, dupr_id),
          away_player_2:members!match_lines_away_player_2_id_fkey(first_name, last_name, full_name, dupr_id),
          line_games (
            game_number,
            home_score,
            away_score,
            game_status
          )
        )
      `)
      .eq("score_status", "verified")
      .in("id", exportMatches.map((match) => match.id))
```

### D253 — lwrpc-admin/app/scoring/page.js:949

Object: `"matches"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/scoring/page.js`

```js
supabase
        .from("matches")
        .update(structureLocked ? schedulePayload : fullPayload)
        .eq("id", match.id)
        .select("id")
        .single()
```

### D254 — lwrpc-admin/app/scoring/page.js:971

Object: `"matches"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/scoring/page.js`

```js
supabase
        .from("matches")
        .insert({ ...fullPayload, status: "scheduled" })
        .select("id")
        .single()
```

### D255 — lwrpc-admin/app/scoring/page.js:1123

Object: `"division_lines"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/scoring/page.js`

```js
supabase
    .from("division_lines")
    .select("id, line_number, posted_to_dupr, games_per_line")
    .eq("division_id", divisionId)
    .order("line_number", { ascending: true })
```

### D256 — lwrpc-admin/app/scoring/page.js:1131

Object: `"match_lines"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/scoring/page.js`

```js
supabase
    .from("match_lines")
    .insert(lineTemplates.map((line) => ({
      match_id: matchId,
      division_line_id: line.id,
      line_number: line.line_number,
      posted_to_dupr: line.posted_to_dupr,
      line_status: "scheduled",
    })))
    .select("id, division_line_id")
```

### D257 — lwrpc-admin/app/seasons/page.js:44

Object: `"seasons"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/seasons/page.js`

```js
supabase
      .from("seasons")
      .select("*")
      .order("name", { ascending: true })
```

### D258 — lwrpc-admin/app/seasons/page.js:160

Object: `"leagues"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/seasons/page.js`

```js
supabase
      .from("leagues")
      .select("id")
      .eq("season_id", seasonId)
```

### D259 — lwrpc-admin/app/seasons/page.js:169

Object: `"divisions"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/seasons/page.js`

```js
supabase.from("divisions").select("id, league_id").in("league_id", leagueIds)
```

### D260 — lwrpc-admin/app/seasons/page.js:176

Object: `"teams"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/seasons/page.js`

```js
supabase.from("teams").select("id, division_id").in("division_id", divisionIds)
```

### D261 — lwrpc-admin/app/standings/page.js:41

Object: `"leagues"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/standings/page.js`

```js
supabase
      .from("leagues")
      .select("*, seasons(is_active)")
      .order("name", { ascending: true })
```

### D262 — lwrpc-admin/app/standings/page.js:46

Object: `"divisions"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/standings/page.js`

```js
supabase
      .from("divisions")
      .select("*, leagues(id, name, season_id)")
      .order("name", { ascending: true })
```

### D263 — lwrpc-admin/app/standings/page.js:51

Object: `"team_standings"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/standings/page.js`

```js
supabase
      .from("team_standings")
      .select(`
        *,
        teams (
          id,
          name,
          abbreviation,
          is_active
        )
      `)
      .order("rank", { ascending: true })
```

### D264 — lwrpc-admin/app/standings/page.js:64

Object: `"matches"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/standings/page.js`

```js
supabase
      .from("matches")
      .select("id, division_id, week_number, scheduled_date")
      .eq("is_published", true)
```

### D265 — lwrpc-admin/app/standings/page.js:69

Object: `"team_byes"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/standings/page.js`

```js
supabase
      .from("team_byes")
      .select("id, team_id, division_id, week_number, bye_date")
```

### D266 — lwrpc-admin/app/standings/page.js:243

Object: `"teams"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/standings/page.js`

```js
supabase
        .from("teams")
        .select(`
          id,
          name,
          division_id,
          locations(id, name),
          captain:members!teams_captain_member_id_fkey(id, first_name, last_name, full_name, email),
          co_captain_1:members!teams_co_captain_member_id_fkey(id, first_name, last_name, full_name, email),
          co_captain_2:members!teams_co_captain_2_member_id_fkey(id, first_name, last_name, full_name, email)
        `)
        .eq("division_id", team.division_id)
        .order("name", { ascending: true })
```

### D267 — lwrpc-admin/app/standings/page.js:256

Object: `"matches"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/standings/page.js`

```js
supabase
        .from("matches")
        .select(`
          id,
          league_id,
          division_id,
          home_team_id,
          away_team_id,
          location_id,
          scheduled_date,
          scheduled_time,
          week_number,
          status,
          score_status,
          score_entered_at,
          score_verified_at,
          home_score,
          away_score,
          winning_team_id,
          result_type,
          result_notes,
          is_published,
          locations (
            id,
            name
          ),
          home_team:teams!matches_home_team_id_fkey (
            id,
            name
          ),
          away_team:teams!matches_away_team_id_fkey (
            id,
            name
          ),
          match_lines (
            id,
            line_number,
            home_team_games_won,
            away_team_games_won,
            winning_team_id,
            rating_type_at_play,
            home_player_1_rating_at_play,
            home_player_2_rating_at_play,
            away_player_1_rating_at_play,
            away_player_2_rating_at_play,
            home_team_rating_at_play,
            away_team_rating_at_play,
            ratings_snapshotted_at,
            division_lines (
              line_name,
              line_type,
              team_win_points,
              picklebreaker_not_played_points,
              picklebreaker_not_played_award_rule,
              picklebreaker_play_rule
            ),
            home_player_1:members!match_lines_home_player_1_id_fkey(id, first_name, last_name, self_rating),
            home_player_2:members!match_lines_home_player_2_id_fkey(id, first_name, last_name, self_rating),
            away_player_1:members!match_lines_away_player_1_id_fkey(id, first_name, last_name, self_rating),
            away_player_2:members!match_lines_away_player_2_id_fkey(id, first_name, last_name, self_rating),
            line_games (
              id,
              game_number,
              home_score,
              away_score,
              game_status
            )
          )
        `)
        .eq("division_id", team.division_id)
        .eq("is_published", true)
        .order("scheduled_date", { ascending: true })
        .order("scheduled_time", { ascending: true })
```

### D268 — lwrpc-admin/app/standings/page.js:329

Object: `"team_byes"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/standings/page.js`

```js
supabase
        .from("team_byes")
        .select(`
          *,
          teams (
            id,
            name
          ),
          divisions (
            id,
            name
          )
        `)
        .eq("division_id", team.division_id)
        .order("bye_date", { ascending: true })
```

### D269 — lwrpc-admin/app/standings/page.js:344

Object: `"team_standings"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/standings/page.js`

```js
supabase
        .from("team_standings")
        .select("team_id, rank, standings_points, match_wins, match_losses")
        .eq("division_id", team.division_id)
```

### D270 — lwrpc-admin/app/standings/page.js:349

Object: `"member_season_ratings"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/standings/page.js`

```js
supabase
            .from("member_season_ratings")
            .select("member_id, season_dupr_rating, season_primetime_rating")
            .eq("season_id", seasonId)
```

### D271 — lwrpc-admin/app/teams/page.js:216

Object: `"leagues"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/teams/page.js`

```js
supabase
      .from("leagues")
      .select(`
        id,
        name,
        is_active,
        seasons (
          id,
          name,
          is_active
        )
      `)
      .order("name", { ascending: true })
```

### D272 — lwrpc-admin/app/teams/page.js:230

Object: `"divisions"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/teams/page.js`

```js
supabase
      .from("divisions")
      .select("id, name, league_id, is_active")
      .order("name", { ascending: true })
```

### D273 — lwrpc-admin/app/teams/page.js:235

Object: `"locations"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/teams/page.js`

```js
supabase
      .from("locations")
      .select("id, name")
      .order("name", { ascending: true })
```

### D274 — lwrpc-admin/app/teams/page.js:248

Object: `"teams"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/teams/page.js`

```js
supabase
      .from("teams")
      .select(`
        *,
        divisions (
          id,
          name,
          league_id,
          rating_type,
          leagues (
            id,
            name,
            season_id,
            rosters_locked
          )
        ),
        locations (
          id,
          name
        ),
        captain:members!teams_captain_member_id_fkey (
          id,
          full_name,
          first_name,
          last_name,
          email
        ),
        co_captain_1:members!teams_co_captain_member_id_fkey (
          id,
          full_name,
          first_name,
          last_name,
          email
        ),
        co_captain_2:members!teams_co_captain_2_member_id_fkey (
          id,
          full_name,
          first_name,
          last_name,
          email
        ),
        club_pro:members!teams_club_pro_member_id_fkey (
          id,
          full_name,
          first_name,
          last_name,
          email
        )
      `)
      .order("name", { ascending: true })
```

### D275 — lwrpc-admin/app/teams/page.js:621

Object: `"teams"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/teams/page.js`

```js
supabase
      .from("teams")
      .insert(
        sourceTeams.map((team) => copyTeamPayload(team, team.name, copyDivisionTargetDivision))
      )
      .select("id")
```

### D276 — lwrpc-admin/app/teams/page.js:643

Object: `"team_members"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/teams/page.js`

```js
supabase
        .from("team_members")
        .select("*")
        .in("team_id", sourceTeamIds)
```

### D277 — lwrpc-admin/app/teams/page.js:697

Object: `"teams"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/teams/page.js`

```js
supabase
      .from("teams")
      .insert(payload)
      .select("id")
      .single()
```

### D278 — lwrpc-admin/app/teams/page.js:710

Object: `"team_members"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/teams/page.js`

```js
supabase
        .from("team_members")
        .select("*")
        .eq("team_id", copyTeam.id)
```

### D279 — lwrpc-admin/app/teams/page.js:768

Object: `"teams"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/teams/page.js`

```js
supabase
        .from("teams")
        .select(`
          id,
          name,
          division_id,
          is_active,
          locations(id, name),
          captain:members!teams_captain_member_id_fkey(id, first_name, last_name, full_name, email),
          co_captain_1:members!teams_co_captain_member_id_fkey(id, first_name, last_name, full_name, email),
          co_captain_2:members!teams_co_captain_2_member_id_fkey(id, first_name, last_name, full_name, email)
        `)
        .eq("division_id", team.division_id)
        .neq("is_active", false)
        .order("name", { ascending: true })
```

### D280 — lwrpc-admin/app/teams/page.js:783

Object: `"matches"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/teams/page.js`

```js
supabase
        .from("matches")
        .select(`
          id,
          league_id,
          division_id,
          home_team_id,
          away_team_id,
          location_id,
          scheduled_date,
          scheduled_time,
          week_number,
          status,
          score_status,
          score_entered_at,
          score_verified_at,
          home_score,
          away_score,
          winning_team_id,
          result_type,
          result_notes,
          is_published,
          locations ( id, name ),
          home_team:teams!matches_home_team_id_fkey ( id, name ),
          away_team:teams!matches_away_team_id_fkey ( id, name ),
          match_lines (
            id,
            line_number,
            posted_to_dupr,
            home_team_games_won,
            away_team_games_won,
            rating_type_at_play,
            home_player_1_rating_at_play,
            home_player_2_rating_at_play,
            away_player_1_rating_at_play,
            away_player_2_rating_at_play,
            home_team_rating_at_play,
            away_team_rating_at_play,
            ratings_snapshotted_at,
            division_lines ( line_name, line_type, posted_to_dupr, team_win_points, picklebreaker_not_played_points, picklebreaker_not_played_award_rule, picklebreaker_play_rule ),
            home_player_1:members!match_lines_home_player_1_id_fkey(id, first_name, last_name, self_rating),
            home_player_2:members!match_lines_home_player_2_id_fkey(id, first_name, last_name, self_rating),
            away_player_1:members!match_lines_away_player_1_id_fkey(id, first_name, last_name, self_rating),
            away_player_2:members!match_lines_away_player_2_id_fkey(id, first_name, last_name, self_rating),
            line_games ( id, game_number, home_score, away_score, game_status )
          )
        `)
        .eq("division_id", team.division_id)
        .eq("is_published", true)
        .order("scheduled_date", { ascending: true })
        .order("scheduled_time", { ascending: true })
```

### D281 — lwrpc-admin/app/teams/page.js:834

Object: `"team_byes"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/teams/page.js`

```js
supabase
        .from("team_byes")
        .select(`
          *,
          teams ( id, name ),
          divisions ( id, name )
        `)
        .eq("division_id", team.division_id)
        .order("bye_date", { ascending: true })
```

### D282 — lwrpc-admin/app/teams/page.js:843

Object: `"team_standings"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/teams/page.js`

```js
supabase
        .from("team_standings")
        .select("team_id, rank, standings_points, match_wins, match_losses")
        .eq("division_id", team.division_id)
```

### D283 — lwrpc-admin/app/teams/page.js:848

Object: `"member_season_ratings"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/teams/page.js`

```js
supabase
            .from("member_season_ratings")
            .select("member_id, season_dupr_rating, season_primetime_rating")
            .eq("season_id", seasonId)
```

### D284 — lwrpc-admin/app/teams/page.js:1774

Object: `"members"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/teams/page.js`

```js
supabase
      .from("members")
      .select(`
        id,
        full_name,
        first_name,
        last_name,
        email,
        self_rating,
        dupr_id,
        is_active_member,
        location_id,
        club_location
      `)
      .or("is_active_member.eq.true,is_active_member.is.null")
      .order("last_name", { ascending: true })
      .order("first_name", { ascending: true })
      .order("id", { ascending: true })
      .range(from, from + pageSize - 1)
```

### D285 — lwrpc-admin/app/teams/page.js:1807

Object: `"team_members"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/teams/page.js`

```js
supabase
      .from("team_members")
      .select("team_id")
      .range(from, from + pageSize - 1)
```

### D286 — lwrpc-admin/app/teams/[id]/page.js:54

Object: `"teams"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/teams/[id]/page.js`

```js
supabase
      .from("teams")
      .select(`
        *,
        divisions (
          id,
          name,
          min_dupr,
          max_dupr,
          rating_type,
          leagues (
            id,
            name,
            abbreviation,
            season_id,
            only_home_community_players,
            seasons (
              id,
              name,
              abbreviation
            ),
            rosters_locked
          )
        ),
        locations (
          id,
          name
        ),
        captain:members!teams_captain_member_id_fkey (
          id,
          full_name,
          first_name,
          last_name,
          email
        ),
        co_captain_1:members!teams_co_captain_member_id_fkey (
          id,
          full_name,
          first_name,
          last_name,
          email
        ),
        co_captain_2:members!teams_co_captain_2_member_id_fkey (
          id,
          full_name,
          first_name,
          last_name,
          email
        ),
        club_pro:members!teams_club_pro_member_id_fkey (
          id,
          full_name,
          first_name,
          last_name,
          email
        )
      `)
      .eq("id", id)
      .single()
```

### D287 — lwrpc-admin/app/teams/[id]/page.js:119

Object: `"team_members"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/teams/[id]/page.js`

```js
supabase
      .from("team_members")
      .select(`
        *,
        members (
          id,
          first_name,
          last_name,
          email,
          dupr_id,
          self_rating,
          club_location,
          is_active_member,
          membership_status,
          renewal_date,
          location_id
        )
      `)
      .eq("team_id", id)
```

### D288 — lwrpc-admin/app/teams/[id]/page.js:144

Object: `"members"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/teams/[id]/page.js`

```js
supabase
      .from("members")
      .select(`
        id,
        first_name,
        last_name,
        email,
        dupr_id,
        self_rating,
        club_location,
        is_active_member,
        membership_status,
        renewal_date,
        location_id
      `)
      .or("is_active_member.eq.true,is_active_member.is.null")
      .order("last_name", { ascending: true })
      .range(0, 5000)
```

### D289 — lwrpc-admin/app/teams/[id]/page.js:168

Object: `"locations"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/teams/[id]/page.js`

```js
supabase
      .from("locations")
      .select("id, name")
      .order("name", { ascending: true })
```

### D290 — lwrpc-admin/app/teams/[id]/page.js:183

Object: `"member_season_ratings"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/teams/[id]/page.js`

```js
supabase
        .from("member_season_ratings")
        .select("*")
        .eq("season_id", seasonId)
```

### D291 — lwrpc-admin/app/teams/[id]/page.js:203

Object: `"team_members"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/teams/[id]/page.js`

```js
supabase
        .from("team_members")
        .select(`
          member_id,
          teams (
            id,
            name,
            is_active,
            divisions (
              id,
              name,
              leagues (
                id,
                name,
                abbreviation,
                season_id,
                seasons (
                  id,
                  name,
                  abbreviation
                )
              )
            )
          )
        `)
        .in("member_id", rosterMemberIds)
```

### D292 — lwrpc-admin/app/teams/[id]/page.js:244

Object: `"match_lines"`; operation: `select`; page/shared-helper.

Browser consumers: `lwrpc-admin/app/teams/[id]/page.js`

```js
supabase
        .from("match_lines")
        .select(`
          id,
          line_number,
          home_player_1_id,
          home_player_2_id,
          away_player_1_id,
          away_player_2_id,
          home_team_games_won,
          away_team_games_won,
          winning_team_id,
          line_games (
            id,
            game_number,
            home_score,
            away_score,
            game_status
          ),
          division_lines (
            id,
            line_name,
            line_type
          ),
          matches (
            id,
            scheduled_date,
            scheduled_time,
            status,
            score_status,
            home_score,
            away_score,
            winning_team_id,
            result_type,
            result_notes,
            home_team_id,
            away_team_id,
            home_team:teams!matches_home_team_id_fkey (
              id,
              name,
              is_active
            ),
            away_team:teams!matches_away_team_id_fkey (
              id,
              name,
              is_active
            ),
            divisions (
              id,
              name
            ),
            leagues (
              id,
              name,
              abbreviation,
              seasons (
                id,
                name,
                abbreviation
              )
            )
          )
        `)
        .or(playerFilter)
```

## Writes, storage and RPC dependencies

### W001 — lwrpc-admin/app/api/admin/delete-member/route.js:98

Object: `undefined`; operation: `rpc`; server-route.

Browser consumers: None found through static imports; retain as server/helper dependency.

```js
authorization.supabase.rpc(
      "delete_inactive_member",
      { p_member_id: memberId }
    )
```

### W002 — lwrpc-admin/app/api/admin/member-directory/route.js:37

Object: `undefined`; operation: `rpc`; server-route.

Browser consumers: None found through static imports; retain as server/helper dependency.

```js
authorization.supabase.rpc(
      "admin_member_directory_page",
      {
        p_search: url.searchParams.get("search") || "",
        p_include_inactive:
          mode === "roles" || url.searchParams.get("includeInactive") === "true",
        p_current_roster_only:
          mode === "members" &&
          url.searchParams.get("currentRosterOnly") === "true",
        p_sort_key: sortKey === "last_login" ? "member" : sortKey,
        p_sort_direction: sortDirection,
        p_offset: (page - 1) * pageSize,
        p_limit: pageSize,
      }
    )
```

### W003 — lwrpc-admin/app/api/admin/member-directory/route.js:66

Object: `undefined`; operation: `rpc`; server-route.

Browser consumers: None found through static imports; retain as server/helper dependency.

```js
authorization.supabase.rpc(
            "admin_member_directory_page",
            {
              p_search: url.searchParams.get("search") || "",
              p_include_inactive: true,
              p_current_roster_only: false,
              p_sort_key: "member",
              p_sort_direction: "asc",
              p_offset: offset,
              p_limit: PAGE_SIZE,
            }
          )
```

### W004 — lwrpc-admin/app/api/ai-assistant/documents/route.js:40

Object: `undefined`; operation: `rpc`; server-route.

Browser consumers: None found through static imports; retain as server/helper dependency.

```js
authorization.supabase.rpc("activate_ai_document_version", {
        p_document_id: documentId,
        p_version_id: versionId,
        p_actor_member_id: authorization.memberRows?.find(row => row.user_roles?.some(r => ["league_manager", "commissioner"].includes(r.role)))?.id || null,
      })
```

### W005 — lwrpc-admin/app/api/ai-assistant/documents/route.js:206

Object: `storageBucket`; operation: `upload`; server-route.

Browser consumers: None found through static imports; retain as server/helper dependency.

```js
supabase.storage.from(storageBucket).upload(storagePath, bytes, {
    contentType: "application/pdf",
    cacheControl: "3600",
    upsert: false,
  })
```

### W006 — lwrpc-admin/app/api/ai-assistant/live-review/route.js:11

Object: `undefined`; operation: `rpc`; server-route.

Browser consumers: None found through static imports; retain as server/helper dependency.

```js
p.supabase.rpc('ai_live_review',{p_actor:p.user.id})
```

### W007 — lwrpc-admin/app/api/master-reset/route.js:29

Object: `undefined`; operation: `rpc`; server-route.

Browser consumers: None found through static imports; retain as server/helper dependency.

```js
authorization.supabase.rpc(
      "admin_master_reset_all"
    )
```

### W008 — lwrpc-admin/app/api/match-lineups/route.js:313

Object: `match_lineups`; operation: `upsert`; server-route.

Browser consumers: None found through static imports; retain as server/helper dependency.

```js
supabase
      .from("match_lineups")
      .upsert(rows, {
        onConflict: "match_id,team_id,line_number",
      })
      .select("match_id, team_id, line_number, player_1_member_id, player_2_member_id")
```

### W009 — lwrpc-admin/app/api/member-password-reset-check/route.js:257

Object: `undefined`; operation: `rpc`; server-route.

Browser consumers: None found through static imports; retain as server/helper dependency.

```js
supabase.rpc("consume_password_reset_rate_limit", {
    p_rate_limit_key: key,
    p_window_seconds: RESET_RATE_LIMIT_WINDOW_SECONDS,
    p_max_requests: maxRequests,
  })
```

### W010 — lwrpc-admin/app/api/member-password-reset-check/route.js:333

Object: `undefined`; operation: `rpc`; server-route.

Browser consumers: None found through static imports; retain as server/helper dependency.

```js
adminSupabase.rpc("link_future_existing_member_identity", { p_user: userId }).abortSignal(AbortSignal.timeout(3000))
```

### W011 — lwrpc-admin/app/api/season-reset/route.js:36

Object: `undefined`; operation: `rpc`; server-route.

Browser consumers: None found through static imports; retain as server/helper dependency.

```js
authorization.supabase.rpc(
      "admin_reset_season",
      { p_season_id: body.seasonId }
    )
```

### W012 — lwrpc-admin/app/api/season-rollover/route.js:67

Object: `seasons`; operation: `insert`; server-route.

Browser consumers: None found through static imports; retain as server/helper dependency.

```js
supabase
      .from("seasons")
      .insert({
        name,
        abbreviation: String(body.abbreviation || "").trim() || null,
        start_date: body.startDate || null,
        end_date: body.endDate || null,
        is_active: true,
        updated_at: new Date().toISOString(),
      })
      .select("id")
      .single()
```

### W013 — lwrpc-admin/app/api/teams/delete/route.js:30

Object: `teams`; operation: `delete`; server-route.

Browser consumers: None found through static imports; retain as server/helper dependency.

```js
authorization.supabase
      .from("teams")
      .delete()
      .eq("id", teamId)
      .select("id")
      .maybeSingle()
```

### W014 — lwrpc-admin/app/api/tournaments/action/route.js:659

Object: `members`; operation: `update`; server-route.

Browser consumers: None found through static imports; retain as server/helper dependency.

```js
supabase
      .from("members")
      .update({ phone: cleanPhone, updated_at: now })
      .eq("id", memberId)
```

### W015 — lwrpc-admin/app/api/tournaments/action/route.js:1238

Object: `members`; operation: `update`; server-route.

Browser consumers: None found through static imports; retain as server/helper dependency.

```js
supabase
    .from("members")
    .update({ phone: cleanPhone, updated_at: now })
    .eq("id", memberId)
```

### W016 — lwrpc-admin/app/api/view-as/start/route.js:9

Object: `undefined`; operation: `rpc`; server-route.

Browser consumers: None found through static imports; retain as server/helper dependency.

```js
createAdminSupabase().rpc('lms_view_as',{p_op:target?'preflight':'can_start',p_input:{actor:principal.user.id,...(target?{target}:{})}})
```

### W017 — lwrpc-admin/app/captain-dashboard/page.js:1617

Object: `matches`; operation: `update`; browser-component.

Browser consumers: `lwrpc-admin/app/captain-dashboard/page.js`

```js
supabase
      .from("matches")
      .update(payload)
      .eq("id", flexScheduleMatch.id)
      .select("id, scheduled_date, scheduled_time")
      .maybeSingle()
```

### W018 — lwrpc-admin/app/divisions/page.js:261

Object: `divisions`; operation: `update`; browser-component.

Browser consumers: `lwrpc-admin/app/divisions/page.js`

```js
supabase.from("divisions").update(payload).eq("id", editingId)
```

### W019 — lwrpc-admin/app/divisions/page.js:262

Object: `divisions`; operation: `insert`; browser-component.

Browser consumers: `lwrpc-admin/app/divisions/page.js`

```js
supabase.from("divisions").insert(payload)
```

### W020 — lwrpc-admin/app/divisions/page.js:284

Object: `team_byes`; operation: `delete`; browser-component.

Browser consumers: `lwrpc-admin/app/divisions/page.js`

```js
supabase
      .from("team_byes")
      .delete()
      .eq("division_id", id)
```

### W021 — lwrpc-admin/app/divisions/page.js:294

Object: `divisions`; operation: `delete`; browser-component.

Browser consumers: `lwrpc-admin/app/divisions/page.js`

```js
supabase.from("divisions").delete().eq("id", id)
```

### W022 — lwrpc-admin/app/divisions/page.js:315

Object: `divisions`; operation: `update`; browser-component.

Browser consumers: `lwrpc-admin/app/divisions/page.js`

```js
supabase
      .from("divisions")
      .update({
        is_active: !currentlyActive,
        updated_at: new Date().toISOString(),
      })
      .eq("id", division.id)
```

### W023 — lwrpc-admin/app/divisions/page.js:390

Object: `divisions`; operation: `insert`; browser-component.

Browser consumers: `lwrpc-admin/app/divisions/page.js`

```js
supabase
      .from("divisions")
      .insert(
        sourceDivisions.map((division) =>
          copyDivisionPayload(division, copyLeagueTargetLeague, division.name)
        )
      )
      .select("id, name")
```

### W024 — lwrpc-admin/app/divisions/page.js:434

Object: `division_lines`; operation: `insert`; browser-component.

Browser consumers: `lwrpc-admin/app/divisions/page.js`

```js
supabase
        .from("division_lines")
        .insert(linePayload)
```

### W025 — lwrpc-admin/app/divisions/page.js:472

Object: `divisions`; operation: `insert`; browser-component.

Browser consumers: `lwrpc-admin/app/divisions/page.js`

```js
supabase
      .from("divisions")
      .insert(divisionPayload)
      .select("id")
      .single()
```

### W026 — lwrpc-admin/app/divisions/page.js:498

Object: `division_lines`; operation: `insert`; browser-component.

Browser consumers: `lwrpc-admin/app/divisions/page.js`

```js
supabase
        .from("division_lines")
        .insert(
          lineRows.map((line) => copyDivisionLinePayload(line, createdDivision.id))
        )
```

### W027 — lwrpc-admin/app/divisions/[id]/page.js:297

Object: `divisions`; operation: `update`; browser-component.

Browser consumers: `lwrpc-admin/app/divisions/[id]/page.js`

```js
supabase
        .from("divisions")
        .update(payload)
        .eq("id", id)
        .select("*")
        .single()
```

### W028 — lwrpc-admin/app/divisions/[id]/page.js:323

Object: `divisions`; operation: `update`; browser-component.

Browser consumers: `lwrpc-admin/app/divisions/[id]/page.js`

```js
supabase
      .from("divisions")
      .update(payload)
      .eq("id", id)
      .select("*")
      .single()
```

### W029 — lwrpc-admin/app/divisions/[id]/page.js:439

Object: `division_lines`; operation: `update`; browser-component.

Browser consumers: `lwrpc-admin/app/divisions/[id]/page.js`

```js
supabase
        .from("division_lines")
        .update(payload)
        .eq("id", editingId)
        .select("*")
        .maybeSingle()
```

### W030 — lwrpc-admin/app/divisions/[id]/page.js:453

Object: `division_lines`; operation: `insert`; browser-component.

Browser consumers: `lwrpc-admin/app/divisions/[id]/page.js`

```js
supabase
        .from("division_lines")
        .insert(payload)
        .select("*")
        .maybeSingle()
```

### W031 — lwrpc-admin/app/divisions/[id]/page.js:496

Object: `division_lines`; operation: `delete`; browser-component.

Browser consumers: `lwrpc-admin/app/divisions/[id]/page.js`

```js
supabase
        .from("division_lines")
        .delete()
        .eq("id", lineId)
```

### W032 — lwrpc-admin/app/divisions/[id]/page.js:634

Object: `division_lines`; operation: `delete`; browser-component.

Browser consumers: `lwrpc-admin/app/divisions/[id]/page.js`

```js
supabase
        .from("division_lines")
        .delete()
        .eq("division_id", id)
```

### W033 — lwrpc-admin/app/divisions/[id]/page.js:645

Object: `division_lines`; operation: `insert`; browser-component.

Browser consumers: `lwrpc-admin/app/divisions/[id]/page.js`

```js
supabase
      .from("division_lines")
      .insert(rows)
      .select("*")
```

### W034 — lwrpc-admin/app/leagues/page.js:100

Object: `leagues`; operation: `update`; browser-component.

Browser consumers: `lwrpc-admin/app/leagues/page.js`

```js
supabase
          .from("leagues")
          .update({
            ...payload,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingLeagueId)
```

### W035 — lwrpc-admin/app/leagues/page.js:107

Object: `leagues`; operation: `insert`; browser-component.

Browser consumers: `lwrpc-admin/app/leagues/page.js`

```js
supabase
          .from("leagues")
          .insert(payload)
```

### W036 — lwrpc-admin/app/leagues/page.js:129

Object: `leagues`; operation: `delete`; browser-component.

Browser consumers: `lwrpc-admin/app/leagues/page.js`

```js
supabase
      .from("leagues")
      .delete()
      .eq("id", id)
```

### W037 — lwrpc-admin/app/leagues/page.js:153

Object: `leagues`; operation: `update`; browser-component.

Browser consumers: `lwrpc-admin/app/leagues/page.js`

```js
supabase
      .from("leagues")
      .update({
        is_active: !currentlyActive,
        updated_at: new Date().toISOString(),
      })
      .eq("id", league.id)
```

### W038 — lwrpc-admin/app/lib/accountIdentity.js:12

Object: `undefined`; operation: `rpc`; shared-helper.

Browser consumers: None found through static imports; retain as server/helper dependency.

```js
createDatabase().rpc('link_future_existing_member_identity', {
      p_user: principal.user.id,
    }).abortSignal(AbortSignal.timeout(3000))
```

### W039 — lwrpc-admin/app/lib/aiAnswerGeneration.js:403

Object: `undefined`; operation: `rpc`; shared-helper.

Browser consumers: None found through static imports; retain as server/helper dependency.

```js
supabase.rpc('ai_approved_authority_manifest')
```

### W040 — lwrpc-admin/app/lib/aiApprovedAnswersService.js:37

Object: `undefined`; operation: `rpc`; shared-helper.

Browser consumers: None found through static imports; retain as server/helper dependency.

```js
db.rpc('ai_approved_source_review',{p_terms:terms})
```

### W041 — lwrpc-admin/app/lib/aiApprovedAnswersService.js:54

Object: `undefined`; operation: `rpc`; shared-helper.

Browser consumers: None found through static imports; retain as server/helper dependency.

```js
db.rpc('ai_approved_authority_manifest')
```

### W042 — lwrpc-admin/app/lib/aiApprovedAnswersService.js:83

Object: `undefined`; operation: `rpc`; shared-helper.

Browser consumers: None found through static imports; retain as server/helper dependency.

```js
db.rpc('ai_approved_authority_manifest')
```

### W043 — lwrpc-admin/app/lib/aiApprovedAnswersService.js:88

Object: `undefined`; operation: `rpc`; shared-helper.

Browser consumers: None found through static imports; retain as server/helper dependency.

```js
db.rpc('ai_approved_knowledge_manifest')
```

### W044 — lwrpc-admin/app/lib/aiApprovedAnswersService.js:128

Object: `undefined`; operation: `rpc`; shared-helper.

Browser consumers: None found through static imports; retain as server/helper dependency.

```js
db.rpc('ai_approved_authority_manifest')
```

### W045 — lwrpc-admin/app/lib/aiApprovedAnswersService.js:132

Object: `undefined`; operation: `rpc`; shared-helper.

Browser consumers: None found through static imports; retain as server/helper dependency.

```js
db.rpc('search_ai_approved_answers',{p_embedding:JSON.stringify(embedding.embedding),p_question:current.canonical_question})
```

### W046 — lwrpc-admin/app/lib/aiApprovedAnswersService.js:145

Object: `undefined`; operation: `rpc`; shared-helper.

Browser consumers: None found through static imports; retain as server/helper dependency.

```js
db.rpc('ai_approved_answer_action',{p_actor:user,p_operation:operation,p_action:action,p_id:id,p_expected:expected,p_body:payload})
```

### W047 — lwrpc-admin/app/lib/aiEligibilityService.js:52

Object: `undefined`; operation: `rpc`; shared-helper.

Browser consumers: None found through static imports; retain as server/helper dependency.

```js
principal.supabase.rpc('ai_live_lookup',{p_actor:principal.user.id,p_request:id,p_query:q}).abortSignal(AbortSignal.timeout(5000))
```

### W048 — lwrpc-admin/app/lib/aiQualityPersistence.js:80

Object: `undefined`; operation: `rpc`; shared-helper.

Browser consumers: None found through static imports; retain as server/helper dependency.

```js
db.rpc('capture_ai_quality',args).abortSignal(signal)
```

### W049 — lwrpc-admin/app/lib/aiRetrieval.js:69

Object: `undefined`; operation: `rpc`; shared-helper.

Browser consumers: None found through static imports; retain as server/helper dependency.

```js
supabase.rpc("search_ai_official_chunks", rpcArgs(request.question))
```

### W050 — lwrpc-admin/app/lib/aiRetrieval.js:102

Object: `undefined`; operation: `rpc`; shared-helper.

Browser consumers: None found through static imports; retain as server/helper dependency.

```js
supabase.rpc('search_ai_official_chunks',rpcArgs(concept.query))
```

### W051 — lwrpc-admin/app/lib/aiRetrieval.js:121

Object: `undefined`; operation: `rpc`; shared-helper.

Browser consumers: None found through static imports; retain as server/helper dependency.

```js
supabase.rpc("search_ai_official_chunks", rpcArgs(query))
```

### W052 — lwrpc-admin/app/lib/aiRetrieval.js:127

Object: `undefined`; operation: `rpc`; shared-helper.

Browser consumers: None found through static imports; retain as server/helper dependency.

```js
supabase.rpc('search_ai_approved_answers', {p_embedding:toPgVector(embedding.embedding),p_question:request.question})
```

### W053 — lwrpc-admin/app/lib/aiRetrieval.js:254

Object: `undefined`; operation: `rpc`; shared-helper.

Browser consumers: None found through static imports; retain as server/helper dependency.

```js
supabase.rpc("search_ai_official_chunks", {
    ...rpcArgs(LWR_MATCH_EQUIPMENT_PROBE_QUERY),
    p_query_embedding: toPgVector(probeEmbedding.embedding),
  })
```

### W054 — lwrpc-admin/app/lib/aiRetrieval.js:274

Object: `undefined`; operation: `rpc`; shared-helper.

Browser consumers: None found through static imports; retain as server/helper dependency.

```js
supabase.rpc("search_ai_official_chunks", rpcArgs(retrievalQuery, 80))
```

### W055 — lwrpc-admin/app/lib/aiReviewService.js:49

Object: `undefined`; operation: `rpc`; shared-helper.

Browser consumers: None found through static imports; retain as server/helper dependency.

```js
db.rpc('ai_review_report', { p_filters: f })
```

### W056 — lwrpc-admin/app/lib/aiReviewService.js:75

Object: `undefined`; operation: `rpc`; shared-helper.

Browser consumers: None found through static imports; retain as server/helper dependency.

```js
db.rpc('ai_review_feedback_state',{p_asof:feedback.created_at}).eq('answer_id',aid).maybeSingle()
```

### W057 — lwrpc-admin/app/lib/aiReviewService.js:110

Object: `undefined`; operation: `rpc`; shared-helper.

Browser consumers: None found through static imports; retain as server/helper dependency.

```js
db.rpc('ai_review_case_action',{p_case:token.caseId,p_actor:user,p_operation:body.operation,p_revision:token.revision,
    p_action:body.action,p_value:body.value ?? null,p_note:body.note || null,p_cutoff:token.cutoff})
```

### W058 — lwrpc-admin/app/lib/identityRoleWriter.js:12

Object: `user_roles`; operation: `update`; shared-helper.

Browser consumers: `lwrpc-admin/app/locations/page.js`, `lwrpc-admin/app/teams/page.js`

```js
client.from('user_roles').update({ role: desiredRole, updated_at: new Date().toISOString() })
        .eq('id', row.id).eq('role', row.role).select('id').single()
```

### W059 — lwrpc-admin/app/lib/identityRoleWriter.js:14

Object: `user_roles`; operation: `insert`; shared-helper.

Browser consumers: `lwrpc-admin/app/locations/page.js`, `lwrpc-admin/app/teams/page.js`

```js
client.from('user_roles').insert({ user_id: null, member_id: memberId, role: desiredRole }).select('id').single()
```

### W060 — lwrpc-admin/app/lib/liveLmsService.js:45

Object: `undefined`; operation: `rpc`; shared-helper.

Browser consumers: None found through static imports; retain as server/helper dependency.

```js
principal.supabase.rpc('ai_live_lookup',{p_actor:principal.user.id,p_request:answerId,p_query:q}).abortSignal(AbortSignal.timeout(5000))
```

### W061 — lwrpc-admin/app/lib/liveLmsService.js:72

Object: `undefined`; operation: `rpc`; shared-helper.

Browser consumers: None found through static imports; retain as server/helper dependency.

```js
principal.supabase.rpc('ai_live_feedback',{p_actor:principal.user.id,p_answer:answerId,p_helpful:body.helpful,p_metadata:metadata})
```

### W062 — lwrpc-admin/app/lib/profilePhotos.js:56

Object: `PROFILE_PHOTO_BUCKET`; operation: `remove`; shared-helper.

Browser consumers: `lwrpc-admin/app/AdminDashboardClient.js`, `lwrpc-admin/app/captain-dashboard/page.js`, `lwrpc-admin/app/components/AppHeader.js`, `lwrpc-admin/app/player-dashboard/page.js`, `lwrpc-admin/app/page.js`, `lwrpc-admin/app/ai-assistant/console/page.js`, `lwrpc-admin/app/ai-assistant/page.js`, `lwrpc-admin/app/ai-assistant/review/page.js`, `lwrpc-admin/app/ai-insights/page.js`, `lwrpc-admin/app/ask-lwr/page.js`, `lwrpc-admin/app/divisions/page.js`, `lwrpc-admin/app/divisions/[id]/page.js`, `lwrpc-admin/app/email-options/page.js`, `lwrpc-admin/app/league-communications/page.js`, `lwrpc-admin/app/leagues/page.js`, `lwrpc-admin/app/locations/page.js`, `lwrpc-admin/app/matches/[id]/page.js`, `lwrpc-admin/app/member-import/page.js`, `lwrpc-admin/app/members/page.js`, `lwrpc-admin/app/members/[id]/page.js`, `lwrpc-admin/app/ratings/page.js`, `lwrpc-admin/app/round-robin/page.js`, `lwrpc-admin/app/schedule-editor/page.js`, `lwrpc-admin/app/scheduling/page.js`, `lwrpc-admin/app/score-sheets/page.js`, `lwrpc-admin/app/scoring/page.js`, `lwrpc-admin/app/seasons/page.js`, `lwrpc-admin/app/standings/page.js`, `lwrpc-admin/app/system-setup/page.js`, `lwrpc-admin/app/teams/page.js`, `lwrpc-admin/app/teams/[id]/page.js`, `lwrpc-admin/app/tournaments/page.js`

```js
client.storage.from(PROFILE_PHOTO_BUCKET).remove([objectPath])
```

### W063 — lwrpc-admin/app/lib/profilePhotos.js:64

Object: `members`; operation: `update`; shared-helper.

Browser consumers: `lwrpc-admin/app/AdminDashboardClient.js`, `lwrpc-admin/app/captain-dashboard/page.js`, `lwrpc-admin/app/components/AppHeader.js`, `lwrpc-admin/app/player-dashboard/page.js`, `lwrpc-admin/app/page.js`, `lwrpc-admin/app/ai-assistant/console/page.js`, `lwrpc-admin/app/ai-assistant/page.js`, `lwrpc-admin/app/ai-assistant/review/page.js`, `lwrpc-admin/app/ai-insights/page.js`, `lwrpc-admin/app/ask-lwr/page.js`, `lwrpc-admin/app/divisions/page.js`, `lwrpc-admin/app/divisions/[id]/page.js`, `lwrpc-admin/app/email-options/page.js`, `lwrpc-admin/app/league-communications/page.js`, `lwrpc-admin/app/leagues/page.js`, `lwrpc-admin/app/locations/page.js`, `lwrpc-admin/app/matches/[id]/page.js`, `lwrpc-admin/app/member-import/page.js`, `lwrpc-admin/app/members/page.js`, `lwrpc-admin/app/members/[id]/page.js`, `lwrpc-admin/app/ratings/page.js`, `lwrpc-admin/app/round-robin/page.js`, `lwrpc-admin/app/schedule-editor/page.js`, `lwrpc-admin/app/scheduling/page.js`, `lwrpc-admin/app/score-sheets/page.js`, `lwrpc-admin/app/scoring/page.js`, `lwrpc-admin/app/seasons/page.js`, `lwrpc-admin/app/standings/page.js`, `lwrpc-admin/app/system-setup/page.js`, `lwrpc-admin/app/teams/page.js`, `lwrpc-admin/app/teams/[id]/page.js`, `lwrpc-admin/app/tournaments/page.js`

```js
client
    .from("members")
    .update({ profile_image_urls: nextProfileImageUrls })
    .eq("id", member.id)
    .select("profile_image_urls")
    .single()
```

### W064 — lwrpc-admin/app/lib/profilePhotos.js:72

Object: `PROFILE_PHOTO_BUCKET`; operation: `remove`; shared-helper.

Browser consumers: `lwrpc-admin/app/AdminDashboardClient.js`, `lwrpc-admin/app/captain-dashboard/page.js`, `lwrpc-admin/app/components/AppHeader.js`, `lwrpc-admin/app/player-dashboard/page.js`, `lwrpc-admin/app/page.js`, `lwrpc-admin/app/ai-assistant/console/page.js`, `lwrpc-admin/app/ai-assistant/page.js`, `lwrpc-admin/app/ai-assistant/review/page.js`, `lwrpc-admin/app/ai-insights/page.js`, `lwrpc-admin/app/ask-lwr/page.js`, `lwrpc-admin/app/divisions/page.js`, `lwrpc-admin/app/divisions/[id]/page.js`, `lwrpc-admin/app/email-options/page.js`, `lwrpc-admin/app/league-communications/page.js`, `lwrpc-admin/app/leagues/page.js`, `lwrpc-admin/app/locations/page.js`, `lwrpc-admin/app/matches/[id]/page.js`, `lwrpc-admin/app/member-import/page.js`, `lwrpc-admin/app/members/page.js`, `lwrpc-admin/app/members/[id]/page.js`, `lwrpc-admin/app/ratings/page.js`, `lwrpc-admin/app/round-robin/page.js`, `lwrpc-admin/app/schedule-editor/page.js`, `lwrpc-admin/app/scheduling/page.js`, `lwrpc-admin/app/score-sheets/page.js`, `lwrpc-admin/app/scoring/page.js`, `lwrpc-admin/app/seasons/page.js`, `lwrpc-admin/app/standings/page.js`, `lwrpc-admin/app/system-setup/page.js`, `lwrpc-admin/app/teams/page.js`, `lwrpc-admin/app/teams/[id]/page.js`, `lwrpc-admin/app/tournaments/page.js`

```js
client.storage.from(PROFILE_PHOTO_BUCKET).remove([objectPath])
```

### W065 — lwrpc-admin/app/lib/profilePhotos.js:77

Object: `PROFILE_PHOTO_BUCKET`; operation: `remove`; shared-helper.

Browser consumers: `lwrpc-admin/app/AdminDashboardClient.js`, `lwrpc-admin/app/captain-dashboard/page.js`, `lwrpc-admin/app/components/AppHeader.js`, `lwrpc-admin/app/player-dashboard/page.js`, `lwrpc-admin/app/page.js`, `lwrpc-admin/app/ai-assistant/console/page.js`, `lwrpc-admin/app/ai-assistant/page.js`, `lwrpc-admin/app/ai-assistant/review/page.js`, `lwrpc-admin/app/ai-insights/page.js`, `lwrpc-admin/app/ask-lwr/page.js`, `lwrpc-admin/app/divisions/page.js`, `lwrpc-admin/app/divisions/[id]/page.js`, `lwrpc-admin/app/email-options/page.js`, `lwrpc-admin/app/league-communications/page.js`, `lwrpc-admin/app/leagues/page.js`, `lwrpc-admin/app/locations/page.js`, `lwrpc-admin/app/matches/[id]/page.js`, `lwrpc-admin/app/member-import/page.js`, `lwrpc-admin/app/members/page.js`, `lwrpc-admin/app/members/[id]/page.js`, `lwrpc-admin/app/ratings/page.js`, `lwrpc-admin/app/round-robin/page.js`, `lwrpc-admin/app/schedule-editor/page.js`, `lwrpc-admin/app/scheduling/page.js`, `lwrpc-admin/app/score-sheets/page.js`, `lwrpc-admin/app/scoring/page.js`, `lwrpc-admin/app/seasons/page.js`, `lwrpc-admin/app/standings/page.js`, `lwrpc-admin/app/system-setup/page.js`, `lwrpc-admin/app/teams/page.js`, `lwrpc-admin/app/teams/[id]/page.js`, `lwrpc-admin/app/tournaments/page.js`

```js
client.storage.from(PROFILE_PHOTO_BUCKET).remove(previousManagedPaths)
```

### W066 — lwrpc-admin/app/lib/standingsRebuild.js:345

Object: `matches`; operation: `update`; shared-helper.

Browser consumers: `lwrpc-admin/app/matches/[id]/page.js`, `lwrpc-admin/app/schedule-editor/page.js`, `lwrpc-admin/app/standings/page.js`

```js
supabase
        .from("matches")
        .update({
          home_score: homeTeamWinPoints,
          away_score: awayTeamWinPoints,
          winning_team_id: matchWinningTeamId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", matchRow.id)
```

### W067 — lwrpc-admin/app/lib/standingsRebuild.js:475

Object: `match_lines`; operation: `update`; shared-helper.

Browser consumers: `lwrpc-admin/app/matches/[id]/page.js`, `lwrpc-admin/app/schedule-editor/page.js`, `lwrpc-admin/app/standings/page.js`

```js
supabase
        .from("match_lines")
        .update({
          winning_team_id: line.rebuilt.pointAwardTeamId,
          home_team_games_won: line.rebuilt.homeGameWins,
          away_team_games_won: line.rebuilt.awayGameWins,
          home_team_points: line.rebuilt.homePoints,
          away_team_points: line.rebuilt.awayPoints,
          line_status: line.rebuilt.winningTeamId ? "completed" : "scheduled",
          updated_at: new Date().toISOString(),
        })
        .eq("id", line.id)
```

### W068 — lwrpc-admin/app/lib/standingsRebuild.js:491

Object: `matches`; operation: `update`; shared-helper.

Browser consumers: `lwrpc-admin/app/matches/[id]/page.js`, `lwrpc-admin/app/schedule-editor/page.js`, `lwrpc-admin/app/standings/page.js`

```js
supabase
      .from("matches")
      .update({
        home_score: homeTeamWinPoints,
        away_score: awayTeamWinPoints,
        winning_team_id: matchWinningTeamId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", matchRow.id)
```

### W069 — lwrpc-admin/app/lib/standingsRebuild.js:524

Object: `team_standings`; operation: `delete`; shared-helper.

Browser consumers: `lwrpc-admin/app/matches/[id]/page.js`, `lwrpc-admin/app/schedule-editor/page.js`, `lwrpc-admin/app/standings/page.js`

```js
supabase
    .from("team_standings")
    .delete()
    .eq("division_id", divisionId)
```

### W070 — lwrpc-admin/app/lib/standingsRebuild.js:532

Object: `team_standings`; operation: `insert`; shared-helper.

Browser consumers: `lwrpc-admin/app/matches/[id]/page.js`, `lwrpc-admin/app/schedule-editor/page.js`, `lwrpc-admin/app/standings/page.js`

```js
supabase.from("team_standings").insert(ordered)
```

### W071 — lwrpc-admin/app/lib/viewAsServer.js:11

Object: `undefined`; operation: `rpc`; shared-helper.

Browser consumers: None found through static imports; retain as server/helper dependency.

```js
client.rpc('lms_view_as',{p_op:op,p_input:input}).abortSignal(AbortSignal.timeout(5000))
```

### W072 — lwrpc-admin/app/locations/page.js:113

Object: `locations`; operation: `update`; browser-component.

Browser consumers: `lwrpc-admin/app/locations/page.js`

```js
supabase.from("locations").update(payload).eq("id", editingId)
```

### W073 — lwrpc-admin/app/locations/page.js:114

Object: `locations`; operation: `insert`; browser-component.

Browser consumers: `lwrpc-admin/app/locations/page.js`

```js
supabase.from("locations").insert(payload)
```

### W074 — lwrpc-admin/app/locations/page.js:141

Object: `locations`; operation: `delete`; browser-component.

Browser consumers: `lwrpc-admin/app/locations/page.js`

```js
supabase.from("locations").delete().eq("id", id)
```

### W075 — lwrpc-admin/app/locations/page.js:188

Object: `members`; operation: `update`; browser-component.

Browser consumers: `lwrpc-admin/app/locations/page.js`

```js
supabase
        .from("members")
        .update({
          location_id: mergeToId,
          club_location: toLocation?.name || null,
        })
        .eq("location_id", mergeFromId)
```

### W076 — lwrpc-admin/app/locations/page.js:201

Object: `teams`; operation: `update`; browser-component.

Browser consumers: `lwrpc-admin/app/locations/page.js`

```js
supabase
        .from("teams")
        .update({ home_location_id: mergeToId })
        .eq("home_location_id", mergeFromId)
```

### W077 — lwrpc-admin/app/locations/page.js:211

Object: `matches`; operation: `update`; browser-component.

Browser consumers: `lwrpc-admin/app/locations/page.js`

```js
supabase
        .from("matches")
        .update({ location_id: mergeToId })
        .eq("location_id", mergeFromId)
```

### W078 — lwrpc-admin/app/locations/page.js:232

Object: `locations`; operation: `delete`; browser-component.

Browser consumers: `lwrpc-admin/app/locations/page.js`

```js
supabase
          .from("locations")
          .delete()
          .eq("id", mergeFromId)
```

### W079 — lwrpc-admin/app/matches/[id]/page.js:282

Object: `line_games`; operation: `insert`; browser-component.

Browser consumers: `lwrpc-admin/app/matches/[id]/page.js`

```js
supabase.from("line_games").insert(rows)
```

### W080 — lwrpc-admin/app/matches/[id]/page.js:426

Object: `match_lines`; operation: `update`; browser-component.

Browser consumers: `lwrpc-admin/app/matches/[id]/page.js`

```js
supabase
          .from("match_lines")
          .update({
            ...snapshot,
            updated_at: new Date().toISOString(),
          })
          .eq("id", line.id)
```

### W081 — lwrpc-admin/app/matches/[id]/page.js:860

Object: `match_lines`; operation: `update`; browser-component.

Browser consumers: `lwrpc-admin/app/matches/[id]/page.js`

```js
supabase
      .from("match_lines")
      .update({
        [field]: value || null,
        updated_at: new Date().toISOString(),
      })
      .in("id", lineIdsToUpdate)
```

### W082 — lwrpc-admin/app/matches/[id]/page.js:920

Object: `match_lines`; operation: `update`; browser-component.

Browser consumers: `lwrpc-admin/app/matches/[id]/page.js`

```js
supabase
      .from("match_lines")
      .update({
        [player1Field]: lineup.player_1_member_id || null,
        [player2Field]: lineup.player_2_member_id || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", line.id)
```

### W083 — lwrpc-admin/app/matches/[id]/page.js:956

Object: `line_games`; operation: `update`; browser-component.

Browser consumers: `lwrpc-admin/app/matches/[id]/page.js`

```js
supabase
          .from("line_games")
          .update({
            [field]: normalizedValue,
            updated_at: new Date().toISOString(),
          })
          .eq("id", gameId)
```

### W084 — lwrpc-admin/app/matches/[id]/page.js:1373

Object: `match_lines`; operation: `update`; browser-component.

Browser consumers: `lwrpc-admin/app/matches/[id]/page.js`

```js
supabase
        .from("match_lines")
        .update({
          winning_team_id: winningTeamId,
          home_team_games_won: summary.homeGameWins,
          away_team_games_won: summary.awayGameWins,
          home_team_points: summary.homePoints,
          away_team_points: summary.awayPoints,
          line_status: lineStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", line.id)
```

### W085 — lwrpc-admin/app/matches/[id]/page.js:1392

Object: `matches`; operation: `update`; browser-component.

Browser consumers: `lwrpc-admin/app/matches/[id]/page.js`

```js
supabase
      .from("matches")
      .update({
        home_score: matchSummary.homeWins,
        away_score: matchSummary.awayWins,
        winning_team_id: matchSummary.winningTeamId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
```

### W086 — lwrpc-admin/app/matches/[id]/page.js:1513

Object: `matches`; operation: `update`; browser-component.

Browser consumers: `lwrpc-admin/app/matches/[id]/page.js`

```js
supabase
      .from("matches")
      .update(matchUpdate)
      .eq("id", id)
```

### W087 — lwrpc-admin/app/matches/[id]/page.js:1662

Object: `matches`; operation: `update`; browser-component.

Browser consumers: `lwrpc-admin/app/matches/[id]/page.js`

```js
supabase
      .from("matches")
      .update(matchUpdate)
      .eq("id", id)
```

### W088 — lwrpc-admin/app/matches/[id]/page.js:1730

Object: `matches`; operation: `update`; browser-component.

Browser consumers: `lwrpc-admin/app/matches/[id]/page.js`

```js
supabase
      .from("matches")
      .update({
        score_status: "verified",
        score_verified_by_member_id: currentUserMember.id,
        score_verified_at: new Date().toISOString(),
        finalized_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
```

### W089 — lwrpc-admin/app/matches/[id]/page.js:1788

Object: `matches`; operation: `update`; browser-component.

Browser consumers: `lwrpc-admin/app/matches/[id]/page.js`

```js
supabase
      .from("matches")
      .update({
        score_status: "disputed",
        score_disputed: true,
        score_dispute_notes: notes,
        score_verified_by_member_id: null,
        score_verified_at: null,
        finalized_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
```

### W090 — lwrpc-admin/app/member-import/page.js:496

Object: `members`; operation: `insert`; browser-component.

Browser consumers: `lwrpc-admin/app/member-import/page.js`

```js
supabase.from("members").insert(inserts)
```

### W091 — lwrpc-admin/app/member-import/page.js:544

Object: `members`; operation: `update`; browser-component.

Browser consumers: `lwrpc-admin/app/member-import/page.js`

```js
supabase.from("members").update(payload)
```

### W092 — lwrpc-admin/app/member-import/page.js:587

Object: `members`; operation: `update`; browser-component.

Browser consumers: `lwrpc-admin/app/member-import/page.js`

```js
supabase
      .from("members")
      .update({
        is_active_member: false,
        updated_at: new Date().toISOString()
      })
      .eq("id", memberId)
```

### W093 — lwrpc-admin/app/member-import/page.js:636

Object: `members`; operation: `update`; browser-component.

Browser consumers: `lwrpc-admin/app/member-import/page.js`

```js
supabase
      .from("members")
      .update({
        is_active_member: false,
        updated_at: new Date().toISOString()
      })
      .in("id", ids)
```

### W094 — lwrpc-admin/app/members/page.js:221

Object: `members`; operation: `update`; browser-component.

Browser consumers: `lwrpc-admin/app/members/page.js`

```js
supabase
            .from("members")
            .update({
              phone: update.phone,
              updated_at: updatedAt,
            })
            .eq("id", update.id)
```

### W095 — lwrpc-admin/app/members/page.js:308

Object: `user_roles`; operation: `update`; browser-component.

Browser consumers: `lwrpc-admin/app/members/page.js`

```js
supabase
        .from("user_roles")
        .update({
          role: "player",
          updated_at: updatedAt,
        })
        .in("id", batchIds)
```

### W096 — lwrpc-admin/app/members/page.js:360

Object: `members`; operation: `insert`; browser-component.

Browser consumers: `lwrpc-admin/app/members/page.js`

```js
supabase
      .from("members")
      .insert({
        first_name: firstName || null,
        last_name: lastName || null,
        email: normalizedEmail || null,
        phone: formatPhoneNumberForStorage(newMemberForm.phone) || null,
        membershipworks_account_id: manualMembershipWorksAccountId(),
        notification_preference: newMemberForm.notification_preference || NOTIFICATION_EMAIL,
        club_location: newMemberForm.club_location.trim() || null,
        location_id: locationIdForName(clubLocations, newMemberForm.club_location),
        dupr_id: newMemberForm.dupr_id.trim() || null,
        renewal_date: newMemberForm.renewal_date || null,
      })
      .select("*")
      .single()
```

### W097 — lwrpc-admin/app/members/page.js:384

Object: `user_roles`; operation: `insert`; browser-component.

Browser consumers: `lwrpc-admin/app/members/page.js`

```js
supabase
        .from("user_roles")
        .insert({
          user_id: null,
          member_id: data.id,
          role: newMemberForm.role,
        })
```

### W098 — lwrpc-admin/app/members/[id]/page.js:357

Object: `members`; operation: `update`; browser-component.

Browser consumers: `lwrpc-admin/app/members/[id]/page.js`

```js
supabase
      .from("members")
      .update({
        first_name: form.first_name || null,
        last_name: form.last_name || null,
        email: normalizedEmail || null,
        phone: formatPhoneNumberForStorage(form.phone) || null,
        notification_preference: form.notification_preference || NOTIFICATION_EMAIL,
        club_location: form.club_location || null,
        location_id: locationIdForName(locations, form.club_location),
        dupr_id: form.dupr_id || null,
        renewal_date: form.renewal_date || null,
        notes: form.notes.trim() || null,
      })
      .eq("id", id)
      .select("*")
      .single()
```

### W099 — lwrpc-admin/app/members/[id]/page.js:481

Object: `user_roles`; operation: `update`; browser-component.

Browser consumers: `lwrpc-admin/app/members/[id]/page.js`

```js
supabase
      .from("user_roles")
      .update({
        role: newRole,
        updated_at: new Date().toISOString(),
      })
      .eq("id", roleRow.id)
      .select("*")
      .single()
```

### W100 — lwrpc-admin/app/members/[id]/page.js:498

Object: `user_roles`; operation: `insert`; browser-component.

Browser consumers: `lwrpc-admin/app/members/[id]/page.js`

```js
supabase
      .from("user_roles")
      .insert({
        user_id: null,
        member_id: id,
        role: newRole,
      })
      .select("*")
      .single()
```

### W101 — lwrpc-admin/app/members/[id]/page.js:531

Object: `members`; operation: `update`; browser-component.

Browser consumers: `lwrpc-admin/app/members/[id]/page.js`

```js
supabase
    .from("members")
    .update({
      is_active_member: nextIsActive,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single()
```

### W102 — lwrpc-admin/app/ratings/page.js:187

Object: `member_season_ratings`; operation: `update`; browser-component.

Browser consumers: `lwrpc-admin/app/ratings/page.js`

```js
supabase
        .from("member_season_ratings")
        .update({
          [field]: cleanValue,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id)
```

### W103 — lwrpc-admin/app/ratings/page.js:222

Object: `member_season_ratings`; operation: `insert`; browser-component.

Browser consumers: `lwrpc-admin/app/ratings/page.js`

```js
supabase
        .from("member_season_ratings")
        .insert(newRow)
        .select(RATING_SELECT)
        .single()
```

### W104 — lwrpc-admin/app/ratings/page.js:249

Object: `members`; operation: `update`; browser-component.

Browser consumers: `lwrpc-admin/app/ratings/page.js`

```js
supabase
      .from("members")
      .update({
        dupr_id: cleanValue,
        updated_at: new Date().toISOString(),
      })
      .eq("id", memberId)
```

### W105 — lwrpc-admin/app/ratings/page.js:384

Object: `member_season_ratings`; operation: `delete`; browser-component.

Browser consumers: `lwrpc-admin/app/ratings/page.js`

```js
supabase
      .from("member_season_ratings")
      .delete()
      .eq("season_id", selectedSeason)
```

### W106 — lwrpc-admin/app/ratings/page.js:732

Object: `members`; operation: `update`; browser-component.

Browser consumers: `lwrpc-admin/app/ratings/page.js`

```js
supabase
            .from("members")
            .update({ dupr_id: row.duprId, updated_at: now })
            .eq("id", row.memberId)
```

### W107 — lwrpc-admin/app/ratings/page.js:764

Object: `member_season_ratings`; operation: `upsert`; browser-component.

Browser consumers: `lwrpc-admin/app/ratings/page.js`

```js
supabase
          .from("member_season_ratings")
          .upsert(ratingUpserts, { onConflict: "member_id,season_id" })
```

### W108 — lwrpc-admin/app/ratings/page.js:834

Object: `member_season_ratings`; operation: `update`; browser-component.

Browser consumers: `lwrpc-admin/app/ratings/page.js`

```js
updateRequests.push(
          supabase.from("member_season_ratings").update(payload).eq("id", existing.id)
        )
```

### W109 — lwrpc-admin/app/ratings/page.js:856

Object: `member_season_ratings`; operation: `insert`; browser-component.

Browser consumers: `lwrpc-admin/app/ratings/page.js`

```js
supabase.from("member_season_ratings").insert(inserts)
```

### W110 — lwrpc-admin/app/ratings/page.js:1011

Object: `member_season_ratings`; operation: `update`; browser-component.

Browser consumers: `lwrpc-admin/app/ratings/page.js`

```js
supabase
          .from("member_season_ratings")
          .update({ ...change.payload, updated_at: now })
          .eq("id", change.existing.id)
```

### W111 — lwrpc-admin/app/ratings/page.js:1038

Object: `member_season_ratings`; operation: `insert`; browser-component.

Browser consumers: `lwrpc-admin/app/ratings/page.js`

```js
supabase.from("member_season_ratings").insert(inserts)
```

### W112 — lwrpc-admin/app/schedule-editor/page.js:405

Object: `matches`; operation: `update`; browser-component.

Browser consumers: `lwrpc-admin/app/schedule-editor/page.js`

```js
supabase
      .from("matches")
      .update({
        is_published: shouldPublish,
        status: shouldPublish ? "scheduled" : "draft",
        published_at: shouldPublish ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .in("id", selected.map((match) => match.id))
```

### W113 — lwrpc-admin/app/schedule-editor/page.js:542

Object: `matches`; operation: `update`; browser-component.

Browser consumers: `lwrpc-admin/app/schedule-editor/page.js`

```js
supabase
          .from("matches")
          .update({
            home_team_id: match.home_team_id,
            away_team_id: match.away_team_id,
            location_id: match.location_id,
            updated_at: new Date().toISOString(),
          })
          .eq("id", match.id)
```

### W114 — lwrpc-admin/app/schedule-editor/page.js:628

Object: `matches`; operation: `update`; browser-component.

Browser consumers: `lwrpc-admin/app/schedule-editor/page.js`

```js
supabase
      .from("matches")
      .update({
        home_team_id: proposedMatch.home_team_id,
        away_team_id: proposedMatch.away_team_id,
        location_id: proposedMatch.location_id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", proposedMatch.id)
```

### W115 — lwrpc-admin/app/schedule-editor/page.js:661

Object: `matches`; operation: `update`; browser-component.

Browser consumers: `lwrpc-admin/app/schedule-editor/page.js`

```js
supabase
      .from("matches")
      .update(payload)
      .eq("id", matchId)
```

### W116 — lwrpc-admin/app/schedule-editor/page.js:736

Object: `line_games`; operation: `delete`; browser-component.

Browser consumers: `lwrpc-admin/app/schedule-editor/page.js`

```js
supabase
        .from("line_games")
        .delete()
        .in("match_line_id", lineIds)
```

### W117 — lwrpc-admin/app/schedule-editor/page.js:746

Object: `match_lines`; operation: `delete`; browser-component.

Browser consumers: `lwrpc-admin/app/schedule-editor/page.js`

```js
supabase
        .from("match_lines")
        .delete()
        .eq("match_id", match.id)
```

### W118 — lwrpc-admin/app/schedule-editor/page.js:757

Object: `matches`; operation: `delete`; browser-component.

Browser consumers: `lwrpc-admin/app/schedule-editor/page.js`

```js
supabase
      .from("matches")
      .delete()
      .eq("id", match.id)
```

### W119 — lwrpc-admin/app/schedule-editor/page.js:799

Object: `line_games`; operation: `update`; browser-component.

Browser consumers: `lwrpc-admin/app/schedule-editor/page.js`

```js
supabase
        .from("line_games")
        .update({
          home_score: null,
          away_score: null,
          game_status: "scheduled",
          updated_at: new Date().toISOString(),
        })
        .in("match_line_id", lineIds)
```

### W120 — lwrpc-admin/app/schedule-editor/page.js:814

Object: `match_lines`; operation: `update`; browser-component.

Browser consumers: `lwrpc-admin/app/schedule-editor/page.js`

```js
supabase
        .from("match_lines")
        .update({
          home_player_1_id: null,
          home_player_2_id: null,
          away_player_1_id: null,
          away_player_2_id: null,
          winning_team_id: null,
          home_team_games_won: 0,
          away_team_games_won: 0,
          home_team_points: 0,
          away_team_points: 0,
          line_status: "scheduled",
          updated_at: new Date().toISOString(),
        })
        .eq("match_id", match.id)
```

### W121 — lwrpc-admin/app/schedule-editor/page.js:837

Object: `matches`; operation: `update`; browser-component.

Browser consumers: `lwrpc-admin/app/schedule-editor/page.js`

```js
supabase
      .from("matches")
      .update({
        status: "scheduled",
        score_status: "not_entered",
        home_score: null,
        away_score: null,
        winning_team_id: null,
        result_type: "played",
        result_notes: null,
        score_entered_by_member_id: null,
        score_entered_at: null,
        score_verified_by_member_id: null,
        score_verified_at: null,
        finalized_at: null,
        score_disputed: false,
        score_dispute_notes: null,
        score_exported_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", match.id)
```

### W122 — lwrpc-admin/app/scheduling/page.js:691

Object: `match_lines`; operation: `insert`; browser-component.

Browser consumers: `lwrpc-admin/app/scheduling/page.js`

```js
supabase
      .from("match_lines")
      .insert(matchLineRows)
      .select("id, division_line_id")
```

### W123 — lwrpc-admin/app/scheduling/page.js:717

Object: `line_games`; operation: `insert`; browser-component.

Browser consumers: `lwrpc-admin/app/scheduling/page.js`

```js
supabase.from("line_games").insert(gameRows)
```

### W124 — lwrpc-admin/app/scheduling/page.js:902

Object: `matches`; operation: `insert`; browser-component.

Browser consumers: `lwrpc-admin/app/scheduling/page.js`

```js
supabase
        .from("matches")
        .insert(rowsToInsert)
        .select()
```

### W125 — lwrpc-admin/app/scheduling/page.js:910

Object: `team_byes`; operation: `insert`; browser-component.

Browser consumers: `lwrpc-admin/app/scheduling/page.js`

```js
supabase.from("team_byes").insert(byeRows)
```

### W126 — lwrpc-admin/app/scheduling/page.js:988

Object: `line_games`; operation: `delete`; browser-component.

Browser consumers: `lwrpc-admin/app/scheduling/page.js`

```js
supabase.from("line_games").delete().in("match_line_id", lineIds)
```

### W127 — lwrpc-admin/app/scheduling/page.js:992

Object: `match_lines`; operation: `delete`; browser-component.

Browser consumers: `lwrpc-admin/app/scheduling/page.js`

```js
supabase.from("match_lines").delete().in("match_id", matchIds)
```

### W128 — lwrpc-admin/app/scheduling/page.js:995

Object: `matches`; operation: `delete`; browser-component.

Browser consumers: `lwrpc-admin/app/scheduling/page.js`

```js
supabase.from("matches").delete().in("id", matchIds)
```

### W129 — lwrpc-admin/app/scheduling/page.js:998

Object: `team_byes`; operation: `delete`; browser-component.

Browser consumers: `lwrpc-admin/app/scheduling/page.js`

```js
supabase
      .from("team_byes")
      .delete()
      .eq("league_id", setting.league_id)
      .eq("division_id", setting.division_id)
```

### W130 — lwrpc-admin/app/score-entry/[id]/page.js:229

Object: `line_games`; operation: `update`; browser-component.

Browser consumers: `lwrpc-admin/app/score-entry/[id]/page.js`

```js
supabase
          .from("line_games")
          .update({
            [field]: normalizedValue,
            updated_at: new Date().toISOString()
          })
          .eq("id", gameId)
```

### W131 — lwrpc-admin/app/score-entry/[id]/page.js:431

Object: `match_lines`; operation: `update`; browser-component.

Browser consumers: `lwrpc-admin/app/score-entry/[id]/page.js`

```js
supabase
        .from("match_lines")
        .update({
          winning_team_id: winningTeamId,
          home_team_games_won: summary.homeGameWins,
          away_team_games_won: summary.awayGameWins,
          home_team_points: summary.homePoints,
          away_team_points: summary.awayPoints,
          updated_at: new Date().toISOString()
        })
        .eq("id", line.id)
```

### W132 — lwrpc-admin/app/score-entry/[id]/page.js:458

Object: `matches`; operation: `update`; browser-component.

Browser consumers: `lwrpc-admin/app/score-entry/[id]/page.js`

```js
supabase
      .from("matches")
      .update({
        status: "completed",
        score_status: "pending_verification",
        home_score: homeLines,
        away_score: awayLines,
        winning_team_id: winningTeamId,
        score_entered_by_member_id: currentUserMember?.id || null,
        score_entered_at: new Date().toISOString(),
        score_verified_by_member_id: null,
        score_verified_at: null,
        finalized_at: null,
        updated_at: new Date().toISOString()
      })
      .eq("id", id)
```

### W133 — lwrpc-admin/app/score-sheets/page.js:132

Object: `score_sheet_templates`; operation: `update`; browser-component.

Browser consumers: `lwrpc-admin/app/score-sheets/page.js`

```js
supabase
        .from("score_sheet_templates")
        .update({ is_default: false, updated_at: new Date().toISOString() })
        .neq("id", isRenamingTemplate ? "00000000-0000-0000-0000-000000000000" : editingId || "00000000-0000-0000-0000-000000000000")
```

### W134 — lwrpc-admin/app/score-sheets/page.js:156

Object: `score_sheet_templates`; operation: `update`; browser-component.

Browser consumers: `lwrpc-admin/app/score-sheets/page.js`

```js
supabase.from("score_sheet_templates").update(payload).eq("id", editingId)
```

### W135 — lwrpc-admin/app/score-sheets/page.js:157

Object: `score_sheet_templates`; operation: `insert`; browser-component.

Browser consumers: `lwrpc-admin/app/score-sheets/page.js`

```js
supabase.from("score_sheet_templates").insert(payload)
```

### W136 — lwrpc-admin/app/score-sheets/page.js:179

Object: `score_sheet_templates`; operation: `insert`; browser-component.

Browser consumers: `lwrpc-admin/app/score-sheets/page.js`

```js
supabase
      .from("score_sheet_templates")
      .insert({
        ...payload,
        updated_at: new Date().toISOString(),
      })
```

### W137 — lwrpc-admin/app/score-sheets/page.js:202

Object: `score_sheet_templates`; operation: `delete`; browser-component.

Browser consumers: `lwrpc-admin/app/score-sheets/page.js`

```js
supabase.from("score_sheet_templates").delete().eq("id", template.id)
```

### W138 — lwrpc-admin/app/scoring/page.js:456

Object: `matches`; operation: `delete`; browser-component.

Browser consumers: `lwrpc-admin/app/scoring/page.js`

```js
supabase
      .from("matches")
      .delete()
      .eq("id", match.id)
      .neq("status", "completed")
      .select("id")
```

### W139 — lwrpc-admin/app/scoring/page.js:651

Object: `matches`; operation: `update`; browser-component.

Browser consumers: `lwrpc-admin/app/scoring/page.js`

```js
supabase
      .from("matches")
      .update({
        score_exported_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .in("id", rows.map((match) => match.id))
```

### W140 — lwrpc-admin/app/scoring/page.js:680

Object: `matches`; operation: `update`; browser-component.

Browser consumers: `lwrpc-admin/app/scoring/page.js`

```js
supabase
      .from("matches")
      .update({
        score_exported_at: null,
        updated_at: new Date().toISOString(),
      })
      .in("id", selectedAlreadyExportedMatches.map((match) => match.id))
```

### W141 — lwrpc-admin/app/scoring/page.js:949

Object: `matches`; operation: `update`; browser-component.

Browser consumers: `lwrpc-admin/app/scoring/page.js`

```js
supabase
        .from("matches")
        .update(structureLocked ? schedulePayload : fullPayload)
        .eq("id", match.id)
        .select("id")
        .single()
```

### W142 — lwrpc-admin/app/scoring/page.js:971

Object: `matches`; operation: `insert`; browser-component.

Browser consumers: `lwrpc-admin/app/scoring/page.js`

```js
supabase
        .from("matches")
        .insert({ ...fullPayload, status: "scheduled" })
        .select("id")
        .single()
```

### W143 — lwrpc-admin/app/scoring/page.js:1131

Object: `match_lines`; operation: `insert`; browser-component.

Browser consumers: `lwrpc-admin/app/scoring/page.js`

```js
supabase
    .from("match_lines")
    .insert(lineTemplates.map((line) => ({
      match_id: matchId,
      division_line_id: line.id,
      line_number: line.line_number,
      posted_to_dupr: line.posted_to_dupr,
      line_status: "scheduled",
    })))
    .select("id, division_line_id")
```

### W144 — lwrpc-admin/app/scoring/page.js:1155

Object: `line_games`; operation: `insert`; browser-component.

Browser consumers: `lwrpc-admin/app/scoring/page.js`

```js
supabase.from("line_games").insert(gameRows)
```

### W145 — lwrpc-admin/app/scoring/page.js:1160

Object: `match_lineups`; operation: `delete`; browser-component.

Browser consumers: `lwrpc-admin/app/scoring/page.js`

```js
supabase
    .from("match_lineups")
    .delete()
    .eq("match_id", matchId)
```

### W146 — lwrpc-admin/app/scoring/page.js:1167

Object: `match_lines`; operation: `delete`; browser-component.

Browser consumers: `lwrpc-admin/app/scoring/page.js`

```js
supabase
    .from("match_lines")
    .delete()
    .eq("match_id", matchId)
```

### W147 — lwrpc-admin/app/seasons/page.js:73

Object: `seasons`; operation: `update`; browser-component.

Browser consumers: `lwrpc-admin/app/seasons/page.js`

```js
supabase
          .from("seasons")
          .update({
            ...payload,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingSeasonId)
```

### W148 — lwrpc-admin/app/seasons/page.js:80

Object: `seasons`; operation: `insert`; browser-component.

Browser consumers: `lwrpc-admin/app/seasons/page.js`

```js
supabase
          .from("seasons")
          .insert(payload)
```

### W149 — lwrpc-admin/app/seasons/page.js:102

Object: `seasons`; operation: `delete`; browser-component.

Browser consumers: `lwrpc-admin/app/seasons/page.js`

```js
supabase
      .from("seasons")
      .delete()
      .eq("id", id)
```

### W150 — lwrpc-admin/app/seasons/page.js:122

Object: `seasons`; operation: `update`; browser-component.

Browser consumers: `lwrpc-admin/app/seasons/page.js`

```js
supabase
        .from("seasons")
        .update({
          is_active: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", season.id)
```

### W151 — lwrpc-admin/app/seasons/page.js:184

Object: `seasons`; operation: `update`; browser-component.

Browser consumers: `lwrpc-admin/app/seasons/page.js`

```js
supabase
      .from("seasons")
      .update({ is_active: false, updated_at: now })
      .eq("id", seasonId)
```

### W152 — lwrpc-admin/app/seasons/page.js:192

Object: `teams`; operation: `update`; browser-component.

Browser consumers: `lwrpc-admin/app/seasons/page.js`

```js
supabase
        .from("teams")
        .update({ is_active: false, updated_at: now })
        .in("id", teamIds)
```

### W153 — lwrpc-admin/app/teams/page.js:361

Object: `teams`; operation: `update`; browser-component.

Browser consumers: `lwrpc-admin/app/teams/page.js`

```js
supabase
        .from("teams")
        .update(payload)
        .eq("id", editingTeamId)
```

### W154 — lwrpc-admin/app/teams/page.js:368

Object: `teams`; operation: `insert`; browser-component.

Browser consumers: `lwrpc-admin/app/teams/page.js`

```js
supabase
        .from("teams")
        .insert(payload)
```

### W155 — lwrpc-admin/app/teams/page.js:497

Object: `teams`; operation: `update`; browser-component.

Browser consumers: `lwrpc-admin/app/teams/page.js`

```js
supabase
      .from("teams")
      .update({
        is_active: !currentlyActive,
        updated_at: new Date().toISOString(),
      })
      .eq("id", team.id)
```

### W156 — lwrpc-admin/app/teams/page.js:522

Object: `team_standings`; operation: `update`; browser-component.

Browser consumers: `lwrpc-admin/app/teams/page.js`

```js
supabase
      .from("team_standings")
      .update({
        rank: null,
        matches_played: 0,
        match_wins: 0,
        match_losses: 0,
        match_ties: 0,
        line_wins: 0,
        line_losses: 0,
        line_ties: 0,
        game_wins: 0,
        game_losses: 0,
        points_for: 0,
        points_against: 0,
        point_differential: 0,
        standings_points: 0,
        home_wins: 0,
        home_losses: 0,
        away_wins: 0,
        away_losses: 0,
        recent_form: "",
        current_streak: "-",
        updated_at: new Date().toISOString(),
      })
      .eq("team_id", teamId)
```

### W157 — lwrpc-admin/app/teams/page.js:621

Object: `teams`; operation: `insert`; browser-component.

Browser consumers: `lwrpc-admin/app/teams/page.js`

```js
supabase
      .from("teams")
      .insert(
        sourceTeams.map((team) => copyTeamPayload(team, team.name, copyDivisionTargetDivision))
      )
      .select("id")
```

### W158 — lwrpc-admin/app/teams/page.js:662

Object: `team_members`; operation: `insert`; browser-component.

Browser consumers: `lwrpc-admin/app/teams/page.js`

```js
supabase
          .from("team_members")
          .insert(rosterPayload)
```

### W159 — lwrpc-admin/app/teams/page.js:697

Object: `teams`; operation: `insert`; browser-component.

Browser consumers: `lwrpc-admin/app/teams/page.js`

```js
supabase
      .from("teams")
      .insert(payload)
      .select("id")
      .single()
```

### W160 — lwrpc-admin/app/teams/page.js:726

Object: `team_members`; operation: `insert`; browser-component.

Browser consumers: `lwrpc-admin/app/teams/page.js`

```js
supabase
          .from("team_members")
          .insert(rosterPayload)
```

### W161 — lwrpc-admin/app/teams/[id]/page.js:830

Object: `team_members`; operation: `insert`; browser-component.

Browser consumers: `lwrpc-admin/app/teams/[id]/page.js`

```js
supabase
      .from("team_members")
      .insert({
        team_id: id,
        member_id: selectedMemberId
      })
```

### W162 — lwrpc-admin/app/teams/[id]/page.js:893

Object: `team_members`; operation: `delete`; browser-component.

Browser consumers: `lwrpc-admin/app/teams/[id]/page.js`

```js
supabase
      .from("team_members")
      .delete()
      .eq("id", teamMemberId)
```


## Per-expression authorization and replacement index

Exact payload/filter queries appear above; machine-readable annotations include the current database policy expressions. Storage/RPC entries need their operation-specific classification; they are not automatically database mutations.

| ID | Intended authority | Replacement | View-As |
|---|---|---|---|
| W001 | Existing scoped/admin policy; inspect exact expression | retain sound direct path or existing server operation; compound protected writes migrate | Mutations denied |
| W002 | Existing scoped/admin policy; inspect exact expression | retain sound direct path or existing server operation; compound protected writes migrate | Mutations denied |
| W003 | Existing scoped/admin policy; inspect exact expression | retain sound direct path or existing server operation; compound protected writes migrate | Mutations denied |
| W004 | Existing scoped/admin policy; inspect exact expression | retain sound direct path or existing server operation; compound protected writes migrate | Mutations denied |
| W005 | Existing scoped/admin policy; inspect exact expression | retain sound direct path or existing server operation; compound protected writes migrate | Mutations denied |
| W006 | Existing scoped/admin policy; inspect exact expression | retain sound direct path or existing server operation; compound protected writes migrate | Mutations denied |
| W007 | Existing scoped/admin policy; inspect exact expression | retain sound direct path or existing server operation; compound protected writes migrate | Mutations denied |
| W008 | Assigned match side; manager | existing match-lineups endpoint -> atomic lineup.save/clear | Mutations denied |
| W009 | Existing scoped/admin policy; inspect exact expression | retain sound direct path or existing server operation; compound protected writes migrate | Mutations denied |
| W010 | Existing scoped/admin policy; inspect exact expression | retain sound direct path or existing server operation; compound protected writes migrate | Mutations denied |
| W011 | Existing scoped/admin policy; inspect exact expression | retain sound direct path or existing server operation; compound protected writes migrate | Mutations denied |
| W012 | Existing scoped/admin policy; inspect exact expression | retain sound direct path or existing server operation; compound protected writes migrate | Mutations denied |
| W013 | manager only | teams.admin normal mutation | Mutations denied |
| W014 | SELF explicit profile endpoint only; otherwise manager | member/profile fixed normal mutation | Mutations denied |
| W015 | SELF explicit profile endpoint only; otherwise manager | member/profile fixed normal mutation | Mutations denied |
| W016 | Existing scoped/admin policy; inspect exact expression | retain sound direct path or existing server operation; compound protected writes migrate | Mutations denied |
| W017 | Assigned match score operations where current policy allows; manager scheduling/admin | match/score fixed normal mutation; retain existing validation | Mutations denied |
| W018 | Existing scoped/admin policy; inspect exact expression | retain sound direct path or existing server operation; compound protected writes migrate | Mutations denied |
| W019 | Existing scoped/admin policy; inspect exact expression | retain sound direct path or existing server operation; compound protected writes migrate | Mutations denied |
| W020 | current managed-team scope or manager scheduling | schedule/byes normal mutation | Mutations denied |
| W021 | Existing scoped/admin policy; inspect exact expression | retain sound direct path or existing server operation; compound protected writes migrate | Mutations denied |
| W022 | Existing scoped/admin policy; inspect exact expression | retain sound direct path or existing server operation; compound protected writes migrate | Mutations denied |
| W023 | Existing scoped/admin policy; inspect exact expression | retain sound direct path or existing server operation; compound protected writes migrate | Mutations denied |
| W024 | Existing scoped/admin policy; inspect exact expression | retain sound direct path or existing server operation; compound protected writes migrate | Mutations denied |
| W025 | Existing scoped/admin policy; inspect exact expression | retain sound direct path or existing server operation; compound protected writes migrate | Mutations denied |
| W026 | Existing scoped/admin policy; inspect exact expression | retain sound direct path or existing server operation; compound protected writes migrate | Mutations denied |
| W027 | Existing scoped/admin policy; inspect exact expression | retain sound direct path or existing server operation; compound protected writes migrate | Mutations denied |
| W028 | Existing scoped/admin policy; inspect exact expression | retain sound direct path or existing server operation; compound protected writes migrate | Mutations denied |
| W029 | Existing scoped/admin policy; inspect exact expression | retain sound direct path or existing server operation; compound protected writes migrate | Mutations denied |
| W030 | Existing scoped/admin policy; inspect exact expression | retain sound direct path or existing server operation; compound protected writes migrate | Mutations denied |
| W031 | Existing scoped/admin policy; inspect exact expression | retain sound direct path or existing server operation; compound protected writes migrate | Mutations denied |
| W032 | Existing scoped/admin policy; inspect exact expression | retain sound direct path or existing server operation; compound protected writes migrate | Mutations denied |
| W033 | Existing scoped/admin policy; inspect exact expression | retain sound direct path or existing server operation; compound protected writes migrate | Mutations denied |
| W034 | Existing scoped/admin policy; inspect exact expression | retain sound direct path or existing server operation; compound protected writes migrate | Mutations denied |
| W035 | Existing scoped/admin policy; inspect exact expression | retain sound direct path or existing server operation; compound protected writes migrate | Mutations denied |
| W036 | Existing scoped/admin policy; inspect exact expression | retain sound direct path or existing server operation; compound protected writes migrate | Mutations denied |
| W037 | Existing scoped/admin policy; inspect exact expression | retain sound direct path or existing server operation; compound protected writes migrate | Mutations denied |
| W038 | Existing scoped/admin policy; inspect exact expression | retain sound direct path or existing server operation; compound protected writes migrate | Mutations denied |
| W039 | Existing scoped/admin policy; inspect exact expression | retain sound direct path or existing server operation; compound protected writes migrate | Mutations denied |
| W040 | Existing scoped/admin policy; inspect exact expression | retain sound direct path or existing server operation; compound protected writes migrate | Mutations denied |
| W041 | Existing scoped/admin policy; inspect exact expression | retain sound direct path or existing server operation; compound protected writes migrate | Mutations denied |
| W042 | Existing scoped/admin policy; inspect exact expression | retain sound direct path or existing server operation; compound protected writes migrate | Mutations denied |
| W043 | Existing scoped/admin policy; inspect exact expression | retain sound direct path or existing server operation; compound protected writes migrate | Mutations denied |
| W044 | Existing scoped/admin policy; inspect exact expression | retain sound direct path or existing server operation; compound protected writes migrate | Mutations denied |
| W045 | Existing scoped/admin policy; inspect exact expression | retain sound direct path or existing server operation; compound protected writes migrate | Mutations denied |
| W046 | Existing scoped/admin policy; inspect exact expression | retain sound direct path or existing server operation; compound protected writes migrate | Mutations denied |
| W047 | Existing scoped/admin policy; inspect exact expression | retain sound direct path or existing server operation; compound protected writes migrate | Mutations denied |
| W048 | Existing scoped/admin policy; inspect exact expression | retain sound direct path or existing server operation; compound protected writes migrate | Mutations denied |
| W049 | Existing scoped/admin policy; inspect exact expression | retain sound direct path or existing server operation; compound protected writes migrate | Mutations denied |
| W050 | Existing scoped/admin policy; inspect exact expression | retain sound direct path or existing server operation; compound protected writes migrate | Mutations denied |
| W051 | Existing scoped/admin policy; inspect exact expression | retain sound direct path or existing server operation; compound protected writes migrate | Mutations denied |
| W052 | Existing scoped/admin policy; inspect exact expression | retain sound direct path or existing server operation; compound protected writes migrate | Mutations denied |
| W053 | Existing scoped/admin policy; inspect exact expression | retain sound direct path or existing server operation; compound protected writes migrate | Mutations denied |
| W054 | Existing scoped/admin policy; inspect exact expression | retain sound direct path or existing server operation; compound protected writes migrate | Mutations denied |
| W055 | Existing scoped/admin policy; inspect exact expression | retain sound direct path or existing server operation; compound protected writes migrate | Mutations denied |
| W056 | Existing scoped/admin policy; inspect exact expression | retain sound direct path or existing server operation; compound protected writes migrate | Mutations denied |
| W057 | Existing scoped/admin policy; inspect exact expression | retain sound direct path or existing server operation; compound protected writes migrate | Mutations denied |
| W058 | Commissioner, per current database policy | roles.admin fixed normal mutation; no automatic broadened grants | Mutations denied |
| W059 | Commissioner, per current database policy | roles.admin fixed normal mutation; no automatic broadened grants | Mutations denied |
| W060 | Existing scoped/admin policy; inspect exact expression | retain sound direct path or existing server operation; compound protected writes migrate | Mutations denied |
| W061 | Existing scoped/admin policy; inspect exact expression | retain sound direct path or existing server operation; compound protected writes migrate | Mutations denied |
| W062 | Existing scoped/admin policy; inspect exact expression | retain sound direct path or existing server operation; compound protected writes migrate | Mutations denied |
| W063 | SELF photo, server-owned storage result | profile.photo normal mutation | Mutations denied |
| W064 | Existing scoped/admin policy; inspect exact expression | retain sound direct path or existing server operation; compound protected writes migrate | Mutations denied |
| W065 | Existing scoped/admin policy; inspect exact expression | retain sound direct path or existing server operation; compound protected writes migrate | Mutations denied |
| W066 | Assigned match score operations where current policy allows; manager scheduling/admin | match/score fixed normal mutation; retain existing validation | Mutations denied |
| W067 | Assigned match score operations where current policy allows; manager scheduling/admin | match/score fixed normal mutation; retain existing validation | Mutations denied |
| W068 | Assigned match score operations where current policy allows; manager scheduling/admin | match/score fixed normal mutation; retain existing validation | Mutations denied |
| W069 | Existing scoped/admin policy; inspect exact expression | retain sound direct path or existing server operation; compound protected writes migrate | Mutations denied |
| W070 | Existing scoped/admin policy; inspect exact expression | retain sound direct path or existing server operation; compound protected writes migrate | Mutations denied |
| W071 | Existing scoped/admin policy; inspect exact expression | retain sound direct path or existing server operation; compound protected writes migrate | Mutations denied |
| W072 | existing admin policy; Commissioner UI workflow | locations.admin normal mutation | Mutations denied |
| W073 | existing admin policy; Commissioner UI workflow | locations.admin normal mutation | Mutations denied |
| W074 | existing admin policy; Commissioner UI workflow | locations.admin normal mutation | Mutations denied |
| W075 | SELF explicit profile endpoint only; otherwise manager | member/profile fixed normal mutation | Mutations denied |
| W076 | manager only | teams.admin normal mutation | Mutations denied |
| W077 | Assigned match score operations where current policy allows; manager scheduling/admin | match/score fixed normal mutation; retain existing validation | Mutations denied |
| W078 | existing admin policy; Commissioner UI workflow | locations.admin normal mutation | Mutations denied |
| W079 | Assigned match score operations where current policy allows; manager scheduling/admin | match/score fixed normal mutation; retain existing validation | Mutations denied |
| W080 | Assigned match score operations where current policy allows; manager scheduling/admin | match/score fixed normal mutation; retain existing validation | Mutations denied |
| W081 | Assigned match score operations where current policy allows; manager scheduling/admin | match/score fixed normal mutation; retain existing validation | Mutations denied |
| W082 | Assigned match score operations where current policy allows; manager scheduling/admin | match/score fixed normal mutation; retain existing validation | Mutations denied |
| W083 | Assigned match score operations where current policy allows; manager scheduling/admin | match/score fixed normal mutation; retain existing validation | Mutations denied |
| W084 | Assigned match score operations where current policy allows; manager scheduling/admin | match/score fixed normal mutation; retain existing validation | Mutations denied |
| W085 | Assigned match score operations where current policy allows; manager scheduling/admin | match/score fixed normal mutation; retain existing validation | Mutations denied |
| W086 | Assigned match score operations where current policy allows; manager scheduling/admin | match/score fixed normal mutation; retain existing validation | Mutations denied |
| W087 | Assigned match score operations where current policy allows; manager scheduling/admin | match/score fixed normal mutation; retain existing validation | Mutations denied |
| W088 | Assigned match score operations where current policy allows; manager scheduling/admin | match/score fixed normal mutation; retain existing validation | Mutations denied |
| W089 | Assigned match score operations where current policy allows; manager scheduling/admin | match/score fixed normal mutation; retain existing validation | Mutations denied |
| W090 | SELF explicit profile endpoint only; otherwise manager | member/profile fixed normal mutation | Mutations denied |
| W091 | SELF explicit profile endpoint only; otherwise manager | member/profile fixed normal mutation | Mutations denied |
| W092 | SELF explicit profile endpoint only; otherwise manager | member/profile fixed normal mutation | Mutations denied |
| W093 | SELF explicit profile endpoint only; otherwise manager | member/profile fixed normal mutation | Mutations denied |
| W094 | SELF explicit profile endpoint only; otherwise manager | member/profile fixed normal mutation | Mutations denied |
| W095 | Commissioner, per current database policy | roles.admin fixed normal mutation; no automatic broadened grants | Mutations denied |
| W096 | SELF explicit profile endpoint only; otherwise manager | member/profile fixed normal mutation | Mutations denied |
| W097 | Commissioner, per current database policy | roles.admin fixed normal mutation; no automatic broadened grants | Mutations denied |
| W098 | SELF explicit profile endpoint only; otherwise manager | member/profile fixed normal mutation | Mutations denied |
| W099 | Commissioner, per current database policy | roles.admin fixed normal mutation; no automatic broadened grants | Mutations denied |
| W100 | Commissioner, per current database policy | roles.admin fixed normal mutation; no automatic broadened grants | Mutations denied |
| W101 | SELF explicit profile endpoint only; otherwise manager | member/profile fixed normal mutation | Mutations denied |
| W102 | manager only for writes | ratings.admin fixed normal mutation | Mutations denied |
| W103 | manager only for writes | ratings.admin fixed normal mutation | Mutations denied |
| W104 | SELF explicit profile endpoint only; otherwise manager | member/profile fixed normal mutation | Mutations denied |
| W105 | manager only for writes | ratings.admin fixed normal mutation | Mutations denied |
| W106 | SELF explicit profile endpoint only; otherwise manager | member/profile fixed normal mutation | Mutations denied |
| W107 | manager only for writes | ratings.admin fixed normal mutation | Mutations denied |
| W108 | manager only for writes | ratings.admin fixed normal mutation | Mutations denied |
| W109 | manager only for writes | ratings.admin fixed normal mutation | Mutations denied |
| W110 | manager only for writes | ratings.admin fixed normal mutation | Mutations denied |
| W111 | manager only for writes | ratings.admin fixed normal mutation | Mutations denied |
| W112 | Assigned match score operations where current policy allows; manager scheduling/admin | match/score fixed normal mutation; retain existing validation | Mutations denied |
| W113 | Assigned match score operations where current policy allows; manager scheduling/admin | match/score fixed normal mutation; retain existing validation | Mutations denied |
| W114 | Assigned match score operations where current policy allows; manager scheduling/admin | match/score fixed normal mutation; retain existing validation | Mutations denied |
| W115 | Assigned match score operations where current policy allows; manager scheduling/admin | match/score fixed normal mutation; retain existing validation | Mutations denied |
| W116 | Assigned match score operations where current policy allows; manager scheduling/admin | match/score fixed normal mutation; retain existing validation | Mutations denied |
| W117 | Assigned match score operations where current policy allows; manager scheduling/admin | match/score fixed normal mutation; retain existing validation | Mutations denied |
| W118 | Assigned match score operations where current policy allows; manager scheduling/admin | match/score fixed normal mutation; retain existing validation | Mutations denied |
| W119 | Assigned match score operations where current policy allows; manager scheduling/admin | match/score fixed normal mutation; retain existing validation | Mutations denied |
| W120 | Assigned match score operations where current policy allows; manager scheduling/admin | match/score fixed normal mutation; retain existing validation | Mutations denied |
| W121 | Assigned match score operations where current policy allows; manager scheduling/admin | match/score fixed normal mutation; retain existing validation | Mutations denied |
| W122 | Assigned match score operations where current policy allows; manager scheduling/admin | match/score fixed normal mutation; retain existing validation | Mutations denied |
| W123 | Assigned match score operations where current policy allows; manager scheduling/admin | match/score fixed normal mutation; retain existing validation | Mutations denied |
| W124 | Assigned match score operations where current policy allows; manager scheduling/admin | match/score fixed normal mutation; retain existing validation | Mutations denied |
| W125 | current managed-team scope or manager scheduling | schedule/byes normal mutation | Mutations denied |
| W126 | Assigned match score operations where current policy allows; manager scheduling/admin | match/score fixed normal mutation; retain existing validation | Mutations denied |
| W127 | Assigned match score operations where current policy allows; manager scheduling/admin | match/score fixed normal mutation; retain existing validation | Mutations denied |
| W128 | Assigned match score operations where current policy allows; manager scheduling/admin | match/score fixed normal mutation; retain existing validation | Mutations denied |
| W129 | current managed-team scope or manager scheduling | schedule/byes normal mutation | Mutations denied |
| W130 | Assigned match score operations where current policy allows; manager scheduling/admin | match/score fixed normal mutation; retain existing validation | Mutations denied |
| W131 | Assigned match score operations where current policy allows; manager scheduling/admin | match/score fixed normal mutation; retain existing validation | Mutations denied |
| W132 | Assigned match score operations where current policy allows; manager scheduling/admin | match/score fixed normal mutation; retain existing validation | Mutations denied |
| W133 | Existing scoped/admin policy; inspect exact expression | retain sound direct path or existing server operation; compound protected writes migrate | Mutations denied |
| W134 | Existing scoped/admin policy; inspect exact expression | retain sound direct path or existing server operation; compound protected writes migrate | Mutations denied |
| W135 | Existing scoped/admin policy; inspect exact expression | retain sound direct path or existing server operation; compound protected writes migrate | Mutations denied |
| W136 | Existing scoped/admin policy; inspect exact expression | retain sound direct path or existing server operation; compound protected writes migrate | Mutations denied |
| W137 | Existing scoped/admin policy; inspect exact expression | retain sound direct path or existing server operation; compound protected writes migrate | Mutations denied |
| W138 | Assigned match score operations where current policy allows; manager scheduling/admin | match/score fixed normal mutation; retain existing validation | Mutations denied |
| W139 | Assigned match score operations where current policy allows; manager scheduling/admin | match/score fixed normal mutation; retain existing validation | Mutations denied |
| W140 | Assigned match score operations where current policy allows; manager scheduling/admin | match/score fixed normal mutation; retain existing validation | Mutations denied |
| W141 | Assigned match score operations where current policy allows; manager scheduling/admin | match/score fixed normal mutation; retain existing validation | Mutations denied |
| W142 | Assigned match score operations where current policy allows; manager scheduling/admin | match/score fixed normal mutation; retain existing validation | Mutations denied |
| W143 | Assigned match score operations where current policy allows; manager scheduling/admin | match/score fixed normal mutation; retain existing validation | Mutations denied |
| W144 | Assigned match score operations where current policy allows; manager scheduling/admin | match/score fixed normal mutation; retain existing validation | Mutations denied |
| W145 | Assigned match side; manager | existing match-lineups endpoint -> atomic lineup.save/clear | Mutations denied |
| W146 | Assigned match score operations where current policy allows; manager scheduling/admin | match/score fixed normal mutation; retain existing validation | Mutations denied |
| W147 | Existing scoped/admin policy; inspect exact expression | retain sound direct path or existing server operation; compound protected writes migrate | Mutations denied |
| W148 | Existing scoped/admin policy; inspect exact expression | retain sound direct path or existing server operation; compound protected writes migrate | Mutations denied |
| W149 | Existing scoped/admin policy; inspect exact expression | retain sound direct path or existing server operation; compound protected writes migrate | Mutations denied |
| W150 | Existing scoped/admin policy; inspect exact expression | retain sound direct path or existing server operation; compound protected writes migrate | Mutations denied |
| W151 | Existing scoped/admin policy; inspect exact expression | retain sound direct path or existing server operation; compound protected writes migrate | Mutations denied |
| W152 | manager only | teams.admin normal mutation | Mutations denied |
| W153 | manager only | teams.admin normal mutation | Mutations denied |
| W154 | manager only | teams.admin normal mutation | Mutations denied |
| W155 | manager only | teams.admin normal mutation | Mutations denied |
| W156 | Existing scoped/admin policy; inspect exact expression | retain sound direct path or existing server operation; compound protected writes migrate | Mutations denied |
| W157 | manager only | teams.admin normal mutation | Mutations denied |
| W158 | Captain/Co-Captain/Club Pro assigned team; manager admin | roster.add/remove; trusted normal mutation | Mutations denied |
| W159 | manager only | teams.admin normal mutation | Mutations denied |
| W160 | Captain/Co-Captain/Club Pro assigned team; manager admin | roster.add/remove; trusted normal mutation | Mutations denied |
| W161 | Captain/Co-Captain/Club Pro assigned team; manager admin | roster.add/remove; trusted normal mutation | Mutations denied |
| W162 | Captain/Co-Captain/Club Pro assigned team; manager admin | roster.add/remove; trusted normal mutation | Mutations denied |
