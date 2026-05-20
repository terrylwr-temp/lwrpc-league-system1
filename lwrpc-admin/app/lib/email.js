export function normalizeEmailAddress(value) {
  return String(value || "").trim().toLowerCase();
}

export function isValidEmailAddress(value) {
  const email = normalizeEmailAddress(value);

  if (!email) return false;

  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}
