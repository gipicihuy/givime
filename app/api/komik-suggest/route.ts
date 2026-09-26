import { NextResponse } from "next/server";
import { fetchKomikSearch } from "@/lib/komikindo";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q") ?? "";
  if (q.trim().length < 2) {
    return NextResponse.json({ items: [] });
  }
  try {
    const items = await fetchKomikSearch(q);
    return NextResponse.json({
      items: (items ?? []).slice(0, 8).map((k) => ({
        slug: k.slug,
        title: k.title,
        cover: k.image,
        meta: [k.type, k.chapter].filter(Boolean).join(" · "),
      })),
    });
  } catch {
    return NextResponse.json({ items: [] });
  }
}
