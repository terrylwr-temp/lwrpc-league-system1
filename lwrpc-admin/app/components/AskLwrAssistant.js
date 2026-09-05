"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { getCurrentUserRole, getRequestAuthorizationHeaders, supabase } from "../lib/auth";
import { GUIDE_DOCUMENT_TYPES, openGuideDocument } from "../lib/dashboardGuides";
import { LEAGUE_DOCUMENT_TYPES, leagueDocumentPath, normalizeLeagueDocumentBucket } from "../lib/leagueDocuments";
import { ASK_LWR_INITIAL_COPY, assistantPageContext, canBrowseLeagueDocument, visibleDashboardGuideKeys } from "../lib/askLwrAssistantConfig";

const TECHNICAL_ERROR = "Sorry, I couldn't complete that request right now. Please try again.";
const SESSION_EXCHANGES_KEY = "lwr-ask-ai-exchanges";
const MAX_SESSION_EXCHANGES = 8;

function initialSessionExchanges() {
  if (typeof window === "undefined") return [];
  try {
    const saved = JSON.parse(window.sessionStorage.getItem(SESSION_EXCHANGES_KEY) || "[]");
    return Array.isArray(saved) ? saved.filter((entry) => entry && !entry.pending && (entry.result || entry.requestError)).slice(0, MAX_SESSION_EXCHANGES) : [];
  } catch { return []; }
}

