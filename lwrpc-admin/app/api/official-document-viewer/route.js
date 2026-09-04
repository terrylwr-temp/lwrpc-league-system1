import { NextResponse } from "next/server";
import { resolveOfficialDocumentViewerSource } from "../../lib/aiOfficialDocumentViewer.js";
import { authorizeAdminRequest } from "../../lib/serverSupabase";

export const runtime = "nodejs";

export async function POST(req) {
  const authorization = await authorizeAdminRequest(req, "player");
  if (authorization.error) return failure(authorization.status);
  try {
    const { citation } = await req.json().catch(() => ({}));
    const source = await resolveOfficialDocumentViewerSource(authorization.supabase, citation, authorization.user.id);
    return NextResponse.json({ success: true, document: {
      title: source.documentTitle,
      citation: source.citation,
      pageNumber: source.pageNumber,
    } });
  } catch {
    return failure(404);
  }
}

function failure(status) {
  const error = status === 401 ? "Please sign in to view this official document." : "This official-document citation is unavailable or has expired.";
  return NextResponse.json({ success: false, error }, { status });
}
