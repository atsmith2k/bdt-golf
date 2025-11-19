import { NextResponse } from "next/server";
import { createServiceSupabaseClient } from "@/lib/supabase/service";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const path = body?.path;
    if (!path || typeof path !== "string") {
      return NextResponse.json({ error: "Path required." }, { status: 400 });
    }

    const client = createServiceSupabaseClient();
    const { data, error } = await client.storage.from("avatars").createSignedUrl(path, 60 * 60);
    if (error || !data?.signedUrl) {
      console.error("signed-url error", error);
      return NextResponse.json({ error: "Unable to create signed url." }, { status: 500 });
    }

    return NextResponse.json({ signedUrl: data.signedUrl });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
}
