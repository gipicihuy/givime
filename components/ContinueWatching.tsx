"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { IconChevronRight, IconHistory, IconPlay } from "@/components/Icons";
import { encodeMedia } from "@/lib/api";
import {
  fmtProgress,
  readHistory,
  type HistoryEntry,
} from "@/lib/history";

function hrefOf(h: HistoryEntry) {
  const base = `/play/${h.slug}?ep=${encodeURIComponent(h.ep)}`;
  return h.t && h.t > 0 ? `${base}&t=${Math.floor(h.t)}` : base;
}

/**
 * Thumb Continue Watching: coba resume frame (video di detik terakhir);
 * kalau src absen / error, fallback poster cover.
 */
function ContinueThumb({ h }: { h: HistoryEntry }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [frameFailed, setFrameFailed] = useState(false);
  const seekTo = h.t != null && Number.isFinite(h.t) && h.t > 0 ? h.t : 0;
  const useFrame = Boolean(h.src) && seekTo > 0 && !frameFailed;

  useEffect(() => {
    if (!useFrame) return;
    const v = videoRef.current;
    if (!v) return;

    const seek = () => {
      try {
        const dur = Number.isFinite(v.duration) && v.duration > 0 ? v.duration : seekTo;
        v.currentTime = Math.min(seekTo, Math.max(0, dur - 0.25));
      } catch {
        setFrameFailed(true);
      }
    };

    if (v.readyState >= 1) seek();
    else v.addEventListener("loadedmetadata", seek, { once: true });

    return () => {
      v.removeEventListener("loadedmetadata", seek);
    };
  }, [useFrame, seekTo, h.src]);

  const hasDur = h.d != null && h.d > 0;
  const cur = h.t != null && Number.isFinite(h.t) && h.t >= 0 ? h.t : 0;
  const pct = hasDur
    ? Math.min(100, Math.max(0, (cur / (h.d as number)) * 100))
    : 0;

  return (
    <span className="continue-thumb" aria-hidden>
      {useFrame && h.src ? (
        <video
          ref={videoRef}
          className="continue-frame"
          src={encodeMedia(h.src)}
          poster={h.cover}
          muted
          playsInline
          preload="metadata"
          tabIndex={-1}
          onError={() => setFrameFailed(true)}
        />
      ) : null}
      {!useFrame && h.cover ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={h.cover} alt="" loading="lazy" width={480} height={270} />
      ) : null}
      <span className="continue-play">
        <IconPlay size={14} />
      </span>
      {hasDur ? (
        <span className="continue-bar">
          <span className="continue-bar-fill" style={{ width: `${pct}%` }} />
        </span>
      ) : null}
    </span>
  );
}

/**
 * Rail "Lanjutkan menonton" — layout beda dari Shelf:
 * kartu landscape 16:9 + progress bar + jam tonton (bukan poster 2:3).
 * Posisi: setelah hero (ala nontonime). Auto-hide kalau kosong.
 */
export function ContinueWatching() {
  const [items, setItems] = useState<HistoryEntry[] | null>(null);

  useEffect(() => {
    setItems(readHistory());
    const onUpdate = () => setItems(readHistory());
    window.addEventListener("givime:history-updated", onUpdate);
    return () => window.removeEventListener("givime:history-updated", onUpdate);
  }, []);

  if (!items?.length) return null;

  return (
    <section className="section continue-section">
      <div className="section-head">
        <h2 className="section-title continue-title-head">
          <span className="continue-head-icon" aria-hidden>
            <IconHistory size={18} />
          </span>
          Lanjutkan menonton
        </h2>
        <Link href="/history" className="section-more">
          History
          <IconChevronRight size={14} />
        </Link>
      </div>
      <div className="continue-rail" tabIndex={0} aria-label="Geser lanjutkan menonton">
        {items.map((h) => {
          const prog = fmtProgress(h.t, h.d);
          return (
            <Link key={`${h.slug}-${h.ep}`} href={hrefOf(h)} className="continue-card">
              <ContinueThumb h={h} />
              <span className="continue-title">{h.title}</span>
              <span className="continue-meta">
                Ep {h.ep}
                {prog ? <span className="continue-time"> · {prog}</span> : null}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
