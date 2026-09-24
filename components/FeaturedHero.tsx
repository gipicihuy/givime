"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  IconChevronLeft,
  IconChevronRight,
  IconPlay,
  IconStar,
} from "@/components/Icons";
import {
  episodeLabel,
  metaOf,
  synopsisOf,
  titleOf,
  type Anime,
} from "@/lib/api";

const AUTOPLAY_MS = 5000;

export function FeaturedHero({ items }: { items: Anime[] }) {
  const [i, setI] = useState(0);
  const n = items.length;
  const pausedRef = useRef(false);
  const sectionRef = useRef<HTMLElement>(null);
  const touchRef = useRef<{ x: number; y: number } | null>(null);

  const go = useCallback(
    (delta: number) => {
      if (n <= 1) return;
      setI((prev) => (prev + delta + n) % n);
    },
    [n],
  );

  useEffect(() => {
    if (n <= 1) return;
    if (typeof window === "undefined") return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    let timer: ReturnType<typeof setInterval> | null = null;

    const start = () => {
      if (timer) return;
      timer = setInterval(() => {
        if (pausedRef.current) return;
        if (document.hidden) return;
        const el = sectionRef.current;
        if (el) {
          const r = el.getBoundingClientRect();
          if (r.bottom < 0 || r.top > window.innerHeight) return;
        }
        setI((prev) => (prev + 1) % n);
      }, AUTOPLAY_MS);
    };

    const stop = () => {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    };

    start();
    const onVis = () => {
      if (document.hidden) stop();
      else start();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [n]);

  if (!n) return null;

  const anime = items[i] ?? items[0];
  const mb = metaOf(anime);
  const title = titleOf(anime);
  const cover = mb.ero_image;
  const ep = episodeLabel(anime);
  const score = mb.ero_skor;
  const status = mb.ero_status;
  const type = mb.ero_type;
  const sub = mb.ero_sub;
  const tayang = mb.ero_tayang;
  const durasi = mb.ero_durasi ? String(mb.ero_durasi).replace(/<[^>]+>/g, "").trim() : "";
  const synopsis = synopsisOf(anime, 180);
  const genres = (mb.ero_genreapp ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 3);
  const firstEps = mb.ab_cdngroup?.[0];
  const kicker =
    status?.toLowerCase() === "ongoing"
      ? "Sedang tayang"
      : status?.toLowerCase() === "completed"
        ? "Selesai tayang"
        : "Pilihan editor";

  const pause = () => {
    pausedRef.current = true;
  };
  const resume = () => {
    pausedRef.current = false;
  };

  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.changedTouches[0];
    if (!t) return;
    touchRef.current = { x: t.clientX, y: t.clientY };
    pausedRef.current = true;
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    const start = touchRef.current;
    touchRef.current = null;
    pausedRef.current = false;
    if (!start || n <= 1) return;
    const t = e.changedTouches[0];
    if (!t) return;
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy)) return;
    go(dx < 0 ? 1 : -1);
  };

  return (
    <section
      ref={sectionRef}
      className="featured"
      aria-roledescription="carousel"
      aria-label="Pilihan utama"
      onMouseEnter={pause}
      onMouseLeave={resume}
      onFocusCapture={pause}
      onBlurCapture={resume}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onTouchCancel={() => {
        touchRef.current = null;
        pausedRef.current = false;
      }}
    >
      <div className="featured-backdrop" aria-hidden>
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={cover}
            className="featured-img is-enter"
            src={cover}
            alt=""
            width={800}
            height={1200}
          />
        ) : null}
        <div className="featured-scrim" />
      </div>

      <div className="featured-body is-enter" key={anime.id}>
        <p className="featured-label">{kicker}</p>
        <h2 className="featured-title">{title}</h2>
        <div className="featured-meta">
          {status ? <span>{status}</span> : null}
          {type ? <span>{type}</span> : null}
          {sub ? <span>{sub}</span> : null}
          {ep ? <span>Ep {ep}</span> : null}
          {tayang ? <span>{tayang}</span> : null}
          {durasi ? <span>{durasi}</span> : null}
          {score ? (
            <span className="meta-item meta-score">
              <IconStar size={12} />
              {score}
            </span>
          ) : null}
        </div>
        {genres.length ? (
          <div className="featured-genres" aria-label="Genre">
            {genres.map((g) => (
              <span key={g} className="genre-chip">
                {g}
              </span>
            ))}
          </div>
        ) : null}
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

      {n > 1 ? (
        <>
          <button
            type="button"
            className="featured-nav featured-nav-prev"
            aria-label="Pilihan sebelumnya"
            onClick={() => go(-1)}
          >
            <IconChevronLeft size={20} />
          </button>
          <button
            type="button"
            className="featured-nav featured-nav-next"
            aria-label="Pilihan berikutnya"
            onClick={() => go(1)}
          >
            <IconChevronRight size={20} />
          </button>
          <div className="featured-dots" role="tablist" aria-label="Pilih pilihan">
            {items.map((a, idx) => (
              <button
                key={`${a.id}-${a.slug}`}
                type="button"
                role="tab"
                aria-selected={idx === i}
                aria-label={titleOf(a)}
                className={idx === i ? "featured-dot is-on" : "featured-dot"}
                onClick={() => setI(idx)}
              />
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}
