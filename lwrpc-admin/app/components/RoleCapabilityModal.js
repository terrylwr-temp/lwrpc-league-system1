"use client";

export const ROLE_CAPABILITIES = [
  {
    label: "Player dashboard, standings, documents, and match calendar",
    roles: ["player", "captain", "club_pro", "league_manager", "commissioner"],
  },
  {
    label: "Captain dashboard, team rosters, matches, and score entry",
    roles: ["captain", "club_pro", "league_manager", "commissioner"],
  },
  {
    label: "Admin dashboard, members, ratings, scheduling, scoring, setup",
    roles: ["league_manager", "commissioner"],
  },
  {
    label: "User role management, Club Setup",
    roles: ["commissioner"],
  },
];

export default function RoleCapabilityModal({ onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
      <div className="flex max-h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex flex-col gap-3 bg-slate-950 px-5 py-5 text-white md:flex-row md:items-start md:justify-between">
          <div>
            <div className="text-xs font-black uppercase tracking-wide text-blue-200">
              User Roles
            </div>
            <h2 className="mt-1 text-2xl font-black">Role Capability Matrix</h2>
            <p className="mt-1 text-sm font-semibold text-slate-300">
              Higher roles include the capabilities of lower roles. Commissioners are the only users who can manage user roles and Club Setup.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-white/10 px-4 py-2 text-sm font-bold text-white hover:bg-white/20"
          >
            Close
          </button>
        </div>

        <div className="overflow-auto p-5">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-slate-900 text-xs uppercase tracking-wide text-white">
              <tr>
                <th className="p-3 text-left">Capability</th>
                <th className="p-3 text-center">Player</th>
                <th className="p-3 text-center">Captain</th>
                <th className="p-3 text-center">Club Pro</th>
                <th className="p-3 text-center">League Manager</th>
                <th className="p-3 text-center">Commissioner</th>
              </tr>
            </thead>
            <tbody>
              {ROLE_CAPABILITIES.map((capability) => (
                <tr key={capability.label} className="border-b border-slate-100">
                  <td className="p-3 font-bold text-slate-900">{capability.label}</td>
                  {["player", "captain", "club_pro", "league_manager", "commissioner"].map((role) => (
                    <td key={role} className="p-3 text-center font-black">
                      {capability.roles.includes(role) ? "Yes" : "No"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
