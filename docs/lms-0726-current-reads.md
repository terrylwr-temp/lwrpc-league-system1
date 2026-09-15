# LMS-0726 exact current read expressions

Source-only census; not runtime query counts. Includes optional/modal, helper, API and mutation-return expressions. Raw current `*` selectors are evidence of existing reads, NOT proposed projections. Full filters, embedded joins, aliases and selection strings are preserved in [JSON](lms-0726-read-expressions.json). `head: true` counts return no rows.

## lwrpc-admin/app/AdminDashboardClient.js

Browser page/component, except route wrappers. 22 static expressions.

### R001 — line 240

C for protected relational page data; B for composition/formatting.

```js
supabase.from("seasons").select("id, name").order("name", { ascending: true })
```

### R002 — line 241

C for protected relational page data; B for composition/formatting.

```js
supabase.from("leagues").select("id, name, season_id, seasons(name)").order("name", { ascending: true })
```

### R003 — line 242

C for protected relational page data; B for composition/formatting.

```js
supabase.from("divisions").select("id, name, league_id, is_active, rating_type, leagues(name, season_id, is_active, seasons(name, is_active))").order("name", { ascending: true })
```

### R004 — line 253

C for protected relational page data; B for composition/formatting.

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

### R005 — line 365

C for protected relational page data; B for composition/formatting.

```js
supabase
      .from("seasons")
      .select("id, name, is_active, start_date, end_date")
      .order("name", { ascending: true })
```

### R006 — line 388

C for protected relational page data; B for composition/formatting.

```js
supabase
            .from("members")
            .select("id, first_name, last_name, email, phone, club_location, dupr_id, renewal_date, profile_image_urls")
            .eq("id", user.memberId)
            .maybeSingle()
```

### R007 — line 1016

C for protected relational page data; B for composition/formatting.

```js
supabase
      .from("team_standings")
      .select("*, teams(id, name, abbreviation, is_active)")
      .eq("division_id", divisionId)
      .order("rank", { ascending: true })
```

### R008 — line 1037

C for protected relational page data; B for composition/formatting.

```js
supabase.from("teams").select("id, name, division_id, locations(id, name)").eq("division_id", divisionId).eq("is_active", true).order("name")
```

### R009 — line 1038

C for protected relational page data; B for composition/formatting.

```js
supabase.from("matches").select("id, division_id, home_team_id, away_team_id, scheduled_date, scheduled_time, week_number, status, score_status, home_score, away_score, winning_team_id, result_type, result_notes, is_published, locations(id, name), home_team:teams!matches_home_team_id_fkey(id, name), away_team:teams!matches_away_team_id_fkey(id, name), match_lines(id, line_number, home_team_games_won, away_team_games_won, winning_team_id, home_player_1:members!match_lines_home_player_1_id_fkey(id, first_name, last_name, full_name, self_rating), home_player_2:members!match_lines_home_player_2_id_fkey(id, first_name, last_name, full_name, self_rating), away_player_1:members!match_lines_away_player_1_id_fkey(id, first_name, last_name, full_name, self_rating), away_player_2:members!match_lines_away_player_2_id_fkey(id, first_name, last_name, full_name, self_rating), line_games(id, game_number, home_score, away_score, game_status))").eq("division_id", divisionId).eq("is_published", true).order("scheduled_date").order("scheduled_time")
```

### R010 — line 1039

C for protected relational page data; B for composition/formatting.

```js
supabase.from("team_byes").select("id, team_id, division_id, week_number, bye_date").eq("division_id", divisionId).order("bye_date")
```

### R011 — line 1040

C for protected relational page data; B for composition/formatting.

```js
supabase.from("team_standings").select("team_id, rank, standings_points, match_wins, match_losses").eq("division_id", divisionId)
```

### R012 — line 1041

C for protected relational page data; B for composition/formatting.

```js
supabase.from("member_season_ratings").select("member_id, season_dupr_rating, season_primetime_rating").eq("season_id", seasonId)
```

### R013 — line 2202

C for protected relational page data; B for composition/formatting.

```js
supabase
    .from(tableName)
    .select("*", { count: "exact", head: true })
```

### R014 — line 2228

C for protected relational page data; B for composition/formatting.

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

### R015 — line 2239

C for protected relational page data; B for composition/formatting.

```js
supabase
      .from("divisions")
      .select("id, league_id")
```

### R016 — line 2310

C for protected relational page data; B for composition/formatting.

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

### R017 — line 2353

C for protected relational page data; B for composition/formatting.

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

### R018 — line 2389

C for protected relational page data; B for composition/formatting.

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

### R019 — line 2459

C for protected relational page data; B for composition/formatting.

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

### R020 — line 2524

C for protected relational page data; B for composition/formatting.

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

### R021 — line 2557

C for protected relational page data; B for composition/formatting.

```js
supabase
    .from("team_members")
    .select("team_id, member_id")
    .in("team_id", teamIds)
```

### R022 — line 2573

C for protected relational page data; B for composition/formatting.

```js
supabase
    .from("member_season_ratings")
    .select("member_id, season_id, dupr_doubles_rating, season_dupr_rating, season_primetime_rating")
    .in("season_id", seasonIds)
```

## lwrpc-admin/app/api/admin/delete-member/route.js

Server route or shared helper: execution context must follow its caller (lib is not intrinsically server-only). 5 static expressions.

### R023 — line 34

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
authorization.supabase
      .from("members")
      .select("id, email, is_active_member, profile_image_urls")
      .eq("id", memberId)
      .maybeSingle()
```

### R024 — line 56

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
authorization.supabase
      .from("user_roles")
      .select("user_id, role")
      .eq("member_id", memberId)
```

### R025 — line 64

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
authorization.supabase
        .from("user_roles")
        .select("id")
        .eq("role", "commissioner")
        .neq("member_id", memberId)
        .limit(1)
```

### R026 — line 87

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
authorization.supabase
        .from("user_roles")
        .select("id")
        .eq("user_id", authUserId)
        .neq("member_id", memberId)
        .limit(1)
```

### R027 — line 98

RPC: classify by its trusted caller; see function reuse matrix.

```js
authorization.supabase.rpc(
      "delete_inactive_member",
      { p_member_id: memberId }
    )
```

## lwrpc-admin/app/api/admin/member-directory/route.js

Server route or shared helper: execution context must follow its caller (lib is not intrinsically server-only). 3 static expressions.

### R028 — line 37

RPC: classify by its trusted caller; see function reuse matrix.

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

### R029 — line 66

RPC: classify by its trusted caller; see function reuse matrix.

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

### R030 — line 95

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
authorization.supabase
        .from("user_roles")
        .select("id, member_id, role")
        .in("member_id", memberIds)
```

## lwrpc-admin/app/api/admin/member-last-login/route.js

Server route or shared helper: execution context must follow its caller (lib is not intrinsically server-only). 1 static expressions.

### R031 — line 33

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
authorization.supabase
      .from("members")
      .select("email")
      .eq("id", memberId)
      .maybeSingle()
```

## lwrpc-admin/app/api/ai-assistant/answer/route.js

Server route or shared helper: execution context must follow its caller (lib is not intrinsically server-only). 1 static expressions.

### R032 — line 100

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase.from("ai_documents")
    .select("id, title, document_type, authority_rank, scope_kind, active_version:ai_document_versions!ai_documents_active_version_id_fkey!inner(id, version_label, processing_status)")
    .eq("status", "active").not("active_version_id", "is", null).eq("active_version.processing_status", "ready")
    .order("authority_rank").order("title")
```

## lwrpc-admin/app/api/ai-assistant/capture-health/route.js

Server route or shared helper: execution context must follow its caller (lib is not intrinsically server-only). 1 static expressions.

### R033 — line 12

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
authorization.supabase.from("ai_request_outcomes").select("recorded_at").order("recorded_at", { ascending: false }).limit(1).abortSignal(AbortSignal.timeout(1000))
```

## lwrpc-admin/app/api/ai-assistant/documents/route.js

Server route or shared helper: execution context must follow its caller (lib is not intrinsically server-only). 15 static expressions.

### R034 — line 40

RPC: classify by its trusted caller; see function reuse matrix.

```js
authorization.supabase.rpc("activate_ai_document_version", {
        p_document_id: documentId,
        p_version_id: versionId,
        p_actor_member_id: authorization.memberRows?.find(row => row.user_roles?.some(r => ["league_manager", "commissioner"].includes(r.role)))?.id || null,
      })
```

### R035 — line 97

Mutation result: outside read parity; preserve normal write path, block View-As.

```js
authorization.supabase
      .from("ai_documents")
      .update({ ...metadata, updated_at: new Date().toISOString(), updated_by_member_id: memberId })
      .eq("id", documentId)
      .select("id")
      .single()
```

### R036 — line 112

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
      .from("ai_documents")
      .select("id, title, description, document_type, authority_rank, status, scope_kind, league_id, division_id, season_id, active_version_id, created_at, updated_at, active_version:ai_document_versions!ai_documents_active_version_id_fkey(id, version_label, processing_status, page_count, chunk_count, processed_at, activated_at, activated_by_member_id)")
      .order("updated_at", { ascending: false })
```

### R037 — line 116

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase.from("seasons").select("id, name, is_active").order("name")
```

### R038 — line 117

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase.from("leagues").select("id, name, season_id, is_active").order("name")
```

### R039 — line 118

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase.from("divisions").select("id, name, league_id, is_active").order("name")
```

### R040 — line 128

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
    .from("ai_documents")
    .select("id, title, description, document_type, authority_rank, status, scope_kind, league_id, division_id, season_id, active_version_id, created_at, updated_at, active_version:ai_document_versions!ai_documents_active_version_id_fkey(id, version_label, processing_status, page_count, chunk_count, processing_error, processing_warnings, processed_at, original_filename, storage_bucket, storage_path)")
    .eq("id", documentId)
    .single()
```

### R041 — line 134

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
    .from("ai_document_versions")
    .select("id, version_label, source_kind, original_filename, file_size_bytes, page_count, processing_status, processing_error, processing_warnings, processed_at, chunk_count, created_at, activated_at, activated_by_member_id")
    .eq("document_id", documentId)
    .order("created_at", { ascending: false })
```

### R042 — line 142

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
      .from("ai_document_chunks")
      .select("id, chunk_ordinal, page_number, section_label, rule_number, heading, content, is_searchable")
      .eq("document_version_id", selectedVersionId)
      .order("chunk_ordinal")
      .limit(50)
```

### R043 — line 161

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase.from("seasons").select("id").eq("id", metadata.season_id).maybeSingle()
```

### R044 — line 162

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase.from("leagues").select("id, season_id").eq("id", metadata.league_id).maybeSingle()
```

### R045 — line 163

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase.from("divisions").select("id, league_id").eq("id", metadata.division_id).maybeSingle()
```

### R046 — line 170

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase.from("leagues").select("id, season_id").eq("id", divisionResult.data.league_id).maybeSingle()
```

### R047 — line 179

Mutation result: outside read parity; preserve normal write path, block View-As.

```js
supabase
    .from("ai_documents")
    .insert({ ...values, status: "inactive", created_by_member_id: memberId, updated_by_member_id: memberId })
    .select("id")
    .single()
```

### R048 — line 219

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
    .from("ai_document_versions")
    .select("document_id, source_kind, storage_bucket, storage_path, original_filename, file_size_bytes")
    .eq("id", sourceVersionId)
    .eq("document_id", documentId)
    .single()
```

## lwrpc-admin/app/api/ai-assistant/live-review/route.js

Server route or shared helper: execution context must follow its caller (lib is not intrinsically server-only). 1 static expressions.

### R049 — line 11

RPC: classify by its trusted caller; see function reuse matrix.

```js
p.supabase.rpc('ai_live_review',{p_actor:p.user.id})
```

## lwrpc-admin/app/api/ai-assistant/retrieval/route.js

Server route or shared helper: execution context must follow its caller (lib is not intrinsically server-only). 1 static expressions.

### R050 — line 25

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase.from("ai_documents")
    .select("id, title, document_type, authority_rank, scope_kind, active_version:ai_document_versions!ai_documents_active_version_id_fkey!inner(id, version_label, processing_status)")
    .eq("status", "active").not("active_version_id", "is", null).eq("active_version.processing_status", "ready")
    .order("authority_rank").order("title")
```

## lwrpc-admin/app/api/ai-insights/route.js

Server route or shared helper: execution context must follow its caller (lib is not intrinsically server-only). 11 static expressions.

### R051 — line 61

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
    .from("members")
    .select("id, email, is_active_member, created_at, user_roles(role)")
    .eq("email", userData.user.email)
    .order("created_at", { ascending: true })
```

### R052 — line 153

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
      .from("members")
      .select("id, first_name, last_name, email, phone, dupr_id, is_active_member, created_at, user_roles(role)")
      .order("last_name", { ascending: true })
```

### R053 — line 157

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase.from("seasons").select("id, name, is_active").order("name", { ascending: true })
```

### R054 — line 158

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase.from("leagues").select("id, name, season_id, is_active, seasons(id, name, is_active)").order("name", { ascending: true })
```

### R055 — line 159

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
      .from("divisions")
      .select("id, name, league_id, number_of_lines, min_dupr, max_dupr, team_dupr_max, is_active, leagues(id, name, season_id, seasons(id, name, is_active))")
      .order("sort_order", { ascending: true })
```

### R056 — line 163

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

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

### R057 — line 179

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
      .from("team_members")
      .select("id, team_id, member_id, teams(id, name, is_active, division_id), members(id, first_name, last_name, email, is_active_member)")
      .limit(5000)
```

### R058 — line 183

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
      .from("member_season_ratings")
      .select("id, member_id, season_id, dupr_doubles_rating, season_dupr_rating, season_primetime_rating, notes")
      .limit(5000)
```

### R059 — line 187

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

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

### R060 — line 211

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
      .from("match_lineups")
      .select("id, match_id, team_id, line_number, player_1_member_id, player_2_member_id")
      .limit(8000)
```

### R061 — line 215

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
      .from("team_standings")
      .select("id, team_id, division_id, match_wins, match_losses, standings_points, rank, teams(id, name), divisions(id, name)")
      .limit(2000)
```

## lwrpc-admin/app/api/app-notifications/subscribe/route.js

Server route or shared helper: execution context must follow its caller (lib is not intrinsically server-only). 1 static expressions.

### R062 — line 41

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
    .from("round_robin_players")
    .select("id, group_id, display_name, phone, email, is_active")
    .eq("group_id", groupId)
    .eq("is_active", true)
    .order("display_name", { ascending: true })
```

## lwrpc-admin/app/api/ask-lwr/feedback/route.js

Server route or shared helper: execution context must follow its caller (lib is not intrinsically server-only). 2 static expressions.

### R063 — line 21

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
authorization.supabase
      .from("ai_answer_feedback_events")
      .select("id, helpful, created_at")
      .eq("answer_id", claims.answerId)
      .eq("auth_user_id", authorization.user.id)
      .order("created_at", { ascending: false })
      .limit(1)
```

### R064 — line 40

Mutation result: outside read parity; preserve normal write path, block View-As.

```js
authorization.supabase.from("ai_answer_feedback_events").insert(event).select("id, helpful, created_at").single()
```

