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
      console.error("[analytics:teams] season lookup error", error);
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
    console.error("[analytics:teams] active season error", error);
    throw new Error("Unable to determine active season.");
  }

  return data as SeasonSummary | null;
}

export async function GET(request: Request) {
  const supabase = createServerSupabaseClient();
  const { searchParams } = new URL(request.url);
  const requestedSeasonId = searchParams.get("seasonId");

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
      console.error("[analytics:teams] teams fetch error", teamsError);
      return NextResponse.json({ error: "Unable to load teams." }, { status: 500 });
    }

    const { data: totalsData, error: totalsError } = await supabase
      .from("team_season_totals")
      .select("*")
      .eq("season_id", season.id);

    if (totalsError) {
      console.error("[analytics:teams] totals fetch error", totalsError);
      return NextResponse.json({ error: "Unable to load team analytics." }, { status: 500 });
    }

    const teamsById = new Map(
      (teamsData ?? []).map((team) => [team.id as string, team as { id: string; name: string; color?: string | null }]),
    );

    const teams = (totalsData ?? [])
      .map((row) => {
        const team = teamsById.get(row.team_id);
        if (!team) {
          return null;
        }

        return {
          teamId: row.team_id,
          seasonId: row.season_id,
          name: team.name,
          color: team.color ?? undefined,
          matchesPlayed: Number(row.matches_played ?? 0),
          pointsTotal: Number(row.points_total ?? 0),
          pointsPerMatch: Number(row.points_per_match ?? 0),
          wins: Number(row.wins ?? 0),
          losses: Number(row.losses ?? 0),
          ties: Number(row.ties ?? 0),
          recentMatches: Array.isArray(row.recent_matches)
            ? (row.recent_matches as unknown[]).map((value) => String(value))
            : [],
        };
      })
      .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
      .sort((a, b) => b.pointsTotal - a.pointsTotal);

    return NextResponse.json({
      season,
      teams,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[analytics:teams] unexpected error", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unexpected error." }, { status: 500 });
  }
}
