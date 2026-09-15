// The caller must supply the reviewed Rules threshold; there is no fallback cutoff.
export function rulesRfThreshold(content) {
  const match = String(content || '').match(/4\.1\.1\.[\s\S]*?Reliability Factor of (\d+(?:\.\d{1,3})?) or below will be classified as/);
  const value = match ? Number(match[1]) : NaN;
  return Number.isFinite(value) && value >= 0 && value <= 100 ? value : null;
}
export function sourceRfClassification(value, threshold) {
  if (value === null || value === undefined || value === '' || threshold === null || threshold === undefined) return 'RF_UNKNOWN';
  const text = String(value);
  if (!/^\d+(?:\.\d{1,3})?$/.test(text) || !/^\d+(?:\.\d{1,3})?$/.test(String(threshold))) return 'RF_UNKNOWN';
  const number = Number(text), boundary = Number(threshold);
  if (!Number.isFinite(number) || number < 0 || number > 100 || !Number.isFinite(boundary) || boundary < 0 || boundary > 100) return 'RF_UNKNOWN';
  return number <= boundary ? 'NR' : 'RATED';
}
