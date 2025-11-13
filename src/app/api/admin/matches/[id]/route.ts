import { NextRequest, NextResponse } from "next/server";
import { createServiceSupabaseClient } from "@/lib/supabase/service";
import { requireCommissioner } from "../../utils";

type MatchAction = "void" | "restore";

type RequestPayload = {
  action?: MatchAction;
  reason?: string;
  status?: "submitted" | "validated" | "scheduled";
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

  const { id: matchId } = await context.params;
  if (!matchId) {
    return NextResponse.json({ error: "Match id is required." }, { status: 400 });
  }

  let body: RequestPayload;
  try {
    body = (await request.json()) as RequestPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const action = body.action;
  if (action !== "void" && action !== "restore") {
    return NextResponse.json({ error: "Unsupported action." }, { status: 400 });
  }

  const reason = (body.reason ?? "").trim();
  if (action === "void" && reason.length === 0) {
    return NextResponse.json({ error: "Reason is required when voiding a match." }, { status: 400 });
  }

  const targetStatus = body.status ?? "submitted";
  const allowedStatuses: Array<"submitted" | "validated" | "scheduled"> = [
    "submitted",
    "validated",
    "scheduled",
  ];
  if (action === "restore" && !allowedStatuses.includes(targetStatus)) {
    return NextResponse.json({ error: "Invalid status for restoration." }, { status: 400 });
  }

  const serviceClient = createServiceSupabaseClient();

  const { data: matchRow, error: matchError } = await serviceClient
    .from("matches")
    .select("id, season_id, status, notes, match_date, match_type")
    .eq("id", matchId)
    .maybeSingle();

  if (matchError && matchError.code !== "PGRST116") {
    console.error("[admin.matches] lookup error", matchError);
    return NextResponse.json({ error: "Unable to load match." }, { status: 500 });
  }

  if (!matchRow) {
    return NextResponse.json({ error: "Match not found." }, { status: 404 });
  }

  if (action === "void" && matchRow.status === "voided") {
    return NextResponse.json({ error: "Match is already voided." }, { status: 409 });
  }

  if (action === "restore" && matchRow.status !== "voided") {
    return NextResponse.json({ error: "Only voided matches can be restored." }, { status: 409 });
  }

  const nowIso = new Date().toISOString();

  let updatedStatus = matchRow.status;
  let updatedNotes = matchRow.notes ?? "";
  if (action === "void") {
    updatedStatus = "voided";
    const addition = `[VOID ${nowIso}] ${reason}`;
    updatedNotes = updatedNotes ? `${updatedNotes.trim()}\n${addition}` : addition;
  } else {
    updatedStatus = targetStatus;
    const addition = reason ? `[RESTORE ${nowIso}] ${reason}` : `[RESTORE ${nowIso}]`;
    updatedNotes = updatedNotes ? `${updatedNotes.trim()}\n${addition}` : addition;
  }

  const { error: updateError } = await serviceClient
    .from("matches")
    .update({ status: updatedStatus, notes: updatedNotes })
    .eq("id", matchId);

  if (updateError) {
    console.error("[admin.matches] update error", updateError);
    return NextResponse.json({ error: "Failed to update match." }, { status: 500 });
  }

  const eventPayload = {
    action,
    match_id: matchId,
    previous_status: matchRow.status,
    new_status: updatedStatus,
    reason: reason || null,
  };

  const [{ error: timelineError }, { error: auditError }] = await Promise.all([
    serviceClient.from("timeline_events").insert({
      season_id: matchRow.season_id,
      event_type: "system",
      payload: eventPayload,
      match_id: matchId,
      created_by: commissionerId,
    }),
    serviceClient.from("audit_logs").insert({
      actor_id: commissionerId,
      event_type: action === "void" ? "match_voided" : "match_restored",
      entity_type: "match",
      entity_id: matchId,
      metadata: {
        ...eventPayload,
        match_date: matchRow.match_date,
        match_type: matchRow.match_type,
      },
    }),
  ]);

  if (timelineError) {
    console.error("[admin.matches] timeline insert error", timelineError);
  }
  if (auditError) {
    console.error("[admin.matches] audit log insert error", auditError);
  }

  return NextResponse.json({
    id: matchId,
    status: updatedStatus,
    notes: updatedNotes,
  });
}
