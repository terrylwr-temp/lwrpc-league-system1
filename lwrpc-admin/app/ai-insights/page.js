"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import AppHeader from "../components/AppHeader";
import LoadingScreen from "../components/LoadingScreen";
import { requireRole, supabase } from "../lib/auth";

const PROMPTS = [
  "What needs attention this week?",
  "Which matches need score follow-up?",
  "Which captains still need lineup help?",
  "What rating or member cleanup should I do first?",
];

export default function AiInsightsPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [snapshot, setSnapshot] = useState(null);
  const [aiConfigured, setAiConfigured] = useState(false);
  const [model, setModel] = useState("");
  const [error, setError] = useState("");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [answerMeta, setAnswerMeta] = useState(null);
  const [loadingSnapshot, setLoadingSnapshot] = useState(false);
  const [asking, setAsking] = useState(false);
  const [chartsReady, setChartsReady] = useState(false);

  useEffect(() => {
    setChartsReady(true);
  }, []);

  const fetchWithToken = useCallback(async function fetchWithToken(path, options = {}) {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    if (!token) throw new Error("Your session expired. Please log in again.");

    return fetch(path, {
      ...options,
      headers: {
        ...(options.headers || {}),
        Authorization: `Bearer ${token}`,
      },
    });
  }, []);

  const loadInsights = useCallback(async function loadInsights() {
    setLoadingSnapshot(true);
    setError("");

    try {
      const response = await fetchWithToken("/api/ai-insights");
      const result = await response.json().catch(() => ({}));

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Unable to load AI insights.");
      }

      setSnapshot(result.snapshot);
      setAiConfigured(Boolean(result.aiConfigured));
      setModel(result.model || "");
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoadingSnapshot(false);
    }
  }, [fetchWithToken]);

  useEffect(() => {
    async function init() {
      const user = await requireRole(router, "league_manager");
      if (!user) return;
      setReady(true);
      await loadInsights();
    }

    init();
  }, [loadInsights, router]);

  async function askLms(nextQuestion = question) {
    const cleanQuestion = String(nextQuestion || "").trim();
    if (!cleanQuestion) return;

    setQuestion(cleanQuestion);
    setAsking(true);
    setError("");
    setAnswer("");
    setAnswerMeta(null);

    try {
      const response = await fetchWithToken("/api/ai-insights", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ question: cleanQuestion }),
      });
      const result = await response.json().catch(() => ({}));

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Unable to ask LMS.");
      }

      setAnswer(result.answer || "");
      setAnswerMeta({
        aiEnabled: Boolean(result.aiEnabled),
        model: result.model || "",
        warning: result.warning || "",
      });
      setSnapshot(result.snapshot || snapshot);
      setAiConfigured(Boolean(result.aiEnabled || aiConfigured));
    } catch (askError) {
      setError(askError.message);
    } finally {
      setAsking(false);
    }
  }

  const highPriorityCount = useMemo(
    () => (snapshot?.anomalies || []).filter((item) => item.severity === "high").length +
      (snapshot?.cleanupSuggestions || []).filter((item) => item.severity === "high").length,
    [snapshot]
  );

  if (!ready) return <LoadingScreen subtitle="Loading AI League Insights..." />;

  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-6">
      <div className="mx-auto max-w-7xl">
        <AppHeader
          title="AI League Insights"
          subtitle="Ask LMS, weekly health, anomalies, lineup gaps, and cleanup suggestions."
          actions={
            <div className="grid grid-cols-1 gap-2 sm:flex">
              <button
                type="button"
                onClick={loadInsights}
                disabled={loadingSnapshot}
                className="rounded-xl border border-white/25 bg-white px-4 py-2 text-sm font-black text-slate-950 shadow-sm hover:bg-slate-100 disabled:opacity-60"
              >
                {loadingSnapshot ? "Refreshing..." : "Refresh"}
              </button>
              <button
                type="button"
                onClick={() => router.push("/")}
                className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-black text-white shadow-sm hover:bg-emerald-400"
              >
                Admin Dashboard
              </button>
            </div>
          }
        />

        {error && (
          <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-800">
            {error}
          </div>
        )}

        <section className="mb-5 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(360px,0.8fr)]">
          <div className="overflow-hidden rounded-2xl border border-white/80 bg-white shadow-[0_18px_46px_-34px_rgba(15,23,42,0.8)]">
            <div className="border-b border-blue-100 bg-[linear-gradient(135deg,#0f766e,#2563eb)] p-5 text-white">
              <div className="text-xs font-black uppercase tracking-wide text-cyan-100">Ask LMS</div>
              <h2 className="mt-1 text-2xl font-black">Search your league operations snapshot</h2>
              <p className="mt-2 max-w-3xl text-sm font-semibold text-blue-50">
                This assistant is read-only. It summarizes LMS data without sending emails or phone numbers to AI.
              </p>
            </div>
            <div className="p-4">
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  askLms();
                }}
                className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_auto]"
              >
                <textarea
                  value={question}
                  onChange={(event) => setQuestion(event.target.value)}
                  placeholder="Ask about score follow-up, captain lineup gaps, missing ratings, member cleanup, or standings anomalies."
                  className="min-h-28 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-950 shadow-inner outline-none ring-blue-500/20 focus:ring-4"
                />
                <button
                  type="submit"
                  disabled={asking || !question.trim()}
                  className="rounded-xl bg-blue-700 px-5 py-3 text-sm font-black text-white shadow-sm hover:bg-blue-800 disabled:bg-slate-300 lg:self-start"
                >
                  {asking ? "Asking..." : "Ask LMS"}
                </button>
              </form>

              <div className="mt-3 flex flex-wrap gap-2">
                {PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => askLms(prompt)}
                    disabled={asking}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-black text-slate-700 shadow-sm hover:border-blue-300 hover:bg-blue-50"
                  >
                    {prompt}
                  </button>
                ))}
              </div>

              {(answer || asking) && (
                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-sm font-black text-slate-950">Answer</div>
                    {answerMeta && (
                      <div className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-600 shadow-sm">
                        {answerMeta.aiEnabled ? `AI: ${answerMeta.model || "OpenAI"}` : "Rule-based snapshot"}
                      </div>
                    )}
                  </div>
                  {answerMeta?.warning && (
                    <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-900">
                      {answerMeta.warning}
                    </div>
                  )}
                  <div className="mt-3 whitespace-pre-wrap text-sm font-semibold leading-6 text-slate-800">
                    {asking ? "Reading the latest LMS snapshot..." : answer}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-white/80 bg-white p-4 shadow-[0_18px_46px_-34px_rgba(15,23,42,0.8)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs font-black uppercase tracking-wide text-slate-500">AI Status</div>
                <h2 className="mt-1 text-xl font-black text-slate-950">
                  {aiConfigured ? "OpenAI Enabled" : "Rule-Based Mode"}
                </h2>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-black ${
                aiConfigured ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900"
              }`}>
                {aiConfigured ? model || "Configured" : "No API key"}
              </span>
            </div>
            <p className="mt-3 text-sm font-semibold text-slate-600">
              {aiConfigured
                ? "Ask LMS sends a compact, admin-only operations snapshot to OpenAI. Contact details are excluded."
                : "Set OPENAI_API_KEY on the server to enable natural-language answers. The page still computes insights locally."}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <MiniMetric label="Season" value={snapshot?.season || "-"} />
              <MiniMetric label="High Priority" value={highPriorityCount} tone={highPriorityCount ? "red" : "emerald"} />
              <MiniMetric label="Teams" value={snapshot?.counts?.activeTeams ?? "-"} />
              <MiniMetric label="Members" value={snapshot?.counts?.activeMembers ?? "-"} />
            </div>
          </div>
        </section>

        <section className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
          {(snapshot?.weekly || []).map((item) => (
            <HealthCard key={item.label} item={item} />
          ))}
          {!snapshot && (
            <div className="col-span-full rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm font-bold text-slate-500">
              {loadingSnapshot ? "Loading league health summary..." : "No insight snapshot loaded."}
            </div>
          )}
        </section>

        <SchedulingInsightsPanel
          items={snapshot?.divisionSchedulingInsights || []}
          chartsReady={chartsReady}
          loading={loadingSnapshot}
        />

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          <InsightPanel
            title="Score And Standings Anomalies"
            description="Items that can affect verified results, standings, or score operations."
            items={snapshot?.anomalies || []}
            empty="No score or standings anomalies were found in this snapshot."
          />
          <LineupPanel items={snapshot?.lineupNeeds || []} />
          <InsightPanel
            title="Rating / Member Cleanup"
            description="Data hygiene items from memberships, ratings, rosters, and team captain assignments."
            items={snapshot?.cleanupSuggestions || []}
            empty="No member cleanup suggestions were found in this snapshot."
          />
          <InsightPanel
            title="Overdue Score Follow-Up"
            description="Published past matches that are not verified yet."
            items={(snapshot?.overdueScoreMatches || []).map((match) => ({
              severity: match.status === "pending_verification" ? "medium" : "high",
              title: match.status === "pending_verification" ? "Pending verification" : "Score needed",
              detail: `${match.match} on ${match.date || "No date"} is ${match.status || "not_entered"}.`,
              path: match.path,
            }))}
            empty="No overdue score follow-up items were found."
          />
        </div>
      </div>
    </main>
  );
}

const chartTooltipStyle = {
  borderRadius: "12px",
  border: "1px solid #cbd5e1",
  boxShadow: "0 12px 30px -20px rgba(15,23,42,0.75)",
  fontWeight: 700,
};

function MiniMetric({ label, value, tone = "slate" }) {
  const toneClass = tone === "red"
    ? "text-red-700"
    : tone === "emerald"
      ? "text-emerald-700"
      : "text-slate-950";

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
      <div className="text-[11px] font-black uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`mt-1 break-words text-lg font-black ${toneClass}`}>{value}</div>
    </div>
  );
}

function HealthCard({ item }) {
  const toneClass = {
    blue: "border-blue-200 bg-blue-50 text-blue-950",
    amber: "border-amber-200 bg-amber-50 text-amber-950",
    red: "border-red-200 bg-red-50 text-red-950",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-950",
  }[item.tone] || "border-slate-200 bg-white text-slate-950";

  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${toneClass}`}>
      <div className="text-xs font-black uppercase tracking-wide opacity-75">{item.label}</div>
      <div className="mt-2 text-3xl font-black">{item.value}</div>
    </div>
  );
}

