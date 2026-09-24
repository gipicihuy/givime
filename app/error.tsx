"use client";

import Link from "next/link";
import { useEffect } from "react";
import { IconEmpty } from "@/components/Icons";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="state">
      <span className="state-icon">
        <IconEmpty size={36} />
      </span>
      <strong>Terjadi kesalahan</strong>
      Gagal memuat halaman. Coba lagi — kalau masih error, buka dari menu lain.
      <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap", justifyContent: "center" }}>
        <button type="button" className="btn-play" onClick={reset}>
          Coba lagi
        </button>
        <Link href="/" className="text-btn">
          Ke home
        </Link>
      </div>
    </div>
  );
}
