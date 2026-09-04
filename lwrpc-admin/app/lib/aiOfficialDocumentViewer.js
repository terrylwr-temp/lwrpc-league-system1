import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { resolveOfficialSources } from "./aiAnswerGeneration.js";

const TOKEN_TTL_MS = 15 * 60 * 1000;
const TOKEN_VERSION = 1;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function createOfficialDocumentViewerToken(source, userId, { now = Date.now() } = {}) {
  const claims = sourceClaims(source, userId);
  const payload = Buffer.from(JSON.stringify({ v: TOKEN_VERSION, exp: now + TOKEN_TTL_MS, ...claims }));
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", viewerTokenKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(payload), cipher.final()]);
  return [iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), ciphertext.toString("base64url")].join(".");
}

export function officialDocumentViewerHref(source, userId) {
  return `/official-document/${encodeURIComponent(createOfficialDocumentViewerToken(source, userId))}`;
}

export function readOfficialDocumentViewerToken(token, userId, { now = Date.now() } = {}) {
  const parts = String(token || "").split(".");
  if (parts.length !== 3 || parts.some((part) => !part || part.length > 4096)) throw new Error("This official-document citation is invalid or has expired.");
  try {
    const [iv, tag, ciphertext] = parts.map((part) => Buffer.from(part, "base64url"));
    const decipher = createDecipheriv("aes-256-gcm", viewerTokenKey(), iv);
    decipher.setAuthTag(tag);
    const claims = JSON.parse(Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8"));
    if (claims?.v !== TOKEN_VERSION || !Number.isFinite(claims.exp) || claims.exp <= now || claims.sub !== userId || !validClaims(claims)) throw new Error("invalid_claims");
    return claims;
  } catch {
    throw new Error("This official-document citation is invalid or has expired.");
  }
}

export async function resolveOfficialDocumentViewerSource(supabase, token, userId, { now = Date.now() } = {}) {
  const claims = readOfficialDocumentViewerToken(token, userId, { now });
  const [source] = await resolveOfficialSources(supabase, [{
    documentId: claims.documentId,
    documentVersionId: claims.documentVersionId,
    chunkId: claims.chunkId,
  }]);
  if (!source) throw new Error("This official-document citation is unavailable.");
  return source;
}

function sourceClaims(source, userId) {
  const claims = {
    sub: String(userId || ""), documentId: String(source?.documentId || ""),
    documentVersionId: String(source?.documentVersionId || ""), chunkId: String(source?.chunkId || ""),
  };
  if (!claims.sub || !validClaims(claims)) throw new Error("A validated official source is required to create a viewer link.");
  return claims;
}

function validClaims(claims) {
  return UUID.test(String(claims?.documentId || "")) && UUID.test(String(claims?.documentVersionId || "")) && UUID.test(String(claims?.chunkId || ""));
}

function viewerTokenKey() {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE || process.env.SERVICE_ROLE_KEY;
  if (!secret) throw new Error("Supabase server credentials are not configured.");
  return createHash("sha256").update("lwr-ai-official-document-viewer:v1:").update(secret).digest();
}
