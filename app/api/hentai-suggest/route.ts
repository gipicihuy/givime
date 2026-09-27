import { NextResponse } from "next/server";
import { fetchHentaiSearch } from "@/lib/ryukomik";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q") ?? "";
  if (q.trim().length < 2) {
    return NextResponse.json({ items: [] });
  }
  try {
    const items = await fetchHentaiSearch(q);
    return NextResponse.json({
      items: (items ?? []).slice(0, 8).map((k) => ({
        slug: k.slug,
        title: k.title,
        cover: k.thumb,
        meta: k.date || (k.ep != null ? `EP ${k.ep}` : "18+"),
      })),
    });
  } catch {
    return NextResponse.json({ items: [] });
  }
}
