import { NextRequest, NextResponse } from "next/server";
import { createServiceSupabaseClient } from "@/lib/supabase/service";
import { requireCommissioner } from "../../../utils";

export async function POST(
  _: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const commissionerResult = await requireCommissioner();
  if ("error" in commissionerResult) {
    return commissionerResult.error;
  }
  const { commissionerId } = commissionerResult;

  const { id: seasonId } = await context.params;
  if (!seasonId) {
    return NextResponse.json({ error: "Season id is required." }, { status: 400 });
  }

  const serviceClient = createServiceSupabaseClient();
  const { data: seasonRow, error: seasonError } = await serviceClient
    .from("seasons")
    .select("id, name, is_active")
    .eq("id", seasonId)
    .maybeSingle();

  if (seasonError && seasonError.code !== "PGRST116") {
    console.error("[admin.seasons.activate] lookup error", seasonError);
    return NextResponse.json({ error: "Unable to load season." }, { status: 500 });
  }

  if (!seasonRow) {
    return NextResponse.json({ error: "Season not found." }, { status: 404 });
  }

  if (seasonRow.is_active) {
    return NextResponse.json({ season: seasonRow });
  }

  const [{ error: deactivateError }, { error: activateError }] = await Promise.all([
    serviceClient.from("seasons").update({ is_active: false }).neq("id", seasonId),
    serviceClient.from("seasons").update({ is_active: true }).eq("id", seasonId),
  ]);

  if (deactivateError || activateError) {
    console.error("[admin.seasons.activate] update error", deactivateError ?? activateError);
    return NextResponse.json({ error: "Failed to activate season." }, { status: 500 });
  }

  const { error: auditError } = await serviceClient.from("audit_logs").insert({
    actor_id: commissionerId,
    event_type: "season_activated",
    entity_type: "season",
    entity_id: seasonId,
    metadata: {
      name: seasonRow.name,
    },
  });

  if (auditError) {
    console.error("[admin.seasons.activate] audit log error", auditError);
  }

  return NextResponse.json({
    season: { ...seasonRow, is_active: true },
  });
}
