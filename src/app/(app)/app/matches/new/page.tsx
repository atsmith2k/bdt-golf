import * as React from "react";
import { getLeagueConfig } from "@/lib/queries";
import type { MatchFormat, TeamSummary, UserProfile } from "@/lib/types";
import { MATCH_FORMATS } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function NewMatchPage() {
  const league = await getLeagueConfig();
  const teams = league.teams;
  const players = league.players;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Log a match result
          </h1>
          <p className="text-sm text-slate-500">
            Capture the essentials - we will wire this form to Supabase actions.
          </p>
        </div>
        <Badge variant="outline">Draft</Badge>
      </div>
      <NewMatchClient teams={teams} players={players} />
    </div>
  );
}

function NewMatchClient({
  teams,
  players,
}: {
  teams: TeamSummary[];
  players: UserProfile[];
}) {
  "use client";

  const [playedOn, setPlayedOn] = React.useState(() => new Date().toISOString().slice(0, 10));
  const [format, setFormat] = React.useState<MatchFormat>(MATCH_FORMATS[0]?.value ?? "stroke_play");
  const [notes, setNotes] = React.useState("");
  const [selectedPlayers, setSelectedPlayers] = React.useState<string[]>([]);

  const togglePlayer = React.useCallback((playerId: string) => {
    setSelectedPlayers((current) =>
      current.includes(playerId)
        ? current.filter((id) => id !== playerId)
        : [...current, playerId],
    );
  }, []);

  const playersByTeam = React.useMemo(() => {
    return teams.map((team) => ({
      team,
      members: players.filter((player) => player.teamId === team.id),
    }));
  }, [players, teams]);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Match details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 sm:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
              Date played
              <input
                type="date"
                value={playedOn}
                onChange={(event) => setPlayedOn(event.target.value)}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/30"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
              Match format
              <select
                value={format}
                onChange={(event) => setFormat(event.target.value as MatchFormat)}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/30"
              >
                {MATCH_FORMATS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
            Course (optional)
            <input
              type="text"
              placeholder="Course name"
              className="rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/30"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
            Notes
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={4}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/30"
              placeholder="Document handicaps, format tweaks, or weather if needed."
            />
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Participants</CardTitle>
            <p className="text-sm text-slate-500">
              Select the players who competed. Team splits help build stats.
            </p>
          </div>
          <Badge variant="outline">{selectedPlayers.length} selected</Badge>
        </CardHeader>
        <CardContent className="space-y-6">
          {playersByTeam.map(({ team, members }) => (
            <div key={team.id} className="space-y-3">
              <div className="flex items-center gap-3">
                <div
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: team.color ?? "#1f2937" }}
                />
                <h3 className="text-sm font-semibold text-slate-900">{team.name}</h3>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {members.map((player) => {
                  const checked = selectedPlayers.includes(player.id);
                  return (
                    <button
                      key={player.id}
                      type="button"
                      onClick={() => togglePlayer(player.id)}
                      className={`flex items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition hover:border-slate-300 ${
                        checked
                          ? "border-slate-900 bg-slate-900 text-white"
                          : "border-slate-200 bg-white text-slate-700"
                      }`}
                    >
                      <span>{player.fullName}</span>
                      {checked ? (
                        <span className="text-xs font-semibold uppercase">In</span>
                      ) : (
                        <span className="text-xs text-slate-400">Tap</span>
                      )}
                    </button>
                  );
                })}
                {members.length === 0 && (
                  <p className="text-xs text-slate-400">No players assigned to this team.</p>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Review &amp; submit</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-slate-500">
            <p>
              {formatDate(playedOn)} -{" "}
              {MATCH_FORMATS.find((option) => option.value === format)?.label ?? "Custom match"}
            </p>
            <p>{selectedPlayers.length} players tagged</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline">Save draft</Button>
            <Button disabled>Submit match</Button>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
