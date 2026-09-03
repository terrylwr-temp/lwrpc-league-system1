"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AppHeader from "../components/AppHeader";
import LoadingScreen from "../components/LoadingScreen";
import { getRequestAuthorizationHeaders, requireRole } from "../lib/auth";

const TYPE_OPTIONS = [
  ["league_rules", "Official League Rules"],
  ["league_supplement", "League Supplemental Rules"],
  ["captain_guide", "Captain Guide"],
  ["player_guide", "Player Guide"],
  ["lms_guide", "LMS Help Guide"],
  ["other", "Other Official Document"],
];

const INITIAL_FORM = {
  title: "",
  description: "",
  documentType: "league_rules",
  authorityRank: "1",
  scopeKind: "all",
  leagueId: "",
  divisionId: "",
  seasonId: "",
};

export default function AiAssistantManagementPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [options, setOptions] = useState({ seasons: [], leagues: [], divisions: [] });
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [uploadFile, setUploadFile] = useState(null);
  const [replacementFile, setReplacementFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const fetchWithAuth = useCallback(async (path, request = {}) => fetch(path, {
    ...request,
    headers: {
      ...(request.headers || {}),
      ...(await getRequestAuthorizationHeaders()),
    },
  }), []);

  const loadCatalog = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetchWithAuth("/api/ai-assistant/documents");
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success) throw new Error(result.error || "Unable to load the AI document catalog.");
      setDocuments(result.documents || []);
      setOptions(result.options || { seasons: [], leagues: [], divisions: [] });
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, [fetchWithAuth]);

  const loadDocument = useCallback(async (documentId, versionId = "") => {
    if (!documentId) return;
    setLoading(true);
    try {
      const query = new URLSearchParams({ documentId });
      if (versionId) query.set("versionId", versionId);
      const response = await fetchWithAuth(`/api/ai-assistant/documents?${query}`);
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success) throw new Error(result.error || "Unable to load this document.");
      setSelected(result);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, [fetchWithAuth]);

  useEffect(() => {
    async function initialize() {
      const user = await requireRole(router, "league_manager");
      if (!user) return;
      setReady(true);
      await loadCatalog();
    }
    initialize();
  }, [loadCatalog, router]);

  const availableDivisions = useMemo(
    () => (options.divisions || []).filter((division) => !form.leagueId || String(division.league_id) === String(form.leagueId)),
    [form.leagueId, options.divisions]
  );

  function updateForm(key, value) {
    setForm((current) => ({
      ...current,
      [key]: value,
      ...(key === "scopeKind" && value !== "league" ? { leagueId: "" } : {}),
      ...(key === "scopeKind" && value !== "division" ? { divisionId: "" } : {}),
      ...(key === "leagueId" ? { divisionId: "" } : {}),
    }));
  }

  async function submitNewDocument(event) {
    event.preventDefault();
    if (!uploadFile) return setError("Choose an official PDF to upload.");
    const data = new FormData();
    Object.entries(form).forEach(([key, value]) => data.set(key, value));
    data.set("action", "upload");
    data.set("file", uploadFile);
    await submitAction(data, "Document uploaded and processed. Review the extracted content before activating it.", true);
  }

  async function replaceSelectedDocument() {
    if (!selected?.document?.id || !replacementFile) return setError("Choose the replacement PDF first.");
    const data = new FormData();
    data.set("action", "replace");
    data.set("documentId", selected.document.id);
    data.set("file", replacementFile);
    await submitAction(data, "Replacement processed. The prior active version remains authoritative until you activate this one.", true);
    setReplacementFile(null);
  }

  async function reprocessSelectedVersion() {
    if (!selected?.document?.id || !selected.selectedVersionId) return;
    const data = new FormData();
    data.set("action", "reprocess");
    data.set("documentId", selected.document.id);
    data.set("versionId", selected.selectedVersionId);
    await submitAction(data, "A new version was created from the same source and processed. Review it before activation.", true);
  }

  async function activateSelectedVersion() {
    if (!selected?.document?.id || !selected.selectedVersionId) return;
    const data = new FormData();
    data.set("action", "activate");
    data.set("documentId", selected.document.id);
    data.set("versionId", selected.selectedVersionId);
    await submitAction(data, "This ready version is now the active official source.", true);
  }

  async function toggleChunk(chunk) {
    setWorking(true);
    setError("");
    try {
      const response = await fetchWithAuth("/api/ai-assistant/documents", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set_chunk_searchable", chunkId: chunk.id, isSearchable: !chunk.is_searchable }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success) throw new Error(result.error || "Unable to update this chunk.");
      await loadDocument(selected.document.id, selected.selectedVersionId);
    } catch (updateError) {
      setError(updateError.message);
    } finally {
      setWorking(false);
    }
  }

  async function submitAction(data, successMessage, refreshCatalog) {
    setWorking(true);
    setError("");
    setNotice("");
    try {
      const response = await fetchWithAuth("/api/ai-assistant/documents", { method: "POST", body: data });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success) throw new Error(result.error || "Unable to process this document.");
      setSelected({ document: result.document, versions: result.versions || [], selectedVersionId: result.selectedVersionId, previewChunks: result.previewChunks || [] });
      setNotice(result.processingError ? `Processing failed: ${result.processingError}` : successMessage);
      if (refreshCatalog) await loadCatalog();
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setWorking(false);
    }
  }

  if (!ready) return <LoadingScreen subtitle="Loading AI Assistant Management..." />;

  const currentVersion = selected?.versions?.find((version) => version.id === selected.selectedVersionId) || null;
  const canActivate = currentVersion?.processing_status === "ready";

  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-6">
      <div className="mx-auto max-w-7xl">
        <AppHeader
          title="AI Assistant Management"
          subtitle="Manage official source PDFs used by Ask LWR Pickleball AI. Documents are never searchable until a ready version is explicitly activated."
          actions={<button type="button" onClick={() => router.push("/")} className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-black text-white hover:bg-emerald-400">Admin Dashboard</button>}
        />

        {error && <Banner tone="red">{error}</Banner>}
        {notice && <Banner tone={notice.startsWith("Processing failed") ? "amber" : "emerald"}>{notice}</Banner>}

        <div className="grid gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <section className="space-y-5">
            <Panel title="Add Official PDF" description="New documents remain inactive while text is extracted, chunked, and embedded.">
              <form className="grid gap-3" onSubmit={submitNewDocument}>
                <Field label="Document title"><input value={form.title} onChange={(event) => updateForm("title", event.target.value)} required className={inputClass} placeholder="Weekday DUPR League Rules" /></Field>
                <Field label="Description (optional)"><textarea value={form.description} onChange={(event) => updateForm("description", event.target.value)} className={`${inputClass} min-h-20`} /></Field>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Document type"><select value={form.documentType} onChange={(event) => updateForm("documentType", event.target.value)} className={inputClass}>{TYPE_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field>
                  <Field label="Authority rank"><input type="number" min="1" max="99" value={form.authorityRank} onChange={(event) => updateForm("authorityRank", event.target.value)} className={inputClass} /><small className="mt-1 block text-xs font-semibold text-slate-500">1 is highest authority.</small></Field>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Ask About applicability"><select value={form.scopeKind} onChange={(event) => updateForm("scopeKind", event.target.value)} className={inputClass}><option value="all">All leagues</option><option value="lms_help">LMS Help</option><option value="league">Specific league</option><option value="division">Specific division</option></select></Field>
                  <Field label="Season (optional)"><select value={form.seasonId} onChange={(event) => updateForm("seasonId", event.target.value)} className={inputClass}><option value="">All seasons</option>{options.seasons.map((season) => <option key={season.id} value={season.id}>{season.name}</option>)}</select></Field>
                </div>
                {form.scopeKind === "league" && <Field label="League"><select value={form.leagueId} onChange={(event) => updateForm("leagueId", event.target.value)} required className={inputClass}><option value="">Select league</option>{options.leagues.map((league) => <option key={league.id} value={league.id}>{league.name}</option>)}</select></Field>}
                {form.scopeKind === "division" && <div className="grid gap-3 sm:grid-cols-2"><Field label="Limit divisions by league"><select value={form.leagueId} onChange={(event) => updateForm("leagueId", event.target.value)} className={inputClass}><option value="">All leagues</option>{options.leagues.map((league) => <option key={league.id} value={league.id}>{league.name}</option>)}</select></Field><Field label="Division"><select value={form.divisionId} onChange={(event) => updateForm("divisionId", event.target.value)} required className={inputClass}><option value="">Select division</option>{availableDivisions.map((division) => <option key={division.id} value={division.id}>{division.name}</option>)}</select></Field></div>}
                <Field label="Official PDF"><input type="file" accept="application/pdf,.pdf" onChange={(event) => setUploadFile(event.target.files?.[0] || null)} required className="block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold" /><small className="mt-1 block text-xs font-semibold text-slate-500">PDF only. Processing never makes a document active automatically.</small></Field>
                <button type="submit" disabled={working} className={primaryButton}>{working ? "Uploading and processing..." : "Upload and Process PDF"}</button>
              </form>
            </Panel>

            <Panel title="Official Document Catalog" description="Existing LMS PDFs remain untouched until you deliberately add them here.">
              <div className="space-y-2">{documents.length === 0 && !loading && <Empty>No AI documents have been cataloged yet.</Empty>}{documents.map((document) => <button key={document.id} type="button" onClick={() => loadDocument(document.id)} className={`block w-full rounded-xl border p-3 text-left transition ${selected?.document?.id === document.id ? "border-blue-400 bg-blue-50" : "border-slate-200 bg-white hover:border-blue-300"}`}><div className="flex items-start justify-between gap-3"><div className="min-w-0"><strong className="block truncate text-sm font-black text-slate-950">{document.title}</strong><span className="mt-1 block text-xs font-bold text-slate-500">{labelForType(document.document_type)} · Authority {document.authority_rank}</span></div><Status value={document.status} /></div><div className="mt-2 text-xs font-semibold text-slate-600">{document.active_version?.processing_status === "ready" ? `${document.active_version.chunk_count || 0} chunks ready` : "No active processed version"}</div></button>)}</div>
            </Panel>
          </section>

          <section>
            {!selected ? <Panel title="Processing Preview" description="Select a cataloged document to inspect its versions and extracted chunks."><Empty>Preview pages, chunks, headings, rules, warnings, and errors appear here after processing.</Empty></Panel> : <Panel title={selected.document.title} description="Review extraction before activating a version. Disabled chunks remain stored but are excluded from future retrieval.">
              <div className="flex flex-wrap items-center gap-2"><Status value={selected.document.status} /><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">Authority {selected.document.authority_rank}</span>{selected.document.active_version_id && <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-800">Active version selected server-side</span>}</div>
              <div className="mt-4 grid gap-3 md:grid-cols-2"><Field label="Replace with new PDF"><input type="file" accept="application/pdf,.pdf" onChange={(event) => setReplacementFile(event.target.files?.[0] || null)} className="block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold" /></Field><div className="flex items-end gap-2"><button type="button" disabled={working || !replacementFile} onClick={replaceSelectedDocument} className={secondaryButton}>{working ? "Processing..." : "Replace and Process"}</button><button type="button" disabled={working || !selected.selectedVersionId} onClick={reprocessSelectedVersion} className={secondaryButton}>Reprocess Selected</button></div></div>
              <div className="mt-5 border-t border-slate-200 pt-4"><h3 className="text-sm font-black text-slate-950">Versions</h3><div className="mt-2 space-y-2">{selected.versions.map((version) => <button key={version.id} type="button" onClick={() => loadDocument(selected.document.id, version.id)} className={`flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-3 text-left ${selected.selectedVersionId === version.id ? "border-blue-400 bg-blue-50" : "border-slate-200 bg-white"}`}><span className="min-w-0"><strong className="block truncate text-sm text-slate-950">{version.original_filename}</strong><small className="block text-xs font-semibold text-slate-500">{version.version_label} · {version.page_count ?? "-"} pages · {version.chunk_count} chunks</small></span><Status value={version.processing_status} /></button>)}</div></div>
              {currentVersion && <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-black text-slate-950">Selected version readiness</h3><p className="mt-1 text-sm font-semibold text-slate-600">{currentVersion.page_count ?? "-"} detected pages · {currentVersion.chunk_count} created chunks</p></div>{canActivate && <button type="button" disabled={working} onClick={activateSelectedVersion} className={primaryButton}>Activate Ready Version</button>}</div>{currentVersion.processing_error && <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-bold text-red-800">{currentVersion.processing_error}</div>}{Array.isArray(currentVersion.processing_warnings) && currentVersion.processing_warnings.length > 0 && <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-bold text-amber-900">{currentVersion.processing_warnings.join(" ")}</div>}</div>}
              <div className="mt-5 border-t border-slate-200 pt-4"><h3 className="text-sm font-black text-slate-950">Extracted Content Preview</h3><p className="mt-1 text-xs font-semibold text-slate-500">Showing up to 50 chunks from the selected version. This administrative preview never appears in the player assistant.</p><div className="mt-3 space-y-3">{selected.previewChunks.length === 0 && <Empty>This version has no extracted chunks yet.</Empty>}{selected.previewChunks.map((chunk) => <article key={chunk.id} className={`rounded-xl border p-3 ${chunk.is_searchable ? "border-slate-200 bg-white" : "border-amber-300 bg-amber-50"}`}><div className="flex flex-wrap items-center justify-between gap-2"><div className="text-xs font-black uppercase tracking-wide text-slate-500">Chunk {chunk.chunk_ordinal} · Page {chunk.page_number || "-"}{chunk.rule_number ? ` · Rule ${chunk.rule_number}` : ""}</div><button type="button" disabled={working} onClick={() => toggleChunk(chunk)} className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-black text-slate-700 hover:bg-slate-100">{chunk.is_searchable ? "Exclude from AI" : "Include in AI"}</button></div>{chunk.heading && <strong className="mt-2 block text-sm text-slate-950">{chunk.heading}</strong>}<p className="mt-2 whitespace-pre-wrap text-sm font-semibold leading-6 text-slate-700">{chunk.content}</p></article>)}</div></div>
            </Panel>}
          </section>
        </div>
      </div>
    </main>
  );
}

const inputClass = "w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";
const primaryButton = "rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-black text-white shadow-sm hover:bg-blue-800 disabled:bg-slate-300";
const secondaryButton = "rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-black text-slate-700 hover:bg-slate-50 disabled:opacity-50";

function Panel({ title, description, children }) { return <section className="rounded-2xl border border-white/80 bg-white p-4 shadow-[0_18px_46px_-34px_rgba(15,23,42,0.8)]"><h2 className="text-lg font-black text-slate-950">{title}</h2><p className="mt-1 text-sm font-semibold leading-6 text-slate-600">{description}</p><div className="mt-4">{children}</div></section>; }
function Field({ label, children }) { return <label className="block text-sm font-black text-slate-800"><span className="mb-1.5 block">{label}</span>{children}</label>; }
function Empty({ children }) { return <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-7 text-center text-sm font-semibold text-slate-500">{children}</div>; }
function Banner({ tone, children }) { const colors = tone === "red" ? "border-red-200 bg-red-50 text-red-800" : tone === "amber" ? "border-amber-200 bg-amber-50 text-amber-900" : "border-emerald-200 bg-emerald-50 text-emerald-800"; return <div className={`mb-4 rounded-xl border px-4 py-3 text-sm font-bold ${colors}`}>{children}</div>; }
function Status({ value }) { const tone = value === "active" || value === "ready" ? "bg-emerald-100 text-emerald-800" : value === "failed" || value === "archived" ? "bg-red-100 text-red-800" : value === "processing" || value === "queued" ? "bg-amber-100 text-amber-900" : "bg-slate-100 text-slate-700"; return <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-black capitalize ${tone}`}>{String(value || "unknown").replaceAll("_", " ")}</span>; }
function labelForType(type) { return TYPE_OPTIONS.find(([value]) => value === type)?.[1] || "Official Document"; }

