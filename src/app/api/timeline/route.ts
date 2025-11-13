import { NextResponse } from "next/server";
import type { TimelineEvent } from "@/lib/types";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

function isUuid(value: string | null | undefined): value is string {
  return typeof value === "string" && /^[0-9a-fA-F-]{32,36}$/.test(value);
}

function clampLimit(raw: string | null): number {
  if (!raw) {
    return DEFAULT_LIMIT;
  }
  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return DEFAULT_LIMIT;
  }
  return Math.min(parsed, MAX_LIMIT);
}

function toTimelineEvent(row: {
  id: string;
  event_type: string;
  season_id: string | null;
  created_at: string;
  payload: Record<string, unknown> | null;
  match_id: string | null;
  announcement_id: string | null;
}): TimelineEvent {
  return {
    id: row.id,
    type: row.event_type as TimelineEvent["type"],
    seasonId: row.season_id ?? "",
    createdAt: row.created_at,
    payload: row.payload ?? {},
    matchId: row.match_id ?? undefined,
    announcementId: row.announcement_id ?? undefined,
  };
}

export async function GET(request: Request) {
  const supabase = createServerSupabaseClient();
  const { searchParams } = new URL(request.url);

  const limit = clampLimit(searchParams.get("limit"));
  const cursor = searchParams.get("cursor");
  const filter = searchParams.get("filter") ?? "all";
  const explicitTeamId = searchParams.get("teamId");

  const {
    data: { user },
    error: sessionError,
  } = await supabase.auth.getUser();

  if (sessionError) {
    return NextResponse.json({ error: "Unable to verify session." }, { status: 401 });
  }

  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const { data: season, error: seasonError } = await supabase
    .from("seasons")
    .select("id")
    .eq("is_active", true)
    .maybeSingle();

  if (seasonError) {
    console.error("[api/timeline] failed to resolve active season", seasonError);
    return NextResponse.json({ error: "Unable to load active season." }, { status: 500 });
  }

  if (!season?.id) {
    return NextResponse.json({ data: [], nextCursor: null });
  }

  let matchIds: string[] | undefined;
  let teamId = explicitTeamId ?? undefined;

  if (teamId && !isUuid(teamId)) {
    return NextResponse.json({ error: "Invalid team id." }, { status: 400 });
  }

  if (filter === "team" && !teamId) {
    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("team_id")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      console.error("[api/timeline] failed to load user profile", profileError);
      return NextResponse.json({ error: "Unable to verify user team." }, { status: 500 });
    }

    teamId = profile?.team_id ?? undefined;
  }

  if (filter === "team" && !teamId) {
    return NextResponse.json({ error: "Team timeline requires a team id." }, { status: 400 });
  }

  if (filter === "mine" || filter === "team") {
    let participantsQuery = supabase
      .from("match_participants")
      .select("match_id, matches!inner(season_id)")
      .eq("matches.season_id", season.id)
      .limit(250);

    if (filter === "mine") {
      participantsQuery = participantsQuery.eq("user_id", user.id);
    } else if (filter === "team" && teamId) {
      participantsQuery = participantsQuery.eq("team_id", teamId);
    }

    const { data: participantRows, error: participantError } = await participantsQuery;

    if (participantError) {
      console.error("[api/timeline] failed to load participant matches", participantError);
      return NextResponse.json({ error: "Unable to load timeline matches." }, { status: 500 });
    }

    matchIds = Array.from(
      new Set(
        (participantRows ?? [])
          .map((row) => row.match_id)
          .filter((id): id is string => Boolean(id) && isUuid(id)),
      ),
    );
  }

  let timelineQuery = supabase
    .from("timeline_events")
    .select("*")
    .eq("season_id", season.id)
    .order("created_at", { ascending: false })
    .limit(limit + 1);

  if (cursor) {
    timelineQuery = timelineQuery.lt("created_at", cursor);
  }

  if (filter === "mine" || filter === "team") {
    const conditions: string[] = ["event_type.eq.announcement", "event_type.eq.season_event", "event_type.eq.system"];

    if (matchIds && matchIds.length > 0) {
      const matchList = matchIds.join(",");
      if (matchList.length > 0) {
        conditions.push(`match_id.in.(${matchList})`);
      }
    }

    timelineQuery = timelineQuery.or(conditions.join(","));
  }

  const { data: rows, error: timelineError } = await timelineQuery;

  if (timelineError) {
    console.error("[api/timeline] failed to load events", timelineError);
    return NextResponse.json({ error: "Unable to load timeline." }, { status: 500 });
  }

  const events = (rows ?? []).map(toTimelineEvent);

  let nextCursor: string | null = null;
  if (events.length > limit) {
    const last = events.pop();
    if (last) {
      nextCursor = last.createdAt;
    }
  }

  return NextResponse.json({ data: events, nextCursor });
}
