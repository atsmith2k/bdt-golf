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
    <div className="overflow-hidden rounded-2xl border border-[rgb(var(--bdt-royal) / 0.18)] bg-white/95 shadow-[0_20px_40px_rgb(var(--bdt-navy) / 0.12)] backdrop-blur">
      <div className="border-b border-[rgb(var(--bdt-royal) / 0.14)] bg-[rgb(var(--bdt-royal) / 0.05)] px-6 py-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-bdt-royal">
          Team standings
        </h2>
      </div>
      <ul className="divide-y divide-[rgb(var(--bdt-royal) / 0.12)]">
        {rows.map(({ team, stat }) => {
          if (!team) return null;
          return (
            <li
              key={team.id}
              className="flex items-center gap-4 px-6 py-4 text-sm"
            >
              <div
                className="h-12 w-12 rounded-2xl border border-[rgb(var(--bdt-navy) / 0.12)] shadow-[0_12px_22px_rgb(var(--bdt-navy) / 0.12)]"
                style={{ backgroundColor: team.color ?? "#0c337a" }}
              />
              <div className="flex-1">
                <p className="font-semibold text-bdt-navy">{team.name}</p>
                <p className="text-xs text-[rgb(var(--bdt-navy) / 0.65)]">
                  {formatRecord(stat.wins, stat.losses, stat.ties)} -{" "}
                  {formatPoints(stat.pointsTotal)}
                </p>
              </div>
              <Link
                href={`/app/teams/${team.id}`}
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
