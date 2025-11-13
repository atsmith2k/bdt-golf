import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { PlayerLeaderboard } from "@/components/league/player-leaderboard";
import { TeamStandingsCard } from "@/components/league/team-standings-card";
import { TimelineFeed } from "@/components/league/timeline-feed";
import { getLeagueConfig, getUserProfile } from "@/lib/queries";
import { formatDate, formatPoints } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [league, viewer] = await Promise.all([getLeagueConfig(), getUserProfile()]);

  if (!league.activeSeasonId) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Welcome to the BDT League HQ</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-[rgb(var(--bdt-navy) / 0.7)]">
            <p>No active season yet. Once you create one, the dashboard will show live standings and activity.</p>
            <p>
              Commissioners can start by visiting the{" "}
              <Link href="/app/commissioner" className="font-semibold text-bdt-royal hover:text-bdt-navy">
                commissioner console
              </Link>{" "}
              to create the first season.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }
  const latestMatch = league.matches[0];

  return (
    <div className="space-y-8">
      <div className="grid gap-8 lg:grid-cols-[2fr,1fr]">
        <div className="space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-xl space-y-1">
              <h1 className="text-2xl font-semibold text-bdt-navy">
                League timeline
              </h1>
              <p className="text-sm text-[rgb(var(--bdt-navy) / 0.65)]">
                The pulse of the season-updated whenever someone logs a match or posts news.
              </p>
            </div>
            <Link
              href="/app/matches/new"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-[rgb(var(--bdt-royal) / 0.25)] px-4 py-2 text-sm font-semibold text-bdt-royal shadow-[0_8px_18px_rgb(var(--bdt-navy) / 0.12)] transition hover:bg-bdt-royal hover:text-white"
            >
              Log a match <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="space-y-4">
            <TimelineFeed teamId={viewer?.teamId} />
          </div>
        </div>
        <div className="space-y-6">
          <PlayerLeaderboard stats={league.playerStats} players={league.players} />
          <TeamStandingsCard teams={league.teams} stats={league.teamStats} />
        </div>
      </div>
      {latestMatch ? (
        <Card>
          <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Latest match highlight</CardTitle>
              <p className="text-sm text-[rgb(var(--bdt-navy) / 0.65)]">
                Logged {formatDate(latestMatch.playedOn)} - {latestMatch.format.replace(/_/g, " ")}
              </p>
            </div>
            <Badge variant="outline" className="text-xs font-semibold uppercase tracking-wide">
              {formatPoints(latestMatch.totalPoints)} total
            </Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-3">
              {latestMatch.participatingTeams.map((team) => (
                <Link
                  key={team.id}
                  href={`/app/teams/${team.id}`}
                  className="inline-flex items-center gap-2 rounded-full border border-[rgb(var(--bdt-royal) / 0.22)] bg-white/90 px-3 py-2 text-sm text-bdt-navy shadow-[0_8px_18px_rgb(var(--bdt-navy) / 0.08)] transition hover:border-[rgb(var(--bdt-royal) / 0.35)] hover:bg-[rgb(var(--bdt-royal) / 0.08)]"
                >
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: team.color ?? "#0c337a" }}
                  />
                  {team.name}
                </Link>
              ))}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {latestMatch.participants.map((participant) => (
                <div
                  key={participant.id}
                  className="rounded-2xl border border-[rgb(var(--bdt-royal) / 0.18)] bg-white/90 px-3 py-3 text-sm shadow-[0_12px_24px_rgb(var(--bdt-navy) / 0.08)]"
                >
                  <p className="font-semibold text-bdt-navy">
                    {participant.user?.fullName ?? "Unknown player"}
                  </p>
                  <p className="text-xs text-[rgb(var(--bdt-navy) / 0.6)]">
                    {participant.isWinner ? "Winner" : "Opponent"} -{" "}
                    {formatPoints(participant.pointsAwarded)}
                  </p>
                  {participant.strokes ? (
                    <p className="mt-2 text-xs text-[rgb(var(--bdt-navy) / 0.6)]">
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
            <p className="text-sm text-[rgb(var(--bdt-navy) / 0.65)]">
              No matches recorded yet. Use the match entry form to log your first result.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
