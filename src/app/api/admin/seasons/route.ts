import { NextResponse } from "next/server";
import { createServiceSupabaseClient } from "@/lib/supabase/service";
import { requireCommissioner } from "../utils";

type RequestPayload = {
  name?: string;
  startDate?: string;
  endDate?: string | null;
  activate?: boolean;
};

export async function POST(request: Request) {
  const commissionerResult = await requireCommissioner();
  if ("error" in commissionerResult) {
    return commissionerResult.error;
  }
  const { commissionerId } = commissionerResult;

  let body: RequestPayload;
  try {
    body = (await request.json()) as RequestPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const name = body.name?.trim();
  const startDate = body.startDate?.trim();
  const endDate = body.endDate?.trim() || null;
  const activate = Boolean(body.activate);

  if (!name) {
    return NextResponse.json({ error: "Season name is required." }, { status: 400 });
  }
  if (!startDate) {
    return NextResponse.json({ error: "Start date is required." }, { status: 400 });
  }

  const serviceClient = createServiceSupabaseClient();

  const insertPayload: Record<string, unknown> = {
    name,
    start_date: startDate,
    end_date: endDate,
    is_active: activate,
  };

  const { data: insertedSeason, error: insertError } = await serviceClient
    .from("seasons")
    .insert(insertPayload)
    .select("*")
    .single();

  if (insertError || !insertedSeason) {
    console.error("[admin.seasons] insert error", insertError);
    return NextResponse.json({ error: "Failed to create season." }, { status: 500 });
  }

  if (activate) {
    const [{ error: deactivateError }, { error: activateError }] = await Promise.all([
      serviceClient.from("seasons").update({ is_active: false }).neq("id", insertedSeason.id),
      serviceClient.from("seasons").update({ is_active: true }).eq("id", insertedSeason.id),
    ]);

    if (deactivateError || activateError) {
      console.error("[admin.seasons] activation sync error", deactivateError ?? activateError);
      return NextResponse.json({ error: "Season created, but failed to activate." }, { status: 500 });
    }
  }

  const { error: auditError } = await serviceClient.from("audit_logs").insert({
    actor_id: commissionerId,
    event_type: "season_created",
    entity_type: "season",
    entity_id: insertedSeason.id,
    metadata: {
      name,
      start_date: startDate,
      end_date: endDate,
      activated: activate,
    },
  });

  if (auditError) {
    console.error("[admin.seasons] audit log error", auditError);
  }

  return NextResponse.json({
    season: insertedSeason,
  });
}

