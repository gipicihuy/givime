"use client";

import Link from "next/link";
import { useState } from "react";
import type { DonghuaServer } from "@/lib/donghua";
import { IconChevronLeft, IconChevronRight } from "@/components/Icons";

/**
 * Player donghua — tayangan lewat iframe embed provider (OK.ru, Dailymotion,
 * Dood, dst). Server lain bisa dipilih di baris chip bawah, prev/next episode
 * di baris paling bawah.
 */
export function DonghuaPlayer({
  servers,
  initial,
  title,
  epLabel,
  detailSlug,
  prev,
  next,
}: {
  servers: DonghuaServer[];
  initial: DonghuaServer | null;
  title: string;
  epLabel: string;
  detailSlug: string | null;
  prev: { slug: string; label: string } | null;
  next: { slug: string; label: string } | null;
}) {
  const [active, setActive] = useState(initial?.embed ?? servers[0]?.embed ?? null);
  const [loading, setLoading] = useState(true);

  const pick = (embed: string) => {
    if (embed === active) return;
    setActive(embed);
    setLoading(true);
  };

  return (
    <>
      <div className="dp-player">
        {active ? (
          <iframe
            key={active}
            src={active}
            title={`${title} · ${epLabel}`}
            allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
            allowFullScreen
            onLoad={() => setLoading(false)}
          />
        ) : (
          <div className="state">
            <strong>Server belum tersedia</strong>
            Coba buka lagi beberapa saat, atau pilih judul lain.
          </div>
        )}
        {active && loading ? (
          <span className="dp-loading" role="status">
            Loading player…
          </span>
        ) : null}
      </div>

      {servers.length > 1 ? (
        <div className="dp-servers" role="group" aria-label="Pilih server">
          {servers.map((s) => (
            <button
              key={s.embed}
              type="button"
              className={`dp-server${s.embed === active ? " is-active" : ""}`}
              onClick={() => pick(s.embed)}
            >
              {s.label}
            </button>
          ))}
        </div>
      ) : null}

      <nav className="dp-nav" aria-label="Episode lain">
        {prev ? (
          <Link href={`/donghua/watch/${prev.slug}`} className="dp-nav-link">
            <IconChevronLeft size={15} />
            Sebelumnya
          </Link>
        ) : (
          <span className="dp-nav-link is-disabled" aria-hidden />
        )}
        {detailSlug ? (
          <Link href={`/donghua/${detailSlug}`} className="dp-nav-link dp-nav-center">
            Semua episode
          </Link>
        ) : (
          <span className="dp-nav-link is-disabled" aria-hidden />
        )}
        {next ? (
          <Link href={`/donghua/watch/${next.slug}`} className="dp-nav-link">
            Berikutnya
            <IconChevronRight size={15} />
          </Link>
        ) : (
          <span className="dp-nav-link is-disabled" aria-hidden />
        )}
      </nav>
    </>
  );
}
