import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { authorizeAdminRequest } from "../../../lib/serverSupabase";
import { assertPdfUpload, processAiDocumentVersion, sanitizePdfFilename } from "../../../lib/aiDocumentProcessing";
import { assertDocumentMetadataReferences, isDocumentMetadataValidationError, normalizeDocumentMetadata } from "../../../lib/aiDocumentMetadata";

export const runtime = "nodejs";

export async function GET(req) {
  try {
    const authorization = await authorizeAdminRequest(req, "league_manager");
    if (authorization.error) return failure(authorization.error, authorization.status);
    const url = new URL(req.url);
    const documentId = String(url.searchParams.get("documentId") || "").trim();
    const versionId = String(url.searchParams.get("versionId") || "").trim();
    if (documentId) return NextResponse.json({ success: true, ...(await documentDetail(authorization.supabase, documentId, versionId)) });
    return NextResponse.json({ success: true, ...(await documentList(authorization.supabase)) });
  } catch (error) {
    return failure(error.message, isDocumentMetadataValidationError(error) ? 400 : 500);
  }
}

export async function POST(req) {
  try {
    const authorization = await authorizeAdminRequest(req, "league_manager");
    if (authorization.error) return failure(authorization.error, authorization.status);
    const form = await req.formData();
    const action = String(form.get("action") || "").trim();
    const memberId = authorization.memberRows?.[0]?.id || null;

    if (action === "activate") {
      const documentId = requiredId(form.get("documentId"), "Document");
      const versionId = requiredId(form.get("versionId"), "Version");
      const { error } = await authorization.supabase.rpc("activate_ai_document_version", {
        p_document_id: documentId,
        p_version_id: versionId,
      });
      if (error) throw error;
      return NextResponse.json({ success: true, ...(await documentDetail(authorization.supabase, documentId, versionId)) });
    }

    if (action === "reprocess") {
      const documentId = requiredId(form.get("documentId"), "Document");
      const sourceVersionId = requiredId(form.get("versionId"), "Version");
      const versionId = await createReprocessVersion(authorization.supabase, documentId, sourceVersionId, memberId);
      const processingError = await safelyProcess(authorization.supabase, versionId, memberId);
      return NextResponse.json({ success: true, processingError, ...(await documentDetail(authorization.supabase, documentId, versionId)) });
    }

    if (action !== "upload" && action !== "replace") return failure("Unknown document action.", 400);
    const file = form.get("file");
    if (!file || typeof file.arrayBuffer !== "function") return failure("Choose a PDF file to upload.", 400);
    const bytes = Buffer.from(await file.arrayBuffer());
    assertPdfUpload(file, bytes);

    const documentId = action === "replace"
      ? requiredId(form.get("documentId"), "Document")
      : await createDocument(authorization.supabase, await documentInput(form, authorization.supabase), memberId);
    const versionId = await createManagedVersion(authorization.supabase, documentId, file, bytes, memberId);
    const processingError = await safelyProcess(authorization.supabase, versionId, memberId);
    return NextResponse.json({ success: true, processingError, ...(await documentDetail(authorization.supabase, documentId, versionId)) });
  } catch (error) {
    return failure(error.message, isDocumentMetadataValidationError(error) ? 400 : 500);
  }
}

