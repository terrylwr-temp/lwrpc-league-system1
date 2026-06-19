export function passkeyErrorMessage(error, action = "passkey action") {
  const message =
    error?.message ||
    (typeof error === "string" ? error : "Passkey / fingerprint failed.");
  const normalizedMessage = message.toLowerCase();
  const rpId = extractRelyingPartyId(message);

  if (rpId) {
    return `Passkey / fingerprint ${action} is not set up for this website address. Open https://${rpId} and try again, or sign in with your email and password.`;
  }

  if (
    normalizedMessage.includes("operation either timed out or was not allowed") ||
    normalizedMessage.includes("notallowederror") ||
    normalizedMessage.includes("privacy-considerations-client") ||
    normalizedMessage.includes("timed out") ||
    normalizedMessage.includes("not allowed")
  ) {
    return "Passkey / fingerprint sign in was canceled, timed out, or is not available on this device. Sign in with your email and password, or use Forgot Password if you need to set your password.";
  }

  if (
    normalizedMessage.includes("credential") && (
      normalizedMessage.includes("not found") ||
      normalizedMessage.includes("no credentials") ||
      normalizedMessage.includes("no passkey")
    )
  ) {
    return "No passkey / fingerprint login was found for this device. Sign in with your email and password, or use Forgot Password if you need to set your password.";
  }

  if (
    normalizedMessage.includes("not available") ||
    normalizedMessage.includes("not supported") ||
    normalizedMessage.includes("unsupported")
  ) {
    return "Passkey / fingerprint sign in is not available in this browser. Sign in with your email and password instead.";
  }

  return message;
}

function extractRelyingPartyId(message) {
  const match = String(message).match(/RP ID\s+"?([^"\s]+)"?.*invalid/i);
  return match?.[1] || null;
}
