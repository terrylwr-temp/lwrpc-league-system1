"use client";

import LoadingScreen from "../components/LoadingScreen";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AppHeader from "../components/AppHeader";
import ListingCount from "../components/ListingCount";
import RoleCapabilityModal from "../components/RoleCapabilityModal";
import { requireRole, supabase } from "../lib/auth";
import { ROLE_LEVELS, roleLabel } from "../lib/permissions";
import { wouldRemoveLastCommissioner } from "../lib/roleGuards";
import { normalizeEmailAddress } from "../lib/email";
import { formatDisplayTimestamp } from "../lib/dateTime";

const PAGE_SIZE = 100;

export default function UsersPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  const [members, setMembers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [lastLoginsByEmail, setLastLoginsByEmail] = useState({});

  const [search, setSearch] = useState("");
  const [sortConfig, setSortConfig] = useState({
    key: "member",
    direction: "asc",
  });
  const [roleHelpOpen, setRoleHelpOpen] = useState(false);
  const [page, setPage] = useState(1);

  const checkAuth = useCallback(async function checkAuth() {
    const user = await requireRole(router, "commissioner");
    return !!user;
  }, [router]);

  const loadData = useCallback(async function loadData() {
    const { data: memberData, error: memberError } = await loadAllRoleMembers();

    if (memberError) {
      alert(memberError.message);
      return;
    }

    const { data: roleData, error: roleError } = await supabase
      .from("user_roles")
      .select("*");

    if (roleError) {
      alert(roleError.message);
      return;
    }

    setMembers(memberData || []);
    setRoles(roleData || []);

    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData?.session?.access_token;

    if (accessToken) {
      const response = await fetch("/api/user-last-logins", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      const result = await response.json().catch(() => ({}));

      if (response.ok && result.success) {
        setLastLoginsByEmail(result.lastLoginsByEmail || {});
      }
    }

    setLoading(false);
  }, []);

  function getRole(memberId) {
    const role = roles.find(
      r => r.member_id === memberId
    );

    return role?.role || "player";
  }

  function changeSort(key) {
    setSortConfig((current) => ({
      key,
      direction:
        current.key === key && current.direction === "asc" ? "desc" : "asc",
    }));
  }

  async function updateRole(member, newRole) {
    const existing = roles.find(
      r => r.member_id === member.id
    );
    const currentRole = existing?.role || "player";

    if (wouldRemoveLastCommissioner(roles, currentRole, newRole, existing?.id)) {
      alert("At least one Commissioner must remain in the system. Assign another Commissioner before changing this role.");
      return;
    }

    if (existing) {
      const { error } = await supabase
        .from("user_roles")
        .update({
          role: newRole,
          updated_at: new Date().toISOString()
        })
        .eq("id", existing.id);

      if (error) {
        alert(error.message);
        return;
      }
    } else {
const { error } = await supabase
  .from("user_roles")
  .insert({
    user_id: null,
    member_id: member.id,
    role: newRole
  });

      if (error) {
        alert(error.message);
        return;
      }
    }

    loadData();
  }

  useEffect(() => {
    async function run() {
      const ok = await checkAuth();

      if (ok) {
        loadData();
      }
    }

    run();
  }, [checkAuth, loadData]);

  const filteredMembers = useMemo(() => {
    return members.filter(member => {
      const text = `
        ${member.first_name || ""}
        ${member.last_name || ""}
        ${member.email || ""}
        ${member.club_location || ""}
      `.toLowerCase();

      return text.includes(
        search.toLowerCase()
      );
    });
  }, [members, search]);

  const sortedMembers = useMemo(() => {
    const direction = sortConfig.direction === "desc" ? -1 : 1;

    return [...filteredMembers].sort((a, b) => {
      const aValue = userSortValue(a, sortConfig.key, roles, lastLoginsByEmail);
      const bValue = userSortValue(b, sortConfig.key, roles, lastLoginsByEmail);
      const aMissing = aValue === null || aValue === undefined || aValue === "";
      const bMissing = bValue === null || bValue === undefined || bValue === "";

      if (sortConfig.key === "last_login" && aMissing !== bMissing) {
        return aMissing ? 1 : -1;
      }

      return compareSortValues(aValue, bValue) * direction;
    });
  }, [filteredMembers, lastLoginsByEmail, roles, sortConfig]);

  const totalPages = Math.max(1, Math.ceil(sortedMembers.length / PAGE_SIZE));
  const pagedMembers = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return sortedMembers.slice(start, start + PAGE_SIZE);
  }, [page, sortedMembers]);

  useEffect(() => {
    setPage(1);
  }, [search, sortConfig.direction, sortConfig.key]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  function goToPage(value) {
    const requestedPage = Number(value);
    if (!requestedPage || requestedPage < 1) return setPage(1);
    setPage(Math.min(totalPages, requestedPage));
  }

if (loading) {
  return <LoadingScreen subtitle="Loading All Users..." />;
}
  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-7xl">

        <AppHeader
          title="User Roles & Permissions"
          subtitle="Manage player, captain, club pro, league manager, and commissioner access."
        />

        <div className="rounded-2xl bg-white p-6 shadow">

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">

            <div className="md:col-span-2">

              <label className="mb-1 block text-sm font-semibold text-slate-700">
                Search Members
              </label>

              <input
                value={search}
                onChange={e =>
                  setSearch(e.target.value)
                }
                placeholder="Search by name, email, or location"
                className="w-full rounded-xl border border-slate-300 px-4 py-3"
              />

            </div>

            <ListingCount compact className="self-end justify-self-end" label="Members" shown={filteredMembers.length} total={members.length} />

          </div>

        </div>

        <div className="mt-6 overflow-visible rounded-2xl bg-white shadow">

          <UserPaginationBar
            page={page}
            totalPages={totalPages}
            totalRows={sortedMembers.length}
            setPage={setPage}
            goToPage={goToPage}
          />

          <div className="overflow-x-auto">

          <table className="min-w-[980px] w-full table-fixed border-collapse">

            <thead className="bg-slate-900 text-sm uppercase tracking-wide text-white">

              <tr>

                <th className="sticky top-0 z-20 bg-slate-900 p-4 text-left" aria-sort={sortAria("member", sortConfig)}>
                  <SortHeader
                    active={sortConfig.key === "member"}
                    direction={sortConfig.direction}
                    label="Member"
                    onClick={() => changeSort("member")}
                  />
                </th>

                <th className="sticky top-0 z-20 bg-slate-900 p-4 text-left" aria-sort={sortAria("location", sortConfig)}>
                  <SortHeader
                    active={sortConfig.key === "location"}
                    direction={sortConfig.direction}
                    label="Location"
                    onClick={() => changeSort("location")}
                  />
                </th>

                <th className="sticky top-0 z-20 bg-slate-900 p-4 text-left" aria-sort={sortAria("last_login", sortConfig)}>
                  <SortHeader
                    active={sortConfig.key === "last_login"}
                    direction={sortConfig.direction}
                    label="Last Login"
                    onClick={() => changeSort("last_login")}
                  />
                </th>

                <th className="sticky top-0 z-20 bg-slate-900 p-4 text-left" aria-sort={sortAria("role", sortConfig)}>
                  <div className="flex items-center gap-2">
                    <SortHeader
                      active={sortConfig.key === "role"}
                      direction={sortConfig.direction}
                      label="Current Role"
                      onClick={() => changeSort("role")}
                    />
                    <button
                      type="button"
                      onClick={() => setRoleHelpOpen(true)}
                      aria-label="Show role capability matrix"
                      title="Show role capability matrix"
                      className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-sm font-black text-slate-900 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-300"
                    >
                      ?
                    </button>
                  </div>
                </th>

                <th className="sticky top-0 z-20 bg-slate-900 p-4 text-left" aria-sort={sortAria("change_role", sortConfig)}>
                  <SortHeader
                    active={sortConfig.key === "change_role"}
                    direction={sortConfig.direction}
                    label="Change Role"
                    onClick={() => changeSort("change_role")}
                  />
                </th>

              </tr>

            </thead>

            <tbody>

              {pagedMembers.map(member => {
                const currentRole =
                  getRole(member.id);

                return (
                  <tr
                    key={member.id}
                    className="border-b border-slate-100 hover:bg-slate-50"
                  >

                    <td className="p-4">

                      <div className="font-semibold text-slate-900">
                        {member.last_name},{" "}
                        {member.first_name}
                      </div>

                      <div className="text-sm text-slate-500">
                        {member.email || "No Email"}
                      </div>

                    </td>

                    <td className="p-4 text-slate-700">
                      {member.club_location || "—"}
                    </td>

                    <td className="p-4 text-sm font-semibold text-slate-700">
                      {formatDisplayTimestamp(lastLoginsByEmail[normalizeEmailAddress(member.email)], "Never")}
                    </td>

                    <td className="p-4">

                      <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-semibold text-blue-900">
                        {roleLabel(currentRole)}
                      </span>

                    </td>

                    <td className="p-4">

                      <select
                        value={currentRole}
                        onChange={e =>
                          updateRole(
                            member,
                            e.target.value
                          )
                        }
                        className="rounded-xl border border-slate-300 px-4 py-2"
                      >

                        <option value="player">
                          Player
                        </option>

                        <option value="captain">
                          Captain
                        </option>

                        <option value="club_pro">
                          Club Pro
                        </option>

                        <option value="league_manager">
                          League Manager
                        </option>

                        <option value="commissioner">
                          Commissioner
                        </option>

                      </select>

                    </td>

                  </tr>
                );
              })}

              {pagedMembers.length === 0 && (
                <tr>

                  <td
                    colSpan="5"
                    className="p-10 text-center text-slate-500"
                  >
                    No members found.
                  </td>

                </tr>
              )}

            </tbody>

          </table>

          </div>

          <UserPaginationBar
            page={page}
            totalPages={totalPages}
            totalRows={sortedMembers.length}
            setPage={setPage}
            goToPage={goToPage}
            position="bottom"
          />

        </div>

        {roleHelpOpen && (
          <RoleCapabilityModal onClose={() => setRoleHelpOpen(false)} />
        )}

      </div>
    </main>
  );
}

