"use client";

import LoadingScreen from "../components/LoadingScreen";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AppHeader from "../components/AppHeader";
import LoginMessageModal from "../components/LoginMessageModal";
import LmsInstallButton from "../components/LmsInstallButton";
import TeamScheduleModal from "../components/TeamScheduleModal";
import { requireRole, supabase } from "../lib/auth";
import { formatDisplayDateWithLeadingWeekday, formatDisplayTime, formatDisplayTimestampShort } from "../lib/dateTime";
import {
  filterHistoryRows,
  formatDate,
  historyFilterOptions,
  historyTeamOptionLabel,
  playerLineDetails,
  rowCountsForIndividualWinLoss,
  rowHasSpecialGame,
  sortHistoryRows,
  specialGameStatus,
} from "../lib/playHistory";
import { formatPhoneNumberForStorage } from "../lib/phone";
import { sortStandingsByDivisionRules } from "../lib/standingsSort";
import {
  DEFAULT_LEAGUE_DOCUMENT_BUCKET,
  LEAGUE_DOCUMENT_TYPES,
  leagueDocumentPath,
} from "../lib/leagueDocuments";
import { GUIDE_DOCUMENT_TYPES, guidePdfDocument } from "../lib/dashboardGuides";
import { findMembersByEmail, memberEmailResolution } from "../lib/memberLookup";
import { buildActiveDivisionOptions } from "../lib/divisionOptions";

const PLAYER_DOCUMENT_KEYS = new Set([
  "code_of_conduct",
  "league_rules",
  "league_waiver",
]);

const PLAYER_LEAGUE_DOCUMENT_TYPES = LEAGUE_DOCUMENT_TYPES.filter((documentType) =>
  PLAYER_DOCUMENT_KEYS.has(documentType.key)
);

const PLAYER_SELECTED_TEAM_STORAGE_PREFIX = "lwrpc-player-dashboard-selected-team";
const PLAYER_PANEL_SECTION_IDS = {
  history: "player-dashboard-play-history",
  standings: "player-dashboard-division-standings",
  upcoming: "player-dashboard-team-matches",
};
const DASHBOARD_HEADER_BUTTON_3D =
  "rounded-full border border-white/25 bg-gradient-to-b from-white to-slate-200 px-3 py-1 text-xs font-black text-slate-950 shadow-[0_4px_0_rgba(148,163,184,0.9),0_8px_14px_rgba(0,0,0,0.26)] transition hover:-translate-y-0.5 hover:from-white hover:to-blue-100 active:translate-y-1 active:shadow-[0_2px_0_rgba(148,163,184,0.9),0_4px_8px_rgba(0,0,0,0.22)]";
const DASHBOARD_TEAM_TAB_BASE =
  "relative shrink-0 cursor-pointer rounded-t-2xl border px-4 text-left transition duration-150 hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-offset-2 active:translate-y-1";
const DASHBOARD_TEAM_TAB_SELECTED =
  "z-10 border-emerald-500 border-b-emerald-900 bg-gradient-to-b from-emerald-700 to-blue-900 py-3 text-white shadow-[0_7px_0_#064e3b,0_13px_20px_rgba(15,23,42,0.26)] hover:from-emerald-600 hover:to-blue-800 active:shadow-[0_3px_0_#064e3b,0_6px_12px_rgba(15,23,42,0.22)]";
const DASHBOARD_TEAM_TAB_UNSELECTED =
  "border-slate-300 bg-gradient-to-b from-white to-slate-200 py-2 text-slate-800 shadow-[0_5px_0_#cbd5e1,0_10px_16px_rgba(15,23,42,0.14)] hover:border-blue-300 hover:from-blue-50 hover:to-blue-100 active:shadow-[0_2px_0_#cbd5e1,0_5px_10px_rgba(15,23,42,0.12)]";
const DASHBOARD_ACTION_BUTTON_3D =
  "w-full cursor-pointer rounded-xl border border-blue-300 bg-gradient-to-b from-white to-blue-100 px-3 py-3 text-sm font-black text-blue-950 shadow-[0_5px_0_#2563eb,0_10px_16px_rgba(15,23,42,0.18)] transition hover:-translate-y-0.5 hover:from-blue-50 hover:to-blue-200 active:translate-y-1 active:shadow-[0_2px_0_#2563eb,0_5px_10px_rgba(15,23,42,0.16)]";
const DASHBOARD_EMERALD_BUTTON_3D =
  "rounded-xl border border-emerald-300 bg-gradient-to-b from-white to-emerald-100 px-3 py-2 text-xs font-black text-emerald-950 shadow-[0_4px_0_#059669,0_8px_14px_rgba(15,23,42,0.16)] transition hover:-translate-y-0.5 hover:from-emerald-50 hover:to-emerald-200 active:translate-y-1 active:shadow-[0_2px_0_#059669,0_4px_8px_rgba(15,23,42,0.14)] disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:bg-none disabled:text-slate-400 disabled:shadow-none disabled:hover:translate-y-0";

function scrollDashboardSectionIntoView(sectionId) {
  if (!sectionId || typeof window === "undefined") return;

  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      document.getElementById(sectionId)?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  });
}