## lwrpc-admin/app/api/brevo-diagnostics/route.js

Server route or shared helper: execution context must follow its caller (lib is not intrinsically server-only). 1 static expressions.

### R065 — line 28

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
adminClient()
    .from("members")
    .select("id, email, user_roles(role)")
    .eq("email", userData.user.email)
    .maybeSingle()
```

## lwrpc-admin/app/api/league-communications/route.js

Server route or shared helper: execution context must follow its caller (lib is not intrinsically server-only). 9 static expressions.

### R066 — line 9

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase.from("members").select("id,email,user_roles(role)").eq("email",data.user.email).maybeSingle()
```

### R067 — line 10

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
s.from("seasons").select("id,name").order("name")
```

### R068 — line 10

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
s.from("leagues").select("id,name,season_id,seasons(name)").order("name")
```

### R069 — line 10

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
s.from("divisions").select("id,name,league_id,leagues(season_id,seasons(is_active,start_date,end_date))").order("name")
```

### R070 — line 12

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
s.from("members").select("email").eq("is_active_member",true).not("email","is",null)
```

### R071 — line 12

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
s.from("teams").select("id,captain_member_id,co_captain_member_id,co_captain_2_member_id,club_pro_member_id").in("division_id",ids).eq("is_active",true)
```

### R072 — line 12

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
s.from("team_members").select("member_id").in("team_id",teamIds)
```

### R073 — line 12

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
s.from("members").select("email").in("id",[...new Set(memberIds)]).eq("is_active_member",true).not("email","is",null)
```

### R074 — line 16

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
a.supabase.from("league_communication_history").select("id,audience,scope,subject,body,attachment_names,recipient_count,sent_count,status,sent_by_email,created_at").order("created_at",{ascending:false}).limit(100)
```

## lwrpc-admin/app/api/master-reset/route.js

Server route or shared helper: execution context must follow its caller (lib is not intrinsically server-only). 1 static expressions.

### R075 — line 29

RPC: classify by its trusted caller; see function reuse matrix.

```js
authorization.supabase.rpc(
      "admin_master_reset_all"
    )
```

## lwrpc-admin/app/api/match-lineups/route.js

Server route or shared helper: execution context must follow its caller (lib is not intrinsically server-only). 6 static expressions.

### R076 — line 90

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
      .from("members")
      .select("id, email, is_active_member, user_roles(role)")
      .eq("email", userData.user.email)
      .order("created_at", { ascending: true })
```

### R077 — line 101

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

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

### R078 — line 137

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
      .from("teams")
      .select("id, captain_member_id, co_captain_member_id, co_captain_2_member_id, club_pro_member_id")
      .eq("id", teamId)
      .single()
```

### R079 — line 172

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
        .from("team_members")
        .select("member_id, members(id, first_name, last_name, self_rating)")
        .eq("team_id", teamId)
        .in("member_id", playerIds)
```

### R080 — line 195

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
          .from("member_season_ratings")
          .select("member_id, season_dupr_rating, season_primetime_rating")
          .eq("season_id", seasonId)
          .in("member_id", playerIds)
```

### R081 — line 313

Mutation result: outside read parity; preserve normal write path, block View-As.

```js
supabase
      .from("match_lineups")
      .upsert(rows, {
        onConflict: "match_id,team_id,line_number",
      })
      .select("match_id, team_id, line_number, player_1_member_id, player_2_member_id")
```

## lwrpc-admin/app/api/match-setup-reminders/route.js

Server route or shared helper: execution context must follow its caller (lib is not intrinsically server-only). 1 static expressions.

### R082 — line 63

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
      .from("members")
      .select("id, email, user_roles(role)")
      .eq("email", userData.user.email)
      .maybeSingle()
```

## lwrpc-admin/app/api/member-password-reset-check/route.js

Server route or shared helper: execution context must follow its caller (lib is not intrinsically server-only). 4 static expressions.

### R083 — line 88

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
      .from("members")
      .select("id, is_active_member")
      .eq("email", normalizedEmail)
      .order("created_at", { ascending: true })
```

### R084 — line 215

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
    .from("members")
    .select("id, is_active_member, created_at, user_roles(role)")
    .eq("email", userData.user.email)
    .order("created_at", { ascending: true })
```

### R085 — line 257

RPC: classify by its trusted caller; see function reuse matrix.

```js
supabase.rpc("consume_password_reset_rate_limit", {
    p_rate_limit_key: key,
    p_window_seconds: RESET_RATE_LIMIT_WINDOW_SECONDS,
    p_max_requests: maxRequests,
  })
```

### R086 — line 333

RPC: classify by its trusted caller; see function reuse matrix.

```js
adminSupabase.rpc("link_future_existing_member_identity", { p_user: userId }).abortSignal(AbortSignal.timeout(3000))
```

## lwrpc-admin/app/api/notification-template-history/route.js

Server route or shared helper: execution context must follow its caller (lib is not intrinsically server-only). 2 static expressions.

### R087 — line 60

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
    .from("members")
    .select("id, email, user_roles(role)")
    .eq("email", userData.user.email)
    .maybeSingle()
```

### R088 — line 94

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
auth.supabase
      .from("notification_template_history")
      .select("id, template_key, audience, subject, body, saved_by_member_id, saved_by_email, created_at, updated_at")
      .order("created_at", { ascending: false })
      .limit(100)
```

## lwrpc-admin/app/api/notification-templates/route.js

Server route or shared helper: execution context must follow its caller (lib is not intrinsically server-only). 2 static expressions.

### R089 — line 96

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
      .from("notification_templates")
      .select("id, template_key, subject, body, updated_at")
      .eq("template_key", templateKey)
      .maybeSingle()
```

### R090 — line 143

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
      .from("members")
      .select("id, email, user_roles(role)")
      .eq("email", userData.user.email)
      .maybeSingle()
```

## lwrpc-admin/app/api/notifications/route.js

Server route or shared helper: execution context must follow its caller (lib is not intrinsically server-only). 1 static expressions.

### R091 — line 59

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
    .from("members")
    .select("id, email, is_active_member, created_at, user_roles(role)")
    .eq("email", userData.user.email)
    .order("created_at", { ascending: true })
```

## lwrpc-admin/app/api/round-robin/action/route.js

Server route or shared helper: execution context must follow its caller (lib is not intrinsically server-only). 80 static expressions.

### R092 — line 316

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase.from("round_robin_groups").select("*")
```

### R093 — line 371

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
    .from("members")
    .select("id, email, is_active_member, created_at, user_roles(role)")
    .eq("email", userData.user.email)
    .order("created_at", { ascending: true })
```

### R094 — line 448

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
      .from("round_robin_players")
      .select("id, is_active")
      .eq("id", player.id)
      .eq("group_id", group.id)
      .maybeSingle()
```

### R095 — line 472

Mutation result: outside read parity; preserve normal write path, block View-As.

```js
supabase
      .from("round_robin_players")
      .update(payload)
      .eq("id", player.id)
      .eq("group_id", group.id)
      .select("*")
      .single()
```

### R096 — line 498

Mutation result: outside read parity; preserve normal write path, block View-As.

```js
supabase
    .from("round_robin_players")
    .insert(payload)
    .select("*")
    .single()
```

### R097 — line 520

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
      .from("round_robin_players")
      .select("display_name, phone, updated_at")
      .eq("group_id", group.id)
      .ilike("display_name", exactNamePattern)
```

### R098 — line 525

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
      .from("round_robin_session_players")
      .select("display_name, phone, updated_at, round_robin_sessions!inner(group_id)")
      .eq("round_robin_sessions.group_id", group.id)
      .ilike("display_name", exactNamePattern)
```

### R099 — line 640

Mutation result: outside read parity; preserve normal write path, block View-As.

```js
supabase
      .from("round_robin_player_groups")
      .update(payload)
      .eq("id", playerGroup.id)
      .eq("group_id", group.id)
      .select("*")
      .single()
```

### R100 — line 652

Mutation result: outside read parity; preserve normal write path, block View-As.

```js
supabase
    .from("round_robin_player_groups")
    .insert(payload)
    .select("*")
    .single()
```

### R101 — line 666

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
    .from("round_robin_player_groups")
    .select("id, name")
    .eq("id", cleanGroupId)
    .eq("group_id", group.id)
    .single()
```

### R102 — line 692

Mutation result: outside read parity; preserve normal write path, block View-As.

```js
supabase
    .from("round_robin_groups")
    .update({ settings, updated_at: new Date().toISOString() })
    .eq("id", group.id)
    .select("*")
    .single()
```

### R103 — line 708

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
    .from("round_robin_players")
    .select("id, display_name")
    .eq("id", cleanPlayerId)
    .eq("group_id", group.id)
    .single()
```

### R104 — line 717

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
    .from("round_robin_sessions")
    .select("id")
    .eq("group_id", group.id)
    .in("status", ["draft", "open", "playing", "cancelled"])
```

### R105 — line 748

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
      .from("round_robin_player_groups")
      .select("id")
      .eq("group_id", groupId)
      .in("id", cleanGroupIds)
```

### R106 — line 771

Mutation result: outside read parity; preserve normal write path, block View-As.

```js
supabase
    .from("round_robin_player_group_members")
    .insert(payload)
    .select("*")
```

### R107 — line 792

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
    .from("round_robin_courts")
    .select("id")
    .eq("group_id", group.id)
```

### R108 — line 821

Mutation result: outside read parity; preserve normal write path, block View-As.

```js
supabase.from("round_robin_courts").update(payload).eq("id", court.id).eq("group_id", group.id).select("*").single()
```

### R109 — line 822

Mutation result: outside read parity; preserve normal write path, block View-As.

```js
supabase.from("round_robin_courts").insert(payload).select("*").single()
```

### R110 — line 877

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
        .from("round_robin_matches")
        .select("id, team1_score, team2_score, status")
        .in("session_id", sessionIds)
```

### R111 — line 881

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
        .from("round_robin_player_session_results")
        .select("id, games, wins, losses, points_for, points_against")
        .in("session_id", sessionIds)
```

### R112 — line 1082

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
    .from("round_robin_players")
    .select("*")
    .eq("group_id", group.id)
    .in("id", selectedPlayerIds)
```

### R113 — line 1098

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
    .from("round_robin_courts")
    .select("*")
    .eq("group_id", group.id)
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true })
```

### R114 — line 1132

Mutation result: outside read parity; preserve normal write path, block View-As.

```js
supabase
    .from("round_robin_sessions")
    .insert(sessionPayload)
    .select("*")
    .single()
```

### R115 — line 1152

Mutation result: outside read parity; preserve normal write path, block View-As.

```js
supabase
    .from("round_robin_session_players")
    .insert(sessionPlayersPayload)
    .select("*")
```

### R116 — line 1174

Mutation result: outside read parity; preserve normal write path, block View-As.

```js
supabase
    .from("round_robin_matches")
    .insert(matchPayload)
    .select("*")
```

### R117 — line 1242

Mutation result: outside read parity; preserve normal write path, block View-As.

```js
supabase
    .from("round_robin_sessions")
    .insert(sessionPayload)
    .select("*")
    .single()
```

### R118 — line 1262

Mutation result: outside read parity; preserve normal write path, block View-As.

```js
supabase
    .from("round_robin_session_players")
    .insert(sessionPlayersPayload)
    .select("*")
```

### R119 — line 1340

Mutation result: outside read parity; preserve normal write path, block View-As.

```js
supabase
    .from("round_robin_sessions")
    .update(sessionPayload)
    .eq("id", existingSession.id)
    .eq("group_id", group.id)
    .select("*")
    .single()
```

### R120 — line 1367

Mutation result: outside read parity; preserve normal write path, block View-As.

```js
supabase
      .from("round_robin_session_players")
      .insert(sessionPlayersPayload)
      .select("*")
```

### R121 — line 1430

Mutation result: outside read parity; preserve normal write path, block View-As.

```js
supabase
    .from("round_robin_session_players")
    .update({ response_status: resolvedStatus, updated_at: new Date().toISOString() })
    .eq("session_id", session.id)
    .eq("player_id", playerId)
    .select("*")
    .single()
```

### R122 — line 1470

Mutation result: outside read parity; preserve normal write path, block View-As.

```js
supabase
      .from("round_robin_session_players")
      .update({
        display_name: player.display_name,
        email: player.email || null,
        phone: player.phone || null,
        source: "roster",
        response_status: "joined",
        updated_at: new Date().toISOString(),
      })
      .eq("id", existingPlayer.id)
      .select("*")
      .single()
```

### R123 — line 1492

Mutation result: outside read parity; preserve normal write path, block View-As.

```js
supabase
    .from("round_robin_session_players")
    .insert({
      session_id: session.id,
      player_id: player.id,
      display_name: player.display_name,
      dupr_id: normalizeDuprId(player.dupr_id) || null,
      email: player.email || null,
      phone: player.phone || null,
      source: "roster",
      response_status: "joined",
      sort_order: nextSortOrder,
    })
    .select("*")
    .single()
```

### R124 — line 1533

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
    .from("round_robin_players")
    .select("*")
    .eq("group_id", group.id)
    .order("display_name", { ascending: true })
```

### R125 — line 1553

Mutation result: outside read parity; preserve normal write path, block View-As.

```js
supabase
      .from("round_robin_players")
      .update({
        display_name: playerPayload.display_name,
        first_name: playerPayload.first_name,
        phone: playerPayload.phone,
        is_active: true,
        updated_at: playerPayload.updated_at,
      })
      .eq("id", existingPlayer.id)
      .eq("group_id", group.id)
      .select("*")
      .single()
```

### R126 — line 1569

Mutation result: outside read parity; preserve normal write path, block View-As.

```js
supabase
      .from("round_robin_players")
      .insert(playerPayload)
      .select("*")
      .single()
```

### R127 — line 1609

Mutation result: outside read parity; preserve normal write path, block View-As.

```js
supabase
      .from("round_robin_sessions")
      .delete()
      .eq("id", session.id)
      .eq("group_id", group.id)
      .select("id")
      .single()
```

### R128 — line 1621

Mutation result: outside read parity; preserve normal write path, block View-As.

```js
supabase
    .from("round_robin_sessions")
    .update({
      status: "cancelled",
      updated_at: new Date().toISOString(),
    })
    .eq("id", session.id)
    .eq("group_id", group.id)
    .select("*")
    .single()
```

### R129 — line 1639

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
      .from("round_robin_matches")
      .select("id, team1_score, team2_score, status")
      .eq("session_id", sessionId)
```

### R130 — line 1643

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
      .from("round_robin_player_session_results")
      .select("id, games, wins, losses, points_for, points_against")
      .eq("session_id", sessionId)
```

### R131 — line 1683

Mutation result: outside read parity; preserve normal write path, block View-As.

```js
supabase
    .from("round_robin_sessions")
    .update({ settings, updated_at: new Date().toISOString() })
    .eq("id", session.id)
    .eq("group_id", group.id)
    .select("*")
    .single()
```

### R132 — line 1697

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
    .from("round_robin_sessions")
    .select("id")
    .eq("group_id", group.id)
```

### R133 — line 1778

Mutation result: outside read parity; preserve normal write path, block View-As.

```js
supabase
    .from("round_robin_sessions")
    .update({
      status: "playing",
      court_count: courtCount,
      settings,
      started_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", session.id)
    .select("*")
    .single()
```

