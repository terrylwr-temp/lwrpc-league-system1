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
import { GUIDE_DOCUMENT_TYPES, openGuideDocument } from "../lib/dashboardGuides";

export default function CaptainDashboardPage() {
  const router = useRouter();
  const captainGuide = GUIDE_DOCUMENT_TYPES.find((guideType) => guideType.key === "captain_guide_pdf");

  const [currentMember, setCurrentMember] = useState(null);
  const [teams, setTeams] = useState([]);
  const [matches, setMatches] = useState([]);
  const [byeWeeks, setByeWeeks] = useState([]);
  const [teamStats, setTeamStats] = useState({});
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
  const [savingSetup, setSavingSetup] = useState(false);
  const [divisionScheduleTeam, setDivisionScheduleTeam] = useState(null);
  const [divisionScheduleTeams, setDivisionScheduleTeams] = useState([]);
  const [divisionScheduleMatches, setDivisionScheduleMatches] = useState([]);
  const [divisionScheduleByes, setDivisionScheduleByes] = useState([]);
  const [divisionScheduleRatings, setDivisionScheduleRatings] = useState([]);
  const [divisionScheduleLoading, setDivisionScheduleLoading] = useState(false);
  const [pdfDocument, setPdfDocument] = useState(null);
  const [scoreDetailsMatch, setScoreDetailsMatch] = useState(null);

  const checkAuth = useCallback(async function checkAuth() {
    const user = await requireRole(router, "captain");
    return !!user;
  }, [router]);

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

    const { data: memberData, error: memberError } = await supabase
      .from("members")
      .select("*")
      .eq("email", user.email)
      .maybeSingle();

    if (memberError) {
      alert(memberError.message);
      setLoading(false);
      return;
    }

    if (!memberData) {
      setCurrentMember(null);
      setLoading(false);
      return;
    }

    setCurrentMember(memberData);

    const { data: teamData, error: teamError } = await supabase
      .from("teams")
      .select(`
        *,
        divisions (
          id,
          name,
          number_of_lines,
          rating_type,
          team_dupr_max,
          leagues (
            id,
            name,
            season_id,
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
      .or(
        `captain_member_id.eq.${memberData.id},co_captain_member_id.eq.${memberData.id},co_captain_2_member_id.eq.${memberData.id}`
      )
      .order("name", { ascending: true });

    if (teamError) {
      alert(teamError.message);
      setLoading(false);
      return;
    }

    const captainTeams = teamData || [];
    const activeTeams = captainTeams.filter((team) => team.is_active !== false);

    setTeams(captainTeams);
    setSelectedCaptainTeamId((current) => {
      if (current && captainTeams.some((team) => String(team.id) === String(current))) {
        return current;
      }

      return activeTeams?.[0]?.id || captainTeams?.[0]?.id || "";
    });

    const teamIds = captainTeams.map((team) => team.id);

    if (teamIds.length === 0) {
      setMatches([]);
      setByeWeeks([]);
      setTeamStats({});
      finishLoading(startedAt, setLoading);
      return;
    }

    const [{ data: rosterRows, error: rosterError }, { data: standingsRows, error: standingsError }] =
      await Promise.all([
        supabase
          .from("team_members")
          .select("team_id")
          .in("team_id", teamIds),
        supabase
          .from("team_standings")
          .select("team_id, rank, standings_points, match_wins, match_losses, match_ties")
          .in("team_id", teamIds),
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

    teamIds.forEach((teamId) => {
      nextTeamStats[teamId] = {
        playerCount: 0,
        standing: null,
      };
    });

    (rosterRows || []).forEach((row) => {
      if (!nextTeamStats[row.team_id]) {
        nextTeamStats[row.team_id] = { playerCount: 0, standing: null };
      }

      nextTeamStats[row.team_id].playerCount += 1;
    });

    (standingsRows || []).forEach((row) => {
      if (!nextTeamStats[row.team_id]) {
        nextTeamStats[row.team_id] = { playerCount: 0, standing: null };
      }

      nextTeamStats[row.team_id].standing = row;
    });

    setTeamStats(nextTeamStats);

    const { data: matchData, error: matchError } = await supabase
      .from("matches")
      .select(`
        *,
        divisions (
          id,
          name,
          number_of_lines,
          rating_type,
          team_dupr_max
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
          )
        ),
        winning_team:teams!matches_winning_team_id_fkey (
          id,
          name
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
  }, [loadMatchSetupStatus]);

  useEffect(() => {
    async function run() {
      const ok = await checkAuth();

      if (ok) {
        loadData();
      }
    }

    run();
  }, [checkAuth, loadData]);

  const upcomingMatches = useMemo(() => {
    return matches.filter(
      (match) => match.status !== "completed" && match.status !== "cancelled"
    );
  }, [matches]);

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

      return isSelectedTeam && match.score_status === "pending_verification";
    });
  }, [matches, selectedTeamId]);

  const allPendingVerification = useMemo(() => {
    return matches.filter((match) => match.score_status === "pending_verification");
  }, [matches]);

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

      return isSelectedTeam && match.status === "completed";
    });
  }, [matches, selectedTeamId]);

  function matchCard(match, options = {}) {
    const {
      showSetup = true,
      scoreButtonLabel = "Enter Match Scores",
      scoreButtonTitle = "Enter match scores",
      scoreButtonAction = null,
    } = options;
    const canEnterScores =
      match.scheduled_date &&
      match.scheduled_date <= localDateString();

    const setupTeams = showSetup ? getCaptainTeamsForMatch(match) : [];

    return (
      <div
        key={match.id}
        className="overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
      >
        <div className="bg-gradient-to-r from-blue-800 to-indigo-800 px-4 py-3 text-white">
          <div className="text-xs font-black uppercase tracking-wide text-blue-100">
            Week {match.week_number || "-"}
          </div>
          <div className="mt-1 text-lg font-black">
            {match.home_team?.name || "Home"} vs {match.away_team?.name || "Away"}
          </div>
        </div>

        <div className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 flex-1">
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

          <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2 lg:w-auto lg:min-w-44 lg:grid-cols-1">
            {setupTeams.map((team) => {
              const setupStatus = matchSetupStatus[matchSetupKey(match.id, team.id)];
              const setupComplete = setupStatus?.complete === true;

              return (
                <div key={team.id} className="flex flex-col gap-1">
                  <button
                    type="button"
                    onClick={() => openMatchSetup(match, team)}
                    className={`rounded-lg px-3 py-2.5 text-sm font-bold ${
                      setupComplete
                        ? "bg-blue-100 text-blue-900 hover:bg-blue-200"
                        : "bg-red-600 text-white hover:bg-red-700"
                    }`}
                  >
                    Match Setup
                  </button>
                  <span className={`rounded-full px-2 py-0.5 text-center text-xs font-bold uppercase tracking-wide ${setupStatus?.complete ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-900"}`}>
                    {setupStatus?.complete ? "Setup Complete" : "Setup Pending"}
                  </span>
                </div>
              );
            })}

            <button
              type="button"
              disabled={!canEnterScores}
              onClick={() => {
                if (scoreButtonAction) {
                  scoreButtonAction(match);
                  return;
                }
                if (canEnterScores) router.push(`/matches/${match.id}`);
              }}
              className="rounded-lg bg-slate-900 px-3 py-2.5 text-sm font-bold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
              title={canEnterScores ? scoreButtonTitle : "Scores unlock on the scheduled match date"}
            >
              {scoreButtonLabel}
            </button>
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

  async function openMatchSetup(match, team) {
    setSetupMatch(match);
    setSetupTeam(team);

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

    window.scrollTo({ top: 0, behavior: "smooth" });
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

    const { error } = await supabase
      .from("match_lineups")
      .upsert(rows, {
        onConflict: "match_id,team_id,line_number",
      });

    setSavingSetup(false);

    if (error) {
      alert(error.message);
      return;
    }

    const nextStatusRows = rows.map((row) => ({
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
      alert(notificationSent ? "Match setup saved and opponent captain notification sent." : "Match setup saved, but the opponent notification could not be sent.");
  }

  async function openScoreDetails(match) {
    const { data, error } = await supabase
      .from("matches")
      .select(`
        *,
        locations(id, name),
        home_team:teams!matches_home_team_id_fkey(id, name),
        away_team:teams!matches_away_team_id_fkey(id, name),
        match_lines(
          id,
          line_number,
          home_team_games_won,
          away_team_games_won,
          home_player_1:members!match_lines_home_player_1_id_fkey(id, first_name, last_name),
          home_player_2:members!match_lines_home_player_2_id_fkey(id, first_name, last_name),
          away_player_1:members!match_lines_away_player_1_id_fkey(id, first_name, last_name),
          away_player_2:members!match_lines_away_player_2_id_fkey(id, first_name, last_name),
          line_games(id, game_number, home_score, away_score, game_status),
          division_lines(line_name)
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
    const lineupText = setupLineups
      .map((lineup) => {
        const player1 = setupRoster.find((row) => String(row.member_id) === String(lineup.player_1_member_id))?.members;
        const player2 = setupRoster.find((row) => String(row.member_id) === String(lineup.player_2_member_id))?.members;

        return `Team ${lineup.line_number}: ${formatMemberName(player1)} / ${formatMemberName(player2)}`;
      })
      .join("\n");
    const subject = `Match Setup Entered: ${setupTeam.name} vs ${opponentTeam?.name || "Opponent"}`;
    const text = [
      `${setupTeam.name} has entered its match setup.`,
      "",
      `Match: ${setupMatch.home_team?.name || "Home"} vs ${setupMatch.away_team?.name || "Away"}`,
      `Date: ${formatDate(setupMatch.scheduled_date)} at ${formatDisplayTime(setupMatch.scheduled_time, "Time TBD")}`,
      `Division: ${setupTeam.divisions?.name || setupMatch.divisions?.name || "Division"}`,
      "",
      lineupText,
      "",
      opponentStatus?.complete
        ? "Your match setup is already marked complete."
        : "Please log into the Captain Dashboard and enter your match setup if you have not already done so.",
    ].join("\n");
    const htmlLineups = setupLineups
      .map((lineup) => {
        const player1 = setupRoster.find((row) => String(row.member_id) === String(lineup.player_1_member_id))?.members;
        const player2 = setupRoster.find((row) => String(row.member_id) === String(lineup.player_2_member_id))?.members;

        return `<li><strong>Team ${lineup.line_number}:</strong> ${escapeHtml(formatMemberName(player1))} / ${escapeHtml(formatMemberName(player2))}</li>`;
      })
      .join("");
    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>Match Setup Entered</h2>
        <p><strong>${escapeHtml(setupTeam.name)}</strong> has entered its match setup.</p>
        <p>
          <strong>Match:</strong> ${escapeHtml(setupMatch.home_team?.name || "Home")} vs ${escapeHtml(setupMatch.away_team?.name || "Away")}<br />
          <strong>Date:</strong> ${escapeHtml(formatDate(setupMatch.scheduled_date))} at ${escapeHtml(formatDisplayTime(setupMatch.scheduled_time, "Time TBD"))}<br />
          <strong>Division:</strong> ${escapeHtml(setupTeam.divisions?.name || setupMatch.divisions?.name || "Division")}
        </p>
        <ul>${htmlLineups}</ul>
        <p>${opponentStatus?.complete ? "Your match setup is already marked complete." : "Please log into the Captain Dashboard and enter your match setup if you have not already done so."}</p>
        <hr />
        <p style="font-size: 12px; color: #666;">LWRPC League Management System</p>
      </div>
    `;

    const response = await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        emails,
        phones,
        subject,
        text,
        html,
        smsBody: text,
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

  async function displayPrintDivisionCaptains(team) {
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
        )
      `)
      .eq("division_id", team.division_id)
      .order("name", { ascending: true });

    if (error) {
      alert(error.message);
      return;
    }

    const body = divisionCaptainsPrintHtml({
      leagueName: team.divisions?.leagues?.name || "League",
      divisionName: team.divisions?.name || "Division",
      teams: data || [],
    });

    window.localStorage.setItem(
      "lwrpc-print-payload",
      JSON.stringify({
        title: `${team.divisions?.name || "Division"} Captains`,
        body,
      })
    );

    const printWindow = window.open("/print", "_blank", "width=900,height=700");

    if (!printWindow) {
      alert("Unable to open print preview. Please allow popups for this site.");
      return;
    }
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
          .select("id, name, division_id")
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
              division_lines (
                line_name
              ),
              home_player_1:members!match_lines_home_player_1_id_fkey(id, first_name, last_name, self_rating),
              home_player_2:members!match_lines_home_player_2_id_fkey(id, first_name, last_name, self_rating),
              away_player_1:members!match_lines_away_player_1_id_fkey(id, first_name, last_name, self_rating),
              away_player_2:members!match_lines_away_player_2_id_fkey(id, first_name, last_name, self_rating),
              line_games (
                id,
                game_number,
                home_score,
                away_score
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
              onClick={() => openGuideDocument(supabase, captainGuide)}
              className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-400"
            >
              Captains Guide
            </button>
          }
          actions={
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-1">
              <button
                type="button"
                onClick={() => router.push("/reset-password")}
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
          <div className="mt-6 rounded-2xl border border-blue-100 bg-white shadow">
            <div className="rounded-t-2xl bg-slate-950 p-5 text-white">
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

            <div className="p-4 sm:p-6">
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
                    setSetupMatch(null);
                    setSetupTeam(null);
                    setSetupRoster([]);
                    setSetupLineups([]);
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

          <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2 md:p-6">
            {visibleTeams.map((team) => {
              const stats = teamStats[team.id] || {};
              const standing = stats.standing;
              const selected = String(team.id) === String(selectedTeamId);
              const documentsOpen = openLeagueDocuments[team.id] === true;

              return (
              <div
                key={team.id}
                onClick={() => setSelectedCaptainTeamId(team.id)}
                className={`cursor-pointer overflow-hidden rounded-2xl border shadow-md transition hover:shadow-lg ${
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
                        router.push(`/standings?league=${team.divisions?.leagues?.id || ""}&division=${team.divisions?.id || ""}`);
                      }}
                      className="rounded-full bg-blue-700 px-3 py-1 text-xs font-black uppercase tracking-wide text-white hover:bg-blue-800"
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

                <div className={`${selected ? "bg-blue-50" : "bg-white"} px-4 py-3 text-sm text-slate-700`}>
                  <div className="rounded-xl bg-white px-4 py-3 shadow-sm">
                    <span className="font-bold text-slate-900">Home Location:</span> {team.locations?.name || "—"}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2 border-t border-slate-100 p-4 sm:grid-cols-3">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      router.push(`/teams/${team.id}`);
                    }}
                    className="rounded-xl bg-slate-900 px-3 py-3 text-sm font-bold text-white shadow-sm hover:bg-slate-800"
                  >
                    Manage Roster
                  </button>

                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      openDivisionSchedule(team);
                    }}
                    className="rounded-xl bg-indigo-100 px-3 py-3 text-sm font-bold text-indigo-900 shadow-sm hover:bg-indigo-200"
                  >
                    Schedules/Standings
                  </button>

                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      displayPrintDivisionCaptains(team);
                    }}
                    className="rounded-xl bg-blue-100 px-3 py-3 text-sm font-bold text-blue-900 shadow-sm hover:bg-blue-200"
                  >
                    Print Captains
                  </button>
                </div>

                <div className="border-t border-slate-100">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setOpenLeagueDocuments((current) => ({
                        ...current,
                        [team.id]: !current[team.id],
                      }));
                    }}
                    className="flex w-full items-center justify-between px-4 py-3 text-left text-xs font-black uppercase tracking-wide text-slate-600 hover:bg-slate-50"
                  >
                    <span>League Documents</span>
                    <span>{documentsOpen ? "Hide" : "Show"}</span>
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
            })}

            {visibleTeams.length === 0 && (
              <div className="rounded-xl bg-slate-50 p-6 text-slate-500">
                {teams.length === 0
                  ? "You are not currently assigned as captain or co-captain of any team."
                  : "No active captain teams are currently shown. Use Previous Seasons Teams to view older teams."}
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-white/80 bg-gradient-to-br from-slate-200 via-white to-blue-100 p-3 shadow-xl ring-1 ring-slate-200">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <CaptainSectionButton
            active={captainSection === "pending"}
            label="Pending Score Verification"
            value={pendingVerification.length}
            tone="red"
            onClick={() => setCaptainSection("pending")}
          />
          <CaptainSectionButton
            active={captainSection === "upcoming"}
            label="Upcoming Matches"
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
        </div>
        </div>

        {captainSection === "pending" && (
          <Section title={`Pending Score Verification${selectedCaptainTeam ? `: ${selectedCaptainTeam.name}` : ""}`} count={pendingVerification.length}>
            {pendingVerification.map((match) =>
              matchCard(match, {
                showSetup: false,
                scoreButtonLabel: "Review / Validate Scores",
                scoreButtonTitle: "Open score review, then validate or dispute",
              })
            )}
            {pendingVerification.length === 0 && <Empty message="No scores currently need verification." />}
          </Section>
        )}

        {captainSection === "upcoming" && (
          <Section
            title={`Upcoming Matches / Byes${selectedCaptainTeam ? `: ${selectedCaptainTeam.name}` : ""}`}
            count={upcomingItems.length}
          >
            {upcomingItems.map((item) =>
              item.type === "match" ? matchCard(item.data) : byeCard(item.data)
            )}

            {upcomingItems.length === 0 && <Empty message="No upcoming matches or byes found." />}
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

        {scoreDetailsMatch && (
          <MatchScoreDetailsModal
            match={scoreDetailsMatch}
            onClose={() => setScoreDetailsMatch(null)}
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

function MatchScoreDetailsModal({ match, onClose }) {
  const lines = [...(match.match_lines || [])].sort(
    (a, b) => Number(a.line_number || 0) - Number(b.line_number || 0)
  );

  function printScoreDetails() {
    window.localStorage.setItem(
      "lwrpc-print-payload",
      JSON.stringify({
        title: `${match.home_team?.name || "Home"} vs ${match.away_team?.name || "Away"} Score Details`,
        body: matchScoreDetailsPrintHtml(match, lines),
      })
    );

    const printWindow = window.open("/print", "_blank", "width=900,height=700");

    if (!printWindow) {
      alert("Unable to open print preview. Please allow popups for this site.");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-2 sm:p-4">
      <div className="flex max-h-[94dvh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex flex-col gap-3 bg-slate-950 px-4 py-4 text-white md:flex-row md:items-start md:justify-between">
          <div>
            <div className="text-xs font-black uppercase tracking-wide text-blue-200">
              Match Score Details
            </div>
            <h2 className="mt-1 text-xl font-black sm:text-2xl">
              {match.home_team?.name || "Home"} vs {match.away_team?.name || "Away"}
            </h2>
            <div className="mt-1 flex flex-wrap gap-2 text-sm font-semibold text-slate-200">
              <span>{formatDate(match.scheduled_date)}</span>
              <span>{match.locations?.name || "Home Location TBD"}</span>
              <span>Score: {match.home_score ?? 0}-{match.away_score ?? 0}</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
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

        <div className="overflow-auto p-3 sm:p-5">
          <div className="space-y-3">
            {lines.map((line) => (
              <div key={line.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="font-black text-slate-900">
                    Game {line.line_number || "-"}{line.division_lines?.line_name ? ` - ${line.division_lines.line_name}` : ""}
                  </div>
                  <div className="rounded-full bg-slate-100 px-3 py-1 text-sm font-bold text-slate-800">
                    {line.home_team_games_won ?? 0}-{line.away_team_games_won ?? 0}
                  </div>
                </div>
                <div className="mt-2 grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
                  <div className="rounded-lg bg-green-50 px-3 py-2 font-semibold text-green-950">
                    Home: {formatMemberName(line.home_player_1)} / {formatMemberName(line.home_player_2)}
                  </div>
                  <div className="rounded-lg bg-indigo-50 px-3 py-2 font-semibold text-indigo-950">
                    Away: {formatMemberName(line.away_player_1)} / {formatMemberName(line.away_player_2)}
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold text-slate-700">
                  {[...(line.line_games || [])]
                    .sort((a, b) => Number(a.game_number || 0) - Number(b.game_number || 0))
                    .map((game) => (
                      <span key={game.id} className="rounded-full bg-slate-100 px-2 py-1">
                        Game {game.game_number}: {game.home_score ?? "-"}-{game.away_score ?? "-"} {game.game_status && game.game_status !== "completed" && game.game_status !== "scheduled" ? `(${game.game_status.replaceAll("_", " ")})` : ""}
                      </span>
                    ))}
                </div>
              </div>
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
  );
}

function formatDate(value) {
  return formatDisplayDate(value, "-");
}

function formatScoreStatus(match) {
  const status = match?.score_status || "not_entered";

  if (status === "not_entered") return "not_entered";

  const timestamp =
    status === "verified"
      ? match?.score_verified_at
      : match?.score_entered_at;

  return timestamp
    ? `${status} - ${formatDisplayTimestampShort(timestamp)}`
    : status;
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

function captainContacts(team) {
  const contacts = [
    team?.captain,
    team?.co_captain_1,
    team?.co_captain_2,
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

function divisionCaptainsPrintHtml({ leagueName, divisionName, teams }) {
  const rows = teams.flatMap((team) => {
    return [
      ["Captain", team.captain],
      ["Co-Captain", team.co_captain_1],
      ["Co-Captain", team.co_captain_2],
    ]
      .filter(([, member]) => member)
      .map(([role, member]) => `
        <tr>
          <td>${escapeHtml(team.name)}</td>
          <td>${escapeHtml(role)}</td>
          <td>${escapeHtml(formatMemberName(member))}</td>
          <td>${escapeHtml(member.email || "")}</td>
          <td>${escapeHtml(formatPhoneNumberForStorage(member.phone))}</td>
        </tr>
      `);
  }).join("");

  return `
    <style>
      h1 { margin: 0 0 4px; font-size: 24px; }
      h2 { margin: 0 0 24px; color: #475569; font-size: 16px; font-weight: 600; }
      table { width: 100%; border-collapse: collapse; }
      th { background: #0f172a; color: white; text-align: left; }
      th, td { border: 1px solid #cbd5e1; padding: 10px; font-size: 13px; }
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

function matchScoreDetailsPrintHtml(match, lines) {
  const rows = lines.map((line) => {
    const games = [...(line.line_games || [])]
      .sort((a, b) => Number(a.game_number || 0) - Number(b.game_number || 0))
      .map((game) => (
        `Game ${escapeHtml(game.game_number)}: ${escapeHtml(game.home_score ?? "-")}-${escapeHtml(game.away_score ?? "-")}${game.game_status && game.game_status !== "completed" && game.game_status !== "scheduled" ? ` (${escapeHtml(game.game_status.replaceAll("_", " "))})` : ""}`
      ))
      .join("<br />");

    return `
      <tr>
        <td>${escapeHtml(line.line_number || "-")}</td>
        <td>${escapeHtml(line.division_lines?.line_name || "")}</td>
        <td>${escapeHtml(formatMemberName(line.home_player_1))} / ${escapeHtml(formatMemberName(line.home_player_2))}</td>
        <td>${escapeHtml(formatMemberName(line.away_player_1))} / ${escapeHtml(formatMemberName(line.away_player_2))}</td>
        <td>${escapeHtml(line.home_team_games_won ?? 0)}-${escapeHtml(line.away_team_games_won ?? 0)}</td>
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
    <div class="score">Match Score: ${escapeHtml(match.home_score ?? 0)}-${escapeHtml(match.away_score ?? 0)}</div>
    <table>
      <thead>
        <tr>
          <th>Game</th>
          <th>Line</th>
          <th>Home Players</th>
          <th>Away Players</th>
          <th>Line Score</th>
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

function Section({ title, count, actions, children }) {
  return (
    <div className="mt-6 rounded-2xl bg-white p-4 shadow md:p-6">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h2 className="text-xl font-bold text-slate-900">{title}</h2>

        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          {actions}

          <div className="rounded-xl bg-slate-900 px-4 py-2 text-center text-sm font-bold text-white">
            {count}
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



