'use client';

import Link from "next/link";
import * as React from "react";
import useSWR from "swr";
import { Mail, Phone, ArrowUpRight } from "lucide-react";
import { formatDate, formatPoints } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSupabaseClient } from "@/lib/supabase/client";

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
      ghin?: string;
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

  // viewer state to determine ownership / edit permissions
  const [viewerId, setViewerId] = React.useState<string | null>(null);
  const [editing, setEditing] = React.useState(false);
  const [bioInput, setBioInput] = React.useState<string | undefined>(undefined);
  const [ghinInput, setGhinInput] = React.useState<string | undefined>(undefined);
  const [avatarFile, setAvatarFile] = React.useState<File | null>(null);
  const [uploading, setUploading] = React.useState(false);
  const [trashMessage, setTrashMessage] = React.useState("");

  React.useEffect(() => {
    const supabase = getSupabaseClient();
    let mounted = true;
    (async () => {
      try {
        const { data: userData } = await supabase.auth.getUser();
        if (!mounted) return;
        setViewerId(userData.user?.id ?? null);
      } catch (err) {
        // ignore
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  React.useEffect(() => {
    // initialize form inputs when data loads
    if (data?.player) {
      setBioInput(data.player.bio ?? "");
      // `ghin` may be part of payload via users table; fallback to empty
      // Note: players API currently doesn't include GHIN; keep empty safe
      setGhinInput((data.player as any).ghin ?? "");
    }
  }, [data?.player]);

  if ((error as Error & { status?: number })?.status === 404) {
    return (
      <Card>
        <CardContent className="space-y-3 py-6 text-sm text-bdt-soft">
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
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-bdt-veil shadow-[0_12px_22px_rgb(var(--bdt-navy) / 0.12)] bg-gradient-to-br from-bdt-royal to-[rgb(var(--bdt-royal) / 0.7)]">
            <span className="text-xl font-bold text-white">
              {data?.player.fullName
                .split(" ")
                .map((word) => word[0])
                .join("")
                .toUpperCase()
                .slice(0, 2)}
            </span>
          </div>
          <div>
            <h1 className="text-3xl font-semibold text-bdt-navy">
              {data?.player.fullName ?? "Loading player..."}
            </h1>
            {data?.player.team ? (
              <Link
                href={`/app/teams/${data.player.team.id}?seasonId=${seasonId}`}
                className="text-sm text-bdt-royal transition hover:text-bdt-navy font-semibold"
              >
                {data.player.team.name}
              </Link>
            ) : (
              <p className="text-sm text-bdt-soft">Unassigned</p>
            )}
          </div>
          {/* Edit controls for profile owner */}
          {viewerId === playerId ? (
            <div className="ml-4">
              <Button variant="outline" size="sm" onClick={() => setEditing((v) => !v)}>
                {editing ? "Cancel" : "Edit profile"}
              </Button>
            </div>
          ) : null}
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
          {data?.player.handicapIndex !== undefined ? (
            <Badge variant="outline" className="uppercase tracking-wide text-bdt-royal border-bdt-royal-soft">
              Handicap {data.player.handicapIndex.toFixed(1)}
            </Badge>
          ) : null}
        </div>
      </div>

      {error && !(error as Error & { status?: number })?.status ? (
        <Card>
          <CardContent className="space-y-3 py-6 text-sm text-bdt-red">
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
          {/* Inline editor */}
          {editing ? (
            <Card>
              <CardHeader>
                <CardTitle>Edit profile</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-bdt-soft">Avatar</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setAvatarFile(e.target.files?.[0] ?? null)}
                      className="block mt-2"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-bdt-soft">Bio</label>
                    <textarea
                      value={bioInput}
                      onChange={(e) => setBioInput(e.target.value)}
                      className="w-full rounded-md border p-2 mt-2"
                      rows={4}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-bdt-soft">GHIN</label>
                    <input
                      type="text"
                      value={ghinInput}
                      onChange={(e) => setGhinInput(e.target.value)}
                      className="w-48 rounded-md border p-2 mt-2"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={async () => {
                        setUploading(true);
                        try {
                          const supabase = getSupabaseClient();
                          let avatarUrl = (data.player as any).avatarUrl ?? null;
                          if (avatarFile && viewerId) {
                            // prefer server-mediated upload to keep service role keys server-side
                            const fd = new FormData();
                            fd.append("file", avatarFile);
                            const res = await fetch(`/api/avatars/upload`, {
                              method: "POST",
                              body: fd,
                            });
                            if (!res.ok) {
                              const payload = await res.json().catch(() => ({}));
                              throw new Error(payload?.error ?? "Upload failed");
                            }
                            const payload = await res.json();
                            avatarUrl = payload.path ?? null;
                          }

                          if (viewerId) {
                            const updates: any = { bio: bioInput ?? null };
                            if (avatarUrl) updates.avatar_url = avatarUrl;
                            if (ghinInput !== undefined) updates.ghin = ghinInput ?? null;

                            const { error: updateError } = await supabase.from("users").update(updates).eq("id", viewerId);
                            if (updateError) throw updateError;
                          }

                          setEditing(false);
                          mutate();
                        } catch (err) {
                          console.error(err);
                        } finally {
                          setUploading(false);
                        }
                      }}
                      disabled={uploading}
                    >
                      {uploading ? "Saving…" : "Save profile"}
                    </Button>
                    <Button variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : null}
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Season stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center justify-between rounded-2xl border border-bdt-royal-soft bg-[rgb(var(--bdt-royal) / 0.03)] p-4">
                  <span className="text-bdt-soft">Matches played</span>
                  <span className="font-semibold text-bdt-navy">{data.stats?.matchesPlayed ?? 0}</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-bdt-royal-soft bg-[rgb(var(--bdt-royal) / 0.03)] p-4">
                  <span className="text-bdt-soft">Total points</span>
                  <span className="font-semibold text-bdt-navy">{formatPoints(data.stats?.pointsTotal ?? 0)}</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-bdt-royal-soft bg-[rgb(var(--bdt-royal) / 0.03)] p-4">
                  <span className="text-bdt-soft">Points / match</span>
                  <span className="font-semibold text-bdt-navy">
                    {(data.stats?.pointsPerMatch ?? 0).toFixed(1)}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-bdt-royal-soft bg-[rgb(var(--bdt-royal) / 0.03)] p-4">
                  <span className="text-bdt-soft">Win %</span>
                  <span className="font-semibold text-bdt-navy">
                    {data.stats?.matchesPlayed ? ((data.stats.wins / data.stats.matchesPlayed) * 100).toFixed(0) : 0}%
                  </span>
                </div>
                <div className="pt-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-bdt-soft mb-3">
                    Form (last {Math.min(data.stats?.form?.length ?? 0, 5)} matches)
                  </p>
                  <div className="flex gap-2">
                    {data.stats?.form?.length ? (
                      data.stats.form.map((value, index) => (
                        <span
                          key={index}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-bdt-royal-soft bg-gradient-to-br from-[rgb(var(--bdt-royal) / 0.08)] to-[rgb(var(--bdt-royal) / 0.04)] text-sm font-semibold text-bdt-royal"
                        >
                          {value}
                        </span>
                      ))
                    ) : (
                      <p className="text-xs text-bdt-soft">No recent match data recorded.</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Profile &amp; Contact</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {data.player.bio ? (
                  <div>
                    <p className="text-sm text-bdt-navy leading-relaxed">{data.player.bio}</p>
                  </div>
                ) : (
                  <p className="text-sm text-bdt-soft italic">No bio added yet.</p>
                )}
                <div className="border-t border-bdt-royal-soft pt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wide text-bdt-soft">Username</span>
                    <span className="text-sm text-bdt-navy font-semibold">{data.player.username}</span>
                  </div>
                  {data.player.ghin ? (
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wide text-bdt-soft">GHIN</span>
                      <span className="text-sm text-bdt-navy font-semibold">{data.player.ghin}</span>
                    </div>
                  ) : null}
                  {data.player.email || data.player.phone ? (
                    <div className="flex items-center gap-2 pt-2">
                      {data.player.email && (
                        <a
                          href={`mailto:${data.player.email}`}
                          className="inline-flex items-center justify-center rounded-full border border-transparent p-2 text-bdt-royal transition hover:border-bdt-royal-soft hover:bg-bdt-panel"
                          title={data.player.email}
                        >
                          <Mail className="h-4 w-4" />
                        </a>
                      )}
                      {data.player.phone && (
                        <a
                          href={`tel:${data.player.phone}`}
                          className="inline-flex items-center justify-center rounded-full border border-transparent p-2 text-bdt-royal transition hover:border-bdt-royal-soft hover:bg-bdt-panel"
                          title={data.player.phone}
                        >
                          <Phone className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Recent matches</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {data.matches.slice(0, 5).map((match) => (
                  <li
                    key={match.id}
                    className="flex flex-col gap-3 rounded-2xl border border-bdt-royal-soft bg-white/90 p-4 sm:flex-row sm:items-center sm:justify-between group"
                  >
                    <Link
                      href={`/app/matches/${match.id}`}
                      className="flex-1 group/link"
                    >
                      <p className="font-semibold text-bdt-navy group-hover/link:text-bdt-royal transition">
                        {match.courseName ?? "Friendly match"}
                      </p>
                      <p className="text-xs text-bdt-soft">
                        {formatDate(match.playedOn)} · {match.format.replace(/_/g, " ")}
                      </p>
                    </Link>
                    <div className="flex items-center gap-4 border-t border-bdt-royal-soft pt-3 sm:border-t-0 sm:border-l sm:pl-4 sm:pt-0">
                      <div className="flex items-center gap-2 text-xs">
                        <span className={`font-semibold px-2 py-1 rounded-full ${
                          match.isWinner
                            ? "bg-green-50 text-green-700 border border-green-200"
                            : "bg-orange-50 text-orange-700 border border-orange-200"
                        }`}>
                          {match.isWinner ? "Won" : "Lost"}
                        </span>
                        <span className="text-bdt-soft">{formatPoints(match.pointsAwarded)} pts</span>
                        {match.strokes ? <span className="text-bdt-soft">{match.strokes} strokes</span> : null}
                      </div>
                      <a
                        href={`/app/matches/${match.id}`}
                        className="inline-flex items-center justify-center rounded-full border border-transparent p-2 text-bdt-royal transition hover:border-bdt-royal-soft hover:bg-bdt-panel ml-auto"
                      >
                        <ArrowUpRight className="h-4 w-4" />
                      </a>
                    </div>
                  </li>
                ))}
                {data.matches.length === 0 && (
                  <li className="text-sm text-bdt-soft py-4">No matches recorded for this player yet.</li>
                )}
                {data.matches.length > 5 && (
                  <li className="pt-4 border-t border-bdt-royal-soft">
                    <Link
                      href={`/app/players/${playerId}/history`}
                      className="inline-flex items-center gap-2 text-sm font-semibold text-bdt-royal hover:text-bdt-navy transition"
                    >
                      View all matches <ArrowUpRight className="h-4 w-4" />
                    </Link>
                  </li>
                )}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Trash talk</CardTitle>
            </CardHeader>
            <CardContent>
              {viewerId ? (
                <div className="space-y-3">
                  <textarea
                    value={trashMessage}
                    onChange={(e) => setTrashMessage(e.target.value)}
                    className="w-full rounded-md border p-2"
                    rows={3}
                    placeholder="Post some friendly trash talk..."
                  />
                  <div className="flex gap-2">
                    <Button
                      onClick={async () => {
                        if (!trashMessage.trim()) return;
                        const supabase = getSupabaseClient();
                        try {
                          await supabase.from("timeline_events").insert({
                            season_id: data?.season?.id ?? null,
                            event_type: "season_event",
                            payload: { type: "trash_talk", body: trashMessage },
                            created_by: viewerId,
                          });
                          setTrashMessage("");
                          mutate();
                        } catch (err) {
                          console.error(err);
                        }
                      }}
                    >
                      Post
                    </Button>
                    <Button variant="ghost" onClick={() => setTrashMessage("")}>Clear</Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-bdt-soft">Log in to post trash talk.</p>
              )}

              <ul className="mt-4 space-y-3">
                {(data as any).trashTalks?.length ? (
                  (data as any).trashTalks.map((t: any) => (
                    <li key={t.id} className="rounded-2xl border border-bdt-royal-soft bg-white/90 p-3">
                      <p className="text-sm text-bdt-navy">{t.payload?.body}</p>
                      <p className="text-xs text-bdt-soft mt-1">{formatDate(t.createdAt)}</p>
                    </li>
                  ))
                ) : (
                  <li className="text-sm text-bdt-soft">No posts yet.</li>
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
      <div className="flex items-center gap-4">
        <div className="h-16 w-16 animate-pulse rounded-2xl bg-[rgb(var(--bdt-royal) / 0.16)]" />
        <div className="space-y-2">
          <div className="h-8 w-48 animate-pulse rounded bg-[rgb(var(--bdt-royal) / 0.16)]" />
          <div className="h-4 w-32 animate-pulse rounded bg-[rgb(var(--bdt-royal) / 0.12)]" />
        </div>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-bdt-royal-soft bg-white/80 shadow-none backdrop-blur">
          <CardHeader>
            <div className="h-5 w-32 animate-pulse rounded bg-[rgb(var(--bdt-royal) / 0.16)]" />
          </CardHeader>
          <CardContent className="space-y-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="h-10 animate-pulse rounded-2xl bg-[rgb(var(--bdt-royal) / 0.16)]" />
            ))}
          </CardContent>
        </Card>
        <Card className="border-bdt-royal-soft bg-white/80 shadow-none backdrop-blur">
          <CardHeader>
            <div className="h-5 w-36 animate-pulse rounded bg-[rgb(var(--bdt-royal) / 0.16)]" />
          </CardHeader>
          <CardContent className="space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-8 animate-pulse rounded bg-[rgb(var(--bdt-royal) / 0.12)]" />
            ))}
          </CardContent>
        </Card>
      </div>
      <Card className="border-bdt-royal-soft bg-white/80 shadow-none backdrop-blur">
        <CardHeader>
          <div className="h-5 w-40 animate-pulse rounded bg-[rgb(var(--bdt-royal) / 0.16)]" />
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-20 animate-pulse rounded-2xl bg-[rgb(var(--bdt-royal) / 0.16)]" />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
