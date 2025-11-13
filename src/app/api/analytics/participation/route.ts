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
      console.error("[analytics:participation] season lookup error", error);
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
    console.error("[analytics:participation] active season error", error);
    throw new Error("Unable to determine active season.");
  }

  return data as SeasonSummary | null;
}

export async function GET(request: Request) {
  const supabase = createServerSupabaseClient();
  const { searchParams } = new URL(request.url);
  const requestedSeasonId = searchParams.get("seasonId");
  const limit = Number.parseInt(searchParams.get("limit") ?? "0", 10);

  try {
    const season = await resolveSeason(supabase, requestedSeasonId);
    if (!season) {
      return NextResponse.json({ error: "Season not found." }, { status: 404 });
    }

    const { data: teamsData, error: teamsError } = await supabase
      .from("teams")
      .select("id, name, color")
      .eq("season_id", season.id);

    if (teamsError) {
      console.error("[analytics:participation] teams fetch error", teamsError);
      return NextResponse.json({ error: "Unable to load teams." }, { status: 500 });
    }

    const seasonTeamIds = (teamsData ?? []).map((team) => team.id as string);

    const { data: playersData, error: playersError } = await supabase
      .from("users")
      .select("id, display_name, username, team_id")
      .in("team_id", seasonTeamIds.length > 0 ? seasonTeamIds : ["00000000-0000-0000-0000-000000000000"]);

    if (playersError) {
      console.error("[analytics:participation] users fetch error", playersError);
      return NextResponse.json({ error: "Unable to load players." }, { status: 500 });
    }

    const { data: statsData, error: statsError } = await supabase
      .from("player_season_totals")
      .select("*")
      .eq("season_id", season.id);

    if (statsError) {
      console.error("[analytics:participation] totals fetch error", statsError);
      return NextResponse.json({ error: "Unable to load participation analytics." }, { status: 500 });
    }

    const { data: matchesData, error: matchesError } = await supabase
      .from("matches")
      .select("id")
      .eq("season_id", season.id);

    if (matchesError) {
      console.error("[analytics:participation] matches fetch error", matchesError);
      return NextResponse.json({ error: "Unable to load season matches." }, { status: 500 });
    }

    const teamsById = new Map(
      (teamsData ?? []).map((team) => [team.id as string, team as { id: string; name: string; color?: string | null }]),
    );

    const totalsByPlayerId = new Map(
      (statsData ?? []).map((row) => [
        row.player_id as string,
        {
          matchesPlayed: Number(row.matches_played ?? 0),
          pointsTotal: Number(row.points_total ?? 0),
        },
      ]),
    );

    const seasonMatchCount = matchesData?.length ?? 0;

    const participation = (playersData ?? [])
      .map((player) => {
        const stats = totalsByPlayerId.get(player.id as string);
        const matchesPlayed = stats?.matchesPlayed ?? 0;
        const team = player.team_id ? teamsById.get(player.team_id as string) : undefined;
        const participationRate =
          seasonMatchCount > 0 ? Number((matchesPlayed / seasonMatchCount).toFixed(3)) : 0;

        return {
          playerId: player.id as string,
          displayName: player.display_name as string,
          username: player.username as string,
          teamId: team?.id,
          teamName: team?.name,
          teamColor: team?.color ?? undefined,
          matchesPlayed,
          totalPoints: stats?.pointsTotal ?? 0,
          participationRate,
        };
      })
      .sort((a, b) => a.matchesPlayed - b.matchesPlayed || a.displayName.localeCompare(b.displayName));

    const limited =
      Number.isFinite(limit) && limit > 0 ? participation.slice(0, limit) : participation;

    return NextResponse.json({
      season,
      totalMatches: seasonMatchCount,
      players: limited,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[analytics:participation] unexpected error", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unexpected error." }, { status: 500 });
  }
}
