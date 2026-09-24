import Link from "next/link";
import { type Episode, encodeMedia } from "@/lib/api";
import { IconPlay } from "@/components/Icons";

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
        Daftar episode belum tersedia untuk judul ini.
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
            {active ? <IconPlay size={11} /> : null}
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
    <div className="player-wrap">
      {/* URL CDN hanya di src — jangan ditampilkan ke UI */}
      <video controls playsInline preload="metadata" key={playable} src={playable} />
      <div className="player-bar">
        <span>
          {animeTitle} · Ep {episode}
        </span>
      </div>
    </div>
  );
}
