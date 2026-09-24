import Link from "next/link";
import { notFound } from "next/navigation";
import { EpisodeSection } from "@/components/Episode";
import { IconPlay, IconStar } from "@/components/Icons";
import {
  getDetail,
  getGenres,
  metaOf,
  sortEps,
  stripHtml,
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

function slugifyLabel(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
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
  const synopsis = stripHtml(anime.content?.rendered ?? "").trim();
  const firstEp = eps[0];
  const epCount = Number(mb.ero_episode ?? mb.ero_episodebaru ?? eps.length) || eps.length;

  let genreTerms: { id: number; name: string; slug: string }[] = [];
  try {
    genreTerms = await getGenres();
  } catch {
    genreTerms = [];
  }
  const genreById = new Map(genreTerms.map((g) => [g.id, g]));
  const linkedGenres = (anime.animegenre ?? [])
    .map((id) => genreById.get(id))
    .filter((g): g is NonNullable<typeof g> => Boolean(g));
  const fallbackGenres = linkedGenres.length
    ? []
    : (mb.ero_genreapp ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .map((name) => ({ name, slug: slugifyLabel(name) }));

  const genres = linkedGenres.length ? linkedGenres : fallbackGenres;

  return (
    <article className="detail">
      <header className="detail-hero">
        <div className="detail-poster">
          {mb.ero_image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              className="detail-cover"
              src={mb.ero_image}
              alt=""
              width={440}
              height={660}
            />
          ) : (
            <div className="detail-cover detail-cover-ph">Tanpa cover</div>
          )}
        </div>

        <div className="detail-info">
          <div className="detail-badges">
            {mb.ero_status ? (
              <span
                className={
                  mb.ero_status === "Ongoing" ? "chip chip-ongoing" : "chip chip-completed"
                }
              >
                {mb.ero_status}
              </span>
            ) : null}
            {mb.ero_type ? <span className="chip">{mb.ero_type}</span> : null}
            {mb.ero_sub ? <span className="chip">{mb.ero_sub}</span> : null}
          </div>

          <h1 className="detail-title">{title}</h1>

          <div className="detail-meta">
            {mb.ero_tayang ? <span>{mb.ero_tayang}</span> : null}
            <span>Ep {epCount}</span>
            {mb.ero_durasi ? <span>{stripHtml(mb.ero_durasi)}</span> : null}
            {mb.ero_skor ? (
              <span className="meta-item meta-score">
                <IconStar size={12} />
                {mb.ero_skor}
              </span>
            ) : null}
          </div>

          {genres.length ? (
            <div className="detail-genres">
              {genres.map((g) => (
                <Link key={g.slug} href={`/genre/${g.slug}`} className="genre-chip">
                  {g.name}
                </Link>
              ))}
            </div>
          ) : null}

          {firstEp ? (
            <div className="detail-actions">
              <Link
                href={`/play/${anime.slug}?ep=${encodeURIComponent(firstEp.ab_namaep)}`}
                className="btn-play"
              >
                <IconPlay size={14} />
                Putar Ep {firstEp.ab_namaep}
              </Link>
            </div>
          ) : null}
        </div>
      </header>

      <div className="detail-body">
        {synopsis ? (
          <section className="detail-block">
            <h2 className="section-title">Sinopsis</h2>
            <p className="detail-synopsis">{synopsis}</p>
            {mb.ero_japanese ? (
              <p className="detail-japanese">{stripHtml(mb.ero_japanese)}</p>
            ) : null}
          </section>
        ) : null}

        <section className="detail-block">
          <h2 className="section-title">Info</h2>
          <dl className="fact-list">
            {mb.ero_status ? (
              <div className="fact-row">
                <dt>Status</dt>
                <dd>{mb.ero_status}</dd>
              </div>
            ) : null}
            {mb.ero_type ? (
              <div className="fact-row">
                <dt>Tipe</dt>
                <dd>{mb.ero_type}</dd>
              </div>
            ) : null}
            {mb.ero_tayang ? (
              <div className="fact-row">
                <dt>Tayang</dt>
                <dd>{mb.ero_tayang}</dd>
              </div>
            ) : null}
            {mb.ero_durasi ? (
              <div className="fact-row">
                <dt>Durasi</dt>
                <dd>{stripHtml(mb.ero_durasi)}</dd>
              </div>
            ) : null}
            {mb.ero_japanese ? (
              <div className="fact-row">
                <dt>Judul JP</dt>
                <dd>{stripHtml(mb.ero_japanese)}</dd>
              </div>
            ) : null}
            <div className="fact-row">
              <dt>Episode</dt>
              <dd>
                {eps.length} tersedia
                {epCount !== eps.length ? ` · total ${epCount}` : ""}
              </dd>
            </div>
          </dl>
        </section>

        <section className="detail-block">
          <EpisodeSection slug={anime.slug} eps={eps} />
        </section>
      </div>
    </article>
  );
}
