'use client';

import Link from "next/link";
import * as React from "react";
import { ArrowUpRight, Users } from "lucide-react";
import useSWR from "swr";
import { formatPoints, formatRecord } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type TeamSummaryResponse = {
  season: { id: string; name: string; isActive: boolean };
  teams: {
    id: string;
    name: string;
    slug?: string;
    color?: string;
    seasonId: string;
    points: number;
    wins: number;
    losses: number;
    ties: number;
    matchesPlayed: number;
    pointsPerMatch: number;
    rosterSize: number;
  }[];
  seasons: { id: string; name: string; isActive: boolean }[];
};

async function fetchTeams(url: string) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(typeof payload.error === "string" ? payload.error : "Unable to load teams.");
  }
  return response.json() as Promise<TeamSummaryResponse>;
}

export function TeamsClient({
  seasons,
  defaultSeasonId,
}: {
  seasons: { id: string; name: string; isActive: boolean }[];
  defaultSeasonId: string;
}) {
  const [seasonId, setSeasonId] = React.useState(defaultSeasonId);
  const { data, error, isLoading, mutate } = useSWR<TeamSummaryResponse>(
    `/api/teams?seasonId=${seasonId}`,
    fetchTeams,
  );

  const teams = data?.teams ?? [];
  const activeSeason = data?.season;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Teams</h1>
          <p className="text-sm text-slate-500">
            Roster assignments, records, and quick links to recent matches.
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
          <Badge variant="outline">
            {teams.length} team{teams.length === 1 ? "" : "s"}
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

      {isLoading ? (
        <TeamsSkeleton />
      ) : teams.length === 0 ? (
        <Card>
          <CardContent className="py-6 text-sm text-slate-500">
            No teams recorded for {activeSeason?.name ?? "this season"} yet.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {teams.map((team) => (
            <Card key={team.id}>
              <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="h-10 w-10 rounded-full"
                    style={{ backgroundColor: team.color ?? "#0f172a" }}
                  />
                  <div>
                    <CardTitle>{team.name}</CardTitle>
                    <p className="text-sm text-slate-500">
                      {formatRecord(team.wins, team.losses, team.ties)} · {formatPoints(team.points)}
                    </p>
                  </div>
                </div>
                <Link
                  href={`/app/teams/${team.id}?seasonId=${seasonId}`}
                  className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900"
                >
                  View team <ArrowUpRight className="h-4 w-4" />
                </Link>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-slate-600">
                <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  <Users className="h-4 w-4 text-slate-400" />
                  <span>
                    {team.rosterSize} rostered player{team.rosterSize === 1 ? "" : "s"}
                  </span>
                </div>
                <div className="flex flex-wrap gap-4 text-xs text-slate-500">
                  <span>
                    Matches <span className="font-semibold text-slate-900">{team.matchesPlayed}</span>
                  </span>
                  <span>
                    Points / match{" "}
                    <span className="font-semibold text-slate-900">
                      {team.pointsPerMatch.toFixed(1)}
                    </span>
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function TeamsSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {Array.from({ length: 4 }).map((_, index) => (
        <Card key={index} className="border-slate-200 shadow-none">
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 animate-pulse rounded-full bg-slate-200" />
              <div className="space-y-2">
                <div className="h-4 w-28 animate-pulse rounded bg-slate-200" />
                <div className="h-3 w-24 animate-pulse rounded bg-slate-200" />
              </div>
            </div>
            <div className="h-8 w-24 animate-pulse rounded bg-slate-200" />
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="h-9 w-full animate-pulse rounded bg-slate-200" />
            <div className="h-3 w-2/3 animate-pulse rounded bg-slate-200" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
