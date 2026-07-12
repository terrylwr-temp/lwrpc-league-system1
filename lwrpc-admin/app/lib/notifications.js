import { normalizeAppNotificationPhone, sendAppNotificationMessages } from "./appNotifications";

function cleanList(values) {
  return [...new Set((values || []).map((value) => String(value || "").trim()).filter(Boolean))];
}

function normalizePhoneNumber(value) {
  return normalizeAppNotificationPhone(value);
}

function twilioAuthHeader() {
  return `Basic ${Buffer.from(
    `${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`
  ).toString("base64")}`;
}

function twilioFromPhoneNumber() {
  return normalizePhoneNumber(process.env.TWILIO_FROM_PHONE_NUMBER);
}

function appendSmsSuffix(body, suffix) {
  const cleanBody = String(body || "").trim();
  const cleanSuffix = String(suffix || "").trim();
  if (!cleanSuffix) return cleanBody;
  if (cleanBody.includes(cleanSuffix)) return cleanBody;
  return `${cleanBody}\n\n${cleanSuffix}`.trim();
}

export async function sendSmsMessages({ phones, body, preferAppNotifications = false, appNotificationTitle, appNotificationUrl, appNotificationIcon, fallbackSmsSuffix = "" }) {
  const recipients = cleanList(phones).map(normalizePhoneNumber).filter(Boolean);

  if (recipients.length === 0) {
    return { skipped: true, reason: "No SMS recipients", sent: 0, results: [] };
  }

  if (!body) {
    return { skipped: true, reason: "No SMS body", sent: 0, results: [] };
  }

  const appResult = preferAppNotifications
    ? await sendAppNotificationMessages({
        phones: recipients,
        title: appNotificationTitle,
        body,
        url: appNotificationUrl,
        icon: appNotificationIcon,
      })
    : { skipped: true, reason: "App Notifications disabled for this send", sent: 0, results: [], fallbackPhones: recipients };
  const smsRecipients = appResult.skipped ? recipients : appResult.fallbackPhones || recipients;
  const smsBody = preferAppNotifications && smsRecipients.length > 0
    ? appendSmsSuffix(body, fallbackSmsSuffix)
    : body;

  if (smsRecipients.length === 0) {
    return {
      skipped: false,
      sent: appResult.sent || 0,
      smsSent: 0,
      appSent: appResult.sent || 0,
      app: appResult,
      results: [],
    };
  }

  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
    return {
      skipped: (appResult.sent || 0) === 0,
      reason: "Missing TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN",
      sent: appResult.sent || 0,
      smsSent: 0,
      appSent: appResult.sent || 0,
      app: appResult,
      results: [],
    };
  }

  const fromPhoneNumber = twilioFromPhoneNumber();

  if (!fromPhoneNumber && !process.env.TWILIO_MESSAGING_SERVICE_SID) {
    return {
      skipped: (appResult.sent || 0) === 0,
      reason: "Missing TWILIO_FROM_PHONE_NUMBER or TWILIO_MESSAGING_SERVICE_SID",
      sent: appResult.sent || 0,
      smsSent: 0,
      appSent: appResult.sent || 0,
      app: appResult,
      results: [],
    };
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`;

  const results = await Promise.all(
    smsRecipients.map(async (to) => {
      const payload = new URLSearchParams({
        To: to,
        Body: smsBody,
      });

      if (process.env.TWILIO_MESSAGING_SERVICE_SID) {
        payload.set("MessagingServiceSid", process.env.TWILIO_MESSAGING_SERVICE_SID);
      } else {
        payload.set("From", fromPhoneNumber);
      }

      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: twilioAuthHeader(),
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: payload,
      });

      const data = await response.json().catch(() => ({}));

      return {
        to,
        ok: response.ok,
        sid: data.sid || null,
        error: response.ok ? null : data.message || "SMS send failed",
      };
    })
  );

  return {
    skipped: false,
    sent: (appResult.sent || 0) + results.filter((result) => result.ok).length,
    smsSent: results.filter((result) => result.ok).length,
    appSent: appResult.sent || 0,
    app: appResult,
    results,
  };
}

export async function sendEmailMessages({ emails, subject, text, html }) {
  const recipients = cleanList(emails);
  const replyToEmail = String(process.env.BREVO_REPLY_TO_EMAIL || "").trim();

  if (recipients.length === 0) {
    return { skipped: true, reason: "No email recipients", sent: 0, results: [] };
  }

  if (!subject || (!text && !html)) {
    return { skipped: true, reason: "Missing email subject or content", sent: 0, results: [] };
  }

  if (!process.env.BREVO_API_KEY || !process.env.BREVO_FROM_EMAIL) {
    return { skipped: true, reason: "Missing BREVO_API_KEY or BREVO_FROM_EMAIL", sent: 0, results: [] };
  }

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": process.env.BREVO_API_KEY,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      sender: {
        email: process.env.BREVO_FROM_EMAIL,
        name: process.env.BREVO_FROM_NAME || "Lakewood Ranch Pickleball Club",
      },
      ...(replyToEmail ? { replyTo: { email: replyToEmail } } : {}),
      to: recipients.map((email) => ({ email })),
      subject,
      ...(html ? { htmlContent: html } : { textContent: text }),
    }),
  });

  const responseBody = await response.json().catch(() => ({}));

  return {
    skipped: false,
    sent: response.ok ? recipients.length : 0,
    results: [{
      to: recipients,
      ok: response.ok,
      status: response.status,
      messageId: responseBody.messageId || null,
      error: response.ok ? null : responseBody.message || responseBody.code || "Email send failed",
    }],
  };
}
