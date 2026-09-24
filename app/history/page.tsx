"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { IconEmpty, IconPlay } from "@/components/Icons";
import { clearHistory, readHistory, type HistoryEntry } from "@/lib/history";

function formatWhen(at: number) {
  try {
    return new Date(at).toLocaleString("id-ID", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export default function HistoryPage() {
  const [items, setItems] = useState<HistoryEntry[] | null>(null);

  useEffect(() => {
    setItems(readHistory());
    const onUpdate = () => setItems(readHistory());
    window.addEventListener("givime:history-updated", onUpdate);
    return () => window.removeEventListener("givime:history-updated", onUpdate);
  }, []);

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
          <button type="button" className="text-btn" onClick={() => {
            clearHistory();
            setItems([]);
          }}>
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
        <ul className="history-list">
          {items.map((h) => (
            <li key={h.slug}>
              <Link href={`/play/${h.slug}?ep=${encodeURIComponent(h.ep)}`} className="history-row">
                <span className="history-thumb" aria-hidden>
                  <IconPlay size={14} />
                </span>
                <span className="history-body">
                  <span className="history-title">{h.title}</span>
                  <span className="history-meta">
                    Ep {h.ep} · {formatWhen(h.at)}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
