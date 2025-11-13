'use client';

import * as React from "react";
import useSWR from "swr";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type SeasonOption = {
  id: string;
  name: string;
  isActive: boolean;
};

type PlayerOption = {
  id: string;
  label: string;
  teamName?: string;
  teamColor?: string;
};

type HeadToHeadResponse = {
  season: { id: string; name: string };
  player: { id: string; displayName: string; username: string; teamId: string | null };
  opponent: { id: string; displayName: string; username: string; teamId: string | null };
  summary: {
    matchesPlayed: number;
    wins: number;
    losses: number;
    ties: number;
    pointsFor: number;
    pointsAgainst: number;
    averageMargin: number;
    lastMatchDate: string | null;
  };
  matches: Array<{
    id: string;
    matchDate: string;
    course?: string | null;
    playerPoints: number;
    opponentPoints: number;
    result: "win" | "loss" | "tie";
  }>;
  generatedAt: string;
};

const fetcher = async <T,>(url: string): Promise<T> => {
  const getNow = () => {
    if (typeof performance !== "undefined" && typeof performance.now === "function") {
      return performance.now();
    }
    return Date.now();
  };
  const startedAt = getNow();
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const message = typeof (payload as { error?: string }).error === "string" ? payload.error : "Request failed.";
    throw new Error(message);
  }
  const payload = await response.json();
  const duration = getNow() - startedAt;

  if (duration > 500) {
    console.warn(`[analytics] slow response (${Math.round(duration)}ms) for ${url}`);
  }

  if (typeof window !== "undefined" && typeof window.dispatchEvent === "function" && typeof CustomEvent === "function") {
    window.dispatchEvent(
      new CustomEvent("analytics:latency", {
        detail: {
          url,
          duration,
          timestamp: new Date().toISOString(),
        },
      }),
    );
  }

  return payload;
};

