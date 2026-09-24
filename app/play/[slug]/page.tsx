import Link from "next/link";
import { notFound } from "next/navigation";
import { EpisodeSection, VideoPlayer } from "@/components/Episode";
import { HistoryTracker } from "@/components/HistoryTracker";
import { IconChevronLeft } from "@/components/Icons";
import { getEpisodes, metaOf, titleOf } from "@/lib/api";

export const dynamic = "force-dynamic";
export const metadata = { title: "Putar" };

type Params = { slug: string };
type SP = { ep?: string; t?: string };

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

  const initialTime = Math.max(0, Number(sp.t) || 0);

  return (
    <>
      <HistoryTracker
        slug={anime.slug}
        title={title}
        ep={String(target.ab_namaep)}
        cover={metaOf(anime).ero_image}
        t={initialTime || undefined}
      />
      <p style={{ marginBottom: 12, fontSize: 14 }}>
        <Link href={`/anime/${slug}`} className="muted meta-item">
          <IconChevronLeft size={14} />
          {title}
        </Link>
      </p>

      <VideoPlayer
        src={target.ab_linkcdn}
        animeTitle={title}
        episode={String(target.ab_namaep)}
        slug={anime.slug}
        initialTime={initialTime}
      />

      <section className="section">
        <EpisodeSection slug={slug} eps={eps} current={String(target.ab_namaep)} />
      </section>
    </>
  );
}
