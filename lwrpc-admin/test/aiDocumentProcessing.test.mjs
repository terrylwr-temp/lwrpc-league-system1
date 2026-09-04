import assert from "node:assert/strict";
import test from "node:test";
import {
  assertPdfUpload,
  chunkPdfPages,
  extractionWarnings,
  extractPdfPages,
  loadPdfJsForTextExtraction,
  normalizePdfTextItems,
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

test("normalizes structural bullets and PDF whitespace while preserving meaningful Unicode", () => {
  const result = normalizePdfTextItems([
    { str: "\uf0b7", fontName: "subset-symbol", transform: [10, 0, 0, 10, 90, 500], width: 5, height: 10 },
    { str: " ", fontName: "subset-symbol", transform: [10, 0, 0, 10, 95, 500], width: 12, height: 0 },
    { str: "Golden\u00a0Rule:\u200b Treat", fontName: "body", transform: [10, 0, 0, 10, 108, 500], width: 100, height: 10, hasEOL: true },
    { str: "Café ™ © — ‘quoted’", fontName: "body", transform: [10, 0, 0, 10, 72, 480], width: 100, height: 10, hasEOL: true },
  ]);
  assert.deepEqual(result.lines, ["• Golden Rule: Treat", "Café ™ © — ‘quoted’"]);
  assert.equal(result.diagnostics.structuralBullets, 1);
});

test("repairs only the verified broken ff ligature context and safely dehyphenates soft line breaks", () => {
  const result = normalizePdfTextItems([
    { str: "O", transform: [16, 0, 0, 16, 228, 655], width: 12, height: 16 },
    { str: "Ư", fontName: "subset-heading", transform: [16, 0, 0, 16, 240, 655], width: 11, height: 16 },
    { str: "icial Code", transform: [16, 0, 0, 16, 251, 655], width: 80, height: 16, hasEOL: true },
    { str: "co\u00ad", transform: [12, 0, 0, 12, 72, 620], width: 15, height: 12, hasEOL: true },
    { str: "operate", transform: [12, 0, 0, 12, 72, 604], width: 40, height: 12, hasEOL: true },
    { str: "well-", transform: [12, 0, 0, 12, 72, 588], width: 30, height: 12, hasEOL: true },
    { str: "known", transform: [12, 0, 0, 12, 72, 572], width: 30, height: 12, hasEOL: true },
  ]);
  assert.deepEqual(result.lines, ["Official Code", "cooperate", "well-", "known"]);
  assert.equal(result.diagnostics.verifiedLigatureRepairs, 1);
  assert.deepEqual(extractionWarnings(result.diagnostics), ["Recovered 1 verified PDF ligature mapping artifact(s). Review the affected text before activation."]);
});

test("warns rather than guessing about unrecoverable replacement, private-use, and unusual embedded glyphs", () => {
  const result = normalizePdfTextItems([
    { str: "Bad \ufffd glyph", transform: [12, 0, 0, 12, 72, 500], width: 60, height: 12, hasEOL: true },
    { str: "Unknown \ue123 glyph", transform: [12, 0, 0, 12, 72, 484], width: 60, height: 12, hasEOL: true },
    { str: "AƯB", transform: [12, 0, 0, 12, 72, 468], width: 30, height: 12, hasEOL: true },
  ]);
  const warnings = extractionWarnings(result.diagnostics);
  assert.equal(result.lines[2], "AƯB");
  assert.match(warnings.join("\n"), /replacement character/i);
  assert.match(warnings.join("\n"), /private-use glyph/i);
  assert.match(warnings.join("\n"), /unusual character sequence/i);
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

test("passes normalized searchable content, not raw glyph artifacts, into logical chunks and embeddings", () => {
  const normalized = normalizePdfTextItems([
    { str: "CONTENTS", transform: [12, 0, 0, 12, 72, 700], width: 50, height: 12, hasEOL: true },
    { str: "4.5 RETIRED GAMES .... 2", transform: [12, 0, 0, 12, 72, 684], width: 100, height: 12, hasEOL: true },
    { str: "4.5 RETIRED GAMES", transform: [12, 0, 0, 12, 72, 650], width: 100, height: 12, hasEOL: true },
    { str: "\uf0b7", fontName: "subset-symbol", transform: [12, 0, 0, 12, 72, 634], width: 5, height: 12 },
    { str: "Record the score when play stopped.", transform: [12, 0, 0, 12, 88, 634], width: 150, height: 12, hasEOL: true },
  ]);
  const chunks = chunkPdfPages([{ pageNumber: 1, lines: normalized.lines }]);
  const searchable = searchableChunksForEmbedding(chunks);
  assert.ok(chunks.some((chunk) => chunk.heading === "Table of Contents" && chunk.isSearchable === false));
  assert.ok(searchable.every((chunk) => !/[\uf0b7\ufffd]/.test(chunk.content)));
  assert.ok(searchable.some((chunk) => chunk.content.includes("• Record the score")));
});

test("keeps USAP rule identities and cross-page outcomes together while excluding structural navigation", () => {
  const chunks = chunkPdfPages([
    { pageNumber: 1, lines: ["2026", "OFFICIAL", "RULEBOOK"] },
    { pageNumber: 4, lines: ["i", "2026 USA Pickleball Official Rulebook © Copyright – All rights reserved", "TABLE OF CONTENTS", "Section 20 Tournament Match Situations ........ 47", "Section 25 Wheelchair Play", "........................................ 65"] },
    { pageNumber: 5, lines: ["ii", "Section 25 Wheelchair Play ........ 65", "Index ................................ 83"] },
    { pageNumber: 6, lines: ["1", "2026 USA Pickleball Official Rulebook © Copyright – All rights reserved", "Section 3 Court and Equipment", "3.A.4.c Non-Volley Zone. The 7-foot by 20-foot area is part of the court."] },
    { pageNumber: 52, lines: ["47", "2026 USA Pickleball Official Rulebook © Copyright – All rights reserved", "Section 20 Tournament Match Situations", "20.E.1 Faults. The referee will call faults for service violations.", "20.E.1.e Fault – Volley Serve and Drop Serve, Spin or Manipulation on Release. When the server"] },
    { pageNumber: 53, lines: ["48", "2026 USA Pickleball Official Rulebook © Copyright – All rights reserved", "manipulates or spins the ball immediately prior to the serve, it is a fault against the server.", "20.E.1.f Fault – Drop Serve. When the server propels the ball, it is a fault."] },
    { pageNumber: 72, lines: ["67", "25.A.10.c Fault – Failure to Exit the Non-Volley Zone Before Volleying. After contacting the non-volley zone, when a player volleys"] },
    { pageNumber: 73, lines: ["68", "the ball before both rear wheels are outside the non-volley zone, it is a fault against the player.", "25.A.11 Playing Surface Dimensions. The recommended area is 44 feet wide."] },
    { pageNumber: 85, lines: ["80", "INDEX", "10-second rule 6.D", "non-volley zone 3.A.4.c"] },
  ], { documentType: "usap_rulebook" });
  const toc = chunks.find((chunk) => chunk.heading === "Table of Contents");
  assert.ok(toc);
  assert.equal(toc.isSearchable, false);
  assert.ok(!searchableChunksForEmbedding(chunks).some((chunk) => /TABLE OF CONTENTS|10-second rule 6\.D/i.test(chunk.content)));
  const early = chunks.find((chunk) => chunk.ruleNumber === "3.A.4.c");
  const middle = chunks.find((chunk) => chunk.ruleNumber === "20.E.1.e");
  const late = chunks.find((chunk) => chunk.ruleNumber === "25.A.10.c");
  assert.equal(early.pageNumber, 6);
  assert.equal(middle.pageNumber, 52);
  assert.equal(late.pageNumber, 72);
  assert.match(middle.content, /When the server\nmanipulates or spins the ball/i);
  assert.match(middle.content, /fault against the server\.$/i);
  assert.match(late.content, /fault against the player\.$/i);
  assert.deepEqual(chunks.filter((chunk) => chunk.ruleNumber).map((chunk) => chunk.ruleNumber), ["3.A.4.c", "20.E.1", "20.E.1.e", "20.E.1.f", "25.A.10.c", "25.A.11"]);
  assert.ok(!chunks.some((chunk) => chunk.ruleNumber === "2026" || chunk.ruleNumber === "6.08"));
});
