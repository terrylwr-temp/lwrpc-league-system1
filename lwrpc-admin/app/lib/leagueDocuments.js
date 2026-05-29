export const DEFAULT_LEAGUE_DOCUMENT_BUCKET =
  process.env.NEXT_PUBLIC_SUPABASE_LEAGUE_DOCUMENTS_BUCKET || "league-documents";

export const DEFAULT_LEAGUE_DOCUMENT_PREFIX =
  process.env.NEXT_PUBLIC_SUPABASE_LEAGUE_DOCUMENTS_PREFIX || "private";

export const LEAGUE_DOCUMENT_TYPES = [
  {
    key: "code_of_conduct",
    label: "Code of Conduct",
    column: "code_of_conduct_pdf_path",
  },
  {
    key: "captains_guide",
    label: "Captains Guide",
    column: "captains_guide_pdf_path",
  },
  {
    key: "league_rules",
    label: "League Rules",
    column: "league_rules_pdf_path",
  },
  {
    key: "score_sheet",
    label: "Blank Score Sheet",
    column: "score_sheet_pdf_path",
  },
  {
    key: "league_waiver",
    label: "League Waiver",
    column: "league_waiver_pdf_path",
  },
];

export function initialLeagueDocuments() {
  return Object.fromEntries(
    LEAGUE_DOCUMENT_TYPES.map((documentType) => [documentType.column, ""])
  );
}

export function leagueDocumentPayload(documents) {
  return Object.fromEntries(
    LEAGUE_DOCUMENT_TYPES.map((documentType) => [
      documentType.column,
      documents?.[documentType.column]?.trim() || null,
    ])
  );
}

export function leagueDocumentPath(league, documentType) {
  return league?.[documentType.column] || "";
}
