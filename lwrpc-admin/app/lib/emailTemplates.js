import { DEFAULT_SYSTEM_SETTINGS, cachedSystemSettings } from "./systemSettings";

export const EMAIL_TEMPLATE_KEYS = {
  scoreReminder: "score_reminder",
  matchSetupSaved: "match_setup_saved",
  scoreSubmitted: "score_submitted",
  scoreValidated: "score_validated",
  scoreChanged: "score_changed",
  matchSetupReminder: "match_setup_reminder",
  ratingCheckAlert: "rating_check_alert",
};

const COMMON_TEMPLATE_PLACEHOLDERS = ["{{date}}", "{{time}}", "{{league_site_url}}", "{{main_email}}"];

function withCommonPlaceholders(placeholders) {
  return [
    ...placeholders,
    ...COMMON_TEMPLATE_PLACEHOLDERS.filter((placeholder) => !placeholders.includes(placeholder)),
  ];
}

export const EMAIL_TEMPLATES = [
  {
    key: EMAIL_TEMPLATE_KEYS.scoreReminder,
    label: "Score Reminder",
    description: "Manual per-match reminders from Scoring Operations.",
    placeholders: withCommonPlaceholders(["{{home_team}}", "{{away_team}}", "{{match_date}}", "{{match_time}}", "{{division}}", "{{score_status}}", "{{reminder_action}}", "{{matches}}", "{{match_count}}"]),
    defaultSubject: "Score reminder: {{home_team}} vs {{away_team}}",
    defaultBody: `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #0f172a;">
  <img src="https://lwrpickleballclub.com/lwrpc-logo.png" alt="Lakewood Ranch Pickleball Club" style="width: 84px; height: 84px; object-fit: contain;" />
  <h2 style="margin: 16px 0 8px;">Score Reminder</h2>
  <p>Captains,</p>
  <p>This match still needs score action:</p>
  <div>{{matches}}</div>
  <p><strong>Action Needed:</strong> {{reminder_action}}</p>
  <p>Please log into the <strong>LWRPC League Management System</strong> and complete this step as soon as possible.</p>
  <p>Thank you,<br /><strong>LWRPC League Management</strong></p>
</div>`,
  },
  {
    key: EMAIL_TEMPLATE_KEYS.matchSetupSaved,
    label: "Match Setup Saved",
    description: "Sent to the opposing captains after a captain saves Match Setup.",
    placeholders: withCommonPlaceholders(["{{setup_team}}", "{{opponent_team}}", "{{home_team}}", "{{away_team}}", "{{match_date}}", "{{match_time}}", "{{division}}", "{{lineup_list}}", "{{opponent_setup_status}}"]),
    defaultSubject: "Match Setup Entered: {{setup_team}} vs {{opponent_team}}",
    defaultBody: `<div style="font-family: Arial, sans-serif; line-height: 1.6;">
  <h2>Match Setup Entered</h2>
  <p><strong>{{setup_team}}</strong> has entered its match setup.</p>
  <p>
    <strong>Match:</strong> {{home_team}} vs {{away_team}}<br />
    <strong>Date:</strong> {{match_date}} at {{match_time}}<br />
    <strong>Division:</strong> {{division}}
  </p>
  <ul>{{lineup_list}}</ul>
  <p>{{opponent_setup_status}}</p>
  <hr />
  <p style="font-size: 12px; color: #666;">LWRPC League Management System</p>
</div>`,
  },
  {
    key: EMAIL_TEMPLATE_KEYS.scoreSubmitted,
    label: "Scores Submitted",
    description: "Sent to opposing captains when match scores need validation.",
    placeholders: withCommonPlaceholders(["{{home_team}}", "{{away_team}}", "{{match_date}}", "{{score}}", "{{actor_name}}"]),
    defaultSubject: "Score Verification Required: {{home_team}} vs {{away_team}}",
    defaultBody: `<div style="font-family: Arial, sans-serif; line-height: 1.6;">
  <h2>Match Scores Submitted</h2>
  <p>Scores have been entered for this match.</p>
  <p><strong>{{home_team}} vs {{away_team}}</strong></p>
  <p>Match Date: {{match_date}}</p>
  <p>Current Match Score: <strong>{{score}}</strong></p>
  <p>Submitted By: <strong>{{actor_name}}</strong></p>
  <p>Please log into the league system to verify or dispute the scores.</p>
  <hr />
  <p style="font-size: 12px; color: #666;">LWRPC League Management System</p>
</div>`,
  },
  {
    key: EMAIL_TEMPLATE_KEYS.scoreValidated,
    label: "Scores Validated",
    description: "Sent after submitted scores are validated.",
    placeholders: withCommonPlaceholders(["{{home_team}}", "{{away_team}}", "{{match_date}}", "{{score}}", "{{actor_name}}"]),
    defaultSubject: "Scores Validated: {{home_team}} vs {{away_team}}",
    defaultBody: `<div style="font-family: Arial, sans-serif; line-height: 1.6;">
  <h2>Match Scores Validated</h2>
  <p>Scores have been validated for this match.</p>
  <p><strong>{{home_team}} vs {{away_team}}</strong></p>
  <p>Match Date: {{match_date}}</p>
  <p>Current Match Score: <strong>{{score}}</strong></p>
  <p>Validated By: <strong>{{actor_name}}</strong></p>
  <p>The match result is now finalized in the league system.</p>
  <hr />
  <p style="font-size: 12px; color: #666;">LWRPC League Management System</p>
</div>`,
  },
  {
    key: EMAIL_TEMPLATE_KEYS.scoreChanged,
    label: "Scores Changed",
    description: "Sent to match captains when Scoring Operations changes and verifies scores.",
    placeholders: withCommonPlaceholders(["{{home_team}}", "{{away_team}}", "{{match_date}}", "{{score}}", "{{actor_name}}"]),
    defaultSubject: "Scores Changed and Verified: {{home_team}} vs {{away_team}}",
    defaultBody: `<div style="font-family: Arial, sans-serif; line-height: 1.6;">
  <h2>Match Scores Changed</h2>
  <p>Scores for this match were changed by Scoring Operations and automatically verified.</p>
  <p><strong>{{home_team}} vs {{away_team}}</strong></p>
  <p>Match Date: {{match_date}}</p>
  <p>Updated Match Score: <strong>{{score}}</strong></p>
  <p>Changed By: <strong>{{actor_name}}</strong></p>
  <p>No captain validation is required.</p>
  <hr />
  <p style="font-size: 12px; color: #666;">LWRPC League Management System</p>
</div>`,
  },
  {
    key: EMAIL_TEMPLATE_KEYS.matchSetupReminder,
    label: "Match Setup Reminder",
    description: "Automatic reminder before match day when lineup setup is incomplete.",
    placeholders: withCommonPlaceholders(["{{team}}", "{{league}}", "{{home_team}}", "{{away_team}}", "{{match_date}}", "{{match_time}}", "{{division}}", "{{location}}"]),
    defaultSubject: "Match Setup Reminder: {{league}}",
    defaultBody: `<div style="font-family: Arial, sans-serif; line-height: 1.6;">
  <h2>Match Setup Reminder</h2>
  <p>Please enter match setup teams for <strong>{{team}}</strong>.</p>
  <p>
    <strong>League:</strong> {{league}}<br />
    <strong>Match:</strong> {{home_team}} vs {{away_team}}<br />
    <strong>Date:</strong> {{match_date}}<br />
    <strong>Time:</strong> {{match_time}}<br />
    <strong>Division:</strong> {{division}}<br />
    <strong>Location:</strong> {{location}}
  </p>
  <p>Open the Captain Dashboard and use Match Setup for this match.</p>
</div>`,
  },
  {
    key: EMAIL_TEMPLATE_KEYS.ratingCheckAlert,
    label: "Roster Rating Check Alert",
    description: "Sent to league support when a roster add needs rating review.",
    placeholders: withCommonPlaceholders(["{{player_name}}", "{{team}}", "{{reason}}", "{{rating_type}}", "{{rating_range}}", "{{captain_contacts}}"]),
    defaultSubject: "Roster rating check needed: {{player_name}}",
    defaultBody: `<div style="font-family: Arial, sans-serif; line-height: 1.6;">
  <h2>Roster Rating Check Needed</h2>
  <p>A player was added to a team roster and needs a rating check.</p>
  <p>
    <strong>Player:</strong> {{player_name}}<br />
    <strong>Team:</strong> {{team}}<br />
    <strong>Reason:</strong> {{reason}}<br />
    <strong>Rating Type:</strong> {{rating_type}}<br />
    <strong>Team Rating Range:</strong> {{rating_range}}
  </p>
  <p><strong>Captain Contacts:</strong></p>
  <div>{{captain_contacts}}</div>
  <p>Please check this player and update their rating if needed.</p>
</div>`,
  },
];

