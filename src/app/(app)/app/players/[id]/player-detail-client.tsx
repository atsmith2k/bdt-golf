'use client';

import Link from "next/link";
import * as React from "react";
import useSWR from "swr";
import { formatDate, formatPoints } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

async function fetchPlayerDetail(url: string) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const message = typeof payload.error === "string" ? payload.error : "Unable to load player.";
    const error = new Error(message) as Error & { status?: number };
    error.status = response.status;
    throw error;
  }
  return response.json() as Promise<{
    season: { id: string; name: string; isActive: boolean };
    player: {
      id: string;
      fullName: string;
      username: string;
      email?: string;
      phone?: string;
      bio?: string;
      handicapIndex?: number;
      team: { id: string; name: string; color?: string } | null;
    };
    stats: {
      matchesPlayed: number;
      pointsTotal: number;
      pointsPerMatch: number;
      wins: number;
      losses: number;
      ties: number;
      form: number[];
    } | null;
    matches: {
      id: string;
      playedOn: string;
      format: string;
      status: string;
      courseName?: string;
      totalPoints: number;
      isWinner: boolean;
      pointsAwarded: number;
      strokes?: number;
    }[];
  }>;
}

export function PlayerDetailClient({
  playerId,
  seasons,
  defaultSeasonId,
}: {
  playerId: string;
  seasons: { id: string; name: string; isActive: boolean }[];
  defaultSeasonId: string;
}) {
  const [seasonId, setSeasonId] = React.useState(defaultSeasonId);
  const { data, error, mutate, isLoading } = useSWR(
    `/api/players/${playerId}?seasonId=${seasonId}`,
    fetchPlayerDetail,
  );

  if ((error as Error & { status?: number })?.status === 404) {
    return (
      <Card>
        <CardContent className="space-y-3 py-6 text-sm text-slate-600">
          <p>We couldn&apos;t find this player in the selected season.</p>
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
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">
            {data?.player.fullName ?? "Loading player..."}
          </h1>
          <p className="text-sm text-slate-500">
            {data?.player.team ? (
              <Link
                href={`/app/teams/${data.player.team.id}?seasonId=${seasonId}`}
                className="text-slate-900 underline decoration-dotted underline-offset-4 hover:text-slate-700"
              >
                {data.player.team.name}
              </Link>
            ) : (
              "Unassigned player"
            )}
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
          {data?.player.handicapIndex !== undefined ? (
            <Badge variant="outline">Handicap {data.player.handicapIndex.toFixed(1)}</Badge>
          ) : null}
        </div>
      </div>

      {error && !(error as Error & { status?: number })?.status ? (
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
        <PlayerDetailSkeleton />
      ) : data ? (
        <>
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Season stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-slate-600">
                <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <span>Matches played</span>
                  <span className="font-semibold">{data.stats?.matchesPlayed ?? 0}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <span>Total points</span>
                  <span className="font-semibold">{formatPoints(data.stats?.pointsTotal ?? 0)}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <span>Points / match</span>
                  <span className="font-semibold">
                    {(data.stats?.pointsPerMatch ?? 0).toFixed(1)}
                  </span>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Form (last {Math.min(data.stats?.form?.length ?? 0, 5)} matches)
                  </p>
                  <div className="mt-2 flex gap-2">
                    {data.stats?.form?.length ? (
                      data.stats.form.map((value, index) => (
                        <span
                          key={index}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-white text-sm font-semibold text-slate-700"
                        >
                          {value}
                        </span>
                      ))
                    ) : (
                      <p className="text-xs text-slate-400">No recent match data recorded.</p>
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
                {data.player.bio ? <p>{data.player.bio}</p> : <p>No bio yet.</p>}
                {data.player.email ? <p>Email: {data.player.email}</p> : null}
                {data.player.phone ? <p>Phone: {data.player.phone}</p> : null}
                <p>Username: {data.player.username}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Match history</CardTitle>
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
                      <span>{match.isWinner ? "Won" : "Lost"}</span>
                      <span>{formatPoints(match.pointsAwarded)}</span>
                      {match.strokes ? <span>{match.strokes} strokes</span> : null}
                    </div>
                  </li>
                ))}
                {data.matches.length === 0 && (
                  <li className="text-sm text-slate-500">No matches recorded for this player yet.</li>
                )}
              </ul>
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}

function PlayerDetailSkeleton() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <div className="h-8 w-48 animate-pulse rounded bg-slate-200" />
        <div className="h-4 w-32 animate-pulse rounded bg-slate-200" />
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-slate-200 shadow-none">
          <CardHeader>
            <div className="h-5 w-32 animate-pulse rounded bg-slate-200" />
          </CardHeader>
          <CardContent className="space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-9 animate-pulse rounded bg-slate-200" />
            ))}
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-none">
          <CardHeader>
            <div className="h-5 w-36 animate-pulse rounded bg-slate-200" />
          </CardHeader>
          <CardContent className="space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-8 animate-pulse rounded bg-slate-200" />
            ))}
          </CardContent>
        </Card>
      </div>
      <Card className="border-slate-200 shadow-none">
        <CardHeader>
          <div className="h-5 w-28 animate-pulse rounded bg-slate-200" />
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
