import Link from "next/link";
import { getLeagueConfig } from "@/lib/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TeamsClient } from "./teams-client";

export const dynamic = "force-dynamic";

export default async function TeamsPage() {
  const league = await getLeagueConfig();
  if (!league.activeSeasonId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Teams</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-600">
          <p>No active season yet. Once you create one, teams for that season will be listed here.</p>
          <p>
            Use the{" "}
            <Link href="/app/commissioner" className="font-semibold text-slate-900">
              commissioner console
            </Link>{" "}
            to create a season and add teams.
          </p>
        </CardContent>
      </Card>
    );
  }

  const seasons = league.seasons.map((season) => ({
    id: season.id,
    name: season.name,
    isActive: season.id === league.activeSeasonId,
  }));

  return <TeamsClient seasons={seasons} defaultSeasonId={league.activeSeasonId} />;
}
