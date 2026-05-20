"use client";

import LoadingScreen from "../components/LoadingScreen";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AppHeader from "../components/AppHeader";
import { requireRole, supabase } from "../lib/auth";
import { confirmDeleteAction } from "../lib/confirmDelete";

const PAGE_SIZE = 100;

export default function RatingsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [ratingsLoading, setRatingsLoading] = useState(false);

  const [members, setMembers] = useState([]);
  const [seasons, setSeasons] = useState([]);
  const [ratings, setRatings] = useState([]);
  const [allRatings, setAllRatings] = useState([]);
  const [ratingImportRows, setRatingImportRows] = useState([]);
  const [ratingImportStatus, setRatingImportStatus] = useState("");
  const [isImportingRatings, setIsImportingRatings] = useState(false);
  const [isDeletingSeasonRatings, setIsDeletingSeasonRatings] = useState(false);

  const [selectedSeason, setSelectedSeason] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const checkAuth = useCallback(async function checkAuth() {
    const user = await requireRole(router, "league_manager");
    return !!user;
  }, [router]);

  const loadRatings = useCallback(async function loadRatings(seasonId) {
    if (!seasonId) {
      setRatings([]);
      return;
    }

    setRatingsLoading(true);

    const { data, error } = await supabase
      .from("member_season_ratings")
      .select(
        "id, member_id, season_id, season_dupr_rating, season_primetime_rating"
      )
      .eq("season_id", seasonId);

    if (error) {
      alert(error.message);
      setRatingsLoading(false);
      return;
    }

    setRatings(data || []);
    setRatingsLoading(false);
  }, []);

  const loadAllRatings = useCallback(async function loadAllRatings() {
    const { data, error } = await supabase
      .from("member_season_ratings")
      .select(
        "id, member_id, season_id, season_dupr_rating, season_primetime_rating"
      );

    if (error) {
      alert(error.message);
      return;
    }

    setAllRatings(data || []);
  }, []);

  const loadInitialData = useCallback(async function loadInitialData() {
    setLoading(true);

    const { data: memberData, error: memberError } = await supabase
      .from("members")
      .select("id, first_name, last_name, email, club_location, dupr_id")
      .order("last_name", { ascending: true });

    if (memberError) {
      alert(memberError.message);
      setLoading(false);
      return;
    }

    const { data: seasonData, error: seasonError } = await supabase
      .from("seasons")
      .select("*")
      .order("name", { ascending: true });

    if (seasonError) {
      alert(seasonError.message);
      setLoading(false);
      return;
    }

    setMembers(memberData || []);
    setSeasons(seasonData || []);

    const firstSeasonId = seasonData?.[0]?.id || "";
    setSelectedSeason(firstSeasonId);

    if (firstSeasonId) {
      await loadRatings(firstSeasonId);
    }

    await loadAllRatings();

    setLoading(false);
  }, [loadAllRatings, loadRatings]);

  async function updateRating(memberId, field, value) {
    if (!selectedSeason) {
      alert("Select a season first");
      return;
    }

    const cleanValue = value === "" ? null : Number(value);

    const existing = ratings.find(
      (r) => r.member_id === memberId && r.season_id === selectedSeason
    );

    if (existing) {
      const { error } = await supabase
        .from("member_season_ratings")
        .update({
          [field]: cleanValue,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);

      if (error) {
        alert(error.message);
        return;
      }

      setRatings((current) =>
        current.map((r) =>
          r.id === existing.id ? { ...r, [field]: cleanValue } : r
        )
      );
      setAllRatings((current) =>
        current.map((r) =>
          r.id === existing.id ? { ...r, [field]: cleanValue } : r
        )
      );
    } else {
      const newRow = {
        member_id: memberId,
        season_id: selectedSeason,
        season_dupr_rating: null,
        season_primetime_rating: null,
        [field]: cleanValue,
      };

      const { data, error } = await supabase
        .from("member_season_ratings")
        .insert(newRow)
        .select(
          "id, member_id, season_id, season_dupr_rating, season_primetime_rating"
        )
        .single();

      if (error) {
        alert(error.message);
        return;
      }

      setRatings((current) => [...current, data]);
      setAllRatings((current) => [...current, data]);
    }
  }

  function getRating(memberId, field) {
    const row = ratings.find(
      (r) => r.member_id === memberId && r.season_id === selectedSeason
    );

    return row?.[field] ?? "";
  }

  function seasonLabel(seasonId) {
    return seasons.find((season) => season.id === seasonId)?.name || "Unknown Season";
  }

  function selectedSeasonLabel() {
    return selectedSeason ? seasonLabel(selectedSeason) : "No season selected";
  }

  function seasonSortValue(seasonId) {
    const season = seasons.find((item) => item.id === seasonId);
    const dateValue = season?.start_date || season?.created_at || season?.name || "";
    return new Date(dateValue).getTime() || 0;
  }

  function getRatingHistory(memberId) {
    return allRatings
      .filter((rating) => rating.member_id === memberId)
      .sort((a, b) => seasonSortValue(b.season_id) - seasonSortValue(a.season_id));
  }

  function formatRating(value) {
    if (value === null || value === undefined || value === "") return "NR";
    const numberValue = Number(value);
    return Number.isNaN(numberValue) ? "NR" : numberValue.toFixed(2);
  }

  async function deleteRatingsForSelectedSeason() {
    if (!selectedSeason) {
      alert("Select a season first.");
      return;
    }

    const seasonName = selectedSeasonLabel();
    const seasonRatingCount = ratings.filter(
      (rating) => rating.season_id === selectedSeason
    ).length;

    const ok = confirmDeleteAction({
      title: `Delete all ${seasonRatingCount} rating record(s) for ${seasonName}?`,
      details: "This removes the imported season rating records used for roster checks, match setup rating totals, and division eligibility. You would need to re-import ratings to restore them.",
    });

    if (!ok) return;

    setIsDeletingSeasonRatings(true);

    const { error } = await supabase
      .from("member_season_ratings")
      .delete()
      .eq("season_id", selectedSeason);

    setIsDeletingSeasonRatings(false);

    if (error) {
      alert(error.message);
      return;
    }

    setRatings([]);
    setAllRatings((current) =>
      current.filter((rating) => rating.season_id !== selectedSeason)
    );
    setRatingImportRows([]);
    setRatingImportStatus(`Deleted all ratings for ${seasonName}.`);
  }

  function memberFullName(member) {
    return `${member.first_name || ""} ${member.last_name || ""}`.trim();
  }

  function normalizeText(value) {
    return String(value || "").trim();
  }

  function normalizeEmail(value) {
    return normalizeText(value).toLowerCase();
  }

  function normalizeName(value) {
    return normalizeText(value).toLowerCase().replace(/\s+/g, " ");
  }

  function findCsvValue(row, names) {
    const keys = Object.keys(row);
    for (const name of names) {
      const key = keys.find((candidate) => candidate.trim().toLowerCase() === name.toLowerCase());
      if (key) return row[key];
    }
    return "";
  }

  function parseRating(value) {
    const cleaned = normalizeText(value).replace(/[^\d.]/g, "");
    if (!cleaned) return null;
    const rating = Number(cleaned);
    return Number.isNaN(rating) ? null : rating;
  }

  async function handleRatingsImportFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!selectedSeason) {
      alert("Select a season before importing ratings.");
      event.target.value = "";
      return;
    }

    const text = await file.text();
    const parsedRows = parseCsv(text);
    const byEmail = {};
    const byName = {};

    members.forEach((member) => {
      if (member.email) byEmail[normalizeEmail(member.email)] = member;
      byName[normalizeName(memberFullName(member))] = member;
      byName[normalizeName(`${member.last_name || ""}, ${member.first_name || ""}`)] = member;
    });

    const rows = parsedRows.map((row, index) => {
      const email = normalizeEmail(findCsvValue(row, ["email", "email address", "primary email"]));
      const firstName = normalizeText(findCsvValue(row, ["first name", "firstname", "first"]));
      const lastName = normalizeText(findCsvValue(row, ["last name", "lastname", "last"]));
      const name = normalizeText(findCsvValue(row, ["name", "member name", "player", "player name"]));
      const duprId = normalizeText(findCsvValue(row, ["dupr id", "duprid", "dupr", "dupr number"]));
      const doublesRating = parseRating(findCsvValue(row, ["doubles rating", "doubles", "dupr doubles", "doubles dupr", "rating"]));
      const ageRating = parseRating(findCsvValue(row, ["age-based rating", "age based rating", "age rating", "age doubles rating", "age bracket rating", "primetime rating", "prime time rating"]));
      const lookupName = name || `${firstName} ${lastName}`.trim();
      const member = (email && byEmail[email]) || byName[normalizeName(lookupName)] || null;

      return {
        rowNumber: index + 1,
        action: member ? "ready" : "skip",
        message: member ? "Matched member." : "No matching member by email or name.",
        memberId: member?.id || null,
        memberName: member ? memberFullName(member) : lookupName,
        email,
        duprId,
        shouldUpdateDuprId: Boolean(member && duprId && !member.dupr_id),
        doublesRating,
        ageRating,
      };
    });

    setRatingImportRows(rows);
    setRatingImportStatus(`Previewed ${rows.length} row(s).`);
    event.target.value = "";
  }

  async function applyRatingsImport() {
    if (!selectedSeason) {
      alert("Select a season before importing ratings.");
      return;
    }

    const readyRows = ratingImportRows.filter((row) => row.action === "ready");
    if (readyRows.length === 0) {
      alert("No matched rating rows to import.");
      return;
    }

    if (!confirm(`Import ratings for ${readyRows.length} matched member(s)?`)) return;

    setIsImportingRatings(true);
    setRatingImportStatus("Importing ratings...");

    try {
      const now = new Date().toISOString();
      const existingByMember = {};
      ratings.forEach((rating) => {
        if (rating.season_id === selectedSeason) existingByMember[rating.member_id] = rating;
      });

      const memberUpdates = readyRows
        .filter((row) => row.shouldUpdateDuprId)
        .map((row) =>
          supabase
            .from("members")
            .update({ dupr_id: row.duprId, updated_at: now })
            .eq("id", row.memberId)
        );

      for (let i = 0; i < memberUpdates.length; i += 25) {
        const results = await Promise.all(memberUpdates.slice(i, i + 25));
        const failed = results.find((result) => result.error);
        if (failed?.error) throw new Error(failed.error.message);
      }

      const inserts = [];
      const updateRequests = [];

      readyRows.forEach((row) => {
        const payload = {
          season_dupr_rating: row.doublesRating,
          season_primetime_rating: row.ageRating,
          updated_at: now,
        };
        const existing = existingByMember[row.memberId];

        if (existing) {
          updateRequests.push(
            supabase.from("member_season_ratings").update(payload).eq("id", existing.id)
          );
        } else {
          inserts.push({
            member_id: row.memberId,
            season_id: selectedSeason,
            season_dupr_rating: row.doublesRating,
            season_primetime_rating: row.ageRating,
            updated_at: now,
          });
        }
      });

      for (let i = 0; i < updateRequests.length; i += 25) {
        const results = await Promise.all(updateRequests.slice(i, i + 25));
        const failed = results.find((result) => result.error);
        if (failed?.error) throw new Error(failed.error.message);
      }

      if (inserts.length > 0) {
        const { error } = await supabase.from("member_season_ratings").insert(inserts);
        if (error) throw new Error(error.message);
      }

      setMembers((current) =>
        current.map((member) => {
          const imported = readyRows.find((row) => row.memberId === member.id && row.shouldUpdateDuprId);
          return imported ? { ...member, dupr_id: imported.duprId } : member;
        })
      );
      await loadRatings(selectedSeason);
      await loadAllRatings();
      setRatingImportRows([]);
      setRatingImportStatus(`Imported ${readyRows.length} rating row(s).`);
    } catch (error) {
      setRatingImportStatus(`Import failed: ${error.message}`);
    } finally {
      setIsImportingRatings(false);
    }
  }

  useEffect(() => {
    async function run() {
      const ok = await checkAuth();

      if (ok) {
        await loadInitialData();
      }
    }

    run();
  }, [checkAuth, loadInitialData]);

  useEffect(() => {
    setPage(1);
  }, [search, selectedSeason]);

  useEffect(() => {
    if (!loading && selectedSeason) {
      loadRatings(selectedSeason);
    }

    if (!selectedSeason) {
      setRatings([]);
    }
  }, [loading, loadRatings, selectedSeason]);

  const filteredMembers = useMemo(() => {
    const q = search.trim().toLowerCase();

    if (!q) return members;

    return members.filter((member) => {
      const fullName = `${member.first_name || ""} ${member.last_name || ""}`;
      const reverseName = `${member.last_name || ""} ${member.first_name || ""}`;

      return (
        fullName.toLowerCase().includes(q) ||
        reverseName.toLowerCase().includes(q) ||
        (member.email || "").toLowerCase().includes(q) ||
        (member.club_location || "").toLowerCase().includes(q) ||
        (member.dupr_id || "").toLowerCase().includes(q)
      );
    });
  }, [members, search]);

  const totalPages = Math.max(1, Math.ceil(filteredMembers.length / PAGE_SIZE));

  const pagedMembers = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredMembers.slice(start, start + PAGE_SIZE);
  }, [filteredMembers, page]);

