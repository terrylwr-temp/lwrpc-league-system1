import { sendSmsMessages as sendSmsMessagesWithFallback } from "./notifications";
import { loadServerSystemSettings } from "./serverEmailTemplates";

const DEFAULT_TIME_ZONE = "America/New_York";
const PBCC_REMINDER_LOG_TYPE = "reminder";
const PBCC_REMINDER_KIND = "pbcc_match_reminder";

function sendSmsMessages(options) {
  return sendSmsMessagesWithFallback({
    ...options,
    preferAppNotifications: true,
    appNotificationTitle: "PBCourtCommand",
    appNotificationUrl: options?.appNotificationUrl || options?.publicUrl || "/pbcc/player",
    appNotificationIcon: "/favicon.ico",
  });
}

function normalizeReminderHours(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.min(168, Math.max(0, Math.round(numeric)));
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + Number(days || 0));
  return next;
}

function dateInTimeZone(date, timeZone = DEFAULT_TIME_ZONE) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${byType.year}-${byType.month}-${byType.day}`;
}

function zonedDateTimeToUtc(dateValue, timeValue, timeZone = DEFAULT_TIME_ZONE) {
  const dateMatch = String(dateValue || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  const timeMatch = String(timeValue || "").match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (!dateMatch || !timeMatch) return null;

  const desiredUtc = Date.UTC(
    Number(dateMatch[1]),
    Number(dateMatch[2]) - 1,
    Number(dateMatch[3]),
    Number(timeMatch[1]),
    Number(timeMatch[2]),
    Number(timeMatch[3] || 0)
  );
  const guess = new Date(desiredUtc);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(guess);
  const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const zonedAsUtc = Date.UTC(
    Number(byType.year),
    Number(byType.month) - 1,
    Number(byType.day),
    Number(byType.hour),
    Number(byType.minute),
    Number(byType.second)
  );
  const offset = zonedAsUtc - guess.getTime();
  return new Date(desiredUtc - offset);
}

function defaultSmsTemplates() {
  return {
    sessionReminder: "{{group_name}} reminder: {{session_name}} match is coming up on {{date}} at {{time}}{{location_line}}. {{joined_count}} joined, {{available_spots}} spots open. {{public_link}}",
  };
}

function normalizeSmsTemplates(templates = {}) {
  const defaults = defaultSmsTemplates();
  return {
    sessionReminder: String(templates.sessionReminder || defaults.sessionReminder),
  };
}

function formatSessionTime(value) {
  const [hourText, minuteText] = String(value || "").split(":");
  const hour = Number(hourText || 0);
  const minute = Number(minuteText || 0);
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function renderSmsTemplate(template, { group, session, publicUrl, joinedCount, availableSpots } = {}) {
  const date = session?.session_date ? new Date(`${session.session_date}T12:00:00`).toLocaleDateString("en-US") : "the next match";
  const time = session?.starts_at ? formatSessionTime(session.starts_at) : "TBD";
  const location = session?.location ? session.location : "";
  const replacements = {
    group_name: group?.name || "PBCourtCommand",
    session_name: session?.session_name || "PBCourtCommand match",
    date,
    time,
    location,
    location_line: location ? ` at ${location}` : "",
    public_link: publicUrl || "",
    joined_count: joinedCount ?? "",
    available_spots: availableSpots ?? "",
  };

  return String(template || "")
    .replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => replacements[key] ?? "")
    .replace(/[^\S\n]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function playerUrlForGroup(systemSettings, group) {
  const baseUrl = String(systemSettings.league_site_url || "https://league.lwrpickleballclub.com").replace(/\/+$/, "");
  const key = String(group?.slug || group?.id || "").trim();
  const path = key === "rpro" || key === "pbcc" ? "/pbcc/player" : `/round-robin/${key}/player`;
  return `${baseUrl}${path}`;
}

function reminderKey(session, hoursBefore) {
  return `${PBCC_REMINDER_KIND}:${session.id}:${hoursBefore}:${session.session_date}:${session.starts_at || ""}`;
}

function sessionTextCounts(session, sessionPlayers = []) {
  const joinedCount = sessionPlayers.filter((player) => player.response_status === "joined").length;
  const maxPlayers = Number(session?.max_players || 0);
  return {
    joinedCount,
    availableSpots: maxPlayers > 0 ? Math.max(0, maxPlayers - joinedCount) : "",
  };
}

function groupRowsByKey(rows, key) {
  return (rows || []).reduce((map, row) => {
    const value = String(row[key] || "");
    if (!map.has(value)) map.set(value, []);
    map.get(value).push(row);
    return map;
  }, new Map());
}

async function insertReminderLog(supabase, group, session, metadata, message) {
  const { error } = await supabase.from("round_robin_activity_log").insert({
    group_id: group.id,
    session_id: session.id,
    log_type: PBCC_REMINDER_LOG_TYPE,
    message,
    metadata,
  });
  if (error) throw error;
}

export async function runPbccMatchReminders(supabase, { dryRun = false, now = new Date() } = {}) {
  const systemSettings = await loadServerSystemSettings();
  const timeZone = systemSettings.timezone || DEFAULT_TIME_ZONE;
  const startDate = dateInTimeZone(addDays(now, -1), timeZone);
  const endDate = dateInTimeZone(addDays(now, 14), timeZone);

  const { data: sessions, error: sessionsError } = await supabase
    .from("round_robin_sessions")
    .select("id, group_id, session_name, location, session_date, starts_at, status, mode, max_players, settings")
    .gte("session_date", startDate)
    .lte("session_date", endDate)
    .in("status", ["draft", "open", "playing"])
    .order("session_date", { ascending: true })
    .order("starts_at", { ascending: true });
  if (sessionsError) throw sessionsError;

  const sessionRows = sessions || [];
  const sessionIds = sessionRows.map((session) => session.id);
  const groupIds = [...new Set(sessionRows.map((session) => session.group_id).filter(Boolean))];

  if (sessionIds.length === 0 || groupIds.length === 0) {
    return { success: true, dryRun, sent: 0, pending: 0, texts: 0, results: [] };
  }

  const [groupsResult, playersResult, logsResult] = await Promise.all([
    supabase
      .from("round_robin_groups")
      .select("id, name, slug, timezone, settings")
      .in("id", groupIds),
    supabase
      .from("round_robin_session_players")
      .select("id, session_id, display_name, phone, response_status")
      .in("session_id", sessionIds)
      .order("sort_order", { ascending: true }),
    supabase
      .from("round_robin_activity_log")
      .select("id, session_id, metadata")
      .in("session_id", sessionIds)
      .eq("log_type", PBCC_REMINDER_LOG_TYPE),
  ]);
  if (groupsResult.error) throw groupsResult.error;
  if (playersResult.error) throw playersResult.error;
  if (logsResult.error) throw logsResult.error;

  const groupById = new Map((groupsResult.data || []).map((group) => [String(group.id), group]));
  const playersBySession = groupRowsByKey(playersResult.data || [], "session_id");
  const sentReminderKeys = new Set(
    (logsResult.data || [])
      .map((log) => log.metadata?.reminderKey)
      .filter(Boolean)
  );

  const results = [];
  let textCount = 0;

  for (const session of sessionRows) {
    const group = groupById.get(String(session.group_id));
    if (!group) continue;

    const hoursBefore = normalizeReminderHours(session.settings?.reminderHoursBefore);
    if (hoursBefore <= 0 || !session.starts_at) continue;

    const matchStart = zonedDateTimeToUtc(session.session_date, session.starts_at, group.timezone || timeZone);
    if (!matchStart) continue;

    const remindAt = new Date(matchStart.getTime() - hoursBefore * 60 * 60 * 1000);
    if (now < remindAt || now >= matchStart) continue;

    const key = reminderKey(session, hoursBefore);
    if (sentReminderKeys.has(key)) continue;

    const sessionPlayers = playersBySession.get(String(session.id)) || [];
    const reminderPlayers = sessionPlayers.filter((player) => ["joined", "invited"].includes(player.response_status));
    const phones = reminderPlayers.map((player) => player.phone).filter(Boolean);
    const counts = sessionTextCounts(session, sessionPlayers);
    const resultBase = {
      group: group.name,
      sessionId: session.id,
      session: session.session_name || "Match",
      matchDate: session.session_date,
      startsAt: session.starts_at,
      hoursBefore,
      recipients: phones.length,
      joinedRecipients: reminderPlayers.filter((player) => player.response_status === "joined").length,
      invitedRecipients: reminderPlayers.filter((player) => player.response_status === "invited").length,
    };

    if (group.settings?.smsSendingEnabled !== true) {
      results.push({ ...resultBase, skipped: true, reason: "SMS disabled in PBCC settings" });
      continue;
    }

    if (phones.length === 0) {
      results.push({ ...resultBase, skipped: true, reason: "No joined or pending invited players with phone numbers" });
      continue;
    }

    const template = normalizeSmsTemplates(group.settings?.smsTemplates || {}).sessionReminder;
    const message = renderSmsTemplate(template, {
      group,
      session,
      publicUrl: playerUrlForGroup(systemSettings, group),
      ...counts,
    });

    if (dryRun) {
      textCount += phones.length;
      results.push({ ...resultBase, dryRun: true, texts: phones.length });
      continue;
    }

    const sms = await sendSmsMessages({ phones, body: message });
    const sent = sms.sent || 0;
    textCount += sent;
    await insertReminderLog(
      supabase,
      group,
      session,
      {
        reminderKind: PBCC_REMINDER_KIND,
        reminderKey: key,
        reminderHoursBefore: hoursBefore,
        recipientCount: phones.length,
        joinedRecipientCount: reminderPlayers.filter((player) => player.response_status === "joined").length,
        invitedRecipientCount: reminderPlayers.filter((player) => player.response_status === "invited").length,
        sent,
        sms,
      },
      `${session.session_name || "Match"} reminder text sent to ${sent} player${sent === 1 ? "" : "s"}.`
    );
    sentReminderKeys.add(key);
    results.push({ ...resultBase, texts: sent, sms });
  }

  return {
    success: true,
    dryRun,
    sent: dryRun ? 0 : results.filter((result) => !result.skipped && Number(result.texts || 0) > 0).length,
    pending: dryRun ? results.filter((result) => !result.skipped).length : 0,
    texts: textCount,
    results,
  };
}
