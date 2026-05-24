"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/auth";

export default function LoginMessageModal({ templateKey, audienceLabel }) {
  const [message, setMessage] = useState(null);
  const [dismiss, setDismiss] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadMessage() {
      const { data } = await supabase
        .from("notification_templates")
        .select("id, subject, body, updated_at")
        .eq("template_key", templateKey)
        .maybeSingle();

      if (!active || !data?.body?.trim()) return;

      const dismissKey = loginMessageDismissKey(data);
      if (window.localStorage.getItem(dismissKey) === "true") return;

      setMessage({ ...data, dismissKey });
    }

    loadMessage();

    return () => {
      active = false;
    };
  }, [templateKey]);

  if (!message) return null;

  function closeMessage() {
    if (dismiss) {
      window.localStorage.setItem(message.dismissKey, "true");
    }

    setMessage(null);
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/70 p-4">
      <div className="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="bg-slate-950 px-5 py-4 text-white">
          <div className="text-xs font-black uppercase tracking-wide text-blue-200">
            {audienceLabel || "League Message"}
          </div>
          <h2 className="mt-1 text-xl font-black">
            {message.subject || "League Message"}
          </h2>
        </div>

        <div className="space-y-4 p-5">
          <div className="whitespace-pre-wrap text-sm font-semibold leading-6 text-slate-700">
            {message.body}
          </div>

          <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={dismiss}
              onChange={(event) => setDismiss(event.target.checked)}
            />
            <span>Do not show this message again</span>
          </label>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={closeMessage}
              className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-bold text-white hover:bg-blue-800"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function loginMessageDismissKey(message) {
  return `lwrpc-login-message-dismissed:${message.id}:${message.updated_at || ""}`;
}
