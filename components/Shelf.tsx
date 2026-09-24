"use client";

import Link from "next/link";
import { useRef } from "react";
import { AnimeCard } from "@/components/AnimeCard";
import { IconChevronRight } from "@/components/Icons";
import type { Anime } from "@/lib/api";

export function Shelf({
  title,
  href,
  items,
  index,
}: {
  title: string;
  href?: string;
  items: Anime[];
  index?: number;
}) {
  const railRef = useRef<HTMLDivElement>(null);

  if (!items.length) return null;

  const num =
    index != null && Number.isFinite(index)
      ? String(index).padStart(2, "0")
      : null;

  return (
    <section className="section">
      <div className="section-head">
        <h2 className="section-title">
          {num ? <span className="section-num">{num}</span> : null}
          {title}
        </h2>
        {href ? (
          <Link href={href} className="section-more">
            Lihat semua
            <IconChevronRight size={14} />
          </Link>
        ) : null}
      </div>
      <div className="rail" ref={railRef} tabIndex={0} aria-label={`Geser ${title}`}>
        {items.map((a) => (
          <AnimeCard key={`${a.id}-${a.slug}`} anime={a} />
        ))}
      </div>
    </section>
  );
}
