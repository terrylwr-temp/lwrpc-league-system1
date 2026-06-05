"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  bracketByDivision,
  bracketSingleGameScore,
  bracketStatusLabel,
  isEliminationTournament,
  isRoundRobinTop4Tournament,
  loadPublicTournament,
  scoreDisplay,
  standingsByDivision,
  tournamentDisplayName,
  tournamentFormatLabel,
  tournamentStandingLabel,
} from "../../../lib/tournaments";

export default function TournamentStandingsPage() {
  const { id } = useParams();
  const [state, setState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadPublicTournament(id)
      .then(setState)
      .catch((loadError) => setError(loadError.message))
      .finally(() => setLoading(false));
  }, [id]);

  const standings = useMemo(
    () => standingsByDivision(state?.matches || [], state?.teams || [], state?.divisions || [], state?.tournament?.settings || {}),
    [state]
  );
  const bracketDivisions = useMemo(
    () => bracketByDivision(state?.matches || [], state?.teams || [], state?.divisions || [], state?.tournament?.settings || {}),
    [state]
  );

  if (loading) return <Shell title="Loading Standings..." />;
  if (error) return <Shell title="Tournament Standings" error={error} />;
  if (!state) return <Shell title="Tournament Standings" error="Tournament not found." />;

  const tournamentKey = state.tournament.slug || state.tournament.id;
  const isTop4 = isRoundRobinTop4Tournament(state.tournament.settings);

  return (
    <Shell title={`${tournamentDisplayName(state.tournament)} Standings`}>
      <div className="sticky top-0 z-30 mb-4 grid grid-cols-2 gap-2 rounded-2xl border border-slate-200 bg-slate-100/95 p-2 shadow-lg backdrop-blur sm:flex sm:flex-wrap">
        <Link className="rounded-xl bg-blue-700 px-4 py-3 text-center text-sm font-bold text-white sm:py-2" href={`/tourney/${tournamentKey}/display`}>
          Display
        </Link>
        <Link className="rounded-xl bg-amber-400 px-4 py-3 text-center text-sm font-bold text-slate-950 sm:py-2" href={`/tourney/${tournamentKey}/player`}>
          Player View
        </Link>
      </div>

      {isEliminationTournament(state.tournament.settings) ? (
        bracketDivisions.length === 0 ? (
          <div className="rounded-2xl bg-white p-8 text-center font-bold text-slate-500 shadow">Bracket has not been generated yet.</div>
        ) : (
          <PublicBracket bracketDivisions={bracketDivisions} settings={state.tournament.settings} />
        )
      ) : Object.entries(standings).length === 0 ? (
        <div className="rounded-2xl bg-white p-8 text-center font-bold text-slate-500 shadow">No completed scores yet.</div>
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {Object.entries(standings).map(([division, rows]) => (
              <div key={division} className="rounded-2xl bg-white p-5 shadow">
                <h2 className="text-2xl font-black text-slate-950">{division}</h2>
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-left text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="py-2">Rank</th>
                        <th>Team</th>
                        <th>W</th>
                        <th>L</th>
                        <th>PF</th>
                        <th>PA</th>
                        <th>Diff</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row, index) => (
                        <tr key={row.team} className="border-t border-slate-100">
                          <td className="py-3 font-black">{index + 1}</td>
                          <td className="font-bold">{tournamentStandingLabel(row)}</td>
                          <td>{row.w}</td>
                          <td>{row.l}</td>
                          <td>{row.pf}</td>
                          <td>{row.pa}</td>
                          <td>{row.pf - row.pa}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
          {isTop4 && bracketDivisions.length > 0 && <PublicBracket bracketDivisions={bracketDivisions} settings={state.tournament.settings} />}
        </div>
      )}
    </Shell>
  );
}

function PublicBracket({ bracketDivisions, settings }) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-white p-5 shadow">
        <div className="text-xs font-black uppercase tracking-wide text-blue-700">{tournamentFormatLabel(settings)}</div>
        <h2 className="mt-1 text-2xl font-black text-slate-950">Tournament Bracket</h2>
      </div>

      {bracketDivisions.map((divisionGroup) => (
        <details key={divisionGroup.division.id} className="rounded-2xl bg-white p-5 shadow">
          <summary className="cursor-pointer list-none">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-2xl font-black text-slate-950">{divisionGroup.division.name}</h2>
                <p className="mt-1 text-sm font-bold text-slate-500">Open to view this division bracket.</p>
              </div>
            {divisionGroup.champion && (
              <span className="w-fit rounded-full bg-amber-300 px-4 py-2 text-sm font-black text-slate-950">
                Champion: {divisionGroup.champion.name}
              </span>
            )}
            {!divisionGroup.champion && <span className="w-fit rounded-full bg-slate-100 px-4 py-2 text-sm font-black text-slate-700">Collapsed</span>}
            </div>
          </summary>
          <div className="mt-5 space-y-5">
            {divisionGroup.sections.map((section) => (
              <div key={section.key}>
                <h3 className="text-lg font-black text-slate-900">{section.title}</h3>
                <div className="mt-4 flex min-w-max gap-10 overflow-x-auto pb-4">
                  {section.rounds.map((round, roundIndex) => (
                    <div key={round.key} className="w-72 shrink-0">
                      <div className="rounded-full bg-blue-100 px-3 py-2 text-center text-xs font-black text-blue-900">{round.title}</div>
                      <div className="mt-5 space-y-6">
                        {round.matches.map((match, matchIndex) => (
                          <PublicBracketMatch
                            key={match.id}
                            match={match}
                            isLastRound={roundIndex === section.rounds.length - 1}
                            offsetLevel={roundIndex}
                            matchIndex={matchIndex}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </details>
      ))}
    </div>
  );
}

function PublicBracketMatch({ match, offsetLevel, matchIndex }) {
  const score = scoreDisplay(match);
  const statusLabel = bracketStatusLabel(match);
  const homeScore = bracketSingleGameScore(match, "home");
  const awayScore = bracketSingleGameScore(match, "away");
  const showScoreFooter = statusLabel !== "bye" && score && homeScore === "" && awayScore === "";
  const topOffset = matchIndex === 0 ? 0 : Math.min(72, Number(offsetLevel || 0) * 18);

  return (
    <div className="relative" style={{ marginTop: `${topOffset}px` }}>
      <div className="relative rounded-sm border border-slate-800 bg-white p-3 shadow-sm">
        <div className="absolute -left-3 -top-3 flex size-8 items-center justify-center rounded-full border border-slate-800 bg-white text-xs font-black text-slate-950 shadow">
          #{match.bracketMatchNumber || match.bracketMeta?.match || ""}
        </div>
        <div className="mb-2 flex items-center justify-end gap-2 text-xs font-black uppercase text-slate-500">
          <span>{statusLabel}</span>
        </div>
        <PublicBracketTeam
          name={match.home_team?.name || "TBD"}
          sourceLabel={match.homeSourceLabel}
          score={homeScore}
          eliminated={Boolean(match.homeEliminated)}
          winner={String(match.winner_team_id || "") === String(match.home_team_id || "")}
        />
        <PublicBracketTeam
          name={match.away_team?.name || "TBD"}
          sourceLabel={match.awaySourceLabel}
          score={awayScore}
          eliminated={Boolean(match.awayEliminated)}
          winner={String(match.winner_team_id || "") === String(match.away_team_id || "")}
        />
        {showScoreFooter && <div className="mt-2 rounded-sm bg-slate-50 px-3 py-2 text-xs font-black text-slate-700">{score}</div>}
      </div>
    </div>
  );
}

function PublicBracketTeam({ name, sourceLabel = "", score = "", winner, eliminated = false }) {
  return (
    <div className={`mt-1 flex min-h-11 items-center justify-between rounded-sm border px-3 py-2 text-sm font-black ${
      winner ? "border-emerald-500 bg-emerald-50 text-emerald-900" : "border-slate-400 bg-white text-slate-950"
    }`}>
      <span className="min-w-0 flex-1 break-words pr-3">{sourceLabel ? `(${sourceLabel}) ` : ""}{name}</span>
      <span className="ml-2 flex w-16 shrink-0 items-center justify-end gap-1">
        {winner && <span className="rounded-full bg-emerald-600 px-2 py-1 text-[11px] font-black text-white">W</span>}
        {eliminated && <span className="rounded-full bg-rose-600 px-2 py-1 text-[11px] font-black text-white">D</span>}
        {score !== "" && <span className="min-w-8 rounded-full bg-slate-100 px-2 py-1 text-center text-xs text-slate-900">{score}</span>}
      </span>
    </div>
  );
}

function Shell({ title, error = "", children }) {
  return (
    <main className="full-screen-main min-h-screen bg-slate-100 p-3 sm:p-6">
      <div className="mx-auto w-full max-w-[1600px]">
        <div className="mb-5 rounded-2xl bg-slate-900 p-4 text-white shadow sm:p-5">
          <div className="text-xs font-black uppercase tracking-wide text-blue-200">Current Standings</div>
          <h1 className="mt-1 break-words text-2xl font-black leading-tight sm:text-3xl">{title}</h1>
        </div>
        {error ? <div className="rounded-xl bg-red-50 p-4 font-bold text-red-800">{error}</div> : children}
      </div>
    </main>
  );
}
