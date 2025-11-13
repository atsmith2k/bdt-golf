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
      console.error("[analytics:players] season lookup error", error);
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
    console.error("[analytics:players] active season error", error);
    throw new Error("Unable to determine active season.");
  }

  return data as SeasonSummary | null;
}

export async function GET(request: Request) {
  const supabase = createServerSupabaseClient();
  const { searchParams } = new URL(request.url);

  const minMatches = Number.parseInt(searchParams.get("minMatches") ?? "0", 10);
  const teamIdFilter = searchParams.get("teamId");
  const requestedSeasonId = searchParams.get("seasonId");

  try {
    const season = await resolveSeason(supabase, requestedSeasonId);
    if (!season) {
      return NextResponse.json({ error: "Season not found." }, { status: 404 });
    }

    const { data: teamsData, error: teamsError } = await supabase
      .from("teams")
      .select("id, name, color, season_id")
      .eq("season_id", season.id);

    if (teamsError) {
      console.error("[analytics:players] teams fetch error", teamsError);
      return NextResponse.json({ error: "Unable to load teams." }, { status: 500 });
    }

    const { data: statsData, error: statsError } = await supabase
      .from("player_season_totals")
      .select("*")
      .eq("season_id", season.id);

    if (statsError) {
      console.error("[analytics:players] totals fetch error", statsError);
      return NextResponse.json({ error: "Unable to load player analytics." }, { status: 500 });
    }

    const playerIds = Array.from(new Set((statsData ?? []).map((row) => row.player_id)));

    const { data: playersData, error: playersError } = await supabase
      .from("users")
      .select("id, display_name, username, team_id")
      .in("id", playerIds.length > 0 ? playerIds : ["00000000-0000-0000-0000-000000000000"]);

    if (playersError) {
      console.error("[analytics:players] users fetch error", playersError);
      return NextResponse.json({ error: "Unable to load players." }, { status: 500 });
    }

    const teamsById = new Map(
      (teamsData ?? []).map((team) => [team.id as string, team as { id: string; name: string; color?: string | null }]),
    );
    const playersById = new Map(
      (playersData ?? []).map((player) => [
        player.id as string,
        player as { id: string; display_name: string; username: string; team_id?: string | null },
      ]),
    );

    const filtered = (statsData ?? [])
      .map((row) => {
        const player = playersById.get(row.player_id);
        if (!player) {
          return null;
        }

        const team = player.team_id ? teamsById.get(player.team_id) : undefined;
        const matchesPlayed = Number(row.matches_played ?? 0);

        return {
          playerId: row.player_id,
          seasonId: row.season_id,
          displayName: player.display_name,
          username: player.username,
          teamId: team?.id,
          teamName: team?.name,
          teamColor: team?.color ?? undefined,
          matchesPlayed,
          pointsTotal: Number(row.points_total ?? 0),
          pointsPerMatch: Number(row.points_per_match ?? 0),
          wins: Number(row.wins ?? 0),
          losses: Number(row.losses ?? 0),
          ties: Number(row.ties ?? 0),
          recentForm: Array.isArray(row.recent_form)
            ? (row.recent_form as unknown[]).map((value) => Number(value))
            : [],
        };
      })
      .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
      .filter((entry) => (Number.isFinite(minMatches) && minMatches > 0 ? entry.matchesPlayed >= minMatches : true))
      .filter((entry) => (teamIdFilter ? entry.teamId === teamIdFilter : true))
      .sort((a, b) => b.pointsTotal - a.pointsTotal);

    return NextResponse.json({
      season,
      filters: {
        minMatches: Number.isFinite(minMatches) && minMatches > 0 ? minMatches : 0,
        teamId: teamIdFilter ?? null,
      },
      players: filtered,
      teams: (teamsData ?? []).map((team) => ({
        id: team.id as string,
        name: team.name as string,
        color: (team.color as string | null) ?? null,
      })),
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[analytics:players] unexpected error", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unexpected error." }, { status: 500 });
  }
}
