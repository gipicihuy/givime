import Link from "next/link";
import { type Anime, episodeLabel, metaOf, titleOf } from "@/lib/api";
import { IconPlay, IconStar } from "@/components/Icons";

function statusClass(status?: string) {
  if (!status) return "chip";
  const s = status.toLowerCase();
  if (s === "ongoing") return "chip chip-ongoing";
  if (s === "completed") return "chip chip-completed";
  return "chip";
}

export function AnimeCard({ anime }: { anime: Anime }) {
  const mb = metaOf(anime);
  const title = titleOf(anime);
  const status = mb.ero_status;
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
        <span className="poster-badge" aria-hidden>
          <IconPlay size={14} />
        </span>
        {status ? <span className={`poster-status ${statusClass(status)}`}>{status}</span> : null}
      </div>
      <span className="poster-title">{title}</span>
      <span className="poster-meta">
        <span className="meta-item">
          Ep {ep}
        </span>
        {score ? (
          <span className="meta-item meta-score">
            <IconStar size={11} />
            {score}
          </span>
        ) : null}
      </span>
    </Link>
  );
}

/** Rail horizontal — scroll ke kanan (home sections). */
export function AnimeRail({ items }: { items: Anime[] }) {
  if (!items.length) {
    return (
      <div className="state">
        <strong>Belum ada judul</strong>
        Coba lagi nanti.
      </div>
    );
  }
  return (
    <div className="rail" tabIndex={0} aria-label="Geser ke kanan">
      {items.map((a) => (
        <AnimeCard key={`${a.id}-${a.slug}`} anime={a} />
      ))}
    </div>
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
