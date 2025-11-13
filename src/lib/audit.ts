import type { AuditLogEntry } from "./types";

export type AuditLogRow = {
  id: string;
  actor_id?: string | null;
  event_type: string;
  entity_type: string;
  entity_id?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;
  actor?: {
    id: string;
    display_name?: string | null;
  } | null;
};

export function mapAuditLog(row: AuditLogRow): AuditLogEntry {
  return {
    id: row.id,
    actorId: row.actor_id ?? undefined,
    actorName: row.actor?.display_name ?? undefined,
    eventType: row.event_type,
    entityType: row.entity_type,
    entityId: row.entity_id ?? undefined,
    metadata: (row.metadata ?? {}) as Record<string, unknown>,
    createdAt: row.created_at,
  };
}

