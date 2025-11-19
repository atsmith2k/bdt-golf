import Link from "next/link";
import { getLeagueConfig } from "@/lib/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlayersClient } from "./players-client";

export const dynamic = "force-dynamic";

export default async function PlayersPage() {
  const league = await getLeagueConfig();
  if (!league.activeSeasonId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Players</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-bdt-muted">
          <p>No active season yet. Once you create one, the roster will populate here.</p>
          <p>
            Use the{" "}
            <Link href="/app/commissioner" className="font-semibold text-bdt-navy">
              commissioner console
            </Link>{" "}
            to create a season and invite players.
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

  return <PlayersClient seasons={seasons} defaultSeasonId={league.activeSeasonId} />;
}
