import { NextRequest, NextResponse } from "next/server";
import { generateOtpCode } from "@/lib/otp";
import { listOtpInvites, mapOtpInvite, type OtpInviteRow } from "@/lib/invites";
import { sendOtpInviteEmail } from "@/lib/email";
import { createServiceSupabaseClient } from "@/lib/supabase/service";
import { requireCommissioner } from "../../../utils";

const DEFAULT_EXPIRY_HOURS = 48;

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const commissionerResult = await requireCommissioner();
  if ("error" in commissionerResult) {
    return commissionerResult.error;
  }
  const { commissionerId, commissionerName } = commissionerResult;

  const { id: inviteId } = await context.params;
  if (!inviteId) {
    return NextResponse.json({ error: "Invite id is required." }, { status: 400 });
  }

  const serviceClient = createServiceSupabaseClient();
  const { data: inviteRow, error: inviteError } = await serviceClient
    .from("one_time_passwords")
    .select("*")
    .eq("id", inviteId)
    .maybeSingle();

  if (inviteError && inviteError.code !== "PGRST116") {
    console.error("[admin.invites.resend] invite lookup error", inviteError);
    return NextResponse.json({ error: "Failed to look up invite." }, { status: 500 });
  }

  if (!inviteRow) {
    return NextResponse.json({ error: "Invite not found." }, { status: 404 });
  }

  if (!inviteRow.email) {
    return NextResponse.json({ error: "Invite does not have an email address to deliver to." }, { status: 400 });
  }

  const { data: userProfile, error: profileError } = await serviceClient
    .from("users")
    .select("display_name")
    .eq("id", inviteRow.user_id)
    .maybeSingle();

  if (profileError && profileError.code !== "PGRST116") {
    console.error("[admin.invites.resend] profile lookup error", profileError);
    return NextResponse.json({ error: "Failed to load invite profile details." }, { status: 500 });
  }

  const nowIso = new Date().toISOString();
  const { error: invalidateError } = await serviceClient
    .from("one_time_passwords")
    .update({ consumed_at: nowIso })
    .eq("user_id", inviteRow.user_id)
    .is("consumed_at", null);

  if (invalidateError && invalidateError.code !== "PGRST116") {
    console.error("[admin.invites.resend] invalidate error", invalidateError);
    return NextResponse.json({ error: "Failed to invalidate previous invites." }, { status: 500 });
  }

  const otpCode = generateOtpCode();
  const expiresAt = new Date(Date.now() + DEFAULT_EXPIRY_HOURS * 60 * 60 * 1000).toISOString();

  const { data: newInvite, error: insertError } = await serviceClient
    .from("one_time_passwords")
    .insert({
      user_id: inviteRow.user_id,
      username: inviteRow.username,
      email: inviteRow.email,
      otp: otpCode,
      expires_at: expiresAt,
      created_by: commissionerId,
    })
    .select("*")
    .single();

  if (insertError || !newInvite) {
    console.error("[admin.invites.resend] insert error", insertError);
    return NextResponse.json({ error: "Failed to create new invite." }, { status: 500 });
  }

  try {
    const requestOrigin = new URL(request.url).origin;
    await sendOtpInviteEmail({
      email: inviteRow.email,
      displayName: userProfile?.display_name ?? undefined,
      username: inviteRow.username,
      otpCode,
      expiresAtIso: expiresAt,
      baseUrl: requestOrigin,
      commissionerName,
    });
  } catch (emailError) {
    console.error("[admin.invites.resend] email delivery error", emailError);
    return NextResponse.json({ error: "Invite resent but email delivery failed." }, { status: 500 });
  }

  try {
    const invites = await listOtpInvites(serviceClient);
    return NextResponse.json({
      invite: mapOtpInvite(newInvite as OtpInviteRow),
      invites,
    });
  } catch (error) {
    console.error("[admin.invites.resend] refresh invite list failed", error);
    return NextResponse.json({ error: "Failed to refresh invites." }, { status: 500 });
  }
}