function SchedulingInsightsPanel({ items, chartsReady, loading }) {
  return (
    <section className="mb-5 overflow-hidden rounded-2xl border border-white/80 bg-white shadow-[0_18px_46px_-34px_rgba(15,23,42,0.8)]">
      <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
        <h2 className="text-lg font-black text-slate-950">AI Scheduling Insights</h2>
        <p className="mt-1 text-sm font-semibold text-slate-600">
          Division progress, score follow-up, verification, and lineup gaps from the current operations snapshot.
        </p>
      </div>
      <div className="p-3">
        {items.length > 0 ? (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 2xl:grid-cols-3">
            {items.map((item) => (
              <DivisionSchedulingCard key={item.id || `${item.league}-${item.division}`} item={item} chartsReady={chartsReady} />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-8 text-center text-sm font-bold text-slate-500">
            {loading ? "Loading division scheduling insights..." : "No active division scheduling insights are available."}
          </div>
        )}
      </div>
    </section>
  );
}

function DivisionSchedulingCard({ item, chartsReady }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="text-xs font-black uppercase tracking-wide text-blue-700">{item.league || "League"}</div>
          <h3 className="mt-1 break-words text-lg font-black text-slate-950">{item.division || "Division"}</h3>
          <div className="mt-1 text-xs font-bold text-slate-500">{item.season || "Season"}</div>
        </div>
        <div className="w-full sm:w-36">
          {chartsReady ? (
            <DivisionSchedulingPie
              completed={item.completedMatches}
              remaining={item.remainingMatches}
              percentage={item.completionPercentage}
            />
          ) : (
            <div className="flex h-36 items-center justify-center rounded-xl bg-slate-50 text-xs font-black text-slate-500">
              Charts loading...
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <MiniMetric label="Scheduled" value={item.scheduledMatches ?? 0} />
        <MiniMetric label="Complete" value={`${item.completionPercentage ?? 0}%`} tone={(item.completionPercentage || 0) >= 80 ? "emerald" : "slate"} />
        <MiniMetric label="Score Follow-Up" value={item.overdueScoreMatches ?? 0} tone={item.overdueScoreMatches ? "red" : "emerald"} />
        <MiniMetric label="Lineup Gaps" value={item.lineupGaps ?? 0} tone={item.lineupGaps ? "red" : "emerald"} />
      </div>
      <div className="mt-2">
        <MiniMetric label="Pending Verification" value={item.pendingVerification ?? 0} tone={item.pendingVerification ? "red" : "emerald"} />
      </div>
    </div>
  );
}

function DivisionSchedulingPie({ completed, remaining, percentage }) {
  const chartValue = Math.max(0, Math.min(100, Number(percentage || 0)));
  const completedCount = Math.max(0, Number(completed || 0));
  const remainingCount = Math.max(0, Number(remaining || 0));
  const data = completedCount + remainingCount > 0
    ? [
        { name: "Completed", value: completedCount, fill: "#059669" },
        { name: "Remaining", value: remainingCount, fill: "#e2e8f0" },
      ]
    : [{ name: "No Matches", value: 1, fill: "#e2e8f0" }];

  return (
    <div className="relative h-36">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius="58%"
            outerRadius="86%"
            paddingAngle={completedCount && remainingCount ? 3 : 0}
            startAngle={90}
            endAngle={-270}
            stroke="#ffffff"
            strokeWidth={3}
          >
            {data.map((entry) => (
              <Cell key={entry.name} fill={entry.fill} />
            ))}
          </Pie>
          <Tooltip contentStyle={chartTooltipStyle} />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-2xl font-black text-slate-950">{chartValue}%</div>
        <div className="text-[10px] font-black uppercase tracking-wide text-slate-500">Complete</div>
      </div>
    </div>
  );
}

function InsightPanel({ title, description, items, empty }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-white/80 bg-white shadow-[0_18px_46px_-34px_rgba(15,23,42,0.8)]">
      <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
        <h2 className="text-lg font-black text-slate-950">{title}</h2>
        <p className="mt-1 text-sm font-semibold text-slate-600">{description}</p>
      </div>
      <div className="max-h-[28rem] overflow-y-auto p-3">
        {items.length > 0 ? (
          <div className="space-y-2">
            {items.map((item, index) => (
              <IssueCard key={`${item.title}-${index}`} item={item} />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-8 text-center text-sm font-bold text-slate-500">
            {empty}
          </div>
        )}
      </div>
    </section>
  );
}

function LineupPanel({ items }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-white/80 bg-white shadow-[0_18px_46px_-34px_rgba(15,23,42,0.8)]">
      <div className="border-b border-blue-100 bg-blue-50 px-4 py-3">
        <h2 className="text-lg font-black text-blue-950">Captain Lineup Helper</h2>
        <p className="mt-1 text-sm font-semibold text-blue-800">
          Upcoming teams whose saved Match Setup lineups are incomplete.
        </p>
      </div>
      <div className="max-h-[28rem] overflow-y-auto p-3">
        {items.length > 0 ? (
          <div className="space-y-2">
            {items.map((item) => (
              <a
                key={`${item.matchId}-${item.team}-${item.side}`}
                href={item.path || "/matches"}
                className="block rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 shadow-sm transition hover:-translate-y-0.5 hover:border-amber-300 hover:bg-amber-100"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="break-words text-sm font-black text-amber-950">{item.team}</div>
                    <div className="mt-1 text-xs font-bold text-amber-900">{item.match} on {item.date || "No date"}</div>
                  </div>
                  <div className="rounded-full bg-white px-3 py-1 text-xs font-black text-amber-900 shadow-sm">
                    {item.complete}/{item.expected}
                  </div>
                </div>
              </a>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-blue-200 bg-blue-50 px-3 py-8 text-center text-sm font-bold text-blue-800">
            No upcoming lineup gaps were found.
          </div>
        )}
      </div>
    </section>
  );
}

function IssueCard({ item }) {
  const toneClass = {
    high: "border-red-200 bg-red-50 text-red-950",
    medium: "border-amber-200 bg-amber-50 text-amber-950",
    low: "border-slate-200 bg-slate-50 text-slate-900",
  }[item.severity] || "border-slate-200 bg-slate-50 text-slate-900";

  const content = (
    <div className={`rounded-xl border px-3 py-3 shadow-sm ${toneClass}`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-white/80 px-2 py-0.5 text-[11px] font-black uppercase tracking-wide shadow-sm">
          {item.severity || "info"}
        </span>
        <span className="text-sm font-black">{item.title}</span>
      </div>
      <div className="mt-1 text-sm font-semibold opacity-90">{item.detail}</div>
    </div>
  );

  if (!item.path) return content;

  return (
    <a href={item.path} className="block transition hover:-translate-y-0.5">
      {content}
    </a>
  );
}
