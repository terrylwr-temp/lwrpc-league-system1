export const APP_TIME_ZONE = "America/New_York";

export function formatDisplayDate(value, fallback = "-") {
  if (!value) return fallback;

  const text = String(value);
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})/);

  if (match) {
    return `${match[2]}/${match[3]}/${match[1]}`;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return text;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  }).format(date);
}

export function formatDisplayTime(value, fallback = "-") {
  if (!value) return fallback;

  const text = String(value).trim();
  const match = text.match(/^(\d{1,2}):(\d{2})(?::\d{2})?/);

  if (!match) return text;

  let hour = Number(match[1]);
  const minute = match[2];
  const period = hour >= 12 ? "PM" : "AM";

  hour %= 12;
  if (hour === 0) hour = 12;

  return `${hour}:${minute} ${period}`;
}

export function formatDisplayDateTime(date, time, fallback = "Date / time TBD") {
  if (!date && !time) return fallback;

  return `${formatDisplayDate(date, "Date TBD")} at ${formatDisplayTime(time, "Time TBD")}`;
}

export function formatDisplayTimestamp(value, fallback = "-") {
  if (!value) return fallback;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat("en-US", {
    timeZone: APP_TIME_ZONE,
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZoneName: "short",
  }).format(date);
}