### R134 — line 1806

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
      .from("round_robin_courts")
      .select("*")
      .eq("group_id", group.id)
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true })
```

### R135 — line 1866

Mutation result: outside read parity; preserve normal write path, block View-As.

```js
supabase
    .from("round_robin_matches")
    .insert(matchPayload)
    .select("*")
```

### R136 — line 1872

Mutation result: outside read parity; preserve normal write path, block View-As.

```js
supabase
    .from("round_robin_sessions")
    .update({
      round_count: nextRound.roundNumber,
      court_count: nextRound.courtCount,
      updated_at: new Date().toISOString(),
    })
    .eq("id", session.id)
    .select("*")
    .single()
```

### R137 — line 1927

Mutation result: outside read parity; preserve normal write path, block View-As.

```js
supabase
    .from("round_robin_matches")
    .insert(matchPayload)
    .select("*")
```

### R138 — line 1942

Mutation result: outside read parity; preserve normal write path, block View-As.

```js
supabase
    .from("round_robin_sessions")
    .update({
      round_count: roundNumber,
      court_count: ladderCourts.length,
      settings,
      updated_at: new Date().toISOString(),
    })
    .eq("id", session.id)
    .select("*")
    .single()
```

### R139 — line 1972

Mutation result: outside read parity; preserve normal write path, block View-As.

```js
supabase
    .from("round_robin_matches")
    .update({
      team1_score: team1Score,
      team2_score: team2Score,
      status: team1Score === null || team2Score === null ? "scheduled" : "complete",
      updated_at: new Date().toISOString(),
    })
    .eq("id", matchId)
    .select("*")
    .single()
```

### R140 — line 2011

Mutation result: outside read parity; preserve normal write path, block View-As.

```js
supabase
    .from("round_robin_matches")
    .update(payload)
    .eq("id", matchId)
    .select("*")
    .single()
```

### R141 — line 2092

Mutation result: outside read parity; preserve normal write path, block View-As.

```js
supabase
    .from("round_robin_sessions")
    .update({ status: "done", summary_text: summaryText, updated_at: new Date().toISOString() })
    .eq("id", sessionId)
    .select("*")
    .single()
```

### R142 — line 2207

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
    .from("round_robin_players")
    .select("id, display_name, phone")
    .eq("group_id", groupId)
    .eq("id", cleanPlayerId)
    .eq("is_active", true)
    .single()
```

### R143 — line 2241

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
    .from("round_robin_sessions")
    .select("id, session_name, session_date, starts_at")
    .eq("group_id", group.id)
    .eq("session_date", nextDate)
    .eq("session_name", session.session_name || "Round Robin Match")
    .limit(10)
```

### R144 — line 2423

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
    .from("round_robin_player_groups")
    .select("id, name")
    .eq("id", playerGroupId)
    .eq("group_id", group.id)
    .eq("is_active", true)
    .single()
```

### R145 — line 2563

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
    .from("round_robin_player_session_results")
    .select("player_id, metadata")
    .eq("session_id", sessionId)
```

### R146 — line 2596

Mutation result: outside read parity; preserve normal write path, block View-As.

```js
supabase
    .from("round_robin_player_session_results")
    .insert(payload)
    .select("*")
    .order("rank", { ascending: true })
```

### R147 — line 2615

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
      .from("round_robin_matches")
      .select("*")
      .in("session_id", sessionIds)
      .order("round_number", { ascending: true })
      .order("court_number", { ascending: true })
```

### R148 — line 2621

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
      .from("round_robin_player_session_results")
      .select("*")
      .in("session_id", sessionIds)
```

### R149 — line 2696

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
    .from("round_robin_player_session_results")
    .select("*")
    .eq("session_id", sessionId)
    .order("rank", { ascending: true })
```

### R150 — line 2713

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
    .from("round_robin_session_players")
    .select("*")
    .eq("session_id", sessionId)
    .order("sort_order", { ascending: true })
    .order("display_name", { ascending: true })
```

### R151 — line 2729

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
    .from("round_robin_players")
    .select("id")
    .eq("group_id", groupId)
    .eq("is_active", true)
    .in("id", playerIds)
```

### R152 — line 2757

Mutation result: outside read parity; preserve normal write path, block View-As.

```js
supabase
    .from("round_robin_session_players")
    .update({ response_status: "joined", updated_at: new Date().toISOString() })
    .in("id", waitlistPlayers.map((player) => player.id))
    .select("*")
```

### R153 — line 2788

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
    .from("round_robin_players")
    .select("*")
    .eq("group_id", groupId)
    .eq("is_active", true)
    .order("display_name", { ascending: true })
```

### R154 — line 2799

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
    .from("round_robin_players")
    .select("*")
    .eq("id", playerId)
    .eq("group_id", groupId)
    .eq("is_active", true)
    .single()
```

### R155 — line 2811

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
    .from("round_robin_player_groups")
    .select("id")
    .eq("group_id", groupId)
    .eq("is_active", true)
    .in("id", invitedGroupIds)
```

### R156 — line 2822

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
    .from("round_robin_player_group_members")
    .select("player_id")
    .in("player_group_id", allowedGroupIds)
```

### R157 — line 2831

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
    .from("round_robin_players")
    .select("*")
    .eq("group_id", groupId)
    .eq("is_active", true)
    .in("id", playerIds)
    .order("display_name", { ascending: true })
```

### R158 — line 2848

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
    .from("round_robin_player_groups")
    .select("id, name")
    .eq("group_id", group.id)
    .in("id", invitedGroupIds)
    .order("name", { ascending: true })
```

### R159 — line 2868

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
    .from("round_robin_matches")
    .select("*")
    .eq("session_id", sessionId)
    .order("round_number", { ascending: true })
    .order("court_number", { ascending: true })
```

### R160 — line 2883

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
    .from("round_robin_sessions")
    .select("id, settings")
    .eq("group_id", group.id)
    .eq("mode", "ladder")
    .lt("session_date", session.session_date || new Date().toISOString().slice(0, 10))
    .limit(100)
```

### R161 — line 2898

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
    .from("round_robin_matches")
    .select("*")
    .in("session_id", sessionIds)
    .order("created_at", { ascending: true })
```

### R162 — line 2916

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
    .from("round_robin_sessions")
    .select("id, session_date, settings")
    .eq("group_id", group.id)
    .eq("mode", "ladder")
    .lt("session_date", session.session_date || new Date().toISOString().slice(0, 10))
    .order("session_date", { ascending: true })
```

### R163 — line 2931

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
      .from("round_robin_matches")
      .select("*")
      .in("session_id", sessionIds)
      .order("round_number", { ascending: true })
      .order("court_number", { ascending: true })
```

### R164 — line 2937

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
      .from("round_robin_player_session_results")
      .select("*")
      .in("session_id", sessionIds)
```

### R165 — line 3054

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
    .from("round_robin_matches")
    .select("session_id")
    .eq("id", matchId)
    .single()
```

### R166 — line 3064

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
    .from("round_robin_sessions")
    .select("id, host_player_id, cohost_player_id, status")
    .eq("id", sessionId)
    .eq("group_id", groupId)
    .maybeSingle()
```

### R167 — line 3092

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
    .from("round_robin_players")
    .select("id, display_name, first_name, phone, is_active")
    .eq("group_id", groupId)
    .eq("is_active", true)
    .order("display_name", { ascending: true })
```

### R168 — line 3115

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
    .from("round_robin_sessions")
    .select("*")
    .eq("id", sessionId)
    .eq("group_id", groupId)
    .single()
```

### R169 — line 3126

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
    .from("round_robin_matches")
    .select("*")
    .eq("id", matchId)
    .single()
```

### R170 — line 3353

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
    .from("round_robin_sessions")
    .select("id, session_date, settings")
    .eq("group_id", group.id)
    .eq("mode", "ladder")
    .order("session_date", { ascending: false })
    .limit(100)
```

### R171 — line 3370

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
    .from("round_robin_sessions")
    .select("id, session_date, status, settings")
    .eq("group_id", group.id)
    .eq("mode", "ladder")
    .limit(200)
```

## lwrpc-admin/app/api/round-robin/admin/route.js

Server route or shared helper: execution context must follow its caller (lib is not intrinsically server-only). 17 static expressions.

### R172 — line 88

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
      .from("round_robin_sessions")
      .select("*")
      .eq("group_id", group.id)
      .order("session_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(100)
```

### R173 — line 98

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
        .from("round_robin_players")
        .select("*")
        .eq("group_id", group.id)
        .order("display_name", { ascending: true })
```

### R174 — line 103

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
        .from("round_robin_player_groups")
        .select("*")
        .eq("group_id", group.id)
        .order("name", { ascending: true })
```

### R175 — line 108

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
        .from("round_robin_courts")
        .select("*")
        .eq("group_id", group.id)
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true })
```

### R176 — line 115

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
        .from("round_robin_activity_log")
        .select("*")
        .eq("group_id", group.id)
        .order("created_at", { ascending: false })
        .limit(100)
```

### R177 — line 129

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
        .from("round_robin_player_group_members")
        .select("id, player_group_id, player_id")
        .in("player_group_id", playerGroupIds)
```

### R178 — line 139

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
        .from("round_robin_session_players")
        .select("*")
        .in("session_id", sessionIds)
        .order("sort_order", { ascending: true })
        .order("display_name", { ascending: true })
```

### R179 — line 149

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
        .from("round_robin_player_session_results")
        .select("*")
        .in("session_id", sessionIds)
```

### R180 — line 157

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
        .from("round_robin_matches")
        .select("*")
        .in("session_id", sessionIds)
        .order("round_number", { ascending: true })
        .order("court_number", { ascending: true })
```

### R181 — line 224

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
    .from("members")
    .select("id, email, is_active_member, created_at, user_roles(role)")
    .eq("email", userData.user.email)
    .order("created_at", { ascending: true })
```

### R182 — line 245

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase.from("round_robin_groups").select("*")
```

### R183 — line 257

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
      .from("members")
      .select("id, full_name, first_name, last_name, email, phone, dupr_id, is_active_member")
      .or("is_active_member.eq.true,is_active_member.is.null")
      .order("first_name", { ascending: true })
      .order("last_name", { ascending: true })
      .range(from, from + pageSize - 1)
```

### R184 — line 276

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
      .from("round_robin_session_players")
      .select("*")
      .eq("session_id", sessionId)
      .order("sort_order", { ascending: true })
      .order("display_name", { ascending: true })
```

### R185 — line 282

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
      .from("round_robin_matches")
      .select("*")
      .eq("session_id", sessionId)
      .order("round_number", { ascending: true })
      .order("court_number", { ascending: true })
```

### R186 — line 288

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
      .from("round_robin_player_session_results")
      .select("*")
      .eq("session_id", sessionId)
      .order("rank", { ascending: true })
```

### R187 — line 366

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
    .from("round_robin_sessions")
    .select("id, host_player_id, cohost_player_id, status")
    .eq("group_id", group.id)
    .or(`host_player_id.eq.${hostPlayer.id},cohost_player_id.eq.${hostPlayer.id}`)
    .neq("status", "cancelled")
```

### R188 — line 397

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
    .from("round_robin_players")
    .select("id, display_name, first_name, phone, is_active")
    .eq("group_id", groupId)
    .eq("is_active", true)
    .order("display_name", { ascending: true })
```

## lwrpc-admin/app/api/round-robin/player/route.js

Server route or shared helper: execution context must follow its caller (lib is not intrinsically server-only). 32 static expressions.

### R189 — line 101

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
    .from("round_robin_groups")
    .select("id, name, slug, public_status, mode, schedule_day, schedule_time, timezone, settings")
    .neq("public_status", "archived")
```

### R190 — line 126

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
    .from("round_robin_players")
    .select("id, display_name, first_name, phone, is_active")
    .eq("group_id", groupId)
    .eq("is_active", true)
    .order("display_name", { ascending: true })
```

### R191 — line 156

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
    .from("round_robin_players")
    .select("id, display_name, first_name, phone, is_active")
    .eq("group_id", groupId)
    .eq("id", cleanPlayerId)
    .eq("is_active", true)
    .maybeSingle()
```

### R192 — line 174

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
    .from("round_robin_session_players")
    .select("id, session_id, response_status, updated_at")
    .eq("player_id", player.id)
```

### R193 — line 186

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
      .from("round_robin_sessions")
      .select(sessionFields)
      .eq("group_id", group.id)
      .gte("session_date", today)
      .in("status", ["draft", "open", "playing"])
      .order("session_date", { ascending: true })
      .order("starts_at", { ascending: true })
```

### R194 — line 194

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
      .from("round_robin_sessions")
      .select(sessionFields)
      .eq("group_id", group.id)
      .eq("status", "playing")
      .order("session_date", { ascending: true })
      .order("starts_at", { ascending: true })
```

### R195 — line 215

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
    .from("round_robin_session_players")
    .select("id, session_id, player_id, display_name, email, phone, response_status, sort_order")
    .in("session_id", sessions.map((session) => session.id))
```

### R196 — line 266

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
    .from("round_robin_session_players")
    .select("session_id, response_status, updated_at")
    .eq("player_id", player.id)
```

### R197 — line 280

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
        .from("round_robin_sessions")
        .select(sessionFields)
        .eq("group_id", group.id)
        .in("id", playerSessionIds)
```

### R198 — line 286

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
      .from("round_robin_sessions")
      .select(sessionFields)
      .eq("group_id", group.id)
      .or(`host_player_id.eq.${player.id},cohost_player_id.eq.${player.id}`)
```

### R199 — line 312

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
      .from("round_robin_player_session_results")
      .select("*")
      .in("session_id", historySessionIds)
      .order("rank", { ascending: true })
```

### R200 — line 317

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
      .from("round_robin_matches")
      .select("*")
      .in("session_id", historySessionIds)
      .order("round_number", { ascending: true })
      .order("court_number", { ascending: true })
```

### R201 — line 384

Mutation result: outside read parity; preserve normal write path, block View-As.

```js
supabase
    .from("round_robin_session_players")
    .update({ response_status: resolvedStatus, updated_at: new Date().toISOString() })
    .eq("session_id", session.id)
    .eq("player_id", player.id)
    .select("*")
    .single()
```

### R202 — line 401

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
    .from("round_robin_sessions")
    .select("*")
    .eq("id", sessionId)
    .eq("group_id", groupId)
    .single()
```

### R203 — line 412

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
    .from("round_robin_session_players")
    .select("*")
    .eq("session_id", sessionId)
    .order("sort_order", { ascending: true })
    .order("display_name", { ascending: true })
```

### R204 — line 428

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
    .from("round_robin_players")
    .select("id")
    .eq("group_id", groupId)
    .eq("is_active", true)
    .in("id", playerIds)
```

### R205 — line 455

Mutation result: outside read parity; preserve normal write path, block View-As.

```js
supabase
    .from("round_robin_session_players")
    .update({ response_status: "joined", updated_at: new Date().toISOString() })
    .in("id", waitlistPlayers.map((player) => player.id))
    .select("*")
```

### R206 — line 499

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
    .from("round_robin_players")
    .select("id, display_name, phone")
    .eq("group_id", group.id)
    .eq("is_active", true)
    .in("id", hostIds)
```

