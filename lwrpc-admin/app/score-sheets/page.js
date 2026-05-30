"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AppHeader from "../components/AppHeader";
import { requireRole, supabase } from "../lib/auth";
import { confirmDeleteAction } from "../lib/confirmDelete";
import {
  DEFAULT_SCORE_SHEET_TEMPLATE_HTML,
  DEFAULT_SCORE_SHEET_TEMPLATE_NAME,
  DEFAULT_SCORE_SHEET_RULES,
  SCORE_SHEET_PLACEHOLDERS,
  defaultScoreSheetTemplatePayload,
} from "../lib/scoreSheetTemplates";
import { useRouter } from "next/navigation";

export default function ScoreSheetsPage() {
  const router = useRouter();
  const importRef = useRef(null);
  const [templates, setTemplates] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [name, setName] = useState(DEFAULT_SCORE_SHEET_TEMPLATE_NAME);
  const [description, setDescription] = useState("");
  const [sheetTitle, setSheetTitle] = useState(DEFAULT_SCORE_SHEET_TEMPLATE_NAME);
  const [templateHtml, setTemplateHtml] = useState(DEFAULT_SCORE_SHEET_TEMPLATE_HTML);
  const [rulesText, setRulesText] = useState(DEFAULT_SCORE_SHEET_RULES);
  const [isActive, setIsActive] = useState(true);
  const [isDefault, setIsDefault] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadTemplates = useCallback(async function loadTemplates() {
    const { data, error } = await supabase
      .from("score_sheet_templates")
      .select("*")
      .order("is_default", { ascending: false })
      .order("name", { ascending: true });

    if (error) {
      alert(`Score Sheet templates require the Supabase schema update: ${error.message}`);
      return;
    }

    setTemplates(data || []);
  }, []);

  useEffect(() => {
    async function run() {
      const ok = await requireRole(router, "league_manager");
      if (ok) loadTemplates();
    }

    run();
  }, [loadTemplates, router]);

  const activeTemplates = useMemo(() => {
    return templates.filter((template) => template.is_active !== false);
  }, [templates]);
  const previewDocument = useMemo(() => {
    return previewScoreSheetDocument({
      templateHtml,
      sheetTitle,
      rulesText,
    });
  }, [templateHtml, sheetTitle, rulesText]);

  function clearForm() {
    setEditingId(null);
    setName(DEFAULT_SCORE_SHEET_TEMPLATE_NAME);
    setDescription("");
    setSheetTitle(DEFAULT_SCORE_SHEET_TEMPLATE_NAME);
    setTemplateHtml(DEFAULT_SCORE_SHEET_TEMPLATE_HTML);
    setRulesText(DEFAULT_SCORE_SHEET_RULES);
    setIsActive(true);
    setIsDefault(false);
  }

  function editTemplate(template) {
    setEditingId(template.id);
    setName(template.name || "");
    setDescription(template.description || "");
    setSheetTitle(template.sheet_title || template.name || "");
    setTemplateHtml(template.template_html || DEFAULT_SCORE_SHEET_TEMPLATE_HTML);
    setRulesText(template.rules_text || DEFAULT_SCORE_SHEET_RULES);
    setIsActive(template.is_active !== false);
    setIsDefault(template.is_default === true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveTemplate(event) {
    event.preventDefault();

    if (!name.trim()) {
      alert("Score Sheet name is required.");
      return;
    }

    if (!templateHtml.trim()) {
      alert("Template HTML is required.");
      return;
    }

    setSaving(true);

    if (isDefault) {
      const clearDefault = await supabase
        .from("score_sheet_templates")
        .update({ is_default: false, updated_at: new Date().toISOString() })
        .neq("id", editingId || "00000000-0000-0000-0000-000000000000");

      if (clearDefault.error) {
        setSaving(false);
        alert(clearDefault.error.message);
        return;
      }
    }

    const payload = {
      name: name.trim(),
      description: description.trim() || null,
      sheet_title: sheetTitle.trim() || name.trim(),
      template_html: templateHtml.trim(),
      rules_text: rulesText.trim() || null,
      is_active: isActive,
      is_default: isDefault,
      updated_at: new Date().toISOString(),
    };

    const result = editingId
      ? await supabase.from("score_sheet_templates").update(payload).eq("id", editingId)
      : await supabase.from("score_sheet_templates").insert(payload);

    setSaving(false);

    if (result.error) {
      alert(result.error.message);
      return;
    }

    clearForm();
    loadTemplates();
  }

  async function seedDefaultTemplate() {
    const payload = defaultScoreSheetTemplatePayload();

    const { error } = await supabase
      .from("score_sheet_templates")
      .insert({
        ...payload,
        updated_at: new Date().toISOString(),
      });

    if (error) {
      alert(error.message);
      return;
    }

    loadTemplates();
  }

  async function deleteTemplate(template) {
    const ok = confirmDeleteAction({
      title: `Delete "${template.name}"?`,
      details: "Divisions using this Score Sheet will fall back to the default Score Sheet.",
    });

    if (!ok) return;

    const { error } = await supabase.from("score_sheet_templates").delete().eq("id", template.id);

    if (error) {
      alert(error.message);
      return;
    }

    if (editingId === template.id) clearForm();
    loadTemplates();
  }

  function downloadWordTemplate() {
    const body = templateHtml || DEFAULT_SCORE_SHEET_TEMPLATE_HTML;
    const documentHtml = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(name || "score-sheet-template")}</title>
  </head>
  <body>${body}</body>
</html>`;
    const blob = new Blob([documentHtml], { type: "application/msword" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${slugifyFileName(name || "score-sheet-template")}.doc`;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  async function importTemplateFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const extension = file.name.split(".").pop()?.toLowerCase();
    if (extension === "docx") {
      alert("Please save the Word template as .doc, .html, or .txt before importing. This app does not include a .docx parser yet.");
      event.target.value = "";
      return;
    }

    const text = await file.text();
    setTemplateHtml(extractBodyHtml(text));
    event.target.value = "";
  }

  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-7xl">
        <AppHeader
          title="Score Sheets"
          subtitle="Manage printable match score sheet formats for Divisions."
        />

        <div>
          <section className="rounded-2xl bg-white p-6 shadow">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-black text-slate-950">
                  {editingId ? "Edit Score Sheet" : "Create Score Sheet"}
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Download uses the current body below. Edit it in Word, save as .doc/.html/.txt, then import it back here.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={downloadWordTemplate}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800"
                >
                  Download Word Template
                </button>
                <button
                  type="button"
                  onClick={() => importRef.current?.click()}
                  className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-800"
                >
                  Import Template
                </button>
                <input
                  ref={importRef}
                  type="file"
                  accept=".doc,.html,.htm,.txt"
                  onChange={importTemplateFile}
                  className="hidden"
                />
              </div>
            </div>

            <form onSubmit={saveTemplate} className="space-y-5">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field label="Name">
                  <input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-4 py-3"
                  />
                </Field>

                <Field label="Printed Title">
                  <input
                    value={sheetTitle}
                    onChange={(event) => setSheetTitle(event.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-4 py-3"
                  />
                </Field>
              </div>

              <Field label="Description">
                <input
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3"
                  placeholder="Example: 3-line weekday DUPR format"
                />
              </Field>

              <Field label="Rules Text">
                <textarea
                  value={rulesText}
                  onChange={(event) => setRulesText(event.target.value)}
                  className="min-h-24 w-full rounded-xl border border-slate-300 px-4 py-3"
                />
              </Field>

              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                <details className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <summary className="cursor-pointer text-sm font-black uppercase tracking-wide text-slate-800">
                    Saved Formats ({templates.length})
                  </summary>

                  {templates.length === 0 ? (
                    <div className="mt-4 flex flex-col gap-3 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
                      <span>No Score Sheets have been saved yet.</span>
                      <button
                        type="button"
                        onClick={seedDefaultTemplate}
                        className="rounded-lg bg-blue-700 px-3 py-2 text-sm font-bold text-white hover:bg-blue-800"
                      >
                        Add Current Format
                      </button>
                    </div>
                  ) : (
                    <div className="mt-4 max-h-64 overflow-y-auto rounded-lg border border-slate-200 bg-white">
                      {templates.map((template) => (
                        <div
                          key={template.id}
                          className="flex flex-col gap-3 border-b border-slate-100 p-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div>
                            <div className="flex flex-wrap items-center gap-2 font-black text-slate-950">
                              {template.name}
                              {template.is_default && (
                                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-black uppercase text-blue-800">
                                  Default
                                </span>
                              )}
                              {template.is_active === false && (
                                <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-black uppercase text-slate-700">
                                  Inactive
                                </span>
                              )}
                            </div>
                            <div className="mt-1 text-xs text-slate-600">
                              {template.description || "No description"}
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => editTemplate(template)}
                              className="rounded-lg bg-blue-100 px-3 py-2 text-xs font-bold text-blue-800 hover:bg-blue-200"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteTemplate(template)}
                              className="rounded-lg bg-red-100 px-3 py-2 text-xs font-bold text-red-800 hover:bg-red-200"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </details>

                <details className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <summary className="cursor-pointer text-sm font-black uppercase tracking-wide text-slate-800">
                    Placeholders
                  </summary>
                  <div className="mt-4 grid max-h-64 grid-cols-1 gap-2 overflow-y-auto md:grid-cols-2">
                    {SCORE_SHEET_PLACEHOLDERS.map(([token, label]) => (
                      <div key={token} className="rounded-lg bg-white px-3 py-2">
                        <div className="font-mono text-xs font-black text-slate-950">{token}</div>
                        <div className="text-xs text-slate-600">{label}</div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-950">
                    {activeTemplates.length} active format{activeTemplates.length === 1 ? "" : "s"} available for Divisions.
                  </div>
                </details>
              </div>

              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                <Field label="Template HTML / Word Body">
                  <textarea
                    value={templateHtml}
                    onChange={(event) => setTemplateHtml(event.target.value)}
                    className="min-h-[34rem] w-full rounded-xl border border-slate-300 px-4 py-3 font-mono text-sm"
                    spellCheck={false}
                  />
                </Field>

                <Field label="Preview">
                  <iframe
                    title="Score Sheet Preview"
                    srcDoc={previewDocument}
                    className="h-[34rem] w-full rounded-xl border border-slate-300 bg-white"
                  />
                  <p className="mt-2 text-xs text-slate-500">
                    Preview uses sample match data. The print page adds copyright, version, and page number at the bottom.
                  </p>
                </Field>
              </div>

              <div className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2">
                <label className="flex items-center gap-3 text-sm font-bold text-slate-800">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(event) => setIsActive(event.target.checked)}
                    className="h-5 w-5"
                  />
                  Active
                </label>
                <label className="flex items-center gap-3 text-sm font-bold text-slate-800">
                  <input
                    type="checkbox"
                    checked={isDefault}
                    onChange={(event) => setIsDefault(event.target.checked)}
                    className="h-5 w-5"
                  />
                  Default Score Sheet
                </label>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-blue-700 px-5 py-3 font-bold text-white hover:bg-blue-800 disabled:opacity-50"
                >
                  {saving ? "Saving..." : editingId ? "Save Score Sheet" : "Create Score Sheet"}
                </button>
                {editingId && (
                  <button
                    type="button"
                    onClick={clearForm}
                    className="rounded-xl bg-slate-200 px-5 py-3 font-bold text-slate-900 hover:bg-slate-300"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </section>
        </div>
      </div>
    </main>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-bold text-slate-800">{label}</label>
      {children}
    </div>
  );
}

function extractBodyHtml(value) {
  const text = String(value || "");
  const bodyMatch = text.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  return (bodyMatch?.[1] || text).trim();
}

function previewScoreSheetDocument({ templateHtml, sheetTitle, rulesText }) {
  const body = renderPreviewBody({ templateHtml, sheetTitle, rulesText });

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      body { margin: 0; background: #e5e7eb; font-family: Arial, sans-serif; }
      .sheet-page { margin: 0 auto; max-width: 8.5in; min-height: 11in; background: white; padding: 0.35in; }
      .score-sheet { color: #111827; font-family: Arial, sans-serif; font-size: 12px; line-height: 1.2; }
      .score-sheet h1 { margin: 0; text-align: center; font-size: 20px; font-weight: 900; }
      .score-sheet .meta { margin-top: 8px; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 6px; }
      .score-sheet .box { border: 1px solid #111827; padding: 6px; min-height: 34px; }
      .score-sheet .label { display: block; font-size: 9px; font-weight: 900; letter-spacing: 0.04em; text-transform: uppercase; }
      .score-sheet .value { display: block; margin-top: 3px; font-size: 13px; font-weight: 800; }
      .score-sheet table { width: 100%; border-collapse: collapse; }
      .score-sheet th, .score-sheet td { border: 1px solid #111827; padding: 7px; vertical-align: middle; }
      .score-sheet th { background: #e5e7eb; text-align: center; font-size: 14px; font-weight: 900; }
      .score-sheet .header-score { display: inline-block; margin-left: 18px; font-size: 13px; font-weight: 900; }
      .score-sheet .lineups, .score-sheet .configured-lines, .score-sheet .score-entries, .score-sheet .rounds { margin-top: 10px; }
      .score-sheet .line-cell { width: 50%; min-height: 68px; font-size: 13px; font-weight: 800; }
      .score-sheet .line-number { float: left; margin-right: 7px; font-size: 18px; font-weight: 900; }
      .score-sheet .rating { font-size: 11px; font-weight: 700; }
      .score-sheet .team-rating { margin-top: 4px; font-size: 11px; font-weight: 900; }
      .score-sheet .configured-lines th, .score-sheet .configured-lines td, .score-sheet .score-entries th, .score-sheet .score-entries td { font-size: 10px; padding: 5px; }
      .score-sheet .score-entries th { font-size: 12px; }
      .score-sheet .score-entries td { height: 28px; }
      .score-sheet .score-entries .game-col { width: 42%; }
      .score-sheet .score-entries .line-type-col { width: 10%; }
      .score-sheet .score-entries .game-format-col { width: 18%; }
      .score-sheet .score-entries .score-col { width: 15%; }
      .score-sheet .score-entries .compact-game-col { width: 70%; }
      .score-sheet .score-entries td:first-child { font-size: 12px; font-weight: 900; }
      .score-sheet .score-entries.compact td:first-child { font-size: 13px; }
      .score-sheet .score-entry-details { margin-top: 10px; border: 1px solid #111827; background: #f9fafb; padding: 6px; font-size: 13px; font-weight: 900; text-align: center; }
      .score-sheet .score-entry-details span { display: inline-block; margin: 0 10px; }
      .score-sheet .score-entries .grouped-score-row td:first-child { border-left-width: 2px; }
      .score-sheet .score-entries .grouped-score-row td:last-child { border-right-width: 2px; }
      .score-sheet .score-entries .group-start td { border-top-width: 2px; }
      .score-sheet .score-entries .group-end td { border-bottom-width: 2px; }
      .score-sheet .notes { margin-top: 10px; font-size: 12px; font-weight: 400; text-align: justify; line-height: 1.25; }
      .score-sheet .signatures { margin-top: 8px; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
      .score-sheet .signature-line { border-bottom: 1px solid #111827; height: 26px; }
    </style>
  </head>
  <body>
    <div class="sheet-page">
      <div class="score-sheet">
        ${body}
      </div>
    </div>
  </body>
</html>`;
}

function renderPreviewBody({ templateHtml, sheetTitle, rulesText }) {
  const lineupRows = `
    <tr>
      <td class="line-cell"><div class="line-number">1</div><div>Away Player One <span class="rating">(3.65)</span></div><div>Away Player Two <span class="rating">(3.58)</span></div><div class="team-rating">Team Rating: 7.23</div></td>
      <td class="line-cell"><div class="line-number">1</div><div>Home Player One <span class="rating">(3.72)</span></div><div>Home Player Two <span class="rating">(3.51)</span></div><div class="team-rating">Team Rating: 7.23</div></td>
    </tr>
    <tr>
      <td class="line-cell"><div class="line-number">2</div><div>Away Player Three <span class="rating">(3.42)</span></div><div>Away Player Four <span class="rating">(3.39)</span></div><div class="team-rating">Team Rating: 6.81</div></td>
      <td class="line-cell"><div class="line-number">2</div><div>Home Player Three <span class="rating">(3.44)</span></div><div>Home Player Four <span class="rating">(3.33)</span></div><div class="team-rating">Team Rating: 6.77</div></td>
    </tr>
  `;
  const configuredRows = `
    <tr><td>Game 1) Home 1 vs Visitor 1</td><td>Doubles</td><td>Regular to 15, win by 1</td><td>1</td></tr>
    <tr><td>Game 2) Home 2 vs Visitor 2</td><td>Doubles</td><td>Regular to 15, win by 1</td><td>1</td></tr>
  `;
  const configuredTable = `
    <table class="configured-lines">
      <thead><tr><th>Game</th><th>Line Type</th><th>Game Format</th><th>Team Pts</th></tr></thead>
      <tbody>${configuredRows}</tbody>
    </table>
  `;
  const scoreRows = `
    <tr class="grouped-score-row group-start"><td>Game 1) Home 1 vs Visitor 1</td><td></td><td></td></tr>
    <tr class="grouped-score-row"><td>Game 1) Home 1 vs Visitor 1</td><td></td><td></td></tr>
    <tr class="grouped-score-row group-end"><td>Game 1) Home 1 vs Visitor 1</td><td></td><td></td></tr>
    <tr class="grouped-score-row group-start"><td>Game 2) Home 2 vs Visitor 2</td><td></td><td></td></tr>
    <tr class="grouped-score-row"><td>Game 2) Home 2 vs Visitor 2</td><td></td><td></td></tr>
    <tr class="grouped-score-row group-end"><td>Game 2) Home 2 vs Visitor 2</td><td></td><td></td></tr>
  `;
  const scoreTable = `
    <div class="score-entry-details">
      <span>Line Type: Doubles</span>
      <span>Game Format: Regular to 15, win by 1</span>
    </div>
    <table class="score-entries compact">
      <colgroup>
        <col class="compact-game-col" />
        <col class="score-col" />
        <col class="score-col" />
      </colgroup>
      <thead><tr><th>Game</th><th>Away</th><th>Home</th></tr></thead>
      <tbody>${scoreRows}</tbody>
    </table>
  `;
  const captainSignatureRows = `
    <div class="signatures">
      <div>Captain Signature (Away)<div class="signature-line"></div></div>
      <div>Captain Signature (Home)<div class="signature-line"></div></div>
    </div>
  `;
  const replacements = {
    "{{club_name}}": "Lakewood Ranch Pickleball Club",
    "{{sheet_title}}": sheetTitle || DEFAULT_SCORE_SHEET_TEMPLATE_NAME,
    "{{match_date}}": "06/01/2026",
    "{{match_time}}": "10:00 AM",
    "{{location_name}}": "Sample Courts",
    "{{division_name}}": "Sample Division",
    "{{league_name}}": "Sample League",
    "{{home_team}}": "Home Sample Team",
    "{{away_team}}": "Away Sample Team",
    "{{lineup_rows}}": lineupRows,
    "{{round_rows}}": "<tr><th colspan=\"3\">Round 1</th></tr><tr><td>Away 1 vs. Home 1</td><td></td><td></td></tr>",
    "{{configured_game_lines_rows}}": configuredRows,
    "{{configured_game_lines_table}}": configuredTable,
    "{{score_entry_rows}}": scoreRows,
    "{{score_entry_table}}": scoreTable,
    "{{rules_text}}": rulesText || DEFAULT_SCORE_SHEET_RULES,
    "{{captain_signature_rows}}": captainSignatureRows,
  };
  const htmlTokens = [
    "{{lineup_rows}}",
    "{{round_rows}}",
    "{{configured_game_lines_rows}}",
    "{{configured_game_lines_table}}",
    "{{score_entry_rows}}",
    "{{score_entry_table}}",
    "{{captain_signature_rows}}",
  ];

  return Object.entries(replacements).reduce((html, [token, value]) => (
    html.replaceAll(token, htmlTokens.includes(token) ? value : escapeHtml(value))
  ), normalizeScoreSheetTemplateHtml(templateHtml || DEFAULT_SCORE_SHEET_TEMPLATE_HTML));
}

function normalizeScoreSheetTemplateHtml(html) {
  return String(html || "")
    .replaceAll(
      'AWAY Teams <span class="header-score">Score: ______</span>',
      'Away Teams <span class="header-score">Total Team Score: ________</span>'
    )
    .replaceAll(
      'HOME Teams <span class="header-score">Score: ______</span>',
      'Home Teams <span class="header-score">Total Team Score: ________</span>'
    );
}

function slugifyFileName(value) {
  return String(value || "score-sheet-template")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "score-sheet-template";
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
