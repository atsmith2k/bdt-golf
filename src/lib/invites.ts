import type { SupabaseClient } from "@supabase/supabase-js";
import type { OTPInvite } from "./types";

export type OtpInviteRow = {
  id: string;
  user_id: string;
  username: string;
  email?: string | null;
  otp: string;
  expires_at: string;
  consumed_at?: string | null;
  created_by: string;
  created_at: string;
};

export function mapOtpInvite(row: OtpInviteRow): OTPInvite {
  return {
    id: row.id,
    userId: row.user_id,
    username: row.username,
    email: row.email ?? undefined,
    code: row.otp,
    expiresAt: row.expires_at,
    consumedAt: row.consumed_at ?? undefined,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

export async function listOtpInvites(client: SupabaseClient): Promise<OTPInvite[]> {
  const { data, error } = await client
    .from("one_time_passwords")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  const inviteRows = (data ?? []) as OtpInviteRow[];
  return inviteRows.map(mapOtpInvite);
}