export function AnalyticsClient({
  seasons,
  defaultSeasonId,
  isCommissioner = false,
}: {
  seasons: SeasonOption[];
  defaultSeasonId: string;
  isCommissioner?: boolean;
}) {
  const [seasonId, setSeasonId] = React.useState(defaultSeasonId);
  const [activeTab, setActiveTab] = React.useState<"players" | "teams" | "participation" | "headToHead">("players");
  const [minMatches, setMinMatches] = React.useState(0);
  const [teamId, setTeamId] = React.useState<string | null>(null);
  const [headToHeadEnabled, setHeadToHeadEnabled] = React.useState(false);
  const [playerId, setPlayerId] = React.useState<string | null>(null);
  const [opponentId, setOpponentId] = React.useState<string | null>(null);

  React.useEffect(() => {
    setTeamId(null);
    setMinMatches(0);
    setPlayerId(null);
    setOpponentId(null);
  }, [seasonId]);

  React.useEffect(() => {
    if (!isCommissioner && headToHeadEnabled) {
      setHeadToHeadEnabled(false);
    }
  }, [isCommissioner, headToHeadEnabled]);

  React.useEffect(() => {
    setActiveTab((previous) => {
      if (headToHeadEnabled) {
        return "headToHead";
      }
      return previous === "headToHead" ? "players" : previous;
    });
  }, [headToHeadEnabled]);

  const playersKey = React.useMemo(() => {
    const params = new URLSearchParams({ seasonId, minMatches: String(minMatches) });
    if (teamId) {
      params.set("teamId", teamId);
    }
    return `/api/analytics/players?${params.toString()}`;
  }, [seasonId, minMatches, teamId]);

  const teamsKey = React.useMemo(() => `/api/analytics/teams?seasonId=${seasonId}`, [seasonId]);
  const participationKey = React.useMemo(
    () => `/api/analytics/participation?seasonId=${seasonId}&limit=20`,
    [seasonId],
  );

  const {
    data: playersData,
    error: playersError,
    isLoading: playersLoading,
  } = useSWR<{
    season: { id: string; name: string };
    players: Array<{
      playerId: string;
      displayName: string;
      username: string;
      teamId?: string;
      teamName?: string;
      teamColor?: string;
      matchesPlayed: number;
      pointsTotal: number;
      pointsPerMatch: number;
      wins: number;
      losses: number;
      ties: number;
      recentForm: number[];
    }>;
    teams: Array<{ id: string; name: string; color?: string | null }>;
  }>(playersKey, fetcher);

  const {
    data: teamsData,
    error: teamsError,
    isLoading: teamsLoading,
  } = useSWR<{
    season: { id: string; name: string };
    teams: Array<{
      teamId: string;
      name: string;
      color?: string;
      matchesPlayed: number;
      pointsTotal: number;
      pointsPerMatch: number;
      wins: number;
      losses: number;
      ties: number;
      recentMatches: string[];
    }>;
  }>(teamsKey, fetcher);

  const {
    data: participationData,
    error: participationError,
    isLoading: participationLoading,
  } = useSWR<{
    season: { id: string; name: string };
    totalMatches: number;
    players: Array<{
      playerId: string;
      displayName: string;
      username: string;
      teamId?: string;
      teamName?: string;
      teamColor?: string;
      matchesPlayed: number;
      totalPoints: number;
      participationRate: number;
    }>;
  }>(participationKey, fetcher);

  const headToHeadKey = React.useMemo(() => {
    if (!headToHeadEnabled || !playerId || !opponentId) {
      return null;
    }
    return `/api/analytics/head-to-head?seasonId=${seasonId}&playerId=${playerId}&opponentId=${opponentId}`;
  }, [headToHeadEnabled, playerId, opponentId, seasonId]);

  const {
    data: headToHeadData,
    error: headToHeadError,
    isLoading: headToHeadLoading,
    mutate: refreshHeadToHead,
  } = useSWR<HeadToHeadResponse>(headToHeadKey, fetcher);

  const teamsForFilter = React.useMemo(() => playersData?.teams ?? [], [playersData?.teams]);
  const playerOptions = React.useMemo<PlayerOption[]>(() => {
    return (playersData?.players ?? []).map((player) => ({
      id: player.playerId,
      label: player.displayName,
      teamName: player.teamName,
      teamColor: player.teamColor,
    }));
  }, [playersData?.players]);
  const tabOptions = React.useMemo(
    () =>
      [
        { value: "players" as const, label: "Player leaderboard" },
        { value: "teams" as const, label: "Team leaderboard" },
        { value: "participation" as const, label: "Participation" },
        ...(headToHeadEnabled && isCommissioner ? [{ value: "headToHead" as const, label: "Head-to-head" }] : []),
      ] as const,
    [headToHeadEnabled, isCommissioner],
  );

  React.useEffect(() => {
    if (!headToHeadEnabled) {
      setPlayerId((value) => (value !== null ? null : value));
      setOpponentId((value) => (value !== null ? null : value));
      return;
    }

    if (playerOptions.length < 2) {
      setPlayerId(null);
      setOpponentId(null);
      return;
    }

    setPlayerId((current) => {
      if (current && playerOptions.some((option) => option.id === current)) {
        return current;
      }
      return playerOptions[0].id;
    });
  }, [headToHeadEnabled, playerOptions]);

  React.useEffect(() => {
    if (!headToHeadEnabled) {
      return;
    }

    if (playerOptions.length < 2) {
      setOpponentId(null);
      return;
    }

    setOpponentId((current) => {
      if (
        current &&
        current !== playerId &&
        playerOptions.some((option) => option.id === current)
      ) {
        return current;
      }

      const fallback = playerOptions.find((option) => option.id !== playerId)?.id ?? null;
      return fallback;
    });
  }, [headToHeadEnabled, playerOptions, playerId]);

  const handleSelectPlayer = React.useCallback(
    (nextId: string) => {
      if (!nextId) {
        return;
      }
      setPlayerId(nextId);
      if (nextId === opponentId) {
        const fallback = playerOptions.find((option) => option.id !== nextId)?.id ?? null;
        setOpponentId(fallback);
      }
    },
    [opponentId, playerOptions],
  );

  const handleSelectOpponent = React.useCallback(
    (nextId: string) => {
      if (!nextId) {
        return;
      }
      if (nextId === playerId) {
        const fallback = playerOptions.find((option) => option.id !== playerId)?.id ?? null;
        setOpponentId(fallback);
        return;
      }
      setOpponentId(nextId);
    },
    [playerId, playerOptions],
  );

  const handleSwapPlayers = React.useCallback(() => {
    if (!playerId || !opponentId) {
      return;
    }
    setPlayerId(opponentId);
    setOpponentId(playerId);
  }, [playerId, opponentId]);

  const handleDownloadCsv = React.useCallback(() => {
    if (!playersData?.players?.length) {
      return;
    }
    const header = ["Rank", "Player", "Team", "Matches", "Points", "Points Per Match", "Recent Form"];
    const rows = playersData.players.map((player, index) => [
      String(index + 1),
      escapeCsvValue(player.displayName),
      escapeCsvValue(player.teamName ?? "Unassigned"),
      String(player.matchesPlayed),
      player.pointsTotal.toFixed(2),
      player.pointsPerMatch.toFixed(2),
      player.recentForm.map((value) => value.toFixed(2)).join(" | "),
    ]);

    const csv = [header, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `analytics-players-${seasonId}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [playersData, seasonId]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Analytics</h1>
          <p className="text-sm text-slate-500">
            Insights across players and teams. Filters update results without leaving the page.
          </p>
        </div>
        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
          <label className="flex items-center gap-2 text-sm text-slate-600">
            Season
            <select
              value={seasonId}
              onChange={(event) => setSeasonId(event.target.value)}
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/30"
            >
              {seasons.map((season) => (
                <option key={season.id} value={season.id}>
                  {season.name}
                  {season.isActive ? " (Active)" : ""}
                </option>
              ))}
            </select>
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">Phase 4</Badge>
            {isCommissioner ? (
              <button
                type="button"
                onClick={() => setHeadToHeadEnabled((value) => !value)}
                aria-pressed={headToHeadEnabled}
                className={cn(
                  "inline-flex items-center gap-2 rounded-md border px-3 py-2 text-xs font-medium transition",
                  headToHeadEnabled
                    ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900",
                )}
              >
                Head-to-head
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-700">
                  Beta
                </span>
                <span
                  className={cn(
                    "h-2 w-2 rounded-full",
                    headToHeadEnabled ? "bg-emerald-400" : "bg-slate-300",
                  )}
                  aria-hidden="true"
                />
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {tabOptions.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            onClick={() => setActiveTab(value)}
            className={cn(
              "rounded-full border px-4 py-2 text-sm transition",
              activeTab === value
                ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === "players" ? (
        <PlayersTab
          loading={playersLoading}
          error={playersError?.message}
          data={playersData}
          minMatches={minMatches}
          onMinMatchesChange={setMinMatches}
          teamId={teamId}
          onTeamChange={setTeamId}
          teams={teamsForFilter}
          onDownloadCsv={handleDownloadCsv}
        />
      ) : null}

      {activeTab === "headToHead" ? (
        <HeadToHeadTab
          loading={Boolean(headToHeadEnabled) && headToHeadLoading}
          error={headToHeadError?.message}
          data={headToHeadData}
          players={playerOptions}
          playerId={playerId}
          opponentId={opponentId}
          onSelectPlayer={handleSelectPlayer}
          onSelectOpponent={handleSelectOpponent}
          onSwap={handleSwapPlayers}
          onRetry={() => {
            if (headToHeadKey) {
              void refreshHeadToHead();
            }
          }}
          isEnabled={headToHeadEnabled && isCommissioner}
        />
      ) : null}

      {activeTab === "teams" ? (
        <TeamsTab loading={teamsLoading} error={teamsError?.message} data={teamsData} />
      ) : null}

      {activeTab === "participation" ? (
        <ParticipationTab
          loading={participationLoading}
          error={participationError?.message}
          data={participationData}
        />
      ) : null}
    </div>
  );
}

type PlayersTabProps = {
  loading: boolean;
  error?: string;
  data?:
    | {
        players: Array<{
          playerId: string;
          displayName: string;
          username: string;
          teamId?: string;
          teamName?: string;
          teamColor?: string;
          matchesPlayed: number;
          pointsTotal: number;
          pointsPerMatch: number;
          wins: number;
          losses: number;
          ties: number;
          recentForm: number[];
        }>;
      }
    | undefined;
  minMatches: number;
  onMinMatchesChange: (value: number) => void;
  teamId: string | null;
  onTeamChange: (value: string | null) => void;
  teams: Array<{ id: string; name: string; color?: string | null }>;
  onDownloadCsv: () => void;
};

function PlayersTab({
  loading,
  error,
  data,
  minMatches,
  onMinMatchesChange,
  teamId,
  onTeamChange,
  teams,
  onDownloadCsv,
}: PlayersTabProps) {
  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>Player leaderboard</CardTitle>
          <p className="text-sm text-slate-500">Sorted by total points. Tweak filters to focus on specific squads.</p>
        </div>
        <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
          <label className="flex items-center gap-2 text-xs uppercase tracking-wide text-slate-500">
            Min matches
            <input
              type="number"
              min={0}
              value={minMatches}
              onChange={(event) => onMinMatchesChange(Math.max(0, Number(event.target.value)))}
              className="w-20 rounded-md border border-slate-300 px-2 py-1 text-sm shadow-sm focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/30"
            />
          </label>
          <label className="flex items-center gap-2 text-xs uppercase tracking-wide text-slate-500">
            Team
            <select
              value={teamId ?? ""}
              onChange={(event) => onTeamChange(event.target.value ? event.target.value : null)}
              className="rounded-md border border-slate-300 px-2 py-1 text-sm shadow-sm focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/30"
            >
              <option value="">All teams</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          </label>
          <Button variant="outline" size="sm" onClick={onDownloadCsv} disabled={!data?.players?.length}>
            Export CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {error ? (
          <ErrorState message={error} />
        ) : loading ? (
          <LoadingRows count={6} />
        ) : !data?.players?.length ? (
          <EmptyState message="No player analytics available yet. Record matches to populate the leaderboard." />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="py-2 pr-4">Rank</th>
                  <th className="py-2 pr-4">Player</th>
                  <th className="py-2 pr-4">Team</th>
                  <th className="py-2 pr-4 text-right">Matches</th>
                  <th className="py-2 pr-4 text-right">Points</th>
                  <th className="py-2 pr-4 text-right">Pts / Match</th>
                  <th className="py-2 pr-4 text-right">Record</th>
                  <th className="py-2">Recent form</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.players.map((player, index) => (
                  <tr key={player.playerId} className="hover:bg-slate-50">
                    <td className="py-3 pr-4 text-xs font-semibold text-slate-500">{index + 1}</td>
                    <td className="py-3 pr-4">
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-900">{player.displayName}</span>
                        <span className="text-xs text-slate-400">@{player.username}</span>
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-xs text-slate-500">
                      {player.teamName ? player.teamName : <span className="italic text-slate-400">Unassigned</span>}
                    </td>
                    <td className="py-3 pr-4 text-right font-semibold text-slate-900">{player.matchesPlayed}</td>
                    <td className="py-3 pr-4 text-right font-semibold text-slate-900">
                      {player.pointsTotal.toFixed(2)}
                    </td>
                    <td className="py-3 pr-4 text-right text-slate-600">{player.pointsPerMatch.toFixed(2)}</td>
                    <td className="py-3 pr-4 text-right text-slate-600">
                      {player.wins}-{player.losses}
                      {player.ties ? `-${player.ties}` : ""}
                    </td>
                    <td className="py-3 text-right text-xs text-slate-500">
                      {player.recentForm.length > 0 ? (
                        <div className="flex justify-end gap-1">
                          {player.recentForm.map((value, formIndex) => (
                            <span
                              key={`${player.playerId}-form-${formIndex}`}
                              className={cn(
                                "inline-flex h-7 w-7 items-center justify-center rounded border text-xs font-semibold",
                                value > 0
                                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                  : value < 0
                                    ? "border-rose-200 bg-rose-50 text-rose-600"
                                    : "border-slate-200 bg-slate-50 text-slate-500",
                              )}
                            >
                              {value.toFixed(1)}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="italic text-slate-400">No data</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

type TeamsTabProps = {
  loading: boolean;
  error?: string;
  data?:
    | {
        teams: Array<{
          teamId: string;
          name: string;
          color?: string;
          matchesPlayed: number;
          pointsTotal: number;
          pointsPerMatch: number;
          wins: number;
          losses: number;
          ties: number;
          recentMatches: string[];
        }>;
      }
    | undefined;
};

function TeamsTab({ loading, error, data }: TeamsTabProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Team leaderboard</CardTitle>
        <p className="text-sm text-slate-500">Summaries for each squad across the season.</p>
      </CardHeader>
      <CardContent>
        {error ? (
          <ErrorState message={error} />
        ) : loading ? (
          <LoadingRows count={4} />
        ) : !data?.teams?.length ? (
          <EmptyState message="No team analytics available yet. Once matches are recorded, standings will appear here." />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {data.teams.map((team, index) => (
              <div key={team.teamId} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="h-8 w-8 rounded-full border"
                      style={{ backgroundColor: team.color ?? "#0f172a" }}
                    />
                    <div>
                      <p className="font-semibold text-slate-900">{team.name}</p>
                      <p className="text-xs text-slate-500">
                        {team.wins}-{team.losses}
                        {team.ties ? `-${team.ties}` : ""} · {team.pointsTotal.toFixed(2)} pts
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline">#{index + 1}</Badge>
                </div>
                <div className="mt-4 grid gap-3 text-xs text-slate-500 sm:grid-cols-3">
                  <Metric label="Matches" value={team.matchesPlayed} />
                  <Metric label="Points / match" value={team.pointsPerMatch.toFixed(2)} />
                  <Metric
                    label="Recent"
                    value={
                      team.recentMatches.length
                        ? team.recentMatches.map((date) => new Date(date).toLocaleDateString()).join(", ")
                        : "No data"
                    }
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

type HeadToHeadTabProps = {
  loading: boolean;
  error?: string;
  data?: HeadToHeadResponse;
  players: PlayerOption[];
  playerId: string | null;
  opponentId: string | null;
  onSelectPlayer: (value: string) => void;
  onSelectOpponent: (value: string) => void;
  onSwap: () => void;
  onRetry: () => void;
  isEnabled: boolean;
};

function HeadToHeadTab({
  loading,
  error,
  data,
  players,
  playerId,
  opponentId,
  onSelectPlayer,
  onSelectOpponent,
  onSwap,
  onRetry,
  isEnabled,
}: HeadToHeadTabProps) {
  const ready = isEnabled && players.length >= 2;
  const summary = data?.summary;
  const matches = data?.matches ?? [];

  const selectedPlayer = players.find((option) => option.id === playerId);
  const selectedOpponent = players.find((option) => option.id === opponentId);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Head-to-head</CardTitle>
        <p className="text-sm text-slate-500">
          Compare two players across recorded matches. This module is in beta while we validate the aggregation logic.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {!isEnabled ? (
          <EmptyState message="Head-to-head comparisons are limited to commissioners during the beta." />
        ) : !ready ? (
          <EmptyState message="Need at least two players with recorded stats to generate a comparison." />
        ) : (
          <>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <label className="flex flex-col text-sm text-slate-600">
                Player A
                <select
                  value={playerId ?? ""}
                  onChange={(event) => onSelectPlayer(event.target.value)}
                  className="mt-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/30"
                >
                  <option value="" disabled>
                    Select player
                  </option>
                  {players.map((option) => (
                    <option key={option.id} value={option.id} disabled={option.id === opponentId}>
                      {option.label}
                      {option.teamName ? ` · ${option.teamName}` : ""}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col text-sm text-slate-600">
                Player B
                <select
                  value={opponentId ?? ""}
                  onChange={(event) => onSelectOpponent(event.target.value)}
                  className="mt-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/30"
                >
                  <option value="" disabled>
                    Select opponent
                  </option>
                  {players.map((option) => (
                    <option key={option.id} value={option.id} disabled={option.id === playerId}>
                      {option.label}
                      {option.teamName ? ` · ${option.teamName}` : ""}
                    </option>
                  ))}
                </select>
              </label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onSwap}
                disabled={!playerId || !opponentId}
              >
                Swap players
              </Button>
            </div>

            {error ? (
              <div className="space-y-3">
                <ErrorState message={error} />
                <Button type="button" variant="outline" size="sm" onClick={onRetry}>
                  Retry
                </Button>
              </div>
            ) : loading ? (
              <LoadingRows count={3} />
            ) : !summary || summary.matchesPlayed === 0 ? (
              <EmptyState message="No recorded matchups between these players yet." />
            ) : (
              <>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <Metric label="Matches played" value={summary.matchesPlayed} />
                  <Metric
                    label="Record"
                    value={`${summary.wins}-${summary.losses}${summary.ties ? `-${summary.ties}` : ""}`}
                  />
                  <Metric label="Points for" value={summary.pointsFor.toFixed(1)} />
                  <Metric label="Points against" value={summary.pointsAgainst.toFixed(1)} />
                  <Metric
                    label="Average margin"
                    value={summary.averageMargin >= 0 ? `+${summary.averageMargin.toFixed(1)}` : summary.averageMargin.toFixed(1)}
                  />
                  <Metric
                    label="Last played"
                    value={summary.lastMatchDate ? new Date(summary.lastMatchDate).toLocaleDateString() : "—"}
                  />
                </div>

                <div className="space-y-3">
                  <p className="text-xs text-slate-500">
                    Showing recorded results for{" "}
                    <span className="font-semibold text-slate-900">{selectedPlayer?.label ?? data?.player.displayName}</span>{" "}
                    vs{" "}
                    <span className="font-semibold text-slate-900">
                      {selectedOpponent?.label ?? data?.opponent.displayName}
                    </span>
                    .
                  </p>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 text-sm">
                      <thead>
                        <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                          <th className="py-2 pr-4">Date</th>
                          <th className="py-2 pr-4">Course</th>
                          <th className="py-2 pr-4 text-right">Score</th>
                          <th className="py-2 text-right">Result</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {matches.map((match) => (
                          <tr key={match.id} className="hover:bg-slate-50">
                            <td className="py-3 pr-4 text-slate-600">
                              {new Date(match.matchDate).toLocaleDateString()}
                            </td>
                            <td className="py-3 pr-4 text-slate-500">{match.course ?? "—"}</td>
                            <td className="py-3 pr-4 text-right font-semibold text-slate-900">
                              {match.playerPoints.toFixed(1)} — {match.opponentPoints.toFixed(1)}
                            </td>
                            <td className="py-3 text-right">
                              <span
                                className={cn(
                                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold",
                                  match.result === "win"
                                    ? "bg-emerald-100 text-emerald-700"
                                    : match.result === "loss"
                                      ? "bg-rose-100 text-rose-700"
                                      : "bg-slate-100 text-slate-600",
                                )}
                              >
                                {match.result === "win" ? "Win" : match.result === "loss" ? "Loss" : "Tie"}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

type ParticipationTabProps = {
  loading: boolean;
  error?: string;
  data?:
    | {
        totalMatches: number;
        players: Array<{
          playerId: string;
          displayName: string;
          username: string;
          teamName?: string;
          teamColor?: string;
          matchesPlayed: number;
          totalPoints: number;
          participationRate: number;
        }>;
      }
    | undefined;
};

function ParticipationTab({ loading, error, data }: ParticipationTabProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Participation</CardTitle>
        <p className="text-sm text-slate-500">Identify players who might need a nudge to join the next round.</p>
      </CardHeader>
      <CardContent>
        {error ? (
          <ErrorState message={error} />
        ) : loading ? (
          <LoadingRows count={6} />
        ) : !data?.players?.length ? (
          <EmptyState message="No participation data yet. Record matches to unlock trends." />
        ) : (
          <div className="space-y-3 text-sm">
            <p className="text-xs text-slate-500">
              Total matches logged this season:{" "}
              <span className="font-semibold text-slate-900">{data.totalMatches}</span>
            </p>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead>
                  <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <th className="py-2 pr-4">Player</th>
                    <th className="py-2 pr-4">Team</th>
                    <th className="py-2 pr-4 text-right">Matches</th>
                    <th className="py-2 pr-4 text-right">Participation</th>
                    <th className="py-2 text-right">Points</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.players.map((player) => (
                    <tr key={player.playerId} className="hover:bg-slate-50">
                      <td className="py-3 pr-4">
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-900">{player.displayName}</span>
                          <span className="text-xs text-slate-400">@{player.username}</span>
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-xs text-slate-500">
                        {player.teamName ?? <span className="italic text-slate-400">Unassigned</span>}
                      </td>
                      <td className="py-3 pr-4 text-right font-semibold text-slate-900">{player.matchesPlayed}</td>
                      <td className="py-3 pr-4 text-right text-slate-600">
                        {(player.participationRate * 100).toFixed(1)}%
                      </td>
                      <td className="py-3 text-right text-slate-600">{player.totalPoints.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function LoadingRows({ count }: { count: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="h-12 animate-pulse rounded-md bg-slate-100" />
      ))}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return <p className="py-6 text-sm text-slate-500">{message}</p>;
}

function ErrorState({ message }: { message: string }) {
  return <p className="py-6 text-sm text-red-600">{message}</p>;
}

function Metric({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-slate-200 bg-slate-50 p-3">
      <span className="text-xs uppercase tracking-wide text-slate-500">{label}</span>
      <span className="text-sm font-semibold text-slate-900">{value}</span>
    </div>
  );
}

function escapeCsvValue(value: string) {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
