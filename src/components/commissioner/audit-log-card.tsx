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
          <p className="text-sm text-bdt-muted">
            Last 20 commissioner actions recorded for accountability.
          </p>
          {viewAllHref ? (
            <Link
              href={viewAllHref}
              className="text-sm font-semibold text-bdt-royal transition hover:text-bdt-navy"
            >
              View history
            </Link>
          ) : null}
        </div>
      </CardHeader>
      <CardContent>
        {logs.length === 0 ? (
          <p className="text-sm text-bdt-soft">No commissioner actions recorded yet.</p>
        ) : (
          <ul className="divide-y divide-[rgb(var(--bdt-royal) / 0.12)]">
            {logs.map((log) => (
              <li key={log.id} className="py-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-bdt-navy">
                    {log.eventType.replace(/_/g, " ")}
                  </span>
                  <span className="text-xs text-bdt-soft">
                    {formatDate(log.createdAt, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                  </span>
                </div>
                <p className="text-xs text-bdt-soft">
                  {log.actorName ?? "Unknown commissioner"}
                  {log.entityType ? ` - ${log.entityType} ${log.entityId ?? ""}` : ""}
                </p>
                {Object.keys(log.metadata ?? {}).length > 0 ? (
                  <pre className="mt-2 overflow-x-auto rounded-md bg-bdt-panel px-3 py-2 text-xs text-bdt-soft">
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
