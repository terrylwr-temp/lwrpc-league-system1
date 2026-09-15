// Test-only PostgREST subset for the accepted Dashboard's nested games count.
// Evaluates against the fixture PostgreSQL database, never the View-As adapter.
const columns = {
  'match_lines.matches.league_id': 'm.league_id',
  'match_lines.matches.division_id': 'm.division_id',
  'match_lines.matches.score_status': 'm.score_status',
};
const nullColumns = new Set(['home_score', 'away_score', 'game_status']);
export function dashboardFixtureSql(params) {
  const selection = params.get('select')?.replace(/\s/g, '');
  if (selection !== 'id,match_lines!inner(matches!inner(league_id,division_id,score_status))') {
    throw new Error('Unsupported normal fixture count selection');
  }
  const values = [], conditions = [];
  for (const [key, value] of params) {
    if (key === 'select') continue;
    if (key === 'or') {
      if (!value.startsWith('(') || !value.endsWith(')')) throw new Error('Invalid fixture OR');
      const clauses = value.slice(1, -1).split(',').map(clause => {
        const match = /^(\w+)\.(not\.)?is\.null$/.exec(clause);
        if (!match || !nullColumns.has(match[1])) throw new Error('Unsupported normal fixture null filter');
        return `g.${match[1]} IS ${match[2] ? 'NOT ' : ''}NULL`;
      });
      conditions.push('(' + clauses.join(' OR ') + ')');
      continue;
    }
    const column = columns[key];
    if (!column) throw new Error('Unsupported normal fixture count filter');
    if (value.startsWith('eq.')) {
      values.push(value.slice(3));
      conditions.push(`${column}::text = $${values.length}`);
    } else if (value.startsWith('in.(') && value.endsWith(')')) {
      const items = value.slice(4, -1).split(',').filter(Boolean);
      if (items.some(item => !/^[a-zA-Z0-9_-]+$/.test(item))) throw new Error('Invalid fixture IN value');
      values.push(items);
      conditions.push(`${column}::text = ANY($${values.length}::text[])`);
    } else throw new Error('Unsupported normal fixture comparison');
  }
  return {
    text: `SELECT g.id, jsonb_build_object('matches', jsonb_build_object(
      'league_id',m.league_id,'division_id',m.division_id,'score_status',m.score_status)) AS match_lines
      FROM public.line_games g JOIN public.match_lines ml ON ml.id=g.match_line_id
      JOIN public.matches m ON m.id=ml.match_id
      ${conditions.length ? 'WHERE ' + conditions.join(' AND ') : ''} ORDER BY g.id`,
    values,
  };
}
export async function queryNormalDashboardFixture(db, params) {
  const sql = dashboardFixtureSql(params);
  const { rows } = await db.query(sql.text, sql.values);
  return { data: rows, count: rows.length, error: null };
}
