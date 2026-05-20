"use client";

import LoadingScreen from "../components/LoadingScreen";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AppHeader from "../components/AppHeader";
import { requireRole, supabase } from "../lib/auth";
import { roleLabel } from "../lib/permissions";

export default function UsersPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  const [members, setMembers] = useState([]);
  const [roles, setRoles] = useState([]);

  const [search, setSearch] = useState("");

  const checkAuth = useCallback(async function checkAuth() {
    const user = await requireRole(router, "commissioner");
    return !!user;
  }, [router]);

  const loadData = useCallback(async function loadData() {
    const { data: memberData, error: memberError } = await supabase
      .from("members")
      .select(`
        id,
        first_name,
        last_name,
        email,
        club_location
      `)
      .order("last_name", { ascending: true });

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
    setLoading(false);
  }, []);

  function getRole(memberId) {
    const role = roles.find(
      r => r.member_id === memberId
    );

    return role?.role || "player";
  }

  async function updateRole(member, newRole) {
    const existing = roles.find(
      r => r.member_id === member.id
    );

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

            <div className="rounded-xl bg-slate-900 p-4 text-white">

              <div className="text-xs uppercase tracking-wide text-slate-300">
                Members Shown
              </div>

              <div className="mt-1 text-3xl font-bold">
                {filteredMembers.length}
              </div>

            </div>

          </div>

        </div>

        <div className="mt-6 overflow-hidden rounded-2xl bg-white shadow">

          <table className="w-full border-collapse">

            <thead className="bg-slate-900 text-sm uppercase tracking-wide text-white">

              <tr>

                <th className="p-4 text-left">
                  Member
                </th>

                <th className="p-4 text-left">
                  Location
                </th>

                <th className="p-4 text-left">
                  Current Role
                </th>

                <th className="p-4 text-left">
                  Change Role
                </th>

              </tr>

            </thead>

            <tbody>

              {filteredMembers.map(member => {
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

              {filteredMembers.length === 0 && (
                <tr>

                  <td
                    colSpan="4"
                    className="p-10 text-center text-slate-500"
                  >
                    No members found.
                  </td>

                </tr>
              )}

            </tbody>

          </table>

        </div>

      </div>
    </main>
  );
}
