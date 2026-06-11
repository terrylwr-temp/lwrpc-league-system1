export function passkeyErrorMessage(error, action = "passkey action") {
  const message =
    error?.message ||
    (typeof error === "string" ? error : "Passkey / fingerprint failed.");
  const rpId = extractRelyingPartyId(message);

  if (rpId) {
    const currentOrigin =
      typeof window !== "undefined" && window.location?.origin
        ? window.location.origin
        : "this website address";

    return `Passkey / fingerprint ${action} cannot run from ${currentOrigin}. Supabase is configured for ${rpId}, so open https://${rpId} and try again, or update the Supabase Passkeys RP ID and origins to match the address you are using.`;
  }

  return message;
}

function extractRelyingPartyId(message) {
  const match = String(message).match(/RP ID\s+"?([^"\s]+)"?.*invalid/i);
  return match?.[1] || null;
}
