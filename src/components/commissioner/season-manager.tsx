"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { Season } from "@/lib/types";

interface SeasonManagerProps {
  seasons: Season[];
  activeSeasonId: string | null;
}

type MessageState = { type: "success" | "error"; text: string } | null;

export function SeasonManager({ seasons, activeSeasonId }: SeasonManagerProps) {
  const router = useRouter();
  const [name, setName] = React.useState("");
  const [startDate, setStartDate] = React.useState("");
  const [endDate, setEndDate] = React.useState("");
  const [makeActive, setMakeActive] = React.useState(
    () => activeSeasonId === null && seasons.length === 0,
  );
  const [message, setMessage] = React.useState<MessageState>(null);
  const [busy, setBusy] = React.useState(false);

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/seasons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          startDate,
          endDate: endDate || null,
          activate: makeActive || (activeSeasonId === null && seasons.length === 0),
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const errorText =
          typeof payload.error === "string" ? payload.error : "Failed to create season.";
        setMessage({ type: "error", text: errorText });
        return;
      }

      setMessage({ type: "success", text: "Season created." });
      setName("");
      setStartDate("");
      setEndDate("");
      setMakeActive(false);
      router.refresh();
    } catch (createError) {
      console.error("[season-manager] create season error", createError);
      setMessage({ type: "error", text: "Unexpected error while creating season." });
    } finally {
      setBusy(false);
    }
  }

  async function setActiveSeason(id: string) {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/seasons/${id}/activate`, {
        method: "POST",
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const errorText =
          typeof payload.error === "string"
            ? payload.error
            : "Unable to update active season.";
        setMessage({ type: "error", text: errorText });
        return;
      }
      setMessage({ type: "success", text: "Active season updated." });
      router.refresh();
    } catch (updateError) {
      console.error("[season-manager] activate error", updateError);
      setMessage({ type: "error", text: "Unexpected error while updating season." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card id="season-manager">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-slate-500" />
          Season management
        </CardTitle>
        <p className="text-sm text-slate-500">
          Create seasons and choose which one is active. Activating a season disables all others.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={handleCreate} className="grid gap-4 sm:grid-cols-3">
          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 sm:col-span-1">
            Season name
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="2025 League"
              required
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
            Start date
            <Input
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              required
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
            End date (optional)
            <Input
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
            />
          </label>
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              checked={makeActive}
              onChange={(event) => setMakeActive(event.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900/40"
            />
            Set active after creating
          </label>
          <div className="sm:col-span-3 flex justify-end">
            <Button type="submit" disabled={busy}>
              {busy ? "Saving..." : "Create season"}
            </Button>
          </div>
        </form>
        {message ? (
          <p
            className={`text-sm ${
              message.type === "success" ? "text-emerald-600" : "text-red-600"
            }`}
          >
            {message.text}
          </p>
        ) : null}
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Seasons
          </p>
          {seasons.length === 0 ? (
            <p className="text-sm text-slate-500">No seasons created yet.</p>
          ) : (
            <ul className="space-y-2 text-sm text-slate-600">
              {seasons.map((season) => (
                <li
                  key={season.id}
                  className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-semibold text-slate-900">
                      {season.name} ({season.year})
                    </p>
                    <p className="text-xs text-slate-500">
                      {season.startDate}
                      {season.endDate ? ` - ${season.endDate}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {season.id === activeSeasonId ? (
                      <Button variant="outline" size="sm" disabled>
                        Active
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={busy}
                        onClick={() => setActiveSeason(season.id)}
                      >
                        Make active
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
