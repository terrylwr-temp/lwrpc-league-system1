import { createHash } from "node:crypto";
import { WorkerMessageHandler } from "pdfjs-dist/legacy/build/pdf.worker.mjs";
import { aiAssistantConfig } from "./aiAssistantConfig.js";

const MAX_CHUNK_CHARACTERS = 1_800;
const MIN_LOGICAL_CHUNK_CHARACTERS = 320;
const EMBEDDING_BATCH_SIZE = 40;
const STRUCTURAL_BULLET_GLYPHS = new Set(["\u2022", "\u25aa", "\u25cf", "\u25a0", "\u25a1", "\uf0b7"]);
const UNUSUAL_SPACE_PATTERN = /[\u00a0\u1680\u2000-\u200a\u202f\u205f\u3000]/g;
const ZERO_WIDTH_PATTERN = /[\u200b-\u200d\u2060\ufeff]/g;

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
  const diagnostics = createExtractionDiagnostics();
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const lines = textLines(content.items || [], diagnostics);
    const text = lines.join("\n").trim();
    if (text) pages.push({ pageNumber, lines, text });
  }

  await task.destroy();
  if (pages.length === 0) throw new Error("No readable text was found in this PDF. A text-based official PDF is required.");
  return { pageCount: pdf.numPages, pages, warnings: extractionWarnings(diagnostics), diagnostics };
}

export function normalizePdfTextItems(items, diagnostics = createExtractionDiagnostics()) {
  const lines = [];
  let currentItems = [];
  for (const item of items || []) {
    currentItems.push(item || {});
    if (item?.hasEOL) {
      flush();
    }
  }
  flush();
  return { lines: safelyDehyphenateLines(lines), diagnostics };

  function flush() {
    const line = reconstructVisualLine(currentItems, diagnostics);
    if (line.text) lines.push(line);
    currentItems = [];
  }
}

function textLines(items, diagnostics) {
  return normalizePdfTextItems(items, diagnostics).lines;
}

function reconstructVisualLine(items, diagnostics) {
  let text = "";
  let previous = null;
  let trailingSoftHyphen = false;
  for (let index = 0; index < items.length; index += 1) {
    const item = items[index] || {};
    const raw = String(item.str || "");
    if (!raw) continue;
    const structuralBullet = text.trim().length === 0 && isStructuralBulletItem(item, items.slice(index + 1));
    const normalized = normalizeRawPdfText(raw, diagnostics, structuralBullet);
    if (!normalized) continue;
    if (text && needsInjectedSpace(previous, item, text, normalized)) text += " ";
    text += normalized;
    trailingSoftHyphen = /\u00ad\s*$/.test(normalized);
    previous = item;
  }
  const repaired = repairVerifiedLigatureArtifact(text, diagnostics)
    .replace(/\u00ad/g, "")
    .replace(/\s+/g, " ")
    .trim();
  observeSuspiciousText(repaired, diagnostics);
  return { text: repaired, trailingSoftHyphen };
}

function normalizeRawPdfText(value, diagnostics, structuralBullet) {
  if (structuralBullet) {
    diagnostics.structuralBullets += 1;
    return "•";
  }
  const replacements = (value.match(/\ufffd/g) || []).length;
  diagnostics.replacementCharacters += replacements;
  return value
    .replace(UNUSUAL_SPACE_PATTERN, " ")
    .replace(ZERO_WIDTH_PATTERN, "");
}

function isStructuralBulletItem(item, followingItems) {
  const glyph = String(item?.str || "").trim();
  if (!STRUCTURAL_BULLET_GLYPHS.has(glyph)) return false;
  const nextItem = (followingItems || []).find((candidate) => String(candidate?.str || "").trim());
  const next = String(nextItem?.str || "").trim();
  if (!next) return false;
  const y = Number(item?.transform?.[5]);
  const nextY = Number(nextItem?.transform?.[5]);
  return Number.isFinite(y) && Number.isFinite(nextY) && Math.abs(y - nextY) < 0.5;
}