export async function PATCH(req) {
  try {
    const authorization = await authorizeAdminRequest(req, "league_manager");
    if (authorization.error) return failure(authorization.error, authorization.status);
    const body = await req.json().catch(() => ({}));
    if (body.action === "set_chunk_searchable") {
      const chunkId = requiredId(body.chunkId, "Chunk");
      const { error } = await authorization.supabase
        .from("ai_document_chunks")
        .update({ is_searchable: Boolean(body.isSearchable) })
        .eq("id", chunkId);
      if (error) throw error;
      return NextResponse.json({ success: true });
    }
    if (body.action !== "edit_document_details") return failure("Unknown document update.", 400);

    const documentId = requiredId(body.documentId, "Document");
    const metadata = await documentInput(body, authorization.supabase);
    const memberId = authorization.memberRows?.[0]?.id || null;
    // This update deliberately addresses ai_documents only. It never touches
    // the immutable version row, Storage source, chunks, or embeddings.
    const { error } = await authorization.supabase
      .from("ai_documents")
      .update({ ...metadata, updated_at: new Date().toISOString(), updated_by_member_id: memberId })
      .eq("id", documentId)
      .select("id")
      .single();
    if (error) throw error;
    return NextResponse.json({ success: true, ...(await documentDetail(authorization.supabase, documentId)) });
  } catch (error) {
    return failure(error.message, isDocumentMetadataValidationError(error) ? 400 : 500);
  }
}

async function documentList(supabase) {
  const [documentsResult, seasonsResult, leaguesResult, divisionsResult] = await Promise.all([
    supabase
      .from("ai_documents")
      .select("id, title, description, document_type, authority_rank, status, scope_kind, league_id, division_id, season_id, active_version_id, created_at, updated_at, active_version:ai_document_versions!ai_documents_active_version_id_fkey(id, version_label, processing_status, page_count, chunk_count, processed_at)")
      .order("updated_at", { ascending: false }),
    supabase.from("seasons").select("id, name, is_active").order("name"),
    supabase.from("leagues").select("id, name, season_id, is_active").order("name"),
    supabase.from("divisions").select("id, name, league_id, is_active").order("name"),
  ]);
  for (const result of [documentsResult, seasonsResult, leaguesResult, divisionsResult]) if (result.error) throw result.error;
  return {
    documents: documentsResult.data || [],
    options: { seasons: seasonsResult.data || [], leagues: leaguesResult.data || [], divisions: divisionsResult.data || [] },
  };
}

async function documentDetail(supabase, documentId, requestedVersionId = "") {
  const { data: document, error: documentError } = await supabase
    .from("ai_documents")
    .select("id, title, description, document_type, authority_rank, status, scope_kind, league_id, division_id, season_id, active_version_id, created_at, updated_at, active_version:ai_document_versions!ai_documents_active_version_id_fkey(id, version_label, processing_status, page_count, chunk_count, processing_error, processing_warnings, processed_at, original_filename, storage_bucket, storage_path)")
    .eq("id", documentId)
    .single();
  if (documentError) throw documentError;
  const { data: versions, error: versionsError } = await supabase
    .from("ai_document_versions")
    .select("id, version_label, source_kind, original_filename, file_size_bytes, page_count, processing_status, processing_error, processing_warnings, processed_at, chunk_count, created_at")
    .eq("document_id", documentId)
    .order("created_at", { ascending: false });
  if (versionsError) throw versionsError;
  const selectedVersionId = requestedVersionId || document.active_version_id || versions?.[0]?.id || "";
  const { data: chunks, error: chunksError } = selectedVersionId
    ? await supabase
      .from("ai_document_chunks")
      .select("id, chunk_ordinal, page_number, section_label, rule_number, heading, content, is_searchable")
      .eq("document_version_id", selectedVersionId)
      .order("chunk_ordinal")
      .limit(50)
    : { data: [], error: null };
  if (chunksError) throw chunksError;
  return { document, versions: versions || [], selectedVersionId, previewChunks: chunks || [] };
}

async function documentInput(source, supabase) {
  const metadata = normalizeDocumentMetadata(source);
  const references = await metadataReferences(supabase, metadata);
  return assertDocumentMetadataReferences(metadata, references);
}

