import { createHash } from "node:crypto";
import { WorkerMessageHandler } from "pdfjs-dist/legacy/build/pdf.worker.mjs";
import { aiAssistantConfig } from "./aiAssistantConfig.js";

const MAX_CHUNK_CHARACTERS = 4_000;
const EMBEDDING_BATCH_SIZE = 40;

// PDF.js 5's legacy Node build still includes display code. In a serverless
// deployment its optional @napi-rs/canvas dependency may not be present, even
// though this module only asks PDF.js for text. PDF.js then evaluates
// `new DOMMatrix()` while loading that display code. This deliberately small
// affine-matrix compatibility class lets the text-only path load without
// introducing a browser DOM or a canvas renderer.
class TextExtractionDOMMatrix {
  constructor(init = [1, 0, 0, 1, 0, 0]) {
    const values = Array.isArray(init) || ArrayBuffer.isView(init) ? [...init] : [];
    [this.a, this.b, this.c, this.d, this.e, this.f] = values.length >= 6
      ? values.slice(0, 6).map(Number)
      : [1, 0, 0, 1, 0, 0];
    this.m11 = this.a;
    this.m12 = this.b;
    this.m21 = this.c;
    this.m22 = this.d;
    this.m41 = this.e;
    this.m42 = this.f;
  }
}

export async function loadPdfJsForTextExtraction() {
  if (!globalThis.DOMMatrix) globalThis.DOMMatrix = TextExtractionDOMMatrix;
  // In PDF.js 5, Node uses a loopback "fake worker" even for text-only work.
  // Preloading the worker module through a literal import lets Next bundle it;
  // PDF.js then uses this handler instead of dynamically resolving its default
  // ./pdf.worker.mjs path from .next/server/chunks at request time.
  globalThis.pdfjsWorker = { WorkerMessageHandler };
  return import("pdfjs-dist/legacy/build/pdf.mjs");
}

export function sanitizePdfFilename(value) {
  const normalized = String(value || "official-document.pdf")
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/-+\./g, ".")
    .replace(/^[-.]+|[-.]+$/g, "");
  const filename = normalized || "official-document.pdf";
  return filename.toLowerCase().endsWith(".pdf") ? filename : `${filename}.pdf`;
}

export function assertPdfUpload(file, bytes, config = aiAssistantConfig) {
  if (!file || typeof file.arrayBuffer !== "function") throw new Error("Choose a PDF file to upload.");
  if (Number(file.size || bytes?.byteLength || 0) > config.maxPdfBytes) {
    throw new Error(`PDF files must be ${Math.floor(config.maxPdfBytes / 1024 / 1024)} MB or smaller.`);
  }
  const header = Buffer.from(bytes || []).subarray(0, 5).toString("ascii");
  if (header !== "%PDF-") throw new Error("Only valid PDF files can be uploaded.");
}

export async function extractPdfPages(bytes, config = aiAssistantConfig) {
  const { getDocument } = await loadPdfJsForTextExtraction();
  const task = getDocument({
    data: new Uint8Array(bytes),
    isEvalSupported: false,
    stopAtErrors: false,
    // Text extraction does not render glyphs. Prefer the server's font mapping
    // so PDF.js does not attempt to fetch browser-style standard font assets.
    useSystemFonts: true,
  });
  const pdf = await task.promise;

  if (pdf.numPages > config.maxPdfPages) {
    throw new Error(`PDFs are limited to ${config.maxPdfPages} pages.`);
  }

  const pages = [];
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const lines = textLines(content.items || []);
    const text = lines.join("\n").trim();
    if (text) pages.push({ pageNumber, lines, text });
  }

  await task.destroy();
  if (pages.length === 0) throw new Error("No readable text was found in this PDF. A text-based official PDF is required.");
  return { pageCount: pdf.numPages, pages };
}

