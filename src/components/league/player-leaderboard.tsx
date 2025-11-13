import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { PlayerSeasonStats, UserProfile } from "@/lib/types";
import { formatPoints } from "@/lib/utils";

interface PlayerLeaderboardProps {
  stats: PlayerSeasonStats[];
  players: UserProfile[];
  limit?: number;
}

export function PlayerLeaderboard({
  stats,
  players,
  limit = 5,
}: PlayerLeaderboardProps) {
  const rows = stats
    .slice()
    .sort((a, b) => b.pointsTotal - a.pointsTotal)
    .slice(0, limit);

  return (
    <div className="overflow-hidden rounded-2xl border border-[rgb(var(--bdt-royal) / 0.18)] bg-white/95 shadow-[0_20px_40px_rgb(var(--bdt-navy) / 0.12)] backdrop-blur">
      <div className="border-b border-[rgb(var(--bdt-royal) / 0.14)] bg-[rgb(var(--bdt-royal) / 0.05)] px-6 py-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-bdt-royal">
          Player leaderboard
        </h2>
      </div>
      <ul className="divide-y divide-[rgb(var(--bdt-royal) / 0.12)]">
        {rows.map((row, index) => {
          const player = players.find((p) => p.id === row.userId);
          if (!player) return null;

          return (
            <li
              key={row.userId}
              className="flex items-center gap-4 px-6 py-4 text-sm"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-bdt-royal text-xs font-semibold uppercase tracking-wide text-white shadow-[0_14px_26px_rgb(var(--bdt-navy) / 0.18)]">
                {index + 1}
              </span>
              <div className="flex-1">
                <p className="font-semibold text-bdt-navy">{player.fullName}</p>
                <p className="text-xs text-[rgb(var(--bdt-navy) / 0.65)]">
                  {row.matchesPlayed} matches - {formatPoints(row.pointsTotal)}
                </p>
              </div>
              <Link
                href={`/app/players/${player.id}`}
                className="inline-flex items-center gap-1 rounded-full border border-transparent px-3 py-1 text-xs font-semibold text-bdt-royal transition hover:border-[rgb(var(--bdt-royal) / 0.25)] hover:bg-[rgb(var(--bdt-royal) / 0.08)] hover:text-bdt-navy"
              >
                View
                <ArrowUpRight className="h-3 w-3" />
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
