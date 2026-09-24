"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { IconChevronRight, IconHistory, IconPlay } from "@/components/Icons";
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
          const pct =
            h.t != null && h.d != null && h.d > 0
              ? Math.min(100, Math.round((h.t / h.d) * 100))
              : 0;
          return (
            <Link key={h.slug} href={hrefOf(h)} className="continue-card">
              <span className="continue-thumb" aria-hidden>
                {h.cover ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={h.cover} alt="" loading="lazy" width={480} height={270} />
                ) : null}
                <span className="continue-play">
                  <IconPlay size={14} />
                </span>
                {pct > 0 ? (
                  <span className="continue-bar">
                    <span className="continue-bar-fill" style={{ width: `${pct}%` }} />
                  </span>
                ) : null}
              </span>
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
