"use client";

import { useEffect, useRef } from "react";

const SCRIPT_ID = "cloudflare-turnstile-script";
const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

export default function TurnstileWidget({ action = "password_reset", onToken }) {
  const containerRef = useRef(null);
  const onTokenRef = useRef(onToken);

  useEffect(() => {
    onTokenRef.current = onToken;
  }, [onToken]);

  useEffect(() => {
    const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
    if (!siteKey) {
      onTokenRef.current("");
      return undefined;
    }

    let widgetId = null;
    let cancelled = false;

    const renderWidget = () => {
      if (cancelled || !containerRef.current || !window.turnstile || widgetId !== null) return;

      widgetId = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        action,
        theme: "auto",
        callback: (token) => onTokenRef.current(String(token || "")),
        "expired-callback": () => onTokenRef.current(""),
        "error-callback": () => onTokenRef.current(""),
      });
    };

    const script = document.getElementById(SCRIPT_ID);
    if (window.turnstile) {
      renderWidget();
    } else if (script) {
      script.addEventListener("load", renderWidget);
    } else {
      const nextScript = document.createElement("script");
      nextScript.id = SCRIPT_ID;
      nextScript.src = SCRIPT_SRC;
      nextScript.async = true;
      nextScript.defer = true;
      nextScript.addEventListener("load", renderWidget);
      document.head.appendChild(nextScript);
    }

    return () => {
      cancelled = true;
      if (widgetId !== null && window.turnstile) window.turnstile.remove(widgetId);
      if (script) script.removeEventListener("load", renderWidget);
    };
  }, [action]);

  if (!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY) return null;

  return <div ref={containerRef} className="mt-3 flex justify-center" />;
}
