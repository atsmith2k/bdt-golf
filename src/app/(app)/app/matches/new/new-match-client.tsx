'use client';

import * as React from "react";
import { useRouter } from "next/navigation";
import type { MatchFormat, TeamSummary, UserProfile } from "@/lib/types";
import { MATCH_FORMATS } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function NewMatchClient({
  teams,
  players,
  seasonId,
}: {
  teams: TeamSummary[];
  players: UserProfile[];
  seasonId: string;
}) {
  const router = useRouter();
  const [playedOn, setPlayedOn] = React.useState(() => new Date().toISOString().slice(0, 10));
  const [format, setFormat] = React.useState<MatchFormat>(MATCH_FORMATS[0]?.value ?? "stroke_play");
  const [course, setCourse] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [selectedPlayers, setSelectedPlayers] = React.useState<string[]>([]);
  const [playerPoints, setPlayerPoints] = React.useState<Record<string, string>>({});
  const [formError, setFormError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const togglePlayer = React.useCallback((playerId: string) => {
    setSelectedPlayers((current) =>
      current.includes(playerId) ? current.filter((id) => id !== playerId) : [...current, playerId],
    );
  }, []);

  const playersByTeam = React.useMemo(
    () =>
      teams.map((team) => ({
        team,
        members: players.filter((player) => player.teamId === team.id),
      })),
    [players, teams],
  );

  const teamLookup = React.useMemo(() => {
    const map = new Map<string, TeamSummary>();
    teams.forEach((team) => {
      map.set(team.id, team);
    });
    return map;
  }, [teams]);

  const unassignedPlayers = React.useMemo(() => players.filter((player) => !player.teamId), [players]);

  const playersById = React.useMemo(() => {
    const map = new Map<string, UserProfile>();
    players.forEach((player) => {
      map.set(player.id, player);
    });
    return map;
  }, [players]);

  const selectedDetails = React.useMemo(
    () =>
      selectedPlayers
        .map((playerId) => playersById.get(playerId))
        .filter((player): player is UserProfile => Boolean(player)),
    [playersById, selectedPlayers],
  );

  const totalPoints = React.useMemo(
    () =>
      selectedPlayers.reduce((sum, playerId) => {
        const raw = playerPoints[playerId];
        const numeric = Number(raw);
        return sum + (Number.isFinite(numeric) ? numeric : 0);
      }, 0),
    [playerPoints, selectedPlayers],
  );

  const missingPoints = React.useMemo(
    () =>
      selectedPlayers.filter((playerId) => {
        const value = playerPoints[playerId];
        if (value === undefined) {
          return true;
        }
        const trimmed = value.trim();
        return trimmed.length === 0 || Number.isNaN(Number(trimmed));
      }),
    [playerPoints, selectedPlayers],
  );

  const handlePointsChange = React.useCallback((playerId: string, value: string) => {
    setPlayerPoints((current) => ({
      ...current,
      [playerId]: value,
    }));
  }, []);

  const handlePlayerToggle = React.useCallback(
    (player: UserProfile) => {
      const isSelected = selectedPlayers.includes(player.id);
      setPlayerPoints((current) => {
        const next = { ...current };
        if (isSelected) {
          delete next[player.id];
        } else if (next[player.id] === undefined) {
          next[player.id] = "";
        }
        return next;
      });
      togglePlayer(player.id);
    },
    [selectedPlayers, togglePlayer],
  );

  const handleSubmit = React.useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setFormError(null);

      if (!seasonId) {
        setFormError("No active season is available for match entry.");
        return;
      }

      if (!playedOn) {
        setFormError("Select the date the match was played.");
        return;
      }

      if (selectedPlayers.length < 2) {
        setFormError("Pick at least two participants.");
        return;
      }

      const participants = [];

      for (const playerId of selectedPlayers) {
        const player = playersById.get(playerId);
        const rawPoints = playerPoints[playerId];
        const trimmed = rawPoints?.trim() ?? "";
        const parsedPoints = Number(trimmed);

        if (!player) {
          setFormError("One of the selected players is no longer available.");
          return;
        }

        if (!trimmed || Number.isNaN(parsedPoints)) {
          setFormError("Enter points for every selected player.");
          return;
        }

        if (parsedPoints < 0) {
          setFormError("Points cannot be negative.");
          return;
        }

        participants.push({
          userId: playerId,
          teamId: player.teamId ?? null,
          points: parsedPoints,
        });
      }

      try {
        setIsSubmitting(true);
        const response = await fetch("/api/matches", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            seasonId,
            matchDate: playedOn,
            matchType: format,
            course: course.trim().length > 0 ? course.trim() : null,
            notes: notes.trim().length > 0 ? notes.trim() : null,
            participants,
          }),
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          setFormError(typeof (payload as { error?: string }).error === "string" ? payload.error : "Unable to record match.");
          return;
        }

        const payload = (await response.json().catch(() => ({}))) as { matchId?: string };
        const matchId = typeof payload.matchId === "string" ? payload.matchId : null;

        router.push(matchId ? `/app?match=${matchId}` : "/app");
        router.refresh();
      } catch (submitError) {
        console.error("[match-new] submit error", submitError);
        setFormError("Unexpected error while saving match.");
      } finally {
        setIsSubmitting(false);
      }
    },
    [course, format, notes, playedOn, playersById, playerPoints, router, seasonId, selectedPlayers],
  );

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
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
                max={new Date().toISOString().slice(0, 10)}
                required
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
              value={course}
              onChange={(event) => setCourse(event.target.value)}
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
          {playersByTeam.length === 0 && (
            <p className="text-sm text-slate-500">
              No teams are assigned to this season yet. Create teams and assign players before logging matches.
            </p>
          )}
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
                      onClick={() => handlePlayerToggle(player)}
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
          {unassignedPlayers.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-slate-400" />
                <h3 className="text-sm font-semibold text-slate-900">Unassigned</h3>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {unassignedPlayers.map((player) => {
                  const checked = selectedPlayers.includes(player.id);
                  return (
                    <button
                      key={player.id}
                      type="button"
                      onClick={() => handlePlayerToggle(player)}
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
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Points allocation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {selectedDetails.length === 0 ? (
            <p className="text-sm text-slate-500">Pick players above to assign points.</p>
          ) : (
            <>
              <div className="space-y-3">
                {selectedDetails.map((player) => {
                  const isInvalid = missingPoints.includes(player.id);
                  return (
                    <div key={player.id} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-slate-900">{player.fullName}</span>
                        <span className="text-xs text-slate-500">
                          {player.teamId ? teamLookup.get(player.teamId)?.name ?? "Team not found" : "Unassigned team"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-xs uppercase tracking-wide text-slate-500" htmlFor={`points-${player.id}`}>
                          Points
                        </label>
                        <input
                          id={`points-${player.id}`}
                          type="number"
                          min="0"
                          step="0.25"
                          inputMode="decimal"
                          value={playerPoints[player.id] ?? ""}
                          onChange={(event) => handlePointsChange(player.id, event.target.value)}
                          className={`w-28 rounded-md border px-3 py-2 text-sm shadow-sm focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/30 ${
                            isInvalid ? "border-red-500 focus:border-red-500 focus:ring-red-200" : "border-slate-300"
                          }`}
                          placeholder="0"
                          required
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                <span>Total points</span>
                <span className="font-semibold text-slate-900">{totalPoints.toFixed(2)}</span>
              </div>
            </>
          )}
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
            {missingPoints.length > 0 && selectedPlayers.length > 0 ? (
              <p className="mt-1 text-xs text-red-600">Assign valid points to every player.</p>
            ) : null}
          </div>
          <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:gap-3">
            <Button type="submit" className="w-full sm:w-auto" disabled={isSubmitting}>
              {isSubmitting ? "Submitting..." : "Submit match"}
            </Button>
          </div>
        </CardContent>
        {formError ? (
          <CardContent>
            <p className="text-sm text-red-600">{formError}</p>
          </CardContent>
        ) : null}
      </Card>
    </form>
  );
}
