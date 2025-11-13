import { NextResponse } from "next/server";
import { getLeagueConfig } from "@/lib/queries";

export async function GET(request: Request) {
  const league = await getLeagueConfig();
  if (!league.activeSeasonId) {
    return NextResponse.json({ error: "No active season configured." }, { status: 400 });
  }

  const { searchParams } = new URL(request.url);
  const seasonId = searchParams.get("seasonId") ?? league.activeSeasonId;

  const season = league.seasons.find((item) => item.id === seasonId);
  if (!season) {
    return NextResponse.json({ error: "Season not found." }, { status: 404 });
  }

  const teams = league.teams
    .filter((team) => team.seasonId === season.id)
    .map((team) => {
      const stat = league.teamStats.find((item) => item.teamId === team.id);
      const rosterSize = league.players.filter((player) => player.teamId === team.id).length;
      return {
        id: team.id,
        name: team.name,
        slug: team.slug,
        color: team.color,
        seasonId: team.seasonId,
        points: team.points,
        wins: team.wins,
        losses: team.losses,
        ties: team.ties,
        matchesPlayed: stat?.matchesPlayed ?? 0,
        pointsPerMatch: stat?.pointsPerMatch ?? 0,
        rosterSize,
      };
    })
    .sort((a, b) => b.points - a.points || (b.wins - a.wins));

  return NextResponse.json({
    season: {
      id: season.id,
      name: season.name,
      isActive: season.id === league.activeSeasonId,
      startDate: season.startDate,
      endDate: season.endDate,
    },
    teams,
    seasons: league.seasons.map((item) => ({
      id: item.id,
      name: item.name,
      isActive: item.id === league.activeSeasonId,
    })),
  });
}
