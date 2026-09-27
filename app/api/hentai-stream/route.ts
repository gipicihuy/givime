import { NextResponse } from "next/server";
import { fetchHentaiDetail, resolveHentaiStream } from "@/lib/ryukomik";

export const dynamic = "force-dynamic";

/**
 * Resolve stream buat tombol "server lain" di player.
 * GET /api/hentai-stream?slug=episode/…&skip=0,1
 * `skip` = index server yang udah dicoba browser biar gak muter di server sama.
 */
export async function GET(request: Request) {
  const sp = new URL(request.url).searchParams;
  const slug = (sp.get("slug") ?? "").trim();
  if (!slug) return NextResponse.json({ ok: false, error: "slug kosong" }, { status: 400 });

  const skip = (sp.get("skip") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s !== "")
    .map(Number)
    .filter((n) => Number.isInteger(n) && n >= 0);

  try {
    const detail = await fetchHentaiDetail(slug);
    if (!detail) return NextResponse.json({ ok: false, error: "gak ketemu" }, { status: 404 });

    const stream = await resolveHentaiStream(detail, { skip });
    if (!stream) {
      return NextResponse.json({ ok: false, error: "server habis", servers: detail.streams.length });
    }
    return NextResponse.json({ ok: true, stream, servers: detail.streams.length });
  } catch {
    return NextResponse.json({ ok: false, error: "gagal" }, { status: 500 });
  }
}
