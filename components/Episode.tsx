"use client";

import { useEffect, useRef, useState } from "react";
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
  initialTime = 0,
  onProgress,
}: {
  src: string;
  animeTitle: string;
  episode: string;
  initialTime?: number;
  onProgress?: (t: number, d: number) => void;
}) {
  const playable = encodeMedia(src);
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastSave = useRef(0);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (initialTime > 0) {
      const seek = () => {
        try {
          v.currentTime = initialTime;
        } catch {
          /* ignore */
        }
      };
      if (v.readyState >= 1) seek();
      else v.addEventListener("loadedmetadata", seek, { once: true });
      return () => v.removeEventListener("loadedmetadata", seek);
    }
  }, [initialTime, playable]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v || !onProgress) return;

    const save = () => {
      const d = v.duration;
      if (!Number.isFinite(d) || d <= 0) return;
      onProgress(Math.floor(v.currentTime), Math.floor(d));
    };

    const onTime = () => {
      const now = Date.now();
      if (now - lastSave.current < 4000) return;
      lastSave.current = now;
      save();
    };

    v.addEventListener("timeupdate", onTime);
    v.addEventListener("pause", save);
    v.addEventListener("ended", save);
    window.addEventListener("beforeunload", save);
    return () => {
      save();
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("pause", save);
      v.removeEventListener("ended", save);
      window.removeEventListener("beforeunload", save);
    };
  }, [onProgress, playable]);

  return (
    <div className="player-wrap">
      {/* URL CDN hanya di src — jangan ditampilkan ke UI */}
      <video
        ref={videoRef}
        controls
        playsInline
        preload="metadata"
        key={playable}
        src={playable}
      />
      <div className="player-bar">
        <span>
          {animeTitle} · Ep {episode}
        </span>
      </div>
    </div>
  );
}