function AssistantIcon({ size = 20 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m12 2 .9 4.1L17 7l-4.1.9L12 12l-.9-4.1L7 7l4.1-.9L12 2Z"/><path d="m19 14 .5 2.5L22 17l-2.5.5L19 20l-.5-2.5L16 17l2.5-.5L19 14Z"/><path d="m5 14 .6 2.4L8 17l-2.4.6L5 20l-.6-2.4L2 17l2.4-.6L5 14Z"/></svg>;
}

export function AskLwrAssistantDrawer({ open, onClose, role }) {
  const drawerRef = useRef(null);
  const closeButtonRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusInput = window.setTimeout(() => inputRef.current?.focus() || closeButtonRef.current?.focus(), 0);
    const onKeyDown = (event) => {
      if (event.key === "Escape") { onClose(); return; }
      if (event.key !== "Tab") return;
      const focusable = [...(drawerRef.current?.querySelectorAll("a[href], button:not([disabled]), textarea:not([disabled])") || [])];
      if (focusable.length === 0) return;
      const first = focusable[0]; const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(focusInput);
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;
  return <div className="fixed inset-0 z-[90]" role="dialog" aria-modal="true" aria-labelledby="ask-lwr-title">
    <button type="button" className="absolute inset-0 bg-slate-950/45 backdrop-blur-[1px]" onClick={onClose} aria-label="Close Ask LWR Pickleball Club AI"/>
    <aside ref={drawerRef} className="absolute inset-y-0 right-0 flex w-full max-w-[640px] flex-col border-l border-slate-200 bg-slate-50 shadow-2xl sm:w-[min(92vw,640px)]" aria-describedby="ask-lwr-subtitle">
      <AssistantContent role={role} inputRef={inputRef} closeButtonRef={closeButtonRef} onClose={onClose} drawer/>
    </aside>
  </div>;
}

export function AskLwrAssistantPage({ role }) {
  return <section className="mx-auto max-w-4xl overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-sm"><AssistantContent role={role}/></section>;
}

function AssistantContent({ role = "player", inputRef, closeButtonRef, onClose, drawer = false }) {
  const pathname = usePathname();
  const pageContext = useMemo(() => assistantPageContext(pathname, role), [pathname, role]);
  const [question, setQuestion] = useState("");
  const [exchanges, setExchanges] = useState(initialSessionExchanges);
  const [working, setWorking] = useState(false);
  const [guidesOpen, setGuidesOpen] = useState(false);
  const [leagueGuides, setLeagueGuides] = useState([]);
  const [guidesLoading, setGuidesLoading] = useState(false);

  useEffect(() => {
    try {
      const completedExchanges = exchanges.filter((entry) => !entry.pending && (entry.result || entry.requestError)).slice(0, MAX_SESSION_EXCHANGES);
      if (completedExchanges.length) window.sessionStorage.setItem(SESSION_EXCHANGES_KEY, JSON.stringify(completedExchanges));
      else window.sessionStorage.removeItem(SESSION_EXCHANGES_KEY);
    } catch { /* Session history is a convenience, never a blocker. */ }
  }, [exchanges]);

  async function submit(event, suggestedQuestion = "") {
    event?.preventDefault();
    const nextQuestion = String(suggestedQuestion || question).trim();
    if (!nextQuestion || working) return;
    const exchangeId = `${Date.now()}-${Math.random()}`;
    setQuestion(""); setWorking(true);
    setExchanges((current) => [{ id: exchangeId, question: nextQuestion, pending: true }, ...current].slice(0, MAX_SESSION_EXCHANGES));
    try {
      const response = await fetch("/api/ask-lwr", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(await getRequestAuthorizationHeaders()) },
        body: JSON.stringify({ question: nextQuestion, context: { currentPath: pageContext.currentPath, featureModule: pageContext.featureModule } }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.success || !payload?.result?.answer) throw new Error("player_request_failed");
      setExchanges((current) => current.map((entry) => entry.id === exchangeId ? { ...entry, pending: false, result: payload.result } : entry));
    } catch {
      setExchanges((current) => current.map((entry) => entry.id === exchangeId ? { ...entry, pending: false, requestError: true } : entry));
    } finally { setWorking(false); }
  }

  async function toggleGuides() {
    const nextOpen = !guidesOpen;
    setGuidesOpen(nextOpen);
    if (!nextOpen || leagueGuides.length || guidesLoading) return;
    setGuidesLoading(true);
    try { setLeagueGuides(await loadLeagueGuides(role)); } catch { setLeagueGuides([]); } finally { setGuidesLoading(false); }
  }

  const guides = GUIDE_DOCUMENT_TYPES.filter((guide) => visibleDashboardGuideKeys(role).includes(guide.key));
  const bodyClass = drawer ? "flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-5 sm:px-6" : "min-h-[620px] px-4 py-6 sm:px-7";
  return <>
    <header className="flex items-start gap-3 border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-700"><AssistantIcon size={21}/></span>
      <div className="min-w-0 flex-1"><h2 id="ask-lwr-title" className="text-lg font-black text-[#102e64]">Ask LWR Pickleball Club AI</h2><p id="ask-lwr-subtitle" className="mt-0.5 text-sm font-semibold leading-5 text-slate-600">Get answers from official LWR PC information and USAP Rules</p></div>
      {onClose && <button ref={closeButtonRef} type="button" onClick={onClose} className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-xl text-slate-600 transition hover:bg-slate-100 hover:text-slate-950" aria-label="Close Ask LWR Pickleball Club AI">×</button>}
    </header>
    <div className={bodyClass}>
      <form onSubmit={submit} className="flex gap-2"><label className="sr-only" htmlFor="ask-lwr-question">Ask a question about anything regarding LWR Pickleball Club or leagues</label><textarea id="ask-lwr-question" ref={inputRef} value={question} maxLength={1000} rows={3} onChange={(event) => setQuestion(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); submit(event); } }} placeholder="Ask a question about anything regarding LWR Pickleball Club or leagues" className="min-h-[74px] flex-1 resize-y rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold leading-5 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"/><button type="submit" disabled={working || !question.trim()} className="self-end rounded-xl bg-[#1558d5] px-4 py-2.5 text-sm font-black text-white shadow-sm transition hover:bg-[#104ab7] disabled:cursor-not-allowed disabled:bg-slate-300">Ask</button></form>
      {exchanges.length === 0 && <section className="mt-4 rounded-2xl border border-blue-100 bg-white p-4 shadow-sm"><h3 className="text-base font-black text-[#102e64]">How can I help?</h3><p className="mt-2 text-sm font-semibold leading-6 text-slate-600">{ASK_LWR_INITIAL_COPY}</p><div className="mt-4 flex flex-wrap gap-2">{pageContext.suggestions.map((suggestion) => <button key={suggestion} type="button" onClick={() => submit(null, suggestion)} disabled={working} className="rounded-full border border-blue-200 bg-blue-50 px-3 py-2 text-left text-xs font-bold leading-4 text-blue-800 transition hover:border-blue-400 hover:bg-blue-100 disabled:cursor-wait disabled:opacity-60">{suggestion}</button>)}</div></section>}
      <div className="mt-4 space-y-4">{exchanges.map((entry) => <Exchange key={entry.id} entry={entry}/>)}</div>
      <div className="mt-5 rounded-xl border border-slate-200 bg-white"><button type="button" onClick={toggleGuides} aria-expanded={guidesOpen} className="flex w-full items-center justify-between gap-3 px-3 py-3 text-left text-sm font-black text-[#102e64]"><span>Browse Guides &amp; Rules</span><span aria-hidden="true">{guidesOpen ? "−" : "+"}</span></button>{guidesOpen && <div className="border-t border-slate-200 p-3"><p className="mb-3 text-xs font-semibold leading-5 text-slate-600">Open the official user guides and league documents already available in the LMS.</p><div className="grid gap-2">{guides.map((guide) => <button key={guide.key} type="button" onClick={() => openGuideDocument(supabase, guide)} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-left text-sm font-bold text-blue-800 hover:border-blue-300 hover:bg-blue-50">{guide.label}</button>)}{leagueGuides.map((guide) => <button key={guide.key} type="button" onClick={() => openLeagueGuide(guide)} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-left text-sm font-bold text-blue-800 hover:border-blue-300 hover:bg-blue-50">{guide.label}</button>)}{guidesLoading && <p className="text-sm font-semibold text-slate-500" role="status">Loading league documents...</p>}{!guidesLoading && guides.length + leagueGuides.length === 0 && <p className="text-sm font-semibold text-slate-500">No user-facing guides are configured yet.</p>}</div></div>}</div>
    </div>
  </>;
}

function Exchange({ entry }) {
  if (entry.pending) return <article className="rounded-2xl border border-blue-200 bg-blue-50/70 p-4"><h3 className="text-sm font-black uppercase tracking-[.1em] text-[#102e64]">Question</h3><p className="mt-2 text-sm font-bold text-slate-800">{entry.question}</p><p className="mt-3 flex items-center gap-2 text-sm font-bold text-blue-900" role="status" aria-live="polite"><span className="h-3 w-3 animate-pulse rounded-full bg-blue-600" aria-hidden="true"/>Finding the official answer...</p></article>;
  if (entry.requestError) return <article className="rounded-2xl border border-red-200 bg-red-50 p-4"><h3 className="text-sm font-black uppercase tracking-[.1em] text-[#102e64]">Question</h3><p className="mt-2 text-sm font-bold text-slate-800">{entry.question}</p><p className="mt-3 text-sm font-semibold text-red-800">{TECHNICAL_ERROR}</p></article>;
  const result = entry.result;
  return <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
    <div className="border-b border-blue-200 bg-blue-100/70 px-4 py-3"><h3 className="text-sm font-black uppercase tracking-[.1em] text-[#102e64]">Question</h3><p className="mt-2 text-sm font-bold text-slate-800">{entry.question}</p></div>
    <div className="bg-emerald-50/70 p-4"><h3 className="text-sm font-black uppercase tracking-[.1em] text-[#102e64]">Answer</h3><p className="mt-2 whitespace-pre-wrap text-sm font-semibold leading-6 text-slate-800">{result.answer}</p>{result.sources?.length > 0 && <div className="mt-4 border-t border-emerald-100 pt-4"><h3 className="text-sm font-black uppercase tracking-[.1em] text-[#102e64]">Official Source{result.sources.length > 1 ? "s" : ""}</h3><div className="mt-2 grid gap-2">{result.sources.map((source, index) => <a key={`${source.officialDocumentUrl}-${index}`} href={source.officialDocumentUrl} target="_blank" rel="noreferrer" className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-sm text-blue-900 transition hover:border-blue-300 hover:bg-blue-100"><strong className="block">{source.documentTitle}</strong><span className="mt-0.5 block font-semibold">{source.citation}</span><span className="mt-2 inline-block font-black text-blue-700">View Official Document ↗</span></a>)}</div></div>}</div>
  </article>;
}

async function loadLeagueGuides(role) {
  const user = await getCurrentUserRole();
  if (!user.memberId) return [];
  const { data } = await supabase.from("team_members").select("teams(id, name, divisions(leagues(id, name, league_document_bucket, code_of_conduct_pdf_path, captains_guide_pdf_path, league_rules_pdf_path, score_sheet_pdf_path, league_waiver_pdf_path)))").eq("member_id", user.memberId);
  const seen = new Set();
  return (data || []).flatMap((row) => {
    const team = row.teams; const league = team?.divisions?.leagues;
    return LEAGUE_DOCUMENT_TYPES.filter((type) => canBrowseLeagueDocument(role, type.key)).map((type) => {
      const path = leagueDocumentPath(league, type);
      if (!path) return null;
      const bucket = normalizeLeagueDocumentBucket(league?.league_document_bucket);
      const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);
      const url = urlData?.publicUrl || ""; const key = `${league?.id || "league"}:${type.key}:${url}`;
      if (!url || seen.has(key)) return null; seen.add(key);
      return { key, label: `${league?.name || team?.name || "League"} — ${type.label}`, url };
    }).filter(Boolean);
  });
}

function openLeagueGuide(guide) {
  const guideWindow = window.open(guide.url, "_blank", "noopener");
  if (guideWindow) guideWindow.opener = null;
}
