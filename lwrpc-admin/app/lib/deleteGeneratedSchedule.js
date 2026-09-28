// Keep UUID filters well below the Data API request-URL limit.
const ID_BATCH_SIZE = 50;
const LINE_PAGE_SIZE = 1000;

function* idBatches(ids) {
  for (let offset = 0; offset < ids.length; offset += ID_BATCH_SIZE) {
    yield ids.slice(offset, offset + ID_BATCH_SIZE);
  }
}

export async function deleteGeneratedScheduleRows(client, setting, matchIds) {
  if (matchIds.length === 0) return { error: null };

  // Finish every lookup before deleting anything. Paginate so the API row cap
  // cannot leave game rows behind when a batch contains many match lines.
  const lineIds = [];
  for (const batch of idBatches(matchIds)) {
    for (let offset = 0; ; offset += LINE_PAGE_SIZE) {
      const { data, error } = await client
        .from("match_lines")
        .select("id")
        .in("match_id", batch)
        .order("id")
        .range(offset, offset + LINE_PAGE_SIZE - 1);
      if (error) return { error, stage: "loading match lines" };
      const lines = data || [];
      lineIds.push(...lines.map((line) => line.id));
      if (lines.length < LINE_PAGE_SIZE) break;
    }
  }

  // Preserve the existing child-before-parent order across all batches.
  const phases = [
    { table: "line_games", column: "match_line_id", ids: lineIds, stage: "deleting game score rows" },
    { table: "match_lines", column: "match_id", ids: matchIds, stage: "deleting match lines" },
    { table: "matches", column: "id", ids: matchIds, stage: "deleting matches" },
  ];
  for (const { table, column, ids, stage } of phases) {
    for (const batch of idBatches(ids)) {
      const { error } = await client.from(table).delete().in(column, batch);
      if (error) return { error, stage };
    }
  }

  let byeQuery = client
    .from("team_byes")
    .delete()
    .eq("league_id", setting.league_id)
    .eq("division_id", setting.division_id);
  byeQuery = setting.is_copy
    ? byeQuery.eq("schedule_setting_id", setting.id)
    : byeQuery.or(`schedule_setting_id.is.null,schedule_setting_id.eq.${setting.id}`);
  const { error } = await byeQuery;
  return { error, stage: error ? "deleting bye rows" : null };
}
