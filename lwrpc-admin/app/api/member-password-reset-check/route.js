import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isValidEmailAddress, normalizeEmailAddress } from "../../lib/email";
import { hasRole } from "../../lib/permissions";
import { highestRoleForMembers } from "../../lib/memberLookup";
import { loadServerSystemSettings } from "../../lib/serverEmailTemplates";
import { emailIsActivated } from "../../lib/systemSettings";

export const runtime = "nodejs";

const RESET_REDIRECT_URL = "https://league.lwrpickleballclub.com/reset-password";
const RESET_RATE_LIMIT_WINDOW_SECONDS = 60 * 60;
const MAX_RESET_REQUESTS_PER_EMAIL = 3;
const MAX_RESET_REQUESTS_PER_IP = 10;
const GENERIC_SUCCESS_MESSAGE = "If that email address belongs to an active league member, a sign-in email has been sent. Please check the inbox, spam, and promotions folders.";

const fallbackRateLimits = globalThis.__lwrpcPasswordResetRateLimits || new Map();
if (!globalThis.__lwrpcPasswordResetRateLimits) {
  globalThis.__lwrpcPasswordResetRateLimits = fallbackRateLimits;
}

function adminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE ||
    process.env.SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Member email verification is not configured.");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function anonClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    throw new Error("Supabase anon credentials are not configured.");
  }

  return createClient(supabaseUrl, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export async function POST(req) {
  let isManager = false;

  try {
    const body = await req.json().catch(() => ({}));
    const normalizedEmail = normalizeEmailAddress(body.email);
    const supabase = adminClient();
    isManager = await requestIsManager(req, supabase);

    if (!isValidEmailAddress(normalizedEmail)) {
      return isManager
        ? failureResponse("Please enter a valid email address, such as name@example.com.", 400)
        : genericSuccessResponse();
    }

    if (!isManager) {
      const turnstileValid = await validateTurnstile(body.turnstileToken, requestIp(req));
      if (!turnstileValid) {
        return failureResponse("Please complete the security check and try again.", 400);
      }

      const allowed = await consumePublicResetRateLimits(supabase, normalizedEmail, requestIp(req));
      if (!allowed) return genericSuccessResponse();
    }

    const redirectTo = resetRedirectUrl(body.returnTo);
    const { data: memberRows, error: memberError } = await supabase
      .from("members")
      .select("id, is_active_member")
      .eq("email", normalizedEmail)
      .order("created_at", { ascending: true });

    if (memberError) throw memberError;

    const members = memberRows || [];
    const activeMembers = members.filter((row) => row.is_active_member !== false);
    const member = activeMembers[0] || members[0] || null;

    if (!member?.id) {
      return resetResponse(isManager, {
        memberExists: false,
        isActiveMember: false,
        emailSent: false,
      });
    }

    if (activeMembers.length === 0) {
      return resetResponse(isManager, {
        memberExists: true,
        isActiveMember: false,
        emailSent: false,
      });
    }

    const systemSettings = await loadServerSystemSettings();
    if (!emailIsActivated(systemSettings)) {
      return resetResponse(isManager, {
        memberExists: true,
        isActiveMember: true,
        emailSent: false,
        emailDeliveryDisabled: true,
        message: "Email delivery is not activated in Email Options.",
      });
    }

    const authUser = await findAuthUserByEmail(supabase, normalizedEmail);

    if (authUser?.id) {
      await linkUserRoles(supabase, activeMembers, authUser.id);

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo,
      });

      if (resetError) {
        console.error("Password reset recovery email failed", {
          email: normalizedEmail,
          authUserId: authUser.id,
          error: resetError.message,
        });

        return isManager
          ? failureResponse(friendlyAuthEmailError(resetError.message), isAuthEmailRateLimit(resetError.message) ? 429 : 500)
          : genericSuccessResponse();
      }

      return resetResponse(isManager, {
        memberExists: true,
        isActiveMember: true,
        emailSent: true,
        emailType: "recovery",
      });
    }

    const { data: invited, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(normalizedEmail, {
      redirectTo,
    });

    if (inviteError) {
      console.error("Account setup invite email failed", {
        email: normalizedEmail,
        error: inviteError.message,
      });

      return isManager
        ? failureResponse(friendlyAuthEmailError(inviteError.message), isAuthEmailRateLimit(inviteError.message) ? 429 : 500)
        : genericSuccessResponse();
    }

    if (invited?.user?.id) {
      await linkUserRoles(supabase, activeMembers, invited.user.id);
    }

    return resetResponse(isManager, {
      memberExists: true,
      isActiveMember: true,
      emailSent: true,
      emailType: "invite",
    });
  } catch (error) {
    console.error("Member password reset request failed", error);
    return isManager
      ? failureResponse(error.message || "Unable to send the login email.", 500)
      : genericSuccessResponse();
  }
}

function genericSuccessResponse() {
  return NextResponse.json({
    success: true,
    verification: "complete",
    message: GENERIC_SUCCESS_MESSAGE,
  });
}

