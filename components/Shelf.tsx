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
}: {
  title: string;
  href?: string;
  items: Anime[];
}) {
  const railRef = useRef<HTMLDivElement>(null);

  if (!items.length) return null;

  return (
    <section className="section">
      <div className="section-head">
        <h2 className="section-title">
          <span className="section-ornament" aria-hidden>
            <SectionOrnament />
          </span>
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

/** Ornamen 3-garis diagonal ala stalker-ff-givy (SectionDividerLabel). */
function SectionOrnament() {
  return (
    <svg
      width="73"
      height="4"
      viewBox="0 0 73 4"
      preserveAspectRatio="none"
      fill="none"
      aria-hidden="true"
    >
      <path d="M57.2497 0L53.6572 3.60889H0V0H57.2497Z" fill="currentColor" />
      <path d="M62.4526 0L58.8601 3.60889H56.8293L60.4218 0H62.4526Z" fill="currentColor" />
      <path d="M67.6555 0L64.063 3.60889H62.0278L65.6247 0H67.6555Z" fill="currentColor" />
      <path d="M72.8583 0L69.2614 3.60889H67.2307L70.8276 0H72.8583Z" fill="currentColor" />
    </svg>
  );
}
