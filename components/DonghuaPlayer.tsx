"use client";

import { useState } from "react";
import type { DonghuaServer } from "@/lib/donghua";

/**
 * Player donghua — tayangan lewat iframe embed provider (OK.ru, Dailymotion,
 * Dood, dst). Server lain bisa dipilih di baris chip bawah; pindah episode
 * lewat daftar episode di halaman nonton.
 */
export function DonghuaPlayer({
  servers,
  initial,
  title,
  epLabel,
}: {
  servers: DonghuaServer[];
  initial: DonghuaServer | null;
  title: string;
  epLabel: string;
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
    </>
  );
}
