"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { IconChevronRight, IconPlay } from "@/components/Icons";
import { readHistory, type HistoryEntry } from "@/lib/history";

/** Rail "Lanjutkan menonton" dari localStorage — hide kalau kosong. */
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
    <section className="section">
      <div className="section-head">
        <h2 className="section-title">
          <span className="section-ornament" aria-hidden>
            <SectionOrnament />
          </span>
          Lanjutkan menonton
        </h2>
        <Link href="/history" className="section-more">
          History
          <IconChevronRight size={14} />
        </Link>
      </div>
      <div className="rail" tabIndex={0} aria-label="Geser lanjutkan menonton">
        {items.map((h) => (
          <Link
            key={h.slug}
            href={`/play/${h.slug}?ep=${encodeURIComponent(h.ep)}`}
            className="continue-card"
          >
            <span className="continue-thumb" aria-hidden>
              {h.cover ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={h.cover} alt="" loading="lazy" width={300} height={450} />
              ) : null}
              <span className="continue-play">
                <IconPlay size={14} />
              </span>
            </span>
            <span className="continue-title">{h.title}</span>
            <span className="continue-meta">Ep {h.ep}</span>
          </Link>
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
