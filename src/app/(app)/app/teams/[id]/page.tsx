import { notFound } from "next/navigation";
import { getLeagueConfig } from "@/lib/queries";
import { TeamDetailClient } from "./team-detail-client";

export const dynamic = "force-dynamic";

export default async function TeamDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { seasonId?: string };
}) {
  const league = await getLeagueConfig();
  if (!league.activeSeasonId) {
    notFound();
  }

  const seasons = league.seasons.map((season) => ({
    id: season.id,
    name: season.name,
    isActive: season.id === league.activeSeasonId,
  }));

  const defaultSeasonId = searchParams.seasonId ?? league.activeSeasonId;
  if (!seasons.some((season) => season.id === defaultSeasonId)) {
    notFound();
  }

  return (
    <TeamDetailClient teamId={params.id} seasons={seasons} defaultSeasonId={defaultSeasonId} />
  );
}
