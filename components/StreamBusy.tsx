"use client";

import { useState } from "react";
import { HistoryTracker } from "./HistoryTracker";
import { VideoPlayer } from "./Episode";

type PlayerProps = Parameters<typeof VideoPlayer>[0];
type HistoryProps = { slug: string; title: string; ep: string; cover?: string };

/**
 * Layar "Server lagi sibuk" di halaman episode: resolve SSR gagal (upstream lagi
 * nge-rate-limit / hang). Tombol "Coba lagi" nembak API resolve server lain —
 * kalau dapet, player langsung dipasang tanpa reload.
 */
export default function StreamBusy({
  player,
  history,
}: {
  player: PlayerProps;
  history: HistoryProps;
}) {
  const [src, setSrc] = useState<string | null>(null);
  const [index, setIndex] = useState<number | null>(player.streamIndex ?? null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  if (src) {
    return (
      <>
        <HistoryTracker {...history} src={src} kind="hentai" />
        <VideoPlayer {...player} src={src} streamIndex={index} />
      </>
    );
  }

  const retry = async () => {
    if (!player.streamApi || busy) return;
    setBusy(true);
    setFailed(false);
    try {
      const res = await fetch(player.streamApi, { cache: "no-store" });
      const data = (await res.json()) as {
        ok?: boolean;
        stream?: { url?: string; index?: number };
      };
      if (data.ok && data.stream?.url) {
        const i = data.stream.index;
        setIndex(i != null && Number.isInteger(i) ? i : null);
        setSrc(data.stream.url);
      } else {
        setFailed(true);
      }
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="state" role="alert">
      <strong>Server lagi sibuk</strong>
      <span>Streaming belum bisa diambil sekarang. Coba lagi beberapa saat.</span>
      <div className="cp-retry-row">
        <button type="button" className="cp-retry" onClick={() => void retry()} disabled={busy}>
          {busy ? "Nyari server…" : "Coba lagi"}
        </button>
      </div>
      {failed ? (
        <span role="status">
          Belum dapet juga — tunggu ~10 detik terus tekan lagi, ya.
        </span>
      ) : null}
    </div>
  );
}
