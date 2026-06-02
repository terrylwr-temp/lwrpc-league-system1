import { NextResponse } from "next/server";
import { sendEmailMessages, sendSmsMessages } from "../../lib/notifications";
import { EMAIL_TEMPLATE_KEYS, renderEmailTemplate } from "../../lib/emailTemplates";
import { loadEmailTemplate, loadServerSystemSettings } from "../../lib/serverEmailTemplates";

export const runtime = "nodejs";

export async function POST(req) {
  try {
    const body = await req.json();

    const {
      emails,
      phones,
      homeTeam,
      awayTeam,
      score,
      matchDate,
      enteredBy,
      notificationType = "submitted"
    } = body;

    if ((!emails || emails.length === 0) && (!phones || phones.length === 0)) {
      return NextResponse.json({
        success: false,
        error: "No notification recipients"
      });
    }

    const isVerified = notificationType === "verified";
    const template = await loadEmailTemplate(
      isVerified ? EMAIL_TEMPLATE_KEYS.scoreValidated : EMAIL_TEMPLATE_KEYS.scoreSubmitted
    );
    const systemSettings = await loadServerSystemSettings();
    const rendered = renderEmailTemplate(template, {
      home_team: homeTeam || "Home",
      away_team: awayTeam || "Away",
      match_date: matchDate || "N/A",
      score: score || "N/A",
      actor_name: enteredBy || "Unknown",
      league_site_url: systemSettings.league_site_url,
      main_email: systemSettings.main_email,
    });

    const smsBody = isVerified
      ? `LWRPC scores validated: ${homeTeam} vs ${awayTeam}, ${score}.`
      : `LWRPC scores entered: ${homeTeam} vs ${awayTeam}, ${score}. Please log in to verify or dispute.`;

    const [emailResult, smsResult] = await Promise.all([
      sendEmailMessages({
        emails,
        subject: rendered.subject,
        text: rendered.text,
        html: rendered.html,
      }),
      sendSmsMessages({
        phones,
        body: smsBody,
      }),
    ]);

    return NextResponse.json({
      success: true,
      email: emailResult,
      sms: smsResult
    });
  } catch (err) {
    return NextResponse.json({
      success: false,
      error: err.message
    });
  }
}
