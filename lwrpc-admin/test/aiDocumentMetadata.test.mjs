import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { assertDocumentMetadataReferences, documentMetadataForm, normalizeDocumentMetadata } from "../app/lib/aiDocumentMetadata.js";

const ids = Object.freeze({
  season: "10000000-0000-4000-8000-000000000001",
  league: "20000000-0000-4000-8000-000000000001",
  otherLeague: "30000000-0000-4000-8000-000000000001",
  division: "40000000-0000-4000-8000-000000000001",
});

test("normalizes safe parent-document metadata without touching version fields", () => {
  const metadata = normalizeDocumentMetadata({ title: "  Captains Guide  ", description: "  Official help  ", documentType: "captain_guide", authorityRank: "3", scopeKind: "division", leagueId: ids.league, divisionId: ids.division, seasonId: ids.season });
  assert.deepEqual(metadata, { title: "Captains Guide", description: "Official help", document_type: "captain_guide", authority_rank: 3, scope_kind: "division", league_id: ids.league, division_id: ids.division, season_id: ids.season });
  assert.ok(!("active_version_id" in metadata));
  assert.ok(!("storage_path" in metadata));
});

test("rejects invalid metadata types, ranks, UUIDs, and scope combinations", () => {
  const valid = { title: "Rules", documentType: "league_rules", authorityRank: "1", scopeKind: "all" };
  assert.throws(() => normalizeDocumentMetadata({ ...valid, documentType: "pdf" }), /valid document type/i);
  assert.throws(() => normalizeDocumentMetadata({ ...valid, authorityRank: "100" }), /between 1 and 99/i);
  assert.throws(() => normalizeDocumentMetadata({ ...valid, leagueId: "not-a-uuid" }), /valid selection/i);
  assert.throws(() => normalizeDocumentMetadata({ ...valid, leagueId: ids.league }), /cannot also be limited/i);
  assert.throws(() => normalizeDocumentMetadata({ ...valid, scopeKind: "league" }), /applicable league/i);
  assert.throws(() => normalizeDocumentMetadata({ ...valid, scopeKind: "division" }), /applicable division/i);
});

test("rejects missing and mismatched catalog references", () => {
  const metadata = normalizeDocumentMetadata({ title: "Division rules", documentType: "league_rules", authorityRank: "1", scopeKind: "division", leagueId: ids.league, divisionId: ids.division, seasonId: ids.season });
  const refs = { season: { id: ids.season }, league: { id: ids.league, season_id: ids.season }, division: { id: ids.division, league_id: ids.league }, divisionLeague: { id: ids.league, season_id: ids.season } };
  assert.equal(assertDocumentMetadataReferences(metadata, refs), metadata);
  assert.throws(() => assertDocumentMetadataReferences(metadata, { ...refs, division: { id: ids.division, league_id: ids.otherLeague } }), /does not belong/i);
  assert.throws(() => assertDocumentMetadataReferences(metadata, { ...refs, season: null }), /season no longer exists/i);
  assert.throws(() => assertDocumentMetadataReferences(metadata, { ...refs, divisionLeague: { id: ids.league, season_id: ids.otherLeague } }), /does not match/i);
});

test("maps selected document metadata into an editable form", () => {
  assert.deepEqual(documentMetadataForm({ title: "Player Guide", description: null, document_type: "player_guide", authority_rank: 4, scope_kind: "all" }), { title: "Player Guide", description: "", documentType: "player_guide", authorityRank: "4", scopeKind: "all", leagueId: "", divisionId: "", seasonId: "" });
});

test("the management route preserves immutable versions for metadata-only edits", async () => {
  const route = await readFile(new URL("../app/api/ai-assistant/documents/route.js", import.meta.url), "utf8");
  assert.match(route, /body\.action !== "edit_document_details"/);
  assert.match(route, /from\("ai_documents"\)[\s\S]*\.update\(\{ \.\.\.metadata, updated_at:/);
  assert.match(route, /This update deliberately addresses ai_documents only/);
  assert.doesNotMatch(route.slice(route.indexOf('body.action !== "edit_document_details"'), route.indexOf("async function documentList")), /processAiDocumentVersion|createManagedVersion|createReprocessVersion/);
});

test("the Add Official PDF form resets only after a successful activation", async () => {
  const page = await readFile(new URL("../app/ai-assistant/page.js", import.meta.url), "utf8");
  assert.match(page, /const activated = await submitAction\(data, "This ready version is now the active official source\.", true\);\s*if \(activated\) resetAddOfficialPdfForm\(\);/);
  assert.match(page, /setForm\(\{ \.\.\.INITIAL_DOCUMENT_METADATA_FORM \}\);/);
  assert.match(page, /setUploadFile\(null\);/);
  assert.match(page, /setUploadInputKey\(\(current\) => current \+ 1\);/);
});
