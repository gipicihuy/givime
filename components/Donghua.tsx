"use client";

import Link from "next/link";
import { useState } from "react";
import { type DonghuaItem, type DonghuaEpisodeItem, itemHref } from "@/lib/donghua";
import { IconPlay, IconSortNew, IconSortOld } from "@/components/Icons";
import { SectionOrnament } from "@/components/Shelf";

type Order = "asc" | "desc";

export function DonghuaCard({ item }: { item: DonghuaItem }) {
  return (
    <Link href={itemHref(item)} className="poster">
      <div className="poster-thumb">
        {item.cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            className="poster-cover"
            src={item.cover}
            alt=""
            loading="lazy"
            width={300}
            height={450}
          />
        ) : (
          <div className="poster-placeholder">Tanpa cover</div>
        )}
        <span className="poster-fade" aria-hidden />
        {item.epLabel ? <span className="poster-ep">{item.epLabel}</span> : null}
        <span className="poster-badge" aria-hidden>
          <IconPlay size={14} />
        </span>
      </div>
      <span className="poster-title">{item.title}</span>
    </Link>
  );
}

/** Grid poster — katalog / genre / hasil pencarian donghua. */
export function DonghuaGrid({ items }: { items: DonghuaItem[] }) {
  if (!items.length) {
    return (
      <div className="state">
        <strong>Belum ada judul di daftar ini</strong>
        Coba halaman lain atau ubah filter.
      </div>
    );
  }
  return (
    <div className="poster-grid">
      {items.map((it) => (
        <DonghuaCard key={it.slug} item={it} />
      ))}
    </div>
  );
}

/** Shelf section — urutan & judul ngikut box homepage anichin.moe. */
export function DonghuaShelf({
  title,
  href,
  items,
}: {
  title: string;
  href?: string;
  items: DonghuaItem[];
}) {
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
            <IconPlay size={13} />
          </Link>
        ) : null}
      </div>
      <div className="rail" tabIndex={0} aria-label={`Geser ${title}`}>
        {items.map((it) => (
          <DonghuaCard key={it.slug} item={it} />
        ))}
      </div>
    </section>
  );
}

/** Daftar episode di halaman detail — grid rapat + toggle urutan. */
export function DonghuaEpisodeList({
  episodes,
  current,
}: {
  episodes: DonghuaEpisodeItem[];
  current?: string | null;
}) {
  const [order, setOrder] = useState<Order>("desc");

  if (!episodes.length) {
    return (
      <>
        <div className="section-head">
          <h2 className="section-title">
            <span className="section-ornament" aria-hidden>
              <SectionOrnament />
            </span>
            Episode
          </h2>
        </div>
        <div className="state">
          <strong>Belum ada episode</strong>
          Daftar episode belum tersedia untuk judul ini.
        </div>
      </>
    );
  }

  const toggleOrder = () => {
    setOrder((o) => (o === "desc" ? "asc" : "desc"));
  };

  const list = order === "asc" ? episodes : [...episodes].reverse();

  return (
    <>
      <div className="section-head">
        <h2 className="section-title">
          <span className="section-ornament" aria-hidden>
            <SectionOrnament />
          </span>
          Episode ({episodes.length})
        </h2>
        <button
          type="button"
          className="ep-sort-btn"
          aria-label={order === "desc" ? "Urutan: terbaru" : "Urutan: terlama"}
          title={order === "desc" ? "Urutan terbaru" : "Urutan terlama"}
          onClick={toggleOrder}
        >
          {order === "desc" ? <IconSortNew size={17} /> : <IconSortOld size={17} />}
        </button>
      </div>

      <div className="ep-grid">
        {list.map((e) => {
          const label = e.number ?? e.title;
          const active = current != null && String(current) === String(e.number);
          return (
            <Link
              key={e.slug}
              href={`/donghua/watch/${e.slug}`}
              className="ep-link"
              aria-current={active ? "page" : undefined}
            >
              {label}
            </Link>
          );
        })}
      </div>
    </>
  );
}
