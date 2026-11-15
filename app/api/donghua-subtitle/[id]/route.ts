import { fetchSubtitleVtt } from "@/lib/dongha";

export const dynamic = "force-dynamic";

type Params = { id: string };

export async function GET(_request: Request, { params }: { params: Promise<Params> }) {
  const { id } = await params;
  try {
    const text = await fetchSubtitleVtt(id);
    return new Response(text, {
      headers: {
        "content-type": "text/vtt; charset=utf-8",
        "cache-control": "public, max-age=3600",
      },
    });
  } catch {
    return new Response("WEBVTT\n\n", {
      status: 404,
      headers: { "content-type": "text/vtt; charset=utf-8" },
    });
  }
}
