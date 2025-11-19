import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createServiceSupabaseClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const supabase = createServerSupabaseClient();
    const { data: sessionData, error: sessionError } = await supabase.auth.getUser();
    if (sessionError) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }
    const user = sessionData.user;
    if (!user) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const form = await request.formData();
    const file = form.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "File is required" }, { status: 400 });
    }

    // Build a safe path using the user id
    const filename = `${Date.now()}-${String(file.name).replace(/[^a-zA-Z0-9.-_]/g, "_")}`;
    const path = `avatars/${user.id}/${filename}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, buffer, { contentType: file.type, upsert: true });

    if (uploadError) {
      console.error("avatar upload error", uploadError);
      return NextResponse.json({ error: "Upload failed" }, { status: 500 });
    }

    // Update user's avatar_url to the storage path
    const { error: updateError } = await supabase.from("users").update({ avatar_url: path }).eq("id", user.id);
    if (updateError) {
      console.error("failed to update user avatar_url", updateError);
    }

    // Create a short-lived signed url for immediate use
    let signedUrl: string | null = null;
    try {
      const service = createServiceSupabaseClient();
      const { data: signedData, error: signedError } = await service.storage.from("avatars").createSignedUrl(path, 60 * 60);
      if (!signedError && signedData?.signedUrl) {
        signedUrl = signedData.signedUrl;
      }
    } catch (err) {
      // ignore
    }

    return NextResponse.json({ path, signedUrl });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