### R207 — line 554

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
    .from("round_robin_player_group_members")
    .select("player_group_id, player_id")
    .eq("player_id", player.id)
    .in("player_group_id", ladderGroupIds)
```

### R208 — line 565

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
    .from("round_robin_sessions")
    .select("id, session_name, session_date, starts_at, status, settings")
    .eq("group_id", group.id)
    .eq("mode", "ladder")
    .order("session_date", { ascending: true })
    .order("starts_at", { ascending: true })
```

### R209 — line 579

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
      .from("round_robin_player_session_results")
      .select("*")
      .in("session_id", completedSessionIds)
```

### R210 — line 586

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
      .from("round_robin_matches")
      .select("*")
      .in("session_id", completedSessionIds)
```

### R211 — line 593

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
    .from("round_robin_player_group_members")
    .select("player_group_id, player_id")
    .in("player_group_id", ladderGroupIds)
```

### R212 — line 601

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
      .from("round_robin_players")
      .select("id, display_name, is_active")
      .eq("group_id", group.id)
      .in("id", rosterIds)
```

### R213 — line 677

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
    .from("round_robin_sessions")
    .select("id, session_date, status, settings")
    .eq("group_id", group.id)
    .eq("mode", "ladder")
    .eq("status", "done")
    .order("session_date", { ascending: true })
```

### R214 — line 690

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
        .from("round_robin_player_session_results")
        .select("*")
        .in("session_id", completedSessionIds)
```

### R215 — line 695

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
      .from("round_robin_player_group_members")
      .select("player_group_id, player_id")
      .in("player_group_id", ladderGroupIds)
```

### R216 — line 703

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
      .from("round_robin_matches")
      .select("*")
      .in("session_id", completedSessionIds)
```

### R217 — line 712

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
      .from("round_robin_players")
      .select("id, display_name, is_active")
      .eq("group_id", group.id)
      .in("id", rosterIds)
```

### R218 — line 823

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
      .from("round_robin_players")
      .select("id, display_name, first_name, phone, email, is_active")
      .eq("group_id", group.id)
      .eq("is_active", true)
      .order("display_name", { ascending: true })
```

### R219 — line 829

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
      .from("round_robin_player_groups")
      .select("id, name, description, is_active")
      .eq("group_id", group.id)
      .eq("is_active", true)
      .order("name", { ascending: true })
```

### R220 — line 841

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
      .from("round_robin_player_group_members")
      .select("id, player_group_id, player_id")
      .in("player_group_id", groupIds)
```

## lwrpc-admin/app/api/score-notification/route.js

Server route or shared helper: execution context must follow its caller (lib is not intrinsically server-only). 1 static expressions.

### R221 — line 62

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
    .from("members")
    .select("id, email, is_active_member, created_at, user_roles(role)")
    .eq("email", userData.user.email)
    .order("created_at", { ascending: true })
```

## lwrpc-admin/app/api/season-reset/route.js

Server route or shared helper: execution context must follow its caller (lib is not intrinsically server-only). 1 static expressions.

### R222 — line 36

RPC: classify by its trusted caller; see function reuse matrix.

```js
authorization.supabase.rpc(
      "admin_reset_season",
      { p_season_id: body.seasonId }
    )
```

## lwrpc-admin/app/api/season-rollover/route.js

Server route or shared helper: execution context must follow its caller (lib is not intrinsically server-only). 6 static expressions.

### R223 — line 19

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase.from(table).select("*").in(column, values)
```

### R224 — line 25

Mutation result: outside read parity; preserve normal write path, block View-As.

```js
supabase
    .from(table)
    .insert(copyRow(row, overrides))
    .select("id")
    .single()
```

### R225 — line 51

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
      .from("seasons")
      .select("id")
      .eq("id", sourceSeasonId)
      .maybeSingle()
```

### R226 — line 59

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
      .from("seasons")
      .select("id")
      .eq("name", name)
      .maybeSingle()
```

### R227 — line 67

Mutation result: outside read parity; preserve normal write path, block View-As.

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

### R228 — line 81

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
      .from("leagues")
      .select("*")
      .eq("season_id", sourceSeasonId)
      .order("name")
```

## lwrpc-admin/app/api/system-settings/route.js

Server route or shared helper: execution context must follow its caller (lib is not intrinsically server-only). 2 static expressions.

### R229 — line 60

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
    .from("members")
    .select("id, email, user_roles(role)")
    .eq("email", userData.user.email)
    .maybeSingle()
```

### R230 — line 82

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
      .from("system_settings")
      .select("setting_key, setting_value")
```

## lwrpc-admin/app/api/teams/delete/route.js

Server route or shared helper: execution context must follow its caller (lib is not intrinsically server-only). 1 static expressions.

### R231 — line 30

Mutation result: outside read parity; preserve normal write path, block View-As.

```js
authorization.supabase
      .from("teams")
      .delete()
      .eq("id", teamId)
      .select("id")
      .maybeSingle()
```

## lwrpc-admin/app/api/tournaments/action/route.js

Server route or shared helper: execution context must follow its caller (lib is not intrinsically server-only). 46 static expressions.

### R232 — line 193

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase.from("tournaments").select("*")
```

### R233 — line 578

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
    .from("tournament_teams")
    .select(`
      id,
      name,
      player_1_name,
      player_2_name,
      division:tournament_divisions(name)
    `)
    .eq("id", teamId)
    .eq("tournament_id", tournament.id)
    .single()
```

### R234 — line 623

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
    .from("tournament_teams")
    .select(`
      id,
      name,
      player_1_name,
      player_2_name,
      division:tournament_divisions(name)
    `)
    .eq("id", teamId)
    .eq("tournament_id", tournament.id)
    .single()
```

### R235 — line 637

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
    .from("tournament_team_contacts")
    .select("id, member_id, display_name, phone")
    .eq("tournament_team_id", teamId)
    .eq("player_slot", slot)
    .maybeSingle()
```

### R236 — line 702

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
      .from("divisions")
      .select("id, name, sort_order, is_active")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true })
```

### R237 — line 707

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
      .from("tournament_divisions")
      .select("id, name")
      .eq("tournament_id", tournament.id)
```

### R238 — line 743

Mutation result: outside read parity; preserve normal write path, block View-As.

```js
supabase
    .from("tournament_divisions")
    .update({
      is_active: Boolean(isActive),
      updated_at: now,
    })
    .eq("id", divisionId)
    .eq("tournament_id", tournament.id)
    .select("name, is_active")
    .single()
```

### R239 — line 762

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
    .from("tournament_teams")
    .select("id", { count: "exact", head: true })
    .eq("tournament_id", tournament.id)
    .eq("division_id", divisionId)
```

### R240 — line 775

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
    .from("tournament_divisions")
    .select("name")
    .eq("id", divisionId)
    .eq("tournament_id", tournament.id)
    .single()
```

### R241 — line 853

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
    .from("tournament_teams")
    .select("*")
    .eq("id", teamId)
    .eq("tournament_id", tournament.id)
    .single()
```

### R242 — line 886

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
      .from("tournament_divisions")
      .select("id, name, is_active")
      .eq("id", divisionId)
      .eq("tournament_id", tournament.id)
      .single()
```

### R243 — line 902

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
      .from("tournament_teams")
      .select("id, name")
      .eq("tournament_id", tournament.id)
      .eq(isElimination ? "division_id" : "line_number", isElimination ? payload.division_id : payload.line_number)
```

### R244 — line 976

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

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

### R245 — line 991

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
    .from("tournament_divisions")
    .select("id, name, is_active")
    .eq("tournament_id", tournament.id)
```

### R246 — line 1020

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
    .from("tournament_teams")
    .select("id, name")
    .eq("tournament_id", tournament.id)
    .eq("line_number", lineNumber)
```

### R247 — line 1039

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
    .from("tournament_teams")
    .select("id, name")
    .eq("tournament_id", tournament.id)
```

### R248 — line 1047

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
      .from("tournament_team_contacts")
      .select("member_id, display_name, tournament_team_id")
      .in("tournament_team_id", tournamentTeamIds)
      .in("member_id", [player1MemberId, player2MemberId])
```

### R249 — line 1062

Mutation result: outside read parity; preserve normal write path, block View-As.

```js
supabase
    .from("tournament_teams")
    .insert({
      tournament_id: tournament.id,
      division_id: division.id,
      name,
      line_number: lineNumber,
      seed: String(regularSeasonStanding),
      player_1_name: String(body.player1Name || "").trim() || null,
      player_2_name: String(body.player2Name || "").trim() || null,
      player_1_checked_in: false,
      player_2_checked_in: false,
      checked_in: false,
      created_at: now,
      updated_at: now,
    })
    .select("*")
    .single()
```

### R250 — line 1112

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
    .from("tournament_divisions")
    .select("id, name, is_active")
    .eq("id", divisionId)
    .eq("tournament_id", tournament.id)
    .single()
```

### R251 — line 1123

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
    .from("tournament_teams")
    .select("id, name, division_id")
    .eq("tournament_id", tournament.id)
```

### R252 — line 1141

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
      .from("tournament_team_contacts")
      .select("member_id, display_name, tournament_team_id")
      .in("tournament_team_id", tournamentTeamIds)
      .in("member_id", [player1MemberId, player2MemberId])
```

### R253 — line 1156

Mutation result: outside read parity; preserve normal write path, block View-As.

```js
supabase
    .from("tournament_teams")
    .insert({
      tournament_id: tournament.id,
      division_id: division.id,
      name,
      line_number: 1,
      seed: String(standing),
      player_1_name: player1Name || null,
      player_2_name: player2Name || null,
      player_1_checked_in: false,
      player_2_checked_in: false,
      checked_in: false,
      created_at: now,
      updated_at: now,
    })
    .select("*")
    .single()
```

### R254 — line 1195

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
    .from("tournament_divisions")
    .select("id, name")
    .eq("id", divisionId)
    .eq("tournament_id", tournament.id)
    .single()
```

### R255 — line 1203

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
    .from("divisions")
    .select("name, team_dupr_max")
```

### R256 — line 1226

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
    .from("members")
    .select("id, full_name, first_name, last_name, email, phone")
    .eq("id", memberId)
    .single()
```

### R257 — line 1266

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
      .from("members")
      .select("id, full_name, first_name, last_name, email, phone")
      .eq("id", memberId)
      .maybeSingle()
```

### R258 — line 1281

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

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

### R259 — line 1313

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

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

### R260 — line 1340

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
    .from("tournament_teams")
    .select("id, name")
    .eq("id", teamId)
    .eq("tournament_id", tournament.id)
    .single()
```

### R261 — line 1405

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
    .from("tournament_courts")
    .select("id, name")
    .eq("tournament_id", tournament.id)
```

### R262 — line 1456

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
    .from("tournament_teams")
    .select("id")
    .eq("tournament_id", tournament.id)
```

### R263 — line 1534

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq("tournament_id", tournamentId)
```

### R264 — line 1544

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
    .from("tournament_team_contacts")
    .select("id", { count: "exact", head: true })
    .in("tournament_team_id", teamIds)
```

### R265 — line 1592

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
      .from("tournament_divisions")
      .select("*")
      .eq("tournament_id", tournament.id)
      .eq("is_active", true)
```

### R266 — line 1597

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
      .from("tournament_teams")
      .select("*")
      .eq("tournament_id", tournament.id)
      .order("name", { ascending: true })
```

### R267 — line 1676

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
      .from("tournament_divisions")
      .select("*")
      .eq("tournament_id", tournament.id)
      .eq("is_active", true)
```

### R268 — line 1681

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
      .from("tournament_teams")
      .select("*")
      .eq("tournament_id", tournament.id)
      .order("name", { ascending: true })
```

### R269 — line 1737

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
      .from("tournament_divisions")
      .select("*")
      .eq("tournament_id", tournament.id)
      .eq("is_active", true)
```

### R270 — line 1742

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
      .from("tournament_teams")
      .select("*")
      .eq("tournament_id", tournament.id)
      .order("name", { ascending: true })
```

### R271 — line 1747

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
      .from("tournament_matches")
      .select(`
        *,
        home_team:tournament_teams!tournament_matches_home_team_id_fkey(id, name, seed),
        away_team:tournament_teams!tournament_matches_away_team_id_fkey(id, name, seed),
        winner_team:tournament_teams!tournament_matches_winner_team_id_fkey(id, name)
      `)
      .eq("tournament_id", tournament.id)
      .order("created_order", { ascending: true })
```

### R272 — line 2143

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
    .from("tournament_matches")
    .select("*")
    .eq("tournament_id", tournament.id)
    .eq("division_id", match.division_id)
    .order("created_order", { ascending: true })
```

### R273 — line 2318

Mutation result: outside read parity; preserve normal write path, block View-As.

```js
supabase
      .from("tournament_matches")
      .insert(bracketRow({
        tournamentId: tournament.id,
        divisionId: firstFinal.division_id,
        legacyId: bracketLegacyId(meta?.format === "double_elimination" ? "DE" : "SE", firstFinal.division_id, "F", 2, 1),
        lineNumber: firstFinal.line_number || 1,
        order: createdOrder,
        now,
      }))
      .select("*")
      .single()
```

### R274 — line 2434

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
      .from("tournament_courts")
      .select("*")
      .eq("tournament_id", tournamentId)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true })
```

### R275 — line 2440

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
      .from("tournament_matches")
      .select(`
        *,
        division:tournament_divisions(id, name),
        home_team:tournament_teams!tournament_matches_home_team_id_fkey(id, name, player_1_name, player_2_name, seed),
        away_team:tournament_teams!tournament_matches_away_team_id_fkey(id, name, player_1_name, player_2_name, seed),
        court:tournament_courts!tournament_matches_court_id_fkey(id, name),
        winner_team:tournament_teams!tournament_matches_winner_team_id_fkey(id, name)
      `)
      .eq("tournament_id", tournamentId)
      .order("created_order", { ascending: true })
```

### R276 — line 2452

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
      .from("tournament_teams")
      .select("id, division_id")
      .eq("tournament_id", tournamentId)
```

### R277 — line 2464

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
      .from("tournament_team_contacts")
      .select("*")
      .in("tournament_team_id", teamIds)
```

## lwrpc-admin/app/api/tournaments/admin/route.js

Server route or shared helper: execution context must follow its caller (lib is not intrinsically server-only). 13 static expressions.

### R278 — line 63

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
        .from("tournament_team_contacts")
        .select("*")
        .in("tournament_team_id", teamIds)
```

### R279 — line 70

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
        .from("tournament_divisions")
        .select("*")
        .eq("tournament_id", tournament.id)
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true })
```

### R280 — line 76

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
        .from("divisions")
        .select("id, name, sort_order, is_active, team_dupr_max, rating_type")
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true })
```

### R281 — line 81

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
        .from("tournament_teams")
        .select("*")
        .eq("tournament_id", tournament.id)
        .order("name", { ascending: true })
```

### R282 — line 87

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
        .from("tournament_courts")
        .select("*")
        .eq("tournament_id", tournament.id)
        .order("sort_order", { ascending: true })
