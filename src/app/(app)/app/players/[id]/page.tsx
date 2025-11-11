import { notFound } from "next/navigation";
import { getLeagueConfig } from "@/lib/queries";
import { formatDate, formatPoints } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function PlayerDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const league = await getLeagueConfig();
  const player = league.players.find((item) => item.id === params.id);

  if (!player) {
    notFound();
  }

  const team = league.teams.find((item) => item.id === player.teamId);
  const stats = league.playerStats.find((item) => item.userId === player.id);

  const participation = league.matches
    .flatMap((match) =>
      match.participants
        .filter((participant) => participant.userId === player.id)
        .map((participant) => ({
          match,
          participant,
        })),
    )
    .sort(
      (a, b) =>
        new Date(b.match.playedOn).getTime() -
        new Date(a.match.playedOn).getTime(),
    );

  const form = stats?.form ?? [];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">
            {player.fullName}
          </h1>
          <p className="text-sm text-slate-500">
            {team ? team.name : "Unassigned player"}
          </p>
        </div>
        {player.handicapIndex !== undefined ? (
          <Badge variant="outline">
            Handicap index {player.handicapIndex.toFixed(1)}
          </Badge>
        ) : null}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Season stats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-600">
            <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-3">
              <span>Matches played</span>
              <span className="font-semibold">
                {stats?.matchesPlayed ?? 0}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-3">
              <span>Total points</span>
              <span className="font-semibold">
                {formatPoints(stats?.pointsTotal ?? 0)}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-3">
              <span>Points / match</span>
              <span className="font-semibold">
                {(stats?.pointsPerMatch ?? 0).toFixed(1)}
              </span>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Form (last {Math.min(form.length, 5)} matches)
              </p>
              <div className="mt-2 flex gap-2">
                {form.map((value, index) => (
                  <span
                    key={index}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-white text-sm font-semibold text-slate-700"
                  >
                    {value}
                  </span>
                ))}
                {form.length === 0 && (
                  <p className="text-xs text-slate-400">
                    No recent match data recorded.
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contact &amp; bio</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-600">
            {player.bio ? <p>{player.bio}</p> : <p>No bio yet.</p>}
            {player.email ? <p>Email: {player.email}</p> : null}
            {player.phone ? <p>Phone: {player.phone}</p> : null}
            <p>Username: {player.username}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Match history</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3 text-sm text-slate-600">
            {participation.map(({ match, participant }) => (
              <li
                key={participant.id}
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
                <div className="flex gap-4 text-xs text-slate-500">
                  <span>{participant.isWinner ? "Won" : "Lost"}</span>
                  <span>{formatPoints(participant.pointsAwarded)}</span>
                  {participant.strokes ? (
                    <span>{participant.strokes} strokes</span>
                  ) : null}
                </div>
              </li>
            ))}
            {participation.length === 0 && (
              <li className="text-sm text-slate-500">
                No matches recorded for this player yet.
              </li>
            )}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
