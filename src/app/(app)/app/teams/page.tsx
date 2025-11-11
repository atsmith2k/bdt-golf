import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { getLeagueConfig } from "@/lib/queries";
import { formatPoints, formatRecord } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function TeamsPage() {
  const league = await getLeagueConfig();

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Teams</h1>
          <p className="text-sm text-slate-500">
            Roster assignments, records, and quick links to recent matches.
          </p>
        </div>
        <Badge variant="outline">
          {league.teams.length} active team
          {league.teams.length === 1 ? "" : "s"}
        </Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {league.teams.map((team) => {
          const stat = league.teamStats.find((s) => s.teamId === team.id);
          const roster = league.players.filter((player) => player.teamId === team.id);
          const recentMatches = league.matches.filter((match) =>
            match.participatingTeams.some((t) => t.id === team.id),
          );
          return (
            <Card key={team.id}>
              <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="h-10 w-10 rounded-full"
                    style={{ backgroundColor: team.color ?? "#0f172a" }}
                  />
                  <div>
                    <CardTitle>{team.name}</CardTitle>
                    {stat ? (
                      <p className="text-sm text-slate-500">
                        {formatRecord(stat.wins, stat.losses, stat.ties)} -{" "}
                        {formatPoints(stat.pointsTotal)}
                      </p>
                    ) : null}
                  </div>
                </div>
                <Link
                  href={`/app/teams/${team.id}`}
                  className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900"
                >
                  View team <ArrowUpRight className="h-4 w-4" />
                </Link>
              </CardHeader>
              <CardContent className="space-y-5">
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Roster
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {roster.map((player) => (
                      <Link
                        key={player.id}
                        href={`/app/players/${player.id}`}
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-1 text-xs text-slate-600 hover:border-slate-300 hover:text-slate-900"
                      >
                        {player.fullName}
                      </Link>
                    ))}
                    {roster.length === 0 && (
                      <p className="text-xs text-slate-400">No players assigned.</p>
                    )}
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Recent matches
                  </p>
                  <ul className="space-y-2 text-sm text-slate-600">
                    {recentMatches.map((match) => (
                      <li key={match.id} className="flex items-center justify-between">
                        <span>{match.courseName ?? "Friendly"}</span>
                        <span className="text-xs text-slate-400">
                          {new Intl.DateTimeFormat("en-US", {
                            month: "short",
                            day: "numeric",
                          }).format(new Date(match.playedOn))}
                        </span>
                      </li>
                    ))}
                    {recentMatches.length === 0 && (
                      <li className="text-xs text-slate-400">No matches yet.</li>
                    )}
                  </ul>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
