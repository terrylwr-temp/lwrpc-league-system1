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
      enteredBy
    } = body;

    if ((!emails || emails.length === 0) && (!phones || phones.length === 0)) {
      return NextResponse.json({
        success: false,
        error: "No notification recipients"
      });
    }

    const subject = `Score Verification Required: ${homeTeam} vs ${awayTeam}`;
    const text = `Scores have been entered for ${homeTeam} vs ${awayTeam}.

Match Date: ${matchDate || "N/A"}
Current Match Score: ${score}
Submitted By: ${enteredBy || "Unknown"}

Please log into the league system to verify or dispute the scores.`;

    const html = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
          <h2>Match Scores Submitted</h2>

          <p>Scores have been entered for:</p>

          <p><strong>${homeTeam} vs ${awayTeam}</strong></p>

          <p>Match Date: ${matchDate || "N/A"}</p>

          <p>Current Match Score: <strong>${score}</strong></p>

          <p>Submitted By: <strong>${enteredBy || "Unknown"}</strong></p>

          <p>Please log into the league system to verify or dispute the scores.</p>

          <hr />

          <p style="font-size: 12px; color: #666;">
            LWRPC League Management System
          </p>
        </div>
      `;

    const smsBody = `LWRPC scores entered: ${homeTeam} vs ${awayTeam}, ${score}. Please log in to verify or dispute.`;

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
