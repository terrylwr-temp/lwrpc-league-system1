"use client";

import LoadingScreen from "../components/LoadingScreen";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AppHeader from "../components/AppHeader";
import LoginMessageModal from "../components/LoginMessageModal";
import { requireRole, supabase } from "../lib/auth";
import { formatDisplayDate, formatDisplayTime, formatDisplayTimestampShort } from "../lib/dateTime";
import { formatPhoneNumberForStorage } from "../lib/phone";
import { splitNotificationRecipients } from "../lib/notificationPreferences";
import TeamScheduleModal from "../components/TeamScheduleModal";
import {
  DEFAULT_LEAGUE_DOCUMENT_BUCKET,
  LEAGUE_DOCUMENT_TYPES,
  leagueDocumentPath,
} from "../lib/leagueDocuments";
import { GUIDE_DOCUMENT_TYPES, guidePdfDocument } from "../lib/dashboardGuides";
import { specialGameStatus } from "../lib/playHistory";
import {
  DEFAULT_SCORE_SHEET_RULES,
  DEFAULT_SCORE_SHEET_TEMPLATE_HTML,
  DEFAULT_SCORE_SHEET_TEMPLATE_NAME,
} from "../lib/scoreSheetTemplates";
import { EMAIL_TEMPLATE_KEYS, getEmailTemplateConfig, renderEmailTemplate } from "../lib/emailTemplates";
import { confirmUnsavedChanges, useUnsavedChangesWarning } from "../lib/useUnsavedChangesWarning";
import { DEFAULT_SYSTEM_SETTINGS, mergeSystemSettings } from "../lib/systemSettings";
import { findMembersByEmail, memberEmailResolution } from "../lib/memberLookup";

const CAPTAIN_SELECTED_TEAM_STORAGE_PREFIX = "lwrpc-captain-dashboard-selected-team";

