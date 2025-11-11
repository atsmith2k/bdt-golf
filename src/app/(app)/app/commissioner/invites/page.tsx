import * as React from "react";
import { KeyRound, Search } from "lucide-react";
import { getOtpInvites } from "@/lib/queries";
import type { OTPInvite } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function InvitesPage() {
  const invites = await getOtpInvites();
  const openInvites = invites.filter((invite) => !invite.consumedAt);

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
        <InvitesClientView invites={invites} />
      </Card>
    </div>
  );
}

function InvitesClientView({ invites }: { invites: OTPInvite[] }) {
  "use client";
  const [search, setSearch] = React.useState("");

  const filtered = React.useMemo(() => {
    const term = search.toLowerCase();
    return invites.filter(
      (invite) =>
        invite.username.toLowerCase().includes(term) ||
        invite.email?.toLowerCase().includes(term) ||
        invite.code.toLowerCase().includes(term),
    );
  }, [invites, search]);

  return (
    <>
      <div className="flex flex-col gap-4 border-b border-slate-200 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search invites"
            className="w-full border-none bg-transparent text-sm text-slate-600 outline-none"
          />
        </div>
        <Button className="gap-2">
          <KeyRound className="h-4 w-4" />
          Create invite
        </Button>
      </div>
      <div className="overflow-x-auto px-6 py-4">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Username</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Expires</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {filtered.map((invite) => {
              const isConsumed = Boolean(invite.consumedAt);
              return (
                <tr key={invite.id} className="text-slate-600">
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {invite.username}
                  </td>
                  <td className="px-4 py-3">{invite.email ?? "-"}</td>
                  <td className="px-4 py-3 font-mono text-xs uppercase">
                    {invite.code}
                  </td>
                  <td className="px-4 py-3">
                    {formatDate(invite.expiresAt, {
                      month: "short",
                      day: "numeric",
                    })}
                  </td>
                  <td className="px-4 py-3">
                    {isConsumed ? (
                      <Badge variant="outline">Redeemed</Badge>
                    ) : (
                      <Badge variant="success">Open</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm">
                        Resend
                      </Button>
                      <Button variant="ghost" size="sm">
                        Revoke
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-sm text-slate-500">
                  No invites found. Issue one to get players onboarded.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
