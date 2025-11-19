import Link from "next/link";
import { getLeagueConfig } from "@/lib/queries";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NewMatchClient } from "./new-match-client";

export const dynamic = "force-dynamic";

export default async function NewMatchPage() {
  const league = await getLeagueConfig();
  if (!league.activeSeasonId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Log a match result</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-bdt-muted">
          <p>No active season is configured yet, so match entry is disabled.</p>
          <p>
            Create a season from the{" "}
            <Link href="/app/commissioner" className="font-semibold text-bdt-navy">
              commissioner console
            </Link>{" "}
            to enable match logging.
          </p>
        </CardContent>
      </Card>
    );
  }

  const activeTeams = league.teams.filter((team) => team.seasonId === league.activeSeasonId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-bdt-navy">Log a match result</h1>
          <p className="text-sm text-bdt-soft">
            Capture the essentials so standings and timelines stay accurate.
          </p>
        </div>
        <Badge variant="outline">Live</Badge>
      </div>
      <NewMatchClient teams={activeTeams} players={league.players} seasonId={league.activeSeasonId} />
    </div>
  );
}
