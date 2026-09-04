"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { getRequestAuthorizationHeaders } from "../lib/auth";

const PdfDocumentModalClient = dynamic(() => import("./PdfDocumentModalClient"), { ssr: false });

export default function OfficialDocumentViewer({ citation }) {
  const [document, setDocument] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const headers = await getRequestAuthorizationHeaders({ "Content-Type": "application/json" });
        const response = await fetch("/api/official-document-viewer", { method: "POST", headers, body: JSON.stringify({ citation }) });
        const result = await response.json().catch(() => ({}));
        if (!response.ok || !result?.success || !result.document?.title) throw new Error(result?.error || "This official-document citation is unavailable or has expired.");
        if (!active) return;
        const pdfUrl = `/api/official-document-viewer/pdf?citation=${encodeURIComponent(citation)}`;
        setDocument({
          title: result.document.title,
          citation: result.document.citation,
          initialPageNumber: result.document.pageNumber,
          file: { url: pdfUrl, httpHeaders: headers },
        });
      } catch (loadError) {
        if (active) setError(loadError.message || "This official-document citation is unavailable or has expired.");
      }
    }
    load();
    return () => { active = false; };
  }, [citation]);

  if (error) return <ViewerMessage title="Official LWR Pickleball Club Document" message={error}/>;
  if (!document) return <ViewerMessage title="Official LWR Pickleball Club Document" message="Loading the validated official document..."/>;
  return <PdfDocumentModalClient document={document} eyebrow="Official LWR Pickleball Club Document" initialPageNumber={document.initialPageNumber} pageMode/>;
}

function ViewerMessage({ title, message }) {
  return <main className="min-h-screen bg-slate-100 p-4 md:p-8"><section className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><p className="text-xs font-black uppercase tracking-[.14em] text-blue-700">{title}</p><p className="mt-3 text-sm font-semibold leading-6 text-slate-700">{message}</p></section></main>;
}