async function loadAllRoleMembers() {
  const batchSize = 1000;
  const rows = [];

  for (let from = 0; ; from += batchSize) {
    const { data, error } = await supabase
      .from("members")
      .select("id, first_name, last_name, email, club_location")
      .order("last_name", { ascending: true })
      .order("first_name", { ascending: true })
      .order("id", { ascending: true })
      .range(from, from + batchSize - 1);

    if (error) return { data: [], error };

    rows.push(...(data || []));
    if (!data || data.length < batchSize) break;
  }

  return { data: rows, error: null };
}

function SortHeader({ active, direction, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-lg px-2 py-1 text-left font-black text-white transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-blue-300"
    >
      <span>{label}</span>
      <span className={`rounded-full px-2 py-0.5 text-[10px] ${active ? "bg-blue-300 text-slate-950" : "bg-white/10 text-slate-300"}`}>
        {active ? (direction === "asc" ? "ASC" : "DESC") : "SORT"}
      </span>
    </button>
  );
}

function UserPaginationBar({ page, totalPages, totalRows, setPage, goToPage, position = "top" }) {
  const firstRow = totalRows === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const lastRow = Math.min(page * PAGE_SIZE, totalRows);

  return (
    <div className={`flex flex-col gap-3 px-4 py-4 md:flex-row md:items-center md:justify-between ${
      position === "top" ? "border-b border-slate-200" : "border-t border-slate-200"
    }`}>
      <div className="text-sm text-slate-600">
        Showing <span className="font-semibold text-slate-900">{firstRow}</span> to{" "}
        <span className="font-semibold text-slate-900">{lastRow}</span> of{" "}
        <span className="font-semibold text-slate-900">{totalRows}</span> members
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => setPage((current) => Math.max(1, current - 1))}
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
          onChange={(event) => goToPage(event.target.value)}
          aria-label="Go to member page"
          className="w-20 rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
          className="rounded-lg bg-slate-200 px-3 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
}

function sortAria(key, sortConfig) {
  if (sortConfig.key !== key) return "none";
  return sortConfig.direction === "asc" ? "ascending" : "descending";
}

function userSortValue(member, key, roles, lastLoginsByEmail) {
  const role = roleForMemberId(roles, member.id);

  if (key === "location") {
    return member.club_location || "";
  }

  if (key === "last_login") {
    const rawValue = lastLoginsByEmail[normalizeEmailAddress(member.email)];
    const timestamp = rawValue ? Date.parse(rawValue) : null;
    return Number.isNaN(timestamp) ? null : timestamp;
  }

  if (key === "role" || key === "change_role") {
    return ROLE_LEVELS[role] || 0;
  }

  return `${member.last_name || ""} ${member.first_name || ""} ${member.email || ""}`;
}

function roleForMemberId(roles, memberId) {
  const role = (roles || []).find((row) => row.member_id === memberId);
  return role?.role || "player";
}

function compareSortValues(aValue, bValue) {
  if (typeof aValue === "number" && typeof bValue === "number") {
    return aValue - bValue;
  }

  return String(aValue || "").localeCompare(String(bValue || ""), undefined, {
    numeric: true,
    sensitivity: "base",
  });
}
