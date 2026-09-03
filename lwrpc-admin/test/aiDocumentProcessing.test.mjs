import assert from "node:assert/strict";
import test from "node:test";
import { assertPdfUpload, chunkPdfPages, sanitizePdfFilename } from "../app/lib/aiDocumentProcessing.js";

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

