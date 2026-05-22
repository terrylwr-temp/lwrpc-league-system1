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
        return NextResponse.json(
          {
            success: false,
            error: resetError.message,
          },
          { status: 500 }
        );
      }

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
      return NextResponse.json(
        {
          success: false,
          error: inviteError.message,
        },
        { status: 500 }
      );
    }

    if (invited?.user?.id) {
      await linkUserRole(adminSupabase, member.id, invited.user.id);
    }

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
