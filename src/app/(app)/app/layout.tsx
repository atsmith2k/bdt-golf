import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { getLeagueConfig, getUserProfile } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function LoggedInLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, league] = await Promise.all([getUserProfile(), getLeagueConfig()]);

  if (!user) {
    redirect("/login");
  }

  const teamStats = league.teamStats.find((stat) => stat.teamId === user.teamId);
  const activeSeason = league.seasons.find((season) => season.id === league.activeSeasonId);

  return (
    <AppShell
      user={user}
      activeSeasonName={activeSeason?.name}
      activeTeamRecord={
        teamStats
          ? {
              wins: teamStats.wins,
              losses: teamStats.losses,
              ties: teamStats.ties,
            }
          : undefined
      }
    >
      {children}
    </AppShell>
  );
}
