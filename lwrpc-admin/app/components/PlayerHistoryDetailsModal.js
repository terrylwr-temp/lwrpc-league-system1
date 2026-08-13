"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { playerLineDetails } from "../lib/playHistory";

const CHART_TOOLTIP_STYLE = {
  border: "1px solid #cbd5e1",
  borderRadius: "12px",
  boxShadow: "0 12px 24px rgba(15, 23, 42, 0.14)",
  fontWeight: 700,
};

export default function PlayerHistoryDetailsModal({ details, onClose }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/75 p-2 sm:p-4" role="dialog" aria-modal="true" aria-labelledby="player-history-details-title">
      <div className="flex max-h-[94dvh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between gap-4 bg-gradient-to-r from-blue-700 to-indigo-700 p-5 text-white">
          <div>
            <div className="text-xs font-black uppercase tracking-wide text-blue-100">Match Results</div>
            <h2 id="player-history-details-title" className="mt-1 text-2xl font-black">More Player Details</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl border border-white/30 bg-white/10 px-4 py-2.5 text-sm font-black text-white hover:bg-white/20">Close</button>
        </div>
        <div className="overflow-y-auto overscroll-contain p-4 sm:p-5">
          <PlayerHistoryDetails details={details} />
        </div>
      </div>
    </div>
  );
}

export function calculatePlayerHistoryDetails(rows, memberId) {
  const matchResults = new Map();
  const ratingValues = { player: [], partner: [], opponent: [] };
  const totals = { matchWins: 0, matchLosses: 0, gameWins: 0, gameLosses: 0, pointsEarned: 0, pointsAgainst: 0 };
  const recentPerformance = [];

  (rows || []).forEach((row) => {
    const details = playerLineDetails(row, memberId);
    const matchId = String(row.matches?.id || row.id);
    if (!matchResults.has(matchId)) {
      matchResults.set(matchId, { id: matchId, result: details.result, opponent: details.opponentName });
      if (details.result === "W") totals.matchWins += 1;
      if (details.result === "L") totals.matchLosses += 1;
    }

    const isHome = details.sideLabel === "Home";
    let linePointDifference = 0;
    let scoredGames = 0;
    (row.line_games || []).forEach((game) => {
      if (game.home_score === null || game.home_score === undefined || game.away_score === null || game.away_score === undefined) return;
      const earned = Number(isHome ? game.home_score : game.away_score);
      const against = Number(isHome ? game.away_score : game.home_score);
      totals.pointsEarned += earned;
      totals.pointsAgainst += against;
      linePointDifference += earned - against;
      scoredGames += 1;
      if (earned > against) totals.gameWins += 1;
      if (earned < against) totals.gameLosses += 1;
    });

    if (scoredGames > 0) {
      recentPerformance.push({
        label: shortHistoryDate(row.matches?.scheduled_date, recentPerformance.length + 1),
        pointDifference: linePointDifference,
      });
    }

    const playerSlots = isHome ? ["home_player_1", "home_player_2"] : ["away_player_1", "away_player_2"];
    const opponentSlots = isHome ? ["away_player_1", "away_player_2"] : ["home_player_1", "home_player_2"];
    const playerSlot = playerSlots.find((slot) => String(row[`${slot}_id`] || row[slot]?.id || "") === String(memberId || ""));
    const partnerSlot = playerSlots.find((slot) => slot !== playerSlot);
    const playerRating = playerSlot ? ratingAtPlay(row, playerSlot) : null;
    const partnerRating = partnerSlot ? ratingAtPlay(row, partnerSlot) : null;
    const opponentRatings = opponentSlots.map((slot) => ratingAtPlay(row, slot)).filter(Number.isFinite);
    if (Number.isFinite(playerRating)) ratingValues.player.push(playerRating);
    if (Number.isFinite(partnerRating)) ratingValues.partner.push(partnerRating);
    if (opponentRatings.length) ratingValues.opponent.push(average(opponentRatings));
  });

  const playerRating = average(ratingValues.player);
  const partnerRating = average(ratingValues.partner);
  const opponentRating = average(ratingValues.opponent);
  const gameTotal = totals.gameWins + totals.gameLosses;
  const gameWinRate = gameTotal ? totals.gameWins / gameTotal : null;
  const adjustedRating = Number.isFinite(playerRating) && gameWinRate !== null
    ? playerRating + ((gameWinRate - 0.5) * 0.5) + ((Number.isFinite(opponentRating) ? opponentRating : playerRating) - (Number.isFinite(partnerRating) ? partnerRating : playerRating)) * 0.2
    : null;

  return {
    ...totals,
    playerRating,
    partnerRating,
    opponentRating,
    adjustedRating,
    overallRating: Number.isFinite(playerRating) && Number.isFinite(adjustedRating) ? (playerRating + adjustedRating) / 2 : playerRating,
    lastFive: [...matchResults.values()].slice(0, 5),
    recentPerformance: recentPerformance.slice(0, 8).reverse(),
  };
}

