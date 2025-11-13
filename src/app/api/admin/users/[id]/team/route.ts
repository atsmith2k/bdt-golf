import { NextRequest, NextResponse } from "next/server";
import { createServiceSupabaseClient } from "@/lib/supabase/service";
import { requireCommissioner } from "../../../utils";

type RequestPayload = {
  teamId?: string | null;
  reason?: string;
};

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const commissionerResult = await requireCommissioner();
  if ("error" in commissionerResult) {
    return commissionerResult.error;
  }
  const { commissionerId } = commissionerResult;

  const { id: userId } = await context.params;
  if (!userId) {
    return NextResponse.json({ error: "User id is required." }, { status: 400 });
  }

  let body: RequestPayload;
  try {
    body = (await request.json()) as RequestPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const targetTeamId =
    body.teamId === undefined || body.teamId === "" ? null : body.teamId?.trim() ?? null;
  const reason = body.reason?.trim();

  const serviceClient = createServiceSupabaseClient();

  const { data: userRow, error: userError } = await serviceClient
    .from("users")
    .select("id, display_name, username, team_id")
    .eq("id", userId)
    .maybeSingle();

  if (userError && userError.code !== "PGRST116") {
    console.error("[admin.roster-move] user lookup error", userError);
    return NextResponse.json({ error: "Unable to load user." }, { status: 500 });
  }

  if (!userRow) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  let targetTeamName: string | undefined;
  let previousTeamName: string | undefined;
  let seasonIdForEvent: string | null = null;

  if (targetTeamId) {
    const { data: teamRow, error: teamError } = await serviceClient
      .from("teams")
      .select("id, name, season_id")
      .eq("id", targetTeamId)
      .maybeSingle();

    if (teamError && teamError.code !== "PGRST116") {
      console.error("[admin.roster-move] team lookup error", teamError);
      return NextResponse.json({ error: "Unable to load team." }, { status: 500 });
    }

    if (!teamRow) {
      return NextResponse.json({ error: "Team not found." }, { status: 404 });
    }

    targetTeamName = teamRow.name;
    seasonIdForEvent = teamRow.season_id as string | null;
  }

  const previousTeamId = userRow.team_id ?? null;

  if (previousTeamId === targetTeamId) {
    return NextResponse.json({ user: userRow });
  }

  const { error: updateError } = await serviceClient
    .from("users")
    .update({ team_id: targetTeamId })
    .eq("id", userId);

  if (updateError) {
    console.error("[admin.roster-move] update error", updateError);
    return NextResponse.json({ error: "Failed to update roster assignment." }, { status: 500 });
  }

  if (previousTeamId) {
    const { data: previousTeamRow, error: previousTeamError } = await serviceClient
      .from("teams")
      .select("id, name, season_id")
      .eq("id", previousTeamId)
      .maybeSingle();

    if (previousTeamError && previousTeamError.code !== "PGRST116") {
      console.error("[admin.roster-move] previous team lookup error", previousTeamError);
    } else if (previousTeamRow) {
      previousTeamName = previousTeamRow.name;
      if (!seasonIdForEvent) {
        seasonIdForEvent = previousTeamRow.season_id as string | null;
      }
    }
  }

  const metadata = {
    user_id: userId,
    username: userRow.username,
    previous_team_id: previousTeamId,
    new_team_id: targetTeamId,
    reason: reason ?? null,
  };

  const timelinePayload = {
    type: "roster_move",
    user_id: userId,
    username: userRow.username,
    previous_team_id: previousTeamId,
    new_team_id: targetTeamId,
    reason: reason ?? null,
  };

  const [{ error: timelineError }, { error: auditError }] = await Promise.all([
    serviceClient
      .from("timeline_events")
      .insert({
        season_id: seasonIdForEvent,
        event_type: "season_event",
        payload: timelinePayload,
        match_id: null,
        announcement_id: null,
        created_by: commissionerId,
      }),
    serviceClient.from("audit_logs").insert({
      actor_id: commissionerId,
      event_type: "roster_move",
      entity_type: "user",
      entity_id: userId,
      metadata: {
        ...metadata,
        previous_team_name: previousTeamName ?? null,
        new_team_name: targetTeamName ?? null,
      },
    }),
  ]);

  if (timelineError) {
    console.error("[admin.roster-move] timeline error", timelineError);
  }
  if (auditError) {
    console.error("[admin.roster-move] audit log error", auditError);
  }

  return NextResponse.json({
    user: {
      ...userRow,
      team_id: targetTeamId,
    },
  });
}
