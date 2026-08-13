export const DEFAULT_LEAGUE_DOCUMENT_BUCKET =
  process.env.NEXT_PUBLIC_SUPABASE_LEAGUE_DOCUMENTS_BUCKET || "documents";

export const DEFAULT_LEAGUE_DOCUMENT_PREFIX =
  process.env.NEXT_PUBLIC_SUPABASE_LEAGUE_DOCUMENTS_PREFIX || "league-documents";

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
    label: "League Important Dates",
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
      normalizeLeagueDocumentPath(documents?.[documentType.column]) || null,
    ])
  );
}

export function leagueDocumentPath(league, documentType) {
  return normalizeLeagueDocumentPath(league?.[documentType.column]);
}

export function normalizeLeagueDocumentPath(path) {
  const normalizedPath = String(path || "")
    .trim()
    .replace(/^\/+/, "");

  if (normalizedPath.startsWith("private/")) {
    return `${DEFAULT_LEAGUE_DOCUMENT_PREFIX}/${normalizedPath.slice("private/".length)}`;
  }

  return normalizedPath && !normalizedPath.includes("/")
    ? `${DEFAULT_LEAGUE_DOCUMENT_PREFIX}/${normalizedPath}`
    : normalizedPath;
}

export function normalizeLeagueDocumentBucket(bucket) {
  const normalizedBucket = String(bucket || "").trim();

  return normalizedBucket === "league-documents"
    ? DEFAULT_LEAGUE_DOCUMENT_BUCKET
    : normalizedBucket || DEFAULT_LEAGUE_DOCUMENT_BUCKET;
}
