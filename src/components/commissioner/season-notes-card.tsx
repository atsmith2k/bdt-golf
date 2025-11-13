"use client";

import * as React from "react";
import { ClipboardList } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

export function SeasonNotesCard() {
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

