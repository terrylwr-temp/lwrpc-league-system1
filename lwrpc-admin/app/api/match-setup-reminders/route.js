import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { sendEmailMessages, sendSmsMessages } from "../../lib/notifications";
import { splitNotificationRecipients } from "../../lib/notificationPreferences";
import { EMAIL_TEMPLATE_KEYS, renderEmailTemplate } from "../../lib/emailTemplates";
import { loadEmailTemplate } from "../../lib/serverEmailTemplates";
import { hasRole } from "../../lib/permissions";

export const runtime = "nodejs";

function serviceClient() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Missing Supabase service-role configuration.");
  }

  return createClient(url, key);
}

function anonClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error("Supabase anon credentials are not configured.");
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function localDateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + Number(days || 0));
  return next;
}

function captainContacts(team) {
  const contacts = [team?.captain, team?.co_captain_1, team?.co_captain_2, team?.club_pro].filter(Boolean);
  const seen = new Set();

  return contacts.filter((member) => {
    const key = member.email || member.phone || member.id;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function matchSetupComplete(match, teamId, lineups) {
  const expectedLines = Number(match.divisions?.number_of_lines || 3);
  const completeLines = lineups.filter(
    (lineup) =>
      String(lineup.match_id) === String(match.id) &&
      String(lineup.team_id) === String(teamId) &&
      lineup.player_1_member_id &&
      lineup.player_2_member_id
  );

  return completeLines.length >= expectedLines;
}

function formatTeamName(team) {
  return team?.name || "Team";
}

async function authorizeReminderRequest(req, supabase) {
  const authHeader = req.headers.get("authorization") || "";
  const cronSecret = process.env.MATCH_SETUP_REMINDER_SECRET || process.env.CRON_SECRET;

  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    return true;
  }

  const token = authHeader.replace(/^Bearer\s+/i, "").trim();

  if (token) {
    const authSupabase = anonClient();
    const { data: userData, error: userError } = await authSupabase.auth.getUser(token);

    if (userError || !userData?.user?.email) {
      return false;
    }

    const { data: member, error: memberError } = await supabase
      .from("members")
      .select("id, email, user_roles(role)")
      .eq("email", userData.user.email)
      .maybeSingle();

    if (memberError) {
      throw new Error(memberError.message);
    }

    const role = member?.user_roles?.[0]?.role || "player";
    return hasRole(role, "league_manager");
  }

  return !cronSecret;
}

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const dryRun = body?.dryRun === true;

    const supabase = serviceClient();
    const authorized = await authorizeReminderRequest(req, supabase);

    if (!authorized) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const today = new Date();

    const { data: leagues, error: leagueError } = await supabase
      .from("leagues")
      .select("id, name, match_setup_reminder_days_before")
      .gt("match_setup_reminder_days_before", -1);

    if (leagueError) throw new Error(leagueError.message);

    const results = [];
    let emailCount = 0;
    let textCount = 0;

    for (const league of leagues || []) {
      const targetDate = localDateString(addDays(today, league.match_setup_reminder_days_before));

      const { data: matches, error: matchError } = await supabase
        .from("matches")
        .select(`
          id,
          league_id,
          division_id,
          home_team_id,
          away_team_id,
          scheduled_date,
          scheduled_time,
          week_number,
          status,
          is_published,
          divisions(id, name, number_of_lines),
          locations(id, name),
          home_team:teams!matches_home_team_id_fkey(
            id,
            name,
            captain:members!teams_captain_member_id_fkey(id, first_name, last_name, email, phone, notification_preference),
            co_captain_1:members!teams_co_captain_member_id_fkey(id, first_name, last_name, email, phone, notification_preference),
            co_captain_2:members!teams_co_captain_2_member_id_fkey(id, first_name, last_name, email, phone, notification_preference),
            club_pro:members!teams_club_pro_member_id_fkey(id, first_name, last_name, email, phone, notification_preference)
          ),
          away_team:teams!matches_away_team_id_fkey(
            id,
            name,
            captain:members!teams_captain_member_id_fkey(id, first_name, last_name, email, phone, notification_preference),
            co_captain_1:members!teams_co_captain_member_id_fkey(id, first_name, last_name, email, phone, notification_preference),
            co_captain_2:members!teams_co_captain_2_member_id_fkey(id, first_name, last_name, email, phone, notification_preference),
            club_pro:members!teams_club_pro_member_id_fkey(id, first_name, last_name, email, phone, notification_preference)
          )
        `)
        .eq("league_id", league.id)
        .eq("scheduled_date", targetDate)
        .eq("is_published", true)
        .not("status", "eq", "completed")
        .not("status", "eq", "cancelled");

      if (matchError) throw new Error(matchError.message);

      const matchIds = (matches || []).map((match) => match.id);
      let lineups = [];

      if (matchIds.length > 0) {
        const { data, error } = await supabase
          .from("match_lineups")
          .select("match_id, team_id, player_1_member_id, player_2_member_id")
          .in("match_id", matchIds);

        if (error) throw new Error(error.message);
        lineups = data || [];
      }

      for (const match of matches || []) {
        const teamsToNotify = [
          { team: match.home_team, teamId: match.home_team_id },
          { team: match.away_team, teamId: match.away_team_id },
        ].filter(({ teamId }) => !matchSetupComplete(match, teamId, lineups));

        for (const { team } of teamsToNotify) {
          const { emails, phones } = splitNotificationRecipients(captainContacts(team));
          if (emails.length === 0 && phones.length === 0) continue;

          if (dryRun) {
            emailCount += emails.length;
            textCount += phones.length;
            results.push({
              league: league.name,
              matchId: match.id,
              match: `${formatTeamName(match.home_team)} vs ${formatTeamName(match.away_team)}`,
              matchDate: match.scheduled_date,
              team: formatTeamName(team),
              emails: emails.length,
              texts: phones.length,
            });
            continue;
          }

          const template = await loadEmailTemplate(EMAIL_TEMPLATE_KEYS.matchSetupReminder);
          const rendered = renderEmailTemplate(template, {
            team: formatTeamName(team),
            league: league.name || "League",
            home_team: formatTeamName(match.home_team),
            away_team: formatTeamName(match.away_team),
            match_date: match.scheduled_date || "Date TBD",
            match_time: match.scheduled_time || "Time TBD",
            division: match.divisions?.name || "Division",
            location: match.locations?.name || "Location TBD",
          });

          const [emailResult, smsResult] = await Promise.all([
            sendEmailMessages({
              emails,
              subject: rendered.subject,
              text: rendered.text,
              html: rendered.html,
            }),
            sendSmsMessages({ phones, body: rendered.text }),
          ]);

          results.push({
            league: league.name,
            matchId: match.id,
            match: `${formatTeamName(match.home_team)} vs ${formatTeamName(match.away_team)}`,
            matchDate: match.scheduled_date,
            team: formatTeamName(team),
            emails: emailResult.sent || 0,
            texts: smsResult.sent || 0,
          });
          emailCount += emailResult.sent || 0;
          textCount += smsResult.sent || 0;
        }
      }
    }

    return NextResponse.json({
      success: true,
      dryRun,
      sent: dryRun ? 0 : results.length,
      pending: dryRun ? results.length : 0,
      emails: emailCount,
      texts: textCount,
      results,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
