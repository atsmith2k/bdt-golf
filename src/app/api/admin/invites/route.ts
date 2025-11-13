import { NextResponse } from "next/server";
import { generateOtpCode, generateTemporaryPassword } from "@/lib/otp";
import { listOtpInvites, mapOtpInvite, type OtpInviteRow } from "@/lib/invites";
import { sendOtpInviteEmail } from "@/lib/email";
import { createServiceSupabaseClient } from "@/lib/supabase/service";
import { requireCommissioner } from "../utils";

const DEFAULT_EXPIRY_HOURS = 48;
const MAX_EXPIRY_HOURS = 168; // one week

type RequestPayload = {
  email?: string;
  username?: string;
  displayName?: string;
  role?: "player" | "commissioner";
  teamId?: string | null;
  expiresInHours?: number;
};

function validatePayload(payload: RequestPayload) {
  const email = payload.email?.trim().toLowerCase() ?? "";
  const username = payload.username?.trim() ?? "";
  const displayName = payload.displayName?.trim() ?? "";
  const teamId = payload.teamId === "" ? null : payload.teamId ?? undefined;
  const role = payload.role ?? "player";
  const expiresInHours = Number.isFinite(payload.expiresInHours)
    ? Math.min(Math.max(Math.trunc(payload.expiresInHours ?? DEFAULT_EXPIRY_HOURS), 1), MAX_EXPIRY_HOURS)
    : DEFAULT_EXPIRY_HOURS;

  if (!email || !email.includes("@")) {
    return { error: NextResponse.json({ error: "Valid email is required." }, { status: 400 }) };
  }
  if (!username || username.length < 2) {
    return { error: NextResponse.json({ error: "Username must be at least two characters." }, { status: 400 }) };
  }
  if (!displayName) {
    return { error: NextResponse.json({ error: "Display name is required." }, { status: 400 }) };
  }
  if (role !== "player" && role !== "commissioner") {
    return { error: NextResponse.json({ error: "Invalid role provided." }, { status: 400 }) };
  }

  return { email, username, displayName, teamId, role, expiresInHours } as const;
}

export async function POST(request: Request) {
  const commissionerResult = await requireCommissioner();
  if ("error" in commissionerResult) {
    return commissionerResult.error;
  }
  const { commissionerId, commissionerName } = commissionerResult;

  let body: RequestPayload;
  try {
    body = (await request.json()) as RequestPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const validationResult = validatePayload(body);
  if ("error" in validationResult) {
    return validationResult.error;
  }

  const { email, username, displayName, teamId, role, expiresInHours } = validationResult;

  const serviceClient = createServiceSupabaseClient();

  if (typeof teamId === "string") {
    const { data: teamData, error: teamError } = await serviceClient
      .from("teams")
      .select("id")
      .eq("id", teamId)
      .maybeSingle();

    if (teamError && teamError.code !== "PGRST116") {
      console.error("[admin.invites] team lookup error", teamError);
      return NextResponse.json({ error: "Unable to validate team." }, { status: 500 });
    }

    if (!teamData) {
      return NextResponse.json({ error: "Selected team was not found." }, { status: 400 });
    }
  }

  const temporaryPassword = generateTemporaryPassword();
  const { data: createUserData, error: createUserError } = await serviceClient.auth.admin.createUser({
    email,
    email_confirm: true,
    password: temporaryPassword,
    user_metadata: {
      full_name: displayName,
      username,
    },
  });

  if (createUserError && createUserError.status !== 422) {
    console.error("[admin.invites] create user error", createUserError);
    return NextResponse.json({ error: "Failed to create Supabase user." }, { status: 500 });
  }

  let authUserId = createUserData?.user?.id ?? null;

  if (!authUserId) {
    const { data: existingUsers, error: lookupError } = await serviceClient.auth.admin.listUsers({
      page: 1,
      perPage: 200,
    });

    if (lookupError) {
      console.error("[admin.invites] list users error", lookupError);
      return NextResponse.json({ error: "Unable to look up existing user." }, { status: 500 });
    }

    authUserId =
      existingUsers.users.find(
        (user) => user.email?.toLowerCase() === email || user.user_metadata?.username === username,
      )?.id ?? null;
  }

  if (!authUserId) {
    return NextResponse.json({ error: "Unable to determine Supabase user id." }, { status: 500 });
  }

  const { data: usernameRow, error: usernameError } = await serviceClient
    .from("users")
    .select("id, username")
    .eq("username", username)
    .maybeSingle();

  if (usernameError && usernameError.code !== "PGRST116") {
    console.error("[admin.invites] username lookup error", usernameError);
    return NextResponse.json({ error: "Failed to validate username." }, { status: 500 });
  }

  if (usernameRow && usernameRow.id !== authUserId) {
    return NextResponse.json({ error: "Username already in use by another member." }, { status: 409 });
  }

  const upsertPayload: Record<string, unknown> = {
    id: authUserId,
    username,
    display_name: displayName,
    email,
    role,
    updated_at: new Date().toISOString(),
  };

  if (teamId !== undefined) {
    upsertPayload.team_id = teamId ?? null;
  }

  const { error: upsertError } = await serviceClient
    .from("users")
    .upsert(upsertPayload, { onConflict: "id" });

  if (upsertError) {
    console.error("[admin.invites] user upsert error", upsertError);
    return NextResponse.json({ error: "Failed to upsert user profile." }, { status: 500 });
  }

  const nowIso = new Date().toISOString();
  const { error: invalidateError } = await serviceClient
    .from("one_time_passwords")
    .update({ consumed_at: nowIso })
    .eq("user_id", authUserId)
    .is("consumed_at", null);

  if (invalidateError && invalidateError.code !== "PGRST116") {
    console.error("[admin.invites] invalidate invite error", invalidateError);
    return NextResponse.json({ error: "Failed to expire previous invites." }, { status: 500 });
  }

  const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000).toISOString();
  const otpCode = generateOtpCode();

  const { data: insertInvite, error: insertError } = await serviceClient
    .from("one_time_passwords")
    .insert({
      user_id: authUserId,
      username,
      email,
      otp: otpCode,
      expires_at: expiresAt,
      created_by: commissionerId,
    })
    .select("*")
    .single();

  if (insertError || !insertInvite) {
    console.error("[admin.invites] insert invite error", insertError);
    return NextResponse.json({ error: "Failed to create OTP invite." }, { status: 500 });
  }

  try {
    const requestOrigin = new URL(request.url).origin;
    await sendOtpInviteEmail({
      email,
      displayName,
      username,
      otpCode,
      expiresAtIso: expiresAt,
      baseUrl: requestOrigin,
      commissionerName,
    });
  } catch (emailError) {
    console.error("[admin.invites] email delivery error", emailError);
    return NextResponse.json({ error: "Invite created but email delivery failed." }, { status: 500 });
  }

  try {
    const invites = await listOtpInvites(serviceClient);

    return NextResponse.json({
      invite: mapOtpInvite(insertInvite as OtpInviteRow),
      invites,
    });
  } catch (error) {
    console.error("[admin.invites] refresh invite list failed", error);
    return NextResponse.json({ error: "Failed to refresh invite list." }, { status: 500 });
  }
}