function needsInjectedSpace(previous, item, existingText, value) {
  if (!previous || /\s$/.test(existingText) || /^\s/.test(value)) return false;
  const previousEnd = Number(previous?.transform?.[4]) + Number(previous?.width || 0);
  const nextStart = Number(item?.transform?.[4]);
  const fontSize = Math.max(Number(previous?.height || 0), Number(item?.height || 0), 1);
  if (!Number.isFinite(previousEnd) || !Number.isFinite(nextStart)) return true;
  // Adjacent PDF text runs with a negligible gap are one word (for example,
  // the three runs that form "O" + bad ligature + "icial").
  return nextStart - previousEnd > Math.max(1.25, fontSize * 0.14);
}

function repairVerifiedLigatureArtifact(text, diagnostics) {
  // The Code of Conduct source maps its visual `ff` ligature to U+01AF in
  // its ToUnicode table. Restrict repair to the impossible-in-English run
  // o/U+01AF/i so legitimate U+01AF characters remain untouched elsewhere.
  const repaired = text.replace(/([oO])\u01af(?=[iI])/g, "$1ff");
  const count = [...text.matchAll(/([oO])\u01af(?=[iI])/g)].length;
  diagnostics.verifiedLigatureRepairs += count;
  return repaired;
}

function safelyDehyphenateLines(lines) {
  const output = [];
  for (const line of lines) {
    const previous = output[output.length - 1];
    // A soft hyphen is inserted solely as a layout break. A regular hyphen is
    // not safe to remove without guessing official language, so it is kept.
    if (previous?.trailingSoftHyphen && /^[a-z]/.test(line.text)) {
      previous.text = `${previous.text}${line.text}`.replace(/\s+/g, " ");
      previous.trailingSoftHyphen = false;
    } else output.push({ ...line });
  }
  return output.map((line) => line.text);
}

function createExtractionDiagnostics() {
  return {
    replacementCharacters: 0,
    structuralBullets: 0,
    verifiedLigatureRepairs: 0,
    privateUseCharacters: 0,
    suspiciousEmbeddedCharacters: 0,
  };
}

export function extractionWarnings(diagnostics) {
  const warnings = [];
  if (diagnostics.verifiedLigatureRepairs > 0) warnings.push(`Recovered ${diagnostics.verifiedLigatureRepairs} verified PDF ligature mapping artifact(s). Review the affected text before activation.`);
  if (diagnostics.structuralBullets > 0) warnings.push(`Normalized ${diagnostics.structuralBullets} structural list bullet glyph(s).`);
  if (diagnostics.replacementCharacters > 0) warnings.push(`PDF extraction still contains ${diagnostics.replacementCharacters} Unicode replacement character(s); inspect this PDF before activation.`);
  if (diagnostics.privateUseCharacters > 0) warnings.push(`PDF extraction contains ${diagnostics.privateUseCharacters} unsupported private-use glyph(s); inspect this PDF before activation.`);
  if (diagnostics.suspiciousEmbeddedCharacters > 0) warnings.push(`PDF extraction contains ${diagnostics.suspiciousEmbeddedCharacters} unusual character sequence(s) that were not safely repaired; inspect this PDF before activation.`);
  return warnings;
}

function observeSuspiciousText(text, diagnostics) {
  diagnostics.privateUseCharacters += (text.match(/[\ue000-\uf8ff]/g) || []).length;
  diagnostics.suspiciousEmbeddedCharacters += (text.match(/[A-Za-z]\u01af[A-Za-z]/g) || []).length;
}