function PlayerHistoryDetails({ details }) {
  const matchOutcomes = [
    { name: "Wins", value: details.matchWins, fill: "#059669" },
    { name: "Losses", value: details.matchLosses, fill: "#e11d48" },
  ].filter((entry) => entry.value > 0);
  const resultComparison = [
    { name: "Matches", wins: details.matchWins, losses: details.matchLosses },
    { name: "Games", wins: details.gameWins, losses: details.gameLosses },
  ];
  const ratingComparison = [
    ["Recorded", details.playerRating, "#2563eb"],
    ["Partner", details.partnerRating, "#0f766e"],
    ["Opponent", details.opponentRating, "#7c3aed"],
    ["Overall", details.overallRating, "#f59e0b"],
  ].filter(([, value]) => Number.isFinite(value)).map(([name, value, fill]) => ({ name, value, fill }));

  return (
    <div className="space-y-4 text-slate-900">
      <div className="grid items-stretch gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <PlayerDetailGroup title="Matches" metrics={[["Wins", details.matchWins], ["Losses", details.matchLosses], ["Win %", formatHistoryPercent(details.matchWins, details.matchWins + details.matchLosses)]]} />
        <PlayerDetailGroup title="Games" metrics={[["Wins", details.gameWins], ["Losses", details.gameLosses], ["Win %", formatHistoryPercent(details.gameWins, details.gameWins + details.gameLosses)]]} />
        <PlayerDetailGroup title="Points" metrics={[["Earned", details.pointsEarned], ["Against", details.pointsAgainst], ["Diff %", formatPointDifference(details.pointsEarned, details.pointsAgainst)]]} />
        <PlayerDetailGroup title="Ratings" metrics={[["Partner", formatRatingMetric(details.partnerRating)], ["Opponent", formatRatingMetric(details.opponentRating)], ["Adjusted", formatRatingMetric(details.adjustedRating)], ["Overall", formatRatingMetric(details.overallRating)]]} />
        <div className="flex min-h-full flex-col rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div className="text-xs font-black uppercase tracking-wide text-slate-500">Last 5 Matchups</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {details.lastFive.length > 0 ? details.lastFive.map((match) => (
              <span key={match.id} className={`rounded-lg px-3 py-2 text-sm font-black ${match.result === "W" ? "bg-emerald-100 text-emerald-900" : match.result === "L" ? "bg-red-100 text-red-900" : "bg-slate-100 text-slate-700"}`}>
                {match.result}{" · "}{match.opponent}
              </span>
            )) : <span className="text-sm font-semibold text-slate-500">No completed match results in this scope.</span>}
          </div>
        </div>
      </div>

      <p className="text-xs font-semibold leading-5 text-slate-500">
        Ratings use the recorded ratings at the time of play. Adjusted and Overall are estimated from game performance and partner/opponent strength within the selected History Scope.
      </p>

      <section className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.16em] text-blue-700">Performance Visuals</div>
            <h3 className="mt-1 text-xl font-black text-slate-950">Your play at a glance</h3>
          </div>
          <div className="text-xs font-bold text-slate-500">Charts use only scored results in the selected scope.</div>
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          <ChartCard title="Match Outcome Mix" helper="Wins and losses across completed matchups.">
            {matchOutcomes.length ? (
              <div className="relative h-64 animate-[fade-in_500ms_ease-out]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={matchOutcomes} dataKey="value" nameKey="name" innerRadius="58%" outerRadius="86%" paddingAngle={4} startAngle={90} endAngle={-270} stroke="#ffffff" strokeWidth={4} isAnimationActive animationDuration={800}>
                      {matchOutcomes.map((entry) => <Cell key={entry.name} fill={entry.fill} />)}
                    </Pie>
                    <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(value) => [value, "Matchups"]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <div className="text-4xl font-black text-slate-950">{formatHistoryPercent(details.matchWins, details.matchWins + details.matchLosses)}</div>
                  <div className="mt-1 text-xs font-black uppercase tracking-wide text-slate-500">Match win rate</div>
                </div>
              </div>
            ) : <EmptyChart label="No completed match outcomes yet." />}
          </ChartCard>

          <ChartCard title="Wins vs. Losses" helper="Compare your match and game results.">
            <div className="h-64 animate-[fade-in_650ms_ease-out]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={resultComparison} margin={{ top: 12, right: 12, left: -20, bottom: 0 }} barGap={6}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#dbeafe" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fontWeight: 800, fill: "#334155" }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fontWeight: 700, fill: "#64748b" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} cursor={{ fill: "#eff6ff" }} />
                  <Bar dataKey="wins" name="Wins" fill="#059669" radius={[8, 8, 0, 0]} isAnimationActive animationDuration={750} />
                  <Bar dataKey="losses" name="Losses" fill="#e11d48" radius={[8, 8, 0, 0]} isAnimationActive animationDuration={900} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>

          <ChartCard title="Recent Point Differential" helper="Point margin for your latest scored game lines.">
            {details.recentPerformance.length ? (
              <div className="h-64 animate-[fade-in_800ms_ease-out]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={details.recentPerformance} margin={{ top: 12, right: 16, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#dbeafe" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fontWeight: 700, fill: "#64748b" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fontWeight: 700, fill: "#64748b" }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(value) => [signedNumber(value), "Point differential"]} labelFormatter={(label) => `Game line ${label}`} />
                    <Line type="monotone" dataKey="pointDifference" name="Point differential" stroke="#2563eb" strokeWidth={4} dot={{ r: 4, fill: "#ffffff", stroke: "#2563eb", strokeWidth: 3 }} activeDot={{ r: 7 }} isAnimationActive animationDuration={900} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : <EmptyChart label="No scored game lines yet." />}
          </ChartCard>

          <ChartCard title="Rating Context" helper="Recorded ratings at play, averaged in this history scope.">
            {ratingComparison.length ? (
              <div className="h-64 animate-[fade-in_950ms_ease-out]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={ratingComparison} margin={{ top: 12, right: 12, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ede9fe" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 800, fill: "#334155" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fontWeight: 700, fill: "#64748b" }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(value) => [Number(value).toFixed(2), "Rating"]} />
                    <Bar dataKey="value" name="Rating" radius={[8, 8, 0, 0]} isAnimationActive animationDuration={1000}>
                      {ratingComparison.map((entry) => <Cell key={entry.name} fill={entry.fill} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : <EmptyChart label="Recorded ratings are not available for this scope." />}
          </ChartCard>
        </div>
      </section>
    </div>
  );
}