```

### R283 — line 92

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
        .from("tournament_matches")
        .select(`
          *,
          division:tournament_divisions(id, name),
          home_team:tournament_teams!tournament_matches_home_team_id_fkey(id, name, player_1_name, player_2_name),
          away_team:tournament_teams!tournament_matches_away_team_id_fkey(id, name, player_1_name, player_2_name),
          court:tournament_courts!tournament_matches_court_id_fkey(id, name),
          winner_team:tournament_teams!tournament_matches_winner_team_id_fkey(id, name)
        `)
        .eq("tournament_id", tournament.id)
        .order("created_order", { ascending: true })
```

### R284 — line 104

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
        .from("tournament_activity_log")
        .select("*")
        .eq("tournament_id", tournament.id)
        .order("created_at", { ascending: false })
        .limit(100)
```

### R285 — line 110

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
        .from("tournament_activity_log")
        .select("*")
        .eq("tournament_id", tournament.id)
        .eq("log_type", "phone_change")
        .order("created_at", { ascending: false })
```

### R286 — line 116

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

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

### R287 — line 143

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

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

### R288 — line 168

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
        .from("member_season_ratings")
        .select("member_id, season_id, season_dupr_rating, season_primetime_rating")
        .in("member_id", sourceMemberIds)
```

### R289 — line 200

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase.from("tournaments").select("*")
```

### R290 — line 208

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
    .from("tournament_teams")
    .select("id")
    .eq("tournament_id", tournamentId)
```

## lwrpc-admin/app/api/tournaments/sms/route.js

Server route or shared helper: execution context must follow its caller (lib is not intrinsically server-only). 1 static expressions.

### R291 — line 99

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase.from("tournaments").select("id, admin_code")
```

## lwrpc-admin/app/api/user-last-logins/route.js

Server route or shared helper: execution context must follow its caller (lib is not intrinsically server-only). 1 static expressions.

### R292 — line 70

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
      .from("members")
      .select("id, user_roles(role)")
      .eq("email", userData.user.email)
      .maybeSingle()
```

## lwrpc-admin/app/api/view-as/start/route.js

Server route or shared helper: execution context must follow its caller (lib is not intrinsically server-only). 1 static expressions.

### R293 — line 9

RPC: classify by its trusted caller; see function reuse matrix.

```js
createAdminSupabase().rpc('lms_view_as',{p_op:target?'preflight':'can_start',p_input:{actor:principal.user.id,...(target?{target}:{})}})
```

## lwrpc-admin/app/captain-dashboard/page.js

Browser page/component, except route wrappers. 26 static expressions.

### R294 — line 113

C for protected relational page data; B for composition/formatting.

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

### R295 — line 190

C for protected relational page data; B for composition/formatting.

```js
supabase
      .from("match_lineups")
      .select("match_id, team_id, line_number, player_1_member_id, player_2_member_id")
      .in("match_id", matchIds)
```

### R296 — line 240

C for protected relational page data; B for composition/formatting.

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

### R297 — line 269

C for protected relational page data; B for composition/formatting.

```js
supabase
      .from("locations")
      .select("id")
      .or(`club_pro_member_id.eq.${memberData.id},club_pro_2_member_id.eq.${memberData.id}`)
```

### R298 — line 292

C for protected relational page data; B for composition/formatting.

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

### R299 — line 412

C for protected relational page data; B for composition/formatting.

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

### R300 — line 614

C for protected relational page data; B for composition/formatting.

```js
supabase
        .from("members")
        .select("id, first_name, last_name, email")
        .in("id", scoreMemberIds)
```

### R301 — line 632

C for protected relational page data; B for composition/formatting.

```js
supabase
      .from("matches")
      .select("id, division_id, week_number, scheduled_date")
      .in("division_id", divisionIds.length > 0 ? divisionIds : ["00000000-0000-0000-0000-000000000000"])
      .eq("is_published", true)
```

### R302 — line 655

C for protected relational page data; B for composition/formatting.

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

### R303 — line 669

C for protected relational page data; B for composition/formatting.

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

### R304 — line 719

C for protected relational page data; B for composition/formatting.

```js
supabase
        .from("member_season_ratings")
        .select("member_id, season_id, season_dupr_rating, season_primetime_rating")
        .in("season_id", seasonIds)
        .in("member_id", ratingMemberIds)
```

### R305 — line 779

C for protected relational page data; B for composition/formatting.

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

### R306 — line 1617

Mutation result: outside read parity; preserve normal write path, block View-As.

```js
supabase
      .from("matches")
      .update(payload)
      .eq("id", flexScheduleMatch.id)
      .select("id, scheduled_date, scheduled_time")
      .maybeSingle()
```

### R307 — line 1789

C for protected relational page data; B for composition/formatting.

```js
supabase
          .from("team_members")
          .select("*, members(id, first_name, last_name, email, phone, notification_preference, self_rating, dupr_id)")
          .eq("team_id", team.id)
          .order("members(last_name)", { ascending: true })
```

### R308 — line 1794

C for protected relational page data; B for composition/formatting.

```js
supabase
          .from("match_lineups")
          .select("*")
          .eq("match_id", match.id)
          .eq("team_id", team.id)
          .order("line_number", { ascending: true })
```

### R309 — line 1816

C for protected relational page data; B for composition/formatting.

```js
supabase
        .from("member_season_ratings")
        .select("*")
        .eq("season_id", seasonId)
```

### R310 — line 1856

C for protected relational page data; B for composition/formatting.

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

### R311 — line 1871

C for protected relational page data; B for composition/formatting.

```js
supabase
          .from("score_sheet_templates")
          .select("id, name, sheet_title, template_html, rules_text, is_active, is_default")
          .eq("is_default", true)
          .eq("is_active", true)
          .limit(1)
```

### R312 — line 2143

C for protected relational page data; B for composition/formatting.

```js
supabase
        .from("member_season_ratings")
        .select("*")
        .eq("season_id", seasonId)
```

### R313 — line 2235

C for protected relational page data; B for composition/formatting.

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

### R314 — line 2451

C for protected relational page data; B for composition/formatting.

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

### R315 — line 2526

C for protected relational page data; B for composition/formatting.

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

### R316 — line 2539

C for protected relational page data; B for composition/formatting.

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

### R317 — line 2614

C for protected relational page data; B for composition/formatting.

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

### R318 — line 2629

C for protected relational page data; B for composition/formatting.

```js
supabase
          .from("team_standings")
          .select("team_id, rank, standings_points, match_wins, match_losses")
          .eq("division_id", team.division_id)
```

### R319 — line 2634

C for protected relational page data; B for composition/formatting.

```js
supabase
              .from("member_season_ratings")
              .select("member_id, season_dupr_rating, season_primetime_rating")
              .eq("season_id", seasonId)
```

## lwrpc-admin/app/components/AskLwrAssistant.js

Browser page/component, except route wrappers. 1 static expressions.

### R320 — line 231

C for protected relational page data; B for composition/formatting.

```js
supabase.from("team_members").select("teams(id, name, divisions(leagues(id, name, league_document_bucket, code_of_conduct_pdf_path, captains_guide_pdf_path, league_rules_pdf_path, score_sheet_pdf_path, league_waiver_pdf_path)))").eq("member_id", user.memberId)
```

## lwrpc-admin/app/divisions/page.js

Browser page/component, except route wrappers. 8 static expressions.

### R321 — line 119

C for protected relational page data; B for composition/formatting.

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

### R322 — line 137

C for protected relational page data; B for composition/formatting.

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

### R323 — line 158

C for protected relational page data; B for composition/formatting.

```js
supabase
      .from("score_sheet_templates")
      .select("id, name, is_active, is_default")
      .order("is_default", { ascending: false })
      .order("name", { ascending: true })
```

### R324 — line 169

C for protected relational page data; B for composition/formatting.

```js
supabase
      .from("division_lines")
      .select("division_id, line_number")
```

### R325 — line 390

Mutation result: outside read parity; preserve normal write path, block View-As.

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

### R326 — line 413

C for protected relational page data; B for composition/formatting.

```js
supabase
      .from("division_lines")
      .select("*")
      .in("division_id", sourceDivisionIds)
      .order("sort_order", { ascending: true })
      .order("line_number", { ascending: true })
```

### R327 — line 472

Mutation result: outside read parity; preserve normal write path, block View-As.

```js
supabase
      .from("divisions")
      .insert(divisionPayload)
      .select("id")
      .single()
```

### R328 — line 484

C for protected relational page data; B for composition/formatting.

```js
supabase
      .from("division_lines")
      .select("*")
      .eq("division_id", copyDivision.id)
      .order("sort_order", { ascending: true })
      .order("line_number", { ascending: true })
```

## lwrpc-admin/app/divisions/[id]/page.js

Browser page/component, except route wrappers. 9 static expressions.

### R329 — line 120

C for protected relational page data; B for composition/formatting.

```js
supabase
      .from("divisions")
      .select("id, name, default_lines_config, updated_at")
      .neq("id", id)
      .order("updated_at", { ascending: false })
      .limit(50)
```

### R330 — line 297

Mutation result: outside read parity; preserve normal write path, block View-As.

```js
supabase
        .from("divisions")
        .update(payload)
        .eq("id", id)
        .select("*")
        .single()
```

### R331 — line 323

Mutation result: outside read parity; preserve normal write path, block View-As.

```js
supabase
      .from("divisions")
      .update(payload)
      .eq("id", id)
      .select("*")
      .single()
```

### R332 — line 356

C for protected relational page data; B for composition/formatting.

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

### R333 — line 375

C for protected relational page data; B for composition/formatting.

```js
supabase
      .from("division_lines")
      .select("*")
      .eq("division_id", id)
      .order("sort_order", { ascending: true })
      .order("line_number", { ascending: true })
```

### R334 — line 439

Mutation result: outside read parity; preserve normal write path, block View-As.

```js
supabase
        .from("division_lines")
        .update(payload)
        .eq("id", editingId)
        .select("*")
        .maybeSingle()
```

### R335 — line 453

Mutation result: outside read parity; preserve normal write path, block View-As.

```js
supabase
        .from("division_lines")
        .insert(payload)
        .select("*")
        .maybeSingle()
```

### R336 — line 616

C for protected relational page data; B for composition/formatting.

```js
supabase
        .from("match_lines")
        .select("id")
        .in("division_line_id", existingLineIds)
        .limit(1)
```

### R337 — line 645

Mutation result: outside read parity; preserve normal write path, block View-As.

```js
supabase
      .from("division_lines")
      .insert(rows)
      .select("*")
```

## lwrpc-admin/app/leagues/page.js

Browser page/component, except route wrappers. 2 static expressions.

### R338 — line 58

C for protected relational page data; B for composition/formatting.

```js
supabase
        .from("seasons")
        .select("*")
        .order("name", { ascending: true })
```

### R339 — line 62

C for protected relational page data; B for composition/formatting.

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

## lwrpc-admin/app/lib/accountIdentity.js

Server route or shared helper: execution context must follow its caller (lib is not intrinsically server-only). 1 static expressions.

### R340 — line 12

RPC: classify by its trusted caller; see function reuse matrix.

```js
createDatabase().rpc('link_future_existing_member_identity', {
      p_user: principal.user.id,
    }).abortSignal(AbortSignal.timeout(3000))
```

## lwrpc-admin/app/lib/aiAnswerGeneration.js

Server route or shared helper: execution context must follow its caller (lib is not intrinsically server-only). 4 static expressions.

### R341 — line 403

RPC: classify by its trusted caller; see function reuse matrix.

```js
supabase.rpc('ai_approved_authority_manifest')
```

### R342 — line 406

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase.from('ai_approved_answer_revisions').select('id,answer_id,status,activated_at,title,content_hash,league_scope,temporal_scope,season_id,effective_on,expires_on,authority_manifest_hash').eq('id',item.approvedRevisionId).maybeSingle()
```

### R343 — line 414

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase.from("ai_document_versions")
    // ai_documents also references ai_document_versions through active_version_id.
    // Use the version ownership FK explicitly so PostgREST does not attempt an
    // ambiguous relationship embed when it validates a citation source.
    .select("id, document_id, storage_bucket, storage_path, processing_status, document:ai_documents!ai_document_versions_document_id_fkey!inner(id, title, status, active_version_id)")
    .in("id", versionIds)
```

### R344 — line 421

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase.from("ai_document_chunks")
    .select("id, document_version_id, is_searchable, page_number, rule_number, section_label, heading, content")
    .in("id", chunkIds)
```

## lwrpc-admin/app/lib/aiApprovedAnswersService.js

Server route or shared helper: execution context must follow its caller (lib is not intrinsically server-only). 27 static expressions.

### R345 — line 24

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
db.from('ai_approved_answer_revisions').select(APPROVED_FIELDS).eq('id',approvedId(id)).maybeSingle()
```

### R346 — line 37

RPC: classify by its trusted caller; see function reuse matrix.

```js
db.rpc('ai_approved_source_review',{p_terms:terms})
```

### R347 — line 40

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
db.from('ai_manager_review_cases').select('id,group_id,status').eq('id',approvedId(caseId)).maybeSingle()
```

### R348 — line 42

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
db.from('ai_question_groups').select('id,family,canonical_question,merged_into_group_id').eq('id',c.group_id).maybeSingle()
```

### R349 — line 45

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
db.from('ai_approved_answers').select('id').eq('source_review_case_id',c.id).maybeSingle()
```

### R350 — line 51

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
db.from('ai_approved_answer_revisions').select(APPROVED_FIELDS).order('updated_at',{ascending:false}).limit(300)
```

### R351 — line 52

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
db.from('seasons').select('id,name,start_date,end_date').order('start_date',{ascending:false})
```

### R352 — line 53

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
db.from('ai_request_outcomes').select('id,completed_at,assistant_version,diagnostic_snapshot,origin').not('diagnostic_snapshot->authorityWarnings','is',null).order('completed_at',{ascending:false}).limit(100)
```

### R353 — line 54

RPC: classify by its trusted caller; see function reuse matrix.

```js
db.rpc('ai_approved_authority_manifest')
```

### R354 — line 65

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
db.from('ai_approved_answer_revisions').select('activated_by_user_id').eq('id',id).single()
```

### R355 — line 69

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
db.from('members').select('first_name,last_name').eq('email',actor.data.user.email.toLowerCase()).limit(1).maybeSingle()
```

### R356 — line 72

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
db.from('ai_approved_answers').select('id,source_review_case_id').eq('id',revision.answer_id).single()
```

### R357 — line 73

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
db.from('ai_approved_answer_revisions').select(APPROVED_FIELDS).eq('answer_id',revision.answer_id).order('revision_number',{ascending:false})
```

### R358 — line 74

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
db.from('ai_approved_answer_events').select('id,action,created_at,reason,revision_id,before_state,after_state').eq('answer_id',revision.answer_id).order('created_at',{ascending:false}).limit(100)
```

### R359 — line 76

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
db.from('ai_manager_review_cases').select('group_id,status').eq('id',item.source_review_case_id).maybeSingle()
```

### R360 — line 83

RPC: classify by its trusted caller; see function reuse matrix.

```js
db.rpc('ai_approved_authority_manifest')
```

### R361 — line 84

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
db.from('ai_approved_answer_revisions').select('id,answer_id,title,status,topic_key,league_scope,temporal_scope,season_id,effective_on,expires_on').in('status',['active','draft']).neq('answer_id',revision.answer_id)
```

### R362 — line 88

RPC: classify by its trusted caller; see function reuse matrix.

