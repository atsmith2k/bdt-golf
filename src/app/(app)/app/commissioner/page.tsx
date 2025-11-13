import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { getAuditLogs, getLeagueConfig, getOtpInvites } from "@/lib/queries";
import { SeasonManager } from "@/components/commissioner/season-manager";
import { TeamManager } from "@/components/commissioner/team-manager";
import { AnnouncementComposer } from "@/components/commissioner/announcement-composer";
import { SeasonNotesCard } from "@/components/commissioner/season-notes-card";
import { MatchCorrectionsPanel } from "@/components/commissioner/match-corrections";
import { AuditLogCard } from "@/components/commissioner/audit-log-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

function formatInviteStatus(consumedAt?: string) {
  if (!consumedAt) {
    return "Open";
  }
  const date = new Date(consumedAt);
  return `Redeemed ${date.toLocaleDateString()}`;
}

export default async function CommissionerPage() {
  const [league, invites, auditLogs] = await Promise.all([
    getLeagueConfig(),
    getOtpInvites(),
    getAuditLogs({ limit: 20 }),
  ]);
  const openInvites = invites.filter((invite) => !invite.consumedAt);
  const matchesForCorrections = league.matches.slice(0, 15);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-bdt-navy">Commissioner console</h1>
          <p className="text-sm text-[rgb(var(--bdt-navy) / 0.65)]">
            High-trust controls for roster management, match corrections, and league messaging.
          </p>
        </div>
        <Badge variant="outline" className="uppercase tracking-wide">
          Commissioner-only
        </Badge>
      </div>

      <div id="season-manager">
        <SeasonManager seasons={league.seasons} activeSeasonId={league.activeSeasonId} />
      </div>
      <TeamManager
        seasons={league.seasons}
        activeSeasonId={league.activeSeasonId}
        teams={league.teams}
        players={league.players}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-bdt-royal" />
              Quick actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Link href="/app/commissioner/invites" className="block">
              <Button className="w-full justify-between">
                Issue OTP invite
                <span className="text-xs font-semibold uppercase">
                  {openInvites.length} open
                </span>
              </Button>
            </Link>
            <Link href="#match-corrections" className="block">
              <Button variant="outline" className="w-full justify-between">
                Correct match result
                <span className="text-xs text-[rgb(var(--bdt-navy) / 0.6)]">
                  {league.matches.length} total matches
                </span>
              </Button>
            </Link>
            <Link href="#season-manager" className="block">
              <Button variant="outline" className="w-full justify-between">
                Manage season state
                <span className="text-xs text-[rgb(var(--bdt-navy) / 0.6)]">
                  {league.seasons.length} seasons tracked
                </span>
              </Button>
            </Link>
          </CardContent>
        </Card>

        <SeasonNotesCard />
      </div>

      <div id="match-corrections">
        <MatchCorrectionsPanel matches={matchesForCorrections} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Post announcement</CardTitle>
          <p className="text-sm text-[rgb(var(--bdt-navy) / 0.65)]">
            Broadcast to the timeline and notify players. This will trigger a <code>timeline_events</code> insert.
          </p>
        </CardHeader>
        <AnnouncementComposer seasons={league.seasons} defaultSeasonId={league.activeSeasonId} />
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>OTP invites</CardTitle>
          <p className="text-sm text-[rgb(var(--bdt-navy) / 0.65)]">
            Monitor the one-time codes issued to new players. This table reads from <code>one_time_passwords</code>.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {invites.length === 0 ? (
            <p className="text-sm text-[rgb(var(--bdt-navy) / 0.6)]">
              No invites have been issued yet.
            </p>
          ) : (
            <ul className="divide-y divide-[rgb(var(--bdt-royal) / 0.12)] rounded-2xl border border-[rgb(var(--bdt-royal) / 0.18)] bg-white/95 shadow-[0_16px_32px_rgb(var(--bdt-navy) / 0.12)]">
              {invites.map((invite) => (
                <li
                  key={invite.id}
                  className="grid gap-3 px-4 py-3 text-sm text-bdt-navy sm:grid-cols-4 sm:items-center"
                >
                  <div>
                    <p className="font-semibold text-bdt-navy">{invite.username}</p>
                    <p className="text-xs text-[rgb(var(--bdt-navy) / 0.6)]">
                      {invite.email ?? "No email on file"}
                    </p>
                  </div>
                  <div className="font-mono text-xs uppercase tracking-wide text-[rgb(var(--bdt-navy) / 0.6)]">
                    {invite.code}
                  </div>
                  <div className="text-xs text-[rgb(var(--bdt-navy) / 0.6)]">
                    Expires {new Date(invite.expiresAt).toLocaleDateString()}
                  </div>
                  <div className="text-right text-xs font-semibold text-bdt-royal sm:text-left">
                    {formatInviteStatus(invite.consumedAt)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <AuditLogCard logs={auditLogs} viewAllHref="/app/commissioner/audit" />
    </div>
  );
}
