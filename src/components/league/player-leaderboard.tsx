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
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-6 py-4">
        <h2 className="text-sm font-semibold text-slate-900">
          Player leaderboard
        </h2>
      </div>
      <ul className="divide-y divide-slate-200">
        {rows.map((row, index) => {
          const player = players.find((p) => p.id === row.userId);
          if (!player) return null;

          return (
            <li
              key={row.userId}
              className="flex items-center gap-4 px-6 py-4 text-sm"
            >
              <span className="h-7 w-7 rounded-full bg-slate-900 text-center text-xs font-semibold leading-7 text-white">
                {index + 1}
              </span>
              <div className="flex-1">
                <p className="font-medium text-slate-900">{player.fullName}</p>
                <p className="text-xs text-slate-500">
                  {row.matchesPlayed} matches - {formatPoints(row.pointsTotal)}
                </p>
              </div>
              <Link
                href={`/app/players/${player.id}`}
                className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-900"
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
