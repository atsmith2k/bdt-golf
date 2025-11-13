import { NextRequest, NextResponse } from "next/server";
import { createServiceSupabaseClient } from "@/lib/supabase/service";
import { listOtpInvites, mapOtpInvite, type OtpInviteRow } from "@/lib/invites";
import { requireCommissioner } from "../../../utils";

export async function POST(
  _: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const commissionerResult = await requireCommissioner();
  if ("error" in commissionerResult) {
    return commissionerResult.error;
  }

  const { id: inviteId } = await context.params;
  if (!inviteId) {
    return NextResponse.json({ error: "Invite id is required." }, { status: 400 });
  }

  const serviceClient = createServiceSupabaseClient();
  const nowIso = new Date().toISOString();

  const { data: inviteRow, error: inviteError } = await serviceClient
    .from("one_time_passwords")
    .select("*")
    .eq("id", inviteId)
    .maybeSingle();

  if (inviteError && inviteError.code !== "PGRST116") {
    console.error("[admin.invites.revoke] invite lookup error", inviteError);
    return NextResponse.json({ error: "Failed to look up invite." }, { status: 500 });
  }

  if (!inviteRow) {
    return NextResponse.json({ error: "Invite not found." }, { status: 404 });
  }

  if (inviteRow.consumed_at) {
    try {
      const invites = await listOtpInvites(serviceClient);
      return NextResponse.json({
        invite: mapOtpInvite(inviteRow as OtpInviteRow),
        invites,
      });
    } catch (error) {
      console.error("[admin.invites.revoke] refresh invite list failed", error);
      return NextResponse.json({ error: "Failed to refresh invites." }, { status: 500 });
    }
  }

  const { data: updatedInvite, error: updateError } = await serviceClient
    .from("one_time_passwords")
    .update({ consumed_at: nowIso })
    .eq("id", inviteId)
    .select("*")
    .single();

  if (updateError || !updatedInvite) {
    console.error("[admin.invites.revoke] update error", updateError);
    return NextResponse.json({ error: "Failed to revoke invite." }, { status: 500 });
  }

  try {
    const invites = await listOtpInvites(serviceClient);
    return NextResponse.json({
      invite: mapOtpInvite(updatedInvite as OtpInviteRow),
      invites,
    });
  } catch (error) {
    console.error("[admin.invites.revoke] refresh invite list failed", error);
    return NextResponse.json({ error: "Failed to refresh invites." }, { status: 500 });
  }
}
