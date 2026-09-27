"use client";

import { useEffect, useState } from "react";
import { MascotLoading } from "@/components/MascotLoading";

/**
 * Semua halaman chapter di-preload dulu ke cache browser — tampil mascot
 * loading, baru render. Timeout safety 15s biar 1 gambar bandel gak
 * nge-block seluruh chapter.
 */
export function ChapterImages({ images }: { images: string[] }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!images.length) {
      setReady(true);
      return;
    }
    setReady(false);
    let done = 0;
    let cancelled = false;
    const finish = () => {
      if (!cancelled) setReady(true);
    };
    const tick = () => {
      done += 1;
      if (done >= images.length) finish();
    };
    const objs = images.map((src) => {
      const img = new Image();
      img.referrerPolicy = "no-referrer";
      img.onload = tick;
      img.onerror = tick;
      img.src = src;
      return img;
    });
    const safety = window.setTimeout(finish, 15_000);
    return () => {
      cancelled = true;
      window.clearTimeout(safety);
      for (const o of objs) {
        o.onload = null;
        o.onerror = null;
      }
    };
  }, [images]);

  if (!ready) return <MascotLoading className="page-loading" />;

  return (
    <div className="chapter-images">
      {images.map((src, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={`${i}-${src.slice(-24)}`}
          src={src}
          alt={`Halaman ${i + 1}`}
          loading={i < 2 ? "eager" : "lazy"}
          referrerPolicy="no-referrer"
        />
      ))}
    </div>
  );
}
