import { normalizeAppNotificationPhone, sendAppNotificationMessages } from "./appNotifications";
import { loadServerSystemSettings } from "./serverEmailTemplates";
import { emailIsActivated } from "./systemSettings";

function cleanList(values) {
  return [...new Set((values || []).map((value) => String(value || "").trim()).filter(Boolean))];
}

function normalizePhoneNumber(value) {
  return normalizeAppNotificationPhone(value);
}

function brevoSmsConfiguration() {
  return {
    apiKey: String(process.env.BREVO_API_KEY || "").trim(),
    sender: String(process.env.BREVO_SMS_SENDER || "").trim(),
    organizationPrefix: String(process.env.BREVO_SMS_ORGANIZATION_PREFIX || "").trim(),
  };
}

function brevoSmsSenderIsValid(sender) {
  return /^\d{1,15}$/.test(sender) || /^[A-Za-z0-9]{1,11}$/.test(sender);
}

async function sendBrevoSms(recipient, body, { apiKey, sender, organizationPrefix }) {
  try {
    const response = await fetch("https://api.brevo.com/v3/transactionalSMS/send", {
      method: "POST",
      headers: {
        "api-key": apiKey,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        recipient,
        sender,
        content: body,
        type: "transactional",
        ...(organizationPrefix ? { organizationPrefix } : {}),
      }),
    });
    const data = await response.json().catch(() => ({}));

    return {
      to: recipient,
      ok: response.ok,
      status: response.status,
      messageId: data.messageId || null,
      error: response.ok ? null : data.message || data.code || "SMS send failed",
    };
  } catch (error) {
    return {
      to: recipient,
      ok: false,
      status: null,
      messageId: null,
      error: error instanceof Error ? error.message : "SMS send failed",
    };
  }
}

async function sendBrevoSmsMessages(recipients, body, configuration) {
  const results = new Array(recipients.length);
  let nextRecipientIndex = 0;
  const workerCount = Math.min(5, recipients.length);

  await Promise.all(Array.from({ length: workerCount }, async () => {
    while (nextRecipientIndex < recipients.length) {
      const index = nextRecipientIndex;
      nextRecipientIndex += 1;
      results[index] = await sendBrevoSms(recipients[index], body, configuration);
    }
  }));

  return results;
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

  const brevoConfiguration = brevoSmsConfiguration();

  if (!brevoConfiguration.apiKey || !brevoConfiguration.sender) {
    return {
      skipped: (appResult.sent || 0) === 0,
      reason: "Missing BREVO_API_KEY or BREVO_SMS_SENDER",
      sent: appResult.sent || 0,
      smsSent: 0,
      appSent: appResult.sent || 0,
      app: appResult,
      results: [],
    };
  }

  if (!brevoSmsSenderIsValid(brevoConfiguration.sender)) {
    return {
      skipped: (appResult.sent || 0) === 0,
      reason: "BREVO_SMS_SENDER must be a numeric sender (up to 15 digits) or an alphanumeric sender ID (up to 11 letters/numbers).",
      sent: appResult.sent || 0,
      smsSent: 0,
      appSent: appResult.sent || 0,
      app: appResult,
      results: [],
    };
  }

  const results = await sendBrevoSmsMessages(smsRecipients, smsBody, brevoConfiguration);

  return {
    skipped: false,
    sent: (appResult.sent || 0) + results.filter((result) => result.ok).length,
    smsSent: results.filter((result) => result.ok).length,
    appSent: appResult.sent || 0,
    app: appResult,
    results,
  };
}

export async function sendEmailMessages({ emails, subject, text, html, attachments = [] }) {
  const recipients = cleanList(emails);
  const replyToEmail = String(process.env.BREVO_REPLY_TO_EMAIL || "").trim();

  if (recipients.length === 0) {
    return { skipped: true, reason: "No email recipients", sent: 0, results: [] };
  }

  if (!subject || (!text && !html)) {
    return { skipped: true, reason: "Missing email subject or content", sent: 0, results: [] };
  }

  const systemSettings = await loadServerSystemSettings();
  if (!emailIsActivated(systemSettings)) {
    return { skipped: true, reason: "Email delivery is not activated in Email Options", sent: 0, results: [] };
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
      ...(attachments.length > 0 ? { attachment: attachments } : {}),
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
