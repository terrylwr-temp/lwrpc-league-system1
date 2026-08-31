import { NextResponse } from "next/server";
import { authorizeAdminRequest } from "../../../lib/serverSupabase";

export const runtime = "nodejs";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PROFILE_PHOTO_BUCKET = "profile-photos";
const PROFILE_PHOTO_URL_MARKER = `/storage/v1/object/public/${PROFILE_PHOTO_BUCKET}/`;

export async function POST(req) {
  try {
    const authorization = await authorizeAdminRequest(req, "league_manager");

    if (authorization.error) {
      return NextResponse.json(
        { success: false, error: authorization.error },
        { status: authorization.status }
      );
    }

    const payload = await req.json().catch(() => ({}));
    const memberId = String(payload?.memberId || "").trim();

    if (!UUID_PATTERN.test(memberId)) {
      return NextResponse.json(
        { success: false, error: "A valid member ID is required." },
        { status: 400 }
      );
    }

    const { data: member, error: memberError } = await authorization.supabase
      .from("members")
      .select("id, email, is_active_member, profile_image_urls")
      .eq("id", memberId)
      .maybeSingle();

    if (memberError) throw memberError;

    if (!member) {
      return NextResponse.json(
        { success: false, error: "Member not found." },
        { status: 404 }
      );
    }

    if (member.is_active_member !== false) {
      return NextResponse.json(
        { success: false, error: "Only inactive members can be permanently deleted." },
        { status: 409 }
      );
    }

    const { data: roleRows, error: roleError } = await authorization.supabase
      .from("user_roles")
      .select("user_id, role")
      .eq("member_id", memberId);

    if (roleError) throw roleError;

    if ((roleRows || []).some((row) => row.role === "commissioner")) {
      const { data: otherCommissioners, error: commissionerError } = await authorization.supabase
        .from("user_roles")
        .select("id")
        .eq("role", "commissioner")
        .neq("member_id", memberId)
        .limit(1);

      if (commissionerError) throw commissionerError;
      if ((otherCommissioners || []).length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: "At least one Commissioner must remain in the system. Assign another Commissioner before deleting this member.",
          },
          { status: 409 }
        );
      }
    }

    const authUserIds = [...new Set((roleRows || []).map((row) => row.user_id).filter(Boolean))];
    const exclusiveAuthUserIds = [];

    for (const authUserId of authUserIds) {
      const { data: otherRoleRows, error: otherRoleError } = await authorization.supabase
        .from("user_roles")
        .select("id")
        .eq("user_id", authUserId)
        .neq("member_id", memberId)
        .limit(1);

      if (otherRoleError) throw otherRoleError;
      if ((otherRoleRows || []).length === 0) exclusiveAuthUserIds.push(authUserId);
    }

    const { error: deleteError } = await authorization.supabase.rpc(
      "delete_inactive_member",
      { p_member_id: memberId }
    );

    if (deleteError) throw deleteError;

    const cleanupWarnings = [];
    const profilePhotoPaths = managedProfilePhotoPaths(
      member.profile_image_urls,
      exclusiveAuthUserIds
    );

    if (profilePhotoPaths.length > 0) {
      const { error: photoError } = await authorization.supabase.storage
        .from(PROFILE_PHOTO_BUCKET)
        .remove(profilePhotoPaths);
      if (photoError) cleanupWarnings.push("The member record was deleted, but one or more profile photos could not be removed.");
    }

    for (const authUserId of exclusiveAuthUserIds) {
      const { error: authDeleteError } = await authorization.supabase.auth.admin.deleteUser(authUserId);
      if (authDeleteError) {
        cleanupWarnings.push("The member record was deleted, but the linked login account could not be removed.");
      }
    }

    return NextResponse.json({ success: true, cleanupWarnings });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || "Unable to permanently delete this member." },
      { status: 500 }
    );
  }
}

function managedProfilePhotoPaths(urls, authUserIds) {
  const allowedUserIds = new Set(authUserIds.map(String));

  return [...new Set((Array.isArray(urls) ? urls : [])
    .map((url) => {
      try {
        const parsed = new URL(url);
        const markerIndex = parsed.pathname.indexOf(PROFILE_PHOTO_URL_MARKER);
        if (markerIndex < 0) return "";
        return decodeURIComponent(parsed.pathname.slice(markerIndex + PROFILE_PHOTO_URL_MARKER.length));
      } catch {
        return "";
      }
    })
    .filter((path) => {
      const [userId, filename] = String(path).split("/");
      return allowedUserIds.has(userId) && /^avatar-[\w-]+\.(jpg|jpeg|png|webp)$/i.test(filename || "");
    }))];
}