export function getEmailTemplateConfig(templateKey) {
  return EMAIL_TEMPLATES.find((template) => template.key === templateKey) || null;
}

export function renderEmailTemplate(template, values = {}) {
  const config = getEmailTemplateConfig(template?.template_key || template?.key) || {};
  const mergedValues = {
    ...commonTemplateValues(),
    ...values,
  };
  const subject = renderTemplateText(template?.subject || config.defaultSubject || "", mergedValues);
  const html = prepareEmailHtml(
    renderTemplateText(template?.body || config.defaultBody || "", mergedValues)
  );
  const text = htmlToText(html);

  return { subject, html, text };
}

export function renderTemplateText(source, values = {}) {
  let output = String(source || "");
  Object.entries(values).forEach(([key, value]) => {
    output = output.replaceAll(`{{${key}}}`, String(value ?? ""));
  });
  return output;
}

export function htmlToText(value) {
  return String(value || "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<li>/gi, "- ")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function constrainTemplateLogoImages(html) {
  return String(html || "").replace(/<img\b[^>]*>/gi, (tag) => {
    if (!isClubLogoImage(tag)) return tag;

    let output = tag;
    const logoStyle = "width: 84px; max-width: 84px; height: auto; object-fit: contain;";

    output = upsertHtmlAttribute(output, "width", "84");
    output = upsertHtmlAttribute(output, "height", "84");
    output = upsertHtmlAttribute(output, "style", mergeInlineStyle(getHtmlAttribute(output, "style"), logoStyle));

    return output;
  });
}

function prepareEmailHtml(html) {
  return compactTemplateSpacing(constrainTemplateLogoImages(html));
}

function compactTemplateSpacing(html) {
  const tagStyles = {
    h1: "margin: 0 0 8px; line-height: 1.2;",
    h2: "margin: 0 0 8px; line-height: 1.25;",
    h3: "margin: 0 0 8px; line-height: 1.25;",
    p: "margin: 0 0 8px; line-height: 1.35;",
    ul: "margin: 4px 0 8px 20px; padding: 0; line-height: 1.35;",
    ol: "margin: 4px 0 8px 20px; padding: 0; line-height: 1.35;",
    li: "margin: 0 0 4px; line-height: 1.35;",
    hr: "margin: 10px 0; border: 0; border-top: 1px solid #cbd5e1;",
  };

  return String(html || "").replace(/<(h1|h2|h3|p|ul|ol|li|hr)\b[^>]*>/gi, (tag, tagName) => {
    const requiredStyle = tagStyles[String(tagName).toLowerCase()];
    return upsertHtmlAttribute(tag, "style", mergeInlineStyle(getHtmlAttribute(tag, "style"), requiredStyle));
  });
}

function isClubLogoImage(tag) {
  const src = getHtmlAttribute(tag, "src").toLowerCase();
  const alt = getHtmlAttribute(tag, "alt").toLowerCase();

  return src.includes("lwrpc-logo") || alt.includes("lakewood ranch pickleball club");
}

function getHtmlAttribute(tag, attributeName) {
  const pattern = new RegExp(`\\s${attributeName}\\s*=\\s*(["'])(.*?)\\1`, "i");
  return tag.match(pattern)?.[2] || "";
}

function upsertHtmlAttribute(tag, attributeName, value) {
  const pattern = new RegExp(`\\s${attributeName}\\s*=\\s*(["']).*?\\1`, "i");
  const attribute = ` ${attributeName}="${escapeHtml(value)}"`;

  if (pattern.test(tag)) {
    return tag.replace(pattern, attribute);
  }

  return tag.replace(/\s*\/?>$/, (ending) => `${attribute}${ending}`);
}

function mergeInlineStyle(currentStyle, requiredStyle) {
  return [currentStyle, requiredStyle]
    .filter(Boolean)
    .join("; ")
    .replace(/;{2,}/g, ";")
    .trim();
}

export function sampleTemplateValues() {
  return {
    ...commonTemplateValues(new Date("2026-05-31T17:45:00")),
    actor_name: "Jane Captain",
    away_team: "River Strand Aces",
    captain_contacts: "Captain: Jane Captain <jane@example.com><br />Co-Captain 1: Pat Partner <pat@example.com>",
    division: "3.5 Mixed",
    home_team: "Lakewood Ranch Dinkers",
    league: "Spring League",
    lineup_list: "<li><strong>Team 1:</strong> Alex Player (DUPR: 3.72) / Morgan Player (DUPR: 3.51) <strong>Team Rating:</strong> 7.23</li><li><strong>Team 2:</strong> Casey Player (DUPR: 3.44) / Taylor Player (DUPR: 3.33) <strong>Team Rating:</strong> 6.77</li>",
    location: "Lakewood Ranch Country Club",
    match_count: "1",
    match_date: "06/04/2026",
    match_time: "6:00 PM",
    matches: "<ul><li><strong>06/04/2026 at 6:00 PM</strong>: Lakewood Ranch Dinkers vs River Strand Aces (3.5 Mixed, score status: not entered)</li></ul>",
    opponent_setup_status: "Please log into the Captain Dashboard and enter your match setup if you have not already done so.",
    opponent_team: "River Strand Aces",
    player_name: "Sam Sample",
    rating_range: "3.000 to 3.499",
    rating_type: "DUPR",
    reason: "Player is missing a season DUPR rating.",
    reminder_action: "Enter or validate the scores for this match.",
    score: "3-2",
    score_status: "not entered",
    setup_team: "Lakewood Ranch Dinkers",
    team: "Lakewood Ranch Dinkers",
  };
}

function commonTemplateValues(date = new Date()) {
  const systemSettings = cachedSystemSettings();

  return {
    date: formatTemplateDate(date),
    time: formatTemplateTime(date),
    league_site_url: systemSettings.league_site_url || DEFAULT_SYSTEM_SETTINGS.league_site_url,
    main_email: systemSettings.main_email || DEFAULT_SYSTEM_SETTINGS.main_email,
  };
}

function formatTemplateDate(date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
    timeZone: "America/New_York",
  }).format(date);
}

function formatTemplateTime(date) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/New_York",
    timeZoneName: "short",
  }).format(date);
}
