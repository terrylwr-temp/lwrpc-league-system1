import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isValidEmailAddress, normalizeEmailAddress } from "../../lib/email";

export const runtime = "nodejs";

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

    return NextResponse.json({
      success: true,
      verification: "complete",
      memberExists: Boolean(member?.id),
      isActiveMember: member?.is_active_member !== false,
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
