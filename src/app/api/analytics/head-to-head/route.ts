import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type SeasonSummary = {
  id: string;
  name: string;
};

async function resolveSeason(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  requestedSeasonId: string | null,
): Promise<SeasonSummary | null> {
  if (requestedSeasonId) {
    const { data, error } = await supabase
      .from("seasons")
      .select("id, name")
      .eq("id", requestedSeasonId)
      .maybeSingle();

    if (error) {
      console.error("[analytics:head-to-head] season lookup error", error);
      throw new Error("Unable to look up season.");
    }
    return data as SeasonSummary | null;
  }

  const { data, error } = await supabase
    .from("seasons")
    .select("id, name")
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    console.error("[analytics:head-to-head] active season error", error);
    throw new Error("Unable to determine active season.");
  }

  return data as SeasonSummary | null;
}

function isValidUuid(value: string | null): value is string {
  if (!value) return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}

export async function GET(request: Request) {
  const supabase = createServerSupabaseClient();
  const { searchParams } = new URL(request.url);

  const requestedSeasonId = searchParams.get("seasonId");
  const playerIdParam = searchParams.get("playerId");
  const opponentIdParam = searchParams.get("opponentId");

  if (!isValidUuid(playerIdParam) || !isValidUuid(opponentIdParam)) {
    return NextResponse.json({ error: "Both playerId and opponentId are required valid UUIDs." }, { status: 400 });
  }

  if (playerIdParam === opponentIdParam) {
    return NextResponse.json({ error: "Select two different players to compare." }, { status: 400 });
  }

  try {
    const season = await resolveSeason(supabase, requestedSeasonId);
    if (!season) {
      return NextResponse.json({ error: "Season not found." }, { status: 404 });
    }

    const { data: playersData, error: playersError } = await supabase
      .from("users")
      .select("id, display_name, username, team_id")
      .in("id", [playerIdParam, opponentIdParam]);

    if (playersError) {
      console.error("[analytics:head-to-head] player lookup error", playersError);
      return NextResponse.json({ error: "Unable to load players." }, { status: 500 });
    }

    const playersById = new Map(
      (playersData ?? []).map((player) => [
        player.id as string,
        {
          id: player.id as string,
          displayName: player.display_name as string,
          username: player.username as string,
          teamId: (player.team_id as string | null) ?? null,
        },
      ]),
    );

    const player = playersById.get(playerIdParam);
    const opponent = playersById.get(opponentIdParam);

    if (!player || !opponent) {
      return NextResponse.json({ error: "Both players must belong to the league." }, { status: 404 });
    }

    const { data: headToHeadRow, error: headToHeadError } = await supabase
      .from("player_head_to_head")
      .select(
        "matches_played, wins, losses, ties, player_points_total, opponent_points_total, average_margin, last_match_date, match_ids",
      )
      .eq("season_id", season.id)
      .eq("player_id", playerIdParam)
      .eq("opponent_id", opponentIdParam)
      .maybeSingle();

    if (headToHeadError) {
      console.error("[analytics:head-to-head] summary error", headToHeadError);
      return NextResponse.json({ error: "Unable to load head-to-head data." }, { status: 500 });
    }

    let matchDetails: Array<{
      id: string;
      matchDate: string;
      course?: string | null;
      playerPoints: number;
      opponentPoints: number;
      result: "win" | "loss" | "tie";
    }> = [];

    if (headToHeadRow && Array.isArray(headToHeadRow.match_ids) && headToHeadRow.match_ids.length > 0) {
      const matchIds = (headToHeadRow.match_ids as unknown[]).map(String);

      const [{ data: matchesData, error: matchesError }, { data: participantsData, error: participantsError }] =
        await Promise.all([
          supabase.from("matches").select("id, match_date, course").in("id", matchIds),
          supabase
            .from("match_participants")
            .select("match_id, user_id, points_awarded")
            .in("match_id", matchIds)
            .in("user_id", [playerIdParam, opponentIdParam]),
        ]);

      if (matchesError) {
        console.error("[analytics:head-to-head] matches error", matchesError);
        return NextResponse.json({ error: "Unable to load related matches." }, { status: 500 });
      }

      if (participantsError) {
        console.error("[analytics:head-to-head] participants error", participantsError);
        return NextResponse.json({ error: "Unable to load participant data." }, { status: 500 });
      }

      const matchesById = new Map(
        (matchesData ?? []).map((match) => [
          match.id as string,
          {
            id: match.id as string,
            matchDate: (match.match_date as string | null) ?? new Date().toISOString(),
            course: (match.course as string | null) ?? null,
          },
        ]),
      );

      const scoresByMatch = new Map<
        string,
        { playerPoints?: number; opponentPoints?: number }
      >();

      for (const participant of participantsData ?? []) {
        const matchId = participant.match_id as string;
        const userId = participant.user_id as string;
        const points = Number(participant.points_awarded ?? 0);

        const entry = scoresByMatch.get(matchId) ?? {};
        if (userId === playerIdParam) {
          entry.playerPoints = points;
        } else if (userId === opponentIdParam) {
          entry.opponentPoints = points;
        }
        scoresByMatch.set(matchId, entry);
      }

      matchDetails = matchIds
        .map((matchId) => {
          const match = matchesById.get(matchId);
          if (!match) {
            return null;
          }
          const scores = scoresByMatch.get(matchId) ?? {};
          const playerPoints = Number(scores.playerPoints ?? 0);
          const opponentPoints = Number(scores.opponentPoints ?? 0);

          const result: "win" | "loss" | "tie" =
            playerPoints === opponentPoints ? "tie" : playerPoints > opponentPoints ? "win" : "loss";

          return {
            id: match.id,
            matchDate: match.matchDate,
            course: match.course,
            playerPoints,
            opponentPoints,
            result,
          };
        })
        .filter((detail): detail is NonNullable<typeof detail> => Boolean(detail))
        .sort((a, b) => new Date(b.matchDate).getTime() - new Date(a.matchDate).getTime());
    }

    const responseBody = {
      season,
      player,
      opponent,
      summary: {
        matchesPlayed: Number(headToHeadRow?.matches_played ?? 0),
        wins: Number(headToHeadRow?.wins ?? 0),
        losses: Number(headToHeadRow?.losses ?? 0),
        ties: Number(headToHeadRow?.ties ?? 0),
        pointsFor: Number(headToHeadRow?.player_points_total ?? 0),
        pointsAgainst: Number(headToHeadRow?.opponent_points_total ?? 0),
        averageMargin: Number(headToHeadRow?.average_margin ?? 0),
        lastMatchDate: (headToHeadRow?.last_match_date as string | null) ?? null,
      },
      matches: matchDetails,
      generatedAt: new Date().toISOString(),
    };

    return NextResponse.json(responseBody);
  } catch (error) {
    console.error("[analytics:head-to-head] unexpected error", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unexpected error." }, { status: 500 });
  }
}
