import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import type { AuditLogEntry } from "@/lib/types";

import Link from "next/link";

interface AuditLogCardProps {
  logs: AuditLogEntry[];
  viewAllHref?: string;
}

export function AuditLogCard({ logs, viewAllHref }: AuditLogCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Audit log</CardTitle>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500">
            Last 20 commissioner actions recorded for accountability.
          </p>
          {viewAllHref ? (
            <Link href={viewAllHref} className="text-sm font-semibold text-slate-900">
              View history
            </Link>
          ) : null}
        </div>
      </CardHeader>
      <CardContent>
        {logs.length === 0 ? (
          <p className="text-sm text-slate-500">No commissioner actions recorded yet.</p>
        ) : (
          <ul className="divide-y divide-slate-200">
            {logs.map((log) => (
              <li key={log.id} className="py-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-900">
                    {log.eventType.replace(/_/g, " ")}
                  </span>
                  <span className="text-xs text-slate-500">
                    {formatDate(log.createdAt, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  {log.actorName ?? "Unknown commissioner"}
                  {log.entityType ? ` · ${log.entityType} ${log.entityId ?? ""}` : ""}
                </p>
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
  );
}
