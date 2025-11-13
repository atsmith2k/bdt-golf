'use client';

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { formatDate } from "@/lib/utils";
import type { AuditLogEntry } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface AuditLogViewerProps {
  logs: AuditLogEntry[];
  initialFilters: {
    entityType?: string;
    from?: string;
    to?: string;
    limit?: number;
  };
}

export function AuditLogViewer({ logs, initialFilters }: AuditLogViewerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [entityType, setEntityType] = React.useState(initialFilters.entityType ?? "");
  const [from, setFrom] = React.useState(initialFilters.from ?? "");
  const [to, setTo] = React.useState(initialFilters.to ?? "");
  const [limit, setLimit] = React.useState(String(initialFilters.limit ?? 50));

  const handleSubmit = React.useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const params = new URLSearchParams(searchParams?.toString() ?? "");
      if (entityType) {
        params.set("entityType", entityType);
      } else {
        params.delete("entityType");
      }
      if (from) {
        params.set("from", from);
      } else {
        params.delete("from");
      }
      if (to) {
        params.set("to", to);
      } else {
        params.delete("to");
      }
      if (limit) {
        params.set("limit", limit);
      } else {
        params.delete("limit");
      }
      router.replace(`/app/commissioner/audit?${params.toString()}`);
    },
    [entityType, from, to, limit, router, searchParams],
  );

  return (
    <div className="space-y-6">
      <form
        onSubmit={handleSubmit}
        className="grid gap-4 rounded-lg border border-slate-200 bg-white px-4 py-4 sm:grid-cols-2 lg:grid-cols-5"
      >
        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          Entity type
          <Input
            value={entityType}
            onChange={(event) => setEntityType(event.target.value)}
            placeholder="team, user, match…"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          From
          <Input
            type="datetime-local"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          To
          <Input
            type="datetime-local"
            value={to}
            onChange={(event) => setTo(event.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          Limit
          <Input
            type="number"
            min={1}
            max={200}
            value={limit}
            onChange={(event) => setLimit(event.target.value)}
          />
        </label>
        <div className="flex items-end justify-end">
          <Button type="submit">Apply filters</Button>
        </div>
      </form>

      <Card>
        <CardHeader>
          <CardTitle>Audit events</CardTitle>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <p className="text-sm text-slate-500">No audit events matched the filters.</p>
          ) : (
            <ul className="divide-y divide-slate-200">
              {logs.map((log) => (
                <li key={log.id} className="py-3 text-sm">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-semibold text-slate-900">
                        {log.eventType.replace(/_/g, " ")}
                      </p>
                      <p className="text-xs text-slate-500">
                        {log.actorName ?? "Unknown commissioner"}
                        {log.entityType ? ` · ${log.entityType} ${log.entityId ?? ""}` : ""}
                      </p>
                    </div>
                    <span className="text-xs text-slate-500">
                      {formatDate(log.createdAt, {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  {Object.keys(log.metadata ?? {}).length > 0 ? (
                    <pre className="mt-2 overflow-x-auto rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-600">
                      {JSON.stringify(log.metadata, null, 2)}
                    </pre>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
