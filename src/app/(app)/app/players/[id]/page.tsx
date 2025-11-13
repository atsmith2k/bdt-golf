import { notFound } from "next/navigation";
import { getLeagueConfig } from "@/lib/queries";
import { PlayerDetailClient } from "./player-detail-client";

export const dynamic = "force-dynamic";

export default async function PlayerDetailPage({
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

  const playerExists = league.players.some((player) => player.id === params.id);
  if (!playerExists) {
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
    <PlayerDetailClient playerId={params.id} seasons={seasons} defaultSeasonId={defaultSeasonId} />
  );
}
