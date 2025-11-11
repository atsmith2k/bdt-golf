import { getLeagueConfig } from "@/lib/queries";
import { formatPoints } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const league = await getLeagueConfig();
  const playerStats = league.playerStats
    .slice()
    .sort((a, b) => b.pointsTotal - a.pointsTotal);
  const teamStats = league.teamStats
    .slice()
    .sort((a, b) => b.pointsTotal - a.pointsTotal);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Analytics</h1>
          <p className="text-sm text-slate-500">
            Snapshot of league health. Wire these cards to Supabase views or edge
            functions as you bring the backend online.
          </p>
        </div>
        <Badge variant="outline">v1 dashboard</Badge>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Player leaderboard</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {playerStats.map((row, index) => {
              const player = league.players.find((p) => p.id === row.userId);
              if (!player) return null;
              return (
                <div
                  key={row.userId}
                  className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm"
                >
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
                      {index + 1}
                    </span>
                    <div>
                      <p className="font-semibold text-slate-900">
                        {player.fullName}
                      </p>
                      <p className="text-xs text-slate-500">
                        {row.matchesPlayed} matches -{" "}
                        {formatPoints(row.pointsPerMatch, 1)} / match
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-slate-900">
                    {formatPoints(row.pointsTotal)}
                  </span>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Team leaderboard</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {teamStats.map((row, index) => {
              const team = league.teams.find((t) => t.id === row.teamId);
              if (!team) return null;
              return (
                <div
                  key={row.teamId}
                  className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm"
                >
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
                      {index + 1}
                    </span>
                    <div>
                      <p className="font-semibold text-slate-900">{team.name}</p>
                      <p className="text-xs text-slate-500">
                        {row.matchesPlayed} matches -{" "}
                        {formatPoints(row.pointsPerMatch, 1)} / match
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-slate-900">
                    {formatPoints(row.pointsTotal)}
                  </span>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Participation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-slate-600">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Total matches logged
              </p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">
                {league.matches.length}
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Active roster
              </p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">
                {league.players.length}
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Average points / match
              </p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">
                {(
                  league.matches.reduce(
                    (total, match) => total + match.totalPoints,
                    0,
                  ) / Math.max(league.matches.length, 1)
                ).toFixed(1)}
              </p>
            </div>
          </div>
              <p className="text-xs text-slate-500">
                Tip: back these cards with SQL materialized views or Supabase edge functions as the dataset grows.
              </p>
        </CardContent>
      </Card>
    </div>
  );
}
