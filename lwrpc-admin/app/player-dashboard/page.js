"use client";

import LoadingScreen from "../components/LoadingScreen";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AppHeader from "../components/AppHeader";
import { requireRole, supabase } from "../lib/auth";
import {
  filterHistoryRows,
  formatDate,
  historyFilterOptions,
  playerLineDetails,
  sortHistoryRows,
} from "../lib/playHistory";
import { formatPhoneNumberForStorage } from "../lib/phone";
import {
  DEFAULT_LEAGUE_DOCUMENT_BUCKET,
  LEAGUE_DOCUMENT_TYPES,
  leagueDocumentPath,
} from "../lib/leagueDocuments";

const PLAYER_DOCUMENT_KEYS = new Set([
  "code_of_conduct",
  "league_rules",
  "league_waiver",
]);

const PLAYER_LEAGUE_DOCUMENT_TYPES = LEAGUE_DOCUMENT_TYPES.filter((documentType) =>
  PLAYER_DOCUMENT_KEYS.has(documentType.key)
);

export default function PlayerDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [member, setMember] = useState(null);
  const [teams, setTeams] = useState([]);
  const [matches, setMatches] = useState([]);
  const [standings, setStandings] = useState([]);
  const [playHistory, setPlayHistory] = useState([]);
  const [activePanel, setActivePanel] = useState("history");
  const [selectedUpcomingTeamId, setSelectedUpcomingTeamId] = useState("");
  const [selectedStandingsTeamId, setSelectedStandingsTeamId] = useState("");
  const [historyFilter, setHistoryFilter] = useState("");
  const [pdfDocument, setPdfDocument] = useState(null);
  const [matchDetails, setMatchDetails] = useState(null);

  const loadData = useCallback(async function loadData() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.email) {
      setLoading(false);
      return;
    }

    const { data: memberData, error: memberError } = await supabase
      .from("members")
      .select("id, first_name, last_name, email")
      .eq("email", user.email)
      .maybeSingle();

    if (memberError) {
      alert(memberError.message);
      setLoading(false);
      return;
    }

    setMember(memberData || null);

    if (!memberData?.id) {
      setTeams([]);
      setLoading(false);
      return;
    }

    const { data: rosterData, error: rosterError } = await supabase
      .from("team_members")
      .select(`
        team_id,
        teams (
          id,
          name,
          divisions (
            id,
            name,
            leagues (
              id,
              name,
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
          )
        )
      `)
      .eq("member_id", memberData.id);

    if (rosterError) {
      alert(rosterError.message);
      setLoading(false);
      return;
    }

    const playerTeams = (rosterData || []).map((row) => row.teams).filter(Boolean);
    const teamIds = playerTeams.map((team) => team.id);
    let matchData = [];
    let standingsData = [];
    let historyData = [];

    if (teamIds.length > 0) {
      const divisionIds = [...new Set(playerTeams.map((team) => team.divisions?.id).filter(Boolean))];
      const [
        { data, error },
        { data: standingsRows, error: standingsError },
      ] = await Promise.all([
        supabase
          .from("matches")
          .select(`
            *,
            divisions (
              id,
              name
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
              name
            ),
            away_team:teams!matches_away_team_id_fkey (
              id,
              name
            )
          `)
          .or(
            `home_team_id.in.(${teamIds.join(",")}),away_team_id.in.(${teamIds.join(",")})`
          )
          .eq("is_published", true)
          .order("scheduled_date", { ascending: true })
          .order("scheduled_time", { ascending: true }),
        supabase
          .from("team_standings")
          .select(`
            *,
            teams (
              id,
              name
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

      if (standingsError) {
        alert(standingsError.message);
        setLoading(false);
        return;
      }

      matchData = data || [];
      standingsData = standingsRows || [];
    }

    const { data: playerHistoryData, error: playerHistoryError } = await supabase
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
        home_player_1:members!match_lines_home_player_1_id_fkey (
          id,
          first_name,
          last_name,
          email
        ),
        home_player_2:members!match_lines_home_player_2_id_fkey (
          id,
          first_name,
          last_name,
          email
        ),
        away_player_1:members!match_lines_away_player_1_id_fkey (
          id,
          first_name,
          last_name,
          email
        ),
        away_player_2:members!match_lines_away_player_2_id_fkey (
          id,
          first_name,
          last_name,
          email
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
          home_team_id,
          away_team_id,
          home_team:teams!matches_home_team_id_fkey (
            id,
            name
          ),
          away_team:teams!matches_away_team_id_fkey (
            id,
            name
          ),
          divisions (
            id,
            name
          ),
          leagues (
            id,
            name,
            seasons (
              id,
              name
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

    setTeams(playerTeams);
    setMatches(matchData);
    setStandings(standingsData);
    setPlayHistory(historyData);
    setLoading(false);
  }, []);

  useEffect(() => {
    async function run() {
      const ok = await requireRole(router, "player");
      if (ok) await loadData();
    }

    run();
  }, [loadData, router]);

  const upcomingMatchesBySelectedTeam = useMemo(() => {
    if (!selectedUpcomingTeamId) return [];

    return matches.filter(
      (match) =>
        match.status !== "completed" &&
        match.status !== "cancelled" &&
        (String(match.home_team_id) === String(selectedUpcomingTeamId) ||
          String(match.away_team_id) === String(selectedUpcomingTeamId))
    );
  }, [matches, selectedUpcomingTeamId]);

  const selectedUpcomingTeam = useMemo(() => {
    return teams.find(
      (team) => String(team.id) === String(selectedUpcomingTeamId)
    );
  }, [teams, selectedUpcomingTeamId]);

  const selectedStandingsTeam = useMemo(() => {
    return teams.find(
      (team) => String(team.id) === String(selectedStandingsTeamId)
    );
  }, [teams, selectedStandingsTeamId]);

  const selectedDivisionStandings = useMemo(() => {
    if (!selectedStandingsTeam) return [];

    return standings.filter(
      (row) => String(row.division_id) === String(selectedStandingsTeam.divisions?.id)
    );
  }, [selectedStandingsTeam, standings]);

  const sortedPlayHistory = useMemo(() => {
    return sortHistoryRows(playHistory);
  }, [playHistory]);

  const playHistoryOptions = useMemo(() => {
    return historyFilterOptions(sortedPlayHistory);
  }, [sortedPlayHistory]);

  const filteredPlayHistory = useMemo(() => {
    return filterHistoryRows(sortedPlayHistory, historyFilter);
  }, [sortedPlayHistory, historyFilter]);

  const playHistoryStats = useMemo(() => {
    return filteredPlayHistory.reduce(
      (stats, row) => {
        const details = playerLineDetails(row, member?.id);

        stats.games += 1;

        if (details.result === "W") stats.wins += 1;
        if (details.result === "L") stats.losses += 1;
        if (details.result !== "W" && details.result !== "L") stats.ties += 1;

        return stats;
      },
      {
        games: 0,
        wins: 0,
        losses: 0,
        ties: 0,
      }
    );
  }, [filteredPlayHistory, member]);

  function selectPanel(panel) {
    setActivePanel(panel);

    if (panel === "standings" && !selectedStandingsTeamId && teams.length > 0) {
      setSelectedStandingsTeamId(teams[0].id);
    }

    if (panel === "upcoming" && !selectedUpcomingTeamId && teams.length > 0) {
      setSelectedUpcomingTeamId(teams[0].id);
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
            </div>
          }
        />

        <section className="overflow-hidden rounded-2xl bg-white shadow">
          <div className="bg-slate-950 px-4 py-5 text-white md:px-6">
            <div className="flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
              <div>
                <div className="text-xs font-black uppercase tracking-wide text-emerald-200">
                  Player Workspace
                </div>
                <h2 className="mt-1 text-2xl font-black">My Teams</h2>
              </div>
              <div className="text-sm font-semibold text-slate-300">
                {teams.length} team{teams.length === 1 ? "" : "s"}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 p-4 lg:grid-cols-2 md:p-5">
            {teams.map((team) => (
              <TeamCard
                key={team.id}
                team={team}
                onOpenDocument={openLeagueDocument}
              />
            ))}

            {teams.length === 0 && (
              <div className="rounded-xl bg-slate-50 px-4 py-3 text-slate-500">
                You are not currently listed on any team rosters.
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 border-t border-slate-100 bg-slate-50 p-4 md:grid-cols-3 md:p-5">
            <DashboardOption
              active={activePanel === "history"}
              label="My Play History"
              value={filteredPlayHistory.length}
              tone="blue"
              onClick={() => selectPanel("history")}
            />
            <DashboardOption
              active={activePanel === "standings"}
              label="Division Standings"
              value={selectedDivisionStandings.length || standings.length}
              tone="emerald"
              onClick={() => selectPanel("standings")}
            />
            <DashboardOption
              active={activePanel === "upcoming"}
              label="Upcoming Matches"
              value={upcomingMatchesBySelectedTeam.length || matches.filter((match) => match.status !== "completed" && match.status !== "cancelled").length}
              tone="gray"
              onClick={() => selectPanel("upcoming")}
            />
          </div>
        </section>

        {activePanel === "standings" && (
          <div className="mt-6 overflow-hidden rounded-2xl bg-white shadow">
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
                  value={selectedStandingsTeamId}
                  onChange={setSelectedStandingsTeamId}
                  teams={teams}
                  label="Choose team for standings"
                />
                <div className="rounded-xl bg-white/15 px-4 py-2 text-center text-sm font-bold text-white">
                  {selectedDivisionStandings.length}
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead className="bg-slate-900 text-xs uppercase tracking-wide text-white">
                  <tr>
                    <th className="p-3 text-left">Rank</th>
                    <th className="p-3 text-left">Team</th>
                    <th className="p-3 text-left">W-L-T</th>
                    <th className="p-3 text-left">Games</th>
                    <th className="p-3 text-left">PF</th>
                    <th className="p-3 text-left">PA</th>
                    <th className="p-3 text-left">Diff</th>
                    <th className="p-3 text-left">Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedDivisionStandings.map((row) => (
                    <tr key={row.id} className={`border-b border-slate-100 ${String(row.team_id) === String(selectedStandingsTeamId) ? "bg-emerald-50" : "hover:bg-slate-50"}`}>
                      <td className="p-3 font-bold">#{row.rank}</td>
                      <td className="p-3 font-semibold">{row.teams?.name}</td>
                      <td className="p-3">{row.match_wins}-{row.match_losses}-{row.match_ties}</td>
                      <td className="p-3">{row.game_wins}-{row.game_losses}</td>
                      <td className="p-3">{row.points_for}</td>
                      <td className="p-3">{row.points_against}</td>
                      <td className="p-3">{row.point_differential}</td>
                      <td className="p-3 font-bold text-emerald-700">{row.standings_points}</td>
                    </tr>
                  ))}
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
          <div className="mt-6 overflow-hidden rounded-2xl bg-white shadow">
            <div className="flex flex-col gap-2 bg-gradient-to-r from-slate-700 to-zinc-700 p-6 text-white md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-xs font-black uppercase tracking-wide text-slate-200">
                  Match Calendar
                </div>
                <h2 className="mt-1 text-xl font-black">
                  Upcoming Matches: {selectedUpcomingTeam?.name || "Team"}
                </h2>
                <p className="mt-1 text-sm font-semibold text-slate-200">
                  {selectedUpcomingTeam?.divisions?.leagues?.name || ""} / {selectedUpcomingTeam?.divisions?.name || ""}
                </p>
              </div>

              <div className="flex flex-col gap-2 md:flex-row md:items-center">
                <TeamSelect
                  value={selectedUpcomingTeamId}
                  onChange={setSelectedUpcomingTeamId}
                  teams={teams}
                  label="Choose team for upcoming matches"
                />
                <div className="rounded-xl bg-white/15 px-4 py-2 text-center text-sm font-bold text-white">
                  {upcomingMatchesBySelectedTeam.length}
                </div>
              </div>
            </div>

            <div className="space-y-3 p-5">
              {upcomingMatchesBySelectedTeam.map((match) => (
                <MatchSummaryCard
                  key={match.id}
                  match={match}
                  router={router}
                  standings={standings}
                  onOpenDetails={setMatchDetails}
                />
              ))}

              {upcomingMatchesBySelectedTeam.length === 0 && (
                <div className="rounded-xl bg-slate-50 p-6 text-center text-slate-500">
                  No upcoming matches found for this team.
                </div>
              )}
            </div>
          </div>
        )}

        {activePanel === "history" && (
        <div className="mt-6 overflow-hidden rounded-2xl bg-white shadow">
          <div className="flex flex-col gap-3 bg-gradient-to-r from-blue-700 to-indigo-700 p-6 text-white md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-xs font-black uppercase tracking-wide text-blue-100">
                Match Results
              </div>
              <h2 className="mt-1 text-xl font-black">My Play History</h2>
            </div>

            <select
              value={historyFilter}
              onChange={(e) => setHistoryFilter(e.target.value)}
              className="rounded-xl border border-white/40 bg-white px-3 py-2 text-sm font-semibold text-slate-800"
              aria-label="Filter play history by league and season"
            >
              <option value="">All Leagues / Seasons</option>
              {playHistoryOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 md:grid-cols-4 md:p-5">
            <HistoryStat label="Games Played" value={playHistoryStats.games} tone="slate" />
            <HistoryStat label="Wins" value={playHistoryStats.wins} tone="emerald" />
            <HistoryStat label="Losses" value={playHistoryStats.losses} tone="red" />
            <HistoryStat label="Other" value={playHistoryStats.ties} tone="amber" />
          </div>

          <div className="space-y-3 p-5">
            {filteredPlayHistory.map((row) => (
              <PlayerHistoryRowWithScores
                key={row.id}
                row={row}
                memberId={member?.id}
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
            onClose={() => setMatchDetails(null)}
          />
        )}
      </div>
    </main>
  );
}

function DashboardOption({ active, label, value, tone = "blue", onClick }) {
  const tones = {
    blue: active
      ? "border-blue-700 bg-blue-700 text-white"
      : "border-blue-200 bg-blue-50 text-blue-950 hover:border-blue-500",
    emerald: active
      ? "border-emerald-700 bg-emerald-700 text-white"
      : "border-emerald-200 bg-emerald-50 text-emerald-950 hover:border-emerald-500",
    amber: active
      ? "border-amber-500 bg-amber-400 text-slate-950"
      : "border-amber-200 bg-amber-50 text-amber-950 hover:border-amber-500",
    gray: active
      ? "border-slate-700 bg-slate-700 text-white"
      : "border-slate-300 bg-slate-50 text-slate-950 hover:border-slate-500",
  };
  const badgeClass = active ? "bg-white/20" : "bg-white";
  const helperClass = active ? "text-white/80" : "text-slate-600";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group rounded-2xl border-2 p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${tones[tone] || tones.blue}`}
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

function HistoryStat({ label, value, tone = "slate" }) {
  const tones = {
    slate: "bg-slate-950 text-white",
    emerald: "bg-emerald-600 text-white",
    red: "bg-rose-600 text-white",
    amber: "bg-amber-400 text-slate-950",
  };
  const labelClass = tone === "amber" ? "text-slate-800" : "text-white/75";

  return (
    <div className={`rounded-xl p-4 shadow-sm ${tones[tone] || tones.slate}`}>
      <div className={`text-xs font-bold uppercase tracking-wide ${labelClass}`}>
        {label}
      </div>
      <div className="mt-1 text-2xl font-black">{value}</div>
    </div>
  );
}

function TeamCard({ team, onOpenDocument }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-blue-100 bg-white text-sm shadow-md">
      <div className="bg-gradient-to-r from-slate-950 to-blue-800 px-4 py-4 text-white">
        <div className="font-black">{team.name}</div>
        <div className="mt-1 text-xs font-bold uppercase tracking-wide text-blue-100">
          {team.locations?.name || "No Home Location"}
        </div>
      </div>
      <div className="bg-blue-50 px-4 py-3">
        <div className="rounded-xl bg-white px-4 py-3 font-bold text-blue-950 shadow-sm">
          {team.divisions?.leagues?.name || ""} / {team.divisions?.name || ""}
        </div>
      </div>
      <div className="grid grid-cols-1 gap-2 bg-blue-50 px-4 pb-4 text-xs text-slate-600 sm:grid-cols-3">
        {teamCaptainContacts(team).map((contact) => (
          <div key={contact.label} className="rounded-xl bg-white px-3 py-2 shadow-sm">
            <div className="font-bold text-slate-900">{contact.label}</div>
            <div>{contact.name || "Not assigned"}</div>
            {contact.phone && <div>{contact.phone}</div>}
          </div>
        ))}
      </div>
      <div className="border-t border-slate-200 bg-white px-4 py-3">
        <div className="mb-2 text-xs font-black uppercase tracking-wide text-slate-500">
          League Documents
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {PLAYER_LEAGUE_DOCUMENT_TYPES.map((documentType) => {
            const hasDocument = Boolean(leagueDocumentPath(team.divisions?.leagues, documentType));

            return (
              <button
                key={documentType.key}
                type="button"
                onClick={() => onOpenDocument(team, documentType)}
                disabled={!hasDocument}
                className="rounded-xl bg-emerald-100 px-3 py-2 text-xs font-bold text-emerald-950 hover:bg-emerald-200 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
              >
                {documentType.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
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
  ].map((item) => ({
    label: item.label,
    name: formatMemberName(item.member),
    phone: formatPhoneNumberForStorage(item.member?.phone),
  }));
}

function formatMemberName(member) {
  if (!member) return "";
  return `${member.first_name || ""} ${member.last_name || ""}`.trim() || member.email || "";
}

function TeamSelect({ value, onChange, teams, label }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="min-w-64 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800"
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

function MatchSummaryCard({ match, router, standings, onOpenDetails }) {
  const homeStanding = teamStanding(standings, match.home_team_id);
  const awayStanding = teamStanding(standings, match.away_team_id);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="h-1 bg-gradient-to-r from-slate-500 via-zinc-500 to-stone-500" />
      <div className="px-4 py-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="font-bold text-slate-900">
            {match.home_team?.name || "Home"} vs {match.away_team?.name || "Away"}
          </div>
          <div className="mt-1 flex flex-wrap gap-2 text-xs font-bold uppercase tracking-wide">
            <span className="rounded-full bg-green-100 px-2 py-0.5 text-green-900">
              Home: {match.home_team?.name || "Home"} ({formatStandingRecord(homeStanding)})
            </span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-800">
              Away: {match.away_team?.name || "Away"} ({formatStandingRecord(awayStanding)})
            </span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-700">
              Played at: {match.locations?.name || "No Location"}
            </span>
          </div>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
            <span>{formatDate(match.scheduled_date)} at {match.scheduled_time || "—"}</span>
            <span>{match.divisions?.name || "No Division"}</span>
            <span>Week {match.week_number || "—"}</span>
          </div>
        </div>

        <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2 md:w-auto">
          <button
            type="button"
            onClick={() => router.push(`/live-match/${match.id}`)}
            className="rounded-xl bg-slate-700 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800"
          >
            Current Scores
          </button>

          <button
            type="button"
            onClick={() => onOpenDetails(match)}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800"
          >
            Match Details
          </button>
        </div>
      </div>
      </div>
    </div>
  );
}

function MatchDetailsModal({ match, standings, onClose }) {
  const homeStanding = teamStanding(standings, match.home_team_id);
  const awayStanding = teamStanding(standings, match.away_team_id);
  const location = match.locations;
  const mapUrl = mapLink(location);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
      <div className="w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex flex-col gap-3 bg-gradient-to-r from-slate-800 to-zinc-800 px-5 py-5 text-white md:flex-row md:items-start md:justify-between">
          <div>
            <div className="text-xs font-black uppercase tracking-wide text-slate-200">
              Week {match.week_number || "-"} Match Details
            </div>
            <h2 className="mt-1 text-2xl font-black">
              {match.home_team?.name || "Home"} vs {match.away_team?.name || "Away"}
            </h2>
            <div className="mt-2 text-sm font-semibold text-slate-200">
              {formatDate(match.scheduled_date)} at {match.scheduled_time || "Time TBD"}
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

        <div className="grid gap-4 bg-slate-50 p-5 md:grid-cols-2">
          <MatchTeamDetail
            label="Home Team"
            team={match.home_team}
            standing={homeStanding}
            tone="green"
          />
          <MatchTeamDetail
            label="Away Team"
            team={match.away_team}
            standing={awayStanding}
            tone="gray"
          />
        </div>

        <div className="space-y-3 p-5">
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
          </div>

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
  );
}

function MatchTeamDetail({ label, team, standing, tone }) {
  const tones = {
    green: "bg-emerald-50 text-emerald-950",
    gray: "bg-slate-100 text-slate-950",
  };

  return (
    <div className={`rounded-2xl p-4 shadow-sm ${tones[tone] || tones.gray}`}>
      <div className="text-xs font-black uppercase tracking-wide opacity-70">
        {label}
      </div>
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
    </div>
  );
}

function teamStanding(standings, teamId) {
  return standings.find((standing) => String(standing.team_id) === String(teamId));
}

function formatStandingRecord(standing) {
  if (!standing) return "0-0-0";
  return `${standing.match_wins ?? 0}-${standing.match_losses ?? 0}-${standing.match_ties ?? 0}`;
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

function PlayerHistoryRowWithScores({ row, memberId }) {
  const match = row.matches;
  const details = playerLineDetails(row, memberId);
  const gameScores = formatGameScores(row, details.sideLabel);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div
        className={`h-1 ${
          details.result === "W"
            ? "bg-emerald-500"
            : details.result === "L"
            ? "bg-rose-500"
            : "bg-slate-400"
        }`}
      />
      <div className="px-4 py-4">
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
        {match?.leagues?.seasons?.name || "No Season"} / {match?.leagues?.name || "No League"} / {match?.divisions?.name || "No Division"}
      </div>

      {gameScores.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold text-slate-700">
          {gameScores.map((game) => (
            <span key={game.key} className="rounded-xl bg-blue-50 px-3 py-2 text-blue-950">
              {game.label} - {game.playerTeamName}: {game.players} vs {game.opponentTeamName}: {game.opponentPlayers}: {game.score}
            </span>
          ))}
        </div>
      )}
      </div>
    </div>
  );
}

function formatGameScores(row, sideLabel) {
  const players = linePlayerNames(row, sideLabel);
  const opponentSideLabel = sideLabel === "Home" ? "Away" : "Home";
  const opponentPlayers = linePlayerNames(row, opponentSideLabel);
  const match = row.matches;
  const playerTeamName = sideLabel === "Home" ? match?.home_team?.name || "Home" : match?.away_team?.name || "Away";
  const opponentTeamName = sideLabel === "Home" ? match?.away_team?.name || "Away" : match?.home_team?.name || "Home";

  return [...(row.line_games || [])]
    .sort((a, b) => Number(a.game_number || 0) - Number(b.game_number || 0))
    .filter((game) => game.home_score !== null && game.away_score !== null)
    .map((game) => {
      const isHome = sideLabel === "Home";
      const playerScore = isHome ? game.home_score : game.away_score;
      const opponentScore = isHome ? game.away_score : game.home_score;

      return {
        key: game.id || game.game_number,
        label: `Game ${game.game_number || ""}`.trim(),
        playerTeamName,
        players,
        opponentTeamName,
        opponentPlayers,
        score: `${playerScore}-${opponentScore}`,
      };
    });
}

function linePlayerNames(row, sideLabel) {
  const members =
    sideLabel === "Home"
      ? [row.home_player_1, row.home_player_2]
      : [row.away_player_1, row.away_player_2];

  return members
    .filter(Boolean)
    .map(formatMemberName)
    .filter(Boolean)
    .join(" / ") || "Players TBD";
}
