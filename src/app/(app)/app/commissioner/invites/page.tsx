import { getLeagueConfig, getOtpInvites } from "@/lib/queries";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { InvitesClientView } from "@/components/commissioner/invites-client-view";

export const dynamic = "force-dynamic";

export default async function InvitesPage() {
  const [league, invites] = await Promise.all([getLeagueConfig(), getOtpInvites()]);
  const openInvites = invites.filter((invite) => !invite.consumedAt);
  const teams = league.teams.map((team) => ({ id: team.id, name: team.name }));

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">OTP invites</h1>
          <p className="text-sm text-slate-500">
            Track one-time password lifecycle and resend codes.
          </p>
        </div>
        <Badge variant="outline">
          {openInvites.length} open invite{openInvites.length === 1 ? "" : "s"}
        </Badge>
      </div>
      <Card>
        <InvitesClientView invites={invites} teams={teams} />
      </Card>
    </div>
  );
}
