"use client";

import LoadingScreen from "../components/LoadingScreen";
import { useCallback, useDeferredValue, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppHeader from "../components/AppHeader";
import ListingCount from "../components/ListingCount";
import RoleCapabilityModal from "../components/RoleCapabilityModal";
import { getRequestAuthorizationHeaders, requireRole, supabase } from "../lib/auth";
import { roleLabel } from "../lib/permissions";
import { normalizeEmailAddress } from "../lib/email";
import { formatDisplayTimestamp } from "../lib/dateTime";

const PAGE_SIZE = 100;

export default function UsersPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  const [members, setMembers] = useState([]);
  const [filteredMemberCount, setFilteredMemberCount] = useState(0);
  const [totalMemberCount, setTotalMemberCount] = useState(0);
  const [roles, setRoles] = useState([]);
  const [lastLoginsByEmail, setLastLoginsByEmail] = useState({});

  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
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
    const params = new URLSearchParams({
      mode: "roles",
      page: String(page),
      pageSize: String(PAGE_SIZE),
      search: deferredSearch.trim(),
      sort: sortConfig.key === "role" ? "role" : sortConfig.key,
      direction: sortConfig.direction,
    });
    const response = await fetch(`/api/admin/member-directory?${params.toString()}`, {
      headers: await getRequestAuthorizationHeaders(),
    });
    const result = await response.json().catch(() => ({}));

    if (!response.ok || !result.success) {
      alert(result.error || "Unable to load user roles.");
      setLoading(false);
      return;
    }

    const memberRows = result.rows || [];
    setMembers(memberRows);
    setRoles(
      memberRows.flatMap((member) =>
        (member.user_roles || []).map((role) => ({
          ...role,
          member_id: member.id,
        }))
      )
    );
    setLastLoginsByEmail(result.lastLoginsByEmail || {});
    setFilteredMemberCount(Number(result.filteredCount || 0));
    setTotalMemberCount(Number(result.totalCount || 0));
    setLoading(false);
  }, [
    deferredSearch,
    page,
    sortConfig.direction,
    sortConfig.key,
  ]);
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

    if (currentRole === "commissioner" && newRole !== "commissioner") {
      const { count, error: countError } = await supabase
        .from("user_roles")
        .select("id", { count: "exact", head: true })
        .eq("role", "commissioner");

      if (countError) {
        alert(countError.message);
        return;
      }

      if ((count || 0) <= 1) {
        alert("At least one Commissioner must remain in the system. Assign another Commissioner before changing this role.");
        return;
      }
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

  const totalPages = Math.max(1, Math.ceil(filteredMemberCount / PAGE_SIZE));
  const pagedMembers = members;

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

            <ListingCount compact className="self-end justify-self-end" label="Members" shown={filteredMemberCount} total={totalMemberCount} />

          </div>

        </div>

        <div className="mt-6 overflow-visible rounded-2xl bg-white shadow">

          <UserPaginationBar
            page={page}
            totalPages={totalPages}
            totalRows={filteredMemberCount}
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

                <th className="sticky top-0 z-20 bg-slate-900 p-4 text-left">
                  Change Role
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
            totalRows={filteredMemberCount}
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
