export function buildActiveDivisionOptions(divisions = []) {
  return (divisions || [])
    .filter((division) => {
      const league = division.leagues;
      const season = league?.seasons;

      return (
        division?.id &&
        division.is_active !== false &&
        league?.is_active !== false &&
        season?.is_active !== false
      );
    })
    .map((division) => ({
      id: String(division.id),
      label: `${division.leagues?.name || "League"} / ${division.name || "Division"}`,
      leagueName: division.leagues?.name || "",
      divisionName: division.name || "",
      division,
    }))
    .sort((a, b) => {
      const leagueCompare = a.leagueName.localeCompare(b.leagueName);
      if (leagueCompare !== 0) return leagueCompare;
      return a.divisionName.localeCompare(b.divisionName);
    });
}