function goToPage(value) {
  const requestedPage = Number(value);

  if (!requestedPage || requestedPage < 1) {
    setPage(1);
    return;
  }

  if (requestedPage > totalPages) {
    setPage(totalPages);
    return;
  }

  setPage(requestedPage);
}
  if (loading) {
    return <LoadingScreen subtitle="Loading Member Ratings..." />;
  }

  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-7xl">
        <AppHeader
          title="Season Ratings"
          subtitle="Manage each player's season-specific doubles and age-based ratings."
        />

        <div className="rounded-2xl bg-white p-6 shadow">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900">
              Ratings Filters
            </h2>

            <div className="rounded-xl bg-slate-900 px-5 py-3 text-white">
              <div className="text-xs uppercase tracking-wide text-slate-300">
                Players
              </div>
              <div className="text-2xl font-bold">{filteredMembers.length}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">
                Season
              </label>

              <select
                value={selectedSeason}
                onChange={(e) => setSelectedSeason(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-3"
              >
                <option value="">Select Season</option>

                {seasons.map((season) => (
                  <option key={season.id} value={season.id}>
                    {season.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-semibold text-slate-700">
                Search Players
              </label>

              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, email, location, or DUPR ID"
                className="w-full rounded-xl border border-slate-300 px-4 py-3"
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={() => {
                  setSearch("");
                  setSelectedSeason(seasons?.[0]?.id || "");
                  setPage(1);
                }}
                className="w-full rounded-xl bg-slate-200 px-4 py-3 font-semibold hover:bg-slate-300"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50 p-5 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Ratings Import
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Import a CSV with member name/email, DUPR ID, doubles rating, and age-based rating for the selected season.
              </p>
              <p className="mt-1 text-xs text-slate-500">
                DUPR IDs are only written when the member does not already have one.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <label className="cursor-pointer rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white hover:bg-slate-800">
                Upload Ratings CSV
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleRatingsImportFile}
                  className="hidden"
                />
              </label>

              <button
                type="button"
                onClick={applyRatingsImport}
                disabled={isImportingRatings || ratingImportRows.filter((row) => row.action === "ready").length === 0}
                className="rounded-xl bg-blue-700 px-5 py-3 font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isImportingRatings ? "Importing..." : "Apply Ratings Import"}
              </button>
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={deleteRatingsForSelectedSeason}
                disabled={
                  !selectedSeason ||
                  ratingsLoading ||
                  isDeletingSeasonRatings ||
                  ratings.length === 0
                }
                className="w-full rounded-xl bg-red-700 px-4 py-3 font-semibold text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isDeletingSeasonRatings
                  ? "Deleting..."
                  : "Delete Season Ratings"}
              </button>
            </div>
          </div>

          {ratingImportStatus && (
            <div className="mt-3 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-slate-700">
              {ratingImportStatus}
            </div>
          )}

          {ratingImportRows.length > 0 && (
            <div className="mt-4 overflow-x-auto rounded-xl bg-white">
              <table className="w-full border-collapse text-sm">
                <thead className="bg-slate-900 text-xs uppercase tracking-wide text-white">
                  <tr>
                    <th className="p-3 text-left">Row</th>
                    <th className="p-3 text-left">Status</th>
                    <th className="p-3 text-left">Member</th>
                    <th className="p-3 text-left">Email</th>
                    <th className="p-3 text-left">DUPR ID</th>
                    <th className="p-3 text-left">Doubles</th>
                    <th className="p-3 text-left">Age-Based</th>
                    <th className="p-3 text-left">Message</th>
                  </tr>
                </thead>
                <tbody>
                  {ratingImportRows.slice(0, 50).map((row) => (
                    <tr key={row.rowNumber} className="border-b border-slate-100">
                      <td className="p-3">{row.rowNumber}</td>
                      <td className="p-3">
                        <span className={`rounded-full px-2 py-1 text-xs font-bold uppercase ${
                          row.action === "ready" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                        }`}>
                          {row.action}
                        </span>
                      </td>
                      <td className="p-3 font-semibold text-slate-900">{row.memberName}</td>
                      <td className="p-3">{row.email}</td>
                      <td className="p-3">{row.duprId}{row.shouldUpdateDuprId ? " (will update)" : ""}</td>
                      <td className="p-3">{row.doublesRating ?? ""}</td>
                      <td className="p-3">{row.ageRating ?? ""}</td>
                      <td className="p-3 text-slate-600">{row.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {ratingImportRows.length > 50 && (
                <div className="px-4 py-3 text-sm text-slate-500">
                  Showing first 50 preview rows.
                </div>
              )}
            </div>
          )}
        </div>

        <div className="mt-6 overflow-hidden rounded-2xl bg-white shadow">
          <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-4 md:flex-row md:items-center md:justify-between">
            <div className="text-sm text-slate-600">
              Showing{" "}
              <span className="font-semibold text-slate-900">
                {filteredMembers.length === 0
                  ? 0
                  : (page - 1) * PAGE_SIZE + 1}
              </span>{" "}
              to{" "}
              <span className="font-semibold text-slate-900">
                {Math.min(page * PAGE_SIZE, filteredMembers.length)}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-slate-900">
                {filteredMembers.length}
              </span>{" "}
              players
              {ratingsLoading ? " - loading ratings..." : ""}
            </div>

<div className="flex justify-end border-t border-slate-200 px-4 py-4">

  <div className="flex flex-wrap items-center gap-2">
    <button
      disabled={page <= 1}
      onClick={() => setPage((p) => Math.max(1, p - 1))}
      className="rounded-lg bg-slate-200 px-3 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
    >
      Previous
    </button>

    <div className="text-sm font-semibold text-slate-700">
      Page {page} of {totalPages}
    </div>

    <input
      type="number"
      min="1"
      max={totalPages}
      value={page}
      onChange={(e) => goToPage(e.target.value)}
      className="w-20 rounded-lg border border-slate-300 px-3 py-2 text-sm"
    />

    <button
      disabled={page >= totalPages}
      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
      className="rounded-lg bg-slate-200 px-3 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
    >
      Next
    </button>
  </div>

</div>
          </div>

          <table className="min-w-full">
            <thead className="bg-slate-900 text-sm uppercase tracking-wide text-white">
              <tr>
                <th className="px-4 py-4 text-left">Player</th>
                <th className="px-4 py-4 text-left">Location</th>
                <th className="px-4 py-4 text-left">Season</th>
                <th className="px-4 py-4 text-left">Doubles Rating</th>
                <th className="px-4 py-4 text-left">Age-Based Rating</th>
              </tr>
            </thead>

            <tbody>
              {pagedMembers.map((member) => {
                const history = getRatingHistory(member.id);

                return (
                  <tr
                    key={member.id}
                    className="border-b border-slate-100 hover:bg-slate-50"
                  >
                    <td className="px-4 py-4">
                      <div className="font-semibold text-slate-900">
                        {member.last_name}, {member.first_name}
                      </div>

                      <div className="text-sm text-slate-500">
                        {member.email || "No Email"}
                      </div>

                      <div className="text-xs text-slate-500">
                        DUPR ID: {member.dupr_id || ""}
                      </div>

                      {history.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {history.slice(0, 4).map((rating) => (
                            <span
                              key={rating.id}
                              className={`rounded-full px-2 py-1 text-xs font-semibold ${
                                rating.season_id === selectedSeason
                                  ? "bg-blue-100 text-blue-900"
                                  : "bg-slate-100 text-slate-700"
                              }`}
                            >
                              {seasonLabel(rating.season_id)}: D{" "}
                              {formatRating(rating.season_dupr_rating)} / A{" "}
                              {formatRating(rating.season_primetime_rating)}
                            </span>
                          ))}
                          {history.length > 4 && (
                            <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
                              +{history.length - 4} more
                            </span>
                          )}
                        </div>
                      )}
                    </td>

                    <td className="px-4 py-4 text-sm text-slate-700">
                      {member.club_location || ""}
                    </td>

                    <td className="px-4 py-4">
                      <div className="font-semibold text-slate-900">
                        {selectedSeasonLabel()}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        Edits apply to this season only.
                      </div>
                    </td>

                    <td className="px-4 py-4">
                      <input
                        key={`${member.id}-${selectedSeason}-dupr`}
                        type="number"
                        step="0.01"
                        defaultValue={getRating(member.id, "season_dupr_rating")}
                        onBlur={(e) =>
                          updateRating(
                            member.id,
                            "season_dupr_rating",
                            e.target.value
                          )
                        }
                        className="w-32 rounded-xl border border-slate-300 px-3 py-2"
                        placeholder="3.50"
                      />
                    </td>

                    <td className="px-4 py-4">
                      <input
                        key={`${member.id}-${selectedSeason}-age`}
                        type="number"
                        step="0.01"
                        defaultValue={getRating(
                          member.id,
                          "season_primetime_rating"
                        )}
                        onBlur={(e) =>
                          updateRating(
                            member.id,
                            "season_primetime_rating",
                            e.target.value
                          )
                        }
                        className="w-32 rounded-xl border border-slate-300 px-3 py-2"
                        placeholder="3.50"
                      />
                    </td>
                  </tr>
                );
              })}
              {pagedMembers.length === 0 && (
                <tr>
                  <td
                    colSpan="5"
                    className="px-4 py-10 text-center text-slate-500"
                  >
                    No players found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
<div className="flex flex-wrap items-center gap-2">
  <button
    disabled={page <= 1}
    onClick={() => setPage((p) => Math.max(1, p - 1))}
    className="rounded-lg bg-slate-200 px-3 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
  >
    Previous
  </button>

  <div className="text-sm font-semibold text-slate-700">
    Page {page} of {totalPages}
  </div>

  <input
    type="number"
    min="1"
    max={totalPages}
    value={page}
    onChange={(e) => goToPage(e.target.value)}
    className="w-20 rounded-lg border border-slate-300 px-3 py-2 text-sm"
  />

  <button
    disabled={page >= totalPages}
    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
    className="rounded-lg bg-slate-200 px-3 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
  >
    Next
  </button>
</div>
        </div>
      </div>
    </main>
  );
}

function parseCsv(text) {
  const lines = text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .filter((line) => line.trim() !== "");

  if (lines.length === 0) return [];

  const headers = splitCsvLine(lines[0]);

  return lines.slice(1).map((line) => {
    const values = splitCsvLine(line);
    const row = {};

    headers.forEach((header, index) => {
      row[header] = values[index] || "";
    });

    return row;
  });
}

function splitCsvLine(line) {
  const values = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      i++;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      values.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current.trim());
  return values;
}


