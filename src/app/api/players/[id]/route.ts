import { NextRequest, NextResponse } from "next/server";
import { getLeagueConfig } from "@/lib/queries";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
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

  const player = league.players.find((item) => item.id === id);
  if (!player) {
    return NextResponse.json({ error: "Player not found." }, { status: 404 });
  }

  const team = player.teamId ? league.teams.find((item) => item.id === player.teamId) : null;
  const stats = league.playerStats.find(
    (item) => item.userId === player.id && item.seasonId === season.id,
  );

  const matches = league.matches
    .filter((match) => match.participants.some((participant) => participant.userId === player.id))
    .map((match) => {
      const participant = match.participants.find((item) => item.userId === player.id);
      return {
        id: match.id,
        playedOn: match.playedOn,
        format: match.format,
        status: match.status,
        courseName: match.courseName,
        totalPoints: match.totalPoints,
        isWinner: participant?.isWinner ?? false,
        pointsAwarded: participant?.pointsAwarded ?? 0,
        strokes: participant?.strokes,
      };
    })
    .sort((a, b) => new Date(b.playedOn).getTime() - new Date(a.playedOn).getTime());

  return NextResponse.json({
    season: {
      id: season.id,
      name: season.name,
      isActive: season.id === league.activeSeasonId,
    },
    player: {
      id: player.id,
      fullName: player.fullName,
      username: player.username,
      email: player.email,
      phone: player.phone,
      bio: player.bio,
      handicapIndex: player.handicapIndex,
      team: team
        ? {
            id: team.id,
            name: team.name,
            color: team.color,
          }
        : null,
    },
    stats: stats
      ? {
          matchesPlayed: stats.matchesPlayed,
          pointsTotal: stats.pointsTotal,
          pointsPerMatch: stats.pointsPerMatch,
          wins: stats.wins,
          losses: stats.losses,
          ties: stats.ties,
          form: stats.form,
        }
      : null,
    matches,
  });
}