```js
db.rpc('ai_approved_knowledge_manifest')
```

### R363 — line 97

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
db.from('ai_approved_answer_events').select('answer_id,revision_id,actor_user_id,action,before_state,after_state,reason').eq('operation_id',operation).eq('event_ordinal',0).maybeSingle()
```

### R364 — line 102

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
db.from('ai_approved_answers').select('source_review_case_id').eq('id',previous.answer_id).single()
```

### R365 — line 128

RPC: classify by its trusted caller; see function reuse matrix.

```js
db.rpc('ai_approved_authority_manifest')
```

### R366 — line 132

RPC: classify by its trusted caller; see function reuse matrix.

```js
db.rpc('search_ai_approved_answers',{p_embedding:JSON.stringify(embedding.embedding),p_question:current.canonical_question})
```

### R367 — line 145

RPC: classify by its trusted caller; see function reuse matrix.

```js
db.rpc('ai_approved_answer_action',{p_actor:user,p_operation:operation,p_action:action,p_id:id,p_expected:expected,p_body:payload})
```

### R368 — line 150

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
db.from('ai_document_chunks').select('id,document_version_id,content,page_number,rule_number,heading').eq('id',approvedId(chunkId)).maybeSingle()
```

### R369 — line 152

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
db.from('ai_document_versions').select('id,document_id,processing_status,document:ai_documents!ai_document_versions_document_id_fkey!inner(id,title)').eq('id',c.document_version_id).maybeSingle()
```

### R370 — line 164

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
db.from('ai_documents').select('id,active_version_id,status,document_type').eq('id',source.documentId).maybeSingle()
```

### R371 — line 167

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
db.from('ai_document_chunks').select('is_searchable').eq('id',source.chunkId).maybeSingle()
```

## lwrpc-admin/app/lib/aiApprovedRelatedEvidence.js

Server route or shared helper: execution context must follow its caller (lib is not intrinsically server-only). 2 static expressions.

### R372 — line 20

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
read(supabase.from('ai_document_chunks').select('id,document_version_id,content,page_number,rule_number,heading,section_label,is_searchable').in('id',[...new Set(candidates.map(x=>x.revision.related_chunk_id))]))
```

### R373 — line 21

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
read(supabase.from('ai_document_versions').select('id,document_id,processing_status,document:ai_documents!ai_document_versions_document_id_fkey!inner(id,title,status,active_version_id,document_type,scope_kind,authority_rank)').in('id',[...new Set(chunks.map(x=>x.document_version_id))]))
```

## lwrpc-admin/app/lib/aiDocumentActivation.js

Server route or shared helper: execution context must follow its caller (lib is not intrinsically server-only). 1 static expressions.

### R374 — line 12

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
db.from('members').select('id,first_name,last_name').in('id',ids)
```

## lwrpc-admin/app/lib/aiDocumentNavigation.js

Server route or shared helper: execution context must follow its caller (lib is not intrinsically server-only). 3 static expressions.

### R375 — line 10

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase.from('ai_documents').select('id,title,document_type,authority_rank,active_version_id,active_version:ai_document_versions!ai_documents_active_version_id_fkey!inner(id,processing_status)').eq('status','active').eq('active_version.processing_status','ready').limit(24)
```

### R376 — line 19

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase.from('ai_document_chunks').select('id,document_version_id,chunk_ordinal,page_number,section_label,rule_number,heading,content').eq('document_version_id',d.active_version_id).eq('is_searchable',true).order('chunk_ordinal').limit(24)
```

### R377 — line 24

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase.from('ai_document_chunks').select('id,document_version_id,chunk_ordinal,page_number,section_label,rule_number,heading,content').eq('document_version_id',d.active_version_id).eq('is_searchable',true).order('chunk_ordinal').limit(1)
```

## lwrpc-admin/app/lib/aiDocumentProcessing.js

Server route or shared helper: execution context must follow its caller (lib is not intrinsically server-only). 2 static expressions.

### R378 — line 567

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
    .from("ai_document_versions")
    .select("id, document_id, storage_bucket, storage_path")
    .eq("id", versionId)
    .single()
```

### R379 — line 573

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
    .from("ai_documents")
    .select("document_type")
    .eq("id", version.document_id)
    .single()
```

## lwrpc-admin/app/lib/aiEligibilityService.js

Server route or shared helper: execution context must follow its caller (lib is not intrinsically server-only). 4 static expressions.

### R380 — line 14

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
read(db.from('ai_documents').select('id,title,document_type,authority_rank,active_version_id,active_version:ai_document_versions!ai_documents_active_version_id_fkey!inner(processing_status)').eq('status','active').eq('document_type','league_rules').eq('active_version.processing_status','ready').limit(5))
```

### R381 — line 16

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
read(db.from('ai_document_chunks').select('id,document_version_id,chunk_ordinal,page_number,rule_number,heading,section_label,content').eq('document_version_id',d.active_version_id).eq('is_searchable',true).order('chunk_ordinal').limit(161))
```

### R382 — line 18

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
read(db.from('divisions').select('id,name,is_active,min_dupr,max_dupr,team_dupr_max,rating_type,league:leagues!inner(id,name,is_active,season:seasons!inner(id,name,is_active))').eq('is_active',true).eq('league.is_active',true).eq('league.season.is_active',true).limit(101))
```

### R383 — line 52

RPC: classify by its trusted caller; see function reuse matrix.

```js
principal.supabase.rpc('ai_live_lookup',{p_actor:principal.user.id,p_request:id,p_query:q}).abortSignal(AbortSignal.timeout(5000))
```

## lwrpc-admin/app/lib/aiExistingEvidenceDecision.js

Server route or shared helper: execution context must follow its caller (lib is not intrinsically server-only). 1 static expressions.

### R384 — line 11

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
auth.supabase.from('ai_manager_review_cases').select('id,revision,created_at,reviewed_through_at').eq('id',id).maybeSingle()
```

## lwrpc-admin/app/lib/aiPassageContinuations.js

Server route or shared helper: execution context must follow its caller (lib is not intrinsically server-only). 2 static expressions.

### R385 — line 15

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
db.from('ai_document_chunks').select('document_version_id,chunk_ordinal,rule_number,heading').eq('id',c.chunkId).eq('document_version_id',c.documentVersionId).eq('is_searchable',true).maybeSingle()
```

### R386 — line 17

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
db.from('ai_document_chunks').select('id,content,page_number,section_label,rule_number,heading').eq('document_version_id',c.documentVersionId).eq('chunk_ordinal',anchor.data.chunk_ordinal+1).eq('is_searchable',true).maybeSingle()
```

## lwrpc-admin/app/lib/aiPolicyEvidence.js

Server route or shared helper: execution context must follow its caller (lib is not intrinsically server-only). 2 static expressions.

### R387 — line 17

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
read(db.from('ai_documents').select('id,title,document_type,authority_rank,active_version_id,active_version:ai_document_versions!ai_documents_active_version_id_fkey!inner(id,processing_status)').eq('status','active').eq('active_version.processing_status','ready').limit(24))
```

### R388 — line 24

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
read(db.from('ai_document_chunks').select('id,document_version_id,chunk_ordinal,page_number,rule_number,heading,section_label,content').eq('document_version_id',d.active_version_id).eq('is_searchable',true).order('chunk_ordinal').limit(161))
```

## lwrpc-admin/app/lib/aiQualityPersistence.js

Server route or shared helper: execution context must follow its caller (lib is not intrinsically server-only). 3 static expressions.

### R389 — line 34

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
db.from(table).select(columns).eq(key,value).limit(1).abortSignal(signal)
```

### R390 — line 52

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
db.from('ai_answer_feedback_events').select('id').eq('answer_id',id).eq('helpful',false).limit(1).abortSignal(signal)
```

### R391 — line 80

RPC: classify by its trusted caller; see function reuse matrix.

```js
db.rpc('capture_ai_quality',args).abortSignal(signal)
```

## lwrpc-admin/app/lib/aiRetrieval.js

Server route or shared helper: execution context must follow its caller (lib is not intrinsically server-only). 7 static expressions.

### R392 — line 69

RPC: classify by its trusted caller; see function reuse matrix.

```js
supabase.rpc("search_ai_official_chunks", rpcArgs(request.question))
```

### R393 — line 102

RPC: classify by its trusted caller; see function reuse matrix.

```js
supabase.rpc('search_ai_official_chunks',rpcArgs(concept.query))
```

### R394 — line 114

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase.from('ai_document_chunks').select('document_version_id,chunk_ordinal,rule_number,content').in('document_version_id',versions).in('rule_number',rules).eq('is_searchable',true).order('chunk_ordinal').limit(48)
```

### R395 — line 121

RPC: classify by its trusted caller; see function reuse matrix.

```js
supabase.rpc("search_ai_official_chunks", rpcArgs(query))
```

### R396 — line 127

RPC: classify by its trusted caller; see function reuse matrix.

```js
supabase.rpc('search_ai_approved_answers', {p_embedding:toPgVector(embedding.embedding),p_question:request.question})
```

### R397 — line 254

RPC: classify by its trusted caller; see function reuse matrix.

```js
supabase.rpc("search_ai_official_chunks", {
    ...rpcArgs(LWR_MATCH_EQUIPMENT_PROBE_QUERY),
    p_query_embedding: toPgVector(probeEmbedding.embedding),
  })
```

### R398 — line 274

RPC: classify by its trusted caller; see function reuse matrix.

```js
supabase.rpc("search_ai_official_chunks", rpcArgs(retrievalQuery, 80))
```

## lwrpc-admin/app/lib/aiReviewService.js

Server route or shared helper: execution context must follow its caller (lib is not intrinsically server-only). 10 static expressions.

### R399 — line 49

RPC: classify by its trusted caller; see function reuse matrix.

```js
db.rpc('ai_review_report', { p_filters: f })
```

### R400 — line 65

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
db.from('ai_review_occurrences').select(OCCURRENCE_FIELDS)
```

### R401 — line 70

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
db.from('ai_answer_feedback_events').select(FEEDBACK_FIELDS).eq('answer_id',aid).order('created_at',{ascending:false}).order('id').limit(1).maybeSingle()
```

### R402 — line 71

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
db.from('ai_manager_review_cases').select(CASE_FIELDS).eq('group_id',gid).maybeSingle()
```

### R403 — line 72

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
db.from('ai_request_outcomes').select('id,completed_at,origin,final_kind,assistant_version,model,source_family,diagnostic_snapshot,resolver_classification').eq('id',aid).maybeSingle()
```

### R404 — line 75

RPC: classify by its trusted caller; see function reuse matrix.

```js
db.rpc('ai_review_feedback_state',{p_asof:feedback.created_at}).eq('answer_id',aid).maybeSingle()
```

### R405 — line 96

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
db.from(table).select(fields).eq(kind==='feedback'?'answer_id':kind==='audit'?'case_id':'group_id',target)
```

### R406 — line 110

RPC: classify by its trusted caller; see function reuse matrix.

```js
db.rpc('ai_review_case_action',{p_case:token.caseId,p_actor:user,p_operation:body.operation,p_revision:token.revision,
    p_action:body.action,p_value:body.value ?? null,p_note:body.note || null,p_cutoff:token.cutoff})
```

### R407 — line 127

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
db.from('ai_document_versions').select('id,document_id,storage_bucket,storage_path,processing_status,document:ai_documents!ai_document_versions_document_id_fkey!inner(id,title,status,active_version_id)').eq('id',versionId).maybeSingle()
```

### R408 — line 128

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
db.from('ai_document_chunks').select('id,document_version_id,page_number').eq('id',chunkId).maybeSingle()
```

## lwrpc-admin/app/lib/appNotifications.js

Server route or shared helper: execution context must follow its caller (lib is not intrinsically server-only). 2 static expressions.

### R409 — line 103

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
      .from("app_notification_subscriptions")
      .select("id, endpoint, p256dh, auth, recipient_phone, recipient_email")
      .eq("enabled", true)
      .in("recipient_phone", normalizedPhones)
```

### R410 — line 113

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
      .from("app_notification_subscriptions")
      .select("id, endpoint, p256dh, auth, recipient_phone, recipient_email")
      .eq("enabled", true)
      .in("recipient_email", normalizedEmails)
```

## lwrpc-admin/app/lib/auth.js

Server route or shared helper: execution context must follow its caller (lib is not intrinsically server-only). 1 static expressions.

### R411 — line 68

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
    .from("user_roles")
    .select("role, member_id")
    .eq("user_id", userId)
    .limit(1)
```

## lwrpc-admin/app/lib/identityRoleWriter.js

Server route or shared helper: execution context must follow its caller (lib is not intrinsically server-only). 3 static expressions.

### R412 — line 8

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
client.from('user_roles').select('*').eq('member_id', memberId).maybeSingle()
```

### R413 — line 12

Mutation result: outside read parity; preserve normal write path, block View-As.

```js
client.from('user_roles').update({ role: desiredRole, updated_at: new Date().toISOString() })
        .eq('id', row.id).eq('role', row.role).select('id').single()
```

### R414 — line 14

Mutation result: outside read parity; preserve normal write path, block View-As.

```js
client.from('user_roles').insert({ user_id: null, member_id: memberId, role: desiredRole }).select('id').single()
```

## lwrpc-admin/app/lib/liveLmsService.js

Server route or shared helper: execution context must follow its caller (lib is not intrinsically server-only). 2 static expressions.

### R415 — line 45

RPC: classify by its trusted caller; see function reuse matrix.

```js
principal.supabase.rpc('ai_live_lookup',{p_actor:principal.user.id,p_request:answerId,p_query:q}).abortSignal(AbortSignal.timeout(5000))
```

### R416 — line 72

RPC: classify by its trusted caller; see function reuse matrix.

```js
principal.supabase.rpc('ai_live_feedback',{p_actor:principal.user.id,p_answer:answerId,p_helpful:body.helpful,p_metadata:metadata})
```

## lwrpc-admin/app/lib/matchSetupReminders.js

Server route or shared helper: execution context must follow its caller (lib is not intrinsically server-only). 3 static expressions.

### R417 — line 50

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
    .from("leagues")
    .select("id, name, match_setup_reminder_days_before")
    .gt("match_setup_reminder_days_before", -1)
```

### R418 — line 65

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

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

### R419 — line 109

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
        .from("match_lineups")
        .select("match_id, team_id, player_1_member_id, player_2_member_id")
        .in("match_id", matchIds)
```

## lwrpc-admin/app/lib/memberLookup.js

Server route or shared helper: execution context must follow its caller (lib is not intrinsically server-only). 1 static expressions.

### R420 — line 4

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabaseClient
    .from("members")
    .select(selectColumns)
    .eq("email", email)
    .order("created_at", { ascending: true })
```

## lwrpc-admin/app/lib/pbccReminders.js

Server route or shared helper: execution context must follow its caller (lib is not intrinsically server-only). 4 static expressions.

### R421 — line 171

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
    .from("round_robin_sessions")
    .select("id, group_id, session_name, location, session_date, starts_at, status, mode, max_players, settings")
    .gte("session_date", startDate)
    .lte("session_date", endDate)
    .in("status", ["draft", "open", "playing"])
    .order("session_date", { ascending: true })
    .order("starts_at", { ascending: true })
```

