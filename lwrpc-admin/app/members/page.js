"use client";

import LoadingScreen from "../components/LoadingScreen";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AppHeader from "../components/AppHeader";
import { requireRole, supabase } from "../lib/auth";
import { formatPhoneNumberForStorage, formatPhoneNumberInput } from "../lib/phone";
import { isValidEmailAddress, normalizeEmailAddress } from "../lib/email";
import { NOTIFICATION_EMAIL, NOTIFICATION_TEXT } from "../lib/notificationPreferences";

const PAGE_SIZE = 100;
const CLEAN_MEMBERS_BATCH_SIZE = 25;

export default function MembersPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState([]);
  const [search, setSearch] = useState("");
  const [showCurrentRosterOnly, setShowCurrentRosterOnly] = useState(false);
  const [includeInactiveMembers, setIncludeInactiveMembers] = useState(false);
  const [page, setPage] = useState(1);
  const [cleaningMembers, setCleaningMembers] = useState(false);
  const [markingAllInactive, setMarkingAllInactive] = useState(false);
  const [resettingPasswordMemberId, setResettingPasswordMemberId] = useState("");
  const [showMaintenance, setShowMaintenance] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [teamsMember, setTeamsMember] = useState(null);
  const [savingNewMember, setSavingNewMember] = useState(false);
  const [newMemberForm, setNewMemberForm] = useState(initialMemberForm());

  const loadMembers = useCallback(async function loadMembers() {
    setLoading(true);

    const user = await requireRole(router, "league_manager");
    if (!user) return;

    const { data, error } = await supabase
      .from("members")
      .select(`
        id,
        first_name,
        last_name,
        email,
        phone,
        club_location,
        dupr_id,
        is_active_member,
        created_at,
        user_roles (
          role
        )
      `)
      .order("last_name", { ascending: true });

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    const memberRows = data || [];
    const memberIdSet = new Set(memberRows.map((member) => String(member.id)));
    let teamsByMemberId = {};

    if (memberIdSet.size > 0) {
      const { rows: teamRows, error: teamError } = await loadAllMemberTeamRows();

      if (teamError) {
        alert(teamError.message);
        setLoading(false);
        return;
      }

      teamsByMemberId = (teamRows || []).reduce((byMember, row) => {
        if (!memberIdSet.has(String(row.member_id))) return byMember;
        if (!byMember[row.member_id]) byMember[row.member_id] = [];
        if (row.teams) byMember[row.member_id].push(row.teams);
        return byMember;
      }, {});
    }

    setMembers(
      memberRows.map((member) => ({
        ...member,
        teams: teamsByMemberId[member.id] || [],
      }))
    );
    setLoading(false);
  }, [router]);

  async function cleanMembers() {
    if (cleaningMembers) return;

    const updates = members
      .map((member) => {
        const cleanedPhone = formatPhoneNumberForStorage(member.phone);
        const currentPhone = String(member.phone || "").trim();

        if (!currentPhone || cleanedPhone === currentPhone) {
          return null;
        }

        return {
          id: member.id,
          phone: cleanedPhone,
        };
      })
      .filter(Boolean);

    if (updates.length === 0) {
      alert("No member phone numbers need cleanup.");
      return;
    }

    const ok = confirm(
      [
        "Clean Members will standardize member phone numbers only.",
        "",
        "It will:",
        `- Update ${updates.length} phone number${updates.length === 1 ? "" : "s"} that can be safely cleaned.`,
        "- Format 10-digit US numbers as (###) ###-####.",
        "- Remove a leading 1 from 11-digit US numbers.",
        "- Preserve extensions like x123.",
        "",
        "It will not change names, emails, DUPR IDs, roles, locations, or phone numbers it cannot safely interpret.",
        "",
        "Continue?",
      ].join("\n")
    );

    if (!ok) return;

    setCleaningMembers(true);

    const updatedAt = new Date().toISOString();

    for (let i = 0; i < updates.length; i += CLEAN_MEMBERS_BATCH_SIZE) {
      const batch = updates.slice(i, i + CLEAN_MEMBERS_BATCH_SIZE);
      const results = await Promise.all(
        batch.map((update) =>
          supabase
            .from("members")
            .update({
              phone: update.phone,
              updated_at: updatedAt,
            })
            .eq("id", update.id)
        )
      );

      const failedResult = results.find((result) => result.error);

      if (failedResult?.error) {
        alert(failedResult.error.message);
        setCleaningMembers(false);
        return;
      }
    }

    await loadMembers();
    setCleaningMembers(false);
    alert(`Cleaned ${updates.length} member phone number${updates.length === 1 ? "" : "s"}.`);
  }

  async function markAllMembersInactive() {
    if (markingAllInactive) return;

    const activeCount = members.filter((member) => member.is_active_member !== false).length;

    if (activeCount === 0) {
      alert("All members are already inactive.");
      return;
    }

    const ok = confirm(
      [
        `Mark ${activeCount} active member${activeCount === 1 ? "" : "s"} inactive?`,
        "",
        "Use this before a fresh MembershipWorks import when you want the import file to reactivate current members.",
        "",
        "Continue?",
      ].join("\n")
    );

    if (!ok) return;

    setMarkingAllInactive(true);

    const { error } = await supabase
      .from("members")
      .update({
        is_active_member: false,
        updated_at: new Date().toISOString(),
      })
      .neq("is_active_member", false);

    setMarkingAllInactive(false);

    if (error) {
      alert(error.message);
      return;
    }

    await loadMembers();
    setIncludeInactiveMembers(true);
    alert(`${activeCount} member${activeCount === 1 ? "" : "s"} marked inactive.`);
  }

  function updateNewMember(field, value) {
    setNewMemberForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function closeAddMember() {
    if (savingNewMember) return;
    setShowAddMember(false);
    setNewMemberForm(initialMemberForm());
  }

  async function addMember() {
    const normalizedEmail = normalizeEmailAddress(newMemberForm.email);
    const firstName = newMemberForm.first_name.trim();
    const lastName = newMemberForm.last_name.trim();

    if (!firstName && !lastName) {
      alert("Please enter at least a first or last name.");
      return;
    }

    if (normalizedEmail && !isValidEmailAddress(normalizedEmail)) {
      alert("Please enter a valid email address, such as name@example.com.");
      return;
    }

    setSavingNewMember(true);

    const { data, error } = await supabase
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
      .single();

    if (error) {
      alert(error.message);
      setSavingNewMember(false);
      return;
    }

    if (newMemberForm.role && newMemberForm.role !== "player") {
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert({
          user_id: null,
          member_id: data.id,
          role: newMemberForm.role,
        });

      if (roleError) {
        alert(`Member was created, but the role could not be saved: ${roleError.message}`);
      }
    }

    setSavingNewMember(false);
    setShowAddMember(false);
    setNewMemberForm(initialMemberForm());
    await loadMembers();
    router.push(`/members/${data.id}?edit=1`);
  }

  function openMember(memberId) {
    router.push(`/members/${memberId}`);
  }

  function openMemberTeams(member) {
    setTeamsMember(member);
  }

  async function resetMemberPassword(member) {
    const normalizedEmail = normalizeEmailAddress(member.email);

    if (!normalizedEmail) {
      alert("This member does not have an email address on file.");
      return;
    }

    if (!isValidEmailAddress(normalizedEmail)) {
      alert("This member does not have a valid email address on file.");
      return;
    }

    setResettingPasswordMemberId(member.id);

    const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo: "https://league.lwrpickleballclub.com/reset-password",
    });

    setResettingPasswordMemberId("");

    if (error) {
      alert(error.message);
      return;
    }

    alert(`Password reset email sent to ${normalizedEmail}.`);
  }

  function formatRole(role) {
    if (role === "club_pro") return "Club Pro";
    if (role === "league_manager") return "League Manager";
    if (role === "commissioner") return "Commissioner";
    if (role === "captain") return "Captain";
    return "Player";
  }

  const getMemberRole = useCallback(function getMemberRole(member) {
    return formatRole(member.user_roles?.[0]?.role || "player");
  }, []);

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

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  useEffect(() => {
    setPage(1);
  }, [includeInactiveMembers, search, showCurrentRosterOnly]);

  const filteredMembers = useMemo(() => {
    const q = search.trim().toLowerCase();
    const activeFilteredMembers = includeInactiveMembers
      ? members
      : members.filter((member) => member.is_active_member !== false);
    const rosterFilteredMembers = showCurrentRosterOnly
      ? activeFilteredMembers.filter((member) => (member.teams?.length || 0) > 0)
      : activeFilteredMembers;

    if (!q) return rosterFilteredMembers;

    return rosterFilteredMembers.filter((member) => {
      const fullName = `${member.first_name || ""} ${member.last_name || ""}`;
      const reverseName = `${member.last_name || ""} ${member.first_name || ""}`;
      const role = getMemberRole(member);

      return (
        fullName.toLowerCase().includes(q) ||
        reverseName.toLowerCase().includes(q) ||
        (member.email || "").toLowerCase().includes(q) ||
        (member.phone || "").toLowerCase().includes(q) ||
        (member.club_location || "").toLowerCase().includes(q) ||
        (member.dupr_id || "").toLowerCase().includes(q) ||
        role.toLowerCase().includes(q)
      );
    });
  }, [getMemberRole, includeInactiveMembers, members, search, showCurrentRosterOnly]);

  const totalPages = Math.max(1, Math.ceil(filteredMembers.length / PAGE_SIZE));

  const clubLocations = uniqueMemberLocations(members);

  const pagedMembers = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredMembers.slice(start, start + PAGE_SIZE);
  }, [filteredMembers, page]);

  if (loading) {
    return <LoadingScreen subtitle="Loading Members..." />;
  }

  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-6">
      <div className="mx-auto max-w-7xl">
        <AppHeader
          title="Member Administration"
          subtitle="Search, review, edit, and manage club members."
        />

        <div className="rounded-2xl bg-white p-6 shadow">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-xl font-bold text-slate-900">
              Member Search
            </h2>

            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddMember(true)}
                className="rounded-xl bg-emerald-700 px-4 py-3 font-semibold text-white hover:bg-emerald-800"
              >
                Add Member
              </button>

              <button
                type="button"
                onClick={() => setShowCurrentRosterOnly((value) => !value)}
                className={`rounded-xl px-4 py-3 font-semibold ${
                  showCurrentRosterOnly
                    ? "bg-emerald-700 text-white hover:bg-emerald-800"
                    : "bg-emerald-100 text-emerald-900 hover:bg-emerald-200"
                }`}
              >
                {showCurrentRosterOnly ? "Show All Members" : "Current Rosters Only"}
              </button>

              <button
                type="button"
                onClick={() => setIncludeInactiveMembers((value) => !value)}
                className={`rounded-xl px-4 py-3 font-semibold ${
                  includeInactiveMembers
                    ? "bg-red-700 text-white hover:bg-red-800"
                    : "bg-red-100 text-red-900 hover:bg-red-200"
                }`}
              >
                {includeInactiveMembers ? "Hide Inactive" : "Include Inactive"}
              </button>

              <button
                type="button"
                onClick={() => setShowMaintenance((value) => !value)}
                className="rounded-xl bg-blue-100 px-4 py-3 font-semibold text-blue-800 hover:bg-blue-200"
              >
                {showMaintenance ? "Hide Tools" : "Data Tools"}
              </button>

              <div className="rounded-xl bg-slate-900 px-5 py-3 text-white">
                <div className="text-xs uppercase tracking-wide text-slate-300">
                  Members
                </div>
                <div className="text-2xl font-bold">{filteredMembers.length}</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_auto]">
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">
                Search Members
              </label>

              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, email, phone, location, DUPR ID, or role"
                className="w-full rounded-xl border border-slate-300 px-4 py-3"
              />
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setPage(1);
                }}
                className="w-full rounded-xl bg-slate-200 px-4 py-3 font-semibold hover:bg-slate-300"
              >
                Clear Search
              </button>
            </div>

          </div>
        </div>

        {showMaintenance && (
          <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 p-5 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Data Tools
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Import MembershipWorks files and run controlled cleanup tools for member records.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => router.push("/member-import")}
                  className="rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white hover:bg-slate-800"
                >
                  Import MembershipWorks
                </button>

                <button
                  type="button"
                  onClick={cleanMembers}
                  disabled={cleaningMembers}
                  className="rounded-xl bg-blue-700 px-5 py-3 font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {cleaningMembers ? "Cleaning..." : "Clean Members"}
                </button>

                <button
                  type="button"
                  onClick={markAllMembersInactive}
                  disabled={markingAllInactive}
                  className="rounded-xl bg-red-700 px-5 py-3 font-semibold text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {markingAllInactive ? "Updating..." : "Mark All Inactive"}
                </button>
              </div>
            </div>
          </div>
        )}

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
              members
            </div>

            <Pagination
              page={page}
              totalPages={totalPages}
              setPage={setPage}
              goToPage={goToPage}
            />
          </div>

          <table className="min-w-full">
            <thead className="bg-slate-900 text-sm uppercase tracking-wide text-white">
              <tr>
                <th className="px-4 py-4 text-left">Member</th>
                <th className="px-4 py-4 text-left">Location</th>
                <th className="px-4 py-4 text-left">Phone</th>
                <th className="px-4 py-4 text-left">DUPR ID</th>
                <th className="px-4 py-4 text-left">Status</th>
                <th className="px-4 py-4 text-left">Role</th>
                <th className="px-4 py-4 text-right">Actions</th>
              </tr>
            </thead>

            <tbody>
              {pagedMembers.map((member) => (
                <tr
                  key={member.id}
                  onClick={() => openMember(member.id)}
                  className="cursor-pointer border-b border-slate-100 hover:bg-slate-50"
                >
                  <td className="px-4 py-4">
                    <div className="font-semibold text-slate-900">
                      {member.last_name}, {member.first_name}
                    </div>

                    <div className="mt-1 text-sm text-slate-500">
                      {member.email || "No Email"}
                    </div>
                  </td>

                  <td className="px-4 py-4 text-sm text-slate-700">
                    {member.club_location || "—"}
                  </td>

                  <td className="px-4 py-4 text-sm text-slate-700">
                    {formatPhoneNumberForStorage(member.phone) || "—"}
                  </td>

                  <td className="px-4 py-4 text-sm text-slate-700">
                    {member.dupr_id || "—"}
                  </td>

                  <td className="px-4 py-4">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${
                        member.is_active_member === false
                          ? "bg-red-100 text-red-800"
                          : "bg-green-100 text-green-800"
                      }`}
                    >
                      {member.is_active_member === false ? "Inactive" : "Active"}
                    </span>
                  </td>

                  <td className="px-4 py-4 text-sm font-semibold text-slate-700">
                    {getMemberRole(member)}
                  </td>

                  <td className="px-4 py-4 text-right">
                    <div className="flex flex-wrap justify-end gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/members/${member.id}?edit=1`);
                        }}
                        className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-700"
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openMemberTeams(member);
                        }}
                        className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
                      >
                        Teams ({member.teams?.length || 0})
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          resetMemberPassword(member);
                        }}
                        disabled={resettingPasswordMemberId === member.id}
                        className="rounded-lg bg-blue-700 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {resettingPasswordMemberId === member.id ? "Sending..." : "Reset Password"}
                      </button>

                    </div>
                  </td>
                </tr>
              ))}

              {pagedMembers.length === 0 && (
                <tr>
                  <td
                    colSpan="7"
                    className="px-4 py-10 text-center text-slate-500"
                  >
                    No members found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <div className="flex justify-end border-t border-slate-200 px-4 py-4">
            <Pagination
              page={page}
              totalPages={totalPages}
              setPage={setPage}
              goToPage={goToPage}
            />
          </div>
        </div>

        {showAddMember && (
          <AddMemberModal
            form={newMemberForm}
            locations={clubLocations}
            saving={savingNewMember}
            onChange={updateNewMember}
            onClose={closeAddMember}
            onSave={addMember}
          />
        )}

        {teamsMember && (
          <MemberTeamsModal
            member={teamsMember}
            onClose={() => setTeamsMember(null)}
          />
        )}
      </div>
    </main>
  );
}

