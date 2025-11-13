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

  const players = league.players.map((player) => {
    const team = player.teamId ? league.teams.find((teamItem) => teamItem.id === player.teamId) : null;
    const stats = league.playerStats.find(
      (playerStat) => playerStat.userId === player.id && playerStat.seasonId === season.id,
    );

    return {
      id: player.id,
      fullName: player.fullName,
      username: player.username,
      team: team
        ? {
            id: team.id,
            name: team.name,
            color: team.color,
            seasonId: team.seasonId,
          }
        : null,
      matchesPlayed: stats?.matchesPlayed ?? 0,
      pointsTotal: stats?.pointsTotal ?? 0,
      pointsPerMatch: stats?.pointsPerMatch ?? 0,
    };
  });

  return NextResponse.json({
    season: {
      id: season.id,
      name: season.name,
      isActive: season.id === league.activeSeasonId,
    },
    players,
    seasons: league.seasons.map((item) => ({
      id: item.id,
      name: item.name,
      isActive: item.id === league.activeSeasonId,
    })),
  });
}
