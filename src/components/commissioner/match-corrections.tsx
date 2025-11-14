'use client';

import * as React from "react";
import { useRouter } from "next/navigation";
import { Ban, Undo2 } from "lucide-react";
import type { MatchSummary } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

type MessageState = { type: "success" | "error"; text: string } | null;

interface MatchCorrectionsProps {
  matches: MatchSummary[];
}

const STATUS_COLORS: Record<MatchSummary["status"], string> = {
  scheduled: "bg-bdt-panel text-bdt-soft",
  submitted: "bg-amber-100 text-amber-700",
  validated: "bg-emerald-100 text-emerald-700",
  voided: "bg-rose-100 text-rose-700",
};

export function MatchCorrectionsPanel({ matches }: MatchCorrectionsProps) {
  const router = useRouter();
  const [items, setItems] = React.useState(matches);
  const [selectedMatchId, setSelectedMatchId] = React.useState(matches[0]?.id ?? "");
  const [reason, setReason] = React.useState("");
  const [restoreStatus, setRestoreStatus] = React.useState<"submitted" | "validated" | "scheduled">("submitted");
  const [message, setMessage] = React.useState<MessageState>(null);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    setItems(matches);
    if (matches.length > 0) {
      setSelectedMatchId((previous) => previous || matches[0].id);
    } else {
      setSelectedMatchId("");
    }
  }, [matches]);

  const selectedMatch = items.find((match) => match.id === selectedMatchId) ?? null;

  async function performAction(action: "void" | "restore") {
    if (!selectedMatch) return;

    const trimmedReason = reason.trim();
    if (action === "void" && trimmedReason.length === 0) {
      setMessage({ type: "error", text: "Provide a reason before voiding a match." });
      return;
    }

    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/matches/${selectedMatch.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          reason: trimmedReason || undefined,
          status: action === "restore" ? restoreStatus : undefined,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const errorText =
          typeof payload.error === "string"
            ? payload.error
            : action === "void"
              ? "Failed to void match."
              : "Failed to restore match.";
        setMessage({ type: "error", text: errorText });
        return;
      }

      setItems((previous) =>
        previous.map((match) =>
          match.id === selectedMatch.id
            ? { ...match, status: payload.status ?? match.status, notes: payload.notes ?? match.notes }
            : match,
        ),
      );

      setMessage({
        type: "success",
        text:
          action === "void"
            ? "Match voided. Aggregates will exclude it."
            : "Match restored. Aggregates recalculated.",
      });
      setReason("");
      router.refresh();
    } catch (error) {
      console.error("[match-corrections] action error", error);
      setMessage({ type: "error", text: "Unexpected error while applying match correction." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Match corrections</CardTitle>
        <p className="text-sm text-bdt-muted">
          Void or restore match results. Updates are logged to the audit trail and timeline.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.length === 0 ? (
          <p className="text-sm text-bdt-muted">
            No matches recorded yet. Capture results before using match corrections.
          </p>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-2 text-sm font-medium text-bdt-navy">
                Match
                <select
                  value={selectedMatchId}
                  onChange={(event) => setSelectedMatchId(event.target.value)}
                  className="rounded-md border border-bdt-royal-soft bg-white px-3 py-2 text-sm shadow-sm focus:border-[rgb(var(--bdt-royal))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--bdt-royal) / 0.35)]"
                >
                  {items.map((match) => (
                    <option key={match.id} value={match.id}>
                      {formatDate(match.playedOn)} · {match.format.replace(/_/g, " ")} ({match.status})
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex flex-col gap-2 text-sm font-medium text-bdt-navy">
                Status
                {selectedMatch ? (
                  <span
                    className={`inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${STATUS_COLORS[selectedMatch.status]}`}
                  >
                    {selectedMatch.status}
                  </span>
                ) : (
                  <span className="text-sm text-bdt-muted">Select a match to view status.</span>
                )}
              </div>
            </div>

            {selectedMatch ? (
              <>
                <div className="rounded-lg border border-bdt-royal-soft bg-bdt-panel px-4 py-3 text-sm text-bdt-soft">
                  <p className="font-semibold text-bdt-navy">
                    {formatDate(selectedMatch.playedOn)} · {selectedMatch.format.replace(/_/g, " ")}
                  </p>
                  {selectedMatch.courseName ? (
                    <p className="text-xs text-bdt-muted">Course: {selectedMatch.courseName}</p>
                  ) : null}
                  <p className="mt-2 text-xs uppercase tracking-wide text-bdt-muted">Participants</p>
                  <ul className="mt-1 divide-y divide-[rgb(var(--bdt-royal) / 0.12)]">
                    {selectedMatch.participants.map((participant) => (
                      <li key={participant.id} className="flex items-center justify-between py-1">
                        <span>{participant.user?.fullName ?? participant.userId}</span>
                        <span className="text-xs text-bdt-muted">
                          {participant.pointsAwarded.toFixed(1)} pts
                          {participant.isWinner ? " · Winner" : ""}
                        </span>
                      </li>
                    ))}
                  </ul>
                  {selectedMatch.notes ? (
                    <p className="mt-2 text-xs text-bdt-muted whitespace-pre-line">
                      Notes: {selectedMatch.notes}
                    </p>
                  ) : null}
                </div>

                <Textarea
                  rows={3}
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder={
                    selectedMatch.status === "voided"
                      ? "Optional note describing why the match is being restored."
                      : "Explain why this match needs to be voided."
                  }
                />

                {selectedMatch.status === "voided" ? (
                  <label className="flex items-center gap-2 text-sm font-medium text-bdt-navy">
                    Restore as
                    <select
                      value={restoreStatus}
                      onChange={(event) =>
                        setRestoreStatus(event.target.value as typeof restoreStatus)
                      }
                      className="rounded-md border border-bdt-royal-soft bg-white px-3 py-2 text-sm shadow-sm focus:border-[rgb(var(--bdt-royal))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--bdt-royal) / 0.35)]"
                    >
                      <option value="submitted">Submitted</option>
                      <option value="validated">Validated</option>
                      <option value="scheduled">Scheduled</option>
                    </select>
                  </label>
                ) : null}

                {message ? (
                  <p
                    className={`text-sm ${
                      message.type === "success" ? "text-emerald-600" : "text-red-600"
                    }`}
                  >
                    {message.text}
                  </p>
                ) : null}

                <div className="flex flex-wrap justify-end gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="gap-2"
                    disabled={busy || selectedMatch.status === "voided"}
                    onClick={() => performAction("void")}
                  >
                    <Ban className="h-4 w-4" />
                    Void match
                  </Button>
                  <Button
                    type="button"
                    className="gap-2"
                    disabled={busy || selectedMatch.status !== "voided"}
                    onClick={() => performAction("restore")}
                  >
                    <Undo2 className="h-4 w-4" />
                    Restore match
                  </Button>
                </div>
              </>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}
