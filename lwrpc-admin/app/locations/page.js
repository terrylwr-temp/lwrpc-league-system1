"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AppHeader from "../components/AppHeader";
import { requireRole, supabase } from "../lib/auth";
import { confirmDeleteAction } from "../lib/confirmDelete";
import { useUnsavedChangesWarning } from "../lib/useUnsavedChangesWarning";

export default function LocationsPage() {
  const router = useRouter();

  const [locations, setLocations] = useState([]);
  const [members, setMembers] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [locationFormOpen, setLocationFormOpen] = useState(false);
  const [isMerging, setIsMerging] = useState(false);
  const [locationSearch, setLocationSearch] = useState("");

  const [mergeFromId, setMergeFromId] = useState("");
  const [mergeToId, setMergeToId] = useState("");
  const [deleteOldLocation, setDeleteOldLocation] = useState(true);

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [stateValue, setStateValue] = useState("FL");
  const [zipCode, setZipCode] = useState("");
  const [numberOfCourts, setNumberOfCourts] = useState("");
  const [clubProMemberId, setClubProMemberId] = useState("");
  const [clubPro2MemberId, setClubPro2MemberId] = useState("");
  const [courtNotes, setCourtNotes] = useState("");

  useUnsavedChangesWarning(
    Boolean(locationFormOpen && (editingId || name.trim() || address.trim() || city.trim() || stateValue !== "FL" || zipCode.trim() || numberOfCourts || clubProMemberId || clubPro2MemberId || courtNotes.trim())),
    "location"
  );

  const checkAuth = useCallback(async function checkAuth() {
    const user = await requireRole(router, "commissioner");
    return !!user;
  }, [router]);

  const loadLocations = useCallback(async function loadLocations() {
    const { data, error } = await supabase
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
      .order("name", { ascending: true });

    if (error) {
      alert(error.message);
      return;
    }

    setLocations(data || []);
  }, []);

  const loadMembers = useCallback(async function loadMembers() {
    const { data, error } = await supabase
      .from("members")
      .select("id, first_name, last_name, email, is_active_member")
      .or("is_active_member.eq.true,is_active_member.is.null")
      .order("last_name", { ascending: true });

    if (error) {
      alert(error.message);
      return;
    }

    setMembers(data || []);
  }, []);

  async function saveLocation(e) {
    e.preventDefault();

    if (!name.trim()) {
      alert("Location name is required");
      return;
    }

    const payload = {
      name: name.trim(),
      address: address || null,
      city: city || null,
      state: stateValue || null,
      zip_code: zipCode || null,
      number_of_courts: numberOfCourts ? Number(numberOfCourts) : 0,
      club_pro_member_id: clubProMemberId || null,
      club_pro_2_member_id: clubPro2MemberId || null,
      court_notes: courtNotes || null,
      updated_at: new Date().toISOString(),
    };

    const result = editingId
      ? await supabase.from("locations").update(payload).eq("id", editingId)
      : await supabase.from("locations").insert(payload);

    if (result.error) {
      alert(result.error.message);
      return;
    }

    await upgradeMemberToClubPro(clubProMemberId);
    await upgradeMemberToClubPro(clubPro2MemberId);

    clearForm();
    setLocationFormOpen(false);
    await loadLocations();
  }

  async function upgradeMemberToClubPro(memberId) {
    if (!memberId) return;

    const roleRank = {
      player: 1,
      captain: 2,
      club_pro: 3,
      league_manager: 4,
      commissioner: 5,
    };

    const { data: existingRole } = await supabase
      .from("user_roles")
      .select("*")
      .eq("member_id", memberId)
      .maybeSingle();

    const currentRank = roleRank[existingRole?.role || "player"] || 1;

    if (existingRole) {
      if (currentRank < roleRank.club_pro) {
        await supabase
          .from("user_roles")
          .update({ role: "club_pro" })
          .eq("id", existingRole.id);
      }

      return;
    }

    await supabase
      .from("user_roles")
      .insert({
        user_id: null,
        member_id: memberId,
        role: "club_pro",
      });
  }

  async function deleteLocation(id) {
    const ok = confirmDeleteAction({
      title: "Delete this location?",
      details: "This can affect teams, matches, members, court availability, blackout records, and schedules connected to this location. If references still exist, the database may reject the delete.",
    });

    if (!ok) return;

    const { error } = await supabase.from("locations").delete().eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    if (editingId === id) {
      clearForm();
    }

    await loadLocations();
  }

  async function mergeLocations() {
    if (!mergeFromId || !mergeToId) {
      alert("Select both locations");
      return;
    }

    if (mergeFromId === mergeToId) {
      alert("Cannot merge the same location");
      return;
    }

    const fromLocation = locations.find((location) => location.id === mergeFromId);
    const toLocation = locations.find((location) => location.id === mergeToId);

    const ok = confirm(
      `Move all connected records from "${fromLocation?.name}" to "${toLocation?.name}"?\n\nThis will update members, teams, matches, and court availability records.`
    );

    if (!ok) return;

    if (deleteOldLocation) {
      const deleteOk = confirmDeleteAction({
        title: `Delete old location "${fromLocation?.name || "selected location"}" after merge?`,
        details: `Connected records will be moved to "${toLocation?.name || "the target location"}" first, then the old location record will be deleted. If any references remain, the database may reject the delete.`,
      });

      if (!deleteOk) return;
    }

    setIsMerging(true);

    try {
      const memberUpdate = await supabase
        .from("members")
        .update({
          location_id: mergeToId,
          club_location: toLocation?.name || null,
        })
        .eq("location_id", mergeFromId);

      if (memberUpdate.error) {
        alert(memberUpdate.error.message);
        return;
      }

      const teamUpdate = await supabase
        .from("teams")
        .update({ home_location_id: mergeToId })
        .eq("home_location_id", mergeFromId);

      if (teamUpdate.error) {
        alert(teamUpdate.error.message);
        return;
      }

      const matchUpdate = await supabase
        .from("matches")
        .update({ location_id: mergeToId })
        .eq("location_id", mergeFromId);

      if (matchUpdate.error) {
        alert(matchUpdate.error.message);
        return;
      }

      const availabilityUpdate = await supabase
        .from("location_court_availability")
        .update({ location_id: mergeToId })
        .eq("location_id", mergeFromId);

      if (availabilityUpdate.error) {
        alert(availabilityUpdate.error.message);
        return;
      }

      if (deleteOldLocation) {
        const deleteResult = await supabase
          .from("locations")
          .delete()
          .eq("id", mergeFromId);

        if (deleteResult.error) {
          alert(deleteResult.error.message);
          return;
        }
      }

      alert(
        deleteOldLocation
          ? "Location merge completed and the old location was deleted."
          : "Location merge completed. The old location was kept."
      );

      setMergeFromId("");
      setMergeToId("");
      await loadLocations();
    } finally {
      setIsMerging(false);
    }
  }

  function editLocation(location) {
    setEditingId(location.id);
    setName(location.name || "");
    setAddress(location.address || "");
    setCity(location.city || "");
    setStateValue(location.state || "FL");
    setZipCode(location.zip_code || "");
    setNumberOfCourts(
      location.number_of_courts === null || location.number_of_courts === undefined
        ? ""
        : String(location.number_of_courts)
    );
    setClubProMemberId(location.club_pro_member_id || "");
    setClubPro2MemberId(location.club_pro_2_member_id || "");
    setCourtNotes(location.court_notes || "");
    setLocationFormOpen(true);
  }

  function openCreateLocation() {
    clearForm();
    setLocationFormOpen(true);
  }

  function closeLocationForm() {
    clearForm();
    setLocationFormOpen(false);
  }

  function clearForm() {
    setEditingId(null);
    setName("");
    setAddress("");
    setCity("");
    setStateValue("FL");
    setZipCode("");
    setNumberOfCourts("");
    setClubProMemberId("");
    setClubPro2MemberId("");
    setCourtNotes("");
  }

  useEffect(() => {
    async function run() {
      const ok = await checkAuth();

      if (ok) {
        await Promise.all([loadLocations(), loadMembers()]);
      }
    }

    run();
  }, [checkAuth, loadLocations, loadMembers]);

  const filteredLocations = useMemo(() => {
    const search = locationSearch.trim().toLowerCase();

    if (!search) return locations;

    return locations.filter((location) => {
      const address = [
        location.address,
        location.city,
        location.state,
        location.zip_code,
      ]
        .filter(Boolean)
        .join(" ");

      return (
        (location.name || "").toLowerCase().includes(search) ||
        address.toLowerCase().includes(search) ||
        formatMemberName(location.club_pro).toLowerCase().includes(search) ||
        formatMemberName(location.club_pro_2).toLowerCase().includes(search) ||
        (location.court_notes || "").toLowerCase().includes(search)
      );
    });
  }, [locations, locationSearch]);

  const clubProMembers = useMemo(() => {
    return [...members].sort((a, b) => {
      const lastCompare = (a.last_name || "").localeCompare(b.last_name || "");
      if (lastCompare !== 0) return lastCompare;
      return (a.first_name || "").localeCompare(b.first_name || "");
    });
  }, [members]);

  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-7xl">
        <AppHeader
          title="Locations"
          subtitle="Manage clubs, courts, addresses, and cleanup duplicate locations."
        />

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-1">
            {locationFormOpen && (
            <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/70 p-3 sm:p-6">
            <div className="my-auto w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-xl font-bold text-slate-900">
                  {editingId ? "Edit Location" : "Add Location"}
                </h2>

                <div className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white">
                  {filteredLocations.length} / {locations.length} Locations
                </div>
              </div>

              <form onSubmit={saveLocation} className="space-y-4">
                <div>
                  <FieldLabel label="Location Name" />
                  <input
                    className="w-full rounded-xl border border-slate-300 px-4 py-3"
                    placeholder="Location Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                <div>
                  <FieldLabel label="Address" />
                  <input
                    className="w-full rounded-xl border border-slate-300 px-4 py-3"
                    placeholder="Address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div>
                    <FieldLabel label="City" />
                    <input
                      className="w-full rounded-xl border border-slate-300 px-4 py-3"
                      placeholder="City"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                    />
                  </div>

                  <div>
                    <FieldLabel label="State" />
                    <input
                      className="w-full rounded-xl border border-slate-300 px-4 py-3"
                      placeholder="State"
                      value={stateValue}
                      onChange={(e) => setStateValue(e.target.value)}
                    />
                  </div>

                  <div>
                    <FieldLabel label="Zip" />
                    <input
                      className="w-full rounded-xl border border-slate-300 px-4 py-3"
                      placeholder="Zip"
                      value={zipCode}
                      onChange={(e) => setZipCode(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <FieldLabel label="Number of Courts" />
                  <input
                    type="number"
                    min="0"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3"
                    placeholder="Number of Courts"
                    value={numberOfCourts}
                    onChange={(e) => setNumberOfCourts(e.target.value)}
                  />
                </div>

                <div>
                  <FieldLabel label="Club Pro" />
                  <select
                    className="w-full rounded-xl border border-slate-300 px-4 py-3"
                    value={clubProMemberId}
                    onChange={(e) => setClubProMemberId(e.target.value)}
                  >
                    <option value="">Select Club Pro</option>
                    {clubProMembers.map((member) => (
                      <option key={member.id} value={member.id}>
                        {formatMemberNameLastFirst(member)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <FieldLabel label="Club Pro 2" />
                  <select
                    className="w-full rounded-xl border border-slate-300 px-4 py-3"
                    value={clubPro2MemberId}
                    onChange={(e) => setClubPro2MemberId(e.target.value)}
                  >
                    <option value="">Select Second Club Pro</option>
                    {clubProMembers.map((member) => (
                      <option key={member.id} value={member.id}>
                        {formatMemberNameLastFirst(member)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <FieldLabel label="Court Notes" />
                  <textarea
                    className="w-full rounded-xl border border-slate-300 px-4 py-3"
                    placeholder="Court Notes"
                    value={courtNotes}
                    onChange={(e) => setCourtNotes(e.target.value)}
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="submit"
                    className="flex-1 rounded-xl bg-blue-700 px-5 py-3 font-semibold text-white hover:bg-blue-800"
                  >
                    {editingId ? "Save Location" : "Add Location"}
                  </button>

                  <button
                    type="button"
                    onClick={closeLocationForm}
                    className="rounded-xl bg-slate-200 px-5 py-3 font-semibold hover:bg-slate-300"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
            </div>
            )}

            <div className="rounded-2xl bg-white p-6 shadow">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-xl font-bold text-slate-900">
                  Merge Locations
                </h2>

                <div className="rounded-xl bg-amber-100 px-3 py-2 text-xs font-bold uppercase tracking-wide text-amber-900">
                  Cleanup Tool
                </div>
              </div>

              <div className="mb-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
                Merge FROM is the duplicate/old location. Merge TO is the location you want to keep.
              </div>

              <div className="space-y-4">
                <div>
                  <FieldLabel label="Merge FROM Location" />
                  <select
                    className="w-full rounded-xl border border-slate-300 px-4 py-3"
                    value={mergeFromId}
                    onChange={(e) => setMergeFromId(e.target.value)}
                  >
                    <option value="">Merge FROM location</option>

                    {locations.map((location) => (
                      <option key={location.id} value={location.id}>
                        {location.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <FieldLabel label="Merge TO Location" />
                  <select
                    className="w-full rounded-xl border border-slate-300 px-4 py-3"
                    value={mergeToId}
                    onChange={(e) => setMergeToId(e.target.value)}
                  >
                    <option value="">Merge TO location</option>

                    {locations.map((location) => (
                      <option key={location.id} value={location.id}>
                        {location.name}
                      </option>
                    ))}
                  </select>
                </div>

                <label className="flex items-center gap-2 rounded-xl bg-slate-50 p-3 text-sm font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={deleteOldLocation}
                    onChange={(e) => setDeleteOldLocation(e.target.checked)}
                  />
                  Delete old location after merge
                </label>

                <button
                  type="button"
                  onClick={mergeLocations}
                  disabled={isMerging}
                  className="w-full rounded-xl bg-amber-600 px-5 py-3 font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
                >
                  {isMerging ? "Merging..." : "Merge Locations"}
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow lg:col-span-2">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Current Locations</h2>
                <div className="mt-1 text-sm font-semibold text-slate-500">
                  {filteredLocations.length} of {locations.length} locations
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                <button
                  type="button"
                  onClick={openCreateLocation}
                  className="rounded-xl bg-blue-700 px-4 py-3 text-sm font-bold text-white hover:bg-blue-800"
                >
                  Add Location
                </button>
                <div className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white">
                  {filteredLocations.length} / {locations.length}
                </div>
              </div>
            </div>

            <div className="mb-5 grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-[1fr_auto]">
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">Search Locations</label>
                <input
                  value={locationSearch}
                  onChange={(e) => setLocationSearch(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
                  placeholder="Search by name, address, club pro, or notes"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => setLocationSearch("")}
                  className="w-full rounded-xl bg-slate-200 px-4 py-3 font-semibold hover:bg-slate-300 md:w-auto"
                >
                  Clear
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {filteredLocations.map((location) => (
                <div
                  key={location.id}
                  className="rounded-xl border border-slate-200 p-4"
                >
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div>
                      <div className="text-lg font-bold text-slate-900">
                        {location.name}
                      </div>

                      <div className="mt-1 text-sm text-slate-600">
                        {location.address || "No address"}
                        {location.city ? `, ${location.city}` : ""}
                        {location.state ? `, ${location.state}` : ""}
                        {location.zip_code ? ` ${location.zip_code}` : ""}
                      </div>

                      {Number(location.number_of_courts || 0) <= 0 && (
                        <div className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900">
                          Missing court count - scheduling may not be able to use this location.
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <div className="rounded-full bg-blue-100 px-3 py-1 text-sm font-semibold text-blue-900">
                        {location.number_of_courts || 0} Courts
                      </div>

                      <button
                        type="button"
                        onClick={() => editLocation(location)}
                        className="rounded-lg bg-blue-100 px-3 py-1 text-sm font-semibold text-blue-800 hover:bg-blue-200"
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() => deleteLocation(location.id)}
                        className="rounded-lg bg-red-100 px-3 py-1 text-sm font-semibold text-red-800 hover:bg-red-200"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                    {formatMemberName(location.club_pro) && (
                      <Info label="Club Pro" value={formatMemberName(location.club_pro)} />
                    )}
                    {formatMemberName(location.club_pro_2) && (
                      <Info label="Second Club Pro" value={formatMemberName(location.club_pro_2)} />
                    )}
                    <Info label="Court Notes" value={location.court_notes} />
                  </div>
                </div>
              ))}

              {locations.length === 0 && (
                <div className="text-slate-500">No locations created yet.</div>
              )}

              {locations.length > 0 && filteredLocations.length === 0 && (
                <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-slate-500">
                  No locations match the current search.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function FieldLabel({ label }) {
  return (
    <label className="mb-1 block text-sm font-semibold text-slate-700">
      {label}
    </label>
  );
}

function formatMemberName(member) {
  if (!member) return "";
  return `${member.first_name || ""} ${member.last_name || ""}`.trim() || member.email || "";
}

function formatMemberNameLastFirst(member) {
  if (!member) return "";

  const last = member.last_name || "";
  const first = member.first_name || "";
  const name = last && first ? `${last}, ${first}` : `${last}${first}`.trim();

  return name || member.email || "";
}

function Info({ label, value }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <div className="text-xs font-semibold uppercase text-slate-500">
        {label}
      </div>

      <div className="mt-1 text-slate-800">{value || ""}</div>
    </div>
  );
}


