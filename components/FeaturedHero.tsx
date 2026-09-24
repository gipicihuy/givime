import Link from "next/link";
import { IconPlay, IconStar } from "@/components/Icons";
import {
  episodeLabel,
  metaOf,
  synopsisOf,
  titleOf,
  type Anime,
} from "@/lib/api";

export function FeaturedHero({ anime }: { anime: Anime }) {
  const mb = metaOf(anime);
  const title = titleOf(anime);
  const cover = mb.ero_image;
  const ep = episodeLabel(anime);
  const score = mb.ero_skor;
  const status = mb.ero_status;
  const type = mb.ero_type;
  const synopsis = synopsisOf(anime, 160);
  const firstEps = mb.ab_cdngroup?.[0];

  return (
    <section className="featured" aria-label="Pilihan utama">
      <div className="featured-backdrop" aria-hidden>
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} alt="" width={800} height={1200} />
        ) : null}
        <div className="featured-scrim" />
      </div>
      <div className="featured-body">
        <p className="featured-kicker">Pilihan utama</p>
        <h2 className="featured-title">{title}</h2>
        <div className="featured-meta">
          {status ? <span>{status}</span> : null}
          {type ? <span>{type}</span> : null}
          {ep ? <span>Ep {ep}</span> : null}
          {score ? (
            <span className="meta-item meta-score">
              <IconStar size={12} />
              {score}
            </span>
          ) : null}
        </div>
        {synopsis ? <p className="featured-syn">{synopsis}</p> : null}
        <div className="featured-actions">
          <Link
            href={
              firstEps
                ? `/play/${anime.slug}?ep=${encodeURIComponent(firstEps.ab_namaep)}`
                : `/anime/${anime.slug}`
            }
            className="btn-play"
          >
            <IconPlay size={14} />
            Putar
          </Link>
          <Link href={`/anime/${anime.slug}`} className="featured-link">
            Detail
          </Link>
        </div>
      </div>
    </section>
  );
}