export default function CaptainDashboardPage() {
  const router = useRouter();
  const captainGuide = GUIDE_DOCUMENT_TYPES.find((guideType) => guideType.key === "captain_guide_pdf");

  const [currentMember, setCurrentMember] = useState(null);
  const [teams, setTeams] = useState([]);
  const [matches, setMatches] = useState([]);
  const [byeWeeks, setByeWeeks] = useState([]);
  const [teamStats, setTeamStats] = useState({});
  const [teamRosters, setTeamRosters] = useState({});
  const [captainRatings, setCaptainRatings] = useState([]);
  const [matchSetupStatus, setMatchSetupStatus] = useState({});
  const [selectedCaptainTeamId, setSelectedCaptainTeamId] = useState("");
  const [showPreviousSeasonTeams, setShowPreviousSeasonTeams] = useState(false);
  const [captainSection, setCaptainSection] = useState("upcoming");
  const [captainSectionDefaulted, setCaptainSectionDefaulted] = useState(false);
  const [openLeagueDocuments, setOpenLeagueDocuments] = useState({});
  const [loading, setLoading] = useState(true);
  const [setupMatch, setSetupMatch] = useState(null);
  const [setupTeam, setSetupTeam] = useState(null);
  const [setupRoster, setSetupRoster] = useState([]);
  const [setupLineups, setSetupLineups] = useState([]);
  const [setupRatings, setSetupRatings] = useState([]);
  const [setupDirty, setSetupDirty] = useState(false);
  const [savingSetup, setSavingSetup] = useState(false);
  const [divisionScheduleTeam, setDivisionScheduleTeam] = useState(null);
  const [divisionScheduleTeams, setDivisionScheduleTeams] = useState([]);
  const [divisionScheduleMatches, setDivisionScheduleMatches] = useState([]);
  const [divisionScheduleByes, setDivisionScheduleByes] = useState([]);
  const [divisionScheduleRatings, setDivisionScheduleRatings] = useState([]);
  const [divisionScheduleLoading, setDivisionScheduleLoading] = useState(false);
  const [pdfDocument, setPdfDocument] = useState(null);
  const [scoreSheetPreview, setScoreSheetPreview] = useState(null);
  const [divisionCaptainsPreview, setDivisionCaptainsPreview] = useState(null);
  const [scoreDetailsMatch, setScoreDetailsMatch] = useState(null);
  const [matchDetails, setMatchDetails] = useState(null);
  const [rosterTeam, setRosterTeam] = useState(null);
  const [systemSettings, setSystemSettings] = useState(DEFAULT_SYSTEM_SETTINGS);

  useUnsavedChangesWarning(Boolean(setupMatch && setupDirty), "match setup");

  const checkAuth = useCallback(async function checkAuth() {
    const user = await requireRole(router, "captain");
    return !!user;
  }, [router]);

  const loadSystemSettings = useCallback(async function loadSystemSettings() {
    const response = await fetch("/api/system-settings");
    const result = await response.json().catch(() => ({}));

    if (result.settings) {
      setSystemSettings(mergeSystemSettings(result.settings));
    }
  }, []);

  const loadMatchSetupStatus = useCallback(async function loadMatchSetupStatus(matchRows) {
    const matchIds = matchRows.map((match) => match.id).filter(Boolean);

    if (matchIds.length === 0) {
      setMatchSetupStatus({});
      return;
    }

    const { data, error } = await supabase
      .from("match_lineups")
      .select("match_id, team_id, line_number, player_1_member_id, player_2_member_id")
      .in("match_id", matchIds);

    if (error) {
      setMatchSetupStatus({});
      return;
    }

    setMatchSetupStatus(buildMatchSetupStatus(matchRows, data || []));
  }, []);

  const loadData = useCallback(async function loadData() {
    setLoading(true);

    const startedAt = Date.now();

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
      "*"
    );

    if (memberError) {
      alert(memberError.message);
      setLoading(false);
      return;
    }

    const { selectedMember: memberData } = memberEmailResolution(memberRows);

    if (!memberData) {
      setCurrentMember(null);
      setLoading(false);
      return;
    }

    setCurrentMember(memberData);

    const { data: clubProLocations, error: clubProLocationsError } = await supabase
      .from("locations")
      .select("id")
      .or(`club_pro_member_id.eq.${memberData.id},club_pro_2_member_id.eq.${memberData.id}`);

    if (clubProLocationsError) {
      alert(clubProLocationsError.message);
      setLoading(false);
      return;
    }

    const clubProLocationIds = (clubProLocations || []).map((location) => location.id).filter(Boolean);
    const teamAccessFilters = [
      `captain_member_id.eq.${memberData.id}`,
      `co_captain_member_id.eq.${memberData.id}`,
      `co_captain_2_member_id.eq.${memberData.id}`,
      `club_pro_member_id.eq.${memberData.id}`,
    ];

    if (clubProLocationIds.length > 0) {
      teamAccessFilters.push(`home_location_id.in.(${clubProLocationIds.join(",")})`);
    }

    const { data: teamData, error: teamError } = await supabase
      .from("teams")
      .select(`
        *,
        divisions (
          id,
          name,
          number_of_lines,
          games_per_line,
          points_to_win,
          win_by,
          default_game_format,
          rating_type,
          team_dupr_max,
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
            standings_points_mode,
            sort_order
          ),
          leagues (
            id,
            name,
            season_id,
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
      .order("name", { ascending: true });

    if (teamError) {
      alert(teamError.message);
      setLoading(false);
      return;
    }

    const captainTeams = teamData || [];
    const activeTeams = captainTeams.filter((team) => team.is_active !== false);
    const savedTeamId = readDashboardTeamSelection(
      CAPTAIN_SELECTED_TEAM_STORAGE_PREFIX,
      memberData.id
    );

    setTeams(captainTeams);
    setSelectedCaptainTeamId((current) => {
      if (current && captainTeams.some((team) => String(team.id) === String(current))) {
        return current;
      }

      if (savedTeamId && captainTeams.some((team) => String(team.id) === String(savedTeamId))) {
        return savedTeamId;
      }

      return activeTeams?.[0]?.id || captainTeams?.[0]?.id || "";
    });

    const teamIds = captainTeams.map((team) => team.id);

    if (teamIds.length === 0) {
      setMatches([]);
      setByeWeeks([]);
      setTeamStats({});
      router.push("/standings");
      finishLoading(startedAt, setLoading);
      return;
    }

    const seasonIds = [
      ...new Set(captainTeams.map((team) => team.divisions?.leagues?.season_id).filter(Boolean)),
    ];

    if (seasonIds.length > 0) {
      const { data: ratingRows, error: ratingError } = await supabase
        .from("member_season_ratings")
        .select("member_id, season_id, season_dupr_rating, season_primetime_rating")
        .in("season_id", seasonIds);

      if (ratingError) {
        alert(ratingError.message);
        setLoading(false);
        return;
      }

      setCaptainRatings(ratingRows || []);
    } else {
      setCaptainRatings([]);
    }

    const { data: matchData, error: matchError } = await supabase
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
          number_of_lines,
          games_per_line,
          points_to_win,
          win_by,
          default_game_format,
          rating_type,
          team_dupr_max,
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
          division_lines (
            line_name,
            line_type,
            posted_to_dupr
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
      .order("scheduled_time", { ascending: true });

    if (matchError) {
      alert(matchError.message);
      setLoading(false);
      return;
    }

    setMatches(matchData || []);

    const matchTeamIds = [
      ...new Set(
        [
          ...teamIds,
          ...(matchData || []).flatMap((match) => [match.home_team_id, match.away_team_id]),
        ].filter(Boolean)
      ),
    ];

    const [{ data: rosterRows, error: rosterError }, { data: standingsRows, error: standingsError }] =
      await Promise.all([
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
          .in("team_id", matchTeamIds),
        supabase
          .from("team_standings")
          .select("team_id, rank, standings_points, match_wins, match_losses, match_ties")
          .in("team_id", matchTeamIds),
      ]);

    if (rosterError) {
      alert(rosterError.message);
      setLoading(false);
      return;
    }

    if (standingsError) {
      alert(standingsError.message);
      setLoading(false);
      return;
    }

    const nextTeamStats = {};

    matchTeamIds.forEach((teamId) => {
      nextTeamStats[teamId] = {
        playerCount: 0,
        standing: null,
      };
    });

    const nextTeamRosters = {};

    (rosterRows || []).forEach((row) => {
      if (!nextTeamStats[row.team_id]) {
        nextTeamStats[row.team_id] = { playerCount: 0, standing: null };
      }

      nextTeamStats[row.team_id].playerCount += 1;

      if (!nextTeamRosters[row.team_id]) nextTeamRosters[row.team_id] = [];
      if (row.members) nextTeamRosters[row.team_id].push(row.members);
    });

    (standingsRows || []).forEach((row) => {
      if (!nextTeamStats[row.team_id]) {
        nextTeamStats[row.team_id] = { playerCount: 0, standing: null };
      }

      nextTeamStats[row.team_id].standing = row;
    });

    setTeamStats(nextTeamStats);
    setTeamRosters(
      Object.fromEntries(
        Object.entries(nextTeamRosters).map(([teamId, roster]) => [
          teamId,
          sortRosterMembers(roster),
        ])
      )
    );

    await loadMatchSetupStatus(matchData || []);

    const { data: byeData, error: byeError } = await supabase
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
      .order("bye_date", { ascending: true });

    if (byeError) {
      alert(byeError.message);
      setLoading(false);
      return;
    }

    const publishedScheduleKeys = new Set(
      (matchData || []).map((match) =>
        scheduleWeekKey(match.division_id, match.week_number, match.scheduled_date)
      )
    );

    setByeWeeks(
      (byeData || []).filter((bye) =>
        publishedScheduleKeys.has(scheduleWeekKey(bye.division_id, bye.week_number, bye.bye_date))
      )
    );
    finishLoading(startedAt, setLoading);
  }, [loadMatchSetupStatus, router]);

  useEffect(() => {
    async function run() {
      const ok = await checkAuth();

      if (ok) {
        await Promise.all([loadData(), loadSystemSettings()]);
      }
    }

    run();
  }, [checkAuth, loadData, loadSystemSettings]);

  const currentMemberId = currentMember?.id || "";

  const upcomingMatches = useMemo(() => {
    return matches.filter(
      (match) =>
        (match.status !== "completed" && match.status !== "cancelled") ||
        (match.score_status === "pending_verification" &&
          currentMemberId &&
          String(match.score_entered_by_member_id || "") === String(currentMemberId))
    );
  }, [currentMemberId, matches]);

  const visibleTeams = useMemo(() => {
    return showPreviousSeasonTeams
      ? teams
      : teams.filter((team) => team.is_active !== false);
  }, [showPreviousSeasonTeams, teams]);

  useEffect(() => {
    if (visibleTeams.length === 0) {
      if (selectedCaptainTeamId) setSelectedCaptainTeamId("");
      return;
    }

    const selectedIsVisible = visibleTeams.some(
      (team) => String(team.id) === String(selectedCaptainTeamId)
    );

    if (!selectedIsVisible) {
      setSelectedCaptainTeamId(visibleTeams[0].id);
    }
  }, [selectedCaptainTeamId, visibleTeams]);

  const selectedCaptainTeam = useMemo(() => {
    return visibleTeams.find((team) => String(team.id) === String(selectedCaptainTeamId)) || visibleTeams[0] || null;
  }, [selectedCaptainTeamId, visibleTeams]);

  const selectedTeamId = selectedCaptainTeam?.id || "";

  function selectCaptainTeam(teamId) {
    setSelectedCaptainTeamId(teamId);
    writeDashboardTeamSelection(
      CAPTAIN_SELECTED_TEAM_STORAGE_PREFIX,
      currentMember?.id,
      teamId
    );
  }

  function openRosterModal(team) {
    if (team?.divisions?.leagues?.rosters_locked === true) {
      alert(rosterLockedMessage());
      return;
    }

    setRosterTeam(team);
  }

  const selectedUpcomingMatches = useMemo(() => {
    if (!selectedTeamId) return upcomingMatches;

    return upcomingMatches.filter(
      (match) =>
        String(match.home_team_id) === String(selectedTeamId) ||
        String(match.away_team_id) === String(selectedTeamId)
    );
  }, [upcomingMatches, selectedTeamId]);

  const selectedByeWeeks = useMemo(() => {
    if (!selectedTeamId) return byeWeeks;

    return byeWeeks.filter(
      (bye) => String(bye.team_id) === String(selectedTeamId)
    );
  }, [byeWeeks, selectedTeamId]);

  const upcomingItems = useMemo(() => {
    return [
      ...selectedUpcomingMatches.map((match) => ({
        type: "match",
        date: match.scheduled_date,
        time: match.scheduled_time || "00:00",
        data: match,
      })),
      ...selectedByeWeeks.map((bye) => ({
        type: "bye",
        date: bye.bye_date,
        time: "00:00",
        data: bye,
      })),
    ].sort((a, b) => {
      const aDate = new Date(`${a.date || "9999-12-31"}T${a.time || "00:00"}`);
      const bDate = new Date(`${b.date || "9999-12-31"}T${b.time || "00:00"}`);
      return aDate - bDate;
    });
  }, [selectedUpcomingMatches, selectedByeWeeks]);

  const pendingVerification = useMemo(() => {
    return matches.filter((match) => {
      const isSelectedTeam =
        !selectedTeamId ||
        String(match.home_team_id) === String(selectedTeamId) ||
        String(match.away_team_id) === String(selectedTeamId);
      const wasSubmittedByCurrentMember =
        currentMemberId &&
        String(match.score_entered_by_member_id || "") === String(currentMemberId);

      return isSelectedTeam && match.score_status === "pending_verification" && !wasSubmittedByCurrentMember;
    });
  }, [currentMemberId, matches, selectedTeamId]);

  const allPendingVerification = useMemo(() => {
    return matches.filter((match) => {
      const wasSubmittedByCurrentMember =
        currentMemberId &&
        String(match.score_entered_by_member_id || "") === String(currentMemberId);

      return match.score_status === "pending_verification" && !wasSubmittedByCurrentMember;
    });
  }, [currentMemberId, matches]);

  useEffect(() => {
    if (loading || captainSectionDefaulted) return;

    setCaptainSection(allPendingVerification.length > 0 ? "pending" : "upcoming");
    setCaptainSectionDefaulted(true);
  }, [allPendingVerification.length, captainSectionDefaulted, loading]);

  const completedMatches = useMemo(() => {
    return matches.filter((match) => {
      const isSelectedTeam =
        !selectedTeamId ||
        String(match.home_team_id) === String(selectedTeamId) ||
        String(match.away_team_id) === String(selectedTeamId);

      return isSelectedTeam && match.status === "completed" && match.score_status === "verified";
    });
  }, [matches, selectedTeamId]);

  function ratingForMember(memberId, seasonId, ratingType, fallbackMember = null) {
    const ratingRow = captainRatings.find(
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
        : (String(scoreDetailsMatch?.home_team?.id || "") === String(teamId) ||
          String(scoreDetailsMatch?.away_team?.id || "") === String(teamId)) && scoreDetailsMatch
          ? scoreDetailsMatch
          : null;
    const team =
      teams.find((item) => String(item.id) === String(teamId)) ||
      (String(matchDetails?.home_team?.id || "") === String(teamId) && matchDetails?.home_team) ||
      (String(matchDetails?.away_team?.id || "") === String(teamId) && matchDetails?.away_team) ||
      (String(scoreDetailsMatch?.home_team?.id || "") === String(teamId) && scoreDetailsMatch?.home_team) ||
      (String(scoreDetailsMatch?.away_team?.id || "") === String(teamId) && scoreDetailsMatch?.away_team);

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
      roster: sortRosterMembers(teamRosters[team.id] || team.roster || []),
      standing: teamStats[team.id]?.standing || null,
    };
  }

  function playerTeamRecord(teamId, memberId) {
    const record = { wins: 0, losses: 0, ties: 0 };

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
            record.ties += 1;
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

  function selectedTeamMatchResult(match) {
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

  function matchCard(match, options = {}) {
    const {
      showSetup = true,
      scoreButtonLabel = "Enter Match Scores",
      scoreButtonTitle = "Enter match scores",
      scoreButtonAction = null,
      scoreButtonTone = "slate",
    } = options;
    const canEnterScores =
      match.scheduled_date &&
      match.scheduled_date <= localDateString();

    const setupTeams = showSetup ? getCaptainTeamsForMatch(match) : [];
    const opposingEmails = showSetup ? opposingCaptainEmailsForMatch(match) : [];
    const selectedResult = selectedTeamMatchResult(match);
    const headingClass =
      selectedResult === "win"
        ? "bg-gradient-to-r from-emerald-700 to-green-700"
        : selectedResult === "loss"
          ? "bg-gradient-to-r from-rose-700 to-red-700"
          : "bg-gradient-to-r from-blue-800 to-indigo-800";
    const scoreButtonClass =
      scoreButtonTone === "red"
        ? "bg-red-700 hover:bg-red-800 disabled:cursor-not-allowed disabled:bg-slate-300"
        : "bg-slate-900 hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300";

    return (
      <div
        key={match.id}
        className="overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
      >
        <div className={`${headingClass} px-4 py-3 text-white`}>
          <div className="text-xs font-black uppercase tracking-wide text-white/80">
            Week {match.week_number || "-"}
          </div>
          <div className="mt-1 text-lg font-black">
            {match.home_team?.name || "Home"} vs {match.away_team?.name || "Away"}
          </div>
        </div>

        <div className="p-4">
          <div className="min-w-0">
            <div className="flex flex-wrap gap-2 text-xs font-bold uppercase tracking-wide">
              <span className="rounded-full bg-green-100 px-2 py-1 text-green-900">
                Home: {match.home_team?.name || "Home"}
              </span>

              <span className="rounded-full bg-indigo-100 px-2 py-1 text-indigo-900">
                Away: {match.away_team?.name || "Away"}
              </span>

              <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-700">
                {match.status || "scheduled"}
              </span>
            </div>

            {setupTeams.length > 0 && (
              <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="text-xs font-black uppercase tracking-wide text-slate-500">
                      Match Setup
                    </div>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {setupTeams.map((team) => {
                        const setupStatus = matchSetupStatus[matchSetupKey(match.id, team.id)];
                        const setupComplete = setupStatus?.complete === true;

                        return (
                          <span
                            key={team.id}
                            className={`text-xs font-bold ${setupComplete ? "text-green-700" : "text-amber-700"}`}
                          >
                            {team.name}: {setupComplete ? "Setup Complete" : "Setup Pending"}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {setupTeams.map((team) => {
                      const setupStatus = matchSetupStatus[matchSetupKey(match.id, team.id)];
                      const setupComplete = setupStatus?.complete === true;

                      return (
                        <button
                          key={team.id}
                          type="button"
                          onClick={() => openMatchSetup(match, team)}
                          className={`rounded-lg px-3 py-2 text-sm font-bold text-white ${
                            setupComplete
                              ? "bg-blue-700 hover:bg-blue-800"
                              : "bg-red-700 hover:bg-red-800"
                          }`}
                        >
                          Match Setup
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            <div className="mt-3 grid grid-cols-1 gap-2 text-sm text-slate-700 md:grid-cols-3">
              <div className="rounded-xl bg-slate-50 px-3 py-2">
                <div className="text-xs font-black uppercase tracking-wide text-slate-500">Date / Time</div>
                <div className="font-bold text-slate-900">{formatDate(match.scheduled_date)} at {formatDisplayTime(match.scheduled_time, "Time TBD")}</div>
              </div>
              <div className="rounded-xl bg-slate-50 px-3 py-2">
                <div className="text-xs font-black uppercase tracking-wide text-slate-500">Location</div>
                <div className="font-bold text-slate-900">{match.locations?.name || "No Location"}</div>
              </div>
              <div className="rounded-xl bg-slate-50 px-3 py-2">
                <div className="text-xs font-black uppercase tracking-wide text-slate-500">Score Status</div>
                <div className="font-bold text-slate-900">{formatScoreStatus(match)}</div>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {showSetup && (
                <button
                  type="button"
                  onClick={() => setMatchDetails(match)}
                  className="rounded-lg bg-blue-700 px-3 py-2 text-sm font-bold text-white hover:bg-blue-800"
                >
                  Match Details
                </button>
              )}

              {showSetup && (
                <button
                  type="button"
                  onClick={() => openMatchScoreSheet(match)}
                  className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-bold text-white hover:bg-emerald-800"
                >
                  Match Score Sheet
                </button>
              )}

              {showSetup && (
                <button
                  type="button"
                  onClick={() => emailOpposingCaptains(match)}
                  disabled={opposingEmails.length === 0}
                  className="rounded-lg bg-sky-700 px-3 py-2 text-sm font-bold text-white hover:bg-sky-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                  title={opposingEmails.length > 0 ? `Email ${opposingEmails.length} opposing captain contact${opposingEmails.length === 1 ? "" : "s"}` : "No opposing captain email addresses found"}
                >
                  Email Opposing Captains
                </button>
              )}

              <button
                type="button"
                disabled={!canEnterScores}
                onClick={() => {
                  if (scoreButtonAction) {
                    scoreButtonAction(match);
                    return;
                  }
                  if (canEnterScores && confirmUnsavedChanges()) router.push(`/matches/${match.id}`);
                }}
                className={`rounded-lg px-3 py-2 text-sm font-bold text-white ${scoreButtonClass}`}
                title={canEnterScores ? scoreButtonTitle : "Scores unlock on the scheduled match date"}
              >
                {scoreButtonLabel}
              </button>
            </div>

            {match.status === "completed" && (
              <div className="mt-2 rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-900">
                Score: {match.home_score ?? 0} - {match.away_score ?? 0} · Winner: {match.winning_team?.name || "—"}
              </div>
            )}

            {match.score_disputed && (
              <div className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-900">
                Disputed: {match.score_dispute_notes || "No notes provided."}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  function getCaptainTeamsForMatch(match) {
    return teams.filter((team) =>
      String(team.id) === String(match.home_team_id) ||
      String(team.id) === String(match.away_team_id)
    );
  }

  function opposingCaptainEmailsForMatch(match) {
    const captainTeamIds = new Set(getCaptainTeamsForMatch(match).map((team) => String(team.id)));
    const opposingTeams = [];

    if (captainTeamIds.has(String(match.home_team_id))) {
      opposingTeams.push(match.away_team);
    }

    if (captainTeamIds.has(String(match.away_team_id))) {
      opposingTeams.push(match.home_team);
    }

    return [
      ...new Set(
        opposingTeams
          .flatMap((team) => [
            team?.captain?.email,
            team?.co_captain_1?.email,
            team?.co_captain_2?.email,
          ])
          .map((email) => String(email || "").trim())
          .filter(Boolean)
      ),
    ];
  }

  function emailOpposingCaptains(match) {
    const emails = opposingCaptainEmailsForMatch(match);

    if (emails.length === 0) {
      alert("No opposing captain email addresses were found for this match.");
      return;
    }

    const subject = `LWRPC Match: ${match.home_team?.name || "Home"} vs ${match.away_team?.name || "Away"} on ${formatDate(match.scheduled_date)}`;
    const body = [
      "",
      "",
      `Match: ${match.home_team?.name || "Home"} vs ${match.away_team?.name || "Away"}`,
      `Date: ${formatDate(match.scheduled_date)} at ${formatDisplayTime(match.scheduled_time, "Time TBD")}`,
      `Location: ${match.locations?.name || "No Location"}`,
    ].join("\n");

    window.open(
      `mailto:${emails.join(",")}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`,
      "_self"
    );
  }

  async function openMatchSetup(match, team) {
    setSetupMatch(match);
    setSetupTeam(team);
    setSetupDirty(false);

    const [{ data: rosterData, error: rosterError }, { data: lineupData, error: lineupError }] =
      await Promise.all([
        supabase
          .from("team_members")
          .select("*, members(id, first_name, last_name, self_rating, dupr_id)")
          .eq("team_id", team.id)
          .order("members(last_name)", { ascending: true }),
        supabase
          .from("match_lineups")
          .select("*")
          .eq("match_id", match.id)
          .eq("team_id", team.id)
          .order("line_number", { ascending: true }),
      ]);

    if (rosterError) {
      alert(rosterError.message);
      return;
    }

    if (lineupError) {
      alert("Match setup requires the match_lineups schema update. Run the updated Supabase SQL, then try again.");
      return;
    }

    let ratingData = [];
    const seasonId = team.divisions?.leagues?.season_id;

    if (seasonId) {
      const { data, error } = await supabase
        .from("member_season_ratings")
        .select("*")
        .eq("season_id", seasonId);

      if (error) {
        alert(error.message);
        return;
      }

      ratingData = data || [];
    }

    const lineCount = Number(team.divisions?.number_of_lines || match.divisions?.number_of_lines || 3);
    const existingByLine = {};

    (lineupData || []).forEach((lineup) => {
      existingByLine[lineup.line_number] = lineup;
    });

    setSetupRoster(rosterData || []);
    setSetupRatings(ratingData);
    setSetupLineups(
      Array.from({ length: lineCount }, (_, index) => {
        const lineNumber = index + 1;
        const existing = existingByLine[lineNumber] || {};
        return {
          id: existing.id || "",
          line_number: lineNumber,
          player_1_member_id: existing.player_1_member_id || "",
          player_2_member_id: existing.player_2_member_id || "",
        };
      })
    );

  }

  async function openMatchScoreSheet(match) {
    const [{ data, error }, { data: defaultTemplateData, error: defaultTemplateError }] = await Promise.all([
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
      .order("line_number", { ascending: true }),
      match.divisions?.score_sheet_templates
        ? Promise.resolve({ data: [], error: null })
        : supabase
          .from("score_sheet_templates")
          .select("id, name, sheet_title, template_html, rules_text, is_active, is_default")
          .eq("is_default", true)
          .eq("is_active", true)
          .limit(1),
    ]);

    if (error) {
      alert("Unable to load saved match setup teams. Run the match_lineups schema update if needed, then try again.");
      return;
    }

    if (defaultTemplateError) {
      alert(`Unable to load the default Score Sheet template. Run the score sheet schema update if needed: ${defaultTemplateError.message}`);
      return;
    }

    const defaultTemplate = defaultTemplateData?.[0] || null;
    const scoreSheetMatch = {
      ...match,
      divisions: {
        ...(match.divisions || {}),
        score_sheet_templates: match.divisions?.score_sheet_templates || defaultTemplate,
      },
    };

    setScoreSheetPreview({
      title: `${match.home_team?.name || "Home"} vs ${match.away_team?.name || "Away"} Score Sheet`,
      subtitle: `${formatDate(match.scheduled_date)} / ${match.divisions?.name || "Division"}`,
      clubName: systemSettings.club_name,
      html: matchScoreSheetPrintHtml(scoreSheetMatch, data || [], ratingForMember, systemSettings.club_name),
    });
  }

  function setupMemberRating(member) {
    const ratingType = setupTeam?.divisions?.rating_type || "dupr";
    const ratingRow = setupRatings.find((rating) => rating.member_id === member?.id);

    if (ratingType === "primetime") return ratingRow?.season_primetime_rating ?? null;
    if (ratingType === "self_rating") return member?.self_rating ?? null;
    return ratingRow?.season_dupr_rating ?? null;
  }

  function setupRosterLabel(row) {
    const member = row.members;
    const rating = setupMemberRating(member);
    const ratingText =
      rating === null || rating === undefined || rating === ""
        ? "NR"
        : Number(rating).toFixed(2);

    return `${member?.last_name || ""}, ${member?.first_name || ""} (${setupRatingLabel()}: ${ratingText})`;
  }

  function setupRatingLabel() {
    const ratingType = setupTeam?.divisions?.rating_type || "dupr";
    if (ratingType === "primetime") return "PT";
    if (ratingType === "self_rating") return "Self";
    return "DUPR";
  }

  function setupTeamRating(lineup) {
    const players = [
      setupRoster.find((row) => row.member_id === lineup.player_1_member_id)?.members,
      setupRoster.find((row) => row.member_id === lineup.player_2_member_id)?.members,
    ];
    const ratings = players
      .map(setupMemberRating)
      .map((rating) => Number(rating))
      .filter((rating) => !Number.isNaN(rating));

    if (ratings.length === 0) return null;
    return ratings.reduce((sum, rating) => sum + rating, 0);
  }

  function setupEmailPlayerLabel(member) {
    const rating = setupMemberRating(member);
    const ratingText =
      rating === null || rating === undefined || rating === ""
        ? "NR"
        : Number(rating).toFixed(2);

    return `${escapeHtml(formatMemberName(member))} (${escapeHtml(setupRatingLabel())}: ${escapeHtml(ratingText)})`;
  }

  function setupLineWarning(lineup) {
    const maxRating = setupTeam?.divisions?.team_dupr_max;
    const rating = setupTeamRating(lineup);

    if (
      maxRating !== null &&
      maxRating !== undefined &&
      maxRating !== "" &&
      rating !== null &&
      rating > Number(maxRating)
    ) {
      return `Combined ${setupRatingLabel()} ${rating.toFixed(2)} is over the doubles team maximum of ${Number(maxRating).toFixed(2)}.`;
    }

    return "";
  }

  function setupDuplicateWarning(lineup) {
    const selectedPlayers = setupLineups
      .flatMap((setupLineup) => [
        setupLineup.player_1_member_id,
        setupLineup.player_2_member_id,
      ])
      .filter(Boolean)
      .map(String);

    if (
      lineup.player_1_member_id &&
      lineup.player_2_member_id &&
      String(lineup.player_1_member_id) === String(lineup.player_2_member_id)
    ) {
      return "The same player cannot be selected twice on one doubles team.";
    }

    const linePlayers = [
      lineup.player_1_member_id,
      lineup.player_2_member_id,
    ].filter(Boolean);

    const duplicatePlayer = linePlayers.find(
      (memberId) =>
        selectedPlayers.filter((selectedId) => selectedId === String(memberId))
          .length > 1
    );

    if (duplicatePlayer) {
      const member = setupRoster.find(
        (row) => String(row.member_id) === String(duplicatePlayer)
      )?.members;

      return `${formatMemberName(member)} is already selected on another match setup team.`;
    }

    return "";
  }

  function setupLineIssue(lineup) {
    if (!lineup.player_1_member_id || !lineup.player_2_member_id) {
      return `Team ${lineup.line_number} needs two players before match setup can be saved.`;
    }

    return setupDuplicateWarning(lineup) || setupLineWarning(lineup);
  }

  function setupValidationIssues() {
    return setupLineups
      .map(setupLineIssue)
      .filter(Boolean);
  }

  function updateSetupLineup(lineNumber, field, value) {
    setSetupDirty(true);
    setSetupLineups((current) =>
      current.map((lineup) =>
        lineup.line_number === lineNumber ? { ...lineup, [field]: value } : lineup
      )
    );
  }

  async function saveMatchSetup() {
    if (!setupMatch || !setupTeam) return;

    const validationIssues = setupValidationIssues();

    if (validationIssues.length > 0) {
      alert(
        [
          "Match setup cannot be saved yet.",
          "",
          ...validationIssues.map((issue) => `- ${issue}`),
          "",
          "Complete every doubles team and clear all lineup warnings before saving.",
        ].join("\n")
      );
      return;
    }

    setSavingSetup(true);

    const rows = setupLineups.map((lineup) => ({
      match_id: setupMatch.id,
      team_id: setupTeam.id,
      line_number: lineup.line_number,
      player_1_member_id: lineup.player_1_member_id || null,
      player_2_member_id: lineup.player_2_member_id || null,
      updated_at: new Date().toISOString(),
    }));

    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData?.session?.access_token;

    if (!accessToken) {
      setSavingSetup(false);
      alert("Your session expired. Please log in again before saving match setup.");
      return;
    }

    const response = await fetch("/api/match-lineups", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        matchId: setupMatch.id,
        teamId: setupTeam.id,
        lineups: rows,
      }),
    });
    const result = await response.json().catch(() => ({}));

    setSavingSetup(false);

    if (!response.ok || !result.success) {
      alert(result.error || "Match setup could not be saved.");
      return;
    }

    const nextStatusRows = (result.lineups || rows).map((row) => ({
      ...row,
      match_id: setupMatch.id,
      team_id: setupTeam.id,
    }));
    const nextStatus = buildSingleMatchSetupStatus(setupMatch, setupTeam.id, nextStatusRows);

    setMatchSetupStatus((current) => ({
      ...current,
      [matchSetupKey(setupMatch.id, setupTeam.id)]: nextStatus,
    }));

    const notificationSent = await sendMatchSetupNotification().catch((error) => {
      console.warn("Match setup notification failed.", error);
      return false;
    });

    setSetupMatch(null);
    setSetupTeam(null);
    setSetupRoster([]);
    setSetupLineups([]);
    setSetupRatings([]);
    setSetupDirty(false);
      alert(notificationSent ? "Match setup saved and opponent captain notification sent." : "Match setup saved, but the opponent notification could not be sent.");
  }

  async function openScoreDetails(match) {
    const { data, error } = await supabase
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
          division_lines(line_name, line_type, posted_to_dupr, team_win_points, standings_points_mode)
        )
      `)
      .eq("id", match.id)
      .single();

    if (error) {
      alert(error.message);
      return;
    }

    setScoreDetailsMatch(data);
  }

  async function sendMatchSetupNotification() {
    const opponentTeam =
      String(setupMatch.home_team_id) === String(setupTeam.id)
        ? setupMatch.away_team
        : setupMatch.home_team;

    const { emails, phones } = splitNotificationRecipients(captainContacts(opponentTeam));

    if (emails.length === 0 && phones.length === 0) {
      return false;
    }

    const opponentStatus =
      matchSetupStatus[
        matchSetupKey(
          setupMatch.id,
          String(setupMatch.home_team_id) === String(setupTeam.id)
            ? setupMatch.away_team_id
            : setupMatch.home_team_id
        )
      ];
    const htmlLineups = setupLineups
      .map((lineup) => {
        const player1 = setupRoster.find((row) => String(row.member_id) === String(lineup.player_1_member_id))?.members;
        const player2 = setupRoster.find((row) => String(row.member_id) === String(lineup.player_2_member_id))?.members;
        const teamRating = setupTeamRating(lineup);

        return [
          `<li><strong>Team ${lineup.line_number}:</strong>`,
          `${setupEmailPlayerLabel(player1)} / ${setupEmailPlayerLabel(player2)}`,
          `<strong>Team Rating:</strong> ${teamRating === null ? "NR" : escapeHtml(teamRating.toFixed(2))}`,
          "</li>",
        ].join(" ");
      })
      .join("");
    const template = await loadClientEmailTemplate(EMAIL_TEMPLATE_KEYS.matchSetupSaved);
    const rendered = renderEmailTemplate(template, {
      setup_team: setupTeam.name || "Team",
      opponent_team: opponentTeam?.name || "Opponent",
      home_team: setupMatch.home_team?.name || "Home",
      away_team: setupMatch.away_team?.name || "Away",
      match_date: formatDate(setupMatch.scheduled_date),
      match_time: formatDisplayTime(setupMatch.scheduled_time, "Time TBD"),
      division: setupTeam.divisions?.name || setupMatch.divisions?.name || "Division",
      lineup_list: htmlLineups,
      opponent_setup_status: opponentStatus?.complete
        ? "Your match setup is already marked complete."
        : "Please log into the Captain Dashboard and enter your match setup if you have not already done so.",
      league_site_url: systemSettings.league_site_url,
      main_email: systemSettings.main_email,
    });

    const response = await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        emails,
        phones,
        subject: rendered.subject,
        text: rendered.text,
        html: rendered.html,
        smsBody: rendered.text,
      }),
    });

    if (!response.ok) {
      console.warn("Match setup notification failed.");
      return false;
    }

    const result = await response.json().catch(() => null);
    const emailSent = Number(result?.email?.sent || 0);
    const smsSent = Number(result?.sms?.sent || 0);

    return emailSent + smsSent > 0;
  }

  async function displayDivisionCaptains(team) {
    if (!team?.division_id) {
      alert("This team is not assigned to a division.");
      return;
    }

    const { data, error } = await supabase
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
      .order("name", { ascending: true });

    if (error) {
      alert(error.message);
      return;
    }

    setDivisionCaptainsPreview({
      leagueName: team.divisions?.leagues?.name || "League",
      divisionName: team.divisions?.name || "Division",
      teams: data || [],
    });
  }

  async function openDivisionSchedule(team) {
    if (!team?.division_id) {
      alert("This team is not assigned to a division.");
      return;
    }

    setDivisionScheduleTeam(team);
    setDivisionScheduleTeams([]);
    setDivisionScheduleMatches([]);
    setDivisionScheduleByes([]);
    setDivisionScheduleRatings([]);
    setDivisionScheduleLoading(true);

    const seasonId = team.divisions?.leagues?.season_id;
    const [
      { data: divisionTeams, error: teamsError },
      { data: divisionMatches, error: matchesError },
      { data: divisionByes, error: byesError },
      { data: divisionStandings, error: standingsError },
      { data: divisionRatings, error: ratingsError },
    ] =
      await Promise.all([
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
              division_lines (
                line_name,
                line_type,
                posted_to_dupr,
                team_win_points
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
          .eq("division_id", team.division_id)
          .order("bye_date", { ascending: true }),
        supabase
          .from("team_standings")
          .select("team_id, rank, standings_points, match_wins, match_losses, match_ties")
          .eq("division_id", team.division_id),
        seasonId
          ? supabase
              .from("member_season_ratings")
              .select("member_id, season_dupr_rating, season_primetime_rating")
              .eq("season_id", seasonId)
          : Promise.resolve({ data: [], error: null }),
      ]);

    setDivisionScheduleLoading(false);

    if (teamsError) {
      alert(teamsError.message);
      return;
    }

    if (matchesError) {
      alert(matchesError.message);
      return;
    }

    if (byesError) {
      alert(byesError.message);
      return;
    }

    if (standingsError) {
      alert(standingsError.message);
      return;
    }

    if (ratingsError) {
      alert(ratingsError.message);
      return;
    }

    const standingsByTeamId = Object.fromEntries(
      (divisionStandings || []).map((standing) => [String(standing.team_id), standing])
    );

    setDivisionScheduleTeams(
      (divisionTeams || []).map((divisionTeam) => ({
        ...divisionTeam,
        standing: standingsByTeamId[String(divisionTeam.id)] || null,
      })).sort(compareDivisionScheduleTeams)
    );
    setDivisionScheduleMatches(divisionMatches || []);
    setDivisionScheduleByes(filterByesForPublishedSchedule(divisionByes || [], divisionMatches || []));
    setDivisionScheduleRatings(divisionRatings || []);
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
      path,
    });
  }

  if (loading) {
    return <LoadingScreen subtitle="Loading Captain Dashboard..." />;
  }

  if (!currentMember) {
    return (
      <main className="min-h-screen bg-slate-100 p-4 md:p-6">
        <div className="mx-auto max-w-7xl">
          <AppHeader
            title="Captain Dashboard"
            subtitle="Captain tools, match operations, and score verification."
          />

          <div className="rounded-2xl bg-white p-8 text-slate-600 shadow">
            Your login email is not currently linked to a member record.
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-6">
      <div className="mx-auto max-w-7xl">
        <AppHeader
          title="Captain Dashboard"
          subtitle="Captain tools, upcoming matches, score entry, and score verification."
          welcomeAction={
            <button
              type="button"
              onClick={async () => {
                const document = await guidePdfDocument(supabase, captainGuide);
                if (document) setPdfDocument(document);
              }}
              className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-400"
            >
              Captains Guide
            </button>
          }
          actions={
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-1">
              <button
                type="button"
                onClick={() => {
                  if (confirmUnsavedChanges()) router.push("/reset-password");
                }}
                className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-500"
              >
                Change Password
              </button>

              <a
                href="https://lwrpickleballclub.com/manage-membership"
                target="_blank"
                rel="noreferrer"
                className="rounded-xl bg-white px-4 py-2 text-center text-sm font-bold text-slate-950 hover:bg-slate-100"
              >
                Membership Info
              </a>

              <a
                href="mailto:info@lwrpickleballclub.com"
                className="rounded-xl bg-emerald-500 px-4 py-2 text-center text-sm font-bold text-white hover:bg-emerald-400"
              >
                Contact League
              </a>
            </div>
          }
        />

        <LoginMessageModal
          templateKey="captain_login_popup"
          audienceLabel="Captain Message"
        />

        {setupMatch && setupTeam && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
          <div className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-2xl">
            <div className="bg-slate-950 p-5 text-white">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wide text-blue-200">
                    Match Setup
                  </div>
                  <h2 className="mt-1 text-2xl font-black">
                    {setupMatch.home_team?.name || "Home"} vs {setupMatch.away_team?.name || "Away"}
                  </h2>
                  <div className="mt-3 flex flex-wrap items-center gap-3 font-semibold text-slate-200">
                    <span className="text-xl font-black text-white md:text-2xl">
                      {formatDate(setupMatch.scheduled_date)}
                    </span>
                    <span className="rounded-lg bg-white/15 px-3 py-1 text-lg font-black text-white md:text-xl">
                      {formatDisplayTime(setupMatch.scheduled_time, "Time TBD")}
                    </span>
                    <span className="text-sm">{setupTeam.divisions?.leagues?.name || "League"}</span>
                    <span className="text-sm">{setupTeam.divisions?.name || "Division"}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2 text-sm md:min-w-72">
                  <div className="rounded-xl bg-white/10 px-4 py-3">
                    <div className="text-xs uppercase tracking-wide text-blue-200">Home Team</div>
                    <div className="font-bold">{setupMatch.home_team?.name || "Home"}</div>
                  </div>
                  <div className="rounded-xl bg-white/10 px-4 py-3">
                    <div className="text-xs uppercase tracking-wide text-blue-200">Setting Up</div>
                    <div className="font-bold">{setupTeam.name}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="overflow-y-auto p-4 sm:p-6">
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="rounded-xl bg-blue-50 px-4 py-3 text-sm text-blue-950">
                <span className="font-bold">Doubles Team Maximum:</span>{" "}
                {setupTeam.divisions?.team_dupr_max ?? "None"} ({setupRatingLabel()})
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={saveMatchSetup}
                  disabled={savingSetup}
                  className="rounded-xl bg-blue-700 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50 sm:py-2"
                >
                  {savingSetup ? "Saving..." : "Save Match Setup"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (!confirmUnsavedChanges()) return;

                    setSetupMatch(null);
                    setSetupTeam(null);
                    setSetupRoster([]);
                    setSetupLineups([]);
                    setSetupDirty(false);
                  }}
                  className="rounded-xl bg-slate-200 px-4 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-300 sm:py-2"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
              {setupLineups.map((lineup) => {
                const rating = setupTeamRating(lineup);
                const warning = setupLineIssue(lineup);

                return (
                  <div key={lineup.line_number} className={`rounded-xl border p-4 ${warning ? "border-amber-300 bg-amber-50" : "border-slate-200"}`}>
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <div className="font-bold text-slate-900">Team {lineup.line_number}</div>
                      <div className="rounded-full bg-blue-100 px-2 py-1 text-xs font-bold text-blue-900">
                        {setupRatingLabel()}: {rating === null ? "NR" : rating.toFixed(2)}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <select
                        value={lineup.player_1_member_id}
                        onChange={(e) => updateSetupLineup(lineup.line_number, "player_1_member_id", e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-3 py-3 text-sm sm:py-2"
                      >
                        <option value="">Select Player 1</option>
                        {setupRoster.map((row) => (
                          <option key={row.member_id} value={row.member_id}>
                            {setupRosterLabel(row)}
                          </option>
                        ))}
                      </select>

                      <select
                        value={lineup.player_2_member_id}
                        onChange={(e) => updateSetupLineup(lineup.line_number, "player_2_member_id", e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-3 py-3 text-sm sm:py-2"
                      >
                        <option value="">Select Player 2</option>
                        {setupRoster.map((row) => (
                          <option key={row.member_id} value={row.member_id}>
                            {setupRosterLabel(row)}
                          </option>
                        ))}
                      </select>
                    </div>

                    {warning && (
                      <div className="mt-3 rounded-lg bg-amber-100 px-3 py-2 text-xs font-semibold text-amber-950">
                        {warning}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            </div>
          </div>
          </div>
        )}

        <div className="mt-6 overflow-hidden rounded-2xl bg-white shadow">
          <div className="border-b border-slate-200 bg-slate-950 px-4 py-5 text-white md:px-6">
            <div className="flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
              <div>
                <div className="text-xs font-black uppercase tracking-wide text-blue-200">
                  Captain Workspace
                </div>
                <h2 className="mt-1 text-2xl font-black">My Teams</h2>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-300 md:justify-end">
                <span>{visibleTeams.length} team{visibleTeams.length === 1 ? "" : "s"}</span>
                <button
                  type="button"
                  onClick={() => setShowPreviousSeasonTeams((value) => !value)}
                  className="rounded-full bg-white/10 px-3 py-1 text-xs font-black text-white hover:bg-white/20"
                >
                  {showPreviousSeasonTeams ? "Show Active Teams" : "Show Previous Seasons Teams"}
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-4 p-4 md:p-6">
            {visibleTeams.length > 1 && (
              <DashboardTeamSelector
                teams={visibleTeams}
                teamStats={teamStats}
                selectedTeamId={selectedTeamId}
                onSelect={selectCaptainTeam}
              />
            )}

            {selectedCaptainTeam ? [selectedCaptainTeam].map((team) => {
              const stats = teamStats[team.id] || {};
              const standing = stats.standing;
              const selected = String(team.id) === String(selectedTeamId);
              const documentsOpen = openLeagueDocuments[team.id] === true;

              return (
              <div
                key={team.id}
                className={`overflow-hidden rounded-2xl border shadow-md ${
                  selected ? "border-4 border-emerald-500 bg-blue-50 shadow-lg" : "border-slate-200 bg-white"
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
                        if (confirmUnsavedChanges()) {
                          router.push(`/standings?league=${team.divisions?.leagues?.id || ""}&division=${team.divisions?.id || ""}`);
                        }
                      }}
                      className="cursor-pointer rounded-xl border border-blue-300 bg-gradient-to-b from-sky-400 to-blue-800 px-4 py-2 text-xs font-black uppercase tracking-wide text-white shadow-[0_5px_0_#1e3a8a,0_10px_18px_rgba(15,23,42,0.25)] transition hover:-translate-y-0.5 hover:from-sky-300 hover:to-blue-700 active:translate-y-1 active:shadow-[0_2px_0_#1e3a8a,0_5px_10px_rgba(15,23,42,0.22)]"
                    >
                      Rank {standing?.rank ? `#${standing.rank}` : "N/A"}
                    </button>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs font-bold text-slate-700">
                  <span className="rounded-xl bg-white px-2 py-2 shadow-sm">
                    <span className="block text-[10px] uppercase tracking-wide text-slate-500">Players</span>
                    {stats.playerCount ?? 0}
                  </span>
                  <span className="rounded-xl bg-white px-2 py-2 shadow-sm">
                    <span className="block text-[10px] uppercase tracking-wide text-slate-500">Season Points</span>
                    {standing?.standings_points ?? 0}
                  </span>
                  <span className="rounded-xl bg-white px-2 py-2 shadow-sm">
                    <span className="block text-[10px] uppercase tracking-wide text-slate-500">W-L-T</span>
                    {standing?.match_wins ?? 0}-{standing?.match_losses ?? 0}-{standing?.match_ties ?? 0}
                  </span>
                </div>
                </div>

                <div className="grid grid-cols-1 gap-2 border-t border-slate-100 p-4 sm:grid-cols-3">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      if (team.divisions?.leagues?.rosters_locked === true) {
                        alert(rosterLockedMessage());
                        return;
                      }

                      if (confirmUnsavedChanges()) router.push(`/teams/${team.id}`);
                    }}
                    className="cursor-pointer rounded-xl bg-blue-100 px-3 py-3 text-sm font-bold text-blue-900 shadow-sm hover:bg-blue-200"
                  >
                    Manage Roster
                  </button>

                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      openDivisionSchedule(team);
                    }}
                    className="cursor-pointer rounded-xl bg-indigo-100 px-3 py-3 text-sm font-bold text-indigo-900 shadow-sm hover:bg-indigo-200"
                  >
                    Schedules/Standings
                  </button>

                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      displayDivisionCaptains(team);
                    }}
                    className="cursor-pointer rounded-xl bg-blue-100 px-3 py-3 text-sm font-bold text-blue-900 shadow-sm hover:bg-blue-200"
                  >
                    Division Captains
                  </button>
                </div>

                <div className="border-t border-blue-100 bg-gradient-to-r from-blue-50 via-cyan-50 to-slate-50">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setOpenLeagueDocuments((current) => ({
                        ...current,
                        [team.id]: !current[team.id],
                      }));
                    }}
                    className="flex w-full items-center justify-between px-4 py-3 text-left text-xs font-black uppercase tracking-wide text-blue-950 hover:bg-white/50"
                  >
                    <span className="rounded-full bg-blue-700 px-3 py-1 text-white shadow-sm">
                      League Documents
                    </span>
                    <span className="rounded-full bg-white px-3 py-1 text-blue-900 shadow-sm">
                      {documentsOpen ? "Hide" : "Show"}
                    </span>
                  </button>

                  {documentsOpen && (
                    <div className="grid grid-cols-1 gap-2 px-4 pb-4 sm:grid-cols-2 lg:grid-cols-3">
                      {LEAGUE_DOCUMENT_TYPES.map((documentType) => {
                        const hasDocument = Boolean(leagueDocumentPath(team.divisions?.leagues, documentType));

                        return (
                          <button
                            key={documentType.key}
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              openLeagueDocument(team, documentType);
                            }}
                            disabled={!hasDocument}
                            className="rounded-xl bg-emerald-100 px-3 py-3 text-sm font-bold text-emerald-950 shadow-sm hover:bg-emerald-200 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 disabled:shadow-none"
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
            }) : null}

            {visibleTeams.length === 0 && (
              <div className="rounded-xl bg-slate-50 p-6 text-slate-500">
                {teams.length === 0
                  ? "You are not currently assigned as captain, co-captain, or club pro of any team."
                  : "No active captain or club pro teams are currently shown. Use Previous Seasons Teams to view older teams."}
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-white/80 bg-gradient-to-br from-slate-200 via-white to-blue-100 p-3 shadow-xl ring-1 ring-slate-200">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <CaptainSectionButton
            active={captainSection === "upcoming"}
            label="Upcoming/Unverified Matches"
            value={upcomingItems.length}
            tone="blue"
            onClick={() => setCaptainSection("upcoming")}
          />
          <CaptainSectionButton
            active={captainSection === "completed"}
            label="Completed Matches"
            value={completedMatches.length}
            tone="emerald"
            onClick={() => setCaptainSection("completed")}
          />
          <CaptainSectionButton
            active={captainSection === "pending"}
            label="Pending Score Verification"
            value={pendingVerification.length}
            tone="red"
            onClick={() => setCaptainSection("pending")}
          />
        </div>
        </div>

        {captainSection === "pending" && (
          <Section title={`Pending Score Verification${selectedCaptainTeam ? `: ${selectedCaptainTeam.name}` : ""}`} count={pendingVerification.length}>
            {pendingVerification.map((match) =>
              matchCard(match, {
                showSetup: false,
                scoreButtonLabel: "Review / Validate Scores",
                scoreButtonTitle: "Open score review, then validate or dispute",
                scoreButtonTone: "red",
              })
            )}
            {pendingVerification.length === 0 && <Empty message="No scores currently need verification." />}
          </Section>
        )}

        {captainSection === "upcoming" && (
          <Section
            title={`Upcoming/Unverified Matches / Byes${selectedCaptainTeam ? `: ${selectedCaptainTeam.name}` : ""}`}
            count={upcomingItems.length}
          >
            {upcomingItems.map((item) =>
              item.type === "match" ? matchCard(item.data) : byeCard(item.data)
            )}

            {upcomingItems.length === 0 && <Empty message="No upcoming or unverified matches or byes found." />}
          </Section>
        )}

        {captainSection === "completed" && (
          <Section title={`Completed Matches${selectedCaptainTeam ? `: ${selectedCaptainTeam.name}` : ""}`} count={completedMatches.length}>
            {completedMatches.map((match) =>
              matchCard(match, {
                showSetup: false,
                scoreButtonLabel: "Match Score Details",
                scoreButtonTitle: "View match score details",
                scoreButtonAction: openScoreDetails,
              })
            )}
            {completedMatches.length === 0 && <Empty message="No completed matches found." />}
          </Section>
        )}

        {divisionScheduleTeam && (
          <TeamScheduleModal
            title="Division Team Schedules/Standings"
            subtitle={`${divisionScheduleTeam.divisions?.leagues?.name || "League"} · ${divisionScheduleTeam.divisions?.name || "Division"}`}
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

        {pdfDocument && (
          <PdfViewerModal
            document={pdfDocument}
            onClose={() => setPdfDocument(null)}
          />
        )}

        {scoreSheetPreview && (
          <PrintableDocumentModal
            document={scoreSheetPreview}
            onClose={() => setScoreSheetPreview(null)}
          />
        )}

        {divisionCaptainsPreview && (
          <DivisionCaptainsModal
            data={divisionCaptainsPreview}
            onClose={() => setDivisionCaptainsPreview(null)}
          />
        )}

        {scoreDetailsMatch && (
          <MatchScoreDetailsModal
            match={scoreDetailsMatch}
            ratingForMember={ratingForMember}
            teamWithRoster={teamWithRoster}
            onOpenRoster={openRosterModal}
            clubName={systemSettings.club_name}
            onClose={() => setScoreDetailsMatch(null)}
          />
        )}

        {matchDetails && (
          <MatchDetailsModal
            match={matchDetails}
            ratingForMember={ratingForMember}
            teamWithRoster={teamWithRoster}
            onOpenRoster={openRosterModal}
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
      </div>
    </main>
  );
}

function finishLoading(startedAt, setLoading) {
  const elapsed = Date.now() - startedAt;
  const remaining = Math.max(0, 500 - elapsed);

  setTimeout(() => {
    setLoading(false);
  }, remaining);
}

function rosterLockedMessage() {
  return [
    "Team rosters are locked for this league.",
    "",
    "Captains and co-captains cannot view or modify rosters while the league is locked.",
    "Please contact a League Manager or Commissioner for roster changes.",
  ].join("\n");
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

function PrintableDocumentModal({ document, onClose }) {
  const [viewerReady, setViewerReady] = useState(false);

  useEffect(() => {
    setViewerReady(true);
  }, []);

  function printDocument() {
    window.localStorage.setItem(
      "lwrpc-print-payload",
      JSON.stringify({
        title: document.title,
        clubName: document.clubName,
        body: document.html,
      })
    );

    const printWindow = window.open("/print", "_blank", "width=1000,height=800");

    if (!printWindow) {
      alert("Unable to open print preview. Please allow popups for this site.");
      return;
    }

    printWindow.focus();
  }

  function downloadDocument() {
    const blob = new Blob([printableHtmlDocument(document)], {
      type: "text/html;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = window.document.createElement("a");

    link.href = url;
    link.download = `${slugifyFileName(document.title)}.html`;
    window.document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
      <div className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-950 px-5 py-4 text-white md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-xs font-black uppercase tracking-wide text-emerald-200">
              {document.subtitle}
            </div>
            <h2 className="mt-1 text-2xl font-black">{document.title}</h2>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={downloadDocument}
              className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-slate-950 hover:bg-slate-100"
            >
              Download
            </button>

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
            srcDoc={printableHtmlDocument(document)}
            className="h-[75vh] w-full bg-slate-100"
          />
        ) : (
          <div className="flex h-[75vh] items-center justify-center bg-slate-100 text-sm font-semibold text-slate-600">
            Loading preview...
          </div>
        )}
      </div>
    </div>
  );
}

function DivisionCaptainsModal({ data, onClose }) {
  const rows = divisionCaptainRows(data.teams);

  function printCaptains() {
    const body = divisionCaptainsPrintHtml(data);

    window.localStorage.setItem(
      "lwrpc-print-payload",
      JSON.stringify({
        title: `${data.divisionName || "Division"} Captains`,
        body,
      })
    );

    const printWindow = window.open("/print", "_blank", "width=900,height=700");

    if (!printWindow) {
      alert("Unable to open print preview. Please allow popups for this site.");
      return;
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-3 sm:p-4">
      <div className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-950 px-5 py-4 text-white md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-xs font-black uppercase tracking-wide text-blue-200">
              {data.leagueName}
            </div>
            <h2 className="mt-1 text-2xl font-black">{data.divisionName} Captains</h2>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={printCaptains}
              className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-slate-950 hover:bg-slate-100"
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

        <div className="overflow-auto p-4">
          <table className="w-full min-w-[900px] border-collapse text-sm">
            <thead className="bg-slate-900 text-xs uppercase tracking-wide text-white">
              <tr>
                <th className="border border-slate-300 p-3 text-left">Team</th>
                <th className="border border-slate-300 p-3 text-left">Role</th>
                <th className="border border-slate-300 p-3 text-left">Name</th>
                <th className="border border-slate-300 p-3 text-left">Email</th>
                <th className="border border-slate-300 p-3 text-left">Phone</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={`${row.teamName}:${row.role}:${row.member.id || row.member.email}`} className="even:bg-slate-50">
                  <td className="whitespace-nowrap border border-slate-300 p-3 font-semibold text-slate-950">{row.teamName}</td>
                  <td className="whitespace-nowrap border border-slate-300 p-3">{row.role}</td>
                  <td className="whitespace-nowrap border border-slate-300 p-3">{formatMemberName(row.member)}</td>
                  <td className="whitespace-nowrap border border-slate-300 p-3">{row.member.email || ""}</td>
                  <td className="whitespace-nowrap border border-slate-300 p-3">{formatPhoneNumberForStorage(row.member.phone)}</td>
                </tr>
              ))}

              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="border border-slate-300 p-6 text-center text-slate-500">
                    No captains found for this division.
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

function RosterModal({ team, ratingForMember, playerRecordForTeam, onClose }) {
  const roster = team.roster || [];
  const seasonId = team.divisions?.leagues?.season_id;
  const ratingType = team.divisions?.rating_type || "dupr";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-2 sm:p-4">
      <div className="flex max-h-[94dvh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex flex-col gap-3 bg-gradient-to-r from-slate-950 to-blue-800 px-4 py-4 text-white md:flex-row md:items-start md:justify-between">
          <div>
            <div className="text-xs font-black uppercase tracking-wide text-blue-100">Team Roster</div>
            <h2 className="mt-1 text-xl font-black sm:text-2xl">{team.name}</h2>
            <div className="mt-1 text-sm font-semibold text-blue-100">
              {team.divisions?.leagues?.name || ""} / {team.divisions?.name || ""}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-white/10 px-4 py-2 text-sm font-bold text-white hover:bg-white/20"
          >
            Close
          </button>
        </div>

        <div className="overflow-auto p-3 sm:p-5">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-slate-900 text-xs uppercase tracking-wide text-white">
              <tr>
                <th className="p-3 text-left">Player</th>
                <th className="p-3 text-left">Rating</th>
                <th className="p-3 text-left">Season Record</th>
                <th className="hidden p-3 text-left md:table-cell">Email</th>
                <th className="hidden p-3 text-left md:table-cell">Phone</th>
              </tr>
            </thead>
            <tbody>
              {roster.map((player) => (
                <tr key={player.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="p-3 font-bold text-slate-900">{formatMemberName(player)}</td>
                  <td className="p-3 font-bold text-blue-900">
                    {ratingForMember(player.id, seasonId, ratingType, player)}
                  </td>
                  <td className="p-3 font-semibold text-slate-700">
                    {formatPlayerRecord(playerRecordForTeam(team.id, player.id))}
                  </td>
                  <td className="hidden p-3 text-slate-700 md:table-cell">{player.email || ""}</td>
                  <td className="hidden p-3 text-slate-700 md:table-cell">
                    {formatPhoneNumberForStorage(player.phone) || ""}
                  </td>
                </tr>
              ))}
              {roster.length === 0 && (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-slate-500">
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

function MatchDetailsModal({ match, ratingForMember, teamWithRoster, onOpenRoster, onClose }) {
  const location = match.locations;
  const mapUrl = mapLink(location);
  const homeTeam = teamWithRoster(match.home_team_id);
  const awayTeam = teamWithRoster(match.away_team_id);
  const homeScore = match.home_score ?? null;
  const awayScore = match.away_score ?? null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-2 sm:p-4">
      <div className="flex max-h-[94dvh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex flex-col gap-3 bg-gradient-to-r from-slate-800 to-zinc-800 px-4 py-4 text-white md:flex-row md:items-start md:justify-between">
          <div>
            <div className="text-xs font-black uppercase tracking-wide text-slate-200">
              Week {match.week_number || "-"} Match Details
            </div>
            <h2 className="mt-1 text-xl font-black sm:text-2xl">
              {match.home_team?.name || "Home"} vs {match.away_team?.name || "Away"}
            </h2>
            <div className="mt-2 flex flex-wrap gap-2 text-sm font-semibold text-slate-200">
              <span>{formatDate(match.scheduled_date)} at {formatDisplayTime(match.scheduled_time, "Time TBD")}</span>
              {homeScore !== null && awayScore !== null && (
                <span className="rounded-full bg-white/15 px-3 py-0.5 text-white">
                  Match Score: {homeScore}-{awayScore}
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-white/10 px-4 py-2 text-sm font-bold text-white hover:bg-white/20"
          >
            Close
          </button>
        </div>

        <div className="overflow-y-auto">
          <div className="grid gap-3 bg-slate-50 p-3 sm:p-5 md:grid-cols-2">
            <MatchTeamDetail
              label="Home Team"
              team={homeTeam || match.home_team}
              tone="green"
              onOpenRoster={homeTeam ? () => onOpenRoster(homeTeam) : null}
            />
            <MatchTeamDetail
              label="Away Team"
              team={awayTeam || match.away_team}
              tone="gray"
              onOpenRoster={awayTeam ? () => onOpenRoster(awayTeam) : null}
            />
          </div>

          <div className="space-y-3 p-3 sm:p-5">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="text-xs font-black uppercase tracking-wide text-slate-500">Location</div>
              <div className="mt-1 text-lg font-black text-slate-900">{location?.name || "Location TBD"}</div>
              <div className="mt-1 text-sm font-semibold text-slate-600">
                {formatLocationAddress(location)}
              </div>
            </div>

            {match.status === "completed" && match.score_status === "verified" && (
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="text-xs font-black uppercase tracking-wide text-slate-500">Games</div>
                <div className="mt-3 space-y-3">
                  {[...(match.match_lines || [])]
                    .sort((a, b) => Number(a.line_number || 0) - Number(b.line_number || 0))
                    .map((line) => (
                      <MatchLineResult
                        key={line.id}
                        line={line}
                        match={match}
                        ratingForMember={ratingForMember}
                      />
                    ))}
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {mapUrl && (
                <a
                  href={mapUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-xl bg-slate-700 px-4 py-3 text-sm font-bold text-white hover:bg-slate-800"
                >
                  Open Home Team Address Map
                </a>
              )}
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl bg-slate-200 px-4 py-3 text-sm font-bold text-slate-900 hover:bg-slate-300"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MatchTeamDetail({ label, team, tone, onOpenRoster }) {
  const tones = {
    green: "bg-emerald-50 text-emerald-950",
    gray: "bg-indigo-50 text-indigo-950",
  };
  const standing = team?.standing;

  return (
    <div className={`rounded-2xl p-4 shadow-sm ${tones[tone] || tones.gray}`}>
      <div className="text-xs font-black uppercase tracking-wide opacity-70">{label}</div>
      <div className="mt-1 text-xl font-black">{team?.name || label}</div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-sm font-bold">
        <div className="rounded-xl bg-white px-3 py-2">
          <div className="text-xs uppercase tracking-wide text-slate-500">Rank</div>
          #{standing?.rank || "N/A"}
        </div>
        <div className="rounded-xl bg-white px-3 py-2">
          <div className="text-xs uppercase tracking-wide text-slate-500">Record</div>
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
  const homeTeamCardClass =
    winnerSide === "home"
      ? "border-4 border-emerald-600 shadow-md ring-2 ring-emerald-100"
      : "border border-transparent";
  const awayTeamCardClass =
    winnerSide === "away"
      ? "border-4 border-emerald-600 shadow-md ring-2 ring-emerald-100"
      : "border border-transparent";

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
        <div className={`rounded-xl bg-emerald-50 px-3 py-3 text-sm font-semibold text-emerald-950 ${homeTeamCardClass}`}>
          <div className="text-xs font-black uppercase tracking-wide text-emerald-800">Home: {match.home_team?.name || "Home"}</div>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <PlayerScoreCard member={line.home_player_1} match={match} ratingForMember={ratingForMember} tone="home" />
            <PlayerScoreCard member={line.home_player_2} match={match} ratingForMember={ratingForMember} tone="home" />
          </div>
          <div className="mt-1 text-xs font-black uppercase tracking-wide text-emerald-800">
            Team Rating: {teamLineRating([line.home_player_1, line.home_player_2], match, ratingForMember)}
          </div>
        </div>
        <div className={`rounded-xl bg-indigo-50 px-3 py-3 text-sm font-semibold text-indigo-950 ${awayTeamCardClass}`}>
          <div className="text-xs font-black uppercase tracking-wide text-indigo-800">Away: {match.away_team?.name || "Away"}</div>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <PlayerScoreCard member={line.away_player_1} match={match} ratingForMember={ratingForMember} tone="away" />
            <PlayerScoreCard member={line.away_player_2} match={match} ratingForMember={ratingForMember} tone="away" />
          </div>
          <div className="mt-1 text-xs font-black uppercase tracking-wide text-indigo-800">
            Team Rating: {teamLineRating([line.away_player_1, line.away_player_2], match, ratingForMember)}
          </div>
        </div>
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

function PlayerScoreCard({ member, match, ratingForMember, tone }) {
  const tones = {
    home: "border-emerald-200 bg-white text-emerald-950",
    away: "border-indigo-200 bg-white text-indigo-950",
  };

  return (
    <div className={`rounded-lg border px-3 py-2 shadow-sm ${tones[tone] || tones.home}`}>
      <div className="text-base font-black leading-tight text-slate-950">
        {formatMemberName(member) || "Player TBD"}
      </div>
      <div className="mt-1 text-xs font-black uppercase tracking-wide text-slate-500">
        Rating {member?.id ? ratingForMember(member.id, match.leagues?.season_id, match.divisions?.rating_type, member) : "NR"}
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

function MatchScoreDetailsModal({ match, ratingForMember, teamWithRoster, onOpenRoster, clubName, onClose }) {
  const lines = [...(match.match_lines || [])].sort(
    (a, b) => Number(a.line_number || 0) - Number(b.line_number || 0)
  );
  const homeTeam = teamWithRoster(match.home_team_id);
  const awayTeam = teamWithRoster(match.away_team_id);

  function printScoreDetails() {
    window.localStorage.setItem(
      "lwrpc-print-payload",
      JSON.stringify({
        title: `${match.home_team?.name || "Home"} vs ${match.away_team?.name || "Away"} Score Details`,
        clubName,
        body: matchScoreDetailsPrintHtml(match, lines, clubName),
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
        <div className="flex flex-col gap-3 bg-slate-950 px-3 py-4 text-white sm:px-4 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <div className="text-xs font-black uppercase tracking-wide text-blue-200">
              Week {match.week_number || "-"} Match Results
            </div>
            <h2 className="mt-1 break-words text-xl font-black sm:text-2xl">
              {match.home_team?.name || "Home"} vs {match.away_team?.name || "Away"}
            </h2>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-200">
              <span>{formatDate(match.scheduled_date)} at {formatDisplayTime(match.scheduled_time, "Time TBD")}</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 md:flex md:flex-wrap md:justify-end">
            <button
              type="button"
              onClick={printScoreDetails}
              className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-slate-950 hover:bg-slate-100"
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

        <div className="overflow-y-auto">
          <div className="grid gap-3 bg-slate-50 p-3 sm:p-5 md:grid-cols-2">
            <MatchTeamDetail
              label="Home Team"
              team={homeTeam || match.home_team}
              tone="green"
              onOpenRoster={homeTeam ? () => onOpenRoster(homeTeam) : null}
            />
            <MatchTeamDetail
              label="Away Team"
              team={awayTeam || match.away_team}
              tone="gray"
              onOpenRoster={awayTeam ? () => onOpenRoster(awayTeam) : null}
            />
          </div>

          <div className="border-y border-slate-200 bg-slate-50 px-3 pb-3 sm:px-5 sm:pb-5">
            <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                {formatScoreStatus(match)}
              </div>
              <div className="mt-2 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
                <MatchScoreSummaryRow
                  label="Home"
                  name={match.home_team?.name || "Home"}
                  score={match.home_score}
                  won={String(match.winning_team_id || "") === String(match.home_team_id || "")}
                  tone="home"
                />
                <div className="text-lg font-black text-slate-400">
                  -
                </div>
                <MatchScoreSummaryRow
                  label="Away"
                  name={match.away_team?.name || "Away"}
                  score={match.away_score}
                  won={String(match.winning_team_id || "") === String(match.away_team_id || "")}
                  tone="away"
                />
              </div>
            </div>
          </div>

          <div className="p-3 sm:p-5">
            <div className="space-y-3">
              {lines.map((line) => (
                <MatchLineResult
                  key={line.id}
                  line={line}
                  match={match}
                  ratingForMember={ratingForMember}
                />
              ))}
              {lines.length === 0 && (
                <div className="rounded-xl bg-slate-50 p-8 text-center text-slate-500">
                  No game details found.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
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

  const homeWins = Number(line.home_team_games_won || 0);
  const awayWins = Number(line.away_team_games_won || 0);

  if (homeWins > awayWins) return "home";
  if (awayWins > homeWins) return "away";
  return "";
}

function gameWinnerSide(game) {
  if (game.game_status === "forfeit_home" || game.game_status === "retired_home") {
    return "home";
  }

  if (game.game_status === "forfeit_away" || game.game_status === "retired_away") {
    return "away";
  }

  if (game.home_score !== null && game.away_score !== null) {
    if (Number(game.home_score) > Number(game.away_score)) return "home";
    if (Number(game.away_score) > Number(game.home_score)) return "away";
  }

  return "";
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

function teamNameForSide(side, match) {
  if (side === "home") return match.home_team?.name || "Home";
  if (side === "away") return match.away_team?.name || "Away";
  return "";
}

function gameTeamPointsText(game, line, match) {
  const configuredPoints = Number(line.division_lines?.team_win_points ?? 1);
  const pointsMode = line.division_lines?.standings_points_mode || "line_result";
  const winnerSide = pointsMode === "per_game" ? gameWinnerSide(game) : matchLineWinnerSide(line, match);
  const winnerName = teamNameForSide(winnerSide, match);

  return winnerName ? `Team Points: ${configuredPoints} to ${winnerName}` : "Team Points: -";
}

function lineTeamPointsText(line) {
  const configuredPoints = Number(line.division_lines?.team_win_points ?? 1);

  return Number.isNaN(configuredPoints) ? "-" : configuredPoints;
}

function gameScoreText(game, line = null, match = null) {
  const special = specialGameStatus(game.game_status);
  const score = `Game ${game.game_number || "-"}: ${game.home_score ?? "-"}-${game.away_score ?? "-"}`;
  const teamPoints = line && match ? ` | ${gameTeamPointsText(game, line, match)}` : "";

  if (special) return `${score} Result: ${special.label}${teamPoints}`;
  if (game.home_score === null || game.away_score === null) return `${score} Result: Pending${teamPoints}`;
  if (Number(game.home_score) === Number(game.away_score)) return `${score} Result: Tie${teamPoints}`;
  return `${score}${teamPoints}`;
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

function formatDate(value) {
  return formatDisplayDate(value, "-");
}

function formatScoreStatus(match) {
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

function localDateString() {
  const date = new Date();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function matchSetupKey(matchId, teamId) {
  return `${matchId}:${teamId}`;
}

function buildMatchSetupStatus(matches, lineups) {
  const status = {};

  matches.forEach((match) => {
    [match.home_team_id, match.away_team_id].filter(Boolean).forEach((teamId) => {
      status[matchSetupKey(match.id, teamId)] = buildSingleMatchSetupStatus(
        match,
        teamId,
        lineups
      );
    });
  });

  return status;
}

async function loadClientEmailTemplate(templateKey) {
  const fallback = getEmailTemplateConfig(templateKey);
  const response = await fetch(`/api/notification-templates?template_key=${encodeURIComponent(templateKey)}`);
  const result = await response.json().catch(() => null);
  const template = result?.template;

  return {
    template_key: templateKey,
    subject: template?.subject || fallback?.defaultSubject || "",
    body: template?.body || fallback?.defaultBody || "",
  };
}

function scheduleWeekKey(divisionId, weekNumber, date) {
  return `${divisionId || ""}:${weekNumber || ""}:${date || ""}`;
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

function buildSingleMatchSetupStatus(match, teamId, lineups) {
  const expectedLines = Number(match.divisions?.number_of_lines || 3);
  const teamLineups = (lineups || []).filter(
    (lineup) =>
      String(lineup.match_id) === String(match.id) &&
      String(lineup.team_id) === String(teamId)
  );
  const completeLines = teamLineups.filter(
    (lineup) => lineup.player_1_member_id && lineup.player_2_member_id
  );

  return {
    complete: completeLines.length >= expectedLines,
    completedLines: completeLines.length,
    expectedLines,
  };
}

function sortRosterMembers(members) {
  return [...members].sort((a, b) => {
    const lastCompare = (a.last_name || "").localeCompare(b.last_name || "");
    if (lastCompare !== 0) return lastCompare;
    return (a.first_name || "").localeCompare(b.first_name || "");
  });
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
  const ties = Number(record?.ties || 0);
  return ties > 0 ? `${wins}-${losses}-${ties}` : `${wins}-${losses}`;
}

function formatStandingRecord(standing) {
  if (!standing) return "0-0";
  const wins = Number(standing.match_wins || 0);
  const losses = Number(standing.match_losses || 0);
  const ties = Number(standing.match_ties || 0);
  return ties > 0 ? `${wins}-${losses}-${ties}` : `${wins}-${losses}`;
}

function formatLocationAddress(location) {
  const parts = [
    location?.address,
    location?.city,
    [location?.state, location?.zip_code].filter(Boolean).join(" "),
  ].filter(Boolean);

  return parts.join(", ") || "Address not listed";
}

function mapLink(location) {
  const address = formatLocationAddress(location);
  if (!location?.name && address === "Address not listed") return "";
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${location?.name || ""} ${address}`.trim())}`;
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

function captainContacts(team) {
  const contacts = [
    team?.captain,
    team?.co_captain_1,
    team?.co_captain_2,
    team?.club_pro,
  ].filter(Boolean);
  const seen = new Set();

  return contacts.filter((member) => {
    const key = member.email || member.id;

    if (!key || seen.has(key)) return false;

    seen.add(key);
    return true;
  });
}

function formatMemberName(member) {
  return (
    `${member?.first_name || ""} ${member?.last_name || ""}`.trim() ||
    member?.email ||
    "Unnamed Member"
  );
}

function divisionCaptainRows(teams) {
  return (teams || []).flatMap((team) => {
    return [
      ["Captain", team.captain],
      ["Co-Captain", team.co_captain_1],
      ["Co-Captain", team.co_captain_2],
      ["Club Pro", team.club_pro],
    ]
      .filter(([, member]) => member)
      .map(([role, member]) => ({
        teamName: team.name || "",
        role,
        member,
      }));
  });
}

function divisionCaptainsPrintHtml({ leagueName, divisionName, teams }) {
  const rows = divisionCaptainRows(teams).map((row) => `
        <tr>
          <td>${escapeHtml(row.teamName)}</td>
          <td>${escapeHtml(row.role)}</td>
          <td>${escapeHtml(formatMemberName(row.member))}</td>
          <td>${escapeHtml(row.member.email || "")}</td>
          <td>${escapeHtml(formatPhoneNumberForStorage(row.member.phone))}</td>
        </tr>
      `).join("");

  return `
    <style>
      @page { size: landscape; }
      h1 { margin: 0 0 4px; font-size: 24px; }
      h2 { margin: 0 0 18px; color: #475569; font-size: 15px; font-weight: 600; }
      table { width: 100%; border-collapse: collapse; table-layout: auto; }
      th { background: #0f172a; color: white; text-align: left; }
      th, td { border: 1px solid #cbd5e1; padding: 6px 8px; font-size: 11px; line-height: 1.2; vertical-align: top; white-space: nowrap; }
      th:nth-child(1), td:nth-child(1) { width: 24%; }
      th:nth-child(2), td:nth-child(2) { width: 12%; }
      th:nth-child(3), td:nth-child(3) { width: 20%; }
      th:nth-child(4), td:nth-child(4) { width: 30%; }
      th:nth-child(5), td:nth-child(5) { width: 14%; }
      tr:nth-child(even) td { background: #f8fafc; }
    </style>
    <h1>${escapeHtml(divisionName)} Captains</h1>
    <h2>${escapeHtml(leagueName)}</h2>
    <table>
      <thead>
        <tr>
          <th>Team</th>
          <th>Role</th>
          <th>Name</th>
          <th>Email</th>
          <th>Phone</th>
        </tr>
      </thead>
      <tbody>
        ${rows || `<tr><td colspan="5">No captains found for this division.</td></tr>`}
      </tbody>
    </table>
  `;
}

function matchScoreDetailsPrintHtml(match, lines, clubName = DEFAULT_SYSTEM_SETTINGS.club_name) {
  const rows = lines.map((line) => {
    const games = [...(line.line_games || [])]
      .sort((a, b) => Number(a.game_number || 0) - Number(b.game_number || 0))
      .map((game) => (
        escapeHtml(gameScoreText(game, line, match))
      ))
      .join("<br />");

    return `
      <tr>
        <td>${escapeHtml(line.line_number || "-")}</td>
        <td>${escapeHtml(line.division_lines?.line_name || "")}</td>
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
      .club-name { margin: 0 0 6px; color: #0f172a; font-size: 13px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.04em; }
      .score { margin: 12px 0 18px; font-size: 16px; font-weight: 700; }
    </style>
    <div class="club-name">${escapeHtml(clubName)}</div>
    <h1>${escapeHtml(match.home_team?.name || "Home")} vs ${escapeHtml(match.away_team?.name || "Away")}</h1>
    <h2>${escapeHtml(formatDate(match.scheduled_date))} / ${escapeHtml(match.locations?.name || "Home Location TBD")}</h2>
    <div class="score">Match Score: ${escapeHtml(match.home_score ?? 0)}-${escapeHtml(match.away_score ?? 0)}</div>
    <table>
      <thead>
        <tr>
          <th>Game</th>
          <th>Line</th>
          <th>Home Players</th>
          <th>Away Players</th>
          <th>Game Scores</th>
        </tr>
      </thead>
      <tbody>
        ${rows || `<tr><td colspan="5">No game details found.</td></tr>`}
      </tbody>
    </table>
  `;
}

function matchScoreSheetPrintHtml(match, lineups, ratingForMember, clubName = DEFAULT_SYSTEM_SETTINGS.club_name) {
  const homeLineups = scoreSheetLineupsForTeam(lineups, match.home_team_id);
  const awayLineups = scoreSheetLineupsForTeam(lineups, match.away_team_id);
  const lineCount = Number(match.divisions?.number_of_lines || 3);
  const rows = Array.from({ length: lineCount }, (_, index) => {
    const lineNumber = index + 1;
    const homeLineup = homeLineups[lineNumber] || {};
    const awayLineup = awayLineups[lineNumber] || {};
    const homePlayers = [homeLineup.player_1, homeLineup.player_2];
    const awayPlayers = [awayLineup.player_1, awayLineup.player_2];

    return `
      <tr>
        <td class="line-cell">
          <div class="line-number">${lineNumber}</div>
          <div>${scoreSheetPlayerLine(homePlayers[0], match, ratingForMember)}</div>
          <div>${scoreSheetPlayerLine(homePlayers[1], match, ratingForMember)}</div>
          <div class="team-rating">Team Rating: ${escapeHtml(scoreSheetTeamRating(homePlayers, match, ratingForMember))}</div>
        </td>
        <td class="line-cell">
          <div class="line-number">${lineNumber}</div>
          <div>${scoreSheetPlayerLine(awayPlayers[0], match, ratingForMember)}</div>
          <div>${scoreSheetPlayerLine(awayPlayers[1], match, ratingForMember)}</div>
          <div class="team-rating">Team Rating: ${escapeHtml(scoreSheetTeamRating(awayPlayers, match, ratingForMember))}</div>
        </td>
      </tr>
    `;
  }).join("");
  const template = match.divisions?.score_sheet_templates;
  const bodyHtml = renderScoreSheetTemplate(match, {
    template,
    lineupRows: rows,
    roundRows: scoreSheetRoundRows(lineCount),
    configuredGameLinesRows: scoreSheetConfiguredGameLinesRows(match),
    configuredGameLinesTable: scoreSheetConfiguredGameLinesTable(match),
    scoreEntryRows: scoreSheetEntryRows(match),
    scoreEntryTable: scoreSheetEntryTable(match),
    clubName,
  });

  return `
    <style>
      .score-sheet {
        color: #111827;
        font-family: Arial, sans-serif;
        font-size: 12px;
        line-height: 1.2;
      }
      .score-sheet h1 {
        margin: 0;
        text-align: center;
        font-size: 20px;
        font-weight: 900;
      }
      .score-sheet .meta {
        margin-top: 8px;
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 6px;
      }
      .score-sheet .box {
        border: 1px solid #111827;
        padding: 6px;
        min-height: 34px;
      }
      .score-sheet .label {
        display: block;
        font-size: 9px;
        font-weight: 900;
        letter-spacing: 0.04em;
        text-transform: uppercase;
      }
      .score-sheet .value {
        display: block;
        margin-top: 3px;
        font-size: 13px;
        font-weight: 800;
      }
      .score-sheet table {
        width: 100%;
        border-collapse: collapse;
      }
      .score-sheet th,
      .score-sheet td {
        border: 1px solid #111827;
        padding: 7px;
        vertical-align: middle;
      }
      .score-sheet th {
        background: #e5e7eb;
        text-align: center;
        font-size: 14px;
        font-weight: 900;
      }
      .score-sheet .header-score {
        display: inline-block;
        margin-left: 18px;
        font-size: 13px;
        font-weight: 900;
      }
      .score-sheet .lineups {
        margin-top: 10px;
      }
      .score-sheet .line-cell {
        width: 50%;
        min-height: 68px;
        font-size: 13px;
        font-weight: 800;
      }
      .score-sheet .line-number {
        float: left;
        margin-right: 7px;
        font-size: 18px;
        font-weight: 900;
      }
      .score-sheet .rating {
        font-size: 11px;
        font-weight: 700;
      }
      .score-sheet .team-rating {
        margin-top: 4px;
        font-size: 11px;
        font-weight: 900;
      }
      .score-sheet .rounds {
        margin-top: 10px;
      }
      .score-sheet .configured-lines,
      .score-sheet .score-entries {
        margin-top: 10px;
      }
      .score-sheet .rounds td {
        height: 34px;
        vertical-align: middle;
      }
      .score-sheet .configured-lines th,
      .score-sheet .configured-lines td,
      .score-sheet .score-entries th,
      .score-sheet .score-entries td {
        font-size: 10px;
        padding: 5px;
      }
      .score-sheet .score-entries td {
        height: 28px;
      }
      .score-sheet .score-entries th {
        font-size: 12px;
      }
      .score-sheet .score-entries .game-col {
        width: 42%;
      }
      .score-sheet .score-entries .line-type-col {
        width: 10%;
      }
      .score-sheet .score-entries .game-format-col {
        width: 18%;
      }
      .score-sheet .score-entries .score-col {
        width: 15%;
      }
      .score-sheet .score-entries .compact-game-col {
        width: 70%;
      }
      .score-sheet .score-entries td:first-child {
        font-size: 12px;
        font-weight: 900;
      }
      .score-sheet .score-entries.compact td:first-child {
        font-size: 13px;
      }
      .score-sheet .score-entry-details {
        margin-top: 10px;
        border: 1px solid #111827;
        background: #f9fafb;
        padding: 6px;
        font-size: 13px;
        font-weight: 900;
        text-align: center;
      }
      .score-sheet .score-entry-details span {
        display: inline-block;
        margin: 0 10px;
      }
      .score-sheet .score-entries .grouped-score-row td:first-child {
        border-left-width: 2px;
      }
      .score-sheet .score-entries .grouped-score-row td:last-child {
        border-right-width: 2px;
      }
      .score-sheet .score-entries .group-start td {
        border-top-width: 2px;
      }
      .score-sheet .score-entries .group-end td {
        border-bottom-width: 2px;
      }
      .score-sheet .rounds td:first-child {
        font-weight: 900;
      }
      .score-sheet .rounds td:not(:first-child) {
        text-align: center;
      }
      .score-sheet .notes {
        margin-top: 10px;
        font-size: 12px;
        font-weight: 400;
        text-align: justify;
        line-height: 1.25;
      }
      .score-sheet .signatures {
        margin-top: 8px;
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 8px;
      }
      .score-sheet .signature-line {
        border-bottom: 1px solid #111827;
        height: 26px;
      }
    </style>
    <div class="score-sheet">
      ${bodyHtml}
    </div>
  `;
}

function scoreSheetLineupsForTeam(lineups, teamId) {
  return (lineups || []).reduce((byLine, lineup) => {
    if (String(lineup.team_id) === String(teamId)) {
      byLine[Number(lineup.line_number || 0)] = lineup;
    }

    return byLine;
  }, {});
}

function renderScoreSheetTemplate(match, {
  template,
  lineupRows,
  roundRows,
  configuredGameLinesRows,
  configuredGameLinesTable,
  scoreEntryRows,
  scoreEntryTable,
  clubName,
}) {
  const activeTemplate = template?.is_active === false ? null : template;
  const templateHtml = normalizeScoreSheetTemplateHtml(activeTemplate?.template_html || DEFAULT_SCORE_SHEET_TEMPLATE_HTML);
  const rulesText = activeTemplate?.rules_text || DEFAULT_SCORE_SHEET_RULES;
  const sheetTitle = activeTemplate?.sheet_title || activeTemplate?.name || DEFAULT_SCORE_SHEET_TEMPLATE_NAME;
  const captainSignatureRows = `
    <div class="signatures">
      <div>Captain Signature (Home)<div class="signature-line"></div></div>
      <div>Captain Signature (Away)<div class="signature-line"></div></div>
    </div>
  `;
  const replacements = {
    "{{club_name}}": clubName || DEFAULT_SYSTEM_SETTINGS.club_name,
    "{{sheet_title}}": sheetTitle,
    "{{match_date}}": formatDate(match.scheduled_date),
    "{{match_time}}": formatDisplayTime(match.scheduled_time, "Time TBD"),
    "{{location_name}}": match.locations?.name || "Home Location TBD",
    "{{division_name}}": match.divisions?.name || "Division",
    "{{league_name}}": match.leagues?.name || "League",
    "{{home_team}}": match.home_team?.name || "Home Team",
    "{{away_team}}": match.away_team?.name || "Away Team",
    "{{lineup_rows}}": lineupRows,
    "{{round_rows}}": roundRows,
    "{{configured_game_lines_rows}}": configuredGameLinesRows,
    "{{configured_game_lines_table}}": configuredGameLinesTable,
    "{{score_entry_rows}}": scoreEntryRows,
    "{{score_entry_table}}": scoreEntryTable,
    "{{rules_text}}": rulesText,
    "{{captain_signature_rows}}": captainSignatureRows,
  };

  return Object.entries(replacements).reduce((html, [token, value]) => {
    const htmlTokens = [
      "{{lineup_rows}}",
      "{{round_rows}}",
      "{{configured_game_lines_rows}}",
      "{{configured_game_lines_table}}",
      "{{score_entry_rows}}",
      "{{score_entry_table}}",
      "{{captain_signature_rows}}",
    ];
    const escapedValue = htmlTokens.includes(token)
      ? value
      : escapeHtml(value);
    return html.replaceAll(token, escapedValue);
  }, templateHtml);
}

function normalizeScoreSheetTemplateHtml(html) {
  return String(html || "")
    .replaceAll(
      '<div class="box"><span class="label">Away Team</span><span class="value">{{away_team}}</span></div>\n  <div class="box"><span class="label">Home Team</span><span class="value">{{home_team}}</span></div>',
      '<div class="box"><span class="label">Home Team</span><span class="value">{{home_team}}</span></div>\n  <div class="box"><span class="label">Away Team</span><span class="value">{{away_team}}</span></div>'
    )
    .replaceAll(
      '<div>Captain Signature (Away)<div class="signature-line"></div></div>\n  <div>Captain Signature (Home)<div class="signature-line"></div></div>',
      '<div>Captain Signature (Home)<div class="signature-line"></div></div>\n  <div>Captain Signature (Away)<div class="signature-line"></div></div>'
    )
    .replaceAll(
      '<th>Away Teams <span class="header-score">Total Team Score: ________</span></th>\n      <th>Home Teams <span class="header-score">Total Team Score: ________</span></th>',
      '<th>Home Teams <span class="header-score">Total Team Score: ________</span></th>\n      <th>Away Teams <span class="header-score">Total Team Score: ________</span></th>'
    )
    .replaceAll(
      '<th>AWAY Teams <span class="header-score">Score: ______</span></th>\n      <th>HOME Teams <span class="header-score">Score: ______</span></th>',
      '<th>Home Teams <span class="header-score">Total Team Score: ________</span></th>\n      <th>Away Teams <span class="header-score">Total Team Score: ________</span></th>'
    )
    .replaceAll(
      '<th>Away</th>\n          <th>Home</th>',
      '<th>Home</th>\n          <th>Away</th>'
    )
    .replaceAll("<th>Away</th><th>Home</th>", "<th>Home</th><th>Away</th>")
    .replaceAll(
      'AWAY Teams <span class="header-score">Score: ______</span>',
      'Away Teams <span class="header-score">Total Team Score: ________</span>'
    )
    .replaceAll(
      'HOME Teams <span class="header-score">Score: ______</span>',
      'Home Teams <span class="header-score">Total Team Score: ________</span>'
    );
}

function scoreSheetConfiguredLines(match) {
  const lines = [...(match.divisions?.division_lines || [])]
    .sort((a, b) => (
      Number(a.sort_order ?? a.line_number ?? 0) - Number(b.sort_order ?? b.line_number ?? 0) ||
      Number(a.line_number ?? 0) - Number(b.line_number ?? 0)
    ));

  if (lines.length > 0) return lines;

  const lineCount = Math.max(1, Number(match.divisions?.number_of_lines || 3));
  return Array.from({ length: lineCount }, (_, index) => ({
    line_number: index + 1,
    line_name: `Line ${index + 1}`,
    line_type: "doubles",
    game_format: match.divisions?.default_game_format || "regular",
    games_per_line: match.divisions?.games_per_line || 3,
    points_to_win: match.divisions?.points_to_win || 11,
    win_by: match.divisions?.win_by || 2,
    team_win_points: 1,
    standings_points_mode: "line_result",
  }));
}

function scoreSheetConfiguredGameLinesRows(match) {
  return scoreSheetConfiguredLines(match).map((line) => `
    <tr>
      <td>${escapeHtml(scoreSheetGameLineLabel(line))}</td>
      <td>${escapeHtml(scoreSheetLineTypeLabel(line.line_type))}</td>
      <td>${escapeHtml(scoreSheetFormatLabel(line.game_format))}</td>
      <td>${escapeHtml(line.team_win_points ?? "-")}</td>
    </tr>
  `).join("");
}

function scoreSheetConfiguredGameLinesTable(match) {
  return `
    <table class="configured-lines">
      <thead>
        <tr>
          <th>Game</th>
          <th>Line Type</th>
          <th>Game Format</th>
          <th>Team Pts</th>
        </tr>
      </thead>
      <tbody>${scoreSheetConfiguredGameLinesRows(match)}</tbody>
    </table>
  `;
}

function scoreSheetEntryRows(match, options = {}) {
  const lines = options.lines || scoreSheetConfiguredLines(match);
  const hideRepeatedDetails = options.hideRepeatedDetails === true;

  return lines.flatMap((line) => {
    const gamesPerLine = Math.max(1, Number(line.games_per_line ?? match.divisions?.games_per_line ?? 1));
    const isGrouped = gamesPerLine > 1;

    return Array.from({ length: gamesPerLine }, (_, gameIndex) => `
      <tr class="${scoreSheetEntryRowClass(isGrouped, gameIndex, gamesPerLine)}">
        <td>${escapeHtml(scoreSheetGameLineLabel(line))}</td>
        ${hideRepeatedDetails ? "" : `
        <td>${escapeHtml(scoreSheetLineTypeLabel(line.line_type))}</td>
        <td>${escapeHtml(scoreSheetFormatLabel(line.game_format))}</td>
        `}
        <td></td>
        <td></td>
      </tr>
    `);
  }).join("");
}

function scoreSheetEntryTable(match) {
  const lines = scoreSheetConfiguredLines(match);
  const sharedDetails = sharedScoreSheetEntryDetails(lines);
  const hideRepeatedDetails = Boolean(sharedDetails);

  return `
    ${sharedDetails ? `
      <div class="score-entry-details">
        <span>Line Type: ${escapeHtml(sharedDetails.lineType)}</span>
        <span>Game Format: ${escapeHtml(sharedDetails.gameFormat)}</span>
      </div>
    ` : ""}
    <table class="score-entries${hideRepeatedDetails ? " compact" : ""}">
      <colgroup>
        <col class="${hideRepeatedDetails ? "compact-game-col" : "game-col"}" />
        ${hideRepeatedDetails ? "" : `
        <col class="line-type-col" />
        <col class="game-format-col" />
        `}
        <col class="score-col" />
        <col class="score-col" />
      </colgroup>
      <thead>
        <tr>
          <th>Game</th>
          ${hideRepeatedDetails ? "" : `
          <th>Line Type</th>
          <th>Game Format</th>
          `}
          <th>Home</th>
          <th>Away</th>
        </tr>
      </thead>
      <tbody>${scoreSheetEntryRows(match, { lines, hideRepeatedDetails })}</tbody>
    </table>
  `;
}

function sharedScoreSheetEntryDetails(lines) {
  if (!lines?.length) return null;

  const firstLineType = scoreSheetLineTypeLabel(lines[0].line_type);
  const firstGameFormat = scoreSheetFormatLabel(lines[0].game_format);
  const allSame = lines.every(
    (line) =>
      scoreSheetLineTypeLabel(line.line_type) === firstLineType &&
      scoreSheetFormatLabel(line.game_format) === firstGameFormat
  );

  return allSame ? { lineType: firstLineType, gameFormat: firstGameFormat } : null;
}

function scoreSheetEntryRowClass(isGrouped, gameIndex, gamesPerLine) {
  if (!isGrouped) return "";

  return [
    "grouped-score-row",
    gameIndex === 0 ? "group-start" : "",
    gameIndex === gamesPerLine - 1 ? "group-end" : "",
  ].filter(Boolean).join(" ");
}

function scoreSheetGameLineLabel(line) {
  return `Game ${line.line_number || "-"}) ${line.line_name || `Line ${line.line_number || ""}`}`;
}

function scoreSheetLineTypeLabel(value) {
  const labels = {
    doubles: "Doubles",
    singles: "Singles",
    mixed: "Mixed",
    picklebreaker: "Picklebreaker",
  };

  return labels[value] || value || "-";
}

function scoreSheetFormatLabel(value) {
  if (!value) return "-";
  return String(value)
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function scoreSheetRoundRows(lineCount) {
  const count = Math.max(1, Number(lineCount || 3));

  return Array.from({ length: count }, (_, roundIndex) => {
    const roundNumber = roundIndex + 1;
    const roundTitle = roundNumber === 1 ? "Round 1 (Circle Winning Team)" : `Round ${roundNumber}`;
    const matches = Array.from({ length: count }, (_, awayIndex) => {
      const awayNumber = awayIndex + 1;
      const homeNumber = ((awayIndex + roundIndex) % count) + 1;

      return `<tr><td>Home ${homeNumber} vs. Away ${awayNumber}</td><td></td><td></td></tr>`;
    }).join("");

    return `<tr><th colspan="3">${escapeHtml(roundTitle)}</th></tr>${matches}`;
  }).join("");
}

function scoreSheetPlayerName(member) {
  return member?.id ? formatMemberName(member) : "";
}

function scoreSheetPlayerLine(member, match, ratingForMember) {
  const name = scoreSheetPlayerName(member);
  const rating = scoreSheetPlayerRating(member, match, ratingForMember);

  if (!name) return "";
  return `${escapeHtml(name)}${rating ? ` <span class="rating">(${escapeHtml(rating)})</span>` : ""}`;
}

function scoreSheetPlayerRating(member, match, ratingForMember) {
  if (!member?.id) return "";
  return ratingForMember(member.id, match.leagues?.season_id, match.divisions?.rating_type, member);
}

function scoreSheetTeamRating(players, match, ratingForMember) {
  const ratings = (players || [])
    .map((player) => Number(scoreSheetPlayerRating(player, match, ratingForMember)))
    .filter((rating) => !Number.isNaN(rating));

  if (ratings.length === 0) return "NR";
  return ratings.reduce((sum, rating) => sum + rating, 0).toFixed(2);
}

function printableHtmlDocument(document) {
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(document.title)}</title>
    <style>
      @page { size: letter portrait; margin: 0.45in; }
      body { margin: 0; background: white; }
      @media screen {
        body { background: #e5e7eb; padding: 24px; }
        .sheet-page { margin: 0 auto; max-width: 8.5in; min-height: 11in; background: white; padding: 0.35in; box-shadow: 0 16px 40px rgba(15, 23, 42, 0.22); }
      }
      @media print {
        body { background: white; padding: 0; }
        .sheet-page { box-shadow: none; padding: 0; }
      }
    </style>
  </head>
  <body>
    <div class="sheet-page">${document.html}</div>
  </body>
</html>`;
}

function slugifyFileName(value) {
  return String(value || "score-sheet")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "score-sheet";
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function byeCard(bye) {
  return (
    <div
      key={`bye-${bye.id}`}
      className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2"
    >
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-amber-900">
          <span className="font-bold">BYE WEEK</span>
          <span>{bye.teams?.name || "—"}</span>
          <span>{bye.divisions?.name || "—"}</span>
          <span>Week {bye.week_number || "—"}</span>
          <span>{formatDate(bye.bye_date)}</span>
        </div>

        <div className="rounded-lg bg-amber-200 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-amber-900">
          No Match Scheduled
        </div>
      </div>
    </div>
  );
}

function CaptainSectionButton({ active, label, value, tone = "blue", onClick }) {
  const tones = {
    blue: active
      ? "border-blue-700 bg-blue-700 text-white"
      : "border-blue-200 bg-blue-50 text-blue-950 hover:border-blue-500",
    red: active
      ? "border-red-700 bg-red-700 text-white"
      : "border-red-200 bg-red-50 text-red-950 hover:border-red-500",
    emerald: active
      ? "border-emerald-700 bg-emerald-700 text-white"
      : "border-emerald-200 bg-emerald-50 text-emerald-950 hover:border-emerald-500",
  };
  const helperClass = active ? "text-white/80" : "text-slate-600";
  const badgeClass = active ? "bg-white/20" : "bg-white";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border-2 p-4 text-left shadow-lg ring-1 ring-white/70 transition hover:-translate-y-1 hover:shadow-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${tones[tone] || tones.blue}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-black">{label}</div>
          <div className={`mt-1 text-xs font-bold ${helperClass}`}>
            Click to view
          </div>
        </div>
        <div className={`rounded-xl px-3 py-1 text-sm font-black shadow-sm ${badgeClass}`}>
          {value}
        </div>
      </div>
    </button>
  );
}

function DashboardTeamSelector({ teams, teamStats, selectedTeamId, onSelect }) {
  return (
    <div className="-mb-4 overflow-x-auto px-2 pt-1" role="tablist" aria-label="Select team">
      <div className="flex min-w-max items-end gap-1">
        {teams.map((team) => {
          const selected = String(team.id) === String(selectedTeamId);
          const standing = teamStats?.[team.id]?.standing || null;

          return (
            <button
              key={team.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => onSelect(team.id)}
              className={`relative shrink-0 cursor-pointer rounded-t-2xl border px-4 text-left shadow-sm transition-transform duration-150 hover:-translate-y-1 hover:shadow-md active:translate-y-0 ${
                selected
                  ? "z-10 border-emerald-500 border-b-emerald-800 bg-gradient-to-r from-emerald-800 to-blue-800 py-3 text-white shadow-md"
                  : "border-slate-200 bg-slate-100 py-2 text-slate-700 hover:border-blue-200 hover:bg-blue-50"
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

function Section({ title, count, actions, children }) {
  return (
    <div className="mt-6 rounded-2xl bg-white p-4 shadow md:p-6">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h2 className="text-xl font-bold text-slate-900">{title}</h2>

        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          {actions}

          <div className="rounded-xl bg-slate-900 px-4 py-2 text-center text-sm font-bold text-white">
            Matches: {count}
          </div>
        </div>
      </div>

      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Empty({ message }) {
  return (
    <div className="rounded-xl bg-slate-50 p-6 text-center text-slate-500">
      {message}
    </div>
  );
}