export default function PlayerDashboardPage() {
  const router = useRouter();
  const playerGuide = GUIDE_DOCUMENT_TYPES.find((guideType) => guideType.key === "player_guide_pdf");
  const [loading, setLoading] = useState(true);
  const [member, setMember] = useState(null);
  const [teams, setTeams] = useState([]);
  const [matchTeamRosters, setMatchTeamRosters] = useState({});
  const [matches, setMatches] = useState([]);
  const [byeWeeks, setByeWeeks] = useState([]);
  const [standings, setStandings] = useState([]);
  const [playHistory, setPlayHistory] = useState([]);
  const [playerRatings, setPlayerRatings] = useState([]);
  const [activePanel, setActivePanel] = useState("history");
  const [selectedPlayerTeamId, setSelectedPlayerTeamId] = useState("");
  const [showPreviousSeasonTeams, setShowPreviousSeasonTeams] = useState(false);
  const [showAllTeamMatches, setShowAllTeamMatches] = useState(false);
  const [mobileStandingsView, setMobileStandingsView] = useState("summary");
  const [openLeagueDocuments, setOpenLeagueDocuments] = useState({});
  const [historyFilter, setHistoryFilter] = useState("all");
  const [pdfDocument, setPdfDocument] = useState(null);
  const [matchDetails, setMatchDetails] = useState(null);
  const [rosterTeam, setRosterTeam] = useState(null);
  const [divisionScheduleTeam, setDivisionScheduleTeam] = useState(null);
  const [divisionScheduleTeams, setDivisionScheduleTeams] = useState([]);
  const [divisionScheduleMatches, setDivisionScheduleMatches] = useState([]);
  const [divisionScheduleByes, setDivisionScheduleByes] = useState([]);
  const [divisionScheduleRatings, setDivisionScheduleRatings] = useState([]);
  const [divisionScheduleLoading, setDivisionScheduleLoading] = useState(false);
  const [activeDivisionOptions, setActiveDivisionOptions] = useState([]);

  const loadData = useCallback(async function loadData() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.email) {
      setLoading(false);
      return;
    }

    const { data: memberRows, error: memberError } = await findMembersByEmail(
      supabase,
      user.email,
      "id, first_name, last_name, email, is_active_member"
    );

    if (memberError) {
      alert(memberError.message);
      setLoading(false);
      return;
    }

    const { selectedMember: memberData } = memberEmailResolution(memberRows);

    setMember(memberData || null);

    if (!memberData?.id) {
      setTeams([]);
      setMatchTeamRosters({});
      setByeWeeks([]);
      setLoading(false);
      return;
    }

    const { data: activeDivisionRows, error: activeDivisionError } = await supabase
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
      `);

    if (activeDivisionError) {
      alert(activeDivisionError.message);
      setLoading(false);
      return;
    }

    setActiveDivisionOptions(buildActiveDivisionOptions(activeDivisionRows || []));

    const { data: rosterData, error: rosterError } = await supabase
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
      .eq("member_id", memberData.id);

    if (rosterError) {
      alert(rosterError.message);
      setLoading(false);
      return;
    }

    const playerTeams = (rosterData || [])
      .map((row) => row.teams)
      .filter(Boolean);
    const teamIds = playerTeams.map((team) => team.id);

    let matchData = [];
    let byeData = [];
    let standingsData = [];
    let historyData = [];
    let rostersByTeamId = {};

    if (teamIds.length > 0) {
      const divisionIds = [...new Set(playerTeams.map((team) => team.divisions?.id).filter(Boolean))];
      const [
        { data, error },
        { data: teamByeRows, error: teamByeError },
        { data: publishedDivisionMatches, error: publishedDivisionMatchesError },
        { data: standingsRows, error: standingsError },
      ] = await Promise.all([
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
          .order("scheduled_time", { ascending: true }),
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
          .order("bye_date", { ascending: true }),
        supabase
          .from("matches")
          .select("id, division_id, week_number, scheduled_date")
          .in("division_id", divisionIds.length > 0 ? divisionIds : ["00000000-0000-0000-0000-000000000000"])
          .eq("is_published", true),
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
          .order("rank", { ascending: true }),
      ]);

      if (error) {
        alert(error.message);
        setLoading(false);
        return;
      }

      if (teamByeError) {
        alert(teamByeError.message);
        setLoading(false);
        return;
      }

      if (publishedDivisionMatchesError) {
        alert(publishedDivisionMatchesError.message);
        setLoading(false);
        return;
      }

      if (standingsError) {
        alert(standingsError.message);
        setLoading(false);
        return;
      }

      matchData = data || [];
      byeData = filterByesForPublishedSchedule(teamByeRows || [], publishedDivisionMatches || []);
      standingsData = standingsRows || [];
      const matchTeamIds = [
        ...new Set(
          [
            ...teamIds,
            ...matchData.flatMap((match) => [match.home_team_id, match.away_team_id]),
          ].filter(Boolean)
        ),
      ];
      const { data: matchRosterRows, error: matchRosterError } = await supabase
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
        .in("team_id", matchTeamIds);

      if (matchRosterError) {
        alert(matchRosterError.message);
        setLoading(false);
        return;
      }

      rostersByTeamId = (matchRosterRows || []).reduce((byTeam, row) => {
        if (!byTeam[row.team_id]) byTeam[row.team_id] = [];
        if (row.members) byTeam[row.team_id].push(row.members);
        return byTeam;
      }, {});
    }

    const { data: playerHistoryData, error: playerHistoryError } = await supabase
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
      );

    if (playerHistoryError) {
      alert(playerHistoryError.message);
      setLoading(false);
      return;
    }

    historyData = playerHistoryData || [];

    const seasonIds = [
      ...new Set(
        [
          ...playerTeams.map((team) => team.divisions?.leagues?.season_id),
          ...historyData.map((row) => row.matches?.leagues?.season_id),
        ].filter(Boolean)
      ),
    ];
    let ratingRows = [];

    if (seasonIds.length > 0) {
      const { data, error } = await supabase
        .from("member_season_ratings")
        .select("member_id, season_id, season_dupr_rating, season_primetime_rating")
        .in("season_id", seasonIds);

      if (error) {
        alert(error.message);
        setLoading(false);
        return;
      }

      ratingRows = data || [];
    }

    setTeams(
      playerTeams.map((team) => ({
        ...team,
        roster: sortRosterMembers(rostersByTeamId[team.id] || []),
        standing: teamStanding(standingsData, team.id),
      }))
    );
    setMatchTeamRosters(
      Object.fromEntries(
        Object.entries(rostersByTeamId).map(([teamId, roster]) => [
          teamId,
          sortRosterMembers(roster),
        ])
      )
    );
    const savedTeamId = readDashboardTeamSelection(
      PLAYER_SELECTED_TEAM_STORAGE_PREFIX,
      memberData.id
    );

    setSelectedPlayerTeamId((current) => {
      if (current && playerTeams.some((team) => String(team.id) === String(current))) {
        return current;
      }

      if (savedTeamId && playerTeams.some((team) => String(team.id) === String(savedTeamId))) {
        return savedTeamId;
      }

      const firstActiveTeam = playerTeams.find((team) => team.is_active !== false);
      return firstActiveTeam?.id || playerTeams[0]?.id || "";
    });
    setMatches(matchData);
    setByeWeeks(byeData);
    setStandings(standingsData);
    setPlayHistory(historyData);
    setPlayerRatings(ratingRows);
    setLoading(false);
  }, []);

  useEffect(() => {
    async function run() {
      const ok = await requireRole(router, "player");
      if (ok) await loadData();
    }

    run();
  }, [loadData, router]);

  const visibleTeams = useMemo(() => {
    return showPreviousSeasonTeams
      ? teams
      : teams.filter((team) => team.is_active !== false);
  }, [showPreviousSeasonTeams, teams]);

  useEffect(() => {
    if (visibleTeams.length === 0) {
      if (selectedPlayerTeamId) setSelectedPlayerTeamId("");
      return;
    }

    const selectedIsVisible = visibleTeams.some(
      (team) => String(team.id) === String(selectedPlayerTeamId)
    );

    if (!selectedIsVisible) {
      setSelectedPlayerTeamId(visibleTeams[0].id);
    }
  }, [selectedPlayerTeamId, visibleTeams]);

  const upcomingMatchesBySelectedTeam = useMemo(() => {
    if (!selectedPlayerTeamId) return [];

    const upcomingMatchCount = matches.filter(
      (match) =>
        match.status !== "completed" &&
        match.status !== "cancelled" &&
        (String(match.home_team_id) === String(selectedPlayerTeamId) ||
          String(match.away_team_id) === String(selectedPlayerTeamId))
    ).length;
    const upcomingByeCount = byeWeeks.filter(
      (bye) =>
        String(bye.team_id) === String(selectedPlayerTeamId) &&
        (!bye.bye_date || bye.bye_date >= localDateString())
    ).length;

    return Array.from({ length: upcomingMatchCount + upcomingByeCount });
  }, [byeWeeks, matches, selectedPlayerTeamId]);

  const selectedCompletedTeamMatchCount = useMemo(() => {
    if (!selectedPlayerTeamId) return 0;

    return matches.filter(
      (match) =>
        match.status === "completed" &&
        (String(match.home_team_id) === String(selectedPlayerTeamId) ||
          String(match.away_team_id) === String(selectedPlayerTeamId))
    ).length;
  }, [matches, selectedPlayerTeamId]);

  const selectedTeamMatches = useMemo(() => {
    if (!selectedPlayerTeamId) return [];

    return matches.filter((match) => {
      const isSelectedTeam =
        String(match.home_team_id) === String(selectedPlayerTeamId) ||
        String(match.away_team_id) === String(selectedPlayerTeamId);

      if (!isSelectedTeam || match.status === "cancelled") return false;
      if (showAllTeamMatches) return true;

      return match.status !== "completed";
    });
  }, [matches, selectedPlayerTeamId, showAllTeamMatches]);

  const selectedTeamScheduleItems = useMemo(() => {
    if (!selectedPlayerTeamId) return [];

    const matchItems = selectedTeamMatches.map((match) => ({
      type: "match",
      key: `match:${match.id}`,
      date: match.scheduled_date,
      time: match.scheduled_time || "00:00",
      data: match,
    }));
    const byeItems = byeWeeks
      .filter((bye) => {
        if (String(bye.team_id) !== String(selectedPlayerTeamId)) return false;
        if (showAllTeamMatches) return true;

        return !bye.bye_date || bye.bye_date >= localDateString();
      })
      .map((bye) => ({
        type: "bye",
        key: `bye:${bye.id}`,
        date: bye.bye_date,
        time: "00:00",
        data: bye,
      }));

    return [...matchItems, ...byeItems].sort(compareScheduleItems);
  }, [byeWeeks, selectedPlayerTeamId, selectedTeamMatches, showAllTeamMatches]);

  const selectedUpcomingTeam = useMemo(() => {
    return teams.find(
      (team) => String(team.id) === String(selectedPlayerTeamId)
    );
  }, [teams, selectedPlayerTeamId]);

  const selectedStandingsTeam = useMemo(() => {
    return teams.find(
      (team) => String(team.id) === String(selectedPlayerTeamId)
    );
  }, [teams, selectedPlayerTeamId]);

  const selectedVisibleTeam = useMemo(() => {
    return visibleTeams.find((team) => String(team.id) === String(selectedPlayerTeamId)) || visibleTeams[0] || null;
  }, [selectedPlayerTeamId, visibleTeams]);

  function selectPlayerTeam(teamId) {
    setSelectedPlayerTeamId(teamId);
    writeDashboardTeamSelection(
      PLAYER_SELECTED_TEAM_STORAGE_PREFIX,
      member?.id,
      teamId
    );
  }

  const selectedDivisionStandings = useMemo(() => {
    if (!selectedStandingsTeam) return [];

    const visibleRows = standings.filter(
      (row) => String(row.division_id) === String(selectedStandingsTeam.divisions?.id)
    );

    return sortStandingsByDivisionRules(visibleRows, selectedStandingsTeam.divisions);
  }, [selectedStandingsTeam, standings]);

  const selectedDivisionPlayoffTeamCount = Number(
    selectedStandingsTeam?.divisions?.playoff_team_count || 0
  );
  const selectedDivisionPlayoffTeamIds = useMemo(() => {
    return new Set(
      selectedDivisionStandings
        .slice(0, selectedDivisionPlayoffTeamCount > 0 ? selectedDivisionPlayoffTeamCount : 0)
        .map((row) => String(row.team_id || row.id))
    );
  }, [selectedDivisionPlayoffTeamCount, selectedDivisionStandings]);

  function isSelectedDivisionPlayoffTeam(row) {
    return selectedDivisionPlayoffTeamIds.has(String(row.team_id || row.id));
  }

  const sortedPlayHistory = useMemo(() => {
    return sortHistoryRows(playHistory);
  }, [playHistory]);

  const playHistoryOptions = useMemo(() => {
    return historyFilterOptions(sortedPlayHistory, teams, member?.id);
  }, [member, sortedPlayHistory, teams]);

  const filteredPlayHistory = useMemo(() => {
    return filterHistoryRows(sortedPlayHistory, historyFilter, member?.id, teams);
  }, [sortedPlayHistory, historyFilter, member, teams]);

  const groupedPlayHistory = useMemo(() => {
    return groupPlayHistoryRows(filteredPlayHistory);
  }, [filteredPlayHistory]);

  const playHistoryStats = useMemo(() => {
    return filteredPlayHistory.reduce(
      (stats, row) => {
        const details = playerLineDetails(row, member?.id);

        stats.games += 1;

        if (!rowCountsForIndividualWinLoss(row) || rowHasSpecialGame(row)) {
          stats.other += 1;
        } else if (details.result === "W") {
          stats.wins += 1;
        } else if (details.result === "L") {
          stats.losses += 1;
        } else {
          stats.ties += 1;
        }

        return stats;
      },
      {
        games: 0,
        wins: 0,
        losses: 0,
        ties: 0,
        other: 0,
      }
    );
  }, [filteredPlayHistory, member]);

  function ratingForMember(memberId, seasonId, ratingType, fallbackMember = null) {
    const ratingRow = playerRatings.find(
      (rating) =>
        String(rating.member_id) === String(memberId) &&
        String(rating.season_id) === String(seasonId)
    );
    const value =
      ratingType === "primetime"
        ? ratingRow?.season_primetime_rating
        : ratingType === "self_rating"
        ? fallbackMember?.self_rating
        : ratingRow?.season_dupr_rating;

    if (value === null || value === undefined || value === "") return "NR";
    const number = Number(value);
    return Number.isNaN(number) ? "NR" : number.toFixed(2);
  }

  function teamWithRoster(teamId) {
    const sourceMatch =
      (String(matchDetails?.home_team?.id || "") === String(teamId) ||
        String(matchDetails?.away_team?.id || "") === String(teamId)) && matchDetails
        ? matchDetails
        : null;
    const team =
      teams.find((item) => String(item.id) === String(teamId)) ||
      (String(matchDetails?.home_team?.id || "") === String(teamId) && matchDetails?.home_team) ||
      (String(matchDetails?.away_team?.id || "") === String(teamId) && matchDetails?.away_team);

    if (!team) return null;

    return {
      ...team,
      divisions: team.divisions || (
        sourceMatch?.divisions
          ? {
              ...sourceMatch.divisions,
              leagues: sourceMatch.leagues || team.leagues,
            }
          : team.divisions
      ),
      roster: sortRosterMembers(matchTeamRosters[team.id] || team.roster || []),
    };
  }

  function playerTeamRecord(teamId, memberId) {
    const record = { wins: 0, losses: 0 };

    matches
      .filter(
        (match) =>
          match.status === "completed" &&
          match.score_status === "verified" &&
          (String(match.home_team_id) === String(teamId) || String(match.away_team_id) === String(teamId))
      )
      .forEach((match) => {
        (match.match_lines || []).forEach((line) => {
          const side = playerLineSide(line, memberId);
          if (!side) return;

          if (!line.winning_team_id) {
            return;
          }

          const won =
            (side === "home" && String(line.winning_team_id) === String(match.home_team_id)) ||
            (side === "away" && String(line.winning_team_id) === String(match.away_team_id));

          if (won) record.wins += 1;
          else record.losses += 1;
        });
      });

    return record;
  }

  function mySelectedTeamRatingSummary() {
    const selectedTeam =
      visibleTeams.find((team) => String(team.id) === String(selectedPlayerTeamId)) ||
      visibleTeams[0];

    if (!selectedTeam) return null;

    const ratingType = selectedTeam.divisions?.rating_type || "dupr";
    const label =
      ratingType === "primetime"
        ? "My Age-Based Rating"
        : ratingType === "self_rating"
          ? "My Self Rating"
          : "My Season DUPR";

    return {
      label,
      value: ratingForMember(
        member?.id,
        selectedTeam.divisions?.leagues?.season_id,
        ratingType,
        member
      ),
    };
  }

  function selectPanel(panel) {
    setActivePanel(panel);

    if ((panel === "standings" || panel === "upcoming") && !selectedPlayerTeamId && visibleTeams.length > 0) {
      setSelectedPlayerTeamId(visibleTeams[0].id);
    }

    if (panel === "standings") {
      setMobileStandingsView("summary");
    }

    scrollDashboardSectionIntoView(PLAYER_PANEL_SECTION_IDS[panel]);
  }

  async function openDivisionScheduleFromStanding(row) {
    const divisionId = selectedStandingsTeam?.division_id || selectedStandingsTeam?.divisions?.id;
    if (!divisionId) return;

    const baseTeam = {
      id: row.team_id,
      name: row.teams?.name || "Team",
      division_id: divisionId,
      divisions: selectedStandingsTeam.divisions,
    };

    await openDivisionScheduleForTeam(baseTeam);
  }

  async function openDivisionScheduleForTeam(team) {
    const divisionId = team?.division_id || team?.divisions?.id;
    if (!divisionId) {
      alert("This team is not assigned to a division.");
      return;
    }

    const baseTeam = {
      ...team,
      division_id: divisionId,
    };

    setDivisionScheduleTeam(baseTeam);
    setDivisionScheduleTeams([]);
    setDivisionScheduleMatches([]);
    setDivisionScheduleByes([]);
    setDivisionScheduleRatings([]);
    setDivisionScheduleLoading(true);

    const seasonId = baseTeam.divisions?.leagues?.season_id;
    const [
      { data: divisionTeams, error: teamsError },
      { data: divisionMatches, error: matchesError },
      { data: divisionByes, error: byesError },
      { data: divisionStandings, error: standingsError },
      { data: divisionRatings, error: ratingsError },
    ] = await Promise.all([
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
        .order("name", { ascending: true }),
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
        .order("scheduled_time", { ascending: true }),
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
        .order("bye_date", { ascending: true }),
      supabase
        .from("team_standings")
        .select("team_id, rank, standings_points, match_wins, match_losses")
        .eq("division_id", divisionId),
      seasonId
        ? supabase
            .from("member_season_ratings")
            .select("member_id, season_dupr_rating, season_primetime_rating")
            .eq("season_id", seasonId)
        : Promise.resolve({ data: [], error: null }),
    ]);

    setDivisionScheduleLoading(false);

    const firstError = teamsError || matchesError || byesError || standingsError || ratingsError;
    if (firstError) {
      alert(firstError.message);
      return;
    }

    const standingsByTeamId = Object.fromEntries(
      (divisionStandings || []).map((standing) => [String(standing.team_id), standing])
    );

    const nextDivisionTeams = (divisionTeams || [])
      .map((team) => ({
        ...team,
        standing: standingsByTeamId[String(team.id)] || null,
      }))
      .sort(compareDivisionScheduleTeams);
    const selectedScheduleTeam =
      nextDivisionTeams.find((divisionTeam) => String(divisionTeam.id) === String(baseTeam.id)) ||
      nextDivisionTeams[0] ||
      baseTeam;

    setDivisionScheduleTeam({
      ...baseTeam,
      ...selectedScheduleTeam,
      division_id: divisionId,
      divisions: baseTeam.divisions,
    });
    setDivisionScheduleTeams(nextDivisionTeams);
    setDivisionScheduleMatches(divisionMatches || []);
    setDivisionScheduleByes(filterByesForPublishedSchedule(divisionByes || [], divisionMatches || []));
    setDivisionScheduleRatings(divisionRatings || []);
  }

  function selectDivisionScheduleDivision(divisionId) {
    const option = activeDivisionOptions.find((division) => String(division.id) === String(divisionId));
    if (option?.division) {
      openDivisionScheduleForTeam({
        name: option.divisionName,
        division_id: option.id,
        divisions: option.division,
      });
    }
  }

  async function openLeagueDocument(team, documentType) {
    const league = team?.divisions?.leagues;
    const path = leagueDocumentPath(league, documentType);

    if (!path) {
      alert(`${documentType.label} is not configured for this league.`);
      return;
    }

    const bucket = league?.league_document_bucket || DEFAULT_LEAGUE_DOCUMENT_BUCKET;
    let documentUrl = "";

    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, 60 * 60);

    if (!error && data?.signedUrl) {
      documentUrl = data.signedUrl;
    } else {
      const publicUrl = supabase.storage.from(bucket).getPublicUrl(path);
      documentUrl = publicUrl.data?.publicUrl || "";
    }

    if (!documentUrl) {
      alert("Unable to open this PDF. Check the Supabase Storage bucket and file path.");
      return;
    }

    setPdfDocument({
      title: documentType.label,
      leagueName: league?.name || "League",
      teamName: team?.name || "Team",
      url: documentUrl,
    });
  }

  if (loading) {
    return <LoadingScreen subtitle="Loading Player Dashboard..." />;
  }

  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-6">
      <div className="mx-auto max-w-7xl">
        <AppHeader
          title="Player Dashboard"
          subtitle="Your league teams, standings, and match access."
          hideSubtitleOnMobile
          welcomeAction={
            <button
              type="button"
              onClick={async () => {
                const document = await guidePdfDocument(supabase, playerGuide);
                if (document) setPdfDocument(document);
              }}
              className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-400"
            >
              Players Guide
            </button>
          }
          actions={
            <div className="grid grid-cols-2 gap-1.5 md:grid-cols-1 md:gap-2">
              <button
                type="button"
                onClick={() => router.push("/reset-password")}
                className="rounded-lg bg-blue-600 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-blue-500 md:rounded-xl md:px-4 md:py-2 md:text-sm"
              >
                Change Password
              </button>

              <a
                href="https://lwrpickleballclub.com/manage-membership"
                target="_blank"
                rel="noreferrer"
                title="This will take you to the Manage Membership website."
                className="hidden rounded-xl bg-white px-4 py-2 text-center text-sm font-bold text-slate-950 hover:bg-slate-100 md:block"
              >
                Membership Info
              </a>

              <a
                href="mailto:info@lwrpickleballclub.com"
                className="rounded-lg bg-emerald-500 px-2.5 py-1.5 text-center text-xs font-bold text-white hover:bg-emerald-400 md:rounded-xl md:px-4 md:py-2 md:text-sm"
              >
                Contact League
              </a>
            </div>
          }
        />

        <section className="overflow-hidden rounded-2xl bg-white shadow">
          <div className="bg-slate-950 px-4 py-5 text-white md:px-6">
            <div className="flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
              <div>
                <div className="text-xs font-black uppercase tracking-wide text-emerald-200">
                  {formatMemberName(member) || "Player"}
                </div>
                <h2 className="mt-1 text-2xl font-black">My Teams</h2>
              </div>
              <div className="flex flex-col gap-2 text-sm font-semibold text-slate-300 md:items-end">
                <div className="flex flex-wrap items-center gap-2 md:justify-end">
                  <button
                    type="button"
                    onClick={() => selectPanel("history")}
                    className={`cursor-pointer rounded-xl border px-3 py-2 text-xs font-black shadow-[0_4px_0_rgba(30,64,175,0.7),0_8px_14px_rgba(0,0,0,0.25)] transition hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-offset-2 focus:ring-offset-slate-950 active:translate-y-1 active:shadow-[0_2px_0_rgba(30,64,175,0.7),0_4px_8px_rgba(0,0,0,0.22)] ${
                      activePanel === "history"
                        ? "border-blue-300 bg-gradient-to-b from-blue-500 to-blue-700 text-white hover:from-blue-400 hover:to-blue-600"
                        : "border-blue-200 bg-gradient-to-b from-white to-blue-100 text-blue-950 hover:from-blue-50 hover:to-blue-200"
                    }`}
                  >
                    My Play History
                    <span className={`ml-2 rounded-lg px-2 py-0.5 ${activePanel === "history" ? "bg-white/20" : "bg-white"}`}>
                      {filteredPlayHistory.length}
                    </span>
                  </button>
                  <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-bold text-slate-200">
                    {visibleTeams.length} team{visibleTeams.length === 1 ? "" : "s"}
                  </span>
                  {mySelectedTeamRatingSummary() && (
                    <span className="rounded-full border border-emerald-300/30 bg-emerald-300/15 px-3 py-1.5 text-xs font-bold text-emerald-100">
                      {mySelectedTeamRatingSummary().label}: {mySelectedTeamRatingSummary().value}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowPreviousSeasonTeams((value) => !value)}
                    className={DASHBOARD_HEADER_BUTTON_3D}
                  >
                    {showPreviousSeasonTeams ? "Show Active Teams" : "Show Previous Seasons Teams"}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4 p-4 md:p-5">
            {visibleTeams.length > 1 && (
              <DashboardTeamSelector
                teams={visibleTeams}
                selectedTeamId={selectedPlayerTeamId}
                onSelect={selectPlayerTeam}
              />
            )}

            {selectedVisibleTeam && (
              <TeamCard
                key={selectedVisibleTeam.id}
                team={selectedVisibleTeam}
                selected={String(selectedVisibleTeam.id) === String(selectedPlayerTeamId)}
                documentsOpen={openLeagueDocuments[selectedVisibleTeam.id] === true}
                onToggleDocuments={() =>
                  setOpenLeagueDocuments((current) => ({
                    ...current,
                    [selectedVisibleTeam.id]: !current[selectedVisibleTeam.id],
                  }))
                }
                onOpenDocument={openLeagueDocument}
                onOpenRoster={setRosterTeam}
                onOpenStandings={(team) =>
                  openDivisionScheduleForTeam(team)
                }
                onOpenDivisionStandings={() => {
                  if (visibleTeams.length === 0) {
                    router.push("/standings");
                    return;
                  }

                  selectPanel("standings");
                }}
                onOpenTeamMatches={() => selectPanel("upcoming")}
                standingsCount={selectedDivisionStandings.length}
                teamMatchesCount={upcomingMatchesBySelectedTeam.length}
              />
            )}

            {visibleTeams.length === 0 && (
              <div className="rounded-xl bg-slate-50 px-4 py-3 text-slate-500">
                {teams.length === 0
                  ? "You are not currently listed on any team rosters."
                  : "No active teams are currently shown. Use Previous Seasons Teams to view older teams."}
              </div>
            )}
          </div>

        </section>

        <LoginMessageModal
          templateKey="player_login_popup"
          audienceLabel="Player Message"
        />

        {activePanel === "standings" && (
          <div id={PLAYER_PANEL_SECTION_IDS.standings} className="mt-6 scroll-mt-32 overflow-hidden rounded-2xl bg-white shadow">
            <div className="flex flex-col gap-2 bg-gradient-to-r from-emerald-700 to-teal-700 p-6 text-white md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-xs font-black uppercase tracking-wide text-emerald-100">
                  Division Table
                </div>
                <h2 className="mt-1 text-xl font-black">
                  Division Standings: {selectedStandingsTeam?.divisions?.name || "Division"}
                </h2>
                <p className="mt-1 text-sm font-semibold text-emerald-50">
                {selectedStandingsTeam?.divisions?.leagues?.name || ""}
                </p>
              </div>

              <div className="flex flex-col gap-2 md:flex-row md:items-center">
                <TeamSelect
                  value={selectedPlayerTeamId}
                  onChange={setSelectedPlayerTeamId}
                  teams={visibleTeams}
                  label="Choose team for standings"
                />
                <div className="rounded-xl bg-white/15 px-4 py-2 text-center text-sm font-bold text-white">
                  {selectedDivisionStandings.length}
                </div>
              </div>
            </div>

            <div className="p-4 md:hidden">
              {selectedDivisionPlayoffTeamCount > 0 && (
                <div className="mb-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-950">
                  Top {selectedDivisionPlayoffTeamCount} teams highlighted for Playoffs/Championship Day. Click on Team Name to see detailed schedule/matches.
                </div>
              )}
              <div className="mb-3 inline-grid w-full grid-cols-2 overflow-hidden rounded-xl border border-slate-300 bg-white p-1 text-xs font-black shadow-sm">
                <button
                  type="button"
                  onClick={() => setMobileStandingsView("summary")}
                  className={`rounded-lg px-3 py-2 ${
                    mobileStandingsView === "summary"
                      ? "bg-emerald-700 text-white"
                      : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  Summary
                </button>
                <button
                  type="button"
                  onClick={() => setMobileStandingsView("detail")}
                  className={`rounded-lg px-3 py-2 ${
                    mobileStandingsView === "detail"
                      ? "bg-emerald-700 text-white"
                      : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  Details
                </button>
              </div>
              <div className="space-y-3">
                {selectedDivisionStandings.map((row, index) => {
                  const displayRank = index + 1;

                  return (
                  <button
                    key={row.id}
                    type="button"
                    onClick={() => openDivisionScheduleFromStanding(row)}
                    className={`w-full rounded-xl border p-4 text-left shadow-sm ${
                      String(row.team_id) === String(selectedPlayerTeamId)
                        ? "border-emerald-300 bg-emerald-50"
                        : isSelectedDivisionPlayoffTeam(row)
                        ? "border-emerald-200 bg-emerald-50"
                        : "border-slate-200 bg-white"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-xs font-black uppercase tracking-wide text-emerald-700">
                          Rank #{displayRank}
                        </div>
                        <div className="mt-1 font-black text-slate-950">{row.teams?.name}</div>
                      </div>
                      <div className="rounded-xl bg-emerald-100 px-3 py-1 text-sm font-black text-emerald-900">
                        {row.standings_points} pts
                      </div>
                    </div>
                    {mobileStandingsView === "detail" && (
                      <div className="mt-3 grid grid-cols-2 gap-2 text-sm font-semibold text-slate-700">
                        <span className="rounded-lg bg-slate-50 px-3 py-2">W-L: {row.match_wins}-{row.match_losses}</span>
                        <span className="rounded-lg bg-slate-50 px-3 py-2">Games: {row.game_wins}-{row.game_losses}</span>
                        <span className="rounded-lg bg-slate-50 px-3 py-2">PF: {row.points_for}</span>
                        <span className="rounded-lg bg-slate-50 px-3 py-2">PA: {row.points_against}</span>
                      </div>
                    )}
                  </button>
                  );
                })}
              </div>
            </div>

            <div className="hidden overflow-x-auto md:block">
              {selectedDivisionPlayoffTeamCount > 0 && (
                <div className="border-b border-emerald-200 bg-emerald-50 px-5 py-3 text-sm font-bold text-emerald-950">
                  Top {selectedDivisionPlayoffTeamCount} teams highlighted for Playoffs/Championship Day. Click on Team Name to see detailed schedule/matches.
                </div>
              )}
              <table className="w-full border-collapse text-sm">
                <thead className="bg-slate-900 text-xs uppercase tracking-wide text-white">
                  <tr>
                    <th className="p-3 text-left">Rank</th>
                    <th className="p-3 text-left">Team</th>
                    <th className="p-3 text-left">W-L</th>
                    <th className="p-3 text-left">Games</th>
                    <th className="p-3 text-left">PF</th>
                    <th className="p-3 text-left">PA</th>
                    <th className="p-3 text-left">Diff</th>
                    <th className="p-3 text-left">Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedDivisionStandings.map((row, index) => {
                    const displayRank = index + 1;

                    return (
                    <tr
                      key={row.id}
                      onClick={() => openDivisionScheduleFromStanding(row)}
                      className={`cursor-pointer border-b border-slate-100 ${
                        String(row.team_id) === String(selectedPlayerTeamId) || isSelectedDivisionPlayoffTeam(row)
                          ? "bg-emerald-50 hover:bg-emerald-100"
                          : "hover:bg-slate-50"
                      }`}
                    >
                      <td className="p-3 font-bold">
                        <span className={isSelectedDivisionPlayoffTeam(row) ? "rounded-full bg-emerald-700 px-2 py-1 text-white" : ""}>
                          #{displayRank}
                        </span>
                      </td>
                      <td className="p-3 font-semibold">
                        {row.teams?.name}
                      </td>
                      <td className="p-3">{row.match_wins}-{row.match_losses}</td>
                      <td className="p-3">{row.game_wins}-{row.game_losses}</td>
                      <td className="p-3">{row.points_for}</td>
                      <td className="p-3">{row.points_against}</td>
                      <td className="p-3">{row.point_differential}</td>
                      <td className="p-3 font-bold text-emerald-700">{row.standings_points}</td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>

              {selectedDivisionStandings.length === 0 && (
                <div className="p-6 text-center text-slate-500">
                  No standings found for this division yet.
                </div>
              )}
            </div>
          </div>
        )}

        {activePanel === "upcoming" && (
          <div id={PLAYER_PANEL_SECTION_IDS.upcoming} className="mt-6 scroll-mt-32 overflow-hidden rounded-2xl bg-white shadow">
            <div className="flex flex-col gap-2 bg-gradient-to-r from-slate-700 to-zinc-700 p-6 text-white md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-xs font-black uppercase tracking-wide text-slate-200">
                  Match Calendar
                </div>
                <h2 className="mt-1 text-xl font-black">
                  {showAllTeamMatches ? "All Matches" : "Upcoming Matches"}: {selectedUpcomingTeam?.name || "Team"}
                </h2>
                <p className="mt-1 text-sm font-semibold text-slate-200">
                  {selectedUpcomingTeam?.divisions?.leagues?.name || ""} / {selectedUpcomingTeam?.divisions?.name || ""}
                </p>
              </div>

              <div className="grid w-full grid-cols-2 gap-2 rounded-xl border border-white/20 bg-white/10 p-1 text-xs font-black sm:w-auto md:text-sm">
                <button
                  type="button"
                  onClick={() => setShowAllTeamMatches(false)}
                  className={`rounded-lg px-3 py-2 text-center ${
                    !showAllTeamMatches
                      ? "bg-white text-slate-950 shadow-sm"
                      : "text-white hover:bg-white/15"
                  }`}
                >
                  Upcoming Only ({upcomingMatchesBySelectedTeam.length})
                </button>
                <button
                  type="button"
                  onClick={() => setShowAllTeamMatches(true)}
                  className={`rounded-lg px-3 py-2 text-center ${
                    showAllTeamMatches
                      ? "bg-white text-slate-950 shadow-sm"
                      : "text-white hover:bg-white/15"
                  }`}
                >
                  Show Completed Matches ({selectedCompletedTeamMatchCount})
                </button>
              </div>
            </div>

            <div className="space-y-3 p-5">
              {selectedTeamScheduleItems.map((item) =>
                item.type === "bye" ? (
                  <ByeSummaryCard key={item.key} bye={item.data} />
                ) : (
                  <MatchSummaryCard
                    key={item.key}
                    match={item.data}
                    selectedTeamId={selectedPlayerTeamId}
                    standings={standings}
                    onOpenDetails={setMatchDetails}
                  />
                )
              )}

              {selectedTeamScheduleItems.length === 0 && (
                <div className="rounded-xl bg-slate-50 p-6 text-center text-slate-500">
                  {showAllTeamMatches ? "No matches found for this team." : "No upcoming matches found for this team."}
                </div>
              )}
            </div>
          </div>
        )}

        {activePanel === "history" && (
        <div id={PLAYER_PANEL_SECTION_IDS.history} className="mt-6 scroll-mt-32 overflow-hidden rounded-2xl bg-white shadow">
          <div className="flex flex-col gap-3 bg-gradient-to-r from-blue-700 to-indigo-700 p-6 text-white md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-xs font-black uppercase tracking-wide text-blue-100">
                Match Results
              </div>
              <h2 className="mt-1 text-xl font-black">My Play History</h2>
            </div>

            <label className="w-full md:w-96">
              <span className="mb-1 block text-xs font-black uppercase tracking-wide text-blue-100">
                Play History Scope
              </span>
              <select
                value={historyFilter}
                onChange={(e) => setHistoryFilter(e.target.value)}
                className="w-full rounded-xl border border-white/40 bg-white px-4 py-2.5 text-sm font-bold text-slate-950 shadow-sm"
                aria-label="Filter play history by dashboard scope"
              >
                <option value="all">All Seasons/All Teams</option>
                {playHistoryOptions.seasons.length > 0 && (
                  <optgroup label="Seasons">
                    {playHistoryOptions.seasons.map((season) => (
                      <option key={season.id} value={`season:${season.id}`}>
                        {season.name}
                      </option>
                    ))}
                  </optgroup>
                )}
                {playHistoryOptions.leagues.length > 0 && (
                  <optgroup label="Leagues">
                    {playHistoryOptions.leagues.map((league) => (
                      <option key={league.id} value={`league:${league.id}`}>
                        {league.name}{league.seasonName ? ` / ${league.seasonName}` : ""}
                      </option>
                    ))}
                  </optgroup>
                )}
                {playHistoryOptions.divisions.length > 0 && (
                  <optgroup label="Divisions">
                    {playHistoryOptions.divisions.map((division) => (
                      <option key={division.id} value={`division:${division.id}`}>
                        {division.name}{division.leagueName ? ` / ${division.leagueName}` : ""}
                      </option>
                    ))}
                  </optgroup>
                )}
                {playHistoryOptions.teams.length > 0 && (
                  <optgroup label="Teams">
                    {playHistoryOptions.teams.map((team) => (
                      <option key={team.id} value={`team:${team.id}`}>
                        {historyTeamOptionLabel(team)}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 md:grid-cols-4 md:gap-3 md:p-5">
            <HistoryStat label="Games Played" value={playHistoryStats.games} tone="slate" />
            <HistoryStat label="Wins" value={playHistoryStats.wins} tone="emerald" />
            <HistoryStat label="Losses" value={playHistoryStats.losses} tone="red" />
            <HistoryStat label="Other" value={playHistoryStats.other} tone="amber" />
          </div>

          <div className="space-y-3 p-5">
            {groupedPlayHistory.map((group) => (
              <PlayerHistoryMatchGroup
                key={group.key}
                group={group}
                memberId={member?.id}
                ratingForMember={ratingForMember}
              />
            ))}

            {filteredPlayHistory.length === 0 && (
              <div className="rounded-xl bg-slate-50 p-6 text-center text-slate-500">
                No game play history found.
              </div>
            )}
          </div>
        </div>
        )}

        {pdfDocument && (
          <PdfViewerModal
            document={pdfDocument}
            onClose={() => setPdfDocument(null)}
          />
        )}

        {matchDetails && (
          <MatchDetailsModal
            match={matchDetails}
            standings={standings}
            ratingForMember={ratingForMember}
            teamWithRoster={teamWithRoster}
            onOpenRoster={setRosterTeam}
            onClose={() => setMatchDetails(null)}
          />
        )}

        {rosterTeam && (
          <RosterModal
            team={rosterTeam}
            ratingForMember={ratingForMember}
            playerRecordForTeam={playerTeamRecord}
            onClose={() => setRosterTeam(null)}
          />
        )}

        {divisionScheduleTeam && (
          <TeamScheduleModal
            title="Division Team Schedules"
            subtitle={`${divisionScheduleTeam.divisions?.leagues?.name || "League"} / ${divisionScheduleTeam.divisions?.name || "Division"}`}
            divisionOptions={activeDivisionOptions}
            selectedDivisionId={divisionScheduleTeam.divisions?.id || divisionScheduleTeam.division_id}
            onSelectDivision={selectDivisionScheduleDivision}
            teams={divisionScheduleTeams}
            selectedTeamId={divisionScheduleTeam.id}
            onSelectTeam={(team) =>
              setDivisionScheduleTeam({
                ...divisionScheduleTeam,
                ...team,
              })
            }
            matches={divisionScheduleMatches}
            byes={divisionScheduleByes}
            ratings={divisionScheduleRatings}
            ratingType={divisionScheduleTeam.divisions?.rating_type || "dupr"}
            loading={divisionScheduleLoading}
            compact
            onClose={() => {
              setDivisionScheduleTeam(null);
              setDivisionScheduleTeams([]);
              setDivisionScheduleMatches([]);
              setDivisionScheduleByes([]);
              setDivisionScheduleRatings([]);
            }}
          />
        )}
      </div>
    </main>
  );
}

function DashboardTeamSelector({ teams, selectedTeamId, onSelect }) {
  return (
    <div className="relative -mb-4">
      <div className="overflow-x-auto px-2 pt-1" role="tablist" aria-label="Select team">
        <div className="flex min-w-max items-end gap-1 pr-12">
          {teams.map((team) => {
            const selected = String(team.id) === String(selectedTeamId);
            const standing = team.standing;

            return (
              <button
                key={team.id}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => onSelect(team.id)}
                className={`${DASHBOARD_TEAM_TAB_BASE} ${
                  selected ? DASHBOARD_TEAM_TAB_SELECTED : DASHBOARD_TEAM_TAB_UNSELECTED
                }`}
              >
                <div className="max-w-52 truncate text-sm font-black">{team.name}</div>
                <div className={`mt-0.5 text-xs font-bold ${selected ? "text-blue-100" : "text-slate-500"}`}>
                  Rank #{standing?.rank || "N/A"}
                </div>
              </button>
            );
          })}
        </div>
      </div>
      {teams.length > 2 && (
        <div
          className="pointer-events-none absolute inset-y-1 right-0 flex w-14 items-center justify-end bg-gradient-to-l from-white via-white/90 to-transparent pr-2 md:hidden"
          aria-hidden="true"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/95 shadow ring-1 ring-slate-200">
            <span className="h-2.5 w-2.5 rotate-45 border-r-2 border-t-2 border-slate-700" />
          </span>
        </div>
      )}
    </div>
  );
}

function dashboardTeamSelectionKey(prefix, memberId) {
  return `${prefix}:${memberId || "unknown"}`;
}

function readDashboardTeamSelection(prefix, memberId) {
  if (!memberId || typeof window === "undefined") return "";
  return window.localStorage.getItem(dashboardTeamSelectionKey(prefix, memberId)) || "";
}

function writeDashboardTeamSelection(prefix, memberId, teamId) {
  if (!memberId || typeof window === "undefined") return;

  if (teamId) {
    window.localStorage.setItem(dashboardTeamSelectionKey(prefix, memberId), teamId);
  } else {
    window.localStorage.removeItem(dashboardTeamSelectionKey(prefix, memberId));
  }
}

function HistoryStat({ label, value, tone = "slate" }) {
  const tones = {
    slate: "bg-slate-950 text-white",
    emerald: "bg-emerald-600 text-white",
    red: "bg-rose-600 text-white",
    amber: "bg-amber-400 text-slate-950",
  };
  const labelClass = tone === "amber" ? "text-slate-800" : "text-white/75";

  return (
    <div className={`rounded-xl p-2.5 shadow-sm sm:p-4 ${tones[tone] || tones.slate}`}>
      <div className={`text-[10px] font-bold uppercase leading-tight tracking-wide sm:text-xs ${labelClass}`}>
        {label}
      </div>
      <div className="mt-0.5 text-xl font-black sm:mt-1 sm:text-2xl">{value}</div>
    </div>
  );
}

function TeamCard({
  team,
  selected,
  documentsOpen,
  onToggleDocuments,
  onOpenDocument,
  onOpenRoster,
  onOpenStandings,
  onOpenDivisionStandings,
  onOpenTeamMatches,
  standingsCount,
  teamMatchesCount,
}) {
  const standing = team.standing;
  const captainContacts = teamCaptainContacts(team);
  const playerCount = team.roster?.length || 0;

  return (
    <div
      className={`overflow-hidden rounded-2xl border text-sm shadow-md ${
        selected ? "border-4 border-emerald-500 bg-blue-50" : "border-slate-200 bg-white"
      }`}
    >
      <div className={`p-4 ${selected ? "bg-gradient-to-r from-emerald-800 to-blue-800 text-white" : "bg-white text-slate-950"}`}>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <div className="text-lg font-black">{team.name}</div>
            <div className={`mt-1 text-sm font-semibold ${selected ? "text-blue-100" : "text-slate-600"}`}>
              {team.divisions?.leagues?.name || "League"} / {team.divisions?.name || "Division"}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onOpenStandings(team);
              }}
              className="cursor-pointer rounded-xl border border-blue-300 bg-gradient-to-b from-sky-400 to-blue-800 px-4 py-2 text-xs font-black uppercase tracking-wide text-white shadow-[0_5px_0_#1e3a8a,0_10px_18px_rgba(15,23,42,0.25)] transition hover:-translate-y-0.5 hover:from-sky-300 hover:to-blue-700 active:translate-y-1 active:shadow-[0_2px_0_#1e3a8a,0_5px_10px_rgba(15,23,42,0.22)]"
            >
              Rank #{standing?.rank || "N/A"}
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs font-bold text-slate-700">
          <span className="rounded-xl bg-white px-2 py-2 shadow-sm">
            <span className="block text-[11px] font-black uppercase leading-tight tracking-wide text-slate-700">Players</span>
            {playerCount}
          </span>
          <span className="rounded-xl bg-white px-2 py-2 shadow-sm">
            <span className="block text-[11px] font-black uppercase leading-tight tracking-wide text-slate-700">Season Points</span>
            {standing?.standings_points ?? 0}
          </span>
          <span className="rounded-xl bg-white px-2 py-2 shadow-sm">
            <span className="block text-[11px] font-black uppercase leading-tight tracking-wide text-slate-700">W-L</span>
            {standing?.match_wins ?? 0}-{standing?.match_losses ?? 0}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 border-t border-slate-100 p-4 sm:grid-cols-3">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onOpenRoster(team);
          }}
          className={DASHBOARD_ACTION_BUTTON_3D}
        >
          Team Roster
        </button>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onOpenDivisionStandings();
          }}
          className={DASHBOARD_ACTION_BUTTON_3D}
        >
          Division Standings
          <span className="ml-2 rounded-lg bg-white px-2 py-0.5 text-xs">
            {standingsCount}
          </span>
        </button>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onOpenTeamMatches();
          }}
          className={DASHBOARD_ACTION_BUTTON_3D}
        >
          Team Matches
          <span className="ml-2 rounded-lg bg-white px-2 py-0.5 text-xs">
            {teamMatchesCount}
          </span>
        </button>
      </div>

      {captainContacts.length > 0 && (
        <div className={`grid grid-cols-1 gap-2 px-4 pb-4 text-xs text-slate-600 sm:grid-cols-3 ${selected ? "bg-blue-50" : "bg-white"}`}>
          {captainContacts.map((contact) => (
            <a
              key={contact.label}
              href={contact.email ? `mailto:${contact.email}` : undefined}
              title={contact.email ? `Send an email to ${contact.name || contact.label}.` : "No email address on file."}
              onClick={(event) => event.stopPropagation()}
              className={`rounded-xl bg-white px-3 py-2 shadow-sm transition ${
                contact.email ? "hover:-translate-y-0.5 hover:bg-blue-50 hover:shadow-md" : "cursor-default"
              }`}
            >
              <div className="font-bold text-slate-900">{contact.label}</div>
              <div>{contact.name}</div>
              {contact.phone && <div>{contact.phone}</div>}
            </a>
          ))}
        </div>
      )}
      <div className="border-t border-blue-100 bg-gradient-to-r from-blue-50 via-cyan-50 to-slate-50">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onToggleDocuments();
          }}
          className="flex w-full items-center justify-between px-4 py-3 text-left text-xs font-black uppercase tracking-wide text-blue-950 transition hover:-translate-y-0.5 hover:bg-white/50 active:translate-y-1"
        >
          <span className="rounded-full border border-blue-300 bg-gradient-to-b from-sky-400 to-blue-800 px-3 py-1 text-white shadow-[0_4px_0_#1e3a8a,0_8px_14px_rgba(15,23,42,0.18)]">
            League Documents
          </span>
          <span className="rounded-full border border-slate-200 bg-gradient-to-b from-white to-slate-100 px-3 py-1 text-blue-900 shadow-[0_3px_0_#cbd5e1,0_6px_10px_rgba(15,23,42,0.14)]">
            {documentsOpen ? "Hide" : "Show"}
          </span>
        </button>

        {documentsOpen && (
          <div className="grid grid-cols-1 gap-2 px-4 pb-4 sm:grid-cols-3">
            <LmsInstallButton compact />
            {PLAYER_LEAGUE_DOCUMENT_TYPES.map((documentType) => {
              const hasDocument = Boolean(leagueDocumentPath(team.divisions?.leagues, documentType));

              return (
                <button
                  key={documentType.key}
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onOpenDocument(team, documentType);
                  }}
                  disabled={!hasDocument}
                  className={DASHBOARD_EMERALD_BUTTON_3D}
                >
                  {documentType.label}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function RosterModal({ team, ratingForMember, playerRecordForTeam, onClose }) {
  const [mobileRosterView, setMobileRosterView] = useState("summary");
  const roster = team.roster || [];
  const seasonId = team.divisions?.leagues?.season_id;
  const ratingType = team.divisions?.rating_type || "dupr";
  const ratingLabel = rosterRatingLabel(ratingType);
  const hidePlayerContacts = team.hidePlayerContacts === true;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-2 sm:p-4">
      <div className="flex max-h-[94dvh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex flex-col gap-3 bg-gradient-to-r from-slate-950 to-blue-800 px-4 py-4 text-white md:flex-row md:items-start md:justify-between">
          <div>
            <div className="text-xs font-black uppercase tracking-wide text-blue-100">
              Team Roster
            </div>
            <h2 className="mt-1 text-xl font-black sm:text-2xl">{team.name}</h2>
            <div className="mt-1 text-sm font-semibold text-blue-100">
              {team.divisions?.leagues?.name || ""} / {team.divisions?.name || ""}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-slate-950 shadow-sm hover:bg-slate-100"
          >
            Close
          </button>
        </div>

        <div className="overflow-auto p-3 sm:p-5">
          <div className="mb-3 inline-grid w-full grid-cols-2 overflow-hidden rounded-xl border border-slate-300 bg-white p-1 text-xs font-black shadow-sm md:hidden">
            <button
              type="button"
              onClick={() => setMobileRosterView("summary")}
              className={`rounded-lg px-3 py-2 ${
                mobileRosterView === "summary"
                  ? "bg-blue-700 text-white"
                  : "text-slate-700 hover:bg-slate-100"
              }`}
            >
              Summary
            </button>
            <button
              type="button"
              onClick={() => setMobileRosterView("detail")}
              className={`rounded-lg px-3 py-2 ${
                mobileRosterView === "detail"
                  ? "bg-blue-700 text-white"
                  : "text-slate-700 hover:bg-slate-100"
              }`}
            >
              Details
            </button>
          </div>
          <div className="space-y-2 md:hidden">
            {roster.map((player) => {
              const phone = formatPhoneNumberForStorage(player.phone);
              const playerName = formatMemberName(player);
              return (
                <div key={player.id} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                  <div className="break-words font-black text-slate-950">
                    {!hidePlayerContacts && player.email ? (
                      <a href={`mailto:${player.email}`} className="text-blue-800 underline decoration-blue-300 underline-offset-2 hover:text-blue-950">
                        {playerName}
                      </a>
                    ) : (
                      playerName
                    )}
                    {!hidePlayerContacts && (
                      <span className="font-semibold text-slate-700">
                        {" - "}
                        {phone || "No phone on file"}
                      </span>
                    )}
                  </div>
                  {mobileRosterView === "detail" && (
                    <>
                      <div className="mt-2 text-sm font-bold text-blue-900">
                        {ratingLabel}: {ratingForMember(player.id, seasonId, ratingType, player)}
                      </div>
                      <div className="mt-1 text-sm font-semibold text-slate-700">
                        Record: {formatPlayerRecord(playerRecordForTeam(team.id, player.id))}
                      </div>
                      {!hidePlayerContacts && (
                        <div className="mt-1 break-words text-sm text-slate-700">{player.email || ""}</div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
            {roster.length === 0 && (
              <div className="rounded-xl bg-slate-50 p-6 text-center text-slate-500">
                No roster players found.
              </div>
            )}
          </div>

          <table className="hidden w-full border-collapse text-sm md:table">
            <thead className="bg-slate-900 text-xs uppercase tracking-wide text-white">
              <tr>
                <th className="p-3 text-left">Player</th>
                <th className="p-3 text-left">{ratingLabel}</th>
                <th className="p-3 text-left">Season Record</th>
                {!hidePlayerContacts && (
                  <>
                    <th className="p-3 text-left">Email</th>
                    <th className="p-3 text-left">Phone</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {roster.map((player) => (
                <tr key={player.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="p-3 font-bold text-slate-900">
                    {!hidePlayerContacts && player.email ? (
                      <a href={`mailto:${player.email}`} className="text-blue-800 underline decoration-blue-300 underline-offset-2 hover:text-blue-950">
                        {formatMemberName(player)}
                      </a>
                    ) : (
                      formatMemberName(player)
                    )}
                  </td>
                  <td className="p-3 font-bold text-blue-900">
                    {ratingForMember(player.id, seasonId, ratingType, player)}
                  </td>
                  <td className="p-3 font-semibold text-slate-700">
                    {formatPlayerRecord(playerRecordForTeam(team.id, player.id))}
                  </td>
                  {!hidePlayerContacts && (
                    <>
                      <td className="p-3 text-slate-700">{player.email || ""}</td>
                      <td className="p-3 text-slate-700">
                        {formatPhoneNumberForStorage(player.phone) || ""}
                      </td>
                    </>
                  )}
                </tr>
              ))}

              {roster.length === 0 && (
                <tr>
                  <td colSpan={hidePlayerContacts ? 3 : 5} className="p-8 text-center text-slate-500">
                    No roster players found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function rosterRatingLabel(ratingType) {
  if (ratingType === "primetime") return "Age-Based Rating";
  return "Season DUPR Rating";
}

function PdfViewerModal({ document, onClose }) {
  const [viewerReady, setViewerReady] = useState(false);

  useEffect(() => {
    setViewerReady(true);
  }, []);

  function printDocument() {
    const printWindow = window.open(document.url, "_blank", "width=1000,height=800");

    if (!printWindow) {
      alert("Unable to open the PDF for printing. Please allow popups for this site.");
      return;
    }

    printWindow.focus();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
      <div className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-950 px-5 py-4 text-white md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-xs font-black uppercase tracking-wide text-emerald-200">
              {document.leagueName} / {document.teamName}
            </div>
            <h2 className="mt-1 text-2xl font-black">{document.title}</h2>
          </div>

          <div className="flex flex-wrap gap-2">
            <a
              href={document.url}
              target="_blank"
              rel="noreferrer"
              download
              className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-slate-950 hover:bg-slate-100"
            >
              Download
            </a>

            <button
              type="button"
              onClick={printDocument}
              className="rounded-xl bg-white/10 px-4 py-2 text-sm font-bold text-white hover:bg-white/20"
            >
              Print
            </button>

            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-white/10 px-4 py-2 text-sm font-bold text-white hover:bg-white/20"
            >
              Close
            </button>
          </div>
        </div>

        {viewerReady ? (
          <iframe
            title={document.title}
            src={document.url}
            className="h-[75vh] w-full bg-slate-100"
          />
        ) : (
          <div className="flex h-[75vh] items-center justify-center bg-slate-100 text-sm font-semibold text-slate-600">
            Loading PDF viewer...
          </div>
        )}
      </div>
    </div>
  );
}

function teamCaptainContacts(team) {
  return [
    { label: "Captain", member: team.captain },
    { label: "Co-Captain 1", member: team.co_captain_1 },
    { label: "Co-Captain 2", member: team.co_captain_2 },
    { label: "Club Pro", member: team.club_pro },
  ]
    .filter((item) => item.member)
    .map((item) => ({
      label: item.label,
      name: formatMemberName(item.member),
      phone: formatPhoneNumberForStorage(item.member?.phone),
      email: item.member?.email || "",
    }));
}

function formatMemberName(member) {
  if (!member) return "";
  return `${member.first_name || ""} ${member.last_name || ""}`.trim() || member.email || "";
}

function sortRosterMembers(members) {
  return [...members].sort((a, b) => {
    const lastCompare = (a.last_name || "").localeCompare(b.last_name || "");
    if (lastCompare !== 0) return lastCompare;
    return (a.first_name || "").localeCompare(b.first_name || "");
  });
}

function TeamSelect({ value, onChange, teams, label }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 md:min-w-64"
      aria-label={label}
    >
      <option value="">Select Team</option>
      {teams.map((team) => (
        <option key={team.id} value={team.id}>
          {team.name}
        </option>
      ))}
    </select>
  );
}

function MatchSummaryCard({ match, selectedTeamId, onOpenDetails }) {
  const homeScore = matchTeamScore(match, "home");
  const awayScore = matchTeamScore(match, "away");
  const isVerifiedCompleted = match.status === "completed" && match.score_status === "verified";
  const hasVerifiedMatchScore = isVerifiedCompleted && homeScore !== null && awayScore !== null;
  const hasCompletedMatchScore = match.status === "completed" && homeScore !== null && awayScore !== null;
  const hasScoreStatus = Boolean(match.score_status && match.score_status !== "not_entered");
  const showScoreStatusBlock = hasScoreStatus || hasCompletedMatchScore;
  const selectedResult = selectedTeamMatchResult(match, selectedTeamId);
  const isMatchScheduled = Boolean(match.scheduled_date);
  const headingClass =
    selectedResult === "win"
      ? "bg-gradient-to-r from-emerald-700 to-green-700"
      : selectedResult === "loss"
        ? "bg-gradient-to-r from-rose-700 to-red-700"
        : "bg-gradient-to-r from-blue-800 to-indigo-800";

  return (
    <div className="overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className={`${headingClass} px-4 py-4 text-white`}>
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(12rem,18rem)] md:items-start">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-xs font-black uppercase tracking-wide">
              <span className="rounded-full border border-white/25 bg-white/15 px-3 py-1 text-white shadow-sm">
                Week {match.week_number || "-"}
              </span>
              {!isMatchScheduled && (
                <span className="rounded-full bg-white px-3 py-1 text-[10px] font-black text-slate-950 shadow-sm">
                  Not Scheduled
                </span>
              )}
            </div>
            <div className="mt-2 text-lg font-black leading-tight text-white">
              {formatDate(match.scheduled_date)} at {formatDisplayTime(match.scheduled_time, "Time TBD")}
            </div>
            <div className="mt-1 text-lg font-black leading-tight text-white sm:text-xl">
              {match.home_team?.name || "Home"} (H) vs {match.away_team?.name || "Away"} (A)
            </div>
          </div>

          <div className="rounded-xl border border-white/25 bg-white/15 px-3 py-2 shadow-sm md:justify-self-end">
            <div className="text-[10px] font-black uppercase tracking-wide text-white/75">
              Location
            </div>
            <div className="mt-1 break-words text-base font-black leading-tight text-white sm:text-lg">
              {match.locations?.name || "No Location"}
            </div>
          </div>
        </div>
      </div>

      <div className="p-4">
        <div className="min-w-0">
          {showScoreStatusBlock && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                {hasCompletedMatchScore && (
                  <div className="rounded-xl border border-white bg-white px-4 py-3 shadow-sm">
                    <div className="text-xs font-black uppercase tracking-wide text-slate-500">
                      Final Score
                    </div>
                    <div className="mt-1 text-4xl font-black leading-none text-slate-950 sm:text-5xl">
                      {homeScore} - {awayScore}
                    </div>
                    <div className="mt-1 text-xs font-black uppercase tracking-wide text-slate-500">
                      Home - Away
                    </div>
                  </div>
                )}
                <div className={hasCompletedMatchScore ? "sm:text-right" : ""}>
                  <div className="text-xs font-black uppercase tracking-wide text-slate-500">
                    Score Status
                  </div>
                  <div className="mt-1 font-black text-slate-950">
                    {hasScoreStatus ? formatMatchScoreStatus(match) : "COMPLETED"}
                  </div>
                  {hasVerifiedMatchScore && (
                    <div className="mt-2 rounded-lg bg-emerald-100 px-3 py-2 text-xs font-black uppercase tracking-wide text-emerald-900">
                      Winner: {winningTeamName(match)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className={`flex flex-wrap gap-2 ${showScoreStatusBlock ? "mt-3" : ""}`}>
            <button
              type="button"
              onClick={() => onOpenDetails(match)}
              className="w-full rounded-lg bg-slate-900 px-3 py-2 text-sm font-bold text-white hover:bg-slate-800 sm:w-auto"
            >
              {isVerifiedCompleted ? "Match Score Details" : "Match Details"}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}

function ByeSummaryCard({ bye }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-yellow-300 bg-yellow-50 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="bg-gradient-to-r from-yellow-300 to-amber-400 px-4 py-3 text-slate-950">
        <div className="text-xs font-black uppercase tracking-wide text-slate-700">
          Week {bye.week_number || "-"}
        </div>
        <div className="mt-1 text-lg font-black">
          {bye.teams?.name || "Team"} Bye Week
        </div>
      </div>

      <div className="p-4">
        <div className="min-w-0">
          <div className="flex flex-wrap gap-2 text-xs font-bold uppercase tracking-wide">
            <span className="rounded-full bg-yellow-300 px-2 py-1 text-yellow-950">
              BYE WEEK
            </span>
            <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-700">
              No Match Scheduled
            </span>
            <span className="rounded-full bg-amber-100 px-2 py-1 text-amber-950">
              Week {bye.week_number || "-"}
            </span>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-2 text-sm text-slate-700 md:grid-cols-3">
            <div className="rounded-lg bg-white/80 px-3 py-2">
              <div className="text-xs font-black uppercase tracking-wide text-slate-500">
                Date
              </div>
              <div className="font-black text-slate-950">
                {formatDate(bye.bye_date)}
              </div>
            </div>
            <div className="rounded-lg bg-white/80 px-3 py-2">
              <div className="text-xs font-black uppercase tracking-wide text-slate-500">
                Division
              </div>
              <div className="font-black text-slate-950">
                {bye.divisions?.name || "No Division"}
              </div>
            </div>
            <div className="rounded-lg bg-white/80 px-3 py-2">
              <div className="text-xs font-black uppercase tracking-wide text-slate-500">
                Status
              </div>
              <div className="font-black text-slate-950">
                BYE WEEK
              </div>
            </div>
          </div>

          <div className="mt-3 rounded-lg bg-yellow-100 px-3 py-2 text-sm font-black text-yellow-950">
            {bye.teams?.name || "Team"} has no match scheduled.
          </div>
        </div>
      </div>
    </div>
  );
}

function MatchDetailsModal({ match, standings, ratingForMember, teamWithRoster, onOpenRoster, onClose }) {
  const homeStanding = teamStanding(standings, match.home_team_id);
  const awayStanding = teamStanding(standings, match.away_team_id);
  const location = match.locations;
  const mapUrl = mapLink(location);
  const isVerifiedCompleted = match.status === "completed" && match.score_status === "verified";
  const homeScore = matchTeamScore(match, "home");
  const awayScore = matchTeamScore(match, "away");
  const homeTeam = teamWithRoster(match.home_team_id);
  const awayTeam = teamWithRoster(match.away_team_id);
  const lines = [...(match.match_lines || [])].sort(
    (a, b) => Number(a.line_number || 0) - Number(b.line_number || 0)
  );

  function printMatchResults() {
    window.localStorage.setItem(
      "lwrpc-print-payload",
      JSON.stringify({
        title: `${match.home_team?.name || "Home"} vs ${match.away_team?.name || "Away"} Match Results`,
        body: matchResultsPrintHtml(match, lines),
      })
    );

    const printWindow = window.open("/print", "_blank", "width=900,height=700");

    if (!printWindow) {
      alert("Unable to open print preview. Please allow popups for this site.");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-2 sm:p-4">
      <div className="flex max-h-[94dvh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex flex-col gap-3 bg-gradient-to-r from-slate-800 to-zinc-800 px-3 py-4 text-white sm:px-4 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <div className="text-xs font-black uppercase tracking-wide text-slate-200">
              Week {match.week_number || "-"} {isVerifiedCompleted ? "Match Results" : "Match Details"}
            </div>
            <h2 className="mt-1 break-words text-xl font-black sm:text-2xl">
              {match.home_team?.name || "Home"} vs {match.away_team?.name || "Away"}
            </h2>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-200">
              <span>{formatDisplayDateWithLeadingWeekday(match.scheduled_date, "Date TBD")} at {formatDisplayTime(match.scheduled_time, "Time TBD")}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 md:flex md:flex-wrap md:justify-end">
            <button
              type="button"
              onClick={printMatchResults}
              className="rounded-xl bg-white/10 px-4 py-2 text-sm font-bold text-white hover:bg-white/20"
            >
              Print
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-slate-950 hover:bg-slate-100"
            >
              Close
            </button>
          </div>
        </div>

        <div className="overflow-y-auto">
          <div className="grid gap-3 bg-slate-50 p-3 sm:p-5 md:grid-cols-2">
            <MatchTeamDetail
              label="Home Team"
              team={homeTeam || match.home_team}
              standing={homeStanding}
              tone="green"
              onOpenRoster={homeTeam ? () => onOpenRoster({ ...homeTeam, hidePlayerContacts: true }) : null}
            />
            <MatchTeamDetail
              label="Away Team"
              team={awayTeam || match.away_team}
              standing={awayStanding}
              tone="gray"
              onOpenRoster={awayTeam ? () => onOpenRoster({ ...awayTeam, hidePlayerContacts: true }) : null}
            />
          </div>

          {isVerifiedCompleted && (
            <div className="border-y border-slate-200 bg-slate-50 px-3 pb-3 sm:px-5 sm:pb-5">
              <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                  {formatMatchScoreStatus(match)}
                </div>
                <div className="mt-2 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
                  <MatchScoreSummaryRow
                    label="Home"
                    name={match.home_team?.name || "Home"}
                    score={homeScore}
                    won={String(match.winning_team_id || "") === String(match.home_team_id || "")}
                    tone="home"
                  />
                  <div className="text-lg font-black text-slate-400">
                    -
                  </div>
                  <MatchScoreSummaryRow
                    label="Away"
                    name={match.away_team?.name || "Away"}
                    score={awayScore}
                    won={String(match.winning_team_id || "") === String(match.away_team_id || "")}
                    tone="away"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="space-y-3 p-3 sm:p-5">
            {!isVerifiedCompleted && (
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="text-xs font-black uppercase tracking-wide text-slate-500">
                  Location
                </div>
                <div className="mt-1 text-lg font-black text-slate-900">
                  {location?.name || "Location TBD"}
                </div>
                <div className="mt-1 text-sm font-semibold text-slate-600">
                  {formatLocationAddress(location)}
                </div>
                {mapUrl && (
                  <a
                    href={mapUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-flex rounded-xl bg-slate-700 px-4 py-3 text-sm font-bold text-white hover:bg-slate-800"
                  >
                    Open Home Team Address Map
                  </a>
                )}
              </div>
            )}

            {isVerifiedCompleted && (
              <>
                {lines.map((line) => (
                  <MatchLineResult
                    key={line.id}
                    line={line}
                    match={match}
                    ratingForMember={ratingForMember}
                  />
                ))}

                {!match.match_lines?.length && (
                  <div className="rounded-xl bg-slate-50 p-4 text-center text-sm font-semibold text-slate-500">
                    No game results have been entered for this match.
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function MatchLineResult({ line, match, ratingForMember }) {
  const winnerName = matchLineWinnerName(line, match);
  const winnerSide = matchLineWinnerSide(line, match);
  const teamPointsText = lineTeamPointsText(line);
  const winnerClass =
    winnerSide === "home"
      ? "bg-emerald-50 text-emerald-950"
      : winnerSide === "away"
        ? "bg-indigo-50 text-indigo-950"
        : "bg-slate-100 text-slate-900";

  return (
    <div className="overflow-hidden rounded-2xl border-2 border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-100 px-3 py-3 sm:px-4 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <div className="text-base font-black text-slate-950">
            Game {line.line_number || "-"}{line.division_lines?.line_name ? ` - ${line.division_lines.line_name}` : ""}
          </div>
          <div className="mt-0.5 text-xs font-semibold text-slate-600">
            {capitalizeLabel(line.division_lines?.line_type || "Line")} · {duprPostedLabel(line)}
          </div>
        </div>
        <div className="flex flex-wrap gap-2 md:justify-end">
          <div className="rounded-full bg-slate-100 px-4 py-2 text-sm font-black text-slate-950">
            Team Points: {teamPointsText}
          </div>
          <div className={`rounded-full px-4 py-2 text-sm font-black ${winnerClass}`}>
            {winnerName}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 p-3 sm:p-4 md:grid-cols-2">
        <ResultTeamPlayers
          label={`Home: ${match.home_team?.name || "Home"}`}
          players={[line.home_player_1, line.home_player_2]}
          match={match}
          tone="home"
          won={winnerSide === "home"}
          ratingForMember={ratingForMember}
        />
        <ResultTeamPlayers
          label={`Away: ${match.away_team?.name || "Away"}`}
          players={[line.away_player_1, line.away_player_2]}
          match={match}
          tone="away"
          won={winnerSide === "away"}
          ratingForMember={ratingForMember}
        />
      </div>

      <div className="border-t border-slate-100 px-3 py-3 sm:px-4">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {[...(line.line_games || [])]
            .sort((a, b) => Number(a.game_number || 0) - Number(b.game_number || 0))
            .map((game) => (
              <GameScoreCard key={game.id} game={game} match={match} />
            ))}
          {!line.line_games?.length && (
            <span className="rounded-xl bg-slate-100 px-4 py-2 text-center text-sm font-bold text-slate-500 sm:col-span-3">
              No game scores entered.
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function MatchScoreSummaryRow({ label, name, score, won, tone }) {
  const toneClass =
    tone === "home"
      ? "bg-emerald-100 text-emerald-950"
      : "bg-indigo-50 text-indigo-950";

  return (
    <div className={`flex min-w-0 items-center justify-between gap-2 rounded-lg px-2.5 py-2 sm:px-3 ${won ? toneClass : "bg-slate-50 text-slate-900"}`}>
      <div className="min-w-0">
        <div className="text-[10px] font-black uppercase tracking-wide opacity-70">
          {label}{won ? " Winner" : ""}
        </div>
        <div className="truncate text-xs font-black sm:text-sm">
          {name}
        </div>
      </div>
      <div className="shrink-0 text-2xl font-black">
        {score ?? "-"}
      </div>
    </div>
  );
}

function GameScoreCard({ game, match }) {
  const specialLabel = specialGameStatusLabel(game, match);

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-center shadow-sm">
      <div className="text-xs font-black uppercase tracking-wide text-slate-500">
        Game {game.game_number || "-"}
      </div>
      <div className="mt-1 flex items-center justify-center gap-3">
        <div>
          <div className="text-[10px] font-black uppercase tracking-wide text-emerald-700">Home</div>
          <div className="text-2xl font-black text-emerald-950">{game.home_score ?? "-"}</div>
        </div>
        <div className="text-lg font-black text-slate-400">-</div>
        <div>
          <div className="text-[10px] font-black uppercase tracking-wide text-indigo-700">Away</div>
          <div className="text-2xl font-black text-indigo-950">{game.away_score ?? "-"}</div>
        </div>
      </div>
      {specialLabel && (
        <div className="mt-2 rounded-lg bg-amber-100 px-2 py-1.5 text-xs font-black text-amber-950">
          {specialLabel}
        </div>
      )}
    </div>
  );
}

function ResultTeamPlayers({ label, players, match, ratingForMember, tone = "home", won = false }) {
  const toneClass =
    tone === "away"
      ? "bg-indigo-50 text-indigo-950"
      : "bg-emerald-50 text-emerald-950";
  const borderClass = won
    ? "border-4 border-emerald-600 shadow-md ring-2 ring-emerald-100"
    : "border border-transparent";

  return (
    <div className={`rounded-xl px-3 py-3 ${toneClass} ${borderClass}`}>
      <div className="text-xs font-black uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="mt-1 space-y-1 text-sm font-semibold text-slate-800">
        {players.filter(Boolean).map((player) => (
          <div key={player.id} className="flex items-center justify-between gap-2">
            <span>{formatMemberName(player)}</span>
            <span className="rounded-full bg-white px-2 py-0.5 text-xs font-black text-slate-700">
              {ratingForMember(player.id, match.leagues?.season_id, match.divisions?.rating_type || "dupr", player)}
            </span>
          </div>
        ))}
        {players.filter(Boolean).length > 0 && (
          <div className="pt-1 text-xs font-black uppercase tracking-wide text-slate-600">
            Team Rating: {teamLineRating(players, match, ratingForMember)}
          </div>
        )}
        {players.filter(Boolean).length === 0 && (
          <div className="text-slate-500">Players not entered</div>
        )}
      </div>
    </div>
  );
}

function MatchTeamDetail({ label, team, standing, tone, onOpenRoster }) {
  const tones = {
    green: "bg-emerald-50 text-emerald-950",
    gray: "bg-indigo-50 text-indigo-950",
  };

  return (
    <div className={`rounded-2xl p-4 shadow-sm ${tones[tone] || tones.gray}`}>
      <div className="text-xs font-black uppercase tracking-wide opacity-70">
        {label}
      </div>
      <div className="mt-1 text-xl font-black">{team?.name || label}</div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-sm font-bold">
        <div className="rounded-xl bg-white px-3 py-2">
          <div className="text-xs uppercase tracking-wide text-slate-500">Current Rank</div>
          #{standing?.rank || "N/A"}
        </div>
        <div className="rounded-xl bg-white px-3 py-2">
          <div className="text-xs uppercase tracking-wide text-slate-500">Current Record</div>
          {formatStandingRecord(standing)}
        </div>
      </div>
      {onOpenRoster && (
        <button
          type="button"
          onClick={onOpenRoster}
          className="mt-3 w-full rounded-xl bg-slate-950 px-3 py-2 text-sm font-bold text-white hover:bg-slate-800"
        >
          Team Roster ({team?.roster?.length || 0})
        </button>
      )}
    </div>
  );
}

function matchLineWinnerName(line, match) {
  const side = matchLineWinnerSide(line, match);

  if (side === "home") return match.home_team?.name || "Home Team";
  if (side === "away") return match.away_team?.name || "Away Team";
  return "No winner";
}

function matchLineWinnerSide(line, match) {
  if (line.winning_team_id) {
    if (String(line.winning_team_id) === String(match.home_team_id)) {
      return "home";
    }

    if (String(line.winning_team_id) === String(match.away_team_id)) {
      return "away";
    }
  }

  const wins = lineGameWinCounts(line);
  const homeWins = wins.hasGames ? wins.home : Number(line.home_team_games_won || 0);
  const awayWins = wins.hasGames ? wins.away : Number(line.away_team_games_won || 0);

  if (homeWins > awayWins) return "home";
  if (awayWins > homeWins) return "away";
  return "";
}

function teamStanding(standings, teamId) {
  return standings.find((standing) => String(standing.team_id) === String(teamId));
}

function selectedTeamMatchResult(match, selectedTeamId) {
  if (
    !selectedTeamId ||
    match.status !== "completed" ||
    !match.winning_team_id ||
    (String(match.home_team_id) !== String(selectedTeamId) &&
      String(match.away_team_id) !== String(selectedTeamId))
  ) {
    return "";
  }

  return String(match.winning_team_id) === String(selectedTeamId) ? "win" : "loss";
}

function winningTeamName(match) {
  if (String(match?.winning_team_id || "") === String(match?.home_team_id || "")) {
    return match?.home_team?.name || "Home";
  }

  if (String(match?.winning_team_id || "") === String(match?.away_team_id || "")) {
    return match?.away_team?.name || "Away";
  }

  return "TBD";
}

function playerLineSide(line, memberId) {
  const id = String(memberId || "");
  if (!id) return "";

  if (
    String(line.home_player_1?.id || line.home_player_1_id || "") === id ||
    String(line.home_player_2?.id || line.home_player_2_id || "") === id
  ) {
    return "home";
  }

  if (
    String(line.away_player_1?.id || line.away_player_1_id || "") === id ||
    String(line.away_player_2?.id || line.away_player_2_id || "") === id
  ) {
    return "away";
  }

  return "";
}

function formatPlayerRecord(record) {
  const wins = Number(record?.wins || 0);
  const losses = Number(record?.losses || 0);
  return `${wins}-${losses}`;
}

function teamLineRating(players, match, ratingForMember) {
  const ratings = players
    .filter(Boolean)
    .map((player) =>
      Number(
        ratingForMember(
          player.id,
          match.leagues?.season_id,
          match.divisions?.rating_type || "dupr",
          player
        )
      )
    )
    .filter((rating) => !Number.isNaN(rating));

  if (!ratings.length) return "NR";
  return ratings.reduce((sum, rating) => sum + rating, 0).toFixed(2);
}

function lineTeamPointsText(line) {
  const lineType = String(line?.division_lines?.line_type || "").trim().toLowerCase();
  const games = line?.line_games || [];
  const hasPlayedGame = games.some((game) =>
    game.home_score !== null && game.home_score !== undefined ||
    game.away_score !== null && game.away_score !== undefined ||
    game.game_status && game.game_status !== "scheduled"
  );
  const configuredPoints = lineType === "picklebreaker" && !hasPlayedGame
    ? Number(line.division_lines?.picklebreaker_not_played_points ?? line.division_lines?.team_win_points ?? 1)
    : Number(line.division_lines?.team_win_points ?? 1);

  if (Number.isNaN(configuredPoints)) return "-";
  return lineType === "picklebreaker" && !hasPlayedGame ? `${configuredPoints} not played` : configuredPoints;
}

function specialGameStatusLabel(game, match) {
  if (game.game_status === "forfeit_home") {
    return `Forfeited to ${match.home_team?.name || "Home"}`;
  }

  if (game.game_status === "forfeit_away") {
    return `Forfeited to ${match.away_team?.name || "Away"}`;
  }

  if (game.game_status === "retired_home") {
    return `Retired to ${match.home_team?.name || "Home"}`;
  }

  if (game.game_status === "retired_away") {
    return `Retired to ${match.away_team?.name || "Away"}`;
  }

  return "";
}

function capitalizeLabel(value) {
  return String(value || "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function duprPostedLabel(line) {
  const posted = line?.posted_to_dupr ?? line?.division_lines?.posted_to_dupr;
  return posted ? "Posted to DUPR" : "Not Posted to DUPR";
}

function formatMatchScoreStatus(match) {
  const status = match?.score_status || "not_entered";

  if (status === "not_entered") return "NOT ENTERED";

  const timestamp =
    status === "verified"
      ? match?.score_verified_at
      : match?.score_entered_at;
  const label = status.replaceAll("_", " ").toUpperCase();

  return timestamp
    ? `${label} - ${formatDisplayTimestampShort(timestamp)}`
    : label;
}

function compareDivisionScheduleTeams(a, b) {
  const aStanding = a.standing || {};
  const bStanding = b.standing || {};
  const aRank = Number(aStanding.rank || 0);
  const bRank = Number(bStanding.rank || 0);

  if (aRank && bRank && aRank !== bRank) return aRank - bRank;
  if (aRank && !bRank) return -1;
  if (!aRank && bRank) return 1;

  const pointsDifference =
    Number(bStanding.standings_points || 0) - Number(aStanding.standings_points || 0);

  if (pointsDifference !== 0) return pointsDifference;

  return String(a.name || "").localeCompare(String(b.name || ""));
}

function compareScheduleItems(a, b) {
  const aDate = new Date(`${a.date || "9999-12-31"}T${a.time || "00:00"}`);
  const bDate = new Date(`${b.date || "9999-12-31"}T${b.time || "00:00"}`);
  return aDate - bDate;
}

function filterByesForPublishedSchedule(byes, matches) {
  const publishedScheduleKeys = new Set(
    matches.map((match) =>
      scheduleWeekKey(match.division_id, match.week_number, match.scheduled_date)
    )
  );

  return byes.filter((bye) =>
    publishedScheduleKeys.has(scheduleWeekKey(bye.division_id, bye.week_number, bye.bye_date))
  );
}

function scheduleWeekKey(divisionId, weekNumber, date) {
  return `${divisionId || ""}:${weekNumber || ""}:${date || ""}`;
}

function localDateString() {
  const date = new Date();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function formatStandingRecord(standing) {
  if (!standing) return "0-0";
  return `${standing.match_wins ?? 0}-${standing.match_losses ?? 0}`;
}

function matchTeamScore(match, side) {
  const scoreField = side === "home" ? "home_score" : "away_score";

  if (match?.[scoreField] !== null && match?.[scoreField] !== undefined) {
    return Number(match[scoreField]);
  }

  if (match?.match_lines?.length) {
    let hasAnyLineScore = false;

    const score = match.match_lines.reduce((total, line) => {
      const wins = lineGameWinCounts(line);
      const lineScoreField = side === "home" ? "home_team_games_won" : "away_team_games_won";
      const fallbackWins = Number(line[lineScoreField] || 0);
      const sideWins = side === "home" ? wins.home : wins.away;

      if (wins.hasGames || fallbackWins > 0) {
        hasAnyLineScore = true;
      }

      return total + (wins.hasGames ? sideWins : fallbackWins);
    }, 0);

    if (hasAnyLineScore) return score;
  }

  return null;
}

function lineGameWinCounts(line) {
  const games = line.line_games || [];
  let home = 0;
  let away = 0;
  let hasGames = false;

  games.forEach((game) => {
    const special = specialGameStatus(game.game_status);

    if (special?.winnerSide === "Home") {
      home += 1;
      hasGames = true;
      return;
    }

    if (special?.winnerSide === "Away") {
      away += 1;
      hasGames = true;
      return;
    }

    if (game.home_score !== null && game.away_score !== null) {
      hasGames = true;

      if (Number(game.home_score) > Number(game.away_score)) home += 1;
      if (Number(game.away_score) > Number(game.home_score)) away += 1;
    }
  });

  return { home, away, hasGames };
}

function gameScoreText(game) {
  const special = specialGameStatus(game.game_status);
  const score = `Game ${game.game_number || "-"}: ${game.home_score ?? "-"}-${game.away_score ?? "-"}`;

  if (special) return `${score} Result: ${special.label}`;
  if (game.home_score === null || game.away_score === null) return `${score} Result: Pending`;
  if (Number(game.home_score) === Number(game.away_score)) return `${score} Result: Tie`;
  return score;
}

function matchResultsPrintHtml(match, lines) {
  const rows = lines.map((line) => {
    const games = [...(line.line_games || [])]
      .sort((a, b) => Number(a.game_number || 0) - Number(b.game_number || 0))
      .map((game) => (
        escapeHtml(gameScoreText(game))
      ))
      .join("<br />");

    return `
      <tr>
        <td>${escapeHtml(line.line_number || "-")}</td>
        <td>${escapeHtml(line.division_lines?.line_name || "")}</td>
        <td>${escapeHtml(matchLineWinnerName(line, match))}</td>
        <td>${escapeHtml(formatMemberName(line.home_player_1))} / ${escapeHtml(formatMemberName(line.home_player_2))}</td>
        <td>${escapeHtml(formatMemberName(line.away_player_1))} / ${escapeHtml(formatMemberName(line.away_player_2))}</td>
        <td>${games || "No game scores"}</td>
      </tr>
    `;
  }).join("");

  return `
    <style>
      h1 { margin: 0 0 4px; font-size: 24px; }
      h2 { margin: 0 0 18px; color: #475569; font-size: 15px; font-weight: 600; }
      table { width: 100%; border-collapse: collapse; }
      th { background: #0f172a; color: white; text-align: left; }
      th, td { border: 1px solid #cbd5e1; padding: 9px; font-size: 12px; vertical-align: top; }
      tr:nth-child(even) td { background: #f8fafc; }
      .score { margin: 12px 0 18px; font-size: 16px; font-weight: 700; }
    </style>
    <h1>${escapeHtml(match.home_team?.name || "Home")} vs ${escapeHtml(match.away_team?.name || "Away")}</h1>
    <h2>${escapeHtml(formatDate(match.scheduled_date))} / ${escapeHtml(match.locations?.name || "Home Location TBD")}</h2>
    <div class="score">Match Score: ${escapeHtml(matchTeamScore(match, "home") ?? 0)}-${escapeHtml(matchTeamScore(match, "away") ?? 0)}</div>
    <table>
      <thead>
        <tr>
          <th>Game</th>
          <th>Line</th>
          <th>Winner</th>
          <th>Home Players</th>
          <th>Away Players</th>
          <th>Game Scores</th>
        </tr>
      </thead>
      <tbody>
        ${rows || `<tr><td colspan="6">No game details found.</td></tr>`}
      </tbody>
    </table>
  `;
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatLocationAddress(location) {
  const parts = [
    location?.address,
    location?.city,
    location?.state,
    location?.zip_code,
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(", ") : "Address not configured";
}

function mapLink(location) {
  const address = formatLocationAddress(location);
  if (!location || address === "Address not configured") return "";
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function PlayerHistoryRow({ row, memberId }) {
  const match = row.matches;
  const details = playerLineDetails(row, memberId);
  const gameScores = formatGameScores(row, details.sideLabel);
  void gameScores;

  return (
    <div className="rounded-xl border border-slate-200 px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-black ${
            details.result === "W"
              ? "bg-green-100 text-green-800"
              : details.result === "L"
              ? "bg-red-100 text-red-800"
              : "bg-slate-100 text-slate-700"
          }`}
        >
          {details.result}
        </span>
        <span className="font-bold text-slate-900">
          {formatDate(match?.scheduled_date)}
        </span>
        <span className="font-semibold text-slate-900">
          {details.playerTeamName} vs {details.opponentName}
        </span>
      </div>

      <div className="mt-1 text-sm text-slate-600">
        {match?.leagues?.seasons?.name || "No Season"} / {match?.leagues?.name || "No League"} · {match?.divisions?.name || "No Division"} · {row.division_lines?.line_name || row.division_lines?.line_type || `Line ${row.line_number || "—"}`} · {details.sideLabel}
      </div>
    </div>
  );
}

function PlayerHistoryMatchGroup({ group, memberId, ratingForMember }) {
  const sortedRows = [...group.rows].sort((a, b) => {
    const lineCompare = Number(a.line_number || 0) - Number(b.line_number || 0);
    if (lineCompare !== 0) return lineCompare;

    const aGameNumber = Math.min(...(a.line_games || []).map((game) => Number(game.game_number || 0)));
    const bGameNumber = Math.min(...(b.line_games || []).map((game) => Number(game.game_number || 0)));

    return (Number.isFinite(aGameNumber) ? aGameNumber : 0) - (Number.isFinite(bGameNumber) ? bGameNumber : 0);
  });
  const firstRow = sortedRows[0];
  const match = firstRow?.matches;
  const details = playerLineDetails(firstRow, memberId);
  const lineCount = sortedRows.length;
  const gameCount = sortedRows.reduce(
    (total, row) => total + formatGameScores(row, playerLineDetails(row, memberId).sideLabel, ratingForMember).length,
    0
  );

  return (
    <div className="overflow-hidden rounded-2xl border-2 border-slate-500 bg-slate-50 shadow-md">
      <div className="border-b border-slate-600 bg-slate-900 px-4 py-4 text-white">
        <div className="text-[11px] font-black uppercase tracking-wide text-blue-200">
          Match
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-black text-white">
            {formatDate(match?.scheduled_date)}
          </span>
          <span className="font-bold text-white">
            {details.playerTeamName} vs {details.opponentName}
          </span>
          <span className="rounded-full bg-amber-400 px-2 py-0.5 text-xs font-black uppercase text-slate-950">
            {details.sideLabel}
          </span>
          <span className="rounded-full bg-blue-500 px-2 py-0.5 text-xs font-black uppercase text-white">
            {lineCount} line{lineCount === 1 ? "" : "s"}
          </span>
          <span className="rounded-full bg-white px-2 py-0.5 text-xs font-black uppercase text-slate-900">
            {gameCount} game{gameCount === 1 ? "" : "s"}
          </span>
        </div>
        <div className="mt-1 text-sm font-semibold text-slate-200">
          {match?.leagues?.seasons?.name || "No Season"} / {match?.leagues?.name || "No League"} / {match?.divisions?.name || "No Division"}
        </div>
      </div>

      <div className="divide-y divide-slate-200">
        {sortedRows.map((row) => (
          <PlayerHistoryLineWithScores
            key={row.id}
            row={row}
            memberId={memberId}
            ratingForMember={ratingForMember}
          />
        ))}
      </div>
    </div>
  );
}

function PlayerHistoryLineWithScores({ row, memberId, ratingForMember }) {
  const details = playerLineDetails(row, memberId);
  const gameScores = formatGameScores(row, details.sideLabel, ratingForMember);
  const countsForIndividualWinLoss = rowCountsForIndividualWinLoss(row);
  const isWin = countsForIndividualWinLoss && details.result === "W";
  const isLoss = countsForIndividualWinLoss && details.result === "L";
  const resultLabel = !countsForIndividualWinLoss
    ? "Picklebreaker"
    : isWin
    ? "Win"
    : isLoss
    ? "Loss"
    : "Other";
  const scoreBadgeTone = isWin
    ? "bg-green-600 text-white"
    : isLoss
    ? "bg-red-600 text-white"
    : "bg-slate-950 text-white";
  const resultTone = isWin
      ? {
        shell: "border-emerald-200 bg-emerald-50",
        bar: "bg-emerald-600",
        badge: "bg-emerald-700 text-white",
      }
    : isLoss
    ? {
        shell: "border-rose-200 bg-rose-50",
        bar: "bg-rose-600",
        badge: "bg-rose-700 text-white",
      }
    : !countsForIndividualWinLoss
    ? {
        shell: "border-amber-200 bg-amber-50",
        bar: "bg-amber-500",
        badge: "bg-amber-700 text-white",
      }
    : {
        shell: "border-slate-200 bg-slate-50",
        bar: "bg-slate-500",
        badge: "bg-slate-700 text-white",
      };
  const lineLabel = row.division_lines?.line_name || row.division_lines?.line_type || `Line ${row.line_number || "-"}`;
  return (
    <div className={`${resultTone.shell}`}>
      <div className={`h-1.5 ${resultTone.bar}`} />
      <div className="px-4 py-4">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-wide ${resultTone.badge}`}
        >
          {resultLabel}
        </span>
        <span className="font-black text-slate-900">
          {lineLabel}
        </span>
      </div>

      {!countsForIndividualWinLoss && (
        <div className="mt-2 text-sm font-bold text-amber-900">
          Picklebreaker team result only; excluded from individual W/L.
        </div>
      )}

      {gameScores.length > 0 && (
        <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 px-3 py-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0 flex-1">
              <div className="grid gap-1 text-xs font-semibold leading-5 text-slate-700">
                <div>
                  <span className="font-black text-slate-950">Your team:</span> {gameScores[0].players}{" "}
                  <span className="font-black text-slate-950">Team Rating:</span>{" "}
                  <span className="font-semibold">{gameScores[0].playerTeamRating}</span>
                </div>
                <div>
                  <span className="font-black text-slate-950">Opponents:</span> {gameScores[0].opponentPlayers}{" "}
                  <span className="font-black text-slate-950">Team Rating:</span>{" "}
                  <span className="font-semibold">{gameScores[0].opponentTeamRating}</span>
                </div>
              </div>
              {gameScores.some((game) => game.specialLabel) && (
                <div className="mt-2 space-y-1">
                  {gameScores
                    .filter((game) => game.specialLabel)
                    .map((game) => (
                      <div key={`${game.key}-special`} className="text-xs font-black text-amber-800">
                        {game.label}: {game.specialLabel}
                      </div>
                    ))}
                </div>
              )}
            </div>

            <div className="flex w-full flex-wrap gap-2 lg:w-auto lg:shrink-0 lg:justify-end">
              {gameScores.map((game) => {
                const gameScoreBadgeTone =
                  countsForIndividualWinLoss && game.result === "W"
                    ? "bg-green-600 text-white"
                    : countsForIndividualWinLoss && game.result === "L"
                    ? "bg-red-600 text-white"
                    : scoreBadgeTone;

                return (
                  <div key={game.key} className="flex min-w-20 flex-col items-stretch gap-1">
                    <div className="text-center text-xs font-black uppercase tracking-wide text-blue-700">
                      {game.label}
                    </div>
                    <div className={`flex min-h-10 min-w-20 items-center justify-center rounded-lg px-3 py-1.5 text-center text-lg font-black leading-none shadow-sm ${gameScoreBadgeTone}`}>
                      {game.score}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

function groupPlayHistoryRows(rows) {
  const groups = [];
  const groupsByKey = new Map();

  (rows || []).forEach((row) => {
    const match = row.matches;
    const key = match?.id
      ? `match:${match.id}`
      : [
          "match",
          match?.scheduled_date || "",
          match?.scheduled_time || "",
          match?.home_team_id || match?.home_team?.id || "",
          match?.away_team_id || match?.away_team?.id || "",
          match?.divisions?.id || "",
          match?.leagues?.id || "",
        ].join(":");

    if (!groupsByKey.has(key)) {
      const group = { key, rows: [] };
      groupsByKey.set(key, group);
      groups.push(group);
    }

    groupsByKey.get(key).rows.push(row);
  });

  return groups;
}

function formatGameScores(row, sideLabel, ratingForMember) {
  const players = linePlayerNames(row, sideLabel, ratingForMember);
  const opponentSideLabel = sideLabel === "Home" ? "Away" : "Home";
  const opponentPlayers = linePlayerNames(row, opponentSideLabel, ratingForMember);
  const playerTeamRating = lineTeamRating(row, sideLabel, ratingForMember);
  const opponentTeamRating = lineTeamRating(row, opponentSideLabel, ratingForMember);
  const match = row.matches;
  const playerTeamName = sideLabel === "Home" ? match?.home_team?.name || "Home" : match?.away_team?.name || "Away";
  const opponentTeamName = sideLabel === "Home" ? match?.away_team?.name || "Away" : match?.home_team?.name || "Home";

  return [...(row.line_games || [])]
    .sort((a, b) => Number(a.game_number || 0) - Number(b.game_number || 0))
    .filter((game) => {
      const special = specialGameStatus(game.game_status);
      return special || (game.home_score !== null && game.away_score !== null);
    })
    .map((game) => {
      const isHome = sideLabel === "Home";
      const playerScore = isHome ? game.home_score : game.away_score;
      const opponentScore = isHome ? game.away_score : game.home_score;
      const special = specialGameStatus(game.game_status);
      const hasScores = playerScore !== null && opponentScore !== null;
      const result = hasScores
        ? Number(playerScore) > Number(opponentScore)
          ? "W"
          : Number(playerScore) < Number(opponentScore)
          ? "L"
          : "T"
        : "";

      return {
        key: game.id || game.game_number,
        label: `Game ${game.game_number || ""}`.trim(),
        result,
        playerTeamName,
        players,
        playerTeamRating,
        opponentTeamName,
        opponentPlayers,
        opponentTeamRating,
        score: special
          ? `${playerScore ?? "-"}-${opponentScore ?? "-"}`
          : `${playerScore}-${opponentScore}`,
        specialLabel: special?.label || "",
      };
    });
}

function linePlayerNames(row, sideLabel, ratingForMember) {
  const members =
    sideLabel === "Home"
      ? [row.home_player_1, row.home_player_2]
      : [row.away_player_1, row.away_player_2];
  const match = row.matches;
  const ratingType = match?.divisions?.rating_type || "dupr";
  const seasonId = match?.leagues?.season_id;

  return members
    .filter(Boolean)
    .map((member) => {
      const rating = ratingForMember
        ? ratingForMember(member.id, seasonId, ratingType, member)
        : "NR";
      return `${formatMemberName(member)} (${rating})`;
    })
    .filter(Boolean)
    .join(" / ") || "Players TBD";
}

function lineTeamRating(row, sideLabel, ratingForMember) {
  if (typeof ratingForMember !== "function") {
    return "NR";
  }

  const players =
    sideLabel === "Home"
      ? [row.home_player_1, row.home_player_2]
      : [row.away_player_1, row.away_player_2];

  return teamLineRating(players, row.matches, ratingForMember);
}
