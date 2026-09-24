import Link from "next/link";
import { type Anime, episodeLabel, metaOf, titleOf } from "@/lib/api";
import { IconPlay, IconStar } from "@/components/Icons";

export function AnimeCard({ anime }: { anime: Anime }) {
  const mb = metaOf(anime);
  const title = titleOf(anime);
  const ep = episodeLabel(anime);
  const score = mb.ero_skor;
  const cover = mb.ero_image;

  return (
    <Link href={`/anime/${anime.slug}`} className="poster">
      <div className="poster-thumb">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            className="poster-cover"
            src={cover}
            alt=""
            loading="lazy"
            width={300}
            height={450}
          />
        ) : (
          <div className="poster-placeholder">Tanpa cover</div>
        )}
        <span className="poster-fade" aria-hidden />
        {score ? (
          <span className="poster-score">
            <IconStar size={10} />
            {score}
          </span>
        ) : null}
        {ep ? <span className="poster-ep">Ep {ep}</span> : null}
        <span className="poster-badge" aria-hidden>
          <IconPlay size={14} />
        </span>
      </div>
      <span className="poster-title">{title}</span>
    </Link>
  );
}

/** Grid poster — halaman list (ongoing/completed/search/dll). */
export function AnimeGrid({ items }: { items: Anime[] }) {
  if (!items.length) {
    return (
      <div className="state">
        <strong>Belum ada judul di daftar ini</strong>
        Coba halaman lain atau ubah filter.
      </div>
    );
  }
  return (
    <div className="poster-grid">
      {items.map((a) => (
        <AnimeCard key={`${a.id}-${a.slug}`} anime={a} />
      ))}
    </div>
  );
}
