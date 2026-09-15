export const RESET_LINK_ERROR = "This password-reset link is invalid or expired. Request a new reset email from the sign-in page and use the newest link.";
export const RESET_SESSION_ERROR = "Your secure password-reset session is not available. Sign in or request a new reset email from the sign-in page.";

export function passwordResetLinkError(search = "", hash = "") {
  return [search, hash.replace(/^#/, "")].some((value) => {
    const params = new URLSearchParams(value);
    return ["error", "error_code", "error_description"].some((key) => params.has(key));
  }) ? RESET_LINK_ERROR : "";
}

export async function passwordResetAccess(auth, linkError = "") {
  // A failed recovery link must not use an unrelated existing signed-in session.
  if (linkError) return { ready: false, message: linkError };
  try {
    const { data, error } = await auth.getSession();
    return !error && data?.session
      ? { ready: true, message: "" }
      : { ready: false, message: RESET_SESSION_ERROR };
  } catch {
    return { ready: false, message: RESET_SESSION_ERROR };
  }
}
