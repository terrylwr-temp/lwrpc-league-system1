import assert from "node:assert/strict";
import test from "node:test";
import {
  assertPdfUpload,
  chunkPdfPages,
  extractPdfPages,
  loadPdfJsForTextExtraction,
  sanitizePdfFilename,
} from "../app/lib/aiDocumentProcessing.js";

function createTextPdf(text) {
  const stream = `BT\n/F1 18 Tf\n72 720 Td\n(${text.replace(/[\\()]/g, "\\$&")}) Tj\nET\n`;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
    `<< /Length ${Buffer.byteLength(stream, "latin1")} >>\nstream\n${stream}endstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let output = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(output, "latin1"));
    output += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = Buffer.byteLength(output, "latin1");
  output += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  output += offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`).join("");
  output += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  return Buffer.from(output, "latin1");
}

async function withoutBrowserDomGlobals(callback) {
  const names = ["DOMMatrix", "Path2D", "ImageData", "window", "document"];
  const descriptors = new Map(names.map((name) => [name, Object.getOwnPropertyDescriptor(globalThis, name)]));
  try {
    for (const name of names) delete globalThis[name];
    return await callback();
  } finally {
    for (const name of names) {
      const descriptor = descriptors.get(name);
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else delete globalThis[name];
    }
  }
}

test("sanitizes PDF filenames without losing the extension", () => {
  assert.equal(sanitizePdfFilename("Weekday Rules (final).PDF"), "Weekday-Rules-final.PDF");
  assert.equal(sanitizePdfFilename("../../unsafe"), "unsafe.pdf");
});

test("keeps detected rule context and page metadata with each chunk", () => {
  const chunks = chunkPdfPages([{ pageNumber: 6, lines: ["RULE 4.2 Retired Games", "A retired game is recorded according to this rule."] }]);
  assert.equal(chunks.length, 1);
  assert.equal(chunks[0].pageNumber, 6);
  assert.equal(chunks[0].ruleNumber, "4.2");
  assert.equal(chunks[0].heading, "Retired Games");
  assert.match(chunks[0].content, /retired game/i);
});

test("rejects non-PDF file signatures", () => {
  assert.throws(
    () => assertPdfUpload({ size: 5, arrayBuffer() {} }, Buffer.from("hello")),
    /valid PDF/i
  );
});

test("extracts text from an actual PDF on the server without browser DOM globals", async () => {
  await withoutBrowserDomGlobals(async () => {
    assert.equal(globalThis.DOMMatrix, undefined);
    assert.equal(globalThis.Path2D, undefined);
    assert.equal(globalThis.ImageData, undefined);
    assert.equal(globalThis.window, undefined);
    assert.equal(globalThis.document, undefined);

    const { GlobalWorkerOptions } = await loadPdfJsForTextExtraction();
    const workerSrc = GlobalWorkerOptions.workerSrc;
    // This is the missing Vercel path from the production failure. Successful
    // extraction proves the preloaded same-thread worker is used instead.
    GlobalWorkerOptions.workerSrc = "file:///var/task/lwrpc-admin/.next/server/chunks/pdf.worker.mjs";
    let extracted;
    try {
      extracted = await extractPdfPages(createTextPdf("Official Rule 4.2 Retired Games"));
    } finally {
      GlobalWorkerOptions.workerSrc = workerSrc;
    }
    assert.equal(extracted.pageCount, 1);
    assert.equal(extracted.pages.length, 1);
    assert.match(extracted.pages[0].text, /Official Rule 4\.2 Retired Games/);
    // PDF.js may opportunistically install its optional Node canvas helpers in
    // local development. The production text path must not depend on them.
    assert.equal(globalThis.window, undefined);
    assert.equal(globalThis.document, undefined);
  });
});