export function chunkPdfPages(pages, {
  maxCharacters = MAX_CHUNK_CHARACTERS,
  minCharacters = MIN_LOGICAL_CHUNK_CHARACTERS,
} = {}) {
  const chunks = [];
  let carriedMetadata = emptyMetadata();

  for (const page of normalizePdfPages(pages)) {
    let metadata = carriedMetadata;
    let lines = [];
    let isSearchable = true;
    const flush = () => {
      const content = lines.join("\n").trim();
      if (content) chunks.push({ pageNumber: page.pageNumber, ...metadata, content, isSearchable });
      lines = [];
    };

    for (const entry of page.entries) {
      if (!entry.isSearchable) {
        if (isSearchable) flush();
        isSearchable = false;
        metadata = { sectionLabel: "Table of Contents", ruleNumber: "", heading: "Table of Contents" };
        appendLine(entry.line, { force: false });
        continue;
      }

      if (!isSearchable) {
        flush();
        isSearchable = true;
        metadata = carriedMetadata;
      }

      const boundary = headingMetadata(entry.line);
      if (boundary && shouldStartNewChunk(lines, metadata, boundary, minCharacters)) {
        flush();
        metadata = boundary;
      }
      appendLine(entry.line, { force: Boolean(boundary) });
    }
    flush();
    carriedMetadata = isSearchable ? metadata : emptyMetadata();

    function appendLine(line, { force }) {
      const candidate = lines.length ? `${lines.join("\n")}\n${line}` : line;
      if (lines.length && candidate.length > maxCharacters && (lines.join("\n").length >= minCharacters || force)) {
        flush();
      }
      if (line.length > maxCharacters) {
        splitChunkText(line, maxCharacters).forEach((part) => {
          if (part !== line) chunks.push({ pageNumber: page.pageNumber, ...metadata, content: part, isSearchable });
        });
        if (line.length > maxCharacters) return;
      }
      lines.push(line);
    }
  }
  return chunks.map((chunk, index) => ({ ...chunk, chunkOrdinal: index + 1 }));
}

export function searchableChunksForEmbedding(chunks) {
  return chunks.filter((chunk) => chunk.isSearchable !== false);
}

function emptyMetadata() {
  return { sectionLabel: "", ruleNumber: "", heading: "" };
}

function normalizePdfPages(pages) {
  const edgeLineCounts = new Map();
  const rawPages = pages.map((page) => ({
    pageNumber: page.pageNumber,
    lines: (page.lines || []).map((line) => String(line || "").replace(/\s+/g, " ").trim()).filter(Boolean),
  }));
  for (const page of rawPages) {
    page.lines.forEach((line, index) => {
      if (!isNearPageEdge(index, page.lines.length)) return;
      const key = headerFooterKey(line);
      edgeLineCounts.set(key, (edgeLineCounts.get(key) || 0) + 1);
    });
  }

  return rawPages.map((page) => {
    const cleanLines = page.lines.filter((line, index) => !isRepeatedHeaderOrFooter(line, index, page.lines.length, edgeLineCounts));
    return { pageNumber: page.pageNumber, entries: annotateTableOfContents(cleanLines) };
  });
}

function isNearPageEdge(index, length) {
  return index < 2 || index >= Math.max(0, length - 2);
}

function headerFooterKey(line) {
  return line.toLowerCase().replace(/page\s+\d+(?:\s+of\s+\d+)?/g, "page #").replace(/\d{1,2}\/\d{1,2}\/\d{2,4}/g, "date");
}

function isRepeatedHeaderOrFooter(line, index, length, edgeLineCounts) {
  if (!isNearPageEdge(index, length) || isStructuralLine(line)) return false;
  const obvious = /(?:©|copyright|\brevised\s*:|\bpage\s+\d+(?:\s+of\s+\d+)?\b)/i.test(line);
  return obvious || (edgeLineCounts.get(headerFooterKey(line)) || 0) >= 2;
}

function annotateTableOfContents(lines) {
  const tocStart = lines.findIndex((line) => /\b(?:table of )?contents?\b/i.test(line));
  if (tocStart < 0) return lines.map((line) => ({ line, isSearchable: true }));
  let inToc = true;
  return lines.map((line, index) => {
    if (index < tocStart) return { line, isSearchable: false };
    if (inToc && index > tocStart && !isTocLine(line) && headingMetadata(line)) inToc = false;
    return { line, isSearchable: !inToc };
  });
}

function isTocLine(line) {
  return /\.{3,}\s*\d+\s*$/.test(line) || /\b(?:table of )?contents?\b/i.test(line);
}

function isStructuralLine(line) {
  return Boolean(headingMetadata(line));
}

