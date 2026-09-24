"use client";

import { useCallback, useEffect, useRef, useState, type ChangeEvent } from "react";
import Link from "next/link";
import { type Episode, encodeMedia } from "@/lib/api";
import { fmtClock, updateProgress } from "@/lib/history";
import {
  IconBrightness,
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

export function EpisodeSection({
  slug,
  eps,
  current,
}: {
  slug: string;
  eps: Episode[];
  current?: string;
}) {
  const [order, setOrder] = useState<Order>("asc");

  if (!eps.length) {
    return (
      <>
        <div className="section-head">
          <h2 className="section-title">Episode</h2>
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
        <h2 className="section-title">Episode</h2>
        <button
          type="button"
          className="ep-sort-btn"
          aria-pressed={order === "desc"}
          onClick={() => setOrder(order === "asc" ? "desc" : "asc")}
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

  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [brightness, setBrightness] = useState(100);
  const [locked, setLocked] = useState(false);
  const [show, setShow] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [isFs, setIsFs] = useState(false);

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

    const onMeta = () => setDuration(Number.isFinite(v.duration) ? v.duration : 0);
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
    v.addEventListener("play", onPlay);
    v.addEventListener("pause", onPause);
    v.addEventListener("ended", save);
    window.addEventListener("beforeunload", save);
    return () => {
      save();
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("durationchange", onMeta);
      v.removeEventListener("loadedmetadata", onMeta);
      v.removeEventListener("play", onPlay);
      v.removeEventListener("pause", onPause);
      v.removeEventListener("ended", save);
      window.removeEventListener("beforeunload", save);
    };
  }, [slug, playable, src, bump]);

  useEffect(() => {
    const onFs = () => setIsFs(document.fullscreenElement === rootRef.current);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) void v.play().catch(() => undefined);
    else v.pause();
  }, []);

  const skip = useCallback((delta: number) => {
    const v = videoRef.current;
    if (!v) return;
    const d = Number.isFinite(v.duration) ? v.duration : 0;
    v.currentTime = Math.max(0, Math.min(d || Number.MAX_SAFE_INTEGER, v.currentTime + delta));
    bump();
  }, [bump]);

  const onSeek = (e: ChangeEvent<HTMLInputElement>) => {
    const v = videoRef.current;
    if (!v || duration <= 0) return;
    const t = (Number(e.target.value) / 1000) * duration;
    v.currentTime = t;
    setCurrent(t);
  };

  const onVolume = (e: ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setVolume(val);
    const v = videoRef.current;
    if (v) {
      v.volume = val;
      v.muted = val === 0;
    }
  };

  const onBrightness = (e: ChangeEvent<HTMLInputElement>) => {
    setBrightness(Number(e.target.value));
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

  const overlayOn = locked || show || !playing;

  return (
    <div
      ref={rootRef}
      className="cplayer"
      data-show={overlayOn ? "1" : "0"}
      data-locked={locked ? "1" : "0"}
      data-fs={isFs ? "1" : "0"}
      onPointerMove={bump}
      onPointerDown={bump}
    >
      {/* URL CDN hanya di src — jangan ditampilkan ke UI */}
      <video
        ref={videoRef}
        playsInline
        preload="metadata"
        key={playable}
        src={playable}
        style={{ filter: `brightness(${brightness}%)` }}
        onClick={togglePlay}
      />

      <div className="cp-ov">
        <div className="cp-top cp-fade">
          <div className="cp-title">
            <span className="cp-title-name">{animeTitle}</span>
            <span className="cp-title-ep">Ep {episode}</span>
          </div>
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

        <div className="cp-side cp-side-l cp-fade" aria-hidden={locked}>
          <span className="cp-pct">{Math.round(brightness)}%</span>
          <div className="cp-vtrack">
            <input
              className="cp-vslider"
              type="range"
              min={20}
              max={100}
              step={1}
              value={brightness}
              onChange={onBrightness}
              aria-label="Kecerahan"
              disabled={locked}
            />
          </div>
          <IconBrightness size={18} />
        </div>

        <div className="cp-side cp-side-r cp-fade" aria-hidden={locked}>
          <span className="cp-pct">{Math.round(volume * 100)}%</span>
          <div className="cp-vtrack">
            <input
              className="cp-vslider"
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={volume}
              onChange={onVolume}
              aria-label="Volume"
              disabled={locked}
            />
          </div>
          <button
            type="button"
            className="cp-btn cp-mute"
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
        </div>

        <div className="cp-center cp-fade">
          <div className="cp-center-row">
            <div className="cp-nav">
              {prevEp ? (
                <Link
                  className="cp-btn cp-nav-btn"
                  href={`/play/${navBase}?ep=${encodeURIComponent(prevEp)}`}
                  aria-label={`Episode sebelumnya ${prevEp}`}
                >
                  <IconPrevTrack size={22} />
                </Link>
              ) : (
                <span className="cp-btn cp-nav-btn is-off" aria-hidden>
                  <IconPrevTrack size={22} />
                </span>
              )}
              <span className="cp-nav-label">{prevEp ? `Ep ${prevEp}` : ""}</span>
            </div>

            <button
              type="button"
              className="cp-btn cp-skip"
              aria-label="Mundur 10 detik"
              disabled={locked}
              onClick={() => skip(-10)}
            >
              <IconReplay size={22} />
              <span className="cp-skip-n">10</span>
            </button>

            <button
              type="button"
              className="cp-btn cp-play"
              aria-label={playing ? "Jeda" : "Putar"}
              onClick={togglePlay}
            >
              {playing ? <IconPause size={28} /> : <IconPlay size={28} />}
            </button>

            <button
              type="button"
              className="cp-btn cp-skip"
              aria-label="Maju 10 detik"
              disabled={locked}
              onClick={() => skip(10)}
            >
              <IconForward size={22} />
              <span className="cp-skip-n">10</span>
            </button>

            <div className="cp-nav is-next">
              {nextEp ? (
                <Link
                  className="cp-btn cp-nav-btn"
                  href={`/play/${navBase}?ep=${encodeURIComponent(nextEp)}`}
                  aria-label={`Episode berikutnya ${nextEp}`}
                >
                  <IconNextTrack size={22} />
                </Link>
              ) : (
                <span className="cp-btn cp-nav-btn is-off" aria-hidden>
                  <IconNextTrack size={22} />
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
    </div>
  );
}
