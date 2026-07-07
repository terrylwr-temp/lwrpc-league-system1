"use client";

import {
  filterHistoryRows,
  formatDate,
  historyFilterOptions,
  historyRowIsActive,
  historyTeamOptionLabel,
  playerLineDetails,
  rowCountsForIndividualWinLoss,
  specialGameStatus,
} from "../lib/playHistory";

export default function PlayerHistoryPanel({
  memberId,
  historyRows,
  playerTeams,
  selectedFilter,
  onFilterChange,
  onClose,
  className = "mt-4",
  closeOnPanelClick = true,
  printTitle = "Play History",
  printSubtitle = "",
  includeInactiveScopes = true,
  onIncludeInactiveScopesChange = null,
}) {
  const visibleRows = includeInactiveScopes
    ? historyRows
    : historyRows.filter((row) => historyRowIsActive(row, memberId));
  const visibleTeams = includeInactiveScopes
    ? playerTeams
    : playerTeams.filter((team) => historyScopeOptionIsActive(team));
  const options = historyFilterOptions(visibleRows, visibleTeams, memberId, {
    includeInactive: includeInactiveScopes,
  });
  const filteredRows = filterHistoryRows(visibleRows, selectedFilter, memberId, visibleTeams);
  const filteredRecord = playerHistoryRecord(filteredRows, memberId);
  const clickToCloseProps = closeOnPanelClick
    ? {
        onClick: onClose,
        onKeyDown: (event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onClose();
          }
        },
        role: "button",
        tabIndex: 0,
      }
    : {};

  return (
    <div
      className={`${className} ${closeOnPanelClick ? "cursor-pointer" : ""} rounded-xl border border-slate-200 bg-slate-50 p-4`}
      {...clickToCloseProps}
    >
      <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="font-bold text-slate-900">
            Game Play History
          </div>
          <div className="mt-1 text-sm font-semibold text-slate-600">
            Games: {filteredRecord.games} - Record: {filteredRecord.record}
          </div>
        </div>

        <div className="flex flex-col gap-2 md:items-end">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
            <select
              value={selectedFilter || "all"}
              onChange={(e) => onFilterChange(e.target.value)}
              onClick={(event) => event.stopPropagation()}
              onKeyDown={(event) => event.stopPropagation()}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800"
              aria-label="Filter player history by league and season"
            >
              <option value="all">
                {includeInactiveScopes ? "All Seasons/All Teams" : "All Active Seasons/Teams"}
              </option>
              {options.seasons.length > 0 && (
                <optgroup label="Seasons">
                  {options.seasons.map((season) => (
                    <option key={season.id} value={`season:${season.id}`}>
                      {historyScopeOptionLabel(season.name, season)}
                    </option>
                  ))}
                </optgroup>
              )}
              {options.leagues.length > 0 && (
                <optgroup label="Leagues">
                  {options.leagues.map((league) => (
                    <option key={league.id} value={`league:${league.id}`}>
                      {historyScopeOptionLabel(`${league.name}${league.seasonName ? ` / ${league.seasonName}` : ""}`, league)}
                    </option>
                  ))}
                </optgroup>
              )}
              {options.divisions.length > 0 && (
                <optgroup label="Divisions">
                  {options.divisions.map((division) => (
                    <option key={division.id} value={`division:${division.id}`}>
                      {historyScopeOptionLabel(`${division.name}${division.leagueName ? ` / ${division.leagueName}` : ""}`, division)}
                    </option>
                  ))}
                </optgroup>
              )}
              {options.teams.length > 0 && (
                <optgroup label="Teams">
                  {options.teams.map((team) => (
                    <option key={team.id} value={`team:${team.id}`}>
                      {historyScopeOptionLabel(historyTeamOptionLabel(team), team)}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>

            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                printPlayerHistory({
                  title: printTitle,
                  subtitle: printSubtitle,
                  record: filteredRecord,
                  rows: filteredRows,
                  memberId,
                });
              }}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-700"
            >
              Print
            </button>
          </div>

          {onIncludeInactiveScopesChange && (
            <label
              className="flex items-center gap-2 text-sm font-semibold text-slate-700"
              onClick={(event) => event.stopPropagation()}
            >
              <input
                type="checkbox"
                checked={includeInactiveScopes}
                onChange={(event) => onIncludeInactiveScopesChange(event.target.checked)}
                className="h-4 w-4 rounded border-slate-300"
              />
              Include inactive teams/seasons/etc.
            </label>
          )}
        </div>
      </div>

      <div className="space-y-2">
        {filteredRows.map((row) => {
          const match = row.matches;
          const details = playerLineDetails(row, memberId);
          const gameScoreSummary = formatHistoryGameScoreSummary(row, details.sideLabel);
          const countsForIndividualWinLoss = rowCountsForIndividualWinLoss(row);
          const resultBadgeLabel = countsForIndividualWinLoss ? details.result : "Picklebreaker";
          const resultBadgeTone = !countsForIndividualWinLoss
            ? "bg-amber-100 text-amber-800"
            : details.result === "W"
            ? "bg-green-100 text-green-800"
            : details.result === "L"
            ? "bg-red-100 text-red-800"
            : "bg-slate-100 text-slate-700";

          return (
            <div
              key={row.id}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-black ${resultBadgeTone}`}
                >
                  {resultBadgeLabel}
                </span>
                <span className="font-bold text-slate-900">
                  {formatDate(match?.scheduled_date)}
                </span>
                <span className="text-slate-600">
                  vs {details.opponentName}
                </span>
                <span className="font-semibold text-slate-800">
                  {gameScoreSummary}
                </span>
              </div>

              {!countsForIndividualWinLoss && (
                <div className="mt-1 text-xs font-bold text-amber-800">
                  Team result only; excluded from individual W/L.
                </div>
              )}
              <div className="mt-1 text-xs text-slate-600">
                {match?.leagues?.seasons?.name || "No Season"} / {match?.leagues?.name || "No League"} - {match?.divisions?.name || "No Division"} - {row.division_lines?.line_name || row.division_lines?.line_type || `Line ${row.line_number || "-"}`} - {details.sideLabel}
              </div>
            </div>
          );
        })}

        {filteredRows.length === 0 && (
          <div className="rounded-lg bg-white p-4 text-center text-sm text-slate-500">
            No game play history found for this player.
          </div>
        )}
      </div>
    </div>
  );
}

function playerHistoryRecord(rows, memberId) {
  return (rows || []).reduce(
    (record, row) => {
      const details = playerLineDetails(row, memberId);
      record.games += 1;
      if (!rowCountsForIndividualWinLoss(row)) {
        record.other += 1;
      } else if (details.result === "W") {
        record.wins += 1;
      } else if (details.result === "L") {
        record.losses += 1;
      } else {
        record.other += 1;
      }
      record.record = `${record.wins}-${record.losses}`;
      return record;
    },
    { games: 0, wins: 0, losses: 0, other: 0, record: "0-0" }
  );
}

function formatHistoryGameScoreSummary(row, sideLabel) {
  const isHomePlayer = sideLabel === "Home";
  const scoredGames = [...(row.line_games || [])]
    .sort((a, b) => Number(a.game_number || 0) - Number(b.game_number || 0))
    .filter((game) => {
      const hasScore = game.home_score !== null && game.away_score !== null;
      return hasScore || specialGameStatus(game.game_status);
    });

  if (scoredGames.length === 0) {
    return "Scores pending";
  }

  return scoredGames
    .map((game) => {
      const playerScore = isHomePlayer ? game.home_score : game.away_score;
      const opponentScore = isHomePlayer ? game.away_score : game.home_score;
      const score = `${playerScore ?? "-"}-${opponentScore ?? "-"}`;
      const special = specialGameStatus(game.game_status);

      return special ? `${score} ${special.label}` : score;
    })
    .join(", ");
}

function historyScopeOptionIsActive(team) {
  return (
    team?.is_active !== false &&
    team?.divisions?.is_active !== false &&
    team?.divisions?.leagues?.is_active !== false &&
    team?.divisions?.leagues?.seasons?.is_active !== false
  );
}

function historyScopeOptionLabel(label, option) {
  return option?.isActive === false ? `${label} (Inactive)` : label;
}

function printPlayerHistory({ title, subtitle, record, rows, memberId }) {
  const printWindow = window.open("", "_blank", "noopener,noreferrer,width=900,height=700");
  if (!printWindow) {
    window.print();
    return;
  }

  const rowsHtml = rows.length
    ? rows.map((row) => {
        const match = row.matches;
        const details = playerLineDetails(row, memberId);
        const score = formatHistoryGameScoreSummary(row, details.sideLabel);
        const result = rowCountsForIndividualWinLoss(row) ? details.result : "Picklebreaker";
        const scope = [
          match?.leagues?.seasons?.name || "No Season",
          match?.leagues?.name || "No League",
          match?.divisions?.name || "No Division",
          row.division_lines?.line_name || row.division_lines?.line_type || `Line ${row.line_number || "-"}`,
          details.sideLabel,
        ].join(" / ");

        return `
          <tr>
            <td>${escapeHtml(formatDate(match?.scheduled_date))}</td>
            <td>${escapeHtml(result)}</td>
            <td>${escapeHtml(details.opponentName)}</td>
            <td>${escapeHtml(score)}</td>
            <td>${escapeHtml(scope)}</td>
          </tr>
        `;
      }).join("")
    : `<tr><td colspan="5" class="empty">No game play history found for this player.</td></tr>`;

  printWindow.document.write(`
    <!doctype html>
    <html>
      <head>
        <title>${escapeHtml(title)}</title>
        <style>
          body { color: #0f172a; font-family: Arial, sans-serif; margin: 32px; }
          h1 { font-size: 24px; margin: 0 0 6px; }
          .subtitle { color: #475569; font-size: 14px; font-weight: 700; margin-bottom: 10px; }
          .summary { color: #334155; font-size: 13px; font-weight: 700; margin-bottom: 18px; }
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid #cbd5e1; font-size: 12px; padding: 8px; text-align: left; vertical-align: top; }
          th { background: #0f172a; color: white; }
          .empty { color: #64748b; text-align: center; }
        </style>
      </head>
      <body>
        <h1>${escapeHtml(title)}</h1>
        ${subtitle ? `<div class="subtitle">${escapeHtml(subtitle)}</div>` : ""}
        <div class="summary">Games: ${record.games} - Record: ${escapeHtml(record.record)}</div>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Result</th>
              <th>Opponent</th>
              <th>Score</th>
              <th>Scope</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
