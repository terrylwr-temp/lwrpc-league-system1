function cleanList(values) {
  return [...new Set((values || []).map((value) => String(value || "").trim()).filter(Boolean))];
}

function normalizePhoneNumber(value) {
  const text = String(value || "").trim();
  if (!text) return "";

  if (text.startsWith("+")) {
    return `+${text.replace(/\D/g, "")}`;
  }

  const digits = text.replace(/\D/g, "");

  if (digits.length === 10) {
    return `+1${digits}`;
  }

  if (digits.length === 11 && digits.startsWith("1")) {
    return `+${digits}`;
  }

  return digits ? `+${digits}` : "";
}

function twilioAuthHeader() {
  return `Basic ${Buffer.from(
    `${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`
  ).toString("base64")}`;
}

function twilioFromPhoneNumber() {
  return normalizePhoneNumber(process.env.TWILIO_FROM_PHONE_NUMBER);
}

export async function sendSmsMessages({ phones, body }) {
  const recipients = cleanList(phones).map(normalizePhoneNumber).filter(Boolean);

  if (recipients.length === 0) {
    return { skipped: true, reason: "No SMS recipients", sent: 0, results: [] };
  }

  if (!body) {
    return { skipped: true, reason: "No SMS body", sent: 0, results: [] };
  }

  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
    return {
      skipped: true,
      reason: "Missing TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN",
      sent: 0,
      results: [],
    };
  }

  const fromPhoneNumber = twilioFromPhoneNumber();

  if (!fromPhoneNumber && !process.env.TWILIO_MESSAGING_SERVICE_SID) {
    return {
      skipped: true,
      reason: "Missing TWILIO_FROM_PHONE_NUMBER or TWILIO_MESSAGING_SERVICE_SID",
      sent: 0,
      results: [],
    };
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`;

  const results = await Promise.all(
    recipients.map(async (to) => {
      const payload = new URLSearchParams({
        To: to,
        Body: body,
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
    sent: results.filter((result) => result.ok).length,
    results,
  };
}

export async function sendEmailMessages({ emails, subject, text, html }) {
  const recipients = cleanList(emails);

  if (recipients.length === 0) {
    return { skipped: true, reason: "No email recipients", sent: 0, results: [] };
  }

  if (!subject || (!text && !html)) {
    return { skipped: true, reason: "Missing email subject or content", sent: 0, results: [] };
  }

  if (!process.env.SENDGRID_API_KEY || !process.env.SENDGRID_FROM_EMAIL) {
    return {
      skipped: true,
      reason: "Missing SENDGRID_API_KEY or SENDGRID_FROM_EMAIL",
      sent: 0,
      results: [],
    };
  }

  const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [
        {
          to: recipients.map((email) => ({ email })),
        },
      ],
      from: {
        email: process.env.SENDGRID_FROM_EMAIL,
        name: process.env.SENDGRID_FROM_NAME || "Lakewood Ranch Pickleball Club",
      },
      subject,
      content: [
        {
          type: html ? "text/html" : "text/plain",
          value: html || text,
        },
      ],
    }),
  });

  const responseText = await response.text();

  return {
    skipped: false,
    sent: response.ok ? recipients.length : 0,
    results: [
      {
        to: recipients,
        ok: response.ok,
        status: response.status,
        error: response.ok ? null : responseText || "Email send failed",
      },
    ],
  };
}
