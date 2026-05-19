import { NextResponse } from "next/server";
import { sendEmailMessages, sendSmsMessages } from "../../lib/notifications";

export const runtime = "nodejs";

export async function POST(req) {
  try {
    const body = await req.json();
    const {
      emails,
      phones,
      subject,
      text,
      html,
      smsBody,
    } = body;

    const [emailResult, smsResult] = await Promise.all([
      sendEmailMessages({
        emails,
        subject,
        text,
        html,
      }),
      sendSmsMessages({
        phones,
        body: smsBody || text,
      }),
    ]);

    return NextResponse.json({
      success: true,
      email: emailResult,
      sms: smsResult,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
