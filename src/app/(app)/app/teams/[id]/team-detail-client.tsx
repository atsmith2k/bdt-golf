'use client';

import Link from "next/link";
import * as React from "react";
import useSWR from "swr";
import { Mail, Phone, ArrowUpRight } from "lucide-react";
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
      cumulativePoints: number;
      status: "active" | "inactive" | "injured";
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
            className="h-16 w-16 rounded-2xl border border-bdt-veil shadow-[0_12px_22px_rgb(var(--bdt-navy) / 0.12)]"
            style={{ backgroundColor: data?.team.color ?? "#0f172a" }}
          />
          <div>
            <h1 className="text-3xl font-semibold text-bdt-navy">
              {data?.team.name ?? "Loading team..."}
            </h1>
            {data?.stats ? (
              <p className="text-sm text-bdt-soft">
                {formatRecord(data.stats.wins ?? 0, data.stats.losses ?? 0, data.stats.ties ?? 0)} ·{" "}
                {formatPoints(data.stats.pointsTotal ?? 0)} points
              </p>
            ) : null}
          </div>
        </div>
        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
          <label className="flex items-center gap-2 text-sm text-bdt-muted">
            Season
            <select
              value={seasonId}
              onChange={(event) => setSeasonId(event.target.value)}
              className="rounded-lg border border-bdt-royal-soft bg-white/95 px-3 py-2 text-sm text-bdt-navy shadow-[0_10px_22px_rgb(var(--bdt-navy) / 0.08)] focus:border-[rgb(var(--bdt-royal))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--bdt-royal) / 0.35)] focus:ring-offset-1"
            >
              {seasons.map((season) => (
                <option key={season.id} value={season.id}>
                  {season.name}
                  {season.isActive ? " (Active)" : ""}
                </option>
              ))}
            </select>
          </label>
          {data?.stats?.streak ? (
            <Badge variant="outline" className="uppercase tracking-wide">
              Streak {data.stats.streak}
            </Badge>
          ) : null}
        </div>
      </div>

      {error && !(error as Error & { status?: number })?.status ? (
        <Card>
          <CardContent className="space-y-3 py-6 text-sm text-bdt-red">
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
                <ul className="space-y-3">
                  {data.roster.map((player) => (
                    <li
                      key={player.id}
                      className="flex flex-col gap-3 rounded-2xl border border-bdt-royal-soft bg-white/90 p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <Link 
                        href={`/app/players/${player.id}`} 
                        className="group flex-1"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-bdt-navy group-hover:text-bdt-royal transition">
                              {player.fullName}
                            </p>
                            <div className="flex flex-col gap-1 mt-1">
                              {player.handicapIndex !== undefined ? (
                                <p className="text-xs text-bdt-soft">
                                  Handicap: {player.handicapIndex.toFixed(1)}
                                </p>
                              ) : null}
                              <p className="text-xs text-bdt-soft">
                                {player.cumulativePoints} pts
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {player.status === "active" && (
                              <Badge variant="outline" className="text-xs text-bdt-navy border-bdt-royal-soft bg-[rgb(var(--bdt-royal) / 0.03)]">
                                Active
                              </Badge>
                            )}
                            {player.status === "inactive" && (
                              <Badge variant="outline" className="text-xs text-bdt-soft border-bdt-royal-soft">
                                Inactive
                              </Badge>
                            )}
                            {player.status === "injured" && (
                              <Badge variant="outline" className="text-xs text-bdt-red border-[rgb(var(--bdt-red) / 0.18)] bg-[rgb(var(--bdt-red) / 0.06)]">
                                Injured
                              </Badge>
                            )}
                          </div>
                        </div>
                      </Link>
                      <div className="flex gap-2 border-t border-bdt-royal-soft pt-3 sm:border-t-0 sm:border-l sm:pl-3 sm:pt-0">
                        {player.email && (
                          <a
                            href={`mailto:${player.email}`}
                            className="inline-flex items-center justify-center rounded-full border border-transparent p-2 text-bdt-royal transition hover:border-bdt-royal-soft hover:bg-bdt-panel"
                            title={player.email}
                          >
                            <Mail className="h-4 w-4" />
                          </a>
                        )}
                        {player.phone && (
                          <a
                            href={`tel:${player.phone}`}
                            className="inline-flex items-center justify-center rounded-full border border-transparent p-2 text-bdt-royal transition hover:border-bdt-royal-soft hover:bg-bdt-panel"
                            title={player.phone}
                          >
                            <Phone className="h-4 w-4" />
                          </a>
                        )}
                      </div>
                    </li>
                  ))}
                  {data.roster.length === 0 && (
                    <li className="text-sm text-bdt-soft py-4">No players assigned to this team yet.</li>
                  )}
                </ul>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Season snapshot</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-bdt-soft">
                {data.stats ? (
                  <>
                    <p>
                      Matches played:{" "}
                      <span className="font-semibold text-bdt-navy">{data.stats.matchesPlayed}</span>
                    </p>
                    <p>
                      Points per match:{" "}
                      <span className="font-semibold text-bdt-navy">
                        {data.stats.pointsPerMatch.toFixed(1)}
                      </span>
                    </p>
                  </>
                ) : (
                  <p>No stats yet for this team.</p>
                )}
                <p>
                  Season: <span className="font-semibold text-bdt-navy">{data.season.name}</span>
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Recent matches</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {data.matches.map((match) => (
                  <li key={match.id}>
                    <Link
                      href={`/app/matches/${match.id}`}
                      className="flex flex-col gap-2 rounded-2xl border border-bdt-royal-soft bg-white/90 p-4 transition hover:border-bdt-royal hover:bg-[rgb(var(--bdt-royal) / 0.03)] sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="font-semibold text-bdt-navy">
                          {match.courseName ?? "Friendly match"}
                        </p>
                        <p className="text-xs text-bdt-soft">
                          {formatDate(match.playedOn)} · {match.format.replace(/_/g, " ")}
                        </p>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-bdt-soft">{match.status}</span>
                        <span className="font-semibold text-bdt-navy">{formatPoints(match.totalPoints)}</span>
                        <ArrowUpRight className="h-4 w-4 text-bdt-royal" />
                      </div>
                    </Link>
                  </li>
                ))}
                {data.matches.length === 0 && (
                  <li className="text-sm text-bdt-soft py-4">No matches logged for this team yet.</li>
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
        <div className="h-16 w-16 animate-pulse rounded-2xl bg-[rgb(var(--bdt-royal) / 0.16)]" />
        <div className="space-y-2">
          <div className="h-8 w-48 animate-pulse rounded bg-[rgb(var(--bdt-royal) / 0.16)]" />
          <div className="h-4 w-32 animate-pulse rounded bg-[rgb(var(--bdt-royal) / 0.12)]" />
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <Card className="border-bdt-royal-soft bg-white/80 shadow-none backdrop-blur">
          <CardHeader>
            <div className="h-5 w-28 animate-pulse rounded bg-[rgb(var(--bdt-royal) / 0.16)]" />
          </CardHeader>
          <CardContent className="space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-24 animate-pulse rounded-2xl bg-[rgb(var(--bdt-royal) / 0.16)]" />
            ))}
          </CardContent>
        </Card>
        <Card className="border-bdt-royal-soft bg-white/80 shadow-none backdrop-blur">
          <CardHeader>
            <div className="h-5 w-32 animate-pulse rounded bg-[rgb(var(--bdt-royal) / 0.16)]" />
          </CardHeader>
          <CardContent className="space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="h-8 animate-pulse rounded bg-[rgb(var(--bdt-royal) / 0.12)]" />
            ))}
          </CardContent>
        </Card>
      </div>
      <Card className="border-bdt-royal-soft bg-white/80 shadow-none backdrop-blur">
        <CardHeader>
          <div className="h-5 w-32 animate-pulse rounded bg-[rgb(var(--bdt-royal) / 0.16)]" />
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-16 animate-pulse rounded-2xl bg-[rgb(var(--bdt-royal) / 0.16)]" />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