async function metadataReferences(supabase, metadata) {
  const [seasonResult, leagueResult, divisionResult] = await Promise.all([
    metadata.season_id ? supabase.from("seasons").select("id").eq("id", metadata.season_id).maybeSingle() : Promise.resolve({ data: null, error: null }),
    metadata.league_id ? supabase.from("leagues").select("id, season_id").eq("id", metadata.league_id).maybeSingle() : Promise.resolve({ data: null, error: null }),
    metadata.division_id ? supabase.from("divisions").select("id, league_id").eq("id", metadata.division_id).maybeSingle() : Promise.resolve({ data: null, error: null }),
  ]);
  for (const result of [seasonResult, leagueResult, divisionResult]) if (result.error) throw result.error;
  let divisionLeague = null;
  if (divisionResult.data?.league_id) {
    if (leagueResult.data && String(leagueResult.data.id) === String(divisionResult.data.league_id)) divisionLeague = leagueResult.data;
    else {
      const { data, error } = await supabase.from("leagues").select("id, season_id").eq("id", divisionResult.data.league_id).maybeSingle();
      if (error) throw error;
      divisionLeague = data;
    }
  }
  return { season: seasonResult.data, league: leagueResult.data, division: divisionResult.data, divisionLeague };
}

async function createDocument(supabase, values, memberId) {
  const { data, error } = await supabase
    .from("ai_documents")
    .insert({ ...values, status: "inactive", created_by_member_id: memberId, updated_by_member_id: memberId })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

async function createManagedVersion(supabase, documentId, file, bytes, memberId) {
  const versionId = randomUUID();
  const filename = sanitizePdfFilename(file.name);
  const storageBucket = process.env.LWR_AI_DOCUMENTS_BUCKET || "ai-official-documents";
  const storagePath = `documents/${documentId}/${versionId}/${filename}`;
  const { error: versionError } = await supabase.from("ai_document_versions").insert({
    id: versionId,
    document_id: documentId,
    version_label: versionLabel(versionId),
    source_kind: "managed_storage",
    storage_bucket: storageBucket,
    storage_path: storagePath,
    original_filename: filename,
    file_size_bytes: bytes.byteLength,
    processing_status: "queued",
    processed_by_member_id: memberId,
  });
  if (versionError) throw versionError;
  const { error: uploadError } = await supabase.storage.from(storageBucket).upload(storagePath, bytes, {
    contentType: "application/pdf",
    cacheControl: "3600",
    upsert: false,
  });
  if (uploadError) {
    await supabase.from("ai_document_versions").update({ processing_status: "failed", processing_error: uploadError.message }).eq("id", versionId);
    throw uploadError;
  }
  return versionId;
}

async function createReprocessVersion(supabase, documentId, sourceVersionId, memberId) {
  const { data: source, error: sourceError } = await supabase
    .from("ai_document_versions")
    .select("document_id, source_kind, storage_bucket, storage_path, original_filename, file_size_bytes")
    .eq("id", sourceVersionId)
    .eq("document_id", documentId)
    .single();
  if (sourceError) throw sourceError;
  const versionId = randomUUID();
  const { error } = await supabase.from("ai_document_versions").insert({
    id: versionId,
    document_id: documentId,
    version_label: versionLabel(versionId),
    source_kind: source.source_kind,
    storage_bucket: source.storage_bucket,
    storage_path: source.storage_path,
    original_filename: source.original_filename,
    file_size_bytes: source.file_size_bytes,
    processing_status: "queued",
    processed_by_member_id: memberId,
  });
  if (error) throw error;
  return versionId;
}

async function safelyProcess(supabase, versionId, memberId) {
  try {
    await processAiDocumentVersion({ supabase, versionId, actorMemberId: memberId });
    return "";
  } catch (error) {
    return String(error.message || "Document processing failed.");
  }
}

function versionLabel(versionId) {
  return `v${new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14)}-${versionId.slice(0, 8)}`;
}

function requiredId(value, label) {
  const id = optionalId(value);
  if (!id) throw new Error(`${label} is required.`);
  return id;
}

function optionalId(value) {
  const id = String(value || "").trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id) ? id : null;
}

function failure(error, status) {
  return NextResponse.json({ success: false, error: error || "Request failed." }, { status });
}