function headingMetadata(line) {
  const value = String(line || "").trim();
  if (!value || value.length > 180) return null;
  const explicit = value.match(/^(rule|section|article)\s+(\d+(?:\.\d+){0,4})\.?\s*(?::|\-|\s)\s*(.+)$/i);
  if (explicit) {
    return {
      sectionLabel: `${explicit[1]} ${explicit[2]}`,
      ruleNumber: explicit[1].toLowerCase() === "rule" ? explicit[2] : "",
      heading: explicit[3].trim(),
    };
  }
  const numbered = value.match(/^(\d+(?:\.\d+){0,4})\.?\s+(.+)$/);
  if (numbered) {
    const title = numbered[2].trim();
    return { sectionLabel: `Rule ${numbered[1]}`, ruleNumber: numbered[1], heading: headingFromRuleTitle(title) };
  }
  const league = value.match(/^(Weekday|Saturday|PrimeTime)\s+(?:DUPR\s+)?League\b.*$/i);
  if (league) return { sectionLabel: league[0], ruleNumber: "", heading: league[0] };
  if (value.length <= 110 && /[A-Za-z]/.test(value) && value === value.toUpperCase() && value.split(/\s+/).length <= 12) {
    return { sectionLabel: value, ruleNumber: "", heading: value };
  }
  return null;
}

function headingFromRuleTitle(title) {
  const labeled = title.match(/^(.{3,110}?):\s+/);
  if (labeled) return labeled[1].trim();
  return title.length <= 85 && title === title.toUpperCase() ? title : "";
}

function shouldStartNewChunk(lines, current, next, minCharacters) {
  if (lines.length === 0) return true;
  if (!next.ruleNumber || !current.ruleNumber) return true;
  if (next.ruleNumber.startsWith(`${current.ruleNumber}.`)) return false;
  const sharedParent = commonRuleParent(current.ruleNumber, next.ruleNumber);
  return !(sharedParent && lines.join("\n").length < minCharacters);
}

function commonRuleParent(left, right) {
  const leftParts = left.split(".");
  const rightParts = right.split(".");
  const shared = [];
  for (let index = 0; index < Math.min(leftParts.length, rightParts.length); index += 1) {
    if (leftParts[index] !== rightParts[index]) break;
    shared.push(leftParts[index]);
  }
  return shared.length ? shared.join(".") : "";
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
    if (!aiAssistantConfig.enabled) throw new Error("Ask LWR Pickleball Club AI processing is disabled. Set LWR_AI_ENABLED=true on the server.");
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
    const searchableChunks = searchableChunksForEmbedding(chunks);
    if (chunks.length === 0 || searchableChunks.length === 0) {
      throw new Error("No searchable sections could be created from this PDF.");
    }
    const embedded = await createEmbeddings(searchableChunks.map((chunk) => chunk.content));
    const embeddingByOrdinal = new Map(searchableChunks.map((chunk, index) => [chunk.chunkOrdinal, embedded.embeddings[index]]));

    const { error: deleteError } = await supabase.from("ai_document_chunks").delete().eq("document_version_id", versionId);
    if (deleteError) throw deleteError;

    for (let offset = 0; offset < chunks.length; offset += EMBEDDING_BATCH_SIZE) {
      const rows = chunks.slice(offset, offset + EMBEDDING_BATCH_SIZE).map((chunk) => ({
        document_version_id: versionId,
        chunk_ordinal: chunk.chunkOrdinal,
        page_number: chunk.pageNumber,
        section_label: chunk.sectionLabel || null,
        rule_number: chunk.ruleNumber || null,
        heading: chunk.heading || null,
        content: chunk.content,
        embedding: embeddingByOrdinal.get(chunk.chunkOrdinal) || null,
        embedding_model: chunk.isSearchable === false ? null : embedded.model,
        // Non-searchable chunks (such as a table of contents) stay available
        // for administrative preview while the retrieval query must exclude
        // them through this flag and its partial vector index.
        is_searchable: chunk.isSearchable !== false,
      }));
      const { error: insertError } = await supabase.from("ai_document_chunks").insert(rows);
      if (insertError) throw insertError;
    }

    const warnings = [
      ...(extracted.warnings || []),
      ...(extracted.pages.length < extracted.pageCount
        ? [`${extracted.pageCount - extracted.pages.length} page(s) contained no readable text.`]
        : []),
    ];
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
