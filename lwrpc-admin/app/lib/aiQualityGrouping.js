import { createHmac } from "node:crypto";

export const NORMALIZED_QUESTION_MAX_BYTES = 32768;
export const NORMALIZER_VERSION = 1;
export function normalizeQualityQuestion(value) {
  const normalized = String(value).normalize("NFC").replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, " ").trim().toLowerCase().replace(/\?+$/, "");
  assertNormalizedQuestion(normalized);
  return normalized;
}
export function assertNormalizedQuestion(value) {
  if (!value || Buffer.byteLength(value, "utf8") > NORMALIZED_QUESTION_MAX_BYTES) throw new Error("quality_normalized_size");
}
export function qualityFingerprint(question, origin, family, { key = process.env.AI_QUALITY_HMAC_KEY, keyVersion = Number(process.env.AI_QUALITY_HMAC_KEY_VERSION || 1) } = {}) {
  if (!key || Buffer.byteLength(key) < 32 || !Number.isInteger(keyVersion) || keyVersion < 1 || keyVersion > 32767) throw new Error("quality_key_configuration");
  const normalized_question = normalizeQualityQuestion(question);
  const input = [origin, family, String(NORMALIZER_VERSION), normalized_question].map(v => `${Buffer.byteLength(v, "utf8")}:${v}`).join("");
  return { normalized_question, normalizer_version: NORMALIZER_VERSION, key_version: keyVersion, fingerprint: createHmac("sha256", key).update(input).digest("hex") };
}
