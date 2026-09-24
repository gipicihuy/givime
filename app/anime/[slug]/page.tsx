import Link from "next/link";
import { notFound } from "next/navigation";
import { EpisodeGrid } from "@/components/Episode";
import {
  getDetail,
  metaOf,
  sortEps,
  stripHtml,
  synopsisOf,
  titleOf,
} from "@/lib/api";

export const revalidate = 3600;

type Params = { slug: string };

export async function generateMetadata({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  try {
    const a = await getDetail(slug);
    if (!a) return { title: "Anime" };
    return { title: titleOf(a) };
  } catch {
    return { title: "Anime" };
  }
}

export default async function AnimeDetailPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  let anime = null;
  try {
    anime = await getDetail(slug);
  } catch {
    anime = null;
  }
  if (!anime) notFound();

  const mb = metaOf(anime);
  const eps = sortEps(mb.ab_cdngroup ?? []);
  const title = titleOf(anime);
  const synopsis = synopsisOf(anime, 400);
  const firstEp = eps[0];

  return (
    <article className="detail-layout">
      <div>
        {mb.ero_image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="detail-cover" src={mb.ero_image} alt="" width={440} height={660} />
        ) : (
          <div className="card-cover-placeholder" style={{ borderRadius: 8, maxWidth: 220 }}>
            Tanpa cover
          </div>
        )}
      </div>

      <div>
        <h1 className="detail-title">{title}</h1>
        <div className="detail-meta">
          {mb.ero_status ? (
            <span className={mb.ero_status === "Ongoing" ? "chip chip-ongoing" : "chip"}>
              {mb.ero_status}
            </span>
          ) : null}
          {mb.ero_type ? <span>{mb.ero_type}</span> : null}
          {mb.ero_tayang ? <span>{mb.ero_tayang}</span> : null}
          <span>Ep {String(mb.ero_episode ?? mb.ero_episodebaru ?? eps.length)}</span>
          {mb.ero_skor ? <span>★ {mb.ero_skor}</span> : null}
          {mb.ero_sub ? <span>{mb.ero_sub}</span> : null}
        </div>

        {synopsis ? <p className="detail-synopsis">{synopsis}</p> : null}

        <div className="meta-table">
          {mb.ero_japanese ? (
            <div className="meta-row">
              <span className="meta-key">Japanese</span>
              <span>{stripHtml(mb.ero_japanese)}</span>
            </div>
          ) : null}
          {mb.ero_durasi ? (
            <div className="meta-row">
              <span className="meta-key">Durasi</span>
              <span>{mb.ero_durasi}</span>
            </div>
          ) : null}
          {mb.ero_genreapp ? (
            <div className="meta-row">
              <span className="meta-key">Genre</span>
              <span>{mb.ero_genreapp}</span>
            </div>
          ) : null}
          <div className="meta-row">
            <span className="meta-key">Episode</span>
            <span>{eps.length} tersedia di CDN</span>
          </div>
        </div>

        {firstEp ? (
          <p style={{ marginBottom: 20 }}>
            <Link href={`/play/${anime.slug}?ep=${encodeURIComponent(firstEp.ab_namaep)}`} className="ep-link">
              ▶ Putar Ep {firstEp.ab_namaep}
            </Link>
          </p>
        ) : null}

        <section className="section" style={{ marginBottom: 0 }}>
          <div className="section-head">
            <h2 className="section-title">Daftar episode</h2>
          </div>
          <EpisodeGrid slug={anime.slug} eps={eps} />
        </section>
      </div>
    </article>
  );
}
