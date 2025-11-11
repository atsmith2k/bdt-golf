import * as React from "react";
import { ClipboardList, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { getLeagueConfig, getOtpInvites } from "@/lib/queries";

export const dynamic = "force-dynamic";

function formatInviteStatus(consumedAt?: string) {
  if (!consumedAt) {
    return "Open";
  }
  const date = new Date(consumedAt);
  return `Redeemed ${date.toLocaleDateString()}`;
}

export default async function CommissionerPage() {
  const [league, invites] = await Promise.all([getLeagueConfig(), getOtpInvites()]);
  const openInvites = invites.filter((invite) => !invite.consumedAt);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Commissioner console
          </h1>
          <p className="text-sm text-slate-500">
            High-trust controls for roster management, match corrections, and league messaging.
          </p>
        </div>
        <Badge variant="outline">Commissioner-only</Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-slate-500" />
              Quick actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button className="w-full justify-between">
              Issue OTP invite
              <span className="text-xs font-semibold uppercase">
                {openInvites.length} open
              </span>
            </Button>
            <Button variant="outline" className="w-full justify-between">
              Correct match result
              <span className="text-xs text-slate-500">
                {league.matches.length} total matches
              </span>
            </Button>
            <Button variant="outline" className="w-full justify-between">
              Manage season state
              <span className="text-xs text-slate-500">
                {league.seasons.length} seasons tracked
              </span>
            </Button>
          </CardContent>
        </Card>

        <SeasonNotesCard />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Post announcement</CardTitle>
          <p className="text-sm text-slate-500">
            Broadcast to the timeline and notify players. This will trigger a `timeline_events` insert.
          </p>
        </CardHeader>
        <AnnouncementComposer />
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>OTP invites</CardTitle>
          <p className="text-sm text-slate-500">
            Monitor the one-time codes issued to new players. This table reads from `one_time_passwords`.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {invites.length === 0 ? (
            <p className="text-sm text-slate-500">No invites have been issued yet.</p>
          ) : (
            <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200">
              {invites.map((invite) => (
                <li key={invite.id} className="grid gap-3 px-4 py-3 text-sm sm:grid-cols-4 sm:items-center">
                  <div>
                    <p className="font-semibold text-slate-900">{invite.username}</p>
                    <p className="text-xs text-slate-500">{invite.email ?? "No email on file"}</p>
                  </div>
                  <div className="font-mono text-xs uppercase text-slate-600">{invite.code}</div>
                  <div className="text-xs text-slate-500">
                    Expires {new Date(invite.expiresAt).toLocaleDateString()}
                  </div>
                  <div className="text-right text-xs text-slate-500 sm:text-left">
                    {formatInviteStatus(invite.consumedAt)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function AnnouncementComposer() {
  "use client";
  const [announcement, setAnnouncement] = React.useState("");

  return (
    <CardContent className="space-y-4">
      <Input placeholder="Headline" />
      <Textarea
        rows={4}
        placeholder="Reminder: submit week 4 scores by Friday..."
        value={announcement}
        onChange={(event) => setAnnouncement(event.target.value)}
      />
      <div className="flex justify-end gap-3">
        <Button variant="outline">Preview</Button>
        <Button disabled={!announcement.trim()}>Publish</Button>
      </div>
    </CardContent>
  );
}

function SeasonNotesCard() {
  "use client";
  const [seasonNote, setSeasonNote] = React.useState("");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-slate-500" />
          Season checklist
        </CardTitle>
        <p className="text-sm text-slate-500">
          Use this scratchpad while we wire persistence in Supabase.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Notes for upcoming event
          </label>
          <Textarea
            value={seasonNote}
            onChange={(event) => setSeasonNote(event.target.value)}
            rows={4}
            placeholder="Pairings meeting, mid-season trade deadline, etc."
          />
        </div>
        <div className="rounded-lg border border-dashed border-slate-300 p-4 text-xs text-slate-500">
          Next up: create a Supabase table for commissioner tasks so this UI becomes collaborative.
        </div>
      </CardContent>
    </Card>
  );
}
