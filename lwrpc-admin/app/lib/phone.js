export function formatPhoneNumberInput(value) {
  const { digits, extension } = parsePhone(value);

  if (!digits) return extension ? `x${extension}` : "";

  let formatted = "";

  if (digits.length <= 3) {
    formatted = `(${digits}`;
  } else if (digits.length <= 6) {
    formatted = `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  } else {
    formatted = `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }

  return extension ? `${formatted} x${extension}` : formatted;
}

export function formatPhoneNumberForStorage(value) {
  const raw = String(value || "").trim();
  const { digits, extension } = parsePhone(raw);

  if (digits.length !== 10) return raw;

  const formatted = `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  return extension ? `${formatted} x${extension}` : formatted;
}

function parsePhone(value) {
  const raw = String(value || "").trim();
  const extensionMatch = raw.match(/(?:ext\.?|x)\s*(\d+)$/i);
  const extension = extensionMatch?.[1] || "";
  const withoutExtension = extensionMatch
    ? raw.slice(0, extensionMatch.index).trim()
    : raw;
  let digits = withoutExtension.replace(/\D/g, "");

  if (digits.length === 11 && digits.startsWith("1")) {
    digits = digits.slice(1);
  }

  return {
    digits: digits.slice(0, 10),
    extension,
  };
}
