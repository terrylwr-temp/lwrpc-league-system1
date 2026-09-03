import assert from "node:assert/strict";
import test from "node:test";
import { readAiAssistantConfig } from "../app/lib/aiAssistantConfig.js";

test("uses safe Ask LWR Pickleball AI defaults", () => {
  const config = readAiAssistantConfig({});

  assert.equal(config.enabled, false);
  assert.equal(config.documentsBucket, "ai-official-documents");
  assert.equal(config.embeddingModel, "text-embedding-3-small");
  assert.equal(config.embeddingDimensions, 1536);
  assert.equal(config.evidenceThreshold, 0.35);
});

test("uses valid server configuration and rejects invalid numeric values", () => {
  const config = readAiAssistantConfig({
    LWR_AI_ENABLED: "true",
    LWR_AI_DOCUMENTS_BUCKET: "club-official-rules",
    LWR_AI_CHAT_MODEL: "configured-chat-model",
    LWR_AI_RETRIEVAL_LIMIT: "12",
    LWR_AI_EVIDENCE_THRESHOLD: "0.6",
    LWR_AI_MAX_PDF_PAGES: "not-a-number",
  });

  assert.equal(config.enabled, true);
  assert.equal(config.documentsBucket, "club-official-rules");
  assert.equal(config.chatModel, "configured-chat-model");
  assert.equal(config.retrievalLimit, 12);
  assert.equal(config.evidenceThreshold, 0.6);
  assert.equal(config.maxPdfPages, 150);
});