async function loadAllMemberTeamRows() {
  const pageSize = 1000;
  let from = 0;
  const rows = [];

  while (true) {
    const { data, error } = await supabase
      .from("team_members")
      .select(`
        member_id,
        teams (
          id,
          name,
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
      .range(from, from + pageSize - 1);

    if (error) return { rows: [], error };

    rows.push(...(data || []));

    if (!data || data.length < pageSize) break;

    from += pageSize;
  }

  return { rows, error: null };
}

function initialMemberForm() {
  return {
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    notification_preference: NOTIFICATION_EMAIL,
    club_location: "",
    dupr_id: "",
    renewal_date: "",
    role: "player",
  };
}

function manualMembershipWorksAccountId() {
  return `manual:${crypto.randomUUID()}`;
}

function locationIdForName(locations, name) {
  const normalizedName = normalizeLocationName(name);
  const location = (locations || []).find(
    (item) => normalizeLocationName(item.name || item) === normalizedName
  );

  return location?.id || null;
}

function uniqueMemberLocations(members) {
  const byName = new Map();

  members.forEach((member) => {
    if (!member.club_location) return;
    const key = normalizeLocationName(member.club_location);
    const existing = byName.get(key);

    if (!existing || (!existing.id && member.location_id)) {
      byName.set(key, {
        id: member.location_id || null,
        name: member.club_location,
      });
    }
  });

  return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));
}

function normalizeLocationName(value) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function AddMemberModal({ form, locations, saving, onChange, onClose, onSave }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-950 px-5 py-4 text-white md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-xs font-black uppercase tracking-wide text-emerald-200">
              Member Administration
            </div>
            <h2 className="mt-1 text-2xl font-black">Add New Member</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-xl bg-white/10 px-4 py-2 text-sm font-bold text-white hover:bg-white/20 disabled:opacity-50"
          >
            Close
          </button>
        </div>

        <div className="max-h-[72vh] overflow-auto p-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField label="First Name">
              <input
                value={form.first_name}
                onChange={(e) => onChange("first_name", e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-3"
              />
            </FormField>

            <FormField label="Last Name">
              <input
                value={form.last_name}
                onChange={(e) => onChange("last_name", e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-3"
              />
            </FormField>

            <FormField label="Email">
              <input
                type="email"
                value={form.email}
                onChange={(e) => onChange("email", e.target.value)}
                placeholder="name@example.com"
                className="w-full rounded-xl border border-slate-300 px-4 py-3"
              />
            </FormField>

            <FormField label="Phone">
              <input
                value={form.phone}
                onChange={(e) => onChange("phone", formatPhoneNumberInput(e.target.value))}
                placeholder="(999) 999-9999"
                className="w-full rounded-xl border border-slate-300 px-4 py-3"
              />
            </FormField>

            <FormField label="League Notifications">
              <select
                value={form.notification_preference}
                onChange={(e) => onChange("notification_preference", e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-3"
              >
                <option value={NOTIFICATION_EMAIL}>Email</option>
                <option value={NOTIFICATION_TEXT}>Text</option>
              </select>
            </FormField>

            <FormField label="Club / Home Community">
              <input
                list="member-location-options"
                value={form.club_location}
                onChange={(e) => onChange("club_location", e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-3"
              />
              <datalist id="member-location-options">
                {locations.map((location) => (
                  <option key={location.id || location} value={location.name || location} />
                ))}
              </datalist>
            </FormField>

            <FormField label="DUPR ID">
              <input
                value={form.dupr_id}
                onChange={(e) => onChange("dupr_id", e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-3"
              />
            </FormField>

            <FormField label="Renewal Date">
              <input
                type="date"
                value={form.renewal_date}
                onChange={(e) => onChange("renewal_date", e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-3"
              />
            </FormField>

            <FormField label="Initial App Role">
              <select
                value={form.role}
                onChange={(e) => onChange("role", e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-3"
              >
                <option value="player">Player</option>
                <option value="captain">Captain</option>
                <option value="club_pro">Club Pro</option>
                <option value="league_manager">League Manager</option>
                <option value="commissioner">Commissioner</option>
              </select>
            </FormField>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-xl bg-slate-200 px-5 py-3 font-bold text-slate-900 hover:bg-slate-300 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="rounded-xl bg-emerald-700 px-5 py-3 font-bold text-white hover:bg-emerald-800 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Create Member"}
          </button>
        </div>
      </div>
    </div>
  );
}

function MemberTeamsModal({ member, onClose }) {
  const teams = member.teams || [];
  const memberName =
    `${member.first_name || ""} ${member.last_name || ""}`.trim() ||
    member.email ||
    "Member";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
      <div className="max-h-[85vh] w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-950 px-5 py-4 text-white md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-xs font-black uppercase tracking-wide text-emerald-200">
              Current Teams
            </div>
            <h2 className="mt-1 text-2xl font-black">{memberName}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-white/10 px-4 py-2 text-sm font-bold text-white hover:bg-white/20"
          >
            Close
          </button>
        </div>

        <div className="max-h-[68vh] overflow-auto p-5">
          {teams.length === 0 ? (
            <div className="rounded-xl bg-slate-50 p-6 text-center text-slate-500">
              This member is not currently on any teams.
            </div>
          ) : (
            <div className="space-y-3">
              {teams.map((team) => (
                <div
                  key={team.id}
                  className="rounded-xl border border-slate-200 bg-white p-4"
                >
                  <div className="text-lg font-black text-slate-900">
                    {team.name || "Unnamed Team"}
                  </div>
                  <div className="mt-1 text-sm font-semibold text-slate-600">
                    {team.divisions?.leagues?.name || "League TBD"} / {team.divisions?.name || "Division TBD"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FormField({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-bold text-slate-700">{label}</span>
      {children}
    </label>
  );
}

function Pagination({ page, totalPages, setPage, goToPage }) {
  return (
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
  );
}
