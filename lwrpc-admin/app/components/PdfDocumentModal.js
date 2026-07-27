"use client";

import dynamic from "next/dynamic";

const PdfDocumentModalClient = dynamic(() => import("./PdfDocumentModalClient"), {
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/70 p-4">
      <div className="rounded-2xl bg-white px-6 py-5 text-sm font-bold text-slate-700 shadow-2xl">
        Loading document viewer...
      </div>
    </div>
  ),
});

export default function PdfDocumentModal(props) {
  return <PdfDocumentModalClient {...props} />;
}
