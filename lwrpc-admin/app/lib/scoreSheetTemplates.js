export const DEFAULT_SCORE_SHEET_RULES =
  "Game format is regular scoring to 15, win by 1 (switch ends when the first team scores 8). 2 timeouts/team/game. Visitors pick Side/Serve/Receive/Defer in Games 1 and 3. No video recording unless agreed. No coaching other than timeouts or between games (off court only). USA Pickleball rules apply and only legal equipment may be used.";

export const DEFAULT_SCORE_SHEET_TEMPLATE_NAME = "Weekday DUPR League Score Sheet";

export const DEFAULT_SCORE_SHEET_TEMPLATE_HTML = `
<h1>{{club_name}}<br />{{sheet_title}}</h1>

<div class="meta">
  <div class="box"><span class="label">Date</span><span class="value">{{match_date}}</span></div>
  <div class="box"><span class="label">Home Team</span><span class="value">{{home_team}}</span></div>
  <div class="box"><span class="label">Away Team</span><span class="value">{{away_team}}</span></div>
  <div class="box"><span class="label">Level</span><span class="value">{{division_name}}</span></div>
</div>

<div class="signatures">
  <div>Captain Signature (Home)<div class="signature-line"></div></div>
  <div>Captain Signature (Away)<div class="signature-line"></div></div>
</div>

<table class="lineups">
  <thead>
    <tr>
      <th>Home Teams <span class="header-score">Total Team Score: ________</span></th>
      <th>Away Teams <span class="header-score">Total Team Score: ________</span></th>
    </tr>
  </thead>
  <tbody>{{lineup_rows}}</tbody>
</table>

{{score_entry_table}}

<div class="notes">{{rules_text}}</div>
`.trim();

export const SCORE_SHEET_PLACEHOLDERS = [
  ["{{club_name}}", "Club name from System Setup"],
  ["{{sheet_title}}", "Score sheet title"],
  ["{{match_date}}", "Scheduled match date"],
  ["{{match_time}}", "Scheduled match time"],
  ["{{location_name}}", "Match location name"],
  ["{{division_name}}", "Division name"],
  ["{{league_name}}", "League name"],
  ["{{home_team}}", "Home team name"],
  ["{{away_team}}", "Away team name"],
  ["{{lineup_rows}}", "Generated home/away lineup table rows"],
  ["{{round_rows}}", "Generated round score rows"],
  ["{{configured_game_lines_table}}", "Generated table of Division configured game lines"],
  ["{{configured_game_lines_rows}}", "Generated rows for Game, Line Type, Game Format, Team Win Points"],
  ["{{score_entry_table}}", "Generated writable score rows based on configured Games / Line"],
  ["{{score_entry_rows}}", "Generated writable rows for Game, Line Type, Game Format, Home Score, Away Score"],
  ["{{rules_text}}", "Rules and score sheet instructions"],
  ["{{captain_signature_rows}}", "Generated captain signature block"],
];

export function defaultScoreSheetTemplatePayload() {
  return {
    name: DEFAULT_SCORE_SHEET_TEMPLATE_NAME,
    description: "Current LWRPC three-line, three-round score sheet.",
    sheet_title: DEFAULT_SCORE_SHEET_TEMPLATE_NAME,
    template_html: DEFAULT_SCORE_SHEET_TEMPLATE_HTML,
    rules_text: DEFAULT_SCORE_SHEET_RULES,
    is_default: true,
    is_active: true,
  };
}
