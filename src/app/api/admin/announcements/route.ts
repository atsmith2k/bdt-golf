import { NextResponse } from "next/server";
import { createServiceSupabaseClient } from "@/lib/supabase/service";
import { requireCommissioner } from "../utils";

type RequestPayload = {
  title?: string;
  body?: string;
  seasonId?: string;
  pinned?: boolean;
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

  const title = body.title?.trim();
  const content = body.body?.trim();
  const seasonId = body.seasonId?.trim();
  const pinned = Boolean(body.pinned);

  if (!title) {
    return NextResponse.json({ error: "Title is required." }, { status: 400 });
  }
  if (!content) {
    return NextResponse.json({ error: "Body is required." }, { status: 400 });
  }
  if (!seasonId) {
    return NextResponse.json({ error: "Season id is required." }, { status: 400 });
  }

  const serviceClient = createServiceSupabaseClient();

  const { data: announcement, error: insertError } = await serviceClient
    .from("announcements")
    .insert({
      season_id: seasonId,
      author_id: commissionerId,
      title,
      body: content,
      pinned,
    })
    .select("*")
    .single();

  if (insertError || !announcement) {
    console.error("[admin.announcements] insert error", insertError);
    return NextResponse.json({ error: "Failed to publish announcement." }, { status: 500 });
  }

  const eventPayload = {
    type: "announcement",
    announcement_id: announcement.id,
    title,
    pinned,
  };

  const [{ error: timelineError }, { error: auditError }] = await Promise.all([
    serviceClient.from("timeline_events").insert({
      season_id: seasonId,
      event_type: "announcement",
      payload: eventPayload,
      announcement_id: announcement.id,
      created_by: commissionerId,
    }),
    serviceClient.from("audit_logs").insert({
      actor_id: commissionerId,
      event_type: "announcement_published",
      entity_type: "announcement",
      entity_id: announcement.id,
      metadata: {
        title,
        season_id: seasonId,
        pinned,
      },
    }),
  ]);

  if (timelineError) {
    console.error("[admin.announcements] timeline error", timelineError);
  }
  if (auditError) {
    console.error("[admin.announcements] audit log error", auditError);
  }

  return NextResponse.json({
    announcement,
  });
}

