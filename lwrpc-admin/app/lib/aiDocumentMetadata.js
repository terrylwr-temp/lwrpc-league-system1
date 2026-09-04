export const AI_DOCUMENT_TYPES = Object.freeze([
  "league_rules", "league_supplement", "usap_rulebook", "captain_guide", "player_guide", "lms_guide", "other",
]);
export const AI_DOCUMENT_SCOPE_KINDS = Object.freeze(["all", "lms_help", "league", "division"]);
export const INITIAL_DOCUMENT_METADATA_FORM = Object.freeze({
  title: "", description: "", documentType: "league_rules", authorityRank: "1", scopeKind: "all", leagueId: "", divisionId: "", seasonId: "",
});

const TYPES = new Set(AI_DOCUMENT_TYPES);
const SCOPES = new Set(AI_DOCUMENT_SCOPE_KINDS);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function defaultDocumentAuthorityRank(documentType) {
  return documentType === "usap_rulebook" ? 2 : ["league_rules", "league_supplement"].includes(documentType) ? 1 : 3;
}

export function normalizeDocumentMetadata(source) {
  const documentType = text(value(source, "documentType"), 80);
  const scopeKind = text(value(source, "scopeKind"), 40);
  const title = text(value(source, "title"), 301);
  if (!title) throw validationError("Document title is required.");
  if (title.length > 300) throw validationError("Document title must be 300 characters or fewer.");
  if (!TYPES.has(documentType)) throw validationError("Select a valid document type.");
  if (!SCOPES.has(scopeKind)) throw validationError("Select a valid applicability scope.");

  const authorityRank = Number.parseInt(String(value(source, "authorityRank") || (documentType === "usap_rulebook" ? defaultDocumentAuthorityRank(documentType) : "")), 10);
  if (!Number.isInteger(authorityRank) || authorityRank < 1 || authorityRank > 99) throw validationError("Authority rank must be between 1 and 99.");

  const description = text(value(source, "description"), 5001);
  if (description.length > 5000) throw validationError("Description must be 5,000 characters or fewer.");
  const league_id = optionalId(value(source, "leagueId"), "League");
  const division_id = optionalId(value(source, "divisionId"), "Division");
  const season_id = optionalId(value(source, "seasonId"), "Season");

  if (["all", "lms_help"].includes(scopeKind) && (league_id || division_id)) {
    throw validationError("All leagues and LMS Help applicability cannot also be limited to a league or division.");
  }
  if (scopeKind === "league" && !league_id) throw validationError("Choose the applicable league.");
  if (scopeKind === "league" && division_id) throw validationError("A league-scoped document cannot also select a division.");
  if (scopeKind === "division" && !division_id) throw validationError("Choose the applicable division.");

  return { title, description: description || null, document_type: documentType, authority_rank: authorityRank, scope_kind: scopeKind, league_id, division_id, season_id };
}

export function assertDocumentMetadataReferences(metadata, references) {
  const { season, league, division, divisionLeague } = references || {};
  if (metadata.season_id && !season) throw validationError("The selected season no longer exists.");
  if (metadata.league_id && !league) throw validationError("The selected league no longer exists.");
  if (metadata.division_id && !division) throw validationError("The selected division no longer exists.");
  if (metadata.division_id && metadata.league_id && String(division.league_id) !== String(metadata.league_id)) {
    throw validationError("The selected division does not belong to the selected league.");
  }

  const scopedLeague = division ? (divisionLeague || league) : league;
  if (metadata.season_id && scopedLeague?.season_id && String(scopedLeague.season_id) !== String(metadata.season_id)) {
    throw validationError("The selected season does not match the selected league or division.");
  }
  return metadata;
}

export function documentMetadataForm(document) {
  return {
    title: document?.title || "", description: document?.description || "", documentType: document?.document_type || "other",
    authorityRank: String(document?.authority_rank || "1"), scopeKind: document?.scope_kind || "all",
    leagueId: document?.league_id || "", divisionId: document?.division_id || "", seasonId: document?.season_id || "",
  };
}

export function isDocumentMetadataValidationError(error) {
  return error?.name === "DocumentMetadataValidationError";
}

function value(source, key) { return typeof source?.get === "function" ? source.get(key) : source?.[key]; }
function text(input, maximum) { return String(input || "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, maximum); }
function optionalId(input, label) { const id = String(input || "").trim(); if (!id) return null; if (!UUID.test(id)) throw validationError(`${label} must be a valid selection.`); return id; }
function validationError(message) { const error = new Error(message); error.name = "DocumentMetadataValidationError"; return error; }
