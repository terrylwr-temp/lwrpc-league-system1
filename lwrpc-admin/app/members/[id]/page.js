"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import AppHeader from "../../components/AppHeader";
import { requireRole, supabase } from "../../lib/auth";
import LoadingScreen from "../../components/LoadingScreen";
import { formatPhoneNumberForStorage, formatPhoneNumberInput } from "../../lib/phone";
import { isValidEmailAddress, normalizeEmailAddress } from "../../lib/email";
import { NOTIFICATION_EMAIL, NOTIFICATION_TEXT, notificationPreferenceLabel } from "../../lib/notificationPreferences";

export default function MemberDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [userRole, setUserRole] = useState("player");
  const [roleRow, setRoleRow] = useState(null);

  const searchParams = useSearchParams();
  const [locations, setLocations] = useState([]);

  const [member, setMember] = useState(null);
  const [form, setForm] = useState({});
  const [seasonRatings, setSeasonRatings] = useState([]);
  const [teamMemberships, setTeamMemberships] = useState([]);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);

  const checkAuth = useCallback(async function checkAuth() {
    const user = await requireRole(router, "league_manager");
    return !!user;
  }, [router]);

  const loadData = useCallback(async function loadData() {
    const { data: memberData, error: memberError } = await supabase
      .from("members")
      .select("*")
      .eq("id", id)
      .single();

    if (memberError) {
      alert(memberError.message);
      return;
    }

    const { data: ratingData, error: ratingError } = await supabase
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
      .order("created_at", { ascending: false });

    if (ratingError) {
      alert(ratingError.message);
      return;
    }

    const { data: teamData, error: teamError } = await supabase
      .from("team_members")
      .select(`
        *,
        teams (
          id,
          name,
          captain_member_id,
          co_captain_member_id,
          co_captain_2_member_id,
          divisions (
            id,
            name,
            leagues (
              id,
              name
            )
          )
        )
      `)
      .eq("member_id", id);

    if (teamError) {
      alert(teamError.message);
      return;
    }
const { data: roleData, error: roleError } = await supabase
  .from("user_roles")
  .select("*")
  .eq("member_id", id)
  .maybeSingle();

if (roleError) {
  alert(roleError.message);
  return;
}

const { data: locationData } = await supabase
  .from("members")
  .select("club_location")
  .not("club_location", "is", null)
  .order("club_location", { ascending: true });

const uniqueLocations = [
  ...new Set((locationData || []).map((row) => row.club_location).filter(Boolean)),
];

setLocations(uniqueLocations);
setRoleRow(roleData || null);
setUserRole(roleData?.role || "player");

    setMember(memberData);
    setForm({
      first_name: memberData.first_name || "",
      last_name: memberData.last_name || "",
      email: memberData.email || "",
      phone: formatPhoneNumberForStorage(memberData.phone),
      notification_preference: memberData.notification_preference || NOTIFICATION_EMAIL,
      club_location: memberData.club_location || "",
      dupr_id: memberData.dupr_id || "",
      renewal_date: memberData.renewal_date || "",
    });
    setSeasonRatings(ratingData || []);
    setTeamMemberships(teamData || []);
  }, [id]);

  useEffect(() => {
    async function run() {
      const ok = await checkAuth();

      if (ok && id) {
        await loadData();
      }
    }

    run();
  }, [checkAuth, id, loadData]);

  useEffect(() => {
    if (searchParams.get("edit") === "1") {
      setEditMode(true);
    }
  }, [searchParams]);

  const currentDuprRating = useMemo(() => {
    const sortedRatings = [...seasonRatings].sort((a, b) => {
      const aDate = new Date(a.seasons?.start_date || a.created_at || 0).getTime() || 0;
      const bDate = new Date(b.seasons?.start_date || b.created_at || 0).getTime() || 0;
      return bDate - aDate;
    });

    const rating = sortedRatings.find(
      (r) =>
        r.season_dupr_rating !== null &&
        r.season_dupr_rating !== undefined &&
        r.season_dupr_rating !== ""
    );

    return rating?.season_dupr_rating ?? "—";
  }, [seasonRatings]);

  function updateForm(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function saveMember() {
    const normalizedEmail = normalizeEmailAddress(form.email);

    if (normalizedEmail && !isValidEmailAddress(normalizedEmail)) {
      alert("Please enter a valid email address, such as name@example.com.");
      return;
    }

    setSaving(true);

    const { data, error } = await supabase
      .from("members")
      .update({
        first_name: form.first_name || null,
        last_name: form.last_name || null,
        email: normalizedEmail || null,
        phone: formatPhoneNumberForStorage(form.phone) || null,
        notification_preference: form.notification_preference || NOTIFICATION_EMAIL,
        club_location: form.club_location || null,
        dupr_id: form.dupr_id || null,
        renewal_date: form.renewal_date || null,
      })
      .eq("id", id)
      .select("*")
      .single();

    setSaving(false);

    if (error) {
      alert(error.message);
      return;
    }

    setMember(data);
    setForm({
      first_name: data.first_name || "",
      last_name: data.last_name || "",
      email: data.email || "",
      phone: formatPhoneNumberForStorage(data.phone),
      notification_preference: data.notification_preference || NOTIFICATION_EMAIL,
      club_location: data.club_location || "",
      dupr_id: data.dupr_id || "",
      renewal_date: data.renewal_date || "",
    });
    setEditMode(false);
  }

  function cancelEdit() {
    setForm({
      first_name: member.first_name || "",
      last_name: member.last_name || "",
      email: member.email || "",
      phone: formatPhoneNumberForStorage(member.phone),
      notification_preference: member.notification_preference || NOTIFICATION_EMAIL,
      club_location: member.club_location || "",
      dupr_id: member.dupr_id || "",
      renewal_date: member.renewal_date || "",
    });
    setEditMode(false);
  }

  function formatDate(value) {
    if (!value) return "—";

    try {
      return new Date(value).toLocaleDateString();
    } catch {
      return value;
    }
  }

  function getTeamRole(teamMembership) {
    const team = teamMembership.teams;

    if (!team) return "Player";

    if (team.captain_member_id === id) return "Captain";

    if (
      team.co_captain_member_id === id ||
      team.co_captain_2_member_id === id
    ) {
      return "Co-Captain";
    }

    return teamMembership.role || "Player";
  }
function formatRating(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "—";
  }

  return Number(value).toFixed(3);
}

