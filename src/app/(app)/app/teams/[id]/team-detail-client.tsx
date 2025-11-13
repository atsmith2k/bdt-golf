'use client';

import Link from "next/link";
import * as React from "react";
import useSWR from "swr";
import { formatDate, formatPoints, formatRecord } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

async function fetchTeamDetail(url: string) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const message = typeof payload.error === "string" ? payload.error : "Unable to load team.";
    const error = new Error(message) as Error & { status?: number };
    error.status = response.status;
    throw error;
  }
  return response.json() as Promise<{
    season: { id: string; name: string; isActive: boolean };
    team: {
      id: string;
      name: string;
      slug?: string;
      color?: string;
      points: number;
      wins: number;
      losses: number;
      ties: number;
    };
    stats: ({
      matchesPlayed: number;
      pointsTotal: number;
      pointsPerMatch: number;
      wins: number;
      losses: number;
      ties: number;
      streak?: string;
    }) | null;
    roster: {
      id: string;
      fullName: string;
      username: string;
      handicapIndex?: number;
      email?: string;
      phone?: string;
    }[];
    matches: {
      id: string;
      playedOn: string;
      format: string;
      status: string;
      courseName?: string;
      totalPoints: number;
    }[];
  }>;
}

export function TeamDetailClient({
  teamId,
  seasons,
  defaultSeasonId,
}: {
  teamId: string;
  seasons: { id: string; name: string; isActive: boolean }[];
  defaultSeasonId: string;
}) {
  const [seasonId, setSeasonId] = React.useState(defaultSeasonId);
  const { data, error, isLoading, mutate } = useSWR(
    `/api/teams/${teamId}?seasonId=${seasonId}`,
    fetchTeamDetail,
  );

  if ((error as Error & { status?: number })?.status === 404) {
    return (
      <Card>
        <CardContent className="space-y-3 py-6 text-sm text-slate-600">
          <p>We couldn&apos;t find that team for the selected season.</p>
          <Button variant="outline" size="sm" onClick={() => setSeasonId(defaultSeasonId)}>
            Jump to active season
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div
            className="h-14 w-14 rounded-full border border-slate-200 bg-slate-50"
            style={{ backgroundColor: data?.team.color ?? "#1f2937" }}
          />
          <div>
            <h1 className="text-3xl font-semibold text-slate-900">
              {data?.team.name ?? "Loading team..."}
            </h1>
            {data?.stats ? (
              <p className="text-sm text-slate-500">
                {formatRecord(data.stats.wins ?? 0, data.stats.losses ?? 0, data.stats.ties ?? 0)} ·{" "}
                {formatPoints(data.stats.pointsTotal ?? 0)}
              </p>
            ) : null}
          </div>
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
          {data?.stats?.streak ? <Badge variant="success">Streak {data.stats.streak}</Badge> : null}
        </div>
      </div>

      {error && !(error as Error & { status?: number })?.status ? (
        <Card>
          <CardContent className="space-y-3 py-6 text-sm text-red-600">
            <p>{error.message}</p>
            <Button onClick={() => mutate()} size="sm" variant="outline">
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {isLoading && !data ? (
        <TeamDetailSkeleton />
      ) : data ? (
        <>
          <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
            <Card>
              <CardHeader>
                <CardTitle>Roster</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="grid gap-3 sm:grid-cols-2">
                  {data.roster.map((player) => (
                    <li
                      key={player.id}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700"
                    >
                      <Link href={`/app/players/${player.id}`} className="font-semibold text-slate-900">
                        {player.fullName}
                      </Link>
                      {player.handicapIndex !== undefined ? (
                        <p className="text-xs text-slate-500">
                          Handicap index: {player.handicapIndex.toFixed(1)}
                        </p>
                      ) : null}
                    </li>
                  ))}
                  {data.roster.length === 0 && (
                    <li className="text-sm text-slate-500">No players assigned to this team yet.</li>
                  )}
                </ul>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Season snapshot</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-slate-600">
                {data.stats ? (
                  <>
                    <p>
                      Matches played:{" "}
                      <span className="font-semibold">{data.stats.matchesPlayed}</span>
                    </p>
                    <p>
                      Points per match:{" "}
                      <span className="font-semibold">
                        {data.stats.pointsPerMatch.toFixed(1)}
                      </span>
                    </p>
                  </>
                ) : (
                  <p>No stats yet for this team.</p>
                )}
                <p>
                  Season: <span className="font-semibold">{data.season.name}</span>
                </p>
                <p>ID: {data.team.id}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Matches</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 text-sm text-slate-600">
                {data.matches.map((match) => (
                  <li
                    key={match.id}
                    className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-semibold text-slate-900">
                        {match.courseName ?? "Friendly match"}
                      </p>
                      <p className="text-xs text-slate-500">
                        {formatDate(match.playedOn)} · {match.format.replace(/_/g, " ")}
                      </p>
                    </div>
                    <div className="flex gap-4 text-xs text-slate-500">
                      <span>{match.status}</span>
                      <span>{formatPoints(match.totalPoints)}</span>
                    </div>
                  </li>
                ))}
                {data.matches.length === 0 && (
                  <li className="text-sm text-slate-500">No matches logged for this team yet.</li>
                )}
              </ul>
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}

function TeamDetailSkeleton() {
  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <div className="h-14 w-14 animate-pulse rounded-full bg-slate-200" />
        <div className="space-y-2">
          <div className="h-5 w-48 animate-pulse rounded bg-slate-200" />
          <div className="h-4 w-32 animate-pulse rounded bg-slate-200" />
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <Card className="border-slate-200 shadow-none">
          <CardHeader>
            <div className="h-5 w-28 animate-pulse rounded bg-slate-200" />
          </CardHeader>
          <CardContent className="space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-12 animate-pulse rounded bg-slate-200" />
            ))}
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-none">
          <CardHeader>
            <div className="h-5 w-32 animate-pulse rounded bg-slate-200" />
          </CardHeader>
          <CardContent className="space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="h-8 animate-pulse rounded bg-slate-200" />
            ))}
          </CardContent>
        </Card>
      </div>
      <Card className="border-slate-200 shadow-none">
        <CardHeader>
          <div className="h-5 w-24 animate-pulse rounded bg-slate-200" />
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-16 animate-pulse rounded bg-slate-200" />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
