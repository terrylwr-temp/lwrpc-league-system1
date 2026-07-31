"use client";

export default function DivisionStandingsModal({ divisionOptions = [], selectedDivisionId, onSelectDivision, standings = [], loading = false, onClose }) {
  const selected = divisionOptions.find((option) => String(option.id) === String(selectedDivisionId));
  const groups = divisionOptions.reduce((result, option) => {
    const group = result.find((item) => item.name === option.leagueName);
    if (group) group.options.push(option);
    else result.push({ name: option.leagueName || "League", options: [option] });
    return result;
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/70 p-0">
      <section className="flex h-[100dvh] w-full max-w-7xl flex-col overflow-hidden bg-white shadow-2xl" role="dialog" aria-modal="true" aria-label="Division standings">
        <header className="flex flex-col gap-3 bg-gradient-to-r from-slate-950 via-blue-950 to-emerald-900 px-4 py-4 text-white sm:px-6 sm:py-5 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="text-xs font-black uppercase tracking-wide text-emerald-200">Division Standings</div>
            <h2 className="mt-1 text-xl font-black sm:text-2xl">Division Team Standings</h2>
            <p className="mt-1 text-sm font-semibold text-slate-200">{selected?.label || "Choose a current division"}</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <label className="block sm:min-w-72">
              <span className="mb-1 block text-xs font-black uppercase tracking-wide text-blue-100">Selected Scope</span>
              <select value={selectedDivisionId || ""} onChange={(event) => onSelectDivision(event.target.value)} className="w-full rounded-xl border border-white/30 bg-white px-3 py-2 text-sm font-bold text-slate-950 shadow-sm">
                {groups.map((group) => <optgroup key={group.name} label={group.name}>{group.options.map((option) => <option key={option.id} value={option.id}>{option.divisionName}</option>)}</optgroup>)}
              </select>
            </label>
            <button type="button" onClick={onClose} className="min-h-[40px] rounded-xl bg-white px-4 py-2 text-sm font-bold text-slate-950 shadow-sm hover:bg-slate-100">Close</button>
          </div>
        </header>
        <div className="min-h-0 flex-1 overflow-auto bg-slate-50 p-4 sm:p-6">
          {loading ? <div className="rounded-2xl bg-white p-8 text-center font-semibold text-slate-500 shadow-sm">Loading standings...</div> : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
              <table className="w-full min-w-[1120px] border-collapse text-sm">
                <thead className="bg-slate-900 text-xs uppercase tracking-wide text-white"><tr>
                  <th className="sticky left-0 z-30 w-16 bg-slate-900 p-3 text-left md:static">Rank</th><th className="sticky left-16 z-30 w-24 min-w-24 bg-slate-900 p-3 text-left md:min-w-52">Team</th><th className="p-3 text-center">Standings<br/>Points</th><th className="p-3 text-center">Matchups<br/>Played</th><th className="p-3 text-center">Matchups<br/>Won</th><th className="p-3 text-center">Matchups<br/>Lost</th><th className="p-3 text-center">Games<br/>Won-Lost</th><th className="p-3 text-center">Points per<br/>Matchup</th><th className="p-3 text-center">Last 5<br/>Matchups</th><th className="p-3 text-center">Points<br/>For</th><th className="p-3 text-center">Points<br/>Against</th><th className="p-3 text-center">Diff</th>
                </tr></thead>
                <tbody>{standings.map((row, index) => {
                  const played = Number(row.matches_played ?? (Number(row.match_wins || 0) + Number(row.match_losses || 0) + Number(row.match_ties || 0)));
                  const points = Number(row.standings_points || 0);
                  const teamName = row.teams?.name || "Team";
                  const teamLabel = row.teams?.abbreviation || teamName;
                  return <tr key={row.id || row.team_id} className="border-b border-slate-100 hover:bg-slate-50"><td className="sticky left-0 z-20 w-16 bg-white p-3 font-black md:static md:bg-inherit">#{index + 1}</td><td className="sticky left-16 z-20 w-24 min-w-24 bg-white p-3 font-bold text-slate-950 md:min-w-52 md:static md:bg-inherit" title={teamName}><span className="md:hidden">{teamLabel}</span><span className="hidden md:inline">{teamName}</span></td><td className="p-3 text-center font-black text-emerald-700">{points}</td><td className="p-3 text-center">{played}</td><td className="p-3 text-center">{row.match_wins || 0}</td><td className="p-3 text-center">{row.match_losses || 0}</td><td className="p-3 text-center">{row.game_wins || 0}-{row.game_losses || 0}</td><td className="p-3 text-center">{played ? (points / played).toFixed(2) : "0.00"}</td><td className="p-3 text-center font-mono font-bold">{row.recent_form || "-"}</td><td className="p-3 text-center">{row.points_for || 0}</td><td className="p-3 text-center">{row.points_against || 0}</td><td className="p-3 text-center font-bold">{row.point_differential || 0}</td></tr>;
                })}</tbody>
              </table>
              {!standings.length && <div className="p-8 text-center font-semibold text-slate-500">No teams or standings have been created for this division yet.</div>}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
