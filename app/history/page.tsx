"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { IconEmpty } from "@/components/Icons";
import {
  clearHistory,
  fmtProgress,
  readHistory,
  type HistoryEntry,
} from "@/lib/history";

function dayLabel(at: number): string {
  try {
    const d = new Date(at);
    const now = new Date();
    const a = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const b = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const diff = Math.round((b - a) / 86_400_000);
    if (diff === 0) return "Hari ini";
    if (diff === 1) return "Kemarin";
    if (diff > 1 && diff < 7) return `${diff} hari lalu`;
    return d.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
  } catch {
    return "";
  }
}

function clockLabel(at: number): string {
  try {
    return new Date(at).toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function hrefOf(h: HistoryEntry) {
  const base = `/play/${h.slug}?ep=${encodeURIComponent(h.ep)}`;
  return h.t && h.t > 0 ? `${base}&t=${Math.floor(h.t)}` : base;
}

type DayGroup = { key: string; label: string; items: HistoryEntry[] };

function groupByDay(items: HistoryEntry[]): DayGroup[] {
  const map = new Map<string, DayGroup>();
  for (const h of items) {
    const d = new Date(h.at);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    let g = map.get(key);
    if (!g) {
      g = { key, label: dayLabel(h.at), items: [] };
      map.set(key, g);
    }
    g.items.push(h);
  }
  return [...map.values()];
}

export default function HistoryPage() {
  const [items, setItems] = useState<HistoryEntry[] | null>(null);

  useEffect(() => {
    setItems(readHistory());
    const onUpdate = () => setItems(readHistory());
    window.addEventListener("givime:history-updated", onUpdate);
    return () => window.removeEventListener("givime:history-updated", onUpdate);
  }, []);

  const groups = useMemo(() => (items ? groupByDay(items) : []), [items]);

  if (items === null) {
    return (
      <>
        <h1 className="page-title">History</h1>
        <p className="page-sub">Tontonan terakhir di perangkat ini</p>
        <div className="state">Memuat…</div>
      </>
    );
  }

  return (
    <>
      <div className="section-head" style={{ marginBottom: 4 }}>
        <h1 className="page-title" style={{ marginBottom: 0 }}>
          History
        </h1>
        {items.length ? (
          <button
            type="button"
            className="text-btn"
            onClick={() => {
              clearHistory();
              setItems([]);
            }}
          >
            Hapus
          </button>
        ) : null}
      </div>
      <p className="page-sub">Tontonan terakhir di perangkat ini</p>

      {!items.length ? (
        <div className="state">
          <span className="state-icon">
            <IconEmpty size={36} />
          </span>
          <strong>Belum ada riwayat</strong>
          Episode yang kamu putar akan muncul di sini.
        </div>
      ) : (
        <div className="history-timeline">
          {groups.map((g) => (
            <section key={g.key} className="history-day">
              <div className="history-day-badge">{g.label}</div>
              <ul className="history-day-items">
                {g.items.map((h) => {
                  const hasDur = h.d != null && h.d > 0;
                  const cur =
                    h.t != null && Number.isFinite(h.t) && h.t >= 0 ? h.t : 0;
                  const pct = hasDur
                    ? Math.min(100, Math.max(0, (cur / (h.d as number)) * 100))
                    : 0;
                  const prog = fmtProgress(h.t, h.d);
                  return (
                    <li key={h.slug} className="history-item">
                      <Link href={hrefOf(h)} className="history-card">
                        <span className="history-cover" aria-hidden>
                          {h.cover ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={h.cover}
                              alt=""
                              loading="lazy"
                              width={96}
                              height={144}
                            />
                          ) : null}
                        </span>
                        <span className="history-info">
                          <span className="history-top">
                            <span className="history-title">{h.title}</span>
                            <span className="history-clock">{clockLabel(h.at)}</span>
                          </span>
                          <span className="history-ep">Episode {h.ep}</span>
                          <span className="history-progress" aria-hidden>
                            <span
                              className="history-progress-fill"
                              style={{ width: `${pct}%` }}
                            />
                          </span>
                          <span className="history-times">{prog ?? "—"}</span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
