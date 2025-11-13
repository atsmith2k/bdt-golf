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

  const team = league.teams.find((item) => item.id === id && item.seasonId === season.id);
  if (!team) {
    return NextResponse.json({ error: "Team not found for this season." }, { status: 404 });
  }

  const stat = league.teamStats.find((item) => item.teamId === team.id);
  const roster = league.players
    .filter((player) => player.teamId === team.id)
    .map((player) => ({
      id: player.id,
      fullName: player.fullName,
      username: player.username,
      handicapIndex: player.handicapIndex,
      email: player.email,
      phone: player.phone,
    }))
    .sort((a, b) => a.fullName.localeCompare(b.fullName));

  const matches = league.matches
    .filter((match) => match.participatingTeams.some((participant) => participant.id === team.id))
    .map((match) => ({
      id: match.id,
      playedOn: match.playedOn,
      format: match.format,
      status: match.status,
      courseName: match.courseName,
      totalPoints: match.totalPoints,
    }))
    .sort((a, b) => new Date(b.playedOn).getTime() - new Date(a.playedOn).getTime());

  return NextResponse.json({
    season: {
      id: season.id,
      name: season.name,
      isActive: season.id === league.activeSeasonId,
    },
    team: {
      id: team.id,
      name: team.name,
      slug: team.slug,
      color: team.color,
      points: team.points,
      wins: team.wins,
      losses: team.losses,
      ties: team.ties,
    },
    stats: stat
      ? {
          matchesPlayed: stat.matchesPlayed,
          pointsTotal: stat.pointsTotal,
          pointsPerMatch: stat.pointsPerMatch,
          wins: stat.wins,
          losses: stat.losses,
          ties: stat.ties,
          streak: stat.streak,
        }
      : null,
    roster,
    matches,
  });
}
