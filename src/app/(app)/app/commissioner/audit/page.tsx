import { getAuditLogs } from "@/lib/queries";
import { AuditLogViewer } from "@/components/commissioner/audit-log-viewer";

export const dynamic = "force-dynamic";

type SearchParams = {
  entityType?: string;
  from?: string;
  to?: string;
  limit?: string;
};

export default async function AuditLogPage({ searchParams }: { searchParams: SearchParams }) {
  const entityType = searchParams.entityType?.trim() || undefined;
  const from = searchParams.from?.trim() || undefined;
  const to = searchParams.to?.trim() || undefined;
  const limitParam = Number.parseInt(searchParams.limit ?? "", 10);
  const limit = Number.isFinite(limitParam) ? limitParam : undefined;

  const logs = await getAuditLogs({
    entityType,
    startDate: from,
    endDate: to,
    limit,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-bdt-navy">Audit log</h1>
        <p className="text-sm text-bdt-muted">
          Filter commissioner activity by entity type or date range to investigate changes.
        </p>
      </div>
      <AuditLogViewer
        logs={logs}
        initialFilters={{
          entityType,
          from,
          to,
          limit,
        }}
      />
    </div>
  );
}