function PlayerDetailGroup({ title, metrics }) {
  return <div className="min-h-full rounded-xl border border-slate-200 bg-slate-50 p-3"><div className="text-xs font-black uppercase tracking-wide text-slate-500">{title}</div><div className="mt-2 grid gap-1 text-sm">{metrics.map(([label, value]) => <div key={label} className="flex items-center justify-between gap-3"><span className="font-semibold text-slate-600">{label}</span><span className="font-black text-slate-950">{value}</span></div>)}</div></div>;
}

function ChartCard({ title, helper, children }) {
  return <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_10px_22px_rgba(37,99,235,0.08)]"><div className="text-sm font-black text-slate-950">{title}</div><div className="mt-1 min-h-9 text-xs font-semibold leading-4 text-slate-500">{helper}</div><div className="mt-2">{children}</div></div>;
}

function EmptyChart({ label }) {
  return <div className="flex h-64 items-center justify-center rounded-xl bg-slate-50 px-5 text-center text-sm font-semibold text-slate-500">{label}</div>;
}

function ratingAtPlay(row, slot) {
  const rawValue = row[`${slot}_rating_at_play`];
  if (rawValue === null || rawValue === undefined || rawValue === "") return null;
  const value = Number(rawValue);
  return Number.isFinite(value) && value > 0 ? value : null;
}

function average(values) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

function formatHistoryPercent(numerator, denominator) {
  return denominator ? `${Math.round((numerator / denominator) * 100)}%` : "—";
}

function formatPointDifference(earned, against) {
  return earned + against ? `${Math.round(((earned - against) / (earned + against)) * 100)}%` : "—";
}

function formatRatingMetric(value) {
  return Number.isFinite(value) ? value.toFixed(2) : "NR";
}

function shortHistoryDate(value, fallback) {
  const date = new Date(`${value || ""}T12:00:00`);
  if (Number.isNaN(date.getTime())) return String(fallback);
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function signedNumber(value) {
  const number = Number(value || 0);
  return `${number > 0 ? "+" : ""}${number}`;
}
