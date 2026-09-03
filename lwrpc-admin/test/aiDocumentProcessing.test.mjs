import assert from "node:assert/strict";
import test from "node:test";
import {
  assertPdfUpload,
  chunkPdfPages,
  extractPdfPages,
  loadPdfJsForTextExtraction,
  sanitizePdfFilename,
  searchableChunksForEmbedding,
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

function createStructuredPdf(pageLines) {
  const pageCount = pageLines.length;
  const fontObject = 3 + pageCount * 2;
  const pageReferences = pageLines.map((_, index) => `${3 + index * 2} 0 R`).join(" ");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    `<< /Type /Pages /Kids [${pageReferences}] /Count ${pageCount} >>`,
  ];
  pageLines.forEach((lines, index) => {
    const pageObject = 3 + index * 2;
    const contentObject = pageObject + 1;
    const stream = ["BT", "/F1 12 Tf", "72 740 Td", ...lines.flatMap((line) => [`(${line.replace(/[\\()]/g, "\\$&")}) Tj`, "0 -16 Td"]), "ET", ""].join("\n");
    objects[pageObject - 1] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ${fontObject} 0 R >> >> /Contents ${contentObject} 0 R >>`;
    objects[contentObject - 1] = `<< /Length ${Buffer.byteLength(stream, "latin1")} >>\nstream\n${stream}endstream`;
  });
  objects[fontObject - 1] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";
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

test("creates logical rule chunks, preserves page association, and excludes a table of contents", async () => {
  const extracted = await extractPdfPages(createStructuredPdf([
    [
      "Copyright 2026 LWRPC Revised: 9/1/2026 Page 1",
      "DUPR League Rules Contents",
      "4.5 RETIRED GAMES ................ 1",
      "5.0 SCORING FREEZE ................ 2",
      "4.5 RETIRED GAMES",
      "4.5.1 Record the retired game with the score when play stopped.",
      "The captain must include the retirement reason.",
    ],
    [
      "Copyright 2026 LWRPC Revised: 9/1/2026 Page 2",
      "The same retirement rule continues on this page.",
      "4.5.2 Captains should record the result promptly.",
      "5.0 SCORING FREEZE",
      "5.1 Scores freeze after the published deadline.",
    ],
  ]));
  const chunks = chunkPdfPages(extracted.pages);
  const toc = chunks.find((chunk) => chunk.heading === "Table of Contents");
  const retired = chunks.filter((chunk) => chunk.ruleNumber === "4.5");
  const scoring = chunks.find((chunk) => chunk.ruleNumber === "5.0");

  assert.ok(toc);
  assert.equal(toc.isSearchable, false);
  assert.match(toc.content, /SCORING FREEZE/);
  assert.equal(retired.length, 2);
  assert.deepEqual(retired.map((chunk) => chunk.pageNumber), [1, 2]);
  assert.ok(retired.every((chunk) => chunk.sectionLabel === "Rule 4.5"));
  assert.match(retired[1].content, /same retirement rule continues/i);
  assert.ok(scoring);
  assert.equal(scoring.pageNumber, 2);
  assert.equal(scoring.heading, "SCORING FREEZE");
  assert.ok(chunks.filter((chunk) => chunk.pageNumber === 2 && chunk.isSearchable).length >= 2);
  assert.ok(chunks.every((chunk) => !/Copyright 2026 LWRPC|Revised: 9\/1\/2026|Page [12]/.test(chunk.content)));

  const embeddingInputs = searchableChunksForEmbedding(chunks);
  assert.ok(embeddingInputs.every((chunk) => chunk.isSearchable));
  assert.ok(!embeddingInputs.some((chunk) => chunk.heading === "Table of Contents"));
  assert.ok(embeddingInputs.some((chunk) => chunk.ruleNumber === "4.5"));
});
