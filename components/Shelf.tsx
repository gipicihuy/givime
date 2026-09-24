"use client";

import Link from "next/link";
import { useRef } from "react";
import { AnimeCard } from "@/components/AnimeCard";
import { IconChevronLeft, IconChevronRight } from "@/components/Icons";
import type { Anime } from "@/lib/api";

export function Shelf({
  title,
  href,
  items,
}: {
  title: string;
  href?: string;
  items: Anime[];
}) {
  const railRef = useRef<HTMLDivElement>(null);

  if (!items.length) return null;

  function scroll(dir: -1 | 1) {
    const el = railRef.current;
    if (!el) return;
    const step = Math.min(480, Math.max(280, el.clientWidth * 0.75));
    el.scrollBy({ left: dir * step, behavior: "smooth" });
  }

  return (
    <section className="section">
      <div className="section-head">
        <h2 className="section-title">{title}</h2>
        <div className="section-actions">
          {href ? (
            <Link href={href} className="section-more">
              Lihat semua
              <IconChevronRight size={14} />
            </Link>
          ) : null}
          <button
            type="button"
            className="rail-btn"
            aria-label="Geser ke kiri"
            onClick={() => scroll(-1)}
          >
            <IconChevronLeft size={16} />
          </button>
          <button
            type="button"
            className="rail-btn"
            aria-label="Geser ke kanan"
            onClick={() => scroll(1)}
          >
            <IconChevronRight size={16} />
          </button>
        </div>
      </div>
      <div className="rail" ref={railRef} tabIndex={0} aria-label={`Geser ${title}`}>
        {items.map((a) => (
          <AnimeCard key={`${a.id}-${a.slug}`} anime={a} />
        ))}
      </div>
    </section>
  );
}
