"use client";

import * as React from "react";
import { KeyRound, RefreshCcw, Search, Slash } from "lucide-react";
import type { OTPInvite } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface InvitesClientViewProps {
  invites: OTPInvite[];
  teams: Array<{ id: string; name: string }>;
}

type MessageState = { type: "success" | "error"; text: string } | null;

type ActionState =
  | { id: string; action: "resend" | "revoke" }
  | null;

export function InvitesClientView({ invites, teams }: InvitesClientViewProps) {
  const [items, setItems] = React.useState(invites);
  const [search, setSearch] = React.useState("");
  const [showCreate, setShowCreate] = React.useState(false);
  const [message, setMessage] = React.useState<MessageState>(null);
  const [creating, setCreating] = React.useState(false);
  const [actionState, setActionState] = React.useState<ActionState>(null);
  const [formValues, setFormValues] = React.useState({
    displayName: "",
    email: "",
    username: "",
    teamId: "",
    role: "player" as "player" | "commissioner",
  });

  React.useEffect(() => {
    setItems(invites);
  }, [invites]);

  const filtered = React.useMemo(() => {
    const term = search.toLowerCase();
    return items.filter(
      (invite) =>
        invite.username.toLowerCase().includes(term) ||
        invite.email?.toLowerCase().includes(term) ||
        invite.code.toLowerCase().includes(term),
    );
  }, [items, search]);

  const handleCreate = React.useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setMessage(null);
      setCreating(true);

      try {
        const response = await fetch("/api/admin/invites", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            displayName: formValues.displayName,
            email: formValues.email,
            username: formValues.username,
            role: formValues.role,
            teamId: formValues.teamId ? formValues.teamId : null,
          }),
        });

        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
          const errorMessage =
            typeof payload.error === "string" ? payload.error : "Failed to create invite.";
          setMessage({ type: "error", text: errorMessage });
          return;
        }

        const nextInvites = Array.isArray(payload.invites) ? (payload.invites as OTPInvite[]) : items;
        setItems(nextInvites);
        setMessage({
          type: "success",
          text: `Invite issued for ${formValues.username}.`,
        });
        setFormValues({
          displayName: "",
          email: "",
          username: "",
          teamId: "",
          role: "player",
        });
        setShowCreate(false);
      } catch (error) {
        console.error("[invites] create error", error);
        setMessage({ type: "error", text: "Unexpected error while creating invite." });
      } finally {
        setCreating(false);
      }
    },
    [formValues, items],
  );

  const performInviteAction = React.useCallback(
    async (id: string, action: "resend" | "revoke") => {
      setMessage(null);
      setActionState({ id, action });

      try {
        const response = await fetch(`/api/admin/invites/${id}/${action}`, {
          method: "POST",
        });
        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
          const errorMessage =
            typeof payload.error === "string"
              ? payload.error
              : `Failed to ${action === "resend" ? "resend" : "revoke"} invite.`;
          setMessage({ type: "error", text: errorMessage });
          return;
        }

        const nextInvites = Array.isArray(payload.invites) ? (payload.invites as OTPInvite[]) : items;
        setItems(nextInvites);
        setMessage({
          type: "success",
          text:
            action === "resend"
              ? "Invite reissued with a new OTP code."
              : "Invite revoked successfully.",
        });
      } catch (error) {
        console.error(`[invites] ${action} error`, error);
        setMessage({
          type: "error",
          text: "Unexpected error while updating invite.",
        });
      } finally {
        setActionState(null);
      }
    },
    [items],
  );

  const isActionBusy = React.useCallback(
    (id: string, action: "resend" | "revoke") =>
      actionState?.id === id && actionState.action === action,
    [actionState],
  );

  return (
    <>
      <div className="flex flex-col gap-4 border-b border-bdt-royal-soft px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 rounded-lg border border-bdt-royal-soft bg-white px-3 py-2">
          <Search className="h-4 w-4 text-bdt-quiet" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search invites"
            className="w-full border-none bg-transparent text-sm text-bdt-soft outline-none"
          />
        </div>
        <Button className="gap-2" onClick={() => setShowCreate((value) => !value)}>
          <KeyRound className="h-4 w-4" />
          {showCreate ? "Close form" : "Create invite"}
        </Button>
      </div>

      {message ? (
        <div
          className={`mx-6 rounded-md border px-4 py-3 text-sm ${
            message.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-rose-200 bg-rose-50 text-rose-700"
          }`}
        >
          {message.text}
        </div>
      ) : null}

      {showCreate ? (
        <div className="mx-6 rounded-lg border border-bdt-royal-soft bg-bdt-panel px-4 py-4 text-sm">
          <form className="space-y-4" onSubmit={handleCreate}>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-bdt-navy">
                Display name
                <Input
                  required
                  value={formValues.displayName}
                  onChange={(event) =>
                    setFormValues((prev) => ({ ...prev, displayName: event.target.value }))
                  }
                  placeholder="Alex Golfer"
                />
              </label>
              <label className="flex flex-col gap-1 text-bdt-navy">
                Email
                <Input
                  required
                  type="email"
                  value={formValues.email}
                  onChange={(event) => setFormValues((prev) => ({ ...prev, email: event.target.value }))}
                  placeholder="alex@example.com"
                />
              </label>
              <label className="flex flex-col gap-1 text-bdt-navy">
                Username
                <Input
                  required
                  value={formValues.username}
                  onChange={(event) =>
                    setFormValues((prev) => ({ ...prev, username: event.target.value.toLowerCase() }))
                  }
                  placeholder="alex"
                />
              </label>
              <label className="flex flex-col gap-1 text-bdt-navy">
                Team (optional)
                <select
                  value={formValues.teamId}
                  onChange={(event) =>
                    setFormValues((prev) => ({ ...prev, teamId: event.target.value }))
                  }
                  className="rounded-md border border-bdt-royal-soft bg-white px-3 py-2 text-sm shadow-sm focus:border-[rgb(var(--bdt-royal))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--bdt-royal) / 0.35)]"
                >
                  <option value="">Unassigned</option>
                  {teams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-bdt-navy">
                Role
                <select
                  value={formValues.role}
                  onChange={(event) =>
                    setFormValues((prev) => ({
                      ...prev,
                      role: event.target.value as "player" | "commissioner",
                    }))
                  }
                  className="rounded-md border border-bdt-royal-soft bg-white px-3 py-2 text-sm shadow-sm focus:border-[rgb(var(--bdt-royal))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--bdt-royal) / 0.35)]"
                >
                  <option value="player">Player</option>
                  <option value="commissioner">Commissioner</option>
                </select>
              </label>
              <div className="flex items-end justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowCreate(false);
                    setFormValues({
                      displayName: "",
                      email: "",
                      username: "",
                      teamId: "",
                      role: "player",
                    });
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={creating} className="gap-2">
                  {creating ? "Creating..." : "Create invite"}
                </Button>
              </div>
            </div>
          </form>
        </div>
      ) : null}

      <div className="overflow-x-auto px-6 py-4">
        <table className="min-w-full divide-y divide-[rgb(var(--bdt-royal) / 0.12)] text-sm">
          <thead className="bg-bdt-panel text-left text-xs font-semibold uppercase tracking-wide text-bdt-muted">
            <tr>
              <th className="px-4 py-3">Username</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Expires</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[rgb(var(--bdt-royal) / 0.12)]">
            {filtered.map((invite) => {
              const isConsumed = Boolean(invite.consumedAt);
              return (
                <tr key={invite.id} className="text-bdt-soft">
                  <td className="px-4 py-3 font-medium text-bdt-navy">{invite.username}</td>
                  <td className="px-4 py-3">{invite.email ?? "-"}</td>
                  <td className="px-4 py-3 font-mono text-xs uppercase">{invite.code}</td>
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
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        disabled={isActionBusy(invite.id, "resend")}
                        onClick={() => performInviteAction(invite.id, "resend")}
                      >
                        <RefreshCcw className="h-3 w-3" />
                        {isActionBusy(invite.id, "resend") ? "Resending..." : "Resend"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-2"
                        disabled={isActionBusy(invite.id, "revoke") || isConsumed}
                        onClick={() => performInviteAction(invite.id, "revoke")}
                      >
                        <Slash className="h-3 w-3" />
                        {isActionBusy(invite.id, "revoke") ? "Revoking..." : "Revoke"}
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-sm text-bdt-soft">
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

