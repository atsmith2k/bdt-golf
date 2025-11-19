import { notFound } from "next/navigation";
import { getLeagueConfig } from "@/lib/queries";
import { TeamDetailClient } from "./team-detail-client";

export const dynamic = "force-dynamic";

export default async function TeamDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ seasonId?: string }>;
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

  const resolvedSearchParams = await searchParams;
  const defaultSeasonId = resolvedSearchParams.seasonId ?? league.activeSeasonId;
  if (!seasons.some((season) => season.id === defaultSeasonId)) {
    notFound();
  }

  const resolvedParams = await params;

  return (
    <TeamDetailClient teamId={resolvedParams.id} seasons={seasons} defaultSeasonId={defaultSeasonId} />
  );
}
