import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

process.env.SUPABASE_SERVICE_ROLE_KEY = "viewer-test-service-secret";

const { createOfficialDocumentViewerToken, officialDocumentViewerHref, readOfficialDocumentViewerToken, resolveOfficialDocumentViewerSource } = await import("../app/lib/aiOfficialDocumentViewer.js");
const { initialPdfViewerPage } = await import("../app/lib/pdfViewerPage.js");

const USER_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_USER_ID = "55555555-5555-4555-8555-555555555555";
const DOCUMENT_ID = "22222222-2222-4222-8222-222222222222";
const VERSION_ID = "33333333-3333-4333-8333-333333333333";
const CHUNK_ID = "44444444-4444-4444-8444-444444444444";
const NOW = 1_700_000_000_000;

function source() {
  return { documentId: DOCUMENT_ID, documentVersionId: VERSION_ID, chunkId: CHUNK_ID };
}

test("uses encrypted, user-bound opaque viewer tokens rather than player-visible catalog identifiers", () => {
  const token = createOfficialDocumentViewerToken(source(), USER_ID, { now: NOW });
  assert.doesNotMatch(token, new RegExp(`${DOCUMENT_ID}|${VERSION_ID}|${CHUNK_ID}`));
  assert.match(officialDocumentViewerHref(source(), USER_ID), /^\/official-document\/[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
  assert.deepEqual(readOfficialDocumentViewerToken(token, USER_ID, { now: NOW + 1 }), { v: 1, exp: NOW + 900_000, sub: USER_ID, documentId: DOCUMENT_ID, documentVersionId: VERSION_ID, chunkId: CHUNK_ID });
  assert.throws(() => readOfficialDocumentViewerToken(token, OTHER_USER_ID, { now: NOW + 1 }), /invalid or has expired/i);
  assert.throws(() => readOfficialDocumentViewerToken(`${token}x`, USER_ID, { now: NOW + 1 }), /invalid or has expired/i);
  assert.throws(() => readOfficialDocumentViewerToken(token, USER_ID, { now: NOW + 900_000 }), /invalid or has expired/i);
});

test("revalidates the current active searchable source before the LMS PDF proxy can use it", async () => {
  const token = createOfficialDocumentViewerToken(source(), USER_ID, { now: NOW });
  const calls = [];
  const versionQuery = { select(value) { calls.push(["version-select", value]); return this; }, in() { return Promise.resolve({ data: [{ id: VERSION_ID, document_id: DOCUMENT_ID, storage_bucket: "ai-official-documents", storage_path: "documents/active/captains.pdf", processing_status: "ready", document: { id: DOCUMENT_ID, title: "LWRPC-Captains Guide to the LMS", status: "active", active_version_id: VERSION_ID } }], error: null }); } };
  const chunkQuery = { select(value) { calls.push(["chunk-select", value]); return this; }, in() { return Promise.resolve({ data: [{ id: CHUNK_ID, document_version_id: VERSION_ID, is_searchable: true, page_number: 10, rule_number: "", section_label: "League Fees and Waiver", heading: "LEAGUE FEES AND WAIVER" }], error: null }); } };
  const supabase = { from: (table) => table === "ai_document_versions" ? versionQuery : chunkQuery, storage: { from: () => ({ createSignedUrl: async () => ({ data: { signedUrl: "https://storage.example.test/signed.pdf?token=private" }, error: null }) }) } };
  const result = await resolveOfficialDocumentViewerSource(supabase, token, USER_ID, { now: NOW + 1 });
  assert.match(calls[0][1], /ai_document_versions_document_id_fkey!inner/);
  assert.equal(result.pageNumber, 10);
  assert.equal(result.documentTitle, "LWRPC-Captains Guide to the LMS");
  assert.equal(result.storageBucket, "ai-official-documents");
  assert.equal(result.storagePath, "documents/active/captains.pdf");
});

test("react-pdf viewer explicitly selects and safely clamps cited pages", () => {
  assert.equal(initialPdfViewerPage(1, 17), 1);
  assert.equal(initialPdfViewerPage(5, 17), 5);
  assert.equal(initialPdfViewerPage(10, 17), 10);
  assert.equal(initialPdfViewerPage(17, 17), 17);
  assert.equal(initialPdfViewerPage(null, 17), 1);
  assert.equal(initialPdfViewerPage(0, 17), 1);
  assert.equal(initialPdfViewerPage(18, 17), 17);
});

test("viewer routes require player authorization and render the authenticated LMS PDF proxy through react-pdf", async () => {
  const [metadataRoute, pdfRoute, viewer, pdfClient, playerAssistant] = await Promise.all([
    readFile(new URL("../app/api/official-document-viewer/route.js", import.meta.url), "utf8"),
    readFile(new URL("../app/api/official-document-viewer/pdf/route.js", import.meta.url), "utf8"),
    readFile(new URL("../app/components/OfficialDocumentViewer.js", import.meta.url), "utf8"),
    readFile(new URL("../app/components/PdfDocumentModalClient.js", import.meta.url), "utf8"),
    readFile(new URL("../app/lib/askLwrPlayerAnswer.js", import.meta.url), "utf8"),
  ]);
  assert.match(metadataRoute, /authorizeAdminRequest\(req, "player"\)/);
  assert.match(pdfRoute, /authorizeAdminRequest\(req, "player"\)/);
  assert.match(pdfRoute, /storage\.from\(source\.storageBucket\)\.download\(source\.storagePath\)/);
  assert.match(viewer, /\/api\/official-document-viewer\/pdf\?citation=/);
  assert.match(viewer, /httpHeaders: headers/);
  assert.match(viewer, /function closeViewer\(\)/);
  assert.match(viewer, /window\.close\(\)/);
  assert.match(viewer, /router\.replace\("\/ask-lwr"\)/);
  assert.match(viewer, /<ViewerMessage[^>]+onClose=\{closeViewer\}/);
  assert.match(viewer, />Close<\/button>/);
  assert.match(pdfClient, /file=\{document\.file \|\| document\.url\}/);
  assert.match(pdfClient, /setPageNumber\(initialPdfViewerPage\(initialPageNumber, pdf\.numPages\)\)/);
  assert.match(pdfClient, /onClose && <button[^>]*>\s*Close/s);
  assert.match(playerAssistant, /officialDocumentViewerHref/);
  assert.match(playerAssistant, /officialDocumentUrl:\s*officialDocumentViewerHref\(source, userId\)/);
});