function textLines(items) {
  const lines = [];
  let current = "";
  for (const item of items) {
    const value = String(item?.str || "").replace(/\s+/g, " ").trim();
    if (!value) continue;
    current = current ? `${current} ${value}` : value;
    if (item?.hasEOL) {
      lines.push(current);
      current = "";
    }
  }
  if (current) lines.push(current);
  return lines;
}

export function chunkPdfPages(pages, { maxCharacters = MAX_CHUNK_CHARACTERS } = {}) {
  const chunks = [];
  for (const page of pages) {
    let metadata = { sectionLabel: "", ruleNumber: "", heading: "" };
    let sectionLines = [];
    const flush = () => {
      const text = sectionLines.join("\n").trim();
      if (!text) return;
      splitChunkText(text, maxCharacters).forEach((content) => {
        chunks.push({ pageNumber: page.pageNumber, ...metadata, content });
      });
      sectionLines = [];
    };

    for (const line of page.lines || []) {
      const nextMetadata = headingMetadata(line);
      if (nextMetadata) {
        flush();
        metadata = nextMetadata;
      }
      sectionLines.push(line);
    }
    flush();
  }
  return chunks.map((chunk, index) => ({ ...chunk, chunkOrdinal: index + 1 }));
}

function headingMetadata(line) {
  const value = String(line || "").trim();
  if (!value || value.length > 180) return null;
  const explicit = value.match(/^(rule|section|article)\s+([A-Za-z0-9][A-Za-z0-9.\-]*)(?:\s*[:.\-]\s*|\s+)(.+)$/i);
  if (explicit) {
    return {
      sectionLabel: `${explicit[1]} ${explicit[2]}`,
      ruleNumber: explicit[1].toLowerCase() === "rule" ? explicit[2] : "",
      heading: explicit[3].trim(),
    };
  }
  const numbered = value.match(/^(\d+(?:\.\d+){0,4})[.)]\s+(.+)$/);
  if (numbered) return { sectionLabel: numbered[1], ruleNumber: numbered[1], heading: numbered[2].trim() };
  if (value.length <= 110 && /[A-Za-z]/.test(value) && value === value.toUpperCase() && value.split(/\s+/).length <= 12) {
    return { sectionLabel: value, ruleNumber: "", heading: value };
  }
  return null;
}

function splitChunkText(text, maxCharacters) {
  if (text.length <= maxCharacters) return [text];
  const units = text.split(/\n{1,}/).map((part) => part.trim()).filter(Boolean);
  const output = [];
  let current = "";
  for (const unit of units) {
    if (unit.length > maxCharacters) {
      if (current) output.push(current);
      for (let start = 0; start < unit.length; start += maxCharacters) output.push(unit.slice(start, start + maxCharacters));
      current = "";
      continue;
    }
    const candidate = current ? `${current}\n${unit}` : unit;
    if (candidate.length > maxCharacters && current) {
      output.push(current);
      current = unit;
    } else current = candidate;
  }
  if (current) output.push(current);
  return output;
}

