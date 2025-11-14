import { NextRequest, NextResponse } from "next/server";
import { getMatchDetail } from "@/lib/queries";

const UUID_REGEX = /^[0-9a-fA-F-]{32,36}$/;

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  if (!id || !UUID_REGEX.test(id)) {
    return NextResponse.json({ error: "Match not found." }, { status: 404 });
  }

  const match = await getMatchDetail(id);

  if (!match) {
    return NextResponse.json({ error: "Match not found." }, { status: 404 });
  }

  return NextResponse.json(match);
}

