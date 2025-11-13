import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { MatchFormat } from "@/lib/types";

type ParticipantInput = {
  userId: string;
  teamId?: string | null;
  points: number;
  strokes?: number | null;
  position?: number | null;
};

type MatchPayload = {
  seasonId: string;
  matchDate: string;
  matchType: MatchFormat;
  course?: string | null;
  notes?: string | null;
  participants: ParticipantInput[];
};

const MATCH_FORMAT_VALUES: MatchFormat[] = [
  "stroke_play",
  "match_play",
  "skins",
  "scramble",
  "best_ball",
  "alternate_shot",
];

function isUuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-fA-F-]{32,36}$/.test(value);
}

function isValidMatchFormat(value: unknown): value is MatchFormat {
  return typeof value === "string" && MATCH_FORMAT_VALUES.includes(value as MatchFormat);
}

function sanitizeText(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseParticipants(value: unknown): ParticipantInput[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const parsed: ParticipantInput[] = [];
  const seen = new Set<string>();

  for (const entry of value) {
    const userId = entry?.userId ?? entry?.user_id;
    const teamId = entry?.teamId ?? entry?.team_id ?? null;
    const points = entry?.points;
    const strokes = entry?.strokes ?? null;
    const position = entry?.position ?? null;

    if (!isUuid(userId) || typeof points !== "number" || Number.isNaN(points)) {
      return null;
    }

    if (seen.has(userId)) {
      return null;
    }
    seen.add(userId);

    parsed.push({
      userId,
      teamId: teamId && isUuid(teamId) ? teamId : null,
      points,
      strokes: strokes === null || strokes === undefined ? null : Number(strokes),
      position: position === null || position === undefined ? null : Number(position),
    });
  }

  return parsed;
}

export async function POST(request: Request) {
  const supabase = createServerSupabaseClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    return NextResponse.json({ error: "Unable to verify session." }, { status: 401 });
  }

  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  let body: MatchPayload | null = null;

  try {
    body = (await request.json()) as MatchPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  if (!body) {
    return NextResponse.json({ error: "Missing payload." }, { status: 400 });
  }

  const seasonId = body.seasonId;
  const matchDate = body.matchDate;
  const matchType = body.matchType;
  const participants = parseParticipants(body.participants);

  if (!isUuid(seasonId)) {
    return NextResponse.json({ error: "Season id is required." }, { status: 400 });
  }

  if (typeof matchDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(matchDate)) {
    return NextResponse.json({ error: "Match date must be YYYY-MM-DD." }, { status: 400 });
  }

  const today = new Date().toISOString().slice(0, 10);
  if (matchDate > today) {
    return NextResponse.json({ error: "Match date cannot be in the future." }, { status: 400 });
  }

  if (!isValidMatchFormat(matchType)) {
    return NextResponse.json({ error: "Unsupported match type." }, { status: 400 });
  }

  if (!participants || participants.length < 2) {
    return NextResponse.json({ error: "At least two participants are required." }, { status: 400 });
  }

  const payload = {
    p_season_id: seasonId,
    p_match_date: matchDate,
    p_match_type: matchType,
    p_course: sanitizeText(body.course),
    p_notes: sanitizeText(body.notes),
    p_visibility: "private",
    p_created_by: user.id,
    p_participants: participants.map((participant) => ({
      user_id: participant.userId,
      team_id: participant.teamId,
      points: participant.points,
      strokes: participant.strokes,
      position: participant.position,
    })),
  };

  const { data, error } = await supabase.rpc("record_match", payload);

  if (error) {
    console.error("[api/matches] record_match error", error);
    return NextResponse.json({ error: "Unable to record match." }, { status: 400 });
  }

  return NextResponse.json({ matchId: data }, { status: 201 });
}