export async function processAiDocumentVersion({ supabase, versionId, actorMemberId }) {
  assertEmbeddingConfiguration();
  const { data: version, error: versionError } = await supabase
    .from("ai_document_versions")
    .select("id, document_id, storage_bucket, storage_path")
    .eq("id", versionId)
    .single();
  if (versionError) throw versionError;

  await updateVersion(supabase, versionId, {
    processing_status: "processing",
    processing_error: null,
    processing_warnings: [],
    processed_at: null,
    processed_by_member_id: actorMemberId || null,
    chunk_count: 0,
  });

  try {
    if (!aiAssistantConfig.enabled) throw new Error("Ask LWR Pickleball AI processing is disabled. Set LWR_AI_ENABLED=true on the server.");
    if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured on the server.");

    const { data: fileBlob, error: downloadError } = await supabase.storage
      .from(version.storage_bucket)
      .download(version.storage_path);
    if (downloadError) throw downloadError;
    const bytes = Buffer.from(await fileBlob.arrayBuffer());
    if (bytes.byteLength > aiAssistantConfig.maxPdfBytes) throw new Error("The stored PDF exceeds the configured upload limit.");
    if (bytes.subarray(0, 5).toString("ascii") !== "%PDF-") throw new Error("The stored document is not a valid PDF.");

    const extracted = await extractPdfPages(bytes);
    const chunks = chunkPdfPages(extracted.pages);
    if (chunks.length === 0) throw new Error("No searchable sections could be created from this PDF.");
    const embedded = await createEmbeddings(chunks.map((chunk) => chunk.content));

    const { error: deleteError } = await supabase.from("ai_document_chunks").delete().eq("document_version_id", versionId);
    if (deleteError) throw deleteError;

    for (let offset = 0; offset < chunks.length; offset += EMBEDDING_BATCH_SIZE) {
      const rows = chunks.slice(offset, offset + EMBEDDING_BATCH_SIZE).map((chunk, index) => ({
        document_version_id: versionId,
        chunk_ordinal: chunk.chunkOrdinal,
        page_number: chunk.pageNumber,
        section_label: chunk.sectionLabel || null,
        rule_number: chunk.ruleNumber || null,
        heading: chunk.heading || null,
        content: chunk.content,
        embedding: embedded.embeddings[offset + index],
        embedding_model: embedded.model,
        is_searchable: true,
      }));
      const { error: insertError } = await supabase.from("ai_document_chunks").insert(rows);
      if (insertError) throw insertError;
    }

    const warnings = extracted.pages.length < extracted.pageCount
      ? [`${extracted.pageCount - extracted.pages.length} page(s) contained no readable text.`]
      : [];
    await updateVersion(supabase, versionId, {
      processing_status: "ready",
      processing_error: null,
      processing_warnings: warnings,
      processed_at: new Date().toISOString(),
      processed_by_member_id: actorMemberId || null,
      page_count: extracted.pageCount,
      chunk_count: chunks.length,
      checksum_sha256: createHash("sha256").update(bytes).digest("hex"),
    });
    return { pageCount: extracted.pageCount, chunkCount: chunks.length, warnings, embeddingModel: embedded.model };
  } catch (error) {
    await supabase.from("ai_document_chunks").delete().eq("document_version_id", versionId);
    await updateVersion(supabase, versionId, {
      processing_status: "failed",
      processing_error: friendlyProcessingError(error),
      processed_at: new Date().toISOString(),
      processed_by_member_id: actorMemberId || null,
      chunk_count: 0,
    });
    throw error;
  }
}

async function updateVersion(supabase, versionId, values) {
  const { error } = await supabase.from("ai_document_versions").update(values).eq("id", versionId);
  if (error) throw error;
}

function assertEmbeddingConfiguration() {
  if (aiAssistantConfig.embeddingDimensions !== 1536) {
    throw new Error("LWR_AI_EMBEDDING_DIMENSIONS must remain 1536 until the AI chunk schema is migrated and reindexed.");
  }
}

async function createEmbeddings(texts) {
  const embeddings = [];
  let model = aiAssistantConfig.embeddingModel;
  for (let offset = 0; offset < texts.length; offset += EMBEDDING_BATCH_SIZE) {
    const input = texts.slice(offset, offset + EMBEDDING_BATCH_SIZE);
    const response = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: aiAssistantConfig.embeddingModel,
        input,
        dimensions: aiAssistantConfig.embeddingDimensions,
        encoding_format: "float",
      }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result?.error?.message || "The embedding provider could not process this document.");
    const rows = [...(result.data || [])].sort((left, right) => left.index - right.index);
    if (rows.length !== input.length || rows.some((row) => !Array.isArray(row.embedding) || row.embedding.length !== aiAssistantConfig.embeddingDimensions)) {
      throw new Error("The embedding provider returned an unexpected vector size.");
    }
    embeddings.push(...rows.map((row) => row.embedding));
    model = result.model || model;
  }
  return { embeddings, model };
}

function friendlyProcessingError(error) {
  const message = String(error?.message || "Document processing failed.");
  return message.length > 1_000 ? `${message.slice(0, 997)}...` : message;
}
