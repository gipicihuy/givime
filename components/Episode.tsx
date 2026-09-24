"use client";

import { useState } from "react";
import Link from "next/link";
import { type Episode, encodeMedia } from "@/lib/api";
import { IconPlay } from "@/components/Icons";

type Order = "asc" | "desc";

export function EpisodeSection({
  slug,
  eps,
  current,
}: {
  slug: string;
  eps: Episode[];
  current?: number;
}) {
  const [order, setOrder] = useState<Order>("asc");

  if (!eps.length) {
    return (
      <>
        <div className="section-head">
          <h2 className="section-title">Episode</h2>
        </div>
        <div className="state">
          <strong>Belum ada episode</strong>
          Daftar episode belum tersedia untuk judul ini.
        </div>
      </>
    );
  }

  const list = order === "asc" ? eps : [...eps].reverse();

  return (
    <>
      <div className="section-head">
        <h2 className="section-title">Episode</h2>
        <div className="ep-sort" role="group" aria-label="Urutkan episode">
          <button
            type="button"
            className="ep-sort-btn"
            aria-pressed={order === "asc"}
            onClick={() => setOrder("asc")}
          >
            Terlama
          </button>
          <button
            type="button"
            className="ep-sort-btn"
            aria-pressed={order === "desc"}
            onClick={() => setOrder("desc")}
          >
            Terbaru
          </button>
        </div>
      </div>

      <div className="ep-grid">
        {list.map((e) => {
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
    </>
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
