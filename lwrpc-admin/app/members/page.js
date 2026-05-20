"use client";

import LoadingScreen from "../components/LoadingScreen";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AppHeader from "../components/AppHeader";
import { requireRole, supabase } from "../lib/auth";
import { formatPhoneNumberForStorage } from "../lib/phone";

const PAGE_SIZE = 100;
const CLEAN_MEMBERS_BATCH_SIZE = 25;

export default function MembersPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [cleaningMembers, setCleaningMembers] = useState(false);
  const [showMaintenance, setShowMaintenance] = useState(false);

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

    setMembers(data || []);
    setLoading(false);
  }, [router]);

  async function deactivateMember() {
    alert("Your members table currently does not have an active/status field yet.");
  }

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

  function openMember(memberId) {
    router.push(`/members/${memberId}`);
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
  }, [search]);

  const filteredMembers = useMemo(() => {
    const q = search.trim().toLowerCase();

    if (!q) return members;

    return members.filter((member) => {
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
  }, [getMemberRole, members, search]);

  const totalPages = Math.max(1, Math.ceil(filteredMembers.length / PAGE_SIZE));

  const pagedMembers = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredMembers.slice(start, start + PAGE_SIZE);
  }, [filteredMembers, page]);

  if (loading) {
    return <LoadingScreen subtitle="Loading Members..." />;
  }

  return (
    <main className="min-h-screen bg-slate-100 p-6">
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

                    <div className="text-sm text-slate-500">
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

                  <td className="px-4 py-4 text-sm font-semibold text-slate-700">
                    {getMemberRole(member)}
                  </td>

                  <td className="px-4 py-4 text-right">
                    <div className="flex justify-end gap-2">
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
                        onClick={(e) => {
                          e.stopPropagation();
                          deactivateMember(member.id);
                        }}
                        className="rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700"
                      >
                        Deactivate
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {pagedMembers.length === 0 && (
                <tr>
                  <td
                    colSpan="6"
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
      </div>
    </main>
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
