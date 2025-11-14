"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { Season, TeamSummary, UserProfile } from "@/lib/types";

interface TeamManagerProps {
  seasons: Season[];
  activeSeasonId: string | null;
  teams: TeamSummary[];
  players: UserProfile[];
}

type MessageState = { type: "success" | "error"; text: string } | null;

export function TeamManager({ seasons, activeSeasonId, teams, players }: TeamManagerProps) {
  const router = useRouter();
  const [teamName, setTeamName] = React.useState("");
  const [teamColor, setTeamColor] = React.useState("");
  const [seasonId, setSeasonId] = React.useState(() => activeSeasonId ?? seasons[0]?.id ?? "");
  const [message, setMessage] = React.useState<MessageState>(null);
  const [busy, setBusy] = React.useState(false);
  const [assignPlayerId, setAssignPlayerId] = React.useState("");
  const [assignTeamId, setAssignTeamId] = React.useState("");
  const [unassignPlayerId, setUnassignPlayerId] = React.useState("");

  const seasonOptions = React.useMemo(
    () =>
      seasons.map((season) => ({
        id: season.id,
        label: season.name,
      })),
    [seasons],
  );

  const selectedSeasonId = seasonId || activeSeasonId || "";
  const seasonTeams = React.useMemo(
    () => teams.filter((team) => team.seasonId === selectedSeasonId),
    [teams, selectedSeasonId],
  );

  React.useEffect(() => {
    if (seasonTeams.length > 0) {
      setAssignTeamId((value) => value || seasonTeams[0].id);
    }
  }, [seasonTeams]);

  const playersInSeason = React.useMemo(() => players, [players]);

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedSeasonId) {
      setMessage({ type: "error", text: "Select a season before creating a team." });
      return;
    }

    setBusy(true);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          seasonId: selectedSeasonId,
          name: teamName.trim(),
          color: teamColor || null,
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const errorText =
          typeof payload.error === "string" ? payload.error : "Failed to create team.";
        setMessage({ type: "error", text: errorText });
        return;
      }

      setMessage({ type: "success", text: "Team created." });
      setTeamName("");
      setTeamColor("");
      router.refresh();
    } catch (error) {
      console.error("[team-manager] create team error", error);
      setMessage({ type: "error", text: "Unexpected error while creating team." });
    } finally {
      setBusy(false);
    }
  }

  async function handleAssign(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!assignPlayerId || !assignTeamId) {
      setMessage({ type: "error", text: "Select a player and a team to assign." });
      return;
    }

    setBusy(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/admin/users/${assignPlayerId}/team`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId: assignTeamId }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const errorText =
          typeof payload.error === "string" ? payload.error : "Failed to assign player.";
        setMessage({ type: "error", text: errorText });
        return;
      }
      setMessage({ type: "success", text: "Player assigned to team." });
      setAssignPlayerId("");
      router.refresh();
    } catch (error) {
      console.error("[team-manager] assign error", error);
      setMessage({ type: "error", text: "Unexpected error while assigning player." });
    } finally {
      setBusy(false);
    }
  }

  async function handleUnassign(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!unassignPlayerId) {
      setMessage({ type: "error", text: "Select a player to unassign." });
      return;
    }

    setBusy(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/admin/users/${unassignPlayerId}/team`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId: null }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const errorText =
          typeof payload.error === "string" ? payload.error : "Failed to unassign player.";
        setMessage({ type: "error", text: errorText });
        return;
      }
      setMessage({ type: "success", text: "Player removed from team." });
      setUnassignPlayerId("");
      router.refresh();
    } catch (error) {
      console.error("[team-manager] unassign error", error);
      setMessage({ type: "error", text: "Unexpected error while removing player." });
    } finally {
      setBusy(false);
    }
  }

  const rosteredPlayers = React.useMemo(
    () =>
      playersInSeason.filter(
        (player) => player.teamId && seasonTeams.some((team) => team.id === player.teamId),
      ),
    [playersInSeason, seasonTeams],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Team management</CardTitle>
        <p className="text-sm text-bdt-muted">
          Create teams for a season and manage roster assignments in a single place.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={handleCreate} className="grid gap-4 sm:grid-cols-4">
          <label className="flex flex-col gap-2 text-sm font-medium text-bdt-navy">
            Season
            <select
              value={selectedSeasonId}
              onChange={(event) => setSeasonId(event.target.value)}
              className="rounded-md border border-bdt-royal-soft bg-white px-3 py-2 text-sm shadow-sm focus:border-[rgb(var(--bdt-royal))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--bdt-royal) / 0.35)]"
            >
              <option value="">Select a season</option>
              {seasonOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium text-bdt-navy sm:col-span-2">
            Team name
            <Input
              value={teamName}
              onChange={(event) => setTeamName(event.target.value)}
              placeholder="Pinseekers"
              required
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium text-bdt-navy">
            Color hex (optional)
            <Input
              value={teamColor}
              onChange={(event) => setTeamColor(event.target.value)}
              placeholder="#2563eb"
            />
          </label>
          <div className="sm:col-span-4 flex justify-end">
            <Button type="submit" disabled={busy || !selectedSeasonId}>
              {busy ? "Saving..." : "Create team"}
            </Button>
          </div>
        </form>

        <div className="grid gap-4 lg:grid-cols-2">
          <form onSubmit={handleAssign} className="space-y-3 rounded-lg border border-bdt-royal-soft p-4">
            <p className="text-sm font-semibold text-bdt-navy">Assign player to team</p>
            <label className="flex flex-col gap-2 text-sm text-bdt-navy">
              Player
              <select
                value={assignPlayerId}
                onChange={(event) => setAssignPlayerId(event.target.value)}
                className="rounded-md border border-bdt-royal-soft bg-white px-3 py-2 text-sm shadow-sm focus:border-[rgb(var(--bdt-royal))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--bdt-royal) / 0.35)]"
              >
                <option value="">Select a player</option>
                {playersInSeason.map((player) => (
                  <option key={player.id} value={player.id}>
                    {player.fullName} {player.teamId ? `(Team)` : "(Unassigned)"}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-2 text-sm text-bdt-navy">
              Team
              <select
                value={assignTeamId}
                onChange={(event) => setAssignTeamId(event.target.value)}
                className="rounded-md border border-bdt-royal-soft bg-white px-3 py-2 text-sm shadow-sm focus:border-[rgb(var(--bdt-royal))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--bdt-royal) / 0.35)]"
              >
                <option value="">Select a team</option>
                {seasonTeams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
            </label>
            <Button type="submit" disabled={busy || !seasonTeams.length}>
              Assign player
            </Button>
          </form>

          <form onSubmit={handleUnassign} className="space-y-3 rounded-lg border border-bdt-royal-soft p-4">
            <p className="text-sm font-semibold text-bdt-navy">Remove player from team</p>
            <label className="flex flex-col gap-2 text-sm text-bdt-navy">
              Player
              <select
                value={unassignPlayerId}
                onChange={(event) => setUnassignPlayerId(event.target.value)}
                className="rounded-md border border-bdt-royal-soft bg-white px-3 py-2 text-sm shadow-sm focus:border-[rgb(var(--bdt-royal))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--bdt-royal) / 0.35)]"
              >
                <option value="">Select a player</option>
                {rosteredPlayers.map((player) => (
                  <option key={player.id} value={player.id}>
                    {player.fullName}
                  </option>
                ))}
              </select>
            </label>
            <Button type="submit" variant="outline" disabled={busy || rosteredPlayers.length === 0}>
              Remove from team
            </Button>
          </form>
        </div>

        {message ? (
          <p
            className={`text-sm ${
              message.type === "success" ? "text-emerald-600" : "text-red-600"
            }`}
          >
            {message.text}
          </p>
        ) : null}

        <div className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-bdt-muted">
            Teams in selected season
          </p>
          {seasonTeams.length === 0 ? (
            <p className="text-sm text-bdt-muted">No teams yet.</p>
          ) : (
            seasonTeams.map((team) => (
              <div
                key={team.id}
                className="space-y-3 rounded-lg border border-bdt-royal-soft bg-white px-4 py-3 text-sm text-bdt-soft"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-bdt-navy">{team.name}</span>
                  {team.color ? (
                    <span className="flex items-center gap-2 text-xs text-bdt-muted">
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: team.color }}
                      />
                      {team.color}
                    </span>
                  ) : null}
                </div>
                <ul className="space-y-1 text-xs text-bdt-muted">
                  {playersInSeason
                    .filter((player) => player.teamId === team.id)
                    .map((player) => (
                      <li key={player.id} className="flex justify-between">
                        <span>{player.fullName}</span>
                        <span className="font-mono text-bdt-quiet">@{player.username}</span>
                      </li>
                    ))}
                  {playersInSeason.filter((player) => player.teamId === team.id).length === 0 ? (
                    <li className="italic text-bdt-quiet">No players assigned yet.</li>
                  ) : null}
                </ul>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