### R422 — line 190

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
      .from("round_robin_groups")
      .select("id, name, slug, timezone, settings")
      .in("id", groupIds)
```

### R423 — line 194

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
      .from("round_robin_session_players")
      .select("id, session_id, display_name, phone, response_status")
      .in("session_id", sessionIds)
      .order("sort_order", { ascending: true })
```

### R424 — line 199

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
      .from("round_robin_activity_log")
      .select("id, session_id, metadata")
      .in("session_id", sessionIds)
      .eq("log_type", PBCC_REMINDER_LOG_TYPE)
```

## lwrpc-admin/app/lib/profilePhotos.js

Server route or shared helper: execution context must follow its caller (lib is not intrinsically server-only). 1 static expressions.

### R425 — line 64

Mutation result: outside read parity; preserve normal write path, block View-As.

```js
client
    .from("members")
    .update({ profile_image_urls: nextProfileImageUrls })
    .eq("id", member.id)
    .select("profile_image_urls")
    .single()
```

## lwrpc-admin/app/lib/roleGuards.js

Server route or shared helper: execution context must follow its caller (lib is not intrinsically server-only). 1 static expressions.

### R426 — line 18

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
    .from("user_roles")
    .select("id")
    .eq("role", "commissioner")
```

## lwrpc-admin/app/lib/roundRobins.js

Server route or shared helper: execution context must follow its caller (lib is not intrinsically server-only). 6 static expressions.

### R427 — line 17

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
    .from("round_robin_groups")
    .select("id, name, slug, public_status, mode, schedule_day, schedule_time, timezone, updated_at")
    .eq("public_status", "public")
    .order("updated_at", { ascending: false })
```

### R428 — line 59

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
    .from("round_robin_groups")
    .select("id, name, slug, public_status, mode, schedule_day, schedule_time, timezone, settings, updated_at")
    .eq("public_status", "public")
```

### R429 — line 101

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
    .from("round_robin_courts")
    .select("id, name, description, sort_order, is_active")
    .eq("group_id", groupId)
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true })
```

### R430 — line 114

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
    .from("round_robin_sessions")
    .select("id, session_name, location, session_date, starts_at, mode, status, court_count, round_count, max_players, summary_text, created_at, updated_at")
    .eq("group_id", groupId)
    .order("session_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(20)
```

### R431 — line 127

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
    .from("round_robin_matches")
    .select("id, round_number, court_number, court_name, team1_players, team2_players, bye_players, team1_score, team2_score, status")
    .eq("session_id", sessionId)
    .order("round_number", { ascending: true })
    .order("court_number", { ascending: true })
```

### R432 — line 139

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
    .from("round_robin_player_session_results")
    .select("player_id, display_name, games, wins, losses, points_for, points_against, point_diff, byes, rank")
    .eq("session_id", sessionId)
    .order("rank", { ascending: true })
```

## lwrpc-admin/app/lib/serverEmailTemplates.js

Server route or shared helper: execution context must follow its caller (lib is not intrinsically server-only). 2 static expressions.

### R433 — line 35

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
    .from("notification_templates")
    .select("template_key, subject, body")
    .eq("template_key", templateKey)
    .maybeSingle()
```

### R434 — line 61

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
    .from("system_settings")
    .select("setting_key, setting_value")
```

## lwrpc-admin/app/lib/serverSupabase.js

Server route or shared helper: execution context must follow its caller (lib is not intrinsically server-only). 1 static expressions.

### R435 — line 59

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
    .from("members")
    .select("id, is_active_member, user_roles(role)")
    .eq("email", email)
    .order("created_at", { ascending: true })
```

## lwrpc-admin/app/lib/standingsRebuild.js

Server route or shared helper: execution context must follow its caller (lib is not intrinsically server-only). 5 static expressions.

### R436 — line 194

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
    .from("divisions")
    .select("*")
    .eq("id", divisionId)
    .single()
```

### R437 — line 202

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
    .from("teams")
    .select("id, name")
    .eq("division_id", divisionId)
    .order("name", { ascending: true })
```

### R438 — line 210

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

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

### R439 — line 261

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
    .from("matches")
    .select("id, division_id, week_number, scheduled_date, status, score_status")
    .eq("division_id", divisionId)
    .eq("is_published", true)
```

### R440 — line 269

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
    .from("team_byes")
    .select("id, team_id, division_id, week_number, bye_date")
    .eq("division_id", divisionId)
```

## lwrpc-admin/app/lib/tournaments.js

Server route or shared helper: execution context must follow its caller (lib is not intrinsically server-only). 6 static expressions.

### R441 — line 94

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
    .from("tournaments")
    .select("id, name, slug, public_status, updated_at")
    .eq("public_status", "public")
    .order("updated_at", { ascending: false })
```

### R442 — line 128

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
    .from("tournaments")
    .select("id, name, slug, public_status, settings, updated_at")
    .eq("public_status", "public")
```

### R443 — line 142

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
    .from("tournament_divisions")
    .select("id, name, sort_order, is_active, settings")
    .eq("tournament_id", tournamentId)
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true })
```

### R444 — line 155

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
    .from("tournament_teams")
    .select("id, division_id, name, line_number, seed, player_1_name, player_2_name, player_1_checked_in, player_2_checked_in, checked_in")
    .eq("tournament_id", tournamentId)
    .order("name", { ascending: true })
    .order("line_number", { ascending: true })
```

### R445 — line 167

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
    .from("tournament_courts")
    .select("id, name, sort_order, current_match_id")
    .eq("tournament_id", tournamentId)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true })
```

### R446 — line 179

Shared helper/API dependency: A/B/C follows named contract and caller authorization, not the file name.

```js
supabase
    .from("tournament_matches")
    .select(`
      id,
      legacy_id,
      division_id,
      home_team_id,
      away_team_id,
      court_id,
      line_number,
      status,
      result_type,
      winner_team_id,
      home_score,
      away_score,
      game_scores,
      score_text,
      queue_entered_at,
      assigned_at,
      completed_at,
      created_order,
      division:tournament_divisions(id, name, is_active),
      home_team:tournament_teams!tournament_matches_home_team_id_fkey(id, name, player_1_name, player_2_name, seed),
      away_team:tournament_teams!tournament_matches_away_team_id_fkey(id, name, player_1_name, player_2_name, seed),
      court:tournament_courts!tournament_matches_court_id_fkey(id, name),
      winner_team:tournament_teams!tournament_matches_winner_team_id_fkey(id, name)
    `)
    .eq("tournament_id", tournamentId)
    .order("created_order", { ascending: true })
```

## lwrpc-admin/app/lib/viewAsServer.js

Server route or shared helper: execution context must follow its caller (lib is not intrinsically server-only). 1 static expressions.

### R447 — line 11

RPC: classify by its trusted caller; see function reuse matrix.

```js
client.rpc('lms_view_as',{p_op:op,p_input:input}).abortSignal(AbortSignal.timeout(5000))
```

## lwrpc-admin/app/live-match/[id]/page.js

Browser page/component, except route wrappers. 3 static expressions.

### R448 — line 19

C for protected relational page data; B for composition/formatting.

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

### R449 — line 37

C for protected relational page data; B for composition/formatting.

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

### R450 — line 67

C for protected relational page data; B for composition/formatting.

```js
supabase
        .from("line_games")
        .select("*")
        .in("match_line_id", lineIds)
        .order("game_number", { ascending: true })
```

## lwrpc-admin/app/locations/page.js

Browser page/component, except route wrappers. 2 static expressions.

### R451 — line 49

C for protected relational page data; B for composition/formatting.

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

### R452 — line 77

C for protected relational page data; B for composition/formatting.

```js
supabase
      .from("members")
      .select("id, first_name, last_name, email, is_active_member")
      .or("is_active_member.eq.true,is_active_member.is.null")
      .order("last_name", { ascending: true })
```

## lwrpc-admin/app/matches/[id]/page.js

Browser page/component, except route wrappers. 12 static expressions.

### R453 — line 98

C for protected relational page data; B for composition/formatting.

```js
supabase
        .from("members")
        .select("*")
        .eq("email", user.email)
        .maybeSingle()
```

### R454 — line 107

C for protected relational page data; B for composition/formatting.

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

### R455 — line 141

C for protected relational page data; B for composition/formatting.

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

### R456 — line 182

C for protected relational page data; B for composition/formatting.

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

### R457 — line 219

C for protected relational page data; B for composition/formatting.

```js
supabase
      .from("team_members")
      .select("*, members(id, first_name, last_name, self_rating, dupr_id)")
      .eq("team_id", matchData.home_team_id)
      .order("members(last_name)", { ascending: true })
```

### R458 — line 231

C for protected relational page data; B for composition/formatting.

```js
supabase
      .from("team_members")
      .select("*, members(id, first_name, last_name, self_rating, dupr_id)")
      .eq("team_id", matchData.away_team_id)
      .order("members(last_name)", { ascending: true })
```

### R459 — line 247

C for protected relational page data; B for composition/formatting.

```js
supabase
        .from("line_games")
        .select("*")
        .in("match_line_id", lineIds)
        .order("game_number", { ascending: true })
```

### R460 — line 295

C for protected relational page data; B for composition/formatting.

```js
supabase
        .from("line_games")
        .select("*")
        .in("match_line_id", lineIds)
        .order("game_number", { ascending: true })
```

### R461 — line 310

C for protected relational page data; B for composition/formatting.

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

### R462 — line 330

C for protected relational page data; B for composition/formatting.

```js
supabase
        .from("member_season_ratings")
        .select("*")
        .eq("season_id", seasonId)
```

### R463 — line 380

C for protected relational page data; B for composition/formatting.

```js
supabase
      .from("member_season_ratings")
      .select("*")
      .eq("season_id", seasonId)
```

### R464 — line 1820

C for protected relational page data; B for composition/formatting.

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

## lwrpc-admin/app/member-import/page.js

Browser page/component, except route wrappers. 4 static expressions.

### R465 — line 94

C for protected relational page data; B for composition/formatting.

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

### R466 — line 376

C for protected relational page data; B for composition/formatting.

```js
supabase
          .from("members")
          .select("id")
          .eq("email", user.email)
          .maybeSingle()
```

### R467 — line 394

Mutation result: outside read parity; preserve normal write path, block View-As.

```js
supabase
        .from("member_import_batches")
        .insert({
          source: "membershipworks",
          file_name: fileName,
          imported_by_member_id: importedByMemberId,
          total_rows: preview.length,
          ...counts
        })
        .select()
        .single()
```

### R468 — line 466

C for protected relational page data; B for composition/formatting.

```js
supabase.from("locations").select("id, name, is_active")
```

## lwrpc-admin/app/members/page.js

Browser page/component, except route wrappers. 11 static expressions.

### R469 — line 119

C for protected relational page data; B for composition/formatting.

```js
supabase
        .from("seasons")
        .select("id, name, is_active, start_date")
        .order("start_date", { ascending: false })
```

### R470 — line 123

C for protected relational page data; B for composition/formatting.

```js
supabase
        .from("locations")
        .select("id, name")
        .or("is_active.eq.true,is_active.is.null")
        .order("name", { ascending: true })
```

### R471 — line 268

C for protected relational page data; B for composition/formatting.

```js
supabase
        .from("user_roles")
        .select("id, member_id, role")
        .eq("role", "captain")
```

### R472 — line 360

Mutation result: outside read parity; preserve normal write path, block View-As.

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

### R473 — line 424

C for protected relational page data; B for composition/formatting.

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

### R474 — line 452

C for protected relational page data; B for composition/formatting.

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

### R475 — line 544

C for protected relational page data; B for composition/formatting.

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

### R476 — line 1356

C for protected relational page data; B for composition/formatting.

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

### R477 — line 1409

C for protected relational page data; B for composition/formatting.

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

### R478 — line 1484

C for protected relational page data; B for composition/formatting.

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

### R479 — line 1522

C for protected relational page data; B for composition/formatting.

```js
supabase
      .from("member_season_ratings")
      .select("member_id, season_id, dupr_doubles_rating, season_dupr_rating, season_primetime_rating")
      .range(from, from + pageSize - 1)
```

## lwrpc-admin/app/members/[id]/page.js

Browser page/component, except route wrappers. 10 static expressions.

### R480 — line 62

C for protected relational page data; B for composition/formatting.

```js
supabase
      .from("members")
      .select("*")
      .eq("id", id)
      .single()
```

### R481 — line 84

C for protected relational page data; B for composition/formatting.

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

### R482 — line 103

C for protected relational page data; B for composition/formatting.

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

### R483 — line 149

C for protected relational page data; B for composition/formatting.

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

### R484 — line 226

C for protected relational page data; B for composition/formatting.

```js
supabase
  .from("user_roles")
  .select("*")
  .eq("member_id", id)
  .maybeSingle()
```

### R485 — line 237

C for protected relational page data; B for composition/formatting.

```js
supabase
  .from("locations")
  .select("id, name")
  .or("is_active.eq.true,is_active.is.null")
  .order("name", { ascending: true })
```

### R486 — line 357

Mutation result: outside read parity; preserve normal write path, block View-As.

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

### R487 — line 481

Mutation result: outside read parity; preserve normal write path, block View-As.

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

### R488 — line 498

Mutation result: outside read parity; preserve normal write path, block View-As.

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

### R489 — line 531

Mutation result: outside read parity; preserve normal write path, block View-As.

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

## lwrpc-admin/app/player-dashboard/page.js

Browser page/component, except route wrappers. 17 static expressions.

### R490 — line 129

C for protected relational page data; B for composition/formatting.

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

### R491 — line 201

C for protected relational page data; B for composition/formatting.

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

### R492 — line 229

C for protected relational page data; B for composition/formatting.

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

### R493 — line 323

C for protected relational page data; B for composition/formatting.

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

### R494 — line 428

C for protected relational page data; B for composition/formatting.

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

### R495 — line 443

C for protected relational page data; B for composition/formatting.

```js
supabase
          .from("matches")
          .select("id, division_id, week_number, scheduled_date")
          .in("division_id", divisionIds.length > 0 ? divisionIds : ["00000000-0000-0000-0000-000000000000"])
          .eq("is_published", true)
```

### R496 — line 448

C for protected relational page data; B for composition/formatting.

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

### R497 — line 496

C for protected relational page data; B for composition/formatting.

```js
supabase
          .from("members")
          .select("id, first_name, last_name, email")
          .in("id", scoreMemberIds)
```

### R498 — line 512

C for protected relational page data; B for composition/formatting.

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

### R499 — line 541

C for protected relational page data; B for composition/formatting.

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

### R500 — line 682

C for protected relational page data; B for composition/formatting.

```js
supabase
        .from("member_season_ratings")
        .select("member_id, season_id, season_dupr_rating, season_primetime_rating")
        .in("season_id", seasonIds)
        .in("member_id", ratingMemberIds)
```

### R501 — line 980

C for protected relational page data; B for composition/formatting.

```js
supabase
      .from("match_lineups")
      .select("match_id, team_id, line_number, player_1_member_id, player_2_member_id, player_1:members!match_lineups_player_1_member_id_fkey(id, first_name, last_name, email, self_rating), player_2:members!match_lineups_player_2_member_id_fkey(id, first_name, last_name, email, self_rating)")
      .eq("match_id", match.id)
      .order("team_id", { ascending: true })
      .order("line_number", { ascending: true })
```

