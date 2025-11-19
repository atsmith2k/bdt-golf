import { notFound } from "next/navigation";
import { getLeagueConfig } from "@/lib/queries";
import { PlayerDetailClient } from "./player-detail-client";

export const dynamic = "force-dynamic";

export default async function PlayerDetailPage({
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

  const resolvedParams = await params;

  const playerExists = league.players.some((player) => player.id === resolvedParams.id);
  if (!playerExists) {
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

  return (
    <PlayerDetailClient playerId={resolvedParams.id} seasons={seasons} defaultSeasonId={defaultSeasonId} />
  );
}
