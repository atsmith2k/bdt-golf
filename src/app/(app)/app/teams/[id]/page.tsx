import { notFound } from "next/navigation";
import { getLeagueConfig } from "@/lib/queries";
import { formatDate, formatPoints, formatRecord } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function TeamDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const league = await getLeagueConfig();
  const team = league.teams.find((item) => item.id === params.id);

  if (!team) {
    notFound();
  }

  const stat = league.teamStats.find((item) => item.teamId === team.id);
  const roster = league.players.filter((player) => player.teamId === team.id);
  const matches = league.matches.filter((match) =>
    match.participatingTeams.some((participant) => participant.id === team.id),
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div
            className="h-14 w-14 rounded-full border border-slate-200"
            style={{ backgroundColor: team.color ?? "#1f2937" }}
          />
          <div>
            <h1 className="text-3xl font-semibold text-slate-900">{team.name}</h1>
            {stat ? (
              <p className="text-sm text-slate-500">
                {formatRecord(stat.wins, stat.losses, stat.ties)} -{" "}
                {formatPoints(stat.pointsTotal)}
              </p>
            ) : null}
          </div>
        </div>
        {stat?.streak ? (
          <Badge variant="success">Streak {stat.streak}</Badge>
        ) : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Roster</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-3 sm:grid-cols-2">
              {roster.map((player) => (
                <li
                  key={player.id}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700"
                >
                  <p className="font-semibold text-slate-900">
                    {player.fullName}
                  </p>
                  {player.handicapIndex !== undefined ? (
                    <p className="text-xs text-slate-500">
                      Handicap index: {player.handicapIndex.toFixed(1)}
                    </p>
                  ) : null}
                </li>
              ))}
              {roster.length === 0 && (
                <li className="text-sm text-slate-500">
                  No players assigned to this team yet.
                </li>
              )}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Season snapshot</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-600">
            {stat ? (
              <>
                <p>
                  Matches played:{" "}
                  <span className="font-semibold">{stat.matchesPlayed}</span>
                </p>
                <p>
                  Points per match:{" "}
                  <span className="font-semibold">
                    {stat.pointsPerMatch.toFixed(1)}
                  </span>
                </p>
              </>
            ) : (
              <p>No stats yet for this team.</p>
            )}
            <p>
              Season: <span className="font-semibold">{team.seasonId}</span>
            </p>
            <p>ID: {team.id}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Matches</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3 text-sm text-slate-600">
            {matches.map((match) => (
              <li
                key={match.id}
                className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-semibold text-slate-900">
                    {match.courseName ?? "Friendly match"}
                  </p>
                  <p className="text-xs text-slate-500">
                    {formatDate(match.playedOn)} -{" "}
                    {match.format.replace(/_/g, " ")}
                  </p>
                </div>
                <div className="flex gap-3 text-xs text-slate-500">
                  <span>{match.status}</span>
                  <span>{formatPoints(match.totalPoints)}</span>
                </div>
              </li>
            ))}
            {matches.length === 0 && (
              <li className="text-sm text-slate-500">
                No matches logged for this team yet.
              </li>
            )}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