### R502 — line 1146

C for protected relational page data; B for composition/formatting.

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

### R503 — line 1159

C for protected relational page data; B for composition/formatting.

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

### R504 — line 1211

C for protected relational page data; B for composition/formatting.

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

### R505 — line 1226

C for protected relational page data; B for composition/formatting.

```js
supabase
        .from("team_standings")
        .select("team_id, rank, standings_points, match_wins, match_losses")
        .eq("division_id", divisionId)
```

### R506 — line 1231

C for protected relational page data; B for composition/formatting.

```js
supabase
            .from("member_season_ratings")
            .select("member_id, season_dupr_rating, season_primetime_rating")
            .eq("season_id", seasonId)
```

## lwrpc-admin/app/ratings/page.js

Browser page/component, except route wrappers. 6 static expressions.

### R507 — line 107

C for protected relational page data; B for composition/formatting.

```js
supabase
      .from("seasons")
      .select("*")
      .order("name", { ascending: true })
```

### R508 — line 222

Mutation result: outside read parity; preserve normal write path, block View-As.

```js
supabase
        .from("member_season_ratings")
        .insert(newRow)
        .select(RATING_SELECT)
        .single()
```

### R509 — line 910

C for protected relational page data; B for composition/formatting.

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

### R510 — line 2379

C for protected relational page data; B for composition/formatting.

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

### R511 — line 2401

C for protected relational page data; B for composition/formatting.

```js
supabase
      .from("member_season_ratings")
      .select(RATING_SELECT)
```

### R512 — line 2425

C for protected relational page data; B for composition/formatting.

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

## lwrpc-admin/app/schedule-editor/page.js

Browser page/component, except route wrappers. 11 static expressions.

### R513 — line 52

C for protected relational page data; B for composition/formatting.

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

### R514 — line 88

C for protected relational page data; B for composition/formatting.

```js
supabase
      .from("leagues")
      .select("id, name, is_active, seasons(is_active)")
      .order("name", { ascending: true })
```

### R515 — line 93

C for protected relational page data; B for composition/formatting.

```js
supabase
      .from("divisions")
      .select("id, name, league_id, is_active")
      .order("name", { ascending: true })
```

### R516 — line 98

C for protected relational page data; B for composition/formatting.

```js
supabase
      .from("locations")
      .select("id, name, number_of_courts")
      .order("name", { ascending: true })
```

### R517 — line 103

C for protected relational page data; B for composition/formatting.

```js
supabase
      .from("league_schedule_settings")
      .select("league_id, division_id, courts_needed_per_match")
```

### R518 — line 107

C for protected relational page data; B for composition/formatting.

```js
supabase
      .from("teams")
      .select("id, name, division_id, home_location_id, is_active")
```

### R519 — line 111

C for protected relational page data; B for composition/formatting.

```js
supabase
      .from("location_court_availability")
      .select("*")
```

### R520 — line 115

C for protected relational page data; B for composition/formatting.

```js
supabase
      .from("league_blackout_dates")
      .select("*")
```

### R521 — line 125

C for protected relational page data; B for composition/formatting.

```js
supabase
        .from("members")
        .select("id, first_name, last_name, email")
        .in("id", [...new Set(scoreMemberIds)])
```

### R522 — line 723

C for protected relational page data; B for composition/formatting.

```js
supabase
      .from("match_lines")
      .select("id")
      .eq("match_id", match.id)
```

### R523 — line 786

C for protected relational page data; B for composition/formatting.

```js
supabase
      .from("match_lines")
      .select("id")
      .eq("match_id", match.id)
```

## lwrpc-admin/app/scheduling/page.js

Browser page/component, except route wrappers. 13 static expressions.

### R524 — line 108

C for protected relational page data; B for composition/formatting.

```js
supabase
      .from("leagues")
      .select("id, name, is_active, seasons(is_active)")
      .order("name", { ascending: true })
```

### R525 — line 114

C for protected relational page data; B for composition/formatting.

```js
supabase
      .from("divisions")
      .select("id, name, league_id, is_active")
      .order("name", { ascending: true })
```

### R526 — line 120

C for protected relational page data; B for composition/formatting.

```js
supabase
      .from("locations")
      .select("id, name, number_of_courts")
      .order("name", { ascending: true })
```

### R527 — line 126

C for protected relational page data; B for composition/formatting.

```js
supabase
      .from("league_schedule_settings")
      .select("*, leagues(name), divisions(name)")
      .order("name", { ascending: true })
```

### R528 — line 132

C for protected relational page data; B for composition/formatting.

```js
supabase
      .from("location_court_availability")
      .select("*, locations(name)")
      .order("specific_date", { ascending: true })
```

### R529 — line 138

C for protected relational page data; B for composition/formatting.

```js
supabase
      .from("league_blackout_dates")
      .select("*, leagues(name), divisions(name)")
      .order("blackout_date", { ascending: true })
```

### R530 — line 144

C for protected relational page data; B for composition/formatting.

```js
supabase
      .from("matches")
      .select("*")
```

### R531 — line 661

C for protected relational page data; B for composition/formatting.

```js
supabase
      .from("division_lines")
      .select("*")
      .eq("division_id", divisionId)
      .order("line_number", { ascending: true })
```

### R532 — line 691

Mutation result: outside read parity; preserve normal write path, block View-As.

```js
supabase
      .from("match_lines")
      .insert(matchLineRows)
      .select("id, division_line_id")
```

### R533 — line 740

C for protected relational page data; B for composition/formatting.

```js
supabase
      .from("teams")
      .select("id, name, home_location_id, is_active, locations(id, name)")
      .eq("division_id", setting.division_id)
      .neq("is_active", false)
      .order("name", { ascending: true })
```

### R534 — line 902

Mutation result: outside read parity; preserve normal write path, block View-As.

```js
supabase
        .from("matches")
        .insert(rowsToInsert)
        .select()
```

### R535 — line 958

C for protected relational page data; B for composition/formatting.

```js
supabase
      .from("matches")
      .select("id")
      .eq("league_id", setting.league_id)
      .eq("division_id", setting.division_id)
```

### R536 — line 978

C for protected relational page data; B for composition/formatting.

```js
supabase
      .from("match_lines")
      .select("id")
      .in("match_id", matchIds)
```

## lwrpc-admin/app/score-entry/[id]/page.js

Browser page/component, except route wrappers. 7 static expressions.

### R537 — line 55

C for protected relational page data; B for composition/formatting.

```js
supabase
        .from("members")
        .select("*")
        .eq("email", user.email)
        .maybeSingle()
```

### R538 — line 64

C for protected relational page data; B for composition/formatting.

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

### R539 — line 96

C for protected relational page data; B for composition/formatting.

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

### R540 — line 133

C for protected relational page data; B for composition/formatting.

```js
supabase
        .from("line_games")
        .select("*")
        .in("match_line_id", lineIds)
        .order("game_number", { ascending: true })
```

### R541 — line 151

C for protected relational page data; B for composition/formatting.

```js
supabase
        .from("member_season_ratings")
        .select("*")
        .eq("season_id", seasonId)
```

### R542 — line 174

C for protected relational page data; B for composition/formatting.

```js
supabase
      .from("member_season_ratings")
      .select("*")
      .eq("season_id", seasonId)
```

### R543 — line 494

C for protected relational page data; B for composition/formatting.

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

## lwrpc-admin/app/score-sheets/page.js

Browser page/component, except route wrappers. 1 static expressions.

### R544 — line 39

C for protected relational page data; B for composition/formatting.

```js
supabase
      .from("score_sheet_templates")
      .select("*")
      .order("is_default", { ascending: false })
      .order("name", { ascending: true })
```

## lwrpc-admin/app/scoring/page.js

Browser page/component, except route wrappers. 12 static expressions.

### R545 — line 124

C for protected relational page data; B for composition/formatting.

```js
supabase.from("leagues").select("id, name, is_active, seasons(is_active)").order("name", { ascending: true })
```

### R546 — line 125

C for protected relational page data; B for composition/formatting.

```js
supabase.from("divisions").select("id, name, league_id, is_active, sort_order").order("sort_order", { ascending: true })
```

### R547 — line 126

C for protected relational page data; B for composition/formatting.

```js
supabase.from("teams").select("id, name, division_id, is_active").order("name", { ascending: true })
```

### R548 — line 127

C for protected relational page data; B for composition/formatting.

```js
supabase.from("locations").select("id, name").order("name", { ascending: true })
```

### R549 — line 145

C for protected relational page data; B for composition/formatting.

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

### R550 — line 272

C for protected relational page data; B for composition/formatting.

```js
supabase
        .from("members")
        .select("id, first_name, last_name, email")
        .in("id", [...new Set(scoreMemberIds)])
```

### R551 — line 456

Mutation result: outside read parity; preserve normal write path, block View-As.

```js
supabase
      .from("matches")
      .delete()
      .eq("id", match.id)
      .neq("status", "completed")
      .select("id")
```

### R552 — line 563

C for protected relational page data; B for composition/formatting.

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

### R553 — line 949

Mutation result: outside read parity; preserve normal write path, block View-As.

```js
supabase
        .from("matches")
        .update(structureLocked ? schedulePayload : fullPayload)
        .eq("id", match.id)
        .select("id")
        .single()
```

### R554 — line 971

Mutation result: outside read parity; preserve normal write path, block View-As.

```js
supabase
        .from("matches")
        .insert({ ...fullPayload, status: "scheduled" })
        .select("id")
        .single()
```

### R555 — line 1123

C for protected relational page data; B for composition/formatting.

```js
supabase
    .from("division_lines")
    .select("id, line_number, posted_to_dupr, games_per_line")
    .eq("division_id", divisionId)
    .order("line_number", { ascending: true })
```

### R556 — line 1131

Mutation result: outside read parity; preserve normal write path, block View-As.

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

## lwrpc-admin/app/seasons/page.js

Browser page/component, except route wrappers. 4 static expressions.

### R557 — line 44

C for protected relational page data; B for composition/formatting.

```js
supabase
      .from("seasons")
      .select("*")
      .order("name", { ascending: true })
```

### R558 — line 160

C for protected relational page data; B for composition/formatting.

```js
supabase
      .from("leagues")
      .select("id")
      .eq("season_id", seasonId)
```

### R559 — line 169

C for protected relational page data; B for composition/formatting.

```js
supabase.from("divisions").select("id, league_id").in("league_id", leagueIds)
```

### R560 — line 176

C for protected relational page data; B for composition/formatting.

```js
supabase.from("teams").select("id, division_id").in("division_id", divisionIds)
```

## lwrpc-admin/app/standings/page.js

Browser page/component, except route wrappers. 10 static expressions.

### R561 — line 41

C for protected relational page data; B for composition/formatting.

```js
supabase
      .from("leagues")
      .select("*, seasons(is_active)")
      .order("name", { ascending: true })
```

### R562 — line 46

C for protected relational page data; B for composition/formatting.

```js
supabase
      .from("divisions")
      .select("*, leagues(id, name, season_id)")
      .order("name", { ascending: true })
```

### R563 — line 51

C for protected relational page data; B for composition/formatting.

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

### R564 — line 64

C for protected relational page data; B for composition/formatting.

```js
supabase
      .from("matches")
      .select("id, division_id, week_number, scheduled_date")
      .eq("is_published", true)
```

### R565 — line 69

C for protected relational page data; B for composition/formatting.

```js
supabase
      .from("team_byes")
      .select("id, team_id, division_id, week_number, bye_date")
```

### R566 — line 243

C for protected relational page data; B for composition/formatting.

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

### R567 — line 256

C for protected relational page data; B for composition/formatting.

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

### R568 — line 329

C for protected relational page data; B for composition/formatting.

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

### R569 — line 344

C for protected relational page data; B for composition/formatting.

```js
supabase
        .from("team_standings")
        .select("team_id, rank, standings_points, match_wins, match_losses")
        .eq("division_id", team.division_id)
```

### R570 — line 349

C for protected relational page data; B for composition/formatting.

```js
supabase
            .from("member_season_ratings")
            .select("member_id, season_dupr_rating, season_primetime_rating")
            .eq("season_id", seasonId)
```

## lwrpc-admin/app/teams/page.js

Browser page/component, except route wrappers. 15 static expressions.

### R571 — line 216

C for protected relational page data; B for composition/formatting.

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

### R572 — line 230

C for protected relational page data; B for composition/formatting.

```js
supabase
      .from("divisions")
      .select("id, name, league_id, is_active")
      .order("name", { ascending: true })
```

### R573 — line 235

C for protected relational page data; B for composition/formatting.

```js
supabase
      .from("locations")
      .select("id, name")
      .order("name", { ascending: true })
```

### R574 — line 248

C for protected relational page data; B for composition/formatting.

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

### R575 — line 621

Mutation result: outside read parity; preserve normal write path, block View-As.

```js
supabase
      .from("teams")
      .insert(
        sourceTeams.map((team) => copyTeamPayload(team, team.name, copyDivisionTargetDivision))
      )
      .select("id")
```

### R576 — line 643

C for protected relational page data; B for composition/formatting.

```js
supabase
        .from("team_members")
        .select("*")
        .in("team_id", sourceTeamIds)
```

### R577 — line 697

Mutation result: outside read parity; preserve normal write path, block View-As.

```js
supabase
      .from("teams")
      .insert(payload)
      .select("id")
      .single()
```

### R578 — line 710

C for protected relational page data; B for composition/formatting.

```js
supabase
        .from("team_members")
        .select("*")
        .eq("team_id", copyTeam.id)
```

### R579 — line 768

C for protected relational page data; B for composition/formatting.

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

### R580 — line 783

C for protected relational page data; B for composition/formatting.

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

### R581 — line 834

C for protected relational page data; B for composition/formatting.

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

### R582 — line 843

C for protected relational page data; B for composition/formatting.

```js
supabase
        .from("team_standings")
        .select("team_id, rank, standings_points, match_wins, match_losses")
        .eq("division_id", team.division_id)
```

### R583 — line 848

C for protected relational page data; B for composition/formatting.

```js
supabase
            .from("member_season_ratings")
            .select("member_id, season_dupr_rating, season_primetime_rating")
            .eq("season_id", seasonId)
```

### R584 — line 1774

C for protected relational page data; B for composition/formatting.

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

### R585 — line 1807

C for protected relational page data; B for composition/formatting.

```js
supabase
      .from("team_members")
      .select("team_id")
      .range(from, from + pageSize - 1)
```

## lwrpc-admin/app/teams/[id]/page.js

Browser page/component, except route wrappers. 7 static expressions.

### R586 — line 54

C for protected relational page data; B for composition/formatting.

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

### R587 — line 119

C for protected relational page data; B for composition/formatting.

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

### R588 — line 144

C for protected relational page data; B for composition/formatting.

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

### R589 — line 168

C for protected relational page data; B for composition/formatting.

```js
supabase
      .from("locations")
      .select("id, name")
      .order("name", { ascending: true })
```

### R590 — line 183

C for protected relational page data; B for composition/formatting.

```js
supabase
        .from("member_season_ratings")
        .select("*")
        .eq("season_id", seasonId)
```

### R591 — line 203

C for protected relational page data; B for composition/formatting.

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

### R592 — line 244

C for protected relational page data; B for composition/formatting.

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

