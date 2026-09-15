// Decimal comparison contract shared by structured-policy tooling and fixtures.
// Admission must never turn an unverified/raw rating into a Season rating.
function decimal(value) {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const text = String(value).trim();
  const match = /^(\d{1,4})(?:\.(\d{1,12}))?$/.exec(text);
  if (!match) return null;
  const fraction = match[2] || '';
  return { coefficient: BigInt(match[1] + fraction), scale: 10n ** BigInt(fraction.length) };
}

export function seasonRatingTenths(value) {
  const parsed = decimal(value);
  if (!parsed || parsed.coefficient <= 0n) return null;
  const numerator = parsed.coefficient * 10n;
  if (numerator % parsed.scale !== 0n) return null;
  return Number(numerator / parsed.scale);
}

export function normalizedRatingRange(minimum, maximum) {
  const low = decimal(minimum), high = decimal(maximum);
  if (!low || !high || low.coefficient <= 0n || high.coefficient <= 0n) return null;
  const min = Number((low.coefficient * 10n + low.scale - 1n) / low.scale);
  const max = Number(high.coefficient * 10n / high.scale);
  return min <= max ? { min, max } : null;
}

export function sameRatingDomain(left, right) {
  const a = normalizedRatingRange(left?.min, left?.max);
  const b = normalizedRatingRange(right?.min, right?.max);
  return Boolean(a && b && a.min === b.min && a.max === b.max);
}

export function classifyRating({ rawRating, reliability, policy }) {
  if (!policy || policy.status !== 'VERIFIED' || policy.operator !== 'LT') return 'UNKNOWN';
  const threshold = decimal(policy.threshold);
  if (!threshold || threshold.coefficient <= 0n) return 'UNKNOWN';
  if (typeof rawRating === 'string' && rawRating.trim().toUpperCase() === 'NR') return 'NR';
  const rf = decimal(reliability);
  if (rf && rf.coefficient * threshold.scale < threshold.coefficient * rf.scale) return 'NR';
  // A raw numeric rating and a known non-low RF are both required for Rated.
  const raw = decimal(rawRating);
  return rf && raw && raw.coefficient > 0n ? 'RATED' : 'UNKNOWN';
}

export function compareSeasonRating({ classification, rating, range, verifiedSeason, nrPlacementAllowed }) {
  if (classification === 'NR') return nrPlacementAllowed === true ? 'PASS' : 'UNKNOWN';
  if (classification !== 'RATED' || verifiedSeason !== true) return 'UNKNOWN';
  const value = seasonRatingTenths(rating);
  const bounds = normalizedRatingRange(range?.min, range?.max);
  if (value === null || !bounds) return 'UNKNOWN';
  return value >= bounds.min && value <= bounds.max ? 'PASS' : 'FAIL';
}
