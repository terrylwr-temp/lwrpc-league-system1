import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isValidEmailAddress, normalizeEmailAddress } from "../../lib/email";

export const runtime = "nodejs";

const RESET_REDIRECT_URL = "https://league.lwrpickleballclub.com/reset-password";

export async function POST(req) {
  try {
    const { email } = await req.json();
    const normalizedEmail = normalizeEmailAddress(email);

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

    const { data: member, error } = await adminSupabase
      .from("members")
      .select("id, is_active_member")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 500 }
      );
    }

    if (!member?.id) {
      return NextResponse.json({
        success: true,
        verification: "complete",
        memberExists: false,
        isActiveMember: false,
        emailSent: false,
      });
    }

    if (member.is_active_member === false) {
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
      await linkUserRole(adminSupabase, member.id, authUser.id);

      const { error: resetError } = await adminSupabase.auth.resetPasswordForEmail(
        normalizedEmail,
        {
          redirectTo: RESET_REDIRECT_URL,
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
        redirectTo: RESET_REDIRECT_URL,
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
      await linkUserRole(adminSupabase, member.id, invited.user.id);
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

async function linkUserRole(adminSupabase, memberId, userId) {
  await adminSupabase
    .from("user_roles")
    .update({
      user_id: userId,
      updated_at: new Date().toISOString(),
    })
    .eq("member_id", memberId)
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
