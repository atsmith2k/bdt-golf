import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function requireCommissioner() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) } as const;
  }

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("id, role, display_name")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile) {
    return { error: NextResponse.json({ error: "Unable to load commissioner profile." }, { status: 403 }) } as const;
  }

  if (profile.role !== "commissioner") {
    return { error: NextResponse.json({ error: "Commissioner role required." }, { status: 403 }) } as const;
  }

  return { commissionerId: profile.id, commissionerName: profile.display_name ?? undefined } as const;
}

