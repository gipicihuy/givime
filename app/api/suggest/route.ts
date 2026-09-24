import { NextResponse } from "next/server";
import { suggestAnime } from "@/lib/api";

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q") ?? "";
  if (q.trim().length < 2) {
    return NextResponse.json({ items: [] });
  }
  const items = await suggestAnime(q, 8);
  return NextResponse.json({ items });
}
