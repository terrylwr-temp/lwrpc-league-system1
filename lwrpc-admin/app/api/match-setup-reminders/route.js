import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { sendEmailMessages, sendSmsMessages } from "../../lib/notifications";
import { splitNotificationRecipients } from "../../lib/notificationPreferences";

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
  const contacts = [team?.captain, team?.co_captain_1, team?.co_captain_2].filter(Boolean);
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

export async function POST(req) {
  try {
    const cronSecret = process.env.MATCH_SETUP_REMINDER_SECRET || process.env.CRON_SECRET;

    if (cronSecret) {
      const authHeader = req.headers.get("authorization") || "";
      if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
      }
    }

    const supabase = serviceClient();
    const today = new Date();

    const { data: leagues, error: leagueError } = await supabase
      .from("leagues")
      .select("id, name, match_setup_reminder_days_before")
      .gt("match_setup_reminder_days_before", -1);

    if (leagueError) throw new Error(leagueError.message);

    const results = [];

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
            co_captain_2:members!teams_co_captain_2_member_id_fkey(id, first_name, last_name, email, phone, notification_preference)
          ),
          away_team:teams!matches_away_team_id_fkey(
            id,
            name,
            captain:members!teams_captain_member_id_fkey(id, first_name, last_name, email, phone, notification_preference),
            co_captain_1:members!teams_co_captain_member_id_fkey(id, first_name, last_name, email, phone, notification_preference),
            co_captain_2:members!teams_co_captain_2_member_id_fkey(id, first_name, last_name, email, phone, notification_preference)
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

          const subject = `Match Setup Reminder: ${league.name}`;
          const text = [
            `Please enter match setup teams for ${formatTeamName(team)}.`,
            "",
            `League: ${league.name}`,
            `Match: ${formatTeamName(match.home_team)} vs ${formatTeamName(match.away_team)}`,
            `Date: ${match.scheduled_date}`,
            `Time: ${match.scheduled_time || "Time TBD"}`,
            `Division: ${match.divisions?.name || "Division"}`,
            `Location: ${match.locations?.name || "Location TBD"}`,
            "",
            "Open the Captain Dashboard and use Match Setup for this match.",
          ].join("\n");

          const [emailResult, smsResult] = await Promise.all([
            sendEmailMessages({ emails, subject, text }),
            sendSmsMessages({ phones, body: text }),
          ]);

          results.push({
            league: league.name,
            matchId: match.id,
            team: formatTeamName(team),
            emails: emailResult.sent || 0,
            texts: smsResult.sent || 0,
          });
        }
      }
    }

    return NextResponse.json({ success: true, sent: results.length, results });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
