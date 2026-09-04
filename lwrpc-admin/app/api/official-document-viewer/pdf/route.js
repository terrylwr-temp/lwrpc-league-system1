import { NextResponse } from "next/server";
import { resolveOfficialDocumentViewerSource } from "../../../lib/aiOfficialDocumentViewer.js";
import { authorizeAdminRequest } from "../../../lib/serverSupabase";

export const runtime = "nodejs";

export async function GET(req) {
  const authorization = await authorizeAdminRequest(req, "player");
  if (authorization.error) return new NextResponse("Not authorized.", { status: authorization.status });
  try {
    const citation = new URL(req.url).searchParams.get("citation");
    const source = await resolveOfficialDocumentViewerSource(authorization.supabase, citation, authorization.user.id);
    const { data, error } = await authorization.supabase.storage.from(source.storageBucket).download(source.storagePath);
    if (error || !data) throw new Error("pdf_unavailable");
    return new NextResponse(data, {
      headers: {
        "Content-Type": "application/pdf",
        "Cache-Control": "private, no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new NextResponse("Official document unavailable.", { status: 404 });
  }
}
