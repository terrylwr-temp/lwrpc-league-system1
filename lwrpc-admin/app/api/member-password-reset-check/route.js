import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isValidEmailAddress, normalizeEmailAddress } from "../../lib/email";

export const runtime = "nodejs";

const RESET_REDIRECT_URL = "https://league.lwrpickleballclub.com/reset-password";

export async function POST(req) {
  try {
    const { email, returnTo } = await req.json();
    const normalizedEmail = normalizeEmailAddress(email);
    const redirectTo = resetRedirectUrl(returnTo);

    if (!isValidEmailAddress(normalizedEmail)) {
      return NextResponse.json(
        {
          success: false,
          error: "Please enter a valid email address, such as name@example.com.",
        },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_SERVICE_KEY ||
      process.env.SUPABASE_SERVICE_ROLE;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        {
          success: false,
          error: "Member email verification is not configured. Please add SUPABASE_SERVICE_ROLE_KEY on the server.",
        },
        { status: 503 }
      );
    }

    const adminSupabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const { data: memberRows, error } = await adminSupabase
      .from("members")
      .select("id, is_active_member")
      .eq("email", normalizedEmail)
      .order("created_at", { ascending: true });

    if (error) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 500 }
      );
    }

    const members = memberRows || [];
    const activeMembers = members.filter((row) => row.is_active_member !== false);
    const member = activeMembers[0] || members[0] || null;

    if (!member?.id) {
      return NextResponse.json({
        success: true,
        verification: "complete",
        memberExists: false,
        isActiveMember: false,
        emailSent: false,
      });
    }

    if (activeMembers.length === 0) {
      return NextResponse.json({
        success: true,
        verification: "complete",
        memberExists: true,
        isActiveMember: false,
        emailSent: false,
      });
    }

    const authUser = await findAuthUserByEmail(adminSupabase, normalizedEmail);

    if (authUser?.id) {
      await linkUserRoles(adminSupabase, activeMembers, authUser.id);

      const { error: resetError } = await adminSupabase.auth.resetPasswordForEmail(
        normalizedEmail,
        {
          redirectTo,
        }
      );

      if (resetError) {
        console.error("Password reset recovery email failed", {
          email: normalizedEmail,
          authUserId: authUser.id,
          error: resetError.message,
        });

        return NextResponse.json(
          {
            success: false,
            error: friendlyAuthEmailError(resetError.message),
          },
          { status: isAuthEmailRateLimit(resetError.message) ? 429 : 500 }
        );
      }

      console.info("Password reset recovery email accepted by Supabase", {
        email: normalizedEmail,
        authUserId: authUser.id,
      });

      return NextResponse.json({
        success: true,
        verification: "complete",
        memberExists: true,
        isActiveMember: true,
        emailSent: true,
        emailType: "recovery",
      });
    }

    const { data: invited, error: inviteError } =
      await adminSupabase.auth.admin.inviteUserByEmail(normalizedEmail, {
        redirectTo,
      });

    if (inviteError) {
      console.error("Account setup invite email failed", {
        email: normalizedEmail,
        error: inviteError.message,
      });

      return NextResponse.json(
        {
          success: false,
          error: friendlyAuthEmailError(inviteError.message),
        },
        { status: isAuthEmailRateLimit(inviteError.message) ? 429 : 500 }
      );
    }

    if (invited?.user?.id) {
      await linkUserRoles(adminSupabase, activeMembers, invited.user.id);
    }

    console.info("Account setup invite email accepted by Supabase", {
      email: normalizedEmail,
      authUserId: invited?.user?.id || null,
    });

    return NextResponse.json({
      success: true,
      verification: "complete",
      memberExists: true,
      isActiveMember: true,
      emailSent: true,
      emailType: "invite",
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}

function resetRedirectUrl(returnTo) {
  const url = new URL(RESET_REDIRECT_URL);
  const safeReturnTo = safeInternalReturnPath(returnTo);

  if (safeReturnTo) {
    url.searchParams.set("returnTo", safeReturnTo);
  }

  return url.toString();
}

function safeInternalReturnPath(value) {
  const text = String(value || "").trim();
  if (!text || !text.startsWith("/") || text.startsWith("//")) return "";

  try {
    const base = new URL(RESET_REDIRECT_URL);
    const url = new URL(text, base);
    if (url.origin !== base.origin) return "";
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "";
  }
}

async function findAuthUserByEmail(adminSupabase, email) {
  const targetEmail = normalizeEmailAddress(email);
  let page = 1;
  const perPage = 1000;

  while (page < 20) {
    const { data, error } = await adminSupabase.auth.admin.listUsers({
      page,
      perPage,
    });

    if (error) throw error;

    const user = (data?.users || []).find(
      (candidate) => normalizeEmailAddress(candidate.email) === targetEmail
    );

    if (user) return user;
    if (!data?.users || data.users.length < perPage) return null;

    page += 1;
  }

  return null;
}

async function linkUserRoles(adminSupabase, members, userId) {
  const memberIds = (members || [])
    .map((member) => member.id)
    .filter(Boolean);

  if (memberIds.length === 0) return;

  await adminSupabase
    .from("user_roles")
    .update({
      user_id: userId,
      updated_at: new Date().toISOString(),
    })
    .in("member_id", memberIds)
    .is("user_id", null);
}

function isAuthEmailRateLimit(message) {
  const text = String(message || "").toLowerCase();
  return text.includes("only request this after") || text.includes("rate limit");
}

function friendlyAuthEmailError(message) {
  if (isAuthEmailRateLimit(message)) {
    return "A password reset or account setup email was requested recently. Please wait a minute, then try again.";
  }

  return message;
}
