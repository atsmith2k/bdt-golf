import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { TimelineCard } from "@/components/league/timeline-card";
import { PlayerLeaderboard } from "@/components/league/player-leaderboard";
import { TeamStandingsCard } from "@/components/league/team-standings-card";
import { getLeagueConfig } from "@/lib/queries";
import { formatDate, formatPoints } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const league = await getLeagueConfig();
  const latestMatch = league.matches[0];

  return (
    <div className="space-y-8">
      <div className="grid gap-8 lg:grid-cols-[2fr,1fr]">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">
                League timeline
              </h1>
              <p className="text-sm text-slate-500">
                The pulse of the season - updated whenever someone logs a match
                or posts news.
              </p>
            </div>
            <Link
              href="/app/matches/new"
              className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900"
            >
              Log a match <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="space-y-4">
            {league.timeline.map((event) => (
              <TimelineCard key={event.id} event={event} />
            ))}
            {league.timeline.length === 0 && (
              <Card>
                <CardContent className="py-6">
                  <p className="text-sm text-slate-500">
                    No activity logged yet. Record a match to populate the timeline.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
        <div className="space-y-6">
          <PlayerLeaderboard stats={league.playerStats} players={league.players} />
          <TeamStandingsCard teams={league.teams} stats={league.teamStats} />
        </div>
      </div>
      {latestMatch ? (
        <Card>
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Latest match highlight</CardTitle>
              <p className="text-sm text-slate-500">
                Logged {formatDate(latestMatch.playedOn)} - {latestMatch.format.replace(/_/g, " ")}
              </p>
            </div>
            <Badge variant="outline">{formatPoints(latestMatch.totalPoints)} total</Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-3">
              {latestMatch.participatingTeams.map((team) => (
                <Link
                  key={team.id}
                  href={`/app/teams/${team.id}`}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:border-slate-300 hover:text-slate-900"
                >
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: team.color ?? "#1f2937" }}
                  />
                  {team.name}
                </Link>
              ))}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {latestMatch.participants.map((participant) => (
                <div
                  key={participant.id}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm"
                >
                  <p className="font-semibold text-slate-900">
                    {participant.user?.fullName ?? "Unknown player"}
                  </p>
                  <p className="text-xs text-slate-500">
                    {participant.isWinner ? "Winner" : "Opponent"} -{" "}
                    {formatPoints(participant.pointsAwarded)}
                  </p>
                  {participant.strokes ? (
                    <p className="mt-2 text-xs text-slate-500">
                      {participant.strokes} strokes
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-6">
            <p className="text-sm text-slate-500">
              No matches recorded yet. Use the match entry form to log your first result.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
