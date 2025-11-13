import { NextResponse } from "next/server";
import { createServiceSupabaseClient } from "@/lib/supabase/service";
import { requireCommissioner } from "../utils";

type RequestPayload = {
  seasonId?: string;
  name?: string;
  color?: string | null;
};

function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

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

  const seasonId = body.seasonId?.trim();
  const name = body.name?.trim();
  const color = body.color?.trim() || null;

  if (!seasonId) {
    return NextResponse.json({ error: "Season id is required." }, { status: 400 });
  }
  if (!name) {
    return NextResponse.json({ error: "Team name is required." }, { status: 400 });
  }

  const serviceClient = createServiceSupabaseClient();

  const { data: seasonRow, error: seasonError } = await serviceClient
    .from("seasons")
    .select("id, name")
    .eq("id", seasonId)
    .maybeSingle();

  if (seasonError && seasonError.code !== "PGRST116") {
    console.error("[admin.teams] season lookup error", seasonError);
    return NextResponse.json({ error: "Unable to validate season." }, { status: 500 });
  }

  if (!seasonRow) {
    return NextResponse.json({ error: "Season not found." }, { status: 404 });
  }

  const slug = slugify(name);

  const { data: teamRow, error: insertError } = await serviceClient
    .from("teams")
    .insert({
      season_id: seasonId,
      name,
      slug,
      color,
    })
    .select("*")
    .single();

  if (insertError || !teamRow) {
    console.error("[admin.teams] insert error", insertError);
    const message =
      insertError?.code === "23505"
        ? "Team name or slug already exists for this season."
        : "Failed to create team.";
    return NextResponse.json({ error: message }, { status: 409 });
  }

  const { error: auditError } = await serviceClient.from("audit_logs").insert({
    actor_id: commissionerId,
    event_type: "team_created",
    entity_type: "team",
    entity_id: teamRow.id,
    metadata: {
      name,
      season_id: seasonId,
      season_name: seasonRow.name,
      color,
    },
  });

  if (auditError) {
    console.error("[admin.teams] audit log error", auditError);
  }

  return NextResponse.json({ team: teamRow });
}

