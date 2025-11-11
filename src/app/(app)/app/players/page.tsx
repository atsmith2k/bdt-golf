import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { getLeagueConfig } from "@/lib/queries";
import { formatPoints } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function PlayersPage() {
  const league = await getLeagueConfig();

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Players</h1>
          <p className="text-sm text-slate-500">
            Roster of every league member with season statistics.
          </p>
        </div>
        <Badge variant="outline">
          {league.players.length} player
          {league.players.length === 1 ? "" : "s"}
        </Badge>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Season overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {league.players.map((player) => {
              const stats = league.playerStats.find(
                (stat) => stat.userId === player.id,
              );
              const team = league.teams.find((t) => t.id === player.teamId);

              return (
                <div
                  key={player.id}
                  className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 text-sm"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {player.fullName}
                    </p>
                    <p className="text-xs text-slate-500">
                      {team ? team.name : "Free Agent"}
                    </p>
                  </div>
                  <div className="flex gap-3 text-xs text-slate-500">
                    <span>
                      Matches{" "}
                      <span className="font-semibold">
                        {stats?.matchesPlayed ?? 0}
                      </span>
                    </span>
                    <span>
                      Points{" "}
                      <span className="font-semibold">
                        {formatPoints(stats?.pointsTotal ?? 0)}
                      </span>
                    </span>
                  </div>
                  <Link
                    href={`/app/players/${player.id}`}
                    className="inline-flex items-center gap-2 text-xs font-semibold text-slate-900"
                  >
                    View player <ArrowUpRight className="h-3 w-3" />
                  </Link>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
