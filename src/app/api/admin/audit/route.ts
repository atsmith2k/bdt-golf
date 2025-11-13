import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { mapAuditLog, type AuditLogRow } from "@/lib/audit";
import { requireCommissioner } from "../utils";

export async function GET(request: Request) {
  const commissionerResult = await requireCommissioner();
  if ("error" in commissionerResult) {
    return commissionerResult.error;
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(
    200,
    Math.max(1, Number.parseInt(searchParams.get("limit") ?? "50", 10) || 50),
  );
  const entityType = searchParams.get("entityType")?.trim() || undefined;
  const startDate = searchParams.get("from")?.trim() || undefined;
  const endDate = searchParams.get("to")?.trim() || undefined;

  const supabase = createServerSupabaseClient();
  let query = supabase
    .from("audit_logs")
    .select("*, actor:users!audit_logs_actor_id_fkey(id, display_name)")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (entityType) {
    query = query.eq("entity_type", entityType);
  }
  if (startDate) {
    query = query.gte("created_at", startDate);
  }
  if (endDate) {
    query = query.lte("created_at", endDate);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[admin.audit] fetch error", error);
    return NextResponse.json({ error: "Failed to load audit logs." }, { status: 500 });
  }

  const logs = (data ?? []).map((row) => mapAuditLog(row as AuditLogRow));

  return NextResponse.json({ logs });
}

