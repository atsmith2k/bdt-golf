"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Season } from "@/lib/types";

type MessageState = { type: "success" | "error"; text: string } | null;

interface AnnouncementComposerProps {
  seasons: Season[];
  defaultSeasonId: string | null;
}

export function AnnouncementComposer({ seasons, defaultSeasonId }: AnnouncementComposerProps) {
  const [title, setTitle] = React.useState("");
  const [body, setBody] = React.useState("");
  const [seasonId, setSeasonId] = React.useState(
    () => defaultSeasonId ?? seasons[0]?.id ?? "",
  );
  const [pinned, setPinned] = React.useState(false);
  const [previewMode, setPreviewMode] = React.useState(false);
  const [message, setMessage] = React.useState<MessageState>(null);
  const [busy, setBusy] = React.useState(false);

  const hasSeasons = seasons.length > 0;
  const canPublish = hasSeasons && seasonId && title.trim().length > 0 && body.trim().length > 0;

  async function handlePublish() {
    if (!canPublish) return;
    setBusy(true);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          body: body.trim(),
          seasonId,
          pinned,
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const errorText =
          typeof payload.error === "string" ? payload.error : "Failed to publish announcement.";
        setMessage({ type: "error", text: errorText });
        return;
      }

      setMessage({ type: "success", text: "Announcement published." });
      setTitle("");
      setBody("");
      setPinned(false);
      setPreviewMode(false);
    } catch (publishError) {
      console.error("[announcement-composer] publish error", publishError);
      setMessage({ type: "error", text: "Unexpected error while publishing announcement." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <CardContent className="space-y-4">
      {message ? (
        <p
          className={`text-sm ${
            message.type === "success" ? "text-emerald-600" : "text-red-600"
          }`}
        >
          {message.text}
        </p>
      ) : null}

      {hasSeasons ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
            Season
            <select
              value={seasonId}
              onChange={(event) => setSeasonId(event.target.value)}
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/30"
            >
              {seasons.map((season) => (
                <option key={season.id} value={season.id}>
                  {season.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
            Title
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="League update"
              required
            />
          </label>
        </div>
      ) : (
        <p className="text-sm text-slate-500">
          Create a season before publishing announcements.
        </p>
      )}

      <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
        Message
        <Textarea
          rows={5}
          placeholder="Reminder: submit week 4 scores by Friday..."
          value={body}
          onChange={(event) => setBody(event.target.value)}
        />
      </label>

      <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
        <input
          type="checkbox"
          checked={pinned}
          onChange={(event) => setPinned(event.target.checked)}
          className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900/40"
        />
        Pin to top of announcements
      </label>

      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => setPreviewMode((value) => !value)}
          disabled={!body.trim()}
        >
          {previewMode ? "Hide preview" : "Preview"}
        </Button>
        <Button type="button" onClick={handlePublish} disabled={!canPublish || busy}>
          {busy ? "Publishing..." : "Publish"}
        </Button>
      </div>

      {previewMode ? (
        <div className="rounded-md border border-slate-200 bg-white px-4 py-3">
          <h3 className="text-base font-semibold text-slate-900">{title || "Untitled"}</h3>
          <p className="mt-2 whitespace-pre-line text-sm text-slate-600">{body}</p>
          {pinned ? (
            <span className="mt-3 inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-amber-700">
              Pinned
            </span>
          ) : null}
        </div>
      ) : null}
    </CardContent>
  );
}

