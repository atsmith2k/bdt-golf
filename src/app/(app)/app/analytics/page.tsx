import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getUserProfile } from "@/lib/queries";
import { Card, CardContent } from "@/components/ui/card";
import { AnalyticsClient } from "./analytics-client";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const supabase = createServerSupabaseClient();
  const [seasonsResult, user] = await Promise.all([
    supabase.from("seasons").select("id, name, is_active").order("start_date", { ascending: false }),
    getUserProfile(),
  ]);

  const seasonsData = seasonsResult.data;
  const seasonsError = seasonsResult.error;

  if (seasonsError) {
    console.error("[analytics] seasons fetch error", seasonsError);
    return (
      <Card>
        <CardContent className="space-y-3 py-8 text-sm text-red-600">
          <h1 className="text-2xl font-semibold text-slate-900">Analytics</h1>
          <p>Unable to load seasons. Please try again or contact a commissioner.</p>
        </CardContent>
      </Card>
    );
  }

  const seasons = (seasonsData ?? []).map((season) => ({
    id: season.id as string,
    name: season.name as string,
    isActive: Boolean(season.is_active),
  }));

  if (seasons.length === 0) {
    return (
      <Card>
        <CardContent className="space-y-3 py-8 text-sm text-slate-600">
          <h1 className="text-2xl font-semibold text-slate-900">Analytics</h1>
          <p>No seasons have been created yet. Start by creating a season in the commissioner console.</p>
        </CardContent>
      </Card>
    );
  }

  const activeSeason = seasons.find((season) => season.isActive) ?? seasons[0];

  return (
    <AnalyticsClient
      seasons={seasons}
      defaultSeasonId={activeSeason.id}
      isCommissioner={user?.role === "commissioner"}
    />
  );
}
