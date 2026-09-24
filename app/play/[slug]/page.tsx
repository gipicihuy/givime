import Link from "next/link";
import { notFound } from "next/navigation";
import { EpisodeGrid, VideoPlayer } from "@/components/Episode";
import { IconChevronLeft, IconClock } from "@/components/Icons";
import { encodeMedia, getEpisodes, titleOf } from "@/lib/api";

export const dynamic = "force-dynamic";
export const metadata = { title: "Putar" };

type Params = { slug: string };
type SP = { ep?: string };

export default async function PlayPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<SP>;
}) {
  const { slug } = await params;
  const sp = await searchParams;

  let data: Awaited<ReturnType<typeof getEpisodes>> | null = null;
  try {
    data = await getEpisodes(slug);
  } catch {
    data = null;
  }
  if (!data?.anime) notFound();

  const { anime, eps } = data;

  const title = titleOf(anime);
  const requested = sp.ep;
  const target =
    (requested && eps.find((e) => String(e.ab_namaep) === String(requested))) ||
    eps[0];

  if (!target) {
    return (
      <>
        <h1 className="page-title">{title}</h1>
        <div className="state">
          <strong>Belum ada episode</strong>
          <Link href={`/anime/${slug}`}>Kembali ke detail</Link>
        </div>
      </>
    );
  }

  const playable = encodeMedia(target.ab_linkcdn);

  return (
    <>
      <p style={{ marginBottom: 12, fontSize: 14 }}>
        <Link href={`/anime/${slug}`} className="muted meta-item">
          <IconChevronLeft size={14} />
          {title}
        </Link>
      </p>

      <VideoPlayer src={target.ab_linkcdn} animeTitle={title} episode={String(target.ab_namaep)} />

      <section className="section">
        <div className="section-head">
          <h2 className="section-title">Episode</h2>
          <span className="section-more meta-item">
            <IconClock size={13} />
            {eps.length} total
          </span>
        </div>
        <EpisodeGrid slug={slug} eps={eps} current={Number(target.ab_namaep)} />
      </section>

      <p className="muted" style={{ fontSize: 13, wordBreak: "break-all" }}>
        Source: {playable.slice(0, 80)}
        {playable.length > 80 ? "…" : ""}
      </p>
    </>
  );
}
