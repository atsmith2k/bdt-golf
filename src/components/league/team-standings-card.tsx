import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { TeamSeasonStats, TeamSummary } from "@/lib/types";
import { formatPoints, formatRecord } from "@/lib/utils";

interface TeamStandingsCardProps {
  teams: TeamSummary[];
  stats: TeamSeasonStats[];
}

export function TeamStandingsCard({
  teams,
  stats,
}: TeamStandingsCardProps) {
  const rows = stats
    .slice()
    .sort((a, b) => b.pointsTotal - a.pointsTotal)
    .map((stat) => {
      const team = teams.find((t) => t.id === stat.teamId);
      return {
        team,
        stat,
      };
    })
    .filter((row) => row.team !== undefined);

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-6 py-4">
        <h2 className="text-sm font-semibold text-slate-900">Team standings</h2>
      </div>
      <ul className="divide-y divide-slate-200">
        {rows.map(({ team, stat }) => {
          if (!team) return null;
          return (
            <li
              key={team.id}
              className="flex items-center gap-4 px-6 py-4 text-sm"
            >
              <div
                className="h-10 w-10 rounded-full"
                style={{ backgroundColor: team.color ?? "#1f2937" }}
              />
              <div className="flex-1">
                <p className="font-medium text-slate-900">{team.name}</p>
                <p className="text-xs text-slate-500">
                  {formatRecord(stat.wins, stat.losses, stat.ties)} -{" "}
                  {formatPoints(stat.pointsTotal)}
                </p>
              </div>
              <Link
                href={`/app/teams/${team.id}`}
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
