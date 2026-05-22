"use client";

import LoadingScreen from "../components/LoadingScreen";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AppHeader from "../components/AppHeader";
import { requireRole, supabase } from "../lib/auth";
import { formatDisplayDate, formatDisplayTime } from "../lib/dateTime";
import { formatPhoneNumberForStorage } from "../lib/phone";
import { splitNotificationRecipients } from "../lib/notificationPreferences";
import TeamScheduleModal from "../components/TeamScheduleModal";
import {
  DEFAULT_LEAGUE_DOCUMENT_BUCKET,
  LEAGUE_DOCUMENT_TYPES,
  leagueDocumentPath,
} from "../lib/leagueDocuments";

export default function CaptainDashboardPage() {
  const router = useRouter();

  const [currentMember, setCurrentMember] = useState(null);
  const [teams, setTeams] = useState([]);
  const [matches, setMatches] = useState([]);
  const [byeWeeks, setByeWeeks] = useState([]);
  const [teamStats, setTeamStats] = useState({});
  const [matchSetupStatus, setMatchSetupStatus] = useState({});
  const [selectedCaptainTeamId, setSelectedCaptainTeamId] = useState("");
  const [captainSection, setCaptainSection] = useState("upcoming");
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
  const [divisionScheduleLoading, setDivisionScheduleLoading] = useState(false);
  const [pdfDocument, setPdfDocument] = useState(null);

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

    setTeams(teamData || []);
    setSelectedCaptainTeamId((current) => current || teamData?.[0]?.id || "");

    const teamIds = (teamData || []).map((team) => team.id);

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

  const selectedCaptainTeam = useMemo(() => {
    return teams.find((team) => String(team.id) === String(selectedCaptainTeamId)) || teams[0] || null;
  }, [selectedCaptainTeamId, teams]);

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
                <div className="font-bold text-slate-900">{match.score_status || "not_entered"}</div>
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

              return (
                <div key={team.id} className="flex flex-col gap-1">
                  <button
                    type="button"
                    onClick={() => openMatchSetup(match, team)}
                    className="rounded-lg bg-blue-100 px-3 py-2.5 text-sm font-bold text-blue-900 hover:bg-blue-200"
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
    return setupDuplicateWarning(lineup) || setupLineWarning(lineup);
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

    const warning = setupLineups.map(setupLineIssue).find(Boolean);

    if (warning) {
      alert(`${warning}\n\nThis setup cannot be saved until players are only used once and every doubles team is at or below the division maximum.`);
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

    await sendMatchSetupNotification().catch((error) => {
      console.warn("Match setup notification failed.", error);
    });

    setSetupMatch(null);
    setSetupTeam(null);
    setSetupRoster([]);
    setSetupLineups([]);
    setSetupRatings([]);
    alert("Match setup saved.");
  }

  async function sendMatchSetupNotification() {
    const opponentTeam =
      String(setupMatch.home_team_id) === String(setupTeam.id)
        ? setupMatch.away_team
        : setupMatch.home_team;

    const { emails, phones } = splitNotificationRecipients(captainContacts(opponentTeam));

    if (emails.length === 0 && phones.length === 0) {
      return;
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
    }
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
    setDivisionScheduleLoading(true);

    const [
      { data: divisionTeams, error: teamsError },
      { data: divisionMatches, error: matchesError },
      { data: divisionStandings, error: standingsError },
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
          .from("team_standings")
          .select("team_id, match_wins, match_losses, match_ties")
          .eq("division_id", team.division_id),
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

    if (standingsError) {
      alert(standingsError.message);
      return;
    }

    const standingsByTeamId = Object.fromEntries(
      (divisionStandings || []).map((standing) => [String(standing.team_id), standing])
    );

    setDivisionScheduleTeams(
      (divisionTeams || []).map((divisionTeam) => ({
        ...divisionTeam,
        standing: standingsByTeamId[String(divisionTeam.id)] || null,
      }))
    );
    setDivisionScheduleMatches(divisionMatches || []);
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

            <div className="p-6">
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="rounded-xl bg-blue-50 px-4 py-3 text-sm text-blue-950">
                <span className="font-bold">Doubles Team Maximum:</span>{" "}
                {setupTeam.divisions?.team_dupr_max ?? "None"} ({setupRatingLabel()})
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={saveMatchSetup}
                  disabled={savingSetup}
                  className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
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
                  className="rounded-xl bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-300"
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
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
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
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
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
              <div className="text-sm font-semibold text-slate-300">
                {teams.length} team{teams.length === 1 ? "" : "s"}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2 md:p-6">
            {teams.map((team) => {
              const stats = teamStats[team.id] || {};
              const standing = stats.standing;
              const selected = String(team.id) === String(selectedTeamId);
              const documentsOpen = openLeagueDocuments[team.id] === true;

              return (
              <div
                key={team.id}
                className={`overflow-hidden rounded-2xl border bg-white shadow-md transition ${
                  selected ? "border-4 border-emerald-500 shadow-lg" : "border-blue-100"
                }`}
              >
                <div className={`p-4 text-white ${selected ? "bg-gradient-to-r from-emerald-800 to-blue-800" : "bg-gradient-to-r from-slate-950 to-blue-800"}`}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="text-lg font-black">{team.name}</div>
                    <div className="mt-1 text-sm font-semibold text-blue-100">
                      {team.divisions?.leagues?.name || "League"} / {team.divisions?.name || "Division"}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedCaptainTeamId(team.id)}
                      className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-wide text-white ${
                        selected ? "bg-emerald-500" : "bg-white/15 hover:bg-white/25"
                      }`}
                    >
                      {selected ? "Selected" : "Select Team"}
                    </button>
                    <button
                      type="button"
                      onClick={() => router.push(`/standings?league=${team.divisions?.leagues?.id || ""}&division=${team.divisions?.id || ""}`)}
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
                    <span className="block text-[10px] uppercase tracking-wide text-slate-500">Points</span>
                    {standing?.standings_points ?? 0}
                  </span>
                  <span className="rounded-xl bg-white px-2 py-2 shadow-sm">
                    <span className="block text-[10px] uppercase tracking-wide text-slate-500">W-L-T</span>
                    {standing?.match_wins ?? 0}-{standing?.match_losses ?? 0}-{standing?.match_ties ?? 0}
                  </span>
                </div>
                </div>

                <div className="bg-blue-50 px-4 py-3 text-sm text-slate-700">
                  <div className="rounded-xl bg-white px-4 py-3 shadow-sm">
                    <span className="font-bold text-slate-900">Home Location:</span> {team.locations?.name || "—"}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2 border-t border-slate-100 p-4 sm:grid-cols-3">
                  <button
                    type="button"
                    onClick={() => router.push(`/teams/${team.id}`)}
                    className="rounded-xl bg-slate-900 px-3 py-3 text-sm font-bold text-white shadow-sm hover:bg-slate-800"
                  >
                    Manage Roster
                  </button>

                  <button
                    type="button"
                    onClick={() => openDivisionSchedule(team)}
                    className="rounded-xl bg-indigo-100 px-3 py-3 text-sm font-bold text-indigo-900 shadow-sm hover:bg-indigo-200"
                  >
                    Division Schedules
                  </button>

                  <button
                    type="button"
                    onClick={() => displayPrintDivisionCaptains(team)}
                    className="rounded-xl bg-blue-100 px-3 py-3 text-sm font-bold text-blue-900 shadow-sm hover:bg-blue-200"
                  >
                    Print Captains
                  </button>
                </div>

                <div className="border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() =>
                      setOpenLeagueDocuments((current) => ({
                        ...current,
                        [team.id]: !current[team.id],
                      }))
                    }
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
                            onClick={() => openLeagueDocument(team, documentType)}
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

            {teams.length === 0 && (
              <div className="rounded-xl bg-slate-50 p-6 text-slate-500">
                You are not currently assigned as captain or co-captain of any team.
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
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
            {completedMatches.map(matchCard)}
            {completedMatches.length === 0 && <Empty message="No completed matches found." />}
          </Section>
        )}

        {divisionScheduleTeam && (
          <TeamScheduleModal
            title="Division Team Schedules"
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
            loading={divisionScheduleLoading}
            compact
            onClose={() => {
              setDivisionScheduleTeam(null);
              setDivisionScheduleTeams([]);
              setDivisionScheduleMatches([]);
            }}
          />
        )}

        {pdfDocument && (
          <PdfViewerModal
            document={pdfDocument}
            onClose={() => setPdfDocument(null)}
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

function formatDate(value) {
  return formatDisplayDate(value, "-");
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
      className={`rounded-2xl border-2 p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${tones[tone] || tones.blue}`}
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



