'use client';

import Link from "next/link";
import * as React from "react";
import { ArrowUpRight } from "lucide-react";
import useSWR from "swr";
import { formatPoints } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type PlayersResponse = {
  season: { id: string; name: string; isActive: boolean };
  seasons: { id: string; name: string; isActive: boolean }[];
  players: {
    id: string;
    fullName: string;
    username: string;
    team: { id: string; name: string; color?: string; seasonId: string } | null;
    matchesPlayed: number;
    pointsTotal: number;
    pointsPerMatch: number;
  }[];
};

async function fetchPlayers(url: string) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(typeof payload.error === "string" ? payload.error : "Unable to load players.");
  }
  return response.json() as Promise<PlayersResponse>;
}

export function PlayersClient({
  seasons,
  defaultSeasonId,
}: {
  seasons: { id: string; name: string; isActive: boolean }[];
  defaultSeasonId: string;
}) {
  const [seasonId, setSeasonId] = React.useState(defaultSeasonId);
  const { data, error, mutate, isLoading } = useSWR<PlayersResponse>(`/api/players?seasonId=${seasonId}`, fetchPlayers);

  const players = data?.players ?? [];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Players</h1>
          <p className="text-sm text-slate-500">Roster of every league member with season statistics.</p>
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
          <Badge variant="outline">
            {players.length} player{players.length === 1 ? "" : "s"}
          </Badge>
        </div>
      </div>

      {error ? (
        <Card>
          <CardContent className="space-y-3 py-6 text-sm text-red-600">
            <p>{error.message}</p>
            <Button onClick={() => mutate()} variant="outline" size="sm">
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {isLoading && !data ? (
        <Card className="border-slate-200 shadow-none">
          <CardHeader>
            <div className="h-5 w-32 animate-pulse rounded bg-slate-200" />
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="h-32 animate-pulse rounded-lg bg-slate-200" />
              ))}
            </div>
          </CardContent>
        </Card>
      ) : players.length === 0 ? (
        <Card>
          <CardContent className="py-6 text-sm text-slate-500">
            No players recorded for this season yet.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Season overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {players.map((player) => (
                <div
                  key={player.id}
                  className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 text-sm"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{player.fullName}</p>
                    <p className="text-xs text-slate-500">{player.team ? player.team.name : "Free Agent"}</p>
                  </div>
                  <div className="flex gap-3 text-xs text-slate-500">
                    <span>
                      Matches <span className="font-semibold">{player.matchesPlayed}</span>
                    </span>
                    <span>
                      Points <span className="font-semibold">{formatPoints(player.pointsTotal)}</span>
                    </span>
                  </div>
                  <Link
                    href={`/app/players/${player.id}?seasonId=${seasonId}`}
                    className="inline-flex items-center gap-2 text-xs font-semibold text-slate-900"
                  >
                    View player <ArrowUpRight className="h-3 w-3" />
                  </Link>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
