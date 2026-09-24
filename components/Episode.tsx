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
  current?: string;
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
        <button
          type="button"
          className="ep-sort-btn"
          aria-pressed={order === "desc"}
          onClick={() => setOrder(order === "asc" ? "desc" : "asc")}
        >
          Terbaru
        </button>
      </div>

      <div className="ep-grid">
        {list.map((e, i) => {
          const label = String(e.ab_namaep);
          const active = current != null && label === String(current);
          return (
            <Link
              key={`${i}-${label}`}
              href={`/play/${slug}?ep=${encodeURIComponent(label)}`}
              className="ep-link"
              aria-current={active ? "page" : undefined}
            >
              {active ? <IconPlay size={11} /> : null}
              {label}
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
