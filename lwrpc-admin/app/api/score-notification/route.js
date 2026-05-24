import { NextResponse } from "next/server";
import { sendEmailMessages, sendSmsMessages } from "../../lib/notifications";

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
    const subject = isVerified
      ? `Scores Validated: ${homeTeam} vs ${awayTeam}`
      : `Score Verification Required: ${homeTeam} vs ${awayTeam}`;
    const heading = isVerified ? "Match Scores Validated" : "Match Scores Submitted";
    const actionText = isVerified
      ? "Scores have been validated for this match."
      : "Scores have been entered for this match.";
    const footerText = isVerified
      ? "The match result is now finalized in the league system."
      : "Please log into the league system to verify or dispute the scores.";
    const submittedByLabel = isVerified ? "Validated By" : "Submitted By";
    const text = `${actionText} ${homeTeam} vs ${awayTeam}.

Match Date: ${matchDate || "N/A"}
Current Match Score: ${score}
${submittedByLabel}: ${enteredBy || "Unknown"}

${footerText}`;

    const html = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
          <h2>${heading}</h2>

          <p>${actionText}</p>

          <p><strong>${homeTeam} vs ${awayTeam}</strong></p>

          <p>Match Date: ${matchDate || "N/A"}</p>

          <p>Current Match Score: <strong>${score}</strong></p>

          <p>${submittedByLabel}: <strong>${enteredBy || "Unknown"}</strong></p>

          <p>${footerText}</p>

          <hr />

          <p style="font-size: 12px; color: #666;">
            LWRPC League Management System
          </p>
        </div>
      `;

    const smsBody = isVerified
      ? `LWRPC scores validated: ${homeTeam} vs ${awayTeam}, ${score}.`
      : `LWRPC scores entered: ${homeTeam} vs ${awayTeam}, ${score}. Please log in to verify or dispute.`;

    const [emailResult, smsResult] = await Promise.all([
      sendEmailMessages({
        emails,
        subject,
        text,
        html,
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