async function updateUserRole(newRole) {
  setUserRole(newRole);

  if (roleRow) {
    const { data, error } = await supabase
      .from("user_roles")
      .update({
        role: newRole,
        updated_at: new Date().toISOString(),
      })
      .eq("id", roleRow.id)
      .select("*")
      .single();

    if (error) {
      alert(error.message);
      return;
    }

    setRoleRow(data);
  } else {
    const { data, error } = await supabase
      .from("user_roles")
      .insert({
        user_id: crypto.randomUUID(),
        member_id: id,
        role: newRole,
      })
      .select("*")
      .single();

    if (error) {
      alert(error.message);
      return;
    }

    setRoleRow(data);
  }
}

  if (!member) {
    return <LoadingScreen subtitle="Loading Member Detail..." />;
  }

  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-7xl">
        <AppHeader
          title="Member Detail"
          subtitle="Review and edit member information, season ratings, and current team assignments."
        />

        <div className="mb-6 flex flex-wrap gap-3">
          <button
            onClick={() => router.back()}
            className="rounded-xl bg-slate-200 px-4 py-2 font-semibold hover:bg-slate-300"
          >
            ← Members
          </button>

          {!editMode ? (
            <button
              onClick={() => setEditMode(true)}
              className="rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700"
            >
              Edit Member
            </button>
          ) : (
            <>
              <button
                onClick={saveMember}
                disabled={saving}
                className="rounded-xl bg-green-600 px-4 py-2 font-semibold text-white hover:bg-green-700 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save"}
              </button>

              <button
                onClick={cancelEdit}
                disabled={saving}
                className="rounded-xl bg-slate-200 px-4 py-2 font-semibold hover:bg-slate-300 disabled:opacity-50"
              >
                Cancel
              </button>
            </>
          )}
        </div>

        <div className="rounded-2xl bg-white p-6 shadow">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex-1">
              {!editMode ? (
                <>
                  <h1 className="text-4xl font-bold text-slate-900">
                    {member.first_name || ""} {member.last_name || ""}
                  </h1>

                  <div className="mt-4 space-y-2 text-slate-600">
                    <div>
                      <span className="font-semibold text-slate-800">
                        Email:
                      </span>{" "}
                      {member.email || "—"}
                    </div>

                    <div>
                      <span className="font-semibold text-slate-800">
                        Phone:
                      </span>{" "}
                      {formatPhoneNumberForStorage(member.phone) || "—"}
                    </div>

                    <div>
                      <span className="font-semibold text-slate-800">
                        League Notifications:
                      </span>{" "}
                      {notificationPreferenceLabel(member.notification_preference)}
                    </div>

                    <div>
                      <span className="font-semibold text-slate-800">
                        Club / Home Community:
                      </span>{" "}
                      {member.club_location || "—"}
                    </div>

                    <div>
                      <span className="font-semibold text-slate-800">
                        DUPR ID:
                      </span>{" "}
                      {member.dupr_id || "—"}
                    </div>
	<div>
	  <span className="font-semibold text-slate-800">
	    App User Role:
	  </span>{" "}
	  {userRole === "club_pro"
	    ? "Club Pro"
	    : userRole === "league_manager"
	    ? "League Manager"
	    : userRole === "commissioner"
	    ? "Commissioner"
	    : userRole === "captain"
	    ? "Captain"
	    : "Player"}
	</div>
                    <div>
                      <span className="font-semibold text-slate-800">
                        Renewal:
                      </span>{" "}
                      {formatDate(member.renewal_date)}
                    </div>
                  </div>
                </>
              ) : (
                <div>
                  <h1 className="mb-6 text-4xl font-bold text-slate-900">
                    Edit Member
                  </h1>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-sm font-semibold text-slate-700">
                        First Name
                      </label>
                      <input
                        value={form.first_name}
                        onChange={(e) =>
                          updateForm("first_name", e.target.value)
                        }
                        className="w-full rounded-xl border border-slate-300 px-4 py-3"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-semibold text-slate-700">
                        Last Name
                      </label>
                      <input
                        value={form.last_name}
                        onChange={(e) =>
                          updateForm("last_name", e.target.value)
                        }
                        className="w-full rounded-xl border border-slate-300 px-4 py-3"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-semibold text-slate-700">
                        Email
                      </label>
                      <input
                        type="email"
                        value={form.email}
                        onChange={(e) => updateForm("email", e.target.value)}
                        onBlur={(e) => updateForm("email", normalizeEmailAddress(e.target.value))}
                        placeholder="name@example.com"
                        className="w-full rounded-xl border border-slate-300 px-4 py-3"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-semibold text-slate-700">
                        Phone
                      </label>
                      <input
                        value={form.phone}
                        onChange={(e) => updateForm("phone", formatPhoneNumberInput(e.target.value))}
                        onBlur={(e) => updateForm("phone", formatPhoneNumberForStorage(e.target.value))}
                        inputMode="tel"
                        placeholder="(999) 999-9999"
                        className="w-full rounded-xl border border-slate-300 px-4 py-3"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-semibold text-slate-700">
                        League Notifications
                      </label>
                      <select
                        value={form.notification_preference || NOTIFICATION_EMAIL}
                        onChange={(e) => updateForm("notification_preference", e.target.value)}
                        className="w-full rounded-xl border border-slate-300 px-4 py-3"
                      >
                        <option value={NOTIFICATION_EMAIL}>Email</option>
                        <option value={NOTIFICATION_TEXT}>Text</option>
                      </select>
                      <p className="mt-1 text-xs text-slate-500">
                        System reminders and match notices will use this method when available.
                      </p>
                    </div>

<div>
  <label className="mb-1 block text-sm font-semibold text-slate-700">
    Club / Home Community
  </label>

  <select
    value={form.club_location}
    onChange={(e) => updateForm("club_location", e.target.value)}
    className="w-full rounded-xl border border-slate-300 px-4 py-3"
  >
    <option value="">Select Club / Home Community</option>

    {locations.map((location) => (
      <option key={location} value={location}>
        {location}
      </option>
    ))}
  </select>
</div>

                    <div>
                      <label className="mb-1 block text-sm font-semibold text-slate-700">
                        DUPR ID
                      </label>
                      <input
                        value={form.dupr_id}
                        onChange={(e) => updateForm("dupr_id", e.target.value)}
                        className="w-full rounded-xl border border-slate-300 px-4 py-3"
                      />
                    </div>
<div>
  <label className="mb-1 block text-sm font-semibold text-slate-700">
    App User Role
  </label>

  <select
    value={userRole}
    onChange={(e) => updateUserRole(e.target.value)}
    className="w-full rounded-xl border border-slate-300 px-4 py-3"
  >
    <option value="player">Player</option>
    <option value="captain">Captain</option>
    <option value="club_pro">Club Pro</option>
    <option value="league_manager">League Manager</option>
    <option value="commissioner">Commissioner</option>
  </select>
</div>

                    <div>
                      <label className="mb-1 block text-sm font-semibold text-slate-700">
                        Renewal Date
                      </label>
                      <input
                        type="date"
                        value={form.renewal_date || ""}
                        onChange={(e) =>
                          updateForm("renewal_date", e.target.value)
                        }
                        className="w-full rounded-xl border border-slate-300 px-4 py-3"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-2xl bg-slate-900 p-6 text-white shadow-lg">
              <div className="text-xs uppercase tracking-wide text-slate-300">
                Current DUPR Rating
              </div>

              <div className="mt-2 text-4xl font-bold">
                {formatRating(currentDuprRating)}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-2xl bg-white p-6 shadow">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-slate-900">
              Season Ratings
            </h2>

            <div className="rounded-xl bg-slate-900 px-5 py-3 text-white">
              <div className="text-xs uppercase tracking-wide text-slate-300">
                Seasons
              </div>

              <div className="text-2xl font-bold">{seasonRatings.length}</div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead className="bg-slate-900 text-sm uppercase tracking-wide text-white">
                <tr>
                  <th className="p-4 text-left">Season</th>
                  <th className="p-4 text-left">DUPR Rating</th>
                  <th className="p-4 text-left">PrimeTime Rating</th>
                  <th className="p-4 text-left">Notes</th>
                </tr>
              </thead>

              <tbody>
                {seasonRatings.map((rating) => (
                  <tr
                    key={rating.id}
                    className="border-b border-slate-100 hover:bg-slate-50"
                  >
                    <td className="p-4 font-semibold text-slate-900">
                      {rating.seasons?.name || "Unknown Season"}
                    </td>

                    <td className="p-4">
                      <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-semibold text-blue-900">
                        {rating.season_dupr_rating || "—"}
                      </span>
                    </td>

                    <td className="p-4">
                      <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-semibold text-green-900">
                        {formatRating(rating.season_primetime_rating)}
                      </span>
                    </td>

                    <td className="p-4 text-slate-700">
                      {rating.notes || "—"}
                    </td>
                  </tr>
                ))}

                {seasonRatings.length === 0 && (
                  <tr>
                    <td
                      colSpan="4"
                      className="p-10 text-center text-slate-500"
                    >
                      No season ratings found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-6 rounded-2xl bg-white p-6 shadow">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-slate-900">
              Current Teams
            </h2>

            <div className="rounded-xl bg-slate-900 px-5 py-3 text-white">
              <div className="text-xs uppercase tracking-wide text-slate-300">
                Teams
              </div>

              <div className="text-2xl font-bold">
                {teamMemberships.length}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead className="bg-slate-900 text-sm uppercase tracking-wide text-white">
                <tr>
                  <th className="p-4 text-left">Team</th>
                  <th className="p-4 text-left">League</th>
                  <th className="p-4 text-left">Division</th>
                  <th className="p-4 text-left">Role</th>
                </tr>
              </thead>

              <tbody>
                {teamMemberships.map((teamMembership) => {
                  const team = teamMembership.teams;

                  return (
                    <tr
                      key={teamMembership.id}
                      className="border-b border-slate-100 hover:bg-slate-50"
                    >
                      <td className="p-4 font-semibold text-slate-900">
                        {team?.name || "Unknown Team"}
                      </td>

                      <td className="p-4 text-slate-700">
                        {team?.divisions?.leagues?.name || "—"}
                      </td>

                      <td className="p-4 text-slate-700">
                        {team?.divisions?.name || "—"}
                      </td>

                      <td className="p-4">
                        <span className="rounded-full bg-purple-100 px-3 py-1 text-sm font-semibold text-purple-900">
                          {getTeamRole(teamMembership)}
                        </span>
                      </td>
                    </tr>
                  );
                })}

                {teamMemberships.length === 0 && (
                  <tr>
                    <td
                      colSpan="4"
                      className="p-10 text-center text-slate-500"
                    >
                      This member is not currently on any teams.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}
