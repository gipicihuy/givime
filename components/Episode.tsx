"use client";

import { useCallback, useEffect, useRef, useState, type ChangeEvent } from "react";
import Link from "next/link";
import { type Episode, encodeMedia } from "@/lib/api";
import { fmtClock, updateProgress } from "@/lib/history";
import { SectionOrnament } from "@/components/Shelf";
import {
  IconCast,
  IconForward,
  IconFullscreen,
  IconFullscreenExit,
  IconLock,
  IconNextTrack,
  IconPause,
  IconPlay,
  IconPrevTrack,
  IconReplay,
  IconUnlock,
  IconVolume,
  IconVolumeMute,
} from "@/components/Icons";

type Order = "asc" | "desc";

const EP_ORDER_KEY = "givime:epOrder";

export function EpisodeSection({
  slug,
  eps,
  current,
  persistOrder = false,
}: {
  slug: string;
  eps: Episode[];
  current?: string;
  /** Urutan disimpen di localStorage & dibaca lagi pas refresh — cuma buat halaman detail. */
  persistOrder?: boolean;
}) {
  const [order, setOrder] = useState<Order>("asc");

  // Urutan "Terbaru" cuma nahan pilihan pas refresh (F5) di halaman ini.
  // Cleanup ngapus storage pas pindah halaman → balik lagi = default lagi.
  useEffect(() => {
    if (!persistOrder) return;
    try {
      const saved = window.localStorage.getItem(EP_ORDER_KEY);
      if (saved === "asc" || saved === "desc") setOrder(saved);
    } catch {
      /* storage bisa ditolak (private mode) */
    }
    return () => {
      try {
        window.localStorage.removeItem(EP_ORDER_KEY);
      } catch {
        /* ignore */
      }
    };
  }, [persistOrder]);

  const toggleOrder = () => {
    const next: Order = order === "asc" ? "desc" : "asc";
    setOrder(next);
    if (!persistOrder) return;
    try {
      window.localStorage.setItem(EP_ORDER_KEY, next);
    } catch {
      /* ignore */
    }
  };

  if (!eps.length) {
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

  const list = order === "asc" ? eps : [...eps].reverse();

  return (
    <>
      <div className="section-head">
        <h2 className="section-title">
          <span className="section-ornament" aria-hidden>
            <SectionOrnament />
          </span>
          Episode
        </h2>
        <button
          type="button"
          className="ep-sort-btn"
          aria-pressed={order === "desc"}
          onClick={toggleOrder}
        >
          Terbaru
        </button>
      </div>

      <div className="ep-grid">
        {list.map((e, i) => {
          const label = String(e.ab_namaep);
          const active = current != null && label === String(current);
          return (
            <Link
              key={`${i}-${label}`}
              href={`/play/${slug}?ep=${encodeURIComponent(label)}`}
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

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

export function VideoPlayer({
  src,
  animeTitle,
  episode,
  slug,
  initialTime = 0,
  epSlug,
  prevEp,
  nextEp,
}: {
  src: string;
  animeTitle: string;
  episode: string;
  slug: string;
  initialTime?: number;
  /** Slug rute `/play/…` buat navigasi prev/next (beda dari slug history). */
  epSlug?: string;
  prevEp?: string | null;
  nextEp?: string | null;
}) {
  const playable = encodeMedia(src);
  const videoRef = useRef<HTMLVideoElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const lastSave = useRef(0);
  const hideTimer = useRef<number | undefined>(undefined);
  const scrubbing = useRef(false);
  const skipWait = useRef(false);
  const skipWaitTimer = useRef<number | undefined>(undefined);

  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [locked, setLocked] = useState(false);
  const [show, setShow] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [isFs, setIsFs] = useState(false);
  const [buffering, setBuffering] = useState(true);
  const [seekFx, setSeekFx] = useState<{ side: "left" | "right"; amount: number; key: number; top: number; left: number } | null>(null);

  const lastTap = useRef<{ time: number; side: "left" | "right" } | null>(null);
  const singleTapTimer = useRef<number | undefined>(undefined);
  const seekFxTimer = useRef<number | undefined>(undefined);
  const skipBackRef = useRef<HTMLButtonElement>(null);
  const skipFwdRef = useRef<HTMLButtonElement>(null);

  const navBase = epSlug ?? slug;
  const pct = duration > 0 ? (current / duration) * 100 : 0;

  const bump = useCallback(() => {
    setShow(true);
    window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => {
      const v = videoRef.current;
      if (v && !v.paused && !locked) setShow(false);
    }, 3200);
  }, [locked]);

  useEffect(() => {
    bump();
    return () => window.clearTimeout(hideTimer.current);
  }, [bump, playing]);

  // Ganti episode = src baru → reset posisi & tampilin loading lagi sampai
  // metadata siap (durasi valid), biar ga kelihatan 00:00/00:00.
  useEffect(() => {
    setBuffering(true);
    setCurrent(0);
    setDuration(0);
  }, [playable]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (initialTime > 0) {
      const seek = () => {
        try {
          v.currentTime = initialTime;
        } catch {
          /* ignore */
        }
      };
      if (v.readyState >= 1) seek();
      else v.addEventListener("loadedmetadata", seek, { once: true });
      return () => v.removeEventListener("loadedmetadata", seek);
    }
  }, [initialTime, playable]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    const save = () => {
      const d = v.duration;
      if (!Number.isFinite(d) || d <= 0) return;
      updateProgress(slug, Math.floor(v.currentTime), Math.floor(d), src);
    };

    const onTime = () => {
      if (!scrubbing.current) setCurrent(v.currentTime);
      const now = Date.now();
      if (now - lastSave.current < 4000) return;
      lastSave.current = now;
      save();
    };

    const onMeta = () => {
      setDuration(Number.isFinite(v.duration) ? v.duration : 0);
      setBuffering(false);
    };
    const onWaiting = () => {
      if (skipWait.current) return;
      setBuffering(true);
    };
    const onCanPlay = () => setBuffering(false);
    const onPlaying = () => {
      skipWait.current = false;
      setBuffering(false);
    };
    const onSeeked = () => {
      skipWait.current = false;
      setBuffering(false);
    };
    const onPlay = () => {
      setPlaying(true);
      bump();
    };
    const onPause = () => {
      setPlaying(false);
      setShow(true);
      save();
    };

    v.addEventListener("timeupdate", onTime);
    v.addEventListener("durationchange", onMeta);
    v.addEventListener("loadedmetadata", onMeta);
    v.addEventListener("waiting", onWaiting);
    v.addEventListener("canplay", onCanPlay);
    v.addEventListener("playing", onPlaying);
    v.addEventListener("seeked", onSeeked);
    v.addEventListener("play", onPlay);
    v.addEventListener("pause", onPause);
    v.addEventListener("ended", save);
    window.addEventListener("beforeunload", save);
    return () => {
      save();
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("durationchange", onMeta);
      v.removeEventListener("loadedmetadata", onMeta);
      v.removeEventListener("waiting", onWaiting);
      v.removeEventListener("canplay", onCanPlay);
      v.removeEventListener("playing", onPlaying);
      v.removeEventListener("seeked", onSeeked);
      v.removeEventListener("play", onPlay);
      v.removeEventListener("pause", onPause);
      v.removeEventListener("ended", save);
      window.removeEventListener("beforeunload", save);
    };
  }, [slug, playable, src, bump]);

  useEffect(() => {
    const onFs = () => {
      const active = document.fullscreenElement === rootRef.current;
      setIsFs(active);

      // Auto-rotate ke landscape pas fullscreen (kalau browser dukung Screen Orientation API)
      const orientation = (screen as Screen & {
        orientation?: {
          lock?: (o: string) => Promise<void>;
          unlock?: () => void;
        };
      }).orientation;
      if (active) {
        orientation?.lock?.("landscape").catch(() => undefined);
      } else {
        try {
          orientation?.unlock?.();
        } catch {
          /* ignore, ga semua browser support */
        }
      }
    };
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  // Sembunyiin site-header pas nonton dalam orientasi landscape. Pake
  // matchMedia (bukan nebak max-height di CSS) biar akurat di semua device.
  useEffect(() => {
    const mq = window.matchMedia("(orientation: landscape)");
    const apply = () => {
      document.body.classList.toggle("watching-landscape", mq.matches);
    };
    apply();
    mq.addEventListener("change", apply);
    return () => {
      mq.removeEventListener("change", apply);
      document.body.classList.remove("watching-landscape");
    };
  }, []);

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) void v.play().catch(() => undefined);
    else v.pause();
  }, []);

  // Tap di area kosong video = toggle overlay kontrol aja, bukan play/pause
  const toggleOverlay = useCallback(() => {
    if (locked) return;
    setShow((prev) => {
      const next = !prev;
      window.clearTimeout(hideTimer.current);
      if (next) {
        hideTimer.current = window.setTimeout(() => {
          const v = videoRef.current;
          if (v && !v.paused && !locked) setShow(false);
        }, 3200);
      }
      return next;
    });
  }, [locked]);

  const skip = useCallback((delta: number) => {
    const v = videoRef.current;
    if (!v) return;
    const d = Number.isFinite(v.duration) ? v.duration : 0;
    v.currentTime = Math.max(0, Math.min(d || Number.MAX_SAFE_INTEGER, v.currentTime + delta));
    // Hasil seek kilat (double-tap / tombol ±10s) bukan buffering beneran —
    // suppress spinner buffering sesaat setelah skip.
    skipWait.current = true;
    window.clearTimeout(skipWaitTimer.current);
    skipWaitTimer.current = window.setTimeout(() => {
      skipWait.current = false;
    }, 1500);
    bump();
  }, [bump]);

  const DOUBLE_TAP_MS = 300;

  // Posisi indikator ngikutin tombol skip 10 detik yang beneran (bukan angka
  // ngarang), biar tetep pas nempel di bawah tombolnya di ukuran layar apapun.
  const seekFxAnchor = useCallback((side: "left" | "right") => {
    const btn = (side === "right" ? skipFwdRef : skipBackRef).current;
    const root = rootRef.current;
    if (!btn || !root) return { top: 0, left: 0 };
    const b = btn.getBoundingClientRect();
    const r = root.getBoundingClientRect();
    return {
      top: b.bottom - r.top + 8,
      left: b.left + b.width / 2 - r.left,
    };
  }, []);

  // Klik/tap kanan video 2x = maju 10s, kiri 2x = mundur 10s, sambil nampilin
  // indikator "+10s"/"-10s" nempel di bawah tombol skip. Tap ke-3, ke-4, dst
  // yang masih beruntun di sisi yang sama bakal numpuk (+20s, +30s, ...) kaya
  // player modern lainnya.
  const handleVideoTap = useCallback(
    (e: React.MouseEvent<HTMLVideoElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const side: "left" | "right" = e.clientX - rect.left < rect.width / 2 ? "left" : "right";
      const now = Date.now();
      const last = lastTap.current;

      if (last && last.side === side && now - last.time < DOUBLE_TAP_MS) {
        window.clearTimeout(singleTapTimer.current);
        lastTap.current = { time: now, side };
        skip(side === "right" ? 10 : -10);
        const anchor = seekFxAnchor(side);
        setSeekFx((prev) => ({
          side,
          amount: prev && prev.side === side ? prev.amount + 10 : 10,
          key: (prev?.key ?? 0) + 1,
          ...anchor,
        }));
        window.clearTimeout(seekFxTimer.current);
        seekFxTimer.current = window.setTimeout(() => setSeekFx(null), 650);
        return;
      }

      lastTap.current = { time: now, side };
      window.clearTimeout(singleTapTimer.current);
      singleTapTimer.current = window.setTimeout(() => {
        toggleOverlay();
      }, DOUBLE_TAP_MS);
    },
    [skip, toggleOverlay, seekFxAnchor],
  );

  useEffect(() => {
    return () => {
      window.clearTimeout(singleTapTimer.current);
      window.clearTimeout(seekFxTimer.current);
    };
  }, []);

  const onSeek = (e: ChangeEvent<HTMLInputElement>) => {
    const v = videoRef.current;
    if (!v || duration <= 0) return;
    const t = (Number(e.target.value) / 1000) * duration;
    v.currentTime = t;
    setCurrent(t);
  };

  const cycleSpeed = () => {
    const i = SPEEDS.indexOf(speed);
    const next = SPEEDS[(i + 1) % SPEEDS.length] ?? 1;
    setSpeed(next);
    if (videoRef.current) videoRef.current.playbackRate = next;
    bump();
  };

  const toggleFs = () => {
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
    else void rootRef.current?.requestFullscreen().catch(() => undefined);
  };

  const requestCast = useCallback(() => {
    const v = videoRef.current as
      | (HTMLVideoElement & {
          remote?: { prompt: () => Promise<void> };
          webkitShowPlaybackTargetPicker?: () => void;
        })
      | null;
    if (!v) return;
    if (v.remote?.prompt) {
      void v.remote.prompt().catch(() => undefined);
      return;
    }
    v.webkitShowPlaybackTargetPicker?.();
  }, []);

  const overlayOn = locked || show;
  // "initial" = sebelum metadata (durasi belum ada) → overlay penuh + kontrol
  // disembunyiin; "wait" = buffering di tengah putar → spinner di atas frame.
  const loadState = !buffering ? "0" : duration > 0 ? "wait" : "initial";

  return (
    <div
      ref={rootRef}
      className="cplayer"
      data-show={overlayOn ? "1" : "0"}
      data-locked={locked ? "1" : "0"}
      data-fs={isFs ? "1" : "0"}
      data-loading={loadState}
      onPointerMove={bump}
    >
      {/* URL CDN hanya di src — jangan ditampilkan ke UI */}
      <video
        ref={videoRef}
        playsInline
        disableRemotePlayback
        preload="metadata"
        key={playable}
        src={playable}
        onClick={handleVideoTap}
      />

      <div className="cp-ov">
        <div className="cp-scrim cp-fade" aria-hidden="true" />

        {seekFx && (
          <div
            key={seekFx.key}
            className="cp-seekfx"
            data-side={seekFx.side}
            style={{ top: seekFx.top, left: seekFx.left }}
            aria-hidden="true"
          >
            {seekFx.side === "right" ? <IconForward size={22} /> : <IconReplay size={22} />}
            <span className="cp-seekfx-label">
              {seekFx.side === "right" ? "+" : "-"}
              {seekFx.amount}s
            </span>
          </div>
        )}
        <div className="cp-top cp-fade">
          <div className="cp-title">
            <span className="cp-title-name">{animeTitle}</span>
            <span className="cp-title-ep">Ep {episode}</span>
          </div>
          <div className="cp-top-actions">
            <button
              type="button"
              className="cp-btn cp-cast"
              aria-label="Transmisi layar"
              onClick={requestCast}
            >
              <IconCast size={18} />
            </button>
            <button
              type="button"
              className="cp-btn cp-lock"
              aria-label={locked ? "Buka kontrol" : "Kunci kontrol"}
              aria-pressed={locked}
              onClick={() => {
                setLocked(!locked);
                setShow(true);
              }}
            >
              {locked ? <IconLock size={18} /> : <IconUnlock size={18} />}
            </button>
          </div>
        </div>

        <div className="cp-center cp-fade">
          <div className="cp-center-row">
            <div className="cp-item cp-nav">
              {prevEp ? (
                <Link
                  className="cp-btn cp-nav-btn"
                  href={`/play/${navBase}?ep=${encodeURIComponent(prevEp)}`}
                  aria-label={`Episode sebelumnya ${prevEp}`}
                >
                  <IconPrevTrack size={20} />
                </Link>
              ) : (
                <span className="cp-btn cp-nav-btn is-off" aria-hidden>
                  <IconPrevTrack size={20} />
                </span>
              )}
              <span className="cp-nav-label">{prevEp ? `Ep ${prevEp}` : ""}</span>
            </div>

            <div className="cp-item">
              <button
                type="button"
                className="cp-btn cp-skip"
                aria-label="Mundur 10 detik"
                disabled={locked}
                ref={skipBackRef}
                onClick={() => skip(-10)}
              >
                <IconReplay size={22} />
                <span className="cp-skip-n">10</span>
              </button>
              <span className="cp-nav-label" aria-hidden="true">
                &nbsp;
              </span>
            </div>

            <div className="cp-item">
              <button
                type="button"
                className="cp-btn cp-play"
                aria-label={playing ? "Jeda" : "Putar"}
                onClick={togglePlay}
              >
                {playing ? <IconPause size={30} /> : <IconPlay size={30} />}
              </button>
              <span className="cp-nav-label" aria-hidden="true">
                &nbsp;
              </span>
            </div>

            <div className="cp-item">
              <button
                type="button"
                className="cp-btn cp-skip"
                aria-label="Maju 10 detik"
                disabled={locked}
                ref={skipFwdRef}
                onClick={() => skip(10)}
              >
                <IconForward size={22} />
                <span className="cp-skip-n">10</span>
              </button>
              <span className="cp-nav-label" aria-hidden="true">
                &nbsp;
              </span>
            </div>

            <div className="cp-item cp-nav is-next">
              {nextEp ? (
                <Link
                  className="cp-btn cp-nav-btn"
                  href={`/play/${navBase}?ep=${encodeURIComponent(nextEp)}`}
                  aria-label={`Episode berikutnya ${nextEp}`}
                >
                  <IconNextTrack size={20} />
                </Link>
              ) : (
                <span className="cp-btn cp-nav-btn is-off" aria-hidden>
                  <IconNextTrack size={20} />
                </span>
              )}
              <span className="cp-nav-label">{nextEp ? `Ep ${nextEp}` : ""}</span>
            </div>
          </div>
        </div>

        <div className="cp-bottom cp-fade">
          <div className="cp-bottom-row">
            <span className="cp-time">
              {fmtClock(current)}
              <span className="cp-time-sep">/</span>
              {fmtClock(duration)}
            </span>
            <div className="cp-bottom-right">
              <button
                type="button"
                className="cp-btn cp-speed"
                aria-label="Kecepatan putar"
                disabled={locked}
                onClick={cycleSpeed}
              >
                {speed}x
              </button>
              <button
                type="button"
                className="cp-btn"
                aria-label={volume === 0 ? "Bunyikan" : "Bisukan"}
                disabled={locked}
                onClick={() => {
                  const next = volume === 0 ? 1 : 0;
                  setVolume(next);
                  const v = videoRef.current;
                  if (v) {
                    v.volume = next;
                    v.muted = next === 0;
                  }
                }}
              >
                {volume === 0 ? <IconVolumeMute size={18} /> : <IconVolume size={18} />}
              </button>
              <button
                type="button"
                className="cp-btn"
                aria-label={isFs ? "Keluar fullscreen" : "Fullscreen"}
                disabled={locked}
                onClick={toggleFs}
              >
                {isFs ? <IconFullscreenExit size={18} /> : <IconFullscreen size={18} />}
              </button>
            </div>
          </div>
          <div className="cp-progress">
            <div className="cp-progress-track">
              <div className="cp-progress-fill" style={{ width: `${pct}%` }} />
            </div>
            <input
              className="cp-progress-input"
              type="range"
              min={0}
              max={1000}
              step={1}
              value={duration > 0 ? Math.round((current / duration) * 1000) : 0}
              onChange={onSeek}
              onPointerDown={() => {
                scrubbing.current = true;
              }}
              onPointerUp={() => {
                scrubbing.current = false;
              }}
              aria-label="Posisi video"
              disabled={locked}
            />
          </div>
        </div>
      </div>

      {/* Loading ala Nefusoft — sebelum metadata: mascot + teks; buffering: spinner. Aksen lime. */}
      {buffering && (
        <div className="cp-loading" role="status">
          {duration > 0 ? (
            <span className="cp-load-spinner" aria-hidden="true">
              {Array.from({ length: 12 }, (_, i) => (
                <i
                  key={i}
                  style={{
                    transform: `rotate(${i * 30}deg) translate(0, -130%)`,
                    animationDelay: i === 0 ? "0s" : `-${(12 - i) / 10}s`,
                  }}
                />
              ))}
            </span>
          ) : (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="cp-load-mascot" src="/loading.webp" alt="" aria-hidden="true" />
              <p className="cp-load-text">sabar yaa, server kami butuh waktu untuk merespon 😖</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
