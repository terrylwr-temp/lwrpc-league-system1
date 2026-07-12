"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import AppHeader from "../components/AppHeader";
import { getRequestAuthorizationHeaders, requireRole, supabase } from "../lib/auth";
import {
  EMAIL_TEMPLATES,
  renderEmailTemplate,
  sampleTemplateValues,
} from "../lib/emailTemplates";

export default function EmailOptionsPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState(() => initialTemplateState());
  const [activeTemplateKey, setActiveTemplateKey] = useState(EMAIL_TEMPLATES[0].key);
  const [savingTemplateKey, setSavingTemplateKey] = useState("");
  const [loading, setLoading] = useState(true);
  const [testNotification, setTestNotification] = useState({
    email: "",
    phone: "",
    subject: "LWRPC Test Notification",
    message: "This is a test notification from the LWRPC League Management System.",
  });
  const [sendingTestNotification, setSendingTestNotification] = useState(false);
  const [testNotificationResult, setTestNotificationResult] = useState(null);
  const [checkingBrevo, setCheckingBrevo] = useState(false);
  const [brevoDiagnostic, setBrevoDiagnostic] = useState(null);
  const [checkingTwilio, setCheckingTwilio] = useState(false);
  const [twilioDiagnostic, setTwilioDiagnostic] = useState(null);

  const activeConfig = useMemo(
    () => EMAIL_TEMPLATES.find((template) => template.key === activeTemplateKey) || EMAIL_TEMPLATES[0],
    [activeTemplateKey]
  );
  const activeTemplate = useMemo(
    () =>
      templates[activeConfig.key] || {
        subject: activeConfig.defaultSubject,
        body: activeConfig.defaultBody,
      },
    [activeConfig, templates]
  );
  const preview = useMemo(
    () => renderEmailTemplate({ ...activeTemplate, template_key: activeConfig.key }, sampleTemplateValues()),
    [activeConfig.key, activeTemplate]
  );

  const loadTemplates = useCallback(async function loadTemplates() {
    const entries = await Promise.all(
      EMAIL_TEMPLATES.map(async (template) => {
        const response = await fetch(`/api/notification-templates?template_key=${encodeURIComponent(template.key)}`);
        const result = await response.json().catch(() => null);
        const saved = result?.template;

        return [
          template.key,
          {
            subject: saved?.subject || template.defaultSubject,
            body: saved?.body || template.defaultBody,
          },
        ];
      })
    );

    setTemplates(Object.fromEntries(entries));
  }, []);

  useEffect(() => {
    async function run() {
      const ok = await requireRole(router, "commissioner");

      if (ok) {
        await loadTemplates();
      }

      setLoading(false);
    }

    run();
  }, [loadTemplates, router]);

  function updateTemplate(field, value) {
    setTemplates((current) => ({
      ...current,
      [activeConfig.key]: {
        ...(current[activeConfig.key] || {}),
        [field]: value,
      },
    }));
  }

  function resetTemplate() {
    const ok = confirm(`Reset ${activeConfig.label} to the built-in default?`);
    if (!ok) return;

    setTemplates((current) => ({
      ...current,
      [activeConfig.key]: {
        subject: activeConfig.defaultSubject,
        body: activeConfig.defaultBody,
      },
    }));
  }

  async function saveTemplate() {
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData?.session?.access_token;

    if (!accessToken) {
      alert("Your session expired. Please log in again before saving email templates.");
      return;
    }

    setSavingTemplateKey(activeConfig.key);
    const response = await fetch("/api/notification-templates", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        template_key: activeConfig.key,
        subject: activeTemplate.subject || activeConfig.defaultSubject,
        body: activeTemplate.body || activeConfig.defaultBody,
      }),
    });
    const result = await response.json().catch(() => null);
    setSavingTemplateKey("");

    if (!response.ok || !result?.success) {
      alert(result?.error || "Unable to save email template.");
      return;
    }

    alert(`${activeConfig.label} template saved.`);
  }

  function updateTestNotification(field, value) {
    setTestNotification((current) => ({
      ...current,
      [field]: value,
    }));
    setTestNotificationResult(null);
  }

  async function sendTestNotification() {
    const email = testNotification.email.trim();
    const phone = testNotification.phone.trim();
    const subject = testNotification.subject.trim();
    const message = testNotification.message.trim();

    if (!email && !phone) {
      setTestNotificationResult({
        ok: false,
        message: "Enter an email address, a mobile number, or both.",
      });
      return;
    }

    if (!subject || !message) {
      setTestNotificationResult({
        ok: false,
        message: "Enter both a subject and a message before sending a test.",
      });
      return;
    }

    setSendingTestNotification(true);
    setTestNotificationResult(null);

    const response = await fetch("/api/notifications", {
      method: "POST",
      headers: await getRequestAuthorizationHeaders({
        "Content-Type": "application/json",
      }),
      body: JSON.stringify({
        emails: email ? [email] : [],
        phones: phone ? [phone] : [],
        subject,
        text: message,
        smsBody: message,
      }),
    });
    const result = await response.json().catch(() => ({}));
    setSendingTestNotification(false);

    if (!response.ok || !result.success) {
      setTestNotificationResult({
        ok: false,
        message: result.error || "The test notification could not be sent.",
      });
      return;
    }

    setTestNotificationResult({
      ok: true,
      message: "Test notification request completed.",
      email: result.email,
      sms: result.sms,
    });
  }

  async function checkBrevoConfiguration() {
    setCheckingBrevo(true);
    setBrevoDiagnostic(null);

    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData?.session?.access_token;

    if (!accessToken) {
      setBrevoDiagnostic({ success: false, error: "Your session expired. Please log in again before checking Brevo." });
      setCheckingBrevo(false);
      return;
    }

    const response = await fetch("/api/brevo-diagnostics", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    setBrevoDiagnostic(await response.json().catch(() => ({})));
    setCheckingBrevo(false);
  }

  async function checkTwilioConfiguration() {
    setCheckingTwilio(true);
    setTwilioDiagnostic(null);

    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData?.session?.access_token;

    if (!accessToken) {
      setTwilioDiagnostic({
        success: false,
        error: "Your session expired. Please log in again before checking Twilio.",
      });
      setCheckingTwilio(false);
      return;
    }

    const response = await fetch("/api/twilio-diagnostics", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    const result = await response.json().catch(() => ({}));
    setTwilioDiagnostic(result);
    setCheckingTwilio(false);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-100 p-6">
        <div className="mx-auto max-w-7xl rounded-2xl bg-white p-6 shadow">
          Loading email options...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-6">
      <div className="mx-auto max-w-7xl">
        <AppHeader
          title="Email Options"
          subtitle="Manage automatic email templates, previews, and notification tests."
        />

        <section className="overflow-hidden rounded-2xl bg-white shadow">
          <div className="border-b border-slate-200 px-4 py-5 md:px-6">
            <div className="flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="text-xl font-black text-slate-950">Email Templates</h2>
                <p className="mt-1 text-sm font-semibold text-slate-600">
                  Configure the emails sent automatically by captain workflows and scoring operations.
                </p>
              </div>
              <div className="text-xs font-black uppercase tracking-wide text-slate-400">
                Brevo
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 p-4 lg:grid-cols-[18rem_minmax(0,1fr)] md:p-6">
            <div className="space-y-2">
              {EMAIL_TEMPLATES.map((template) => (
                <button
                  key={template.key}
                  type="button"
                  onClick={() => setActiveTemplateKey(template.key)}
                  className={`w-full rounded-xl border px-4 py-3 text-left transition ${
                    activeTemplateKey === template.key
                      ? "border-blue-700 bg-blue-50 text-blue-950"
                      : "border-slate-200 bg-white text-slate-800 hover:bg-slate-50"
                  }`}
                >
                  <div className="text-sm font-black">{template.label}</div>
                  <div className="mt-1 text-xs font-semibold text-slate-500">{template.description}</div>
                </button>
              ))}
            </div>

            <div className="space-y-4">
              <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <h3 className="text-lg font-black text-slate-950">{activeConfig.label}</h3>
                  <p className="mt-1 text-sm font-semibold text-slate-600">{activeConfig.description}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {activeConfig.placeholders.map((placeholder) => (
                      <span key={placeholder} className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-700 shadow-sm">
                        {placeholder}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={resetTemplate}
                    className="rounded-xl bg-slate-200 px-4 py-3 text-sm font-bold text-slate-900 hover:bg-slate-300"
                  >
                    Reset Default
                  </button>
                  <button
                    type="button"
                    onClick={saveTemplate}
                    disabled={savingTemplateKey === activeConfig.key}
                    className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-50"
                  >
                    {savingTemplateKey === activeConfig.key ? "Saving..." : "Save Template"}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                <div className="space-y-4">
                  <FieldLabel label="Subject" />
                  <input
                    value={activeTemplate.subject || ""}
                    onChange={(event) => updateTemplate("subject", event.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-4 py-3"
                  />

                  <div>
                    <FieldLabel label="Email Body" />
                    <RichEmailEditor
                      value={activeTemplate.body || ""}
                      onChange={(value) => updateTemplate("body", value)}
                    />
                    <p className="mt-2 text-xs text-slate-500">
                      Use the placeholder chips above to personalize each email.
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <FieldLabel label="Preview Subject" />
                    <div className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-900">
                      {preview.subject}
                    </div>
                  </div>

                  <div>
                    <FieldLabel label="Preview Body" />
                    <div
                      className="min-h-96 overflow-auto rounded-xl border border-slate-300 bg-white p-4"
                      dangerouslySetInnerHTML={{ __html: preview.html }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 overflow-hidden rounded-2xl bg-white shadow">
          <div className="border-b border-slate-200 px-4 py-5 md:px-6">
            <div className="flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="text-xl font-black text-slate-950">Notification Test</h2>
                <p className="mt-1 text-sm font-semibold text-slate-600">
                  Send a test email or text using the same Brevo and Twilio settings used by the app.
                </p>
              </div>
              <div className="text-xs font-black uppercase tracking-wide text-slate-400">
                Email / SMS
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2 md:p-6">
            <GuideField label="Test Email To">
              <input
                type="email"
                value={testNotification.email}
                onChange={(event) => updateTestNotification("email", event.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold"
                placeholder="name@example.com"
              />
            </GuideField>

            <GuideField label="Test Text To">
              <input
                type="tel"
                value={testNotification.phone}
                onChange={(event) => updateTestNotification("phone", event.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold"
                placeholder="941-555-1212"
              />
            </GuideField>

            <GuideField label="Subject">
              <input
                type="text"
                value={testNotification.subject}
                onChange={(event) => updateTestNotification("subject", event.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold"
              />
            </GuideField>

            <div className="md:row-span-2">
              <GuideField label="Message">
                <textarea
                  value={testNotification.message}
                  onChange={(event) => updateTestNotification("message", event.target.value)}
                  rows={5}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold"
                />
              </GuideField>
            </div>

            <div className="flex flex-col justify-end gap-3">
              <button
                type="button"
                onClick={checkBrevoConfiguration}
                disabled={checkingBrevo}
                className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-black uppercase tracking-wide text-slate-900 hover:bg-slate-50 disabled:opacity-50"
              >
                {checkingBrevo ? "Checking Brevo..." : "Check Brevo Email Configuration"}
              </button>

              <button
                type="button"
                onClick={checkTwilioConfiguration}
                disabled={checkingTwilio}
                className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-black uppercase tracking-wide text-slate-900 hover:bg-slate-50 disabled:opacity-50"
              >
                {checkingTwilio ? "Checking Twilio..." : "Check Twilio SMS Configuration"}
              </button>

              <button
                type="button"
                onClick={sendTestNotification}
                disabled={sendingTestNotification}
                className="rounded-xl bg-blue-700 px-4 py-3 text-sm font-black uppercase tracking-wide text-white hover:bg-blue-800 disabled:opacity-50"
              >
                {sendingTestNotification ? "Sending Test..." : "Send Test Notification"}
              </button>

              {testNotificationResult && (
                <div
                  className={`rounded-xl border px-4 py-3 text-sm font-semibold ${
                    testNotificationResult.ok
                      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                      : "border-red-200 bg-red-50 text-red-900"
                  }`}
                >
                  <div className="font-black">{testNotificationResult.message}</div>
                  {testNotificationResult.ok && (
                    <div className="mt-2 space-y-1 text-xs leading-5">
                      <div>{notificationChannelSummary("Email", testNotificationResult.email)}</div>
                      <div>{notificationChannelSummary("Text", testNotificationResult.sms)}</div>
                    </div>
                  )}
                </div>
              )}

              {brevoDiagnostic && (
                <BrevoDiagnosticResult diagnostic={brevoDiagnostic} />
              )}
              {twilioDiagnostic && (
                <TwilioDiagnosticResult diagnostic={twilioDiagnostic} />
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function initialTemplateState() {
  return Object.fromEntries(
    EMAIL_TEMPLATES.map((template) => [
      template.key,
      {
        subject: template.defaultSubject,
        body: template.defaultBody,
      },
    ])
  );
}

function RichEmailEditor({ value, onChange }) {
  const editorRef = useRef(null);
  const initializedRef = useRef(false);
  const lastHtmlRef = useRef(value || "");

  useEffect(() => {
    if (!editorRef.current) return;
    const nextValue = value || "";

    if (!initializedRef.current) {
      editorRef.current.innerHTML = nextValue;
      lastHtmlRef.current = nextValue;
      initializedRef.current = true;
      return;
    }

    if (document.activeElement === editorRef.current) return;
    if (nextValue === lastHtmlRef.current) return;

    editorRef.current.innerHTML = nextValue;
    lastHtmlRef.current = nextValue;
  }, [value]);

  function syncValue() {
    const html = editorRef.current?.innerHTML || "";
    lastHtmlRef.current = html;
    onChange(html);
  }

  function focusEditor() {
    editorRef.current?.focus();
  }

  function runCommand(command, commandValue = null) {
    focusEditor();
    document.execCommand(command, false, commandValue);
    syncValue();
  }

  function insertHtml(html) {
    focusEditor();
    document.execCommand("insertHTML", false, html);
    syncValue();
  }

  function addLink() {
    const url = prompt("Enter the link URL");
    if (!url) return;
    runCommand("createLink", url);
  }

  function addLeagueSiteLink() {
    insertHtml('<a href="{{league_site_url}}">League Site</a>');
  }

  function addMainEmailLink() {
    insertHtml('<a href="mailto:{{main_email}}">{{main_email}}</a>');
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-300 bg-white">
      <div className="flex flex-wrap gap-1 border-b border-slate-200 bg-slate-50 p-2">
        <EditorButton label="B" title="Bold" onClick={() => runCommand("bold")} />
        <EditorButton label="I" title="Italic" onClick={() => runCommand("italic")} />
        <EditorButton label="U" title="Underline" onClick={() => runCommand("underline")} />
        <EditorButton label="H2" title="Heading" onClick={() => runCommand("formatBlock", "h2")} />
        <EditorButton label="P" title="Paragraph" onClick={() => runCommand("formatBlock", "p")} />
        <EditorButton label="Bullets" title="Bullet list" onClick={() => runCommand("insertUnorderedList")} />
        <EditorButton label="Numbers" title="Numbered list" onClick={() => runCommand("insertOrderedList")} />
        <EditorButton label="Link" title="Add link" onClick={addLink} />
        <EditorButton label="League Site" title="Insert League Site URL link" onClick={addLeagueSiteLink} />
        <EditorButton label="Main Email" title="Insert Main League Email link" onClick={addMainEmailLink} />
        <EditorButton
          label="Logo"
          title="Insert club logo"
          onClick={() =>
            insertHtml(
              '<p><img src="https://lwrpickleballclub.com/lwrpc-logo.png" alt="Lakewood Ranch Pickleball Club" style="width: 84px; height: 84px; object-fit: contain;" /></p>'
            )
          }
        />
        <EditorButton
          label="Clear"
          title="Clear formatting"
          onClick={() => runCommand("removeFormat")}
        />
      </div>

      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={syncValue}
        onBlur={syncValue}
        className="min-h-72 overflow-auto px-4 py-3 text-sm leading-6 text-slate-900 outline-none focus:ring-2 focus:ring-blue-200"
      />
    </div>
  );
}

function EditorButton({ label, title, onClick }) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-800 shadow-sm hover:bg-blue-50 hover:text-blue-900"
    >
      {label}
    </button>
  );
}

function FieldLabel({ label }) {
  return (
    <label className="mb-1 block text-sm font-semibold text-slate-700">
      {label}
    </label>
  );
}

function GuideField({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">
        {label}
      </span>
      {children}
    </label>
  );
}

function notificationChannelSummary(label, result) {
  if (!result) return `${label}: no response.`;
  if (result.skipped) return `${label}: skipped - ${result.reason || "not requested"}.`;

  const sent = Number(result.sent || 0);
  const failed = (result.results || []).filter((item) => item && item.ok === false);
  if (failed.length > 0) {
    const firstError = failed.map((item) => item.error).filter(Boolean)[0];
    return `${label}: ${sent} sent, ${failed.length} failed${firstError ? ` - ${firstError}` : ""}.`;
  }

  return `${label}: ${sent} sent.`;
}

function BrevoDiagnosticResult({ diagnostic }) {
  if (!diagnostic?.success) {
    return <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-900">{diagnostic?.error || "Brevo diagnostics could not be loaded."}</div>;
  }

  const senderCheck = diagnostic.brevoSenderCheck || {};
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800">
      <div className="font-black text-slate-950">Brevo sender: {diagnostic.fromEmail || "not configured"}</div>
      <div className="mt-1 text-xs font-semibold text-slate-600">Reply-to: {diagnostic.replyToEmail || "same as sender"}</div>
      <div className={`mt-2 rounded-lg px-3 py-2 text-xs font-bold ${senderCheck.ok ? "bg-emerald-100 text-emerald-900" : "bg-red-100 text-red-900"}`}>
        Sender check: {senderCheck.message || "No sender check result."}{senderCheck.status ? ` Status ${senderCheck.status}.` : ""}
      </div>
      <div className="mt-3 grid gap-2">
        {(diagnostic.variables || []).map((item) => (
          <div key={item.name} className="rounded-lg border border-slate-200 bg-white p-3">
            <div className="font-black text-slate-950">{item.name}</div>
            <div className="mt-1 text-xs leading-5 text-slate-700">Present: {item.trimmedPresent ? "yes" : "no"} | Prefix: {item.prefix || "blank"} | Length: {item.trimmedLength}</div>
            {(item.hasLeadingOrTrailingWhitespace || item.hasInternalWhitespace || item.wrappedInQuotes) && <div className="mt-2 rounded-lg bg-amber-100 px-3 py-2 text-xs font-bold text-amber-900">Check this value: whitespace or quote characters were detected.</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

function TwilioDiagnosticResult({ diagnostic }) {
  if (!diagnostic?.success) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-900">
        {diagnostic?.error || "Twilio diagnostics could not be loaded."}
      </div>
    );
  }

  const authCheck = diagnostic.twilioAuthCheck || {};

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800">
      <div className="font-black text-slate-950">
        Twilio sender mode: {diagnostic.senderMode || "unknown"}
      </div>
      <div className={`mt-2 rounded-lg px-3 py-2 text-xs font-bold ${authCheck.ok ? "bg-emerald-100 text-emerald-900" : "bg-red-100 text-red-900"}`}>
        Auth check: {authCheck.message || "No auth check result."}
        {authCheck.status ? ` Status ${authCheck.status}.` : ""}
        {authCheck.code ? ` Code ${authCheck.code}.` : ""}
      </div>

      <div className="mt-3 grid gap-2">
        {(diagnostic.variables || []).map((item) => (
          <div key={item.name} className="rounded-lg border border-slate-200 bg-white p-3">
            <div className="font-black text-slate-950">{item.name}</div>
            <div className="mt-1 text-xs leading-5 text-slate-700">
              Present: {item.trimmedPresent ? "yes" : "no"} | Prefix: {item.prefix || "blank"} | Length: {item.trimmedLength}
              {item.expectedPrefix ? ` | Expected prefix: ${item.expectedPrefix}` : ""}
            </div>
            {(item.hasLeadingOrTrailingWhitespace || item.hasInternalWhitespace || item.wrappedInQuotes || item.startsWithExpectedPrefix === false) && (
              <div className="mt-2 rounded-lg bg-amber-100 px-3 py-2 text-xs font-bold text-amber-900">
                Check this value: wrong prefix, whitespace, or quote characters were detected.
              </div>
            )}
          </div>
        ))}
      </div>

      {diagnostic.unexpectedTwilioVariableNames?.length > 0 && (
        <div className="mt-3 rounded-lg bg-amber-100 px-3 py-2 text-xs font-bold text-amber-900">
          Unexpected Twilio env names found: {diagnostic.unexpectedTwilioVariableNames.join(", ")}
        </div>
      )}
    </div>
  );
}
