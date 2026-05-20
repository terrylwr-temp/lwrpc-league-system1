"use client";

import { useEffect, useState } from "react";

const PRINT_PAYLOAD_KEY = "lwrpc-print-payload";

export default function PrintPage() {
  const [payload, setPayload] = useState(null);

  useEffect(() => {
    const raw = window.localStorage.getItem(PRINT_PAYLOAD_KEY);

    if (raw) {
      try {
        setPayload(JSON.parse(raw));
      } catch {
        setPayload(null);
      }
    }
  }, []);

  useEffect(() => {
    if (!payload) return;

    document.title = payload.title || "LWRPC Printout";
    const timer = window.setTimeout(() => window.print(), 300);
    return () => window.clearTimeout(timer);
  }, [payload]);

  if (!payload) {
    return (
      <main className="min-h-screen bg-white p-8 text-slate-700">
        Print preview is not available. Return to the app and try again.
      </main>
    );
  }

  return (
    <main className="print-document bg-white text-slate-900">
      <style>{`
        @page {
          margin: 0.65in 0.55in 0.85in;
          @bottom-left {
            content: "© ${new Date().getFullYear()} Lakewood Ranch Pickleball Club. All rights reserved.";
            font-family: Arial, sans-serif;
            font-size: 9px;
            color: #475569;
          }
          @bottom-right {
            content: "Page " counter(page);
            font-family: Arial, sans-serif;
            font-size: 9px;
            color: #475569;
          }
        }

        body {
          background: white;
        }

        .print-document {
          font-family: Arial, sans-serif;
          padding: 32px;
        }

        .print-footer {
          display: none;
        }

        @media print {
          .print-document {
            padding: 0;
          }

          .print-footer {
            position: fixed;
            bottom: -0.55in;
            left: 0;
            right: 0;
            display: flex;
            justify-content: space-between;
            border-top: 1px solid #cbd5e1;
            padding-top: 6px;
            font-size: 9px;
            color: #475569;
          }

          .screen-note {
            display: none;
          }
        }
      `}</style>

      <div className="screen-note mb-4 rounded-xl bg-slate-100 p-4 text-sm text-slate-600">
        Print preview should open automatically. If your browser still shows its own URL/footer, turn off browser print headers and footers in the print dialog.
      </div>

      <div dangerouslySetInnerHTML={{ __html: payload.body || "" }} />

      <footer className="print-footer">
        <span>© {new Date().getFullYear()} Lakewood Ranch Pickleball Club. All rights reserved.</span>
        <span>Page <span className="page-number" /></span>
      </footer>
    </main>
  );
}
