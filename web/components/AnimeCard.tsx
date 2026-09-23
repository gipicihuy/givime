import Link from "next/link";
import {
  type Anime,
  episodeLabel,
  metaOf,
  titleOf,
} from "@/lib/api";

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
    <Link href={`/anime/${anime.slug}`} className="card">
      {cover ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          className="card-cover"
          src={cover}
          alt=""
          loading="lazy"
          width={300}
          height={450}
        />
      ) : (
        <div className="card-cover-placeholder">Tanpa cover</div>
      )}
      <div className="card-body">
        <span className="card-title">{title}</span>
        <div className="card-meta">
          {status ? <span className={statusClass(status)}>{status}</span> : null}
          <span>Ep {ep}</span>
          {score ? <span>★ {score}</span> : null}
        </div>
      </div>
    </Link>
  );
}

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
    <div className="card-grid">
      {items.map((a) => (
        <AnimeCard key={`${a.id}-${a.slug}`} anime={a} />
      ))}
    </div>
  );
}
