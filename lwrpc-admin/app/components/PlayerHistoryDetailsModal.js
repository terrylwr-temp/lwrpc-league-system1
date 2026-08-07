"use client";

import { playerLineDetails } from "../lib/playHistory";

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

  (rows || []).forEach((row) => {
    const details = playerLineDetails(row, memberId);
    const matchId = String(row.matches?.id || row.id);
    if (!matchResults.has(matchId)) {
      matchResults.set(matchId, { id: matchId, result: details.result, opponent: details.opponentName });
      if (details.result === "W") totals.matchWins += 1;
      if (details.result === "L") totals.matchLosses += 1;
    }

    const isHome = details.sideLabel === "Home";
    (row.line_games || []).forEach((game) => {
      if (game.home_score === null || game.home_score === undefined || game.away_score === null || game.away_score === undefined) return;
      const earned = Number(isHome ? game.home_score : game.away_score);
      const against = Number(isHome ? game.away_score : game.home_score);
      totals.pointsEarned += earned;
      totals.pointsAgainst += against;
      if (earned > against) totals.gameWins += 1;
      if (earned < against) totals.gameLosses += 1;
    });

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
    partnerRating,
    opponentRating,
    adjustedRating,
    overallRating: Number.isFinite(playerRating) && Number.isFinite(adjustedRating) ? (playerRating + adjustedRating) / 2 : playerRating,
    lastFive: [...matchResults.values()].slice(0, 5),
  };
}

function PlayerHistoryDetails({ details }) {
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
    </div>
  );
}

function PlayerDetailGroup({ title, metrics }) {
  return (
    <div className="min-h-full rounded-xl border border-slate-200 bg-slate-50 p-3">
      <div className="text-xs font-black uppercase tracking-wide text-slate-500">{title}</div>
      <div className="mt-2 grid gap-1 text-sm">
        {metrics.map(([label, value]) => <div key={label} className="flex items-center justify-between gap-3"><span className="font-semibold text-slate-600">{label}</span><span className="font-black text-slate-950">{value}</span></div>)}
      </div>
    </div>
  );
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
