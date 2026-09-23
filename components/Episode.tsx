import Link from "next/link";
import { type Episode, encodeMedia } from "@/lib/api";

export function EpisodeGrid({
  slug,
  eps,
  current,
}: {
  slug: string;
  eps: Episode[];
  current?: number;
}) {
  if (!eps.length) {
    return (
      <div className="state">
        <strong>Belum ada episode</strong>
        Sumber belum mengisi daftar CDN untuk judul ini.
      </div>
    );
  }
  return (
    <div className="ep-grid">
      {eps.map((e) => {
        const n = Number(e.ab_namaep);
        const active = current != null && n === current;
        return (
          <Link
            key={e.ab_namaep}
            href={`/play/${slug}?ep=${encodeURIComponent(e.ab_namaep)}`}
            className="ep-link"
            aria-current={active ? "page" : undefined}
          >
            {e.ab_namaep}
          </Link>
        );
      })}
    </div>
  );
}

export function VideoPlayer({
  src,
  animeTitle,
  episode,
}: {
  src: string;
  animeTitle: string;
  episode: string;
}) {
  const playable = encodeMedia(src);
  return (
    <div>
      <div className="player-wrap">
        <video controls playsInline preload="metadata" key={playable} src={playable} />
        <div className="player-bar">
          <span>
            {animeTitle} · Ep {episode}
          </span>
          <a href={playable} target="_blank" rel="noreferrer" className="muted">
            Buka di tab baru
          </a>
        </div>
      </div>
    </div>
  );
}
