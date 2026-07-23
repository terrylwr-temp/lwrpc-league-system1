"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { registerAppDialogApi } from "../lib/appDialog";

const AppDialogContext = createContext(null);

const toneStyles = {
  success: {
    badge: "bg-emerald-100 text-emerald-800",
    button: "bg-emerald-700 hover:bg-emerald-800 focus:ring-emerald-300",
    icon: "✓",
    label: "Success",
  },
  error: {
    badge: "bg-red-100 text-red-800",
    button: "bg-red-700 hover:bg-red-800 focus:ring-red-300",
    icon: "!",
    label: "Attention",
  },
  warning: {
    badge: "bg-amber-100 text-amber-900",
    button: "bg-amber-600 hover:bg-amber-700 focus:ring-amber-300",
    icon: "!",
    label: "Confirmation required",
  },
  info: {
    badge: "bg-blue-100 text-blue-800",
    button: "bg-[#1558d5] hover:bg-[#1047af] focus:ring-blue-300",
    icon: "i",
    label: "Notice",
  },
};

function normalizeOptions(messageOrOptions, options = {}) {
  return typeof messageOrOptions === "string"
    ? { ...options, message: messageOrOptions }
    : messageOrOptions || {};
}

function legacyAlertOptions(message) {
  const text = String(message || "").trim();
  if (/\b(unable|failed|error|expired|invalid|cannot|could not|missing|permission|not configured)\b/i.test(text)) {
    return { title: "Attention needed", tone: "error" };
  }
  if (/\b(saved|complete|completed|sent|updated|created|deleted|copied|imported|exported)\b/i.test(text)) {
    return { title: "Update complete", tone: "success" };
  }
  return { title: "Notice", tone: "info" };
}

export function AppDialogProvider({ children }) {
  const [dialog, setDialog] = useState(null);
  const queueRef = useRef([]);
  const activeRef = useRef(false);
  const primaryButtonRef = useRef(null);
  const promptInputRef = useRef(null);
  const dialogRef = useRef(null);

  const showNext = useCallback(() => {
    if (activeRef.current) return;
    const next = queueRef.current.shift();
    if (!next) return;
    activeRef.current = true;
    setDialog(next);
  }, []);

  const enqueue = useCallback((type, options) => new Promise((resolve) => {
    queueRef.current.push({ type, options, resolve });
    showNext();
  }), [showNext]);

  const closeDialog = useCallback((value) => {
    if (!dialog) return;
    dialog.resolve(value);
    activeRef.current = false;
    setDialog(null);
    window.setTimeout(showNext, 0);
  }, [dialog, showNext]);

  const notice = useCallback((messageOrOptions, options) => enqueue("notice", normalizeOptions(messageOrOptions, options)), [enqueue]);
  const confirm = useCallback((messageOrOptions, options) => enqueue("confirm", normalizeOptions(messageOrOptions, options)), [enqueue]);
  const prompt = useCallback((messageOrOptions, options) => enqueue("prompt", normalizeOptions(messageOrOptions, options)), [enqueue]);

  useEffect(() => {
    if (!dialog) return undefined;
    const focusTarget = dialog.type === "prompt" ? promptInputRef.current : primaryButtonRef.current;
    focusTarget?.focus();

    function handleKeyDown(event) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      closeDialog(dialog.type === "notice" ? true : null);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [closeDialog, dialog]);

  useEffect(() => {
    const nativeAlert = window.alert;
    window.alert = (message) => {
      void notice(String(message || ""), legacyAlertOptions(message));
    };
    return () => {
      window.alert = nativeAlert;
    };
  }, [notice]);

  useEffect(() => registerAppDialogApi({ confirm, notice, prompt }), [confirm, notice, prompt]);

  const contextValue = { notice, confirm, prompt };
  const options = dialog?.options || {};
  const tone = toneStyles[options.tone] || toneStyles.info;

  return (
    <AppDialogContext.Provider value={contextValue}>
      {children}
      {dialog && <DialogWindow dialog={dialog} options={options} tone={tone} onClose={closeDialog} dialogRef={dialogRef} primaryButtonRef={primaryButtonRef} promptInputRef={promptInputRef} />}
    </AppDialogContext.Provider>
  );
}

function DialogWindow({ dialog, options, tone, onClose, dialogRef, primaryButtonRef, promptInputRef }) {
  const [inputValue, setInputValue] = useState("");
  const requiredValue = options.requiredValue || "";
  const isPrompt = dialog.type === "prompt";
  const canContinue = !requiredValue || inputValue.trim() === requiredValue;
  const title = options.title || (dialog.type === "notice" ? tone.label : "Please confirm");
  const confirmLabel = options.confirmLabel || (dialog.type === "notice" ? "OK" : "Continue");
  const message = isPrompt && requiredValue
    ? String(options.message || "")
        .split("\n")
        .filter((line) => !/^\s*(?:final confirmation:\s*)?type\b/i.test(line))
        .join("\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim()
    : options.message;

  function keepFocusInDialog(event) {
    if (event.key !== "Tab") return;
    const focusable = Array.from(dialogRef.current?.querySelectorAll('button:not([disabled]), input:not([disabled]), [href], select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])') || []);
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function submit(event) {
    event.preventDefault();
    if (isPrompt) {
      if (!canContinue) return;
      onClose(inputValue);
      return;
    }
    onClose(dialog.type === "notice" ? true : true);
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-sm" role="presentation">
      <section ref={dialogRef} onKeyDown={keepFocusInDialog} className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="app-dialog-title" aria-describedby="app-dialog-message">
        <header className="flex items-start gap-3 bg-gradient-to-r from-[#102e64] to-[#1558d5] px-5 py-4 text-white">
          <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-base font-black ${tone.badge}`} aria-hidden="true">{tone.icon}</span>
          <div className="min-w-0">
            <span className="text-[10px] font-black uppercase tracking-[.14em] text-blue-100">League Management System</span>
            <h2 id="app-dialog-title" className="mt-0.5 text-xl font-black leading-tight">{title}</h2>
          </div>
        </header>
        <form onSubmit={submit}>
          <div className="px-5 py-5">
            {message && <p id="app-dialog-message" className="whitespace-pre-line text-sm font-semibold leading-6 text-slate-700">{message}</p>}
            {isPrompt && <label className="mt-5 block"><span className="mb-1.5 block text-sm font-black text-slate-800">{options.inputLabel || "Confirmation"}</span><input ref={promptInputRef} value={inputValue} onChange={(event) => setInputValue(event.target.value)} placeholder={options.placeholder || requiredValue} className="w-full rounded-xl border border-slate-300 px-4 py-3 font-semibold text-slate-950 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100" /></label>}
          </div>
          <footer className="flex flex-col-reverse gap-2 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:justify-end">
            {dialog.type !== "notice" && <button type="button" onClick={() => onClose(null)} className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-black text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-4 focus:ring-slate-200">{options.cancelLabel || "Cancel"}</button>}
            <button ref={primaryButtonRef} type="submit" disabled={!canContinue} className={`rounded-xl px-5 py-2.5 text-sm font-black text-white transition focus:outline-none focus:ring-4 disabled:cursor-not-allowed disabled:opacity-45 ${tone.button}`}>{confirmLabel}</button>
          </footer>
        </form>
      </section>
    </div>
  );
}

export function useAppDialog() {
  const context = useContext(AppDialogContext);
  if (!context) throw new Error("useAppDialog must be used inside AppDialogProvider.");
  return context;
}
