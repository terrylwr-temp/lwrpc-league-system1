"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import AppHeader from "../../components/AppHeader";
import { requireRole, supabase } from "../../lib/auth";
import { hasRole } from "../../lib/permissions";
import { confirmDeleteAction } from "../../lib/confirmDelete";
import { confirmUnsavedChanges, useUnsavedChangesWarning } from "../../lib/useUnsavedChangesWarning";
import { EMAIL_TEMPLATE_KEYS, getEmailTemplateConfig, renderEmailTemplate } from "../../lib/emailTemplates";
import {
  filterHistoryRows,
  formatDate,
  historyFilterOptions,
  historyTeamOptionLabel,
  playerLineDetails,
  sortHistoryRows,
} from "../../lib/playHistory";

export default function TeamRosterPage() {
  const { id } = useParams();
  const router = useRouter();

  const [team, setTeam] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [roster, setRoster] = useState([]);
  const [members, setMembers] = useState([]);
  const [locations, setLocations] = useState([]);
  const [seasonRatings, setSeasonRatings] = useState([]);
  const [playHistory, setPlayHistory] = useState([]);
  const [playerTeamsByMemberId, setPlayerTeamsByMemberId] = useState({});
  const [expandedHistoryMemberId, setExpandedHistoryMemberId] = useState("");
  const [historyFilters, setHistoryFilters] = useState({});

  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [selectedLocationId, setSelectedLocationId] = useState(null);

  useUnsavedChangesWarning(Boolean(selectedMemberId), "roster selection");

  const checkAuth = useCallback(async function checkAuth() {
    const user = await requireRole(router, "captain");
    setCurrentUser(user);
    return !!user;
  }, [router]);

  const loadData = useCallback(async function loadData() {
    const { data: teamData, error: teamError } = await supabase
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
      .single();

    if (teamError) {
      alert(teamError.message);
      return;
    }

    const { data: rosterData, error: rosterError } = await supabase
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
      .eq("team_id", id);

    if (rosterError) {
      alert(rosterError.message);
      return;
    }

    const { data: memberData, error: memberError } = await supabase
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
      .range(0, 5000);

    if (memberError) {
      alert(memberError.message);
      return;
    }

    const { data: locationData, error: locationError } = await supabase
      .from("locations")
      .select("id, name")
      .order("name", { ascending: true });

    if (locationError) {
      alert(locationError.message);
      return;
    }

    const seasonId = teamData.divisions?.leagues?.season_id;

    let ratingData = [];

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

    const rosterMemberIds = (rosterData || [])
      .map((row) => row.member_id)
      .filter(Boolean);
    let historyData = [];
    let playerTeamRows = [];

    if (rosterMemberIds.length > 0) {
      const { data: teamRows, error: teamRowsError } = await supabase
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
        .in("member_id", rosterMemberIds);

      if (teamRowsError) {
        alert(teamRowsError.message);
        return;
      }

      playerTeamRows = teamRows || [];

      const playerFilter = [
        `home_player_1_id.in.(${rosterMemberIds.join(",")})`,
        `home_player_2_id.in.(${rosterMemberIds.join(",")})`,
        `away_player_1_id.in.(${rosterMemberIds.join(",")})`,
        `away_player_2_id.in.(${rosterMemberIds.join(",")})`,
      ].join(",");

      const { data, error } = await supabase
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
        .or(playerFilter);

      if (error) {
        alert(error.message);
        return;
      }

      historyData = data || [];
    }

    setTeam(teamData);
    setRoster(rosterData || []);
    setMembers(memberData || []);
    setLocations(locationData || []);
    setSeasonRatings(ratingData);
    setPlayHistory(historyData);
    setPlayerTeamsByMemberId(groupPlayerTeamsByMemberId(playerTeamRows));

    if (selectedLocationId === null && teamData.home_location_id) {
      setSelectedLocationId(teamData.home_location_id);
    }
  }, [id, selectedLocationId]);

  function getSeasonRating(memberId) {
    return seasonRatings.find(
      rating => rating.member_id === memberId
    );
  }

  function formatMemberName(member) {
    if (!member) return "";

    return (
      member.full_name ||
      `${member.first_name || ""} ${member.last_name || ""}`.trim() ||
      member.email ||
      ""
    );
  }

  function getCaptainSummary() {
    const captains = [
      ["Captain", formatMemberName(team?.captain)],
      ["Co-Captain 1", formatMemberName(team?.co_captain_1)],
      ["Co-Captain 2", formatMemberName(team?.co_captain_2)],
      ["Club Pro", formatMemberName(team?.club_pro)],
    ].filter(([, name]) => name);

    if (captains.length === 0) {
      return "No team leads assigned";
    }

    return captains.map(([label, name]) => `${label}: ${name}`).join(" · ");
  }

  function getRatingType() {
    return team?.divisions?.rating_type || "dupr";
  }

  function getRatingLabel() {
    const ratingType = getRatingType();

    if (ratingType === "primetime") {
      return "Season PrimeTime (Age-Based)";
    }

    if (ratingType === "self_rating") {
      return "Self Rating";
    }

    return "Season DUPR Rating";
  }

  function getPlayerRating(member) {
    const ratingType = getRatingType();
    const ratingRow = getSeasonRating(member.id);

    if (ratingType === "primetime") {
      if (
        ratingRow?.season_primetime_rating !== null &&
        ratingRow?.season_primetime_rating !== undefined
      ) {
        return Number(ratingRow.season_primetime_rating);
      }

      return null;
    }

    if (ratingType === "self_rating") {
      if (
        member.self_rating !== null &&
        member.self_rating !== undefined &&
        member.self_rating !== ""
      ) {
        return Number(member.self_rating);
      }

      return null;
    }

    if (
      ratingRow?.season_dupr_rating !== null &&
      ratingRow?.season_dupr_rating !== undefined
    ) {
      return Number(ratingRow.season_dupr_rating);
    }

    return null;
  }

  function getRatingDisplay(member) {
    const rating = getPlayerRating(member);

    if (rating === null || Number.isNaN(rating)) {
      return "—";
    }

    return rating.toFixed(2);
  }

  function hasNrDuprDoublesRating(member) {
    const ratingRow = getSeasonRating(member.id);
    const rawRating = ratingRow?.dupr_doubles_rating;

    return String(rawRating || "").trim().toUpperCase() === "NR";
  }

  function ratingRangeLabel() {
    const minRating = team?.divisions?.min_dupr;
    const maxRating = team?.divisions?.max_dupr;

    if (minRating !== null && minRating !== undefined && maxRating !== null && maxRating !== undefined) {
      return `${minRating} to ${maxRating}`;
    }

    if (maxRating !== null && maxRating !== undefined) {
      return `at or below ${maxRating}`;
    }

    if (minRating !== null && minRating !== undefined) {
      return `at or above ${minRating}`;
    }

    return "not set";
  }

  function selectedSeasonName() {
    return team?.divisions?.leagues?.seasons?.name || "Season not set";
  }

  function playerRatingEligibility(member) {
    const playerRating = getPlayerRating(member);
    const minRating = team?.divisions?.min_dupr;
    const maxRating = team?.divisions?.max_dupr;

    if (playerRating === null || Number.isNaN(playerRating)) {
      return "Rating Needed";
    }

    if (
      minRating !== null &&
      minRating !== undefined &&
      playerRating < Number(minRating)
    ) {
      return "Not Eligible";
    }

    if (
      maxRating !== null &&
      maxRating !== undefined &&
      playerRating > Number(maxRating)
    ) {
      return "Not Eligible";
    }

    return "Eligible";
  }

  function captainAlertDetails() {
    const captains = [
      ["Captain", team?.captain],
      ["Co-Captain 1", team?.co_captain_1],
      ["Co-Captain 2", team?.co_captain_2],
      ["Club Pro", team?.club_pro],
    ].filter(([, member]) => member);

    return captains
      .map(([label, member]) => ({
        label,
        name: formatMemberName(member) || "Unknown",
        email: member.email || "No email on file",
      }))
      .map((captain) => `${captain.label}: ${captain.name} <${captain.email}>`)
      .join("\n") || "No captain listed";
  }

  function isCurrentTeamCaptainOrCoCaptain() {
    const memberId = String(currentUser?.memberId || "");

    if (!memberId || !team) return false;

    return [
      team.captain_member_id,
      team.co_captain_member_id,
      team.co_captain_2_member_id,
    ].some((captainId) => String(captainId || "") === memberId);
  }

  function rosterLockedMessage() {
    return [
      "Team rosters are locked for this league.",
      "",
      "Captains and co-captains cannot view or modify rosters while the league is locked.",
      "Please contact a League Manager or Commissioner for roster changes.",
    ].join("\n");
  }

  function captainChangeRequestHref() {
    const subject = "Captain Change Request";
    const body = [
      `Team: ${team?.name || "Unknown Team"}`,
      `Division: ${team?.divisions?.name || "Unknown Division"}`,
      `League: ${team?.divisions?.leagues?.name || "Unknown League"}`,
      "",
      "Requested change:",
      "",
    ].join("\n");

    return `mailto:info@lwrpickleballclub.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  async function sendRatingCheckAlert(member, reason) {
    const playerName = formatMemberName(member) || "Unknown player";
    const template = await loadClientEmailTemplate(EMAIL_TEMPLATE_KEYS.ratingCheckAlert);
    const rendered = renderEmailTemplate(template, {
      player_name: playerName,
      team: team?.name || "Unknown team",
      reason,
      rating_type: getRatingLabel(),
      rating_range: ratingRangeLabel(),
      captain_contacts: captainAlertDetails().replaceAll("\n", "<br />"),
    });

    const response = await fetch("/api/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        emails: ["info@lwrpickleballclub.com"],
        phones: [],
        subject: rendered.subject,
        text: rendered.text,
        html: rendered.html,
      }),
    });

    if (!response.ok) {
      throw new Error("Rating check alert failed");
    }

    const result = await response.json();

    if (Number(result?.email?.sent || 0) < 1) {
      throw new Error(result?.email?.reason || "Rating check alert was not sent");
    }
  }

function getAverageTeamRating() {
  if (!roster.length) {
    return "—";
  }

  const ratings = roster
    .map(player => {
      if (!player.members) return null;

      return getPlayerRating(player.members);
    })
    .filter(
      rating =>
        rating !== null &&
        rating !== undefined &&
        !Number.isNaN(rating)
    );

  if (!ratings.length) {
    return "—";
  }

  const total = ratings.reduce(
    (sum, rating) => sum + Number(rating),
    0
  );

  return (total / ratings.length).toFixed(3);
}

  const getRosterRank = useCallback(function getRosterRank(member) {
    if (!member || !team) return 9;

    if (
      String(team.captain_member_id) ===
      String(member.id)
    ) {
      return 1;
    }

    if (
      String(team.co_captain_member_id) ===
        String(member.id) ||
      String(team.co_captain_2_member_id) ===
        String(member.id)
    ) {
      return 2;
    }

    if (
      String(team.club_pro_member_id) ===
      String(member.id)
    ) {
      return 3;
    }

    return 3;
  }, [team]);

  function historyRowsForMember(memberId) {
    return sortHistoryRows(
      playHistory.filter((row) =>
        [
          row.home_player_1_id,
          row.home_player_2_id,
          row.away_player_1_id,
          row.away_player_2_id,
        ].includes(memberId)
      )
    );
  }

  function playerTeamsForMember(memberId) {
    return playerTeamsByMemberId[String(memberId || "")] || [];
  }

  function playerRosterRecord(memberId) {
    const rows = filterHistoryRows(historyRowsForMember(memberId), `team:${team?.id}`, memberId);

    return rows.reduce(
      (record, row) => {
        const details = playerLineDetails(row, memberId);
        record.games += 1;
        if (details.result === "W") record.wins += 1;
        if (details.result === "L") record.losses += 1;
        if (details.result !== "W" && details.result !== "L") record.other += 1;
        record.record = `${record.wins}-${record.losses}-${record.other}`;
        return record;
      },
      { games: 0, wins: 0, losses: 0, other: 0, record: "0-0-0" }
    );
  }

  const sortedRoster = useMemo(() => {
    return [...roster].sort((a, b) => {
      const aMember = a.members;
      const bMember = b.members;

      const rankCompare =
        getRosterRank(aMember) - getRosterRank(bMember);

      if (rankCompare !== 0) {
        return rankCompare;
      }

      const lastCompare = (aMember?.last_name || "")
        .localeCompare(bMember?.last_name || "");

      if (lastCompare !== 0) {
        return lastCompare;
      }

      return (aMember?.first_name || "")
        .localeCompare(bMember?.first_name || "");
    });
  }, [getRosterRank, roster]);

  const rostersLocked = team?.divisions?.leagues?.rosters_locked === true;
  const canAdministerLockedRoster = hasRole(currentUser?.role, "league_manager");
  const canModifyRoster = hasRole(currentUser?.role, "captain") && (!rostersLocked || canAdministerLockedRoster);
  const isCaptainOnly = currentUser?.role === "captain";
  const canRequestCaptainChange = isCurrentTeamCaptainOrCoCaptain();

  async function addPlayer() {
    if (!selectedMemberId) {
      alert("Select a player");
      return;
    }

    const member = members.find(
      m => m.id === selectedMemberId
    );

    if (!member) {
      alert("Player not found");
      return;
    }

    const playerRating = getPlayerRating(member);
    const missingRating =
      playerRating === null ||
      Number.isNaN(playerRating);
    const nrDuprDoublesRating = hasNrDuprDoublesRating(member);
    const minRating = team?.divisions?.min_dupr;
    const maxRating = team?.divisions?.max_dupr;

    let outsideRange = false;

    if (
      playerRating !== null &&
      !Number.isNaN(playerRating) &&
      minRating !== null &&
      minRating !== undefined &&
      playerRating < Number(minRating)
    ) {
      outsideRange = true;
    }

    if (
      playerRating !== null &&
      !Number.isNaN(playerRating) &&
      maxRating !== null &&
      maxRating !== undefined &&
      playerRating > Number(maxRating)
    ) {
      outsideRange = true;
    }

    if (outsideRange) {
      alert(
        `${formatMemberName(member)} is outside the Team Rating Range (${ratingRangeLabel()}) and cannot be added.`
      );
      return;
    }

    if (missingRating) {
      await sendRatingCheckAlert(member, `Blocked roster add; no ${getRatingLabel()} entered`).catch((alertError) => {
        console.warn("Roster rating check alert failed.", alertError);
        alert("This player cannot be added because their rating is missing, and the rating check email could not be sent. Please notify the league manually.");
      });
      alert(`${member.first_name} ${member.last_name} does not have a ${getRatingLabel()} entered for this season and cannot be added to this roster.`);
      return;
    }

    const alreadyOnRoster = roster.find(
      r => r.member_id === selectedMemberId
    );

    if (alreadyOnRoster) {
      alert("Player already on roster");
      return;
    }

    const { error } = await supabase
      .from("team_members")
      .insert({
        team_id: id,
        member_id: selectedMemberId
      });

    if (error) {
      alert(error.message);
      return;
    }

    if (missingRating || nrDuprDoublesRating) {
      const reasons = [];
      if (missingRating) reasons.push(`No ${getRatingLabel()} entered`);
      if (nrDuprDoublesRating) reasons.push("NR DUPR Doubles rating");

      await sendRatingCheckAlert(member, reasons.join("; ")).catch((alertError) => {
        console.warn("Roster rating check alert failed.", alertError);
        alert("Player added, but the rating check email could not be sent. Please notify the league manually.");
      });
    }

    setSelectedMemberId("");
    loadData();
  }

  async function removePlayer(teamMemberId) {
    if (!canModifyRoster) {
      alert("Rosters are locked for this league. Only League Managers and Commissioners can modify team rosters.");
      return;
    }

    const ok = confirmDeleteAction({
      title: "Remove this player from the roster?",
      details: "This deletes the roster membership record. It does not delete the member, but it may affect captain match setup, roster eligibility, and future lineup selections.",
    });

    if (!ok) return;

    const { error } = await supabase
      .from("team_members")
      .delete()
      .eq("id", teamMemberId);

    if (error) {
      alert(error.message);
      return;
    }

    loadData();
  }

  useEffect(() => {
    async function run() {
      const ok = await checkAuth();

      if (ok && id) {
        loadData();
      }
    }

    run();
  }, [checkAuth, id, loadData]);

  useEffect(() => {
    if (!team || !currentUser || !rostersLocked || canAdministerLockedRoster) return;

    alert(rosterLockedMessage());
    router.push(isCaptainOnly ? "/captain-dashboard" : "/teams");
  }, [canAdministerLockedRoster, currentUser, isCaptainOnly, rostersLocked, router, team]);

  const availableMembers = useMemo(() => {
    const selectedLocation = locations.find(
      (location) => String(location.id) === String(selectedLocationId)
    );

    return members
      .filter(member => {
        if (selectedLocationId) {
          const memberLocationMatches =
            String(member.location_id || "") === String(selectedLocationId) ||
            normalizeLocationName(member.club_location) === normalizeLocationName(selectedLocation?.name);

          if (!memberLocationMatches) {
            return false;
          }
        }

        return !roster.find(
          r => r.member_id === member.id
        );
      })
      .sort((a, b) => {
        const lastCompare =
          (a.last_name || "")
            .localeCompare(b.last_name || "");

        if (lastCompare !== 0) {
          return lastCompare;
        }

        return (a.first_name || "")
          .localeCompare(b.first_name || "");
      });
  }, [locations, members, roster, selectedLocationId]);

  if (!team) {
    return (
      <main className="min-h-screen bg-slate-100 p-6">
        <div className="mx-auto max-w-6xl rounded-2xl bg-white p-6 shadow">
          Loading team...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 px-3 py-4 sm:p-6">
      <div className="mx-auto w-full max-w-6xl">

        <AppHeader
          title="Team Roster Management"
          subtitle="Manage roster eligibility, season ratings, and player assignments."
        />

        <div className="mb-6 flex flex-wrap gap-3">

          <button
            onClick={() => {
              if (!confirmUnsavedChanges()) return;

              if (isCaptainOnly) {
                router.push("/captain-dashboard");
              } else {
                router.back();
              }
            }}
            className="w-full rounded-xl bg-slate-200 px-4 py-3 font-semibold hover:bg-slate-300 sm:w-auto sm:py-2"
          >
            {isCaptainOnly ? "Back to Dashboard" : "Back"}
          </button>

        </div>

        <div className="rounded-2xl bg-white p-4 shadow md:p-5">

          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">

            <div className="min-w-0">

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">
                  {team.name}
                </h1>

                {canRequestCaptainChange && (
                  <a
                    href={captainChangeRequestHref()}
                    className="inline-flex w-full items-center justify-center rounded-xl bg-blue-700 px-4 py-2 text-sm font-bold text-white hover:bg-blue-800 sm:w-auto"
                  >
                    Change Captain/Co-Captain
                  </a>
                )}
              </div>

              <div className="mt-2 text-slate-600">
                {getCaptainSummary()}
              </div>

            </div>

            <div className="w-full rounded-xl bg-slate-900 p-4 text-white shadow-lg sm:w-auto sm:min-w-40">

              <div className="text-xs uppercase tracking-wide text-slate-300">
                Active Players
              </div>

              <div className="mt-1 text-3xl font-bold">
                {roster.length}
              </div>

            </div>

          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">

            <Info
              label="Division"
              value={team.divisions?.name || "—"}
            />

            <Info
              label="Rating Type"
              value={getRatingLabel()}
            />

            <Info
              label="Team Rating Range"
              value={ratingRangeLabel()}
            />
            <Info
              label="Season"
              value={selectedSeasonName()}
            />

            <Info
              label="Team Average Rating"
              value={getAverageTeamRating()}
            />
            <Info
              label="Home Location"
              value={team.locations?.name || "—"}
            />

          </div>

        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-6">

          <div className="rounded-2xl bg-white p-4 shadow sm:p-6">

            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">

              <h2 className="text-xl font-bold text-slate-900">
                Add Player
              </h2>

              <div className="w-fit rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white">
                {availableMembers.length} Available
              </div>

            </div>

            <div className="space-y-4">

              {!canModifyRoster && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900">
                  Team rosters are locked for this league. Only League Managers and Commissioners can view and modify rosters while locked.
                </div>
              )}

              <div>

                <label className="mb-1 block text-sm font-semibold text-slate-700">
                  Player Home Location
                </label>

                <select
                  value={selectedLocationId ?? ""}
                  onChange={e => {
                    setSelectedLocationId(e.target.value);
                    setSelectedMemberId("");
                  }}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3"
                >
                  <option value="">
                    All Locations
                  </option>

                  {locations.map(location => (
                    <option
                      key={location.id}
                      value={location.id}
                    >
                      {location.name}
                    </option>
                  ))}
                </select>

                <p className="mt-2 text-xs text-slate-500">
                  Defaults to the team&apos;s home location but can be overridden.
                </p>

              </div>

              <div>

                <label className="mb-1 block text-sm font-semibold text-slate-700">
                  Available Players
                </label>

                <select
                  value={selectedMemberId}
                  onChange={e => setSelectedMemberId(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3"
                >
                  <option value="">
                    Select Player
                  </option>

                  {availableMembers.map(member => (
                    <option
                      key={member.id}
                      value={member.id}
                    >
                      {member.last_name}, {member.first_name}
                      {" · "}
                      {getRatingLabel()}: {getRatingDisplay(member)}
                      {" · "}
                      {playerRatingEligibility(member)}
                    </option>
                  ))}
                </select>

                <p className="mt-2 text-xs text-slate-500">
                  Players are matched by linked location or exact home-community name.
                </p>

              </div>

              <button
                onClick={addPlayer}
                disabled={!canModifyRoster}
                className="w-full rounded-xl bg-blue-700 px-5 py-3 font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                Add Player To Team
              </button>

            </div>

          </div>

          <div className="rounded-2xl bg-white p-4 shadow sm:p-6 lg:col-span-2">

            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

              <h2 className="text-xl font-bold text-slate-900">
                Team Roster
              </h2>

              <div className="w-full rounded-xl bg-slate-900 px-5 py-3 text-white sm:w-auto">
                <div className="text-xs uppercase tracking-wide text-slate-300">
                  Players
                </div>

                <div className="text-2xl font-bold">
                  {roster.length}
                </div>
              </div>

            </div>

            <div className="space-y-2">

              {sortedRoster.map(player => {
                const member = player.members;

                const isCaptain =
                  String(team.captain_member_id) ===
                  String(member?.id);

                const isCoCaptain =
                  String(team.co_captain_member_id) ===
                    String(member?.id) ||
                  String(team.co_captain_2_member_id) ===
                    String(member?.id);

                const isClubPro =
                  String(team.club_pro_member_id) ===
                  String(member?.id);

                return (
                  <div
                    key={player.id}
                    className="rounded-xl border border-slate-200 px-4 py-3 hover:bg-slate-50"
                  >

                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                      <div className="min-w-0 flex-1">

                        <div className="flex flex-wrap items-center gap-2">

                          <div className="min-w-0 break-words text-base font-bold text-slate-900 sm:truncate">
                            {member?.last_name}, {member?.first_name}
                          </div>

                          {isCaptain && (
                            <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold uppercase text-blue-800">
                              Captain
                            </span>
                          )}

                          {isCoCaptain && (
                            <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-bold uppercase text-purple-800">
                              Co-Captain
                            </span>
                          )}

                          {isClubPro && (
                            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold uppercase text-emerald-800">
                              Club Pro
                            </span>
                          )}

                        </div>

                        <div className="mt-2 space-y-2 break-words text-sm text-slate-600">

                          <div>
                            Team Games:{" "}
                            <span className="font-semibold">
                              {playerRosterRecord(member?.id).games}
                            </span>{" "}
                            Team Record:{" "}
                            <span className="font-semibold">
                              {playerRosterRecord(member?.id).record}
                            </span>
                          </div>

                          <div>
                            {getRatingLabel()}:
                            {" "}
                            <span className="font-semibold">
                              {member ? getRatingDisplay(member) : "—"}
                            </span>
                            {"  "}
                            DUPR ID:
                            {" "}
                            <span className="font-semibold">
                              {member?.dupr_id || "—"}
                            </span>
                            {"  "}
                            {member?.club_location || "—"}
                          </div>

                          {membershipRenewalNeedsAttention(member) && (
                            <div className="font-black text-red-700">
                              {membershipInfoLabel(member)}
                            </div>
                          )}

                        </div>

                      </div>

                      <div className="grid shrink-0 grid-cols-1 gap-2 sm:flex sm:flex-wrap sm:justify-end">
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedHistoryMemberId((current) =>
                              current === member?.id ? "" : member?.id
                            )
                          }
                          className="rounded-lg bg-blue-100 px-3 py-2 text-sm font-semibold text-blue-800 hover:bg-blue-200"
                        >
                          Play History
                        </button>

                        <button
                          onClick={() => removePlayer(player.id)}
                          disabled={!canModifyRoster}
                          className="rounded-lg bg-red-100 px-3 py-2 text-sm font-semibold text-red-800 hover:bg-red-200 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                        >
                          Remove
                        </button>
                      </div>

                    </div>

                    {expandedHistoryMemberId === member?.id && (
                      <PlayerHistoryPanel
                        memberId={member.id}
                        historyRows={historyRowsForMember(member.id)}
                        playerTeams={playerTeamsForMember(member.id)}
                        selectedFilter={historyFilters[member.id] || `team:${team.id}`}
                        onFilterChange={(value) =>
                          setHistoryFilters((current) => ({
                            ...current,
                            [member.id]: value,
                          }))
                        }
                      />
                    )}

                  </div>
                );
              })}

              {roster.length === 0 && (
                <div className="rounded-xl bg-slate-50 p-6 text-center text-slate-500">
                  No players on this roster yet.
                </div>
              )}

            </div>

          </div>

        </div>

      </div>
    </main>
  );
}

function PlayerHistoryPanel({
  memberId,
  historyRows,
  playerTeams,
  selectedFilter,
  onFilterChange,
}) {
  const options = historyFilterOptions(historyRows, playerTeams, memberId);
  const filteredRows = filterHistoryRows(historyRows, selectedFilter, memberId);
  const filteredRecord = playerHistoryRecord(filteredRows, memberId);

  return (
    <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="font-bold text-slate-900">
            Game Play History
          </div>
          <div className="mt-1 text-sm font-semibold text-slate-600">
            Games: {filteredRecord.games} · Record: {filteredRecord.record}
          </div>
        </div>

        <select
          value={selectedFilter || "all"}
          onChange={(e) => onFilterChange(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800"
          aria-label="Filter player history by league and season"
        >
          <option value="all">All Seasons/All Teams</option>
          {options.seasons.length > 0 && (
            <optgroup label="Seasons">
              {options.seasons.map((season) => (
                <option key={season.id} value={`season:${season.id}`}>
                  {season.name}
                </option>
              ))}
            </optgroup>
          )}
          {options.leagues.length > 0 && (
            <optgroup label="Leagues">
              {options.leagues.map((league) => (
                <option key={league.id} value={`league:${league.id}`}>
                  {league.name}{league.seasonName ? ` / ${league.seasonName}` : ""}
                </option>
              ))}
            </optgroup>
          )}
          {options.divisions.length > 0 && (
            <optgroup label="Divisions">
              {options.divisions.map((division) => (
                <option key={division.id} value={`division:${division.id}`}>
                  {division.name}{division.leagueName ? ` / ${division.leagueName}` : ""}
                </option>
              ))}
            </optgroup>
          )}
          {options.teams.length > 0 && (
            <optgroup label="Teams">
              {options.teams.map((team) => (
                <option key={team.id} value={`team:${team.id}`}>
                  {historyTeamOptionLabel(team)}
                </option>
              ))}
            </optgroup>
          )}
        </select>
      </div>

      <div className="space-y-2">
        {filteredRows.map((row) => {
          const match = row.matches;
          const details = playerLineDetails(row, memberId);

          return (
            <div
              key={row.id}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
            >
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
                <span className="text-slate-600">
                  vs {details.opponentName}
                </span>
                <span className="font-semibold text-slate-800">
                  {details.score}
                </span>
              </div>

              <div className="mt-1 text-xs text-slate-600">
                {match?.leagues?.seasons?.name || "No Season"} / {match?.leagues?.name || "No League"} · {match?.divisions?.name || "No Division"} · {row.division_lines?.line_name || row.division_lines?.line_type || `Line ${row.line_number || "—"}`} · {details.sideLabel}
              </div>
            </div>
          );
        })}

        {filteredRows.length === 0 && (
          <div className="rounded-lg bg-white p-4 text-center text-sm text-slate-500">
            No game play history found for this player.
          </div>
        )}
      </div>
    </div>
  );
}

function playerHistoryRecord(rows, memberId) {
  return (rows || []).reduce(
    (record, row) => {
      const details = playerLineDetails(row, memberId);
      record.games += 1;
      if (details.result === "W") record.wins += 1;
      if (details.result === "L") record.losses += 1;
      if (details.result !== "W" && details.result !== "L") record.other += 1;
      record.record = `${record.wins}-${record.losses}-${record.other}`;
      return record;
    },
    { games: 0, wins: 0, losses: 0, other: 0, record: "0-0-0" }
  );
}

function Info({ label, value }) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-gradient-to-br from-white to-blue-50 p-4 shadow-sm ring-1 ring-slate-100">
      <div className="absolute inset-x-0 top-0 h-1 bg-blue-700" />

      <div className="text-xs font-black uppercase tracking-wide text-slate-500">
        {label}
      </div>

      <div className="mt-2 break-words text-base font-black leading-snug text-slate-950">
        {value}
      </div>
    </div>
  );
}

function groupPlayerTeamsByMemberId(rows) {
  return (rows || []).reduce((byMemberId, row) => {
    const key = String(row.member_id || "");
    if (!key || !row.teams) return byMemberId;

    if (!byMemberId[key]) byMemberId[key] = [];
    byMemberId[key].push(row.teams);

    return byMemberId;
  }, {});
}

function membershipInfoLabel(member) {
  if (!member) return "Membership: unknown";

  const rawStatus = String(member.membership_status || "").trim();
  const status = rawStatus || (member.is_active_member === false ? "Inactive" : "Active");
  const renewal = member.renewal_date
    ? ` with renewal on ${formatDate(member.renewal_date)}`
    : "";

  return `Membership: ${status.toLowerCase()}${renewal}`;
}

function membershipRenewalNeedsAttention(member) {
  if (!member?.renewal_date) return false;

  const renewalDate = dateOnly(member.renewal_date);
  if (!renewalDate) return false;

  const today = dateOnly(new Date());
  const warningDate = new Date(today);
  warningDate.setDate(warningDate.getDate() + 30);

  return renewalDate <= warningDate;
}

function dateOnly(value) {
  const date = value instanceof Date ? value : new Date(`${String(value).slice(0, 10)}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function normalizeLocationName(value) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
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