function resetResponse(isManager, details) {
  if (!isManager) return genericSuccessResponse();
  return NextResponse.json({ success: true, verification: "complete", ...details });
}

function failureResponse(error, status) {
  return NextResponse.json({ success: false, error }, { status });
}

async function requestIsManager(req, supabase) {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return false;

  const authSupabase = anonClient();
  const { data: userData, error: userError } = await authSupabase.auth.getUser(token);
  if (userError || !userData?.user?.email) return false;

  const { data: memberRows, error: memberError } = await supabase
    .from("members")
    .select("id, is_active_member, created_at, user_roles(role)")
    .eq("email", userData.user.email)
    .order("created_at", { ascending: true });

  if (memberError) throw memberError;
  return hasRole(highestRoleForMembers(memberRows || []), "league_manager");
}

async function validateTurnstile(token, remoteip) {
  const secret = String(process.env.TURNSTILE_SECRET_KEY || "").trim();
  if (!secret) return true;

  const responseToken = String(token || "").trim();
  if (!responseToken) return false;

  try {
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret, response: responseToken, remoteip }),
      signal: AbortSignal.timeout(10_000),
    });
    const result = await response.json().catch(() => ({}));
    return response.ok && result?.success === true;
  } catch (error) {
    console.error("Turnstile validation failed", error);
    return false;
  }
}

async function consumePublicResetRateLimits(supabase, email, ip) {
  const [emailAllowed, ipAllowed] = await Promise.all([
    consumeRateLimit(supabase, `email:${email}`, MAX_RESET_REQUESTS_PER_EMAIL),
    consumeRateLimit(supabase, `ip:${ip}`, MAX_RESET_REQUESTS_PER_IP),
  ]);

  return emailAllowed && ipAllowed;
}

async function consumeRateLimit(supabase, key, maxRequests) {
  const { data, error } = await supabase.rpc("consume_password_reset_rate_limit", {
    p_rate_limit_key: key,
    p_window_seconds: RESET_RATE_LIMIT_WINDOW_SECONDS,
    p_max_requests: maxRequests,
  });

  if (!error) return data === true;

  console.error("Password reset database rate limit is unavailable; using instance fallback.", error);
  return consumeFallbackRateLimit(key, maxRequests);
}

function consumeFallbackRateLimit(key, maxRequests) {
  const now = Date.now();
  const current = fallbackRateLimits.get(key);
  const windowMilliseconds = RESET_RATE_LIMIT_WINDOW_SECONDS * 1_000;

  if (fallbackRateLimits.size >= 1_000) {
    for (const [storedKey, storedValue] of fallbackRateLimits) {
      if (storedValue.windowStartedAt + windowMilliseconds <= now) {
        fallbackRateLimits.delete(storedKey);
      }
    }
  }

  const next = !current || current.windowStartedAt + windowMilliseconds <= now
    ? { windowStartedAt: now, requestCount: 1 }
    : { ...current, requestCount: current.requestCount + 1 };

  fallbackRateLimits.set(key, next);
  return next.requestCount <= maxRequests;
}

function requestIp(req) {
  const forwarded = String(req.headers.get("x-forwarded-for") || "").split(",")[0].trim();
  return forwarded || String(req.headers.get("x-real-ip") || "").trim() || "unknown";
}

function resetRedirectUrl(returnTo) {
  const url = new URL(RESET_REDIRECT_URL);
  const safeReturnTo = safeInternalReturnPath(returnTo);
  if (safeReturnTo) url.searchParams.set("returnTo", safeReturnTo);
  return url.toString();
}

function safeInternalReturnPath(value) {
  const text = String(value || "").trim();
  if (!text || !text.startsWith("/") || text.startsWith("//")) return "";

  try {
    const base = new URL(RESET_REDIRECT_URL);
    const url = new URL(text, base);
    return url.origin === base.origin ? `${url.pathname}${url.search}${url.hash}` : "";
  } catch {
    return "";
  }
}

async function findAuthUserByEmail(adminSupabase, email) {
  const targetEmail = normalizeEmailAddress(email);

  for (let page = 1; page < 20; page += 1) {
    const { data, error } = await adminSupabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;

    const user = (data?.users || []).find(
      (candidate) => normalizeEmailAddress(candidate.email) === targetEmail
    );
    if (user) return user;
    if (!data?.users || data.users.length < 1000) return null;
  }

  return null;
}

async function linkUserRoles(adminSupabase, members, userId) {
  const memberIds = (members || []).map((member) => member.id).filter(Boolean);
  if (memberIds.length === 0) return;

  await adminSupabase
    .from("user_roles")
    .update({ user_id: userId, updated_at: new Date().toISOString() })
    .in("member_id", memberIds)
    .is("user_id", null);
}

function isAuthEmailRateLimit(message) {
  const text = String(message || "").toLowerCase();
  return text.includes("only request this after") || text.includes("rate limit");
}

function friendlyAuthEmailError(message) {
  return isAuthEmailRateLimit(message)
    ? "A password reset or account setup email was requested recently. Please wait a minute, then try again."
    : message;
}
